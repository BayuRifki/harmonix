import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'icon' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const base = [
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black',
      'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
    ];

    const variants: Record<string, string> = {
      primary: 'bg-brand-500 hover:bg-brand-400 text-white shadow-glow-sm active:bg-brand-600',
      ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 active:bg-zinc-800',
      icon: 'p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-700',
      danger: 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-800/50',
    };

    const sizes: Record<string, string> = {
      sm: 'text-xs px-3 py-1.5',
      md: 'text-sm px-4 py-2',
      lg: 'text-base px-6 py-3',
    };

    return (
      <button
        ref={ref}
        className={cn(
          base,
          variants[variant],
          variant === 'icon' ? sizes[variant] : sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button };
