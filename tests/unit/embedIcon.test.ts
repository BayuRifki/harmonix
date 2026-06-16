import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rcedit: vi.fn(),
  existsSync: vi.fn(),
}));

// vitest intercepts ESM dynamic imports, so the hook script uses
// `await import('rcedit')` / `await import('node:fs')` instead of
// `require(...)` to make it mockable. The factory must return
// `{ default: ... }` because vitest's dynamic-import mock expects
// the CommonJS default-export shape.
vi.mock('rcedit', () => ({ default: mocks.rcedit }));
vi.mock('node:fs', () => ({
  existsSync: mocks.existsSync,
  default: { existsSync: mocks.existsSync },
}));

type HookContext = {
  electronPlatformName: string;
  appOutDir: string;
  packager: { appInfo: { productFilename: string } };
};
type Hook = (context: HookContext) => Promise<void>;

async function loadHook(): Promise<Hook> {
  vi.resetModules();
  const mod = (await import('../../scripts/embed-icon.cjs')) as { default?: Hook };
  if (!mod.default) throw new Error('embed-icon.cjs did not export a default function');
  return mod.default;
}

const winCtx = {
  electronPlatformName: 'win32',
  appOutDir: '/tmp/unpacked',
  packager: { appInfo: { productFilename: 'Harmonix' } },
};
const macCtx = { ...winCtx, electronPlatformName: 'darwin' };
const linuxCtx = { ...winCtx, electronPlatformName: 'linux' };

describe('embed-icon.cjs afterPack hook', () => {
  let hook: Hook;

  beforeEach(async () => {
    mocks.rcedit.mockReset();
    mocks.existsSync.mockReset();
    mocks.rcedit.mockResolvedValue(undefined);
    mocks.existsSync.mockReturnValue(true);
    hook = await loadHook();
  });

  it('is a no-op on macOS (uses .icns, not .ico)', async () => {
    await hook(macCtx);
    expect(mocks.rcedit).not.toHaveBeenCalled();
  });

  it('is a no-op on Linux (uses .png + desktop entry, not .ico)', async () => {
    await hook(linuxCtx);
    expect(mocks.rcedit).not.toHaveBeenCalled();
  });

  it('embeds <repo>/resources/icon.ico into <appOutDir>/<productFilename>.exe on Windows', async () => {
    await hook(winCtx);
    expect(mocks.rcedit).toHaveBeenCalledTimes(1);
    const [exePath, opts] = mocks.rcedit.mock.calls[0]!;
    // Normalize path separators so the assertion works on both
    // Windows (backslashes) and macOS / Linux (forward slashes).
    const exeNorm = String(exePath).replace(/\\/g, '/');
    const iconNorm = String(opts.icon).replace(/\\/g, '/');
    expect(exeNorm).toMatch(/Harmonix\.exe$/);
    expect(exeNorm).toContain('/tmp/unpacked');
    expect(iconNorm).toMatch(/icon\.ico$/);
    expect(iconNorm).toContain('/resources/');
  });

  it('uses packager.appInfo.productFilename to locate the .exe', async () => {
    await hook({ ...winCtx, packager: { appInfo: { productFilename: 'MyCustomApp' } } });
    const [exePath] = mocks.rcedit.mock.calls[0]!;
    expect(String(exePath)).toMatch(/MyCustomApp\.exe$/);
  });

  it('skips silently when the built .exe is missing', async () => {
    mocks.existsSync.mockImplementation((p: string) => !String(p).includes('Harmonix.exe'));
    await hook(winCtx);
    expect(mocks.rcedit).not.toHaveBeenCalled();
  });

  it('skips silently when the source icon.ico is missing', async () => {
    mocks.existsSync.mockImplementation((p: string) => !String(p).includes('icon.ico'));
    await hook(winCtx);
    expect(mocks.rcedit).not.toHaveBeenCalled();
  });

  it('propagates rcedit errors so electron-builder fails the build loudly', async () => {
    mocks.rcedit.mockRejectedValue(new Error('rcedit binary failed'));
    await expect(hook(winCtx)).rejects.toThrow('rcedit binary failed');
  });
});
