import { audioEngine } from './engine';
import { crossfadeTo } from './crossfade';
import type { StreamInfo, Track } from '@shared/index';

export async function playTrack(_track: Track, stream: StreamInfo): Promise<void> {
  if (stream.protocol === 'spotify-sdk') {
    console.warn(
      '[player] Spotify Web Playback requires token wiring — see docs/PLANNING.md Phase 3',
    );
    return;
  }
  await crossfadeTo(audioEngine.load(stream.url));
  await audioEngine.play();
}
