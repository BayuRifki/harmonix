import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100',
      'placeholder:text-zinc-500',
      'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50',
      'transition-colors duration-150',
      'disabled:opacity-50 disabled:pointer-events-none',
      className,
    )}
    ref={ref}
    {...props}
  />
));

Input.displayName = 'Input';

export { Input };
