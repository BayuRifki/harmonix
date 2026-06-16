'use strict';

/**
 * Embed `resources/icon.ico` into the built Windows `.exe` so the
 * Start Menu, taskbar pinned shortcut, and Windows Explorer all
 * show the Harmonix logo (the audio-waveform mark) instead of the
 * generic broken-image placeholder that Electron ships by default.
 *
 * Why this hook exists
 * --------------------
 * `win.signAndEditExecutable: false` in `electron-builder.yml` is
 * set to work around a Windows-only failure in the upstream
 * `winCodeSign` package: its bundled 7za extractor fails with
 * "Cannot create symbolic link" when trying to recreate the darwin
 * dylib symlinks, unless the user runs as admin or has Developer
 * Mode enabled. Skipping `signAndEditExecutable` solves the build
 * abort but also skips the `rcedit` step that embeds the icon into
 * the built `.exe`. Without that step, the installed app shows a
 * broken-image icon in the Start Menu.
 *
 * We don't ship a code-signing certificate, so we only need the
 * icon-embedding half of what `winCodeSign` does. This hook
 * re-implements that half by calling the `rcedit` npm package
 * directly. Re-enable `signAndEditExecutable: true` (and add
 * `CSC_LINK` / `CSC_KEY_PASSWORD`) once a code-signing certificate
 * is available, and this hook can be removed.
 *
 * Registered via the `afterPack` hook in `electron-builder.yml`.
 * electron-builder invokes the hook after it finishes packing the
 * unpacked output dir. We no-op on non-Windows because macOS uses
 * `.icns` and Linux uses `.png`/desktop-entry files for icons.
 *
 * Module-loading note
 * -------------------
 * The script is a `.cjs` file (electron-builder loads afterPack
 * hooks via `require()`), but the actual `rcedit`, `node:fs`, and
 * `node:path` modules are loaded with `await import()` so vitest
 * can intercept them in `tests/unit/embedIcon.test.ts`. `vi.mock`
 * only intercepts ESM dynamic imports, not CommonJS `require()`
 * calls inside `.cjs` files.
 */
async function embedIconInWindowsExe(context) {
  if (context.electronPlatformName !== 'win32') return;

  const { existsSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const rceditMod = await import('rcedit');
  const rcedit = rceditMod.default ?? rceditMod;

  const productFilename = context.packager.appInfo.productFilename;
  const exePath = resolve(context.appOutDir, `${productFilename}.exe`);
  const iconPath = resolve(__dirname, '..', 'resources', 'icon.ico');

  if (!existsSync(exePath)) {
    console.warn(`[embed-icon] .exe not found at ${exePath}, skipping`);
    return;
  }
  if (!existsSync(iconPath)) {
    console.warn(`[embed-icon] icon.ico not found at ${iconPath}, skipping`);
    return;
  }

  console.info(`[embed-icon] Embedding ${iconPath} -> ${exePath}`);
  await rcedit(exePath, { icon: iconPath });
  console.info('[embed-icon] Icon embedded successfully');
}

module.exports = embedIconInWindowsExe;

if (require.main === module) {
  const [exe, icon] = process.argv.slice(2);
  if (!exe || !icon) {
    // eslint-disable-next-line no-console
    console.error('Usage: node scripts/embed-icon.cjs <exe> <icon>');
    process.exit(1);
  }
  (async () => {
    const rceditMod = await import('rcedit');
    const rcedit = rceditMod.default ?? rceditMod;
    await rcedit(exe, { icon });
    // eslint-disable-next-line no-console
    console.log(`[embed-icon] Embedded ${icon} -> ${exe}`);
  })().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[embed-icon] Failed:', err);
    process.exit(1);
  });
}
