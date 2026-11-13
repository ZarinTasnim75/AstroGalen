'use client';

import * as React from 'react';
import { db } from '@/lib/db';
import type { AssessmentRecord } from '@/lib/types';
import { InteractiveHumanBody } from '@/components/body/interactive-body';
import { OrganInformationPanel } from '@/components/body/organ-panel';
import { ORGANS, ORGAN_IDS } from '@/lib/body-data';
import { Card } from '@/components/ui/card';

export default function BodyPage() {
  const [selected, setSelected] = React.useState<string | null>('heart');
  const [records, setRecords] = React.useState<AssessmentRecord[]>([]);

  React.useEffect(() => {
    db.assessments.orderBy('ts').toArray().then(setRecords);
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Body Explorer</h1>
        <p className="text-sm text-orbit-muted mt-1">
          Select a glowing body system to see its function, spaceflight relevance, and your recorded health data.
          Keyboard: Tab between systems, Enter to open.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="flex flex-col items-center justify-center">
          <InteractiveHumanBody selected={selected} onSelect={setSelected} />
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {ORGAN_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setSelected(id)}
                aria-pressed={selected === id}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  selected === id
                    ? 'border-orbit-cyan bg-orbit-cyan/15 text-orbit-cyan'
                    : 'border-orbit-border text-orbit-muted hover:border-orbit-cyan/50'
                }`}
              >
                {ORGANS[id].icon} {ORGANS[id].name}
              </button>
            ))}
          </div>
        </Card>
        <div className="min-h-[420px]">
          {selected ? (
            <OrganInformationPanel organId={selected} records={records} onClose={() => setSelected(null)} />
          ) : (
            <Card className="flex items-center justify-center h-64 text-sm text-orbit-muted">
              Select a body system on the figure to open its information panel.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
