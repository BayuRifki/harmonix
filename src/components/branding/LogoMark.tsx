interface LogoMarkProps {
  size?: number;
  showText?: boolean;
}

const LOGO_URL = '/logo.png';

export function LogoMark({ size = 32, showText = true }: LogoMarkProps): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-xl overflow-hidden shrink-0"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <img
          src={LOGO_URL}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
      {showText && <h1 className="text-xl font-bold tracking-tight text-white">Harmonix</h1>}
    </div>
  );
}
