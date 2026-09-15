import { useEffect } from 'react';
import { X, MapPin, AlertCircle, ScanSearch, ImageOff, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { DualStreetView } from '../utils/useMapillary';
import { useImageComparison } from '../utils/useImageComparison';
import type { DetectedChange } from '../utils/useImageComparison';

interface StreetViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DualStreetView | null;
  /** The point the user actually clicked. Retained so a failed retrieval can
   *  still report where it was looking — `data` is null on every failure. */
  fix?: [number, number] | null;
  loading: boolean;
  error: string | null;
}

const SIGNIFICANCE_STYLES: Record<DetectedChange['significance'], string> = {
  high: 'bg-alert-red/15 text-alert-red border-alert-red/40',
  medium: 'bg-amber-400/15 text-amber-400 border-amber-400/40',
  low: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
};

const SCENE_MATCH_NOTE: Record<string, string | null> = {
  same: null,
  partial: 'These photos only partly overlap, so some differences may be camera angle rather than real change.',
  different: 'These photos do not appear to show the same scene — treat the result with caution.',
};

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const formatCoordinates = (lat: number, lng: number) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

/** One half of the diptych. BEFORE sits left and AFTER right, so the pair reads
 *  in the same direction as the seam sweeps everywhere else in the app. */
function Plate({
  epoch,
  frame,
  tone,
}: {
  epoch: string;
  frame: DualStreetView['older'];
  tone: 'before' | 'after';
}) {
  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-3 pb-2">
        <span
          className={clsx(
            'font-mono text-[10px] font-medium uppercase tracking-label',
            tone === 'after' ? 'text-brand-accent' : 'text-slate-400',
          )}
        >
          {epoch}
        </span>
        <span className="gd-readout text-[11px] text-slate-300">
          {frame ? formatDate(frame.capturedAt) : '—'}
        </span>
      </figcaption>

      <div className="relative aspect-video overflow-hidden rounded-[3px] border border-white/[0.07] bg-dark-900">
        {frame ? (
          <img
            src={frame.url}
            alt={`Street view, ${epoch.toLowerCase()}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-600">
            <ImageOff size={20} />
            <span className="gd-eyebrow">No frame</span>
          </div>
        )}
      </div>

      <p className="gd-readout mt-2 text-[10px] text-slate-500">
        {frame ? formatCoordinates(frame.latlng[0], frame.latlng[1]) : 'Not captured'}
      </p>
    </figure>
  );
}

export default function StreetViewModal({ isOpen, onClose, data, fix, loading, error }: StreetViewModalProps) {
  const { compare, reset, result, analyzing, error: compareError } = useImageComparison();

  // Drop any previous analysis when a different location is opened.
  useEffect(() => {
    reset();
  }, [data, reset]);

  // Escape closes. A modal that traps the user behind a mouse-only close button
  // is the one accessibility failure a dialog cannot excuse.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const span =
    data?.older && data?.newer
      ? (data.newer.capturedAt - data.older.capturedAt) / (1000 * 60 * 60 * 24 * 365.25)
      : null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-dark-900/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Street view comparison"
        onClick={(e) => e.stopPropagation()}
        className="gd-card flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden"
      >
        {/* ---- Chrome ---- */}
        <div className="relative flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-3.5">
          <span aria-hidden="true" className="gd-rule absolute inset-x-0 bottom-[-1px]" />
          <div className="min-w-0">
            <p className="gd-eyebrow">Change comparison</p>
            <p className="gd-readout mt-1 truncate text-[13px] text-white">
              {data
                ? formatCoordinates(data.location[0], data.location[1])
                : fix
                  ? formatCoordinates(fix[0], fix[1])
                  : '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close the comparison"
            className="shrink-0 rounded-[3px] p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* ---- Body ---- */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin text-brand-accent" />
              <p className="gd-eyebrow">Retrieving frames</p>
            </div>
          )}

          {error && (
            <div className={`flex items-start gap-3 border-l-2 px-4 py-3 ${/not configured/i.test(error) ? "border-brand-warning bg-brand-warning/[0.07]" : "border-brand-alert bg-brand-alert/[0.08]"}`}>
              <AlertCircle size={16} className={`mt-px shrink-0 ${/not configured/i.test(error) ? "text-brand-warning" : "text-brand-alert"}`} />
              <div className="min-w-0">
                <p className={`gd-eyebrow ${/not configured/i.test(error) ? "text-brand-warning" : "text-brand-alert"}`}>
                  {/not configured/i.test(error) ? 'Not configured' : 'Retrieval failed'}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{error}</p>
                {/not configured/i.test(error) && (
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                    Street view comparison needs a free Mapillary token. Create one at{' '}
                    <a
                      href="https://www.mapillary.com/dashboard/developers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-accent hover:underline"
                    >
                      mapillary.com/dashboard/developers
                    </a>
                    , then add it to <code className="font-mono text-slate-300">.env</code> and restart the dev server.
                  </p>
                )}
              </div>
            </div>
          )}

          {data && !loading && !error && (
            <div>
              {/* The diptych, split by the seam. */}
              <div className="relative grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
                <Plate epoch="Before" frame={data.older} tone="before" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-brand-accent/30 md:block"
                />
                <Plate epoch="After" frame={data.newer} tone="after" />
              </div>

              {/* ---- Readouts ---- */}
              {span !== null && (
                <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-white/[0.07] pt-4">
                  <div>
                    <p className="gd-eyebrow">Span</p>
                    <p className="gd-readout mt-1 text-[26px] font-medium leading-none text-white">
                      {span.toFixed(1)}
                      <span className="ml-1.5 text-[11px] font-normal text-slate-400">years</span>
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="gd-eyebrow">Interval</p>
                    <p className="gd-readout mt-1.5 text-[12px] text-slate-300">
                      {formatDate(data.older!.capturedAt)} &rarr; {formatDate(data.newer!.capturedAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* ---- Automated read ---- */}
              {data.older && data.newer && (
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ScanSearch size={14} className="text-brand-info" />
                      <span className="gd-eyebrow">Automated change read</span>
                    </div>
                    <button
                      onClick={() => compare(data)}
                      disabled={analyzing}
                      className="flex items-center gap-2 rounded-[3px] border border-brand-info/30 bg-brand-info/10 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-label text-brand-info transition-colors hover:bg-brand-info/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {analyzing && <Loader2 size={11} className="animate-spin" />}
                      {analyzing ? 'Analysing' : result ? 'Re-analyse' : 'Run analysis'}
                    </button>
                  </div>

                  {compareError && <p className="mt-3 text-[13px] text-red-300">{compareError}</p>}

                  {result && (
                    <div className="mt-3.5 space-y-3">
                      {SCENE_MATCH_NOTE[result.sceneMatch] && (
                        <p className="flex items-start gap-2 border-l-2 border-brand-warning bg-brand-warning/[0.07] px-3 py-2 text-[12px] leading-snug text-amber-200/90">
                          <AlertCircle size={13} className="mt-px shrink-0 text-brand-warning" />
                          {SCENE_MATCH_NOTE[result.sceneMatch]}
                        </p>
                      )}

                      <p className="text-[13px] leading-relaxed text-slate-300">{result.summary}</p>

                      {result.changes.length > 0 && (
                        <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                          {result.changes.map((change, i) => (
                            <li key={i} className="flex items-start gap-3 py-2.5">
                              <span
                                className={`shrink-0 rounded-[2px] border px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-label ${SIGNIFICANCE_STYLES[change.significance]}`}
                              >
                                {change.category}
                              </span>
                              <span className="text-[13px] leading-snug text-slate-300">{change.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="gd-eyebrow mt-5 flex items-center gap-1.5 border-t border-white/[0.07] pt-4 normal-case tracking-[0.1em]">
                <MapPin size={11} className="shrink-0" />
                Frames via{' '}
                <a
                  href="https://www.mapillary.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-accent hover:underline"
                >
                  Mapillary
                </a>
              </p>
            </div>
          )}

          {!loading && !error && !data && (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <ImageOff size={20} className="text-slate-600" />
              <p className="gd-eyebrow">No coverage here</p>
              <p className="text-[13px] text-slate-400">Try another node on the map.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
