// GET /api/nasa/space-weather?days=7
// Server-side proxy for NASA DONKI (space-weather database of notifications,
// knowledge, information). Uses the DONKI v2 public API on ccmc.gsfc.nasa.gov
// (the September 2026 updated endpoints): /DONKI-API/get/{FLR,CME,GST,SEP}.
//
// DONKI provides environmental context only. It is never treated as a
// measurement of the astronaut's personal radiation exposure and no medical
// conclusions are drawn from space-weather events.
import { NextResponse } from 'next/server';
import type { SpaceWeatherEvent, SpaceWeatherResponse, SpaceWeatherType } from '@/lib/types';
import { cacheNasaApi, readNasaApi } from '@/lib/db';

export const dynamic = 'force-dynamic';

const API = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/';
const TYPES: SpaceWeatherType[] = ['FLR', 'CME', 'GST', 'SEP'];
const TTL = 6 * 3600_000; // space weather changes slowly; refresh a few times per day
const TIMEOUT_MS = 15_000;

const DONKI_LINKS: Record<SpaceWeatherType, string> = {
  FLR: 'https://ccmc.gsfc.nasa.gov/DONKI/events/FLR',
  CME: 'https://ccmc.gsfc.nasa.gov/DONKI/events/CME',
  GST: 'https://ccmc.gsfc.nasa.gov/DONKI/events/GST',
  SEP: 'https://ccmc.gsfc.nasa.gov/DONKI/events/SEP',
};

async function fetchType(type: SpaceWeatherType, start: string, end: string): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${type}?startDate=${start}&endDate=${end}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`DONKI ${type} responded ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  } finally {
    clearTimeout(timer);
  }
}

function eventTime(ev: Record<string, unknown>): string | undefined {
  const candidates = ['peakTime', 'beginTime', 'startTime', 'eventTime', 'issued'];
  for (const k of candidates) {
    const v = ev[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function eventId(ev: Record<string, unknown>): string {
  const v = ev.activityID ?? ev.flrID ?? ev.gstID ?? ev.sepID;
  return typeof v === 'string' ? v : JSON.stringify(ev).slice(0, 60);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(60, Math.max(1, Number(url.searchParams.get('days') ?? 7)));
  const cacheKey = `space-weather:${days}`;
  const now = Date.now();

  const cached = await readNasaApi<SpaceWeatherResponse>(cacheKey);
  if (cached && now - cached.cachedAt < TTL && cached.payload.ok) {
    return NextResponse.json({ ...cached.payload, fromCache: true });
  }

  const end = new Date(now).toISOString().slice(0, 10);
  const start = new Date(now - days * 86_400_000).toISOString().slice(0, 10);

  try {
    const settled = await Promise.allSettled(TYPES.map((t) => fetchType(t, start, end)));
    const events: SpaceWeatherEvent[] = [];
    let anyFulfilled = false;
    settled.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      anyFulfilled = true;
      const type = TYPES[i];
      for (const ev of r.value) {
        const time = eventTime(ev);
        if (!time) continue;
        events.push({
          id: eventId(ev),
          type,
          eventTime: time,
          classType: typeof ev.classType === 'string' ? ev.classType : undefined,
          source: 'NASA DONKI (CCMC)',
          link: DONKI_LINKS[type],
        });
      }
    });
    if (!anyFulfilled) throw new Error('All DONKI requests failed.');

    events.sort((a, b) => (a.eventTime < b.eventTime ? 1 : -1));
    const response: SpaceWeatherResponse = {
      ok: true,
      fetchedAt: now,
      windowStart: start,
      windowEnd: end,
      events: events.slice(0, 30),
      notice:
        "NASA's space-weather service (DONKI) reports recent solar and geospace activity in this window. " +
        'This is environmental context — NOT a measurement of your personal radiation exposure. ' +
        'Check your onboard dosimeter and follow the mission radiation-safety protocol.',
      fromCache: false,
    };
    await cacheNasaApi(cacheKey, response);
    return NextResponse.json(response);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'DONKI request failed';
    if (cached) return NextResponse.json({ ...cached.payload, fromCache: true, error });
    const response: SpaceWeatherResponse = {
      ok: false,
      fetchedAt: now,
      windowStart: start,
      windowEnd: end,
      events: [],
      notice: 'NASA DONKI is temporarily unavailable. No space-weather context can be shown right now; cached information will be used when available.',
      fromCache: false,
      error,
    };
    return NextResponse.json(response);
  }
}
