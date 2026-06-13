import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regression guard: the default `SPOTIFY_REDIRECT_URI` was
 * previously `http://127.0.0.1:8888/callback` and the bug
 * surfaced in production as "Missing code or state" callbacks
 * (Spotify's exact-string matching on redirect_uri rejects
 * any character-level mismatch). The fix: switch the default
 * to the path-less `http://127.0.0.1:8888`.
 *
 * But there are *multiple* places in `electron/main/` that
 * hold this default (the source registration site + the IPC
 * handler default), and it's easy to update one and miss the
 * other. This test grep-greps every .ts file under
 * `electron/main/` for the old `…/callback` default and
 * fails if any are still using it. New default must be the
 * path-less form.
 */
const MAIN_ROOT = join(__dirname, '..', '..', 'electron', 'main');
const OLD_DEFAULT = 'http://127.0.0.1:8888/callback';
const NEW_DEFAULT = 'http://127.0.0.1:8888';

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('Default SPOTIFY_REDIRECT_URI is path-less everywhere in electron/main/', () => {
  const files = collectFiles(MAIN_ROOT);

  it(`no source file under electron/main/ uses the old "${OLD_DEFAULT}" default`, () => {
    const offenders: Array<{ file: string; line: number; text: string }> = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(OLD_DEFAULT)) {
          offenders.push({ file, line: i + 1, text: lines[i].trim() });
        }
      }
    }
    if (offenders.length > 0) {
      const formatted = offenders.map((o) => `  ${o.file}:${o.line}\n    ${o.text}`).join('\n');
      throw new Error(
        `Found ${offenders.length} file(s) still using the old ` +
          `"${OLD_DEFAULT}" default. Update them to "${NEW_DEFAULT}" ` +
          `(path-less) to avoid Spotify redirect_uri exact-string ` +
          `mismatches that produce "Missing code or state" in the ` +
          `browser. Offenders:\n${formatted}`,
      );
    }
    // sanity: the loader must be looking at the right directory
    expect(files.length).toBeGreaterThan(5);
  });
});
