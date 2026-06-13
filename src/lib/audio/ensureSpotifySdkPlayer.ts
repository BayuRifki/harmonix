import { WebPlaybackController } from './spotifyPlayback';
import { createSpotifySdkPlayer } from './spotifySdkPlayer';
import { useSpotifyPlayerStore } from '@/stores/spotifyPlayerStore';
import type { SpotifySdkPlayer } from './sourceResolver';

/**
 * Lazily connect the Spotify Web Playback SDK and return a player
 * adapter that `playerStore.play` can hand to `sourceResolver.playTrack`.
 *
 * Idempotent: the first call instantiates the controller, registers
 * a Spotify device (which loads `sdk.scdn.co/spotify-player.js`),
 * and caches the adapter. Subsequent calls return the cached player
 * so we don't leak devices or pay the SDK-load cost more than once
 * per session.
 *
 * On failure, the cached player is cleared so the next call retries
 * from a clean state (otherwise a single transient error would
 * permanently disable Premium playback until a reload).
 *
 * `window.api.auth.spotifyToken()` is called lazily through the
 * token provider the SDK hands back, so token refreshes that happen
 * mid-session are picked up automatically.
 */
export async function ensureSpotifySdkPlayer(): Promise<SpotifySdkPlayer | null> {
  const existing = useSpotifyPlayerStore.getState().player;
  if (existing) return existing;

  const controller = new WebPlaybackController();
  const player = createSpotifySdkPlayer(controller);
  useSpotifyPlayerStore.getState().setPlayer(player);

  try {
    await controller.connect(async () => {
      const t = await window.api.auth.spotifyToken();
      return t;
    });
    return player;
  } catch (err) {
    console.warn('[spotify] Failed to connect Web Playback SDK:', (err as Error).message);
    useSpotifyPlayerStore.getState().setPlayer(null);
    return null;
  }
}
