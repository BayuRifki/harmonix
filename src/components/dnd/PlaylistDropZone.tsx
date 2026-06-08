import { useDroppable } from '@dnd-kit/core';
import { type ReactNode } from 'react';
import { DND_TYPES, type PlaylistDragData } from '@/lib/dndData';

export interface PlaylistDropZoneProps {
  playlistId: number;
  playlistName: string;
  children: ReactNode;
  className?: string;
}

export function PlaylistDropZone({
  playlistId,
  playlistName,
  children,
  className = '',
}: PlaylistDropZoneProps): JSX.Element {
  const data: PlaylistDragData = {
    type: DND_TYPES.PLAYLIST,
    playlistId,
    playlistName,
  };
  const { setNodeRef, isOver, active } = useDroppable({
    id: `playlist-${playlistId}`,
    data,
  });
  const accepting = isOver && active?.data.current?.type === DND_TYPES.TRACK;
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${accepting ? 'ring-2 ring-brand-400 bg-brand-500/10 rounded-lg' : ''}`}
      data-testid={`playlist-drop-${playlistId}`}
      aria-label={`Drop a track to add to ${playlistName}`}
    >
      {children}
    </div>
  );
}
