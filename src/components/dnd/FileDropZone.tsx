import { useDroppable } from '@dnd-kit/core';
import { type ReactNode } from 'react';
import { DND_TYPES, type FilesDragData } from '@/lib/dndData';

export interface FileDropZoneProps {
  children: ReactNode;
  className?: string;
  onFilesDrop?: (paths: string[]) => void;
}

export function FileDropZone({
  children,
  className = '',
  onFilesDrop,
}: FileDropZoneProps): JSX.Element {
  const data: FilesDragData = { type: DND_TYPES.FILES, filePaths: [] };
  const { setNodeRef, isOver, active } = useDroppable({
    id: 'file-drop-zone',
    data,
  });
  const activeData = active?.data.current;
  const isFileDrag =
    activeData?.type === DND_TYPES.FILES ||
    (typeof activeData === 'object' &&
      activeData !== null &&
      'files' in activeData &&
      Array.isArray((activeData as { files: unknown[] }).files));

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver && isFileDrag ? 'ring-2 ring-brand-400 bg-brand-500/10' : ''}`}
      data-testid="file-drop-zone"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length > 0) {
          e.preventDefault();
          const paths: string[] = [];
          for (let i = 0; i < e.dataTransfer.files.length; i++) {
            const f = e.dataTransfer.files.item(i);
            if (f && (f as File & { path?: string }).path) {
              paths.push((f as File & { path?: string }).path as string);
            }
          }
          if (paths.length > 0) {
            onFilesDrop?.(paths);
          }
        }
      }}
    >
      {children}
    </div>
  );
}
