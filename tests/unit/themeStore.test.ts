import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore, shutdownThemeStore } from '@/stores/themeStore';

const matchMediaMock = {
  matches: true,
  media: '(prefers-color-scheme: dark)',
  onchange: null as ((e: MediaQueryListEvent) => void) | null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn().mockReturnValue(true),
};

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((k: string): string | null => localStorageStore[k] ?? null),
  setItem: vi.fn((k: string, v: string): void => {
    localStorageStore[k] = v;
  }),
  removeItem: vi.fn((k: string): void => {
    delete localStorageStore[k];
  }),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

vi.stubGlobal('localStorage', localStorageMock);
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (): typeof matchMediaMock => matchMediaMock,
});

beforeEach(() => {
  shutdownThemeStore();
  useThemeStore.setState({ theme: 'dark', resolved: 'dark' });
  for (const k of Object.keys(localStorageStore)) delete localStorageStore[k];
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  matchMediaMock.addEventListener.mockClear();
  matchMediaMock.removeEventListener.mockClear();
  matchMediaMock.matches = true;
});

describe('themeStore', () => {
  it('initial state is dark', () => {
    const s = useThemeStore.getState();
    expect(s.theme).toBe('dark');
    expect(s.resolved).toBe('dark');
  });

  it('load() reads persisted theme from localStorage', () => {
    localStorageStore['harmonix.theme'] = 'light';
    useThemeStore.getState().load();
    const s = useThemeStore.getState();
    expect(s.theme).toBe('light');
    expect(s.resolved).toBe('light');
  });

  it('load() ignores invalid persisted values', () => {
    localStorageStore['harmonix.theme'] = 'invalid';
    useThemeStore.getState().load();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setTheme persists to localStorage and updates resolved', () => {
    useThemeStore.getState().setTheme('light');
    expect(localStorageStore['harmonix.theme']).toBe('light');
    expect(useThemeStore.getState().resolved).toBe('light');
  });

  it('setTheme to system follows prefers-color-scheme: dark', () => {
    matchMediaMock.matches = true;
    useThemeStore.getState().setTheme('system');
    expect(useThemeStore.getState().resolved).toBe('dark');
  });

  it('setTheme to system follows prefers-color-scheme: light', () => {
    matchMediaMock.matches = false;
    useThemeStore.getState().setTheme('system');
    expect(useThemeStore.getState().resolved).toBe('light');
  });

  it('cycleTheme cycles dark -> light -> system -> dark', () => {
    const cycle = useThemeStore.getState().cycleTheme;
    expect(useThemeStore.getState().theme).toBe('dark');
    cycle();
    expect(useThemeStore.getState().theme).toBe('light');
    cycle();
    expect(useThemeStore.getState().theme).toBe('system');
    cycle();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('shutdownThemeStore removes listener', () => {
    useThemeStore.getState().load();
    expect(matchMediaMock.addEventListener).toHaveBeenCalled();
    shutdownThemeStore();
    expect(matchMediaMock.removeEventListener).toHaveBeenCalled();
  });
});
