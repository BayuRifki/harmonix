import { create } from 'zustand';
import type { Track, StreamInfo } from '@shared/index';
import { audioEngine } from '@/lib/audio/engine';
import { playTrack } from '@/lib/audio/sourceResolver';

export function shuffleArray<T>(items: T[], pinnedIndex: number): T[] {
  const arr = items.slice();
  const pinned = arr[pinnedIndex];
  if (pinned !== undefined) {
    arr.splice(pinnedIndex, 1);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return pinned !== undefined ? [pinned, ...arr] : arr;
}

export function collectSeedArtists(tracks: Track[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const track of tracks) {
    for (const artist of track.artists) {
      const name = artist.name?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
      if (out.length >= max) return out;
    }
  }
  return out;
}

export async function findRelatedTracks(
  seedArtists: string[],
  excludeIds: Set<string>,
  searchFn: (query: string) => Promise<Track[]>,
  limit: number,
): Promise<Track[]> {
  const related: Track[] = [];
  for (const artist of seedArtists) {
    if (related.length >= limit) break;
    try {
      const results = await searchFn(artist);
      for (const t of results) {
        if (related.length >= limit) break;
        if (t.id && !excludeIds.has(t.id)) {
          related.push(t);
          excludeIds.add(t.id);
        }
      }
    } catch (err) {
      console.warn(`[player] Related search failed for '${artist}':`, (err as Error).message);
    }
  }
  return related;
}

async function searchAcrossSources(query: string, perSourceLimit: number): Promise<Track[]> {
  try {
    const results = await window.api.sources.search({
      query,
      options: { limit: perSourceLimit },
    });
    const tracks: Track[] = [];
    for (const group of results) {
      for (const t of group.result.tracks ?? []) {
        if (t.id) tracks.push(t);
      }
    }
    return tracks;
  } catch (err) {
    console.warn(`[player] Source search failed for '${query}':`, (err as Error).message);
    return [];
  }
}

interface PlayerState {
  currentTrack: Track | null;
  stream: StreamInfo | null;
  isPlaying: boolean;
  loading: boolean;
  volume: number;
  positionMs: number;
  durationMs: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  queue: Track[];
  queueIndex: number;
  error: string | null;

  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  play: (track: Track) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setQueue: (
    tracks: Track[],
    startIndex?: number,
    options?: { shuffle?: boolean; smartShuffle?: boolean },
  ) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  const offState = audioEngine.on('state', (state) => {
    set({
      isPlaying: state === 'playing',
      loading: state === 'loading',
    });
  });
  const offTime = audioEngine.on('time', (positionMs, durationMs) => {
    set({ positionMs, durationMs });
  });
  const offEnded = audioEngine.on('ended', () => {
    void get().next();
  });
  const offError = audioEngine.on('error', (message) => {
    set({ error: message });
  });

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', () => {
      offState();
      offTime();
      offEnded();
      offError();
    });
  }

  return {
    currentTrack: null,
    stream: null,
    isPlaying: false,
    loading: false,
    volume: 0.8,
    positionMs: 0,
    durationMs: 0,
    shuffle: false,
    repeat: 'off',
    queue: [],
    queueIndex: -1,
    error: null,

    setVolume: (volume) => {
      const v = Math.max(0, Math.min(1, volume));
      audioEngine.setVolume(v);
      set({ volume: v });
    },
    toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
    cycleRepeat: () =>
      set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),

    play: async (track) => {
      set({ currentTrack: track, error: null, loading: true });
      try {
        const stream = await window.api.sources.playTrack({ track });
        set({ stream });
        await playTrack(track, stream);
        audioEngine.setVolume(get().volume);
      } catch (err) {
        set({ error: (err as Error).message, loading: false });
        console.error('[player] play failed:', err);
      }
    },

    pause: () => audioEngine.pause(),

    resume: async () => {
      await audioEngine.play();
    },

    next: async () => {
      const { queue, queueIndex, shuffle, repeat } = get();
      if (queue.length === 0) return;
      let nextIndex: number;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      } else if (queueIndex < queue.length - 1) {
        nextIndex = queueIndex + 1;
      } else if (repeat === 'all') {
        nextIndex = 0;
      } else {
        return;
      }
      set({ queueIndex: nextIndex });
      await get().play(queue[nextIndex]);
    },

    previous: async () => {
      const { queue, queueIndex, positionMs } = get();
      if (positionMs > 3000) {
        await audioEngine.seek(0);
        return;
      }
      if (queueIndex > 0) {
        const prevIndex = queueIndex - 1;
        set({ queueIndex: prevIndex });
        await get().play(queue[prevIndex]);
      } else if (queue.length > 0) {
        await audioEngine.seek(0);
      }
    },

    seek: async (positionMs) => {
      await audioEngine.seek(positionMs);
      set({ positionMs });
    },

    setQueue: async (tracks, startIndex = 0, options = {}) => {
      const shuffle = options.shuffle ?? true;
      const smartShuffle = options.smartShuffle ?? true;
      let ordered = tracks;
      let firstIndex = startIndex;
      if (shuffle && tracks.length > 1) {
        ordered = shuffleArray(tracks, startIndex);
        firstIndex = 0;
      }

      if (smartShuffle && ordered.length > 0) {
        const seedArtists = collectSeedArtists(ordered, 3);
        if (seedArtists.length > 0) {
          const exclude = new Set(ordered.map((t) => t.id));
          const related = await findRelatedTracks(
            seedArtists,
            exclude,
            (query) => searchAcrossSources(query, 5),
            10,
          );
          if (related.length > 0) {
            ordered = [...ordered, ...related];
          }
        }
      }

      set({ queue: ordered, queueIndex: firstIndex });
      if (ordered[firstIndex]) {
        await get().play(ordered[firstIndex]);
      }
    },
  };
});
