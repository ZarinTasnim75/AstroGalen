'use client';

import { AlertTriangle, CheckCircle2, CircleAlert, ChevronDown } from 'lucide-react';
import * as React from 'react';
import type { OrbitAlert } from '@/lib/alerts';
import { cn } from '@/lib/utils';

// Explainable health alert. Level is conveyed by icon + text as well as color.
export function HealthAlert({ alert, defaultOpen = false }: { alert: OrbitAlert; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const tone =
    alert.level === 'red'
      ? 'border-orbit-red/50 bg-orbit-red/10'
      : alert.level === 'amber'
        ? 'border-orbit-amber/50 bg-orbit-amber/10'
        : 'border-orbit-green/50 bg-orbit-green/10';
  const iconColor = alert.level === 'red' ? 'text-orbit-red' : alert.level === 'amber' ? 'text-orbit-amber' : 'text-orbit-green';
  const Icon = alert.level === 'red' ? CircleAlert : alert.level === 'amber' ? AlertTriangle : CheckCircle2;
  const label = alert.level === 'red' ? 'Urgent — mission procedure' : alert.level === 'amber' ? 'Verify / monitor' : 'All clear';

  return (
    <div className={cn('rounded-xl border p-3', tone)}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-start gap-2 text-left">
        <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', iconColor)} />
        <span className="flex-1">
          <span className="block text-sm font-semibold">{alert.title}</span>
          <span className="block text-xs text-orbit-muted">
            {label} · {alert.indicator}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 mt-1 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-sm border-t border-current/10 pt-3">
          <div>
            <p className="text-xs font-semibold text-orbit-muted uppercase tracking-wide">What changed?</p>
            <p>{alert.whatChanged}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-orbit-muted uppercase tracking-wide">Why is it worth attention?</p>
            <p>{alert.whyAttention}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-orbit-muted uppercase tracking-wide">What to do next</p>
            <ul className="list-disc ml-5">
              {alert.nextSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-orbit-muted uppercase tracking-wide">When to contact medical personnel</p>
            <p>{alert.whenSeekHelp}</p>
          </div>
        </div>
      )}
    </div>
  );
}
