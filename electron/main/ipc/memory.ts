import { ipcMain, app } from 'electron';
import { getInnertubeCacheStats } from '../sources/ytmusic/innertubeCache';

export interface MemoryStats {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  pid: number;
  appVersion: string;
  platform: NodeJS.Platform;
  innertube: {
    refCount: number;
    ageMs: number | null;
  };
  uptimeSec: number;
}

function getMemoryStats(): MemoryStats {
  const mu = process.memoryUsage();
  return {
    rssMb: Math.round(mu.rss / 1024 / 1024),
    heapUsedMb: Math.round(mu.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(mu.heapTotal / 1024 / 1024),
    externalMb: Math.round(mu.external / 1024 / 1024),
    pid: process.pid,
    appVersion: app.getVersion(),
    platform: process.platform,
    innertube: {
      refCount: getInnertubeCacheStats().refCount,
      ageMs: getInnertubeCacheStats().ageMs,
    },
    uptimeSec: Math.round(process.uptime()),
  };
}

export function registerMemoryHandlers(): void {
  ipcMain.handle('mem:stats', (): MemoryStats => getMemoryStats());

  ipcMain.handle('mem:gc', async (): Promise<{ ok: true; before: MemoryStats; after: MemoryStats }> => {
    const before = getMemoryStats();
    if (global.gc) {
      try {
        global.gc();
      } catch {
        // ignore
      }
    }
    await new Promise((r) => setTimeout(r, 50));
    const after = getMemoryStats();
    return { ok: true, before, after };
  });
}
