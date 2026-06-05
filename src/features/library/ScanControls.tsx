import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';

export function ScanControls(): JSX.Element {
  const pickAndScan = useLibraryStore((s) => s.pickAndScan);
  const folders = useLibraryStore((s) => s.folders);
  const removeFolder = useLibraryStore((s) => s.removeFolder);
  const scanFolder = useLibraryStore((s) => s.scanFolder);
  const scanning = useLibraryStore((s) => s.scanning);
  const scanProgress = useLibraryStore((s) => s.scanProgress);

  const play = usePlayerStore.getState;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void pickAndScan()}
        disabled={scanning}
        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition"
      >
        {scanning ? 'Scanning…' : '+ Add Folder'}
      </button>

      {scanning && (
        <div className="text-xs text-zinc-400 max-w-xs text-right">
          <p className="truncate">{scanProgress.currentPath ?? 'Preparing…'}</p>
          <p className="text-zinc-500">{scanProgress.filesFound} files found</p>
        </div>
      )}

      {folders.length > 0 && (
        <div className="flex flex-col gap-1 mt-2 w-full max-w-xs">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs"
            >
              <span className="truncate text-zinc-300" title={folder.path}>
                {folder.path}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => void scanFolder(folder.path)}
                  disabled={scanning}
                  className="text-brand-400 hover:text-brand-300 px-1"
                  aria-label="Rescan"
                  title="Rescan"
                >
                  ↻
                </button>
                <button
                  type="button"
                  onClick={() => void removeFolder(folder.path)}
                  disabled={scanning}
                  className="text-zinc-500 hover:text-red-400 px-1"
                  aria-label="Remove"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {void play}
    </div>
  );
}
