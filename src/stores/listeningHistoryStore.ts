import { create } from 'zustand';
import type { Track } from '@/types/global';

const STORAGE_KEY = 'harmonix.listeningHistory';
const MAX_ENTRIES = 20;

export interface HistoryEntry {
  id: string;
  sourceId: string;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  source: string;
  durationMs: number;
  playedAt: number;
}

interface ListeningHistoryState {
  entries: HistoryEntry[];
  add: (track: Track) => void;
  clear: () => void;
  getRecent: (n: number) => HistoryEntry[];
}

function trackToEntry(track: Track): HistoryEntry {
  return {
    id: track.id,
    sourceId: track.sourceId,
    title: track.title,
    artist:
      track.artists
        .map((a) => a.name)
        .filter(Boolean)
        .join(', ') || 'Unknown artist',
    album: track.album?.title ?? null,
    artworkUrl: track.artworkUrl ?? track.album?.artworkUrl ?? null,
    source: track.source,
    durationMs: track.durationMs,
    playedAt: Date.now(),
  };
}

function stripSourcePrefix(id: string, source: string): string {
  const prefix = `${source}:`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

function load(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is HistoryEntry =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as HistoryEntry).id === 'string' &&
          typeof (e as HistoryEntry).title === 'string',
      )
      .map((e) => {
        if (typeof e.sourceId === 'string' && e.sourceId.length > 0) return e;
        const source = typeof e.source === 'string' ? e.source : '';
        return { ...e, sourceId: source ? stripSourcePrefix(e.id, source) : e.id };
      })
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore quota errors
  }
}

export const useListeningHistoryStore = create<ListeningHistoryState>((set, get) => ({
  entries: load(),
  add: (track) => {
    if (!track.id) return;
    const entry = trackToEntry(track);
    const current = get().entries.filter((e) => e.id !== entry.id);
    const next = [entry, ...current].slice(0, MAX_ENTRIES);
    save(next);
    set({ entries: next });
  },
  clear: () => {
    save([]);
    set({ entries: [] });
  },
  getRecent: (n) => get().entries.slice(0, Math.max(0, n)),
}));
