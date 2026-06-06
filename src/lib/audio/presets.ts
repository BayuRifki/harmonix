import {
  FLAT_GAINS as _FLAT_GAINS,
  EQ_BAND_FREQUENCIES as _BAND_FREQS,
  EQ_MIN_GAIN,
  EQ_MAX_GAIN,
  clampGain,
  clampGains,
  type EqPreset as _EqPreset,
} from '@shared/index';

export const EQ_BAND_LABELS = [
  '32',
  '64',
  '125',
  '250',
  '500',
  '1k',
  '2k',
  '4k',
  '8k',
  '16k',
] as const;

export const EQ_BAND_FREQUENCIES = _BAND_FREQS;
export const FLAT_GAINS = _FLAT_GAINS;
export type EqPreset = _EqPreset;
export { EQ_MIN_GAIN, EQ_MAX_GAIN, clampGain, clampGains };

export const BUILTIN_PRESETS: EqPreset[] = [
  { name: 'Flat', builtin: true, gains: [...FLAT_GAINS] },
  {
    name: 'Rock',
    builtin: true,
    gains: [5, 4, 3, 1, -1, -1, 2, 3, 4, 5],
  },
  {
    name: 'Pop',
    builtin: true,
    gains: [-1, 0, 2, 3, 3, 2, 1, 0, -1, -1],
  },
  {
    name: 'Bass Boost',
    builtin: true,
    gains: [7, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  },
  {
    name: 'Vocal',
    builtin: true,
    gains: [-3, -2, -1, 1, 4, 5, 4, 2, 0, -1],
  },
  {
    name: 'Classical',
    builtin: true,
    gains: [4, 3, 2, 0, 0, 0, -1, -2, -2, -3],
  },
  {
    name: 'Jazz',
    builtin: true,
    gains: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  },
];

export function getBuiltinPreset(name: string): EqPreset | null {
  return BUILTIN_PRESETS.find((p) => p.name === name) ?? null;
}

export function isFlatGains(gains: number[]): boolean {
  return gains.every((g) => Math.abs(g) < 0.001);
}
