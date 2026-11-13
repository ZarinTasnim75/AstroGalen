'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Database, Download, Trash2, FlaskConical, Rocket, ShieldCheck, Stethoscope, RefreshCcw } from 'lucide-react';
import { db, DEFAULT_SETTINGS, getSettings, saveSettings } from '@/lib/db';
import type { AppSettings, EquipmentId, EquipmentProfile, EquipmentStatus, MissionEnvId, Thresholds } from '@/lib/types';
import { THRESHOLD_DEFS } from '@/lib/metrics';
import { seedDemoData, clearDemoData, DEMO_LABEL } from '@/lib/demo-data';
import { EQUIPMENT_INFO, EQUIPMENT_IDS, EQUIPMENT_PROFILES, ENVIRONMENT_LABELS } from '@/lib/equipment';
import { Button } from '@/components/ui/button';
import { Input, Label, Switch } from '@/components/ui/input';
import { Card, CardTitle, Badge } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useTheme } from '@/components/theme-provider';

const ENVS: MissionEnvId[] = ['iss', 'lunar', 'rover', 'mars'];

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  available: 'Available',
  demo: 'Demo interface',
  unavailable: 'Not installed',
};

const STATUS_TONE: Record<EquipmentStatus, 'green' | 'amber' | 'muted'> = {
  available: 'green',
  demo: 'amber',
  unavailable: 'muted',
};

export default function SettingsPage() {
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [equipment, setEquipment] = React.useState<EquipmentProfile | null>(null);
  const [demoBusy, setDemoBusy] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
      setEquipment(EQUIPMENT_PROFILES[s.mission.environmentId]);
    })();
  }, []);

  if (!settings || !equipment) return <Card>Loading settings…</Card>;

  const patchMission = (patch: Partial<AppSettings['mission']>) => {
    const next = { ...settings, mission: { ...settings.mission, ...patch } };
    setSettings(next);
    void saveSettings({ mission: next.mission });
  };

  const patchThreshold = (key: keyof Thresholds, value: number) => {
    const thresholds = { ...settings.mission.thresholds, [key]: value };
    patchMission({ thresholds });
  };

  const changeEnvironment = (envId: MissionEnvId) => {
    const profile = EQUIPMENT_PROFILES[envId];
    setEquipment(profile);
    patchMission({ environmentId: envId, environment: ENVIRONMENT_LABELS[envId] });
    toast.success(`Mission environment changed to ${profile.label}. Sensors and medical tests now use its equipment profile.`);
  };

  const patchEquipmentStatus = (id: EquipmentId, status: EquipmentStatus) => {
    const next: EquipmentProfile = {
      ...equipment,
      items: { ...equipment.items, [id]: status },
    };
    setEquipment(next);
    // Persist into the sample profile (prototype-level customization).
    EQUIPMENT_PROFILES[equipment.environment] = next;
    void saveSettings({ mission: settings.mission });
    toast.message(`${EQUIPMENT_INFO[id].name}: ${STATUS_LABEL[status].toLowerCase()}`);
  };

  const restoreEquipmentDefaults = () => {
    const fresh = EQUIPMENT_PROFILES[settings.mission.environmentId];
    setEquipment({ ...fresh, items: { ...fresh.items } });
    EQUIPMENT_PROFILES[settings.mission.environmentId] = fresh;
    toast.success('Equipment inventory restored to the sample profile for this environment.');
  };

  const exportAll = async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      assessments: await db.assessments.toArray(),
      drafts: await db.drafts.toArray(),
      settings: await db.settings.toArray(),
      journal: await db.journal.toArray(),
      journey: await db.journey.toArray(),
      sensorLog: await db.sensorLog.toArray(),
      medicalTests: await db.medicalTests.toArray(),
      chatLog: await db.chatLog.toArray(),
      reportLog: await db.reportLog.toArray(),
      nasaCache: await db.nasaCache.toArray(),
      nasaApiCache: await db.nasaApiCache.toArray(),
      legacy: {
        gamification: await db.gamification.toArray(),
        dailyStates: await db.dailyStates.toArray(),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AstroGalen-data-export.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Full data export downloaded (JSON).');
  };

  const deleteAll = async () => {
    setConfirmDelete(false);
    await Promise.all([
      db.assessments.clear(),
      db.drafts.clear(),
      db.gamification.clear(),
      db.journal.clear(),
      db.dailyStates.clear(),
      db.reportLog.clear(),
      db.nasaCache.clear(),
      db.nasaApiCache.clear(),
      db.journey.clear(),
      db.sensorLog.clear(),
      db.medicalTests.clear(),
      db.chatLog.clear(),
    ]);
    await saveSettings({ demoMode: false });
    const fresh = await getSettings();
    setSettings(fresh);
    toast.success('All local records deleted. ORBI’s journey restarts with your next assessment.');
  };

  const toggleDemo = async (on: boolean) => {
    setDemoBusy(true);
    if (on) {
      const n = await seedDemoData(settings.mission.thresholds);
      await saveSettings({ demoMode: true });
      toast.success(`${DEMO_LABEL} — ${n} records generated across 30 days.`);
    } else {
      await clearDemoData();
      await saveSettings({ demoMode: false });
      toast.success('Demo data cleared. Your personal records were not touched.');
    }
    setSettings(await getSettings());
    setDemoBusy(false);
  };

  return (
    <div className="space-y-4">
      <header className="pt-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-orbit-muted mt-1">Mission configuration, equipment inventory, thresholds, demo data, and privacy controls.</p>
      </header>

      <Card>
        <CardTitle>
          <Rocket className="inline h-4 w-4 mr-1.5 text-orbit-cyan" />
          Mission profile
        </CardTitle>
        <div className="grid sm:grid-cols-3 gap-3 mt-2">
          <div>
            <Label htmlFor="s-mission">Mission name</Label>
            <Input id="s-mission" value={settings.mission.missionName} onChange={(e) => patchMission({ missionName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="s-start" hint="YYYY-MM-DD">Mission start (day 1)</Label>
            <Input
              id="s-start"
              type="date"
              value={settings.mission.missionStart}
              onChange={(e) => patchMission({ missionStart: e.target.value || DEFAULT_SETTINGS.mission.missionStart })}
            />
          </div>
          <div>
            <Label htmlFor="s-crew">Crew member label</Label>
            <Input id="s-crew" value={settings.mission.crewMember} onChange={(e) => patchMission({ crewMember: e.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <Label>Mission environment</Label>
          <p className="text-xs text-orbit-muted mb-2">
            Selecting an environment switches the automatic monitoring context and the onboard medical-equipment inventory
            used by the Medical Tests page.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {ENVS.map((env) => (
              <button
                key={env}
                onClick={() => changeEnvironment(env)}
                aria-pressed={settings.mission.environmentId === env}
                className={`rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                  settings.mission.environmentId === env
                    ? 'border-orbit-cyan bg-orbit-cyan/10 text-orbit-cyan'
                    : 'border-orbit-border text-orbit-muted hover:border-orbit-cyan/40'
                }`}
              >
                <span className="block font-semibold">{EQUIPMENT_PROFILES[env].label}</span>
                <span className="block text-[11px] mt-0.5">{ENVIRONMENT_LABELS[env]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Label>Theme</Label>
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                aria-pressed={theme === t}
                className={`rounded-xl border px-4 py-2 text-sm capitalize transition ${
                  theme === t ? 'border-orbit-cyan bg-orbit-cyan/15 text-orbit-cyan' : 'border-orbit-border text-orbit-muted'
                }`}
              >
                {t} mode
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>
          <Stethoscope className="inline h-4 w-4 mr-1.5 text-orbit-cyan" />
          Mission equipment inventory
          <Badge tone="violet" className="ml-2">{equipment.label}</Badge>
        </CardTitle>
        <p className="text-xs text-orbit-muted mt-1 mb-3">
          Sample profiles for this demonstration — edit freely. A test can only be performed when its equipment is marked
          “Available”; “Demo interface” runs a clearly-labelled simulated workflow; “Not installed” disables the test and
          hides its sensor readings (values are never invented for missing hardware).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-orbit-muted border-b border-orbit-border/50">
                <th className="py-2 pr-3 font-semibold">Equipment</th>
                <th className="py-2 pr-3 font-semibold">Measures</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {EQUIPMENT_IDS.map((id) => {
                const status = equipment.items[id];
                return (
                  <tr key={id} className="border-b border-orbit-border/30 last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{EQUIPMENT_INFO[id].name}</p>
                      <p className="text-[11px] text-orbit-muted">{EQUIPMENT_INFO[id].device}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-orbit-muted">{EQUIPMENT_INFO[id].measures}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(['available', 'demo', 'unavailable'] as EquipmentStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => patchEquipmentStatus(id, s)}
                            aria-pressed={status === s}
                            className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                              status === s
                                ? 'border-orbit-cyan bg-orbit-cyan/10 text-orbit-cyan'
                                : 'border-orbit-border/60 text-orbit-muted hover:border-orbit-cyan/40'
                            }`}
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                      <Badge tone={STATUS_TONE[status]} className="mt-1 sm:hidden">{STATUS_LABEL[status]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={restoreEquipmentDefaults}>
          <RefreshCcw className="h-3.5 w-3.5" /> Restore sample inventory for {equipment.label}
        </Button>
      </Card>

      <Card>
        <CardTitle>Mission-approved thresholds</CardTitle>
        <Badge tone="amber" className="mb-3">Sample/demo values — not validated NASA medical standards</Badge>
        <p className="text-xs text-orbit-muted mb-3">
          These configurable values drive AstroGalen’s amber/red alert rules for this demonstration. A real mission would load
          thresholds approved by the flight surgeon. Colors never imply a diagnosis.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THRESHOLD_DEFS.map((d) => (
            <div key={d.key}>
              <Label htmlFor={`th-${d.key}`} hint={d.metric}>
                {d.label}
              </Label>
              <Input
                id={`th-${d.key}`}
                type="number"
                step="any"
                value={settings.mission.thresholds[d.key]}
                onChange={(e) => patchThreshold(d.key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => patchMission({ thresholds: DEFAULT_SETTINGS.mission.thresholds })}>
          Restore sample defaults
        </Button>
      </Card>

      <Card>
        <CardTitle>
          <FlaskConical className="inline h-4 w-4 mr-1.5 text-orbit-violet" />
          Demo Mode
        </CardTitle>
        <div className="flex items-center justify-between mt-2 text-sm">
          <div>
            <p>Demo data enabled</p>
            <p className="text-xs text-orbit-muted">Generates 30 days of clearly-labelled fictional astronaut records.</p>
          </div>
          <Switch checked={settings.demoMode} onChange={toggleDemo} label="Demo mode" />
        </div>
        {demoBusy && <p className="text-xs text-orbit-muted mt-2">Working…</p>}
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => toggleDemo(true)} disabled={demoBusy}>
            Regenerate demo data
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleDemo(false)} disabled={demoBusy}>
            Clear demo data only
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>
          <ShieldCheck className="inline h-4 w-4 mr-1.5 text-orbit-green" />
          Privacy & data ownership
        </CardTitle>
        <ul className="text-sm text-orbit-muted space-y-1.5 mt-2 list-disc ml-5">
          <li>All assessments, journals, sensor history, test records and journey progress are stored locally in your browser (IndexedDB).</li>
          <li>No analytics services receive your health data. No telemetry. No cookies for tracking.</li>
          <li>Journal entries are private and excluded from shared reports by default.</li>
          <li>NASA retrieval only fetches public research metadata, radiation telemetry and space-weather events — never your records.</li>
          <li>Online report sending happens only with explicit consent, to a configured HTTPS endpoint.</li>
        </ul>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="outline" onClick={exportAll}>
            <Download className="h-4 w-4" /> Export all my data (JSON)
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete all local records
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>
          <Database className="inline h-4 w-4 mr-1.5 text-orbit-cyan" />
          Offline & installation
        </CardTitle>
        <p className="text-sm text-orbit-muted mt-1">
          AstroGalen is a Progressive Web App: automatic monitoring, assessments, charts, the body explorer, medical tests,
          the assistant, ORBI’s journey and report generation all work without internet. Install it from your browser’s
          “Install app” menu for a full-screen, offline-ready experience. Cached NASA data remains readable offline and
          refreshes automatically when you reconnect.
        </p>
      </Card>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete all local records?">
        <p className="text-sm">
          This permanently removes all assessments, journal entries, drafts, sensor history, medical test records,
          assistant conversations and ORBI journey progress from this device. It cannot be undone. Settings are kept except
          demo mode.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteAll}>
            <Trash2 className="h-4 w-4" /> Delete everything
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
