// AstroGalen — health report builder (shared by PDF export and online sending).
// Pure functions so they are testable.

import type { AssessmentRecord, SectionKey } from './types';
import { EXTRACTORS, buildSeries } from './insights';
import { dateKey } from './utils';

export interface ReportOptions {
  from: string; // dateKey
  to: string; // dateKey
  indicators: string[]; // EXTRACTOR keys
  includePhysicalSummary: boolean;
  includeMentalSummary: boolean;
  includeCharts: boolean;
  includeComments: boolean;
  comments?: string;
  removeSensitive: boolean; // strips journal + free-text notes
}

export interface ReportSection {
  title: string;
  rows: { date: string; values: string }[];
  latest?: string;
  baseline?: string;
  insight?: string;
}

export interface HealthReport {
  generatedAt: string;
  dateRange: { from: string; to: string };
  patientLabel: string;
  sections: ReportSection[];
  comments?: string;
  recordCounts: { physical: number; mental: number; prevention: number };
  disclaimer: string;
  dataOriginNote: string;
}

export function buildReport(records: AssessmentRecord[], options: ReportOptions): HealthReport {
  const inRange = records.filter((r) => r.dateKey >= options.from && r.dateKey <= options.to);
  const series = buildSeries(inRange, 90);
  const wanted = new Set(options.indicators);
  const rangeDays = Math.max(1, Math.round((new Date(options.to).getTime() - new Date(options.from).getTime()) / 86400000) + 1);

  const sections: ReportSection[] = [];
  for (const s of series) {
    if (!wanted.has(s.key)) continue;
    const ex = EXTRACTORS.find((e) => e.key === s.key)!;
    if (ex.section === 'physical' && !options.includePhysicalSummary) continue;
    if (ex.section === 'mental' && !options.includeMentalSummary) continue;
    const rows = s.points.slice(-Math.min(s.points.length, 30)).map((p) => ({
      date: p.date,
      values: `${p.value} ${s.unit}`,
    }));
    sections.push({
      title: s.label,
      rows,
      latest: s.latest !== undefined ? `${s.latest} ${s.unit}` : 'No data',
      baseline: s.baseline !== undefined ? `${s.baseline} ${s.unit}` : 'Not established',
      insight: s.insights[0],
    });
  }

  const sensitive = (text: string | undefined) => (options.removeSensitive ? undefined : text);

  const phys = inRange.filter((r) => r.section === 'physical');
  const ment = inRange.filter((r) => r.section === 'mental');
  const prev = inRange.filter((r) => r.section === 'prevention');

  return {
    generatedAt: new Date().toISOString(),
    dateRange: { from: options.from, to: options.to },
    patientLabel: 'AstroGalen crew health record (self-reported + manually entered)',
    sections,
    comments: options.includeComments ? sensitive(options.comments) : undefined,
    recordCounts: { physical: phys.length, mental: ment.length, prevention: prev.length },
    disclaimer:
      'AstroGalen provides health awareness and educational guidance. It is not a medical professional and does not replace an approved medical assessment. Threshold references in this report are configurable sample values, not validated medical standards.',
    dataOriginNote: options.removeSensitive
      ? 'Sensitive fields (journal entries, free-text symptom notes) were excluded by the sender before export.'
      : 'This report may contain self-reported narrative fields included by the sender.',
  };
}

export function defaultReportOptions(): ReportOptions {
  const to = dateKey();
  const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  return {
    from,
    to,
    indicators: ['heartRate', 'systolic', 'diastolic', 'temperature', 'sleepHours', 'mood', 'stress', 'exerciseMinutes'],
    includePhysicalSummary: true,
    includeMentalSummary: true,
    includeCharts: true,
    includeComments: false,
    comments: '',
    removeSensitive: true,
  };
}

export function availableRange(records: AssessmentRecord[]): { from: string; to: string } {
  if (records.length === 0) return defaultReportOptions();
  const keys = records.map((r) => r.dateKey).sort();
  return { from: keys[0], to: keys[keys.length - 1] };
}
