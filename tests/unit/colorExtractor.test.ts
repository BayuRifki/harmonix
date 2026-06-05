import { describe, it, expect } from 'vitest';
import { clusterPixels, hslToString, rgbToHsl } from '@/lib/colorExtractor';

function buffer(entries: Array<[number, number, number, number?]>): Uint8ClampedArray {
  const out = new Uint8ClampedArray(entries.length * 4);
  entries.forEach(([r, g, b, a], i) => {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a ?? 255;
  });
  return out;
}

describe('rgbToHsl', () => {
  it('returns achromatic HSL for grays', () => {
    expect(rgbToHsl(128, 128, 128)).toEqual({ h: 0, s: 0, l: expect.any(Number) });
    const { l } = rgbToHsl(0, 0, 0);
    expect(l).toBe(0);
    const top = rgbToHsl(255, 255, 255);
    expect(top.l).toBe(100);
  });

  it('computes hue correctly for pure reds/greens/blues', () => {
    expect(rgbToHsl(255, 0, 0).h).toBeCloseTo(0, 0);
    expect(rgbToHsl(0, 255, 0).h).toBeCloseTo(120, 0);
    expect(rgbToHsl(0, 0, 255).h).toBeCloseTo(240, 0);
  });
});

describe('clusterPixels', () => {
  it('returns null for empty buffer', () => {
    expect(clusterPixels(new Uint8ClampedArray(0))).toBeNull();
  });

  it('returns null when all pixels are transparent', () => {
    expect(clusterPixels(buffer(Array.from({ length: 4 }, () => [10, 20, 30, 0])))).toBeNull();
  });

  it('returns null when all pixels are gray (no saturation)', () => {
    expect(
      clusterPixels(
        buffer([
          [128, 128, 128],
          [64, 64, 64],
          [200, 200, 200],
        ]),
      ),
    ).toBeNull();
  });

  it('returns null when all pixels are too dark or too light', () => {
    expect(
      clusterPixels(
        buffer([
          [0, 0, 5],
          [5, 0, 0],
          [250, 250, 250],
        ]),
      ),
    ).toBeNull();
  });

  it('picks the dominant hue bucket for a single-color field', () => {
    const reds = buffer(
      Array.from({ length: 100 }, () => [220, 40, 40] as [number, number, number]),
    );
    const out = clusterPixels(reds);
    expect(out).not.toBeNull();
    const { h, s } = out!;
    const isRedHue = (h >= 345 && h < 360) || (h >= 0 && h < 15);
    expect(isRedHue).toBe(true);
    expect(s).toBeGreaterThan(50);
  });

  it('picks the dominant hue when colors mix', () => {
    const pixels: Array<[number, number, number]> = [];
    for (let i = 0; i < 70; i++) pixels.push([20, 150, 230]);
    for (let i = 0; i < 20; i++) pixels.push([200, 30, 30]);
    for (let i = 0; i < 10; i++) pixels.push([230, 200, 30]);
    const out = clusterPixels(buffer(pixels));
    expect(out).not.toBeNull();
    expect(out!.h).toBeGreaterThan(180);
    expect(out!.h).toBeLessThan(230);
  });

  it('caps saturation and clamps lightness for UI readability', () => {
    const overSaturated = buffer(
      Array.from({ length: 50 }, () => [0, 255, 80] as [number, number, number]),
    );
    const out = clusterPixels(overSaturated);
    expect(out).not.toBeNull();
    expect(out!.s).toBeLessThanOrEqual(85);
    expect(out!.l).toBeGreaterThanOrEqual(48);
    expect(out!.l).toBeLessThanOrEqual(68);
  });
});

describe('hslToString', () => {
  it('rounds and produces a valid css hsl() string', () => {
    expect(hslToString({ h: 200.4, s: 80.6, l: 50.4 })).toBe('hsl(200, 81%, 50%)');
  });

  it('clamps out-of-range values', () => {
    expect(hslToString({ h: -50, s: 200, l: -10 })).toBe('hsl(310, 100%, 0%)');
  });
});
