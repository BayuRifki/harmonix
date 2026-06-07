import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useSourceHealth, HEALTH_DOT_COLORS } from '@/hooks/useSourceHealth';
import { useSourcesStore } from '@/stores/sourcesStore';
import { installMockWindowApi } from '../setup';

function Probe(): JSX.Element {
  const health = useSourceHealth();
  return (
    <ul>
      {Object.entries(health).map(([id, h]) => (
        <li key={id} data-status={h.status} data-testid={`health-${id}`}>
          {id}: {h.status}
        </li>
      ))}
    </ul>
  );
}

describe('useSourceHealth', () => {
  beforeEach(() => {
    installMockWindowApi();
    useSourcesStore.setState({ registrations: [], loading: false });
  });

  it('returns an empty map when no sources are enabled', () => {
    useSourcesStore.setState({ registrations: [] });
    render(<Probe />);
    expect(screen.queryByTestId(/^health-/)).toBeNull();
  });

  it('marks local source as healthy', async () => {
    useSourcesStore.setState({
      registrations: [
        {
          id: 'local',
          name: 'Local',
          capabilities: {
            canSearch: true,
            canStream: true,
            canGetPlaylists: false,
            canGetLikedTracks: false,
            requiresAuth: false,
            supportsFileStreaming: true,
            supportsRemoteStreaming: false,
            supportsPlaylists: false,
          },
          enabled: true,
          authenticated: false,
        },
      ],
    });
    render(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId('health-local')).toHaveAttribute('data-status', 'healthy');
    });
  });

  it('marks source as down when search fails', async () => {
    installMockWindowApi({
      sources: {
        search: async () => {
          throw new Error('network down');
        },
      },
    });
    useSourcesStore.setState({
      registrations: [
        {
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
          enabled: true,
          authenticated: false,
        },
      ],
    });
    render(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId('health-spotify')).toHaveAttribute('data-status', 'down');
    });
  });
});

describe('HEALTH_DOT_COLORS', () => {
  it('maps to known tailwind classes', () => {
    expect(HEALTH_DOT_COLORS.healthy).toMatch(/emerald|green/);
    expect(HEALTH_DOT_COLORS.degraded).toMatch(/amber|yellow/);
    expect(HEALTH_DOT_COLORS.down).toMatch(/red/);
    expect(HEALTH_DOT_COLORS.unknown).toMatch(/zinc/);
  });
});
