import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchHistoryStore } from '@/stores/searchHistoryStore';

describe('searchHistoryStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSearchHistoryStore.setState({ queries: [] });
  });

  it('starts empty', () => {
    expect(useSearchHistoryStore.getState().queries).toEqual([]);
  });

  it('adds a query', () => {
    useSearchHistoryStore.getState().add('Daft Punk');
    expect(useSearchHistoryStore.getState().queries).toEqual(['Daft Punk']);
  });

  it('deduplicates (case-insensitive) and puts new on top', () => {
    useSearchHistoryStore.getState().add('Daft Punk');
    useSearchHistoryStore.getState().add('Radiohead');
    useSearchHistoryStore.getState().add('daft punk');
    expect(useSearchHistoryStore.getState().queries).toEqual(['daft punk', 'Radiohead']);
  });

  it('caps at 8 entries', () => {
    for (let i = 0; i < 12; i++) {
      useSearchHistoryStore.getState().add(`q${i}`);
    }
    const queries = useSearchHistoryStore.getState().queries;
    expect(queries).toHaveLength(8);
    expect(queries[0]).toBe('q11');
  });

  it('ignores empty / whitespace-only', () => {
    useSearchHistoryStore.getState().add('');
    useSearchHistoryStore.getState().add('   ');
    expect(useSearchHistoryStore.getState().queries).toEqual([]);
  });

  it('persists to localStorage', () => {
    useSearchHistoryStore.getState().add('test');
    const raw = localStorage.getItem('harmonix.searchHistory');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(['test']);
  });

  it('clears', () => {
    useSearchHistoryStore.getState().add('a');
    useSearchHistoryStore.getState().add('b');
    useSearchHistoryStore.getState().clear();
    expect(useSearchHistoryStore.getState().queries).toEqual([]);
  });
});
