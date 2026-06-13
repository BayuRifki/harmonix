import { create } from 'zustand';
import type { SpotifySdkPlayer } from '@/lib/audio/sourceResolver';

interface SpotifyPlayerState {
  player: SpotifySdkPlayer | null;
  setPlayer: (player: SpotifySdkPlayer | null) => void;
}

/**
 * Holds the singleton Web Playback SDK adapter used by
 * `playerStore.play` when it encounters a `spotify-sdk` stream.
 *
 * The controller is browser-only (depends on `window.Spotify`) and
 * must be set from a useEffect or top-level component (not during
 * module load), so we keep the holder as a tiny zustand store and
 * let the integration layer populate it once the SDK is connected.
 *
 * While `player` is null, `playTrack` will warn and skip the SDK
 * call — which is the safe default for Free users and for the
 * brief window between Premium auth and the first play attempt.
 */
export const useSpotifyPlayerStore = create<SpotifyPlayerState>((set) => ({
  player: null,
  setPlayer: (player) => set({ player }),
}));
