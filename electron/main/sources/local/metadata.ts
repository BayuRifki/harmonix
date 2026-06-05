import { parseFile, selectCover } from 'music-metadata';
import { promises as fs } from 'node:fs';
import { join, extname } from 'node:path';
import { app } from 'electron';
import type { TrackInsert } from '../../db';
import { guessTitleFromFilename } from './scanner';

export interface ExtractionResult {
  track: TrackInsert;
  artworkWritten: boolean;
}

export async function extractMetadata(filePath: string): Promise<ExtractionResult> {
  const stat = await fs.stat(filePath);
  let metadata;
  try {
    metadata = await parseFile(filePath, { duration: true, skipCovers: false });
  } catch (err) {
    console.warn(`[metadata] Failed to parse ${filePath}:`, (err as Error).message);
    metadata = null;
  }

  const common = metadata?.common;
  const format = metadata?.format;

  const track: TrackInsert = {
    file_path: filePath,
    title: common?.title ?? guessTitleFromFilename(filePath),
    artist: common?.artist ?? null,
    album: common?.album ?? null,
    album_artist: common?.albumartist ?? null,
    genre: common?.genre?.[0] ?? null,
    year: common?.year ?? null,
    track_number: common?.track?.no ?? null,
    disc_number: common?.disk?.no ?? null,
    duration_ms: format?.duration ? Math.round(format.duration * 1000) : null,
    bitrate: format?.bitrate ? Math.round(format.bitrate) : null,
    sample_rate: format?.sampleRate ?? null,
    channels: format?.numberOfChannels ?? null,
    codec: format?.codec ?? null,
    container: format?.container ?? (extname(filePath).slice(1).toUpperCase() || null),
    file_size: stat.size,
    file_mtime: Math.floor(stat.mtimeMs),
    isrc: common?.isrc?.[0] ?? null,
  };

  let artworkWritten = false;
  const picture = common && selectCover(common.picture ?? undefined);
  if (picture && picture.data.length > 0) {
    try {
      const artworkDir = join(app.getPath('userData'), 'artwork');
      await fs.mkdir(artworkDir, { recursive: true });
      const ext = picture.format.split('/')[1] ?? 'jpg';
      const filename = `${hashString(filePath)}.${ext}`;
      const artworkPath = join(artworkDir, filename);
      await fs.writeFile(artworkPath, picture.data);
      track.artwork_path = artworkPath;
      artworkWritten = true;
    } catch (err) {
      console.warn(`[metadata] Cannot write artwork for ${filePath}:`, (err as Error).message);
    }
  }

  return { track, artworkWritten };
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
