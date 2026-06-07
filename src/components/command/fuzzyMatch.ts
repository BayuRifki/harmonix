export interface FuzzyMatch<T> {
  item: T;
  score: number;
  matches: number[];
}

/**
 * Lightweight fuzzy matcher with character-level scoring.
 * Returns matches sorted by score (lower = better). 0 means perfect prefix match.
 *
 * Scoring rules:
 *   - Exact match: 0
 *   - Prefix match: 1
 *   - Consecutive character bonus: -2 per consecutive match
 *   - Word boundary (after space/camelCase separator): -3
 *   - No match: returns null
 */
export function fuzzyMatch<T>(
  item: T,
  query: string,
  getText: (t: T) => string,
): FuzzyMatch<T> | null {
  if (!query) return { item, score: 0, matches: [] };
  const text = getText(item);
  if (!text) return null;
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  if (textLower === queryLower) return { item, score: 0, matches: [] };
  if (textLower.startsWith(queryLower)) {
    return { item, score: 1, matches: Array.from({ length: query.length }, (_, i) => i) };
  }

  let qi = 0;
  let score = 100;
  let consecutive = 0;
  const matches: number[] = [];
  let lastWasBoundary = true;

  for (let i = 0; i < textLower.length && qi < queryLower.length; i++) {
    const ch = textLower[i]!;
    const qch = queryLower[qi]!;
    if (ch === qch) {
      matches.push(i);
      let bonus = 0;
      if (i > 0) {
        const prev = text[i - 1]!;
        const isBoundary =
          prev === ' ' || prev === '-' || prev === '_' || prev === '/' || prev === '.';
        if (isBoundary || lastWasBoundary) bonus -= 3;
      }
      if (consecutive > 0) bonus -= 2;
      score += bonus;
      consecutive++;
      lastWasBoundary = false;
      qi++;
    } else {
      consecutive = 0;
      lastWasBoundary = ch === ' ' || ch === '-' || ch === '_' || ch === '/' || ch === '.';
    }
  }

  if (qi < queryLower.length) return null;
  return { item, score, matches };
}

export function fuzzySearch<T>(
  items: T[],
  query: string,
  getText: (t: T) => string,
  limit = 20,
): FuzzyMatch<T>[] {
  if (!query.trim()) return items.slice(0, limit).map((item) => ({ item, score: 0, matches: [] }));
  const results: FuzzyMatch<T>[] = [];
  for (const item of items) {
    const m = fuzzyMatch(item, query, getText);
    if (m) results.push(m);
  }
  results.sort((a, b) => a.score - b.score);
  return results.slice(0, limit);
}

/**
 * Highlight matched characters in a string with <mark> tags.
 * Returns an array of segments: { text, highlighted }.
 */
export function highlightMatches(
  text: string,
  matches: number[],
): Array<{ text: string; highlighted: boolean }> {
  if (matches.length === 0) return [{ text, highlighted: false }];
  const set = new Set(matches);
  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let buf = '';
  let bufHighlighted = false;
  for (let i = 0; i < text.length; i++) {
    const hi = set.has(i);
    if (i === 0) {
      bufHighlighted = hi;
      buf = text[i]!;
    } else if (hi === bufHighlighted) {
      buf += text[i]!;
    } else {
      segments.push({ text: buf, highlighted: bufHighlighted });
      buf = text[i]!;
      bufHighlighted = hi;
    }
  }
  if (buf) segments.push({ text: buf, highlighted: bufHighlighted });
  return segments;
}
