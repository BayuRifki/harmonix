import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useMediaSession } from '@/hooks/useMediaSession';
import { usePlayerStore } from '@/stores/playerStore';
import { installMockWindowApi } from '../setup';

function Probe(): null {
  useMediaSession();
  return null;
}

describe('useMediaSession', () => {
  beforeEach(() => {
    installMockWindowApi();
    usePlayerStore.setState({ currentTrack: null, isPlaying: false, queue: [] });
  });

  it('handles missing mediaSession API gracefully', () => {
    const original = (navigator as unknown as { mediaSession?: unknown }).mediaSession;
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    expect(() => render(<Probe />)).not.toThrow();
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      writable: true,
      value: original,
    });
  });

  it('registers action handlers when mediaSession is available', () => {
    const handlers: Record<string, unknown> = {};
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      writable: true,
      value: {
        metadata: null,
        playbackState: 'none',
        setActionHandler: (action: string, handler: unknown): void => {
          handlers[action] = handler;
        },
      },
    });
    render(<Probe />);
    expect(handlers.play).toBeDefined();
    expect(handlers.pause).toBeDefined();
    expect(handlers.previoustrack).toBeDefined();
    expect(handlers.nexttrack).toBeDefined();
  });
});
