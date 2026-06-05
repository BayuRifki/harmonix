import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';

export function useAppInfo(): void {
  const setVersion = useAppStore((s) => s.setVersion);
  const setPlatform = useAppStore((s) => s.setPlatform);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [version, platform] = await Promise.all([
          window.api.app.getVersion(),
          window.api.app.getPlatform(),
        ]);
        if (!mounted) return;
        setVersion(version);
        setPlatform(platform);
      } catch (err) {
        console.error('Failed to fetch app info:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setVersion, setPlatform]);
}
