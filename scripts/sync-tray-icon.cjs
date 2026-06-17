'use strict';

const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');

/**
 * Regenerate `resources/icon.png` from the largest *actually-square*
 * sub-image of `resources/icon.ico`, falling back to `resources/logo.png`
 * if every ICO sub-image is non-square.
 *
 * Why this exists
 * ---------------
 * The system-tray code (`electron/main/tray.ts`) loads
 * `resources/icon.png` and resizes it to 16x16 via
 * `nativeImage.resize(width, height)`. Electron's resize does NOT
 * preserve aspect ratio — a non-square source is stretched. The file
 * that shipped in M19 was 220x160, so the tray icon rendered
 * squished.
 *
 * `resources/icon.ico` already has 5 proper square sub-images
 * (16, 32, 48, 64, 128) but the 256x256 entry is a 220x160 PNG
 * stamped to 256x256 in the ICO directory (not a real resize — the
 * source asset was 220x160). So we can't blindly trust the ICO
 * directory dimensions; we parse the actual PNG header of each
 * sub-image and pick the largest one that is genuinely square.
 *
 * `resources/logo.png` (1254x1254, the full audio-waveform mark on
 * a transparent background) is the last-resort fallback.
 *
 * `tests/unit/iconAssets.test.ts` "is square" assertion guards the
 * regression.
 *
 * Run from the repo root:
 *   node scripts/sync-tray-icon.cjs
 */

const REPO_ROOT = resolve(__dirname, '..');
const ICO_PATH = join(REPO_ROOT, 'resources', 'icon.ico');
const LOGO_PATH = join(REPO_ROOT, 'resources', 'logo.png');
const PNG_PATH = join(REPO_ROOT, 'resources', 'icon.png');

function readIcoSubImages(icoPath) {
  const buf = readFileSync(icoPath);
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
    throw new Error(`${icoPath} is not an .ico file (bad ICONDIR magic)`);
  }
  const count = buf.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const off = 6 + i * 16;
    const w = buf[off] === 0 ? 256 : buf[off];
    const h = buf[off + 1] === 0 ? 256 : buf[off + 1];
    const bpp = buf.readUInt16LE(off + 6);
    const size = buf.readUInt32LE(off + 8);
    const dataOff = buf.readUInt32LE(off + 12);
    const head = buf.subarray(dataOff, dataOff + 4);
    const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e;
    let actualW = w;
    let actualH = h;
    if (isPng && buf.length >= dataOff + 24) {
      actualW = buf.readUInt32BE(dataOff + 16);
      actualH = buf.readUInt32BE(dataOff + 20);
    }
    entries.push({ width: w, height: h, actualW, actualH, bpp, size, dataOff, isPng });
  }
  return { buf, entries };
}

function pickLargestSquare(entries) {
  // Filter to PNG sub-images whose actual PNG dimensions are square.
  // Sort by the actual dimension descending so the largest square wins.
  return entries
    .filter((e) => e.isPng && e.actualW === e.actualH)
    .sort((a, b) => b.actualW - a.actualW)[0];
}

function main() {
  if (!existsSync(ICO_PATH)) {
    console.error(`[sync-tray-icon] ${ICO_PATH} not found`);
    process.exit(1);
  }
  const { buf, entries } = readIcoSubImages(ICO_PATH);
  const square = pickLargestSquare(entries);
  let source;
  let sourceNote;
  if (square) {
    source = buf.subarray(square.dataOff, square.dataOff + square.size);
    sourceNote = `icon.ico sub-image ${square.actualW}x${square.actualH} PNG (entry reports ${square.width}x${square.height})`;
  } else if (existsSync(LOGO_PATH)) {
    source = readFileSync(LOGO_PATH);
    sourceNote = `logo.png fallback (no square sub-image in icon.ico)`;
  } else {
    console.error(`[sync-tray-icon] no square sub-image in ${ICO_PATH} and ${LOGO_PATH} not found`);
    console.error('[sync-tray-icon] available sub-images:');
    for (const e of entries) {
      console.error(
        `  ${e.width}x${e.height} (dir) -> ${e.actualW}x${e.actualH} (actual), ${e.isPng ? 'PNG' : 'BMP'}`,
      );
    }
    process.exit(1);
  }
  writeFileSync(PNG_PATH, source);
  console.log(`[sync-tray-icon] Wrote ${source.length} bytes -> ${PNG_PATH} (${sourceNote})`);
}

if (require.main === module) {
  main();
}

module.exports = { readIcoSubImages, pickLargestSquare };
