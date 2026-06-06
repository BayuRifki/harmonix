import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const handler = (e: MediaQueryListEvent): void => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export function AnimatedBackground(): JSX.Element {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(236, 72, 153, 0.15), transparent 50%), ' +
            'radial-gradient(ellipse 60% 50% at 80% 100%, rgba(249, 168, 212, 0.10), transparent 50%), ' +
            'radial-gradient(ellipse 100% 60% at 50% 50%, rgba(244, 114, 182, 0.05), transparent 70%)',
        }}
      />
      <div
        className={`absolute -top-1/2 -left-1/4 w-[50vw] h-[50vw] rounded-full blur-3xl opacity-15 ${
          reduced ? '' : 'animate-spin-very-slow'
        }`}
        style={{
          background: 'conic-gradient(from 0deg, #ec4899 0%, #f472b6 50%, #ec4899 100%)',
        }}
      />
      <div
        className={`absolute -bottom-1/2 -right-1/4 w-[40vw] h-[40vw] rounded-full blur-3xl opacity-10 ${
          reduced ? '' : 'animate-spin-reverse-slow'
        }`}
        style={{
          background: 'conic-gradient(from 180deg, #f9a8d4 0%, #ec4899 50%, #f9a8d4 100%)',
        }}
      />
    </div>
  );
}
