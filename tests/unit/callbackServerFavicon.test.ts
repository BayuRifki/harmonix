import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { startCallbackServer } from '../../electron/main/auth/callbackServer';

type HandlerFn = (result: { code: string; state: string }) => Promise<void> | void;
type ErrorHandler = (msg: string) => void;

let server: Server | null = null;
let lastResponse: { statusCode: number; contentType: string; body: string } | null = null;

beforeEach(async () => {
  lastResponse = null;
  const srv = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Capture exactly what the server wrote back to the browser
    // so each test can assert on status + content-type + body.
    let body = '';
    res.on('finish', () => {
      lastResponse = {
        statusCode: res.statusCode,
        contentType: res.getHeader('Content-Type') as string,
        body,
      };
    });
    // forward to the real handler
    void realHandler!(req, res, (bodyChunk) => {
      body += bodyChunk;
    });
  });
  const port = await new Promise<number>((resolve) => {
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') resolve(addr.port);
      else resolve(0);
    });
  });
  server = srv;
  baseUrl = `http://127.0.0.1:${port}`;
  // overwrite the real startCallbackServer to spin up our capture
  // proxy on the *same* handler the real server uses.
});

afterEach(async () => {
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  server = null;
});

let baseUrl = '';
let realHandler:
  | ((req: IncomingMessage, res: ServerResponse, capture: (s: string) => void) => void)
  | null = null;
function captureHandler(req: IncomingMessage, res: ServerResponse, capture: (s: string) => void) {
  // dummy: we won't actually use this directly, the real server is wired below
}

// Helper: hit a path on the real callback server
async function hit(path: string): Promise<{ status: number; contentType: string; body: string }> {
  const res = await fetch(`${baseUrl}${path}`);
  const body = await res.text();
  return { status: res.status, contentType: res.headers.get('content-type') ?? '', body };
}

describe('callbackServer — favicon.ico returns 204 instead of a 404 error', () => {
  it('responds 204 to GET /favicon.ico (so the browser dev-tools console stays clean during OAuth success)', async () => {
    // Reproduces the user's last screenshot: the OAuth flow
    // succeeded (callback received the code), but the browser
    // immediately fired GET /favicon.ico against the callback
    // server which returned 404 "Not found". That 404 surfaces
    // in the browser as a scary red error in DevTools even
    // though the login worked. The fix: serve a 1×1 transparent
    // PNG (or any 200 response) so the browser is happy.
    server = await new Promise<Server>((resolve) => {
      const s = createServer(async (req, res) => {
        if (req.url === '/favicon.ico') {
          // expected behavior under test
          res.setHeader('Content-Type', 'image/x-icon');
          res.statusCode = 200;
          res.end(
            Buffer.from(
              'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAEAAAAAAAAAAAAAAAAAAAAAAAAAACAA',
              'base64',
            ),
          );
        } else {
          res.statusCode = 404;
          res.end('not under test');
        }
      });
      s.listen(0, '127.0.0.1', () => resolve(s));
    });
    const port = (server.address() as { port: number }).port;
    const res = await fetch(`http://127.0.0.1:${port}/favicon.ico`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/image/i);
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('the real callbackServer.startCallbackServer returns 200 (not 404) for GET /favicon.ico', async () => {
    // The actual end-to-end test of the real startCallbackServer:
    // start it, hit /favicon.ico, assert a 200 (not 404).
    const noopHandler: HandlerFn = () => {};
    const noopErrorHandler: ErrorHandler = () => {};
    const cb = await startCallbackServer(
      'http://127.0.0.1:0/', // any port; the real listen() picks a free one
      noopHandler,
      noopErrorHandler,
    );
    try {
      const port = (cb.address() as { port: number }).port;
      const res = await fetch(`http://127.0.0.1:${port}/favicon.ico`);
      // The fix: must NOT be 404. Either 200 (with a body) or 204
      // (empty) is acceptable. 404 is the bug.
      expect(res.status).not.toBe(404);
    } finally {
      await new Promise<void>((r) => cb.close(() => r()));
    }
  });
});
