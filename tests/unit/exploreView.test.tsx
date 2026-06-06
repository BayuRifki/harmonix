import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExploreView } from '@/features/explore/ExploreView';
import { useSourcesStore } from '@/stores/sourcesStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { installMockWindowApi } from '../setup';

interface Registration {
  id: string;
  name: string;
  enabled: boolean;
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
  authenticated: boolean;
}

function reg(overrides: Partial<Registration> & { id: string; name: string }): Registration {
  return {
    enabled: true,
    capabilities: {
      canSearch: true,
      canStream: true,
      canGetPlaylists: false,
      canGetLikedTracks: false,
      requiresAuth: false,
      supportsFileStreaming: false,
      supportsRemoteStreaming: true,
      supportsPlaylists: false,
    },
    authenticated: false,
    ...overrides,
  };
}

function renderWithRouter(): void {
  render(
    <MemoryRouter>
      <ExploreView />
    </MemoryRouter>,
  );
}

describe('ExploreView', () => {
  beforeEach(() => {
    installMockWindowApi();
    useSourcesStore.setState({ registrations: [], loading: false });
    useListeningHistoryStore.setState({ entries: [] });
  });

  it('shows the Explore heading', () => {
    renderWithRouter();
    expect(screen.getByRole('heading', { name: /Explore/i })).toBeInTheDocument();
  });

  it('renders the For You section with starter cards when no history', () => {
    renderWithRouter();
    expect(screen.getByTestId('explore-for-you')).toBeInTheDocument();
    expect(screen.getByText('Browse your Library')).toBeInTheDocument();
  });

  it('shows recently played tracks when history exists', () => {
    useListeningHistoryStore.setState({
      entries: [
        {
          id: 'e1',
          sourceId: 'e1',
          title: 'Played Song',
          artist: 'Test Artist',
          album: null,
          artworkUrl: null,
          source: 'spotify',
          durationMs: 1000,
          playedAt: Date.now(),
        },
      ],
    });
    renderWithRouter();
    expect(screen.getByText('Played Song')).toBeInTheDocument();
  });

  it('shows enabled source count badge', () => {
    useSourcesStore.setState({
      registrations: [
        reg({ id: 'spotify', name: 'Spotify' }),
        reg({ id: 'ytmusic', name: 'YouTube Music' }),
        reg({ id: 'local', name: 'Local', enabled: false }),
      ],
    });
    renderWithRouter();
    expect(screen.getByText(/2 sources ready/i)).toBeInTheDocument();
  });

  it('shows empty state with link to Settings when no sources enabled', () => {
    useSourcesStore.setState({
      registrations: [reg({ id: 'local', name: 'Local', enabled: false })],
    });
    renderWithRouter();
    expect(screen.getAllByText(/No sources enabled yet/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Open Settings/i)).toBeInTheDocument();
  });

  it('renders enabled source quick links', () => {
    useSourcesStore.setState({
      registrations: [
        reg({ id: 'spotify', name: 'Spotify' }),
        reg({ id: 'local', name: 'Local', enabled: false }),
      ],
    });
    renderWithRouter();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.queryByText('Local')).not.toBeInTheDocument();
  });
});
