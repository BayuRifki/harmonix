import { create } from 'zustand';

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'harmonix.theme';

function readPersistedTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'dark';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // ignore
  }
  return 'dark';
}

function persistTheme(theme: Theme): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function applyClass(resolved: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('light', resolved === 'light');
  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.theme = resolved;
}

interface ThemeState {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  load: () => void;
}

let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

function attachSystemListener(): void {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  if (mediaQueryListener) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQueryListener = (): void => {
    const s = useThemeStore.getState();
    if (s.theme === 'system') {
      const resolved = resolveTheme('system');
      applyClass(resolved);
      useThemeStore.setState({ resolved });
    }
  };
  mq.addEventListener('change', mediaQueryListener);
}

function detachSystemListener(): void {
  if (!mediaQueryListener) return;
  if (typeof window === 'undefined' || !window.matchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.removeEventListener('change', mediaQueryListener);
  mediaQueryListener = null;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolved: 'dark',

  setTheme: (theme) => {
    const resolved = resolveTheme(theme);
    applyClass(resolved);
    persistTheme(theme);
    set({ theme, resolved });
  },

  cycleTheme: () => {
    const order: Theme[] = ['dark', 'light', 'system'];
    const current = get().theme;
    const next = order[(order.indexOf(current) + 1) % order.length];
    get().setTheme(next);
  },

  load: () => {
    const theme = readPersistedTheme();
    const resolved = resolveTheme(theme);
    applyClass(resolved);
    set({ theme, resolved });
    attachSystemListener();
  },
}));

export function shutdownThemeStore(): void {
  detachSystemListener();
}
