// AstroGalen — core domain types
export type SectionKey = 'physical' | 'mental' | 'prevention';

export type SelfRating = 'poor' | 'fair' | 'good' | 'excellent';

export interface PhysicalData {
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  temperature?: number;
  sleepHours?: number;
  exerciseMinutes?: number;
  hydration?: SelfRating;
  nutrition?: SelfRating;
  symptoms: string[];
  symptomsNote?: string;
  /** Bone density (e.g. WHO T-score) — measured in a lab, entered manually. */
  boneDensity?: number;
  /** Eye power / refraction (diopters) — measured at an eye exam, entered manually. */
  eyePower?: number;
}

export interface MentalData {
  mood: number; // 1..5 (5 = very good)
  stress: number; // 1..5 (5 = very stressed)
  mentalFatigue: number; // 1..5
  physicalFatigue: number; // 1..5
  sleepQuality: number; // 1..5
  concentration: number; // 1..5
  motivation: number; // 1..5
  reactionMs?: number;
  attentionScore?: number;
  journal?: string;
}

export type PreventionStatus = 'done' | 'missed' | 'na';

export interface PreventionData {
  items: Record<string, PreventionStatus>;
  note?: string;
}

export interface AssessmentRecord {
  id?: number;
  ts: number;
  dateKey: string; // YYYY-MM-DD (ship-local)
  section: SectionKey;
  data: PhysicalData | MentalData | PreventionData;
  isDemo?: boolean;
}

export interface DailyDraft {
  dateKey: string;
  physical?: Partial<PhysicalData>;
  mental?: Partial<MentalData>;
  prevention?: Partial<PreventionData>;
  completed: SectionKey[];
  updatedAt: number;
}

export type AchievementId =
  | 'first-check'
  | 'physical-explorer'
  | 'mind-matters'
  | 'prevention-pro'
  | 'week-routine'
  | 'bone-guardian'
  | 'moon-explorer'
  | 'mars-pioneer'
  | 'full-spectrum'
  | 'night-owl-guard';

export interface GamificationState {
  id: 'main';
  energy: number;
  totalAssessments: number;
  completedBySection: Record<SectionKey, number>;
  distinctActiveDays: number;
  achievements: AchievementId[];
  createdAt: number;
  updatedAt: number;
}

export type AlertLevel = 'green' | 'amber' | 'red';

export interface Thresholds {
  heartRateMin: number;
  heartRateMax: number;
  systolicMin: number;
  systolicMax: number;
  diastolicMin: number;
  diastolicMax: number;
  tempMin: number;
  tempMax: number;
  glucoseMin: number;
  glucoseMax: number;
  sleepHoursMin: number;
  sleepHoursMax: number;
  /** Minimum acceptable blood-oxygen saturation (%). Optional. */
  spo2Min?: number;
  /** Maximum acceptable cabin CO₂ (ppm). Optional. */
  co2Max?: number;
}

// ---------------------------------------------------------------------------
// Mission environments & medical equipment
// ---------------------------------------------------------------------------

export type MissionEnvId = 'iss' | 'lunar' | 'rover' | 'mars';

export type EquipmentId =
  | 'ecg'
  | 'ultrasound'
  | 'bp'
  | 'glucose'
  | 'pulseOx'
  | 'thermometer'
  | 'labAnalyzer'
  | 'eyeExam';

export type EquipmentStatus = 'available' | 'unavailable' | 'demo';

export interface EquipmentItemInfo {
  id: EquipmentId;
  name: string;
  device: string;
  measures: string;
  whySpace: string;
}

export interface EquipmentProfile {
  environment: MissionEnvId;
  label: string;
  description: string;
  items: Record<EquipmentId, EquipmentStatus>;
}

export type MedicalTestKind = 'ecg' | 'ultrasound' | 'manual' | 'lab';

export interface MedicalTestRecord {
  id?: number;
  ts: number;
  test: EquipmentId;
  kind: MedicalTestKind;
  /** Human-readable summary of the result/metadata. */
  summary: string;
  /** Structured payload (waveform samples, metadata fields, etc.). */
  data?: Record<string, unknown>;
  simulated: boolean; // must be true for every demo/simulated result
  note?: string;
}

// ---------------------------------------------------------------------------
// Automatic sensor monitoring
// ---------------------------------------------------------------------------

export type SensorKey =
  | 'heartRate'
  | 'bloodPressure'
  | 'sleep'
  | 'activity'
  | 'temperature'
  | 'oxygen';

export type EnvKey =
  | 'radiationDose' // absorbed dose rate μGy/h (onboard dosimeter)
  | 'radiationRate' // dose-equivalent rate μSv/h (onboard dosimeter)
  | 'oxygen' // cabin O₂ %
  | 'co2' // cabin CO₂ ppm
  | 'pressure' // cabin pressure kPa
  | 'cabinTemp'; // cabin temperature °C

export type ReadingLevel = 'ok' | 'watch' | 'urgent' | 'unknown';

export interface Reading {
  key: SensorKey | EnvKey;
  value?: number;
  value2?: number; // second scalar, e.g. diastolic BP
  unit: string;
  ts: number; // measurement timestamp (ms)
  source: string; // device / adapter identification
  simulated: boolean; // true ⇒ a visible DEMO/SIMULATED label is required
  quality: 'good' | 'degraded' | 'unavailable';
  level: ReadingLevel;
}

export interface SensorDeviceStatus {
  key: SensorKey;
  device: string;
  installed: boolean; // present on the selected mission environment
  connected: boolean;
  lastSync?: number;
  simulated: boolean;
}

export interface SensorSnapshot {
  ts: number;
  environment: MissionEnvId;
  personal: Reading[]; // heart rate, BP, sleep, activity, temp, SpO₂
  environmentReadings: Reading[]; // dosimeter + cabin environment
  devices: SensorDeviceStatus[];
  degraded: boolean; // true when the feed fell back / is stale
}

/** One persisted sample in the IndexedDB sensor history. */
export interface SensorSample {
  id?: number;
  key: SensorKey | EnvKey;
  ts: number;
  value?: number;
  value2?: number;
  simulated: boolean;
}

// ---------------------------------------------------------------------------
// Earth-to-Moon journey (replaces the six-level gamification system)
// ---------------------------------------------------------------------------

export type JourneyPhase = 'earth' | 'ready' | 'traveling' | 'arrived';

export interface JourneyState {
  dateKey: string; // ship-local mission day this state belongs to
  physicalAt?: number; // timestamp the physical assessment completed
  mentalAt?: number; // timestamp the mental assessment completed
  phase: JourneyPhase;
  celebrationSeen: boolean; // arrival animation already played for this day
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Conversational assistant
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id?: number;
  ts: number;
  role: 'user' | 'assistant';
  text: string;
  /** e.g. 'symptom' | 'urgent' | 'guidance' — used for special UI treatment */
  tag?: 'symptom' | 'urgent' | 'guidance';
}

// ---------------------------------------------------------------------------
// NASA API payloads
// ---------------------------------------------------------------------------

export interface NasaStudy {
  id: string;
  title: string;
  description: string;
  topics: string[];
  organism?: string;
  source: string;
}

/** Normalized RadLab radiation-telemetry observation. */
export interface RadLabObservation {
  timestamp: string; // ISO-ish timestamp as published by RadLab
  instrument: string;
  instrumentFamily?: string;
  spacecraft?: string;
  module?: string;
  celestialBody?: string;
  trajectory?: string;
  absorbedDoseRate?: number; // μGy/h
  doseEquivalentRate?: number; // μSv/h
  flux?: number; // cm⁻² sr⁻¹ s⁻¹
}

export interface RadiationResponse {
  ok: boolean;
  trajectory: 'LEO' | 'BLEO';
  /** Newest observation timestamp in the returned set. */
  observedAt?: string;
  /** Hours between the observation and "now" — telemetry is historical. */
  ageHours?: number;
  observations: RadLabObservation[];
  fromCache: boolean;
  cachedAt?: number;
  note: string;
  error?: string;
}

export type SpaceWeatherType = 'FLR' | 'CME' | 'GST' | 'SEP';

export interface SpaceWeatherEvent {
  id: string;
  type: SpaceWeatherType;
  eventTime: string;
  classType?: string;
  source: string; // "NASA DONKI"
  link: string;
}

export interface SpaceWeatherResponse {
  ok: boolean;
  fetchedAt: number;
  windowStart: string;
  windowEnd: string;
  events: SpaceWeatherEvent[];
  notice: string;
  fromCache: boolean;
  error?: string;
}

export interface HealthContextResponse {
  ok: boolean;
  topic: string;
  summary: string;
  studies: NasaStudy[];
  hrpSource?: { title: string; url: string };
  fromCache: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface MissionSettings {
  missionName: string;
  environment: string;
  environmentId: MissionEnvId;
  missionStart: string; // YYYY-MM-DD — mission day 1
  crewMember: string;
  thresholds: Thresholds;
}

export interface AppSettings {
  id: 'main';
  theme?: 'dark' | 'light';
  mission: MissionSettings;
  reportDestination?: string;
  demoMode: boolean;
}

export interface OrganKey {
  id: string;
}
