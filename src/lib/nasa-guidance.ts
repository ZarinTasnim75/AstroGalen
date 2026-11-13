// AstroGalen — NASA contextual guidance engine.
//
// Combines the astronaut's sensor readings, daily assessments, environment
// data and trends with NASA Human Research Program (HRP) knowledge and OSDR
// research context. The output is a transparent, rules-based explanation —
// NEVER a diagnosis. Every guidance block carries its NASA sources.
//
// Sources used (fetched contextually, cached locally for offline use):
//  • NASA HRP: hazards / risks / ongoing research pages
//  • NASA OSDR study metadata via /api/nasa/health-context
//  • NASA RadLab radiation telemetry via /api/nasa/radiation
//  • NASA DONKI space-weather context via /api/nasa/space-weather
//  • Canadian Space Agency radiation-monitoring article (educational context)

import type {
  AssessmentRecord,
  HealthContextResponse,
  MentalData,
  PhysicalData,
  RadLabObservation,
  RadiationResponse,
  Reading,
  SpaceWeatherEvent,
  SpaceWeatherResponse,
  Thresholds,
} from './types';

// ---------------------------------------------------------------------------
// NASA reference knowledge (curated from official HRP pages)
// ---------------------------------------------------------------------------

export interface HrpSource {
  id: string;
  title: string;
  url: string;
  blurb: string;
}

export const HRP_SOURCES: Record<string, HrpSource> = {
  hazards: {
    id: 'hazards',
    title: 'NASA HRP — Five Hazards of Human Spaceflight',
    url: 'https://www.nasa.gov/hrp/hazards/',
    blurb: 'NASA identifies five hazards: space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile/closed environments.',
  },
  risks: {
    id: 'risks',
    title: 'NASA HRP — Risks of Human Spaceflight',
    url: 'https://www.nasa.gov/hrp/risks/',
    blurb: 'The Human Research Program catalogs specific health risks including cardiovascular, bone, immune, sleep and behavioral risks.',
  },
  ongoing: {
    id: 'ongoing',
    title: 'NASA HRP — Ongoing Research',
    url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/',
    blurb: 'Current HRP studies address cardiovascular adaptation, bone loss, immune changes, sleep, and behavioral health in spaceflight.',
  },
  cardiovascular: {
    id: 'cardiovascular',
    title: 'NASA HRP — Cardiovascular Adaptation',
    url: 'https://www.nasa.gov/hrp/risks/',
    blurb: 'In microgravity, blood shifts from the legs toward the chest and head; the heart changes shape and workload over a mission.',
  },
  bone: {
    id: 'bone',
    title: 'NASA HRP — Bone Health Risk',
    url: 'https://www.nasa.gov/hrp/risks/',
    blurb: 'Without normal mechanical loading, bone density can decrease about 1% per month without adequate exercise countermeasures.',
  },
  immune: {
    id: 'immune',
    title: 'NASA HRP — Immune System Risk',
    url: 'https://www.nasa.gov/hrp/risks/',
    blurb: 'Spaceflight alters immune responses, which can change infection risk and symptom presentation in closed habitats.',
  },
  sleep: {
    id: 'sleep',
    title: 'NASA HRP — Sleep & Circadian Risk',
    url: 'https://www.nasa.gov/hrp/risks/',
    blurb: 'Astronauts average about 6 hours of sleep in orbit versus 8.5 on Earth; circadian disruption is a known operational hazard.',
  },
  behavioral: {
    id: 'behavioral',
    title: 'NASA HRP — Behavioral Health & Performance',
    url: 'https://www.nasa.gov/hrp/risks/',
    blurb: 'Isolation, confinement and workload can affect mood, stress and team dynamics; routine monitoring and support are standard mission tools.',
  },
  radiation: {
    id: 'radiation',
    title: 'NASA HRP — Space Radiation Risk',
    url: 'https://www.nasa.gov/hrp/hazards/',
    blurb: 'Space radiation (galactic cosmic rays, solar particle events, trapped belt particles) is a key long-mission hazard; dosimeters track exposure over time.',
  },
  csa: {
    id: 'csa',
    title: 'Canadian Space Agency — Monitoring radiation for astronaut health (Feb 2026)',
    url: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp',
    blurb: 'Educational context on how radiation-monitoring technologies protect astronaut health on missions.',
  },
};

// ---------------------------------------------------------------------------
// Context fetchers (client side, cached in IndexedDB by the API routes)
// ---------------------------------------------------------------------------

export async function fetchHealthContext(topic: string): Promise<HealthContextResponse> {
  try {
    const res = await fetch(`/api/nasa/health-context?topic=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error(`health-context responded ${res.status}`);
    return (await res.json()) as HealthContextResponse;
  } catch (err) {
    return {
      ok: false,
      topic,
      summary: 'NASA research context is temporarily unavailable. Cached guidance continues to work offline.',
      studies: [],
      fromCache: false,
      error: (err as Error).message,
    };
  }
}

export interface RadiationClientResult {
  ok: boolean;
  observations: RadLabObservation[];
  observedAt?: string;
  ageHours?: number;
  trajectory: 'LEO' | 'BLEO';
  note: string;
  fromCache: boolean;
}

export async function fetchRadiation(env: string): Promise<RadiationClientResult> {
  try {
    const res = await fetch(`/api/nasa/radiation?env=${encodeURIComponent(env)}`);
    if (!res.ok) throw new Error(`radiation responded ${res.status}`);
    const data = (await res.json()) as RadiationResponse;
    return {
      ok: data.ok,
      observations: data.observations,
      observedAt: data.observedAt,
      ageHours: data.ageHours,
      trajectory: data.trajectory,
      note: data.note,
      fromCache: data.fromCache,
    };
  } catch {
    return {
      ok: false,
      observations: [],
      trajectory: env === 'iss' ? 'LEO' : 'BLEO',
      note: 'NASA RadLab telemetry could not be refreshed (offline or service unavailable). Cached radiation context continues to be shown when available.',
      fromCache: true,
    };
  }
}

export async function fetchSpaceWeather(): Promise<SpaceWeatherResponse> {
  try {
    const res = await fetch('/api/nasa/space-weather?days=7');
    if (!res.ok) throw new Error(`space-weather responded ${res.status}`);
    return (await res.json()) as SpaceWeatherResponse;
  } catch (err) {
    return {
      ok: false,
      fetchedAt: Date.now(),
      windowStart: '',
      windowEnd: '',
      events: [],
      notice:
        'NASA space-weather context could not be refreshed right now (offline or service unavailable). Cached context is shown when available.',
      fromCache: true,
      error: (err as Error).message,
    };
  }
}

// ---------------------------------------------------------------------------
// The guidance engine
// ---------------------------------------------------------------------------

export interface GuidanceSourceRef {
  title: string;
  url: string;
  label: string;
}

export interface GuidanceBlock {
  id: string;
  level: 'info' | 'amber' | 'red';
  title: string;
  overview: string;
  notableChanges: string[];
  possibleReasons: string[];
  verify: string[];
  preventive: string[];
  procedures: string[];
  contactMedical: string;
  riskCategory?: string;
  hrpKeys: string[];
  sources: GuidanceSourceRef[];
}

export interface GuidanceInput {
  readings: Reading[];
  todayPhysical?: PhysicalData;
  todayMental?: MentalData;
  previousPhysical?: PhysicalData;
  thresholds: Thresholds;
  /** Recent assessment records for trend context. */
  recentRecords?: AssessmentRecord[];
}

export type TopicId =
  | 'cardiovascular'
  | 'immune'
  | 'bone'
  | 'sleep'
  | 'radiation'
  | 'stress'
  | 'behavioral'
  | 'general';

export function topicLabel(topic: TopicId): string {
  const map: Record<TopicId, string> = {
    cardiovascular: 'Cardiovascular adaptation',
    immune: 'Immune system changes',
    bone: 'Bone health',
    sleep: 'Sleep disruption',
    radiation: 'Radiation exposure',
    stress: 'Spaceflight stress',
    behavioral: 'Behavioral health',
    general: 'General spaceflight health',
  };
  return map[topic];
}

/** HRP explanation + OSDR term used for contextual research lookups. */
export const TOPIC_CONTEXT: Record<TopicId, { osdrTerms: string[]; summary: string }> = {
  cardiovascular: {
    osdrTerms: ['cardiovascular spaceflight', 'orthostatic intolerance microgravity'],
    summary:
      'Microgravity shifts body fluids toward the head and reduces the heart’s workload, which can change heart-rate and blood-pressure patterns over a mission.',
  },
  immune: {
    osdrTerms: ['immune system spaceflight', 'immunity microgravity'],
    summary:
      'Spaceflight alters immune-cell behavior; closed habitats make it important to notice early symptom changes and report them.',
  },
  bone: {
    osdrTerms: ['bone loss spaceflight', 'bone density microgravity'],
    summary:
      'Without Earth-level mechanical loading, bones lose density — about 1% per month without adequate countermeasures. Exercise and nutrition are the main tools.',
  },
  sleep: {
    osdrTerms: ['sleep circadian spaceflight', 'sleep disruption astronauts'],
    summary:
      'The 90-minute day/night cycle, noise and workload shorten and fragment sleep in orbit; sleep drives fatigue, mood and concentration.',
  },
  radiation: {
    osdrTerms: ['space radiation effects', 'dosimetry spaceflight'],
    summary:
      'Space radiation comes from galactic cosmic rays and solar particle events. Onboard dosimeters track dose rates; NASA RadLab provides real instrument telemetry.',
  },
  stress: {
    osdrTerms: ['spaceflight stress', 'salivary biomarkers stress spaceflight'],
    summary:
      'Workload, confinement and distance from Earth are measurable stressors; tracking stress with sleep and mood gives an honest picture.',
  },
  behavioral: {
    osdrTerms: ['behavioral health spaceflight', 'psychological isolation confinement'],
    summary:
      'Behavioral health is a core HRP focus: mood, motivation and team dynamics are monitored routinely on every long mission.',
  },
  general: {
    osdrTerms: ['human spaceflight health'],
    summary: 'Human spaceflight challenges the cardiovascular, musculoskeletal, immune and behavioral systems simultaneously.',
  },
};

/** Build the "What should I do?" guidance from current readings + records. */
export function buildGuidance(input: GuidanceInput): GuidanceBlock[] {
  const blocks: GuidanceBlock[] = [];
  const { readings, todayPhysical, todayMental, previousPhysical, thresholds: t } = input;

  const get = (key: string) => readings.find((r) => r.key === key);

  // ---- Cardiovascular: heart rate elevated vs baseline / personal record ----
  const hr = get('heartRate');
  if (hr?.value !== undefined) {
    const elevated = previousPhysical?.heartRate !== undefined && hr.value - previousPhysical.heartRate >= 10;
    const outOfRange = hr.value > t.heartRateMax || hr.value < t.heartRateMin;
    if (elevated || outOfRange) {
      blocks.push({
        id: 'cardio-heart-rate',
        level: outOfRange ? 'amber' : 'info',
        title: 'Heart-rate pattern is different from your usual records',
        overview:
          `Your sensor vest shows ${hr.value} bpm now. ` +
          (elevated ? `That is ${hr.value - (previousPhysical?.heartRate ?? hr.value)} bpm higher than your last recorded assessment value. ` : '') +
          (outOfRange ? 'It is outside the mission sample limits configured in Settings. ' : '') +
          'These measurements alone do not establish any diagnosis.',
        notableChanges: [
          ...(elevated ? [`Heart rate rose from about ${previousPhysical?.heartRate} bpm (last assessment) to ${hr.value} bpm (current sensor).`] : []),
          ...(outOfRange ? [`Current reading ${hr.value} bpm is outside the configured sample range ${t.heartRateMin}–${t.heartRateMax} bpm.`] : []),
        ],
        possibleReasons: [
          'Recent exercise or physical workload (elevated recovery heart rate).',
          'Dehydration or a warm cabin environment.',
          'Stress, caffeine intake, or short sleep last night.',
          'Cardiovascular adaptation to microgravity (blood shifts toward the chest).',
        ],
        verify: [
          'Rest quietly for 5 minutes and re-check the sensor reading.',
          'Confirm the sensor vest is seated correctly and synced.',
          'Cross-check today’s blood-pressure measurement (if the mission BP monitor is installed).',
        ],
        preventive: [
          'Follow your fluid-intake plan; microgravity blunts thirst.',
          'Keep the prescribed exercise sessions — they train cardiovascular stability.',
          'Protect sleep: it directly affects resting heart rate.',
        ],
        procedures: [
          'Log the reading in today’s physical assessment (auto-filled from the sensor).',
          'Repeat the reading after rest and note both values in the symptom note field.',
        ],
        contactMedical:
          'Contact the mission medical officer if the elevated pattern persists after rest, or if you feel palpitations, chest discomfort, dizziness, or shortness of breath.',
        riskCategory: 'Cardiovascular adaptation (HRP risk category)',
        hrpKeys: ['cardiovascular', 'risks', 'hazards'],
        sources: [
          { title: HRP_SOURCES.cardiovascular.title, url: HRP_SOURCES.cardiovascular.url, label: 'NASA Human Research Program' },
        ],
      });
    }
  }

  // ---- Blood pressure (only when the device exists) ----
  const bp = get('bloodPressure');
  if (bp?.quality !== 'unavailable' && bp?.value !== undefined) {
    const bad = bp.value > t.systolicMax || bp.value2 !== undefined && bp.value2 < t.diastolicMin;
    if (bad) {
      blocks.push({
        id: 'cardio-bp',
        level: 'amber',
        title: 'Blood pressure is outside the configured sample range',
        overview: `The BP monitor reads ${bp.value}/${bp.value2 ?? '—'} mmHg. This is a trend observation against your configured sample limits — not a diagnosis.`,
        notableChanges: [`Reading ${bp.value}/${bp.value2 ?? '—'} mmHg vs configured range ${t.systolicMin}–${t.systolicMax}/${t.diastolicMin}–${t.diastolicMax} mmHg.`],
        possibleReasons: ['Fluid-shift adaptation in microgravity.', 'Hydration status.', 'Stress or recent activity.', 'Measurement technique (cuff position, arm height).'],
        verify: ['Sit still for 3–5 minutes and repeat the measurement.', 'Arm supported at heart level, cuff on bare skin.', 'Take two readings a minute apart and use the second.'],
        preventive: ['Maintain the fluid and salt plan prescribed for the mission.', 'Keep daily exercise countermeasure sessions.'],
        procedures: ['Record both values in the physical assessment.', 'Re-measure after rest before reporting.'],
        contactMedical: 'Report repeated out-of-range measurements to the medical officer — never adjust medication or salt on your own.',
        riskCategory: 'Cardiovascular adaptation (HRP risk category)',
        hrpKeys: ['cardiovascular', 'risks'],
        sources: [{ title: HRP_SOURCES.cardiovascular.title, url: HRP_SOURCES.cardiovascular.url, label: 'NASA Human Research Program' }],
      });
    }
  }

  // ---- Sleep ----
  const sleepHours = todayPhysical?.sleepHours ?? get('sleep')?.value;
  const sleepQuality = todayMental?.sleepQuality;
  if (sleepHours !== undefined && (sleepHours < t.sleepHoursMin || (sleepQuality !== undefined && sleepQuality <= 2))) {
    blocks.push({
      id: 'sleep-short',
      level: 'amber',
      title: 'Sleep is running short or light',
      overview:
        `Your records show about ${sleepHours} h of sleep last interval` +
        (sleepQuality !== undefined ? ` with a sleep-quality rating of ${sleepQuality}/5.` : '.') +
        ' Circadian disruption is a well-documented spaceflight hazard — on ISS, astronauts average ~6 h of sleep versus 8.5 h on Earth.',
      notableChanges: [
        `Sleep duration ${sleepHours} h vs configured range ${t.sleepHoursMin}–${t.sleepHoursMax} h.`,
        ...(sleepQuality !== undefined && sleepQuality <= 2 ? ['Sleep quality rated 2/5 or lower.'] : []),
      ],
      possibleReasons: [
        '90-minute day/night cycles and cabin light exposure.',
        'Noise, temperature or a heavy workload schedule.',
        'Caffeine timing late in the day.',
      ],
      verify: [
        'Check the wearable sleep-tracking record against how rested you feel.',
        'Confirm the sleep schedule aligned with the mission rest plan.',
      ],
      preventive: [
        'Hold the prescribed wind-down routine and dark/quiet sleep environment.',
        'Avoid caffeine within ~7 hours of lights-out.',
        'Anchor wake time to the mission schedule, even after a short night.',
      ],
      procedures: [
        'Log today’s sleep in the assessment (auto-filled from the wearable).',
        'If sleep stays short for 3+ days, flag it at the next crew check-in.',
      ],
      contactMedical: 'Contact mission support if short sleep persists for 3+ days or if you feel unsafe performing duties from fatigue.',
      riskCategory: 'Sleep & circadian risk (HRP risk category)',
      hrpKeys: ['sleep', 'risks'],
      sources: [{ title: HRP_SOURCES.sleep.title, url: HRP_SOURCES.sleep.url, label: 'NASA Human Research Program' }],
    });
  }

  // ---- Fatigue + stress pattern (example from the challenge statement) ----
  if (todayMental) {
    const highFatigue = todayMental.mentalFatigue >= 4 || todayMental.physicalFatigue >= 4;
    const highStress = todayMental.stress >= 4;
    if (highFatigue || highStress) {
      blocks.push({
        id: 'fatigue-stress',
        level: highStress && highFatigue ? 'amber' : 'info',
        title: 'Fatigue and stress are elevated in today’s check-in',
        overview:
          'Your recent records show changes in fatigue' + (highStress ? ' and stress' : '') + '. These measurements alone do not establish a diagnosis. ' +
          'Review your recent rest and workload, and follow the approved crew health protocol. Contact medical support if the changes persist or symptoms develop.',
        notableChanges: [
          ...(todayMental.mentalFatigue >= 4 ? [`Mental fatigue rated ${todayMental.mentalFatigue}/5.`] : []),
          ...(todayMental.physicalFatigue >= 4 ? [`Physical fatigue rated ${todayMental.physicalFatigue}/5.`] : []),
          ...(highStress ? [`Stress rated ${todayMental.stress}/5.`] : []),
        ],
        possibleReasons: [
          'Short or fragmented sleep over recent days.',
          'High workload period or schedule compression.',
          'Isolation and confinement load (a documented spaceflight hazard).',
          'Post-exercise recovery.',
        ],
        verify: [
          'Cross-check sleep duration and quality from the wearable record.',
          'Confirm exercise load was as planned (not higher).',
          'Note when symptoms are worst (morning vs late day).',
        ],
        preventive: [
          'Use the relaxation tools in the AI Assistant (paced breathing, brief reset).',
          'Protect one daily off-duty block and social contact with crew/support.',
          'Follow the established sleep and rest routines.',
        ],
        procedures: [
          'Mention the pattern at the next scheduled crew conference.',
          'Keep the private journal short and honest — it helps spot trends.',
        ],
        contactMedical:
          'Contact the mission medical officer or behavioral-health support if low mood, hopelessness, or overwhelming stress persists for more than two days, or if you have thoughts of self-harm — mission support exists exactly for this.',
        riskCategory: 'Behavioral health & performance (HRP risk category)',
        hrpKeys: ['behavioral', 'risks', 'hazards'],
        sources: [{ title: HRP_SOURCES.behavioral.title, url: HRP_SOURCES.behavioral.url, label: 'NASA Human Research Program' }],
      });
    }
  }

  // ---- Radiation: dosimeter + DONKI context (environment, never personal dose) ----
  const rad = get('radiationRate');
  const dose = get('radiationDose');
  if (rad?.value !== undefined && dose?.value !== undefined) {
    blocks.push({
      id: 'radiation-env',
      level: 'info',
      title: 'Radiation environment is being tracked',
      overview:
        `Your onboard area dosimeter reads ${dose.value} μGy/h absorbed and ≈${rad.value} μSv/h dose-equivalent. ` +
        'This is the cabin environment — an area measurement, not your personal dose. RadLab telemetry and DONKI solar-activity context are shown separately with their own timestamps.',
      notableChanges: [
        'Absorbed dose rate and dose-equivalent rate are shown with a slow natural variation; watch the trend, not single values.',
      ],
      possibleReasons: [
        'Galactic cosmic-ray intensity changes with solar activity.',
        'Spacecraft shielding and orbit/trajectory differences (LEO vs beyond-Earth).',
        'Solar particle events raise rates for hours after an event.',
      ],
      verify: [
        'Check the RadLab observation timestamp — historical data can lag by months or years.',
        'Confirm the DONKI event window and its age before treating any notice as current.',
      ],
      preventive: [
        'Use shelter areas during elevated-rate periods per the mission radiation-safety protocol.',
        'Keep personal dosimeter logging per procedure (area readings are not personal dose).',
      ],
      procedures: ['Follow the mission ALARA guidance and radiation-safety protocol.', 'Report any dosimeter alarm immediately.'],
      contactMedical: 'Contact the radiation safety officer after any alarm or if you worked through an elevated-rate period.',
      riskCategory: 'Space radiation (HRP hazard)',
      hrpKeys: ['radiation', 'hazards', 'csa'],
      sources: [
        { title: HRP_SOURCES.radiation.title, url: HRP_SOURCES.radiation.url, label: 'NASA Human Research Program' },
        { title: HRP_SOURCES.csa.title, url: HRP_SOURCES.csa.url, label: 'Canadian Space Agency' },
      ],
    });
  }

  // ---- Immune: temperature + symptom reporting ----
  const temp = todayPhysical?.temperature ?? get('temperature')?.value;
  const symptoms = todayPhysical?.symptoms?.filter((s) => s && s !== 'None') ?? [];
  if ((temp !== undefined && temp >= 37.5) || symptoms.length > 0) {
    blocks.push({
      id: 'immune-symptoms',
      level: temp !== undefined && temp >= 38 ? 'amber' : 'info',
      title: 'Symptom check-in recorded',
      overview:
        (symptoms.length ? `You reported: ${symptoms.join(', ')}. ` : '') +
        (temp !== undefined && temp >= 37.5 ? `Body temperature is ${temp} °C, at/above the configured range. ` : '') +
        'In a closed habitat, noticing changes early matters. This is a record of what you reported — not a diagnosis.',
      notableChanges: [
        ...(temp !== undefined && temp >= 37.5 ? [`Temperature ${temp} °C vs configured range ${t.tempMin}–${t.tempMax} °C.`] : []),
        ...(symptoms.length ? [`Reported symptoms: ${symptoms.join(', ')}.`] : []),
      ],
      possibleReasons: [
        'Exercise recovery or heat-load in the cabin.',
        'Normal day-to-day variation.',
        'Immune changes associated with spaceflight (documented by NASA research).',
      ],
      verify: [
        'Re-measure temperature after 15–30 minutes of rest.',
        'Note whether the symptom is new, changing, or persistent.',
      ],
      preventive: ['Follow the mission hygiene protocol.', 'Keep nutrition and hydration on plan.', 'Record symptoms daily — the trend matters more than one entry.'],
      procedures: ['Report persistent or worsening symptoms per crew health protocol.'],
      contactMedical: 'Contact the medical officer if temperature stays elevated, or symptoms worsen, persist beyond 48 h, or include breathing difficulty, chest pain, severe headache, or vision changes.',
      riskCategory: 'Immune system changes (HRP risk category)',
      hrpKeys: ['immune', 'risks'],
      sources: [{ title: HRP_SOURCES.immune.title, url: HRP_SOURCES.immune.url, label: 'NASA Human Research Program' }],
    });
  }

  // ---- Bone: exercise adherence + bone-density lab entry ----
  const exercise = todayPhysical?.exerciseMinutes ?? get('activity')?.value;
  if (exercise !== undefined && exercise < 30) {
    blocks.push({
      id: 'bone-exercise',
      level: 'info',
      title: 'Exercise countermeasure is below the daily plan',
      overview:
        `Today’s exercise record is about ${exercise} min. Bone and muscle respond to loading — NASA research shows bone density can drop ~1% per month without adequate countermeasures. ` +
        'Bone density itself can only be measured by laboratory imaging (DXA); enter those results separately after your scheduled test.',
      notableChanges: [`Exercise ${exercise} min today vs the 30+ min countermeasure plan.`],
      possibleReasons: ['Schedule compression.', 'Equipment maintenance windows.', 'Fatigue or discomfort during exercise.'],
      verify: ['Confirm the activity tracker captured the full session.', 'Check whether sessions were moved rather than skipped.'],
      preventive: ['Split missed sessions across the next two days if the schedule allows.', 'Keep resistance days — they matter most for bone.'],
      procedures: ['Log adherence honestly; the trend guides countermeasure planning.'],
      contactMedical: 'Tell the medical team if pain (not normal muscle soreness) limits exercise.',
      riskCategory: 'Bone & muscle deconditioning (HRP risk category)',
      hrpKeys: ['bone', 'risks'],
      sources: [{ title: HRP_SOURCES.bone.title, url: HRP_SOURCES.bone.url, label: 'NASA Human Research Program' }],
    });
  }

  return blocks;
}

/** Compact summary used by the "What should I do?" dialog header. */
export function guidanceSummary(blocks: GuidanceBlock[]): string {
  if (blocks.length === 0) {
    return 'Nothing in the available data crosses the configured sample rules right now. That is not a guarantee of health — it means no configured condition was flagged. Keep logging honestly.';
  }
  const amber = blocks.filter((b) => b.level === 'amber').length;
  const red = blocks.filter((b) => b.level === 'red').length;
  if (red > 0) return `${red} urgent observation(s) — follow mission procedure and contact medical support.`;
  if (amber > 0) return `${amber} observation(s) worth verifying, plus ${blocks.length - amber} informational note(s).`;
  return `${blocks.length} informational note(s) about your current records.`;
}
