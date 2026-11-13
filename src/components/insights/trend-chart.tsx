'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { MetricSeries } from '@/lib/insights';

const COLORS: Record<string, string> = {
  heartRate: '#22d3ee',
  systolic: '#60a5fa',
  diastolic: '#a78bfa',
  glucose: '#fbbf24',
  temperature: '#f87171',
  sleepHours: '#818cf8',
  exerciseMinutes: '#34d399',
  mood: '#f472b6',
  stress: '#fb923c',
  mentalFatigue: '#facc15',
  physicalFatigue: '#e879f9',
};

export function HealthTrendChart({ series, height = 220 }: { series: MetricSeries; height?: number }) {
  const color = COLORS[series.key] ?? '#22d3ee';
  if (series.points.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-orbit-border/60 text-sm text-orbit-muted" style={{ height }}>
        No measurements recorded in this period — gaps are shown clearly rather than estimated.
      </div>
    );
  }
  const values = series.points.map((p) => p.value);
  const min = Math.min(...values, series.baseline ?? Infinity);
  const max = Math.max(...values, series.baseline ?? -Infinity);
  const pad = Math.max((max - min) * 0.2, 0.5);

  return (
    <div style={{ height }} role="img" aria-label={`${series.label} trend chart with ${series.points.length} data points`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series.points} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--orbit-border) / 0.5)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgb(var(--orbit-muted))' }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgb(var(--orbit-muted))' }}
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: 'rgb(var(--orbit-panel))',
              border: '1px solid rgb(var(--orbit-border))',
              borderRadius: 12,
              color: 'rgb(var(--orbit-text))',
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value} ${series.unit}`, series.label]}
          />
          {series.baseline !== undefined && (
            <ReferenceLine
              y={series.baseline}
              stroke="rgb(var(--orbit-violet))"
              strokeDasharray="6 4"
              label={{ value: 'baseline', fontSize: 10, fill: 'rgb(var(--orbit-violet))', position: 'insideTopRight' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 2.5, fill: color }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
