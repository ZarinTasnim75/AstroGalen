'use client';

import * as React from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import type { MetricInfo } from '@/lib/metrics';
import { Input, Label } from '@/components/ui/input';

// A single metric input with expandable educational context:
// what is measured, why it matters, how to record, what changes mean, when to repeat.
export function MetricField({
  info,
  value,
  onChange,
  error,
  suffix,
  placeholder,
  extra,
}: {
  info: MetricInfo;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  error?: string;
  suffix?: string;
  placeholder?: string;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const id = `field-${info.key}`;

  return (
    <div className="rounded-xl border border-orbit-border/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <Label htmlFor={id} hint={info.unit}>
            {info.label}
          </Label>
          {extra}
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder={placeholder ?? 'Not recorded'}
            value={value ?? ''}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => {
              const raw = e.target.value;
              onChange(raw === '' ? undefined : Number(raw));
            }}
          />
          {error ? (
            <p id={`${id}-err`} className="mt-1 text-xs text-orbit-red">
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`${id}-info`}
          className="mt-6 inline-flex items-center gap-1 rounded-lg border border-orbit-border px-2 py-1.5 text-xs text-orbit-cyan hover:bg-orbit-cyan/10 shrink-0"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Why this matters
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open ? (
        <dl id={`${id}-info`} className="mt-3 space-y-2 text-xs text-orbit-muted border-t border-orbit-border/60 pt-3">
          <div>
            <dt className="font-semibold text-orbit-text">What is being measured?</dt>
            <dd>{info.what}</dd>
          </div>
          <div>
            <dt className="font-semibold text-orbit-text">Why is this important?</dt>
            <dd>{info.why}</dd>
          </div>
          <div>
            <dt className="font-semibold text-orbit-text">How to record it</dt>
            <dd>{info.how}</dd>
          </div>
          <div>
            <dt className="font-semibold text-orbit-text">What a change can indicate</dt>
            <dd>{info.changeMeans}</dd>
          </div>
          <div>
            <dt className="font-semibold text-orbit-text">When to repeat or seek attention</dt>
            <dd>{info.whenRepeat}</dd>
          </div>
          <p className="text-orbit-amber/80">
            Reference ranges shown in AstroGalen are configurable sample/demo values, not validated medical standards.
          </p>
        </dl>
      ) : null}
      {suffix ? <p className="mt-1 text-xs text-orbit-muted">{suffix}</p> : null}
    </div>
  );
}
