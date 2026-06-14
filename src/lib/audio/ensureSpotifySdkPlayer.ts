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
 *
 * The connection lifecycle is reflected in `useSpotifyPlayerStore`
 * so the player UI can show a visible status badge: connecting →
 * connected / error.
 */
export async function ensureSpotifySdkPlayer(): Promise<SpotifySdkPlayer | null> {
  useSpotifyPlayerStore.getState().setStatus('connecting');

  const existing = useSpotifyPlayerStore.getState().player;
  if (existing) {
    useSpotifyPlayerStore.getState().setStatus('connected');
    return existing;
  }

  const controller = new WebPlaybackController();
  try {
    await controller.connect(async () => {
      const t = await window.api.auth.spotifyToken();
      return t;
    });
  } catch (err) {
    // Detect the EME / Widevine failure mode from the SDK's
    // initialization_error event. The Spotify Web Playback SDK
    // requires EME (Encrypted Media Extensions) for the
    // `com.widevine.alpha` keysystem — which Electron's
    // bundled Chromium does NOT ship. When the SDK tries to
    // create a player, navigator.requestMediaKeySystemAccess
    // rejects with "No supported keysystem was found." and
    // the SDK surfaces that as a generic "Failed to initialize
    // player" message. Translate that opaque SDK string into
    // a user-actionable hint that names the platform limitation
    // and lists 3 workarounds.
    const rawMsg = (err as Error).message;
    const isWidevineMissing =
      /No supported keysystem was found/i.test(rawMsg) || /Failed to initialize/i.test(rawMsg);
    const msg = isWidevineMissing
      ? 'Spotify Web Playback SDK requires Widevine DRM, which ' +
        "is not bundled in Electron's embedded Chromium. The " +
        'SDK is the only way the desktop app can render premium ' +
        'Spotify audio locally; with no Widevine, the SDK cannot ' +
        'initialize. Workarounds: (1) Play a non-Spotify source ' +
        '(YouTube Music, local files, etc.) for now, (2) open the ' +
        'Spotify Web Player in a system browser (Chrome/Edge/' +
        'Firefox ship with Widevine), or (3) use Spotify Connect ' +
        'on a phone/tablet/desktop Spotify client and have this ' +
        'app stay as a remote control.'
      : rawMsg;
    console.warn(`[spotify] Failed to connect Web Playback SDK: ${msg}`);
    useSpotifyPlayerStore.getState().setStatus('error', msg);
    return null;
  }

  const player = createSpotifySdkPlayer(controller);
  useSpotifyPlayerStore.getState().setPlayer(player);
  useSpotifyPlayerStore.getState().setStatus('connected');
  return player;
}
