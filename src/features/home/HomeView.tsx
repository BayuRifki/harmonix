import { useEffect, useMemo } from 'react';
import { Disc3, Play, Search, Library, History, ChevronRight, Compass, Music } from 'lucide-react';
import { useSourcesStore } from '@/stores/sourcesStore';
import { useAppStore } from '@/stores/appStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { ForYouSection } from '@/components/recommendations/ForYouSection';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export function HomeView(): JSX.Element {
  const version = useAppStore((s) => s.version);
  const platform = useAppStore((s) => s.platform);
  const refresh = useSourcesStore((s) => s.refresh);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const stats = useLibraryStore((s) => s.stats);
  const history = useListeningHistoryStore((s) => s.entries);
  const play = usePlayerStore((s) => s.play);
  const navigate = useSafeNavigate();

  useEffect(() => {
    void refresh();
    void refreshLibrary();
  }, [refresh, refreshLibrary]);

  const lastPlayed = history[0] ?? null;
  const jumpBackIn = useMemo(
    () => history.slice(0, 6).filter((e) => e.id !== lastPlayed?.id),
    [history, lastPlayed?.id],
  );
  const enabledSources = useSourcesStore((s) => s.registrations.filter((r) => r.enabled).length);

  const entryToTrack = (entry: (typeof history)[number]): Parameters<typeof play>[0] => ({
    id: entry.id,
    source: entry.source,
    sourceId: entry.sourceId,
    title: entry.title,
    artists: [
      {
        id: entry.sourceId,
        source: entry.source,
        name: entry.artist,
      },
    ],
    album: entry.album
      ? {
          id: entry.album,
          source: entry.source,
          title: entry.album,
          artists: [{ id: entry.sourceId, source: entry.source, name: entry.artist }],
        }
      : undefined,
    artworkUrl: entry.artworkUrl ?? undefined,
    durationMs: entry.durationMs,
    isPlayable: true,
  });

  const handleResume = (): void => {
    if (!lastPlayed) return;
    play(entryToTrack(lastPlayed));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto px-8 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-white">{greeting()}</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {lastPlayed
            ? `Pick up where you left off, or find something new.`
            : `Search across ${enabledSources} ${
                enabledSources === 1 ? 'source' : 'sources'
              } or open your library to get started.`}
        </p>
      </div>

      <div className="max-w-5xl w-full mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={handleResume}
          disabled={!lastPlayed}
          data-testid="home-jump-back-in"
          className="text-left p-5 rounded-2xl bg-gradient-to-br from-brand-900/40 to-accent-900/30 border border-brand-500/30 hover:border-brand-400/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-brand-300 font-medium mb-2">
            <Play size={11} aria-hidden />
            Jump back in
          </div>
          {lastPlayed ? (
            <>
              <p className="text-base font-semibold text-white truncate">{lastPlayed.title}</p>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {lastPlayed.artist}
                {lastPlayed.album ? ` · ${lastPlayed.album}` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-zinc-300">Nothing to resume</p>
              <p className="text-xs text-zinc-500 mt-0.5">Play a track and it will appear here.</p>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/search')}
            data-testid="home-cta-search"
            className="text-left p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 hover:border-brand-500/50 transition-colors group"
          >
            <Search size={18} className="text-brand-400 mb-2" aria-hidden />
            <p className="text-sm font-semibold text-white">Search</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Find tracks, artists, albums</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/library')}
            data-testid="home-cta-library"
            className="text-left p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 hover:border-brand-500/50 transition-colors group"
          >
            <Library size={18} className="text-brand-400 mb-2" aria-hidden />
            <p className="text-sm font-semibold text-white">Library</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">
              {stats.trackCount > 0
                ? `${stats.trackCount.toLocaleString()} tracks · ${stats.artistCount.toLocaleString()} artists`
                : 'Add folders to scan'}
            </p>
          </button>
        </div>
      </div>

      {jumpBackIn.length > 0 && (
        <section className="max-w-5xl w-full mx-auto px-8 mt-8">
          <header className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5">
              <History size={14} className="text-zinc-500" aria-hidden />
              Recently played
            </h2>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
            >
              See all
              <ChevronRight size={12} aria-hidden />
            </button>
          </header>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="list">
            {jumpBackIn.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => play(entryToTrack(entry))}
                  className="group w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-zinc-900/70 cursor-pointer transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center text-zinc-600">
                    {entry.artworkUrl ? (
                      <img src={entry.artworkUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music size={14} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-100 truncate">{entry.title}</p>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {entry.artist} · {formatDuration(entry.durationMs)}
                    </p>
                  </div>
                  <Play
                    size={12}
                    className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="max-w-5xl w-full mx-auto px-8 mt-8 mb-4">
        <ForYouSection
          limit={4}
          layout="grid"
          showHeader
          eyebrow="Because you listened"
          explanation="Tracks from your recent listening history."
          emptyAction={
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:border-brand-500/40 hover:text-white transition-colors"
              >
                <Search size={12} />
                Search now
              </button>
              <button
                type="button"
                onClick={() => navigate('/library')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:border-brand-500/40 hover:text-white transition-colors"
              >
                <Library size={12} />
                Open Library
              </button>
              <button
                type="button"
                onClick={() => navigate('/explore')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:border-brand-500/40 hover:text-white transition-colors"
              >
                <Compass size={12} />
                Browse sources
              </button>
            </div>
          }
        />
      </section>

      <div className="max-w-5xl w-full mx-auto px-8 pb-8 mt-6 text-xs text-zinc-600 flex items-center gap-3 border-t border-zinc-800/40 pt-6">
        <Disc3 size={12} className="text-brand-500" />
        <span>
          Harmonix v{version} · {platform ?? 'detecting…'}
        </span>
      </div>
    </div>
  );
}
