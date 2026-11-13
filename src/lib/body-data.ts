// AstroGalen — interactive anatomy content. Educational content describing known
// spaceflight effects from public NASA research; never diagnostic advice.

export interface OrganIndicator {
  label: string;
  metricKey?: string; // links to a chart series
  selfReport?: boolean;
}

export interface OrganInfo {
  id: string;
  name: string;
  icon: string;
  function: string;
  whySpaceMatters: string;
  hazards: string[];
  indicators: OrganIndicator[];
  recordMetrics: string[];
  attention: string[];
  prevention: string[];
  seekHelp: string;
}

export const ORGANS: Record<string, OrganInfo> = {
  brain: {
    id: 'brain',
    name: 'Brain & Mind',
    icon: '🧠',
    function: 'Controls thought, mood, sleep cycles, coordination, and every body system.',
    whySpaceMatters:
      'Isolation, confinement, distance from Earth, and disrupted day/night cycles (a 90-minute orbit) are documented stressors for mood, sleep, and cognition in spaceflight research.',
    hazards: ['Isolation & confinement', 'Distance from Earth', 'Altered gravity (vestibular & fluid shifts)', 'Hostile closed environment'],
    indicators: [
      { label: 'Mood (daily 1–5)', selfReport: true },
      { label: 'Stress level', selfReport: true },
      { label: 'Mental fatigue', selfReport: true },
      { label: 'Sleep quality', selfReport: true },
      { label: 'Concentration & reaction time', selfReport: true },
    ],
    recordMetrics: ['mood', 'stress', 'mentalFatigue', 'sleepHours'],
    attention: [
      'Low mood or very high stress persisting for several days',
      'Sleep that stays short or unrefreshing night after night',
      'Trouble concentrating that affects routine tasks',
    ],
    prevention: [
      'Keep a consistent sleep and light-exposure routine',
      'Use scheduled communication windows with family and mission support',
      'Take micro-breaks and use the private journal to offload thoughts',
    ],
    seekHelp:
      'If low mood, anxiety, or hopeless feelings persist beyond a few days, or interfere with work or crew relationships, contact the onboard medical officer or mission psychological support — reaching out is a sign of good self-management, not weakness.',
  },
  eyes: {
    id: 'eyes',
    name: 'Eyes & Vision',
    icon: '👁️',
    function: 'Provide vision; the optic nerve and eye shape can be affected by fluid pressure changes.',
    whySpaceMatters:
      'Many astronauts report vision changes on long missions (documented in NASA research as Spaceflight-Associated Neuro-ocular Syndrome, SANS). Headward fluid shift in microgravity is a leading suspected cause.',
    hazards: ['Altered gravity (fluid shifts)', 'Space radiation', 'Distance from Earth (limited corrective options)'],
    indicators: [
      { label: 'Vision sharpness changes', selfReport: true },
      { label: 'Pressure behind the eyes', selfReport: true },
      { label: 'Reported symptoms checklist', selfReport: true },
    ],
    recordMetrics: ['symptoms'],
    attention: [
      'Blurred vision that appears or worsens mid-mission',
      'Persistent pressure or puffiness around the eyes',
      'Dark spots, flashes, or any sudden vision loss',
    ],
    prevention: [
      'Log any vision change early — trend notes help the medical team',
      'Use mission-approved eye exercises or compression garments if prescribed',
      'Keep the symptom checklist current, even for small changes',
    ],
    seekHelp:
      'Sudden vision loss, double vision, or eye pain requires immediate contact with the onboard medical officer per emergency procedures.',
  },
  heart: {
    id: 'heart',
    name: 'Heart & Circulation',
    icon: '🫀',
    function: 'Pumps blood through the body; blood vessels regulate pressure and flow.',
    whySpaceMatters:
      'In microgravity blood shifts toward the chest and head, the heart works at reduced load, and standing blood-pressure reflexes weaken — a known effect of altered gravity.',
    hazards: ['Altered gravity', 'Hostile closed environment', 'Isolation (delayed care)'],
    indicators: [
      { label: 'Heart rate (bpm)', metricKey: 'heartRate' },
      { label: 'Blood pressure (mmHg)', metricKey: 'systolic' },
      { label: 'Exercise minutes', metricKey: 'exerciseMinutes' },
      { label: 'Hydration self-report', selfReport: true },
    ],
    recordMetrics: ['heartRate', 'systolic', 'diastolic', 'exerciseMinutes'],
    attention: [
      'Heart rate or blood pressure trending away from your personal baseline',
      'Chest discomfort, palpitations, or breathlessness at rest',
      'Dizziness or fainting on standing after rest',
    ],
    prevention: [
      'Complete the prescribed daily countermeasure exercise',
      'Follow the hydration plan — fluid shifts make dehydration easy to miss',
      'Measure vitals at consistent times for comparable trends',
    ],
    seekHelp:
      'Chest pain, fainting, or severe breathlessness: follow the onboard medical emergency procedure immediately.',
  },
  lungs: {
    id: 'lungs',
    name: 'Lungs & Breathing',
    icon: '🫁',
    function: 'Exchange oxygen and carbon dioxide; airways keep the blood supplied with oxygen.',
    whySpaceMatters:
      'In a closed habitat, air quality (CO₂, dust, contaminants) is a documented concern; lung fluid distribution also changes in microgravity.',
    hazards: ['Hostile closed environment', 'Distance from Earth', 'Altered gravity (fluid distribution)'],
    indicators: [
      { label: 'Reported breathing symptoms', selfReport: true },
      { label: 'Heart rate at rest', metricKey: 'heartRate' },
      { label: 'Exercise tolerance notes', selfReport: true },
    ],
    recordMetrics: ['symptoms', 'heartRate'],
    attention: [
      'New or persistent cough, wheeze, or shortness of breath',
      'Breathlessness out of proportion to effort',
      'Symptoms that cluster with habitat alerts or air-quality warnings',
    ],
    prevention: [
      'Keep respiratory device filters per maintenance schedule',
      'Log breathing symptoms even when mild — trends inform air-quality reviews',
      'Maintain exercise; it supports respiratory and cardiovascular fitness',
    ],
    seekHelp:
      'Difficulty breathing at rest, blue-tinged lips, or wheezing that does not settle: activate the onboard medical emergency procedure.',
  },
  bones: {
    id: 'bones',
    name: 'Skeleton & Bones',
    icon: '🦴',
    function: 'Structural framework, mineral storage, and blood cell production.',
    whySpaceMatters:
      'Without gravity loading, bones lose density — especially the pelvis, spine, and legs. This is one of the most-studied hazards of spaceflight (NASA OSDR hosts extensive bone-loss datasets).',
    hazards: ['Altered gravity (unloading)', 'Distance from Earth (long duration)', 'Isolation (delayed treatment)'],
    indicators: [
      { label: 'Exercise adherence', metricKey: 'exerciseMinutes' },
      { label: 'Nutrition self-report', selfReport: true },
      { label: 'Bone-health exam records (if scheduled by mission)', selfReport: true },
    ],
    recordMetrics: ['exerciseMinutes', 'nutrition'],
    attention: [
      'Missed resistance-exercise sessions accumulating across the week',
      'Bone or joint pain during exercise',
      'Nutrition plan (calcium/vitamin D) slipping repeatedly',
    ],
    prevention: [
      'Complete every scheduled resistance session — loading is the countermeasure',
      'Follow the prescribed calcium and vitamin D plan',
      'Record exercise minutes daily so adherence trends stay visible',
    ],
    seekHelp:
      'Bone pain, unusual fractures, or pain during loading exercises should be reported to the medical officer promptly. AstroGalen does not estimate bone density — only mission-approved scans can do that.',
  },
  muscles: {
    id: 'muscles',
    name: 'Muscles',
    icon: '💪',
    function: 'Enable movement, posture, and balance; muscle activity supports circulation.',
    whySpaceMatters:
      'Muscles (especially anti-gravity muscles: calves, thighs, back) weaken and shrink without daily loading in microgravity.',
    hazards: ['Altered gravity (unloading)', 'Hostile closed environment (limited space for training)'],
    indicators: [
      { label: 'Exercise minutes', metricKey: 'exerciseMinutes' },
      { label: 'Physical fatigue', metricKey: 'physicalFatigue' },
      { label: 'Muscle soreness notes', selfReport: true },
    ],
    recordMetrics: ['exerciseMinutes', 'physicalFatigue'],
    attention: [
      'Persistent muscle soreness beyond normal training effects',
      'Strength that feels reduced during routine tasks',
      'Cramps that keep recurring',
    ],
    prevention: [
      'Complete both resistance and aerobic sessions as prescribed',
      'Warm up and stretch per the training plan to reduce injury risk',
      'Log fatigue to balance workload and recovery',
    ],
    seekHelp:
      'Sudden severe muscle pain, dark urine after intense exercise, or weakness that does not recover: report to the medical officer.',
  },
  digestive: {
    id: 'digestive',
    name: 'Digestive System',
    icon: '🍽️',
    function: 'Processes food and fluid; absorbs nutrients that fuel every other system.',
    whySpaceMatters:
      'Fluid shifts, motion adaptation, and confined food systems affect appetite, taste, and digestion; nutrition is a documented pillar of spaceflight health.',
    hazards: ['Altered gravity (fluid shifts)', 'Hostile closed environment (food system)', 'Isolation (menu monotonomy)'],
    indicators: [
      { label: 'Nutrition self-report', selfReport: true },
      { label: 'Hydration self-report', selfReport: true },
      { label: 'Symptom checklist (nausea, appetite)', selfReport: true },
    ],
    recordMetrics: ['nutrition', 'hydration', 'glucose'],
    attention: [
      'Appetite loss lasting several days',
      'Persistent nausea, constipation, or diarrhea',
      'Trouble staying hydrated despite following the fluid plan',
    ],
    prevention: [
      'Follow the prescribed nutrition plan including supplements',
      'Space meals and hydration across the day rather than bolusing',
      'Use flavor-variety strategies the food system provides',
    ],
    seekHelp:
      'Vomiting that repeats, inability to keep fluids down, or severe abdominal pain requires prompt contact with the medical officer.',
  },
  skin: {
    id: 'skin',
    name: 'Skin & Temperature',
    icon: '🌡️',
    function: 'Barrier against the environment; regulates body temperature through sweating and blood flow.',
    whySpaceMatters:
      'Space radiation increases long-term skin-cancer risk; the closed habitat changes hygiene, humidity, and heat management, and sweat behaves differently without gravity-driven airflow.',
    hazards: ['Space radiation', 'Hostile closed environment (heat & hygiene)', 'Altered gravity (sweat and airflow)'],
    indicators: [
      { label: 'Body temperature', metricKey: 'temperature' },
      { label: 'Rashes, irritation notes', selfReport: true },
      { label: 'Hydration self-report', selfReport: true },
    ],
    recordMetrics: ['temperature', 'hydration'],
    attention: [
      'A temperature trending upward across measurements',
      'New rashes, persistent irritation, or slow-healing wounds',
      'Feeling too hot or too cold relative to habitat settings',
    ],
    prevention: [
      'Log temperature daily at a consistent time',
      'Follow habitat hygiene and laundry schedules',
      'Keep skin hydrated and report any radiation-exposure events as briefed',
    ],
    seekHelp:
      'Fever per mission thresholds, spreading redness, or any wound with pus or increasing pain: contact the medical officer.',
  },
  immune: {
    id: 'immune',
    name: 'Immune System',
    icon: '🛡️',
    function: 'Defends against infections and monitors abnormal cells; also drives inflammation.',
    whySpaceMatters:
      'NASA research documents immune changes during spaceflight: some responses weaken while inflammation can rise — a concern in a closed crew environment with radiation exposure.',
    hazards: ['Space radiation', 'Isolation & confinement', 'Hostile closed environment (shared air & surfaces)'],
    indicators: [
      { label: 'Body temperature', metricKey: 'temperature' },
      { label: 'Fatigue', metricKey: 'physicalFatigue' },
      { label: 'Symptom checklist (sore throat, etc.)', selfReport: true },
    ],
    recordMetrics: ['temperature', 'physicalFatigue', 'symptoms'],
    attention: [
      'Low-grade temperature lasting more than a day',
      'Swollen glands, persistent sore throat, or unusual fatigue',
      'Two or more crewmates developing similar symptoms',
    ],
    prevention: [
      'Keep habitat hygiene, cleaning, and quarantine procedures',
      'Follow nutrition and sleep plans — both support immune function',
      'Log early symptoms so cluster patterns become visible',
    ],
    seekHelp:
      'Temperature at or above the mission fever threshold, or symptoms that cluster among crew members: notify the medical officer per the mission infectious-disease procedure.',
  },
};

export const ORGAN_IDS = Object.keys(ORGANS);
