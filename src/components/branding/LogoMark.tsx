interface LogoMarkProps {
  size?: number;
  showText?: boolean;
}

export function LogoMark({ size = 36, showText = true }: LogoMarkProps): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-xl flex items-center justify-center shadow-glow-pink"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #831843, #ec4899, #f9a8d4)',
        }}
        aria-hidden
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="10" stroke="#fbcfe8" strokeWidth="1.4" opacity="0.4" />
          <circle cx="16" cy="16" r="7" stroke="#fbcfe8" strokeWidth="1.2" opacity="0.6" />
          <circle cx="16" cy="16" r="4" stroke="#fbcfe8" strokeWidth="1" />
          <circle cx="16" cy="16" r="2" fill="#fafafa" />
          <rect x="11" y="13" width="0.8" height="6" rx="0.4" fill="#fafafa" />
          <rect x="13" y="11" width="0.8" height="10" rx="0.4" fill="#fafafa" />
          <rect x="15" y="14" width="0.8" height="4" rx="0.4" fill="#fafafa" />
          <rect x="17" y="12" width="0.8" height="8" rx="0.4" fill="#fafafa" />
          <rect x="19" y="10" width="0.8" height="12" rx="0.4" fill="#fafafa" />
          <rect x="21" y="13" width="0.8" height="6" rx="0.4" fill="#fafafa" />
        </svg>
      </div>
      {showText && (
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-400 to-accent-300 bg-clip-text text-transparent">
          Harmonix
        </h1>
      )}
    </div>
  );
}
