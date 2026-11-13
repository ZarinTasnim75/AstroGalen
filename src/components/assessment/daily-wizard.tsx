'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Save, ChevronLeft, ChevronRight, PartyPopper, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { db, getSettings } from '@/lib/db';
import type { AssessmentRecord, DailyDraft, MentalData, PhysicalData, SectionKey } from '@/lib/types';
import { physicalComplete, validatePhysical } from '@/lib/metrics';
import { evaluateAlerts, type OrbitAlert } from '@/lib/alerts';
import { dateKey } from '@/lib/utils';
import { recordJourneySection, useJourney } from '@/hooks/use-journey';
import { useSensors } from '@/hooks/use-sensors';
import { Button } from '@/components/ui/button';
import { Badge, Progress, Card } from '@/components/ui/card';
import { PhysicalAssessmentForm } from './physical-form';
import { MentalWellnessForm } from './mental-form';
import { HealthAlert } from '@/components/health-alert';
import { Disclaimer } from '@/components/disclaimer';

const STEPS: { key: SectionKey; title: string; sub: string }[] = [
  { key: 'physical', title: 'Physical Health Assessment', sub: 'Sensor data, symptoms, lab results' },
  { key: 'mental', title: 'Mental Wellness Assessment', sub: 'Mood, stress, focus, journal' },
];

export function DailyAssessmentWizard() {
  const [today] = React.useState(() => dateKey());
  const [draft, setDraft] = React.useState<DailyDraft | null>(null);
  const [step, setStep] = React.useState(0);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [alerts, setAlerts] = React.useState<OrbitAlert[] | null>(null);
  const [demo, setDemo] = React.useState(false);
  const [prefilled, setPrefilled] = React.useState(false);
  const [prefilledKeys, setPrefilledKeys] = React.useState<string[]>([]);
  const { snapshot } = useSensors();
  const { state: journeyState, refresh: refreshJourney } = useJourney(today);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    (async () => {
      let d = await db.drafts.get(today);
      if (!d) {
        d = { dateKey: today, completed: [], updatedAt: Date.now() };
        await db.drafts.put(d);
      }
      setDraft(d);
      const s = await getSettings();
      setDemo(s.demoMode);
      // Legacy-data sync: if a section was already completed today (e.g. from a
      // previous app version's draft), make sure ORBI's journey knows it.
      for (const section of ['physical', 'mental'] as const) {
        if (d.completed?.includes(section)) {
          const j = await recordJourneySection(today, section, d.updatedAt);
          void j;
        }
      }
      refreshJourney();
    })();
  }, [today, refreshJourney]);

  // Debounced draft persistence — survives refresh/close.
  React.useEffect(() => {
    if (!draft) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      db.drafts.put({ ...draft, updatedAt: Date.now() });
    }, 350);
    return () => clearTimeout(saveTimer.current);
  }, [draft]);

  // Automatic sensor pre-fill: continuous measurements come from the device
  // feed (DEMO simulation) — the astronaut reviews them before submitting and
  // is never asked to re-enter values a connected device already provides.
  React.useEffect(() => {
    if (!draft || !snapshot || prefilled) return;
    if (draft.completed?.includes('physical')) {
      setPrefilled(true);
      return;
    }
    const hr = snapshot.personal.find((r) => r.key === 'heartRate');
    const bp = snapshot.personal.find((r) => r.key === 'bloodPressure');
    const sleep = snapshot.personal.find((r) => r.key === 'sleep');
    const act = snapshot.personal.find((r) => r.key === 'activity');
    const temp = snapshot.personal.find((r) => r.key === 'temperature');
    const prefill: Partial<PhysicalData> = {
      heartRate: draft.physical?.heartRate ?? (hr?.value !== undefined ? hr.value : undefined),
      systolic: draft.physical?.systolic ?? (bp?.quality === 'unavailable' ? undefined : bp?.value),
      diastolic: draft.physical?.diastolic ?? (bp?.quality === 'unavailable' ? undefined : bp?.value2),
      sleepHours: draft.physical?.sleepHours ?? sleep?.value,
      exerciseMinutes: draft.physical?.exerciseMinutes ?? act?.value,
      temperature: draft.physical?.temperature ?? temp?.value,
      symptoms: draft.physical?.symptoms ?? [],
    };
    const keys = (Object.keys(prefill) as (keyof PhysicalData)[]).filter(
      (k) => k !== 'symptoms' && draft.physical?.[k] === undefined && prefill[k] !== undefined,
    );
    setPrefilledKeys(keys.map(String));
    setDraft((d) => (d ? { ...d, physical: { ...prefill, ...d.physical } } : d));
    setPrefilled(true);
  }, [draft, snapshot, prefilled]);

  const patch = (section: SectionKey, p: Partial<PhysicalData> & Partial<MentalData>) => {
    setDraft((d) => (d ? { ...d, [section]: { ...(d[section] ?? {}), ...p } } : d));
  };

  const submitSection = async (key: SectionKey) => {
    if (!draft) return;
    let sectionData: PhysicalData & MentalData = {
      ...((draft[key] ?? {}) as PhysicalData & MentalData),
    };

    if (key === 'mental') {
      // The sliders display a default of 3/5 but stay undefined in the draft
      // until the user drags them. Apply the displayed default so Save always
      // matches what the form shows; only the mood emoji requires a choice.
      const mentalDefaults: Partial<MentalData> = {
        stress: 3,
        mentalFatigue: 3,
        physicalFatigue: 3,
        sleepQuality: 3,
        concentration: 3,
        motivation: 3,
      };
      sectionData = { ...mentalDefaults, ...sectionData };
      if (typeof sectionData.mood !== 'number') {
        toast.error('Please choose your mood emoji, then save the wellness check.');
        return;
      }
    }

    if (key === 'physical') {
      const issues = validatePhysical(sectionData as Partial<PhysicalData> as Record<string, unknown>);
      if (issues.length > 0) {
        const map: Record<string, string> = {};
        for (const i of issues) map[i.field] = i.message;
        setErrors(map);
        toast.error('Please complete the required information.');
        return;
      }
      if (!physicalComplete(sectionData as Partial<PhysicalData>)) {
        setErrors({ heartRate: 'Record at least one value (or symptoms) before saving the assessment.' });
        toast.error('Please complete the required information.');
        return;
      }
    }
    setErrors({});
    setSubmitting(true);

    const record: AssessmentRecord = {
      ts: Date.now(),
      dateKey: today,
      section: key,
      data: sectionData,
      isDemo: demo || undefined,
    };
    await db.assessments.add(record);

    // ORBI's Earth-to-Moon journey — powered by exactly these two assessments.
    const transition = await recordJourneySection(today, key);

    const completed = Array.from(new Set([...(draft.completed ?? []), key]));
    const nextDraft: DailyDraft = { ...draft, completed, [key]: sectionData, updatedAt: Date.now() };
    setDraft(nextDraft);
    await db.drafts.put(nextDraft);

    if (key === 'physical') {
      toast.success('Physical assessment saved successfully.');
      const prev = await lastPhysicalBefore(today);
      setAlerts(
        evaluateAlerts({
          today: sectionData as PhysicalData,
          previous: prev,
          thresholds: (await getSettings()).mission.thresholds,
        }),
      );
    } else {
      toast.success('Your wellness check-in has been recorded.');
    }

    if (transition.after === 2) {
      toast.success('Mission accomplished! ORBI reached the Moon! 🚀');
    } else if (transition.before === 0 && transition.after === 1) {
      toast.message('ORBI grew stronger — one more health check and the flight to the Moon begins!');
    }

    setSubmitting(false);
  };

  const redoSection = async (key: SectionKey) => {
    if (!draft) return;
    setDraft({ ...draft, completed: (draft.completed ?? []).filter((s) => s !== key) });
    toast.info('You can update this section and save it again.');
  };

  if (!draft) {
    return <Card>Loading your assessment…</Card>;
  }

  const completed = new Set(draft.completed ?? []);
  // The journey is powered by exactly two daily assessments; legacy 'prevention'
  // completions in old drafts no longer count.
  const journeyDone = (['physical', 'mental'] as const).filter((s) => completed.has(s)).length;
  const pct = (journeyDone / 2) * 100;
  const allDone = journeyDone === 2;

  return (
    <div className="space-y-4">
      <Disclaimer compact />

      {/* Step progress */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Today’s mission: {journeyDone}/2 assessments</h2>
          <Badge tone={demo ? 'amber' : 'muted'}>{demo ? 'Demo data enabled' : 'Live personal data'}</Badge>
        </div>
        <Progress value={pct} aria-label="Daily assessment progress" />
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {STEPS.map((s, i) => {
            const done = completed.has(s.key);
            return (
              <button
                key={s.key}
                onClick={() => setStep(i)}
                aria-current={step === i ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                  step === i ? 'border-orbit-cyan bg-orbit-cyan/10' : 'border-orbit-border/60 hover:border-orbit-cyan/40'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-orbit-green shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-orbit-muted shrink-0" />
                )}
                <span>
                  <span className="block text-xs font-semibold">{`Step ${i + 1}: ${s.title}`}</span>
                  <span className="block text-[10px] text-orbit-muted">{done ? 'Completed today' : s.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {alerts && completed.has('physical') && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">Health observations from today’s assessment</h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-orbit-green">
              ✔ No configured warning conditions identified in the available data (based on your sample mission thresholds).
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <HealthAlert key={a.id} alert={a} />
              ))}
            </div>
          )}
          <p className="text-xs text-orbit-muted mt-3">
            Green: nothing flagged · Amber: verify/monitor · Red: mission-defined urgent criterion — follow approved procedure.
            Thresholds are sample values you can edit in Settings.
          </p>
        </Card>
      )}

      {allDone && (
        <Card className="border-orbit-green/40">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-orbit-green" />
            <h3 className="text-sm font-semibold">Both assessments complete — ORBI flew to the Moon!</h3>
          </div>
          <p className="text-sm text-orbit-muted mt-2">
            A new journey begins with tomorrow’s assessments. View your{' '}
            <Link href="/insights" className="text-orbit-cyan underline">trends</Link> or open the{' '}
            <Link href="/body" className="text-orbit-cyan underline">Body Explorer</Link>.
          </p>
        </Card>
      )}

      {/* Current step */}
      <Card>
        <h3 className="text-lg font-semibold">{STEPS[step].title}</h3>
        <p className="text-sm text-orbit-muted mb-4">{STEPS[step].sub}</p>

        {completed.has(STEPS[step].key) ? (
          <div className="rounded-xl border border-orbit-green/40 bg-orbit-green/10 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-orbit-green mt-0.5" />
            <div className="flex-1">
              <p className="text-sm">This assessment was saved today and ORBI has already counted it toward today’s journey.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => redoSection(STEPS[step].key)}>
                <RotateCcw className="h-3.5 w-3.5" /> Redo today’s {STEPS[step].title.toLowerCase()}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {step === 0 && (
              <PhysicalAssessmentForm
                data={(draft.physical ?? {}) as Partial<PhysicalData>}
                onChange={(p) => patch('physical', p)}
                errors={errors}
                sources={Object.fromEntries(prefilledKeys.map((k) => [k, 'Auto-filled from connected device (DEMO)']))}
              />
            )}
            {step === 1 && <MentalWellnessForm data={(draft.mental ?? {}) as Partial<MentalData>} onChange={(p) => patch('mental', p)} />}

            <div className="flex items-center justify-between mt-5">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1 text-xs text-orbit-muted">
                  <Save className="h-3.5 w-3.5" /> Progress auto-saves locally
                </span>
                <Button onClick={() => submitSection(STEPS[step].key)} disabled={submitting}>
                  {submitting ? 'Saving…' : `Save ${STEPS[step].title.toLowerCase()}`}
                </Button>
                {step < 1 && (
                  <Button variant="outline" onClick={() => setStep((s) => Math.min(1, s + 1))}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

async function lastPhysicalBefore(todayKey: string): Promise<PhysicalData | undefined> {
  const recs = await db.assessments.where('section').equals('physical').reverse().sortBy('ts');
  const prev = recs.find((r) => r.dateKey < todayKey && !(r.dateKey === todayKey));
  return (prev?.data as PhysicalData) ?? undefined;
}
