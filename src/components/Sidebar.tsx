import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trees,
  CarFront,
  Footprints,
  Waves,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  TriangleAlert,
  OctagonAlert,
  CircleSlash,
  RefreshCw,
  Crosshair,
  Database,
  Minus,
} from 'lucide-react';
import clsx from 'clsx';
import type { CityInsights, MetricKey, Band, Metric } from '../utils/useCityInsights';

interface SidebarProps {
  insights: CityInsights | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** The lat/lon most recently requested. Used to detect a stale reading. */
  requested: { lat: number; lon: number } | null;
  className?: string;
}

type Stance = 'good' | 'fair' | 'poor';

const EMPTY_SET: Set<MetricKey> = new Set();

/** Zone edges on the 0-100 SCORE scale, read from server/routes/city.js.
 *  canopy bands on the RAW PERCENTAGE at 10/25; score = scale(pct, 0, 45),
 *  so 10% -> 22.2 and 25% -> 55.6 on the score scale.
 *  traffic / pedestrian / flood band directly on the score at 35/65.
 *  DO NOT unify these to thirds — Singapore canopy (11%, score 24) is banded
 *  `moderate` by the server and a [33,66] rule would print `low`. */
const METRICS = [
  {
    key: 'canopy' as const,
    label: 'Tree canopy',
    Icon: Trees,
    higherIsBetter: true,
    stops: [22.2, 55.6] as [number, number],
    scaleNote: null as string | null,
    source: 'OpenStreetMap / Overpass',
  },
  {
    key: 'traffic' as const,
    label: 'Road density',
    Icon: CarFront,
    higherIsBetter: false,
    stops: [35, 65] as [number, number],
    scaleNote: null as string | null,
    source: 'OpenStreetMap / Overpass',
  },
  {
    key: 'pedestrian' as const,
    label: 'Walkability',
    Icon: Footprints,
    higherIsBetter: true,
    stops: [35, 65] as [number, number],
    scaleNote: 'Index 0–100' as string | null,
    source: 'OpenStreetMap / Overpass',
  },
  {
    key: 'flood' as const,
    label: 'Flood exposure',
    Icon: Waves,
    higherIsBetter: false,
    stops: [35, 65] as [number, number],
    scaleNote: 'Index 0–100' as string | null,
    source: 'Open-Meteo GloFAS + elevation',
  },
];

// The band comes from the server verbatim. Crossing it with the metric's own
// polarity is the only place a judgement is made, so green is structurally
// incapable of landing on a high flood score.
const stanceOf = (band: Band, higherIsBetter: boolean): Stance =>
  higherIsBetter
    ? ({ low: 'poor', moderate: 'fair', high: 'good' } as const)[band]
    : ({ low: 'good', moderate: 'fair', high: 'poor' } as const)[band];

const STANCE = {
  good: { word: 'GOOD', Icon: CircleCheck, text: 'text-brand-accent', chip: 'border-brand-accent/40 bg-brand-accent/10' },
  fair: { word: 'FAIR', Icon: TriangleAlert, text: 'text-brand-warning', chip: 'border-brand-warning/40 bg-brand-warning/10' },
  poor: { word: 'POOR', Icon: OctagonAlert, text: 'text-red-400', chip: 'border-red-400/45 bg-brand-alert/10' },
} as const;

const ZONE_RGB = { good: '16,185,129', fair: '251,191,36', poor: '239,68,68' } as const;
const BAND_INDEX = { low: 0, moderate: 1, high: 2 } as const;

/** Left-to-right the zones are always ordered by MAGNITUDE (low, moderate,
 *  high). Only their stance COLOUR flips with polarity, so the needle sitting
 *  outside the green band is a spatial fact that survives greyscale. */
const zoneStances = (hib: boolean): Stance[] =>
  hib ? ['poor', 'fair', 'good'] : ['good', 'fair', 'poor'];

const trackBackground = (band: Band, hib: boolean, stops: [number, number]) => {
  const z = zoneStances(hib);
  const lit = BAND_INDEX[band];
  const a = (i: number) => (i === lit ? 0.85 : 0.26);
  return (
    `linear-gradient(to right,` +
    ` rgba(${ZONE_RGB[z[0]]},${a(0)}) 0 ${stops[0]}%,` +
    ` rgba(${ZONE_RGB[z[1]]},${a(1)}) ${stops[0]}% ${stops[1]}%,` +
    ` rgba(${ZONE_RGB[z[2]]},${a(2)}) ${stops[1]}% 100%)`
  );
};

const fmtValue = (v: number, unit: string) =>
  unit === '/100' ? String(Math.round(v)) : Number.isInteger(v) ? String(v) : v.toFixed(1);

const SPOKEN_UNIT: Record<string, string> = {
  '%': 'percent',
  'km/km²': 'kilometres of road per square kilometre',
  '/100': 'out of 100',
};

/** A detail value is an absence, not a measurement, when it carries no digit.
 *  Matches the server's literal "unavailable" and "no river nearby". */
const isAbsent = (v: string) => !/\d/.test(v);

/** Flood is the only metric with synthetic fallbacks. From city.js:
 *  elevation null -> elevationRisk = 45 at weight 0.50
 *  discharge null -> dischargeRisk = 35 at weight 0.25
 *  Both "no river nearby" and "vs seasonal mean: unavailable" come from the
 *  SAME null, so the term is counted once, not twice. */
const assumedPct = (key: MetricKey, detail: { label: string; value: string }[]) => {
  if (key !== 'flood') return 0;
  const get = (l: string) => detail.find((d) => d.label === l)?.value ?? '';
  const elevMissing = isAbsent(get('Ground elevation'));
  const dischMissing = isAbsent(get('River discharge')) || isAbsent(get('vs seasonal mean'));
  return (elevMissing ? 50 : 0) + (dischMissing ? 25 : 0);
};

const ASSUMPTION_NOTE: Record<number, string> = {
  25: '25% of this score is an assumed baseline — no river gauge nearby.',
  50: '50% of this score is an assumed baseline — ground elevation unavailable.',
  75: '75% of this score is assumed — no elevation or river data for this point.',
};

const VERDICT: Record<MetricKey, Record<Band, string>> = {
  canopy: {
    low: 'Sparse green cover — under the 10% mark.',
    moderate: 'Some green cover, under the 25% target.',
    high: 'Well covered — 25% or more.',
  },
  traffic: {
    low: 'Sparse road network for a city.',
    moderate: 'Moderately dense road network.',
    high: 'Dense, arterial-heavy grid.',
  },
  pedestrian: {
    low: 'Little dedicated walking provision.',
    moderate: 'Partial footpath and crossing cover.',
    high: 'Well served by footpaths and crossings.',
  },
  flood: {
    low: 'High ground, little standing water.',
    moderate: 'Some low-lying or water-adjacent land.',
    high: 'Low-lying — elevated flood exposure.',
  },
};

const METHOD: Record<MetricKey, string> = {
  canopy:
    'Share of the 25 km² window covered by mapped green land, scored against a 45% ceiling. OpenStreetMap land cover, not satellite imagery — street trees and private gardens are under-counted.',
  traffic:
    'Road length per km², weighted 60% all roads and 40% arterials. Read as car dominance: denser grids carry more traffic. Not a measurement of congestion or of road quality.',
  pedestrian:
    'Footpath density (45%), crossing and signal provision (35%), and the share of road length tagged with a sidewalk (20%).',
  flood:
    'Ground elevation (50%), surface water share of the window (25%), and river discharge against its own seasonal mean (25%).',
};

type ErrKind = 'no-place' | 'bad-coords' | 'upstream';

const errorKind = (e: string | null): ErrKind | null =>
  !e ? null : /no city found/i.test(e) ? 'no-place' : /lat and lon are required/i.test(e) ? 'bad-coords' : 'upstream';

const ERROR_TITLE: Record<ErrKind, string> = {
  upstream: 'Reading failed',
  'no-place': "Can't read here",
  'bad-coords': 'Invalid location',
};

const ERROR_BODY: Record<ErrKind, string> = {
  upstream:
    "OpenStreetMap's Overpass servers timed out or are rate-limiting. This is common at peak hours and usually clears within a minute.",
  'no-place': 'No city could be resolved at this point. Try somewhere over land, closer to a built-up area.',
  'bad-coords': "The map centre isn't a valid coordinate.",
};

const MINUS = (n: number, digits: number) => n.toFixed(digits).replace('-', '−');

function MetricRow({
  config,
  metric,
  isRowOpen,
  onToggle,
}: {
  config: (typeof METRICS)[number];
  metric: Metric;
  isRowOpen: boolean;
  onToggle: () => void;
}) {
  const { key, label, Icon, higherIsBetter, stops, scaleNote, source } = config;

  // Cannot fire against the current server, which always returns four finite
  // numbers. Kept so a contract change degrades instead of rendering NaN.
  const broken = !metric || !Number.isFinite(metric.value);

  const stance = broken ? null : stanceOf(metric.band, higherIsBetter);
  const S = stance ? STANCE[stance] : null;
  const assumed = broken ? 0 : assumedPct(key, metric.detail);
  const showUnit = !broken && metric.unit !== '/100';

  const srSentence = broken
    ? `${label}: not measured.`
    : `${label}: ${fmtValue(metric.value, metric.unit)} ${SPOKEN_UNIT[metric.unit] ?? ''}. Score ${metric.score} of 100. ${
        higherIsBetter ? 'Higher is better' : 'Lower is better'
      }. Verdict: ${S!.word.toLowerCase()}. ${VERDICT[key][metric.band]} ${metric.detail.length} supporting measurements.`;

  return (
    <div className="border-t border-dark-700/50 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isRowOpen}
        aria-controls={`gd-detail-${key}`}
        className="group block w-full px-4 py-3 text-left transition-colors duration-150 hover:bg-dark-700/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand-accent/70 motion-reduce:transition-none"
      >
        <span className="sr-only">{srSentence}</span>

        <div aria-hidden="true" className="flex items-center gap-1.5">
          <Icon size={14} strokeWidth={1.75} className="shrink-0 text-slate-400" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">{label}</span>
          <ChevronDown
            size={14}
            className={clsx(
              'ml-auto shrink-0 text-slate-500 transition-transform duration-200 group-hover:text-slate-300 motion-reduce:transition-none',
              isRowOpen && 'rotate-180'
            )}
          />
        </div>

        <div aria-hidden="true" className="mt-2 flex items-end justify-between gap-2">
          <p className="font-mono text-[26px] font-medium leading-none tracking-[-0.01em] tabular-nums text-white">
            {broken ? <span className="text-slate-400">—</span> : fmtValue(metric.value, metric.unit)}
            {showUnit && (
              <span className="ml-1.5 font-mono text-[11px] font-normal tracking-normal text-slate-400">
                {metric.unit}
              </span>
            )}
          </p>
          {S ? (
            <span
              className={clsx(
                'inline-flex shrink-0 items-center gap-1 rounded-[3px] border px-1.5 py-[3px] font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.14em]',
                S.chip,
                S.text
              )}
            >
              <S.Icon size={12} strokeWidth={2.25} className="shrink-0" />
              {S.word}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[3px] border border-dark-600 bg-dark-900/60 px-1.5 py-[3px] font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-slate-400">
              <CircleSlash size={12} strokeWidth={2.25} className="shrink-0" />
              NO DATA
            </span>
          )}
        </div>

        {/* One gradient, two ticks, one needle — all sharing a single 0-100%
            coordinate space, which flex segments with gaps would desync. */}
        <div
          aria-hidden="true"
          className="relative my-[11px] h-1.5 w-full rounded-full"
          style={
            broken
              ? { background: 'rgba(51,65,85,0.4)' }
              : { background: trackBackground(metric.band, higherIsBetter, stops) }
          }
        >
          {!broken && (
            <>
              <span className="absolute inset-y-0 w-0.5 bg-dark-900" style={{ left: `calc(${stops[0]}% - 1px)` }} />
              <span className="absolute inset-y-0 w-0.5 bg-dark-900" style={{ left: `calc(${stops[1]}% - 1px)` }} />
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-full transition-transform duration-500 ease-out motion-reduce:transition-none"
                style={{ transform: `translateX(${Math.max(0, Math.min(100, metric.score))}%)` }}
              >
                <span className="absolute -bottom-[3px] -top-[3px] left-0 -ml-px w-0.5 rounded-[1px] bg-white shadow-[0_0_0_2px_rgba(15,23,42,0.95)]" />
              </span>
            </>
          )}
        </div>

        {/* The polarity token is never conditional and never hidden. Down the
            panel it reads up, down, up, down — that alternation is the proof
            that polarity varies between metrics. Do not "clean it up". */}
        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.14em] tabular-nums text-slate-400"
        >
          <span>{broken ? 'Not measured' : (scaleNote ?? `Score ${metric.score}/100`)}</span>
          <span className="flex shrink-0 items-center gap-1">
            {higherIsBetter ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
            {higherIsBetter ? 'Higher is better' : 'Lower is better'}
          </span>
        </div>

        {!broken && (
          <p aria-hidden="true" className="mt-1.5 text-[11px] leading-[1.35] text-slate-300">
            {VERDICT[key][metric.band]}
          </p>
        )}

        {assumed > 0 && (
          <p aria-hidden="true" className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-snug">
            <CircleSlash size={11} strokeWidth={2} className="mt-px shrink-0 text-brand-warning" />
            <span className="text-slate-300">{ASSUMPTION_NOTE[assumed]}</span>
          </p>
        )}
      </button>

      {/* Sibling of the trigger, never a descendant — a <dl> inside a <button>
          is invalid and screen readers flatten it. */}
      <div
        id={`gd-detail-${key}`}
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: isRowOpen ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          {!broken && (
            <dl className="space-y-1.5 px-4 pt-0.5">
              {metric.detail.map((d) => (
                <div key={d.label} className="flex items-baseline gap-2">
                  <dt title={d.label} className="min-w-0 shrink truncate text-[11px] text-slate-400">
                    {d.label}
                  </dt>
                  <span
                    aria-hidden="true"
                    className="min-w-2 flex-1 -translate-y-[3px] border-b border-dotted border-dark-600"
                  />
                  {isAbsent(d.value) ? (
                    <dd className="flex shrink-0 items-center gap-1 text-[11px] italic text-slate-400">
                      <Minus size={10} aria-hidden="true" />
                      {d.value}
                    </dd>
                  ) : (
                    <dd className="shrink-0 font-mono text-[11px] tabular-nums text-slate-200">{d.value}</dd>
                  )}
                </div>
              ))}
            </dl>
          )}

          <p className="mx-4 mt-2.5 border-t border-dark-700/40 pt-2 text-[10px] leading-[1.45] text-slate-400">
            {METHOD[key]}
          </p>

          <div className="mx-4 mb-3.5 mt-2 flex items-center gap-2">
            <Database size={10} aria-hidden="true" className="shrink-0 text-slate-400" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">Source</span>
            <span className="truncate text-[11px] text-slate-300">{source}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonRow({ config }: { config: (typeof METRICS)[number] }) {
  const { label, Icon, higherIsBetter } = config;
  return (
    <div className="border-t border-dark-700/50 px-4 py-3 first:border-t-0">
      <div className="flex items-center gap-1.5">
        <Icon size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-slate-400" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="relative block h-[22px] w-20 overflow-hidden rounded-sm bg-dark-700/50">
          <span
            aria-hidden="true"
            className="gd-scan absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
          />
        </span>
        <span className="h-5 w-16 shrink-0 rounded-[3px] bg-dark-700/50" />
      </div>
      <div className="my-[11px] h-1.5 w-full rounded-full bg-dark-700/30" />
      <div className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
        <span className="h-2 w-16 rounded-sm bg-dark-700/50" />
        <span className="flex shrink-0 items-center gap-1">
          {higherIsBetter ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
          {higherIsBetter ? 'Higher is better' : 'Lower is better'}
        </span>
      </div>
      <div className="mt-1.5 space-y-1">
        <span className="block h-2 w-full rounded-sm bg-dark-700/40" />
        <span className="block h-2 w-3/5 rounded-sm bg-dark-700/40" />
      </div>
    </div>
  );
}

export default function Sidebar({ insights, loading, error, onRetry, requested, className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  // Keyed by city so a new reading collapses every drill-down without an
  // effect that calls setState on each change.
  const [openState, setOpenState] = useState<{ key: string; set: Set<MetricKey> }>({ key: '', set: EMPTY_SET });
  const [elapsed, setElapsed] = useState(0);
  const autoRetried = useRef(false);

  const cityKey = insights ? `${insights.city.lat},${insights.city.lon}` : '';
  const open = openState.key === cityKey ? openState.set : EMPTY_SET;

  /** A reading belongs to the coordinates the server echoed back. If the user
   *  has panned since, the numbers on screen describe a DIFFERENT place. */
  const isStale =
    !!insights && !!requested && (insights.city.lat !== requested.lat || insights.city.lon !== requested.lon);
  const ready = !!insights && !isStale;

  // The reset lives in the cleanup, not the effect body: setting state
  // synchronously on every `loading` change cascades an extra render.
  useEffect(() => {
    if (!loading) return;
    const t0 = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => {
      window.clearInterval(id);
      setElapsed(0);
    };
  }, [loading]);

  const kind = errorKind(error);

  // One automatic retry, upstream failures only. 400/404 are deterministic, and
  // the server already fails over across three Overpass mirrors.
  useEffect(() => {
    if (!error) {
      autoRetried.current = false;
      return;
    }
    if (kind !== 'upstream' || autoRetried.current) return;
    autoRetried.current = true;
    const id = window.setTimeout(onRetry, 6000);
    return () => window.clearTimeout(id);
  }, [error, kind, onRetry]);

  const toggle = useCallback(
    (k: MetricKey) => {
      setOpenState((prev) => {
        const base = prev.key === cityKey ? prev.set : EMPTY_SET;
        const next = new Set(base);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return { key: cityKey, set: next };
      });
    },
    [cityKey]
  );

  const toggleAll = useCallback(() => {
    setOpenState((prev) => {
      const base = prev.key === cityKey ? prev.set : EMPTY_SET;
      return {
        key: cityKey,
        set: base.size === METRICS.length ? new Set<MetricKey>() : new Set<MetricKey>(METRICS.map((m) => m.key)),
      };
    });
  }, [cityKey]);

  const city = insights?.city;

  const tabLabel = !isOpen
    ? ready
      ? `Expand city reading — ${city!.name}: ` +
        METRICS.map(
          (m) => `${m.label.toLowerCase()} ${stanceOf(insights!.metrics[m.key].band, m.higherIsBetter)}`
        ).join(', ')
      : 'Expand city reading'
    : 'Collapse city reading';

  const loadingCopy =
    elapsed >= 35
      ? 'Unusually slow. The public servers may be rate-limiting this request.'
      : elapsed >= 20
        ? 'Still working — Overpass is busy. This is common at peak hours.'
        : 'Querying OpenStreetMap for a 5 × 5 km window.';

  const readStamp = insights
    ? `Read ${new Date(insights.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${new Date(
        insights.fetchedAt
      ).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`
    : null;

  return (
    <div
      className={clsx(
        'pointer-events-auto absolute bottom-4 right-0 top-4 z-[1000] flex items-start',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-1.75rem)]',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls="gd-reading"
        aria-label={tabLabel}
        className="mt-8 flex w-7 shrink-0 flex-col items-center justify-center gap-2 rounded-l-md border border-r-0 border-dark-700/50 bg-dark-800/90 py-3 text-slate-400 backdrop-blur-md transition-colors duration-150 hover:bg-dark-700/80 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-accent motion-reduce:transition-none"
      >
        {isOpen ? (
          <ChevronRight size={15} aria-hidden="true" />
        ) : (
          <>
            <ChevronLeft size={15} aria-hidden="true" />
            {ready &&
              METRICS.map((m) => {
                const S = STANCE[stanceOf(insights!.metrics[m.key].band, m.higherIsBetter)];
                return <S.Icon key={m.key} size={11} strokeWidth={2.5} aria-hidden="true" className={S.text} />;
              })}
          </>
        )}
      </button>

      <aside
        id="gd-reading"
        aria-busy={loading}
        className="glass-panel mr-4 flex h-full w-80 flex-col overflow-hidden shadow-2xl lg:w-96"
      >
        <header className="shrink-0 border-b border-dark-700/50 px-4 pb-3 pt-3.5">
          <div className="flex items-center gap-2">
            <Crosshair size={11} aria-hidden="true" className="shrink-0 text-slate-400" />
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Map centre
            </span>
            <span
              title="Every location is measured through an identical 5 × 5 km window, so readings are comparable between cities."
              className="ml-auto shrink-0 rounded-[3px] border border-dark-600 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.12em] tabular-nums text-slate-400"
            >
              5 × 5 km · 25 km²
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <h2
              title={city?.name}
              className={clsx(
                'min-w-0 truncate text-[17px] font-semibold leading-tight tracking-[-0.01em]',
                city ? 'text-white' : 'text-slate-400'
              )}
            >
              {city?.name ?? 'No reading yet'}
            </h2>
            {loading && insights && (
              <span className="shrink-0 rounded-[3px] border border-dark-600 bg-dark-900/80 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.14em] text-slate-300">
                Updating
              </span>
            )}
            {!loading && insights && (isStale || error) && (
              <span className="shrink-0 rounded-[3px] border border-dark-600 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                Previous
              </span>
            )}
          </div>

          {city && (
            <p className="mt-1 truncate font-mono text-[10px] tabular-nums text-slate-400">
              {[city.country, `${MINUS(city.lat, 4)}, ${MINUS(city.lon, 4)}`].filter(Boolean).join(' · ')}
            </p>
          )}
        </header>

        {loading ? (
          <div className="shrink-0 border-b border-dark-700/50 bg-dark-900/30 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                Reading location
              </span>
              <span aria-hidden="true" className="ml-auto font-mono text-[9px] tabular-nums text-slate-400">
                {elapsed}s · typical 5–40s
              </span>
            </div>
            <div className="relative mt-2 h-1 w-full overflow-hidden rounded-full bg-dark-700">
              <span aria-hidden="true" className="gd-indeterminate" />
            </div>
            <p role="status" aria-live="polite" className="mt-1.5 text-[10px] leading-snug text-slate-400">
              {loadingCopy}
              {elapsed >= 35 && (
                <>
                  {' '}
                  You can keep panning the map — a new reading replaces this one.
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="shrink-0 border-b border-dark-700/50 bg-dark-900/30 px-4 py-2">
            <div className="flex items-center gap-3">
              <ul className="flex items-center gap-2.5">
                {(['good', 'fair', 'poor'] as const).map((s) => {
                  const S = STANCE[s];
                  return (
                    <li key={s} className="flex items-center gap-1">
                      <S.Icon size={11} strokeWidth={2.5} aria-hidden="true" className={S.text} />
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {S.word}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {insights && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="ml-auto shrink-0 rounded-sm font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-brand-accent focus-visible:text-brand-accent focus-visible:underline focus-visible:outline-none motion-reduce:transition-none"
                >
                  {open.size === METRICS.length ? 'Collapse all' : 'Expand all'}
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
              Each measure is judged against its own goal — green is not always at the high end.
            </p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {error && (
            <div
              key={error}
              role="alert"
              className={clsx(
                'mx-4 my-4 rounded-[3px] border p-4',
                kind === 'upstream' ? 'border-brand-warning/25 bg-brand-warning/[0.06]' : 'border-red-400/25 bg-brand-alert/[0.06]'
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={clsx(
                    'grid size-8 shrink-0 place-items-center rounded-[3px] ring-1 ring-inset',
                    kind === 'upstream' ? 'bg-brand-warning/10 ring-brand-warning/30' : 'bg-brand-alert/10 ring-red-400/30'
                  )}
                >
                  {kind === 'upstream' ? (
                    <TriangleAlert size={16} aria-hidden="true" className="text-brand-warning" />
                  ) : (
                    <OctagonAlert size={16} aria-hidden="true" className="text-red-400" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white">{ERROR_TITLE[kind!]}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{ERROR_BODY[kind!]}</p>
                </div>
              </div>

              {/* Retrying a rejected coordinate is guaranteed to fail, so the
                  affordance is withheld rather than offered as a lie. */}
              {kind !== 'bad-coords' && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3.5 flex h-9 w-full items-center justify-center gap-2 rounded-[3px] bg-brand-accent text-[11px] font-bold uppercase tracking-[0.16em] text-dark-900 transition-colors duration-200 hover:bg-[#34d399] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dark-800 motion-reduce:transition-none"
                >
                  <RefreshCw size={14} aria-hidden="true" /> Try again
                </button>
              )}

              <dl className="mt-3.5 space-y-1 border-t border-dark-700/50 pt-2.5 font-mono text-[9px] uppercase tracking-[0.14em] tabular-nums text-slate-400">
                <div className="flex gap-2">
                  <dt className="shrink-0">Detail</dt>
                  <dd className="min-w-0 flex-1 break-words normal-case tracking-normal">{error}</dd>
                </div>
              </dl>
            </div>
          )}

          {isStale && !loading && !error && insights && (
            <div className="flex items-start gap-2 border-b border-dark-700/50 bg-dark-900/40 px-4 py-2">
              <Crosshair size={12} aria-hidden="true" className="mt-px shrink-0 text-slate-400" />
              <p className="text-[10px] leading-snug text-slate-300">
                The map has moved. These numbers are for {insights.city.name}.
              </p>
            </div>
          )}

          {loading && !insights && METRICS.map((m) => <SkeletonRow key={m.key} config={m} />)}

          {insights && (
            <div
              className={clsx(
                'transition-opacity duration-200 motion-reduce:transition-none',
                (loading || isStale || error) && 'opacity-60'
              )}
            >
              {METRICS.map((m) => (
                <MetricRow
                  key={m.key}
                  config={m}
                  metric={insights.metrics[m.key]}
                  isRowOpen={open.has(m.key)}
                  onToggle={() => toggle(m.key)}
                />
              ))}
            </div>
          )}

          {!insights && !loading && !error && (
            <>
              <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
                <div className="grid size-11 place-items-center rounded-[3px] border border-dashed border-dark-600">
                  <Crosshair size={20} aria-hidden="true" className="text-slate-400" />
                </div>
                <p className="mt-3.5 text-[13px] font-semibold text-white">No location read yet</p>
                <p className="mt-1.5 max-w-[15rem] text-[11px] leading-relaxed text-slate-400">
                  Pan the map to a city. All four measures are read live from OpenStreetMap for a 5 × 5 km window around
                  the map centre.
                </p>
              </div>
              <div className="border-t border-dark-700/50 px-4 py-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Will measure
                </p>
                <ul className="mt-2 space-y-1.5">
                  {METRICS.map((m) => (
                    <li key={m.key} className="flex items-center gap-2 text-[11px] text-slate-400">
                      <m.Icon size={13} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                      <span>{m.label}</span>
                      <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em]">
                        {m.higherIsBetter ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
                        {m.higherIsBetter ? 'Higher is better' : 'Lower is better'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-dark-700/50 bg-dark-900/40 px-4 py-2.5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Database size={10} aria-hidden="true" className="shrink-0 text-slate-400" />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Sources
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-[1.5] text-slate-400">
                {(insights?.sources ?? ['OpenStreetMap / Overpass', 'Open-Meteo GloFAS', 'Nominatim']).join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              disabled={loading || !requested}
              aria-label="Re-read this location"
              className="grid size-7 shrink-0 place-items-center rounded-[3px] text-slate-400 transition-colors hover:text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dark-800 motion-reduce:transition-none"
            >
              <RefreshCw size={13} className={clsx(loading && 'animate-spin motion-reduce:animate-none')} />
            </button>
          </div>

          {readStamp && (
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] tabular-nums text-slate-400">
              {readStamp}
              {insights?.cached && (
                <span title="Served from a cached reading. Readings are cached for up to 6 hours."> · Cached</span>
              )}
            </p>
          )}
          {/* Timeline (2019-2024) sits directly beneath this panel; without this
              line users assume the two are linked. */}
          <p className="mt-1 text-[9px] leading-snug text-slate-400">
            Single-date reading — not linked to the timeline year.
          </p>
        </footer>
      </aside>
    </div>
  );
}
