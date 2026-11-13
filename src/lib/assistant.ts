// AstroGalen — offline conversational health companion.
//
// Rules-based intent recognition over a curated knowledge base + locally stored
// assessment context. Works fully offline. It NEVER diagnoses: reported changes
// are acknowledged, follow-up questions are asked, and the mission medical
// protocol / onboard medical officer are referenced. Urgent-symptom phrases
// trigger a clear emergency alert instead of a friendly reply.

import type { AssessmentRecord, ChatMessage } from './types';

export interface AssistantReply {
  text: string;
  tag?: ChatMessage['tag'];
  /** True when the message includes a step-by-step relaxation exercise. */
  breathing?: boolean;
}

export interface AssistantContext {
  todaySymptoms?: string[];
  todayMood?: number;
  completedToday: { physical: boolean; mental: boolean };
  streakDays?: number;
}

// ---------------------------------------------------------------------------
// Knowledge base
// ---------------------------------------------------------------------------

const URGENT_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /chest (pain|pressure|discomfort)|pain in (my )?chest/i, reason: 'chest pain or pressure' },
  { pattern: /difficulty breathing|short(ness)? of breath|can'?t breathe|trouble breathing/i, reason: 'breathing difficulty' },
  { pattern: /faint(ed|ing)?|passed out|black(ed)? out|unconscious/i, reason: 'fainting or loss of consciousness' },
  { pattern: /severe headache|worst headache of my life|sudden (bad|severe) headache/i, reason: 'sudden severe headache' },
  { pattern: /(can'?t|cannot) see|lost vision|blurry vision (that )?(got|getting) worse|double vision/i, reason: 'vision loss or worsening' },
  { pattern: /bleeding (a lot|heavily|won'?t stop)|severe bleeding/i, reason: 'severe bleeding' },
  { pattern: /throwing up (blood|a lot)|vomiting blood/i, reason: 'vomiting blood' },
  { pattern: /hurt myself|harm myself|self[- ]harm|suicid|don'?t want to (live|be here)|end my life/i, reason: 'thoughts of self-harm' },
  { pattern: /weak(ness)? (on one side|of my arm|of my leg)|numb(ness)? (on one side|of my face|of my arm)/i, reason: 'one-sided weakness or numbness' },
];

const SYMPTOM_PATTERNS: { pattern: RegExp; key: string; followUp: string; check: string[] }[] = [
  {
    pattern: /dizzy|dizziness|lightheaded|light-headed/i, key: 'Dizziness',
    followUp: 'Does it happen mainly when you stand up quickly, or is it constant?',
    check: ['Recent blood-pressure reading (a cuff monitor if your mission has one)', 'Fluid intake — microgravity blunts thirst', 'Last meal time'],
  },
  {
    pattern: /headache/i, key: 'Headache',
    followUp: 'Where does it hurt, and when did it start?',
    check: ['Cabin CO₂ level on the dashboard (high CO₂ commonly causes headaches)', 'Fluid intake', 'Sleep duration last night'],
  },
  {
    pattern: /nause(a|ous|ated)|queasy|feel(ing)? sick to my stomach/i, key: 'Nausea',
    followUp: 'Have you been able to keep fluids down?',
    check: ['Recent meals and motion exposure', 'Temperature reading', 'Hydration self-report'],
  },
  {
    pattern: /fever|hot all over|chills/i, key: 'Fever',
    followUp: 'Have you measured your temperature with the approved thermometer?',
    check: ['Body temperature from the sensor patch', 'Other symptoms (sore throat, cough)'],
  },
  {
    pattern: /sore throat|cough|runny nose|congest/i, key: 'Cold-like symptoms',
    followUp: 'Any difficulty breathing or fever along with it?',
    check: ['Temperature', 'Symptom trend over the past 48 hours'],
  },
  {
    pattern: /insomnia|can(?:not|'?t) sleep|trouble sleeping|hard to sleep/i, key: 'Sleep difficulty',
    followUp: 'Roughly how many hours did you sleep last night?',
    check: ['Sleep duration from wearable sleep tracking', 'Caffeine timing today'],
  },
  {
    pattern: /muscle (sore|pain|cramp)|muscles? (are|is) (sore|aching)|sore muscles|aching muscles/i, key: 'Muscle soreness',
    followUp: 'Did a recent exercise session precede it, or did it start on its own?',
    check: ['Exercise minutes today', 'Whether the pain is joint vs muscle'],
  },
  {
    pattern: /joint pain|knee|shoulder pain|elbow|wrist pain/i, key: 'Joint pain',
    followUp: 'Did it start during or after exercise?',
    check: ['Recent exercise load', 'Swelling or reduced range of motion'],
  },
  {
    pattern: /fatigue|exhaust|tired all the time|no energy/i, key: 'Fatigue',
    followUp: 'Has your sleep been short or fragmented this week?',
    check: ['Sleep trend in Insights', 'Physical-fatigue rating in today’s check-in'],
  },
  {
    pattern: /stomach (ache|pain)|abdominal pain|belly pain/i, key: 'Abdominal pain',
    followUp: 'Is it constant, or does it come in waves? Any change with eating?',
    check: ['Last bowel movement pattern', 'Recent meals', 'Temperature'],
  },
  {
    pattern: /eye|vision/i, key: 'Vision change',
    followUp: 'Is the change constant, or does it come and go? Any headache with it?',
    check: ['Eye-power entry from your last eye exam', 'Whether you have an ophthalmic set onboard (see Medical Tests)'],
  },
  {
    pattern: /palpitation|heart racing|heart pounding|heartbeat fast/i, key: 'Palpitations',
    followUp: 'How long did it last, and were you resting or active?',
    check: ['Heart-rate trend on the dashboard', 'Caffeine intake', 'Hydration'],
  },
];

const MOOD_PATTERNS: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /isolat|lonely|alone|homesick|miss (home|earth|my famil)/i,
    reply:
      'That feeling is real and shared by many astronauts — isolation and confinement are one of NASA’s five recognized spaceflight hazards. ' +
      'You are not doing anything wrong by feeling this way. Would you like a short relaxation exercise, or should we talk for a moment about how today went? ' +
      'Crew support channels and the behavioral-health team exist exactly for this — reaching out is good mission practice, not weakness.',
  },
  {
    pattern: /stress(ed|ful)?|anxious|anxiety|overwhelm|tense|pressure'?s? on/i,
    reply:
      'I hear you. Elevated stress over several days is worth paying attention to alongside sleep and workload — it is a documented spaceflight stressor, not a personal failing. ' +
      'I can guide you through a paced-breathing reset right now, or we can review your sleep and workload trend together. And if the pressure keeps building, the mission support team is the right place to take it.',
  },
  {
    pattern: /depress|down lately|low mood|sad|hopeless|empty/i,
    reply:
      'Thank you for telling me. Low mood over multiple days is important information — for you, not just for a chart. ' +
      'A few things that genuinely help in confinement: keeping your sleep/wake anchors, one small completed task, and a real conversation with crew or ground support. ' +
      'If this feeling sticks around for more than a couple of days, or gets heavier, please contact the behavioral-health support channel — that is what it is there for.',
  },
];

const EXPLAIN_PATTERNS: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /heart rate|bpm/i,
    reply:
      'Heart rate is how many times your heart beats per minute. In microgravity, blood shifts from your legs toward your chest, and your heart changes shape and workload over a mission — NASA’s Human Research Program monitors this as a cardiovascular risk. On the dashboard it comes automatically from the sensor vest (DEMO hardware here). A single value matters less than the trend across days.',
  },
  {
    pattern: /blood pressure/i,
    reply:
      'Blood pressure is the force of blood against your artery walls (systolic/diastolic in mmHg). Fluid shifts in microgravity change how your body regulates it. It is only shown when a compatible cuff monitor exists in your mission equipment profile — AstroGalen never estimates blood pressure from heart rate.',
  },
  {
    pattern: /spo2|oxygen saturation|blood oxygen/i,
    reply:
      'SpO₂ is the percentage of oxygen carried by your blood, measured by a fingertip pulse oximeter if your mission carries one. In the closed cabin atmosphere it is a quick check around exercise or EVA. It is only displayed when a pulse oximeter is part of the equipment profile.',
  },
  {
    pattern: /radiation|dosimeter|radlab/i,
    reply:
      'Space radiation comes from galactic cosmic rays and solar particle events. Your dashboard shows a simulated onboard area dosimeter (DEMO) for the cabin environment, plus real NASA RadLab instrument telemetry with its own (historical) timestamps, and NASA DONKI space-weather context. RadLab and DONKI are never treated as a measurement of your personal dose — personal dose needs your own dosimeter and mission protocol.',
  },
  {
    pattern: /bone|bone density|dxa/i,
    reply:
      'Without Earth-level loading, bones lose density — NASA research describes roughly 1% per month without adequate countermeasure exercise. Exercise (especially resistance work) and nutrition are the main tools. Bone density itself can only be measured by a DXA scan in a lab — you enter that result in the physical assessment after your scheduled test.',
  },
  {
    pattern: /sleep|circadian/i,
    reply:
      'Spaceflight disrupts sleep: a 90-minute day/night cycle, noise and workload mean astronauts average about 6 hours in orbit versus 8.5 on Earth. Sleep drives your fatigue, mood and concentration. Your sleep duration arrives automatically from wearable sleep tracking (one value per completed sleep interval).',
  },
  {
    pattern: /five hazards|hazards of spaceflight|what are the hazards/i,
    reply:
      'NASA’s Human Research Program names five hazards: (1) space radiation, (2) isolation and confinement, (3) distance from Earth, (4) gravity fields — microgravity or partial gravity, and (5) hostile/closed environments. Each maps to the health areas AstroGalen tracks: cardiovascular, bone, immune, sleep, nutrition, and behavioral health.',
  },
  {
    pattern: /immune/i,
    reply:
      'Spaceflight changes immune-cell behavior — NASA research documents altered immune responses in astronauts. In a closed habitat that makes early symptom reporting and daily hygiene more valuable. Record symptoms honestly in your physical assessment; the trend matters more than any single day.',
  },
];

const HOWTO_PATTERNS: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /how (do|to) (i )?(complete|do|start|finish).*(assessment|check-?in)|assessments? (how|where)/i,
    reply:
      'Open Assessments from the top navigation. There are exactly two daily steps: the Physical Health Assessment (your sensor data is auto-filled — just review it, add symptoms and any lab results) and the Mental Wellness Assessment (mood emoji plus a few sliders, with an optional private journal). Completing both launches ORBI to the Moon!',
  },
  {
    pattern: /orbi|moon|journey|gamif/i,
    reply:
      'ORBI is your Earth-to-Moon companion. Complete today’s Physical and Mental assessments and ORBI flies from Earth to the Moon, plants a flag and celebrates. The journey rewards completing and honestly reporting your check-ins — never specific health values. A new journey starts with each new mission day.',
  },
  {
    pattern: /(medical )?report|export|pdf/i,
    reply:
      'Open Medical Report from the More menu. You can preview, download a local PDF/JSON export (works offline), and — only with your explicit consent and a configured recipient — submit the report online. Nothing is ever transmitted automatically.',
  },
  {
    pattern: /medical tests|ecg|ultrasound|equipment/i,
    reply:
      'The Medical Tests page shows the equipment available in your selected mission environment. ECG connects to an adapter (or a clearly-marked demo waveform in this prototype), ultrasound stores imported images or metadata only, and simple tests store results locally. The equipment inventory itself is configured in Settings.',
  },
  {
    pattern: /offline|internet|connect/i,
    reply:
      'AstroGalen is offline-first: monitoring, assessments, insights, medical tests, the assistant and ORBI all work without a connection, storing data on your device (IndexedDB). NASA context refreshes only when online — the dashboard clearly labels cached NASA data and its age.',
  },
  {
    pattern: /settings|equipment profile|threshold/i,
    reply:
      'In Settings you can switch the mission environment (ISS, Lunar Base, Rover, Mars Base), edit the equipment inventory, set the sample medical thresholds used for the rules-based observations, and manage demo data. Thresholds are sample values for demonstration — the mission’s approved limits always take precedence.',
  },
];

const SMALL_TALK: { pattern: RegExp; reply: string }[] = [
  { pattern: /^(hi|hello|hey|good morning|good evening|greetings)\b/i, reply: "Hello, astronaut! 👋 How are you feeling today? I'm here if you want to talk about your health, your measurements, or how the mission is going." },
  { pattern: /how are you/i, reply: 'Floating along happily, thank you! More importantly — how are YOU doing? Your daily check-in is the best two minutes you can give this mission.' },
  { pattern: /thank(s| you)/i, reply: 'Anytime, astronaut. Looking after your health IS the mission. Anything else I can explain or help with?' },
  { pattern: /who are you|what can you do|help me/i, reply: 'I’m ORBI’s voice — AstroGalen’s health companion. I can explain your measurements, why changes in spaceflight deserve attention, guide you through the app, listen when something feels off, and remind you about the mission protocol. I never diagnose — for that there’s the medical officer.' },
  { pattern: /motivat|inspir|quote/i, reply: '“You must be extremely disciplined to fly in space — but the payoff is seeing the whole Earth in one glance.” Keep up the small daily disciplines: hydration, exercise, sleep, and an honest check-in. They add up over a long mission.' },
];

const BREATHING_TEXT =
  'Let’s do a paced-breathing reset together: inhale slowly through your nose for 4 seconds… hold gently for 4… and exhale through your mouth for 6. ' +
  'Repeat for about five cycles. This is a standard relaxation tool — nothing mysterious, just a way to give your nervous system a steady rhythm.';

export function respondTo(message: string, ctx: AssistantContext): AssistantReply {
  const m = message.trim();
  if (!m) return { text: 'I’m listening whenever you’re ready.', tag: 'guidance' };

  // 1. Urgent symptoms — always first.
  for (const u of URGENT_PATTERNS) {
    if (u.pattern.test(m)) {
      return {
        tag: 'urgent',
        text:
          `⚠ This sounds like it could be urgent (${u.reason}). Please follow the onboard emergency procedure NOW and contact the mission medical officer or ground medical support immediately. ` +
          'Do not wait for the daily assessment to log this. I am a friendly companion, not emergency care — real help is the priority right now. ' +
          (u.reason.includes('self-harm')
            ? 'If you are having thoughts of self-harm, please reach the psychological support channel immediately — you matter, and support is standing by.'
            : 'If someone is nearby, tell them as well.'),
      };
    }
  }

  // 2. Mood / distress.
  for (const p of MOOD_PATTERNS) {
    if (p.pattern.test(m)) {
      return { tag: 'guidance', text: p.reply, breathing: /stress|anxious|overwhelm|tense/i.test(m) };
    }
  }

  // 3. Physical symptoms.
  for (const s of SYMPTOM_PATTERNS) {
    if (s.pattern.test(m)) {
      const alreadyLogged = ctx.todaySymptoms?.some((sym) => sym.toLowerCase().includes(s.key.toLowerCase()));
      return {
        tag: 'symptom',
        text:
          `Thanks for telling me about the ${s.key.toLowerCase()}. I can’t diagnose what’s causing it — nobody can from a conversation — but here’s what I suggest. ` +
          `${s.followUp} ` +
          `Worth reviewing: ${s.check.join('; ')}. ` +
          (alreadyLogged
            ? 'You already recorded it in today’s assessment — good. Update it if it changes.'
            : 'Would you like to record this in today’s physical assessment? It takes one tap from the Assessments page.') +
          ' If it worsens or new symptoms appear, follow the mission medical protocol and contact the onboard medical officer.',
      };
    }
  }

  // 4. Explanations.
  for (const p of EXPLAIN_PATTERNS) {
    if (p.pattern.test(m)) return { tag: 'guidance', text: p.reply };
  }

  // 5. How-to / app help.
  for (const p of HOWTO_PATTERNS) {
    if (p.pattern.test(m)) return { tag: 'guidance', text: p.reply };
  }

  // 6. Feeling check-in.
  if (/\b(feel|feeling)\b/i.test(m)) {
    const good = /good|great|better|fine|okay|ok\b|well\b/i.test(m);
    if (good) {
      return {
        tag: 'guidance',
        text: `That's good to hear! ${ctx.completedToday.physical && ctx.completedToday.mental ? 'You’ve already completed today’s assessments — ORBI made it to the Moon. 🌕' : 'When you have a moment, today’s physical and mental check-ins are waiting — completing both sends ORBI to the Moon.'} Keep the small daily habits going: fluids, exercise, and rest.`,
      };
    }
    return {
      tag: 'guidance',
      text: 'Thanks for being honest with me. Can you tell me a bit more — is it more physical (headache, dizziness, fatigue) or more emotional (stress, isolation, low mood)? I can suggest what to check, and anything you report belongs in today’s assessment so the trend is visible.',
    };
  }

  // 7. Small talk.
  for (const p of SMALL_TALK) {
    if (p.pattern.test(m)) return { tag: 'guidance', text: p.reply };
  }

  // 8. Fallback.
  const nudge = !ctx.completedToday.physical || !ctx.completedToday.mental;
  return {
    tag: 'guidance',
    text:
      `I didn’t fully catch that, but I’m here to help. I can explain measurements (heart rate, blood pressure, SpO₂, radiation), the five spaceflight hazards, how to use assessments, medical tests or reports — ` +
      (nudge ? 'and today’s physical and mental assessments are still open, which ORBI is waiting for. ' : 'and review your completed check-ins with you. ') +
      'If you’re describing a symptom, tell me a bit more about what you feel and when it started.',
  };
}

/** Build context from locally stored assessment records. */
export function contextFromRecords(records: AssessmentRecord[]): AssistantContext {
  const todayKey = new Date().toLocaleDateString('sv-SE'); // ship-local YYYY-MM-DD
  const today = records.filter((r) => r.dateKey === todayKey);
  const physical = today.find((r) => r.section === 'physical')?.data as { symptoms?: string[] } | undefined;
  const mental = today.find((r) => r.section === 'mental')?.data as { mood?: number } | undefined;
  return {
    todaySymptoms: (physical?.symptoms ?? []).filter((s) => s && s !== 'None'),
    todayMood: mental?.mood,
    completedToday: { physical: today.some((r) => r.section === 'physical'), mental: today.some((r) => r.section === 'mental') },
  };
}

export const QUICK_PROMPTS = [
  'How do I complete today’s assessments?',
  'Explain why radiation matters',
  'What are the five spaceflight hazards?',
  'I have been feeling dizzy recently',
  'I feel isolated and stressed',
  'How do I export a medical report?',
];
