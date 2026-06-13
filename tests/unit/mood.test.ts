import { describe, it, expect } from 'vitest';
import {
  detectMood,
  detectTrackMood,
  buildMoodQuery,
  buildContentQuery,
  MOODS,
  type Mood,
} from '@/lib/recommender/mood';
import type { Track } from '@/types/global';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'ytmusic:abc123',
    source: 'ytmusic',
    sourceId: 'abc123',
    title: 'Test Track',
    artists: [{ id: 'a1', name: 'Test Artist', source: 'ytmusic' }],
    durationMs: 200000,
    isPlayable: true,
    ...overrides,
  };
}

describe('mood recommender', () => {
  describe('detectMood', () => {
    it('returns unknown for empty input', () => {
      expect(detectMood('')).toBe<Mood>('unknown');
      expect(detectMood()).toBe<Mood>('unknown');
    });

    it('detects happy mood from title keywords', () => {
      expect(detectMood('Happy Day Sunshine')).toBe<Mood>('happy');
      expect(detectMood('Party All Night (Remix)')).toBe<Mood>('happy');
      expect(detectMood('Just Dance 2024')).toBe<Mood>('happy');
    });

    it('detects sad mood from title keywords', () => {
      expect(detectMood('Heartbreak and Tears')).toBe<Mood>('sad');
      expect(detectMood('I Miss You (Alone Tonight)')).toBe<Mood>('sad');
    });

    it('detects chill mood from title keywords', () => {
      expect(detectMood('Lofi Beats to Study')).toBe<Mood>('chill');
      expect(detectMood('Sleep Music for Relax')).toBe<Mood>('chill');
      expect(detectMood('Acoustic Morning Calm')).toBe<Mood>('chill');
    });

    it('detects hype mood from title keywords', () => {
      expect(detectMood('Workout Beast Mode')).toBe<Mood>('hype');
      expect(detectMood('Gym Energy Hype')).toBe<Mood>('hype');
    });

    it('detects romantic mood from title keywords', () => {
      expect(detectMood('Love Forever (Romantic Ballad)')).toBe<Mood>('romantic');
      expect(detectMood('Sweet Kiss Tonight')).toBe<Mood>('romantic');
    });

    it('is case-insensitive', () => {
      expect(detectMood('HAPPY DAY')).toBe<Mood>('happy');
      expect(detectMood('SaD SoNg')).toBe<Mood>('sad');
    });

    it('returns unknown when no keyword matches', () => {
      expect(detectMood('Some Random Phrase Without Keywords')).toBe<Mood>('unknown');
    });

    it('reads mood hints from meta.tags array', () => {
      expect(detectMood('Generic Title', { tags: ['upbeat', 'party', 'dance'] })).toBe<Mood>(
        'happy',
      );
    });

    it('reads mood hints from meta.genre string', () => {
      expect(detectMood('Generic Title', { genre: 'lofi chill beats' })).toBe<Mood>('chill');
    });

    it('combines title and meta scores', () => {
      // Title has 'chill' (1) and meta has 'sleep' (1) → 2 hits, beats happy's 0
      expect(detectMood('Chill Vibes', { genre: 'sleep music' })).toBe<Mood>('chill');
    });

    it('returns the higher-scoring mood when there is overlap', () => {
      // Title: "Happy Dance" → 2 happy keywords
      // Meta: ['hype', 'energy'] → 2 hype keywords
      // Tie: declaration order — happy wins
      expect(detectMood('Happy Dance', { tags: ['hype', 'energy'] })).toBe<Mood>('happy');
    });

    it('does not crash on non-string meta fields', () => {
      // Some sources may return unexpected shapes; we should ignore them.
      expect(
        detectMood('Sad Song', {
          tags: [42, null, 'heartbreak', { weird: true }] as unknown as string[],
        }),
      ).toBe<Mood>('sad');
    });

    it('handles multi-word keywords like "good vibes"', () => {
      expect(detectMood('Sunny Day Good Vibes')).toBe<Mood>('happy');
    });
  });

  describe('detectTrackMood', () => {
    it('classifies a full Track', () => {
      const track = makeTrack({ title: 'Hype Workout Beast' });
      expect(detectTrackMood(track)).toBe<Mood>('hype');
    });

    it('uses meta for classification when title is generic', () => {
      const track = makeTrack({ title: 'Track 1', meta: { tags: ['romantic', 'love'] } });
      expect(detectTrackMood(track)).toBe<Mood>('romantic');
    });
  });

  describe('buildMoodQuery', () => {
    it('returns a generic template when mood is unknown', () => {
      expect(buildMoodQuery('unknown')).toBe('music');
    });

    it('appends artist when provided', () => {
      expect(buildMoodQuery('chill', 'lofi girl')).toBe('chill relax lofi mix lofi girl');
    });

    it('trims whitespace when artist is empty', () => {
      expect(buildMoodQuery('happy')).toBe('happy upbeat songs');
    });

    it('returns each known mood template', () => {
      expect(buildMoodQuery('happy')).toContain('happy');
      expect(buildMoodQuery('sad')).toContain('sad');
      expect(buildMoodQuery('hype')).toContain('hype');
      expect(buildMoodQuery('romantic')).toContain('romantic');
    });
  });

  describe('buildContentQuery', () => {
    it('uses artist + mood when title has no useful keywords', () => {
      const track = makeTrack({
        title: 'Track 1',
        artists: [{ id: 'a1', name: 'Billie Eilish', source: 'spotify' }],
      });
      const q = buildContentQuery(track, 'chill');
      expect(q).toContain('Billie Eilish');
      expect(q).toContain('chill');
    });

    it('extracts meaningful title words', () => {
      const track = makeTrack({
        title: 'Lofi Rain Sleep',
        artists: [{ id: 'a1', name: 'ChillHop', source: 'ytmusic' }],
      });
      const q = buildContentQuery(track, 'chill');
      expect(q).toContain('lofi');
      expect(q).toContain('rain');
      expect(q).not.toContain('the');
    });

    it('strips stop words from title', () => {
      const track = makeTrack({
        title: 'The Best of Love (Remastered)',
        artists: [{ id: 'a1', name: 'Adele', source: 'spotify' }],
      });
      const q = buildContentQuery(track, 'romantic');
      expect(q).not.toContain('the');
      expect(q).not.toContain(' of ');
      expect(q).not.toContain('remastered');
      expect(q).toContain('love');
      expect(q).toContain('best');
    });

    it('limits title words to 2', () => {
      const track = makeTrack({
        title: 'Alpha Beta Gamma Delta Epsilon Zeta',
        artists: [{ id: 'a1', name: 'Test', source: 'local' }],
      });
      const q = buildContentQuery(track, 'happy');
      // Only 2 of the 6 greek-letter words should appear
      const matches = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'].filter((w) =>
        q.toLowerCase().includes(w),
      );
      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('falls back gracefully for tracks with no artists', () => {
      const track = makeTrack({
        title: 'Mystery Track Sad',
        artists: [],
      });
      const q = buildContentQuery(track, 'sad');
      expect(q).toContain('sad');
    });
  });

  describe('MOODS constant', () => {
    it('lists all 6 moods in order', () => {
      expect(MOODS).toEqual(['happy', 'sad', 'chill', 'hype', 'romantic', 'unknown']);
    });
  });
});
