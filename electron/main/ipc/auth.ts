import { app, ipcMain, BrowserWindow } from 'electron';
import { getSource, getAllAuthStatuses } from '../sources/registry';
import { SpotifySource } from '../sources/spotify';
import { startCallbackServer, stopCallbackServer, openExternalUrl } from '../auth/callbackServer';
import type { AuthStatus } from '../sources/types';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? '';
// Use the path-less form (no `/callback` suffix). Spotify does
// exact-string matching on the redirect_uri, and the previous
// default of /callback produced "Missing code or state" errors
// in production when the user registered the URI in the
// Developer Dashboard as just host:port (or with a trailing-slash
// variant). With no path component, both sides register the same
// host:port and the callback server listens on `/` — closing
// that class of mismatch.
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:8888';

export interface SpotifyLoginResult {
  ok: boolean;
  error?: string;
  profile?: {
    id: string;
    name: string;
    product: 'free' | 'premium' | string;
  };
}

export function registerAuthHandlers(_getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('auth:spotify:status', async (): Promise<AuthStatus> => {
    const src = getSource('spotify');
    if (!src) return { source: 'spotify', authenticated: false, userName: 'Not registered' };
    return src.getAuthStatus();
  });

  ipcMain.handle('auth:spotify:login', async (): Promise<SpotifyLoginResult> => {
    // Safety cap for the *whole* handler. The inner work has its
    // own 90s timeout inside client.loginViaBrowser, but if the
    // renderer has already navigated away / closed the window
    // while the OAuth flow is mid-flight, that internal timeout
    // will eventually fire and try to send a reply — only the
    // channel is gone. The user observes "Error invoking remote
    // method 'auth:spotify:login': reply was never sent" and
    // has no recourse. By racing the inner work against a hard
    // 90s safety cap from this side, we guarantee a value is
    // always returned within a bounded time, even if the internal
    // Promise somehow never resolves (bug in startCallbackServer,
    // leaked pendingFlow from a previous session, etc.).
    const SAFETY_TIMEOUT_MS = 90_000;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    const safetyPromise = new Promise<SpotifyLoginResult>((resolve) => {
      safetyTimer = setTimeout(() => {
        resolve({
          ok: false,
          error:
            'Spotify login safety cap hit (90s). The OAuth flow ' +
            'did not complete in time. Verify all of the following, ' +
            'then retry:\n' +
            '  1. Spotify Developer Dashboard → your app → ' +
            'App settings → Redirect URIs contains exactly ' +
            'http://127.0.0.1:8888/callback (one entry per line).\n' +
            '  2. User Management → your Spotify account email is ' +
            'listed (Development Mode apps are limited to 25 users).\n' +
            '  3. Port 8888 on 127.0.0.1 is reachable (no firewall/ ' +
            'antivirus blocking inbound to the loopback).\n' +
            '  4. The browser actually opened the consent screen ' +
            'and you clicked "Agree" within 90s. If you closed ' +
            'the browser tab, the flow cannot complete.',
        });
      }, SAFETY_TIMEOUT_MS);
    });
    const innerWork = (async (): Promise<SpotifyLoginResult> => {
      const src = getSource('spotify');
      if (!(src instanceof SpotifySource)) {
        return { ok: false, error: 'Spotify source not registered' };
      }
      if (!SPOTIFY_CLIENT_ID) {
        return {
          ok: false,
          error:
            'SPOTIFY_CLIENT_ID not configured. Set it in your .env file. See docs/SOURCES.md for setup instructions.',
        };
      }

      const client = src.getClient();
      try {
        await startCallbackServer(
          SPOTIFY_REDIRECT_URI,
          async ({ code, state }) => {
            await client.handleCallback(code, state);
          },
          (errorMessage) => {
            // The OAuth callback server received an error redirect
            // (e.g., the user denied the consent screen, or the
            // callback was missing the code/state params). Reject the
            // pending login flow immediately so loginViaBrowser
            // returns and the IPC reply is sent. Without this, the
            // 90s pendingFlow timeout is the only thing that would
            // unblock the reply — and if the renderer closed in the
            // meantime, the reply is lost entirely.
            client.cancelPendingFlow(`Spotify OAuth error: ${errorMessage}`);
          },
        );

        const loginResult = await client.loginViaBrowser(openExternalUrl);
        if (!loginResult.ok) {
          await stopCallbackServer();
          return { ok: false, error: loginResult.error };
        }
        await stopCallbackServer();
        const profile = client.getCachedProfile();
        return {
          ok: true,
          profile: profile
            ? {
                id: profile.id,
                name: profile.display_name ?? profile.email ?? 'User',
                product: profile.product,
              }
            : undefined,
        };
      } catch (err) {
        await stopCallbackServer().catch(() => undefined);
        return { ok: false, error: (err as Error).message };
      }
    })();
    return Promise.race([
      innerWork.finally(() => {
        if (safetyTimer) clearTimeout(safetyTimer);
      }),
      safetyPromise,
    ]);
  });

  ipcMain.handle('auth:spotify:logout', async (): Promise<{ ok: boolean }> => {
    const src = getSource('spotify');
    if (!(src instanceof SpotifySource)) return { ok: false };
    await src.getClient().logout();
    return { ok: true };
  });

  ipcMain.handle('auth:spotify:token', async (): Promise<string | null> => {
    return getSpotifyAccessToken();
  });

  ipcMain.handle('auth:list', async (): Promise<AuthStatus[]> => {
    return getAllAuthStatuses();
  });
}

/**
 * Returns a valid Spotify access token, refreshing it transparently
 * if it has expired. Returns null when:
 *   - the Spotify source isn't registered (e.g. the user disabled it)
 *   - no token has been stored yet (user hasn't completed OAuth)
 *   - the token is expired and no refresh token is available
 *
 * The renderer needs this to authorize the Web Playback SDK calls
 * (`/me/player/play?device_id=…`) and the SDK's `getOAuthToken`
 * callback during the OAuth handshake. Keeping the refresh logic
 * in the main process means the renderer never has to deal with
 * the bearer token's lifecycle.
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const src = getSource('spotify');
  if (!(src instanceof SpotifySource)) return null;
  return src.getClient().getValidToken();
}

export function getSpotifyClientId(): string {
  return SPOTIFY_CLIENT_ID;
}

export function getSpotifyRedirectUri(): string {
  return SPOTIFY_REDIRECT_URI;
}

export { app };
