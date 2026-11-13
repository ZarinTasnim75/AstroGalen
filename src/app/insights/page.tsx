'use client';

import * as React from 'react';
import { db } from '@/lib/db';
import type { AssessmentRecord, PhysicalData, Thresholds } from '@/lib/types';
import { buildSeries, computeWellnessScore, type RangeDays } from '@/lib/insights';
import { evaluateAlerts } from '@/lib/alerts';
import { getSettings } from '@/lib/db';
import { HealthTrendChart } from '@/components/insights/trend-chart';
import { HealthAlert } from '@/components/health-alert';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, Badge, Progress } from '@/components/ui/card';
import { Tabs } from '@/components/ui/dialog';
import { Activity, TrendingUp, Info } from 'lucide-react';

export default function InsightsPage() {
  const [records, setRecords] = React.useState<AssessmentRecord[]>([]);
  const [range, setRange] = React.useState<RangeDays>(7);
  const [thresholds, setThresholds] = React.useState<Thresholds | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const [recs, s] = await Promise.all([db.assessments.orderBy('ts').toArray(), getSettings()]);
      setRecords(recs);
      setThresholds(s.mission.thresholds);
      setLoading(false);
    })();
  }, []);

  const series = React.useMemo(() => (records.length ? buildSeries(records, range) : []), [records, range]);

  // Latest physical record → alerts summary
  const latestAlerts = React.useMemo(() => {
    if (!thresholds) return [];
    const phys = records.filter((r) => r.section === 'physical');
    const today = phys[phys.length - 1]?.data as PhysicalData | undefined;
    const prev = phys.length > 1 ? (phys[phys.length - 2]?.data as PhysicalData) : undefined;
    return evaluateAlerts({ today, previous: prev, thresholds });
  }, [records, thresholds]);

  if (loading) return <Card>Loading your health history…</Card>;

  const score = computeWellnessScore(records);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Health Insights</h1>
          <p className="text-sm text-orbit-muted mt-1">
            Trends from your locally stored records, compared with your personal baseline.
          </p>
        </div>
        <Tabs
          tabs={[
            { id: '7', label: 'Last 7 days' },
            { id: '30', label: 'Last 30 days' },
            { id: '90', label: 'Last 90 days' },
          ]}
          active={String(range)}
          onChange={(id) => setRange(Number(id) as RangeDays)}
        />
      </header>

      {records.length === 0 ? (
        <Card>
          <p className="text-sm">
            No health records yet. Complete your first daily assessment — or enable Demo Mode in Settings to explore
            sample astronaut data.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>
                <Activity className="inline h-4 w-4 mr-1.5 text-orbit-cyan" />
                7-day wellness indicator
              </CardTitle>
              <span className="text-sm font-semibold text-orbit-cyan">{score}%</span>
            </div>
            <Progress value={score} aria-label="7-day wellness indicator progress" />
            <p className="text-[11px] text-orbit-muted mt-2">
              A transparent weekly indicator derived from your sleep, exercise, mood, stress and fatigue entries. It
              describes your records, not your health status.
            </p>
          </Card>

          {latestAlerts.length > 0 && (
            <Card>
              <CardTitle>Current observations (from the most recent scan)</CardTitle>
              <div className="space-y-3">
                {latestAlerts.map((a) => (
                  <HealthAlert key={a.id} alert={a} />
                ))}
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {series.map((s) => (
              <Card key={s.key}>
                <div className="flex items-center justify-between mb-1">
                  <CardTitle>
                    <TrendingUp className="inline h-4 w-4 mr-1.5 text-orbit-cyan" />
                    {s.label}
                  </CardTitle>
                  <div className="text-right text-xs">
                    <div className="font-semibold text-orbit-cyan text-sm">
                      {s.latest !== undefined ? `${s.latest} ${s.unit}` : 'No data'}
                    </div>
                    {s.baseline !== undefined && (
                      <div className="text-orbit-muted">baseline {s.baseline} {s.unit}</div>
                    )}
                  </div>
                </div>
                <HealthTrendChart series={s} height={170} />
                {s.missingCount > 0 && (
                  <p className="text-[11px] text-orbit-amber mt-1">
                    {s.missingCount} day(s) without a measurement in this window — shown as gaps, never estimated.
                  </p>
                )}
                <ul className="mt-2 space-y-1">
                  {s.insights.map((ins, i) => (
                    <li key={i} className="text-xs text-orbit-muted flex gap-1.5">
                      <Info className="h-3 w-3 mt-0.5 shrink-0 text-orbit-cyan" />
                      {ins}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <p className="text-xs text-orbit-muted">
            Insights use explainable, rules-based logic over your own records. They are not medical conclusions, and no
            diagnosis is generated. Blood-pressure and other threshold references are your configurable sample mission
            values.
          </p>
        </>
      )}
    </div>
  );
}
