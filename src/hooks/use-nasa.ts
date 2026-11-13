'use client';

import * as React from 'react';
import { fetchRadiation, fetchSpaceWeather, fetchHealthContext, TOPIC_CONTEXT, type TopicId, type RadiationClientResult } from '@/lib/nasa-guidance';
import type { HealthContextResponse, SpaceWeatherResponse } from '@/lib/types';

const NASA_REFRESH_MS = 10 * 60_000; // NASA services refresh on their own slow schedule (10 min)

export interface UseNasaResult {
  radiation: RadiationClientResult | null;
  spaceWeather: SpaceWeatherResponse | null;
  context: Partial<Record<TopicId, HealthContextResponse>>;
  loading: boolean;
  refresh: () => void;
  loadContext: (topic: TopicId) => void;
}

/**
 * Slow-schedule NASA context (deliberately separate from the 10-second sensor
 * polling). RadLab telemetry, DONKI space-weather events and OSDR research
 * context are fetched every 10 minutes and on demand; failures fall back to
 * whatever the server cached.
 */
export function useNasa(env: string): UseNasaResult {
  const [radiation, setRadiation] = React.useState<RadiationClientResult | null>(null);
  const [spaceWeather, setSpaceWeather] = React.useState<SpaceWeatherResponse | null>(null);
  const [context, setContext] = React.useState<Partial<Record<TopicId, HealthContextResponse>>>({});
  const [loading, setLoading] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  const refresh = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const [rad, sw] = await Promise.all([fetchRadiation(env), fetchSpaceWeather()]);
      if (cancelled) return;
      setRadiation(rad);
      setSpaceWeather(sw);
      setLoading(false);
    };
    void run();
    const timer = setInterval(run, NASA_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [env, tick]);

  const loadContext = React.useCallback((topic: TopicId) => {
    void (async () => {
      const ctx = await fetchHealthContext(topic);
      setContext((c) => ({ ...c, [topic]: ctx }));
    })();
  }, []);

  return { radiation, spaceWeather, context, loading, refresh, loadContext };
}

export { TOPIC_CONTEXT };
