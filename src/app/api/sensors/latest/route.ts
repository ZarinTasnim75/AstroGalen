// GET /api/sensors/latest?env=iss
// Server wrapper around the simulated sensor module (the client runs the same
// functions locally so the dashboard works fully offline). Every reading in
// this prototype is simulated and flagged accordingly — a real hardware
// adapter would replace lib/sensor-sim.ts without touching the UI.
import { NextResponse } from 'next/server';
import { computeSnapshot } from '@/lib/sensor-sim';
import { profileFor } from '@/lib/equipment';
import { DEFAULT_SETTINGS } from '@/lib/db';
import type { MissionEnvId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const env = (url.searchParams.get('env') ?? 'iss') as MissionEnvId;
  const profile = profileFor(env);
  const snapshot = computeSnapshot(Date.now(), env, profile, DEFAULT_SETTINGS.mission.thresholds);
  return NextResponse.json({
    ok: true,
    demo: true,
    notice: 'All readings in this prototype are simulated (DEMO). Replace the sensor adapter to connect real hardware.',
    snapshot,
  });
}
