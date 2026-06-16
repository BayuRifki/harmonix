import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DiscoverView } from '@/features/discover/DiscoverView';
import { useUiStore, flushUiPersist } from '@/stores/uiStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { useSessionStore } from '@/stores/sessionStore';
import { usePlayerStore } from '@/stores/playerStore';
import { installMockWindowApi } from '../setup';
import type { Track } from '@/types/global';

function wrap(ui: React.ReactNode): JSX.Element {
  return <MemoryRouter>{ui}</MemoryRouter>;
}

const t: Track = {
  id: 'ytmusic:current',
  source: 'ytmusic',
  sourceId: 'current',
  title: 'Current',
  artists: [{ id: 'a1', name: 'Artist', source: 'ytmusic' }],
  durationMs: 200000,
  isPlayable: true,
};

describe('DiscoverView', () => {
  beforeEach(() => {
    localStorage.clear();
    flushUiPersist();
    installMockWindowApi();
    useUiStore.setState({
      settingsCollapsedSections: {},
      settingsHintDismissed: false,
    });
    useSessionStore.setState({ recent: [] });
    useListeningHistoryStore.setState({ entries: [] });
    usePlayerStore.setState({ currentTrack: null });
  });

  it('renders the page header', async () => {
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByRole('heading', { level: 1, name: /Discover/i })).toBeInTheDocument();
  });

  it('shows the first-time hint when history and session are empty', async () => {
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByTestId('discover-hint')).toBeInTheDocument();
    expect(screen.getByText(/Play 2-3 tracks/i)).toBeInTheDocument();
  });

  it('hides the first-time hint when history is non-empty', async () => {
    useListeningHistoryStore.getState().add(t);
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.queryByTestId('discover-hint')).not.toBeInTheDocument();
  });

  it('hides the first-time hint when the user dismisses it', async () => {
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    // The button uses aria-label="Dismiss hint", so query by
    // the aria-label to find it (the visible "Got it" text is
    // not the accessible name).
    const button = screen.getByRole('button', { name: /Dismiss hint/i });
    await act(async () => {
      button.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(useUiStore.getState().settingsHintDismissed).toBe(true);
    await waitFor(() => {
      expect(screen.queryByTestId('discover-hint')).not.toBeInTheDocument();
    });
  });

  it('renders 3 row sections: Top picks, From history, By mood', async () => {
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    const rows = screen.getAllByTestId('recommendation-row');
    // Top picks + From history = 2
    // By mood = 5 (one per mood)
    expect(rows.length).toBe(7);
  });

  it('Top picks section has a different subtitle when no current track', async () => {
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    // The subtitle text says "Play a track" as a hint.
    expect(
      screen.getByText(/Play a track to get personalized recommendations/i),
    ).toBeInTheDocument();
  });

  it('Top picks section subtitle mentions current track when one is playing', async () => {
    usePlayerStore.setState({ currentTrack: t });
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText(/Based on "Current"/i)).toBeInTheDocument();
  });

  it('shows the empty-state message in Top Picks when no current track', async () => {
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    // The Top Picks hook's useEffect runs an async IIFE; wait
    // for the empty-state p tag to appear after loading=false.
    await waitFor(() => {
      expect(
        screen.getByText(/Start playing a track and recommendations will appear here/i),
      ).toBeInTheDocument();
    });
  });

  it('renders mood section chips only when the sample matches the section mood', async () => {
    // The installMockWindowApi default for sources.search returns
    // an empty list, so no tracks are loaded and the chips
    // should NOT appear (we don't have any sample to detect
    // mood from).
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.queryAllByTestId(/^mood-chip-/)).toHaveLength(0);
  });

  it('From history section shows history entries when present', async () => {
    useListeningHistoryStore.getState().add(t);
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText(/of 1 recent plays/i)).toBeInTheDocument();
  });

  it('"From history" shows empty state when history is empty', async () => {
    await act(async () => {
      render(wrap(<DiscoverView />));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText(/Listen to a few tracks to build your history/i)).toBeInTheDocument();
  });
});
