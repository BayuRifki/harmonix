import { spawn } from 'node:child_process';
import { promises as dns } from 'node:dns';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { App } from 'electron';
import { classifyYtDlpError, YtMusicError } from './errors';

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
  requiresProxy?: boolean;
}

const PREFLIGHT_HOST = 'music.youtube.com';
const RAW_SNIPPET_MAX = 200;

export type LookupFn = (host: string) => Promise<{ address: string; family: number }>;

export async function preflightWith(lookup: LookupFn): Promise<void> {
  try {
    await lookup(PREFLIGHT_HOST);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? '';
    const reason =
      code === 'ENOTFOUND' || /getaddrinfo|ENOTFOUND/i.test((err as Error).message)
        ? 'DNS lookup failed'
        : code === 'ETIMEDOUT'
          ? 'DNS timed out'
          : 'DNS error';
    throw new YtMusicError({
      code: 'NETWORK_DNS',
      message: `Can't reach YouTube Music — ${reason}.`,
      hint: 'Check your internet connection. If DNS keeps failing, try a public resolver (1.1.1.1, 8.8.8.8) or set HTTPS_PROXY if you are behind a firewall.',
      retryable: true,
      raw: (err as Error).message.slice(0, RAW_SNIPPET_MAX),
    });
  }
}

export async function preflightYtMusicNetwork(): Promise<void> {
  return preflightWith((host) => dns.lookup(host));
}

export async function resolveStreamUrl(
  videoId: string,
  options: StreamOptions = {},
): Promise<ResolvedStream> {
  const ytDlp = await findYtDlp();
  if (!ytDlp.available) {
    throw new YtMusicError({
      code: 'YTDLP_MISSING',
      message: 'yt-dlp is not installed.',
      hint: 'Install it from https://github.com/yt-dlp/yt-dlp and restart, or set the YT_DLP_PATH environment variable.',
      retryable: false,
      raw: ytDlp.error ?? '',
    });
  }

  await preflightYtMusicNetwork();

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
      reject(
        new YtMusicError({
          code: 'NETWORK_TIMEOUT',
          message: 'yt-dlp timed out after 30s.',
          hint: 'Network is slow or blocked. Try again, or configure HTTPS_PROXY if you are behind a corporate firewall.',
          retryable: true,
          raw: stderr.slice(0, 500),
        }),
      );
    }, 30_000);
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(
        new YtMusicError({
          code: 'YTDLP_SPAWN',
          message: 'Failed to start yt-dlp.',
          hint: 'Check that yt-dlp is executable and not blocked by antivirus.',
          retryable: true,
          raw: err.message,
        }),
      );
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const parts = classifyYtDlpError(stderr, code);
        reject(new YtMusicError(parts));
        return;
      }
      const url = stdout.trim().split('\n').filter(Boolean).pop() ?? '';
      if (!url) {
        reject(
          new YtMusicError({
            code: 'YTDLP_NO_OUTPUT',
            message: 'yt-dlp returned no playable URL.',
            hint: 'Update yt-dlp to the latest release and try again.',
            retryable: true,
            raw: stderr.slice(0, 500),
          }),
        );
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
        // yt-dlp streams come from googlevideo.com which doesn't send
        // CORS headers. The audio element can play the URL directly,
        // but the moment we route it through MediaElementSource for
        // EQ/gain processing the audio is CORS-tainted and goes
        // silent. The main process proxies the URL through the
        // `harmonix-media` custom protocol with explicit
        // Access-Control-Allow-Origin so the source node can process it.
        requiresProxy: true,
      });
    });
  });
}

export interface YtDlpUpdateResult {
  ok: boolean;
  updated: boolean;
  oldVersion: string | null;
  newVersion: string | null;
  message: string;
}

function readVersion(bin: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(bin, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      const timer = setTimeout(() => {
        proc.kill();
        resolve(null);
      }, 5_000);
      proc.stdout.on('data', (chunk) => {
        out += chunk.toString('utf8');
      });
      proc.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve(code === 0 && out.trim() ? out.trim() : null);
      });
    } catch {
      resolve(null);
    }
  });
}

export function resetYtDlpCache(): void {
  cachedPath = null;
}

export async function checkAndUpdateYtDlp(
  findFn: () => Promise<YtDlpInfo> = findYtDlp,
): Promise<YtDlpUpdateResult> {
  const info = await findFn();
  if (!info.available) {
    return {
      ok: false,
      updated: false,
      oldVersion: null,
      newVersion: null,
      message: info.error ?? 'yt-dlp not found',
    };
  }

  const before = info.version ?? (await readVersion(info.path));

  return new Promise((resolve) => {
    try {
      const proc = spawn(info.path, ['-U'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill();
        resolve({
          ok: false,
          updated: false,
          oldVersion: before,
          newVersion: null,
          message: 'yt-dlp -U timed out after 60s',
        });
      }, 60_000);
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8');
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          ok: false,
          updated: false,
          oldVersion: before,
          newVersion: null,
          message: err.message,
        });
      });
      proc.on('close', async (code) => {
        clearTimeout(timer);
        const after = await readVersion(info.path);
        const updated = before !== null && after !== null && before !== after;
        if (updated) {
          cachedPath = null;
        }
        if (code === 0) {
          resolve({
            ok: true,
            updated,
            oldVersion: before,
            newVersion: after,
            message: updated
              ? `Updated yt-dlp ${before} → ${after}. Commit the new resources/yt-dlp.exe to share with the team.`
              : `yt-dlp is up to date (${after ?? 'unknown'}).`,
          });
          return;
        }
        resolve({
          ok: false,
          updated: false,
          oldVersion: before,
          newVersion: after,
          message: `yt-dlp -U exited with code ${code}: ${stderr.slice(0, 300)}`,
        });
      });
    } catch (err) {
      resolve({
        ok: false,
        updated: false,
        oldVersion: before,
        newVersion: null,
        message: (err as Error).message,
      });
    }
  });
}
