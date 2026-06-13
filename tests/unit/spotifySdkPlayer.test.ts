import { describe, it, expect, vi } from 'vitest';
import { createSpotifySdkPlayer } from '../../src/lib/audio/spotifySdkPlayer';
import type { Track } from '../../src/types/global';

const track: Track = {
  id: 'spotify:abc',
  source: 'spotify',
  sourceId: 'abc',
  title: 'Test',
  artists: [],
  durationMs: 180000,
  isPlayable: true,
  meta: { uri: 'spotify:track:abc' },
};

describe('createSpotifySdkPlayer', () => {
  it('adapts a WebPlaybackController to the SpotifySdkPlayer contract', async () => {
    // The contract: sourceResolver.playTrack expects a function-shaped
    // object ({ play(track, token) }). The controller already has a
    // matching play method, so the adapter is a thin pass-through —
    // but the indirection lets us swap implementations (mock, fake,
    // future alternative transport) without touching sourceResolver.
    const controllerPlay = vi.fn().mockResolvedValue(undefined);
    const controller = { play: controllerPlay } as unknown as Parameters<
      typeof createSpotifySdkPlayer
    >[0];

    const player = createSpotifySdkPlayer(controller);
    await player.play(track, 'mock-access-token');

    expect(controllerPlay).toHaveBeenCalledTimes(1);
    expect(controllerPlay).toHaveBeenCalledWith(track, 'mock-access-token');
  });

  it('propagates rejections from the underlying controller', async () => {
    // If the controller fails (SDK not connected, network error),
    // the adapter must surface the same error to playTrack so the
    // UI can show it instead of pretending playback succeeded.
    const controllerPlay = vi.fn().mockRejectedValue(new Error('device offline'));
    const controller = { play: controllerPlay } as unknown as Parameters<
      typeof createSpotifySdkPlayer
    >[0];

    const player = createSpotifySdkPlayer(controller);

    await expect(player.play(track, 'mock-token')).rejects.toThrow('device offline');
  });
});
