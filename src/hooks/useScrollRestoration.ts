import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollPosition {
  x: number;
  y: number;
}

const STORAGE_KEY = 'harmonix.scroll';

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

    const onScroll = (): void => {
      const positions = getStoredPositions();
      positions[key] = { x: el.scrollLeft, y: el.scrollTop };
      savePositions(positions);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [location.pathname, location.search]);

  useEffect(() => {
    restoredRef.current = false;
  }, [location.pathname, location.search]);
}
