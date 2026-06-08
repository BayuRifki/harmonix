import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Track } from '@/types/global';
import { DND_TYPES } from '@/lib/dndData';
import { GripVertical } from 'lucide-react';

export interface DraggableTrackProps {
  track: Track;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DraggableTrack({
  track,
  children,
  className = '',
  disabled = false,
}: DraggableTrackProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `track-${track.id}`,
    data: { type: DND_TYPES.TRACK, track },
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled ? 'default' : 'grab',
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${className}`}
      data-testid={`draggable-track-${track.id}`}
      {...attributes}
      {...listeners}
    >
      {children}
      {!disabled && (
        <span
          aria-hidden
          className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        >
          <GripVertical size={11} />
        </span>
      )}
    </div>
  );
}
