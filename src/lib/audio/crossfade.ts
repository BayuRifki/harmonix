import { audioEngine } from './engine';

export interface CrossfadeConfig {
  enabled: boolean;
  durationMs: number;
}

const DEFAULT_DURATION_MS = 5000;
const MIN_DURATION_MS = 0;
const MAX_DURATION_MS = 12000;
const STORAGE_KEY = 'harmonix.crossfade';

function clampDuration(ms: number): number {
  return Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, ms));
}

function loadConfig(): CrossfadeConfig {
  if (typeof localStorage === 'undefined') {
    return { enabled: false, durationMs: DEFAULT_DURATION_MS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, durationMs: DEFAULT_DURATION_MS };
    const parsed = JSON.parse(raw) as Partial<CrossfadeConfig>;
    return {
      enabled: parsed.enabled === true,
      durationMs: clampDuration(
        typeof parsed.durationMs === 'number' ? parsed.durationMs : DEFAULT_DURATION_MS,
      ),
    };
  } catch {
    return { enabled: false, durationMs: DEFAULT_DURATION_MS };
  }
}

function saveConfig(cfg: CrossfadeConfig): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

let currentConfig: CrossfadeConfig = loadConfig();

export function getCrossfadeConfig(): CrossfadeConfig {
  return { ...currentConfig };
}

export function setCrossfadeConfig(cfg: Partial<CrossfadeConfig>): CrossfadeConfig {
  currentConfig = {
    enabled: cfg.enabled ?? currentConfig.enabled,
    durationMs: clampDuration(cfg.durationMs ?? currentConfig.durationMs),
  };
  saveConfig(currentConfig);
  return getCrossfadeConfig();
}

export async function crossfadeTo(loadPromise: Promise<unknown>): Promise<void> {
  const { enabled, durationMs } = currentConfig;
  if (!enabled || durationMs <= 0) {
    await loadPromise;
    return;
  }
  const ctx = audioEngine.getGainNode()?.context as AudioContext | undefined;
  const gain = audioEngine.getGainNode();
  if (!ctx || !gain) {
    await loadPromise;
    return;
  }

  const fadeOutMs = Math.min(durationMs, 8000);
  const fadeInMs = Math.min(durationMs, 8000);
  const startGain = gain.gain.value;
  const now = ctx.currentTime;
  try {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(startGain, now);
    gain.gain.linearRampToValueAtTime(0, now + fadeOutMs / 1000);
  } catch {
    // ignore
  }

  await loadPromise;

  try {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(startGain, t + fadeInMs / 1000);
  } catch {
    // ignore
  }
}

export const CROSSFADE_LIMITS = { MIN_DURATION_MS, MAX_DURATION_MS, DEFAULT_DURATION_MS };
