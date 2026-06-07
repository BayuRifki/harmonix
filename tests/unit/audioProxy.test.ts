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
    mockUpstreamResponse();
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
    if (info) info.createdAt = Date.now() - 11 * 60 * 1000;
    mockUpstreamResponse();
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(410);
    expect(mod.getStreamInfo(id)).toBeUndefined();
  });

  it('response includes CORS + content headers', async () => {
    const mod = await loadFreshModule();
    const id = mod.registerStream('https://example.com/cors.mp3');
    mockUpstreamResponse({
      headers: new Headers({
        'content-type': 'audio/mpeg',
        'content-length': '12345',
      }),
    });
    const handler = await setupHandler(mod);
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Content-Length')).toBe('12345');
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
    mockUpstreamResponse({
      status: 206,
      statusText: 'Partial Content',
      headers: new Headers({
        'content-type': 'audio/mpeg',
        'content-range': 'bytes 0-1023/5678',
        'accept-ranges': 'bytes',
      }),
    });
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
    mockUpstreamResponse();
    const handler = await setupHandler(mod);
    // Note: no headers in the request
    const res = await handler({ url: `harmonix-media://stream/${id}` });
    expect(res.status).toBe(200);
    const [, init] = mocks.fetch.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(init.headers['Range']).toBeUndefined();
  });
});
