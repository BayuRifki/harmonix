import { useEffect, useMemo, useState, useRef, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SearchCheck, Sparkles, Play, History, Info } from 'lucide-react';
import { useSourcesStore } from '@/stores/sourcesStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useInsightsStore } from '@/stores/insightsStore';
import { useSearchHistoryStore } from '@/stores/searchHistoryStore';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Track, SourceSearchResult } from '@/types/global';
import { SearchFiltersBar } from '@/features/search/SearchFiltersBar';
import {
  applyFilters,
  DEFAULT_FILTERS,
  readFiltersFromParams,
  writeFiltersToParams,
  type SearchFiltersState,
} from '@/features/search/searchFilters';

type GroupedResults = SourceSearchResult & { sourceName: string };

function getArtistNames(track: Track): string {
  return track.artists.map((a) => a.name).join(', ') || 'Unknown';
}

function formatDuration(ms: number): string {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export function SearchView(): JSX.Element {
  const registrations = useSourcesStore((s) => s.registrations);
  const refresh = useSourcesStore((s) => s.refresh);
  const search = useSourcesStore((s) => s.search);
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [results, setResults] = useState<GroupedResults[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeSourceIds, setActiveSourceIds] = useState<string[]>([]);
  const playQueue = usePlayerStore((s) => s.setQueue);
  const recent = useSearchHistoryStore((s) => s.queries);
  const addRecent = useSearchHistoryStore((s) => s.add);
  const clearRecent = useSearchHistoryStore((s) => s.clear);
  const sourceParam = searchParams.get('source');
  const [filters, setFilters] = useState<SearchFiltersState>(() =>
    readFiltersFromParams(searchParams),
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const urlQuery = searchParams.get('q') ?? '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync local query to URL when user types in SearchView
  useEffect(() => {
    if (query.trim()) {
      setSearchParams({ q: query }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [query, setSearchParams]);

  useEffect(() => {
    if (registrations.length === 0) return;
    if (sourceParam && activeSourceIds.length === 0) {
      setActiveSourceIds([sourceParam]);
    } else if (activeSourceIds.length === 0) {
      setActiveSourceIds(registrations.filter((r) => r.enabled).map((r) => r.id));
    }
  }, [registrations, activeSourceIds.length, sourceParam]);

  // AbortController for search concurrency
  const abortRef = useRef<AbortController | null>(null);

  const enabledSources = useMemo(() => registrations.filter((r) => r.enabled), [registrations]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    // Cancel previous search
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    const saveHandle = window.setTimeout(() => {
      addRecent(q);
    }, 1500);
    const handle = window.setTimeout(async () => {
      const sourceIds = activeSourceIds.length > 0 ? activeSourceIds : undefined;
      try {
        const r = await search(q, { limit: 25 }, sourceIds);
        if (!controller.signal.aborted) {
          const regMap = new Map(registrations.map((rr) => [rr.id, rr.name]));
          const grouped: GroupedResults[] = r.map((sr) => ({
            ...sr,
            sourceName: regMap.get(sr.sourceId) ?? sr.sourceId,
          }));
          setResults(grouped);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError' && !controller.signal.aborted) {
          console.error('[SearchView] search error:', err);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
      window.clearTimeout(saveHandle);
    };
  }, [query, activeSourceIds, search, registrations, addRecent]);

  const toggleSource = (id: string): void => {
    setActiveSourceIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (sourceParam) {
        const params = new URLSearchParams(searchParams);
        if (next.length === 0) params.delete('source');
        else params.set('source', next.join(','));
        setSearchParams(params, { replace: true });
      }
      return next;
    });
  };

  const handleFiltersChange = (next: SearchFiltersState): void => {
    setFilters(next);
    const params = writeFiltersToParams(next, searchParams);
    setSearchParams(params, { replace: true });
  };

  const handleResetFilters = (): void => {
    setFilters(DEFAULT_FILTERS);
    const params = writeFiltersToParams(DEFAULT_FILTERS, searchParams);
    setSearchParams(params, { replace: true });
  };

  const filteredResults = useMemo(
    () =>
      results.map((g) => ({
        ...g,
        result: {
          ...g.result,
          tracks: applyFilters(g.result.tracks, filters),
        },
      })),
    [results, filters],
  );

  const deferredFilteredResults = useDeferredValue(filteredResults);

  const totalTracks = deferredFilteredResults.reduce((sum, r) => sum + r.result.tracks.length, 0);

  const topTrack = useMemo(() => {
    for (const g of deferredFilteredResults) {
      if (g.result.tracks.length > 0) return g.result.tracks[0];
    }
    return null;
  }, [deferredFilteredResults]);
  const topTrackGroup = useMemo(() => {
    if (!topTrack) return null;
    return deferredFilteredResults.find((g) => g.result.tracks[0]?.id === topTrack.id) ?? null;
  }, [deferredFilteredResults, topTrack]);

  return (
    <div className="flex-1 p-8 max-w-4xl overflow-y-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Search</h1>
      <p className="text-zinc-400 mb-4 text-sm">Search across all enabled music sources at once.</p>

      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
        />
        <input
          type="search"
          placeholder="Search for tracks, artists, albums…"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (next.trim()) {
              setSearchParams({ q: next }, { replace: true });
            } else {
              setSearchParams({}, { replace: true });
            }
          }}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
          autoFocus
        />
      </div>

      {enabledSources.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {enabledSources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSource(s.id)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-150 active:scale-[0.95] ${
                activeSourceIds.includes(s.id)
                  ? 'bg-brand-500/20 border-brand-500/60 text-brand-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <SearchFiltersBar
        sources={enabledSources.map((s) => ({ id: s.id, name: s.name }))}
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      <div className="mt-2">
        {query.trim() === '' ? (
          <div className="space-y-4">
            {recent.length > 0 && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium inline-flex items-center gap-1.5">
                    <History size={14} /> Recent searches
                  </h3>
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuery(q)}
                      className="group flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-full text-xs text-zinc-300 hover:border-brand-500/50 hover:text-white transition-all active:scale-95"
                    >
                      <Search size={12} className="opacity-50" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="text-zinc-400 text-sm py-12 text-center border border-dashed border-zinc-700 rounded-xl animate-fade-in">
              <Sparkles size={24} className="mx-auto mb-3 opacity-50" />
              <p>
                Start typing to search across {enabledSources.length} source
                {enabledSources.length === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
        ) : searching ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : totalTracks === 0 ? (
          <div className="text-zinc-400 text-sm py-12 text-center border border-dashed border-zinc-700 rounded-xl animate-fade-in">
            <SearchCheck size={24} className="mx-auto mb-3 opacity-50" />
            <p>No results for &quot;{query}&quot;.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {topTrack && topTrackGroup && (
              <button
                type="button"
                onClick={() => void playQueue(topTrackGroup.result.tracks, 0)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-brand-900/30 to-accent-900/20 border border-brand-500/30 hover:border-brand-400/60 transition-all duration-200 active:scale-[0.99] text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-zinc-800/60 overflow-hidden flex items-center justify-center text-zinc-600 shrink-0">
                  {topTrack.artworkUrl ? (
                    <img src={topTrack.artworkUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Play size={20} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-brand-300 font-medium">
                    Top result · {topTrackGroup.sourceName}
                  </p>
                  <p className="text-base font-semibold text-white truncate mt-0.5">
                    {topTrack.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {topTrack.artists.map((a) => a.name).join(', ')}
                  </p>
                </div>
                <Play size={20} className="text-brand-300 shrink-0 mr-2" />
              </button>
            )}
            {deferredFilteredResults
              .filter((r) => r.result.tracks.length > 0)
              .map((group) => (
                <section key={group.sourceId}>
                  <h2 className="text-xs uppercase tracking-wide text-zinc-400 mb-2 flex items-center gap-2">
                    <span>{group.sourceName}</span>
                    <span className="text-zinc-700">·</span>
                    <span>{group.result.tracks.length} tracks</span>
                  </h2>
                  <ul className="space-y-1">
                    {group.result.tracks.map((track) => (
                      <li
                        key={track.id}
                        onDoubleClick={() =>
                          void playQueue(group.result.tracks, group.result.tracks.indexOf(track))
                        }
                        className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 cursor-pointer transition-colors"
                      >
                        <span className="text-zinc-500 text-xs w-8 text-right tabular-nums">
                          {formatDuration(track.durationMs)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-100 truncate">{track.title}</p>
                          <p className="text-xs text-zinc-500 truncate">
                            {getArtistNames(track)}
                            {track.album && ` · ${track.album.title}`}
                          </p>
                        </div>
                        <code className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {track.source}
                        </code>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            useInsightsStore.getState().open(track);
                          }}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-full hover:bg-brand-500/20 text-zinc-400 hover:text-brand-400 transition-all active:scale-95"
                          aria-label={`Show insights for ${track.title}`}
                          title="Show insights"
                        >
                          <Info size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void playQueue(group.result.tracks, group.result.tracks.indexOf(track))
                          }
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-full hover:bg-brand-500/20 text-zinc-400 hover:text-brand-400 transition-all active:scale-95"
                          aria-label="Play track"
                        >
                          <Play size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
