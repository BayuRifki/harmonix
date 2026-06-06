import { Play, Music } from 'lucide-react';
import type { HistoryEntry } from '@/stores/listeningHistoryStore';

interface RecommendationCardProps {
  entry: HistoryEntry;
  onPlay?: () => void;
}

function gradientForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const gradients = [
    'linear-gradient(135deg, #f472b6, #ec4899)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #db2777, #be185d)',
    'linear-gradient(135deg, #f9a8d4, #f472b6)',
    'linear-gradient(135deg, #be185d, #831843)',
    'linear-gradient(135deg, #fbcfe8, #f9a8d4)',
  ];
  return gradients[Math.abs(hash) % gradients.length] ?? gradients[0]!;
}

export function RecommendationCard({ entry, onPlay }: RecommendationCardProps): JSX.Element {
  return (
    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900/60 transition-colors duration-150 cursor-pointer">
      <div
        className="w-12 h-12 rounded-md shrink-0 flex items-center justify-center text-white/90 relative overflow-hidden"
        style={{ background: gradientForId(entry.id) }}
        aria-hidden
      >
        {entry.artworkUrl ? (
          <img
            src={entry.artworkUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Music size={18} />
        )}
        {onPlay && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            aria-label={`Play ${entry.title}`}
          >
            <Play size={18} className="text-white fill-white" />
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-100 truncate">{entry.title}</p>
        <p className="text-xs text-zinc-500 truncate">{entry.artist}</p>
      </div>
    </div>
  );
}
