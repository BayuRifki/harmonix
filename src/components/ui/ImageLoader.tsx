import { useEffect, useState, useRef, type ImgHTMLAttributes } from 'react';

export interface ImageLoaderProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  blurDataUrl?: string;
  fadeMs?: number;
  emptyIcon?: React.ReactNode;
  showError?: boolean;
}

const FALLBACK_BLUR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="%23333"/></svg>',
  );

export function ImageLoader({
  src,
  blurDataUrl,
  fadeMs = 220,
  emptyIcon,
  showError = true,
  alt = '',
  className = '',
  style,
  ...rest
}: ImageLoaderProps): JSX.Element {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const currentSrcRef = useRef<string | null>(null);
  const pendingSrcRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedSrc = src ?? null;
    pendingSrcRef.current = normalizedSrc;
    
    if (normalizedSrc !== currentSrcRef.current) {
      currentSrcRef.current = normalizedSrc;
      setLoaded(false);
      setErrored(false);
    }
  }, [src]);

  const handleLoad = (): void => {
    if (pendingSrcRef.current === currentSrcRef.current) {
      setLoaded(true);
    }
  };

  const handleError = (): void => {
    if (pendingSrcRef.current === currentSrcRef.current) {
      setErrored(true);
    }
  };

  const showFallback = !src || errored;

  return (
    <div
      className={`relative overflow-hidden bg-zinc-800/60 ${className}`}
      style={style}
      data-testid="image-loader"
    >
      {!showFallback && (
        <>
          {blurDataUrl ? (
            <img
              aria-hidden
              src={blurDataUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-md"
              style={{ opacity: loaded ? 0 : 1, transition: `opacity ${fadeMs}ms ease-out` }}
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage: `url("${FALLBACK_BLUR}")`,
                backgroundSize: 'cover',
                opacity: loaded ? 0 : 1,
                transition: `opacity ${fadeMs}ms ease-out`,
              }}
            />
          )}
          <img
            {...rest}
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className="relative w-full h-full object-cover"
            style={{ opacity: loaded ? 1 : 0, transition: `opacity ${fadeMs}ms ease-out` }}
            data-testid="image-loader-img"
          />
        </>
      )}
      {showFallback && (
        <div
          className="absolute inset-0 flex items-center justify-center text-zinc-600"
          data-testid="image-loader-fallback"
        >
          {showError
            ? (emptyIcon ?? (
                <span className="text-xl" aria-hidden>
                  ♪
                </span>
              ))
            : null}
        </div>
      )}
    </div>
  );
}
