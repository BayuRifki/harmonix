import { useState, useEffect, type ReactNode } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlayerBar } from '@/components/layout/PlayerBar';
import { TopBar } from '@/components/layout/TopBar';
import { RightRail } from '@/components/layout/RightRail';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { AudioReactiveBackground } from '@/components/layout/AudioReactiveBackground';
import { ArtworkBlurBackground } from '@/components/layout/ArtworkBlurBackground';
import { HomeView } from '@/features/home/HomeView';
import { SearchView } from '@/features/search/SearchView';
import { ExploreView } from '@/features/explore/ExploreView';
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
import { useUiStore } from '@/stores/uiStore';
import { useAdaptiveAccent } from '@/hooks/useAdaptiveAccent';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useMediaSession } from '@/hooks/useMediaSession';
import { usePlayerStateSync } from '@/hooks/usePlayerStateSync';
import { useFocusRestoration } from '@/hooks/useFocusRestoration';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { ToastContainer } from '@/components/ui/Toast';
import { CommandPalette } from '@/components/command/CommandPalette';
import { PlayerAnnouncer } from '@/components/a11y/PlayerAnnouncer';
import { SkipToContent } from '@/components/a11y/SkipToContent';
import { RouteChangeIndicator } from '@/components/a11y/RouteLoader';
import { KeyboardHelpOverlay } from '@/components/keyboard/KeyboardHelpOverlay';

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
  const uiLoad = useUiStore((s) => s.load);
  const pushRecent = useUiStore((s) => s.pushRecent);

  useAdaptiveAccent();
  useKeyboardShortcuts();
  useKeyboardNavigation();
  useMediaSession();
  usePlayerStateSync();
  useFocusRestoration();
  useScrollRestoration('main, [role="main"]');

  useEffect(() => {
    themeLoad();
    void eqLoad();
    uiLoad();
  }, [themeLoad, eqLoad, uiLoad]);

  useEffect(() => {
    pushRecent(location.pathname);
  }, [location.pathname, pushRecent]);

  const isNowPlaying = location.pathname === '/now-playing';
  const isHome = location.pathname === '/';
  const isSearch = location.pathname.startsWith('/search');
  const showRightRail = isHome || isSearch;
  const showTopBar = !isNowPlaying;

  if (isNowPlaying) {
    return (
      <div className="h-screen flex flex-col text-zinc-100">
        <SkipToContent />
        <PlayerAnnouncer />
        <YtMusicDisclaimer />
        <AudioReactiveBackground />
        <div className="flex-1 overflow-hidden">
          <Routes location={location}>
            <Route path="/now-playing" element={<NowPlayingView />} />
          </Routes>
        </div>
        <ToastContainer />
        <CommandPalette />
        <KeyboardHelpOverlay />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col text-zinc-100">
      <SkipToContent />
      <PlayerAnnouncer />
      <RouteChangeIndicator />
      <YtMusicDisclaimer />
      <AnimatedBackground />
      {isHome && <AudioReactiveBackground />}
      <ArtworkBlurBackground opacity={0.18} />
      {showTopBar && <TopBar />}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main id="main-content" className="flex-1 overflow-y-auto min-w-0">
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
              <Route
                path="/explore"
                element={
                  <PageTransition>
                    <ExploreView />
                  </PageTransition>
                }
              />
              <Route
                path="/favorites"
                element={
                  <PageTransition>
                    <LibraryView />
                  </PageTransition>
                }
              />
              <Route path="/now-playing" element={<NowPlayingView />} />
              <Route path="/mini" element={<MiniPlayerView />} />
            </Routes>
          </AnimatePresence>
        </main>
        {showRightRail && <RightRail />}
      </div>
      <PlayerBar />
      <ToastContainer />
      <CommandPalette />
      <KeyboardHelpOverlay />
    </div>
  );
}
