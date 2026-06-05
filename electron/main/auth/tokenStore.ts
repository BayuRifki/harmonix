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

function tokenFilePath(sourceId: string): string {
  return join(tokenDir(), `${sourceId}.bin`);
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
  if (!isEncryptionAvailable()) {
    console.warn(`[auth] Encryption not available, storing token in plaintext for ${sourceId}`);
  }
  const dir = tokenDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const json = JSON.stringify(token);
  const buffer = encryptString(json);
  writeFileSync(tokenFilePath(sourceId), buffer);
}

export function loadToken(sourceId: string): StoredToken | null {
  const path = tokenFilePath(sourceId);
  if (!existsSync(path)) return null;
  try {
    const buffer = readFileSync(path);
    const json = decryptString(buffer);
    const parsed = JSON.parse(json) as StoredToken;
    if (!parsed.accessToken || typeof parsed.expiresAt !== 'number') return null;
    return parsed;
  } catch (err) {
    console.warn(`[auth] Failed to load token for ${sourceId}:`, (err as Error).message);
    return null;
  }
}

export function clearToken(sourceId: string): void {
  const path = tokenFilePath(sourceId);
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch (err) {
      console.warn(`[auth] Failed to delete token for ${sourceId}:`, (err as Error).message);
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
