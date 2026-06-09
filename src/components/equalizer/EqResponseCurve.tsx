import { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio/engine';
import { useUiStore } from '@/stores/uiStore';
import { useEffectiveVisualizerQuality } from '@/hooks/useVisualizerQuality';
import {
  DEFAULT_F_MAX,
  DEFAULT_F_MIN,
  DEFAULT_SAMPLES,
  computeResponseCurve,
  dBSpectrumToCurve,
  easeInOutCubic,
  freqToX,
  gainToY,
  lerpGains,
} from '@/lib/audio/eqResponse';
import { EQ_BAND_FREQUENCIES } from '@/lib/audio/presets';

const FPS = 30;
const LOW_FPS = 20;
const FRAME_BUDGET = 1000 / FPS;
const LOW_FRAME_BUDGET = 1000 / LOW_FPS;
const ANIMATION_MS = 400;
const PADDING_X = 8;
const PADDING_Y = 8;
const FFT_SIZE = 256;
const PRE_EQ_FLOOR_DB = -90;
const PRE_EQ_TOP_DB = -10;

export interface EqResponseCurveProps {
  gains: number[];
  bandFrequencies?: readonly number[];
  minDb?: number;
  maxDb?: number;
  height?: number;
  active?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function EqResponseCurve({
  gains,
  bandFrequencies = EQ_BAND_FREQUENCIES,
  minDb = -12,
  maxDb = 12,
  height = 96,
  active = true,
  className = '',
  ariaLabel = 'Equalizer frequency response curve',
}: EqResponseCurveProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const { quality } = useEffectiveVisualizerQuality();
  const frameBudget = quality === 'low' ? LOW_FRAME_BUDGET : FRAME_BUDGET;
  const isOff = quality === 'off' || !active || reducedMotion;

  const preAnalyserRef = useRef<AnalyserNode | null>(null);
  const preDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Refs that the render loop reads. We intentionally avoid re-running
  // the effect on every gains change — instead, the loop interpolates
  // from `gainsFromRef` to `gainsToRef` over ANIMATION_MS, so a preset
  // change smoothly tweens the curve.
  const gainsFromRef = useRef<number[]>(gains.slice());
  const gainsToRef = useRef<number[]>(gains.slice());
  const animStartRef = useRef<number>(0);
  const animatingRef = useRef<boolean>(false);

  // Capture analyser + pre-EQ data into refs (no re-render needed).
  useEffect(() => {
    if (isOff) {
      preAnalyserRef.current = null;
      preDataRef.current = null;
      return undefined;
    }
    const analyser = audioEngine.getPreEqAnalyser(FFT_SIZE);
    preAnalyserRef.current = analyser;
    preDataRef.current = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    return () => {
      preAnalyserRef.current = null;
      preDataRef.current = null;
    };
  }, [isOff]);

  // Re-target animation when `gains` changes.
  useEffect(() => {
    if (isOff) {
      gainsFromRef.current = gains.slice();
      gainsToRef.current = gains.slice();
      animatingRef.current = false;
      return;
    }
    const previous = gainsToRef.current;
    const next = gains.slice();
    const changed = previous.length !== next.length || previous.some((v, i) => v !== next[i]);
    if (!changed) return;
    gainsFromRef.current = previous.slice();
    gainsToRef.current = next;
    animStartRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    animatingRef.current = true;
  }, [gains, isOff]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (isOff) return undefined;

    let ctx2d: CanvasRenderingContext2D | null = null;

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w <= 0 || h <= 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const c = canvas.getContext('2d');
      if (c) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx2d = c;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const handleVisibility = (): void => {
      if (document.hidden) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      } else if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const draw = (now: number): void => {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastFrameRef.current < frameBudget) return;
      lastFrameRef.current = now;

      if (!ctx2d) {
        ctx2d = canvas.getContext('2d');
        if (!ctx2d) return;
      }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w <= 0 || h <= 0) return;
      ctx2d.clearRect(0, 0, w, h);

      // Advance the gain animation.
      let displayedGains: number[];
      if (animatingRef.current) {
        const elapsed = now - animStartRef.current;
        const t = Math.max(0, Math.min(1, elapsed / ANIMATION_MS));
        const eased = easeInOutCubic(t);
        displayedGains = lerpGains(gainsFromRef.current, gainsToRef.current, eased);
        if (t >= 1) {
          animatingRef.current = false;
          gainsFromRef.current = gainsToRef.current.slice();
          displayedGains = gainsToRef.current.slice();
        }
      } else {
        displayedGains = gainsToRef.current;
      }

      const plotW = Math.max(0, w - PADDING_X * 2);
      const plotH = Math.max(0, h - PADDING_Y * 2);
      const samples = DEFAULT_SAMPLES;

      // Pre-EQ live spectrum (subtle background).
      const pre = preAnalyserRef.current;
      const preData = preDataRef.current;
      if (pre && preData) {
        try {
          pre.getByteFrequencyData(preData);
        } catch {
          // analyser torn down — ignore for this frame
        }
        const sampleRate = pre.context?.sampleRate ?? 48000;
        const spec = dBSpectrumToCurve(
          preData,
          sampleRate,
          samples,
          DEFAULT_F_MIN,
          DEFAULT_F_MAX,
          PRE_EQ_FLOOR_DB,
          PRE_EQ_TOP_DB,
        );
        ctx2d.lineWidth = 1;
        ctx2d.strokeStyle = 'rgba(161, 161, 170, 0.35)';
        ctx2d.beginPath();
        for (let i = 0; i < spec.length; i++) {
          const x =
            PADDING_X +
            freqToX(DEFAULT_F_MIN, DEFAULT_F_MIN, DEFAULT_F_MAX, plotW) +
            (i / Math.max(1, spec.length - 1)) * plotW;
          const y =
            PADDING_Y + gainToY(spec[i] ?? PRE_EQ_FLOOR_DB, PRE_EQ_FLOOR_DB, PRE_EQ_TOP_DB, plotH);
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
      }

      // 0 dB reference line.
      const yRef = PADDING_Y + gainToY(0, minDb, maxDb, plotH);
      ctx2d.strokeStyle = 'rgba(161, 161, 170, 0.5)';
      ctx2d.setLineDash([3, 3]);
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(PADDING_X, yRef);
      ctx2d.lineTo(PADDING_X + plotW, yRef);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      // EQ response curve (log-spaced).
      const curve = computeResponseCurve(
        bandFrequencies,
        displayedGains,
        samples,
        DEFAULT_F_MIN,
        DEFAULT_F_MAX,
      );
      const accent = getCssAccent();
      ctx2d.strokeStyle = accent;
      ctx2d.lineWidth = 2;
      ctx2d.lineJoin = 'round';
      ctx2d.beginPath();
      for (let i = 0; i < curve.length; i++) {
        const x = PADDING_X + (i / Math.max(1, curve.length - 1)) * plotW;
        const y = PADDING_Y + gainToY(curve[i] ?? 0, minDb, maxDb, plotH);
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();

      // Soft fill under the curve.
      ctx2d.lineWidth = 0;
      ctx2d.fillStyle = hexToRgba(accent, 0.12);
      ctx2d.beginPath();
      ctx2d.moveTo(PADDING_X, PADDING_Y + plotH);
      for (let i = 0; i < curve.length; i++) {
        const x = PADDING_X + (i / Math.max(1, curve.length - 1)) * plotW;
        const y = PADDING_Y + gainToY(curve[i] ?? 0, minDb, maxDb, plotH);
        ctx2d.lineTo(x, y);
      }
      ctx2d.lineTo(PADDING_X + plotW, PADDING_Y + plotH);
      ctx2d.closePath();
      ctx2d.fill();

      // Band center markers.
      ctx2d.fillStyle = accent;
      for (let i = 0; i < bandFrequencies.length; i++) {
        const f = bandFrequencies[i]!;
        const g = displayedGains[i] ?? 0;
        const x = PADDING_X + freqToX(f, DEFAULT_F_MIN, DEFAULT_F_MAX, plotW);
        const y = PADDING_Y + gainToY(g, minDb, maxDb, plotH);
        ctx2d.beginPath();
        ctx2d.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx2d.fill();
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOff, frameBudget, bandFrequencies, minDb, maxDb]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      data-testid="eq-response-curve"
      className={className}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  );
}

let _cachedAccent: string | null = null;
let _cachedAccentTime = 0;
const ACCENT_CACHE_MS = 500;

function getCssAccent(): string {
  const now = Date.now();
  if (_cachedAccent !== null && now - _cachedAccentTime < ACCENT_CACHE_MS) {
    return _cachedAccent;
  }
  if (typeof document === 'undefined') return 'rgb(236, 72, 153)';
  const v = document.documentElement.style.getPropertyValue('--accent').trim();
  let result: string;
  if (!v) {
    result = 'rgb(236, 72, 153)';
  } else if (v.startsWith('hsl')) {
    const m = v.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
    if (m) {
      result = hslToRgbString(Number(m[1]), Number(m[2]), Number(m[3]));
    } else {
      result = v;
    }
  } else {
    result = v;
  }
  _cachedAccent = result;
  _cachedAccentTime = now;
  return result;
}

function hslToRgbString(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number): number => {
    const c = ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c);
  };
  return `rgb(${f(0)}, ${f(8)}, ${f(4)})`;
}

function hexToRgba(color: string, alpha: number): string {
  const m = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (m) {
    return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
  }
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
  }
  return color;
}
