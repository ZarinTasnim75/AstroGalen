// AstroGalen — Demo Mode. Generates clearly-labelled FICTIONAL astronaut data so
// every feature can be explored. Demo records are tagged isDemo and are never
// presented as real astronaut data.

import { db } from './db';
import type { AssessmentRecord, PreventionStatus, Thresholds } from './types';
import { dateKey } from './utils';

export const DEMO_LABEL = 'Demo data — fictional, not real measurements';

export async function isDemoSeeded(): Promise<boolean> {
  const anyDemo = await db.assessments.where('isDemo').equals(1).limit(1).toArray();
  return anyDemo.length > 0;
}

export async function seedDemoData(thresholds: Thresholds): Promise<number> {
  await clearDemoData();
  const records: AssessmentRecord[] = [];
  const now = Date.now();
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const jitter = (n: number, amp: number) => n + (rand() - 0.5) * 2 * amp;

  const symptomsPool = ['Mild headache', 'Muscle soreness', 'None'];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = dateKey(d);
    const ts = d.setHours(20, 30, 0, 0);

    // Simulated baseline drift: mild fatigue increase in last week, sleep dip.
    const fatigueTrend = i < 7 ? 0.8 : 0;
    const sleepTrend = i < 5 ? -1.2 : 0;

    const phys: AssessmentRecord['data'] = {
      heartRate: Math.round(jitter(66 - fatigueTrend * 2, 4)),
      systolic: Math.round(jitter(118, 6)),
      diastolic: Math.round(jitter(74, 5)),
      glucose: Math.round(jitter(96, 12)),
      temperature: Math.round(jitter(36.6 + fatigueTrend * 0.05, 0.2) * 10) / 10,
      sleepHours: Math.round(Math.max(3, jitter(7.2 + sleepTrend, 0.9)) * 10) / 10,
      exerciseMinutes: Math.round(Math.max(0, jitter(48, 22))),
      hydration: (['good', 'good', 'excellent', 'fair'] as const)[Math.floor(rand() * 4)],
      nutrition: (['good', 'good', 'fair', 'excellent'] as const)[Math.floor(rand() * 4)],
      symptoms: rand() < 0.12 ? [symptomsPool[Math.floor(rand() * 2)]] : ['None'],
    };
    records.push({ ts, dateKey: key, section: 'physical', data: phys as never, isDemo: true });

    const mental: AssessmentRecord['data'] = {
      mood: Math.max(1, Math.min(5, Math.round(jitter(3.8 - fatigueTrend * 0.5, 0.6)))),
      stress: Math.max(1, Math.min(5, Math.round(jitter(2.4 + fatigueTrend * 0.5, 0.6)))),
      mentalFatigue: Math.max(1, Math.min(5, Math.round(jitter(2.3 + fatigueTrend, 0.6)))),
      physicalFatigue: Math.max(1, Math.min(5, Math.round(jitter(2.5 + fatigueTrend * 0.7, 0.6)))),
      sleepQuality: Math.max(1, Math.min(5, Math.round(jitter(3.6 + sleepTrend * 0.5, 0.6)))),
      concentration: Math.max(1, Math.min(5, Math.round(jitter(3.7 - fatigueTrend * 0.5, 0.6)))),
      motivation: Math.max(1, Math.min(5, Math.round(jitter(3.9 - fatigueTrend * 0.4, 0.6)))),
      reactionMs: Math.round(jitter(310 + fatigueTrend * 40, 35)),
      attentionScore: Math.round(jitter(92 - fatigueTrend * 4, 4)),
    };
    records.push({ ts, dateKey: key, section: 'mental', data: mental as never, isDemo: true });

    const prevention: AssessmentRecord['data'] = {
      items: {
        exercise: rand() < 0.82 ? 'done' : 'missed',
        nutrition: rand() < 0.85 ? 'done' : ('na' as PreventionStatus),
        sleep: rand() < 0.8 ? 'done' : 'missed',
        hydration: rand() < 0.9 ? 'done' : 'missed',
        symptoms: phys.symptoms[0] === 'None' ? 'missed' : 'done',
        other: rand() < 0.6 ? 'done' : ('na' as PreventionStatus),
      },
    };
    records.push({ ts, dateKey: key, section: 'prevention', data: prevention as never, isDemo: true });
  }

  await db.assessments.bulkAdd(records);
  return records.length;
}

export async function clearDemoData(): Promise<void> {
  await db.assessments.where('isDemo').equals(1).delete();
  await db.journal.toArray().then((all) => db.journal.bulkDelete(all.filter((j) => j.text.startsWith('[demo]')).map((j) => j.id!)));
}
