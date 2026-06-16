import { useMemo } from 'react';
import { History, Play, Music } from 'lucide-react';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { EmptyState } from '@/components/ui/EmptyState';

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export function HistoryView(): JSX.Element {
  const history = useListeningHistoryStore((s) => s.entries);
  const play = usePlayerStore((s) => s.play);

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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof history>();
    for (const entry of history) {
      const date = new Date(entry.playedAt);
      const key = date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const arr = map.get(key) ?? [];
      arr.push(entry);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [history]);

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white inline-flex items-center gap-2">
          <History size={22} className="text-brand-400" aria-hidden />
          Listening History
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          {history.length > 0
            ? `${history.length} tracks played recently.`
            : 'Tracks you play will appear here.'}
        </p>
      </header>

      {history.length === 0 ? (
        <EmptyState
          icon={<Music size={24} />}
          title="No history yet"
          description="Play some tracks and they will show up here."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, entries]) => (
            <section key={date}>
              <h2 className="text-xs uppercase tracking-wide text-zinc-500 font-medium mb-2 sticky top-0 bg-[var(--bg-primary)] py-1">
                {date}
              </h2>
              <ul className="space-y-1">
                {entries.map((entry) => (
                  <li key={`${entry.id}-${entry.playedAt}`}>
                    <button
                      type="button"
                      onClick={() => play(entryToTrack(entry))}
                      className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center text-zinc-600">
                        {entry.artworkUrl ? (
                          <img
                            src={entry.artworkUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music size={14} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-100 truncate">{entry.title}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {entry.artist}
                          {entry.album ? ` · ${entry.album}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-600 tabular-nums">
                        {formatDuration(entry.durationMs)}
                      </span>
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
          ))}
        </div>
      )}
    </div>
  );
}
