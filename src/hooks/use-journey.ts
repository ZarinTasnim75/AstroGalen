'use client';

import * as React from 'react';
import { db, getJourney, saveJourney } from '@/lib/db';
import type { JourneyState, SectionKey } from '@/lib/types';
import { applyJourneyCompletion, JOURNEY_EVENT, journeyCompletedCount } from '@/lib/journey';

export function useJourney(dateKey: string) {
  const [state, setState] = React.useState<JourneyState | null>(null);

  const refresh = React.useCallback(async () => {
    const j = await getJourney(dateKey);
    setState(j);
  }, [dateKey]);

  React.useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(JOURNEY_EVENT, handler);
    return () => window.removeEventListener(JOURNEY_EVENT, handler);
  }, [refresh]);

  return { state, refresh };
}

/**
 * Record that an assessment section was completed today and update ORBI's
 * journey. Returns the transition (before/after completion counts).
 */
export async function recordJourneySection(
  dateKey: string,
  section: SectionKey,
  ts = Date.now(),
): Promise<{ before: 0 | 1 | 2; after: 0 | 1 | 2; state: JourneyState }> {
  const current = await getJourney(dateKey);
  const { state: next, before, after } = applyJourneyCompletion(current, section, ts);
  await saveJourney(next);
  window.dispatchEvent(new Event(JOURNEY_EVENT));
  return { before, after, state: next };
}

export { journeyCompletedCount };
