import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * The Harmonix NSIS installer ships with a broken-image placeholder in
 * the Windows Start Menu / taskbar because `win.signAndEditExecutable:
 * false` in `electron-builder.yml` skips the rcedit step that embeds
 * `resources/icon.ico` into the built `.exe`. The result: the user
 * installs the app and the Start Menu shows a generic broken-image
 * icon next to "Harmonix" instead of the audio-waveform logo.
 *
 * The fix: run `rcedit` to embed the icon after electron-builder
 * finishes packing the unpacked output. This test guards the
 * regression by extracting the icon Windows actually displays for
 * the built `.exe` (via `System.Drawing.Icon.ExtractAssociatedIcon`,
 * the same API Explorer uses) and asserting it matches the
 * `resources/icon.ico` source.
 */

const REPO_ROOT = resolve(__dirname, '..', '..');
const EXE_PATH = join(REPO_ROOT, 'release', '0.1.0', 'win-unpacked', 'Harmonix.exe');
const ICON_PATH = join(REPO_ROOT, 'resources', 'icon.ico');

function extractIconAsPng(sourceExeOrIco: string, outPng: string): void {
  const escapedSource = sourceExeOrIco.replace(/'/g, "''");
  const escapedOut = outPng.replace(/'/g, "''");
  const script =
    `Add-Type -AssemblyName System.Drawing; ` +
    `$i = [System.Drawing.Icon]::ExtractAssociatedIcon('${escapedSource}'); ` +
    `$b = $i.ToBitmap(); ` +
    `$b.Save('${escapedOut}', [System.Drawing.Imaging.ImageFormat]::Png);`;
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    stdio: 'pipe',
    windowsHide: true,
  });
}

function sha256OfFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const canRun = process.platform === 'win32' && existsSync(EXE_PATH) && existsSync(ICON_PATH);
const skipReason = !canRun
  ? `requires Windows + built .exe at ${EXE_PATH} + source icon at ${ICON_PATH}`
  : false;

describe.skipIf(skipReason)('Built Windows .exe icon', () => {
  it('matches resources/icon.ico (no React / Electron default)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'harmonix-icon-'));
    try {
      const exeIcon = join(tmp, 'exe-icon.png');
      const srcIcon = join(tmp, 'src-icon.png');
      extractIconAsPng(EXE_PATH, exeIcon);
      extractIconAsPng(ICON_PATH, srcIcon);
      const exeHash = sha256OfFile(exeIcon);
      const srcHash = sha256OfFile(srcIcon);
      expect(
        exeHash,
        `Expected the .exe's icon to match ${ICON_PATH} ` +
          `(sha256=${srcHash}), but the built .exe has a different icon ` +
          `(sha256=${exeHash}). This means the icon was never embedded — ` +
          `electron-builder's rcedit step is being skipped. ` +
          `Re-enable icon embedding in electron-builder.yml.`,
      ).toBe(srcHash);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
