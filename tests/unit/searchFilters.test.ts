import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  matchesArtist,
  matchesDuration,
  matchesSource,
  readFiltersFromParams,
  writeFiltersToParams,
  DEFAULT_FILTERS,
  type SearchFiltersState,
} from '@/features/search/searchFilters';

interface FakeTrack {
  durationMs: number;
  artists: { name: string }[];
  source: string;
  title: string;
  id: string;
}

function makeTracks(): FakeTrack[] {
  return [
    {
      id: '1',
      title: 'A',
      artists: [{ name: 'Radiohead' }],
      source: 'spotify',
      durationMs: 120_000,
    },
    { id: '2', title: 'B', artists: [{ name: 'Coldplay' }], source: 'local', durationMs: 240_000 },
    {
      id: '3',
      title: 'C',
      artists: [{ name: 'Radiohead' }],
      source: 'spotify',
      durationMs: 400_000,
    },
    { id: '4', title: 'D', artists: [{ name: 'Beethoven' }], source: 'local', durationMs: 60_000 },
  ];
}

describe('searchFilters', () => {
  it('matchesDuration works for each bucket', () => {
    expect(matchesDuration(60_000, 'short')).toBe(true);
    expect(matchesDuration(180_000, 'short')).toBe(false);
    expect(matchesDuration(200_000, 'medium')).toBe(true);
    expect(matchesDuration(400_000, 'medium')).toBe(false);
    expect(matchesDuration(500_000, 'long')).toBe(true);
    expect(matchesDuration(100_000, 'long')).toBe(false);
    expect(matchesDuration(100_000, 'any')).toBe(true);
  });

  it('matchesArtist is case-insensitive', () => {
    expect(matchesArtist('Radiohead', 'radio')).toBe(true);
    expect(matchesArtist('Coldplay', 'radio')).toBe(false);
  });

  it('matchesArtist allows empty query (no filter)', () => {
    expect(matchesArtist('Whatever', '')).toBe(true);
    expect(matchesArtist('Whatever', '   ')).toBe(true);
  });

  it('matchesSource returns true for empty selection', () => {
    expect(matchesSource('spotify', [])).toBe(true);
  });

  it('matchesSource respects selected sources', () => {
    expect(matchesSource('spotify', ['spotify'])).toBe(true);
    expect(matchesSource('local', ['spotify'])).toBe(false);
  });

  it('applyFilters combines all filters', () => {
    const tracks = makeTracks();
    const filtered = applyFilters(
      tracks as unknown as {
        durationMs: number;
        artists: { name: string }[];
        source: string;
        id: string;
      }[],
      {
        sources: ['spotify'],
        duration: 'short',
        artist: 'radio',
      },
    );
    expect(filtered.map((t) => t.id)).toEqual(['1']);
  });

  it('applyFilters with DEFAULT_FILTERS returns all tracks', () => {
    const tracks = makeTracks();
    const filtered = applyFilters(
      tracks as unknown as {
        durationMs: number;
        artists: { name: string }[];
        source: string;
        id: string;
      }[],
      DEFAULT_FILTERS,
    );
    expect(filtered.length).toBe(tracks.length);
  });

  it('round-trips filters through URLSearchParams', () => {
    const params = new URLSearchParams();
    const filters: SearchFiltersState = {
      sources: ['spotify', 'local'],
      duration: 'long',
      artist: 'Mozart',
    };
    const next = writeFiltersToParams(filters, params);
    const restored = readFiltersFromParams(next);
    expect(restored).toEqual(filters);
  });

  it('removes empty/default values from URL', () => {
    const params = new URLSearchParams('q=hello&src=foo');
    const next = writeFiltersToParams(DEFAULT_FILTERS, params);
    expect(next.has('src')).toBe(false);
    expect(next.has('dur')).toBe(false);
    expect(next.has('artist')).toBe(false);
    expect(next.get('q')).toBe('hello');
  });

  it('falls back to defaults for invalid duration', () => {
    const params = new URLSearchParams('dur=invalid');
    const restored = readFiltersFromParams(params);
    expect(restored.duration).toBe('any');
  });

  it('handles missing parameters gracefully', () => {
    const restored = readFiltersFromParams(new URLSearchParams());
    expect(restored).toEqual(DEFAULT_FILTERS);
  });
});
