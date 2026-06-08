import type { Track } from '@/types/global';

export const DND_TYPES = {
  TRACK: 'application/x-harmonix-track',
  QUEUE_ITEM: 'application/x-harmonix-queue',
  PLAYLIST: 'application/x-harmonix-playlist',
  SIDEBAR_NAV: 'application/x-harmonix-nav',
  FILES: 'application/x-harmonix-files',
} as const;

export type DndType = (typeof DND_TYPES)[keyof typeof DND_TYPES];

export interface TrackDragData {
  type: typeof DND_TYPES.TRACK;
  track: Track;
}

export interface QueueItemDragData {
  type: typeof DND_TYPES.QUEUE_ITEM;
  fromIndex: number;
  track: Track;
}

export interface PlaylistDragData {
  type: typeof DND_TYPES.PLAYLIST;
  playlistId: number;
  playlistName: string;
}

export interface NavDragData {
  type: typeof DND_TYPES.SIDEBAR_NAV;
  path: string;
  label: string;
}

export interface FilesDragData {
  type: typeof DND_TYPES.FILES;
  filePaths: string[];
}

export type DndData =
  | TrackDragData
  | QueueItemDragData
  | PlaylistDragData
  | NavDragData
  | FilesDragData;

export function parseDndData<T extends DndData = DndData>(
  raw: string | null | undefined,
): T | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
      return parsed as T;
    }
    return null;
  } catch {
    return null;
  }
}
