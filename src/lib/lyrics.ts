export interface LyricLine {
  timeMs: number;
  text: string;
}

export interface LyricsResult {
  source: 'lrclib' | 'none';
  trackName: string;
  artistName: string;
  albumName?: string;
  durationMs?: number;
  plain?: string;
  synced?: LyricLine[];
  instrumental?: boolean;
}

const LRC_BASE = 'https://lrclib.net/api';
const TIMEOUT_MS = 8000;

async function fetchWithTimeout(
  url: string,
  options: { signal?: AbortSignal } = {},
  timeoutMs: number = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  // Forward parent-signal aborts to the local controller. Capture the
  // listener reference so we can remove it in the `finally` block —
  // without this, the parent signal keeps a strong reference to the
  // local controller's listener and the closure prevents GC until the
  // parent signal itself is destroyed.
  const onParentAbort = (): void => controller.abort();
  if (options.signal) {
    options.signal.addEventListener('abort', onParentAbort);
  }
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    if (options.signal) {
      options.signal.removeEventListener('abort', onParentAbort);
    }
  }
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const re = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]([^\n\r]*)/g;
  let m: RegExpExecArray | null = re.exec(lrc);
  while (m !== null) {
    const mm = Number(m[1]);
    const ss = Number(m[2]);
    const fr = m[3] ? Number(m[3].padEnd(3, '0').slice(0, 3)) : 0;
    const text = (m[4] ?? '').trim();
    if (text) {
      lines.push({ timeMs: mm * 60_000 + ss * 1000 + fr, text });
    }
    m = re.exec(lrc);
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export function parseLrcString(lrc: string): LyricLine[] {
  return parseLrc(lrc);
}

export function findActiveLineIndex(lines: LyricLine[], timeMs: number): number {
  if (lines.length === 0) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const line = lines[mid];
    if (!line) break;
    if (line.timeMs <= timeMs) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export interface LyricsQuery {
  trackName: string;
  artistName: string;
  albumName?: string;
  durationMs?: number;
}

export async function fetchLyrics(query: LyricsQuery, signal?: AbortSignal): Promise<LyricsResult> {
  if (!query.trackName || !query.artistName) {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }
  const exact = await fetchLyricsExact(query, signal);
  if (exact.source !== 'none') return exact;
  // Fall back to a fuzzy `/search` lookup. LRCLib's `/get` is strict —
  // it requires an exact duration match and exact track/artist names.
  // A real-world track often differs in case, punctuation, or by a
  // few seconds, so a title-based search is the pragmatic next step.
  return fetchLyricsSearch(query, signal);
}

function buildResultFromRecord(rec: Record<string, unknown>, query: LyricsQuery): LyricsResult {
  const syncedRaw = typeof rec.syncedLyrics === 'string' ? rec.syncedLyrics : '';
  const plainRaw = typeof rec.plainLyrics === 'string' ? rec.plainLyrics : '';
  const instrumental = rec.instrumental === true;
  const trackName = typeof rec.trackName === 'string' ? rec.trackName : query.trackName;
  const artistName = typeof rec.artistName === 'string' ? rec.artistName : query.artistName;
  const albumName = typeof rec.albumName === 'string' ? rec.albumName : undefined;
  const durationSec = typeof rec.duration === 'number' ? rec.duration : undefined;
  const result: LyricsResult = {
    source: 'lrclib',
    trackName,
    artistName,
    ...(albumName ? { albumName } : {}),
    ...(durationSec ? { durationMs: durationSec * 1000 } : {}),
    ...(instrumental ? { instrumental: true } : {}),
  };
  if (syncedRaw) {
    const lines = parseLrc(syncedRaw);
    if (lines.length > 0) result.synced = lines;
  }
  if (plainRaw) result.plain = plainRaw;
  return result;
}

async function fetchLyricsExact(query: LyricsQuery, signal?: AbortSignal): Promise<LyricsResult> {
  const params = new URLSearchParams({
    track_name: query.trackName,
    artist_name: query.artistName,
  });
  if (query.albumName) params.set('album_name', query.albumName);
  if (query.durationMs) params.set('duration', String(Math.round(query.durationMs / 1000)));

  const url = `${LRC_BASE}/get?${params.toString()}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, { signal });
  } catch {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }

  if (!res.ok) {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }
  if (typeof body !== 'object' || body === null) {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }
  const rec = body as Record<string, unknown>;
  const built = buildResultFromRecord(rec, query);
  if (!built.synced && !built.plain && !built.instrumental) {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }
  return built;
}

async function fetchLyricsSearch(query: LyricsQuery, signal?: AbortSignal): Promise<LyricsResult> {
  const params = new URLSearchParams({
    track_name: query.trackName,
    artist_name: query.artistName,
  });
  if (query.albumName) params.set('album_name', query.albumName);

  const url = `${LRC_BASE}/search?${params.toString()}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, { signal });
  } catch {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }

  if (!res.ok) {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }
  if (!Array.isArray(body) || body.length === 0) {
    return { source: 'none', trackName: query.trackName, artistName: query.artistName };
  }
  // Prefer the first result that actually has synced lyrics. A search
  // may return many candidates; if none have synced timing we still
  // surface plain lyrics from the first usable hit before giving up.
  const ranked = body
    .filter((b): b is Record<string, unknown> => typeof b === 'object' && b !== null)
    .sort((a, b) => {
      const aSynced = typeof a.syncedLyrics === 'string' && a.syncedLyrics.length > 0 ? 0 : 1;
      const bSynced = typeof b.syncedLyrics === 'string' && b.syncedLyrics.length > 0 ? 0 : 1;
      return aSynced - bSynced;
    });
  for (const rec of ranked) {
    const built = buildResultFromRecord(rec, query);
    if (built.synced || built.plain || built.instrumental) return built;
  }
  return { source: 'none', trackName: query.trackName, artistName: query.artistName };
}
