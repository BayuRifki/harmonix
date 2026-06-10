import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/playerStore';
import { AddToPlaylistMenu } from '@/features/playlist/AddToPlaylistMenu';
import { useVirtualWindow } from '@/hooks/useVirtualWindow';
import { useInsightsStore } from '@/stores/insightsStore';
import type { Track } from '@/types/global';
import {
  itemVariants,
  itemVariantsReduced,
  useReducedMotion,
} from '@/components/ui/StaggerAnimations';

interface TrackListProps {
  tracks: Track[];
  onPlay: (track: Track) => void;
}

const ROW_HEIGHT = 40;
const VIRTUAL_THRESHOLD = 200;
const OVERSCAN = 6;

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function TrackList({ tracks, onPlay }: TrackListProps): JSX.Element {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const openInsights = useInsightsStore((s) => s.open);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? itemVariantsReduced : itemVariants;

  const handleShowInsights = (t: Track): void => openInsights(t);

  if (tracks.length === 0) {
    return (
      <div className="text-zinc-500 text-sm py-12 text-center border border-dashed border-zinc-800 rounded">
        No tracks yet. Add a folder and start a scan.
      </div>
    );
  }

  const useVirtual = tracks.length > VIRTUAL_THRESHOLD;

  if (!useVirtual) {
    return (
      <>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase border-b border-zinc-800">
              <th className="py-2 px-2 w-10">#</th>
              <th className="py-2 px-2">Title</th>
              <th className="py-2 px-2">Artist</th>
              <th className="py-2 px-2">Album</th>
              <th className="py-2 px-2">Source</th>
              <th className="py-2 px-2 text-right">Duration</th>
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, i) => (
              <motion.tr
                key={track.id}
                variants={variants}
                initial="hidden"
                animate="show"
                style={{ height: ROW_HEIGHT }}
                className={`border-b border-zinc-900 hover:bg-zinc-900 ${currentTrack?.id === track.id ? 'bg-zinc-900' : ''}`}
              >
                <td
                  className="py-2 px-2 text-zinc-500 cursor-pointer"
                  onClick={() => onPlay(track)}
                  style={{ height: ROW_HEIGHT }}
                >
                  {currentTrack?.id === track.id && isPlaying ? '▶' : i + 1}
                </td>
                <td
                  className="py-2 px-2 text-zinc-100 truncate max-w-xs cursor-pointer"
                  onClick={() => onPlay(track)}
                  style={{ height: ROW_HEIGHT }}
                >
                  {track.title}
                </td>
                <td
                  className="py-2 px-2 text-zinc-400 truncate max-w-xs"
                  style={{ height: ROW_HEIGHT }}
                >
                  {track.artists.map((a) => a.name).join(', ') || '—'}
                </td>
                <td
                  className="py-2 px-2 text-zinc-500 truncate max-w-xs"
                  style={{ height: ROW_HEIGHT }}
                >
                  {track.album?.title ?? '—'}
                </td>
                <td className="py-2 px-2" style={{ height: ROW_HEIGHT }}>
                  <code className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                    {track.source}
                  </code>
                </td>
                <td
                  className="py-2 px-2 text-zinc-500 text-right tabular-nums"
                  style={{ height: ROW_HEIGHT }}
                >
                  {formatDuration(track.durationMs)}
                </td>
                <td className="py-2 px-2 text-right" style={{ height: ROW_HEIGHT }}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowInsights(track);
                      }}
                      className="text-zinc-500 hover:text-brand-400 text-xs px-1"
                      title="Show track insights"
                      aria-label={`Show insights for ${track.title}`}
                    >
                      ⓘ
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddToPlaylistTrack(track);
                      }}
                      className="text-zinc-500 hover:text-brand-400 text-xs px-1"
                      title="Add to playlist"
                      aria-label={`Add ${track.title} to playlist`}
                    >
                      +
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {addToPlaylistTrack && (
          <AddToPlaylistMenu
            track={addToPlaylistTrack}
            open={!!addToPlaylistTrack}
            onClose={() => setAddToPlaylistTrack(null)}
          />
        )}
      </>
    );
  }

  return (
    <VirtualTrackList
      tracks={tracks}
      currentTrackId={currentTrack?.id ?? null}
      onPlay={onPlay}
      onAdd={setAddToPlaylistTrack}
      onShowInsights={handleShowInsights}
      addToPlaylistTrack={addToPlaylistTrack}
      onCloseAdd={() => setAddToPlaylistTrack(null)}
    />
  );
}

interface VirtualTrackListProps {
  tracks: Track[];
  currentTrackId: string | null;
  onPlay: (track: Track) => void;
  onAdd: (track: Track) => void;
  onShowInsights: (track: Track) => void;
  addToPlaylistTrack: Track | null;
  onCloseAdd: () => void;
}

function VirtualTrackList({
  tracks,
  currentTrackId,
  onPlay,
  onAdd,
  onShowInsights,
  addToPlaylistTrack,
  onCloseAdd,
}: VirtualTrackListProps): JSX.Element {
  const { scrollRef, startIndex, endIndex, offsetY, totalHeight } = useVirtualWindow({
    itemCount: tracks.length,
    itemHeight: ROW_HEIGHT,
    overscan: OVERSCAN,
  });
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? itemVariantsReduced : itemVariants;

  const visible = tracks.slice(startIndex, endIndex);

  return (
    <>
      <div
        ref={scrollRef}
        className="overflow-y-auto border border-zinc-800 rounded"
        style={{ maxHeight: '70vh' }}
      >
        <table className="w-full text-sm table-fixed">
          <thead className="sticky top-0 bg-zinc-900 z-10">
            <tr className="text-left text-xs text-zinc-500 uppercase border-b border-zinc-800">
              <th className="py-2 px-2 w-10">#</th>
              <th className="py-2 px-2">Title</th>
              <th className="py-2 px-2">Artist</th>
              <th className="py-2 px-2">Album</th>
              <th className="py-2 px-2">Source</th>
              <th className="py-2 px-2 text-right">Duration</th>
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody style={{ height: totalHeight, position: 'relative', display: 'block' }}>
            <tr style={{ height: offsetY, padding: 0, border: 0 }}>
              <td colSpan={7} style={{ padding: 0, border: 0, lineHeight: 0 }} />
            </tr>
            {visible.map((track, i) => {
              const realIndex = startIndex + i;
              const isCurrent = currentTrackId === track.id;
              return (
                <motion.tr
                  key={track.id}
                  variants={variants}
                  initial="hidden"
                  animate="show"
                  style={{ height: ROW_HEIGHT }}
                >
                  <td
                    className="py-2 px-2 text-zinc-500 cursor-pointer"
                    onClick={() => onPlay(track)}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {isCurrent && isPlaying ? '▶' : realIndex + 1}
                  </td>
                  <td
                    className="py-2 px-2 text-zinc-100 truncate max-w-xs cursor-pointer"
                    onClick={() => onPlay(track)}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {track.title}
                  </td>
                  <td
                    className="py-2 px-2 text-zinc-400 truncate max-w-xs"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {track.artists.map((a) => a.name).join(', ') || '—'}
                  </td>
                  <td
                    className="py-2 px-2 text-zinc-500 truncate max-w-xs"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {track.album?.title ?? '—'}
                  </td>
                  <td className="py-2 px-2" style={{ height: ROW_HEIGHT }}>
                    <code className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {track.source}
                    </code>
                  </td>
                  <td
                    className="py-2 px-2 text-zinc-500 text-right tabular-nums"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {formatDuration(track.durationMs)}
                  </td>
                  <td className="py-2 px-2 text-right" style={{ height: ROW_HEIGHT }}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowInsights(track);
                        }}
                        className="text-zinc-500 hover:text-brand-400 text-xs px-1"
                        title="Show track insights"
                        aria-label={`Show insights for ${track.title}`}
                      >
                        ⓘ
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdd(track);
                        }}
                        className="text-zinc-500 hover:text-brand-400 text-xs px-1"
                        title="Add to playlist"
                        aria-label={`Add ${track.title} to playlist`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {addToPlaylistTrack && (
        <AddToPlaylistMenu
          track={addToPlaylistTrack}
          open={!!addToPlaylistTrack}
          onClose={onCloseAdd}
        />
      )}
    </>
  );
}
