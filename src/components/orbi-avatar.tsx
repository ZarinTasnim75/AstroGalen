'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Rocket } from 'lucide-react';
import { useJourneyContext } from '@/components/journey-provider';
import { journeyScale } from '@/lib/journey';
import { Progress } from './ui/card';
import { Button } from './ui/button';

// ORBI — the astronaut companion on the Earth-to-Moon journey.
//  • 0/2 assessments: small, floating quietly near Earth
//  • 1/2: medium, energized
//  • 2/2: large — plays the Earth→Moon flight, plants a flag, celebrates.
// The persisted journey state (per ship-local day) prevents the flight from
// replaying on refresh. Reduced-motion users get the arrival state instantly.

const BUBBLE_MESSAGES = [
  'Hey, astronaut! Ready for today’s health check?',
  'Let’s check how you’re doing today!',
  'Your health is an important part of this mission.',
  'Ready to explore the Moon together?',
  'Great progress, astronaut!',
  'Two assessments today — and we fly to the Moon!',
];

const ARRIVED_MESSAGES = [
  'Mission accomplished! See you tomorrow for a new journey.',
  'The Moon is beautiful today — thanks for keeping up your health!',
  'New day, new journey. Complete both check-ins and we fly again!',
];

type MouthExpression = 'smile' | 'open-smile' | 'wave' | 'neutral';

/**
 * ORBI wanders the screen: every ~18 s the dock glides to a new spot
 * (CSS transition on left/bottom, so the move itself is animated travel).
 */
function useOrbiWander(enabled: boolean): { left: string; bottom: string } | null {
  const [pos, setPos] = React.useState<{ left: string; bottom: string } | null>(null);
  React.useEffect(() => {
    if (!enabled) {
      // Parked: null → the dock falls back to its home spot (bottom-right corner).
      setPos(null);
      return;
    }
    // Start at the classic bottom-right corner, then glide around.
    setPos({ left: 'calc(100vw - 5rem)', bottom: '1rem' });
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const glide = (delay: number) => {
      timer = setTimeout(() => {
        if (!alive) return;
        setPos({
          left: `${6 + Math.random() * 70}vw`,
          bottom: `${8 + Math.random() * 44}vh`,
        });
        glide(13000 + Math.random() * 9000);
      }, delay);
    };
    glide(7000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [enabled]);
  return pos;
}

export function OrbiAvatar() {
  const journey = useJourneyContext();
  const { completed, phase, persistedPhase, state } = journey;
  const [open, setOpen] = React.useState(false);
  const [bubbleIdx, setBubbleIdx] = React.useState(0);
  const [flying, setFlying] = React.useState(false);
  const [celebrating, setCelebrating] = React.useState(false);
  const prevCompleted = React.useRef<number | null>(null);

  // Rotate the speech bubble text occasionally.
  React.useEffect(() => {
    const timer = setInterval(() => setBubbleIdx((i) => i + 1), 7000);
    return () => clearInterval(timer);
  }, []);

  // Celebrated-but-unseen persisted state (e.g. migrated from legacy data):
  // show the celebration overlay without replaying the flight.
  React.useEffect(() => {
    if (!state) return;
    if (persistedPhase === 'arrived' && !state.celebrationSeen && !flying) {
      setCelebrating(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.dateKey]);

  // Detect the transition to 2/2 and launch the flight exactly once.
  React.useEffect(() => {
    if (!state) return;
    const before = prevCompleted.current;
    prevCompleted.current = completed;
    if (before !== null && before < 2 && completed === 2 && !state.celebrationSeen) {
      setFlying(true);
    }
  }, [completed, state]);

  const onFlightDone = () => {
    setFlying(false);
    setCelebrating(true);
    journey.markCelebrationSeen();
    toast.success('Mission accomplished! ORBI reached the Moon!');
  };

  const continueMission = () => {
    setCelebrating(false);
    journey.markCelebrationSeen();
  };

  const scale = journeyScale(completed);
  const arrived = persistedPhase === 'arrived' && state?.celebrationSeen;
  const showBubble = !flying && !celebrating;
  const messages = arrived ? ARRIVED_MESSAGES : BUBBLE_MESSAGES;
  const expression: MouthExpression = celebrating ? 'open-smile' : completed >= 1 ? 'wave' : 'smile';

  const startFlight = () => {
    setOpen(false);
    setFlying(true);
  };
  const wander = useOrbiWander(!flying && !celebrating);
  const dockStyle: React.CSSProperties = wander
    ? { left: wander.left, bottom: wander.bottom, transition: 'left 5s ease-in-out, bottom 5s ease-in-out' }
    : { right: 16, bottom: 16 };

  return (
    <>
      {/* Flight overlay: Earth → Moon along a curved path */}
      {flying && <FlightOverlay onDone={onFlightDone} />}

      {/* Wandering ORBI dock: speech bubble + flight button + avatar */}
      {!flying && (
        <div className="fixed z-40 flex flex-col items-end gap-2 print:hidden" style={dockStyle}>
          {showBubble && (
            <div className="panel px-3.5 py-2 max-w-60 neon-ring relative speech-bubble" role="status" aria-live="polite">
              <p className="text-xs font-medium leading-snug">{messages[bubbleIdx % messages.length]}</p>
            </div>
          )}
          {!open && (
            <button
              onClick={startFlight}
              className="panel flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-orbit-cyan neon-ring hover:bg-orbit-cyan/10 transition-colors"
              aria-label="Watch ORBI fly from Earth to the Moon"
            >
              <Rocket className="h-3 w-3" />
              Watch the flight
            </button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Open ORBI companion status"
            className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-cyan"
          >
            <div className="orbi-idle-float" style={{ transform: `scale(${scale})`, transformOrigin: 'bottom right' }}>
              <OrbiFigure size={64} expression={expression} arrived={arrived} />
            </div>
            <span className="absolute -top-1 -left-8 text-[10px] font-semibold text-orbit-cyan select-none">ORBI</span>
          </button>
        </div>
      )}

      <OrbiStatus
        open={open}
        onClose={() => setOpen(false)}
        completed={completed}
        arrived={arrived || celebrating}
        onReplay={startFlight}
      />
      <CelebrationOverlay celebrating={celebrating} onContinue={continueMission} />
    </>
  );
}

// ---------------------------------------------------------------------------

/** Earth → Moon flight overlay (plays the orbi-fly CSS keyframes once). */
function FlightOverlay({ onDone }: { onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden="true">
      <div
        className="absolute"
        style={{
          animation: 'orbi-fly 8s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards',
          left: '12vw',
          bottom: '6vh',
        }}
        onAnimationEnd={onDone}
      >
        <div className="relative">
          <div className="orbi-trail right-full top-1/2 w-44" />
          <div className="orbi-trail right-full top-1/2 w-28 opacity-70 translate-y-2" />
          <div style={{ transform: 'scale(1.25)', transformOrigin: 'center' }}>
            <OrbiFigure size={96} expression="wave" flying />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrbiStatus({
  open,
  onClose,
  completed,
  arrived,
  onReplay,
}: {
  open: boolean;
  onClose: () => void;
  completed: 0 | 1 | 2;
  arrived: boolean;
  onReplay?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed right-4 bottom-40 z-50 w-72 panel p-4 neon-ring" role="dialog" aria-label="ORBI journey status">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">ORBI — Earth to Moon</span>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
      <p className="text-xs text-orbit-muted mb-2">
        {arrived ? 'Today’s journey complete — ORBI is on the Moon.' : `${completed}/2 assessments completed today.`}
      </p>
      <Progress value={(completed / 2) * 100} aria-label="Journey progress" />
      <p className="text-[11px] text-orbit-muted mt-2">
        Completing today’s <strong>Physical</strong> and <strong>Mental</strong> assessments launches ORBI to the Moon.
        Rewards are earned for completing and honestly reporting assessments — never for specific health values.
      </p>
      {onReplay && (
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onReplay}>
          Watch the flight again
        </Button>
      )}
    </div>
  );
}

function CelebrationOverlay({ celebrating, onContinue }: { celebrating: boolean; onContinue: () => void }) {
  if (!celebrating) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label="Mission accomplished">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className="panel relative z-10 max-w-md w-full p-6 text-center neon-ring fade-up">
        {/* Moon surface with ORBI + flag */}
        <div className="mx-auto mb-4 relative h-36 w-full">
          <div className="absolute inset-x-6 bottom-2 h-6 rounded-[50%]" style={{ background: 'radial-gradient(circle, rgba(190,196,220,0.5), transparent 70%)' }} />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4" style={{ transform: 'translateX(-50%) scale(1.15)', transformOrigin: 'bottom center' }}>
            <OrbiFigure size={72} expression="open-smile" arrived flag />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-orbit-cyan via-orbit-blue to-orbit-violet bg-clip-text text-transparent">
          MISSION ACCOMPLISHED!
        </h2>
        <p className="text-sm text-orbit-muted mt-2">
          Excellent work, astronaut! You completed today’s physical and mental health assessments. ORBI has successfully reached the Moon!
        </p>
        <Button size="lg" className="mt-5" onClick={onContinue} autoFocus>
          Continue Mission
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The full-body ORBI illustration (pure SVG/CSS — no external assets)
// ---------------------------------------------------------------------------

export function OrbiFigure({
  size = 64,
  expression = 'smile',
  arrived = false,
  flying = false,
  flag = false,
}: {
  size?: number;
  expression?: MouthExpression;
  arrived?: boolean;
  flying?: boolean;
  flag?: boolean;
}) {
  const glow = arrived ? 0.85 : flying ? 0.15 : 0.45;
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 64 80" role="img" aria-label={arrived ? 'ORBI the astronaut celebrating on the Moon' : 'ORBI the astronaut'}>
      <defs>
        <radialGradient id="orbi-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(var(--orbit-cyan))" stopOpacity={glow * 0.55} />
          <stop offset="100%" stopColor="rgb(var(--orbit-cyan))" stopOpacity="0" />
        </radialGradient>
        {/* Suit: blue→cyan gradient */}
        <linearGradient id="orbi-suit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4ee" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="orbi-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="45%" stopColor="rgba(140,200,255,0.30)" />
          <stop offset="100%" stopColor="rgba(30,50,90,0.65)" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="42" r="30" fill="url(#orbi-glow)" />

      {/* Backpack */}
      <rect x="46" y="34" width="10" height="22" rx="4" fill="#1e3a8a" />
      <rect x="48" y="37" width="6" height="3" rx="1.5" fill="#93e6ff" opacity="0.8" />
      <rect x="48" y="43" width="6" height="3" rx="1.5" fill="#93e6ff" opacity="0.55" />

      {/* Legs + boots */}
      <rect x="25" y="60" width="6" height="10" rx="3" fill="url(#orbi-suit)" />
      <rect x="33" y="60" width="6" height="10" rx="3" fill="url(#orbi-suit)" />
      <ellipse cx="27" cy="71.5" rx="4.6" ry="2.6" fill="#e2f6ff" />
      <ellipse cx="37" cy="71.5" rx="4.6" ry="2.6" fill="#e2f6ff" />

      {/* Arms + gloves (waving arm raises when expression=wave) */}
      {expression === 'wave' ? (
        <g>
          <rect x="45" y="30" width="6.5" height="13" rx="3.2" fill="url(#orbi-suit)" transform="rotate(-52 47 34)" />
          <circle cx="52.5" cy="26.5" r="3.4" fill="#e2f6ff" />
          <rect x="12.5" y="38" width="6.5" height="14" rx="3.2" fill="url(#orbi-suit)" transform="rotate(14 16 45)" />
          <circle cx="14.5" cy="53" r="3.4" fill="#e2f6ff" />
        </g>
      ) : (
        <g>
          <rect x="12.5" y="38" width="6.5" height="14" rx="3.2" fill="url(#orbi-suit)" transform="rotate(14 16 45)" />
          <rect x="45" y="38" width="6.5" height="14" rx="3.2" fill="url(#orbi-suit)" transform="rotate(-14 48 45)" />
          <circle cx="14" cy="53.5" r="3.4" fill="#e2f6ff" />
          <circle cx="50" cy="53.5" r="3.4" fill="#e2f6ff" />
        </g>
      )}

      {/* Torso */}
      <rect x="20" y="34" width="24" height="28" rx="10" fill="url(#orbi-suit)" />
      {/* Chest panel */}
      <rect x="25.5" y="41" width="13" height="8" rx="2.5" fill="#0b1430" opacity="0.85" />
      <circle cx="28.5" cy="45" r="1.3" fill="#4ade80" />
      <circle cx="32" cy="45" r="1.3" fill="#38bdf8" />
      <rect x="34.5" y="43.5" width="2.6" height="3" rx="0.6" fill="#fbbf24" />
      {/* Belt */}
      <rect x="21" y="55" width="22" height="4" rx="2" fill="#0b1430" opacity="0.6" />

      {/* Suit patches */}
      <circle cx="23.5" cy="38.5" r="2.6" fill="#fbbf24" />
      <path d="M22.4 38.5 l1.1 -1.2 1.1 1.2 -1.1 1.2 Z" fill="#1e3a8a" />
      <circle cx="40.5" cy="38.5" r="2.6" fill="#f87171" />
      <path d="M39.3 38.5 a1.2 1.2 0 0 1 2.4 0 a1.2 1.2 0 0 1 -2.4 0" fill="#fff" opacity="0.85" />

      {/* Helmet */}
      <circle cx="32" cy="22" r="14" fill="#e8f6ff" stroke="rgb(var(--orbit-cyan))" strokeWidth="1.4" />
      <ellipse cx="32" cy="23.5" rx="10.5" ry="9.5" fill="url(#orbi-visor)" />

      {/* Face — blinking eyes + expressive mouth */}
      <g className="orbi-eyes">
        <circle cx="28.2" cy="22.6" r="2.1" fill="#101828" />
        <circle cx="35.8" cy="22.6" r="2.1" fill="#101828" />
        <circle cx="28.9" cy="21.8" r="0.7" fill="#fff" />
        <circle cx="36.5" cy="21.8" r="0.7" fill="#fff" />
      </g>
      {expression === 'open-smile' ? (
        <>
          <path d="M28.5 26.5 q3.5 3.6 7 0" stroke="#101828" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M29.5 26.8 q2.5 2.2 5 0 q-2.5 1.4 -5 0" fill="#101828" />
        </>
      ) : (
        <path d="M28.8 26.2 q3.2 2.8 6.4 0" stroke="#101828" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      <ellipse cx="26.2" cy="25" rx="1.7" ry="1.05" fill="#fb7185" opacity="0.45" />
      <ellipse cx="37.8" cy="25" rx="1.7" ry="1.05" fill="#fb7185" opacity="0.45" />

      {/* Visor shine */}
      <path d="M25 18.5 q2.5 -2.8 6 -3" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M24 21 q1 -1.6 2.4 -2.4" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* Helmet antenna light */}
      <circle cx="32" cy="6.6" r="1.9" fill={arrived ? '#4ade80' : 'rgb(var(--orbit-cyan))'}>
        {flying && <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />}
      </circle>
      <line x1="32" y1="8.3" x2="32" y2="10.4" stroke={arrived ? '#4ade80' : 'rgb(var(--orbit-cyan))'} strokeWidth="1.3" />

      {/* Flag on arrival */}
      {flag && (
        <g>
          <line x1="53" y1="42" x2="53" y2="72" stroke="#cbd5e1" strokeWidth="1.6" />
          <path d="M53 43 h9 l-2.4 3 2.4 3 h-9 Z" fill="#38bdf8" />
        </g>
      )}
    </svg>
  );
}
