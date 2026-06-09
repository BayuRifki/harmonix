/**
 * Pure math helpers for the EQ response curve visualizer.
 *
 * The visualizer draws a frequency response curve across a log-spaced
 * x-axis (20 Hz to 20 kHz) showing what gain (in dB) the EQ chain is
 * applying at each frequency. The 10 EQ bands are spaced at 32, 64,
 * 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz. We treat the band center
 * frequencies as the actual gain values and interpolate between them
 * on a log-frequency axis (which mirrors how the human ear perceives
 * pitch).
 */

export const DEFAULT_F_MIN = 20;
export const DEFAULT_F_MAX = 20_000;
export const DEFAULT_SAMPLES = 96;

export function freqToX(freq: number, fMin: number, fMax: number, width: number): number {
  if (fMax <= fMin) return 0;
  const lf = Math.log(freq);
  const lo = Math.log(fMin);
  const hi = Math.log(fMax);
  return ((lf - lo) / (hi - lo)) * width;
}

export function xToFreq(x: number, width: number, fMin: number, fMax: number): number {
  if (width <= 0 || fMax <= fMin) return fMin;
  const t = Math.max(0, Math.min(1, x / width));
  const lo = Math.log(fMin);
  const hi = Math.log(fMax);
  return Math.exp(lo + t * (hi - lo));
}

export function gainToY(gainDb: number, minDb: number, maxDb: number, height: number): number {
  const clamped = Math.max(minDb, Math.min(maxDb, gainDb));
  const t = (clamped - minDb) / (maxDb - minDb);
  return height - t * height;
}

/**
 * Log-frequency linear interpolation between EQ band centers. Frequencies
 * outside the band range are clamped to the nearest band (so the curve
 * stays flat beyond 32 Hz and 16 kHz).
 */
export function interpolateGainAt(
  freq: number,
  bandFrequencies: readonly number[],
  gains: readonly number[],
): number {
  if (bandFrequencies.length === 0 || gains.length === 0) return 0;
  if (bandFrequencies.length !== gains.length) {
    return gains[0] ?? 0;
  }
  const f0 = bandFrequencies[0]!;
  const fN = bandFrequencies[bandFrequencies.length - 1]!;
  if (freq <= f0) return gains[0] ?? 0;
  if (freq >= fN) return gains[bandFrequencies.length - 1] ?? 0;

  const lf = Math.log(freq);
  for (let i = 0; i < bandFrequencies.length - 1; i++) {
    const fa = bandFrequencies[i]!;
    const fb = bandFrequencies[i + 1]!;
    const la = Math.log(fa);
    const lb = Math.log(fb);
    if (lf >= la && lf <= lb) {
      const t = (lf - la) / (lb - la);
      const ga = gains[i] ?? 0;
      const gb = gains[i + 1] ?? 0;
      return ga + (gb - ga) * t;
    }
  }
  return gains[bandFrequencies.length - 1] ?? 0;
}

/**
 * Samples the EQ response curve across the visible frequency range.
 * Returns an array of gain values (dB) at log-spaced points.
 */
export function computeResponseCurve(
  bandFrequencies: readonly number[],
  gains: readonly number[],
  samples: number = DEFAULT_SAMPLES,
  fMin: number = DEFAULT_F_MIN,
  fMax: number = DEFAULT_F_MAX,
): number[] {
  const n = Math.max(2, Math.floor(samples));
  const out: number[] = new Array(n);
  const lo = Math.log(fMin);
  const hi = Math.log(fMax);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const f = Math.exp(lo + t * (hi - lo));
    out[i] = interpolateGainAt(f, bandFrequencies, gains);
  }
  return out;
}

/**
 * Linearly interpolate between two gain arrays element-wise. Returns a
 * new array; does not mutate the inputs. Clamps to length of the shorter
 * input (extra entries are dropped silently).
 */
export function lerpGains(a: readonly number[], b: readonly number[], t: number): number[] {
  const n = Math.min(a.length, b.length);
  const clamped = Math.max(0, Math.min(1, t));
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (a[i] ?? 0) + ((b[i] ?? 0) - (a[i] ?? 0)) * clamped;
  }
  return out;
}

/**
 * Cubic ease-in-out (smoother than linear for visual transitions).
 * Returns the eased progress for `t` in [0, 1].
 */
export function easeInOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/**
 * Convert a Uint8Array from `AnalyserNode.getByteFrequencyData()` into
 * a sampled dB-like magnitude curve across the same x-axis as the
 * response curve. The result is in dB (clamped to [minDb, maxDb] with
 * a floor at minDb for silence). sampleRateHz is the AudioContext
 * sample rate (e.g. 48000) so bin → frequency mapping is correct.
 */
export function dBSpectrumToCurve(
  data: Uint8Array | null | undefined,
  sampleRateHz: number,
  samples: number = DEFAULT_SAMPLES,
  fMin: number = DEFAULT_F_MIN,
  fMax: number = DEFAULT_F_MAX,
  minDb: number = -90,
  maxDb: number = 0,
): number[] {
  const n = Math.max(2, Math.floor(samples));
  const out: number[] = new Array(n);
  const lo = Math.log(fMin);
  const hi = Math.log(fMax);
  if (!data || data.length === 0 || sampleRateHz <= 0) {
    for (let i = 0; i < n; i++) out[i] = minDb;
    return out;
  }
  const nyquist = sampleRateHz / 2;
  const binCount = data.length;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const f = Math.exp(lo + t * (hi - lo));
    const bin = Math.min(binCount - 1, Math.max(0, Math.floor((f / nyquist) * binCount)));
    const byte = data[bin] ?? 0;
    const db = (byte / 255) * (maxDb - minDb) + minDb;
    out[i] = Math.max(minDb, Math.min(maxDb, db));
  }
  return out;
}
