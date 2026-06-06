import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

const { spawn: spawnMock } = vi.hoisted(() => ({
  spawn: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
  default: { spawn: spawnMock },
}));

const { checkAndUpdateYtDlp } = await import('../../electron/main/sources/ytmusic/ytdlp');

type FindResult = {
  path: string;
  version: string | null;
  available: boolean;
  error?: string;
};

function fakeFind(overrides: Partial<FindResult>): () => Promise<FindResult> {
  return async () => ({
    path: overrides.path ?? '/fake/yt-dlp',
    version: overrides.version ?? null,
    available: overrides.available ?? true,
    error: overrides.error,
  });
}

interface FakeProc extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
}

function makeFakeProc(): FakeProc {
  const proc = new EventEmitter() as FakeProc;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();
  return proc;
}

function queueProcs(count: number): FakeProc[] {
  const procs = Array.from({ length: count }, () => makeFakeProc());
  spawnMock.mockImplementation(() => procs.shift() ?? makeFakeProc());
  return procs;
}

function emit(proc: FakeProc, fn: (p: FakeProc) => void): void {
  setImmediate(() => fn(proc));
}

describe('checkAndUpdateYtDlp', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('returns ok:false when yt-dlp is not available', async () => {
    const r = await checkAndUpdateYtDlp(
      fakeFind({ available: false, path: '', version: null, error: 'not found' }),
    );

    expect(r.ok).toBe(false);
    expect(r.updated).toBe(false);
    expect(r.message).toContain('not found');
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('reports up-to-date when version unchanged after -U', async () => {
    const [updateProc, versionProc] = queueProcs(2);

    emit(updateProc, (p) => {
      p.emit('close', 0);
    });
    emit(versionProc, (p) => {
      p.stdout.emit('data', Buffer.from('2026.03.17\n'));
      p.emit('close', 0);
    });

    const r = await checkAndUpdateYtDlp(fakeFind({ version: '2026.03.17' }));

    expect(r.ok).toBe(true);
    expect(r.updated).toBe(false);
    expect(r.oldVersion).toBe('2026.03.17');
    expect(r.newVersion).toBe('2026.03.17');
    expect(r.message).toContain('up to date');
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it('reports updated:true with commit hint when version changes', async () => {
    const [updateProc, versionProc] = queueProcs(2);

    emit(updateProc, (p) => {
      p.emit('close', 0);
    });
    emit(versionProc, (p) => {
      p.stdout.emit('data', Buffer.from('2026.06.01\n'));
      p.emit('close', 0);
    });

    const r = await checkAndUpdateYtDlp(fakeFind({ version: '2026.03.17' }));

    expect(r.ok).toBe(true);
    expect(r.updated).toBe(true);
    expect(r.oldVersion).toBe('2026.03.17');
    expect(r.newVersion).toBe('2026.06.01');
    expect(r.message).toContain('Updated yt-dlp 2026.03.17 → 2026.06.01');
    expect(r.message).toContain('Commit the new resources/yt-dlp.exe');
  });

  it('returns ok:false with stderr when -U exits non-zero', async () => {
    const [updateProc, versionProc] = queueProcs(2);

    emit(updateProc, (p) => {
      p.stderr.emit('data', Buffer.from('network unreachable\n'));
      p.emit('close', 1);
    });
    emit(versionProc, (p) => {
      p.stdout.emit('data', Buffer.from('2026.03.17\n'));
      p.emit('close', 0);
    });

    const r = await checkAndUpdateYtDlp(fakeFind({ version: '2026.03.17' }));

    expect(r.ok).toBe(false);
    expect(r.updated).toBe(false);
    expect(r.message).toContain('exited with code 1');
    expect(r.message).toContain('network unreachable');
  });
});
