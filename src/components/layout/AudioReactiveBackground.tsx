import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/lib/audio/engine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  hue: number;
}

const PARTICLE_COUNT = 24;
const FFT_SIZE = 128;
const TARGET_FPS = 30;
const FRAME_BUDGET_MS = 1000 / TARGET_FPS;
const RING_COUNT = 3;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function AudioReactiveBackground(): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastFrameRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const [supported, setSupported] = useState<boolean>(true);
  const [deferred, setDeferred] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handle = window.setTimeout(() => setDeferred(false), 250);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (deferred) return undefined;
    if (typeof window === 'undefined') return undefined;
    const reduce = prefersReducedMotion();
    if (reduce) {
      setSupported(false);
      return undefined;
    }

    // Use the engine's shared post-gain analyser so we don't pay for
    // an independent FFT pass on every particle field. The refcount
    // is released when the effect tears down (or the background
    // unmounts), so an idle background costs nothing.
    const acquired = audioEngine.acquireSharedAnalyser(FFT_SIZE);
    if (!acquired) {
      setSupported(false);
      return undefined;
    }
    analyserRef.current = acquired.node;
    dataRef.current = acquired.data;

    return () => {
      audioEngine.releaseSharedAnalyser(FFT_SIZE);
      analyserRef.current = null;
      dataRef.current = null;
    };
  }, [deferred]);

  useEffect(() => {
    if (!supported || deferred) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return undefined;

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      baseRadius: 1 + Math.random() * 2,
      hue: 320 + Math.random() * 30,
    }));

    const draw = (now: number): void => {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastFrameRef.current < FRAME_BUDGET_MS) return;
      lastFrameRef.current = now;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx2d.clearRect(0, 0, w, h);

      let bass = 0;
      let mid = 0;
      let treble = 0;
      const data = dataRef.current;
      const analyser = analyserRef.current;
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        const bins = data.length;
        const bassEnd = Math.max(1, Math.floor(bins * 0.1));
        const midEnd = Math.max(bassEnd + 1, Math.floor(bins * 0.4));
        let sum = 0;
        for (let i = 0; i < bassEnd; i++) sum += data[i]!;
        bass = sum / bassEnd / 255;
        sum = 0;
        for (let i = bassEnd; i < midEnd; i++) sum += data[i]!;
        mid = sum / (midEnd - bassEnd) / 255;
        sum = 0;
        for (let i = midEnd; i < bins; i++) sum += data[i]!;
        treble = sum / (bins - midEnd) / 255;
      }

      const centerX = w / 2;
      const centerY = h / 2;
      phaseRef.current += 0.005 + bass * 0.01;

      ctx2d.globalCompositeOperation = 'lighter';
      for (let i = 0; i < RING_COUNT; i++) {
        const radius = Math.min(w, h) * 0.2 + i * 50 + Math.sin(phaseRef.current + i) * 20;
        const alpha = 0.04 + bass * 0.06;
        const gx = centerX + Math.cos(phaseRef.current * 1.3 + i) * 60;
        const gy = centerY + Math.sin(phaseRef.current * 0.8 + i) * 40;
        const gradient = ctx2d.createRadialGradient(gx, gy, 0, gx, gy, radius);
        gradient.addColorStop(0, `hsla(${330 + i * 10}, 80%, 60%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${300 - i * 10}, 80%, 55%, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'hsla(320, 70%, 50%, 0)');
        ctx2d.fillStyle = gradient;
        ctx2d.fillRect(0, 0, w, h);
      }

      const particles = particlesRef.current;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        else if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        else if (p.y > h) p.y = 0;

        const energy = bass * 0.7 + mid * 0.3;
        const r = p.baseRadius + energy * 5;
        const alpha = 0.3 + treble * 0.4;

        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx2d.fillStyle = `hsla(${p.hue}, 75%, 65%, ${alpha})`;
        ctx2d.fill();
      }
      ctx2d.globalCompositeOperation = 'source-over';
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
  }, [supported, deferred]);

  if (!supported || deferred) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none opacity-50"
    />
  );
}
