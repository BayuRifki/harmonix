import { useEffect } from 'react';
import { Disc3 } from 'lucide-react';
import { HeroPlayer } from '@/features/home/HeroPlayer';
import { useSourcesStore } from '@/stores/sourcesStore';
import { useAppStore } from '@/stores/appStore';

export function HomeView(): JSX.Element {
  const version = useAppStore((s) => s.version);
  const platform = useAppStore((s) => s.platform);
  const refresh = useSourcesStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <section className="flex-1 min-h-0 flex items-center justify-center">
        <HeroPlayer playlistName="Harmonix Favorites" />
      </section>

      <section className="px-8 pb-6 text-xs text-zinc-600 flex items-center gap-3">
        <Disc3 size={12} className="text-brand-500" />
        <span>
          Harmonix v{version} · {platform ?? 'detecting…'}
        </span>
      </section>
    </div>
  );
}
