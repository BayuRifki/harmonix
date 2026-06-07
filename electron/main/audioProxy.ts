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

/**
 * Magic-byte content-type sniffer. Returns the audio MIME type for
 * known container formats, or `null` if the bytes don't match any
 * known audio container. Used to fix `MEDIA_ERR_SRC_NOT_SUPPORTED`
 * (Chromium's "Format error") when the upstream serves a generic
 * `Content-Type: application/octet-stream` (common with Google's
 * `googlevideo.com` CDN) or `video/webm` for an audio-only stream.
 *
 * Each detector inspects the first 4-12 bytes; all sample bytes are
 * documented in the WHATWG / RFC specs.
 */
export function detectContentType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  // WebM / Matroska: 1A 45 DF A3 (EBML header)
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return 'audio/webm';
  }

  // OGG / Opus / Vorbis: 4F 67 67 53 ("OggS")
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return 'audio/ogg';
  }

  // FLAC: 66 4C 61 43 ("fLaC")
  if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return 'audio/flac';
  }

  // MP4 / M4A: size (4 bytes) then 66 74 79 70 ("ftyp") at offset 4
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return 'audio/mp4';
  }

  // MP3: 0xFF sync byte + 0xFB / 0xF3 / 0xF2 (MPEG-1/2 Layer 3/2/1)
  if (bytes[0] === 0xff && (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2)) {
    return 'audio/mpeg';
  }

  // WAV: 52 49 46 46 ("RIFF") ... 57 41 56 45 ("WAVE") at offset 8
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return 'audio/wav';
  }

  return null;
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
    const reqLog = {
      url: request.url,
      method: request.method,
      range: request.headers?.get('range') ?? null,
    };
    // eslint-disable-next-line no-console
    console.log('[audioProxy] → request', JSON.stringify(reqLog));
    try {
      const url = new URL(request.url);
      const id = url.pathname.replace(/^\//, '');
      if (!id) {
        // eslint-disable-next-line no-console
        console.log('[audioProxy] 400 empty id');
        return new Response('Bad request', { status: 400 });
      }
      const entry = streamRegistry.get(id);
      if (!entry) {
        // eslint-disable-next-line no-console
        console.log(`[audioProxy] 404 unknown stream id=${id}`);
        return new Response('Stream not found', { status: 404 });
      }
      if (Date.now() - entry.createdAt > STREAM_TTL_MS) {
        streamRegistry.delete(id);
        // eslint-disable-next-line no-console
        console.log(`[audioProxy] 410 expired id=${id}`);
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

      // eslint-disable-next-line no-console
      console.log(
        `[audioProxy] upstream ${upstream.status} ${upstream.statusText} ` +
          `ct=${upstream.headers.get('content-type')} ` +
          `cl=${upstream.headers.get('content-length')} ` +
          `cr=${upstream.headers.get('content-range') ?? '-'} ` +
          `ar=${upstream.headers.get('accept-ranges') ?? '-'}`,
      );

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

      if (!upstream.body) {
        // eslint-disable-next-line no-console
        console.log('[audioProxy] no body, returning empty Response');
        return new Response(null, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: outHeaders,
        });
      }

      // Electron's `net.fetch` returns the response body as a Node
      // `Readable` stream. We convert to a web `ReadableStream` with
      // `Readable.toWeb`, but FIRST we read the first chunk to:
      //   1. Sniff the actual audio format from the magic bytes
      //      (upstream often serves `application/octet-stream` or
      //      `video/webm` even for audio-only YT Music streams; the
      //      audio element refuses to decode without a proper
      //      `audio/<format>` Content-Type → `MEDIA_ERR_SRC_NOT_SUPPORTED`)
      //   2. Re-prepend the sniffed bytes to the stream so the audio
      //      element sees the full body (no missing-prefix)
      //   3. Release the first reader before reading the rest, so
      //      there's no stream lock contention
      const originalWeb = Readable.toWeb(
        upstream.body as unknown as Readable,
      ) as unknown as ReadableStream<Uint8Array>;

      const peekReader = originalWeb.getReader();
      const first = await peekReader.read();
      peekReader.releaseLock();

      let firstChunk: Uint8Array | null = null;
      let firstChunkHex = '';
      if (!first.done && first.value) {
        firstChunk = first.value;
        // Log the first 16 bytes as hex so we can verify the body
        // isn't corrupt in the user's environment.
        firstChunkHex = Array.from(firstChunk.slice(0, Math.min(16, firstChunk.length)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ');
        const sniffed = detectContentType(firstChunk);
        if (sniffed) {
          const current = outHeaders.get('Content-Type');
          // Only override when the upstream type is missing or
          // generic (e.g. `application/octet-stream`, `*/*`).
          // Trust a proper audio type from the upstream.
          if (
            !current ||
            current.includes('application/octet-stream') ||
            current.includes('*/*') ||
            current.startsWith('video/') // video/webm contains an audio-only stream sometimes
          ) {
            // eslint-disable-next-line no-console
            console.log(
              `[audioProxy] sniffed ${sniffed} from ${firstChunkHex} ` +
                `(was ct=${current ?? 'unset'})`,
            );
            outHeaders.set('Content-Type', sniffed);
          }
        } else {
          // eslint-disable-next-line no-console
          console.log(`[audioProxy] first bytes ${firstChunkHex} (no audio format match)`);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log('[audioProxy] upstream body had no first chunk!');
      }

      // Reassemble the body: first chunk + the rest of the stream.
      const bodyStream: ReadableStream<Uint8Array> = new ReadableStream<Uint8Array>({
        async start(controller) {
          if (firstChunk) {
            controller.enqueue(firstChunk);
          }
          const rest = originalWeb.getReader();
          try {
            for (;;) {
              const { value, done } = await rest.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
        cancel(reason) {
          originalWeb.cancel(reason).catch(() => undefined);
        },
      });

      // eslint-disable-next-line no-console
      console.log(
        `[audioProxy] ← ${upstream.status} ct=${outHeaders.get('Content-Type')} ` +
          `cl=${outHeaders.get('Content-Length') ?? '-'} ` +
          `body=stream(1st=${firstChunk?.length ?? 0}B)`,
      );
      return new Response(bodyStream as unknown as ConstructorParameters<typeof Response>[0], {
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
