import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

type MockWindow = EventEmitter & {
  isDestroyed: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  loadURL: ReturnType<typeof vi.fn>;
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
  return win;
}

const mocks = vi.hoisted(() => {
  const fakePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  );
  return {
    BrowserWindow: vi.fn(),
    appGetAppPath: vi.fn(() => '/mocked/app/path'),
    fakePng,
  };
});

vi.mock('node:fs', () => {
  const stub = {
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => mocks.fakePng),
  };
  return { ...stub, default: stub };
});

vi.mock('electron', () => ({
  BrowserWindow: mocks.BrowserWindow,
  app: { getAppPath: mocks.appGetAppPath },
}));

const { createSplashWindow, closeSplashWindow, isSplashWindow } = await import(
  '../../electron/main/splashWindow'
);

describe('splashWindow', () => {
  beforeEach(() => {
    mocks.BrowserWindow.mockReset();
    mocks.BrowserWindow.mockImplementation(() => makeMockWindow());
    mocks.appGetAppPath.mockClear();
    closeSplashWindow();
  });

  afterEach(() => {
    closeSplashWindow();
    vi.useRealTimers();
  });

  it('creates a frameless, always-on-top, centered, non-resizable window', () => {
    createSplashWindow();
    const opts = mocks.BrowserWindow.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(opts).toMatchObject({
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      show: false,
      skipTaskbar: true,
      focusable: false,
      backgroundColor: '#0a0a0a',
    });
    expect(opts.center).toBe(true);
    expect(opts.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
    });
  });

  it('loads a data: URL with the splash HTML and the logo embedded as a data: URL src', () => {
    const win = createSplashWindow() as unknown as MockWindow;
    const loadURL = win.loadURL;
    expect(loadURL).toHaveBeenCalledTimes(1);
    const url = (loadURL.mock.calls[0]?.[0] as string) ?? '';
    expect(url.startsWith('data:text/html;charset=utf-8,')).toBe(true);
    expect(url).not.toContain('#');
    const htmlEncoded = url.slice('data:text/html;charset=utf-8,'.length);
    const html = decodeURIComponent(htmlEncoded);
    expect(html).toContain('HARMONIX');
    expect(html).toContain('ONE PLAYER. ALL MUSIC.');
    expect(html).toContain('class="spinner"');
    expect(html).toMatch(/src="data:image\/png;base64,[A-Za-z0-9+/=]+"/);
    expect(html).not.toMatch(/src="file:\/\//);
  });

  it('shows the window when the renderer is ready', () => {
    const win = createSplashWindow() as unknown as MockWindow;
    win.emit('ready-to-show');
    expect(win.show).toHaveBeenCalledTimes(1);
  });

  it('returns the existing splash if one is already open', () => {
    const a = createSplashWindow();
    const b = createSplashWindow();
    expect(a).toBe(b);
    expect(mocks.BrowserWindow).toHaveBeenCalledTimes(1);
  });

  it('clears the splash reference and auto-close timer on closed event', () => {
    const win = createSplashWindow() as unknown as MockWindow;
    expect(isSplashWindow(win as unknown as Parameters<typeof isSplashWindow>[0])).toBe(true);
    win.destroy();
    expect(isSplashWindow(win as unknown as Parameters<typeof isSplashWindow>[0])).toBe(false);
  });

  it('closeSplashWindow is a no-op when no splash exists', () => {
    expect(() => closeSplashWindow()).not.toThrow();
  });

  it('auto-closes after 15s safety timeout', () => {
    vi.useFakeTimers();
    const win = createSplashWindow() as unknown as MockWindow;
    expect(win.destroy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(15_000);
    expect(win.destroy).toHaveBeenCalledTimes(1);
  });
});
