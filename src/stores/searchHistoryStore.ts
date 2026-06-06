import { create } from 'zustand';

const STORAGE_KEY = 'harmonix.searchHistory';
const MAX_ENTRIES = 8;

interface SearchHistoryStore {
  queries: string[];
  add: (q: string) => void;
  clear: () => void;
}

function load(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((q): q is string => typeof q === 'string').slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function save(queries: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queries.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore
  }
}

export const useSearchHistoryStore = create<SearchHistoryStore>((set, get) => ({
  queries: load(),
  add: (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const current = get().queries.filter(
      (existing) => existing.toLowerCase() !== trimmed.toLowerCase(),
    );
    const next = [trimmed, ...current].slice(0, MAX_ENTRIES);
    save(next);
    set({ queries: next });
  },
  clear: () => {
    save([]);
    set({ queries: [] });
  },
}));
