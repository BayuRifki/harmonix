import { audioEngine } from './engine';
import { crossfadeTo } from './crossfade';
import type { StreamInfo, Track } from '@/types/global';

/**
 * Minimal contract for "play a Spotify track via the Web Playback SDK".
 * The renderer wires a real `WebPlaybackController` to this in `App.tsx`
 * (or wherever the Spotify source is enabled); tests pass a mock so
 * the routing in `playTrack` can be exercised without the SDK.
 */
export interface SpotifySdkPlayer {
  play(track: Track, accessToken: string): Promise<void>;
}

export interface PlayTrackOptions {
  /** Required for `spotify-sdk` protocol; ignored otherwise. */
  accessToken?: string;
  /**
   * Required for `spotify-sdk` protocol. When omitted (e.g. the
   * controller hasn't been connected yet), `playTrack` warns and
   * returns rather than silently dropping the playback request.
   */
  spotifyPlayer?: SpotifySdkPlayer;
}

export async function playTrack(
  track: Track,
  stream: StreamInfo,
  options: PlayTrackOptions = {},
): Promise<void> {
  if (stream.protocol === 'spotify-sdk') {
    if (!options.spotifyPlayer) {
      console.warn(
        '[player] Spotify SDK player not configured — wire WebPlaybackController in App.tsx',
      );
      return;
    }
    if (!options.accessToken) {
      console.warn('[player] Spotify SDK play requires an access token');
      return;
    }
    await options.spotifyPlayer.play(track, options.accessToken);
    return;
  }
  await crossfadeTo(audioEngine.load(stream.url));
  await audioEngine.play();
}
