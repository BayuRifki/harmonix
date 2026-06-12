import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollPosition {
  x: number;
  y: number;
}

const STORAGE_KEY = 'harmonix.scroll';
/**
 * Debounce window for `localStorage.setItem`. Scrolling fires the
 * `scroll` listener 60+ times/second; persisting on every event
 * blocks the main thread with synchronous JSON.stringify + disk
 * I/O. 200ms is fast enough that navigating away mid-debounce
 * still gets the latest position flushed (the effect cleanup
 * performs a final synchronous flush), and slow enough that
 * continuous scrolling only triggers ~5 writes/sec at peak.
 */
const SAVE_DEBOUNCE_MS = 200;

function getStoredPositions(): Record<string, ScrollPosition> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, ScrollPosition>;
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, ScrollPosition>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore quota errors
  }
}

export function useScrollRestoration(
  containerSelector: string = 'main, .content, [data-scroll-container], [role="main"]',
): void {
  const location = useLocation();
  const containerRef = useRef<HTMLElement | null>(null);
  const restoredRef = useRef(false);
  // The most recent scroll value observed for the current path.
  // Updated synchronously on every scroll event so we never lose a
  // sample; the actual `localStorage.setItem` is debounced.
  const pendingRef = useRef<ScrollPosition | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      const found = document.querySelector<HTMLElement>(containerSelector);
      if (found) containerRef.current = found;
    }
    if (!containerRef.current) return;

    const key = location.pathname + location.search;
    const positions = getStoredPositions();
    const pos = positions[key];

    if (pos && !restoredRef.current) {
      containerRef.current.scrollTop = pos.y;
      containerRef.current.scrollLeft = pos.x;
      restoredRef.current = true;
    }
  }, [location.pathname, location.search, containerSelector]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const key = location.pathname + location.search;

    const flush = (): void => {
      if (pendingRef.current) {
        const positions = getStoredPositions();
        positions[key] = pendingRef.current;
        savePositions(positions);
        pendingRef.current = null;
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onScroll = (): void => {
      pendingRef.current = { x: el.scrollLeft, y: el.scrollTop };
      if (timerRef.current !== null) return;
      timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    // Listen for pagehide (mobile-friendly) and beforeunload so the
    // final scroll position is persisted even if the debounce timer
    // hasn't fired yet.
    const onBeforeUnload = (): void => flush();
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onBeforeUnload);

    return () => {
      // Final synchronous flush on unmount / route change so we
      // never drop the most recent sample.
      flush();
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onBeforeUnload);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    restoredRef.current = false;
  }, [location.pathname, location.search]);
}
