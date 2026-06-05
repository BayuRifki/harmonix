import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { extractDominantColor, hslToString } from '@/lib/colorExtractor';

const DEBOUNCE_MS = 250;
const FALLBACK_LIGHT = 'hsl(199, 89%, 48%)';
const FALLBACK_DARK = 'hsl(2, 80%, 48%)';

function fallbackForTheme(): string {
  if (typeof document === 'undefined') return FALLBACK_LIGHT;
  return document.documentElement.classList.contains('light') ? FALLBACK_DARK : FALLBACK_LIGHT;
}

function applyAccent(cssColor: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--accent', cssColor);
  root.style.setProperty('--accent-hover', cssColor);
}

export function useAdaptiveAccent(): void {
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl);
  const lastUrlRef = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const themeObserverRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      if (lastUrlRef.current === null) {
        applyAccent(fallbackForTheme());
      }
    });
    observer.observe(target, { attributes: true, attributeFilter: ['class'] });
    themeObserverRef.current = observer;
    return () => {
      observer.disconnect();
      themeObserverRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (artworkUrl === lastUrlRef.current) return undefined;
    lastUrlRef.current = artworkUrl ?? null;

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!artworkUrl) {
      applyAccent(fallbackForTheme());
      return undefined;
    }

    debounceRef.current = window.setTimeout(() => {
      void extractDominantColor(artworkUrl).then((color) => {
        if (lastUrlRef.current !== artworkUrl) return;
        applyAccent(color ? hslToString(color) : fallbackForTheme());
      });
    }, DEBOUNCE_MS);

    return (): void => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [artworkUrl]);
}
