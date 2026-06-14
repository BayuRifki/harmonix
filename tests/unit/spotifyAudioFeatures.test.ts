import { describe, it, expect } from 'vitest';
import {
  buildSpotifyAudioFeaturesPath,
  parseSpotifyAudioFeaturesResponse,
  type SpotifyAudioFeatures,
} from '../../electron/main/sources/spotify/client';

describe('buildSpotifyAudioFeaturesPath', () => {
  it('returns null for an empty array (no point round-tripping the API)', () => {
    expect(buildSpotifyAudioFeaturesPath([])).toBeNull();
  });

  it('returns null when all IDs are empty after stripping the spotify: prefix', () => {
    expect(buildSpotifyAudioFeaturesPath(['', '   '])).toBeNull();
  });

  it('builds the expected /audio-features?ids=... path with a single id', () => {
    const path = buildSpotifyAudioFeaturesPath(['spotify:abc123']);
    expect(path).toBe('/audio-features?ids=abc123');
  });

  it('strips the spotify: prefix from each id (Spotify Web API takes raw IDs, not URIs)', () => {
    const path = buildSpotifyAudioFeaturesPath(['spotify:track:abc', 'spotify:track:def']);
    expect(path).toBe('/audio-features?ids=abc,def');
  });

  it('passes through raw IDs without the prefix unchanged', () => {
    const path = buildSpotifyAudioFeaturesPath(['abc123', 'def456']);
    expect(path).toBe('/audio-features?ids=abc123,def456');
  });

  it('mixes prefixed and unprefixed IDs correctly (some sources store raw, some URIs)', () => {
    const path = buildSpotifyAudioFeaturesPath(['spotify:abc', 'def']);
    expect(path).toBe('/audio-features?ids=abc,def');
  });

  it('filters out empty / whitespace-only ids from the request', () => {
    const path = buildSpotifyAudioFeaturesPath(['spotify:abc', '', '   ', 'spotify:def']);
    expect(path).toBe('/audio-features?ids=abc,def');
  });

  it('returns null when all ids are empty after filtering', () => {
    expect(buildSpotifyAudioFeaturesPath(['', '', '   '])).toBeNull();
  });

  it('joins the remaining ids with commas in input order', () => {
    const path = buildSpotifyAudioFeaturesPath(['a', 'b', 'c', 'd']);
    expect(path).toBe('/audio-features?ids=a,b,c,d');
  });

  it("handles up to 100 ids (Spotify's per-request cap)", () => {
    const ids = Array.from({ length: 100 }, (_, i) => `id${i}`);
    const path = buildSpotifyAudioFeaturesPath(ids);
    expect(path).toBe(`/audio-features?ids=${ids.join(',')}`);
  });

  it('returns null (not a silently-truncated request) when more than 100 ids are passed — caller must chunk', () => {
    // Spotify rejects batches >100 with 400. Better to refuse to
    // build a request we know will fail than to silently send a
    // truncated list and confuse the user.
    const ids = Array.from({ length: 101 }, (_, i) => `id${i}`);
    expect(buildSpotifyAudioFeaturesPath(ids)).toBeNull();
  });
});

describe('parseSpotifyAudioFeaturesResponse', () => {
  it('returns an empty map for an empty / null response', () => {
    expect(parseSpotifyAudioFeaturesResponse(null).size).toBe(0);
    expect(parseSpotifyAudioFeaturesResponse({}).size).toBe(0);
    expect(parseSpotifyAudioFeaturesResponse({ audio_features: [] }).size).toBe(0);
  });

  it('parses a single feature object into a map keyed by the spotify:-prefixed id', () => {
    const json = {
      audio_features: [
        {
          id: 'abc123',
          uri: 'spotify:track:abc123',
          danceability: 0.585,
          energy: 0.578,
          valence: 0.624,
          tempo: 97.012,
          acousticness: 0.00146,
          instrumentalness: 0.0,
          speechiness: 0.0921,
          liveness: 0.351,
        },
      ],
    };
    const map = parseSpotifyAudioFeaturesResponse(json);
    expect(map.size).toBe(1);
    const f = map.get('spotify:abc123');
    expect(f).toBeDefined();
    expect(f?.danceability).toBeCloseTo(0.585);
    expect(f?.energy).toBeCloseTo(0.578);
    expect(f?.valence).toBeCloseTo(0.624);
    expect(f?.tempo).toBeCloseTo(97.012);
  });

  it('skips null entries (Spotify returns null for unplayable / unknown tracks)', () => {
    const json = {
      audio_features: [null, { id: 'a', danceability: 0.5 }, null],
    };
    const map = parseSpotifyAudioFeaturesResponse(json);
    expect(map.size).toBe(1);
    expect(map.has('spotify:a')).toBe(true);
  });

  it('parses multiple entries into a map keyed by spotify:{id}', () => {
    const json = {
      audio_features: [
        { id: 'a', danceability: 0.1, energy: 0.2, valence: 0.3, tempo: 100 },
        { id: 'b', danceability: 0.4, energy: 0.5, valence: 0.6, tempo: 110 },
        { id: 'c', danceability: 0.7, energy: 0.8, valence: 0.9, tempo: 120 },
      ],
    };
    const map = parseSpotifyAudioFeaturesResponse(json);
    expect(map.size).toBe(3);
    expect(map.get('spotify:a')?.tempo).toBe(100);
    expect(map.get('spotify:b')?.tempo).toBe(110);
    expect(map.get('spotify:c')?.tempo).toBe(120);
  });

  it('preserves all relevant numeric fields used by similarity scoring', () => {
    const json = {
      audio_features: [
        {
          id: 'a',
          danceability: 0.5,
          energy: 0.5,
          valence: 0.5,
          tempo: 120,
          acousticness: 0.5,
          instrumentalness: 0.5,
          speechiness: 0.5,
          liveness: 0.5,
        },
      ],
    };
    const map = parseSpotifyAudioFeaturesResponse(json);
    const f: SpotifyAudioFeatures | undefined = map.get('spotify:a');
    expect(f).toBeDefined();
    expect(f).toEqual({
      danceability: 0.5,
      energy: 0.5,
      valence: 0.5,
      tempo: 120,
      acousticness: 0.5,
      instrumentalness: 0.5,
      speechiness: 0.5,
      liveness: 0.5,
    });
  });

  it('handles a non-object input without throwing (defensive)', () => {
    expect(parseSpotifyAudioFeaturesResponse('not an object').size).toBe(0);
    expect(parseSpotifyAudioFeaturesResponse(42).size).toBe(0);
    expect(parseSpotifyAudioFeaturesResponse(undefined).size).toBe(0);
  });

  it('handles audio_features not being an array (defensive)', () => {
    expect(parseSpotifyAudioFeaturesResponse({ audio_features: 'oops' }).size).toBe(0);
  });

  it('skips feature objects with a missing id (cannot key the map)', () => {
    const json = {
      audio_features: [
        { danceability: 0.5 }, // no id
        { id: 'a', danceability: 0.7 },
      ],
    };
    const map = parseSpotifyAudioFeaturesResponse(json);
    expect(map.size).toBe(1);
    expect(map.has('spotify:a')).toBe(true);
  });

  it('skips feature objects that are not plain objects (defensive)', () => {
    const json = {
      audio_features: ['not an object', 42, null, { id: 'a', danceability: 0.5 }],
    };
    const map = parseSpotifyAudioFeaturesResponse(json);
    expect(map.size).toBe(1);
  });
});
