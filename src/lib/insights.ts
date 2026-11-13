// AstroGalen — rules-based trend analysis for the Insights page.
// Explanations are descriptive ("what changed in your records"), never diagnostic.

import type { AssessmentRecord } from './types';
import { dateKey, mean, median, round1 } from './utils';

export type RangeDays = 7 | 30 | 90;

export interface SeriesPoint {
  date: string; // short label e.g. "Mar 4"
  value: number;
}

export interface MetricSeries {
  key: string;
  label: string;
  unit: string;
  points: SeriesPoint[];
  latest?: number;
  baseline?: number; // median of all available prior values
  insights: string[];
  missingCount: number;
}

const DAY = 24 * 60 * 60 * 1000;

function lastN(range: RangeDays): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY);
    keys.push(dateKey(d)); // ship-local date, matching how assessments are stored
  }
  return keys;
}

interface Extractor {
  key: string;
  label: string;
  unit: string;
  section: 'physical' | 'mental';
  get: (d: any) => number | undefined;
  digits?: number;
}

export const EXTRACTORS: Extractor[] = [
  { key: 'heartRate', label: 'Heart rate', unit: 'bpm', section: 'physical', get: (d) => d.heartRate },
  { key: 'systolic', label: 'Systolic BP', unit: 'mmHg', section: 'physical', get: (d) => d.systolic },
  { key: 'diastolic', label: 'Diastolic BP', unit: 'mmHg', section: 'physical', get: (d) => d.diastolic },
  { key: 'glucose', label: 'Blood glucose', unit: 'mg/dL', section: 'physical', get: (d) => d.glucose },
  { key: 'temperature', label: 'Body temperature', unit: '°C', section: 'physical', get: (d) => d.temperature, digits: 1 },
  { key: 'sleepHours', label: 'Sleep duration', unit: 'h', section: 'physical', get: (d) => d.sleepHours, digits: 1 },
  { key: 'exerciseMinutes', label: 'Exercise', unit: 'min', section: 'physical', get: (d) => d.exerciseMinutes },
  { key: 'mood', label: 'Mood', unit: '/5', section: 'mental', get: (d) => d.mood },
  { key: 'stress', label: 'Stress', unit: '/5', section: 'mental', get: (d) => d.stress },
  { key: 'mentalFatigue', label: 'Mental fatigue', unit: '/5', section: 'mental', get: (d) => d.mentalFatigue },
  { key: 'physicalFatigue', label: 'Physical fatigue', unit: '/5', section: 'mental', get: (d) => d.physicalFatigue },
];

export function buildSeries(records: AssessmentRecord[], range: RangeDays): MetricSeries[] {
  const keys = lastN(range);
  const keySet = new Set(keys);
  const byDate: Record<string, { physical?: any; mental?: any; prevention?: any }> = {};
  for (const r of records) {
    if (!keySet.has(r.dateKey)) continue;
    const slot = (byDate[r.dateKey] ||= {});
    slot[r.section] = r.data;
  }

  const out: MetricSeries[] = [];
  for (const ex of EXTRACTORS) {
    const values: { k: string; v: number }[] = [];
    for (const k of keys) {
      const d = byDate[k]?.[ex.section];
      const v = d ? ex.get(d) : undefined;
      if (typeof v === 'number' && !Number.isNaN(v)) values.push({ k, v });
    }
    const points: SeriesPoint[] = values.map(({ k, v }) => ({
      date: new Date(k + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: round1(v),
    }));
    const latest = values.length > 0 ? values[values.length - 1].v : undefined;
    // Baseline: median of values from before the current range (or earlier half if not enough data)
    const prior = records
      .filter((r) => r.section === ex.section && r.dateKey < keys[0])
      .map((r) => ex.get(r.data))
      .filter((v): v is number => typeof v === 'number');
    let baseline: number | undefined;
    if (prior.length >= 3) {
      baseline = round1(median(prior));
    } else if (values.length >= 6) {
      const half = Math.floor(values.length / 2);
      baseline = round1(median(values.slice(0, half).map((x) => x.v)));
    }

    const insights = trendInsights(ex, values, baseline, range);
    out.push({
      key: ex.key,
      label: ex.label,
      unit: ex.unit,
      points,
      latest: latest !== undefined ? round1(latest) : undefined,
      baseline,
      insights,
      missingCount: keys.length - values.length,
    });
  }
  return out;
}

function trendInsights(
  ex: Extractor,
  values: { k: string; v: number }[],
  baseline: number | undefined,
  range: RangeDays,
): string[] {
  const out: string[] = [];
  if (values.length === 0) {
    return [`No ${ex.label.toLowerCase()} records in the last ${range} days.`];
  }
  if (values.length === 1) {
    return [`Only one ${ex.label.toLowerCase()} record in this period — trends need a few more data points.`];
  }

  const first = values[0].v;
  const last = values[values.length - 1].v;
  const early = mean(values.slice(0, Math.max(2, Math.floor(values.length / 3))).map((x) => x.v));
  const late = mean(values.slice(-Math.max(2, Math.floor(values.length / 3))).map((x) => x.v));

  const dir = late - early;
  const magnitude = Math.abs(dir);
  const thresholdFor = (unit: string) =>
    unit === '/5' ? 0.5 : unit === '°C' ? 0.3 : unit === 'h' ? 0.5 : unit === 'min' ? 10 : 5;

  if (magnitude >= thresholdFor(ex.unit)) {
    const verb = dir > 0
      ? (ex.key === 'stress' || ex.key === 'mentalFatigue' || ex.key === 'physicalFatigue' ? 'has increased' : 'has increased')
      : 'has decreased';
    out.push(
      `Your recorded ${ex.label.toLowerCase()} ${verb} over the last ${range} days (early average ≈ ${round1(early)}, recent average ≈ ${round1(late)} ${ex.unit}).`,
    );
  } else {
    out.push(`Your ${ex.label.toLowerCase()} has stayed relatively steady over the last ${range} days.`);
  }

  if (baseline !== undefined && typeof last === 'number') {
    const diff = round1(last - baseline);
    if (Math.abs(diff) >= thresholdFor(ex.unit)) {
      out.push(
        `Today's ${ex.label.toLowerCase()} (${round1(last)} ${ex.unit}) is ${diff > 0 ? 'above' : 'below'} your personal baseline (${baseline} ${ex.unit}).`,
      );
    } else {
      out.push(`Today's ${ex.label.toLowerCase()} is close to your personal baseline (${baseline} ${ex.unit}).`);
    }
  }

  // Missing data hint
  const daySpan = Math.max(1, (new Date(values[values.length - 1].k).getTime() - new Date(values[0].k).getTime()) / DAY + 1);
  if (daySpan >= 5 && values.length / daySpan < 0.5) {
    out.push(`You have ${values.length} records over ~${Math.round(daySpan)} days — regular logging makes trends more reliable.`);
  }

  out.push('These observations describe your records only and are not medical conclusions.');
  return out;
}

export function computeWellnessScore(records: AssessmentRecord[], days = 7): number {
  // Simple, transparent weekly wellness indicator (0–100) from sleep, fatigue,
  // stress, mood and exercise adherence. Educational only.
  const cutoff = Date.now() - days * DAY;
  const rec = records.filter((r) => r.ts >= cutoff);
  const phys = rec.filter((r) => r.section === 'physical') as (AssessmentRecord & { data: any })[];
  const ment = rec.filter((r) => r.section === 'mental') as (AssessmentRecord & { data: any })[];
  if (phys.length === 0 && ment.length === 0) return 0;

  let sum = 0;
  let count = 0;
  for (const p of phys) {
    if (typeof p.data.sleepHours === 'number') { sum += Math.min(1, p.data.sleepHours / 8) * 100; count++; }
    if (typeof p.data.exerciseMinutes === 'number') { sum += Math.min(1, p.data.exerciseMinutes / 45) * 100; count++; }
  }
  for (const m of ment) {
    if (typeof m.data.mood === 'number') { sum += ((m.data.mood - 1) / 4) * 100; count++; }
    if (typeof m.data.stress === 'number') { sum += ((5 - m.data.stress) / 4) * 100; count++; }
    if (typeof m.data.physicalFatigue === 'number') { sum += ((5 - m.data.physicalFatigue) / 4) * 100; count++; }
  }
  return count === 0 ? 0 : Math.round(sum / count);
}
