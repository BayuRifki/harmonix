import { create } from 'zustand';
import type { Track } from '@/types/global';

const STORAGE_KEY = 'harmonix.listeningHistory';
const MAX_ENTRIES = 500;
const RECENT_CAP = 20;

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
  genre: string | null;
}

export interface ArtistStat {
  artist: string;
  playCount: number;
  totalDurationMs: number;
  lastPlayedAt: number;
}

export interface TrackStat {
  id: string;
  sourceId: string;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  source: string;
  playCount: number;
  totalDurationMs: number;
  lastPlayedAt: number;
}

export interface SourceStat {
  source: string;
  playCount: number;
  totalDurationMs: number;
}

export interface HourSlot {
  hour: number;
  playCount: number;
}

interface ListeningHistoryState {
  entries: HistoryEntry[];
  add: (track: Track) => void;
  clear: () => void;
  getRecent: (n: number) => HistoryEntry[];
  topArtists: (since: number) => ArtistStat[];
  topTracks: (since: number) => TrackStat[];
  topGenres: (since: number) => { genre: string; playCount: number }[];
  sourceBreakdown: (since: number) => SourceStat[];
  timeOfDay: (since: number) => HourSlot[];
  listeningTime: (since: number) => { date: string; durationMs: number }[];
  totalSince: (since: number) => { playCount: number; totalDurationMs: number };
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
    genre: typeof track.meta?.genre === 'string' ? track.meta.genre : null,
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

function dedupeAdd(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const filtered = entries.filter((e) => e.id !== entry.id);
  return [entry, ...filtered].slice(0, MAX_ENTRIES);
}

export const useListeningHistoryStore = create<ListeningHistoryState>((set, get) => ({
  entries: load(),

  add: (track) => {
    if (!track.id) return;
    const entry = trackToEntry(track);
    const next = dedupeAdd(get().entries, entry);
    save(next);
    set({ entries: next });
  },

  clear: () => {
    save([]);
    set({ entries: [] });
  },

  getRecent: (n) => get().entries.slice(0, Math.min(n, RECENT_CAP)),

  topArtists: (since) => {
    const map = new Map<
      string,
      { playCount: number; totalDurationMs: number; lastPlayedAt: number }
    >();
    for (const e of get().entries) {
      if (e.playedAt < since) continue;
      const stat = map.get(e.artist);
      if (stat) {
        stat.playCount += 1;
        stat.totalDurationMs += e.durationMs;
        if (e.playedAt > stat.lastPlayedAt) stat.lastPlayedAt = e.playedAt;
      } else {
        map.set(e.artist, {
          playCount: 1,
          totalDurationMs: e.durationMs,
          lastPlayedAt: e.playedAt,
        });
      }
    }
    return Array.from(map, ([artist, s]) => ({ artist, ...s })).sort(
      (a, b) => b.playCount - a.playCount,
    );
  },

  topTracks: (since) => {
    const map = new Map<string, TrackStat>();
    for (const e of get().entries) {
      if (e.playedAt < since) continue;
      const stat = map.get(e.id);
      if (stat) {
        stat.playCount += 1;
        stat.totalDurationMs += e.durationMs;
        if (e.playedAt > stat.lastPlayedAt) stat.lastPlayedAt = e.playedAt;
      } else {
        map.set(e.id, {
          id: e.id,
          sourceId: e.sourceId,
          title: e.title,
          artist: e.artist,
          album: e.album,
          artworkUrl: e.artworkUrl,
          source: e.source,
          playCount: 1,
          totalDurationMs: e.durationMs,
          lastPlayedAt: e.playedAt,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.playCount - a.playCount);
  },

  topGenres: (since) => {
    const map = new Map<string, number>();
    for (const e of get().entries) {
      if (e.playedAt < since) continue;
      const g = e.genre || 'Unknown';
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    return Array.from(map, ([genre, playCount]) => ({ genre, playCount })).sort(
      (a, b) => b.playCount - a.playCount,
    );
  },

  sourceBreakdown: (since) => {
    const map = new Map<string, { playCount: number; totalDurationMs: number }>();
    for (const e of get().entries) {
      if (e.playedAt < since) continue;
      const stat = map.get(e.source);
      if (stat) {
        stat.playCount += 1;
        stat.totalDurationMs += e.durationMs;
      } else {
        map.set(e.source, { playCount: 1, totalDurationMs: e.durationMs });
      }
    }
    return Array.from(map, ([source, s]) => ({ source, ...s })).sort(
      (a, b) => b.playCount - a.playCount,
    );
  },

  timeOfDay: (since) => {
    const counts = new Array(24).fill(0) as number[];
    for (const e of get().entries) {
      if (e.playedAt < since) continue;
      const hour = new Date(e.playedAt).getHours();
      counts[hour] += 1;
    }
    return counts.map((playCount, hour) => ({ hour, playCount }));
  },

  listeningTime: (since) => {
    const map = new Map<string, number>();
    for (const e of get().entries) {
      if (e.playedAt < since) continue;
      const day = new Date(e.playedAt).toISOString().slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + e.durationMs);
    }
    return Array.from(map, ([date, durationMs]) => ({ date, durationMs })).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  },

  totalSince: (since) => {
    let playCount = 0;
    let totalDurationMs = 0;
    for (const e of get().entries) {
      if (e.playedAt < since) continue;
      playCount += 1;
      totalDurationMs += e.durationMs;
    }
    return { playCount, totalDurationMs };
  },
}));
