import { net, protocol, type Session } from 'electron';
import { Readable } from 'node:stream';

const PROXY_SCHEME = 'harmonix-media';
const STREAM_TTL_MS = 10 * 60 * 1000;
const MAX_STREAMS = 20;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

interface StreamEntry {
  realUrl: string;
  createdAt: number;
  headers: Record<string, string>;
}

const streamRegistry = new Map<string, StreamEntry>();
let registered = false;

/**
 * Mark the custom protocol as privileged so Chromium allows it to be
 * used in places that normally require a "standard" + "secure" scheme:
 *   - HTMLMediaElement (audio/video) `src` attribute
 *   - Web Audio API (MediaElementSource) — needs CORS-clean media
 *   - `<img>`, `<script>`, fetch from "no-cors" contexts
 *
 * Must be called BEFORE `app.whenReady()` fires (per Electron docs)
 * and can only be called once. The file-import side effect in
 * `electron/main/index.ts` (before any other electron code) handles
 * the ordering.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: PROXY_SCHEME,
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

function evictOldest(): void {
  if (streamRegistry.size < MAX_STREAMS) return;
  const oldest = [...streamRegistry.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
  if (oldest) streamRegistry.delete(oldest[0]);
}

export interface RegisterStreamOptions {
  headers?: Record<string, string>;
}

export function registerStream(realUrl: string, opts: RegisterStreamOptions = {}): string {
  evictOldest();
  const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  streamRegistry.set(id, {
    realUrl,
    createdAt: Date.now(),
    headers: opts.headers ?? {},
  });
  return id;
}

export function unregisterStream(id: string): void {
  streamRegistry.delete(id);
}

export function getStreamInfo(id: string): StreamEntry | undefined {
  return streamRegistry.get(id);
}

export function proxyUrlFor(id: string): string {
  return `${PROXY_SCHEME}://stream/${id}`;
}

export function registerAudioProxyProtocol(session: Session | null = null): void {
  if (registered) return;
  registered = true;

  // protocol.handle is the modern Electron API; it works with the
  // network service and streams the response body through to the
  // renderer without buffering the whole audio in memory.
  const handle = session
    ? session.protocol.handle.bind(session.protocol)
    : protocol.handle.bind(protocol);

  handle(PROXY_SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.replace(/^\//, '');
      if (!id) {
        return new Response('Bad request', { status: 400 });
      }
      const entry = streamRegistry.get(id);
      if (!entry) {
        return new Response('Stream not found', { status: 404 });
      }
      if (Date.now() - entry.createdAt > STREAM_TTL_MS) {
        streamRegistry.delete(id);
        return new Response('Stream expired', { status: 410 });
      }

      // Forward Range requests (the audio element does partial-content
      // fetches when starting playback). Without this, the upstream
      // returns the full body on every range probe and the audio
      // element chokes on the "200 OK" where it expected "206 Partial".
      const fetchHeaders: Record<string, string> = {
        'User-Agent': DEFAULT_USER_AGENT,
        ...entry.headers,
      };
      const rangeHeader = request.headers?.get('range');
      if (rangeHeader) {
        fetchHeaders['Range'] = rangeHeader;
      }

      const upstream = await net.fetch(entry.realUrl, { headers: fetchHeaders });

      const outHeaders = new Headers();
      // Preserve upstream content-type / content-length / content-range
      // / accept-ranges so the audio element knows the codec, total size,
      // and the byte range of partial responses.
      for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(name);
        if (value) outHeaders.set(name, value);
      }
      outHeaders.set('Access-Control-Allow-Origin', '*');
      outHeaders.set('Access-Control-Allow-Headers', 'Range');
      outHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
      outHeaders.set('Cache-Control', 'no-store');
      outHeaders.set('X-Proxy-Source', 'harmonix-media');

      // Electron's `net.fetch` returns the response body as a Node
      // `Readable` stream. `new Response(nodeReadable)` accepts a web
      // `ReadableStream` as the body — passing the Node stream directly
      // makes the body un-readable for the audio element (Chromium
      // raises `MEDIA_ERR_DECODE` because it can't see any bytes).
      // `Readable.toWeb` converts the Node stream to a web stream.
      if (upstream.body) {
        const webBody = Readable.toWeb(
          upstream.body as unknown as Readable,
        ) as unknown as ConstructorParameters<typeof Response>[0];
        return new Response(webBody, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: outHeaders,
        });
      }
      return new Response(null, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[audioProxy] error:', (err as Error).message);
      return new Response('Proxy error', { status: 502 });
    }
  });
}
