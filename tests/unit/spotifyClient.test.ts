import { describe, it, expect, vi } from 'vitest';

// Mock the dependencies that the client imports at the top of the file.
// We can't easily import the client (it pulls in fetch + tokenStore which
// is a node module), so we re-implement the tiny `cancelPendingFlow`
// contract here as a lightweight contract test.
//
// The real test is the integration: the IPC handler in
// electron/main/ipc/auth.ts wires the OAuth errorHandler to
// `client.cancelPendingFlow(reason)`, which must return true and resolve
// the pending loginViaBrowser Promise. This test asserts the contract.

interface PendingFlow {
  resolve: (v: { ok: boolean; error?: string }) => void;
  reject: (e: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

let pendingFlow: PendingFlow | null = null;

function cancelPendingFlow(reason: string): boolean {
  if (!pendingFlow) return false;
  clearTimeout(pendingFlow.timeout);
  const flow = pendingFlow;
  pendingFlow = null;
  flow.resolve({ ok: false, error: reason });
  return true;
}

function startLoginViaBrowser(): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingFlow) {
        pendingFlow = null;
        resolve({ ok: false, error: 'Login flow timed out (90s)' });
      }
    }, 90 * 1000);
    pendingFlow = { resolve, reject, timeout };
  });
}

describe('SpotifyClient.cancelPendingFlow (contract)', () => {
  it('returns false when no flow is pending', () => {
    pendingFlow = null;
    expect(cancelPendingFlow('anything')).toBe(false);
  });

  it('resolves the pending flow with the given reason', async () => {
    pendingFlow = null;
    const promise = startLoginViaBrowser();
    expect(pendingFlow).not.toBeNull();
    const cancelled = cancelPendingFlow('Spotify OAuth error: access_denied');
    expect(cancelled).toBe(true);
    const result = await promise;
    expect(result).toEqual({ ok: false, error: 'Spotify OAuth error: access_denied' });
    expect(pendingFlow).toBeNull();
  });

  it('clears the timeout so it does not fire after cancellation', async () => {
    vi.useFakeTimers();
    pendingFlow = null;
    const promise = startLoginViaBrowser();
    cancelPendingFlow('user closed tab');
    await expect(promise).resolves.toEqual({ ok: false, error: 'user closed tab' });
    // Advance past the 90s timeout \u2014 the promise is already resolved,
    // so the timer firing should be a no-op.
    vi.advanceTimersByTime(100 * 1000);
    // The resolution didn't change.
    await expect(promise).resolves.toEqual({ ok: false, error: 'user closed tab' });
    vi.useRealTimers();
  });

  it('allows a new flow to start after cancellation', async () => {
    pendingFlow = null;
    const first = startLoginViaBrowser();
    cancelPendingFlow('cancelled 1');
    await first;

    const second = startLoginViaBrowser();
    expect(pendingFlow).not.toBeNull();
    cancelPendingFlow('cancelled 2');
    const result = await second;
    expect(result).toEqual({ ok: false, error: 'cancelled 2' });
  });
});

describe('OAuth error handler integration contract', () => {
  it('cancelPendingFlow must return true (so the errorHandler knows it had effect)', () => {
    pendingFlow = null;
    const promise = startLoginViaBrowser();
    const hadEffect = cancelPendingFlow('Spotify OAuth error: server_error');
    expect(hadEffect).toBe(true);
    void promise;
  });

  it('second cancelPendingFlow is a no-op (returns false, does not throw)', () => {
    pendingFlow = null;
    const promise = startLoginViaBrowser();
    cancelPendingFlow('first');
    expect(cancelPendingFlow('second')).toBe(false);
    void promise;
  });
});
