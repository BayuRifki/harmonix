export type DurationFilter = 'any' | 'short' | 'medium' | 'long';

export interface SearchFiltersState {
  sources: string[];
  duration: DurationFilter;
  artist: string;
}

export const DURATION_LABELS: Record<DurationFilter, string> = {
  any: 'Any length',
  short: '< 3 min',
  medium: '3-6 min',
  long: '> 6 min',
};

export const DEFAULT_FILTERS: SearchFiltersState = {
  sources: [],
  duration: 'any',
  artist: '',
};

const SOURCE_PARAM = 'src';
const DURATION_PARAM = 'dur';
const ARTIST_PARAM = 'artist';

export function readFiltersFromParams(params: URLSearchParams): SearchFiltersState {
  const src = params.get(SOURCE_PARAM);
  const dur = params.get(DURATION_PARAM) ?? 'any';
  const artist = params.get(ARTIST_PARAM) ?? '';
  const sources = src ? src.split(',').filter((s) => s.trim().length > 0) : [];
  const allowedDurations: DurationFilter[] = ['any', 'short', 'medium', 'long'];
  const duration = allowedDurations.includes(dur as DurationFilter)
    ? (dur as DurationFilter)
    : 'any';
  return { sources, duration, artist };
}

export function writeFiltersToParams(
  filters: SearchFiltersState,
  baseParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(baseParams);
  if (filters.sources.length === 0) {
    next.delete(SOURCE_PARAM);
  } else {
    next.set(SOURCE_PARAM, filters.sources.join(','));
  }
  if (filters.duration === 'any') {
    next.delete(DURATION_PARAM);
  } else {
    next.set(DURATION_PARAM, filters.duration);
  }
  if (!filters.artist.trim()) {
    next.delete(ARTIST_PARAM);
  } else {
    next.set(ARTIST_PARAM, filters.artist.trim());
  }
  return next;
}

export function matchesDuration(durationMs: number, filter: DurationFilter): boolean {
  if (filter === 'any') return true;
  const seconds = durationMs / 1000;
  if (filter === 'short') return seconds < 180;
  if (filter === 'medium') return seconds >= 180 && seconds <= 360;
  return seconds > 360;
}

export function matchesArtist(artistNames: string, artistQuery: string): boolean {
  if (!artistQuery.trim()) return true;
  return artistNames.toLowerCase().includes(artistQuery.trim().toLowerCase());
}

export function matchesSource(trackSource: string, selectedSources: string[]): boolean {
  if (!selectedSources || selectedSources.length === 0) return true;
  return selectedSources.includes(trackSource);
}

export function applyFilters<
  T extends { durationMs: number; artists: { name: string }[]; source: string },
>(tracks: T[], filters: SearchFiltersState): T[] {
  return tracks.filter((t) => {
    if (!matchesDuration(t.durationMs, filters.duration)) return false;
    if (!matchesSource(t.source, filters.sources ?? [])) return false;
    const artistNames = t.artists.map((a) => a.name).join(', ');
    if (!matchesArtist(artistNames, filters.artist)) return false;
    return true;
  });
}
