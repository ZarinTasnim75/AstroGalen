'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Activity, HeartPulse, Droplets, Thermometer, Waves, Eye, FlaskConical, Gauge, CircleCheck, CircleOff, MonitorPlay, Upload, Save } from 'lucide-react';
import { db, getSettings } from '@/lib/db';
import { EQUIPMENT_INFO, EQUIPMENT_IDS, profileFor, equipmentStatus } from '@/lib/equipment';
import type { AppSettings, EquipmentId, EquipmentStatus, MedicalTestRecord } from '@/lib/types';
import { useOnline } from '@/components/offline-status';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge, Card, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Disclaimer } from '@/components/disclaimer';

const TEST_ICONS: Record<EquipmentId, React.ComponentType<{ className?: string }>> = {
  ecg: HeartPulse,
  ultrasound: Waves,
  bp: Gauge,
  glucose: Droplets,
  pulseOx: Activity,
  thermometer: Thermometer,
  labAnalyzer: FlaskConical,
  eyeExam: Eye,
};

const STATUS_BADGE: Record<EquipmentStatus, { tone: 'green' | 'amber' | 'muted'; label: string }> = {
  available: { tone: 'green', label: 'Available' },
  demo: { tone: 'amber', label: 'Demo mode' },
  unavailable: { tone: 'muted', label: 'Not installed' },
};

export default function MedicalTestsPage() {
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [records, setRecords] = React.useState<MedicalTestRecord[]>([]);
  const [openTest, setOpenTest] = React.useState<EquipmentId | null>(null);
  const online = useOnline();

  const load = React.useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
    const recs = await db.medicalTests.reverse().sortBy('ts');
    setRecords(recs.slice(0, 60));
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (!settings) return <Card>Loading medical test inventory…</Card>;

  const profile = profileFor(settings.mission.environmentId);

  return (
    <div className="space-y-5">
      <header className="pt-4">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge tone="cyan">Medical Tests</Badge>
          <Badge tone="violet">{profile.label}</Badge>
          {!online && <Badge tone="amber">Offline — inventory and local records available</Badge>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orbit-cyan via-orbit-blue to-orbit-violet bg-clip-text text-transparent">
          Onboard Medical Test Station
        </h1>
        <p className="text-sm text-orbit-muted mt-1 max-w-3xl">
          {profile.description} The tests below depend on the equipment configured for{' '}
          <span className="text-orbit-text font-medium">{settings.mission.environment}</span> — change the mission environment and
          equipment inventory under <a href="/settings" className="text-orbit-cyan underline">Settings → Mission equipment</a>.
        </p>
      </header>

      <Disclaimer compact />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {EQUIPMENT_IDS.map((id) => {
          const info = EQUIPMENT_INFO[id];
          const status = equipmentStatus(profile, id);
          const Icon = TEST_ICONS[id];
          const last = records.find((r) => r.test === id);
          const count = records.filter((r) => r.test === id).length;
          return (
            <div key={id} className="panel p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-6 w-6 text-orbit-cyan" />
                <Badge tone={STATUS_BADGE[status].tone}>{STATUS_BADGE[status].label}</Badge>
              </div>
              <p className="text-sm font-semibold">{info.name}</p>
              <p className="text-[11px] text-orbit-muted flex-1">
                <span className="text-orbit-text font-medium">Measures:</span> {info.measures}
                <br />
                <span className="text-orbit-text font-medium">Device:</span> {info.device}
              </p>
              <p className="text-[11px] text-orbit-muted">
                {last ? `Last test: ${new Date(last.ts).toLocaleString()}` : 'No test records yet'}
                {count > 0 ? ` · ${count} record${count > 1 ? 's' : ''}` : ''}
              </p>
              <Button
                size="sm"
                variant={status === 'unavailable' ? 'outline' : 'default'}
                disabled={status === 'unavailable'}
                onClick={() => {
                  if (status === 'unavailable') return;
                  setOpenTest(id);
                }}
                title={status === 'unavailable' ? 'This equipment is not installed on the selected mission environment.' : undefined}
              >
                {status === 'unavailable' ? <CircleOff className="h-4 w-4" /> : <MonitorPlay className="h-4 w-4" />}
                {status === 'unavailable' ? 'Cannot perform' : status === 'demo' ? 'Open demo interface' : 'Start test'}
              </Button>
            </div>
          );
        })}
      </div>

      {records.length > 0 && (
        <Card>
          <CardTitle>Recent test records (stored locally)</CardTitle>
          <ul className="mt-2 divide-y divide-orbit-border/40">
            {records.map((r) => (
              <li key={r.id} className="py-2 flex items-start gap-3 text-sm">
                {r.simulated ? <Badge tone="amber" className="shrink-0">SIMULATED</Badge> : <CircleCheck className="h-4 w-4 text-orbit-green mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-medium">{EQUIPMENT_INFO[r.test].name}</p>
                  <p className="text-xs text-orbit-muted truncate">{r.summary}</p>
                  <p className="text-[10px] text-orbit-muted">{new Date(r.ts).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <TestDialog
        open={openTest !== null}
        test={openTest}
        status={openTest ? equipmentStatus(profile, openTest) : 'available'}
        onClose={() => setOpenTest(null)}
        onSaved={async () => {
          await load();
          toast.success('Test record saved locally.');
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function TestDialog({ open, test, status, onClose, onSaved }: {
  open: boolean;
  test: EquipmentId | null;
  status: EquipmentStatus;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!test) return null;
  const info = EQUIPMENT_INFO[test];
  const simulated = status === 'demo';

  const save = async (record: Omit<MedicalTestRecord, 'id' | 'ts'>) => {
    await db.medicalTests.add({ ...record, ts: Date.now() });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={`${info.name}${simulated ? ' — demo interface' : ''}`} className="max-w-2xl">
      <div className="space-y-3 text-sm">
        <p className="text-orbit-muted">{info.whySpace}</p>
        {simulated && (
          <div className="rounded-xl border border-orbit-amber/50 bg-orbit-amber/10 p-3 text-xs">
            <strong>Demo mode:</strong> this interface is simulated for demonstration. Nothing here is a genuine medical test
            result, and all records are clearly labelled SIMULATED.
          </div>
        )}
        {test === 'ecg' && <EcgPanel simulated={simulated} onSave={save} />}
        {test === 'ultrasound' && <UltrasoundPanel simulated={simulated} onSave={save} />}
        {test !== 'ecg' && test !== 'ultrasound' && <ManualPanel test={test} simulated={simulated} onSave={save} />}
      </div>
    </Dialog>
  );
}

// ---- ECG --------------------------------------------------------------------

function EcgPanel({ simulated, onSave }: { simulated: boolean; onSave: (r: Omit<MedicalTestRecord, 'id' | 'ts'>) => void }) {
  const [stage, setStage] = React.useState<'idle' | 'connecting' | 'capturing'>('idle');
  const [lead, setLead] = React.useState('Lead II');
  const [frozen, setFrozen] = React.useState(false);

  const connect = () => {
    setStage('connecting');
    // Device-connection workflow: in this prototype the adapter is simulated.
    window.setTimeout(() => {
      setStage('capturing');
      toast.message(simulated ? 'Connected to demo ECG adapter (SIMULATED).' : 'Connected to ECG adapter.');
    }, 900);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="ecg-lead" className="mb-0">Lead</Label>
        <Select id="ecg-lead" value={lead} onChange={(e) => setLead(e.target.value)} className="w-40">
          <option>Lead II</option>
          <option>Lead I</option>
          <option>Lead III</option>
        </Select>
        {stage === 'idle' && (
          <Button onClick={connect}>
            <MonitorPlay className="h-4 w-4" /> Connect device
          </Button>
        )}
        {stage === 'connecting' && <span className="text-xs text-orbit-amber">Connecting to ECG adapter…</span>}
        {stage === 'capturing' && (
          <>
            <Badge tone={simulated ? 'amber' : 'green'}>{simulated ? 'SIMULATED ECG WAVEFORM' : 'ECG adapter connected'}</Badge>
            <Button size="sm" variant="outline" onClick={() => setFrozen((f) => !f)}>
              {frozen ? 'Resume capture' : 'Freeze strip'}
            </Button>
          </>
        )}
      </div>

      {stage === 'capturing' && (
        <div className="rounded-xl border border-orbit-border/70 bg-orbit-bg/60 p-3">
          <div className="flex items-center justify-between mb-1 text-xs text-orbit-muted">
            <span>Waveform received from device adapter · {lead} · 25 mm/s</span>
            <span>{simulated ? 'DEMO — generated waveform, not a medical result' : `Received ${new Date().toLocaleTimeString()}`}</span>
          </div>
          <EcgWaveform paused={frozen} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              onClick={() =>
                onSave({
                  test: 'ecg',
                  kind: 'ecg',
                  summary: `${lead} rhythm strip captured via ${simulated ? 'demo adapter (SIMULATED)' : 'device adapter'}. Rate ≈ 68 bpm, regular rhythm — demo waveform for interface testing.`,
                  data: { lead, bpm: 68, rhythm: 'regular (simulated waveform)' },
                  simulated,
                })
              }
            >
              <Save className="h-4 w-4" /> Save strip to local record
            </Button>
            <span className="text-xs text-orbit-muted">Saved records can be included in the Medical Report (local export or consent-based sharing).</span>
          </div>
        </div>
      )}
      {stage === 'idle' && (
        <p className="text-xs text-orbit-muted">
          The connection workflow accepts a compatible device adapter. In this prototype no hardware is attached — after
          “Connect device” you will see a clearly-marked simulated waveform.
        </p>
      )}
    </div>
  );
}

/** Clearly-labelled simulated ECG trace (PQRST synthesis, 60–75 bpm wander). */
function EcgWaveform({ paused }: { paused: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = (canvas.width = canvas.offsetWidth * 2);
    let h = (canvas.height = 260);
    let raf = 0;
    const start = performance.now();

    const pqrst = (phase: number): number => {
      // phase in [0,1) of one beat
      const g = (c: number, w: number, a: number) => a * Math.exp(-Math.pow((phase - c) / w, 2));
      return g(0.16, 0.035, 0.16) + g(0.26, 0.012, -0.22) + g(0.29, 0.016, 1.0) + g(0.325, 0.014, -0.32) + g(0.5, 0.06, 0.3);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = 'rgba(120,160,220,0.12)';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // trace
      const scroll = paused ? 0 : (t - start) * 0.16;
      ctx.strokeStyle = 'rgb(var(--orbit-cyan))';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        const beatT = ((x + scroll) / 220) % 1;
        const baseline = h * 0.62 + Math.sin((x + scroll) / 400) * 4;
        const y = baseline - pqrst(beatT) * h * 0.4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (!reduced && !paused) raf = requestAnimationFrame(draw);
    };
    draw(start);
    if (!reduced && !paused) raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  return <canvas ref={canvasRef} className="w-full h-[130px]" role="img" aria-label="Simulated ECG waveform (demo)" />;
}

// ---- Ultrasound -------------------------------------------------------------

function UltrasoundPanel({ simulated, onSave }: { simulated: boolean; onSave: (r: Omit<MedicalTestRecord, 'id' | 'ts'>) => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [system, setSystem] = React.useState('Cardiac');
  const [note, setNote] = React.useState('');

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-orbit-border/70 p-3">
        <Label htmlFor="usg-file">Capture / import compatible ultrasound image</Label>
        <input
          id="usg-file"
          type="file"
          accept="image/*,.dcm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 text-xs text-orbit-muted"
        />
        <p className="text-[11px] text-orbit-muted mt-1">
          AstroGalen never generates fake ultrasound images. If no image is imported, only examination metadata is stored.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="usg-system">Body system</Label>
          <Select id="usg-system" value={system} onChange={(e) => setSystem(e.target.value)}>
            <option>Cardiac</option>
            <option>Ocular (SANS screening)</option>
            <option>Abdominal</option>
            <option>Musculoskeletal</option>
            <option>Vascular</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="usg-note" hint="optional">Examination notes</Label>
          <Input id="usg-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. limited by time window" />
        </div>
      </div>
      <Button
        onClick={() =>
          onSave({
            test: 'ultrasound',
            kind: 'ultrasound',
            summary: `${system} examination metadata stored${file ? ` with imported file "${file.name}" (${Math.round(file.size / 1024)} kB)` : ' (no image imported)'}.${simulated ? ' Demo interface (SIMULATED).' : ''}${note ? ` Notes: ${note}` : ''}`,
            data: { system, fileName: file?.name, note },
            simulated,
          })
        }
      >
        <Upload className="h-4 w-4" /> Store examination record
      </Button>
    </div>
  );
}

// ---- Manual / quick tests -----------------------------------------------------

const MANUAL_FIELDS: Partial<Record<EquipmentId, { label: string; unit: string; placeholder: string }>> = {
  bp: { label: 'Blood pressure (systolic / diastolic)', unit: 'mmHg', placeholder: '118 / 76' },
  glucose: { label: 'Blood glucose', unit: 'mg/dL', placeholder: '96' },
  pulseOx: { label: 'SpO₂', unit: '%', placeholder: '97' },
  thermometer: { label: 'Body temperature', unit: '°C', placeholder: '36.6' },
  labAnalyzer: { label: 'Panel summary (e.g. hemoglobin, electrolytes)', unit: '', placeholder: 'Hb 13.8 g/dL, K 4.1 mmol/L' },
  eyeExam: { label: 'Eye exam summary (acuity, pressure, TNC)', unit: '', placeholder: '20/20 both eyes, IOP 15 mmHg' },
};

function ManualPanel({ test, simulated, onSave }: { test: EquipmentId; simulated: boolean; onSave: (r: Omit<MedicalTestRecord, 'id' | 'ts'>) => void }) {
  const [value, setValue] = React.useState('');
  const info = MANUAL_FIELDS[test];
  if (!info) return <p className="text-xs text-orbit-muted">This test stores metadata only.</p>;
  const twoValue = test === 'bp';
  const [sys, dia] = twoValue ? value.split('/').map((x) => x.trim()) : [];
  const valid = twoValue ? Number(sys) > 0 && Number(dia) > 0 : value.trim().length > 0;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="manual-value" hint={info.unit}>{info.label}</Label>
        <Input id="manual-value" type={twoValue ? 'text' : 'text'} inputMode={twoValue ? 'text' : 'decimal'} value={value} onChange={(e) => setValue(e.target.value)} placeholder={info.placeholder} />
      </div>
      <Button
        disabled={!valid}
        onClick={() =>
          onSave({
            test,
            kind: test === 'labAnalyzer' ? 'lab' : 'manual',
            summary: `${info.label}: ${value}${info.unit ? ` ${info.unit}` : ''}${simulated ? ' (demo mode, SIMULATED)' : ''}`,
            data: twoValue ? { systolic: Number(sys), diastolic: Number(dia) } : { raw: value },
            simulated,
          })
        }
      >
        <Save className="h-4 w-4" /> Save result
      </Button>
      {!valid && <p className="text-xs text-orbit-muted">Enter the result exactly as displayed on the device.</p>}
    </div>
  );
}
