import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'harmonix.search.history';
const MAX_HISTORY = 8;

function readHistory(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function writeHistory(history: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // ignore quota errors
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => readHistory());

  useEffect(() => {
    writeHistory(history);
  }, [history]);

  const push = useCallback((query: string): void => {
    const q = query.trim();
    if (!q) return;
    setHistory((prev) => {
      const filtered = prev.filter((p) => p.toLowerCase() !== q.toLowerCase());
      return [q, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const remove = useCallback((query: string): void => {
    setHistory((prev) => prev.filter((p) => p !== query));
  }, []);

  const clear = useCallback((): void => {
    setHistory([]);
  }, []);

  return { history, push, remove, clear };
}
