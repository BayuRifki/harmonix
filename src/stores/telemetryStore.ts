/**
 * Local telemetry system for Harmonix
 * Opt-in only, stored in local SQLite, never sent anywhere
 */

import { create } from 'zustand';

const TELEMETRY_MAX_EVENTS = 1000;
const TELEMETRY_FLUSH_INTERVAL_MS = 5000;

interface TelemetryEvent {
  id: number;
  timestamp: number;
  type: 'render' | 'interaction' | 'latency' | 'error' | 'navigation' | 'playback' | 'system';
  name: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error';
}

interface TelemetryState {
  enabled: boolean;
  events: TelemetryEvent[];
  pendingEvents: TelemetryEvent[];
  flushTimer: ReturnType<typeof setTimeout> | null;

  enable: () => void;
  disable: () => void;
  recordEvent: (event: Omit<TelemetryEvent, 'id' | 'timestamp'>) => void;
  recordRenderTime: (component: string, durationMs: number) => void;
  recordInteraction: (action: string, durationMs: number, metadata?: Record<string, unknown>) => void;
  recordLatency: (operation: string, durationMs: number, metadata?: Record<string, unknown>) => void;
  recordError: (error: Error | string, context?: string, metadata?: Record<string, unknown>) => void;
  recordNavigation: (from: string, to: string, durationMs: number) => void;
  recordPlayback: (action: string, metadata?: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  clear: () => void;
  getEvents: (limit?: number, type?: TelemetryEvent['type']) => TelemetryEvent[];
}

let eventCounter = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function generateEventId(): number {
  return ++eventCounter + Date.now();
}

function scheduleFlush(get: () => TelemetryState): void {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    const state = get();
    if (state.pendingEvents.length > 0) {
      await state.flush();
    }
  }, TELEMETRY_FLUSH_INTERVAL_MS);
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  enabled: false,
  events: [],
  pendingEvents: [],
  flushTimer: null,

  enable: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('harmonix.telemetry.enabled', 'true');
    }
    set({ enabled: true });
  },

  disable: () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('harmonix.telemetry.enabled', 'false');
    }
    set({ enabled: false, pendingEvents: [] });
  },

  recordEvent: (event) => {
    if (!get().enabled) return;

    const fullEvent: TelemetryEvent = {
      id: generateEventId(),
      timestamp: Date.now(),
      ...event,
    };

    set((state) => ({
      pendingEvents: [...state.pendingEvents, fullEvent].slice(-TELEMETRY_MAX_EVENTS),
      events: [...state.events, fullEvent].slice(-TELEMETRY_MAX_EVENTS),
    }));

    scheduleFlush(get);
  },

  recordRenderTime: (component, durationMs) => {
    get().recordEvent({
      type: 'render',
      name: `render:${component}`,
      durationMs,
      severity: durationMs > 16 ? 'warning' : 'info',
    });
  },

  recordInteraction: (action, durationMs, metadata) => {
    get().recordEvent({
      type: 'interaction',
      name: `interaction:${action}`,
      durationMs,
      metadata,
      severity: durationMs > 100 ? 'warning' : 'info',
    });
  },

  recordLatency: (operation, durationMs, metadata) => {
    get().recordEvent({
      type: 'latency',
      name: `latency:${operation}`,
      durationMs,
      metadata,
      severity: durationMs > 500 ? 'warning' : 'info',
    });
  },

  recordError: (error, context, metadata) => {
    get().recordEvent({
      type: 'error',
      name: `error:${context || 'unknown'}`,
      metadata: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...metadata,
      },
      severity: 'error',
    });
  },

  recordNavigation: (from, to, durationMs) => {
    get().recordEvent({
      type: 'navigation',
      name: `nav:${from}→${to}`,
      durationMs,
      severity: durationMs > 300 ? 'warning' : 'info',
    });
  },

  recordPlayback: (action, metadata) => {
    get().recordEvent({
      type: 'playback',
      name: `playback:${action}`,
      metadata,
      severity: 'info',
    });
  },

  flush: async () => {
    const { pendingEvents } = get();
    if (pendingEvents.length === 0) return;

    // In a real implementation, we'd save to a telemetry table
    // For now, just clear pending and keep in memory
    set({ pendingEvents: [] });
  },

  clear: () => {
    set({ events: [], pendingEvents: [] });
  },

  getEvents: (limit = 100, type) => {
    const { events } = get();
    let filtered = events;
    if (type) {
      filtered = events.filter((e) => e.type === type);
    }
    return filtered.slice(-limit);
  },
}));

export function initTelemetry(): void {
  // Initialize telemetry from persisted settings
  if (typeof localStorage !== 'undefined') {
    const enabled = localStorage.getItem('harmonix.telemetry.enabled') === 'true';
    if (enabled) {
      useTelemetryStore.getState().enable();
    }
  }
}
