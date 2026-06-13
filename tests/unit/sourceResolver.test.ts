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

describe('playTrack — spotify-sdk → preview fallback (Free / expired trial)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  const trackWithPreview: Track = {
    id: 'spotify:abc',
    source: 'spotify',
    sourceId: 'abc',
    title: 'Test',
    artists: [],
    durationMs: 180000,
    isPlayable: true,
    meta: {
      uri: 'spotify:track:abc',
      previewUrl: 'https://p.scdn.co/mp3-preview/mock-preview',
    },
  };

  const trackWithoutPreview: Track = {
    id: 'spotify:xyz',
    source: 'spotify',
    sourceId: 'xyz',
    title: 'NoPreview',
    artists: [],
    durationMs: 180000,
    isPlayable: true,
    meta: { uri: 'spotify:track:xyz' },
  };

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('falls back to the 30s preview URL when the SDK rejects with account_error (Free user)', async () => {
    // Real-world: profile.product was 'premium' at auth-time (cached),
    // but the live account is now Free / trial expired. The SDK
    // fires `account_error`, my connect() throws "Web Playback
    // account: ...", and the user would otherwise be left with
    // nothing playing. The fallback uses the track's previewUrl.
    const playMock = vi.fn().mockRejectedValue(new Error('Web Playback account: Premium required'));
    const player: SpotifySdkPlayer = { play: playMock };

    // Should NOT throw — the fallback should play the preview.
    await expect(
      playTrack(trackWithPreview, sdkStream, {
        spotifyPlayer: player,
        accessToken: 'mock-token',
      }),
    ).resolves.toBeUndefined();

    expect(playMock).toHaveBeenCalledTimes(1);
    // The audio engine should have been driven with the preview URL.
    const { audioEngine } = await import('../../src/lib/audio/engine');
    expect(vi.mocked(audioEngine.load)).toHaveBeenCalledWith(
      'https://p.scdn.co/mp3-preview/mock-preview',
    );
  });

  it('falls back to the 30s preview URL when the SDK rejects with authentication_error', async () => {
    // Symmetric to the account_error case — the OAuth token has
    // been revoked or doesn't carry the `streaming` scope anymore.
    const playMock = vi.fn().mockRejectedValue(new Error('Web Playback auth: token revoked'));
    const player: SpotifySdkPlayer = { play: playMock };

    await expect(
      playTrack(trackWithPreview, sdkStream, {
        spotifyPlayer: player,
        accessToken: 'mock-token',
      }),
    ).resolves.toBeUndefined();
  });

  it('throws a clear "no preview" error when SDK rejects and the track has no previewUrl', async () => {
    const playMock = vi.fn().mockRejectedValue(new Error('Web Playback account: Premium required'));
    const player: SpotifySdkPlayer = { play: playMock };

    await expect(
      playTrack(trackWithoutPreview, sdkStream, {
        spotifyPlayer: player,
        accessToken: 'mock-token',
      }),
    ).rejects.toThrow(/no preview.*30.{0,3}s(?:econd)? preview|upgrade to premium/i);
  });

  it('propagates non-account SDK errors (does NOT swallow them as preview fallbacks)', async () => {
    // A network error or init_error isn't a Free-account signal —
    // masking it with a 30s preview would hide the real problem.
    const playMock = vi
      .fn()
      .mockRejectedValue(new Error('Web Playback init: SDK script failed to load'));
    const player: SpotifySdkPlayer = { play: playMock };

    await expect(
      playTrack(trackWithPreview, sdkStream, {
        spotifyPlayer: player,
        accessToken: 'mock-token',
      }),
    ).rejects.toThrow(/Web Playback init/);
  });
});
