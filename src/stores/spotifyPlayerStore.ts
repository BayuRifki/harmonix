import { create } from 'zustand';
import type { SpotifySdkPlayer } from '@/lib/audio/sourceResolver';

export type SpotifyStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'fallback';

interface SpotifyPlayerState {
  player: SpotifySdkPlayer | null;
  status: SpotifyStatus;
  error: string | null;
  setPlayer: (player: SpotifySdkPlayer | null) => void;
  setStatus: (status: SpotifyStatus, error?: string | null) => void;
}

/**
 * Holds the singleton Web Playback SDK adapter used by
 * `playerStore.play` when it encounters a `spotify-sdk` stream,
 * plus the connection status surfaced in the player UI.
 *
 * The controller is browser-only (depends on `window.Spotify`) and
 * must be set from a useEffect or top-level component (not during
 * module load), so we keep the holder as a tiny zustand store and
 * let the integration layer populate it once the SDK is connected.
 *
 * `status` drives the visible badge in the player bar:
 *   - 'disconnected': no SDK attempt yet (Free user, or Premium
 *     user who hasn't tried to play)
 *   - 'connecting': ensureSpotifySdkPlayer() is in flight
 *   - 'connected': SDK handshake + device registration succeeded
 *   - 'error': connect() rejected — see `error` for the SDK message
 *   - 'fallback': SDK rejected as Free / expired trial and the
 *     player is currently playing the 30s preview URL via the
 *     audio engine
 *
 * While `player` is null, `playTrack` will warn and skip the SDK
 * call — which is the safe default for Free users and for the
 * brief window between Premium auth and the first play attempt.
 */
export const useSpotifyPlayerStore = create<SpotifyPlayerState>((set) => ({
  player: null,
  status: 'disconnected',
  error: null,
  setPlayer: (player) =>
    set({
      player,
      // setting a non-null player means the controller was wired —
      // but we DON'T flip to 'connected' here because the SDK device
      // registration hasn't necessarily completed. The 'connecting'
      // → 'connected' transition happens in ensureSpotifySdkPlayer
      // once connect() resolves with a device_id.
      error: null,
    }),
  setStatus: (status, error = null) => set({ status, error }),
}));
