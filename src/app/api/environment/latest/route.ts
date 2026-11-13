// GET /api/environment/latest?env=iss
// Spacecraft environment readings: onboard dosimeter + ECLSS cabin sensors.
import { NextResponse } from 'next/server';
import { computeEnvironmentReadings } from '@/lib/sensor-sim';
import { profileFor } from '@/lib/equipment';
import { DEFAULT_SETTINGS } from '@/lib/db';
import type { MissionEnvId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const env = (url.searchParams.get('env') ?? 'iss') as MissionEnvId;
  const profile = profileFor(env);
  const readings = computeEnvironmentReadings(Date.now(), env, DEFAULT_SETTINGS.mission.thresholds);
  return NextResponse.json({
    ok: true,
    demo: true,
    notice:
      'Environment readings are simulated spacecraft sensors (DEMO). The dosimeter values are a simulated onboard area dosimeter — NASA RadLab telemetry is shown separately and is historical.',
    readings,
  });
}
