import { describe, it, expect } from 'vitest';
import { processExtract, type ColorExtractRequest } from '../../src/lib/workers/colorWorkerCore';

function rgba(entries: Array<[number, number, number, number?]>): ArrayBuffer {
  const buf = new ArrayBuffer(entries.length * 4);
  const view = new Uint8ClampedArray(buf);
  entries.forEach(([r, g, b, a], i) => {
    view[i * 4] = r;
    view[i * 4 + 1] = g;
    view[i * 4 + 2] = b;
    view[i * 4 + 3] = a ?? 255;
  });
  return buf;
}

function req(id: number, data: ArrayBuffer): ColorExtractRequest {
  return { id, data };
}

describe('colorWorkerCore.processExtract', () => {
  it('returns null result for empty buffer (no surviving pixels)', () => {
    const out = processExtract(req(1, rgba([])));
    expect(out).toEqual({ id: 1, result: null });
  });

  it('returns the HSL triple for a solid red field', () => {
    const data = rgba(Array.from({ length: 100 }, () => [220, 40, 40] as [number, number, number]));
    const out = processExtract(req(7, data));
    expect(out.id).toBe(7);
    expect(out.result).not.toBeNull();
    const { h, s } = out.result!;
    const isRedHue = (h >= 345 && h < 360) || (h >= 0 && h < 15);
    expect(isRedHue).toBe(true);
    expect(s).toBeGreaterThan(50);
    expect(out.error).toBeUndefined();
  });

  it('skips transparent pixels', () => {
    const visible = rgba(
      Array.from({ length: 50 }, () => [20, 150, 230] as [number, number, number]),
    );
    const transparent = rgba(
      Array.from({ length: 50 }, () => [255, 0, 0, 0] as [number, number, number, number]),
    );
    const out = processExtract(req(2, visible));
    expect(out.result).not.toBeNull();
    const out2 = processExtract(req(3, transparent));
    expect(out2.result).toBeNull();
  });

  it('picks the dominant hue when colors mix (blue wins over red and yellow)', () => {
    const pixels: Array<[number, number, number]> = [];
    for (let i = 0; i < 70; i++) pixels.push([20, 150, 230]);
    for (let i = 0; i < 20; i++) pixels.push([200, 30, 30]);
    for (let i = 0; i < 10; i++) pixels.push([230, 200, 30]);
    const out = processExtract(req(4, rgba(pixels)));
    expect(out.result).not.toBeNull();
    expect(out.result!.h).toBeGreaterThan(180);
    expect(out.result!.h).toBeLessThan(230);
  });

  it('clamps saturation/lightness for UI readability', () => {
    const data = rgba(Array.from({ length: 50 }, () => [0, 255, 80] as [number, number, number]));
    const out = processExtract(req(5, data));
    expect(out.result).not.toBeNull();
    expect(out.result!.s).toBeLessThanOrEqual(85);
    expect(out.result!.l).toBeGreaterThanOrEqual(48);
    expect(out.result!.l).toBeLessThanOrEqual(68);
  });

  it('preserves the request id on the response (multi-call correlation)', () => {
    const a = processExtract(req(42, rgba([[100, 200, 50]])));
    const b = processExtract(req(99, rgba([[100, 200, 50]])));
    expect(a.id).toBe(42);
    expect(b.id).toBe(99);
  });

  it('returns an error string for a zero-length buffer (defensive path)', () => {
    const out = processExtract(req(6, new ArrayBuffer(0)));
    expect(out.error).toBeUndefined();
    expect(out.result).toBeNull();
  });
});
