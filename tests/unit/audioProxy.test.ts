import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  handle: vi.fn(),
  registerSchemesAsPrivileged: vi.fn(),
}));

vi.mock('electron', () => ({
  net: { fetch: mocks.fetch },
  protocol: {
    handle: mocks.handle,
    registerSchemesAsPrivileged: mocks.registerSchemesAsPrivileged,
  },
}));

type HandlerFn = (req: {
  url: string;
  headers?: { get(name: string): string | null };
}) => Promise<Response>;
type Mod = typeof import('../../electron/main/audioProxy');

async function loadFreshModule(): Promise<Mod> {
  vi.resetModules();
  return import('../../electron/main/audioProxy');
}

async function setupHandler(mod: Mod): Promise<HandlerFn> {
  let handler: HandlerFn | null = null;
  mocks.handle.mockImplementation((_scheme: string, fn: HandlerFn) => {
    handler = fn;
  });
  mod.registerAudioProxyProtocol();
  expect(mocks.handle).toHaveBeenCalledWith('harmonix-media', expect.any(Function));
  if (!handler) throw new Error('protocol.handle not called');
  return handler;
}

function mockUpstreamResponse(init: Partial<Response> = {}): void {
  mocks.fetch.mockResolvedValue({
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'audio/mpeg' }),
    body: null,
    ...init,
  } as Response);
}

describe('audioProxy', () => {
  beforeEach(() => {
    mocks.fetch.mockReset();
    mocks.handle.mockReset();
  });

  it('registerStream returns a stable id that resolves via getStreamInfo', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/audio.mp3');
    expect(id).toMatch(/^s_/);
    const info = mod.getStreamInfo(id);
    expect(info?.realUrl).toBe('https://example.com/audio.mp3');
    expect(info?.createdAt).toBeGreaterThan(0);
  });

  it('unregisterStream removes the entry', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/x.mp3');
    expect(mod.getStreamInfo(id)?.realUrl).toBe('https://example.com/x.mp3');
    mod.unregisterStream(id);
    expect(mod.getStreamInfo(id)).toBeUndefined();
  });

  it('LRU eviction prefers least-recently-used over FIFO-by-creation', async () => {
    const mod = await loadFreshModule();
    // Insert MAX_STREAMS+2 entries. The first two should be evicted
    // by LRU (oldest lastUsedAt), not by FIFO (oldest createdAt).
    const ids: string[] = [];
    for (let i = 0; i < 34; i++) {
      const id = mod.registerStream(`https://example.com/${i}.mp3`);
      ids.push(id);
      // Touch every other entry so its lastUsedAt advances. The
      // even-indexed ones stay "stale" (older lastUsedAt).
      if (i % 2 === 1) {
        const entry = mod.getStreamInfo(id);
        if (entry) entry.lastUsedAt = Date.now();
      }
    }
    // The very first id (i=0) was never touched → should be evicted.
    expect(mod.getStreamInfo(ids[0])).toBeUndefined();
    // The very last id (i=33) was just registered → still present.
    expect(mod.getStreamInfo(ids[33])).toBeDefined();
  });

  it('lastUsedAt is refreshed on every request, keeping the active stream alive', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/active.mp3');
    // Simulate 40s of "active" use by repeatedly calling getStreamInfo
    // (the actual handler also refreshes lastUsedAt, but here we test
    // the public surface).
    for (let i = 0; i < 10; i++) {
      const e = mod.getStreamInfo(id);
      if (e) e.lastUsedAt = Date.now();
    }
    expect(mod.getStreamInfo(id)).toBeDefined();
  });

  it('proxyUrlFor builds a harmonix-media://stream/<id> URL', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/y.mp3');
    expect(mod.proxyUrlFor(id)).toBe(`harmonix-media://stream/${id}`);
  });

  it('passes through extra request headers when fetching upstream', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/z.mp3', {
      headers: {
        'X-Custom-Token': 'secret',
        Referer: 'https://music.youtube.com',
      },
    });
    const body = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
    const { Readable } = await import('node:stream');
    const nodeStream = Readable.from(
      (async function* () {
        yield body;
      })(),
    );
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'audio/mpeg' }),
      body: nodeStream,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [, init] = mocks.fetch.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(init.headers).toMatchObject({
      'X-Custom-Token': 'secret',
      Referer: 'https://music.youtube.com',
    });
  });

  it('returns 404 for unknown stream ids', async () => {
    const mod = await loadFreshModule();
    mockUpstreamResponse();
    const handler = await setupHandler(mod);
    const res = await handler({ url: 'harmonix-media://stream/does-not-exist' });
    expect(res.status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 for empty stream id', async () => {
    const mod = await loadFreshModule();
    mockUpstreamResponse();
    const handler = await setupHandler(mod);
    const res = await handler({ url: 'harmonix-media://stream/' });
    expect(res.status).toBe(400);
  });

  it('returns 410 for expired streams', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/old.mp3');
    const info = mod.getStreamInfo(id);
    if (info) info.createdAt = Date.now() - 31 * 60 * 1000;
    mockUpstreamResponse();
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(410);
    expect(mod.getStreamInfo(id)).toBeUndefined();
  });

  it('response includes CORS + content headers', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/cors.mp3');
    const body = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00]);
    const { Readable } = await import('node:stream');
    const nodeStream = Readable.from(
      (async function* () {
        yield body;
      })(),
    );
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'audio/mpeg',
        'content-length': '6',
      }),
      body: nodeStream,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Content-Length')).toBe('6');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Proxy-Source')).toBe('harmonix-media');
  });

  it('returns 502 when net.fetch throws', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/down.mp3');
    mocks.fetch.mockRejectedValue(new Error('upstream boom'));
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(502);
  });

  it('returns 502 when upstream returns 2xx with a null body (audio element would see "Empty src attribute")', async () => {
    // Repro: YouTube's googlevideo CDN sometimes returns 200 OK with
    // no body for certain edge cases (a 302 redirect to a CDN that
    // itself returns 200 + empty, or a HEAD-style 200 with no audio
    // bytes). The audio element then fails with
    // MEDIA_ERR_SRC_NOT_SUPPORTED + "Empty src attribute", which is
    // impossible to distinguish from a bad MIME. Surfacing 502 to
    // the audio element gives it a proper HTTP error code, which
    // shows up in the diagnostic logs and lets the player retry
    // (or surface a clearer error to the user).
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://rr2---sn.googlevideo.com/empty');
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'audio/webm' }),
      body: null,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(502);
  });

  it('passes through 4xx upstream status (e.g., YouTube 403 expired signature) so the audio element sees the real error', async () => {
    // We don't want to mask a real upstream 4xx as 502. The audio
    // element already has special handling for 403/404 (it'll log
    // the status and fail with MEDIA_ERR_SRC_NOT_SUPPORTED).
    // Coverting 4xx to 502 would lose information ("expired
    // signature" vs "upstream unreachable" look the same to the
    // audio element).
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://rr2---sn.googlevideo.com/expired');
    mocks.fetch.mockResolvedValue({
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({ 'content-type': 'text/html' }),
      body: null,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(403);
  });

  it('registerAudioProxyProtocol is idempotent (no double-handle within a module instance)', async () => {
    const mod = await loadFreshModule();
    mod.registerAudioProxyProtocol();
    mod.registerAudioProxyProtocol();
    expect(mocks.handle).toHaveBeenCalledTimes(1);
  });

  it('registerSchemesAsPrivileged is called once at module import with the right flags', async () => {
    await loadFreshModule();
    expect(mocks.registerSchemesAsPrivileged).toHaveBeenCalledTimes(1);
    expect(mocks.registerSchemesAsPrivileged).toHaveBeenCalledWith([
      {
        scheme: 'harmonix-media',
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          stream: true,
          bypassCSP: false,
          codeCache: false,
          corsEnabled: true,
        },
      },
    ]);
  });

  it('forwards the Range header from the request to the upstream fetch', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/partial.mp3');
    const body = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00]);
    const { Readable } = await import('node:stream');
    const nodeStream = Readable.from(
      (async function* () {
        yield body;
      })(),
    );
    mocks.fetch.mockResolvedValue({
      status: 206,
      statusText: 'Partial Content',
      headers: new Headers({
        'content-type': 'audio/mpeg',
        'content-range': 'bytes 0-1023/5678',
        'accept-ranges': 'bytes',
      }),
      body: nodeStream,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    // Plain object with a get() method instead of new Headers({...}) —
    // vitest's jsdom Headers polyfill filters 'range' as a forbidden
    // request-header name, but real Chromium Headers accept it.
    const requestHeaders = {
      get: (name: string): string | null =>
        name.toLowerCase() === 'range' ? 'bytes=0-1023' : null,
    };
    const res = await handler({
      url: `harmonix-media://stream/${id}`,
      headers: requestHeaders,
    });
    expect(res.status).toBe(206);
    const [, init] = mocks.fetch.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(init.headers['Range']).toBe('bytes=0-1023');
    expect(res.headers.get('Content-Range')).toBe('bytes 0-1023/5678');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Range');
    expect(res.headers.get('Access-Control-Expose-Headers')).toContain('Content-Range');
  });

  it('handles missing request.headers gracefully (no Range to forward)', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/full.mp3');
    const body = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00]);
    const { Readable } = await import('node:stream');
    const nodeStream = Readable.from(
      (async function* () {
        yield body;
      })(),
    );
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'audio/mpeg' }),
      body: nodeStream,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    // Note: no headers in the request
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(200);
    const [, init] = mocks.fetch.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(init.headers['Range']).toBeUndefined();
  });

  // ---- detectContentType ----

  it('detectContentType: identifies WebM/EBML (1A 45 DF A3) → audio/webm', async () => {
    const { detectContentType } = await loadFreshModule();
    expect(detectContentType(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86]))).toBe(
      'audio/webm',
    );
  });

  it('detectContentType: identifies OGG (OggS) → audio/ogg', async () => {
    const { detectContentType } = await loadFreshModule();
    expect(detectContentType(new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00]))).toBe('audio/ogg');
  });

  it('detectContentType: identifies FLAC (fLaC) → audio/flac', async () => {
    const { detectContentType } = await loadFreshModule();
    expect(detectContentType(new Uint8Array([0x66, 0x4c, 0x61, 0x43, 0x00]))).toBe('audio/flac');
  });

  it('detectContentType: identifies MP4/M4A (ftyp box) → audio/mp4', async () => {
    const { detectContentType } = await loadFreshModule();
    // 4 bytes size + "ftyp" + "M4A " (brand)
    const buf = new Uint8Array(16);
    buf[4] = 0x66;
    buf[5] = 0x74;
    buf[6] = 0x79;
    buf[7] = 0x70;
    expect(detectContentType(buf)).toBe('audio/mp4');
  });

  it('detectContentType: identifies MP3 (0xFF 0xFB) → audio/mpeg', async () => {
    const { detectContentType } = await loadFreshModule();
    expect(detectContentType(new Uint8Array([0xff, 0xfb, 0x90, 0x00]))).toBe('audio/mpeg');
  });

  it('detectContentType: identifies WAV (RIFF...WAVE) → audio/wav', async () => {
    const { detectContentType } = await loadFreshModule();
    const buf = new Uint8Array(16);
    buf[0] = 0x52;
    buf[1] = 0x49;
    buf[2] = 0x46;
    buf[3] = 0x46;
    buf[8] = 0x57;
    buf[9] = 0x41;
    buf[10] = 0x56;
    buf[11] = 0x45;
    expect(detectContentType(buf)).toBe('audio/wav');
  });

  it('detectContentType: returns null for unknown bytes', async () => {
    const { detectContentType } = await loadFreshModule();
    expect(detectContentType(new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBeNull();
    expect(detectContentType(new Uint8Array(0))).toBeNull();
    expect(detectContentType(new Uint8Array([0x47, 0x49, 0x46]))).toBeNull();
  });

  // ---- content-type override via sniff ----

  it('overrides upstream application/octet-stream with sniffed Content-Type', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/yt-track.webm');
    // Upstream returns 200 with octet-stream (typical of googlevideo CDN)
    // and a body that starts with the WebM magic bytes.
    const webmHeader = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]);
    const restBody = new Uint8Array([0, 0, 0, 0]);
    const fullBody = new Uint8Array(webmHeader.length + restBody.length);
    fullBody.set(webmHeader, 0);
    fullBody.set(restBody, webmHeader.length);
    // Mock a Node Readable that emits these chunks
    const { Readable } = await import('node:stream');
    const nodeStream = Readable.from(
      (async function* () {
        yield webmHeader;
        yield restBody;
      })(),
    );
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/octet-stream' }),
      body: nodeStream,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/webm');
  });

  it('preserves upstream audio Content-Type when it is a proper audio type', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/good.mp3');
    const mp3Header = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
    const { Readable } = await import('node:stream');
    const nodeStream = Readable.from(
      (async function* () {
        yield mp3Header;
      })(),
    );
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'audio/mpeg' }),
      body: nodeStream,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
  });

  it('re-prepends the sniffed first chunk to the body so the audio element sees the full stream', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/sniff-body.webm');
    const chunks = [
      new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]),
      new Uint8Array([0x01, 0x02, 0x03, 0x04]),
      new Uint8Array([0x05, 0x06, 0x07, 0x08]),
    ];
    const { Readable } = await import('node:stream');
    const nodeStream = Readable.from(
      (async function* () {
        for (const c of chunks) yield c;
      })(),
    );
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/octet-stream' }),
      body: nodeStream,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/webm');
    // Drain the response body and verify ALL bytes are present
    const reader = res.body!.getReader();
    const received: number[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const b of value) received.push(b);
    }
    const expected = chunks.flatMap((c) => Array.from(c));
    expect(received).toEqual(expected);
  });

  it('handles Electron 33+ web ReadableStream body (the production case)', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/yt.webm');
    const chunks = [
      new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]),
      new Uint8Array([0x01, 0x02, 0x03, 0x04]),
    ];
    // Electron 33+ returns the body as a web ReadableStream, not
    // a Node Readable. Mock that case to verify asWebStream passes
    // it through (instead of calling Readable.toWeb which would
    // throw on a web stream).
    const webBody = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(c);
        controller.close();
      },
    });
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'video/webm' }),
      body: webBody,
    } as unknown as Response);
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/webm');
    const reader = res.body!.getReader();
    const received: number[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const b of value) received.push(b);
    }
    const expected = chunks.flatMap((c) => Array.from(c));
    expect(received).toEqual(expected);
  });
});
