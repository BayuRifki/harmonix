import { promises as fs, type Stats } from 'node:fs';
import { join, extname, basename } from 'node:path';

export const SUPPORTED_EXTENSIONS = new Set([
  '.mp3',
  '.m4a',
  '.aac',
  '.flac',
  '.ogg',
  '.opus',
  '.wav',
  '.ape',
  '.wma',
  '.aiff',
  '.aif',
  '.mka',
]);

export function isAudioFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export interface ScannedFile {
  path: string;
  size: number;
  mtimeMs: number;
}

export interface ScanOptions {
  recursive?: boolean;
  signal?: AbortSignal;
  onProgress?: (filesFound: number, currentPath: string) => void;
}

export async function scanFolder(
  folder: string,
  options: ScanOptions = {},
): Promise<ScannedFile[]> {
  const { recursive = true, signal, onProgress } = options;
  const results: ScannedFile[] = [];
  let count = 0;

  async function walk(dir: string): Promise<void> {
    if (signal?.aborted) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.warn(`[scanner] Cannot read ${dir}:`, (err as Error).message);
      return;
    }
    for (const entry of entries) {
      if (signal?.aborted) return;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive && !entry.name.startsWith('.')) {
          await walk(fullPath);
        }
      } else if (entry.isFile() && isAudioFile(entry.name)) {
        try {
          const stat: Stats = await fs.stat(fullPath);
          results.push({
            path: fullPath,
            size: stat.size,
            mtimeMs: stat.mtimeMs,
          });
          count += 1;
          onProgress?.(count, fullPath);
        } catch (err) {
          console.warn(`[scanner] Cannot stat ${fullPath}:`, (err as Error).message);
        }
      }
    }
  }

  await walk(folder);
  return results;
}

export function guessTitleFromFilename(filePath: string): string {
  return basename(filePath, extname(filePath));
}
