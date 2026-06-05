import type { Track } from '../sources/types';
import { getSource } from '../sources/registry';
import type { PlaylistTrackRef } from '../db/playlistRepository';

export interface ResolvedPlaylistTracks {
  tracks: Track[];
  unresolved: Array<{ position: number; source: string; sourceId: string }>;
}

export async function resolvePlaylistTracks(
  refs: PlaylistTrackRef[],
): Promise<ResolvedPlaylistTracks> {
  const tracks: Track[] = [];
  const unresolved: ResolvedPlaylistTracks['unresolved'] = [];
  for (const ref of refs) {
    const src = getSource(ref.source);
    if (!src) {
      unresolved.push({ position: ref.position, source: ref.source, sourceId: ref.source_id });
      continue;
    }
    try {
      const localId =
        ref.source === 'local' && !ref.source_id.startsWith('local:')
          ? `local:${ref.source_id}`
          : ref.source_id;
      const track = await src.getTrack(localId);
      if (track) tracks.push(track);
      else unresolved.push({ position: ref.position, source: ref.source, sourceId: ref.source_id });
    } catch {
      unresolved.push({ position: ref.position, source: ref.source, sourceId: ref.source_id });
    }
  }
  return { tracks, unresolved };
}
