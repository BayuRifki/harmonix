import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { getCrossfadeConfig, setCrossfadeConfig } from '@/lib/audio/crossfade';
import { useCrossfadeConfig, CrossfadeIndicator } from '@/components/player/CrossfadeIndicator';

describe('useCrossfadeConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    setCrossfadeConfig({ enabled: false, durationMs: 5000 });
  });

  it('returns the current config', () => {
    setCrossfadeConfig({ enabled: true, durationMs: 3000 });
    let captured: ReturnType<typeof getCrossfadeConfig> | null = null;
    function Probe(): null {
      captured = useCrossfadeConfig();
      return null;
    }
    render(<Probe />);
    expect(captured).not.toBeNull();
    expect(captured!.enabled).toBe(true);
    expect(captured!.durationMs).toBe(3000);
  });

  it('subscribes to config changes', () => {
    setCrossfadeConfig({ enabled: false, durationMs: 5000 });
    let captured: ReturnType<typeof getCrossfadeConfig> | null = null;
    function Probe(): null {
      captured = useCrossfadeConfig();
      return null;
    }
    render(<Probe />);
    expect(captured!.enabled).toBe(false);

    act(() => {
      setCrossfadeConfig({ enabled: true, durationMs: 8000 });
    });
    expect(captured!.enabled).toBe(true);
    expect(captured!.durationMs).toBe(8000);
  });
});

describe('CrossfadeIndicator', () => {
  beforeEach(() => {
    localStorage.clear();
    setCrossfadeConfig({ enabled: false, durationMs: 5000 });
  });

  it('renders nothing when crossfade is disabled', () => {
    const { container } = render(<CrossfadeIndicator durationMs={30000} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when duration is 0', () => {
    setCrossfadeConfig({ enabled: true, durationMs: 0 });
    const { container } = render(<CrossfadeIndicator durationMs={30000} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the indicator when enabled', () => {
    setCrossfadeConfig({ enabled: true, durationMs: 5000 });
    render(<CrossfadeIndicator durationMs={30000} />);
    expect(screen.getByTestId('crossfade-indicator')).toBeInTheDocument();
  });

  it('respects the durationMs prop to size the window', () => {
    setCrossfadeConfig({ enabled: true, durationMs: 3000 });
    render(<CrossfadeIndicator durationMs={30000} />);
    const el = screen.getByTestId('crossfade-indicator') as HTMLDivElement;
    expect(el.style.width).toBe('10%');
  });

  it('clamps the window to 40% max', () => {
    setCrossfadeConfig({ enabled: true, durationMs: 20000 });
    render(<CrossfadeIndicator durationMs={30000} />);
    const el = screen.getByTestId('crossfade-indicator') as HTMLDivElement;
    expect(el.style.width).toBe('40%');
  });
});
