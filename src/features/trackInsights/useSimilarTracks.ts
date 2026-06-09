import { useEffect, useState } from 'react';
import type { Track } from '@/types/global';
import { collectSeedArtists, findRelatedTracks } from '@/stores/playerStore';

interface UseSimilarTracksState {
  tracks: Track[];
  loading: boolean;
  error: string | null;
}

const PER_SOURCE_LIMIT = 5;
const SIMILAR_LIMIT = 6;

async function searchAcrossSources(query: string): Promise<Track[]> {
  try {
    const results = await window.api.sources.search({
      query,
      options: { limit: PER_SOURCE_LIMIT },
    });
    const out: Track[] = [];
    for (const group of results) {
      for (const t of group.result.tracks ?? []) {
        if (t.id) out.push(t);
      }
    }
    return out;
  } catch (err) {
    console.warn('[similar] source search failed:', (err as Error).message);
    return [];
  }
}

/**
 * Fetches up to `SIMILAR_LIMIT` tracks related to `track` by searching
 * for the track's first 1-2 artists across enabled sources. Uses an
 * `AbortController` so a track-change / unmount cancels the in-flight
 * request — without this the caller's `setState` would land on an
 * unmounted component.
 */
export function useSimilarTracks(track: Track | null | undefined): UseSimilarTracksState {
  const [state, setState] = useState<UseSimilarTracksState>({
    tracks: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!track) {
      setState({ tracks: [], loading: false, error: null });
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const seedArtists = collectSeedArtists([track], 2);
    if (seedArtists.length === 0) {
      setState({ tracks: [], loading: false, error: null });
      return undefined;
    }

    const exclude = new Set<string>([track.id]);
    void findRelatedTracks(seedArtists, exclude, searchAcrossSources, SIMILAR_LIMIT)
      .then((related) => {
        if (cancelled || controller.signal.aborted) return;
        setState({ tracks: related, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (cancelled || controller.signal.aborted) return;
        setState({ tracks: [], loading: false, error: err.message });
      });

    return (): void => {
      cancelled = true;
      controller.abort();
    };
  }, [track]);

  return state;
}
