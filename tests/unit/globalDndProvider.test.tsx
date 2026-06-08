import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlobalDndProvider } from '@/components/dnd/GlobalDndProvider';

const mockInsertIntoQueue = vi.fn();
const mockAddTrack = vi.fn(() => Promise.resolve());
const mockSuccess = vi.fn();
const mockInfo = vi.fn();

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({ insertIntoQueue: mockInsertIntoQueue }),
    {
      getState: () => ({
        insertIntoQueue: mockInsertIntoQueue,
        queue: [],
      }),
    },
  ),
}));

vi.mock('@/stores/playlistsStore', () => ({
  usePlaylistsStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({ addTrack: mockAddTrack }),
    {
      getState: () => ({
        current: { id: 7, name: 'Test' },
        addTrack: mockAddTrack,
      }),
    },
  ),
}));

vi.mock('@/components/ui/toastStore', () => ({
  useToastStore: () => ({ success: mockSuccess, info: mockInfo, error: vi.fn() }),
}));

describe('GlobalDndProvider', () => {
  beforeEach(() => {
    mockInsertIntoQueue.mockClear();
    mockAddTrack.mockClear();
    mockSuccess.mockClear();
    mockInfo.mockClear();
  });

  it('renders children', () => {
    render(
      <GlobalDndProvider>
        <div data-testid="child">x</div>
      </GlobalDndProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('mounts with no side effects', () => {
    const { unmount } = render(
      <GlobalDndProvider>
        <span>noop</span>
      </GlobalDndProvider>,
    );
    unmount();
  });
});
