import { useEffect, useState } from 'react';
import { useUiStore, type VisualizerQuality } from '@/stores/uiStore';

const LOW_CORE_THRESHOLD = 4;

let cached: 'high' | 'low' | null = null;

export function getVisualizerTier(): 'high' | 'low' {
  if (cached !== null) return cached;
  if (typeof navigator === 'undefined') {
    cached = 'high';
    return cached;
  }
  const cores = navigator.hardwareConcurrency ?? 8;
  cached = cores < LOW_CORE_THRESHOLD ? 'low' : 'high';
  return cached;
}

export interface EffectiveVisualizerQuality {
  quality: 'high' | 'low' | 'off';
  source: VisualizerQuality;
}

export function useEffectiveVisualizerQuality(
  explicit?: VisualizerQuality,
): EffectiveVisualizerQuality {
  const stored = useUiStore((s) => s.visualizerQuality);
  const [tier, setTier] = useState<'high' | 'low'>(() => getVisualizerTier());
  useEffect(() => {
    setTier(getVisualizerTier());
  }, []);
  const source = explicit ?? stored;
  if (source === 'off') return { quality: 'off', source };
  if (source === 'high') return { quality: 'high', source };
  if (source === 'low') return { quality: 'low', source };
  return { quality: tier, source: 'auto' };
}
