import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerBar } from '@/components/layout/PlayerBar';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { useUiStore } from '@/stores/uiStore';

beforeEach(() => {
  usePlayerStore.setState({
    currentTrack: {
      id: '1',
      title: 'Song',
      artists: [{ name: 'Artist' }],
      source: 'local',
      durationMs: 180_000,
    } as never,
    isPlaying: false,
    volume: 0.5,
    queue: [],
    queueIndex: -1,
    error: null,
    positionMs: 0,
    durationMs: 180_000,
    shuffle: false,
    repeat: 'off',
  });
  useSourcesStore.setState({
    registrations: [
      { id: 'local', name: 'Local', capabilities: {} as never, enabled: true, authenticated: false },
    ],
  });
  useUiStore.setState({
    playerBarPinned: false,
    queueDrawerOpen: false,
  });
});

describe('PlayerBar', () => {
  it('renders transport controls on home page', () => {
    render(
      <MemoryRouter>
        <PlayerBar />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Previous track')).toBeInTheDocument();
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Next track')).toBeInTheDocument();
  });
});
