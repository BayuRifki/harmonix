import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { EqResponseCurve } from '@/components/equalizer/EqResponseCurve';
import { useUiStore } from '@/stores/uiStore';
import { useEqualizerStore } from '@/stores/equalizerStore';
import { FLAT_GAINS } from '@/lib/audio/presets';
import { installMockWindowApi } from '../setup';

installMockWindowApi();

const RAF_CALLBACKS: Array<() => void> = [];
let rafId = 0;

beforeEach(() => {
  RAF_CALLBACKS.length = 0;
  rafId = 0;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: (now: number) => void) => {
      RAF_CALLBACKS.push(() => cb(performance.now()));
      return ++rafId;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((_id: number) => undefined),
  );

  useUiStore.setState({ reducedMotion: false });
  useEqualizerStore.setState({
    builtinPresets: [],
    customPresets: [],
    activePreset: null,
    currentGains: [...FLAT_GAINS],
    loaded: true,
    error: null,
  });
});

describe('EqResponseCurve', () => {
  it('renders a canvas with role/aria-label and testid', () => {
    render(<EqResponseCurve gains={[...FLAT_GAINS]} />);
    const canvas = screen.getByTestId('eq-response-curve') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBeTruthy();
  });

  it('applies the height prop as a pixel style', () => {
    render(<EqResponseCurve gains={[...FLAT_GAINS]} height={120} />);
    const canvas = screen.getByTestId('eq-response-curve') as HTMLCanvasElement;
    expect(canvas.style.height).toBe('120px');
  });

  it('respects the reducedMotion preference (no draw loop)', () => {
    act(() => {
      useUiStore.setState({ reducedMotion: true });
    });
    render(<EqResponseCurve gains={[...FLAT_GAINS]} />);
    expect(screen.getByTestId('eq-response-curve')).toBeInTheDocument();
  });

  it('does not crash when active=false', () => {
    render(<EqResponseCurve gains={[...FLAT_GAINS]} active={false} />);
    expect(screen.getByTestId('eq-response-curve')).toBeInTheDocument();
  });

  it('respects a custom aria-label', () => {
    render(<EqResponseCurve gains={[...FLAT_GAINS]} ariaLabel="My curve" />);
    expect(screen.getByRole('img', { name: 'My curve' })).toBeInTheDocument();
  });

  it('starts a requestAnimationFrame loop when active', () => {
    render(<EqResponseCurve gains={[...FLAT_GAINS]} />);
    expect(RAF_CALLBACKS.length).toBeGreaterThan(0);
  });

  it('stays mounted and keeps drawing when gains change (preset switch)', () => {
    const { rerender } = render(<EqResponseCurve gains={[...FLAT_GAINS]} />);
    expect(RAF_CALLBACKS.length).toBeGreaterThan(0);
    rerender(<EqResponseCurve gains={[5, 4, 3, 2, 1, 0, -1, -2, -3, -4]} />);
    // The existing draw loop is still running and will read the new
    // animation target ref on its next frame. The canvas must still
    // be present (no crash / no unmount).
    expect(screen.getByTestId('eq-response-curve')).toBeInTheDocument();
    // Run any pending RAF callbacks to flush the re-render path.
    act(() => {
      RAF_CALLBACKS.forEach((cb) => cb());
    });
    expect(screen.getByTestId('eq-response-curve')).toBeInTheDocument();
  });

  it('does not re-target animation when gains are unchanged', () => {
    const { rerender } = render(<EqResponseCurve gains={[...FLAT_GAINS]} />);
    const before = RAF_CALLBACKS.length;
    rerender(<EqResponseCurve gains={[...FLAT_GAINS]} />);
    expect(RAF_CALLBACKS.length).toBe(before);
  });
});
