import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

type MockWindow = EventEmitter & {
  isDestroyed: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  loadURL: ReturnType<typeof vi.fn>;
  loadFile: ReturnType<typeof vi.fn>;
  isMinimized: ReturnType<typeof vi.fn>;
  isVisible: ReturnType<typeof vi.fn>;
  webContents: { setWindowOpenHandler: ReturnType<typeof vi.fn> };
};

function makeMockWindow(): MockWindow {
  const win = new EventEmitter() as MockWindow;
  win.isDestroyed = vi.fn(() => false);
  win.destroy = vi.fn(() => {
    win.isDestroyed = vi.fn(() => true);
    win.emit('closed');
  });
  win.show = vi.fn();
  win.loadURL = vi.fn(async () => undefined);
  win.loadFile = vi.fn(async () => undefined);
  win.isMinimized = vi.fn(() => false);
  win.isVisible = vi.fn(() => false);
  win.webContents = { setWindowOpenHandler: vi.fn() };
  return win;
}

const mocks = vi.hoisted(() => ({
  BrowserWindow: vi.fn(),
}));

vi.mock('node:fs', () => {
  const stub = { existsSync: vi.fn(() => true) };
  return { ...stub, default: stub };
});

vi.mock('electron', () => ({
  BrowserWindow: mocks.BrowserWindow,
  screen: {
    getPrimaryDisplay: () => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
  },
  shell: { openExternal: vi.fn() },
}));

type WindowManagerModule = typeof import('../../electron/main/windowManager');

async function loadWindowManager(): Promise<WindowManagerModule> {
  vi.resetModules();
  return import('../../electron/main/windowManager');
}

describe('createMainWindow — native window controls', () => {
  let lastConstructorOptions: Record<string, unknown> | undefined;
  let wm: WindowManagerModule;

  beforeEach(async () => {
    lastConstructorOptions = undefined;
    mocks.BrowserWindow.mockReset();
    mocks.BrowserWindow.mockImplementation((opts: Record<string, unknown>) => {
      lastConstructorOptions = opts;
      return makeMockWindow();
    });
    wm = await loadWindowManager();
  });

  it('uses a native OS frame so the standard min/max/close buttons render', () => {
    wm.createMainWindow();
    expect(lastConstructorOptions).toBeDefined();
    expect(lastConstructorOptions?.frame).not.toBe(false);
  });

  it('does not set titleBarStyle: hidden (which would strip the native frame)', () => {
    wm.createMainWindow();
    expect(lastConstructorOptions?.titleBarStyle).not.toBe('hidden');
  });

  it('does not set titleBarStyle: hiddenInset (mac-only look that hides Win controls)', () => {
    wm.createMainWindow();
    expect(lastConstructorOptions?.titleBarStyle).not.toBe('hiddenInset');
  });

  it('allows the window to be minimizable (explicitly or by default)', () => {
    wm.createMainWindow();
    const opts = lastConstructorOptions ?? {};
    if (opts.minimizable !== undefined) {
      expect(opts.minimizable).toBe(true);
    }
  });

  it('allows the window to be maximizable (explicitly or by default)', () => {
    wm.createMainWindow();
    const opts = lastConstructorOptions ?? {};
    if (opts.maximizable !== undefined) {
      expect(opts.maximizable).toBe(true);
    }
  });

  it('allows the window to be closable (explicitly or by default)', () => {
    wm.createMainWindow();
    const opts = lastConstructorOptions ?? {};
    if (opts.closable !== undefined) {
      expect(opts.closable).toBe(true);
    }
  });

  it('keeps a reasonable minimum size so the layout does not collapse', () => {
    wm.createMainWindow();
    expect(lastConstructorOptions?.minWidth).toBeGreaterThanOrEqual(800);
    expect(lastConstructorOptions?.minHeight).toBeGreaterThanOrEqual(500);
  });

  it('sets a sensible default size for first launch', () => {
    wm.createMainWindow();
    expect(lastConstructorOptions?.width).toBeGreaterThanOrEqual(1024);
    expect(lastConstructorOptions?.height).toBeGreaterThanOrEqual(600);
  });

  it('does not mark the main window as alwaysOnTop (it is the primary window)', () => {
    wm.createMainWindow();
    expect(lastConstructorOptions?.alwaysOnTop).not.toBe(true);
  });

  it('returns the same window on repeated calls (singleton)', () => {
    const a = wm.createMainWindow();
    const b = wm.getMainWindow();
    expect(b).toBe(a);
  });
});
