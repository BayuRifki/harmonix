import { describe, it, expect } from 'vitest';
import {
  BUILTIN_PRESETS,
  FLAT_GAINS,
  EQ_BAND_FREQUENCIES,
  EQ_MIN_GAIN,
  EQ_MAX_GAIN,
  getBuiltinPreset,
  isFlatGains,
  clampGain,
  clampGains,
  EQ_BAND_LABELS,
} from '../../src/lib/audio/presets';

describe('Built-in EQ presets', () => {
  it('has exactly 7 presets', () => {
    expect(BUILTIN_PRESETS).toHaveLength(7);
  });

  it('every preset has 10 gains (one per band)', () => {
    BUILTIN_PRESETS.forEach((p) => {
      expect(p.gains).toHaveLength(10);
    });
  });

  it('every preset is marked as builtin', () => {
    BUILTIN_PRESETS.forEach((p) => expect(p.builtin).toBe(true));
  });

  it('every gain is within -12..+12 dB', () => {
    BUILTIN_PRESETS.forEach((p) => {
      p.gains.forEach((g) => {
        expect(g).toBeGreaterThanOrEqual(EQ_MIN_GAIN);
        expect(g).toBeLessThanOrEqual(EQ_MAX_GAIN);
      });
    });
  });

  it('includes Flat, Rock, Pop, Bass Boost, Vocal, Classical, Jazz', () => {
    const names = BUILTIN_PRESETS.map((p) => p.name);
    expect(names).toContain('Flat');
    expect(names).toContain('Rock');
    expect(names).toContain('Pop');
    expect(names).toContain('Bass Boost');
    expect(names).toContain('Vocal');
    expect(names).toContain('Classical');
    expect(names).toContain('Jazz');
  });

  it('Flat preset has all gains at 0', () => {
    const flat = getBuiltinPreset('Flat');
    expect(flat).not.toBeNull();
    expect(flat?.gains).toEqual(FLAT_GAINS);
    expect(flat?.gains.every((g) => g === 0)).toBe(true);
  });

  it('Bass Boost emphasizes the low bands', () => {
    const bass = getBuiltinPreset('Bass Boost');
    expect(bass).not.toBeNull();
    expect(bass!.gains[0]).toBeGreaterThan(bass!.gains[5]);
    expect(bass!.gains[0]).toBeGreaterThan(bass!.gains[9]);
  });

  it('getBuiltinPreset returns null for unknown name', () => {
    expect(getBuiltinPreset('Unknown')).toBeNull();
  });

  it('EQ_BAND_FREQUENCIES has 10 standard ISO frequencies', () => {
    expect(EQ_BAND_FREQUENCIES).toHaveLength(10);
    expect(EQ_BAND_FREQUENCIES[0]).toBe(32);
    expect(EQ_BAND_FREQUENCIES[9]).toBe(16000);
  });

  it('EQ_BAND_LABELS matches frequencies', () => {
    expect(EQ_BAND_LABELS).toHaveLength(EQ_BAND_FREQUENCIES.length);
  });
});

describe('clampGain', () => {
  it('clamps to min', () => {
    expect(clampGain(-50)).toBe(EQ_MIN_GAIN);
  });

  it('clamps to max', () => {
    expect(clampGain(50)).toBe(EQ_MAX_GAIN);
  });

  it('passes through valid values', () => {
    expect(clampGain(3.5)).toBe(3.5);
    expect(clampGain(0)).toBe(0);
    expect(clampGain(-3.5)).toBe(-3.5);
  });
});

describe('clampGains', () => {
  it('clamps each gain in array', () => {
    const result = clampGains([50, -50, 5, -5, 0, 0, 0, 0, 0, 0]);
    expect(result).toEqual([12, -12, 5, -5, 0, 0, 0, 0, 0, 0]);
  });

  it('returns FLAT for wrong length', () => {
    expect(clampGains([1, 2, 3])).toEqual(FLAT_GAINS);
  });
});

describe('isFlatGains', () => {
  it('true for all zeros', () => {
    expect(isFlatGains([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(true);
  });

  it('true for tiny rounding noise', () => {
    expect(isFlatGains([0.0005, -0.0005, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(true);
  });

  it('false when any non-zero', () => {
    expect(isFlatGains([1, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(false);
  });
});
