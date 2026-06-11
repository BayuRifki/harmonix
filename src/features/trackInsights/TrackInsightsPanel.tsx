import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Disc3,
  ListPlus,
  Mic2,
  Music,
  Play,
  PlusCircle,
  Repeat,
  User,
} from 'lucide-react';
import { SidePanel } from '@/components/ui/SidePanel';
import { Button } from '@/components/ui/Button';
import { AddToPlaylistMenu } from '@/features/playlist/AddToPlaylistMenu';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useToastStore } from '@/components/ui/toastStore';
import { formatPlayCount, formatRelativeTime, useTrackInsights } from './useTrackInsights';
import { SimilarTracksRail } from './SimilarTracksRail';
import type { Track } from '@/types/global';

interface TrackInsightsPanelProps {
  track: Track | null;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'local':
      return 'Local file';
    case 'spotify':
      return 'Spotify';
    case 'ytmusic':
      return 'YouTube Music';
    case 'deezer':
      return 'Deezer';
    case 'jamendo':
      return 'Jamendo';
    case 'audius':
      return 'Audius';
    case 'soundcloud':
      return 'SoundCloud';
    case 'demo':
      return 'Demo';
    default:
      return source;
  }
}

export function TrackInsightsPanel({ track, onClose }: TrackInsightsPanelProps): JSX.Element {
  const navigate = useNavigate();
  const insights = useTrackInsights(track);
  const play = usePlayerStore((s) => s.play);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const setLibrarySearch = useLibraryStore((s) => s.setSearchQuery);
  const addToast = useToastStore((s) => s.add);
  const [addOpen, setAddOpen] = useState(false);

  const closeAdd = useCallback(() => setAddOpen(false), []);

  const handleGoToArtist = useCallback(() => {
    if (!track) return;
    const firstArtist = track.artists[0];
    if (!firstArtist) return;
    setLibrarySearch(firstArtist.name);
    navigate('/library');
    onClose();
  }, [track, setLibrarySearch, navigate, onClose]);

  const handleGoToAlbum = useCallback(() => {
    if (!track?.album) return;
    setLibrarySearch(track.album.title);
    navigate('/library');
    onClose();
  }, [track, setLibrarySearch, navigate, onClose]);

  const handleQueueNext = useCallback(() => {
    if (!track) return;
    const store = usePlayerStore.getState();
    const queue = store.queue.slice();
    const insertAt = Math.min(queue.length, store.queueIndex + 1);
    store.insertIntoQueue(track, insertAt);
    addToast(`${track.title} queued next`, 'success', 2500);
  }, [track, addToast]);

  const handleQueueLater = useCallback(() => {
    if (!track) return;
    const store = usePlayerStore.getState();
    store.insertIntoQueue(track, store.queue.length);
    addToast(`${track.title} queued for later`, 'success', 2500);
  }, [track, addToast]);

  const handlePlaySimilar = useCallback(async () => {
    if (!track) return;
    // Show loading state
    addToast('Finding similar tracks…', 'info', 3000);
    try {
      const results = await window.api.sources.search({
        query: track.artists[0]?.name ?? track.title,
        options: { limit: 5 },
      });
      const related: Track[] = [];
      const seen = new Set<string>([track.id]);
      for (const group of results) {
        for (const t of group.result.tracks ?? []) {
          if (t.id && !seen.has(t.id)) {
            seen.add(t.id);
            related.push(t);
            if (related.length >= 5) break;
          }
        }
        if (related.length >= 5) break;
      }
      if (related.length > 0) {
        await setQueue([track, ...related], 0, { shuffle: false, smartShuffle: false });
        addToast('Playing similar tracks', 'success', 2000);
        onClose();
        return;
      }
    } catch (err) {
      console.error('[TrackInsights] Play Similar failed:', err);
      addToast('Failed to find similar tracks', 'error', 3000);
    }
    void play(track);
    onClose();
  }, [track, setQueue, play, addToast, onClose]);

  return (
    <>
      <SidePanel
        open={!!track}
        onClose={onClose}
        title={track ? 'Track insights' : ''}
        width="md"
        ariaLabelledBy="track-insights-title"
      >
        {!track || !insights ? (
          <div className="p-6 text-zinc-400 text-sm">No track selected.</div>
        ) : (
          <div className="p-5 space-y-6" data-testid="track-insights-panel">
            <section
              className="flex gap-4"
              data-testid="track-insights-header"
              aria-label="Track header"
            >
              {track.artworkUrl ? (
                <img
                  src={track.artworkUrl}
                  alt=""
                  className="w-24 h-24 rounded-lg object-cover bg-zinc-800 flex-none shadow-md"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-lg bg-zinc-800 flex-none flex items-center justify-center"
                  aria-hidden
                >
                  <Music size={32} className="text-zinc-600" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-base font-semibold text-zinc-100 line-clamp-2">
                  {track.title}
                </h3>
                <p className="text-sm text-zinc-300 truncate">
                  {track.artists.map((a) => a.name).join(', ') || 'Unknown artist'}
                </p>
                {track.album && (
                  <p className="text-xs text-zinc-500 truncate">
                    from <span className="text-zinc-400">{track.album.title}</span>
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      void play(track);
                      onClose();
                    }}
                    data-testid="track-insights-play"
                  >
                    <Play size={14} />
                    Play
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAddOpen(true)}
                    data-testid="track-insights-add"
                  >
                    <ListPlus size={14} />
                    Add to playlist
                  </Button>
                </div>
              </div>
            </section>

            <section
              className="grid grid-cols-2 gap-3 text-sm"
              data-testid="track-insights-meta"
              aria-label="Track metadata"
            >
              <MetaItem
                icon={<Disc3 size={14} />}
                label="Source"
                value={sourceLabel(track.source)}
              />
              <MetaItem
                icon={<Clock size={14} />}
                label="Duration"
                value={formatDuration(track.durationMs)}
              />
              <MetaItem
                icon={<Mic2 size={14} />}
                label="Artists"
                value={
                  track.artists.length === 0
                    ? '—'
                    : track.artists.length === 1
                      ? (track.artists[0]?.name ?? '—')
                      : `${track.artists.length} artists`
                }
              />
              <MetaItem
                icon={<Calendar size={14} />}
                label="Played"
                value={formatPlayCount(insights.playCount)}
              />
              <MetaItem
                icon={<Repeat size={14} />}
                label="Last played"
                value={formatRelativeTime(insights.lastPlayedAt)}
              />
              {track.isrc && (
                <MetaItem icon={<Music size={14} />} label="ISRC" value={track.isrc} />
              )}
            </section>

            <section
              className="space-y-2"
              data-testid="track-insights-actions"
              aria-label="Quick actions"
            >
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Quick actions
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleQueueNext}
                  data-testid="track-insights-queue-next"
                >
                  <PlusCircle size={14} />
                  Queue next
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleQueueLater}
                  data-testid="track-insights-queue-later"
                >
                  <PlusCircle size={14} />
                  Queue later
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoToArtist}
                  disabled={track.artists.length === 0}
                  data-testid="track-insights-go-artist"
                >
                  <User size={14} />
                  Go to artist
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoToAlbum}
                  disabled={!track.album}
                  data-testid="track-insights-go-album"
                >
                  <Disc3 size={14} />
                  Go to album
                </Button>
              </div>
            </section>

            <section
              className="space-y-3"
              data-testid="track-insights-similar"
              aria-label="Similar tracks"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Similar tracks
                </h4>
                <button
                  type="button"
                  onClick={() => void handlePlaySimilar()}
                  className="text-xs text-brand-400 hover:text-brand-300"
                  data-testid="track-insights-play-similar"
                >
                  Play all
                </button>
              </div>
              <SimilarTracksRail track={track} onSelect={() => onClose()} />
            </section>
          </div>
        )}
      </SidePanel>
      {track && <AddToPlaylistMenu track={track} open={addOpen} onClose={closeAdd} />}
    </>
  );
}

interface MetaItemProps {
  icon: JSX.Element;
  label: string;
  value: string;
}

function MetaItem({ icon, label, value }: MetaItemProps): JSX.Element {
  return (
    <div
      className="flex items-start gap-2 p-2 rounded-lg bg-zinc-800/40 border border-zinc-800/60"
      data-testid="track-insights-meta-item"
    >
      <span className="text-zinc-500 mt-0.5 flex-none" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="text-sm text-zinc-100 truncate" title={value}>
          {value}
        </div>
      </div>
    </div>
  );
}

