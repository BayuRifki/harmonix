import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSourcesStore } from '@/stores/sourcesStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { installMockWindowApi } from '../setup';

interface Registration {
  id: string;
  name: string;
  capabilities: {
    canSearch: boolean;
    canStream: boolean;
    canGetPlaylists: boolean;
    canGetLikedTracks: boolean;
    requiresAuth: boolean;
    supportsFileStreaming: boolean;
    supportsRemoteStreaming: boolean;
    supportsPlaylists: boolean;
  };
  enabled: boolean;
  authenticated: boolean;
}

function reg(overrides: Partial<Registration> & { id: string; name: string }): Registration {
  return {
    capabilities: {
      canSearch: false,
      canStream: false,
      canGetPlaylists: false,
      canGetLikedTracks: false,
      requiresAuth: false,
      supportsFileStreaming: false,
      supportsRemoteStreaming: false,
      supportsPlaylists: false,
    },
    enabled: true,
    authenticated: false,
    ...overrides,
  };
}

function renderWithRouter(): void {
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    useSourcesStore.setState({ registrations: [], loading: false });
    useLibraryStore.setState({
      stats: { trackCount: 0, albumCount: 0, artistCount: 0 },
    });
    usePlaylistsStore.setState({ playlists: [], current: null, loading: false });
  });

  it('shows the app name and version', () => {
    installMockWindowApi();
    renderWithRouter();
    expect(screen.getByText('Harmonix')).toBeInTheDocument();
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
  });

  it('renders all static nav items', () => {
    installMockWindowApi();
    renderWithRouter();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
    expect(screen.getByText('Equalizer')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders Your Playlists section with create button', () => {
    installMockWindowApi();
    renderWithRouter();
    expect(screen.getByText('Your Playlists')).toBeInTheDocument();
    expect(screen.getByLabelText('Create playlist')).toBeInTheDocument();
  });

  it('shows empty state for playlists when none exist', () => {
    installMockWindowApi();
    renderWithRouter();
    expect(screen.getByText(/No playlists yet/i)).toBeInTheDocument();
  });

  it('renders playlist cards with name and song count', () => {
    installMockWindowApi();
    usePlaylistsStore.setState({
      playlists: [
        {
          id: 1,
          name: 'Chill Vibes',
          trackCount: 32,
          description: null,
          created_at: 0,
          updated_at: 0,
        },
        {
          id: 2,
          name: 'Focus Flow',
          trackCount: 24,
          description: null,
          created_at: 0,
          updated_at: 0,
        },
      ],
    });
    renderWithRouter();
    expect(screen.getByText('Chill Vibes')).toBeInTheDocument();
    expect(screen.getByText('32 songs')).toBeInTheDocument();
    expect(screen.getByText('Focus Flow')).toBeInTheDocument();
    expect(screen.getByText('24 songs')).toBeInTheDocument();
  });

  it('does not render per-source sub-nav (Sources section removed)', () => {
    installMockWindowApi();
    useSourcesStore.setState({
      registrations: [
        reg({
          id: 'spotify',
          name: 'Spotify',
          capabilities: {
            canSearch: true,
            canStream: true,
            canGetPlaylists: true,
            canGetLikedTracks: true,
            requiresAuth: true,
            supportsFileStreaming: false,
            supportsRemoteStreaming: true,
            supportsPlaylists: true,
          },
        }),
      ],
    });
    renderWithRouter();
    expect(screen.queryByRole('heading', { name: /^Sources$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Sources$/i)).not.toBeInTheDocument();
  });

  it('shows enabled source count in footer', () => {
    installMockWindowApi();
    useSourcesStore.setState({
      registrations: [
        reg({ id: 'spotify', name: 'Spotify', enabled: true }),
        reg({ id: 'local', name: 'Local', enabled: false }),
      ],
    });
    renderWithRouter();
    expect(screen.getByText(/1 sources/)).toBeInTheDocument();
  });
});
