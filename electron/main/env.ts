import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Minimal `.env` loader for the Electron main process.
 *
 * The main process runs as a child of electron-vite and does not auto-load
 * `.env` files. This loader parses `<project-root>/.env` and sets any
 * variables that are not already defined in `process.env`, so user-supplied
 * shell env always wins.
 *
 * Intentionally zero-dependency. Supports `KEY=value` and `KEY="value"` lines,
 * strips trailing inline comments after `#`, ignores blank lines and `#`
 * comments. Quote values may contain spaces.
 */
const ENV_FILENAME = '.env';

function findProjectRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, ENV_FILENAME)) || existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function stripInlineComment(value: string): string {
  const inDouble = value[0] === '"' && value[value.length - 1] === '"';
  const inSingle = value[0] === "'" && value[value.length - 1] === "'";
  if (inDouble || inSingle) {
    return value.slice(1, -1);
  }
  const hashIdx = value.indexOf(' #');
  if (hashIdx >= 0) return value.slice(0, hashIdx).trimEnd();
  return value.trim();
}

export function loadDotEnv(): void {
  const root = findProjectRoot(__dirname);
  const envPath = join(root, ENV_FILENAME);
  if (!existsSync(envPath)) return;

  let raw: string;
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    return;
  }

  let loaded = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    const value = stripInlineComment(trimmed.slice(eq + 1));
    process.env[key] = value;
    loaded++;
  }

  if (loaded > 0) {
    console.info(`[env] loaded ${loaded} variable(s) from ${envPath}`);
  }
}

loadDotEnv();
