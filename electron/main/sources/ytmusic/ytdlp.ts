import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { App } from 'electron';

export interface YtDlpInfo {
  path: string;
  version: string | null;
  available: boolean;
  error?: string;
}

let cachedPath: string | null = null;
let electronApp: App | null = null;

export function setElectronAppForYtDlp(app: App): void {
  electronApp = app;
}

function candidates(): string[] {
  const appPath = electronApp ? electronApp.getAppPath() : process.cwd();
  return [
    process.env.YT_DLP_PATH ?? '',
    join(appPath, 'resources', 'yt-dlp'),
    join(appPath, 'resources', 'yt-dlp.exe'),
    join(process.resourcesPath ?? '', 'yt-dlp'),
    join(process.resourcesPath ?? '', 'yt-dlp.exe'),
    'yt-dlp',
    'yt-dlp.exe',
  ].filter(Boolean);
}

export async function findYtDlp(): Promise<YtDlpInfo> {
  if (cachedPath) {
    return { path: cachedPath, version: null, available: true };
  }
  for (const candidate of candidates()) {
    if (candidate.includes('/') || candidate.includes('\\') || candidate.includes('.')) {
      if (existsSync(candidate)) {
        cachedPath = candidate;
        return { path: candidate, version: null, available: true };
      }
    } else {
      const version = await checkVersion(candidate);
      if (version) {
        cachedPath = candidate;
        return { path: candidate, version, available: true };
      }
    }
  }
  return {
    path: '',
    version: null,
    available: false,
    error:
      'yt-dlp not found. Install it (https://github.com/yt-dlp/yt-dlp) and ensure it is on PATH, or set YT_DLP_PATH.',
  };
}

function checkVersion(bin: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(bin, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', (chunk) => {
        out += chunk.toString('utf8');
      });
      const timer = setTimeout(() => {
        proc.kill();
        resolve(null);
      }, 5000);
      proc.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && out.trim()) {
          resolve(out.trim());
        } else {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

export interface StreamOptions {
  format?: string;
  maxHeight?: number;
  audioOnly?: boolean;
}

export interface ResolvedStream {
  url: string;
  protocol: 'http' | 'm3u8' | 'youtube';
  expiresAt: number;
  format: string;
  contentLength?: number;
}

export async function resolveStreamUrl(
  videoId: string,
  options: StreamOptions = {},
): Promise<ResolvedStream> {
  const ytDlp = await findYtDlp();
  if (!ytDlp.available) {
    throw new Error(ytDlp.error ?? 'yt-dlp not available');
  }
  const videoUrl = `https://music.youtube.com/watch?v=${videoId}`;
  const args = [
    '-g',
    '-f',
    options.format ?? (options.audioOnly ? 'bestaudio/best' : 'best[height<=?1080]'),
    '--no-warnings',
    '--no-playlist',
    videoUrl,
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn(ytDlp.path, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('yt-dlp timed out (30s)'));
    }, 30_000);
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`yt-dlp spawn failed: ${err.message}`));
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      const url = stdout.trim().split('\n').filter(Boolean).pop() ?? '';
      if (!url) {
        reject(new Error(`yt-dlp returned no URL. stderr: ${stderr.slice(0, 500)}`));
        return;
      }
      const protocol: ResolvedStream['protocol'] = url.includes('.m3u8')
        ? 'm3u8'
        : url.includes('youtube.com') || url.includes('googlevideo.com')
          ? 'youtube'
          : 'http';
      resolve({
        url,
        protocol,
        expiresAt: Date.now() + 6 * 60 * 60 * 1000,
        format: options.format ?? 'best',
      });
    });
  });
}
