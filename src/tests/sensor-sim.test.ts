import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_SOURCE,
  computeSnapshot,
  computeHistory,
  computePersonalReadings,
  computeEnvironmentReadings,
  deviceStatuses,
  lastSleepHours,
} from '../lib/sensor-sim';
import { EQUIPMENT_PROFILES, profileFor } from '../lib/equipment';
import { DEFAULT_SETTINGS } from '../lib/db';
import type { Reading, SensorKey, EnvKey, MissionEnvId } from '../lib/types';

// Importing db.ts pulls Dexie, which works in Node (IndexedDB only used lazily).
const t = DEFAULT_SETTINGS.mission.thresholds;
const NOW = Date.parse('2026-11-13T10:00:00');

function readingFor(key: SensorKey | EnvKey, readings: Reading[]): Reading | undefined {
  return readings.find((r) => r.key === key);
}

test('every produced reading is flagged simulated with a DEMO source', () => {
  const snap = computeSnapshot(NOW, 'iss', EQUIPMENT_PROFILES.iss, t);
  for (const r of [...snap.personal, ...snap.environmentReadings]) {
    if (r.quality === 'unavailable') continue;
    assert.equal(r.simulated, true, `${r.key} must be simulated`);
    assert.ok(r.source.includes('DEMO') || r.source === DEMO_SOURCE, `${r.key} source must carry the DEMO label`);
    assert.ok(r.source.length > 5);
  }
  assert.ok(DEMO_SOURCE.startsWith('DEMO'));
});

test('readings are deterministic and continuous between polls', () => {
  const a1 = computeSnapshot(NOW, 'iss', EQUIPMENT_PROFILES.iss, t);
  const a2 = computeSnapshot(NOW, 'iss', EQUIPMENT_PROFILES.iss, t);
  assert.equal(a1.personal.find((r) => r.key === 'heartRate')?.value, a2.personal.find((r) => r.key === 'heartRate')?.value);
  // 10 seconds later the same quantity changes only smoothly.
  const b = computeSnapshot(NOW + 10_000, 'iss', EQUIPMENT_PROFILES.iss, t);
  const h1 = a1.personal.find((r) => r.key === 'heartRate')!.value!;
  const h2 = b.personal.find((r) => r.key === 'heartRate')!.value!;
  assert.ok(Math.abs(h1 - h2) <= 3, `heart rate moved ${Math.abs(h1 - h2)} bpm in 10s`);
});

test('snapshot carries 6 personal + 6 environment readings', () => {
  const snap = computeSnapshot(NOW, 'iss', EQUIPMENT_PROFILES.iss, t);
  assert.equal(snap.personal.length, 6);
  assert.equal(snap.environmentReadings.length, 6);
  assert.equal(snap.devices.length, 6);
});

test('BP and SpO2 follow the equipment profile (never invented when absent)', () => {
  // Rover profile: bp available, pulseOx available, ultrasound etc. unavailable.
  const rover = profileFor('rover');
  const roverSnap = computeSnapshot(NOW, 'rover', rover, t);
  const roverBp = readingFor('bloodPressure', roverSnap.personal)!;
  assert.equal(roverBp.quality, 'good');
  assert.equal(roverBp.value2 !== undefined, true);

  // Lunar profile: labAnalyzer unavailable — but that's not a sensor; use a
  // synthetic profile without BP to assert "Not Installed" behaviour.
  const noBpProfile = { ...EQUIPMENT_PROFILES.iss, items: { ...EQUIPMENT_PROFILES.iss.items, bp: 'unavailable' as const } };
  const noBp = computeSnapshot(NOW, 'iss', noBpProfile, t);
  const bp = readingFor('bloodPressure', noBp.personal)!;
  assert.equal(bp.quality, 'unavailable');
  assert.equal(bp.value, undefined);
  assert.equal(bp.level, 'unknown');
  assert.match(bp.source, /not installed|No BP monitor/i);

  // device status mirrors the profile.
  const bpDevice = noBp.devices.find((d) => d.key === 'bloodPressure')!;
  assert.equal(bpDevice.installed, false);
  assert.equal(bpDevice.lastSync, undefined);
});

test('radiation dosimeter varies by mission environment', () => {
  for (const env of ['iss', 'lunar', 'mars'] as MissionEnvId[]) {
    const env_ = computeEnvironmentReadings(NOW, env, t);
    const absorbed = readingFor('radiationDose', env_)!;
    const equivalent = readingFor('radiationRate', env_)!;
    assert.ok(absorbed.value! > 0);
    assert.ok(equivalent.value! > absorbed.value!); // Q-factor > 1
  }
  const lunar = readingFor('radiationDose', computeEnvironmentReadings(NOW, 'lunar', t))!.value!;
  const iss = readingFor('radiationDose', computeEnvironmentReadings(NOW, 'iss', t))!.value!;
  assert.ok(lunar > iss, 'lunar surface dose should exceed LEO (outside magnetosphere)');
});

test('sleep is one stable value per completed sleep interval', () => {
  // Same day → same value; value rolls over at 14:00 ship-local.
  const morning = lastSleepHours(Date.parse('2026-11-13T08:00:00'));
  const morningLater = lastSleepHours(Date.parse('2026-11-13T13:00:00'));
  assert.equal(morning, morningLater);
  const afternoon = lastSleepHours(Date.parse('2026-11-13T15:00:00'));
  assert.ok(afternoon > 4 && afternoon < 10);
});

test('history matches the live snapshot values (continuity guarantee)', () => {
  const snap = computeSnapshot(NOW, 'iss', EQUIPMENT_PROFILES.iss, t);
  const hr = readingFor('heartRate', snap.personal)!;
  const hist = computeHistory('heartRate', NOW, 'iss', EQUIPMENT_PROFILES.iss, t, 10, 60_000);
  const last = hist[hist.length - 1];
  // History is bucketed to the minute; live snapshot may be seconds newer —
  // values must be within the deterministic swing (±3 bpm).
  assert.ok(Math.abs((last.value ?? 0) - hr.value!) <= 3);
  assert.equal(hist.length, 10);
});

test('exercise accumulates monotonically through the day', () => {
  const morning = readingFor('activity', computePersonalReadings(Date.parse('2026-11-13T09:00:00'), EQUIPMENT_PROFILES.iss, t))!.value!;
  const evening = readingFor('activity', computePersonalReadings(Date.parse('2026-11-13T19:00:00'), EQUIPMENT_PROFILES.iss, t))!.value!;
  assert.ok(evening >= morning);
  assert.ok(evening <= 65); // 30 + 35 max
});

test('cabin CO2 respects the configurable threshold', () => {
  const lowLimit = { ...t, co2Max: 2000 };
  const env_ = computeEnvironmentReadings(NOW, 'iss', lowLimit);
  const co2 = readingFor('co2', env_)!;
  assert.ok(co2.value! > 2000); // sim produces ~2400-3600 ppm
  assert.ok(co2.level === 'watch' || co2.level === 'urgent');
});
