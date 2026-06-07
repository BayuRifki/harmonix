import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

export interface ArtworkBlurBackgroundProps {
  opacity?: number;
  className?: string;
  blur?: number;
  saturation?: number;
}

export function ArtworkBlurBackground({
  opacity = 0.2,
  className = '',
  blur = 60,
  saturation = 1.4,
}: ArtworkBlurBackgroundProps): JSX.Element | null {
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl) ?? null;
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (artworkUrl === loadedUrl) return;
    if (!artworkUrl) {
      setLoadedUrl(null);
      imgRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = (): void => {
      imgRef.current = img;
      setLoadedUrl(artworkUrl);
    };
    img.onerror = (): void => {
      imgRef.current = null;
    };
    img.src = artworkUrl;
  }, [artworkUrl, loadedUrl]);

  if (!loadedUrl || !imgRef.current) return null;

  return (
    <div
      aria-hidden
      data-testid="artwork-blur-background"
      className={`pointer-events-none fixed inset-0 -z-[8] overflow-hidden ${className}`}
      style={{
        backgroundImage: `url(${loadedUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: `blur(${blur}px) saturate(${saturation})`,
        opacity,
        transform: 'scale(1.15)',
        transition: 'opacity 0.6s ease',
      }}
    />
  );
}
