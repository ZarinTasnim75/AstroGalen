// AstroGalen — simulated sensor service.
//
// This module is the single source of truth for the simulated device feed in
// this prototype. The client computes readings locally (offline-first) and the
// /api/sensors/* + /api/environment/latest routes wrap the exact same functions
// so a real hardware adapter can replace them later without changing the UI.
//
// Rules enforced here:
//  • Every value is a deterministic function of time → readings evolve
//    smoothly (continuity between polls, no random jumps).
//  • Every reading is flagged simulated=true → the UI must show a DEMO label.
//  • Devices that are not installed on the selected mission environment are
//    reported as not installed — values are never invented for them.
//  • Blood pressure is only produced when a BP monitor exists in the mission
//    equipment profile (never inferred from heart rate).
//  • Sleep represents the last completed sleep interval (one value per day).

import type {
  EquipmentProfile,
  EnvKey,
  MissionEnvId,
  Reading,
  ReadingLevel,
  SensorDeviceStatus,
  SensorKey,
  SensorSnapshot,
  Thresholds,
} from './types';

export const DEMO_SOURCE = 'DEMO · simulated device';

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function hash01(seed: number): number {
  let x = Math.sin(seed * 12.9898) * 43758.5453;
  x -= Math.floor(x);
  return x;
}

/** Deterministic pseudo-random in [-1,1). */
function hashSigned(seed: number): number {
  return hash01(seed) * 2 - 1;
}

function dayKeyNum(now: number): number {
  // Ship-local day index (stable across the day for sleep etc.)
  const d = new Date(now);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function minutesIntoDay(now: number): number {
  const d = new Date(now);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

// ---------------------------------------------------------------------------
// Personal sensors
// ---------------------------------------------------------------------------

function heartRateReading(now: number, t: Thresholds): Reading {
  // Slow oscillations over 4-minute and 40-minute cycles + day-of-mission drift.
  const base = 64 + 3 * Math.sin(now / (4 * 60_000)) + 4 * Math.sin(now / (40 * 60_000) + 1.2);
  const dayIdx = dayKeyNum(now);
  const drift = hashSigned(dayIdx) * 2.5; // day-to-day personal variation
  const value = Math.round(base + drift);
  const level: ReadingLevel =
    value >= t.heartRateMin && value <= t.heartRateMax ? 'ok' : value > t.heartRateMax + 15 || value < t.heartRateMin - 10 ? 'urgent' : 'watch';
  return {
    key: 'heartRate',
    value,
    unit: 'bpm',
    ts: now,
    source: `${DEMO_SOURCE} — sensor vest`,
    simulated: true,
    quality: 'good',
    level,
  };
}

function bloodPressureReading(now: number, installed: boolean, t: Thresholds): Reading {
  if (!installed) {
    return {
      key: 'bloodPressure',
      unit: 'mmHg',
      ts: now,
      source: 'No BP monitor in this mission equipment profile',
      simulated: false,
      quality: 'unavailable',
      level: 'unknown',
    };
  }
  // Spot-check device: a new measurement roughly every 5 minutes.
  const slot = Math.floor(now / (5 * 60_000));
  const base = 118 + hashSigned(slot) * 5;
  const dia = Math.round(74 + hashSigned(slot + 7) * 4);
  const sys = Math.round(base);
  const ok = sys >= t.systolicMin && sys <= t.systolicMax && dia >= t.diastolicMin && dia <= t.diastolicMax;
  return {
    key: 'bloodPressure',
    value: sys,
    value2: dia,
    unit: 'mmHg',
    ts: slot * 5 * 60_000, // last completed measurement slot
    source: `${DEMO_SOURCE} — cuff BP monitor`,
    simulated: true,
    quality: 'good',
    level: ok ? 'ok' : 'watch',
  };
}

export function lastSleepHours(now: number): number {
  // One sleep value per day — last night's completed sleep interval.
  const dayIdx = dayKeyNum(now);
  const mins = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  // The "latest sleep interval" rolls over at 14:00 ship-local.
  const effectiveDay = mins < 14 * 60 ? dayIdx - 1 : dayIdx;
  const base = 6.6 + hashSigned(effectiveDay) * 1.1; // 5.5 – 7.7 h
  return Math.round(base * 10) / 10;
}

function sleepReading(now: number): Reading {
  const hours = lastSleepHours(now);
  const mins = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const effectiveDay = mins < 14 * 60 ? dayKeyNum(now) - 1 : dayKeyNum(now);
  const level: ReadingLevel = hours < 5 ? 'watch' : hours >= 9.5 ? 'watch' : 'ok';
  return {
    key: 'sleep',
    value: hours,
    unit: 'h',
    ts: now,
    source: `${DEMO_SOURCE} — wearable sleep tracking (last sleep interval, day ${effectiveDay})`,
    simulated: true,
    quality: 'good',
    level,
  };
}

function activityReading(now: number): Reading {
  // Countermeasure exercise accumulates through the day (two sessions).
  const mins = minutesIntoDay(now);
  const session1 = Math.min(Math.max(0, mins - 7 * 60), 30); // ~07:00, 30 min
  const session2Start = 16 * 60 + 45;
  const session2 = Math.min(Math.max(0, mins - session2Start), 35); // ~16:45, 35 min
  const value = Math.round(session1 + session2);
  return {
    key: 'activity',
    value,
    unit: 'min today',
    ts: now,
    source: `${DEMO_SOURCE} — activity tracker / exercise equipment`,
    simulated: true,
    quality: 'good',
    level: 'ok',
  };
}

function temperatureReading(now: number, t: Thresholds): Reading {
  // Circadian rhythm: lowest early morning, peak late afternoon.
  const phase = (minutesIntoDay(now) / 1440) * Math.PI * 2 - Math.PI / 3;
  const value = Math.round((36.55 + 0.3 * Math.sin(phase)) * 10) / 10;
  const level: ReadingLevel = value >= t.tempMin && value <= t.tempMax ? 'ok' : value > 38 ? 'urgent' : 'watch';
  return {
    key: 'temperature',
    value,
    unit: '°C',
    ts: now,
    source: `${DEMO_SOURCE} — temperature sensor patch`,
    simulated: true,
    quality: 'good',
    level,
  };
}

function oxygenReading(now: number, installed: boolean, t: Thresholds): Reading {
  if (!installed) {
    return {
      key: 'oxygen',
      unit: '%',
      ts: now,
      source: 'No pulse oximeter in this mission equipment profile',
      simulated: false,
      quality: 'unavailable',
      level: 'unknown',
    };
  }
  const value = Math.round((97.4 + 0.6 * Math.sin(now / (9 * 60_000))) * 10) / 10;
  const min = t.spo2Min ?? 92;
  const level: ReadingLevel = value >= min ? 'ok' : value < min - 3 ? 'urgent' : 'watch';
  return {
    key: 'oxygen',
    value,
    unit: '%',
    ts: now,
    source: `${DEMO_SOURCE} — fingertip pulse oximeter`,
    simulated: true,
    quality: 'good',
    level,
  };
}

// ---------------------------------------------------------------------------
// Spacecraft environment
// ---------------------------------------------------------------------------

const RADIATION_BASE: Record<MissionEnvId, { absorbed: number; factor: number }> = {
  iss: { absorbed: 6.2, factor: 2.6 }, // measured LEO dose rates ~5–20 μGy/h
  lunar: { absorbed: 12.5, factor: 2.9 }, // outside the magnetosphere
  rover: { absorbed: 11.8, factor: 2.9 },
  mars: { absorbed: 8.1, factor: 2.4 }, // thin-atmosphere shielding
};

export function onboardDosimeter(now: number, env: MissionEnvId, t: Thresholds): { absorbed: Reading; equivalent: Reading } {
  const base = RADIATION_BASE[env] ?? RADIATION_BASE.iss;
  // GCR modulation over the solar cycle + slow station-attitude variation.
  const slow = 1 + 0.06 * Math.sin(now / (6 * HOUR)) + 0.03 * Math.sin(now / (25 * 60_000) + 0.7);
  const absorbed = Math.round(base.absorbed * slow * 100) / 100;
  const equivalent = Math.round(absorbed * base.factor * 10) / 10;
  const source = `${DEMO_SOURCE} — onboard area dosimeter (not a personal dosimeter)`;
  const common = { ts: now, source, simulated: true, quality: 'good' as const, level: 'unknown' as ReadingLevel };
  void t;
  return {
    absorbed: { key: 'radiationDose', value: absorbed, unit: 'μGy/h', ...common },
    equivalent: { key: 'radiationRate', value: equivalent, unit: 'μSv/h', ...common },
  };
}

/** Cabin atmosphere: CO₂, pressure and temperature. */
function cabinEnvironment(now: number, env: MissionEnvId, t: Thresholds): { co2: Reading; pressure: Reading; cabinTemp: Reading } {
  const hourPhase = now / HOUR;
  const co2Base = env === 'iss' ? 2900 : 2400;
  const co2 = Math.round(co2Base + 350 * Math.sin(hourPhase / 4.5) + 120 * Math.sin(hourPhase / 0.8));
  const pressure = Math.round((101.3 + 0.4 * Math.sin(hourPhase / 6)) * 10) / 10;
  const temp = Math.round((22.4 + 0.9 * Math.sin(hourPhase / 5) + 0.3 * Math.sin(hourPhase * 2)) * 10) / 10;
  const co2Max = t.co2Max ?? 5000;
  return {
    co2: {
      key: 'co2',
      value: co2,
      unit: 'ppm',
      ts: now,
      source: `${DEMO_SOURCE} — ECLSS CO₂ sensor`,
      simulated: true,
      quality: 'good',
      level: co2 > co2Max * 1.4 ? 'urgent' : co2 > co2Max ? 'watch' : 'ok',
    },
    pressure: {
      key: 'pressure',
      value: pressure,
      unit: 'kPa',
      ts: now,
      source: `${DEMO_SOURCE} — cabin pressure sensor`,
      simulated: true,
      quality: 'good',
      level: pressure > 105 || pressure < 95 ? 'watch' : 'ok',
    },
    cabinTemp: {
      key: 'cabinTemp',
      value: temp,
      unit: '°C',
      ts: now,
      source: `${DEMO_SOURCE} — thermal control sensor`,
      simulated: true,
      quality: 'good',
      level: temp > 27 || temp < 17 ? 'watch' : 'ok',
    },
  };
}

/** Cabin oxygen concentration (%). */
function cabinOxygen(now: number): Reading {
  const o2 = Math.round((20.9 + 0.05 * Math.sin(now / (3 * HOUR))) * 100) / 100;
  return {
    key: 'oxygen',
    value: o2,
    unit: '%',
    ts: now,
    source: `${DEMO_SOURCE} — ECLSS oxygen sensor`,
    simulated: true,
    quality: 'good',
    level: o2 < 19.5 ? 'watch' : o2 > 23 ? 'watch' : 'ok',
  };
}

// ---------------------------------------------------------------------------
// Snapshot assembly
// ---------------------------------------------------------------------------

export function deviceStatuses(profile: EquipmentProfile): SensorDeviceStatus[] {
  const now = Date.now();
  const bpInstalled = profile.items.bp !== 'unavailable';
  const oxInstalled = profile.items.pulseOx !== 'unavailable';
  return [
    { key: 'heartRate', device: 'Sensor vest (HR monitor)', installed: true, connected: true, lastSync: now, simulated: true },
    { key: 'bloodPressure', device: 'Validated cuff BP monitor', installed: bpInstalled, connected: bpInstalled, lastSync: bpInstalled ? now : undefined, simulated: true },
    { key: 'sleep', device: 'Wearable sleep tracking', installed: true, connected: true, lastSync: now, simulated: true },
    { key: 'activity', device: 'Activity tracker + exercise equipment', installed: true, connected: true, lastSync: now, simulated: true },
    { key: 'temperature', device: 'Temperature sensor patch', installed: true, connected: true, lastSync: now, simulated: true },
    { key: 'oxygen', device: 'Fingertip pulse oximeter', installed: oxInstalled, connected: oxInstalled, lastSync: oxInstalled ? now : undefined, simulated: true },
  ];
}

export function computePersonalReadings(now: number, profile: EquipmentProfile, t: Thresholds): Reading[] {
  return [
    heartRateReading(now, t),
    bloodPressureReading(now, profile.items.bp !== 'unavailable', t),
    sleepReading(now),
    activityReading(now),
    temperatureReading(now, t),
    oxygenReading(now, profile.items.pulseOx !== 'unavailable', t),
  ];
}

export function computeEnvironmentReadings(now: number, env: MissionEnvId, t: Thresholds): Reading[] {
  const dose = onboardDosimeter(now, env, t);
  const cabin = cabinEnvironment(now, env, t);
  return [
    dose.absorbed,
    dose.equivalent,
    cabinOxygen(now),
    cabin.co2,
    cabin.pressure,
    cabin.cabinTemp,
  ];
}

export function computeSnapshot(now: number, env: MissionEnvId, profile: EquipmentProfile, t: Thresholds): SensorSnapshot {
  return {
    ts: now,
    environment: env,
    personal: computePersonalReadings(now, profile, t),
    environmentReadings: computeEnvironmentReadings(now, env, t),
    devices: deviceStatuses(profile),
    degraded: false,
  };
}

/**
 * Deterministic history for trend sparklines. Uses the same functions as the
 * live snapshot, so historical points match what was actually shown earlier.
 */
export function computeHistory(key: SensorKey | EnvKey, now: number, env: MissionEnvId, profile: EquipmentProfile, t: Thresholds, points = 24, stepMs = 60_000): { ts: number; value?: number; value2?: number }[] {
  const out: { ts: number; value?: number; value2?: number }[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const ts = Math.floor((now - i * stepMs) / stepMs) * stepMs;
    const r = readSingle(key, ts, env, profile, t);
    if (r && r.value !== undefined) out.push({ ts, value: r.value, value2: r.value2 });
  }
  return out;
}

function readSingle(key: SensorKey | EnvKey, now: number, env: MissionEnvId, profile: EquipmentProfile, t: Thresholds): Reading | undefined {
  switch (key) {
    case 'heartRate': return heartRateReading(now, t);
    case 'bloodPressure': return bloodPressureReading(now, profile.items.bp !== 'unavailable', t);
    case 'sleep': return sleepReading(now);
    case 'activity': return activityReading(now);
    case 'temperature': return temperatureReading(now, t);
    case 'oxygen': return oxygenReading(now, profile.items.pulseOx !== 'unavailable', t);
    case 'radiationDose': return onboardDosimeter(now, env, t).absorbed;
    case 'radiationRate': return onboardDosimeter(now, env, t).equivalent;
    case 'co2': return cabinEnvironment(now, env, t).co2;
    case 'pressure': return cabinEnvironment(now, env, t).pressure;
    case 'cabinTemp': return cabinEnvironment(now, env, t).cabinTemp;
    default: return undefined;
  }
}

export const SENSOR_LABELS: Record<SensorKey | EnvKey, string> = {
  heartRate: 'Heart rate',
  bloodPressure: 'Blood pressure',
  sleep: 'Sleep (last interval)',
  activity: 'Exercise / activity',
  temperature: 'Body temperature',
  oxygen: 'Blood oxygen (SpO₂)',
  radiationDose: 'Radiation — absorbed dose rate',
  radiationRate: 'Radiation — dose-equivalent rate',
  co2: 'Cabin CO₂',
  pressure: 'Cabin pressure',
  cabinTemp: 'Cabin temperature',
};

export const ENV_KEYS: EnvKey[] = ['radiationRate', 'radiationDose', 'oxygen', 'co2', 'pressure', 'cabinTemp'];
export const SENSOR_KEYS: SensorKey[] = ['heartRate', 'bloodPressure', 'sleep', 'activity', 'temperature', 'oxygen'];
