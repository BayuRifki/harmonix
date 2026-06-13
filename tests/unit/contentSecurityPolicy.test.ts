import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression guard: the Spotify Web Playback SDK renders its
 * player UI inside an iframe at `https://sdk.scdn.co/embedded/index.html`.
 * If our main-window CSP doesn't explicitly allow that origin in
 * `frame-src`, Chromium blocks the iframe load with
 * `ERR_BLOCKED_BY_CSP` and the SDK silently never connects. This
 * test parses the meta tag in `index.html` so a future CSP edit
 * that drops the directive fails CI before it ships.
 */
function parseCsp(): { raw: string; directives: Record<string, string[]> } {
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
  const match = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  if (!match) throw new Error('CSP meta tag not found in index.html');
  const raw = match[1] ?? '';
  const directives: Record<string, string[]> = {};
  for (const segment of raw.split(';')) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    if (name) directives[name] = sources;
  }
  return { raw, directives };
}

describe('index.html CSP — Spotify Web Playback SDK wiring', () => {
  it('permits the SDK script origin in script-src', () => {
    const { directives } = parseCsp();
    const scriptSrc = directives['script-src'] ?? [];
    expect(scriptSrc).toContain('https://sdk.scdn.co');
  });

  it('permits the SDK iframe origin in frame-src (so the embedded player can render)', () => {
    // The Web Playback SDK injects an iframe at
    // https://sdk.scdn.co/embedded/index.html. Without an explicit
    // frame-src allow-list (or a default-src that covers it),
    // Chromium blocks the load with ERR_BLOCKED_BY_CSP and the
    // SDK's connect() promise never resolves.
    const { directives } = parseCsp();
    const frameSrc = directives['frame-src'] ?? directives['default-src'] ?? [];
    expect(frameSrc).toContain('https://sdk.scdn.co');
  });

  it('still allow-lists the Spotify API + accounts origins in connect-src', () => {
    // The renderer's fetch() against /v1/search, /v1/me/player/play,
    // and the OAuth token exchange goes through these origins.
    const { directives } = parseCsp();
    const connectSrc = directives['connect-src'] ?? [];
    expect(connectSrc).toEqual(
      expect.arrayContaining(['https://api.spotify.com', 'https://accounts.spotify.com']),
    );
  });
});
