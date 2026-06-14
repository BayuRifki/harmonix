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
      // Two-track fallback: try the SDK device (when the
      // environment actually has a registered device + Widevine)
      // first; if that throws because the SDK isn't connected /
      // the device is offline, fall back to the Web API
      // "transfer to active device" path. The Web API path
      // works in any environment (it doesn't need the SDK at all
      // — it just needs the user to have Spotify open on another
      // device, and gives full Premium playback that streams
      // from THAT device, not in-app).
      try {
        await controller.play(track, accessToken);
      } catch (sdkErr) {
        const msg = (sdkErr as Error).message;
        const sdkUnavailable =
          /Web Playback SDK not connected/i.test(msg) ||
          /No supported keysystem/i.test(msg) ||
          /Failed to initialize/i.test(msg);
        if (!sdkUnavailable) throw sdkErr;
        // SDK path is unavailable (no Widevine in Electron, or
        // the device never registered) — fall back to the Web
        // API. If the user has an active Spotify Connect
        // device, the track plays THERE. If not, this throws
        // with a clear "No active Spotify device" message.
        // eslint-disable-next-line no-console
        console.info(
          '[spotify] SDK play failed (likely Widevine missing); ' +
            'falling back to Web API /me/player/play (active device).',
        );
        await controller.playViaWebApi(track, accessToken);
      }
    },
  };
}
