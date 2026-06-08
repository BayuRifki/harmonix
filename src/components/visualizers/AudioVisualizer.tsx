import { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio/engine';
import { useUiStore } from '@/stores/uiStore';
import { useEffectiveVisualizerQuality } from '@/hooks/useVisualizerQuality';

export interface AudioAnalyserHandle {
  analyser: AnalyserNode | null;
  data: Uint8Array<ArrayBuffer> | null;
}

const FPS = 30;
const LOW_FPS = 20;
const FRAME_BUDGET = 1000 / FPS;
const LOW_FRAME_BUDGET = 1000 / LOW_FPS;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function useAudioAnalyser(active: boolean, fftSize: number = 128): AudioAnalyserHandle {
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
      analyser.fftSize = fftSize;
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
  }, [active, fftSize]);

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
  const { quality } = useEffectiveVisualizerQuality();
  const frameBudget = quality === 'low' ? LOW_FRAME_BUDGET : FRAME_BUDGET;
  const isOff = quality === 'off' || !active || reducedMotion;
  const { analyser, data } = useAudioAnalyser(!isOff);
  const barCount = Math.max(4, Math.min(64, bars));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (isOff) return undefined;

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

    let ctx2d: CanvasRenderingContext2D | null = null;

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
      ctx2d.clearRect(0, 0, w, h);

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
        ctx2d.fillStyle = accent;
        ctx2d.beginPath();
        if (typeof (ctx2d as CanvasRenderingContext2D).roundRect === 'function') {
          (ctx2d as CanvasRenderingContext2D).roundRect(
            x,
            y,
            drawWidth,
            barHeight,
            Math.min(2, drawWidth / 2),
          );
        } else {
          ctx2d.rect(x, y, drawWidth, barHeight);
        }
        ctx2d.fill();
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
  }, [isOff, analyser, data, barCount, color, frameBudget]);

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
  const { quality } = useEffectiveVisualizerQuality();
  const frameBudget = quality === 'low' ? LOW_FRAME_BUDGET : FRAME_BUDGET;
  const isOff = quality === 'off' || !active || reducedMotion;
  const { analyser, data } = useAudioAnalyser(!isOff);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (isOff) return undefined;

    let ctx2d: CanvasRenderingContext2D | null = null;

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d = null;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (now: number): void => {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastFrameRef.current < frameBudget) return;
      lastFrameRef.current = now;

      if (!ctx2d) {
        ctx2d = canvas.getContext('2d');
        if (!ctx2d) return;
      }
      ctx2d.clearRect(0, 0, size, size);

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

      ctx2d.strokeStyle = accent;
      ctx2d.lineWidth = 2;
      ctx2d.globalAlpha = 0.85;
      ctx2d.beginPath();
      for (let i = 0; i <= points; i++) {
        const idx = i % points;
        const r = pointsArr[idx] ?? baseRadius;
        const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.closePath();
      ctx2d.stroke();

      ctx2d.globalAlpha = 0.2;
      ctx2d.lineWidth = 6;
      ctx2d.beginPath();
      for (let i = 0; i <= points; i++) {
        const idx = i % points;
        const r = (pointsArr[idx] ?? baseRadius) + (1 + mid * 4);
        const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.closePath();
      ctx2d.stroke();
      ctx2d.globalAlpha = 1;
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
  }, [isOff, analyser, data, size, color, frameBudget]);

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

export interface ParticleFieldProps {
  count?: number;
  active?: boolean;
  className?: string;
  color?: string;
  ariaLabel?: string;
}

export function ParticleField({
  count = 36,
  active = true,
  className = '',
  color,
  ariaLabel = 'Audio particle field',
}: ParticleFieldProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; r: number; phase: number }>
  >([]);
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const { quality } = useEffectiveVisualizerQuality();
  const frameBudget = quality === 'low' ? LOW_FRAME_BUDGET : FRAME_BUDGET;
  const isOff = quality === 'off' || !active || reducedMotion;
  const { analyser, data } = useAudioAnalyser(!isOff);
  const particleCount = Math.max(8, Math.min(80, count));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (isOff) return undefined;

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particlesRef.current.length === 0) {
        particlesRef.current = Array.from({ length: particleCount }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: 1 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
        }));
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let ctx2d: CanvasRenderingContext2D | null = null;

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
      ctx2d.clearRect(0, 0, w, h);
      const accent = color ?? getCssAccent();
      const parts = particlesRef.current;
      let bass = 0;
      let treble = 0;
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        const bassEnd = Math.max(1, Math.floor(data.length * 0.15));
        for (let i = 0; i < bassEnd; i++) sum += data[i] ?? 0;
        bass = sum / bassEnd / 255;
        sum = 0;
        const trebleStart = Math.floor(data.length * 0.6);
        for (let i = trebleStart; i < data.length; i++) sum += data[i] ?? 0;
        treble = sum / Math.max(1, data.length - trebleStart) / 255;
      }
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (!p) continue;
        p.phase += 0.02 + treble * 0.04;
        p.vx += Math.cos(p.phase) * 0.04 * (0.5 + bass);
        p.vy += Math.sin(p.phase) * 0.04 * (0.5 + bass);
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        else if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        else if (p.y > h) p.y = 0;
        const r = p.r + bass * 3;
        ctx2d.globalAlpha = 0.4 + bass * 0.5;
        ctx2d.fillStyle = accent;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.globalAlpha = 1;
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
  }, [isOff, analyser, data, color, frameBudget, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      data-testid="particle-field"
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

export interface StereoOscilloscopeProps {
  height?: number;
  active?: boolean;
  className?: string;
  color?: string;
  ariaLabel?: string;
}

export function StereoOscilloscope({
  height = 80,
  active = true,
  className = '',
  color,
  ariaLabel = 'Audio oscilloscope',
}: StereoOscilloscopeProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const { quality } = useEffectiveVisualizerQuality();
  const frameBudget = quality === 'low' ? LOW_FRAME_BUDGET : FRAME_BUDGET;
  const isOff = quality === 'off' || !active || reducedMotion;
  const { analyser, data } = useAudioAnalyser(!isOff, 512);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (isOff) return undefined;

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

    let ctx2d: CanvasRenderingContext2D | null = null;

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
      ctx2d.clearRect(0, 0, w, h);
      const accent = color ?? getCssAccent();
      const midY = h / 2;
      ctx2d.lineWidth = 1.5;
      ctx2d.strokeStyle = accent;
      ctx2d.globalAlpha = 0.9;

      if (analyser && data) {
        analyser.getByteTimeDomainData(data);
        const len = data.length;
        const half = Math.floor(len / 2);
        ctx2d.beginPath();
        for (let i = 0; i <= half; i++) {
          const v = (data[i] ?? 128) / 128 - 1;
          const x = (i / half) * w;
          const y = midY + v * (h * 0.4);
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
        ctx2d.globalAlpha = 0.45;
        ctx2d.beginPath();
        for (let i = 0; i <= len - half; i++) {
          const v = (data[half + i] ?? 128) / 128 - 1;
          const x = (i / (len - half)) * w;
          const y = midY + v * (h * 0.4);
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
      } else {
        ctx2d.globalAlpha = 0.4;
        ctx2d.beginPath();
        ctx2d.moveTo(0, midY);
        ctx2d.lineTo(w, midY);
        ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;
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
  }, [isOff, analyser, data, color, frameBudget]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      data-testid="stereo-oscilloscope"
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
