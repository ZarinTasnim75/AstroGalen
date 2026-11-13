// AstroGalen — ORBI's Earth-to-Moon journey.
//
// There are exactly two daily assessments that power this journey:
//   1. Physical Health Assessment
//   2. Mental Wellness Assessment
// Completing both unlocks ORBI's flight to the Moon. The journey rewards
// completing and honestly reporting assessments — never "good" measurements.
//
// The persisted phases are 'earth' | 'ready' | 'arrived'. 'traveling' is a
// client-side animation state that is never stored, so a page refresh can never
// replay the whole flight (see celebrationSeen below).

import type { JourneyPhase, JourneyState, SectionKey } from './types';
import { dateKey } from './utils';

export const JOURNEY_EVENT = 'orbit:journey-updated';

export function journeyCompletedCount(state: JourneyState | null | undefined): 0 | 1 | 2 {
  const done = Number(Boolean(state?.physicalAt)) + Number(Boolean(state?.mentalAt));
  return (done === 0 ? 0 : done === 1 ? 1 : 2) as 0 | 1 | 2;
}

/** The phase ORBI should be displayed in right now. */
export function displayPhase(state: JourneyState | null | undefined): JourneyPhase {
  if (!state) return 'earth';
  const done = journeyCompletedCount(state);
  if (done < 2) return done === 0 ? 'earth' : 'ready';
  return state.celebrationSeen ? 'arrived' : 'traveling';
}

/** Size scale for the avatar as assessments complete: 0/2 → 1/2 → 2/2. */
export function journeyScale(done: 0 | 1 | 2): number {
  return [0.62, 0.85, 1.18][done];
}

export interface JourneyTransition {
  state: JourneyState;
  /** Count of assessments completed before this event. */
  before: 0 | 1 | 2;
  /** Count after this event (0 | 1 | 2). */
  after: 0 | 1 | 2;
}

/**
 * Update the journey state after an assessment section was completed today.
 * Returns the transition so the UI can trigger the flight animation exactly
 * when the second assessment lands.
 */
export function applyJourneyCompletion(
  state: JourneyState,
  section: SectionKey,
  ts = Date.now(),
): JourneyTransition {
  if (section !== 'physical' && section !== 'mental') {
    return { state, before: journeyCompletedCount(state), after: journeyCompletedCount(state) };
  }
  const before = journeyCompletedCount(state);
  const next: JourneyState = {
    ...state,
    [section === 'physical' ? 'physicalAt' : 'mentalAt']: state[
      section === 'physical' ? 'physicalAt' : 'mentalAt'
    ] ?? ts,
    updatedAt: ts,
  };
  const after = journeyCompletedCount(next);
  if (after === 2) {
    // Persisted as 'arrived' with celebration pending — the UI plays the
    // flight once and then flips celebrationSeen.
    next.phase = 'arrived';
  } else if (next.phase === 'earth') {
    next.phase = 'ready';
  }
  return { state: next, before, after };
}

export function todayJourneyKey(): string {
  return dateKey();
}
