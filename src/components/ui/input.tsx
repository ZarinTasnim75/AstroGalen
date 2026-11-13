'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-orbit-border bg-orbit-bg/60 px-3 text-sm text-orbit-text placeholder:text-orbit-muted/70 focus:border-orbit-cyan/60 focus:outline-none focus:ring-2 focus:ring-orbit-cyan/25 transition',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-orbit-border bg-orbit-bg/60 px-3 py-2 text-sm text-orbit-text placeholder:text-orbit-muted/70 focus:border-orbit-cyan/60 focus:outline-none focus:ring-2 focus:ring-orbit-cyan/25 transition min-h-20',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-orbit-border bg-orbit-bg/60 px-3 text-sm text-orbit-text focus:border-orbit-cyan/60 focus:outline-none focus:ring-2 focus:ring-orbit-cyan/25 transition',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';

export function Label({ className, children, htmlFor, hint }: { className?: string; children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-sm font-medium mb-1.5', className)}>
      {children}
      {hint ? <span className="ml-2 text-xs text-orbit-muted font-normal">{hint}</span> : null}
    </label>
  );
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 5,
  step = 1,
  id,
  'aria-label': ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  'aria-label'?: string;
}) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2.5 appearance-none rounded-full bg-orbit-border/70 accent-[rgb(var(--orbit-cyan))] cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[rgb(var(--orbit-cyan))]
        [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgb(var(--orbit-cyan)/0.6)] [&::-webkit-slider-thumb]:cursor-grab"
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-cyan/60',
        checked ? 'bg-orbit-cyan' : 'bg-orbit-border',
      )}
    >
      <span
        className={cn(
          'inline-block h-4.5 w-4.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5.5 translate-x-6' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
