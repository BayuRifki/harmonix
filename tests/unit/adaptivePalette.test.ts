import { describe, it, expect } from 'vitest';
import {
  buildPalette,
  interpolateHsl,
  interpolatePalette,
  paletteToCssVars,
  hslToString,
} from '@/lib/colorExtractor';

describe('buildPalette', () => {
  it('builds a 3-tone palette from a single accent color', () => {
    const palette = buildPalette({ h: 200, s: 80, l: 50 });
    expect(palette.vibrant.h).toBe(200);
    expect(palette.muted.h).toBe(200);
    expect(palette.accent.h).toBe(200);
    expect(palette.vibrant.s).toBeGreaterThanOrEqual(palette.muted.s);
    expect(palette.vibrant.l).toBeGreaterThanOrEqual(palette.muted.l);
  });

  it('boosts saturation and lowers lightness for vibrant variant', () => {
    const palette = buildPalette({ h: 0, s: 50, l: 60 });
    expect(palette.vibrant.s).toBeGreaterThanOrEqual(55);
    expect(palette.vibrant.l).toBeLessThanOrEqual(60);
  });

  it('reduces saturation and lightness for muted variant', () => {
    const palette = buildPalette({ h: 0, s: 80, l: 60 });
    expect(palette.muted.s).toBeLessThan(50);
    expect(palette.muted.l).toBeLessThan(30);
  });

  it('keeps hue consistent across all 3 tones', () => {
    const palette = buildPalette({ h: 137, s: 60, l: 55 });
    expect(palette.vibrant.h).toBe(137);
    expect(palette.muted.h).toBe(137);
    expect(palette.accent.h).toBe(137);
  });
});

describe('interpolateHsl', () => {
  it('returns the from color at t=0', () => {
    const a = { h: 0, s: 50, l: 50 };
    const b = { h: 180, s: 80, l: 70 };
    const out = interpolateHsl(a, b, 0);
    expect(out).toEqual(a);
  });

  it('returns the to color at t=1', () => {
    const a = { h: 0, s: 50, l: 50 };
    const b = { h: 180, s: 80, l: 70 };
    const out = interpolateHsl(a, b, 1);
    expect(out.h).toBeCloseTo(b.h, 0);
    expect(out.s).toBeCloseTo(b.s, 0);
    expect(out.l).toBeCloseTo(b.l, 0);
  });

  it('takes the shortest path around the hue circle', () => {
    const a = { h: 350, s: 50, l: 50 };
    const b = { h: 10, s: 50, l: 50 };
    const out = interpolateHsl(a, b, 0.5);
    expect(out.h).toBeCloseTo(0, 0);
  });

  it('clamps t to [0, 1]', () => {
    const a = { h: 0, s: 50, l: 50 };
    const b = { h: 180, s: 80, l: 70 };
    expect(interpolateHsl(a, b, -0.5).h).toBe(0);
    expect(interpolateHsl(a, b, 1.5).h).toBeCloseTo(180, 0);
  });

  it('interpolates linearly at t=0.5', () => {
    const a = { h: 0, s: 0, l: 0 };
    const b = { h: 0, s: 100, l: 100 };
    const out = interpolateHsl(a, b, 0.5);
    expect(out.s).toBe(50);
    expect(out.l).toBe(50);
  });
});

describe('interpolatePalette', () => {
  it('interpolates all three tones', () => {
    const a = buildPalette({ h: 0, s: 50, l: 50 });
    const b = buildPalette({ h: 180, s: 80, l: 60 });
    const mid = interpolatePalette(a, b, 0.5);
    expect(mid.vibrant.h).toBeCloseTo(90, 0);
    expect(mid.muted.h).toBeCloseTo(90, 0);
    expect(mid.accent.h).toBeCloseTo(90, 0);
  });

  it('returns from-palette at t=0', () => {
    const a = buildPalette({ h: 30, s: 60, l: 50 });
    const b = buildPalette({ h: 200, s: 80, l: 60 });
    const out = interpolatePalette(a, b, 0);
    expect(out.vibrant.h).toBe(a.vibrant.h);
    expect(out.muted.h).toBe(a.muted.h);
    expect(out.accent.h).toBe(a.accent.h);
  });
});

describe('paletteToCssVars', () => {
  it('returns a record with --accent, --accent-hover, --accent-vibrant, --accent-muted', () => {
    const palette = buildPalette({ h: 320, s: 70, l: 55 });
    const vars = paletteToCssVars(palette);
    expect(vars['--accent']).toBe(hslToString(palette.accent));
    expect(vars['--accent-vibrant']).toBe(hslToString(palette.vibrant));
    expect(vars['--accent-muted']).toBe(hslToString(palette.muted));
    expect(vars['--accent-hover']).toMatch(/^hsl\(/);
  });
});
