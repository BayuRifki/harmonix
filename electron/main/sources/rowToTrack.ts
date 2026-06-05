import { pathToFileURL } from 'node:url';
import type { Track, Album, Artist } from './types';
import type { TrackRow } from '../db';

export function fileUrl(filePath: string): string {
  return pathToFileURL(filePath).toString();
}

export function rowToTrack(row: TrackRow): Track {
  const artistList: Artist[] = row.artist
    ? [{ id: `local:artist:${row.artist}`, name: row.artist, source: 'local' }]
    : [];
  const albumObj: Album | undefined = row.album
    ? {
        id: `local:album:${row.album_artist ?? row.artist ?? ''}:${row.album}`,
        title: row.album,
        artists: row.album_artist
          ? [{ id: `local:artist:${row.album_artist}`, name: row.album_artist, source: 'local' }]
          : artistList,
        source: 'local',
      }
    : undefined;
  return {
    id: `local:${row.id}`,
    source: 'local',
    sourceId: String(row.id),
    title: row.title ?? 'Unknown Title',
    artists: artistList,
    album: albumObj,
    durationMs: row.duration_ms ?? 0,
    artworkUrl: row.artwork_path ? fileUrl(row.artwork_path) : undefined,
    isrc: row.isrc ?? undefined,
    isPlayable: true,
    meta: { filePath: row.file_path },
  };
}
