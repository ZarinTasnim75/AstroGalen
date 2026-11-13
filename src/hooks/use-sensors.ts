'use client';

import * as React from 'react';
import { db, getSettings, appendSensorSamples, getSensorSamples } from '@/lib/db';
import { computeSnapshot, computePersonalReadings, computeEnvironmentReadings, deviceStatuses } from '@/lib/sensor-sim';
import { profileFor } from '@/lib/equipment';
import type { MissionEnvId, SensorKey, SensorSnapshot, EnvKey, SensorSample } from '@/lib/types';

const POLL_MS = 10_000; // dashboard requirement: refresh every 10 seconds
const PERSIST_BUCKET_MS = 60_000; // persist at most one sample per key per minute

export interface SensorHistoryPoint {
  ts: number;
  value?: number;
  value2?: number;
}

export interface UseSensorsResult {
  snapshot: SensorSnapshot | null;
  history: Partial<Record<SensorKey | EnvKey, SensorHistoryPoint[]>>;
  error: string | null;
  lastSync: number | null;
  usedLocalSim: boolean; // true when the local simulation produced the feed
  refresh: () => void;
}

/**
 * Polls the sensor service every 10 seconds. The client is the offline-first
 * source of truth: if the API is unreachable (offline, or a static export),
 * the exact same simulation module computes the readings locally. All values
 * remain DEMO-flagged in both paths, and readings persist to IndexedDB so the
 * historical dashboard keeps working without a connection.
 */
export function useSensors(): UseSensorsResult {
  const [snapshot, setSnapshot] = React.useState<SensorSnapshot | null>(null);
  const [history, setHistory] = React.useState<Partial<Record<SensorKey | EnvKey, SensorHistoryPoint[]>>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [lastSync, setLastSync] = React.useState<number | null>(null);
  const [usedLocalSim, setUsedLocalSim] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const persistedBucket = React.useRef<Partial<Record<string, number>>>({});
  const historyRef = React.useRef(history);
  historyRef.current = history;

  const refresh = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;

    const pushHistory = (key: string, point: SensorHistoryPoint, maxPoints = 32) => {
      const arr = historyRef.current[key as SensorKey] ? [...(historyRef.current[key as SensorKey | EnvKey] ?? [])] : [];
      const next = [...arr, point].slice(-maxPoints);
      setHistory((h) => ({ ...h, [key]: next }));
    };

    const persist = async (key: string, ts: number, value?: number, value2?: number, simulated = true) => {
      const bucket = Math.floor(ts / PERSIST_BUCKET_MS);
      if (persistedBucket.current[key] === bucket) return;
      persistedBucket.current[key] = bucket;
      const sample: SensorSample = { key: key as SensorKey | EnvKey, ts: bucket * PERSIST_BUCKET_MS, value, value2, simulated };
      try {
        await appendSensorSamples([sample]);
      } catch {
        // storage failures must never break the live feed
      }
    };

    const applySnapshot = (snap: SensorSnapshot, local: boolean) => {
      if (cancelled) return;
      setSnapshot(snap);
      setUsedLocalSim(local);
      setLastSync(Date.now());
      setError(null);
      for (const r of [...snap.personal, ...snap.environmentReadings]) {
        if (r.value === undefined) continue;
        pushHistory(r.key, { ts: r.ts, value: r.value, value2: r.value2 });
        void persist(r.key, r.ts, r.value, r.value2, r.simulated);
      }
    };

    const run = async () => {
      try {
        const settings = await getSettings();
        const env = settings.mission.environmentId as MissionEnvId;
        const profile = profileFor(env);
        try {
          const res = await fetch(`/api/sensors/latest?env=${env}`, { cache: 'no-store' });
          if (!res.ok) throw new Error(`sensor service responded ${res.status}`);
          const data = (await res.json()) as { snapshot: SensorSnapshot };
          applySnapshot(data.snapshot, false);
        } catch (e) {
          // Offline-first fallback: identical simulation computed locally.
          const local = computeSnapshot(Date.now(), env, profile, settings.mission.thresholds);
          applySnapshot(local, true);
          void (e as Error); // recorded via usedLocalSim
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    void run();
    const timer = setInterval(run, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tick]);

  // Seed sparkline history from persisted IndexedDB samples on first load.
  React.useEffect(() => {
    (async () => {
      try {
        const since = Date.now() - 60 * 60_000;
        const keys: (SensorKey | EnvKey)[] = [
          'heartRate', 'bloodPressure', 'sleep', 'activity', 'temperature', 'oxygen',
          'radiationRate', 'radiationDose', 'co2', 'pressure', 'cabinTemp',
        ];
        const results = await Promise.all(keys.map((k) => getSensorSamples(k, since, 32)));
        const seeded: Partial<Record<string, SensorHistoryPoint[]>> = {};
        keys.forEach((k, i) => {
          const rows = results[i];
          if (rows.length) {
            seeded[k] = rows.map((r) => ({ ts: r.ts, value: r.value, value2: r.value2 }));
            for (const r of rows) {
              const bucket = Math.floor(r.ts / PERSIST_BUCKET_MS);
              if (persistedBucket.current[k] === undefined || persistedBucket.current[k]! < bucket) {
                persistedBucket.current[k] = bucket;
              }
            }
          }
        });
        setHistory((h) => ({ ...seeded, ...h }));
      } catch {
        // history seeding is best-effort
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { snapshot, history, error, lastSync, usedLocalSim, refresh };
}

/** Convenience: latest environment readings array. */
export function useEnvironmentReadings(snapshot: SensorSnapshot | null) {
  return React.useMemo(() => snapshot?.environmentReadings ?? [], [snapshot]);
}

/** Convenience: latest personal readings array. */
export function usePersonalReadings(snapshot: SensorSnapshot | null) {
  return React.useMemo(() => snapshot?.personal ?? [], [snapshot]);
}

export { computePersonalReadings, computeEnvironmentReadings, deviceStatuses };
