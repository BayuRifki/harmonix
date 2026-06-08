import { type ReactNode } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useToastStore } from '@/components/ui/toastStore';
import { DND_TYPES, parseDndData, type TrackDragData, type FilesDragData } from '@/lib/dndData';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { usePlayerStore } from '@/stores/playerStore';

export interface GlobalDndProviderProps {
  children: ReactNode;
}

export function GlobalDndProvider({ children }: GlobalDndProviderProps): JSX.Element {
  const toast = useToastStore();
  const addTrack = usePlaylistsStore((s) => s.addTrack);
  const insertIntoQueue = usePlayerStore((s) => s.insertIntoQueue);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e;
    if (!over) return;
    const overData = over.data.current as
      | { type?: string; playlistId?: number; playlistName?: string }
      | undefined;
    const activeData = active.data.current as
      | { type?: string; track?: TrackDragData['track']; files?: string[] }
      | undefined;
    if (!overData || !activeData) return;

    if (
      overData.type === DND_TYPES.PLAYLIST &&
      activeData.type === DND_TYPES.TRACK &&
      activeData.track
    ) {
      const track = activeData.track;
      const detail = usePlaylistsStore.getState().current;
      if (detail && detail.id === overData.playlistId) {
        void addTrack(track)
          .then(() => {
            toast.success(
              `Added "${track.title}" to ${overData.playlistName ?? 'playlist'}`,
              4000,
              { artworkUrl: track.artworkUrl ?? track.album?.artworkUrl },
            );
          })
          .catch((err: unknown) => {
            toast.error(`Failed to add: ${(err as Error).message}`);
          });
      } else {
        toast.info(`Open "${overData.playlistName}" to add tracks via drag-drop (coming soon)`);
      }
    } else if (overData.type === DND_TYPES.QUEUE_ITEM || over.id === 'queue-end') {
      const trackData = parseDndData<TrackDragData>(JSON.stringify(activeData));
      if (trackData?.track) {
        const state = usePlayerStore.getState();
        insertIntoQueue(trackData.track, state.queue.length);
        toast.success(`Queued "${trackData.track.title}"`);
      }
    } else if (activeData.type === DND_TYPES.FILES) {
      const f = activeData as unknown as FilesDragData;
      if (f.filePaths && f.filePaths.length > 0) {
        toast.info(`${f.filePaths.length} file(s) dropped`);
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
