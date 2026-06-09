import { describe, it, expect } from 'vitest';
import {
  DEFAULT_F_MAX,
  DEFAULT_F_MIN,
  DEFAULT_SAMPLES,
  computeResponseCurve,
  dBSpectrumToCurve,
  easeInOutCubic,
  freqToX,
  gainToY,
  interpolateGainAt,
  lerpGains,
  xToFreq,
} from '../../src/lib/audio/eqResponse';
import { EQ_BAND_FREQUENCIES, FLAT_GAINS } from '../../src/lib/audio/presets';

describe('freqToX / xToFreq', () => {
  it('maps the min frequency to x=0', () => {
    expect(freqToX(DEFAULT_F_MIN, DEFAULT_F_MIN, DEFAULT_F_MAX, 400)).toBe(0);
  });

  it('maps the max frequency to x=width', () => {
    expect(freqToX(DEFAULT_F_MAX, DEFAULT_F_MIN, DEFAULT_F_MAX, 400)).toBeCloseTo(400, 6);
  });

  it('is monotonic on a log scale', () => {
    const w = 800;
    let last = -Infinity;
    for (const f of [50, 100, 500, 1000, 5000, 10000]) {
      const x = freqToX(f, DEFAULT_F_MIN, DEFAULT_F_MAX, w);
      expect(x).toBeGreaterThan(last);
      last = x;
    }
  });

  it('xToFreq is the inverse of freqToX (log axis)', () => {
    const w = 600;
    for (const f of [50, 250, 1000, 4000, 12000]) {
      const x = freqToX(f, DEFAULT_F_MIN, DEFAULT_F_MAX, w);
      expect(xToFreq(x, w, DEFAULT_F_MIN, DEFAULT_F_MAX)).toBeCloseTo(f, 4);
    }
  });

  it('handles zero width without crashing', () => {
    expect(xToFreq(123, 0, DEFAULT_F_MIN, DEFAULT_F_MAX)).toBe(DEFAULT_F_MIN);
  });
});

describe('gainToY', () => {
  it('flips the axis (0 dB is mid-height, +max is at top, -min is at bottom)', () => {
    expect(gainToY(0, -12, 12, 100)).toBe(50);
    expect(gainToY(12, -12, 12, 100)).toBe(0);
    expect(gainToY(-12, -12, 12, 100)).toBe(100);
  });

  it('clamps out-of-range values', () => {
    expect(gainToY(99, -12, 12, 100)).toBe(0);
    expect(gainToY(-99, -12, 12, 100)).toBe(100);
  });
});

describe('interpolateGainAt', () => {
  it('returns the band gain exactly at each band center', () => {
    const gains = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let i = 0; i < EQ_BAND_FREQUENCIES.length; i++) {
      const f = EQ_BAND_FREQUENCIES[i]!;
      expect(interpolateGainAt(f, EQ_BAND_FREQUENCIES, gains)).toBe(gains[i]);
    }
  });

  it('clamps to the lowest band below 32 Hz', () => {
    expect(interpolateGainAt(10, EQ_BAND_FREQUENCIES, [5, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(5);
  });

  it('clamps to the highest band above 16 kHz', () => {
    expect(interpolateGainAt(22000, EQ_BAND_FREQUENCIES, [0, 0, 0, 0, 0, 0, 0, 0, 0, -7])).toBe(-7);
  });

  it('interpolates linearly in log-frequency space', () => {
    // Geometric midpoint of 1000 and 2000 is ~1414 Hz.
    const mid = Math.sqrt(1000 * 2000);
    const out = interpolateGainAt(mid, [1000, 2000], [0, 12]);
    expect(out).toBeCloseTo(6, 5);
  });

  it('returns 0 for empty input', () => {
    expect(interpolateGainAt(1000, [], [])).toBe(0);
  });

  it('falls back to gains[0] when lengths mismatch', () => {
    expect(interpolateGainAt(1000, [32, 64, 125], [9, 9, 9, 9])).toBe(9);
  });
});

describe('computeResponseCurve', () => {
  it('returns DEFAULT_SAMPLES points by default', () => {
    expect(computeResponseCurve(EQ_BAND_FREQUENCIES, FLAT_GAINS)).toHaveLength(DEFAULT_SAMPLES);
  });

  it('returns a flat line for flat gains', () => {
    const curve = computeResponseCurve(EQ_BAND_FREQUENCIES, FLAT_GAINS, 64);
    for (const v of curve) {
      expect(v).toBe(0);
    }
  });

  it('honors a custom sample count (clamped to >= 2)', () => {
    expect(computeResponseCurve(EQ_BAND_FREQUENCIES, FLAT_GAINS, 1)).toHaveLength(2);
    expect(computeResponseCurve(EQ_BAND_FREQUENCIES, FLAT_GAINS, 16)).toHaveLength(16);
  });

  it('crosses 0 dB near a flat preset', () => {
    const curve = computeResponseCurve(EQ_BAND_FREQUENCIES, FLAT_GAINS, 96);
    const allZero = curve.every((v) => Math.abs(v) < 1e-6);
    expect(allZero).toBe(true);
  });

  it('reflects bass boost in the low frequencies', () => {
    const bass = [7, 6, 4, 2, 0, 0, 0, 0, 0, 0];
    const curve = computeResponseCurve(EQ_BAND_FREQUENCIES, bass, 96, 20, 20000);
    const firstQuarter = curve.slice(0, Math.floor(curve.length / 4));
    const lastQuarter = curve.slice(Math.floor((curve.length * 3) / 4));
    const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
    const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
    expect(avgFirst).toBeGreaterThan(avgLast);
  });
});

describe('lerpGains', () => {
  it('returns the from-array at t=0', () => {
    expect(lerpGains([1, 2, 3], [10, 20, 30], 0)).toEqual([1, 2, 3]);
  });

  it('returns the to-array at t=1', () => {
    expect(lerpGains([1, 2, 3], [10, 20, 30], 1)).toEqual([10, 20, 30]);
  });

  it('interpolates linearly at t=0.5', () => {
    expect(lerpGains([0, 0, 0], [10, 20, 30], 0.5)).toEqual([5, 10, 15]);
  });

  it('clamps t to [0, 1]', () => {
    expect(lerpGains([0, 0], [1, 1], 2)).toEqual([1, 1]);
    expect(lerpGains([0, 0], [1, 1], -1)).toEqual([0, 0]);
  });

  it('uses the shorter length (drops extras silently)', () => {
    expect(lerpGains([1, 2], [10, 20, 30], 0.5)).toEqual([5.5, 11]);
  });
});

describe('easeInOutCubic', () => {
  it('is 0 at t=0 and 1 at t=1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('satisfies f(t) + f(1 - t) = 1 (point-symmetric about (0.5, 0.5))', () => {
    for (const t of [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
      expect(easeInOutCubic(t) + easeInOutCubic(1 - t)).toBeCloseTo(1, 6);
    }
  });

  it('clamps t to [0, 1]', () => {
    expect(easeInOutCubic(2)).toBe(1);
    expect(easeInOutCubic(-1)).toBe(0);
  });
});

describe('dBSpectrumToCurve', () => {
  it('returns a curve of the requested length', () => {
    const curve = dBSpectrumToCurve(new Uint8Array(128), 48000, 64);
    expect(curve).toHaveLength(64);
  });

  it('emits the floor when the input is null/empty', () => {
    const curve = dBSpectrumToCurve(null, 48000, 16, 20, 20000, -90, 0);
    for (const v of curve) expect(v).toBe(-90);
  });

  it('maps a 255 byte to the top of the range', () => {
    const data = new Uint8Array(128);
    data.fill(255);
    const curve = dBSpectrumToCurve(data, 48000, 16, 20, 20000, -90, 0);
    for (const v of curve) expect(v).toBe(0);
  });

  it('maps 0 byte to the floor', () => {
    const data = new Uint8Array(128);
    const curve = dBSpectrumToCurve(data, 48000, 16, 20, 20000, -90, 0);
    for (const v of curve) expect(v).toBe(-90);
  });

  it('maps 128 byte to the mid-point of the range', () => {
    const data = new Uint8Array(128);
    data.fill(128);
    const curve = dBSpectrumToCurve(data, 48000, 16, 20, 20000, -90, 0);
    for (const v of curve) expect(v).toBeCloseTo(-45, 0);
  });

  it('handles an unknown sample rate gracefully (returns the floor)', () => {
    const data = new Uint8Array(128);
    data.fill(255);
    const curve = dBSpectrumToCurve(data, 0, 8);
    for (const v of curve) expect(v).toBe(-90);
  });
});
