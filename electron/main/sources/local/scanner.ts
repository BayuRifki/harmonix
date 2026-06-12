import { promises as fs, type Stats } from 'node:fs';
import { realpath } from 'node:fs/promises';
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
  /**
   * Maximum number of unique directories to descend into before
   * bailing out. Acts as a hard backstop against pathological filesystems
   * (deeply nested bind mounts, unionfs, etc.) where even the
   * realpath cycle detector would let us walk indefinitely.
   * Default: 50_000.
   */
  maxDirs?: number;
}

export async function scanFolder(
  folder: string,
  options: ScanOptions = {},
): Promise<ScannedFile[]> {
  const { recursive = true, signal, onProgress, maxDirs = 50_000 } = options;
  const results: ScannedFile[] = [];
  let count = 0;

  // Track real paths we've already descended into. This catches
  // self-referencing symlinks (`Music -> Music`) and cycles created
  // by bind mounts (A -> B, B -> A). Without it, a single symlink
  // would crash the scanner with `RangeError: Maximum call stack`.
  const visitedRealPaths = new Set<string>();

  async function walk(dir: string): Promise<void> {
    if (signal?.aborted) return;
    if (visitedRealPaths.size >= maxDirs) return;

    let realPath: string;
    try {
      realPath = await realpath(dir);
    } catch {
      // If realpath fails (broken symlink, permission denied),
      // fall back to the unresolved path so we still attempt the
      // readdir. The subsequent readdir will surface its own error.
      realPath = dir;
    }
    if (visitedRealPaths.has(realPath)) return;
    visitedRealPaths.add(realPath);

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
      try {
        if (entry.isDirectory()) {
          if (recursive && !entry.name.startsWith('.')) {
            await walk(fullPath);
          }
        } else if (entry.isFile() && isAudioFile(entry.name)) {
          const stat: Stats = await fs.stat(fullPath);
          results.push({
            path: fullPath,
            size: stat.size,
            mtimeMs: stat.mtimeMs,
          });
          count += 1;
          onProgress?.(count, fullPath);
        } else if (entry.isSymbolicLink() && recursive && !entry.name.startsWith('.')) {
          // isSymbolicLink() is true even when readdir() couldn't stat
          // the target. We descend if and only if the resolved target
          // is a directory; the realpath cycle guard above handles
          // loops. (Note: withFileTypes returns the lstat type, so a
          // symlink-to-file shows up as isSymbolicLink, isFile=false.)
          try {
            const targetStat = await fs.stat(fullPath);
            if (targetStat.isDirectory()) {
              await walk(fullPath);
            } else if (isAudioFile(entry.name)) {
              results.push({
                path: fullPath,
                size: targetStat.size,
                mtimeMs: targetStat.mtimeMs,
              });
              count += 1;
              onProgress?.(count, fullPath);
            }
          } catch (err) {
            console.warn(`[scanner] Cannot stat symlink ${fullPath}:`, (err as Error).message);
          }
        }
      } catch (err) {
        console.warn(`[scanner] Cannot process ${fullPath}:`, (err as Error).message);
      }
    }
  }

  await walk(folder);
  return results;
}

export function guessTitleFromFilename(filePath: string): string {
  return basename(filePath, extname(filePath));
}
