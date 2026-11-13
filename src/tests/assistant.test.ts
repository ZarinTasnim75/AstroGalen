import { test } from 'node:test';
import assert from 'node:assert/strict';
import { respondTo, contextFromRecords, QUICK_PROMPTS, type AssistantContext } from '../lib/assistant';
import type { AssessmentRecord } from '../lib/types';
const ctxEmpty: AssistantContext = { completedToday: { physical: false, mental: false } };
const ctxFull: AssistantContext = {
  completedToday: { physical: true, mental: true },
  todaySymptoms: ['Mild headache'],
};

test('urgent patterns always win over every other intent', () => {
  const urgent = respondTo('I have chest pain right now', ctxEmpty);
  assert.equal(urgent.tag, 'urgent');
  assert.match(urgent.text, /emergency procedure|medical officer/i);

  // Even wrapped in small talk.
  const sneaky = respondTo('Hi!btw difficulty breathing', ctxEmpty);
  assert.equal(sneaky.tag, 'urgent');
});

test('self-harm wording gets the strongest possible redirect', () => {
  const r = respondTo('I am having thoughts of self-harm', ctxEmpty);
  assert.equal(r.tag, 'urgent');
  assert.match(r.text, /psychological support|medical officer|immediately/i);
});

test('symptom replies never diagnose and suggest checks', () => {
  for (const msg of [
    'I feel dizzy when I stand up',
    'I have a headache',
    'Feeling nauseous since this morning',
    'I cannot sleep well',
    'My muscles are sore after exercise',
  ]) {
    const r = respondTo(msg, ctxEmpty);
    assert.equal(r.tag, 'symptom', msg);
    assert.match(r.text, /can'?t diagnose|suggest|protocol|medical officer/i);
    assert.match(r.text, /assessment/i);
  }
});

test('dizziness reply references the headache-CO2 connection for headaches', () => {
  const r = respondTo('Bad headache today', ctxEmpty);
  assert.match(r.text, /CO₂/i);
});

test('symptom context: already-logged symptom gets acknowledgment', () => {
  const r = respondTo('this headache keeps going', ctxFull);
  assert.equal(r.tag, 'symptom');
  assert.match(r.text, /already recorded/i);
});

test('mood replies reference NASA hazards and support channels', () => {
  const iso = respondTo('I feel so isolated up here', ctxEmpty);
  assert.match(iso.text, /isolation/i);
  assert.match(iso.text, /support/i);
  assert.equal(iso.tag, 'guidance');

  const stressed = respondTo('I am really stressed and anxious', ctxEmpty);
  assert.match(stressed.text, /breathing|sleep|workload/i);
  assert.equal(stressed.breathing, true);
});

test('explanations cover the asked-for metric', () => {
  assert.match(respondTo('what does my heart rate mean?', ctxEmpty).text, /heart/i);
  assert.match(respondTo('explain radiation to me', ctxEmpty).text, /cosmic|dosimeter/i);
  assert.match(respondTo('what are the five hazards of spaceflight?', ctxEmpty).text, /five/i);
});

test('how-to replies guide the two daily assessments and ORBI', () => {
  const how = respondTo('how do I complete the assessment?', ctxEmpty);
  assert.match(how.text, /Physical Health Assessment/i);
  assert.match(how.text, /Mental Wellness Assessment/i);

  const orbi = respondTo('how does the ORBI journey work?', ctxEmpty);
  assert.match(orbi.text, /Moon/i);
});

test('feeling check-in nudge references missing assessments', () => {
  const r = respondTo('I feel good today', ctxEmpty);
  assert.match(r.text, /assessment|Moon/i);
});

test('fallback never pretends to understand and stays helpful', () => {
  const r = respondTo('xyzzy plugh', ctxEmpty);
  assert.match(r.text, /didn.t fully catch/i);
});

test('empty message gets a neutral prompt', () => {
  assert.match(respondTo('   ', ctxEmpty).text, /listening/i);
});

test('context extraction reads today’s records only', () => {
  const today = new Date().toLocaleDateString('sv-SE');
  const records: AssessmentRecord[] = [
    { ts: Date.now(), dateKey: today, section: 'physical', data: { symptoms: ['Dizziness', 'None'] } as never },
    { ts: Date.now(), dateKey: '2020-01-01', section: 'mental', data: { mood: 2 } as never },
  ];
  const ctx = contextFromRecords(records);
  assert.deepEqual(ctx.todaySymptoms, ['Dizziness']);
  assert.equal(ctx.completedToday.physical, true);
  assert.equal(ctx.completedToday.mental, false);
});

test('quick prompts are answerable by the engine', () => {
  for (const p of QUICK_PROMPTS) {
    const r = respondTo(p, ctxEmpty);
    assert.ok(r.text.length > 40, `quick prompt not answered: ${p}`);
  }
});
