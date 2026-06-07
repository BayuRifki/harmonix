import { create } from 'zustand';
import type { Track, StreamInfo } from '@/types/global';
import { audioEngine } from '@/lib/audio/engine';
import { playTrack } from '@/lib/audio/sourceResolver';

type PlayerGet = () => {
  queue: Track[];
  queueIndex: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  currentTrack: Track | null;
  preloadTriggeredTrackId: string | null;
};

async function preloadNextInQueue(get: PlayerGet): Promise<void> {
  const { queue, queueIndex, shuffle, repeat, currentTrack } = get();
  if (shuffle || queue.length === 0) return;

  let nextIndex: number;
  if (queueIndex < queue.length - 1) {
    nextIndex = queueIndex + 1;
  } else if (repeat === 'all') {
    nextIndex = 0;
  } else {
    return;
  }

  const nextTrack = queue[nextIndex];
  if (!nextTrack) return;
  if (currentTrack?.id === nextTrack.id) return;

  try {
    const stream = await window.api.sources.playTrack({ track: nextTrack });
    if (stream.protocol === 'spotify-sdk') return;
    audioEngine.preload(stream.url);
  } catch (err) {
    console.warn('[player] preload next failed:', (err as Error).message);
  }
}

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
  preloadTriggeredTrackId: string | null;

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
    // 80% trigger: pre-buffer the next track if we haven't already for
    // this track. The on-play trigger in `play()` covers the common case;
    // this catches edge cases (long tracks, manual queue replacements).
    const s = get();
    const trackId = s.currentTrack?.id;
    if (
      trackId &&
      durationMs > 0 &&
      positionMs / durationMs >= 0.8 &&
      s.preloadTriggeredTrackId !== trackId
    ) {
      set({ preloadTriggeredTrackId: trackId });
      void preloadNextInQueue(get);
    }
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
    preloadTriggeredTrackId: null,

    setVolume: (volume) => {
      const v = Math.max(0, Math.min(1, volume));
      audioEngine.setVolume(v);
      set({ volume: v });
    },
    toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
    cycleRepeat: () =>
      set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),

    play: async (track) => {
      set({ currentTrack: track, error: null, loading: true, preloadTriggeredTrackId: null });
      try {
        const stream = await window.api.sources.playTrack({ track });
        // eslint-disable-next-line no-console
        console.log(
          `[player] playTrack(${track.id}) ` +
            `url=${stream.url.slice(0, 80)}… ` +
            `protocol=${stream.protocol} ` +
            `requiresProxy=${stream.requiresProxy ?? false} ` +
            `fallbackUrl=${stream.fallbackUrl ? 'yes' : 'no'}`,
        );
        set({ stream });
        try {
          await playTrack(track, stream);
        } catch (loadErr) {
          // If the proxied URL fails, retry once with the direct URL
          // (no EQ but at least the audio plays). The IPC handler
          // returns both URLs in StreamInfo for this exact case.
          if (stream.fallbackUrl && stream.fallbackUrl !== stream.url) {
            console.warn(
              `[player] proxy load failed (${(loadErr as Error).message}); falling back to direct URL`,
            );
            const fallback = { ...stream, url: stream.fallbackUrl };
            set({ stream: fallback });
            await playTrack(track, fallback);
          } else {
            throw loadErr;
          }
        }
        audioEngine.setVolume(get().volume);
        // Pre-buffer the next track for gapless transition (Phase B).
        // Fires immediately on play so by the time the current track
        // ends the buffer is already warm. The 80% trigger in the time
        // handler below is a safety net for edge cases (long tracks,
        // manual queue replacements).
        void preloadNextInQueue(get);
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
