'use client';

import * as React from 'react';

export interface SensorHistoryPoint {
  ts: number;
  value?: number;
  value2?: number;
}

export interface SparklineProps {
  points: SensorHistoryPoint[];
  /** Color classes for the stroke (defaults to cyan). */
  className?: string;
  ariaLabel?: string;
  /** When both value/value2 exist (BP), draw both series. */
  dual?: boolean;
}

function buildPath(values: (number | undefined)[], w: number, h: number): string {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length < 2) return '';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const step = w / Math.max(1, values.length - 1);
  let d = '';
  let started = false;
  values.forEach((v, i) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      started = false;
      return;
    }
    const x = i * step;
    const y = h - 3 - ((v - min) / span) * (h - 6);
    d += `${started ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
    started = true;
  });
  return d.trim();
}

/** Tiny inline trend line for sensor cards. Pure SVG — no chart library. */
export function Sparkline({ points, className = 'text-orbit-cyan', ariaLabel, dual = false }: SparklineProps) {
  const W = 120;
  const H = 34;
  const primaries = points.map((p) => p.value);
  const secondaries = dual ? points.map((p) => p.value2) : [];
  const d1 = buildPath(primaries, W, H);
  const d2 = dual ? buildPath(secondaries, W, H) : '';
  const hasData = Boolean(d1 || d2);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full h-9 ${className}`}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel ?? undefined}
      aria-hidden={ariaLabel ? undefined : true}
      preserveAspectRatio="none"
    >
      {hasData ? (
        <>
          <path d={d1} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
          {dual && d2 && (
            <path d={d2} fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" strokeLinecap="round" opacity="0.55" />
          )}
        </>
      ) : (
        <line x1="4" y1={H / 2} x2={W - 4} y2={H / 2} stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" opacity="0.3" />
      )}
    </svg>
  );
}
