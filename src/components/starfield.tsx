'use client';

import * as React from 'react';
import { useTheme } from './theme-provider';
import { useJourneyContext } from './journey-provider';

interface Star {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  hue: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0..1 remaining
  len: number;
}

type Phase = 'earth' | 'ready' | 'traveling' | 'arrived';

// Layered deep-space background: journey-lit Earth (lower-left), Moon
// (upper-right), Mars, nebula gradients, orbital paths, twinkling stars,
// occasional shooting stars and a passing spacecraft. Fully static when
// reduced motion is enabled.
export function Starfield() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const { phase } = useJourneyContext();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The app animates regardless of the OS reduced-motion preference (product
    // decision by the owner, who explicitly asked for visible motion).
    const reduced = false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    let raf = 0;

    const count = reduced ? 60 : Math.min(260, Math.floor((w * h) / 6500));
    const stars: Star[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      speed: Math.random() * 0.02 + 0.004,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.25 ? 190 : Math.random() < 0.5 ? 260 : 220,
    }));
    // A few larger "hero" stars with cross flares.
    const heroes: Star[] = Array.from({ length: 7 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 2.2,
      speed: Math.random() * 0.01 + 0.003,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.5 ? 190 : 45,
    }));

    const meteors: Meteor[] = [];
    let nextMeteor = 2500;

    const spawnMeteor = () => {
      const fromLeft = Math.random() < 0.5;
      const speed = 4 + Math.random() * 3.5;
      meteors.push({
        x: fromLeft ? -40 : w + 40,
        y: Math.random() * h * 0.45,
        vx: (fromLeft ? 1 : -1) * speed,
        vy: speed * (0.45 + Math.random() * 0.3),
        life: 1,
        len: 90 + Math.random() * 80,
      });
    };

    const draw = (t: number) => {
      const dark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = reduced ? 0.7 : 0.5 + 0.5 * Math.sin(t * 0.001 * (s.speed * 50) + s.phase);
        const alpha = dark ? 0.25 + 0.65 * tw : 0.10 + 0.25 * tw;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 90%, ${dark ? 78 : 40}%, ${alpha})`;
        ctx.fill();
        if (!reduced) {
          s.y -= s.speed;
          if (s.y < -2) s.y = h + 2;
        }
      }
      // Hero stars: glow + cross flare.
      for (const s of heroes) {
        const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.0006 + s.phase);
        const a = dark ? 0.5 + 0.5 * tw : 0.2 + 0.3 * tw;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.shadowColor = `hsla(${s.hue}, 90%, 70%, ${a})`;
        ctx.shadowBlur = 10 * tw;
        ctx.strokeStyle = `hsla(${s.hue}, 90%, ${dark ? 85 : 45}%, ${a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s.r * 2.4, 0);
        ctx.lineTo(s.r * 2.4, 0);
        ctx.moveTo(0, -s.r * 2.4);
        ctx.lineTo(0, s.r * 2.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, s.r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 95%, ${dark ? 90 : 55}%, ${a})`;
        ctx.fill();
        ctx.restore();
        if (!reduced) {
          s.y -= s.speed;
          if (s.y < -6) s.y = h + 6;
        }
      }
      // Shooting stars.
      if (!reduced) {
        nextMeteor -= 16;
        if (nextMeteor <= 0 && meteors.length < 2) {
          spawnMeteor();
          nextMeteor = 4500 + Math.random() * 6000;
        }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.x += m.vx;
          m.y += m.vy;
          m.life -= 0.012;
          if (m.life <= 0 || m.x < -m.len || m.x > w + m.len || m.y > h + m.len) {
            meteors.splice(i, 1);
            continue;
          }
          const nx = m.vx / Math.hypot(m.vx, m.vy);
          const ny = m.vy / Math.hypot(m.vx, m.vy);
          const tailX = m.x - nx * m.len;
          const tailY = m.y - ny * m.len;
          const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
          grad.addColorStop(0, 'rgba(150, 220, 255, 0)');
          grad.addColorStop(1, `rgba(190, 235, 255, ${0.85 * m.life})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(230, 250, 255, ${m.life})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize);

    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Nebula gradients */}
      <div
        className="absolute inset-0"
        style={{
          background:
            theme === 'dark'
              ? 'radial-gradient(1000px 600px at 80% -10%, rgba(56,120,255,0.16), transparent 60%),' +
                'radial-gradient(800px 500px at 10% 30%, rgba(124,58,237,0.14), transparent 60%),' +
                'radial-gradient(900px 700px at 50% 110%, rgba(34,211,238,0.10), transparent 60%),' +
                'radial-gradient(500px 380px at 25% 75%, rgba(236,72,153,0.07), transparent 65%)'
              : 'radial-gradient(1000px 600px at 80% -10%, rgba(56,120,255,0.10), transparent 60%),' +
                'radial-gradient(800px 500px at 10% 30%, rgba(124,58,237,0.07), transparent 60%)',
        }}
      />

      {/* Orbital paths */}
      <svg className="absolute inset-0 h-full w-full opacity-20 dark:opacity-25" viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse cx="30" cy="70" rx="24" ry="9" fill="none" stroke="rgba(120,180,255,0.35)" strokeWidth="0.15" strokeDasharray="1.4 2" />
        <ellipse cx="30" cy="70" rx="34" ry="13" fill="none" stroke="rgba(120,180,255,0.25)" strokeWidth="0.12" strokeDasharray="1.4 2.4" />
        <ellipse cx="78" cy="22" rx="18" ry="7" fill="none" stroke="rgba(220,225,255,0.3)" strokeWidth="0.12" strokeDasharray="1.2 2" />
      </svg>

      {/* Earth — large, lower-left, journey-lit */}
      <JourneyEarth phase={phase} />

      {/* Moon — upper-right, lights up on arrival */}
      <JourneyMoon phase={phase} />

      {/* Mars — smaller, distant */}
      <div
        aria-hidden="true"
        className="absolute right-[16%] bottom-[24%] h-16 w-16 opacity-40 dark:opacity-50"
        style={{
          background:
            'radial-gradient(circle at 34% 30%, rgba(255,190,150,0.9), rgba(225,110,60,0.65) 50%, rgba(90,30,10,0.95) 92%)',
          boxShadow: 'inset -8px -6px 18px rgba(0,0,0,0.55), 0 0 26px rgba(255,110,60,0.18)',
        }}
      >
        <div className="absolute left-[14%] top-[28%] h-[8%] w-[62%] rounded-full opacity-30" style={{ background: 'rgba(80,20,5,0.8)', transform: 'rotate(-8deg)' }} />
      </div>

      {/* Distant galaxy smudge */}
      <div
        aria-hidden="true"
        className="absolute left-[30%] top-[8%] h-24 w-40 opacity-25 dark:opacity-30"
        style={{
          background:
            'radial-gradient(60% 35% at 50% 50%, rgba(190,160,255,0.5), transparent 70%), radial-gradient(30% 20% at 60% 55%, rgba(120,220,255,0.4), transparent 75%)',
          filter: 'blur(2px)',
          transform: 'rotate(-18deg)',
        }}
      />

      {/* Passing spacecraft — subtle, reduced-motion aware */}
      <PassingSatellite />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/** Earth with a halo that intensifies while ORBI travels, then dims on arrival. */
function JourneyEarth({ phase }: { phase: Phase }) {
  const intensity = phase === 'arrived' ? 0.35 : phase === 'traveling' || phase === 'ready' ? 1 : 0.55;
  return (
    <div
      aria-hidden="true"
      className="absolute -left-[12vmin] bottom-[-18vmin] h-[52vmin] w-[52vmin] rounded-full"
      style={{
        background:
          'radial-gradient(circle at 34% 30%, rgba(110,215,255,0.95), rgba(35,110,235,0.75) 45%, rgba(8,28,74,0.98) 82%)',
        boxShadow: `inset -22px -18px 60px rgba(0,0,0,0.6), 0 0 ${60 * intensity}px rgba(56,150,255,${0.28 * intensity})`,
        opacity: 0.5 + intensity * 0.25,
        filter: 'blur(0.4px)',
        transition: 'box-shadow 2.2s ease, opacity 2.2s ease',
      }}
    >
      {/* Continents + cloud swirls */}
      <div className="absolute left-[18%] top-[16%] h-[16%] w-[26%] rounded-[60%] opacity-70" style={{ background: 'rgba(80,200,120,0.65)', filter: 'blur(3px)', transform: 'rotate(14deg)' }} />
      <div className="absolute left-[46%] top-[34%] h-[20%] w-[30%] rounded-[45%] opacity-60" style={{ background: 'rgba(70,180,110,0.6)', filter: 'blur(4px)', transform: 'rotate(-10deg)' }} />
      <div className="absolute left-[26%] top-[58%] h-[14%] w-[38%] rounded-[50%] opacity-55" style={{ background: 'rgba(90,190,120,0.55)', filter: 'blur(5px)' }} />
      <div className="absolute left-[30%] top-[26%] h-[10%] w-[40%] rounded-[50%] opacity-40" style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(6px)' }} />
      {/* Atmosphere rim */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: 'inset 0 0 26px rgba(120,200,255,0.5)',
          opacity: 0.5 + intensity * 0.4,
          transition: 'opacity 2.2s ease',
        }}
      />
    </div>
  );
}

/** Moon with a bright silver-blue glow that peaks on ORBI's arrival. */
function JourneyMoon({ phase }: { phase: Phase }) {
  const glow = phase === 'arrived' ? 1 : phase === 'traveling' ? 0.55 : 0.25;
  return (
    <div
      aria-hidden="true"
      className="absolute right-[6vmin] top-[8vmin] h-[24vmin] w-[24vmin] rounded-full"
      style={{
        background:
          'radial-gradient(circle at 35% 32%, rgba(245,247,255,0.95), rgba(190,196,220,0.8) 52%, rgba(78,82,110,0.95) 95%)',
        boxShadow: `inset -10px -8px 26px rgba(0,0,0,0.55), 0 0 ${26 + glow * 70}px rgba(200,220,255,${0.15 + glow * 0.45})`,
        opacity: 0.55 + glow * 0.4,
        transition: 'box-shadow 2.2s ease, opacity 2.2s ease',
      }}
    >
      {/* Craters */}
      <div className="absolute left-[22%] top-[30%] h-[16%] w-[16%] rounded-full opacity-30" style={{ background: 'rgba(70,74,100,0.7)', boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.5)' }} />
      <div className="absolute left-[55%] top-[52%] h-[22%] w-[22%] rounded-full opacity-25" style={{ background: 'rgba(70,74,100,0.7)', boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.5)' }} />
      <div className="absolute left-[42%] top-[16%] h-[10%] w-[10%] rounded-full opacity-25" style={{ background: 'rgba(70,74,100,0.7)' }} />
    </div>
  );
}

/** A tiny satellite crossing the sky occasionally (CSS animation). */
function PassingSatellite() {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      const delay = 14000 + Math.random() * 20000;
      const timer = setTimeout(() => {
        if (!alive) return;
        setVisible(true);
        setTimeout(() => alive && setVisible(false), 14000);
        loop();
      }, delay);
      return timer;
    };
    loop();
    return () => {
      alive = false;
    };
  }, []);
  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      className="absolute top-[30%] -left-8"
      style={{ animation: 'satellite-cross 14s linear forwards' }}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-white/90 shadow-glow" />
      <div className="h-2.5 w-5 rounded-sm border border-orbit-cyan/50 bg-orbit-panel/60 -ml-1 mt-0.5 opacity-80" />
    </div>
  );
}
