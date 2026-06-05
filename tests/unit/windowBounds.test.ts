import { describe, it, expect } from 'vitest';
import { clampToDisplayBounds, type DisplayWorkArea } from '../../electron/main/windowBounds';

const WORK: DisplayWorkArea = { x: 0, y: 0, width: 1920, height: 1080 };

describe('windowBounds.clampToDisplayBounds', () => {
  it('keeps a position that is already inside the work area', () => {
    const r = clampToDisplayBounds(100, 200, 360, 120, WORK);
    expect(r).toEqual({ x: 100, y: 200 });
  });

  it('clamps to the right edge when window would fall off', () => {
    const r = clampToDisplayBounds(2000, 200, 360, 120, WORK);
    expect(r.x).toBe(WORK.x + WORK.width - 32);
  });

  it('clamps to the bottom edge when window would fall off', () => {
    const r = clampToDisplayBounds(100, 2000, 360, 120, WORK);
    expect(r.y).toBe(WORK.y + WORK.height - 32);
  });

  it('clamps to the left edge when x is negative', () => {
    const r = clampToDisplayBounds(-500, 200, 360, 120, WORK);
    expect(r.x).toBe(WORK.x - 360 + 32);
  });

  it('clamps to the top edge when y is negative', () => {
    const r = clampToDisplayBounds(100, -500, 360, 120, WORK);
    expect(r.y).toBe(WORK.y - 120 + 32);
  });

  it('respects offset displays (negative origin)', () => {
    const off: DisplayWorkArea = { x: -1920, y: 0, width: 1920, height: 1080 };
    const r = clampToDisplayBounds(-1800, 100, 360, 120, off);
    expect(r.x).toBe(-1800);
  });

  it('always leaves at least 32px of the title area visible', () => {
    const r = clampToDisplayBounds(9999, 9999, 360, 120, WORK);
    expect(WORK.x + WORK.width - r.x).toBeLessThanOrEqual(32);
    expect(WORK.y + WORK.height - r.y).toBeLessThanOrEqual(32);
  });
});
