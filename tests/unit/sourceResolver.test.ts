import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub the audio engine + crossfade so the http path doesn't actually
// try to spin up an AudioContext (jsdom doesn't have one). The
// refactor under test only cares that the spotify-sdk branch is
// reached and dispatched to the injected player.
vi.mock('../../src/lib/audio/engine', () => ({
  audioEngine: { load: vi.fn().mockReturnValue(undefined), play: vi.fn() },
}));
vi.mock('../../src/lib/audio/crossfade', () => ({
  crossfadeTo: vi.fn().mockResolvedValue(undefined),
}));

import { playTrack, type SpotifySdkPlayer } from '../../src/lib/audio/sourceResolver';
import type { StreamInfo, Track } from '../../src/types/global';

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

const sdkStream: StreamInfo = { protocol: 'spotify-sdk', url: 'spotify-sdk:abc' };
const httpStream: StreamInfo = {
  protocol: 'http',
  url: 'http://example.test/preview.mp3',
  expiresAt: Date.now() + 60_000,
};

describe('playTrack — spotify-sdk protocol wiring', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('dispatches to the configured spotify-sdk player for spotify-sdk streams', async () => {
    // The driving test for the Premium playback path: the renderer
    // must hand the track + token off to the Web Playback controller
    // rather than the current "warn and return" early-exit.
    const playMock = vi.fn().mockResolvedValue(undefined);
    const player: SpotifySdkPlayer = { play: playMock };

    await playTrack(track, sdkStream, { spotifyPlayer: player, accessToken: 'mock-access-token' });

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith(track, 'mock-access-token');
  });

  it('warns (and does not call the player) when no access token is supplied for spotify-sdk', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const player: SpotifySdkPlayer = { play: playMock };

    await playTrack(track, sdkStream, { spotifyPlayer: player });

    expect(playMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('warns (and does not call anything) when no spotify-sdk player is configured', async () => {
    await playTrack(track, sdkStream, { accessToken: 'mock-access-token' });

    expect(warnSpy).toHaveBeenCalled();
  });

  it('does NOT route http streams through the spotify-sdk player (regression guard)', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const player: SpotifySdkPlayer = { play: playMock };

    await playTrack(track, httpStream, { spotifyPlayer: player, accessToken: 'mock-token' });

    // http streams still flow through the audio engine (crossfadeTo /
    // engine.load / engine.play — all mocked above). The spotify-sdk
    // player must stay out of that path.
    expect(playMock).not.toHaveBeenCalled();
  });
});
