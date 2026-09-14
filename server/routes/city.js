import express from 'express';

const router = express.Router();

const UA = 'GeoDetect/1.2 (urban change monitoring; contact: admin@geodetect.local)';

// Public Overpass instances, tried in order. The main one returns a "server too
// busy" HTML page under load often enough that failover is not optional.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Every city is measured through the same 5km x 5km window centred on its
// centroid. A fixed window is what makes the numbers comparable between cities
// (a whole-boundary query would compare Tokyo's sprawl against Monaco's core)
// and it bounds the Overpass cost to something a public instance will serve.
const WINDOW_KM = 5;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map();

const getCached = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
};

const setCached = (key, value) => {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
};

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// Map a raw measurement onto 0-100 by linear interpolation between a floor and
// a ceiling drawn from observed urban ranges. Kept explicit so every score on
// screen can be traced back to the number that produced it.
const scale = (value, min, max) => clamp(((value - min) / (max - min)) * 100);

const buildWindow = (lat, lon) => {
  const halfLat = WINDOW_KM / 2 / 111.32;
  const halfLon = WINDOW_KM / 2 / (111.32 * Math.cos((lat * Math.PI) / 180) || 1);
  return {
    south: lat - halfLat,
    north: lat + halfLat,
    west: lon - halfLon,
    east: lon + halfLon,
    areaKm2: WINDOW_KM * WINDOW_KM,
  };
};

// Planar approximation of polygon area. Over a 5km window the error from
// ignoring earth curvature is far below the precision of the underlying OSM
// polygons, so the shoelace formula on locally-scaled degrees is sufficient.
const ringAreaM2 = (geometry) => {
  if (!Array.isArray(geometry) || geometry.length < 3) return 0;
  const lat0 = geometry.reduce((s, p) => s + p.lat, 0) / geometry.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  let sum = 0;
  for (let i = 0; i < geometry.length; i++) {
    const a = geometry[i];
    const b = geometry[(i + 1) % geometry.length];
    sum += a.lon * k * b.lat - b.lon * k * a.lat;
  }
  return (Math.abs(sum) / 2) * 111320 * 111320;
};

const overpassQuery = (w) => {
  const bbox = `${w.south},${w.west},${w.north},${w.east}`;
  return `[out:json][timeout:90];
(way[leisure~"^(park|garden|nature_reserve|recreation_ground|pitch)$"](${bbox});
 way[landuse~"^(forest|grass|meadow|village_green|recreation_ground|orchard)$"](${bbox});
 way[natural~"^(wood|scrub|grassland|heath)$"](${bbox}););
out geom;
(way[natural=water](${bbox});
 way[waterway~"^(riverbank|dock)$"](${bbox}););
out geom;
way[highway~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"](${bbox});
make stat road_count=count(ways), road_m=sum(length());
out;
way[highway~"^(motorway|trunk|primary|secondary)$"](${bbox});
make stat arterial_m=sum(length());
out;
way[highway~"^(footway|path|pedestrian|steps|cycleway)$"](${bbox});
make stat foot_count=count(ways), foot_m=sum(length());
out;
way[highway][sidewalk~"^(both|left|right|yes)$"](${bbox});
make stat sidewalk_m=sum(length());
out;
node[natural=tree](${bbox});
out count;
node[highway~"^(crossing|traffic_signals)$"](${bbox});
out count;`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchOverpass = async (w) => {
  const body = new URLSearchParams({ data: overpassQuery(w) }).toString();
  let lastError = 'no mirror responded';

  // Two passes over the mirrors. A single pass is not enough in practice: the
  // instances shed load in bursts and an instance that refused a request ten
  // seconds ago frequently serves the same query on the retry.
  for (let pass = 0; pass < 2; pass++) {
    for (const url of OVERPASS_MIRRORS) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
          body,
          signal: AbortSignal.timeout(90000),
        });

        const text = await response.text();
        // A busy instance answers 200 with an HTML error page, so the status
        // code is not enough — the payload has to be probed.
        if (!text.startsWith('{')) {
          lastError = text.includes('too busy') ? 'all OpenStreetMap servers are busy' : `bad response from ${url}`;
          continue;
        }
        return JSON.parse(text);
      } catch (err) {
        lastError = err.name === 'TimeoutError' ? 'OpenStreetMap servers timed out' : err.message;
      }
    }
    if (pass === 0) await sleep(2000);
  }

  throw new Error(lastError);
};

const parseOverpass = (data) => {
  const out = {
    greenAreaM2: 0,
    greenFeatures: 0,
    waterAreaM2: 0,
    roadM: 0,
    roadCount: 0,
    arterialM: 0,
    footM: 0,
    footCount: 0,
    sidewalkM: 0,
    trees: 0,
    crossings: 0,
  };

  const counts = [];
  for (const el of data.elements || []) {
    if (el.type === 'count') {
      counts.push(Number(el.tags?.total ?? 0));
      continue;
    }

    const t = el.tags || {};
    if (t.road_m !== undefined) {
      out.roadM = Number(t.road_m) || 0;
      out.roadCount = Number(t.road_count) || 0;
    } else if (t.arterial_m !== undefined) {
      out.arterialM = Number(t.arterial_m) || 0;
    } else if (t.foot_m !== undefined) {
      out.footM = Number(t.foot_m) || 0;
      out.footCount = Number(t.foot_count) || 0;
    } else if (t.sidewalk_m !== undefined) {
      out.sidewalkM = Number(t.sidewalk_m) || 0;
    } else if (el.geometry) {
      const isWater = t.natural === 'water' || t.waterway;
      const area = ringAreaM2(el.geometry);
      if (isWater) {
        out.waterAreaM2 += area;
      } else {
        out.greenAreaM2 += area;
        out.greenFeatures += 1;
      }
    }
  }

  [out.trees = 0, out.crossings = 0] = counts;
  return out;
};

const fetchJson = async (url, timeout = 20000) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const fetchHydrology = async (lat, lon) => {
  // GloFAS river discharge plus terrain elevation. Both are optional inputs —
  // a failure here degrades the flood confidence rather than the whole request.
  const results = await Promise.allSettled([
    fetchJson(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge,river_discharge_mean&forecast_days=1`
    ),
    fetchJson(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`),
  ]);

  const flood = results[0].status === 'fulfilled' ? results[0].value : null;
  const elev = results[1].status === 'fulfilled' ? results[1].value : null;

  return {
    elevationM: elev?.elevation?.[0] ?? flood?.elevation ?? null,
    dischargeM3s: flood?.daily?.river_discharge?.[0] ?? null,
    dischargeMeanM3s: flood?.daily?.river_discharge_mean?.[0] ?? null,
  };
};

const buildMetrics = (osm, hydro, w) => {
  const area = w.areaKm2;

  // --- Tree canopy -------------------------------------------------------
  // Share of the window covered by mapped green polygons. This is OSM
  // land-cover, not a remote-sensed canopy measurement — it under-reports
  // street trees and private gardens, and the UI says so.
  const canopyPct = (osm.greenAreaM2 / (area * 1e6)) * 100;
  const treesPerKm2 = osm.trees / area;

  // --- Traffic density ---------------------------------------------------
  // Road length per km2, weighted toward arterials, which carry the traffic
  // that congestion is actually made of. 5-35 km/km2 spans rural fringe to
  // dense grid.
  const roadKmPerKm2 = osm.roadM / 1000 / area;
  const arterialKmPerKm2 = osm.arterialM / 1000 / area;
  const trafficScore = clamp(scale(roadKmPerKm2, 4, 30) * 0.6 + scale(arterialKmPerKm2, 0.5, 8) * 0.4);

  // --- Pedestrian accessibility -----------------------------------------
  // Dedicated walking infrastructure per km2, how much of the road network
  // declares a sidewalk, and crossing provision.
  const footKmPerKm2 = osm.footM / 1000 / area;
  const crossingsPerKm2 = osm.crossings / area;
  const sidewalkCoverage = osm.roadM > 0 ? clamp((osm.sidewalkM / osm.roadM) * 100, 0, 100) : 0;
  const pedestrianScore = clamp(
    scale(footKmPerKm2, 1, 30) * 0.45 + scale(crossingsPerKm2, 2, 120) * 0.35 + sidewalkCoverage * 0.2
  );

  // --- Flood risk --------------------------------------------------------
  // Low-lying land is the dominant term; surface water in the window and an
  // elevated river discharge against its own climatological mean add to it.
  const elevation = hydro.elevationM;
  const elevationRisk = elevation === null ? 45 : clamp(100 - scale(elevation, 0, 120));
  const waterSharePct = (osm.waterAreaM2 / (area * 1e6)) * 100;
  const waterRisk = scale(waterSharePct, 0, 25);
  const dischargeRatio =
    hydro.dischargeM3s !== null && hydro.dischargeMeanM3s ? hydro.dischargeM3s / hydro.dischargeMeanM3s : null;
  const dischargeRisk = dischargeRatio === null ? 35 : clamp(scale(dischargeRatio, 0.6, 2.2));

  const floodScore = clamp(elevationRisk * 0.5 + waterRisk * 0.25 + dischargeRisk * 0.25);

  const band = (v, lo, hi) => (v < lo ? 'low' : v < hi ? 'moderate' : 'high');

  return {
    canopy: {
      value: Number(canopyPct.toFixed(1)),
      unit: '%',
      score: Math.round(clamp(scale(canopyPct, 0, 45))),
      band: band(canopyPct, 10, 25),
      detail: [
        { label: 'Green land cover', value: `${(osm.greenAreaM2 / 1e6).toFixed(2)} km²` },
        { label: 'Mapped green spaces', value: osm.greenFeatures.toLocaleString() },
        { label: 'Individually mapped trees', value: osm.trees.toLocaleString() },
        { label: 'Tree density', value: `${Math.round(treesPerKm2)} / km²` },
      ],
    },
    traffic: {
      value: Number(roadKmPerKm2.toFixed(1)),
      unit: 'km/km²',
      score: Math.round(trafficScore),
      band: band(trafficScore, 35, 65),
      detail: [
        { label: 'Total road length', value: `${(osm.roadM / 1000).toFixed(0)} km` },
        { label: 'Arterial roads', value: `${(osm.arterialM / 1000).toFixed(1)} km` },
        { label: 'Road segments', value: osm.roadCount.toLocaleString() },
        { label: 'Arterial density', value: `${arterialKmPerKm2.toFixed(1)} km/km²` },
      ],
    },
    pedestrian: {
      value: Math.round(pedestrianScore),
      unit: '/100',
      score: Math.round(pedestrianScore),
      band: band(pedestrianScore, 35, 65),
      detail: [
        { label: 'Footpath length', value: `${(osm.footM / 1000).toFixed(0)} km` },
        { label: 'Footpath density', value: `${footKmPerKm2.toFixed(1)} km/km²` },
        { label: 'Crossings & signals', value: osm.crossings.toLocaleString() },
        { label: 'Roads with sidewalks', value: `${sidewalkCoverage.toFixed(0)}%` },
      ],
    },
    flood: {
      value: Math.round(floodScore),
      unit: '/100',
      score: Math.round(floodScore),
      band: band(floodScore, 35, 65),
      detail: [
        { label: 'Ground elevation', value: elevation === null ? 'unavailable' : `${Math.round(elevation)} m` },
        { label: 'Surface water', value: `${waterSharePct.toFixed(1)}% of area` },
        {
          label: 'River discharge',
          value: hydro.dischargeM3s === null ? 'no river nearby' : `${hydro.dischargeM3s.toFixed(1)} m³/s`,
        },
        {
          label: 'vs seasonal mean',
          value: dischargeRatio === null ? 'unavailable' : `${(dischargeRatio * 100).toFixed(0)}%`,
        },
      ],
    },
  };
};

// @route   GET /api/city/search?q=
// @desc    City lookup for the header search box
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (q.length < 2) return res.json({ results: [] });

    const key = `search:${q.toLowerCase()}`;
    const hit = getCached(key);
    if (hit) return res.json(hit);

    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=6&featureType=city&addressdetails=1&q=` +
      encodeURIComponent(q);
    const data = await fetchJson(url);

    const payload = {
      results: (data || []).map((r) => ({
        id: `${r.osm_type}-${r.osm_id}`,
        name: r.name || r.display_name.split(',')[0],
        label: r.display_name,
        lat: Number(r.lat),
        lon: Number(r.lon),
      })),
    };

    setCached(key, payload);
    res.json(payload);
  } catch (err) {
    console.error('City search failed:', err.message);
    res.status(502).json({ message: 'City search is unavailable right now.' });
  }
});

// @route   GET /api/city/insights?lat=&lon=
// @desc    Tree canopy, traffic density, pedestrian access and flood risk
//          for the city containing this point
router.get('/insights', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ message: 'lat and lon are required' });
    }

    // Round the cache key so small map nudges reuse one Overpass result.
    const key = `insights:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    const hit = getCached(key);
    if (hit) return res.json({ ...hit, cached: true });

    const place = await fetchJson(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`
    );

    const addr = place?.address || {};
    const cityName =
      addr.city || addr.town || addr.village || addr.municipality || addr.county || place?.name || 'Unknown area';

    if (!place || place.error) {
      return res.status(404).json({ message: 'No city found at this location.' });
    }

    const w = buildWindow(lat, lon);
    const [osmData, hydro] = await Promise.all([fetchOverpass(w), fetchHydrology(lat, lon)]);
    const osm = parseOverpass(osmData);

    const payload = {
      city: {
        name: cityName,
        country: addr.country || null,
        countryCode: addr.country_code ? addr.country_code.toUpperCase() : null,
        lat,
        lon,
      },
      window: { sizeKm: WINDOW_KM, areaKm2: w.areaKm2 },
      metrics: buildMetrics(osm, hydro, w),
      sources: ['OpenStreetMap / Overpass', 'Open-Meteo GloFAS', 'Nominatim'],
      fetchedAt: new Date().toISOString(),
    };

    setCached(key, payload);
    res.json(payload);
  } catch (err) {
    console.error('City insights failed:', err.message);
    res.status(502).json({ message: err.message || 'Could not load city data.' });
  }
});

export default router;
