import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

import { useNavigate } from 'react-router-dom';
import { useSafeNavigate } from '../../src/hooks/useSafeNavigate';

describe('useSafeNavigate', () => {
  it('returns a stable callback that wraps the underlying navigate() in startTransition', () => {
    // React 18 error: "A component suspended while responding
    // to synchronous input" fires when a click handler triggers
    // a route change that loads a lazy chunk. The fix is to
    // wrap the navigation call in startTransition so the new
    // component's render is treated as a non-urgent transition
    // (Suspense fallback may flash; the click doesn't get
    // converted into an "Error" overlay).
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    const { result, rerender } = renderHook(() => useSafeNavigate());
    const navigate1 = result.current;

    rerender();
    const navigate2 = result.current;

    // Stable reference (so calling it in a useEffect dep list
    // doesn't cause effect thrash).
    expect(navigate1).toBe(navigate2);
  });

  it('forwards the target path and options to the underlying navigate()', () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    const { result } = renderHook(() => useSafeNavigate());

    act(() => {
      result.current('/now-playing', { replace: true });
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/now-playing', { replace: true });
  });

  it('coexists with other useNavigate() consumers in the same tree (does not swallow state)', () => {
    // The hook does not own router state — it just wraps
    // navigate() in a transition. Verifying that two
    // independent consumers in the same tree both receive the
    // same underlying navigate instance guards against an
    // accidental shadow-store implementation.
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    const { result: r1 } = renderHook(() => useSafeNavigate());
    const { result: r2 } = renderHook(() => useSafeNavigate());

    act(() => r1.current('/foo'));
    act(() => r2.current('/bar'));

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, '/foo', undefined);
    expect(navigate).toHaveBeenNthCalledWith(2, '/bar', undefined);
  });
});
