import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { shell, type BrowserWindow } from 'electron';

const CALLBACK_HTML_SUCCESS = `<!doctype html>
<html><head><title>Harmonix · Spotify</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#e4e4e7;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
h1{color:#1DB954;font-size:24px;margin-bottom:8px}
p{color:#a1a1aa;font-size:14px}
</style></head>
<body><div style="text-align:center"><h1>Connected to Spotify ✓</h1><p>You can close this tab and return to Harmonix.</p></div>
<script>setTimeout(()=>window.close(),1500)</script></body></html>`;

const CALLBACK_HTML_ERROR = (msg: string): string => `<!doctype html>
<html><head><title>Harmonix · Spotify Error</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#e4e4e7;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
h1{color:#ef4444;font-size:24px;margin-bottom:8px}
p{color:#a1a1aa;font-size:14px}
code{background:#27272a;padding:2px 6px;border-radius:4px;font-size:12px}
</style></head>
<body><div style="text-align:center;max-width:480px"><h1>Connection Failed</h1><p><code>${msg}</code></p><p>Please return to Harmonix and try again.</p></div></body></html>`;

let server: Server | null = null;
let activeRedirectUri: string | null = null;

export function parseRedirectUri(uri: string): { hostname: string; port: number; path: string } {
  const url = new URL(uri);
  return {
    hostname: url.hostname,
    port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    path: url.pathname === '/' ? '/' : url.pathname,
  };
}

export interface CallbackResult {
  code: string;
  state: string;
}

export type CallbackHandler = (result: CallbackResult) => Promise<void>;

export async function startCallbackServer(
  redirectUri: string,
  handler: CallbackHandler,
  errorHandler: (message: string) => void,
): Promise<Server> {
  if (server) {
    await stopCallbackServer();
  }
  const { hostname, port, path: callbackPath } = parseRedirectUri(redirectUri);
  activeRedirectUri = redirectUri;

  return new Promise((resolve, reject) => {
    const srv = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      // Diagnostic: log every hit to the callback server so we can
      // correlate "the safety cap fired" with "did the browser
      // actually navigate to /callback, and did it carry the code/
      // state params Spotify is supposed to append on success".
      // eslint-disable-next-line no-console
      console.info(`[spotify] callback hit: ${req.method} ${url.pathname}${url.search}`);
      if (url.pathname !== callbackPath) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (error) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(CALLBACK_HTML_ERROR(error));
        errorHandler(error);
        return;
      }
      if (!code || !state) {
        // Spotify's OAuth redirect is supposed to append ?code=…&state=…
        // A bare /callback hit (no params) usually means the URI
        // registered in the Spotify Developer Dashboard doesn't
        // EXACTLY match what the app sent (127.0.0.1 vs localhost,
        // trailing slash mismatch, http vs https, etc.). Spotify
        // falls back to redirecting without the code grant. The
        // user sees "Missing code or state" in their browser. Log
        // the full URL here so the user can compare against the
        // SPOTIFY_REDIRECT_URI in their .env and the entry in the
        // Dashboard.
        // eslint-disable-next-line no-console
        console.warn(
          `[spotify] callback arrived without code/state. ` +
            `Expected from Spotify: ${redirectUri}?code=…&state=…. ` +
            `Got: ${url.pathname}${url.search}. ` +
            `Check that SPOTIFY_REDIRECT_URI in .env and the Redirect URI ` +
            `registered in the Spotify Developer Dashboard are character-for-character identical.`,
        );
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(CALLBACK_HTML_ERROR('Missing code or state'));
        errorHandler('Missing code or state');
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(CALLBACK_HTML_SUCCESS);
      void handler({ code, state });
    });

    srv.on('error', (err) => {
      reject(err);
    });
    srv.listen(port, hostname, () => {
      server = srv;
      console.info(`[spotify] Callback server listening on ${redirectUri}`);
      resolve(srv);
    });
  });
}

export async function stopCallbackServer(): Promise<void> {
  if (!server) return;
  const s = server;
  server = null;
  activeRedirectUri = null;
  await new Promise<void>((resolve) => s.close(() => resolve()));
  console.info('[spotify] Callback server stopped');
}

export function openExternalUrl(url: string): Promise<void> {
  return shell.openExternal(url);
}

export function getActiveRedirectUri(): string | null {
  return activeRedirectUri;
}

export type { BrowserWindow };
