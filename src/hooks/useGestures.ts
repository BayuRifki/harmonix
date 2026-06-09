import { useEffect, useRef } from 'react';
import { useUiStore } from '@/stores/uiStore';

export type GestureKind =
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'pinch-in'
  | 'pinch-out'
  | 'double-tap';

export interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  onDoubleTap?: () => void;
}

export interface UseGesturesOptions extends GestureHandlers {
  enabled?: boolean;
  swipeThreshold?: number;
  doubleTapMs?: number;
  pinchThreshold?: number;
  targetRef?: React.RefObject<HTMLElement | null>;
}

const DEFAULT_SWIPE = 50;
const DEFAULT_DOUBLE_TAP = 320;
const DEFAULT_PINCH = 0.1;

function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useGestures(options: UseGesturesOptions = {}): void {
  const gesturesEnabled = useUiStore((s) => s.gesturesEnabled);
  const userEnabled = options.enabled ?? true;
  const effective = userEnabled && gesturesEnabled;
  const swipeThreshold = options.swipeThreshold ?? DEFAULT_SWIPE;
  const doubleTapMs = options.doubleTapMs ?? DEFAULT_DOUBLE_TAP;
  const pinchThreshold = options.pinchThreshold ?? DEFAULT_PINCH;
  const startRef = useRef<{ x: number; y: number; t: number; touches: Touch[] } | null>(null);
  const lastTapRef = useRef<number>(0);
  const gestureStartDistRef = useRef<number | null>(null);
  const targetRef = useRef<EventTarget | null>(null);
  useEffect(() => {
    if (!effective) return undefined;
    if (typeof window === 'undefined') return undefined;
    const target = options.targetRef?.current ?? window;
    targetRef.current = target;

    const onTouchStart = (e: TouchEvent): void => {
      if (isInteractiveTarget(e.target)) return;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (!t) return;
        startRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), touches: [t] };
      } else if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (!t0 || !t1) return;
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        gestureStartDistRef.current = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e: TouchEvent): void => {
      if (e.touches.length === 2 && gestureStartDistRef.current !== null) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (!t0 || !t1) return;
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        const dist = Math.hypot(dx, dy);
        const start = gestureStartDistRef.current;
        if (start > 0) {
          const ratio = dist / start;
          if (Math.abs(ratio - 1) > pinchThreshold) {
            if (ratio > 1) options.onPinchOut?.();
            else options.onPinchIn?.();
            gestureStartDistRef.current = dist;
          }
        }
      }
    };

    const onTouchEnd = (e: TouchEvent): void => {
      const start = startRef.current;
      startRef.current = null;
      gestureStartDistRef.current = null;
      if (!start || e.touches.length > 0) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX < swipeThreshold && absY < swipeThreshold) {
        const now = Date.now();
        if (now - lastTapRef.current < doubleTapMs) {
          lastTapRef.current = 0;
          options.onDoubleTap?.();
        } else {
          lastTapRef.current = now;
        }
        return;
      }
      if (absX > absY) {
        if (dx > 0) options.onSwipeRight?.();
        else options.onSwipeLeft?.();
      } else {
        if (dy > 0) options.onSwipeDown?.();
        else options.onSwipeUp?.();
      }
    };

    const onWheel = (e: WheelEvent): void => {
      if (isInteractiveTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaY) < 10) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (e.deltaX > 50) options.onSwipeRight?.();
        else if (e.deltaX < -50) options.onSwipeLeft?.();
      }
    };

    target.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
    target.addEventListener('touchmove', onTouchMove as EventListener, { passive: true });
    target.addEventListener('touchend', onTouchEnd as EventListener, { passive: true });
    target.addEventListener('wheel', onWheel as EventListener, { passive: true });

    return () => {
      targetRef.current?.removeEventListener('touchstart', onTouchStart as EventListener);
      targetRef.current?.removeEventListener('touchmove', onTouchMove as EventListener);
      targetRef.current?.removeEventListener('touchend', onTouchEnd as EventListener);
      targetRef.current?.removeEventListener('wheel', onWheel as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective, swipeThreshold, doubleTapMs, pinchThreshold]);
}
