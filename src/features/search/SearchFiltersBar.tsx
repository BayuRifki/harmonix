import { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import {
  DURATION_LABELS,
  type DurationFilter,
  type SearchFiltersState,
} from '@/features/search/searchFilters';

export interface SourceOption {
  id: string;
  name: string;
}

export interface SearchFiltersBarProps {
  sources: SourceOption[];
  filters: SearchFiltersState;
  onChange: (filters: SearchFiltersState) => void;
  onReset: () => void;
}

const DURATION_OPTIONS: DurationFilter[] = ['any', 'short', 'medium', 'long'];

export function SearchFiltersBar({
  sources,
  filters,
  onChange,
  onReset,
}: SearchFiltersBarProps): JSX.Element {
  const [artistDraft, setArtistDraft] = useState(filters.artist);

  useEffect(() => {
    setArtistDraft(filters.artist);
  }, [filters.artist]);

  const toggleSource = (id: string): void => {
    const next = filters.sources.includes(id)
      ? filters.sources.filter((s) => s !== id)
      : [...filters.sources, id];
    onChange({ ...filters, sources: next });
  };

  const setDuration = (d: DurationFilter): void => {
    onChange({ ...filters, duration: d });
  };

  const commitArtist = (): void => {
    if (artistDraft !== filters.artist) {
      onChange({ ...filters, artist: artistDraft });
    }
  };

  const hasActiveFilters =
    filters.sources.length > 0 || filters.duration !== 'any' || filters.artist.trim() !== '';

  return (
    <div
      className="mb-4 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40"
      data-testid="search-filters-bar"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
          <Filter size={11} aria-hidden /> Filters
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-200"
            data-testid="search-filters-reset"
          >
            <X size={10} aria-hidden /> Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {sources.map((s) => {
          const active = filters.sources.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSource(s.id)}
              aria-pressed={active}
              className={`px-2.5 py-1 text-[11px] rounded-full border transition-all duration-150 active:scale-[0.95] ${
                active
                  ? 'bg-brand-500/20 border-brand-500/60 text-brand-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
              data-testid={`search-filter-source-${s.id}`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              aria-pressed={filters.duration === d}
              className={`px-2.5 py-1 text-[11px] rounded-full border transition-all duration-150 ${
                filters.duration === d
                  ? 'bg-brand-500/20 border-brand-500/60 text-brand-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
              data-testid={`search-filter-duration-${d}`}
            >
              {DURATION_LABELS[d]}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            value={artistDraft}
            onChange={(e) => setArtistDraft(e.target.value)}
            onBlur={commitArtist}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitArtist();
              }
            }}
            placeholder="Filter by artist..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50"
            data-testid="search-filter-artist"
          />
        </div>
      </div>
    </div>
  );
}
