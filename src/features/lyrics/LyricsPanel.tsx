import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Music,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { fetchLyrics, findActiveLineIndex, type LyricsResult } from '@/lib/lyrics';

export interface LyricsPanelProps {
  className?: string;
  collapsedByDefault?: boolean;
}

const CACHE_TTL_MS = 1000 * 60 * 5;

function cacheKey(trackId: string, artist: string, title: string): string {
  return `harmonix.lyrics.${trackId}.${artist.toLowerCase()}.${title.toLowerCase()}`;
}

function readCache(key: string): { ts: number; result: LyricsResult } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as { ts?: unknown; result?: unknown };
    if (typeof p.ts !== 'number' || !p.result) return null;
    if (Date.now() - p.ts > CACHE_TTL_MS) return null;
    return { ts: p.ts, result: p.result as LyricsResult };
  } catch {
    return null;
  }
}

function writeCache(key: string, result: LyricsResult): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), result }));
  } catch {
    // ignore
  }
}

export function LyricsPanel({
  className = '',
  collapsedByDefault = false,
}: LyricsPanelProps): JSX.Element {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const seek = usePlayerStore((s) => s.seek);
  const [result, setResult] = useState<LyricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  const [retryNonce, setRetryNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);

  const trackKey = useMemo(() => {
    if (!currentTrack) return null;
    return cacheKey(currentTrack.id, currentTrack.artists[0]?.name ?? '', currentTrack.title);
  }, [currentTrack]);

  // LRCLib's `/search` page lets users contribute/correct lyrics
  // when none are found automatically. Linking out from the empty
  // state gives the user an obvious next step instead of leaving
  // them with a dead-end "No lyrics found" message.
  const lrclibSearchUrl = useMemo(() => {
    if (!currentTrack) return null;
    const params = new URLSearchParams({
      track_name: currentTrack.title,
      artist_name: currentTrack.artists[0]?.name ?? '',
    });
    if (currentTrack.album?.title) params.set('album_name', currentTrack.album.title);
    return `https://lrclib.net/search?${params.toString()}`;
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack || !trackKey) {
      setResult(null);
      setError(null);
      return;
    }
    // `retryNonce` is in the dep list so the retry button below
    // can force a re-fetch after clearing the local cache.
    if (lastFetchKeyRef.current === trackKey && retryNonce === 0) return;
    lastFetchKeyRef.current = trackKey;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const cached = readCache(trackKey);
    if (cached) {
      setResult(cached.result);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    fetchLyrics(
      {
        trackName: currentTrack.title,
        artistName: currentTrack.artists[0]?.name ?? '',
        ...(currentTrack.album?.title ? { albumName: currentTrack.album.title } : {}),
        ...(currentTrack.durationMs ? { durationMs: currentTrack.durationMs } : {}),
      },
      controller.signal,
    )
      .then((res) => {
        if (lastFetchKeyRef.current !== trackKey) return;
        if (res.source === 'none') {
          setResult({
            source: 'none',
            trackName: currentTrack.title,
            artistName: currentTrack.artists[0]?.name ?? '',
          });
          setError('No lyrics found');
        } else {
          setResult(res);
          writeCache(trackKey, res);
        }
      })
      .catch((err: unknown) => {
        if ((err as Error).name === 'AbortError') return;
        if (lastFetchKeyRef.current === trackKey) {
          setError((err as Error).message ?? 'Failed to load lyrics');
        }
      })
      .finally(() => {
        if (lastFetchKeyRef.current === trackKey) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [currentTrack, trackKey, retryNonce]);

  const handleRetry = (): void => {
    if (!trackKey) return;
    // Drop the cached "no lyrics" result so the next fetch actually
    // hits the network. Without this, a retry would short-circuit
    // on the stale CACHE_TTL_MS window and the user would see no
    // change.
    try {
      localStorage.removeItem(trackKey);
    } catch {
      // ignore quota / private-mode errors
    }
    setRetryNonce((n) => n + 1);
  };

  if (!currentTrack) {
    return (
      <div className={className} data-testid="lyrics-panel-empty">
        <p className="text-xs text-zinc-600">Lyrics will appear when a track is playing</p>
      </div>
    );
  }

  const lines = result?.synced ?? [];
  const activeIndex = lines.length > 0 ? findActiveLineIndex(lines, positionMs) : -1;

  return (
    <section
      className={`w-full max-w-2xl mt-4 ${className}`}
      aria-label="Lyrics"
      data-testid="lyrics-panel"
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-expanded={!collapsed}
        aria-controls="lyrics-panel-body"
      >
        <span className="inline-flex items-center gap-1.5">
          <Music size={11} aria-hidden />
          Lyrics
        </span>
        {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
      </button>
      {!collapsed && (
        <div
          id="lyrics-panel-body"
          className="mt-2 max-h-[60vh] overflow-y-auto glass rounded-lg p-4"
        >
          {loading && (
            <div
              className="flex items-center justify-center py-8 text-zinc-500"
              data-testid="lyrics-loading"
            >
              <Loader2 size={16} className="animate-spin mr-2" />
              Loading lyrics…
            </div>
          )}
          {!loading && error && lines.length === 0 && !result?.plain && (
            <div
              className="flex flex-col items-center justify-center gap-2 py-8 text-zinc-500"
              data-testid="lyrics-error"
            >
              <div className="flex items-center">
                <AlertCircle size={14} className="mr-2" />
                {error}
              </div>
              {currentTrack && (
                <p className="text-[11px] text-zinc-600 text-center max-w-xs">
                  Synced lyrics come from{' '}
                  <a
                    href={lrclibSearchUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-zinc-300 inline-flex items-center gap-0.5"
                    data-testid="lyrics-lrclib-link"
                  >
                    LRCLib
                    <ExternalLink size={10} aria-hidden />
                  </a>
                  .
                </p>
              )}
              <button
                type="button"
                onClick={handleRetry}
                className="mt-1 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors focus-ring"
                data-testid="lyrics-retry"
                aria-label="Retry lyrics lookup"
              >
                <RefreshCw size={11} aria-hidden />
                Retry
              </button>
            </div>
          )}
          {result?.instrumental && !loading && (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <Music size={14} className="mr-2" />
              Instrumental
            </div>
          )}
          {lines.length > 0 && (
            <ol className="space-y-1.5 text-sm" data-testid="lyrics-lines">
              {lines.map((line, i) => {
                const isActive = i === activeIndex;
                return (
                  <li key={`${line.timeMs}-${i}`}>
                    <button
                      type="button"
                      onClick={() => void seek(line.timeMs)}
                      className={`block w-full text-left transition-all ${
                        isActive
                          ? 'text-white font-medium scale-100'
                          : activeIndex >= 0
                            ? 'text-zinc-500 scale-95 hover:text-zinc-300'
                            : 'text-zinc-300 hover:text-white'
                      }`}
                      data-testid={isActive ? 'lyrics-line-active' : 'lyrics-line'}
                    >
                      {line.text}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          {result?.plain && lines.length === 0 && !loading && (
            <p
              className="whitespace-pre-line text-sm text-zinc-300 leading-relaxed"
              data-testid="lyrics-plain"
            >
              {result.plain}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
