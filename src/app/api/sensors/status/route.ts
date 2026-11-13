// GET /api/sensors/status?env=iss
// Device connection / installation status for the selected mission environment.
import { NextResponse } from 'next/server';
import { deviceStatuses } from '@/lib/sensor-sim';
import { profileFor } from '@/lib/equipment';
import type { MissionEnvId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const env = (url.searchParams.get('env') ?? 'iss') as MissionEnvId;
  const profile = profileFor(env);
  return NextResponse.json({
    ok: true,
    demo: true,
    notice: 'All devices in this prototype are simulated. Devices marked installed=false are not present on this mission environment and their values are never invented.',
    devices: deviceStatuses(profile),
  });
}
