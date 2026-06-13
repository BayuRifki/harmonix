import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We don't need to import the real callback server for this test —
// the path-parsing logic is the contract we want to lock in. The
// server module wires the parsed values into http.createServer at
// startup, so we test the pure parsing here and trust the wiring.
import { parseRedirectUri } from '../../electron/main/auth/callbackServer';

describe('parseRedirectUri — supports path-less URI to avoid Spotify redirect_uri mismatch', () => {
  it('parses http://127.0.0.1:8888 to hostname=127.0.0.1, port=8888, path=/', () => {
    // The real-world failure mode: the user has registered
    //   "http://127.0.0.1:8888"
    // in the Spotify Developer Dashboard, but the app defaults to
    //   "http://127.0.0.1:8888/callback"
    // Spotify does exact-string matching on the redirect_uri and
    // omits the ?code=… grant on mismatch, producing the
    // "Missing code or state" callback error. Removing the path
    // component from the default closes that class of mismatch
    // — both sides register the same host:port and the callback
    // path becomes "/", which Node's URL parses consistently.
    const out = parseRedirectUri('http://127.0.0.1:8888');
    expect(out).toEqual({ hostname: '127.0.0.1', port: 8888, path: '/' });
  });

  it('still handles an explicit /callback path (backward-compatible)', () => {
    // Old .env files and existing Spotify Dashboard entries that
    // do use /callback must keep working — the callback server's
    // path check is strict by design, so an app sending
    // /callback still routes the request through to the handler.
    const out = parseRedirectUri('http://127.0.0.1:8888/callback');
    expect(out).toEqual({ hostname: '127.0.0.1', port: 8888, path: '/callback' });
  });

  it('normalizes the bare-host case to path=/ (no trailing slash on input still maps to /)', () => {
    // Spotify Dashboard sometimes saves the URI without a trailing
    // slash even when the user typed one — defensively, both
    // "http://host:port" and "http://host:port/" should route the
    // callback server to the same / path so the strict equality
    // check against req.url's pathname matches.
    expect(parseRedirectUri('http://localhost:8888/').path).toBe('/');
    expect(parseRedirectUri('http://localhost:8888').path).toBe('/');
  });
});

describe('Default SPOTIFY_REDIRECT_URI uses path-less form (no /callback)', () => {
  // Regression guard: the previous default of
  //   http://127.0.0.1:8888/callback
  // produced "Missing code or state" errors in production when
  // the user registered the URI in the Dashboard without the path
  // component (or with a trailing slash variant). Spotify does
  // exact-string matching on the redirect_uri, so even a single
  // character difference omits the ?code=… grant. The default
  // now uses the path-less form which is robust against the
  // common Dashboard entry mistakes.
  it('default fallback (no env override) is http://127.0.0.1:8888 with no path', () => {
    // Re-read the auth.ts module to see what fallback URI the
    // process.env lookup uses. We do this dynamically so the test
    // reflects the actual code, not a duplicated constant.
    delete process.env.SPOTIFY_REDIRECT_URI;
    // Force a re-import so the module-level fallback is evaluated
    // against the freshly-deleted env var.
    vi.resetModules();
    return import('../../electron/main/ipc/auth').then((mod) => {
      expect(mod.getSpotifyRedirectUri()).toBe('http://127.0.0.1:8888');
    });
  });
});
