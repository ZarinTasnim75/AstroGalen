import Dexie, { type Table } from 'dexie';
import type {
  AssessmentRecord,
  DailyDraft,
  GamificationState,
  NasaStudy,
  RadLabObservation,
  SpaceWeatherEvent,
  AppSettings,
  ChatMessage,
  JourneyState,
  MedicalTestRecord,
  MissionEnvId,
  SensorSample,
  EquipmentProfile,
} from './types';

export interface NasaCacheEntry {
  query: string;
  results: NasaStudy[];
  cachedAt: number;
}

/** Generic cache for the NASA guidance engine (radiation, space weather, OSDR topics). */
export interface NasaApiCacheEntry {
  key: string;
  payload: unknown; // RadiationResponse | SpaceWeatherResponse | HealthContextResponse
  cachedAt: number;
}

export interface JournalEntry {
  id?: number;
  dateKey: string;
  text: string;
  mood?: number;
  createdAt: number;
}

export interface DailyState {
  dateKey: string;
  completed: Record<string, number>; // section -> timestamp
}

export interface ReportLogEntry {
  id?: number;
  ts: number;
  kind: 'download' | 'send';
  ok: boolean;
  detail?: string;
}

export class OrbitDB extends Dexie {
  assessments!: Table<AssessmentRecord, number>;
  drafts!: Table<DailyDraft, string>;
  gamification!: Table<GamificationState, string>; // legacy — kept for migration, unused by UI
  nasaCache!: Table<NasaCacheEntry, string>;
  nasaApiCache!: Table<NasaApiCacheEntry, string>;
  settings!: Table<AppSettings, string>;
  journal!: Table<JournalEntry, number>;
  dailyStates!: Table<DailyState, string>;
  reportLog!: Table<ReportLogEntry, number>;
  journey!: Table<JourneyState, string>;
  sensorLog!: Table<SensorSample, number>;
  medicalTests!: Table<MedicalTestRecord, number>;
  chatLog!: Table<ChatMessage, number>;

  constructor() {
    super('orbit-health');
    this.version(1).stores({
      assessments: '++id, dateKey, section, ts, isDemo',
      drafts: 'dateKey',
      gamification: 'id',
      nasaCache: 'query',
      settings: 'id',
      journal: '++id, dateKey, createdAt',
      dailyStates: 'dateKey',
      reportLog: '++id, ts',
    });
    // v2 — Earth-to-Moon journey, automatic sensor feed, medical tests, chat.
    this.version(2)
      .stores({
        assessments: '++id, dateKey, section, ts, isDemo',
        drafts: 'dateKey',
        gamification: 'id',
        nasaCache: 'query',
        nasaApiCache: 'key',
        settings: 'id',
        journal: '++id, dateKey, createdAt',
        dailyStates: 'dateKey',
        reportLog: '++id, ts',
        journey: 'dateKey',
        sensorLog: '++id, key, ts',
        medicalTests: '++id, test, ts',
        chatLog: '++id, ts',
      })
      .upgrade(async (tx) => {
        // Migrate any legacy daily-state section timestamps into the journey
        // table so ORBI's progress survives the upgrade. Health assessment
        // records are never touched.
        await tx
          .table('dailyStates')
          .toArray()
          .then(async (rows: DailyState[]) => {
            const journeys: JourneyState[] = rows
              .filter((r) => r.completed?.physical && r.completed?.mental)
              .map((r) => ({
                dateKey: r.dateKey,
                physicalAt: r.completed.physical,
                mentalAt: r.completed.mental,
                phase: 'arrived' as const,
                celebrationSeen: true,
                updatedAt: Date.now(),
              }));
            if (journeys.length) await tx.table('journey').bulkPut(journeys);
          });
      });
  }
}

export const db = new OrbitDB();

export function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'main',
  mission: {
    missionName: 'AstroGalen Demo Mission',
    environment: 'ISS — Low Earth Orbit (microgravity)',
    environmentId: 'iss',
    missionStart: todayDateKey(),
    crewMember: 'Astronaut',
    thresholds: {
      heartRateMin: 50,
      heartRateMax: 100,
      systolicMin: 90,
      systolicMax: 140,
      diastolicMin: 55,
      diastolicMax: 90,
      tempMin: 35.5,
      tempMax: 37.5,
      glucoseMin: 70,
      glucoseMax: 140,
      sleepHoursMin: 6,
      sleepHoursMax: 9,
      spo2Min: 92,
      co2Max: 5000,
    },
  },
  demoMode: false,
};

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get('main');
  if (!s) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  // merge defaults so new fields exist after upgrades
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    mission: {
      ...DEFAULT_SETTINGS.mission,
      ...s.mission,
      thresholds: { ...DEFAULT_SETTINGS.mission.thresholds, ...s.mission?.thresholds },
    },
  };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    ...patch,
    mission: { ...current.mission, ...(patch.mission ?? {}) },
  };
  if (patch.mission?.thresholds) {
    next.mission.thresholds = { ...current.mission.thresholds, ...patch.mission.thresholds };
  }
  await db.settings.put(next);
  return next;
}

export function emptyGamification(): GamificationState {
  return {
    id: 'main',
    energy: 0,
    totalAssessments: 0,
    completedBySection: { physical: 0, mental: 0, prevention: 0 },
    distinctActiveDays: 0,
    achievements: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Legacy helper kept for migration completeness; the UI no longer uses it.
export async function getGamification(): Promise<GamificationState> {
  const g = await db.gamification.get('main');
  if (!g) {
    const fresh = emptyGamification();
    await db.gamification.put(fresh);
    return fresh;
  }
  return g;
}

// ---- Journey ---------------------------------------------------------------

export async function getJourney(dateKey: string): Promise<JourneyState> {
  const j = await db.journey.get(dateKey);
  if (j) return j;
  const fresh: JourneyState = { dateKey, phase: 'earth', celebrationSeen: false, updatedAt: Date.now() };
  await db.journey.put(fresh);
  return fresh;
}

export async function saveJourney(state: JourneyState): Promise<JourneyState> {
  const next = { ...state, updatedAt: Date.now() };
  await db.journey.put(next);
  return next;
}

// ---- Sensor history ---------------------------------------------------------

export async function appendSensorSamples(samples: SensorSample[]): Promise<void> {
  if (!samples.length) return;
  await db.sensorLog.bulkAdd(samples);
}

export async function getSensorSamples(key: string, since: number, limit = 60): Promise<SensorSample[]> {
  const all = await db.sensorLog.where('key').equals(key).sortBy('ts'); // ascending by ts
  return all.filter((s) => s.ts >= since).slice(-limit); // newest `limit` samples, ascending
}

// ---- NASA guidance cache -----------------------------------------------------

export async function cacheNasaApi(key: string, payload: unknown): Promise<void> {
  try {
    await db.nasaApiCache.put({ key, payload, cachedAt: Date.now() });
  } catch {
    // offline write failures must never break the caller
  }
}

export async function readNasaApi<T>(key: string): Promise<{ payload: T; cachedAt: number } | undefined> {
  try {
    const e = await db.nasaApiCache.get(key);
    return e ? { payload: e.payload as T, cachedAt: e.cachedAt } : undefined;
  } catch {
    return undefined;
  }
}

export type { EquipmentProfile, MissionEnvId, RadLabObservation, SpaceWeatherEvent };
