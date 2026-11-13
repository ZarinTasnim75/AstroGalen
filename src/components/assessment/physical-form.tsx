'use client';

import * as React from 'react';
import { Activity, Droplets, Utensils, X, ScanEye, Bone, Watch } from 'lucide-react';
import { PHYSICAL_METRICS } from '@/lib/metrics';
import type { PhysicalData } from '@/lib/types';
import { MetricField } from './metric-field';
import { Label, Select, Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';

const SYMPTOMS = ['None', 'Headache', 'Mild headache', 'Dizziness', 'Nausea', 'Muscle soreness', 'Joint pain', 'Fatigue beyond usual', 'Sore throat', 'Cough', 'Vision changes', 'Chest pain', 'Difficulty breathing', 'Severe headache', 'Fainting'];

export function PhysicalAssessmentForm({
  data,
  onChange,
  errors,
  sources,
}: {
  data: Partial<PhysicalData>;
  onChange: (patch: Partial<PhysicalData>) => void;
  errors: Record<string, string>;
  /** Field -> device source for values that were auto-filled from sensors. */
  sources?: Partial<Record<string, string>>;
}) {
  const m = (key: string) => PHYSICAL_METRICS.find((x) => x.key === key)!;
  const sourceBadge = (key: string) =>
    sources?.[key] ? (
      <Badge tone="amber" className="ml-2 text-[9px] px-1.5 py-0">
        <Watch className="h-2.5 w-2.5" /> Auto-filled · DEMO
      </Badge>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orbit-cyan/40 bg-orbit-cyan/5 p-3 flex items-start gap-2">
        <Watch className="h-4 w-4 text-orbit-cyan mt-0.5 shrink-0" />
        <p className="text-xs text-orbit-muted">
          <span className="font-semibold text-orbit-text">Continuous measurements are collected automatically</span> from connected
          devices (simulated DEMO hardware in this prototype). Values marked below came from the device feed — review and edit
          before saving. Blood pressure appears only when a BP monitor exists in this mission's equipment profile.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricField
          info={m('heartRate')}
          value={data.heartRate}
          error={errors.heartRate}
          onChange={(v) => onChange({ heartRate: v })}
          extra={sourceBadge('heartRate')}
        />
        <div className="rounded-xl border border-orbit-border/70 p-3">
          <Label hint="mmHg">Blood pressure (systolic / diastolic)</Label>
          {sourceBadge('systolic') ?? sourceBadge('diastolic')}
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="numeric"
              aria-label="Systolic blood pressure in mmHg"
              placeholder="e.g. 118"
              value={data.systolic ?? ''}
              onChange={(e) => onChange({ systolic: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
            <span className="self-center text-orbit-muted">/</span>
            <Input
              type="number"
              inputMode="numeric"
              aria-label="Diastolic blood pressure in mmHg"
              placeholder="e.g. 76"
              value={data.diastolic ?? ''}
              onChange={(e) => onChange({ diastolic: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </div>
          {(errors.systolic || errors.diastolic || errors.bloodPressure) && (
            <p className="mt-1 text-xs text-orbit-red">{errors.systolic ?? errors.diastolic ?? errors.bloodPressure}</p>
          )}
        </div>
        <MetricField
          info={m('glucose')}
          value={data.glucose}
          error={errors.glucose}
          onChange={(v) => onChange({ glucose: v })}
        />
        <MetricField
          info={m('temperature')}
          value={data.temperature}
          error={errors.temperature}
          onChange={(v) => onChange({ temperature: v })}
          extra={sourceBadge('temperature')}
        />
        <MetricField
          info={m('sleepHours')}
          value={data.sleepHours}
          error={errors.sleepHours}
          onChange={(v) => onChange({ sleepHours: v })}
          extra={sourceBadge('sleepHours')}
        />
        <MetricField
          info={m('exerciseMinutes')}
          value={data.exerciseMinutes}
          error={errors.exerciseMinutes}
          onChange={(v) => onChange({ exerciseMinutes: v })}
          extra={sourceBadge('exerciseMinutes')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-orbit-border/70 p-3">
          <Label htmlFor="hydration">
            <Droplets className="inline h-4 w-4 mr-1 text-orbit-cyan" />
            Hydration self-report
          </Label>
          <Select
            id="hydration"
            value={data.hydration ?? ''}
            onChange={(e) => onChange({ hydration: (e.target.value || undefined) as PhysicalData['hydration'] })}
          >
            <option value="">Not recorded</option>
            <option value="poor">Poor</option>
            <option value="fair">Fair</option>
            <option value="good">Good</option>
            <option value="excellent">Excellent</option>
          </Select>
        </div>
        <div className="rounded-xl border border-orbit-border/70 p-3">
          <Label htmlFor="nutrition">
            <Utensils className="inline h-4 w-4 mr-1 text-orbit-cyan" />
            Nutrition self-report
          </Label>
          <Select
            id="nutrition"
            value={data.nutrition ?? ''}
            onChange={(e) => onChange({ nutrition: (e.target.value || undefined) as PhysicalData['nutrition'] })}
          >
            <option value="">Not recorded</option>
            <option value="poor">Poor</option>
            <option value="fair">Fair</option>
            <option value="good">Good</option>
            <option value="excellent">Excellent</option>
          </Select>
        </div>
      </div>

      {/* Lab-measured values — entered by the astronaut after a separate test */}
      <div className="rounded-xl border border-orbit-violet/50 p-4">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Bone className="h-4 w-4 text-orbit-violet" /> Lab & clinic results <Badge tone="violet">entered after a separate test</Badge>
        </p>
        <p className="text-xs text-orbit-muted mb-3">
          These values come from scheduled laboratory / eye-clinic testing, not from wearable sensors. Enter them here after
          your test so AstroGalen can track them over time. AstroGalen never estimates bone density or eye power without a real
          measurement.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-orbit-border/70 p-3">
            <Label hint="WHO T-score (e.g. -1.0 to +1.0)">
              <Bone className="inline h-4 w-4 mr-1 text-orbit-violet" />
              Bone density (from DXA scan)
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              aria-label="Bone density T-score from DXA scan"
              placeholder="e.g. -0.4"
              value={data.boneDensity ?? ''}
              onChange={(e) => onChange({ boneDensity: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
            <p className="mt-1 text-[11px] text-orbit-muted">
              Lower scores indicate lower bone density. Track the trend across mission phases; never self-interpret a single value.
            </p>
          </div>
          <div className="rounded-xl border border-orbit-border/70 p-3">
            <Label hint="diopters (spherical equivalent)">
              <ScanEye className="inline h-4 w-4 mr-1 text-orbit-violet" />
              Eye power (from eye exam)
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.25"
              aria-label="Eye power in diopters from eye examination"
              placeholder="e.g. -0.75"
              value={data.eyePower ?? ''}
              onChange={(e) => onChange({ eyePower: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
            <p className="mt-1 text-[11px] text-orbit-muted">
              Negative values indicate myopia, positive hyperopia. Visual changes in spaceflight (SANS) are tracked by NASA
              research — record exactly what the exam reported.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-orbit-border/70 p-3">
        <Label>
          <Activity className="inline h-4 w-4 mr-1 text-orbit-cyan" />
          Current physical symptoms
        </Label>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => {
            const selected = (data.symptoms ?? []).includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  const cur = data.symptoms ?? [];
                  onChange({ symptoms: selected ? cur.filter((x) => x !== s) : [...cur, s] });
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  selected
                    ? 'border-orbit-cyan bg-orbit-cyan/15 text-orbit-cyan'
                    : 'border-orbit-border text-orbit-muted hover:border-orbit-cyan/50'
                }`}
              >
                {s === 'None' ? 'None' : selected ? <X className="mr-1 inline h-3 w-3" /> : null}
                {s}
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <Label htmlFor="symptoms-note" hint="optional">
            Details (e.g. when it started, what triggers it)
          </Label>
          <Input
            id="symptoms-note"
            type="text"
            value={data.symptomsNote ?? ''}
            onChange={(e) => onChange({ symptomsNote: e.target.value })}
            placeholder="Optional free-text details"
          />
        </div>
        <p className="mt-2 text-xs text-orbit-muted">
          Honest symptom reporting never affects your rewards. New or worsening symptoms belong in the medical log.
        </p>
      </div>
    </div>
  );
}
