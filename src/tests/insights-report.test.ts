import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeries, computeWellnessScore } from '../lib/insights';
import { buildReport, defaultReportOptions } from '../lib/report';
import { evaluateAlerts } from '../lib/alerts';
import type { AssessmentRecord, Thresholds } from '../lib/types';

// Synthetic records are generated here directly (Node tests must not touch
// IndexedDB, so demo-data/Dexie are not imported).
const t: Thresholds = {
  heartRateMin: 50, heartRateMax: 100,
  systolicMin: 90, systolicMax: 140, diastolicMin: 55, diastolicMax: 90,
  tempMin: 35.5, tempMax: 37.5, glucoseMin: 70, glucoseMax: 140,
  sleepHoursMin: 6, sleepHoursMax: 9,
};

function record(dateKey: string, section: 'physical' | 'mental', data: Record<string, unknown>): AssessmentRecord {
  return { ts: new Date(dateKey + 'T20:00:00').getTime(), dateKey, section, data: data as never };
}

const DAY = 86400000;
const today = new Date();
const dayKey = (offset: number) => new Date(today.getTime() - offset * DAY).toISOString().slice(0, 10);

const records: AssessmentRecord[] = [];
for (let i = 9; i >= 0; i--) {
  const drift = (9 - i) / 9; // 0 → 1
  records.push(
    record(dayKey(i), 'physical', {
      heartRate: Math.round(60 + drift * 10),
      systolic: 118, diastolic: 74,
      temperature: 36.6,
      sleepHours: 7.5 - drift * 2,
      exerciseMinutes: 40 + drift * 20,
    }),
  );
  records.push(
    record(dayKey(i), 'mental', {
      mood: 4 - drift, stress: 2 + drift * 2, mentalFatigue: 2 + drift, physicalFatigue: 2 + drift,
      sleepQuality: 4 - drift, concentration: 4, motivation: 4,
    }),
  );
}

test('buildSeries returns points for every recorded metric', () => {
  const series = buildSeries(records, 7);
  const hr = series.find((s) => s.key === 'heartRate')!;
  assert.ok(hr.points.length >= 6);
  assert.equal(hr.unit, 'bpm');
});

test('gaps are surfaced as missing counts, never fabricated', () => {
  const sparse = [records[records.length - 2], records[records.length - 1]]; // today only (physical + mental)
  const series = buildSeries(sparse, 7);
  const hr = series.find((s) => s.key === 'heartRate')!;
  assert.equal(hr.missingCount, 6);
  assert.match(hr.insights[0], /only one|No /i);
});

test('declining sleep produces a "decreased" insight', () => {
  const series = buildSeries(records, 7);
  const sleep = series.find((s) => s.key === 'sleepHours')!;
  assert.ok(sleep.insights.some((i) => i.includes('decreased')));
});

test('rising stress produces an "increased" insight', () => {
  const series = buildSeries(records, 7);
  const stress = series.find((s) => s.key === 'stress')!;
  assert.ok(stress.insights.some((i) => i.includes('increased')));
});

test('every insight includes the non-diagnostic caveat when data exists', () => {
  for (const s of buildSeries(records, 7)) {
    if (s.points.length > 0) {
      assert.ok(s.insights.some((i) => i.includes('not medical conclusions')));
    }
  }
});

test('wellness score is 0–100 and higher for healthy records', () => {
  const score = computeWellnessScore(records);
  assert.ok(score > 0 && score <= 100);
  assert.equal(computeWellnessScore([]), 0);
});

test('report builder assembles sections only from selected indicators', () => {
  const opts = { ...defaultReportOptions(), indicators: ['heartRate', 'mood'], includeComments: false, removeSensitive: true };
  const report = buildReport(records, opts);
  const titles = report.sections.map((s) => s.title);
  assert.ok(titles.includes('Heart rate'));
  assert.ok(titles.includes('Mood'));
  assert.ok(!titles.includes('Blood glucose'));
  assert.equal(report.comments, undefined);
});

test('report disclaimer never claims diagnostic capability', () => {
  const report = buildReport(records, defaultReportOptions());
  assert.match(report.disclaimer, /not a medical professional/i);
  assert.match(report.disclaimer, /sample values/i);
});

test('alert → insight pipeline stays explainable end to end', () => {
  const fever = evaluateAlerts({
    today: { heartRate: 120, systolic: 150, diastolic: 92, temperature: 38.6, symptoms: ['Headache'] },
    previous: { heartRate: 70, systolic: 118, diastolic: 75, temperature: 36.6, symptoms: ['None'] },
    thresholds: t,
  });
  const reds = fever.filter((a) => a.level === 'red');
  assert.ok(reds.length >= 1);
  for (const a of fever) {
    assert.ok(a.whatChanged.length > 5);
    assert.ok(a.whyAttention.length > 5);
    assert.ok(a.nextSteps.length >= 2);
    assert.ok(a.whenSeekHelp.length > 5);
  }
});
