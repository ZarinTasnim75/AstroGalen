// GET /api/sensors/history?key=heartRate&env=iss&points=30&step=60000
// Deterministic history for trend sparklines (same simulation as /latest).
import { NextResponse } from 'next/server';
import { computeHistory } from '@/lib/sensor-sim';
import { profileFor } from '@/lib/equipment';
import { DEFAULT_SETTINGS } from '@/lib/db';
import type { EnvKey, MissionEnvId, SensorKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') as SensorKey | EnvKey | null;
  const env = (url.searchParams.get('env') ?? 'iss') as MissionEnvId;
  const points = Math.min(120, Math.max(2, Number(url.searchParams.get('points') ?? 30)));
  const stepMs = Math.max(10_000, Number(url.searchParams.get('step') ?? 60_000));
  if (!key) {
    return NextResponse.json({ ok: false, error: 'Missing ?key= parameter (sensor or environment key).' }, { status: 400 });
  }
  const profile = profileFor(env);
  const series = computeHistory(key, Date.now(), env, profile, DEFAULT_SETTINGS.mission.thresholds, points, stepMs);
  return NextResponse.json({ ok: true, key, demo: true, series });
}
