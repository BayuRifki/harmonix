import { useEffect, useState } from 'react';

export function YtMusicDisclaimer(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const requires = await window.api.ytmusic.requiresDisclaimer();
        if (mounted && requires) {
          const t = await window.api.ytmusic.disclaimerText();
          if (mounted) {
            setText(t);
            setOpen(true);
          }
        }
      } catch (err) {
        console.error('[ytmusic] disclaimer check failed:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const accept = async (): Promise<void> => {
    setBusy(true);
    try {
      await window.api.ytmusic.acknowledgeDisclaimer();
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const decline = (): void => {
    window.close();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-red-900 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
            <span>⚠️</span> Unofficial Integration Notice
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            YouTube Music source must be acknowledged before use.
          </p>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
            {text}
          </pre>
        </div>
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={decline}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            disabled={busy}
          >
            Decline (Quit)
          </button>
          <button
            type="button"
            onClick={() => void accept()}
            disabled={busy}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'I Understand and Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
