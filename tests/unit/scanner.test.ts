import { describe, it, expect } from 'vitest';
import { isAudioFile, guessTitleFromFilename, SUPPORTED_EXTENSIONS } from '../../electron/main/sources/local/scanner';

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
});
