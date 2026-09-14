import { useState, useCallback, useRef, useEffect } from 'react';

export interface StreetViewImage {
  id: string;
  capturedAt: number;
  latlng: [number, number];
  url: string;
}

export interface DualStreetView {
  older: StreetViewImage | null;
  newer: StreetViewImage | null;
  location: [number, number];
}

export interface CoveragePoint {
  id: string;
  latlng: [number, number];
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const GRAPH_URL = 'https://graph.mapillary.com/images';

// The Graph API rejects any bbox whose area is >= 0.010 square degrees
// (error code 100 / subcode 1), i.e. anything wider than ~0.09 deg square.
// That cap is not the binding constraint though: dense imagery times out
// (error code 1) far below it, and lowering `limit` does not help at all --
// only a smaller bbox does. Measured in central SF, 0.005 deg still failed and
// 0.002 deg answered, so tiles have to start near that scale to be useful.
const MAX_TILE_SIDE = 0.008;

// Cap how many tiles one viewport may fan out into. Beyond this the user is
// zoomed too far out for per-image coverage to be meaningful anyway.
const MAX_TILES = 16;
const TILE_CONCURRENCY = 4;
const TILE_LIMIT = 500;

// A dense tile can still time out server-side; split it until it is below the
// measured answerable size (0.008 -> 0.001 deg).
const MAX_SUBDIVIDE_DEPTH = 3;

// Each subdivision level multiplies requests by four, so a dense city viewport
// is also held to a hard per-viewport request budget.
const MAX_TILE_REQUESTS = 120;

// A busy city viewport can return tens of thousands of images. Leaflet cannot
// draw that many markers, so thin them down to an evenly spread sample.
const MAX_COVERAGE_POINTS = 2500;

// Progressive radii for the click-to-compare search, smallest first. Dense
// areas only answer for small boxes, sparse areas need the wider ones. The
// density timeout is monotone in box size (a smaller box scans strictly fewer
// images), so the tiny leading steps are the only chance in places like central
// Berlin where even a 0.0016 deg box times out.
const SEARCH_RADII = [0.0002, 0.0005, 0.0008, 0.002, 0.005, 0.01];

// Keep widening until there are plausibly two different capture dates to pair,
// rather than stopping at the first box that returns anything at all.
const MIN_CANDIDATES = 8;

interface RawImage {
  id?: string;
  geometry?: { type?: string; coordinates?: number[] };
  captured_at?: number | string | null;
  thumb_1024_url?: string;
  thumb_256_url?: string;
}

interface GraphResponse {
  data?: RawImage[];
  error?: { code?: number; error_subcode?: number; message?: string; type?: string };
}

type MapillaryErrorKind = 'auth' | 'bbox_too_large' | 'too_much_data' | 'network' | 'other';

class MapillaryError extends Error {
  kind: MapillaryErrorKind;
  constructor(kind: MapillaryErrorKind, message: string) {
    super(message);
    this.name = 'MapillaryError';
    this.kind = kind;
  }
}

const getApiKey = () => import.meta.env.VITE_MAPILLARY_API_KEY as string | undefined;

// Mapillary reports failures as HTTP 500 with a JSON body. `response.statusText`
// is an empty string over HTTP/2, so the body is the only useful source.
const classify = (status: number, body: GraphResponse | null): MapillaryError => {
  const err = body?.error ?? {};
  const message: string = err.message ?? `HTTP ${status}`;

  if (status === 401 || status === 403 || err.code === 190) {
    return new MapillaryError('auth', 'Mapillary rejected the access token. Check VITE_MAPILLARY_API_KEY in .env.local.');
  }
  if (err.code === 100 && err.error_subcode === 1) {
    return new MapillaryError('bbox_too_large', message);
  }
  if (err.code === 1) {
    return new MapillaryError('too_much_data', message);
  }
  return new MapillaryError('other', message);
};

const requestImages = async (
  fields: string,
  bbox: string,
  limit: number,
  signal?: AbortSignal
): Promise<RawImage[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new MapillaryError('auth', 'Mapillary API key not configured. Add VITE_MAPILLARY_API_KEY to .env.local and restart the dev server.');
  }

  const url = new URL(GRAPH_URL);
  url.searchParams.set('fields', fields);
  url.searchParams.set('bbox', bbox);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString(), { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new MapillaryError('network', 'Could not reach Mapillary. Check your network connection.');
  }

  const body: GraphResponse | null = await response.json().catch(() => null);
  if (!response.ok || body?.error) {
    throw classify(response.status, body);
  }
  return Array.isArray(body?.data) ? body.data : [];
};

const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
const clampLng = (v: number) => Math.max(-180, Math.min(180, v));

const asBbox = (b: Bounds) =>
  `${clampLng(b.west)},${clampLat(b.south)},${clampLng(b.east)},${clampLat(b.north)}`;

// Split a viewport into a grid of sub-boxes each under the API's area cap.
const tileBounds = (b: Bounds): Bounds[] => {
  const west = clampLng(b.west);
  const east = clampLng(b.east);
  const south = clampLat(b.south);
  const north = clampLat(b.north);

  const width = Math.max(east - west, 1e-6);
  const height = Math.max(north - south, 1e-6);

  const cols = Math.max(1, Math.ceil(width / MAX_TILE_SIDE));
  const rows = Math.max(1, Math.ceil(height / MAX_TILE_SIDE));
  if (cols * rows > MAX_TILES) return [];

  const tileW = width / cols;
  const tileH = height / rows;

  const tiles: Bounds[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        west: west + c * tileW,
        east: west + (c + 1) * tileW,
        south: south + r * tileH,
        north: south + (r + 1) * tileH,
      });
    }
  }
  return tiles;
};

const quarter = (b: Bounds): Bounds[] => {
  const midLng = (b.west + b.east) / 2;
  const midLat = (b.south + b.north) / 2;
  return [
    { west: b.west, east: midLng, south: b.south, north: midLat },
    { west: midLng, east: b.east, south: b.south, north: midLat },
    { west: b.west, east: midLng, south: midLat, north: b.north },
    { west: midLng, east: b.east, south: midLat, north: b.north },
  ];
};

interface TileBudget {
  used: number;
  truncated: boolean;
}

// Fetch one tile; on a server-side density timeout, split and retry the pieces
// instead of failing the whole viewport.
const fetchTile = async (
  b: Bounds,
  depth: number,
  signal: AbortSignal,
  budget: TileBudget
): Promise<RawImage[]> => {
  if (budget.used >= MAX_TILE_REQUESTS) {
    budget.truncated = true;
    return [];
  }
  budget.used++;

  try {
    return await requestImages('id,geometry', asBbox(b), TILE_LIMIT, signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    const kind = err instanceof MapillaryError ? err.kind : 'other';
    if ((kind === 'too_much_data' || kind === 'bbox_too_large') && depth < MAX_SUBDIVIDE_DEPTH) {
      const parts = await Promise.all(quarter(b).map((q) => fetchTile(q, depth + 1, signal, budget)));
      return parts.flat();
    }
    if (kind === 'auth') throw err;
    // Density we cannot break down further — skip this tile rather than lose
    // the rest of the viewport, but flag that the result is incomplete.
    if (kind === 'too_much_data') budget.truncated = true;
    return [];
  }
};

const runPooled = async <T, R>(items: T[], size: number, worker: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
};

// Keep at most one point per grid cell so the sample stays spread across the
// viewport instead of clumping wherever the first tiles happened to be dense.
const thinPoints = (points: CoveragePoint[], b: Bounds): CoveragePoint[] => {
  if (points.length <= MAX_COVERAGE_POINTS) return points;

  const cells = Math.ceil(Math.sqrt(MAX_COVERAGE_POINTS));
  const cellH = Math.max((b.north - b.south) / cells, 1e-9);
  const cellW = Math.max((b.east - b.west) / cells, 1e-9);

  const taken = new Set<string>();
  const kept: CoveragePoint[] = [];
  for (const p of points) {
    const key = `${Math.floor((p.latlng[0] - b.south) / cellH)}:${Math.floor((p.latlng[1] - b.west) / cellW)}`;
    if (taken.has(key)) continue;
    taken.add(key);
    kept.push(p);
  }
  return kept;
};

// How far from the clicked point the before/after pair may spread while looking
// for two different capture dates.
const PAIRING_RADII_METERS = [40, 100, 250, 600, 1500];

const distanceMeters = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const meanLatCos = Math.cos(((aLat + bLat) / 2) * toRad);
  return 6371000 * Math.hypot(dLat, dLng * meanLatCos);
};

const toCapturedAt = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const useMapillary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coveragePoints, setCoveragePoints] = useState<CoveragePoint[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [coverageNotice, setCoverageNotice] = useState<string | null>(null);

  const coverageAbort = useRef<AbortController | null>(null);

  useEffect(() => () => coverageAbort.current?.abort(), []);

  const fetchCoveragePoints = useCallback(async (bounds: Bounds) => {
    coverageAbort.current?.abort();
    const controller = new AbortController();
    coverageAbort.current = controller;

    if (!getApiKey()) {
      setCoveragePoints([]);
      setCoverageNotice('Mapillary API key not configured.');
      return;
    }

    const tiles = tileBounds(bounds);
    if (tiles.length === 0) {
      // Viewport is wider than MAX_TILES tiles of the API's maximum bbox size.
      setCoveragePoints([]);
      setCoverageNotice('Zoom in to load street view coverage.');
      setLoadingCoverage(false);
      return;
    }

    setLoadingCoverage(true);
    setCoverageNotice(null);

    const budget: TileBudget = { used: 0, truncated: false };

    try {
      const batches = await runPooled(tiles, TILE_CONCURRENCY, (tile) =>
        fetchTile(tile, 0, controller.signal, budget)
      );
      if (controller.signal.aborted) return;

      const seen = new Set<string>();
      const points: CoveragePoint[] = [];
      for (const img of batches.flat()) {
        const coords = img?.geometry?.coordinates;
        if (!img?.id || !Array.isArray(coords) || seen.has(img.id)) continue;
        seen.add(img.id);
        points.push({ id: img.id, latlng: [coords[1], coords[0]] });
      }

      const shown = thinPoints(points, bounds);
      setCoveragePoints(shown);
      setCoverageNotice(
        points.length === 0
          ? budget.truncated
            ? 'This area is too dense for Mapillary to list — zoom in.'
            : 'No Mapillary coverage in this area.'
          : shown.length < points.length || budget.truncated
            ? `Showing ${shown.length} of ${points.length}+ points — zoom in for full detail.`
            : null
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setCoveragePoints([]);
      setCoverageNotice(err instanceof Error ? err.message : 'Failed to load coverage.');
    } finally {
      if (!controller.signal.aborted) setLoadingCoverage(false);
    }
  }, []);

  const clearCoveragePoints = useCallback(() => {
    coverageAbort.current?.abort();
    setCoveragePoints([]);
    setCoverageNotice(null);
    setLoadingCoverage(false);
  }, []);

  const fetchStreetViewImages = useCallback(
    async (latitude: number, longitude: number): Promise<DualStreetView> => {
      setLoading(true);
      setError(null);

      try {
        const fields = 'id,geometry,captured_at,thumb_1024_url,thumb_256_url';
        let images: RawImage[] = [];
        let densityBlocked = false;

        // Widen the search until images turn up. Starting small matters: dense
        // cities only answer for tight boxes, and a wider box there just 500s.
        for (const radius of SEARCH_RADII) {
          const bbox = asBbox({
            west: longitude - radius,
            east: longitude + radius,
            south: latitude - radius,
            north: latitude + radius,
          });
          try {
            const found = await requestImages(fields, bbox, 100);
            // Keep the richest successful box; a wider one that later fails
            // must not discard what a narrower one already returned.
            if (found.length > images.length) images = found;
          } catch (err) {
            const kind = err instanceof MapillaryError ? err.kind : 'other';
            if (kind === 'too_much_data') {
              // Expanding further would only make the server-side scan worse.
              densityBlocked = true;
              break;
            }
            throw err;
          }
          if (images.length >= MIN_CANDIDATES) break;
        }

        if (images.length === 0) {
          throw new Error(
            densityBlocked
              ? 'Mapillary has too many images near this point to list. Try clicking a nearby spot.'
              : 'No street view images available for this location.'
          );
        }

        const usable: StreetViewImage[] = images
          .filter(
            (img): img is RawImage & { geometry: { coordinates: number[] } } =>
              Array.isArray(img.geometry?.coordinates) &&
              Boolean(img.thumb_1024_url ?? img.thumb_256_url)
          )
          .map((img) => ({
            id: img.id ?? '',
            capturedAt: toCapturedAt(img.captured_at),
            latlng: [img.geometry.coordinates[1], img.geometry.coordinates[0]] as [number, number],
            url: (img.thumb_1024_url ?? img.thumb_256_url)!,
          }));

        if (usable.length === 0) {
          throw new Error('No street view images available for this location.');
        }

        // Anchor on the image closest to the click, then widen only as far as
        // needed to find a second capture of the same spot. Taking the global
        // oldest and newest instead can pair up two entirely different streets.
        const anchor = usable.reduce((best, img) =>
          distanceMeters(latitude, longitude, img.latlng[0], img.latlng[1]) <
          distanceMeters(latitude, longitude, best.latlng[0], best.latlng[1])
            ? img
            : best
        );

        let older = anchor;
        let newer = anchor;
        for (const radius of PAIRING_RADII_METERS) {
          const nearby = usable.filter(
            (img) =>
              distanceMeters(anchor.latlng[0], anchor.latlng[1], img.latlng[0], img.latlng[1]) <= radius
          );
          if (nearby.length < 2) continue;
          older = nearby.reduce((a, b) => (a.capturedAt <= b.capturedAt ? a : b));
          newer = nearby.reduce((a, b) => (a.capturedAt >= b.capturedAt ? a : b));
          if (older.id !== newer.id) break;
        }

        const result: DualStreetView = {
          // One capture is not a comparison — leave the historical side empty
          // rather than showing the same photo twice with a 0-year span.
          older: older.id === newer.id ? null : older,
          newer,
          location: [latitude, longitude],
        };

        setLoading(false);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch street view images';
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  return {
    fetchStreetViewImages,
    fetchCoveragePoints,
    clearCoveragePoints,
    coveragePoints,
    loadingCoverage,
    coverageNotice,
    loading,
    error,
  };
};
