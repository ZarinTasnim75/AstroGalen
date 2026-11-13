import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyJourneyCompletion,
  displayPhase,
  journeyCompletedCount,
  journeyScale,
} from '../lib/journey';
import type { JourneyState } from '../lib/types';

const NOW = Date.parse('2026-11-13T10:00:00');

function fresh(): JourneyState {
  return { dateKey: '2026-11-13', phase: 'earth', celebrationSeen: false, updatedAt: NOW };
}

test('no assessments → phase earth, scale 0.62', () => {
  const s = fresh();
  assert.equal(displayPhase(s), 'earth');
  assert.equal(journeyCompletedCount(s), 0);
  assert.equal(journeyScale(0), 0.62);
});

test('first physical assessment moves phase to ready', () => {
  const { state, before, after } = applyJourneyCompletion(fresh(), 'physical', NOW);
  assert.equal(before, 0);
  assert.equal(after, 1);
  assert.equal(state.phase, 'ready');
  assert.equal(state.physicalAt, NOW);
  assert.equal(displayPhase(state), 'ready');
  assert.equal(journeyScale(1), 0.85);
});

test('prevention section never advances the journey', () => {
  const { state, before, after } = applyJourneyCompletion(fresh(), 'prevention', NOW);
  assert.equal(before, 0);
  assert.equal(after, 0);
  assert.equal(state.phase, 'earth');
});

test('completing both assessments → arrived phase', () => {
  let t = applyJourneyCompletion(fresh(), 'physical', NOW);
  t = applyJourneyCompletion(t.state, 'mental', NOW + 1000);
  assert.equal(t.before, 1);
  assert.equal(t.after, 2);
  assert.equal(t.state.phase, 'arrived');
  assert.equal(t.state.celebrationSeen, false);
  // Persisted 'arrived' with pending celebration displays as traveling (UI-only).
  assert.equal(displayPhase(t.state), 'traveling');
});

test('celebrationSeen=true → arrived (flight never replays)', () => {
  let t = applyJourneyCompletion(fresh(), 'physical', NOW);
  t = applyJourneyCompletion(t.state, 'mental', NOW + 1000);
  const seen = { ...t.state, celebrationSeen: true };
  assert.equal(displayPhase(seen), 'arrived');
});

test('repeating a section is idempotent (keeps first timestamp)', () => {
  let t = applyJourneyCompletion(fresh(), 'physical', NOW);
  const again = applyJourneyCompletion(t.state, 'physical', NOW + 5000);
  assert.equal(again.after, 1);
  assert.equal(again.state.physicalAt, NOW); // original timestamp preserved
  assert.equal(again.state.phase, 'ready');
});

test('journey state is independent of assessment values (no reward for "good" numbers)', () => {
  // The engine only knows section + timestamp; it never sees measurements.
  const src = applyJourneyCompletion(fresh(), 'mental', NOW);
  assert.ok(!('heartRate' in src.state) && !('mood' in src.state));
});
