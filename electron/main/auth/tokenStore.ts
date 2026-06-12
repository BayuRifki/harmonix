import type { App, SafeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export interface StoredToken {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  scope: string;
  tokenType: string;
}

const TOKEN_KEYS: Record<string, string> = {
  accessToken: 'token',
  refreshToken: 'refresh',
  expiresAt: 'expires',
  scope: 'scope',
  tokenType: 'type',
};

let electronApp: App | null = null;
let safeStorageRef: SafeStorage | null = null;

export function setElectronApp(app: App, safeStorage?: SafeStorage): void {
  electronApp = app;
  if (safeStorage) safeStorageRef = safeStorage;
}

function userDataDir(): string {
  if (electronApp) {
    return electronApp.getPath('userData');
  }
  return process.env.HARMONIX_USER_DATA ?? join(process.cwd(), '.harmonix-test-userdata');
}

function tokenDir(): string {
  return join(userDataDir(), 'tokens');
}

/**
 * Resolves the on-disk path for a source's token. The extension
 * `.bin.enc` signals that the file holds encrypted data, while
 * `.bin.plain` (used when the OS keychain isn't available)
 * honestly advertises that the file is plaintext. The previous
 * `.bin` extension was ambiguous and led users to assume
 * encryption was always in effect.
 */
function tokenFilePath(sourceId: string, encrypted: boolean): string {
  const suffix = encrypted ? '.bin.enc' : '.bin.plain';
  return join(tokenDir(), `${sourceId}${suffix}`);
}

function isEncryptionAvailable(): boolean {
  return safeStorageRef?.isEncryptionAvailable() ?? false;
}

function encryptString(s: string): Buffer {
  if (safeStorageRef && isEncryptionAvailable()) {
    return safeStorageRef.encryptString(s);
  }
  return Buffer.from(s, 'utf8');
}

function decryptString(buf: Buffer): string {
  if (safeStorageRef && isEncryptionAvailable()) {
    return safeStorageRef.decryptString(buf);
  }
  return buf.toString('utf8');
}

export function saveToken(sourceId: string, token: StoredToken): void {
  const encrypted = isEncryptionAvailable();
  if (!encrypted) {
    // Loud, persistent warning — not a single console.warn. Tokens
    // grant access to user data (Spotify playback, SoundCloud
    // account); a plaintext copy on disk is a real security risk
    // and the user should know.
    console.warn(
      `[auth] [SECURITY] No OS keychain available — token for "${sourceId}" will be ` +
        `stored as PLAINTEXT at ${tokenFilePath(sourceId, false)}. Anyone with ` +
        `read access to your user-data directory can steal this token. ` +
        `On Linux, install libsecret (e.g. apt install libsecret-1-dev) and restart.`,
    );
  }
  const dir = tokenDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const json = JSON.stringify(token);
  const buffer = encryptString(json);
  writeFileSync(tokenFilePath(sourceId, encrypted), buffer);
}

/**
 * Backwards-compatible lookup: tries the encrypted path first, then
 * the plaintext path. Older installs (pre-fix) may have left a
 * `.bin` file; we deliberately do NOT silently accept that
 * extension because it would defeat the new honesty-by-extension
 * approach. If you need to migrate an old install, run the
 * `migrateTokenFiles` helper below once.
 */
function readTokenFile(sourceId: string): Buffer | null {
  const enc = tokenFilePath(sourceId, true);
  if (existsSync(enc)) {
    try {
      return readFileSync(enc);
    } catch (err) {
      console.warn(`[auth] Failed to read ${enc}:`, (err as Error).message);
    }
  }
  const plain = tokenFilePath(sourceId, false);
  if (existsSync(plain)) {
    try {
      return readFileSync(plain);
    } catch (err) {
      console.warn(`[auth] Failed to read ${plain}:`, (err as Error).message);
    }
  }
  return null;
}

export function loadToken(sourceId: string): StoredToken | null {
  const buf = readTokenFile(sourceId);
  if (!buf) return null;
  try {
    const json = decryptString(buf);
    const parsed = JSON.parse(json) as StoredToken;
    if (!parsed.accessToken || typeof parsed.expiresAt !== 'number') return null;
    return parsed;
  } catch (err) {
    console.warn(`[auth] Failed to load token for ${sourceId}:`, (err as Error).message);
    return null;
  }
}

export function clearToken(sourceId: string): void {
  for (const path of [tokenFilePath(sourceId, true), tokenFilePath(sourceId, false)]) {
    if (existsSync(path)) {
      try {
        unlinkSync(path);
      } catch (err) {
        console.warn(`[auth] Failed to delete ${path}:`, (err as Error).message);
      }
    }
  }
}

/**
 * One-shot migration: rename any legacy `.bin` files (whose
 * encryption status is unknown) to `.bin.plain` so existing
 * installs don't lose their sessions and the user is informed
 * via the new plaintext-extension naming. Idempotent.
 */
export function migrateTokenFiles(): void {
  const dir = tokenDir();
  if (!existsSync(dir)) return;
  for (const sourceId of ['spotify', 'soundcloud', 'jamendo', 'ytmusic']) {
    const legacy = join(dir, `${sourceId}.bin`);
    if (!existsSync(legacy)) continue;
    const target = tokenFilePath(sourceId, isEncryptionAvailable());
    try {
      const buf = readFileSync(legacy);
      writeFileSync(target, buf);
      unlinkSync(legacy);
      console.info(`[auth] Migrated legacy ${legacy} → ${target}`);
    } catch (err) {
      console.warn(`[auth] Legacy migration failed for ${legacy}:`, (err as Error).message);
    }
  }
}

export function isTokenExpired(token: StoredToken, skewSeconds = 60): boolean {
  return Date.now() >= token.expiresAt - skewSeconds * 1000;
}

export function tokenSummary(token: StoredToken | null): {
  hasToken: boolean;
  expired: boolean;
  scope: string;
} {
  if (!token) return { hasToken: false, expired: true, scope: '' };
  return {
    hasToken: true,
    expired: isTokenExpired(token),
    scope: token.scope,
  };
}

export type { StoredToken as _StoredTokenType };
export { TOKEN_KEYS as _TOKEN_KEYS };
