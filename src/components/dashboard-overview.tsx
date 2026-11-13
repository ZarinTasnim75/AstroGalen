'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Rocket, ClipboardList, PersonStanding, LineChart, Stethoscope, MessagesSquare,
  Activity, HeartPulse, Droplets, Moon, Footprints, Thermometer, Gauge, Radiation, Wind,
  ArrowLeftRight, Sun, Cloud, ShieldAlert, RefreshCw, Wifi, WifiOff, CircleCheck, CircleDashed,
} from 'lucide-react';
import { toast } from 'sonner';
import { db, getSettings } from '@/lib/db';
import { dateKey } from '@/lib/utils';
import { useSensors } from '@/hooks/use-sensors';
import { useNasa } from '@/hooks/use-nasa';
import { useJourneyContext } from '@/components/journey-provider';
import { useOnline } from '@/components/offline-status';
import { buildGuidance, guidanceSummary, type GuidanceBlock, type TopicId, type RadiationClientResult } from '@/lib/nasa-guidance';
import type { PhysicalData, MentalData, Reading, SensorKey, EnvKey, MissionEnvId, SpaceWeatherResponse } from '@/lib/types';
import { Sparkline, type SensorHistoryPoint } from '@/components/sparkline';import { Button } from '@/components/ui/button';
import { Badge, Card, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Disclaimer } from '@/components/disclaimer';

const SENSOR_META: Record<SensorKey, { label: string; icon: React.ComponentType<{ className?: string }>; unit: string }> = {
  heartRate: { label: 'Heart rate', icon: HeartPulse, unit: 'bpm' },
  bloodPressure: { label: 'Blood pressure', icon: Gauge, unit: 'mmHg' },
  sleep: { label: 'Sleep (last interval)', icon: Moon, unit: 'h' },
  activity: { label: 'Exercise / activity', icon: Footprints, unit: 'min' },
  temperature: { label: 'Body temperature', icon: Thermometer, unit: '°C' },
  oxygen: { label: 'Blood oxygen (SpO₂)', icon: Droplets, unit: '%' },
};

const ENV_META: Record<EnvKey, { label: string; icon: React.ComponentType<{ className?: string }>; unit: string }> = {
  radiationRate: { label: 'Radiation dose-equiv.', icon: Radiation, unit: 'μSv/h' },
  radiationDose: { label: 'Radiation absorbed', icon: Radiation, unit: 'μGy/h' },
  oxygen: { label: 'Cabin oxygen', icon: Wind, unit: '%' },
  co2: { label: 'Cabin CO₂', icon: Cloud, unit: 'ppm' },
  pressure: { label: 'Cabin pressure', icon: ArrowLeftRight, unit: 'kPa' },
  cabinTemp: { label: 'Cabin temperature', icon: Sun, unit: '°C' },
};

function fmtAge(ts: number | undefined): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 15) return 'just now';
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

const LEVEL_STYLE: Record<string, { dot: string; badge: 'green' | 'amber' | 'red' | 'muted'; text: string }> = {
  ok: { dot: 'bg-orbit-green', badge: 'green', text: 'Nominal' },
  watch: { dot: 'bg-orbit-amber', badge: 'amber', text: 'Check' },
  urgent: { dot: 'bg-orbit-red', badge: 'red', text: 'Urgent rule' },
  unknown: { dot: 'bg-orbit-muted', badge: 'muted', text: 'No rule' },
};

// ---------------------------------------------------------------------------

export function DashboardOverview() {
  const today = React.useMemo(() => dateKey(), []);
  const online = useOnline();
  const { snapshot, history, lastSync, error: sensorError, refresh } = useSensors();
  const [settings, setSettings] = React.useState<Awaited<ReturnType<typeof getSettings>> | null>(null);
  const [todayPhysical, setTodayPhysical] = React.useState<PhysicalData | undefined>();
  const [todayMental, setTodayMental] = React.useState<MentalData | undefined>();
  const [prevPhysical, setPrevPhysical] = React.useState<PhysicalData | undefined>();
  const [guidanceOpen, setGuidanceOpen] = React.useState(false);
  const nasaToasted = React.useRef({ radiation: false, spaceWeather: false });
  const envId = (settings?.mission.environmentId ?? 'iss') as MissionEnvId;
  const nasa = useNasa(envId);
  const journey = useJourneyContext();

  React.useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
      const todayRecs = await db.assessments.where('dateKey').equals(today).toArray();
      for (const r of todayRecs) {
        if (r.section === 'physical') setTodayPhysical(r.data as PhysicalData);
        if (r.section === 'mental') setTodayMental(r.data as MentalData);
      }
      const allPhysical = await db.assessments.where('section').equals('physical').reverse().sortBy('ts');
      const prev = allPhysical.find((r) => r.dateKey < today);
      if (prev) setPrevPhysical(prev.data as PhysicalData);
    })();
  }, [today, journey.completed]);

  // Toast on sensor feed failure (client keeps simulating locally, so this
  // fires only when even the local computation could not run).
  React.useEffect(() => {
    if (sensorError) toast.error('Unable to retrieve the latest sensor readings. Locally simulated DEMO data continues.');
  }, [sensorError]);

  // Toast once when a NASA source cannot be refreshed.
  React.useEffect(() => {
    if (nasa.radiation && !nasa.radiation.ok && !nasaToasted.current.radiation) {
      nasaToasted.current.radiation = true;
      toast.error('NASA RadLab data is temporarily unavailable. Showing cached information.');
    }
    if (nasa.spaceWeather && !nasa.spaceWeather.ok && !nasaToasted.current.spaceWeather) {
      nasaToasted.current.spaceWeather = true;
      toast.error('NASA space-weather data is temporarily unavailable. Showing cached information.');
    }
  }, [nasa.radiation, nasa.spaceWeather]);

  if (!settings || !snapshot) {
    return <Card className="animate-pulse">Initializing mission monitoring…</Card>;
  }

  const missionDay = Math.max(1, Math.round((Date.now() - new Date(settings.mission.missionStart + 'T00:00:00').getTime()) / 86_400_000) + 1);
  const guidanceBlocks = buildGuidance({
    readings: [...snapshot.personal, ...snapshot.environmentReadings],
    todayPhysical,
    todayMental,
    previousPhysical: prevPhysical,
    thresholds: settings.mission.thresholds,
  });

  return (
    <div className="space-y-5">
      {/* ---- Mission overview strip ---- */}
      <section className="pt-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge tone="cyan"><Rocket className="h-3 w-3" /> NASA Space Apps Challenge 2026</Badge>
          {settings.demoMode && <Badge tone="amber">Demo mode — fictional data</Badge>}
          {!online && <Badge tone="amber"><WifiOff className="h-3 w-3" /> Offline — full functionality available</Badge>}
          {online && <Badge tone="green"><Wifi className="h-3 w-3" /> Connected</Badge>}
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-orbit-cyan via-orbit-blue to-orbit-violet bg-clip-text text-transparent">
          Mission Health Monitor
        </h1>
        <p className="mt-1 text-sm sm:text-base text-orbit-muted">
          Automatic health and spacecraft-environment monitoring for {settings.mission.crewMember}.
        </p>
        <div className="mt-4 panel p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <StripItem label="Mission environment" value={settings.mission.environment} />
          <StripItem label="Mission day" value={`Day ${missionDay}`} />
          <StripItem
            label="Connection"
            value={online ? 'Online' : 'Offline (all features local)'}
            icon={online ? Wifi : WifiOff}
          />
          <StripItem
            label="Last sensor sync"
            value={lastSync ? fmtAge(lastSync) : '—'}
            icon={RefreshCw}
            action={<button className="text-xs text-orbit-cyan underline underline-offset-2" onClick={refresh}>Refresh now</button>}
          />
          <StripItem
            label="Today's assessments"
            value={
              <span className="flex items-center gap-1.5">
                {journey.completed === 2 ? (
                  <CircleCheck className="h-4 w-4 text-orbit-green" />
                ) : (
                  <CircleDashed className="h-4 w-4 text-orbit-amber" />
                )}
                {journey.completed}/2 complete
              </span>
            }
            action={<Link href="/assessments" className="text-xs text-orbit-cyan underline underline-offset-2">Open</Link>}
          />
        </div>
      </section>

      {/* ---- Section A: personal health monitoring ---- */}
      <section aria-labelledby="personal-heading">
        <div className="flex items-baseline justify-between mb-2">
          <h2 id="personal-heading" className="text-lg font-bold">Personal health monitoring</h2>
          <span className="text-xs text-orbit-muted">Auto-collected from connected devices · DEMO simulation · updates every 10 s</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {(Object.keys(SENSOR_META) as SensorKey[]).map((key) => (
            <SensorCard
              key={key}
              sensorKey={key}
              reading={snapshot.personal.find((r) => r.key === key)}
              history={history[key] ?? []}
            />
          ))}
        </div>
      </section>

      {/* ---- Section B: spacecraft environment ---- */}
      <section aria-labelledby="env-heading">
        <div className="flex items-baseline justify-between mb-2">
          <h2 id="env-heading" className="text-lg font-bold">Spacecraft environment</h2>
          <span className="text-xs text-orbit-muted">ECLSS + onboard dosimeter · separate NASA telemetry below</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {(Object.keys(ENV_META) as EnvKey[]).map((key) => (
            <SensorCard
              key={key}
              sensorKey={key}
              reading={snapshot.environmentReadings.find((r) => r.key === key)}
              history={history[key] ?? []}
              env
            />
          ))}
        </div>

        {/* NASA RadLab + DONKI contextual telemetry */}
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <RadLabPanel radiation={nasa.radiation} />
          <DonkiPanel weather={nasa.spaceWeather} />
        </div>
      </section>

      {/* ---- Section C: health action button ---- */}
      <section className="panel p-5 flex flex-col sm:flex-row sm:items-center gap-4 neon-ring">
        <div className="flex-1">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orbit-cyan" /> What should I do?
          </h2>
          <p className="text-sm text-orbit-muted mt-1">
            A transparent, rules-based review of your current readings, today’s check-in and trends — with NASA sources. Never a diagnosis.
          </p>
        </div>
        <Button size="lg" onClick={() => { setGuidanceOpen(true); loadTopicsFor(guidanceBlocks, nasa.loadContext); }}>
          Open health action panel
        </Button>
      </section>

      <GuidancePanel open={guidanceOpen} onClose={() => setGuidanceOpen(false)} blocks={guidanceBlocks} context={nasa.context} />

      {/* ---- Section D: ORBI companion status ---- */}
      <OrbiStatusCard completed={journey.completed} phase={journey.phase} />

      {/* ---- Feature shortcuts ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Shortcut href="/assessments" icon={ClipboardList} label="Assessments" desc="Physical + mental check-in" />
        <Shortcut href="/body" icon={PersonStanding} label="Body Explorer" desc="Interactive anatomy" />
        <Shortcut href="/insights" icon={LineChart} label="Insights" desc="Trends & baselines" />
        <Shortcut href="/medical-tests" icon={Stethoscope} label="Medical Tests" desc="Equipment & test records" />
        <Shortcut href="/assistant" icon={MessagesSquare} label="AI Assistant" desc="Offline health companion" />
      </div>

      <Disclaimer />
    </div>
  );
}

// ---------------------------------------------------------------------------

function StripItem({ label, value, icon: Icon, action }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-orbit-border/60 p-3 min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-orbit-muted">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </p>
      <p className="text-sm font-semibold mt-1 truncate" title={typeof value === 'string' ? value : undefined}>{value}</p>
      {action && <div className="mt-0.5">{action}</div>}
    </div>
  );
}

function SensorCard({ sensorKey, reading, history, env = false }: {
  sensorKey: SensorKey | EnvKey;
  reading?: Reading;
  history: SensorHistoryPoint[];
  env?: boolean;
}) {
  const meta = (env ? ENV_META : SENSOR_META)[sensorKey as EnvKey & SensorKey];
  const Icon = meta?.icon ?? Activity;
  const level = reading?.level ?? 'unknown';
  const style = LEVEL_STYLE[level];
  const unavailable = reading?.quality === 'unavailable';
  const dual = sensorKey === 'bloodPressure';

  return (
    <div className="panel p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-orbit-muted truncate">
          <Icon className="h-4 w-4 text-orbit-cyan shrink-0" /> {meta?.label ?? sensorKey}
        </span>
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} aria-label={`Status: ${style.text}`} />
      </div>
      {unavailable ? (
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm font-bold text-orbit-muted">Not installed</p>
          <p className="text-[11px] text-orbit-muted mt-1">{reading?.source ?? 'No compatible device on this mission environment.'}</p>
        </div>
      ) : (
        <>
          <p className="text-2xl font-extrabold tabular-nums leading-none">
            {reading?.value ?? '—'}
            {reading?.value2 !== undefined && <span className="text-base font-bold text-orbit-muted"> / {reading.value2}</span>}
            <span className="text-xs font-medium text-orbit-muted ml-1">{reading?.unit ?? meta?.unit}</span>
          </p>
          <Sparkline points={history} dual={dual} ariaLabel={`${meta?.label ?? sensorKey} trend`} className={level === 'ok' ? 'text-orbit-cyan' : level === 'watch' ? 'text-orbit-amber' : 'text-orbit-red'} />
        </>
      )}
      <div className="flex items-center justify-between gap-1 text-[10px] text-orbit-muted">
        <span className="truncate" title={reading?.source}>{reading?.source ?? '—'}</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        {reading?.simulated ? <Badge tone="amber" className="text-[9px] px-1.5 py-0">DEMO</Badge> : <Badge tone="muted" className="text-[9px] px-1.5 py-0">{unavailable ? 'Unavailable' : 'Device'}</Badge>}
        <span className="text-[10px] text-orbit-muted">{fmtAge(reading?.ts)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function RadLabPanel({ radiation }: { radiation: RadiationClientResult | null }) {
  const latest = radiation?.observations?.[0];
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <CardTitle className="mb-0 flex items-center gap-2"><Radiation className="h-4 w-4 text-orbit-violet" /> NASA RadLab telemetry</CardTitle>
        <Badge tone={radiation?.ok ? 'violet' : 'amber'}>{radiation?.ok ? 'Real NASA data' : 'Cached / unavailable'}</Badge>
      </div>
      {radiation && radiation.ok && latest ? (
        <div className="space-y-1.5 text-sm">
          <p>
            <span className="text-orbit-muted">Newest observation:</span>{' '}
            <span className="font-semibold">{latest.timestamp.replace('T', ' ').slice(0, 16)} UTC</span>
            {radiation.ageHours !== undefined && (
              <span className={radiation.ageHours > 48 ? ' text-orbit-amber' : ''}>
                {' '}· {radiation.ageHours >= 48 ? `${Math.round(radiation.ageHours / 24)} days` : `${radiation.ageHours} h`} old
              </span>
            )}
          </p>
          <p className="text-xs text-orbit-muted">
            {latest.instrumentFamily ?? 'Instrument'} <span className="text-orbit-text">{latest.instrument}</span>
            {latest.spacecraft ? ` · ${latest.spacecraft}` : ''}
            {latest.celestialBody ? ` · ${latest.celestialBody}` : ''}
            {' '}· trajectory: {radiation.trajectory}
          </p>
          <p className="text-xs text-orbit-muted">
            Historical radiation-instrument telemetry — <span className="text-orbit-amber">not a live onboard reading</span>. Your live dashboard dosimeter above is the DEMO onboard sensor.
          </p>
        </div>
      ) : (
        <p className="text-sm text-orbit-muted">{radiation?.note ?? 'Loading NASA RadLab radiation telemetry…'}</p>
      )}
    </div>
  );
}

function DonkiPanel({ weather }: { weather: SpaceWeatherResponse | null }) {
  const latest = weather?.events?.[0];
  const typeLabel: Record<string, string> = { FLR: 'Solar flare', CME: 'Coronal mass ejection', GST: 'Geomagnetic storm', SEP: 'Solar energetic particles' };
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <CardTitle className="mb-0 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-orbit-amber" /> NASA space-weather context</CardTitle>
        <Badge tone={weather?.ok ? 'amber' : 'muted'}>{weather?.ok ? `${weather.events.length} events / 7 d` : 'Cached / unavailable'}</Badge>
      </div>
      {weather?.ok && latest ? (
        <div className="space-y-1.5 text-sm">
          <p>
            <span className="text-orbit-muted">Most recent ({typeLabel[latest.type] ?? latest.type}):</span>{' '}
            <span className="font-semibold">{latest.eventTime.replace('T', ' ').slice(0, 16).replace('Z', 'Z')}</span>
            {latest.classType && <span className="text-orbit-amber"> · class {latest.classType}</span>}
          </p>
          <p className="text-xs text-orbit-muted">{weather.notice}</p>
          <a href={latest.link} target="_blank" rel="noopener noreferrer" className="text-xs text-orbit-cyan underline underline-offset-2">
            View event details on NASA DONKI
          </a>
        </div>
      ) : (
        <p className="text-sm text-orbit-muted">{weather?.notice ?? 'Loading NASA DONKI space-weather context…'}</p>
      )}
    </div>
  );
}

function Shortcut({ href, icon: Icon, label, desc }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }) {
  return (
    <Link href={href}>
      <div className="panel p-4 h-full transition hover:border-orbit-cyan/50 hover:shadow-glow-sm">
        <Icon className="h-6 w-6 text-orbit-cyan mb-2" />
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-orbit-muted mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

function loadTopicsFor(blocks: GuidanceBlock[], loadContext: (t: TopicId) => void) {
  const topics = new Set<TopicId>();
  for (const b of blocks) {
    if (b.id.startsWith('cardio')) topics.add('cardiovascular');
    if (b.id.startsWith('sleep')) topics.add('sleep');
    if (b.id.startsWith('fatigue')) topics.add('behavioral');
    if (b.id.startsWith('radiation')) topics.add('radiation');
    if (b.id.startsWith('immune')) topics.add('immune');
    if (b.id.startsWith('bone')) topics.add('bone');
  }
  if (topics.size === 0) topics.add('general');
  topics.forEach(loadContext);
}

// ---------------------------------------------------------------------------
// Guidance dialog
// ---------------------------------------------------------------------------

export function GuidancePanel({ open, onClose, blocks, context }: {
  open: boolean;
  onClose: () => void;
  blocks: GuidanceBlock[];
  context: Partial<Record<TopicId, import('@/lib/types').HealthContextResponse>>;
}) {
  const topicFor = (b: GuidanceBlock): TopicId =>
    b.id.startsWith('cardio') ? 'cardiovascular'
      : b.id.startsWith('sleep') ? 'sleep'
      : b.id.startsWith('fatigue') ? 'behavioral'
      : b.id.startsWith('radiation') ? 'radiation'
      : b.id.startsWith('immune') ? 'immune'
      : b.id.startsWith('bone') ? 'bone'
      : 'general';

  return (
    <Dialog open={open} onClose={onClose} title="Health action panel — what should I do?" className="max-w-2xl">
      <div className="space-y-4">
        <div className="rounded-xl border border-orbit-cyan/40 bg-orbit-cyan/10 p-3 text-sm">
          <strong>Overview:</strong> {guidanceSummary(blocks)}
        </div>
        {blocks.length === 0 && (
          <p className="text-sm text-orbit-muted">
            Complete today’s assessments so the panel can review your records. Nothing is flagged from sensor data alone right now.
          </p>
        )}
        {blocks.map((b) => {
          const topic = topicFor(b);
          const ctx = context[topic];
          return (
            <div key={b.id} className="rounded-xl border border-orbit-border/70 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold">{b.title}</h3>
                <Badge tone={b.level === 'amber' ? 'amber' : b.level === 'red' ? 'red' : 'cyan'}>{b.level === 'amber' ? 'Verify' : b.level === 'red' ? 'Urgent rule' : 'Info'}</Badge>
              </div>
              <p className="text-sm">{b.overview}</p>
              {b.notableChanges.length > 0 && (
                <Section title="What changed?" items={b.notableChanges} />
              )}
              <Section title="Why should I pay attention?" items={b.possibleReasons} />
              <Section title="Which measurements to verify" items={b.verify} />
              <Section title="Basic preventive guidance" items={b.preventive} />
              <Section title="Relevant mission procedures" items={b.procedures} />
              <div className="rounded-lg border border-orbit-red/40 bg-orbit-red/10 p-3 text-sm">
                <strong>When to contact medical support:</strong> {b.contactMedical}
              </div>
              {/* "Why AstroGalen is showing this" */}
              <details className="rounded-lg border border-orbit-border/60 p-3">
                <summary className="text-xs font-semibold cursor-pointer text-orbit-cyan">Why AstroGalen is showing this</summary>
                <div className="mt-2 space-y-2 text-xs text-orbit-muted">
                  {b.riskCategory && <p>Risk category: <span className="text-orbit-text">{b.riskCategory}</span></p>}
                  <p>NASA Human Research Program evidence:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {b.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-orbit-cyan underline underline-offset-2">{s.title}</a>
                        <span> — {s.label}</span>
                      </li>
                    ))}
                  </ul>
                  {ctx && (
                    <div>
                      <p className="text-orbit-text font-medium">{ctx.summary}</p>
                      {ctx.studies.length > 0 && (
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          {ctx.studies.slice(0, 2).map((st) => (
                            <li key={st.id}>
                              <a href={st.source} target="_blank" rel="noopener noreferrer" className="text-orbit-cyan underline underline-offset-2">{st.title}</a>
                              <span> — NASA OSDR study {st.id}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {!ctx.ok && <p className="text-orbit-amber">{ctx.summary}</p>}
                    </div>
                  )}
                  <p>These are rules-based observations from your own records and public NASA research context. AstroGalen never diagnoses.</p>
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-orbit-muted mb-1">{title}</p>
      <ul className="list-disc pl-5 text-sm space-y-0.5">
        {items.map((i, idx) => <li key={idx}>{i}</li>)}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ORBI journey status card
// ---------------------------------------------------------------------------

function OrbiStatusCard({ completed, phase }: { completed: 0 | 1 | 2; phase: string }) {
  const text = completed === 2
    ? phase === 'arrived'
      ? 'ORBI reached the Moon! Mission accomplished today.'
      : 'ORBI is flying to the Moon…'
    : completed === 1
      ? 'One more health check and ORBI flies to the Moon!'
      : 'ORBI is waiting at Earth. Complete today’s physical and mental assessments to launch the journey.';
  return (
    <Card>
      <CardTitle>ORBI — Earth to Moon</CardTitle>
      <p className="text-sm mt-1">{text}</p>
      <div className="flex items-center gap-2 mt-3">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full border ${i < completed ? 'bg-orbit-cyan border-orbit-cyan shadow-glow-sm' : 'border-orbit-border'}`}
            aria-label={i < completed ? 'assessment done' : 'assessment pending'}
          />
        ))}
        <Link href="/assessments" className="text-sm text-orbit-cyan underline underline-offset-2 ml-2">
          {completed === 2 ? 'View mission log' : 'Go to assessments'}
        </Link>
      </div>
    </Card>
  );
}
