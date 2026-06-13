import type { WebPlaybackController } from './spotifyPlayback';
import type { SpotifySdkPlayer } from './sourceResolver';

/**
 * Adapt the `WebPlaybackController` (which carries the Spotify Web
 * Playback SDK connection + device state) to the small `SpotifySdkPlayer`
 * contract that `sourceResolver.playTrack` consumes.
 *
 * Why a separate adapter? Two reasons:
 *   1. The controller is browser-only (depends on `window.Spotify`),
 *      so we want to keep the contract testable in isolation.
 *   2. The `playTrack` call site is the only place that needs the
 *      `play(track, accessToken)` shape; the controller has more
 *      methods (pause, resume, disconnect) that `playTrack` doesn't
 *      care about. The adapter narrows the surface and lets us swap
 *      implementations (mock in tests, controller in production,
 *      a future alternative transport) without touching the
 *      player-store call site.
 */
export function createSpotifySdkPlayer(controller: WebPlaybackController): SpotifySdkPlayer {
  return {
    async play(track, accessToken) {
      await controller.play(track, accessToken);
    },
  };
}
