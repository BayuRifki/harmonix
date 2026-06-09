import { app, ipcMain, BrowserWindow } from 'electron';
import { getSource, getAllAuthStatuses } from '../sources/registry';
import { SpotifySource } from '../sources/spotify';
import { startCallbackServer, stopCallbackServer, openExternalUrl } from '../auth/callbackServer';
import type { AuthStatus } from '../sources/types';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:8888/callback';

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
  });

  ipcMain.handle('auth:spotify:logout', async (): Promise<{ ok: boolean }> => {
    const src = getSource('spotify');
    if (!(src instanceof SpotifySource)) return { ok: false };
    await src.getClient().logout();
    return { ok: true };
  });

  ipcMain.handle('auth:list', async (): Promise<AuthStatus[]> => {
    return getAllAuthStatuses();
  });
}

export function getSpotifyClientId(): string {
  return SPOTIFY_CLIENT_ID;
}

export function getSpotifyRedirectUri(): string {
  return SPOTIFY_REDIRECT_URI;
}

export { app };
