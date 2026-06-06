import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCrossfadeConfig,
  setCrossfadeConfig,
  crossfadeTo,
  CROSSFADE_LIMITS,
} from '@/lib/audio/crossfade';

describe('crossfade', () => {
  beforeEach(() => {
    localStorage.clear();
    setCrossfadeConfig({ enabled: false, durationMs: CROSSFADE_LIMITS.DEFAULT_DURATION_MS });
  });

  it('exports sane limits', () => {
    expect(CROSSFADE_LIMITS.MIN_DURATION_MS).toBe(0);
    expect(CROSSFADE_LIMITS.MAX_DURATION_MS).toBeGreaterThan(0);
    expect(CROSSFADE_LIMITS.DEFAULT_DURATION_MS).toBeGreaterThan(0);
  });

  it('updates config', () => {
    const cfg = setCrossfadeConfig({ enabled: true, durationMs: 3000 });
    expect(cfg.enabled).toBe(true);
    expect(cfg.durationMs).toBe(3000);
    expect(getCrossfadeConfig().durationMs).toBe(3000);
  });

  it('clamps duration to limits', () => {
    setCrossfadeConfig({ durationMs: 999999 });
    expect(getCrossfadeConfig().durationMs).toBe(CROSSFADE_LIMITS.MAX_DURATION_MS);
    setCrossfadeConfig({ durationMs: -5 });
    expect(getCrossfadeConfig().durationMs).toBe(CROSSFADE_LIMITS.MIN_DURATION_MS);
  });

  it('persists to localStorage', () => {
    setCrossfadeConfig({ enabled: true, durationMs: 2500 });
    const raw = localStorage.getItem('harmonix.crossfade');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ enabled: true, durationMs: 2500 });
  });

  it('crossfadeTo with disabled awaits load directly', async () => {
    setCrossfadeConfig({ enabled: false });
    const load = vi.fn().mockResolvedValue(undefined);
    await crossfadeTo(load());
    expect(load).toHaveBeenCalled();
  });

  it('crossfadeTo with enabled also awaits load', async () => {
    setCrossfadeConfig({ enabled: true, durationMs: 100 });
    const load = vi.fn().mockResolvedValue(undefined);
    await crossfadeTo(load());
    expect(load).toHaveBeenCalled();
  });
});
