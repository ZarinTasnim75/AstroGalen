// GET /api/nasa/radiation?env=iss|lunar|rover|mars
// Server-side proxy for the NASA RadLab radiation telemetry API
// (https://visualization.osdr.nasa.gov/radlab/api/).
//
// IMPORTANT: RadLab provides HISTORICAL instrument telemetry. The route
// reports the actual observation timestamp and its age — it is never presented
// as a live onboard reading. The dashboard's "live" dosimeter is the simulated
// onboard sensor; RadLab adds real NASA context on top.
import { NextResponse } from 'next/server';
import type { MissionEnvId, RadLabObservation, RadiationResponse } from '@/lib/types';
import { cacheNasaApi, readNasaApi } from '@/lib/db';

export const dynamic = 'force-dynamic';

const API = 'https://visualization.osdr.nasa.gov/radlab/api/';
const COLUMNS = [
  'timestamp',
  'celestial_body',
  'trajectory',
  'spacecraft',
  'module',
  'instrument_family',
  'instrument_id',
  'absorbed_dose_rate',
  'dose_equivalent_rate',
  'flux',
].join(',');

const TTL = 30 * 60_000; // refresh at most every 30 minutes
const TIMEOUT_MS = 20_000;

/** RadLab datasets end at a fixed date; these are the newest data windows. */
const FALLBACK_WINDOWS: Record<'LEO' | 'BLEO', { start: string; end: string }> = {
  LEO: { start: '2024-11-04T10:00', end: '2024-11-04T14:00' },
  BLEO: { start: '2025-11-13T16:00', end: '2025-11-13T20:00' },
};

function trajectoryFor(env: MissionEnvId): 'LEO' | 'BLEO' {
  return env === 'iss' ? 'LEO' : 'BLEO';
}

async function fetchRadLab(query: string): Promise<{ columns: string[]; data: unknown[][] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${API}?format=json&columns=${encodeURIComponent(COLUMNS)}&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`RadLab responded ${res.status}`);
    return (await res.json()) as { columns: string[]; data: unknown[][] };
  } finally {
    clearTimeout(timer);
  }
}

function toObservations(columns: string[], rows: unknown[][]): RadLabObservation[] {
  const idx = (name: string) => columns.findIndex((c) => c === name);
  const i = {
    timestamp: idx('timestamp'),
    body: idx('celestial_body'),
    traj: idx('trajectory'),
    craft: idx('spacecraft'),
    module: idx('module'),
    family: idx('instrument_family'),
    instrument: idx('instrument_id'),
    absorbed: idx('absorbed_dose_rate'),
    equivalent: idx('dose_equivalent_rate'),
    flux: idx('flux'),
  };
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const out: RadLabObservation[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    out.push({
      timestamp: str(row[i.timestamp]) ?? '',
      instrument: str(row[i.instrument]) ?? 'unknown',
      instrumentFamily: str(row[i.family]),
      spacecraft: str(row[i.craft]),
      module: str(row[i.module]),
      celestialBody: str(row[i.body]),
      trajectory: str(row[i.traj]),
      absorbedDoseRate: num(row[i.absorbed]),
      doseEquivalentRate: num(row[i.equivalent]),
      flux: num(row[i.flux]),
    });
  }
  out.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return out.slice(0, 40);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const envParam = (url.searchParams.get('env') ?? 'iss') as MissionEnvId;
  const trajectory = trajectoryFor(envParam);
  const cacheKey = `radiation:${trajectory}`;
  const now = Date.now();

  // Serve fresh cache without hitting NASA again.
  const cached = await readNasaApi<RadiationResponse>(cacheKey);
  if (cached && now - cached.cachedAt < TTL && cached.payload.ok) {
    return NextResponse.json({ ...cached.payload, fromCache: true, cachedAt: cached.cachedAt });
  }

  const notes: string[] = [];
  const windows: { label: string; query: string }[] = [];
  const recentIso = new Date(now - 24 * 3600_000).toISOString().slice(0, 16);
  windows.push({ label: 'last 24 h', query: `trajectory=${trajectory} AND timestamp>=${recentIso}` });
  const recentIso30 = new Date(now - 30 * 24 * 3600_000).toISOString().slice(0, 16);
  windows.push({ label: 'last 30 days', query: `trajectory=${trajectory} AND timestamp>=${recentIso30}` });
  const fb = FALLBACK_WINDOWS[trajectory];
  windows.push({
    label: 'latest available RadLab data',
    query: `trajectory=${trajectory} AND timestamp>=${fb.start} AND timestamp<=${fb.end}`,
  });

  try {
    let observations: RadLabObservation[] = [];
    let usedWindow = '';
    for (const w of windows) {
      const payload = await fetchRadLab(w.query);
      observations = toObservations(payload.columns ?? [], payload.data ?? []);
      if (observations.length > 0) {
        usedWindow = w.label;
        break;
      }
    }

    if (observations.length === 0) {
      throw new Error('RadLab returned no observations for this trajectory.');
    }

    const newest = observations[0].timestamp;
    const ageHours = Math.max(0, Math.round(((now - new Date(newest).getTime()) / 3600_000) * 10) / 10);
    const response: RadiationResponse = {
      ok: true,
      trajectory,
      observedAt: newest,
      ageHours,
      observations,
      fromCache: false,
      note:
        `NASA RadLab telemetry (${usedWindow}). RadLab data is historical mission data from radiation instruments — ` +
        'it is NOT a live onboard reading of your personal exposure. Your live dosimeter reading on the dashboard is the simulated onboard sensor (DEMO). ' +
        `The newest observation here is ${ageHours >= 48 ? Math.round(ageHours / 24) + ' days' : ageHours + ' hours'} old.`,
    };
    await cacheNasaApi(cacheKey, response);
    return NextResponse.json(response);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'RadLab request failed';
    if (cached) {
      return NextResponse.json({ ...cached.payload, fromCache: true, cachedAt: cached.cachedAt, error });
    }
    const response: RadiationResponse = {
      ok: false,
      trajectory,
      observations: [],
      fromCache: false,
      note:
        'NASA RadLab radiation telemetry is temporarily unavailable. The dashboard continues to show the simulated onboard dosimeter (DEMO) and cached NASA context.',
      error,
    };
    return NextResponse.json(response);
  }
}
