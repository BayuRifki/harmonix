import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  isAudioFile,
  guessTitleFromFilename,
  SUPPORTED_EXTENSIONS,
  scanFolder,
} from '../../electron/main/sources/local/scanner';

describe('scanner', () => {
  describe('isAudioFile', () => {
    it('returns true for supported audio extensions', () => {
      expect(isAudioFile('/path/to/song.mp3')).toBe(true);
      expect(isAudioFile('/path/to/song.FLAC')).toBe(true);
      expect(isAudioFile('/path/to/song.m4a')).toBe(true);
      expect(isAudioFile('/path/to/song.ogg')).toBe(true);
      expect(isAudioFile('/path/to/song.opus')).toBe(true);
      expect(isAudioFile('/path/to/song.wav')).toBe(true);
    });

    it('returns false for non-audio extensions', () => {
      expect(isAudioFile('/path/to/file.txt')).toBe(false);
      expect(isAudioFile('/path/to/image.jpg')).toBe(false);
      expect(isAudioFile('/path/to/video.mp4')).toBe(false);
      expect(isAudioFile('/path/to/doc.pdf')).toBe(false);
    });

    it('handles files with no extension', () => {
      expect(isAudioFile('/path/to/Makefile')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isAudioFile('/song.MP3')).toBe(true);
      expect(isAudioFile('/song.Mp3')).toBe(true);
    });
  });

  describe('guessTitleFromFilename', () => {
    it('strips extension and keeps filename', () => {
      expect(guessTitleFromFilename('/music/Artist - Track.mp3')).toBe('Artist - Track');
      expect(guessTitleFromFilename('song.flac')).toBe('song');
    });
  });

  describe('SUPPORTED_EXTENSIONS', () => {
    it('includes common audio formats', () => {
      expect(SUPPORTED_EXTENSIONS.has('.mp3')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.flac')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.m4a')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.ogg')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.opus')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.wav')).toBe(true);
    });
  });

  describe('scanFolder symlink-cycle safety', () => {
    let tmp: string;

    beforeEach(async () => {
      tmp = await fs.mkdtemp(join(tmpdir(), 'harmonix-scanner-'));
    });

    afterEach(async () => {
      await fs.rm(tmp, { recursive: true, force: true });
    });

    it('does not infinite-loop on a self-referencing symlink', async () => {
      // Create Music/ with a real audio file and a self-referencing
      // symlink Music/self -> Music. Without cycle detection the
      // scanner would recurse forever and crash with RangeError.
      const musicDir = join(tmp, 'Music');
      await fs.mkdir(musicDir, { recursive: true });
      await fs.writeFile(join(musicDir, 'song.mp3'), 'fake-mp3');
      // Note: symlink creation is a no-op on Windows without
      // developer mode; skip the test in that case.
      if (process.platform === 'win32') return;
      try {
        await fs.symlink(musicDir, join(musicDir, 'self'), 'dir');
      } catch {
        // symlink permission denied → just return; cycle test
        // would be ineffective without a real symlink.
        return;
      }
      const progressCalls: number[] = [];
      const files = await scanFolder(musicDir, {
        onProgress: (count) => progressCalls.push(count),
        // Hard cap to detect runaway recursion quickly if cycle
        // detection regresses.
        maxDirs: 1000,
      });
      // We should only find the one real file, not duplicates of
      // it from the symlinked subtree.
      expect(files.length).toBe(1);
      expect(files[0]?.path).toContain('song.mp3');
    });

    it('handles missing directory gracefully (returns empty)', async () => {
      const files = await scanFolder(join(tmp, 'does-not-exist'));
      expect(files).toEqual([]);
    });
  });
});
