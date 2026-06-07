import { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio/engine';
import { useUiStore } from '@/stores/uiStore';

export interface AudioAnalyserHandle {
  analyser: AnalyserNode | null;
  data: Uint8Array<ArrayBuffer> | null;
}

const FPS = 30;
const FRAME_BUDGET = 1000 / FPS;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function useAudioAnalyser(active: boolean): AudioAnalyserHandle {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    if (typeof window === 'undefined') return undefined;
    if (prefersReducedMotion()) return undefined;

    const gain = audioEngine.getGainNode();
    if (!gain || !('createAnalyser' in (gain.context as AudioContext))) return undefined;

    const ctx = gain.context as AudioContext;
    try {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      gain.connect(analyser);
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) {
      console.warn('[AudioAnalyser] init failed:', err);
      return undefined;
    }

    return () => {
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch {
          // ignore
        }
        analyserRef.current = null;
      }
      dataRef.current = null;
    };
  }, [active]);

  return { analyser: analyserRef.current, data: dataRef.current };
}

export interface FrequencyBarsProps {
  bars?: number;
  height?: number;
  active?: boolean;
  className?: string;
  color?: string;
  ariaLabel?: string;
}

export function FrequencyBars({
  bars = 16,
  height = 18,
  active = true,
  className = '',
  color,
  ariaLabel = 'Audio frequency visualizer',
}: FrequencyBarsProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const { analyser, data } = useAudioAnalyser(active && !reducedMotion);
  const barCount = Math.max(4, Math.min(64, bars));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (!active || reducedMotion) return undefined;

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (now: number): void => {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastFrameRef.current < FRAME_BUDGET) return;
      lastFrameRef.current = now;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const barWidth = w / barCount;
      const gap = Math.max(1, barWidth * 0.2);
      const drawWidth = barWidth - gap;
      const accent = color ?? getCssAccent();
      const values: number[] = new Array(barCount).fill(0.2);

      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / barCount));
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += data[i * step + j] ?? 0;
          }
          values[i] = sum / step / 255;
        }
      }

      for (let i = 0; i < barCount; i++) {
        const v = Math.max(0.04, values[i] ?? 0.04);
        const barHeight = Math.max(2, v * h);
        const x = i * barWidth + gap / 2;
        const y = (h - barHeight) / 2;
        ctx.fillStyle = accent;
        ctx.beginPath();
        if (typeof (ctx as CanvasRenderingContext2D).roundRect === 'function') {
          (ctx as CanvasRenderingContext2D).roundRect(
            x,
            y,
            drawWidth,
            barHeight,
            Math.min(2, drawWidth / 2),
          );
        } else {
          ctx.rect(x, y, drawWidth, barHeight);
        }
        ctx.fill();
      }
    };

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
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [active, reducedMotion, analyser, data, barCount, color]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      data-testid="frequency-bars"
      className={className}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  );
}

export interface WaveformRingProps {
  size?: number;
  active?: boolean;
  className?: string;
  color?: string;
  ariaLabel?: string;
}

export function WaveformRing({
  size = 320,
  active = true,
  className = '',
  color,
  ariaLabel = 'Audio waveform ring',
}: WaveformRingProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const { analyser, data } = useAudioAnalyser(active && !reducedMotion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (!active || reducedMotion) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = (now: number): void => {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastFrameRef.current < FRAME_BUDGET) return;
      lastFrameRef.current = now;

      const c = canvas.getContext('2d');
      if (!c) return;
      c.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = size * 0.32;
      const accent = color ?? getCssAccent();

      let bass = 0;
      let mid = 0;
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        const bins = data.length;
        const bassEnd = Math.max(1, Math.floor(bins * 0.1));
        const midEnd = Math.max(bassEnd + 1, Math.floor(bins * 0.4));
        let sum = 0;
        for (let i = 0; i < bassEnd; i++) sum += data[i] ?? 0;
        bass = sum / bassEnd / 255;
        sum = 0;
        for (let i = bassEnd; i < midEnd; i++) sum += data[i] ?? 0;
        mid = sum / (midEnd - bassEnd) / 255;
      }

      phaseRef.current += 0.01 + bass * 0.02;
      const points = 96;
      const pointsArr: number[] = new Array(points);
      for (let i = 0; i < points; i++) {
        let amp = 0.4;
        if (analyser && data) {
          const idx = Math.floor((i / points) * data.length);
          amp = (data[idx] ?? 0) / 255;
        }
        const noise = Math.sin(phaseRef.current * 4 + i * 0.3) * 0.1;
        pointsArr[i] = baseRadius + amp * size * 0.08 + noise * 4;
      }

      c.strokeStyle = accent;
      c.lineWidth = 2;
      c.globalAlpha = 0.85;
      c.beginPath();
      for (let i = 0; i <= points; i++) {
        const idx = i % points;
        const r = pointsArr[idx] ?? baseRadius;
        const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.stroke();

      c.globalAlpha = 0.2;
      c.lineWidth = 6;
      c.beginPath();
      for (let i = 0; i <= points; i++) {
        const idx = i % points;
        const r = (pointsArr[idx] ?? baseRadius) + (1 + mid * 4);
        const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.stroke();
      c.globalAlpha = 1;
    };

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
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [active, reducedMotion, analyser, data, size, color]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      data-testid="waveform-ring"
      className={className}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}

function getCssAccent(): string {
  if (typeof document === 'undefined') return 'rgb(236, 72, 153)';
  const v = document.documentElement.style.getPropertyValue('--accent').trim();
  if (!v) return 'rgb(236, 72, 153)';
  if (v.startsWith('hsl')) {
    const m = v.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
    if (m) {
      const h = Number(m[1]);
      const s = Number(m[2]);
      const l = Number(m[3]);
      return hslToRgbString(h, s, l);
    }
  }
  return v;
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
