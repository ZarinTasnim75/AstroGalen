'use client';

import * as React from 'react';
import { Gauge, Timer, BookHeart } from 'lucide-react';
import { MENTAL_METRICS } from '@/lib/metrics';
import type { MentalData } from '@/lib/types';
import { Label, Slider, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MOODS = [
  { value: 5, emoji: '😄', label: 'Very good' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 2, emoji: '😣', label: 'Stressed' },
  { value: 1, emoji: '😫', label: 'Very difficult' },
];

const SCALE_FIELDS: { key: keyof MentalData; label: string; low: string; high: string; invert?: boolean }[] = [
  { key: 'stress', label: 'Stress level', low: 'Very calm', high: 'Very stressed' },
  { key: 'mentalFatigue', label: 'How mentally tired do you feel today?', low: 'Fresh', high: 'Exhausted' },
  { key: 'physicalFatigue', label: 'Physical fatigue', low: 'Energetic', high: 'Drained' },
  { key: 'sleepQuality', label: 'Sleep quality', low: 'Very poor', high: 'Excellent' },
  { key: 'concentration', label: 'Concentration & focus', low: 'Very scattered', high: 'Very sharp' },
  { key: 'motivation', label: 'Motivation & general well-being', low: 'Very low', high: 'Very strong' },
];

export function MentalWellnessForm({
  data,
  onChange,
  onJournal,
}: {
  data: Partial<MentalData>;
  onChange: (patch: Partial<MentalData>) => void;
  onJournal?: (text: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orbit-border/70 p-4">
        <Label>How are you feeling today?</Label>
        <div className="flex justify-between gap-2" role="radiogroup" aria-label="Mood">
          {MOODS.map((m) => {
            const selected = data.mood === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={m.label}
                onClick={() => onChange({ mood: m.value })}
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2 transition ${
                  selected
                    ? 'border-orbit-cyan bg-orbit-cyan/15 shadow-glow-sm'
                    : 'border-orbit-border hover:border-orbit-cyan/50'
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {m.emoji}
                </span>
                <span className="text-[10px] text-orbit-muted">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {SCALE_FIELDS.map((f) => {
        const info = MENTAL_METRICS.find((x) => x.key === f.key)!;
        const val = (data[f.key] as number | undefined) ?? 3;
        return (
          <div key={f.key} className="rounded-xl border border-orbit-border/70 p-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor={`sl-${f.key}`}>
                <Gauge className="inline h-4 w-4 mr-1 text-orbit-violet" />
                {f.label}
              </Label>
              <span className="text-sm font-semibold text-orbit-cyan">{val}/5</span>
            </div>
            <Slider
              id={`sl-${f.key}`}
              aria-label={`${f.label}, 1 to 5`}
              value={val}
              onChange={(v) => onChange({ [f.key]: v } as Partial<MentalData>)}
            />
            <div className="flex justify-between text-xs text-orbit-muted mt-1">
              <span>{f.low}</span>
              <span>{f.high}</span>
            </div>
            <details className="mt-2 text-xs text-orbit-muted">
              <summary className="cursor-pointer text-orbit-cyan select-none">Why this matters</summary>
              <p className="mt-1">{info.why}</p>
              <p className="mt-1 text-orbit-amber/80">Scales are for personal trend tracking, not for clinical scoring.</p>
            </details>
          </div>
        );
      })}

      <ReactionTest onResult={(ms, score) => onChange({ reactionMs: ms, attentionScore: score })} existing={data.reactionMs} />

      <div className="rounded-xl border border-orbit-border/70 p-4">
        <Label htmlFor="journal">
          <BookHeart className="inline h-4 w-4 mr-1 text-orbit-violet" />
          Private journal (optional)
        </Label>
        <Textarea
          id="journal"
          placeholder="A few words about your day… stays on this device, never shared."
          value={data.journal ?? ''}
          onChange={(e) => {
            onChange({ journal: e.target.value });
            onJournal?.(e.target.value);
          }}
        />
        <p className="mt-1 text-xs text-orbit-muted">
          Journal entries are stored only in your local database and are excluded from shared reports by default.
        </p>
      </div>
    </div>
  );
}

// Simple attention / reaction-time exercise: 5 trials, tap when the pad lights up.
// For personal performance trends only — not a cognitive diagnosis.
function ReactionTest({ onResult, existing }: { onResult: (avgMs: number, score: number) => void; existing?: number }) {
  const [state, setState] = React.useState<'idle' | 'wait' | 'go' | 'done'>('idle');
  const [times, setTimes] = React.useState<number[]>([]);
  const [message, setMessage] = React.useState('');
  const goAt = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const startTrial = () => {
    setState('wait');
    setMessage('Wait for green…');
    timer.current = setTimeout(() => {
      goAt.current = performance.now();
      setState('go');
      setMessage('TAP NOW');
    }, 1200 + Math.random() * 2500);
  };

  const tap = () => {
    if (state === 'wait') {
      clearTimeout(timer.current);
      setState('idle');
      setMessage('Too early — tap Start to try again.');
      return;
    }
    if (state === 'go') {
      const t = Math.round(performance.now() - goAt.current);
      const all = [...times, t];
      setTimes(all);
      if (all.length >= 5) {
        const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
        const score = Math.max(0, Math.min(100, Math.round(100 - (avg - 200) / 5)));
        onResult(avg, score);
        setState('done');
        setMessage(`Average reaction: ${avg} ms over 5 trials.`);
      } else {
        setState('idle');
        setMessage(`${t} ms — ${all.length}/5 done. Tap Start for the next trial.`);
      }
    }
  };

  return (
    <div className="rounded-xl border border-orbit-border/70 p-4">
      <Label>
        <Timer className="inline h-4 w-4 mr-1 text-orbit-violet" />
        60-second attention exercise (optional)
      </Label>
      <button
        type="button"
        onClick={state === 'idle' || state === 'done' ? startTrial : tap}
        className={`w-full h-24 rounded-xl border-2 font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-cyan ${
          state === 'go'
            ? 'border-orbit-green bg-orbit-green/25 text-orbit-green'
            : state === 'wait'
              ? 'border-orbit-amber/60 bg-orbit-amber/10 text-orbit-amber'
              : 'border-orbit-cyan/50 bg-orbit-cyan/10 text-orbit-cyan'
        }`}
      >
        {state === 'idle' && (times.length ? 'Tap for next trial' : 'Tap to start (5 trials)')}
        {state === 'wait' && 'Wait…'}
        {state === 'go' && 'TAP!'}
        {state === 'done' && 'Done — tap to repeat'}
      </button>
      {message && <p className="mt-2 text-xs text-orbit-muted">{message}</p>}
      {existing !== undefined && (
        <p className="mt-1 text-xs text-orbit-cyan">Today’s recorded average: {existing} ms</p>
      )}
      <p className="mt-1 text-xs text-orbit-muted">
        This tracks your personal performance trend across days. It does not assess or diagnose cognitive ability.
      </p>
    </div>
  );
}
