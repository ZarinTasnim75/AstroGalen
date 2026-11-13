// GET /api/nasa/health-context?topic=cardiovascular
// Contextual NASA research support for a health topic: curated OSDR search
// terms + the matching NASA Human Research Program reference. Results are
// cached client-side (IndexedDB via the db.nasaApiCache table on read paths)
// so guidance keeps working offline. Research metadata is contextual evidence
// only — never live measurements or diagnoses.
import { NextResponse } from 'next/server';
import { searchOsdr } from '@/lib/osdr-server';
import { HRP_SOURCES, TOPIC_CONTEXT, type TopicId } from '@/lib/nasa-guidance';
import type { HealthContextResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID: TopicId[] = ['cardiovascular', 'immune', 'bone', 'sleep', 'radiation', 'stress', 'behavioral', 'general'];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = (url.searchParams.get('topic') ?? 'general').toLowerCase() as TopicId;
  const topic: TopicId = VALID.includes(raw) ? raw : 'general';
  const context = TOPIC_CONTEXT[topic];

  try {
    // Try the primary OSDR term, fall back to the secondary one.
    let results: Awaited<ReturnType<typeof searchOsdr>>['results'] = [];
    let lastError: string | undefined;
    for (const term of context.osdrTerms) {
      try {
        const { results: r } = await searchOsdr(term, 0, 6);
        if (r.length > 0) {
          results = r;
          break;
        }
      } catch (e) {
        lastError = (e as Error).message;
      }
    }
    if (results.length === 0 && lastError) throw new Error(lastError);

    const hrp = HRP_SOURCES[topic] ?? HRP_SOURCES.hazards;
    const response: HealthContextResponse = {
      ok: true,
      topic,
      summary: context.summary,
      studies: results,
      hrpSource: { title: hrp.title, url: hrp.url },
      fromCache: false,
    };
    return NextResponse.json(response);
  } catch (err) {
    const response: HealthContextResponse = {
      ok: false,
      topic,
      summary: context.summary,
      studies: [],
      hrpSource: { title: HRP_SOURCES.hazards.title, url: HRP_SOURCES.hazards.url },
      fromCache: false,
      error: (err as Error).message,
    };
    return NextResponse.json(response);
  }
}
