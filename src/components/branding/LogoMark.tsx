interface LogoMarkProps {
  size?: number;
  showText?: boolean;
}

const ICON_PATH = './logo-horizontal.png';

export function LogoMark({ size = 32, showText = true }: LogoMarkProps): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-xl overflow-hidden flex items-center justify-center"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <img
          src={ICON_PATH}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
      {showText && (
        <h1 className="text-xl font-bold tracking-tight text-white">Harmonix</h1>
      )}
    </div>
  );
}
