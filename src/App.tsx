import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlayerBar } from '@/components/layout/PlayerBar';
import { HomeView } from '@/features/home/HomeView';
import { SearchView } from '@/features/search/SearchView';
import { LibraryView } from '@/features/library/LibraryView';
import { PlaylistsView } from '@/features/playlist/PlaylistsView';
import { SettingsView } from '@/features/settings/SettingsView';
import { YtMusicDisclaimer } from '@/features/settings/YtMusicDisclaimer';
import { EqualizerView } from '@/features/equalizer/EqualizerView';
import { SourceView } from '@/features/source/SourceView';
import { MiniPlayerView } from '@/features/miniPlayer/MiniPlayerView';
import { useEqualizerStore } from '@/stores/equalizerStore';
import { useThemeStore } from '@/stores/themeStore';
import { useAdaptiveAccent } from '@/hooks/useAdaptiveAccent';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePlayerStateSync } from '@/hooks/usePlayerStateSync';
import { ToastContainer } from '@/components/ui/Toast';

export default function App(): JSX.Element {
  if (window.api?.miniPlayer?.isMini()) {
    return <MiniPlayerView />;
  }
  return <MainApp />;
}

function MainApp(): JSX.Element {
  const navigate = useNavigate();
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

  return (
    <div className="h-screen flex flex-col bg-black text-zinc-100">
      <YtMusicDisclaimer />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/search" element={<SearchView />} />
            <Route path="/library" element={<LibraryView />} />
            <Route
              path="/playlists"
              element={
                <PlaylistsView
                  selectedId={selectedPlaylistId}
                  onSelect={(id) => {
                    setSelectedPlaylistId(id);
                    if (id !== null) navigate('/playlists');
                  }}
                />
              }
            />
            <Route path="/equalizer" element={<EqualizerView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/source/:id" element={<SourceView />} />
            <Route path="/mini" element={<MiniPlayerView />} />
          </Routes>
        </main>
      </div>
      <PlayerBar />
      <ToastContainer />
    </div>
  );
}
