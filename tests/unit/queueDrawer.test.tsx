import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueueDrawer } from '@/features/player/QueueDrawer';
import { usePlayerStore } from '@/stores/playerStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { useUiStore } from '@/stores/uiStore';
import { installMockWindowApi } from '../setup';
import type { Track } from '@/types/global';

function makeTrack(id: string, title: string, artist = 'Test Artist'): Track {
  return {
    id,
    sourceId: 'local',
    source: 'local',
    title,
    artists: [{ id: 'a1', source: 'local', name: artist }],
    album: {
      id: `alb-${id}`,
      source: 'local',
      title: `Album ${title}`,
      artists: [{ id: 'a1', source: 'local', name: artist }],
    },
    durationMs: 180000,
    artworkUrl: undefined,
    isPlayable: true,
  };
}

describe('QueueDrawer', () => {
  beforeEach(() => {
    installMockWindowApi();
    usePlayerStore.setState({
      queue: [],
      queueIndex: -1,
      currentTrack: null,
      isPlaying: false,
    });
    usePlaylistsStore.setState({ playlists: [], current: null });
    useUiStore.setState({ reducedMotion: true });
  });

  it('does not render when closed', () => {
    const { container } = render(<QueueDrawer open={false} onClose={() => {}} />);
    expect(container.querySelector('[data-testid="queue-drawer"]')).toBeNull();
  });

  it('renders the drawer with empty queue', () => {
    render(<QueueDrawer open onClose={() => {}} />);
    expect(screen.getByText('Queue is empty')).toBeInTheDocument();
  });

  it('shows the queue count and duration', () => {
    act(() => {
      usePlayerStore.setState({
        queue: [makeTrack('1', 'A'), makeTrack('2', 'B')],
        queueIndex: 0,
        currentTrack: makeTrack('1', 'A'),
      });
    });
    render(<QueueDrawer open onClose={() => {}} />);
    expect(screen.getByText(/2 tracks/)).toBeInTheDocument();
  });

  it('calls onClose when the X button is clicked', () => {
    let closed = false;
    render(
      <QueueDrawer
        open
        onClose={() => {
          closed = true;
        }}
      />,
    );
    act(() => {
      screen.getByLabelText('Close queue').click();
    });
    expect(closed).toBe(true);
  });

  it('filters the queue by search', () => {
    act(() => {
      usePlayerStore.setState({
        queue: [makeTrack('1', 'Alpha'), makeTrack('2', 'Beta')],
        queueIndex: -1,
      });
    });
    render(<QueueDrawer open onClose={() => {}} />);
    const input = screen.getByLabelText('Search queue');
    act(() => {
      input.focus();
    });
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        'Alpha',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('toggles selection mode and tracks selected tracks', () => {
    act(() => {
      usePlayerStore.setState({
        queue: [makeTrack('1', 'A'), makeTrack('2', 'B'), makeTrack('3', 'C')],
        queueIndex: -1,
      });
    });
    render(<QueueDrawer open onClose={() => {}} />);
    act(() => {
      screen.getByTestId('queue-selection-toggle').click();
    });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3);
  });

  it('highlights the currently playing track', () => {
    act(() => {
      usePlayerStore.setState({
        queue: [makeTrack('1', 'Current'), makeTrack('2', 'Next')],
        queueIndex: 0,
        currentTrack: makeTrack('1', 'Current'),
        isPlaying: true,
      });
    });
    render(<QueueDrawer open onClose={() => {}} />);
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
  });

  it('renders Save all button when queue is non-empty', () => {
    act(() => {
      usePlayerStore.setState({
        queue: [makeTrack('1', 'A')],
        queueIndex: 0,
        currentTrack: makeTrack('1', 'A'),
      });
    });
    render(<QueueDrawer open onClose={() => {}} />);
    expect(screen.getByText('Save all')).toBeInTheDocument();
  });
});
