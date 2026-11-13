'use client';

import * as React from 'react';
import { Activity, LineChart, BookOpen, Rocket, PersonStanding } from 'lucide-react';

const KEY = 'astrogalen-intro-seen';

// Game-style intro cover: slides in from the bottom on first visit, gives an
// overview of the project, and slides back up (out) when the player starts.
export function CoverScreen() {
  const [phase, setPhase] = React.useState<'pending' | 'shown' | 'leaving' | 'done'>('pending');

  React.useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === '1';
    } catch {
      seen = false;
    }
    setPhase(seen ? 'done' : 'shown');
  }, []);

  React.useEffect(() => {
    if (phase === 'shown') {
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = '';
      };
    }
  }, [phase]);

  if (phase === 'pending' || phase === 'done') return null;

  const start = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // ignore — replay just means the cover shows again next load
    }
    setPhase('leaving');
    // Wait for the slide-out animation before unmounting (reduced-motion users
    // get an instant hide via CSS).
    window.setTimeout(() => setPhase('done'), 900);
  };

  return (
    <div
      className={`cover-screen fixed inset-0 z-[60] ${phase === 'leaving' ? 'cover-out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to AstroGalen"
      style={{
        background:
          'radial-gradient(1200px 700px at 70% -20%, rgba(56,120,255,0.22), transparent 60%),' +
          'radial-gradient(900px 600px at 10% 40%, rgba(124,58,237,0.20), transparent 60%),' +
          'radial-gradient(1100px 800px at 50% 120%, rgba(34,211,238,0.16), transparent 60%),' +
          'rgb(var(--orbit-bg))',
      }}
    >
      {/* scrollable content layer for short screens */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="relative flex min-h-full items-center justify-center px-4 py-10">
          {/* decorative ringed planet */}
          <div
            aria-hidden="true"
            className="absolute right-[6%] top-[18%] hidden sm:block"
            style={{ transform: 'rotate(-14deg)' }}
          >
            <div
              className="h-20 w-20 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 32% 30%, rgba(250,220,180,0.85), rgba(215,140,80,0.55) 55%, rgba(70,35,20,0.85) 95%)',
                boxShadow: 'inset -10px -8px 18px rgba(0,0,0,0.5)',
              }}
            />
            <div
              className="absolute left-[-16px] right-[-16px] top-[36px] h-[8px] rounded-[50%] border-2"
              style={{ borderColor: 'rgba(167,139,250,0.6)', transform: 'rotate(-10deg)' }}
            />
          </div>

          <div className="relative z-10 w-full max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              {/* logo mark: ringed planet */}
              <svg viewBox="0 0 80 80" className="h-20 w-20" role="img" aria-label="AstroGalen logo">
                <defs>
                  <radialGradient id="cover-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgb(var(--orbit-cyan))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="rgb(var(--orbit-cyan))" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="40" cy="40" r="36" fill="url(#cover-glow)" />
                <circle cx="40" cy="40" r="16" fill="rgb(var(--orbit-blue))" opacity="0.9" />
                <ellipse cx="40" cy="40" rx="28" ry="9" fill="none" stroke="rgb(var(--orbit-cyan))" strokeWidth="2.5" transform="rotate(-18 40 40)" />
                <circle cx="40" cy="40" r="16" fill="none" stroke="rgb(var(--orbit-cyan))" strokeOpacity="0.7" strokeWidth="1.5" />
              </svg>
            </div>

            <p className="text-xs font-semibold tracking-[0.35em] text-orbit-muted uppercase mb-3">
              NASA Space Apps Challenge 2026
            </p>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-orbit-cyan via-orbit-blue to-orbit-violet bg-clip-text text-transparent">
              ASTROGALEN
            </h1>
            <p className="mt-3 text-base sm:text-lg text-orbit-text">
              Astronaut Health & Wellness Companion
            </p>
            <p className="mt-4 mx-auto max-w-xl text-sm sm:text-base text-orbit-muted leading-relaxed">
              Your daily health companion for every stage of space exploration. Automatic health and spacecraft monitoring,
              two quick daily check-ins that launch ORBI to the Moon, onboard medical tests, contextual NASA research, and an
              offline AI assistant — all fully offline-capable, with your data stored only on your device.
            </p>

            <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              {[
                { icon: Activity, title: 'Auto monitoring', desc: 'Simulated sensors + environment' },
                { icon: PersonStanding, title: 'Body explorer', desc: 'Interactive anatomy' },
                { icon: LineChart, title: 'Insights', desc: 'Trends vs your baseline' },
                { icon: BookOpen, title: 'NASA context', desc: 'RadLab · DONKI · OSDR' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="panel p-3">
                  <Icon className="h-5 w-5 text-orbit-cyan mb-1.5" />
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-[11px] text-orbit-muted">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={start}
                autoFocus
                className="inline-flex items-center gap-2 rounded-full bg-orbit-cyan px-8 py-3.5 text-base font-bold text-[rgb(var(--orbit-bg))] shadow-glow transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--orbit-bg))]"
              >
                <Rocket className="h-5 w-5" />
                Launch Mission
              </button>
              <p className="mt-5 text-[11px] text-orbit-muted max-w-md mx-auto">
                AstroGalen provides health awareness and educational guidance — it is not a medical professional and does
                not replace approved medical assessment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
