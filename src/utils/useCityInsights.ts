import { useState, useCallback, useRef, useEffect } from 'react';

export type MetricKey = 'canopy' | 'traffic' | 'pedestrian' | 'flood';
export type Band = 'low' | 'moderate' | 'high';

export interface MetricDetail {
  label: string;
  value: string;
}

export interface Metric {
  value: number;
  unit: string;
  score: number;
  band: Band;
  detail: MetricDetail[];
}

export interface CityInsights {
  city: {
    name: string;
    country: string | null;
    countryCode: string | null;
    lat: number;
    lon: number;
  };
  window: { sizeKm: number; areaKm2: number };
  metrics: Record<MetricKey, Metric>;
  sources: string[];
  fetchedAt: string;
  cached?: boolean;
}

export const useCityInsights = () => {
  const [data, setData] = useState<CityInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastRequest = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const load = useCallback(async (lat: number, lon: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastRequest.current = { lat, lon };

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/city/insights?lat=${lat}&lon=${lon}`, {
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.message ?? `Request failed (HTTP ${response.status})`);
      }

      if (!controller.signal.aborted) setData(body as CityInsights);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Could not load city data.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    const last = lastRequest.current;
    if (last) load(last.lat, last.lon);
  }, [load]);

  return { data, loading, error, load, retry };
};
