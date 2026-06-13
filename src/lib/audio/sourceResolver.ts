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
    try {
      await options.spotifyPlayer.play(track, options.accessToken);
      return;
    } catch (playErr) {
      // The SDK rejects the play call with `account_error` when the
      // user's account is no longer Premium (e.g. trial expired
      // since auth) or with `authentication_error` when the OAuth
      // token has lost the `streaming` scope. In either case the
      // *SDK* path is permanently off-limits, but Spotify's REST
      // API still gives us a 30-second mp3 preview per track — better
      // than a silent failure. Non-account SDK errors (network,
      // init) propagate so the caller can surface the real problem
      // instead of masking it behind a 30-second clip.
      const errMsg = (playErr as Error).message;
      const isAccountish = /Web Playback (account|auth):/i.test(errMsg);
      if (isAccountish) {
        const previewUrl = (track.meta as { previewUrl?: string | null } | undefined)?.previewUrl;
        if (previewUrl) {
          console.warn(
            '[player] Spotify SDK rejected as Free/expired; falling back to 30s preview',
          );
          await crossfadeTo(audioEngine.load(previewUrl));
          await audioEngine.play();
          return;
        }
        throw new Error(
          'No preview available. ' +
            'Spotify Free only allows 30s previews and this track has none; ' +
            'upgrade to Spotify Premium for full playback.',
        );
      }
      throw playErr;
    }
  }
  await crossfadeTo(audioEngine.load(stream.url));
  await audioEngine.play();
}
