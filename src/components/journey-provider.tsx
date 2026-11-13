'use client';

import * as React from 'react';
import { useJourney } from '@/hooks/use-journey';
import { displayPhase, journeyCompletedCount } from '@/lib/journey';
import type { JourneyPhase } from '@/lib/types';
import { dateKey } from '@/lib/utils';

interface JourneyContextValue {
  dateKey: string;
  phase: JourneyPhase; // display phase (earth | ready | traveling | arrived)
  persistedPhase: 'earth' | 'ready' | 'arrived';
  completed: 0 | 1 | 2;
  /** Called once the client finishes playing the Earth→Moon flight. */
  markCelebrationSeen: () => void;
  state: ReturnType<typeof useJourney>['state'];
  refresh: () => void;
}

const JourneyContext = React.createContext<JourneyContextValue | null>(null);

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const today = React.useMemo(() => dateKey(), []);
  const { state, refresh } = useJourney(today);

  const phase = displayPhase(state);
  const completed = journeyCompletedCount(state);

  const markCelebrationSeen = React.useCallback(() => {
    if (!state || state.celebrationSeen) return;
    void (async () => {
      const { saveJourney } = await import('@/lib/db');
      await saveJourney({ ...state, celebrationSeen: true, phase: 'arrived' });
      refresh();
    })();
  }, [state, refresh]);

  const value = React.useMemo<JourneyContextValue>(
    () => ({
      dateKey: today,
      phase: state ? phase : 'earth',
      persistedPhase: (state?.phase ?? 'earth') as 'earth' | 'ready' | 'arrived',
      completed: state ? completed : 0,
      markCelebrationSeen,
      state,
      refresh,
    }),
    [today, state, phase, completed, markCelebrationSeen, refresh],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourneyContext(): JourneyContextValue {
  const ctx = React.useContext(JourneyContext);
  if (!ctx) throw new Error('useJourneyContext must be used within JourneyProvider');
  return ctx;
}
