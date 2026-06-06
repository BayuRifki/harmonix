import { useState, useEffect, type ReactNode } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlayerBar } from '@/components/layout/PlayerBar';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { AudioReactiveBackground } from '@/components/layout/AudioReactiveBackground';
import { HomeView } from '@/features/home/HomeView';
import { SearchView } from '@/features/search/SearchView';
import { LibraryView } from '@/features/library/LibraryView';
import { PlaylistsView } from '@/features/playlist/PlaylistsView';
import { SettingsView } from '@/features/settings/SettingsView';
import { YtMusicDisclaimer } from '@/features/settings/YtMusicDisclaimer';
import { EqualizerView } from '@/features/equalizer/EqualizerView';
import { SourceView } from '@/features/source/SourceView';
import { MiniPlayerView } from '@/features/miniPlayer/MiniPlayerView';
import { NowPlayingView } from '@/features/nowPlaying/NowPlayingView';
import { useEqualizerStore } from '@/stores/equalizerStore';
import { useThemeStore } from '@/stores/themeStore';
import { useAdaptiveAccent } from '@/hooks/useAdaptiveAccent';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePlayerStateSync } from '@/hooks/usePlayerStateSync';
import { ToastContainer } from '@/components/ui/Toast';

function PageTransition({ children }: { children: ReactNode }): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function App(): JSX.Element {
  if (window.api?.miniPlayer?.isMini()) {
    return <MiniPlayerView />;
  }
  return <MainApp />;
}

function MainApp(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const eqLoad = useEqualizerStore((s) => s.load);
  const themeLoad = useThemeStore((s) => s.load);

  useAdaptiveAccent();
  useKeyboardShortcuts();
  usePlayerStateSync();

  useEffect(() => {
    themeLoad();
    void eqLoad();
  }, [themeLoad, eqLoad]);

  const isNowPlaying = location.pathname === '/now-playing';
  const isHome = location.pathname === '/';

  return (
    <div className="h-screen flex flex-col text-zinc-100">
      <YtMusicDisclaimer />
      {!isNowPlaying && <AnimatedBackground />}
      {isNowPlaying && <AudioReactiveBackground />}
      {isHome && <AudioReactiveBackground />}
      <div className="flex-1 flex overflow-hidden">
        {!isNowPlaying && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <PageTransition>
                    <HomeView />
                  </PageTransition>
                }
              />
              <Route
                path="/search"
                element={
                  <PageTransition>
                    <SearchView />
                  </PageTransition>
                }
              />
              <Route
                path="/library"
                element={
                  <PageTransition>
                    <LibraryView />
                  </PageTransition>
                }
              />
              <Route
                path="/playlists"
                element={
                  <PageTransition>
                    <PlaylistsView
                      selectedId={selectedPlaylistId}
                      onSelect={(id) => {
                        setSelectedPlaylistId(id);
                        if (id !== null) navigate('/playlists');
                      }}
                    />
                  </PageTransition>
                }
              />
              <Route
                path="/equalizer"
                element={
                  <PageTransition>
                    <EqualizerView />
                  </PageTransition>
                }
              />
              <Route
                path="/settings"
                element={
                  <PageTransition>
                    <SettingsView />
                  </PageTransition>
                }
              />
              <Route
                path="/source/:id"
                element={
                  <PageTransition>
                    <SourceView />
                  </PageTransition>
                }
              />
              <Route path="/now-playing" element={<NowPlayingView />} />
              <Route path="/mini" element={<MiniPlayerView />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
      {!isNowPlaying && <PlayerBar />}
      <ToastContainer />
    </div>
  );
}
