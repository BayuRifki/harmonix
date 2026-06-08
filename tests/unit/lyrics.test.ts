import { describe, it, expect } from 'vitest';
import { parseLrcString, findActiveLineIndex } from '@/lib/lyrics';

describe('lyrics', () => {
  it('parses standard [mm:ss] timestamps', () => {
    const lines = parseLrcString('[00:01.50]Hello\n[00:03.00]World');
    expect(lines).toEqual([
      { timeMs: 1500, text: 'Hello' },
      { timeMs: 3000, text: 'World' },
    ]);
  });

  it('sorts lines out of order', () => {
    const lines = parseLrcString('[00:05.00]C\n[00:01.00]A\n[00:03.00]B');
    expect(lines.map((l) => l.text)).toEqual(['A', 'B', 'C']);
  });

  it('skips lines with no text (e.g. metadata)', () => {
    const lines = parseLrcString('[00:01.00]A\n[00:02.00]\n[ar: Artist]\n[00:03.00]B');
    expect(lines.map((l) => l.text)).toEqual(['A', 'B']);
  });

  it('handles timestamps without fractional seconds', () => {
    const lines = parseLrcString('[00:05]Hello');
    expect(lines).toEqual([{ timeMs: 5000, text: 'Hello' }]);
  });

  it('handles multi-digit minutes', () => {
    const lines = parseLrcString('[125:30.5]A');
    expect(lines).toEqual([{ timeMs: 125 * 60_000 + 30_500, text: 'A' }]);
  });

  it('returns empty array for empty string', () => {
    expect(parseLrcString('')).toEqual([]);
  });

  it('findActiveLineIndex returns -1 for empty list', () => {
    expect(findActiveLineIndex([], 5000)).toBe(-1);
  });

  it('findActiveLineIndex returns -1 when before first line', () => {
    const lines = parseLrcString('[00:05.00]A\n[00:10.00]B');
    expect(findActiveLineIndex(lines, 1000)).toBe(-1);
  });

  it('findActiveLineIndex returns current index', () => {
    const lines = parseLrcString('[00:01.00]A\n[00:03.00]B\n[00:05.00]C');
    expect(findActiveLineIndex(lines, 4000)).toBe(1);
  });

  it('findActiveLineIndex returns last when past the end', () => {
    const lines = parseLrcString('[00:01.00]A\n[00:03.00]B');
    expect(findActiveLineIndex(lines, 99_999)).toBe(1);
  });

  it('findActiveLineIndex picks the line at exactly its time', () => {
    const lines = parseLrcString('[00:01.00]A\n[00:03.00]B');
    expect(findActiveLineIndex(lines, 3000)).toBe(1);
  });
});
