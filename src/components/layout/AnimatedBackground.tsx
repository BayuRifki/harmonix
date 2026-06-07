import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { audioEngine } from '@/lib/audio/engine';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const BREATH_PERIOD_MS = 8000;

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

function readAccent(): string {
  if (typeof document === 'undefined') return '236, 72, 153';
  const v = document.documentElement.style.getPropertyValue('--accent').trim();
  if (v.startsWith('hsl')) {
    const m = v.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
    if (m) return `${m[1]}, ${m[2]}%, ${m[3]}%`;
  }
  return v || '236, 72, 153';
}

export function AnimatedBackground(): JSX.Element {
  const reduced = useReducedMotion();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const userReducedMotion = useUiStore((s) => s.reducedMotion);
  const [accentHsl, setAccentHsl] = useState('236, 72, 153');
  const [bassPulse, setBassPulse] = useState(0);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const target = document.documentElement;
    const observer = new MutationObserver(() => setAccentHsl(readAccent()));
    observer.observe(target, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    setAccentHsl(readAccent());
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying || reduced || userReducedMotion) {
      setBassPulse(0);
      return undefined;
    }
    let raf: number | null = null;
    let lastBass = 0;
    const sample = (): void => {
      const gain = audioEngine.getGainNode();
      if (gain && 'createAnalyser' in (gain.context as AudioContext)) {
        try {
          const ctx = gain.context as AudioContext;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          gain.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < 4; i++) sum += data[i] ?? 0;
          const bass = sum / 4 / 255;
          lastBass = bass;
          analyser.disconnect();
        } catch {
          // ignore
        }
      }
      setBassPulse(lastBass);
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return (): void => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [isPlaying, reduced, userReducedMotion]);

  const breathSpeed =
    isPlaying && !reduced && !userReducedMotion
      ? `${BREATH_PERIOD_MS / 2}ms`
      : `${BREATH_PERIOD_MS * 2}ms`;

  const scale = isPlaying ? 1.02 + bassPulse * 0.04 : 1;

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 transition-[background,opacity] duration-700"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 20% 0%, hsla(${accentHsl}, 0.15), transparent 50%),
                          radial-gradient(ellipse 60% 50% at 80% 100%, hsla(${accentHsl}, 0.10), transparent 50%),
                          radial-gradient(ellipse 100% 60% at 50% 50%, hsla(${accentHsl}, 0.05), transparent 70%)`,
        }}
      />
      <div
        className={`absolute top-0 left-0 w-[60vw] h-[60vw] rounded-full blur-3xl ${
          reduced || userReducedMotion ? '' : 'animate-spin-very-slow'
        }`}
        style={{
          background: `conic-gradient(from 0deg, hsla(${accentHsl}, 0.4) 0%, hsla(${accentHsl}, 0.15) 50%, hsla(${accentHsl}, 0.4) 100%)`,
          transform: `translate(-25%, -25%) scale(${scale})`,
          transition: `transform ${breathSpeed} ease-in-out`,
        }}
      />
      <div
        className={`absolute bottom-0 right-0 w-[50vw] h-[50vw] rounded-full blur-3xl ${
          reduced || userReducedMotion ? '' : 'animate-spin-reverse-slow'
        }`}
        style={{
          background: `conic-gradient(from 180deg, hsla(${accentHsl}, 0.3) 0%, hsla(${accentHsl}, 0.08) 50%, hsla(${accentHsl}, 0.3) 100%)`,
          transform: `translate(20%, 20%) scale(${scale})`,
          transition: `transform ${breathSpeed} ease-in-out`,
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(ellipse, hsla(${accentHsl}, 0.08) 0%, transparent 70%)`,
          transform: `scale(${1 + bassPulse * 0.02})`,
          transition: 'transform 0.4s ease-out',
        }}
      />
    </div>
  );
}
