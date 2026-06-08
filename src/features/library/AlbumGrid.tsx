import { Music } from 'lucide-react';
import type { AlbumSummary } from '@/types/global';

interface AlbumGridProps {
  albums: AlbumSummary[];
}

export function AlbumGrid({ albums }: AlbumGridProps): JSX.Element {
  if (albums.length === 0) {
    return (
      <div className="text-zinc-500 text-sm py-12 text-center border border-dashed border-zinc-800 rounded">
        No albums yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {albums.map((album) => (
        <div
          key={`${album.artist}-${album.title}`}
          className="bg-zinc-900 border border-zinc-800 rounded p-3 hover:bg-zinc-800 transition cursor-pointer"
        >
          <div className="aspect-square bg-zinc-800 rounded mb-3 flex items-center justify-center text-3xl text-zinc-600">
            <Music size={28} />
          </div>
          <p className="text-sm text-white font-medium truncate" title={album.title}>
            {album.title}
          </p>
          <p className="text-xs text-zinc-500 truncate" title={album.artist}>
            {album.artist}
          </p>
          <p className="text-xs text-zinc-600 mt-1">{album.trackCount} tracks</p>
        </div>
      ))}
    </div>
  );
}
