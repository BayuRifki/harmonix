import { describe, it, expect } from 'vitest';
import { getVisualizerTier } from '@/hooks/useVisualizerQuality';

describe('getVisualizerTier', () => {
  it('returns cached value on repeated calls', () => {
    const a = getVisualizerTier();
    const b = getVisualizerTier();
    expect(a).toBe(b);
  });
});
