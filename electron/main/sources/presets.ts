import { FLAT_GAINS, type EqPreset } from './types';

export const BUILTIN_PRESETS: EqPreset[] = [
  { name: 'Flat', builtin: true, gains: [...FLAT_GAINS] },
  { name: 'Rock', builtin: true, gains: [5, 4, 3, 1, -1, -1, 2, 3, 4, 5] },
  { name: 'Pop', builtin: true, gains: [-1, 0, 2, 3, 3, 2, 1, 0, -1, -1] },
  { name: 'Bass Boost', builtin: true, gains: [7, 6, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: 'Vocal', builtin: true, gains: [-3, -2, -1, 1, 4, 5, 4, 2, 0, -1] },
  { name: 'Classical', builtin: true, gains: [4, 3, 2, 0, 0, 0, -1, -2, -2, -3] },
  { name: 'Jazz', builtin: true, gains: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3] },
];

export function getBuiltinPreset(name: string): EqPreset | null {
  return BUILTIN_PRESETS.find((p) => p.name === name) ?? null;
}
