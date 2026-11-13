'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variants: Record<ButtonVariant, string> = {
  default:
    'bg-orbit-cyan text-slate-950 hover:bg-orbit-cyan/85 shadow-glow-sm font-semibold',
  outline:
    'border border-orbit-cyan/50 text-orbit-cyan hover:bg-orbit-cyan/10 font-medium',
  ghost: 'text-orbit-text hover:bg-orbit-cyan/10',
  danger: 'bg-orbit-red/90 text-white hover:bg-orbit-red font-semibold',
  success: 'bg-orbit-green/90 text-slate-950 hover:bg-orbit-green font-semibold',
};

const sizes: Record<ButtonSize, string> = {
  default: 'h-10 px-4 text-sm rounded-xl',
  sm: 'h-8 px-3 text-xs rounded-lg',
  lg: 'h-12 px-6 text-base rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-bg disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
