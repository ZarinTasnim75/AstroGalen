import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('panel p-5', className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-base font-semibold tracking-tight mb-1', className)} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-orbit-muted', className)} {...props} />;
}

export function Badge({
  className,
  tone = 'cyan',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'cyan' | 'green' | 'amber' | 'red' | 'violet' | 'muted' }) {
  const tones: Record<string, string> = {
    cyan: 'bg-orbit-cyan/15 text-orbit-cyan border-orbit-cyan/30',
    green: 'bg-orbit-green/15 text-orbit-green border-orbit-green/30',
    amber: 'bg-orbit-amber/15 text-orbit-amber border-orbit-amber/30',
    red: 'bg-orbit-red/15 text-orbit-red border-orbit-red/30',
    violet: 'bg-orbit-violet/15 text-orbit-violet border-orbit-violet/30',
    muted: 'bg-orbit-muted/15 text-orbit-muted border-orbit-muted/30',
  };
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  );
}

export function Progress({ value, className, barClassName, ...props }: { value: number; className?: string; barClassName?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-orbit-border/60', className)}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn('h-full rounded-full bg-gradient-to-r from-orbit-cyan to-orbit-blue transition-all duration-500', barClassName)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
