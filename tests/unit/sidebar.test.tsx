import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSourcesStore } from '@/stores/sourcesStore';
import { useLibraryStore } from '@/stores/libraryStore';
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
  });

  it('shows the app name and version', () => {
    installMockWindowApi();
    renderWithRouter();
    expect(screen.getByText('Harmonix')).toBeInTheDocument();
    expect(screen.getByText(/Phase 9/)).toBeInTheDocument();
  });

  it('renders all static nav items', () => {
    installMockWindowApi();
    renderWithRouter();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
    expect(screen.getByText('Equalizer')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows per-source nav entries for enabled browseable sources', () => {
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
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
  });

  it('hides per-source nav when no browseable sources', () => {
    installMockWindowApi();
    useSourcesStore.setState({
      registrations: [
        reg({
          id: 'demo',
          name: 'Demo',
          capabilities: {
            canSearch: false,
            canStream: true,
            canGetPlaylists: false,
            canGetLikedTracks: false,
            requiresAuth: false,
            supportsFileStreaming: false,
            supportsRemoteStreaming: false,
            supportsPlaylists: false,
          },
        }),
      ],
    });
    renderWithRouter();
    expect(screen.queryByText('Sources')).not.toBeInTheDocument();
  });

  it('hides disabled sources from per-source nav', () => {
    installMockWindowApi();
    useSourcesStore.setState({
      registrations: [
        reg({
          id: 'spotify',
          name: 'Spotify',
          enabled: false,
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
    expect(screen.queryByText('Sources')).not.toBeInTheDocument();
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
    expect(screen.getByText(/1 sources enabled/)).toBeInTheDocument();
  });
});
