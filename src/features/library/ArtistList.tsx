import type { ArtistSummary } from '@/types/global';

interface ArtistListProps {
  artists: ArtistSummary[];
}

export function ArtistList({ artists }: ArtistListProps): JSX.Element {
  if (artists.length === 0) {
    return (
      <div className="text-zinc-500 text-sm py-12 text-center border border-dashed border-zinc-800 rounded">
        No artists yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {artists.map((artist) => (
        <div
          key={artist.name}
          className="bg-zinc-900 border border-zinc-800 rounded p-3 hover:bg-zinc-800 transition cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg shrink-0">
            🎤
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate" title={artist.name}>
              {artist.name}
            </p>
            <p className="text-xs text-zinc-500">{artist.trackCount} tracks</p>
          </div>
        </div>
      ))}
    </div>
  );
}
