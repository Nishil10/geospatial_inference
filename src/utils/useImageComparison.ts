import { useState, useCallback, useRef, useEffect } from 'react';
import type { DualStreetView } from './useMapillary';

export type ChangeCategory =
  | 'building'
  | 'road'
  | 'vegetation'
  | 'vehicle'
  | 'signage'
  | 'infrastructure'
  | 'other';

export interface DetectedChange {
  category: ChangeCategory;
  description: string;
  significance: 'high' | 'medium' | 'low';
}

export interface ComparisonResult {
  sceneMatch: 'same' | 'partial' | 'different';
  summary: string;
  changes: DetectedChange[];
}

export const useImageComparison = () => {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResult(null);
    setError(null);
    setAnalyzing(false);
  }, []);

  const compare = useCallback(async (data: DualStreetView) => {
    if (!data.older || !data.newer) {
      setError('Need both a historical and a current image to compare.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          olderUrl: data.older.url,
          newerUrl: data.newer.url,
          olderDate: new Date(data.older.capturedAt).toISOString().slice(0, 10),
          newerDate: new Date(data.newer.capturedAt).toISOString().slice(0, 10),
        }),
        signal: controller.signal,
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message ?? `Comparison failed (HTTP ${response.status})`);
      }

      setResult(body as ComparisonResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to compare images');
    } finally {
      if (!controller.signal.aborted) setAnalyzing(false);
    }
  }, []);

  return { compare, reset, result, analyzing, error };
};
