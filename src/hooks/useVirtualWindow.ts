import { useEffect, useRef, useState, useCallback } from 'react';

export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
}

export interface UseVirtualWindowOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
}

interface UseVirtualWindowResult extends VirtualWindow {
  scrollRef: React.RefObject<HTMLDivElement>;
}

export function computeVirtualWindow(
  itemCount: number,
  itemHeight: number,
  scrollTop: number,
  viewportHeight: number,
  overscan: number,
): VirtualWindow {
  const totalHeight = itemCount * itemHeight;
  const firstVisible = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight);
  const startIndex = Math.max(0, firstVisible - overscan);
  const endIndex = Math.min(itemCount, firstVisible + visibleCount + overscan);
  const offsetY = startIndex * itemHeight;
  return { startIndex, endIndex, offsetY, totalHeight };
}

export function useVirtualWindow({
  itemCount,
  itemHeight,
  overscan = 5,
}: UseVirtualWindowOptions): UseVirtualWindowResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const handleScroll = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
    const ro = new ResizeObserver(() => {
      setViewportHeight(el.clientHeight);
    });
    ro.observe(el);
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const window = computeVirtualWindow(itemCount, itemHeight, scrollTop, viewportHeight, overscan);

  return {
    scrollRef,
    startIndex: window.startIndex,
    endIndex: window.endIndex,
    offsetY: window.offsetY,
    totalHeight: window.totalHeight,
  };
}
