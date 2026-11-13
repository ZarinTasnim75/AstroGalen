import type { SectionKey, Thresholds } from './types';

export interface MetricInfo {
  key: string;
  label: string;
  unit: string;
  section: SectionKey;
  what: string;
  why: string;
  how: string;
  changeMeans: string;
  whenRepeat: string;
}

export const PHYSICAL_METRICS: MetricInfo[] = [
  {
    key: 'heartRate',
    label: 'Heart rate',
    unit: 'bpm',
    section: 'physical',
    what: 'The number of times your heart beats per minute while at rest.',
    why: 'In microgravity the heart works differently — blood shifts toward the chest and head, and heart rate patterns can change over a mission. Tracking it daily helps you notice trends early.',
    how: 'Measure at rest (sitting quietly for a few minutes), ideally at the same time each day. Use the ship medical device or a validated sensor if available.',
    changeMeans: 'A rate above or below your usual personal baseline can reflect hydration status, fatigue, stress, illness, or exercise recovery — not necessarily a problem by itself.',
    whenRepeat: 'If a reading surprises you, rest for a few minutes and repeat it. If unusual readings persist across the day, record them and notify the medical officer.',
  },
  {
    key: 'bloodPressure',
    label: 'Blood pressure',
    unit: 'mmHg (systolic/diastolic)',
    section: 'physical',
    what: 'The pressure of blood against artery walls: systolic (during a heartbeat) and diastolic (between beats).',
    why: 'Fluid shifts in microgravity change how blood pressure is regulated. Monitoring supports cardiovascular awareness during long missions.',
    how: 'Sit still, arm supported at heart level, cuff on bare upper arm. Record both numbers. Take two readings a minute apart and use the second if they differ.',
    changeMeans: 'Trends away from your baseline can relate to hydration, salt intake, stress, sleep, or cardiovascular adaptation to gravity changes.',
    whenRepeat: 'Repeat after resting if the first reading seems off. Report repeated out-of-range trends to the medical officer — do not self-adjust anything.',
  },
  {
    key: 'glucose',
    label: 'Blood glucose',
    unit: 'mg/dL (optional)',
    section: 'physical',
    what: 'The amount of sugar in your blood at the time of measurement.',
    why: 'Nutrition and metabolism change in spaceflight; if your mission provides a glucose device, tracking helps relate meals, exercise, and energy levels.',
    how: 'Follow the ship glucose meter procedure exactly, including hand hygiene. Skip this field if no device is available — it is optional.',
    changeMeans: 'Values far from your usual range can relate to recent meals, exercise timing, or nutrition plan adherence.',
    whenRepeat: 'If a value seems inconsistent with how you feel, re-measure once. Persistent unusual values should be reviewed with the medical officer.',
  },
  {
    key: 'temperature',
    label: 'Body temperature',
    unit: '°C',
    section: 'physical',
    what: 'Your core body temperature estimate from an approved measurement site.',
    why: 'Temperature regulation is affected by the closed spacecraft environment and by how the body handles heat in microgravity. Fever screening also matters in a closed habitat.',
    how: 'Use the approved thermometer and site (e.g., forehead or ear device). Avoid measuring right after exercise, a hot meal, or immediately after waking.',
    changeMeans: 'A rise above your normal range is one of the early signs the body uses to signal infection or overheating — it is not a diagnosis by itself.',
    whenRepeat: 'Re-measure after 15–30 minutes of rest. A persistently elevated temperature should be reported promptly per mission procedure.',
  },
  {
    key: 'sleepHours',
    label: 'Sleep duration',
    unit: 'hours',
    section: 'physical',
    what: 'How long you slept during the past rest period.',
    why: 'Circadian rhythm disruption is a well-known spaceflight hazard: 90-minute day/night cycles, workload, and noise all affect sleep. Duration is the simplest sleep indicator to track.',
    how: 'Estimate total sleep time from lights-out to final wake-up, minus noticeable awakenings. Log it once per day.',
    changeMeans: 'Short or highly variable sleep over several days often pairs with fatigue, mood changes, and reduced concentration.',
    whenRepeat: 'No repeat needed — but if sleep stays short for 3+ days, review your sleep routine and mention it in your next wellness check.',
  },
  {
    key: 'exerciseMinutes',
    label: 'Exercise duration',
    unit: 'minutes today',
    section: 'physical',
    what: 'Time spent on the mission-prescribed countermeasure exercise today (resistance, treadmill, cycling).',
    why: 'Exercise is the primary countermeasure to bone loss, muscle loss, and cardiovascular deconditioning in microgravity. Adherence is a key mission health indicator.',
    how: 'Log total minutes of prescribed exercise. If the device logs it automatically, compare with that value.',
    changeMeans: 'Low adherence over several days is associated with faster conditioning loss — an operational concern, not a character issue.',
    whenRepeat: 'Log once daily. If pain or unusual symptoms occur during exercise, stop, record the symptom, and report it.',
  },
  {
    key: 'hydration',
    label: 'Hydration self-report',
    unit: 'poor → excellent',
    section: 'physical',
    what: 'Your own assessment of today’s fluid intake and hydration signs (urine color, thirst, headache).',
    why: 'Fluid balance changes in microgravity and dehydration worsens fatigue, headaches, and cardiovascular strain.',
    how: 'Use the four-level scale based on your intake plan and physical signs. Be honest — this is trend data, not a score.',
    changeMeans: 'Repeated "poor" reports often align with headaches, dizziness on standing, or dark urine.',
    whenRepeat: 'Adjust through the day; record the overall state in the evening or at assessment time.',
  },
  {
    key: 'nutrition',
    label: 'Nutrition self-report',
    unit: 'poor → excellent',
    section: 'physical',
    what: 'How well you followed the prescribed nutrition plan today.',
    why: 'Adequate nutrition supports bone, muscle, and immune health — all systems challenged by spaceflight.',
    how: 'Rate your adherence to the mission food plan, including supplements, on the four-level scale.',
    changeMeans: 'Consistently low ratings alongside fatigue or appetite loss are worth discussing with the crew surgeon’s team.',
    whenRepeat: 'Record once per day as part of the physical scan.',
  },
];

export const MENTAL_METRICS: MetricInfo[] = [
  {
    key: 'mood',
    label: 'Mood',
    unit: '1–5',
    section: 'mental',
    what: 'Your overall emotional state today.',
    why: 'Isolation and confinement are known spaceflight hazards. Daily mood tracking builds a personal record that helps you and the support team spot sustained changes.',
    how: 'Pick the emoji/scale that best matches your day. There is no "wrong" answer and honesty is always rewarded.',
    changeMeans: 'A run of low-mood days is useful information — it may relate to sleep, workload, or team dynamics.',
    whenRepeat: 'Once daily; more often if you find it helpful (journal is private).',
  },
  {
    key: 'stress',
    label: 'Stress level',
    unit: '1–5',
    section: 'mental',
    what: 'How much tension or pressure you feel today.',
    why: 'Workload, distance from Earth, and confined living amplify stress. Tracking it daily keeps it visible before it accumulates.',
    how: 'Use the slider where 1 = very calm and 5 = very stressed.',
    changeMeans: 'Rising stress over several days pairs with poor sleep and concentration issues — a signal to review routines and talk to someone.',
    whenRepeat: 'Once daily, ideally at a consistent time.',
  },
  {
    key: 'mentalFatigue',
    label: 'Mental fatigue',
    unit: '1–5',
    section: 'mental',
    what: 'How mentally drained or foggy you feel.',
    why: 'Cognitive workload is high aboard spacecraft; mental fatigue affects operational safety.',
    how: 'Slider from 1 (fresh) to 5 (exhausted).',
    changeMeans: 'Increasing mental fatigue often correlates with shortened sleep and high task load.',
    whenRepeat: 'Once daily. If combined with poor reaction-time performance, plan lighter cognitive load and rest.',
  },
  {
    key: 'physicalFatigue',
    label: 'Physical fatigue',
    unit: '1–5',
    section: 'mental',
    what: 'How physically tired your body feels today.',
    why: 'Distinguishing physical from mental fatigue helps identify whether exercise, sleep, or workload patterns need attention.',
    how: 'Slider from 1 (energetic) to 5 (drained).',
    changeMeans: 'Persistent high physical fatigue can follow intense exercise blocks, poor sleep, or dehydration.',
    whenRepeat: 'Once daily.',
  },
  {
    key: 'sleepQuality',
    label: 'Sleep quality',
    unit: '1–5',
    section: 'mental',
    what: 'How restorative you feel your sleep was, beyond just duration.',
    why: 'Sleep quality is affected by noise, light cycles, and stress in the closed habitat; duration alone doesn’t capture it.',
    how: 'Slider from 1 (very poor) to 5 (excellent).',
    changeMeans: 'Low quality with adequate duration may point to environment factors worth reporting to mission support.',
    whenRepeat: 'Once daily, in the morning or at assessment time.',
  },
  {
    key: 'concentration',
    label: 'Concentration & focus',
    unit: '1–5',
    section: 'mental',
    what: 'How well you could concentrate on tasks today.',
    why: 'Attention is essential for mission operations; tracking it alongside the mini attention test gives a personal performance trend.',
    how: 'Slider from 1 (very scattered) to 5 (very sharp). Optionally try the 60-second reaction exercise below.',
    changeMeans: 'Declining focus with rising fatigue is a common pattern during heavy workload phases.',
    whenRepeat: 'Once daily; the reaction exercise works best daily at the same time.',
  },
  {
    key: 'motivation',
    label: 'Motivation & well-being',
    unit: '1–5',
    section: 'mental',
    what: 'Your sense of drive and general well-being today.',
    why: 'Motivation dips are normal in long missions; tracking them helps you and the team respond supportively.',
    how: 'Slider from 1 (very low) to 5 (very strong).',
    changeMeans: 'Sustained low motivation plus low mood over many days is exactly the kind of trend meant for a conversation with mission support.',
    whenRepeat: 'Once daily.',
  },
];

export const PREVENTION_ITEMS: { key: string; label: string; why: string }[] = [
  {
    key: 'exercise',
    label: 'Completed scheduled exercise session?',
    why: 'Exercise is the main countermeasure to bone and muscle loss in microgravity.',
  },
  {
    key: 'nutrition',
    label: 'Followed prescribed nutrition plan?',
    why: 'Consistent nutrition supports bone, muscle, and immune health.',
  },
  {
    key: 'sleep',
    label: 'Followed recommended sleep routine?',
    why: 'A stable routine protects circadian rhythm in the 90-minute day/night cycle.',
  },
  {
    key: 'hydration',
    label: 'Completed hydration check?',
    why: 'Fluid balance shifts in microgravity; regular checks prevent cumulative dehydration.',
  },
  {
    key: 'symptoms',
    label: 'Experienced any new symptoms today?',
    why: 'Early symptom recording gives the medical team the best trend data.',
  },
  {
    key: 'other',
    label: 'Completed other mission-specific health tasks?',
    why: 'Mission-specific tasks (e.g., data uploads, device calibration) keep the health record complete.',
  },
];

// ---- Input validation & quality checks ------------------------------------

export interface QualityIssue {
  field: string;
  message: string;
}

export function validatePhysical(p: Record<string, unknown>): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const num = (k: string) => (typeof p[k] === 'number' ? (p[k] as number) : undefined);
  const hr = num('heartRate');
  if (hr !== undefined && (hr < 25 || hr > 230)) issues.push({ field: 'heartRate', message: 'Heart rate looks implausible (25–230 bpm). Please re-measure.' });
  const sys = num('systolic');
  const dia = num('diastolic');
  if (sys !== undefined && (sys < 50 || sys > 260)) issues.push({ field: 'systolic', message: 'Systolic pressure looks implausible (50–260 mmHg). Please re-measure.' });
  if (dia !== undefined && (dia < 30 || dia > 160)) issues.push({ field: 'diastolic', message: 'Diastolic pressure looks implausible (30–160 mmHg). Please re-measure.' });
  if (sys !== undefined && dia !== undefined && dia >= sys) issues.push({ field: 'diastolic', message: 'Diastolic should be lower than systolic. Please check the readings.' });
  if (sys !== undefined && dia === undefined || sys === undefined && dia !== undefined) {
    issues.push({ field: 'bloodPressure', message: 'Enter both systolic and diastolic, or leave both blank.' });
  }
  const temp = num('temperature');
  if (temp !== undefined && (temp < 33 || temp > 42)) issues.push({ field: 'temperature', message: 'Temperature looks implausible (33–42 °C). Please re-measure.' });
  const sleep = num('sleepHours');
  if (sleep !== undefined && (sleep < 0 || sleep > 14)) issues.push({ field: 'sleepHours', message: 'Sleep duration should be between 0 and 14 hours.' });
  const ex = num('exerciseMinutes');
  if (ex !== undefined && (ex < 0 || ex > 300)) issues.push({ field: 'exerciseMinutes', message: 'Exercise minutes should be between 0 and 300.' });
  const gluc = num('glucose');
  if (gluc !== undefined && (gluc < 20 || gluc > 600)) issues.push({ field: 'glucose', message: 'Glucose looks implausible (20–600 mg/dL). Please re-measure.' });
  return issues;
}

export function physicalComplete(p: Partial<import('./types').PhysicalData>): boolean {
  const issues = validatePhysical(p as Record<string, unknown>);
  if (issues.length > 0) return false;
  const hasAny =
    p.heartRate !== undefined ||
    p.systolic !== undefined ||
    p.temperature !== undefined ||
    p.sleepHours !== undefined ||
    p.exerciseMinutes !== undefined ||
    p.hydration !== undefined ||
    p.nutrition !== undefined ||
    (p.symptoms && p.symptoms.length > 0);
  return Boolean(hasAny);
}

export function mentalComplete(m: Partial<import('./types').MentalData>): boolean {
  const keys: (keyof import('./types').MentalData)[] = [
    'mood', 'stress', 'mentalFatigue', 'physicalFatigue', 'sleepQuality', 'concentration', 'motivation',
  ];
  return keys.every((k) => typeof m[k] === 'number');
}

export function preventionComplete(p: Partial<import('./types').PreventionData>): boolean {
  if (!p.items) return false;
  const keys = PREVENTION_ITEMS.map((i) => i.key);
  return keys.every((k) => p.items![k] !== undefined);
}

// ---- Thresholds (configurable, demo-labeled) ------------------------------

export const THRESHOLD_DEFS: {
  key: keyof Thresholds;
  label: string;
  metric: string;
  isMax: boolean;
}[] = [
  { key: 'heartRateMin', label: 'Heart rate lower', metric: 'bpm', isMax: false },
  { key: 'heartRateMax', label: 'Heart rate upper', metric: 'bpm', isMax: true },
  { key: 'systolicMin', label: 'Systolic lower', metric: 'mmHg', isMax: false },
  { key: 'systolicMax', label: 'Systolic upper', metric: 'mmHg', isMax: true },
  { key: 'diastolicMin', label: 'Diastolic lower', metric: 'mmHg', isMax: false },
  { key: 'diastolicMax', label: 'Diastolic upper', metric: 'mmHg', isMax: true },
  { key: 'tempMin', label: 'Temperature lower', metric: '°C', isMax: false },
  { key: 'tempMax', label: 'Temperature upper', metric: '°C', isMax: true },
  { key: 'glucoseMin', label: 'Glucose lower', metric: 'mg/dL', isMax: false },
  { key: 'glucoseMax', label: 'Glucose upper', metric: 'mg/dL', isMax: true },
  { key: 'sleepHoursMin', label: 'Sleep lower', metric: 'h', isMax: false },
  { key: 'sleepHoursMax', label: 'Sleep upper', metric: 'h', isMax: true },
  { key: 'spo2Min', label: 'SpO₂ lower', metric: '%', isMax: false },
  { key: 'co2Max', label: 'Cabin CO₂ upper', metric: 'ppm', isMax: true },
];
