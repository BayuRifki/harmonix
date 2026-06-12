import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import {
  extractDominantColor,
  hslToString,
  buildPalette,
  interpolatePalette,
  paletteToCssVars,
  type AdaptivePalette,
  type HslColor,
} from '@/lib/colorExtractor';

const DEBOUNCE_MS = 150;
const INTERPOLATION_MS = 600;
const FALLBACK_LIGHT: HslColor = { h: 199, s: 89, l: 48 };
const FALLBACK_DARK: HslColor = { h: 2, s: 80, l: 48 };

function fallbackPaletteForTheme(): AdaptivePalette {
  const isLight =
    typeof document !== 'undefined' && document.documentElement.classList.contains('light');
  return buildPalette(isLight ? FALLBACK_DARK : FALLBACK_LIGHT);
}

function applyPalette(palette: AdaptivePalette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = paletteToCssVars(palette);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

function clearPalette(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const key of ['--accent', '--accent-hover', '--accent-vibrant', '--accent-muted']) {
    root.style.removeProperty(key);
  }
}

export function useAdaptiveAccent(): void {
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl);
  const lastUrlRef = useRef<string | null>(null);
  const currentPaletteRef = useRef<AdaptivePalette>(fallbackPaletteForTheme());
  const targetPaletteRef = useRef<AdaptivePalette | null>(null);
  const debounceRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const interpolationStartRef = useRef<number>(0);
  const interpolationFromRef = useRef<AdaptivePalette>(currentPaletteRef.current);
  const themeObserverRef = useRef<MutationObserver | null>(null);
  // Generation counter. Incremented on every artwork change so an
  // in-flight `extractDominantColor` call from an older artwork URL
  // can be discarded on the microtask it resolves, rather than
  // after it has already been awaited.
  const generationRef = useRef<number>(0);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const target = document.documentElement;
    let pending: number | null = null;
    const observer = new MutationObserver(() => {
      // Coalesce rapid class changes (e.g. theme toggle that flips
      // both `light` and `dark` in the same tick) into a single
      // applyPalette call. Without this, each class toggle does
      // 4 setProperty() calls synchronously.
      if (pending !== null) return;
      pending = window.setTimeout(() => {
        pending = null;
        if (lastUrlRef.current === null) {
          applyPalette(fallbackPaletteForTheme());
        }
      }, 16);
    });
    observer.observe(target, { attributes: true, attributeFilter: ['class'] });
    themeObserverRef.current = observer;
    return () => {
      observer.disconnect();
      themeObserverRef.current = null;
      if (pending !== null) {
        clearTimeout(pending);
        pending = null;
      }
    };
  }, []);

  useEffect(() => {
    if (artworkUrl === lastUrlRef.current) return undefined;
    lastUrlRef.current = artworkUrl ?? null;
    // Bump the generation so any in-flight extract from the
    // previous URL is dropped on resolve.
    const myGeneration = ++generationRef.current;

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!artworkUrl) {
      targetPaletteRef.current = null;
      const fallback = fallbackPaletteForTheme();
      startInterpolation(fallback);
      return undefined;
    }

    debounceRef.current = window.setTimeout(() => {
      void extractDominantColor(artworkUrl).then((color) => {
        // Drop stale results: if a newer artwork has been seen
        // since this fetch started, don't overwrite the palette.
        if (myGeneration !== generationRef.current) return;
        if (color) {
          const palette = buildPalette(color);
          targetPaletteRef.current = palette;
          startInterpolation(palette);
        } else {
          targetPaletteRef.current = null;
          startInterpolation(fallbackPaletteForTheme());
        }
      });
    }, DEBOUNCE_MS);

    return (): void => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkUrl]);

  function startInterpolation(target: AdaptivePalette): void {
    if (typeof window === 'undefined') return;
    interpolationFromRef.current = currentPaletteRef.current;
    interpolationStartRef.current = performance.now();
    targetPaletteRef.current = target;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const tick = (now: number): void => {
      const elapsed = now - interpolationStartRef.current;
      const t = Math.min(1, elapsed / INTERPOLATION_MS);
      const interp = interpolatePalette(interpolationFromRef.current, target, t);
      currentPaletteRef.current = interp;
      applyPalette(interp);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    return (): void => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      clearPalette();
    };
  }, []);
}

export function getCurrentAccentColor(): string {
  if (typeof document === 'undefined') return hslToString(FALLBACK_LIGHT);
  const v = document.documentElement.style.getPropertyValue('--accent');
  return v.trim() || hslToString(FALLBACK_LIGHT);
}

export function useReducedMotionPreference(): boolean {
  return useUiStore((s) => s.reducedMotion);
}
