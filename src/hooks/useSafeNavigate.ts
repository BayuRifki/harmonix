import { useCallback } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { startTransition } from 'react';

/**
 * `useNavigate()` wrapped so route changes triggered from sync
 * event handlers don't trip React 18's "A component suspended
 * while responding to synchronous input" warning.
 *
 * Background: `App.tsx` lazy-loads every route (`React.lazy(() =>
 * import(...))`). When the user clicks something that calls
 * `navigate('/now-playing')`, the new route chunk starts
 * loading synchronously inside the click handler. React 18 sees
 * the in-flight Suspense boundary and reports the warning. The
 * fix per the React docs is to wrap the state update in
 * `startTransition`, which tells React "this update is
 * non-urgent — it's OK to keep the old UI on screen while the
 * new one loads".
 *
 * Usage: swap `const navigate = useNavigate()` for
 * `const navigate = useSafeNavigate()`. The returned function
 * has the same signature as `useNavigate`, so all existing
 * call-sites (`navigate('/foo')`, `navigate('/bar', { replace: true })`,
 * `navigate(-1)`, …) work without changes.
 */
export function useSafeNavigate(): (to: To, options?: NavigateOptions) => void {
  const navigate = useNavigate();
  return useCallback(
    (to, options) => {
      startTransition(() => {
        navigate(to, options);
      });
    },
    [navigate],
  );
}
