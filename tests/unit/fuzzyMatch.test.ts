import { describe, it, expect } from 'vitest';
import { fuzzyMatch, fuzzySearch, highlightMatches } from '@/components/command/fuzzyMatch';

describe('fuzzyMatch', () => {
  it('matches empty query against any item', () => {
    const m = fuzzyMatch('hello', '', (t) => t);
    expect(m).not.toBeNull();
    expect(m!.score).toBe(0);
    expect(m!.matches).toEqual([]);
  });

  it('returns null when item has no text', () => {
    expect(fuzzyMatch({ a: 1 }, 'foo', () => '')).toBeNull();
  });

  it('scores exact match as 0', () => {
    const m = fuzzyMatch('hello', 'hello', (t) => t);
    expect(m!.score).toBe(0);
  });

  it('scores prefix match as 1', () => {
    const m = fuzzyMatch('hello world', 'hello', (t) => t);
    expect(m!.score).toBe(1);
    expect(m!.matches).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns null when query is not a subsequence', () => {
    expect(fuzzyMatch('abc', 'xyz', (t) => t)).toBeNull();
  });

  it('matches subsequence in order', () => {
    const m = fuzzyMatch('library', 'lry', (t) => t);
    expect(m).not.toBeNull();
    expect(m!.matches).toEqual([0, 3, 6]);
  });

  it('is case-insensitive', () => {
    const m = fuzzyMatch('Hello', 'hello', (t) => t);
    expect(m).not.toBeNull();
  });

  it('scores consecutive matches lower than scattered ones', () => {
    const consec = fuzzyMatch('hello', 'hello', (t) => t)!;
    const scattered = fuzzyMatch('h e l l o', 'hello', (t) => t)!;
    expect(consec.score).toBeLessThan(scattered.score);
  });

  it('scores word-boundary matches better than mid-word', () => {
    const boundary = fuzzyMatch('Foo Bar', 'fb', (t) => t)!;
    const mid = fuzzyMatch('foobar', 'fb', (t) => t)!;
    expect(boundary.score).toBeLessThanOrEqual(mid.score);
  });
});

describe('fuzzySearch', () => {
  it('returns top N items when query is empty', () => {
    const items = ['a', 'b', 'c', 'd'];
    const result = fuzzySearch(items, '', (t) => t, 2);
    expect(result.length).toBe(2);
    expect(result[0]!.item).toBe('a');
    expect(result[1]!.item).toBe('b');
  });

  it('sorts by score (best first)', () => {
    const items = ['zzz hello zzz', 'hello', 'x hello x'];
    const result = fuzzySearch(items, 'hello', (t) => t);
    expect(result[0]!.item).toBe('hello');
  });

  it('filters out non-matches', () => {
    const items = ['apple', 'banana', 'cherry'];
    const result = fuzzySearch(items, 'an', (t) => t);
    expect(result.length).toBe(1);
    expect(result[0]!.item).toBe('banana');
  });

  it('respects the limit', () => {
    const items = Array.from({ length: 30 }, (_, i) => `item${i}`);
    const result = fuzzySearch(items, 'item', (t) => t, 5);
    expect(result.length).toBe(5);
  });
});

describe('highlightMatches', () => {
  it('returns single unhighlighted segment for empty matches', () => {
    const segs = highlightMatches('hello', []);
    expect(segs).toEqual([{ text: 'hello', highlighted: false }]);
  });

  it('highlights contiguous runs of matched indices', () => {
    const segs = highlightMatches('hello', [0, 1]);
    expect(segs).toEqual([
      { text: 'he', highlighted: true },
      { text: 'llo', highlighted: false },
    ]);
  });

  it('alternates highlighted and non-highlighted segments', () => {
    const segs = highlightMatches('abcde', [0, 2, 4]);
    expect(segs).toEqual([
      { text: 'a', highlighted: true },
      { text: 'b', highlighted: false },
      { text: 'c', highlighted: true },
      { text: 'd', highlighted: false },
      { text: 'e', highlighted: true },
    ]);
  });

  it('handles match at the end', () => {
    const segs = highlightMatches('foo', [2]);
    expect(segs).toEqual([
      { text: 'fo', highlighted: false },
      { text: 'o', highlighted: true },
    ]);
  });

  it('handles match at the start', () => {
    const segs = highlightMatches('foo', [0]);
    expect(segs).toEqual([
      { text: 'f', highlighted: true },
      { text: 'oo', highlighted: false },
    ]);
  });
});
