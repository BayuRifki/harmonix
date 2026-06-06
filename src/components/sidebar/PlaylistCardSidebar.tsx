import { Music, Play } from 'lucide-react';
import type { PlaylistSummary } from '@/types/global';

interface PlaylistCardSidebarProps {
  playlist: PlaylistSummary;
  onClick?: () => void;
  onPlay?: () => void;
}

function gradientForId(id: number): string {
  const gradients = [
    'linear-gradient(135deg, #f472b6, #ec4899)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #db2777, #be185d)',
    'linear-gradient(135deg, #f9a8d4, #f472b6)',
    'linear-gradient(135deg, #be185d, #831843)',
    'linear-gradient(135deg, #fbcfe8, #f9a8d4)',
  ];
  return gradients[Math.abs(id) % gradients.length] ?? gradients[0]!;
}

export function PlaylistCardSidebar({
  playlist,
  onClick,
  onPlay,
}: PlaylistCardSidebarProps): JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-900/60 transition-colors duration-150 w-full text-left cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-md shrink-0 flex items-center justify-center text-white/90 relative overflow-hidden"
        style={{ background: gradientForId(playlist.id) }}
        aria-hidden
      >
        <Music size={16} />
        {onPlay && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            aria-label={`Play ${playlist.name}`}
          >
            <Play size={14} className="text-white fill-white" />
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-100 truncate">{playlist.name}</p>
        <p className="text-xs text-zinc-500 truncate">
          {playlist.trackCount} {playlist.trackCount === 1 ? 'song' : 'songs'}
        </p>
      </div>
    </div>
  );
}
