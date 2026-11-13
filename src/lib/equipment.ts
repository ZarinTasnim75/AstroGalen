// AstroGalen — mission medical-equipment inventory.
// Different mission environments carry different medical hardware; every test
// interface depends on this configuration. Sample profiles are provided for the
// demonstration and can be switched in Settings.

import type { EquipmentId, EquipmentProfile, EquipmentStatus, MissionEnvId } from './types';

export const EQUIPMENT_INFO: Record<EquipmentId, {
  name: string;
  device: string;
  measures: string;
  whySpace: string;
}> = {
  ecg: {
    name: 'ECG (electrocardiogram)',
    device: '12-lead or wearable ECG recorder',
    measures: 'Heart rhythm and electrical activity (rate, rhythm disturbances, ST changes).',
    whySpace: 'Cardiac rhythm changes are monitored during and after exercise; microgravity alters cardiovascular loading.',
  },
  ultrasound: {
    name: 'Ultrasound / USG',
    device: 'Portable ultrasound scanner',
    measures: 'Real-time imaging of organs, vessels, eyes, and muscles (e.g. fluid shifts, ocular changes).',
    whySpace: 'Used on the ISS to study SANS (eye changes), fluid redistribution and to guide medical care far from Earth.',
  },
  bp: {
    name: 'Blood pressure measurement',
    device: 'Validated cuff BP monitor',
    measures: 'Systolic/diastolic blood pressure.',
    whySpace: 'Fluid shifts and autonomic changes in microgravity make BP trends important for cardiovascular awareness.',
  },
  glucose: {
    name: 'Blood glucose test',
    device: 'Glucose meter / lab analyzer',
    measures: 'Blood sugar level.',
    whySpace: 'Nutrition and metabolism change in spaceflight; glucose tracking relates meals, exercise and energy.',
  },
  pulseOx: {
    name: 'Pulse oximetry',
    device: 'Fingertip pulse oximeter',
    measures: 'Blood-oxygen saturation (SpO₂) and pulse rate.',
    whySpace: 'A quick check of oxygenation in the closed cabin atmosphere, useful around EVA and exercise.',
  },
  thermometer: {
    name: 'Body temperature',
    device: 'Approved clinical thermometer',
    measures: 'Core body temperature estimate.',
    whySpace: 'Body-temperature rhythms drift in space and fever screening matters in a closed habitat.',
  },
  labAnalyzer: {
    name: 'Blood / urine analysis',
    device: 'Onboard biochemistry analyzer (e.g. iStat / BioChem)', 
    measures: 'Blood count, electrolytes, hydration and chemistry markers from small samples.',
    whySpace: 'Tracks bone markers, hydration and nutrition status during long missions.',
  },
  eyeExam: {
    name: 'Eye examination',
    device: 'Ophthalmic set / tonometer / fundus camera',
    measures: 'Visual acuity, eye pressure and retinal changes (SANS screening).',
    whySpace: 'Spaceflight-associated neuro-ocular syndrome (SANS) affects many long-duration astronauts.',
  },
};

export const EQUIPMENT_IDS: EquipmentId[] = [
  'ecg',
  'ultrasound',
  'bp',
  'glucose',
  'pulseOx',
  'thermometer',
  'labAnalyzer',
  'eyeExam',
];

// Sample equipment profiles used for the demonstration. All values are
// configurable; 'demo' means a clearly-marked simulated interface is used.
export const EQUIPMENT_PROFILES: Record<MissionEnvId, EquipmentProfile> = {
  iss: {
    environment: 'iss',
    label: 'ISS / Spacecraft',
    description: 'Full medical stowage aboard the International Space Station (sample profile).',
    items: {
      ecg: 'available',
      ultrasound: 'available',
      bp: 'available',
      glucose: 'available',
      pulseOx: 'available',
      thermometer: 'available',
      labAnalyzer: 'demo',
      eyeExam: 'available',
    },
  },
  lunar: {
    environment: 'lunar',
    label: 'Lunar Base',
    description: 'Surface habitat medical bay (sample profile).',
    items: {
      ecg: 'available',
      ultrasound: 'available',
      bp: 'available',
      glucose: 'demo',
      pulseOx: 'available',
      thermometer: 'available',
      labAnalyzer: 'unavailable',
      eyeExam: 'demo',
    },
  },
  rover: {
    environment: 'rover',
    label: 'Pressurized Rover',
    description: 'Mobile medical kit during traverses (sample profile).',
    items: {
      ecg: 'demo',
      ultrasound: 'unavailable',
      bp: 'available',
      glucose: 'unavailable',
      pulseOx: 'available',
      thermometer: 'available',
      labAnalyzer: 'unavailable',
      eyeExam: 'unavailable',
    },
  },
  mars: {
    environment: 'mars',
    label: 'Mars Base',
    description: 'Long-duration surface expedition medical suite (sample profile).',
    items: {
      ecg: 'available',
      ultrasound: 'available',
      bp: 'available',
      glucose: 'available',
      pulseOx: 'available',
      thermometer: 'available',
      labAnalyzer: 'demo',
      eyeExam: 'available',
    },
  },
};

export const ENVIRONMENT_LABELS: Record<MissionEnvId, string> = {
  iss: 'ISS — Low Earth Orbit (microgravity)',
  lunar: 'Lunar Base — partial gravity (0.17 g)',
  rover: 'Pressurized Rover — traversing surface',
  mars: 'Mars Base — partial gravity (0.38 g)',
};

export function profileFor(envId: MissionEnvId | undefined): EquipmentProfile {
  return EQUIPMENT_PROFILES[envId ?? 'iss'] ?? EQUIPMENT_PROFILES.iss;
}

export function equipmentStatus(
  profile: EquipmentProfile,
  id: EquipmentId,
): EquipmentStatus {
  return profile.items[id] ?? 'unavailable';
}
