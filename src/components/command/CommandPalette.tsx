import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Hash,
  Music,
  Compass,
  Library,
  Heart,
  Music2,
  SlidersHorizontal,
  Settings,
  ListMusic,
  LayoutGrid,
  Maximize2,
  Volume2,
  VolumeX,
  Plus,
} from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useThemeStore } from '@/stores/themeStore';
import { useToastStore } from '@/components/ui/toastStore';
import { fuzzySearch, highlightMatches, type FuzzyMatch } from './fuzzyMatch';
import { CommandPreview } from '@/components/command/CommandPreview';
import { FocusTrap } from '@/components/ui/FocusTrap';

type IconType = typeof Search;

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: 'Navigation' | 'Actions' | 'Tracks' | 'Playlists' | 'Albums' | 'Artists' | 'Library';
  icon: IconType;
  keywords?: string[];
  perform: () => void;
}

export function CommandPalette(): JSX.Element | null {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const close = useUiStore((s) => s.closeCommandPalette);
  const toggle = useUiStore((s) => s.toggleCommandPalette);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const recents = useUiStore((s) => s.recents);
  const history = useListeningHistoryStore((s) => s.entries);
  const playlists = usePlaylistsStore((s) => s.playlists);
  const createPlaylist = usePlaylistsStore((s) => s.create);
  const tracks = useLibraryStore((s) => s.tracks);
  const albums = useLibraryStore((s) => s.albums);
  const artists = useLibraryStore((s) => s.artists);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const volume = usePlayerStore((s) => s.volume);

  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);
  const toast = useToastStore();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 16);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    list.push(
      {
        id: 'nav.home',
        label: 'Go to Home',
        group: 'Navigation',
        icon: Compass,
        keywords: ['main', 'dashboard'],
        perform: () => navigate('/'),
      },
      {
        id: 'nav.search',
        label: 'Open Search',
        group: 'Navigation',
        icon: Search,
        keywords: ['find', 'query'],
        perform: () => navigate('/search'),
      },
      {
        id: 'nav.library',
        label: 'Go to Library',
        group: 'Navigation',
        icon: Library,
        keywords: ['local', 'files'],
        perform: () => navigate('/library'),
      },
      {
        id: 'nav.explore',
        label: 'Go to Explore',
        group: 'Navigation',
        icon: Compass,
        keywords: ['discover', 'browse'],
        perform: () => navigate('/explore'),
      },
      {
        id: 'nav.favorites',
        label: 'Go to Favorites',
        group: 'Navigation',
        icon: Heart,
        keywords: ['liked', 'loved'],
        perform: () => navigate('/favorites'),
      },
      {
        id: 'nav.playlists',
        label: 'Go to Playlists',
        group: 'Navigation',
        icon: Music,
        keywords: ['collections'],
        perform: () => navigate('/playlists'),
      },
      {
        id: 'nav.equalizer',
        label: 'Open Equalizer',
        group: 'Navigation',
        icon: SlidersHorizontal,
        keywords: ['eq', 'audio', 'effects'],
        perform: () => navigate('/equalizer'),
      },
      {
        id: 'nav.settings',
        label: 'Open Settings',
        group: 'Navigation',
        icon: Settings,
        keywords: ['preferences', 'config'],
        perform: () => navigate('/settings'),
      },
    );

    if (currentTrack) {
      list.push({
        id: 'nav.nowPlaying',
        label: 'Open Now Playing',
        group: 'Navigation',
        icon: Maximize2,
        keywords: ['fullscreen', 'expand'],
        perform: () => navigate('/now-playing'),
      });
    }

    list.push(
      {
        id: 'action.togglePlay',
        label: isPlaying ? 'Pause' : 'Play',
        group: 'Actions',
        icon: isPlaying ? VolumeX : Volume2,
        keywords: ['playback'],
        perform: () => void (isPlaying ? pause() : resume()),
      },
      {
        id: 'action.next',
        label: 'Next Track',
        group: 'Actions',
        icon: ArrowRight,
        keywords: ['skip', 'forward'],
        perform: () => void next(),
      },
      {
        id: 'action.previous',
        label: 'Previous Track',
        group: 'Actions',
        icon: ArrowRight,
        keywords: ['back', 'rewind'],
        perform: () => void previous(),
      },
      {
        id: 'action.shuffle',
        label: 'Toggle Shuffle',
        group: 'Actions',
        icon: ListMusic,
        keywords: ['randomize'],
        perform: () => toggleShuffle(),
      },
      {
        id: 'action.repeat',
        label: 'Cycle Repeat Mode',
        group: 'Actions',
        icon: ListMusic,
        keywords: ['loop'],
        perform: () => cycleRepeat(),
      },
      {
        id: 'action.mute',
        label: volume === 0 ? 'Unmute' : 'Mute',
        group: 'Actions',
        icon: volume === 0 ? Volume2 : VolumeX,
        keywords: ['silence', 'audio'],
        perform: () => setVolume(volume === 0 ? 1 : 0),
      },
      {
        id: 'action.theme',
        label: 'Switch Theme',
        group: 'Actions',
        icon: LayoutGrid,
        keywords: ['dark', 'light', 'appearance'],
        perform: () => cycleTheme(),
      },
    );

    for (const p of playlists) {
      list.push({
        id: `playlist.${p.id}`,
        label: p.name,
        hint: `${p.trackCount} tracks`,
        group: 'Playlists',
        icon: Music2,
        keywords: ['collection', 'list'],
        perform: () => navigate(`/playlists`, { state: { selectedId: p.id } }),
      });
    }

    if (playlists.length === 0) {
      list.push({
        id: 'action.createPlaylist',
        label: 'Create New Playlist',
        group: 'Actions',
        icon: Plus,
        keywords: ['new', 'add', 'list'],
        perform: async () => {
          try {
            await createPlaylist(`My Playlist #${playlists.length + 1}`);
            toast.success('Playlist created');
            navigate('/playlists');
          } catch {
            toast.error('Failed to create playlist');
          }
        },
      });
    }

    for (const t of tracks.slice(0, 50)) {
      const title = t.title;
      const artist = t.artists
        .map((a) => a.name)
        .filter(Boolean)
        .join(', ');
      list.push({
        id: `track.${t.id}`,
        label: title,
        hint: artist || undefined,
        group: 'Tracks',
        icon: Music,
        keywords: [artist, t.album?.title].filter(Boolean) as string[],
        perform: () => {
          navigate('/library');
          toast.info(`Loaded ${title}`);
        },
      });
    }

    for (const a of albums.slice(0, 25)) {
      list.push({
        id: `album.${a.title}`,
        label: a.title,
        hint: a.artist,
        group: 'Albums',
        icon: Music2,
        keywords: [a.artist],
        perform: () => navigate('/library'),
      });
    }

    for (const a of artists.slice(0, 25)) {
      list.push({
        id: `artist.${a.name}`,
        label: a.name,
        group: 'Artists',
        icon: Hash,
        keywords: ['musician', 'band'],
        perform: () => navigate('/library'),
      });
    }

    return list;
  }, [
    navigate,
    isPlaying,
    currentTrack,
    volume,
    pause,
    resume,
    next,
    previous,
    toggleShuffle,
    cycleRepeat,
    setVolume,
    cycleTheme,
    playlists,
    createPlaylist,
    tracks,
    albums,
    artists,
    toast,
  ]);

  const matches = useMemo<FuzzyMatch<CommandItem>[]>(() => {
    return fuzzySearch(
      items,
      query,
      (it) => {
        const parts = [it.label, it.hint ?? '', ...(it.keywords ?? [])];
        return parts.join(' ');
      },
      25,
    );
  }, [items, query]);

  const groups = useMemo(() => {
    const out: Record<string, Array<{ match: FuzzyMatch<CommandItem>; index: number }>> = {};
    matches.forEach((m, i) => {
      const g = m.item.group;
      if (!out[g]) out[g] = [];
      out[g]!.push({ match: m, index: i });
    });
    return out;
  }, [matches]);

  const onSelect = useCallback(
    (item: CommandItem) => {
      close();
      item.perform();
    },
    [close],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = matches[activeIndex];
      if (target) onSelect(target.item);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(matches.length - 1);
    }
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  if (!open) return null;

  const showRecents = query.trim() === '' && recents.length > 0;
  const showHistory = query.trim() === '' && history.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-testid="command-palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={close}
      />
      <FocusTrap active={open} initialFocus="first" restoreFocus>
        <div className="relative w-full max-w-3xl glass-heavy border border-zinc-800/60 rounded-2xl shadow-2xl ring-1 ring-white/5 overflow-hidden animate-scale-in flex">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <Search size={16} className="text-zinc-500 shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Type a command, search, or jump to…"
              aria-label="Command palette input"
              aria-controls="command-palette-list"
              aria-activedescendant={
                matches[activeIndex] ? `cmd-${matches[activeIndex].item.id}` : undefined
              }
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
              Esc
            </kbd>
          </div>

          <ul
            ref={listRef}
            id="command-palette-list"
            role="listbox"
            className="max-h-[55vh] overflow-y-auto py-2"
          >
            {matches.length === 0 ? (
              <li className="px-4 py-12 text-center text-sm text-zinc-500">
                No results for &quot;{query}&quot;
              </li>
            ) : (
              (Object.keys(groups) as Array<keyof typeof groups>).map((groupName) => (
                <li key={groupName} role="presentation">
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
                    {groupName}
                  </div>
                  <ul role="group">
                    {groups[groupName]!.map(({ match, index }) => {
                      const item = match.item;
                      const Icon = item.icon;
                      const isActive = index === activeIndex;
                      return (
                        <li
                          key={item.id}
                          id={`cmd-${item.id}`}
                          role="option"
                          aria-selected={isActive}
                          data-cmd-index={index}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => onSelect(item)}
                          className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm transition-colors ${
                            isActive
                              ? 'bg-brand-500/15 text-white'
                              : 'text-zinc-300 hover:bg-zinc-800/60'
                          }`}
                        >
                          <Icon
                            size={16}
                            className={isActive ? 'text-brand-300' : 'text-zinc-500'}
                            aria-hidden
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate">
                              {highlightMatches(item.label, match.matches).map((seg, i) => (
                                <span
                                  key={i}
                                  className={seg.highlighted ? 'text-brand-300 font-medium' : ''}
                                >
                                  {seg.text}
                                </span>
                              ))}
                            </div>
                            {item.hint && (
                              <div className="text-xs text-zinc-500 truncate">{item.hint}</div>
                            )}
                          </div>
                          <ArrowRight
                            size={12}
                            className={`shrink-0 ${isActive ? 'text-brand-300 opacity-100' : 'opacity-0'}`}
                            aria-hidden
                          />
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}

            {showRecents && (
              <li role="presentation" className="border-t border-zinc-800 mt-2 pt-2">
                <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
                  Recents
                </div>
                <ul role="group">
                  {recents.map((p) => (
                    <li
                      key={p}
                      role="option"
                      onClick={() => {
                        close();
                        navigate(p);
                      }}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer text-sm text-zinc-400 hover:bg-zinc-800/60"
                    >
                      <Compass size={14} aria-hidden />
                      <span className="truncate">{p}</span>
                    </li>
                  ))}
                </ul>
              </li>
            )}

            {showHistory && (
              <li role="presentation" className="border-t border-zinc-800 mt-2 pt-2">
                <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
                  Recently Played
                </div>
                <ul role="group">
                  {history.slice(0, 4).map((h) => (
                    <li
                      key={h.id}
                      role="option"
                      onClick={() => {
                        close();
                        navigate('/library');
                      }}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer text-sm text-zinc-400 hover:bg-zinc-800/60"
                    >
                      <Music size={14} aria-hidden />
                      <span className="truncate flex-1">{h.title}</span>
                      <span className="text-xs text-zinc-600 truncate max-w-[40%]">{h.artist}</span>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>

          <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="bg-zinc-800 px-1 rounded">↑</kbd>
                <kbd className="bg-zinc-800 px-1 rounded">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-zinc-800 px-1 rounded">↵</kbd>
                select
              </span>
            </div>
            <span>{matches.length} results</span>
          </div>
          <CommandPreview item={matches[activeIndex]?.item ?? null} />
        </div>
      </FocusTrap>
    </div>
  );
}
