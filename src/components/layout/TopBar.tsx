import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Settings as SettingsIcon } from 'lucide-react';

const SEARCH_DEBOUNCE_MS = 400;

export function TopBar(): JSX.Element {
  const [query, setQuery] = useState('');
  const [hasNotification, setHasNotification] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value;
    setQuery(next);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    if (next.trim().length === 0) {
      debounceRef.current = window.setTimeout(() => {
        if (next.trim().length === 0) {
          void navigate('/search');
        }
      }, SEARCH_DEBOUNCE_MS);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      void navigate(`/search?q=${encodeURIComponent(next.trim())}`);
    }, SEARCH_DEBOUNCE_MS);
  };

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    if (query.trim().length > 0) {
      void navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      void navigate('/search');
    }
  };

  return (
    <div className="h-14 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur flex items-center gap-4 px-6">
      <form onSubmit={onSubmit} className="flex-1 max-w-2xl">
        <div className="relative group">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-400 transition-colors"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={onChange}
            placeholder="Search for songs, artists, albums…"
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50 focus:bg-zinc-900 focus:ring-1 focus:ring-brand-500/30 transition-all"
            aria-label="Search"
          />
        </div>
      </form>

      <button
        type="button"
        onClick={() => setHasNotification(false)}
        className="relative p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {hasNotification && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full shadow-glow-pink" />
        )}
      </button>

      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
        aria-label="Settings"
        title="Settings"
      >
        <SettingsIcon size={18} />
      </button>
    </div>
  );
}
