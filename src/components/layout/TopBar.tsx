import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Settings as SettingsIcon, History, X, Clock, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { useUiStore } from '@/stores/uiStore';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { fuzzySearch, highlightMatches } from '@/components/command/fuzzyMatch';

const SEARCH_DEBOUNCE_MS = 400;

export function TopBar(): JSX.Element {
  const [query, setQuery] = useState('');
  const [hasNotification, setHasNotification] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const openCommandPalette = useUiStore((s) => s.openCommandPalette);
  const { history, push, remove, clear } = useSearchHistory();
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent || '');
  const modKey = isMac ? '⌘' : 'Ctrl';

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!historyOpen) return;
    const onClick = (e: MouseEvent): void => {
      if (historyContainerRef.current && !historyContainerRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setHistoryOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [historyOpen]);

  const filteredHistory = useMemo(() => {
    if (!query.trim()) return history;
    return fuzzySearch(
      history.map((q) => ({ q })),
      query,
      (it) => it.q,
      6,
    ).map((m) => m.item.q);
  }, [history, query]);

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

  const runSearch = (q: string): void => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    if (q.trim().length > 0) {
      push(q);
      void navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    } else {
      void navigate('/search');
    }
    setHistoryOpen(false);
    inputRef.current?.blur();
  };

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="h-14 border-b border-zinc-800/60 glass flex items-center gap-4 px-6">
      <Breadcrumb />

      <form onSubmit={onSubmit} className="flex-1 max-w-2xl">
        <div className="relative group" ref={historyContainerRef}>
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-400 transition-colors z-10"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={onChange}
            onFocus={() => setHistoryOpen(true)}
            placeholder="Search for songs, artists, albums…"
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-full pl-10 pr-32 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50 focus:bg-zinc-900 focus:ring-1 focus:ring-brand-500/30 transition-all"
            aria-label="Search"
            aria-autocomplete="list"
            aria-expanded={historyOpen && (filteredHistory.length > 0 || history.length > 0)}
            aria-controls="topbar-search-history"
            role="combobox"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-zinc-500 bg-zinc-800/80 hover:bg-zinc-700/80 hover:text-zinc-200 border border-zinc-700/60 rounded transition-colors focus-ring"
                aria-label="Show search history"
                title="Search history"
                data-testid="topbar-search-history-trigger"
              >
                <History size={10} aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={openCommandPalette}
              className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-zinc-500 bg-zinc-800/80 hover:bg-zinc-700/80 hover:text-zinc-200 border border-zinc-700/60 rounded transition-colors focus-ring"
              aria-label="Open command palette"
              title="Command palette"
              data-testid="topbar-command-palette-trigger"
            >
              <kbd className="font-mono">{modKey}</kbd>
              <kbd className="font-mono">K</kbd>
            </button>
          </div>

          <AnimatePresence>
            {historyOpen && (history.length > 0 || query.trim().length > 0) && (
              <motion.div
                id="topbar-search-history"
                role="listbox"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-full left-0 right-0 mt-2 glass rounded-lg border border-zinc-800/60 shadow-2xl overflow-hidden z-30"
                data-testid="topbar-search-history-dropdown"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <Clock size={10} aria-hidden />
                    {query.trim() ? 'Matches' : 'Recent searches'}
                  </div>
                  {!query.trim() && history.length > 0 && (
                    <button
                      type="button"
                      onClick={clear}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 focus-ring"
                      data-testid="topbar-search-history-clear"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {filteredHistory.length > 0 ? (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {filteredHistory.map((h) => (
                      <li
                        key={h}
                        role="option"
                        aria-selected={false}
                        className="group flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/60 cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          runSearch(h);
                        }}
                      >
                        <Search size={12} className="text-zinc-600 shrink-0" aria-hidden />
                        <span className="flex-1 text-sm text-zinc-200 truncate">
                          {query.trim()
                            ? highlightMatches(
                                h,
                                fuzzySearch([h], query, (x) => x, 1)[0]?.matches ?? [],
                              ).map((seg, i) => (
                                <span
                                  key={i}
                                  className={seg.highlighted ? 'text-brand-300 font-medium' : ''}
                                >
                                  {seg.text}
                                </span>
                              ))
                            : h}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(h);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 focus-ring"
                          aria-label={`Remove ${h} from search history`}
                        >
                          <X size={11} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-6 text-center text-xs text-zinc-500">
                    <SearchX size={16} className="text-zinc-700 mx-auto mb-1" aria-hidden />
                    {query.trim() ? 'No matches in history' : 'No recent searches'}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>

      <button
        type="button"
        onClick={() => setHasNotification(false)}
        className="relative p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors focus-ring"
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
        className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors focus-ring"
        aria-label="Settings"
        title="Settings"
      >
        <SettingsIcon size={18} />
      </button>
    </div>
  );
}
