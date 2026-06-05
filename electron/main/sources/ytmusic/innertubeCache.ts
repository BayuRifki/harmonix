import type { Innertube } from 'youtubei.js';

type InnertubeLike = InstanceType<typeof Innertube>;

interface Cached {
  instance: InnertubeLike;
  refCount: number;
  lastUsed: number;
  creating?: Promise<InnertubeLike>;
}

let cache: Cached | null = null;
const IDLE_TTL_MS = 5 * 60 * 1000;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function clearIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function scheduleIdleReset(): void {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    if (cache && cache.refCount === 0) {
      void disposeInnertubeCache('idle-ttl');
    }
  }, IDLE_TTL_MS);
}

export async function getInnertubeShared(): Promise<InnertubeLike> {
  if (cache?.instance) {
    cache.refCount += 1;
    cache.lastUsed = Date.now();
    return cache.instance;
  }
  if (cache?.creating) {
    cache.refCount += 1;
    return cache.creating as Promise<InnertubeLike>;
  }
  cache = {
    instance: null as unknown as InnertubeLike,
    refCount: 1,
    lastUsed: Date.now(),
    creating: (async () => {
      const mod = await import('youtubei.js');
      const inst = await mod.Innertube.create({
        generate_session_locally: true,
      });
      if (!cache) throw new Error('Cache cleared during create');
      cache.instance = inst;
      cache.creating = undefined;
      scheduleIdleReset();
      return inst;
    })(),
  };
  return cache.creating as Promise<InnertubeLike>;
}

export function releaseInnertube(): void {
  if (!cache) return;
  cache.refCount = Math.max(0, cache.refCount - 1);
  if (cache.refCount === 0) {
    scheduleIdleReset();
  }
}

export async function disposeInnertubeCache(reason: string): Promise<void> {
  clearIdleTimer();
  if (!cache) return;
  if (cache.refCount > 0) {
    console.warn(`[innertube] Dispose requested (${reason}) but refCount=${cache.refCount}, deferring`);
    return;
  }
  const inst = cache.instance;
  cache = null;
  if (inst && typeof (inst as { session?: { signOut?: () => Promise<void> } }).session?.signOut === 'function') {
    try {
      await (inst as { session: { signOut: () => Promise<void> } }).session.signOut();
    } catch {
      // ignore
    }
  }
}

export function getInnertubeCacheStats(): { refCount: number; lastUsed: number | null; ageMs: number | null } {
  if (!cache) return { refCount: 0, lastUsed: null, ageMs: null };
  return {
    refCount: cache.refCount,
    lastUsed: cache.lastUsed,
    ageMs: Date.now() - cache.lastUsed,
  };
}
