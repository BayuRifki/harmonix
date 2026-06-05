import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSourcesStore } from '@/stores/sourcesStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { Track, SourceSearchResult } from '@/types/global';

type GroupedResults = SourceSearchResult & { sourceName: string };

function getArtistNames(track: Track): string {
  return track.artists.map((a) => a.name).join(', ') || 'Unknown';
}

export function SearchView(): JSX.Element {
  const registrations = useSourcesStore((s) => s.registrations);
  const refresh = useSourcesStore((s) => s.refresh);
  const search = useSourcesStore((s) => s.search);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResults[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeSourceIds, setActiveSourceIds] = useState<string[]>([]);
  const playQueue = usePlayerStore((s) => s.setQueue);
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceParam = searchParams.get('source');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (registrations.length === 0) return;
    if (sourceParam && activeSourceIds.length === 0) {
      setActiveSourceIds([sourceParam]);
    } else if (activeSourceIds.length === 0) {
      setActiveSourceIds(registrations.filter((r) => r.enabled).map((r) => r.id));
    }
  }, [registrations, activeSourceIds.length, sourceParam]);

  const enabledSources = useMemo(
    () => registrations.filter((r) => r.enabled),
    [registrations],
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(async () => {
      const sourceIds = activeSourceIds.length > 0 ? activeSourceIds : undefined;
      try {
        const r = await search(query, { limit: 25 }, sourceIds);
        if (!cancelled) {
          const regMap = new Map(registrations.map((r) => [r.id, r.name]));
          const grouped: GroupedResults[] = r.map((sr) => ({
            ...sr,
            sourceName: regMap.get(sr.sourceId) ?? sr.sourceId,
          }));
          setResults(grouped);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, activeSourceIds, search, registrations]);

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

  const totalTracks = results.reduce((sum, r) => sum + r.result.tracks.length, 0);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-2">Search</h1>
      <p className="text-zinc-400 mb-4 text-sm">
        Search across all enabled music sources at once.
      </p>

      <input
        type="search"
        placeholder="Search for tracks, artists, albums…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
        autoFocus
      />

      {enabledSources.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {enabledSources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSource(s.id)}
              className={`px-2.5 py-1 text-xs rounded-full border transition ${
                activeSourceIds.includes(s.id)
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        {query.trim() === '' ? (
          <div className="text-zinc-500 text-sm py-8 text-center border border-dashed border-zinc-800 rounded">
            Start typing to search across {enabledSources.length} source{enabledSources.length === 1 ? '' : 's'}.
          </div>
        ) : searching ? (
          <div className="text-zinc-500 text-sm py-8 text-center">Searching…</div>
        ) : totalTracks === 0 ? (
          <div className="text-zinc-500 text-sm py-8 text-center border border-dashed border-zinc-800 rounded">
            No results for &quot;{query}&quot;.
          </div>
        ) : (
          <div className="space-y-6">
            {results
              .filter((r) => r.result.tracks.length > 0)
              .map((group) => (
                <section key={group.sourceId}>
                  <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-2 flex items-center gap-2">
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
                        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-900 cursor-pointer"
                      >
                        <span className="text-zinc-500 text-xs w-8 text-right tabular-nums">
                          {Math.floor(track.durationMs / 60000)}:
                          {Math.floor((track.durationMs % 60000) / 1000)
                            .toString()
                            .padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-100 truncate">{track.title}</p>
                          <p className="text-xs text-zinc-500 truncate">
                            {getArtistNames(track)}
                            {track.album && ` · ${track.album.title}`}
                          </p>
                        </div>
                        <code className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">
                          {track.source}
                        </code>
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
