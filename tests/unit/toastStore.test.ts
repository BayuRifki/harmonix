import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore } from '@/components/ui/toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast', () => {
    useToastStore.getState().success('Hello');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Hello');
    expect(useToastStore.getState().toasts[0].type).toBe('success');
  });

  it('removes a toast by id', () => {
    useToastStore.getState().info('X');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().remove(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('auto-removes after duration', () => {
    useToastStore.getState().error('Boom', 1000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1100);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('supports error/info/warning variants', () => {
    useToastStore.getState().error('e');
    useToastStore.getState().info('i');
    useToastStore.getState().warning('w');
    const types = useToastStore.getState().toasts.map((t) => t.type);
    expect(types).toEqual(['error', 'info', 'warning']);
  });

  it('uses default duration when none provided', () => {
    useToastStore.getState().success('a');
    const toast = useToastStore.getState().toasts[0];
    expect(toast.duration).toBe(4000);
  });
});
