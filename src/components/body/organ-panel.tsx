'use client';

import * as React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { ORGANS, type OrganInfo } from '@/lib/body-data';
import { buildSeries } from '@/lib/insights';
import type { AssessmentRecord } from '@/lib/types';
import { HealthTrendChart } from '@/components/insights/trend-chart';
import { Badge } from '@/components/ui/card';
import { Disclaimer } from '@/components/disclaimer';

export function OrganInformationPanel({
  organId,
  records,
  onClose,
}: {
  organId: string;
  records: AssessmentRecord[];
  onClose: () => void;
}) {
  const organ: OrganInfo = ORGANS[organId];
  // Build all series from the full record set, then keep only the ones this
  // organ maps to (e.g. heart → heartRate, systolic, diastolic, exerciseMinutes).
  const relevant = React.useMemo(
    () => buildSeries(records, 30).filter((s) => organ.recordMetrics.includes(s.key)),
    [organ, records],
  );

  return (
    <div className="panel p-5 h-full overflow-y-auto" aria-label={`${organ.name} information`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span aria-hidden>{organ.icon}</span> {organ.name}
          </h2>
          <p className="text-sm text-orbit-muted mt-1">{organ.function}</p>
        </div>
        <button onClick={onClose} aria-label="Close organ panel" className="rounded-lg border border-orbit-border p-1.5 hover:bg-orbit-cyan/10">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Section title="Why it matters in space">
        <p className="text-sm">{organ.whySpaceMatters}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {organ.hazards.map((h) => (
            <Badge key={h} tone="violet">
              {h}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Health indicators">
        <ul className="text-sm space-y-1">
          {organ.indicators.map((i) => (
            <li key={i.label} className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${i.selfReport ? 'bg-orbit-violet' : 'bg-orbit-cyan'}`} />
              {i.label}
              {i.selfReport && <span className="text-xs text-orbit-muted">(self-reported)</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Current health records">
        {relevant.length === 0 ? (
          <p className="text-sm text-orbit-muted">
            No related records yet. Complete the{' '}
            <Link href="/assessments" className="text-orbit-cyan underline">
              daily assessment
            </Link>{' '}
            to build this panel.
          </p>
        ) : (
          <div className="space-y-4">
            {relevant.map((s) =>
              s.points.length === 0 ? (
                <p key={s.key} className="text-sm text-orbit-muted">
                  {s.label}: no measurements in the last 30 days.
                </p>
              ) : (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-orbit-cyan">
                      Latest: {s.latest ?? '—'} {s.unit}
                      {s.baseline !== undefined && <span className="text-orbit-muted"> · baseline {s.baseline}</span>}
                    </span>
                  </div>
                  <HealthTrendChart series={s} height={130} />
                </div>
              ),
            )}
          </div>
        )}
      </Section>

      <Section title="What to pay attention to">
        <ul className="text-sm list-disc ml-5 space-y-1">
          {organ.attention.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Section>

      <Section title="General preventive guidance">
        <ul className="text-sm list-disc ml-5 space-y-1">
          {organ.prevention.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Section>

      <Section title="When to seek help">
        <p className="text-sm text-orbit-amber">{organ.seekHelp}</p>
      </Section>

      <div className="mt-4">
        <Disclaimer compact />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 border-t border-orbit-border/60 pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-orbit-cyan mb-2">{title}</h3>
      {children}
    </section>
  );
}
