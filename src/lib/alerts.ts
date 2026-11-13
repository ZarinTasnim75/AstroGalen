// AstroGalen — explainable, rules-based alert engine.
//
// IMPORTANT: thresholds come from the user-editable mission settings and are
// SAMPLE/DEMO values, not validated NASA medical standards. Every alert produced
// here is a rules-based observation, never a diagnosis.

import type { AlertLevel, PhysicalData, Thresholds } from './types';

export interface OrbitAlert {
  id: string;
  level: AlertLevel;
  indicator: string;
  title: string;
  whatChanged: string;
  whyAttention: string;
  nextSteps: string[];
  whenSeekHelp: string;
  isQualityCheck?: boolean;
}

export interface AlertInput {
  today?: PhysicalData;
  previous?: PhysicalData;
  thresholds: Thresholds;
}

const fmt = (n: number | undefined, unit: string, digits = 0) =>
  n === undefined || n === null || Number.isNaN(n) ? '—' : `${n.toFixed(digits)} ${unit}`;

export function evaluateAlerts({ today, previous, thresholds: t }: AlertInput): OrbitAlert[] {
  const alerts: OrbitAlert[] = [];
  if (!today) return alerts;

  // ---- Measurement quality checks first (implausible input) ---------------
  if (today.heartRate !== undefined && (today.heartRate < 25 || today.heartRate > 230)) {
    alerts.push(qualityAlert('hr-quality', 'Heart rate reading looks implausible', `${fmt(today.heartRate, 'bpm')} is outside the plausible range (25–230 bpm).`));
  }
  if (today.systolic !== undefined && today.diastolic !== undefined && today.diastolic >= today.systolic) {
    alerts.push(qualityAlert('bp-order', 'Blood pressure reading looks inconsistent', `Diastolic (${fmt(today.diastolic, 'mmHg')}) is not lower than systolic (${fmt(today.systolic, 'mmHg')}).`));
  }
  if (today.temperature !== undefined && (today.temperature < 33 || today.temperature > 42)) {
    alerts.push(qualityAlert('temp-quality', 'Temperature reading looks implausible', `${fmt(today.temperature, '°C', 1)} is outside the plausible range (33–42 °C).`));
  }

  // ---- Heart rate ----------------------------------------------------------
  if (today.heartRate !== undefined && today.heartRate >= 25 && today.heartRate <= 230) {
    const hr = today.heartRate;
    if (hr < 40 || hr > 130) {
      alerts.push(alert(
        'hr-red', 'red', 'Heart rate',
        hr < 40 ? 'Heart rate is markedly below the sample mission threshold' : 'Heart rate is markedly above the sample mission threshold',
        `Recorded ${fmt(hr, 'bpm')} (sample demo threshold range: ${t.heartRateMin}–${t.heartRateMax} bpm).`,
        'A rate this far from the configured range may reflect measurement error, extreme fatigue, dehydration, or an emerging cardiovascular issue. It should not be ignored.',
        ['Rest quietly for 5 minutes and re-measure.', 'If the repeat reading is also far outside range, record how you feel (dizziness, chest discomfort, breathlessness).', 'Log the symptom list in this assessment.'],
        'Follow the mission emergency procedure immediately if the unusual rate comes with chest pain, fainting, or severe breathlessness. Otherwise notify the onboard medical officer today.',
      ));
    } else if (hr < t.heartRateMin || hr > t.heartRateMax) {
      alerts.push(alert(
        'hr-amber', 'amber', 'Heart rate',
        hr < t.heartRateMin ? 'Heart rate is below the configured sample range' : 'Heart rate is above the configured sample range',
        `Recorded ${fmt(hr, 'bpm')} (sample demo threshold range: ${t.heartRateMin}–${t.heartRateMax} bpm).`,
        'Single readings outside range are often benign (measurement timing, recent activity, relaxation), but repeated out-of-range trends are worth verification.',
        ['Re-measure after a few minutes of rest.', 'Check hydration today.', 'Watch for related symptoms (light-headedness, palpitations).'],
        'Contact the medical officer if out-of-range readings persist across two or more assessments or come with symptoms.',
      ));
    }
  }

  // ---- Blood pressure ------------------------------------------------------
  if (today.systolic !== undefined && today.diastolic !== undefined && today.diastolic < today.systolic) {
    const { systolic: sys, diastolic: dia } = today;
    if (sys < 80 || sys > 180 || dia < 45 || dia > 115) {
      alerts.push(alert(
        'bp-red', 'red', 'Blood pressure',
        'Blood pressure has triggered the sample urgent-review criterion',
        `Recorded ${fmt(sys, 'mmHg')}/${fmt(dia, 'mmHg')} (sample demo threshold range: ${t.systolicMin}–${t.systolicMax}/${t.diastolicMin}–${t.diastolicMax}).`,
        'Markedly high or low pressures in a closed habitat need prompt verification — measurement error is common but must be ruled out.',
        ['Re-measure with correct cuff position after 5 minutes of rest.', 'Note any symptoms: headache, dizziness, visual changes.', 'Record hydration status today.'],
        'If the repeat reading is also this far outside range, or you feel unwell, activate the onboard medical emergency procedure.',
      ));
    } else if (sys < t.systolicMin || sys > t.systolicMax || dia < t.diastolicMin || dia > t.diastolicMax) {
      alerts.push(alert(
        'bp-amber', 'amber', 'Blood pressure',
        'Blood pressure is outside the configured sample range',
        `Recorded ${fmt(sys, 'mmHg')}/${fmt(dia, 'mmHg')} (sample demo threshold range: ${t.systolicMin}–${t.systolicMax}/${t.diastolicMin}–${t.diastolicMax}).`,
        'Blood pressure naturally shifts in microgravity due to fluid redistribution; trends matter more than single readings.',
        ['Re-measure once for confirmation.', 'Review hydration and salt intake today.', 'Compare with your personal baseline on the Insights page.'],
        'Contact the medical officer if the trend repeats over 2–3 assessments.',
      ));
    }
  }

  // ---- Temperature ---------------------------------------------------------
  if (today.temperature !== undefined && today.temperature >= 33 && today.temperature <= 42) {
    const temp = today.temperature;
    if (temp >= 38.0) {
      alerts.push(alert(
        'temp-red', 'red', 'Body temperature',
        'Elevated temperature — verify and follow mission procedure',
        `Recorded ${fmt(temp, '°C', 1)} (sample demo threshold range: ${t.tempMin}–${t.tempMax} °C).`,
        'In a closed habitat, a persistently elevated temperature is an early signal the medical team wants to know about quickly, even though it is not a diagnosis.',
        ['Rest 15–30 minutes away from exertion and re-measure.', 'Record any symptoms (chills, sore throat, headache).', 'Limit close contact with crewmates per hygiene protocol while unverified.'],
        'If the repeat reading stays ≥ 38.0 °C, notify the onboard medical officer now per the mission infectious-disease procedure.',
      ));
    } else if (temp > t.tempMax) {
      alerts.push(alert(
        'temp-amber', 'amber', 'Body temperature',
        'Temperature is slightly above the configured sample range',
        `Recorded ${fmt(temp, '°C', 1)} (sample demo threshold range: ${t.tempMin}–${t.tempMax} °C).`,
        'Recent exercise, a hot habitat section, or measurement timing can explain a small rise — verification keeps the record clean.',
        ['Re-measure after rest.', 'Note hydration status.', 'Watch for other symptoms over the next hours.'],
        'Report to the medical officer if it stays elevated on repeat or rises further.',
      ));
    } else if (temp < 35.0) {
      alerts.push(alert(
        'temp-low-red', 'red', 'Body temperature',
        'Temperature is markedly low — re-measure and verify',
        `Recorded ${fmt(temp, '°C', 1)} (sample demo threshold range: ${t.tempMin}–${t.tempMax} °C).`,
        'Low readings often come from device placement, but genuinely low core temperature is urgent.',
        ['Re-measure with a warmed, correctly placed device.', 'Check habitat temperature and your clothing layers.', 'Note shivering, confusion, or unusual fatigue.'],
        'If the repeat reading stays below 35.0 °C or you feel confused or very drowsy, follow the medical emergency procedure immediately.',
      ));
    }
  }

  // ---- Glucose -------------------------------------------------------------
  if (today.glucose !== undefined) {
    const g = today.glucose;
    if (g < 54) {
      alerts.push(alert(
        'glucose-red', 'red', 'Blood glucose',
        'Glucose is markedly low — verify promptly',
        `Recorded ${fmt(g, 'mg/dL')} (sample demo threshold range: ${t.glucoseMin}–${t.glucoseMax} mg/dL).`,
        'Low glucose readings can follow missed meals or measurement error; symptoms matter (shakiness, sweating, confusion).',
        ['Re-measure following the device procedure.', 'If you feel shaky or confused, eat per the ship nutrition protocol and re-test after 15 minutes.', 'Record your last meal time.'],
        'If symptoms are present or the repeat stays below 54 mg/dL, notify the medical officer immediately.',
      ));
    } else if (g < t.glucoseMin || g > t.glucoseMax) {
      alerts.push(alert(
        'glucose-amber', 'amber', 'Blood glucose',
        'Glucose is outside the configured sample range',
        `Recorded ${fmt(g, 'mg/dL')} (sample demo threshold range: ${t.glucoseMin}–${t.glucoseMax} mg/dL).`,
        'Recent meals, exercise timing, and stress all shift glucose; a single reading outside range is a verification prompt, not a conclusion.',
        ['Note the time of your last meal and exercise session.', 'Re-measure at your next routine slot.', 'Review nutrition plan adherence today.'],
        'Contact the medical officer if repeated readings stay outside range.',
      ));
    }
  }

  // ---- Sleep ---------------------------------------------------------------
  if (today.sleepHours !== undefined) {
    const s = today.sleepHours;
    if (s < t.sleepHoursMin && s < 5) {
      alerts.push(alert(
        'sleep-amber', 'amber', 'Sleep duration',
        'Short sleep recorded',
        `Recorded ${fmt(s, 'h', 1)} (sample demo range: ${t.sleepHoursMin}–${t.sleepHoursMax} h).`,
        'Circadian disruption is a core spaceflight hazard; short sleep compounds fatigue, stress, and attention errors.',
        ['Review tonight’s sleep routine (light, noise, schedule).', 'Check caffeine timing.', 'Track fatigue and concentration tomorrow.'],
        'If short sleep continues for 3+ nights, raise it in your wellness check or with mission support.',
      ));
    }
  }

  // ---- Comparison with previous assessment ---------------------------------
  if (previous) {
    if (
      today.heartRate !== undefined && previous.heartRate !== undefined &&
      Math.abs(today.heartRate - previous.heartRate) >= 15
    ) {
      alerts.push(alert(
        'hr-delta', 'amber', 'Heart rate vs. last record',
        `Heart rate changed by ${today.heartRate > previous.heartRate ? '+' : ''}${today.heartRate - previous.heartRate} bpm vs. your last assessment`,
        `Previous: ${fmt(previous.heartRate, 'bpm')} → Today: ${fmt(today.heartRate, 'bpm')}.`,
        'A jump this size between rest measurements is usually timing or recovery-related, but the pattern is worth confirming.',
        ['Re-measure at rest.', 'Compare with your personal baseline chart on the Insights page.', 'Note exercise timing before both readings.'],
        'Contact the medical officer if the shift persists or comes with symptoms.',
      ));
    }
    if (
      today.temperature !== undefined && previous.temperature !== undefined &&
      today.temperature - previous.temperature >= 1.0 && today.temperature >= 37.0
    ) {
      alerts.push(alert(
        'temp-delta', 'amber', 'Temperature trend',
        'Temperature has risen by about 1 °C or more since your last assessment',
        `Previous: ${fmt(previous.temperature, '°C', 1)} → Today: ${fmt(today.temperature, '°C', 1)}.`,
        'A rising temperature trend within a closed crew environment is exactly the kind of change mission medical teams track closely.',
        ['Re-measure after rest.', 'Record any new symptoms in the symptom checklist.', 'Follow habitat hygiene protocols.'],
        'Notify the medical officer if the trend continues on the next measurement.',
      ));
    }
  }

  // ---- Symptoms ------------------------------------------------------------
  const reported = (today.symptoms ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^none$/i.test(s) && !/^no (new )?symptoms?$/i.test(s));
  const seriousSymptoms = ['chest pain', 'difficulty breathing', 'vision changes', 'severe headache', 'fainting'];
  const serious = reported.filter((s) => seriousSymptoms.some((k) => s.toLowerCase().includes(k)));
  if (serious.length > 0) {
    alerts.push(alert(
      'symptom-red', 'red', 'Reported symptoms',
      `You reported: ${serious.join(', ')}`,
      'These symptoms are listed in mission guidance as needing prompt medical review.',
      'The onboard medical procedures treat these symptoms as time-sensitive regardless of how mild they feel right now.',
      ['Follow the mission medical emergency procedure now.', 'Record exactly when symptoms started and what makes them better/worse.', 'Do not delay reporting to finish routine tasks.'],
      'Immediately — this is what the emergency procedure is for. AstroGalen does not assess severity; report to the medical officer.',
    ));
  } else if (reported.length > 0) {
    alerts.push(alert(
      'symptom-amber', 'amber', 'Reported symptoms',
      `New symptoms recorded: ${today.symptoms.join(', ')}`,
      'Symptom logging is working as intended — recorded symptoms let the medical team see trends early.',
      'Most symptoms are benign, but a record over time is what turns "I felt off on Tuesday" into usable information.',
      ['Keep monitoring and re-log tomorrow if symptoms persist.', 'Note anything that triggers or relieves them.', 'Mention persistent ones to the medical officer at the next check.'],
      'Contact the medical officer if any symptom worsens, lasts more than 48 hours, or affects your ability to work.',
    ));
  }

  return alerts;
}

function alert(
  id: string, level: AlertLevel, indicator: string, title: string,
  whatChanged: string, whyAttention: string, nextSteps: string[], whenSeekHelp: string,
): OrbitAlert {
  return { id, level, indicator, title, whatChanged, whyAttention, nextSteps, whenSeekHelp };
}

function qualityAlert(id: string, title: string, whatChanged: string): OrbitAlert {
  const a = alert(
    id, 'amber', 'Measurement quality', title, whatChanged,
    'This looks more like an input or device issue than a health signal. Fixing the reading keeps your record accurate.',
    ['Re-measure following the device procedure.', 'Check device placement and calibration notes.', 'Leave the field blank if no reliable reading is possible.'],
    'If you cannot obtain a plausible reading, note the device issue for the medical officer.',
  );
  a.isQualityCheck = true;
  return a;
}
