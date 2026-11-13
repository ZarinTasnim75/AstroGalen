// GET /api/nasa/osdr?term=spaceflight&from=0&size=12
// Server-side proxy for the NASA Open Science Data Repository search API
// (https://osdr.nasa.gov/osdr/data/search). Normalization logic lives in
// lib/osdr-server.ts (shared with /api/nasa/health-context).
import { NextResponse } from 'next/server';
import { searchOsdr } from '@/lib/osdr-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get('term')?.trim() || 'spaceflight';
  const from = Math.max(0, Number(searchParams.get('from') ?? 0) || 0);
  const size = Math.min(50, Math.max(1, Number(searchParams.get('size') ?? 12) || 12));

  try {
    const { results, total } = await searchOsdr(term, from, size);
    return NextResponse.json({ results, total, term });
  } catch (err) {
    return NextResponse.json({ error: `Could not reach NASA OSDR: ${(err as Error).message}` }, { status: 502 });
  }
}
