import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * `resources/icon.png` is loaded by the system-tray code
 * (`electron/main/tray.ts`) and resized to 16x16. If the source image
 * isn't square, Electron's `nativeImage.resize()` stretches it
 * (it does NOT preserve aspect ratio), so the tray icon looks
 * squished.
 *
 * The 220x160 file that shipped with M19 was the symptom — Windows
 * Explorer, the NSIS installer, and the in-app artwork all use the
 * square `resources/icon.ico` (which has 16/32/48/64/128/256
 * sub-images, all square) so they look correct, but the tray was
 * the lone outlier.
 *
 * Fix: replace the file with the 256x256 sub-image extracted from
 * `resources/icon.ico` (run `scripts/sync-tray-icon.cjs` to
 * regenerate). The test below guards the regression.
 */

const REPO_ROOT = resolve(__dirname, '..', '..');
const ICON_PNG = join(REPO_ROOT, 'resources', 'icon.png');

/** Reads the IHDR width/height from a PNG file. Throws if not a valid PNG. */
function pngDimensions(filePath: string): { width: number; height: number } {
  const buf = readFileSync(filePath);
  // PNG signature is 8 bytes; IHDR chunk starts at byte 8 with
  // 4-byte length, 4-byte type 'IHDR', then 4-byte width,
  // 4-byte height (all big-endian).
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error(`${filePath} is not a valid PNG (bad signature)`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe('resources/icon.png', () => {
  it.skipIf(!existsSync(ICON_PNG))('exists', () => {
    expect(existsSync(ICON_PNG)).toBe(true);
  });

  it.skipIf(!existsSync(ICON_PNG))('is square (required by tray.ts resize)', () => {
    const { width, height } = pngDimensions(ICON_PNG);
    expect(
      width,
      `icon.png is ${width}x${height} but the tray resizes to 16x16 ` +
        `without preserving aspect ratio, so a non-square source renders ` +
        `as a squished icon. Regenerate with: node scripts/sync-tray-icon.cjs`,
    ).toBe(height);
  });

  it.skipIf(!existsSync(ICON_PNG))('is at least 32x32 (the minimum tray size)', () => {
    const { width, height } = pngDimensions(ICON_PNG);
    expect(
      width,
      `icon.png is only ${width}x${height}; tray resizes to 16x16 so ` +
        `downscaling from <32 wastes detail. Regenerate from icon.ico.`,
    ).toBeGreaterThanOrEqual(32);
    expect(height).toBeGreaterThanOrEqual(32);
  });
});
