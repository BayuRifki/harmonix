import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
import { useEqualizerStore } from '@/stores/equalizerStore';
import { useThemeStore } from '@/stores/themeStore';

export default function App(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const isPlaylistsRoute = location.pathname === '/playlists';
  const eqLoad = useEqualizerStore((s) => s.load);
  const themeLoad = useThemeStore((s) => s.load);

  useEffect(() => {
    themeLoad();
    void eqLoad();
  }, [themeLoad, eqLoad]);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
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
          </Routes>
        </main>
      </div>
      {isPlaylistsRoute && null}
      <PlayerBar />
    </div>
  );
}
