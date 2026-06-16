import { useState, useEffect, Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlayerBar } from '@/components/layout/PlayerBar';
import { TopBar } from '@/components/layout/TopBar';
import { RightRail } from '@/components/layout/RightRail';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
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
import { TrackInsightsHost } from '@/features/trackInsights';
import { PlayerAnnouncer } from '@/components/a11y/PlayerAnnouncer';
import { QueueAnnouncer } from '@/components/a11y/QueueAnnouncer';
import { SkipToContent } from '@/components/a11y/SkipToContent';
import { RouteChangeIndicator } from '@/components/a11y/RouteLoader';
import { RouteFallback } from '@/components/a11y/RouteFallback';
import { KeyboardHelpOverlay } from '@/components/keyboard/KeyboardHelpOverlay';
import { GlobalDndProvider } from '@/components/dnd/GlobalDndProvider';

const HomeView = lazy(() =>
  import('@/features/home/HomeView').then((m) => ({ default: m.HomeView })),
);
const SearchView = lazy(() =>
  import('@/features/search/SearchView').then((m) => ({ default: m.SearchView })),
);
const ExploreView = lazy(() =>
  import('@/features/explore/ExploreView').then((m) => ({ default: m.ExploreView })),
);
const LibraryView = lazy(() =>
  import('@/features/library/LibraryView').then((m) => ({ default: m.LibraryView })),
);
const PlaylistsView = lazy(() =>
  import('@/features/playlist/PlaylistsView').then((m) => ({ default: m.PlaylistsView })),
);
const SettingsView = lazy(() =>
  import('@/features/settings/SettingsView').then((m) => ({ default: m.SettingsView })),
);
const YtMusicDisclaimer = lazy(() =>
  import('@/features/settings/YtMusicDisclaimer').then((m) => ({ default: m.YtMusicDisclaimer })),
);
const EqualizerView = lazy(() =>
  import('@/features/equalizer/EqualizerView').then((m) => ({ default: m.EqualizerView })),
);
const DiscoverView = lazy(() =>
  import('@/features/discover/DiscoverView').then((m) => ({ default: m.DiscoverView })),
);
const SourceView = lazy(() =>
  import('@/features/source/SourceView').then((m) => ({ default: m.SourceView })),
);
const MiniPlayerView = lazy(() =>
  import('@/features/miniPlayer/MiniPlayerView').then((m) => ({ default: m.MiniPlayerView })),
);
const NowPlayingView = lazy(() =>
  import('@/features/nowPlaying/NowPlayingView').then((m) => ({ default: m.NowPlayingView })),
);
const HistoryView = lazy(() =>
  import('@/features/history/HistoryView').then((m) => ({ default: m.HistoryView })),
);

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
    return (
      <ErrorBoundary>
        <MiniPlayerView />
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp(): JSX.Element {
  const navigate = useSafeNavigate();
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
        <div className="flex-1 overflow-hidden">
          <Routes location={location}>
            <Route path="/now-playing" element={<NowPlayingView />} />
          </Routes>
        </div>
        <ToastContainer />
        <CommandPalette />
        <KeyboardHelpOverlay />
        <TrackInsightsHost />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col text-zinc-100">
      <GlobalDndProvider>
        <SkipToContent />
        <PlayerAnnouncer />
        <QueueAnnouncer />
        <RouteChangeIndicator />
        <YtMusicDisclaimer />
        {showTopBar && <TopBar />}
        <div className="flex-1 flex min-h-0">
          <Sidebar />
          <main
            id="main-content"
            className="flex-1 min-h-0 overflow-y-auto min-w-0 pb-20 bg-[var(--bg-primary)]"
          >
            <AnimatePresence mode="wait" initial={false}>
              <Suspense fallback={<RouteFallback variant="page" />} key={location.pathname}>
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
                    path="/settings/*"
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
                    path="/discover"
                    element={
                      <PageTransition>
                        <DiscoverView />
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
                  <Route
                    path="/history"
                    element={
                      <PageTransition>
                        <HistoryView />
                      </PageTransition>
                    }
                  />
                  <Route path="/now-playing" element={<NowPlayingView />} />
                  <Route path="/mini" element={<MiniPlayerView />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </main>
          {showRightRail && <RightRail />}
        </div>
        <PlayerBar isHomePage={isHome} />
        <ToastContainer />
        <CommandPalette />
        <KeyboardHelpOverlay />
        <TrackInsightsHost />
      </GlobalDndProvider>
    </div>
  );
}
