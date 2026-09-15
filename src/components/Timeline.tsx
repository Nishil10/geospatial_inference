import { Play, Pause } from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

interface TimelineProps {
    years: number[];
    activeYear: number;
    onChange: (year: number) => void;
}

export default function Timeline({ years, activeYear, onChange }: TimelineProps) {
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        let interval: number;
        if (isPlaying) {
            interval = setInterval(() => {
                const currentIndex = years.indexOf(activeYear);
                const nextIndex = (currentIndex + 1) % years.length;
                onChange(years[nextIndex]);
                if (nextIndex === years.length - 1) {
                    setIsPlaying(false);
                }
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [isPlaying, activeYear, years, onChange]);

    const index = years.indexOf(activeYear);
    const pct = (i: number) => (i / (years.length - 1)) * 100;

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[1000] flex justify-center px-4">
            <div className="glass-panel gd-ticks pointer-events-auto flex w-full max-w-[660px] items-center gap-4 py-3 pl-3 pr-4 sm:gap-5">
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    aria-label={isPlaying ? 'Pause the survey sequence' : 'Play the survey sequence'}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[3px] bg-brand-accent text-dark-900 transition-colors hover:bg-[#34d399]"
                >
                    {isPlaying ? (
                        <Pause size={15} className="fill-current" />
                    ) : (
                        <Play size={15} className="ml-px fill-current" />
                    )}
                </button>

                {/* ---- The reel ------------------------------------------------
                    A drawn track under a transparent range input: the input keeps
                    native drag and arrow-key behaviour, everything visible is ours.
                    All four layers (baseline, notches, run, needle) share one
                    0-100% coordinate space, so they cannot desync. */}
                <div className="relative min-w-0 flex-1">
                    <div className="relative h-[26px]">
                        {/* Baseline */}
                        <span
                            aria-hidden="true"
                            className="absolute inset-x-0 top-[9px] h-px bg-white/[0.14]"
                        />

                        {/* Notches — a survey rod, tall at the ends */}
                        {years.map((y, i) => (
                            <span
                                key={y}
                                aria-hidden="true"
                                className={clsx(
                                    'absolute top-[9px] w-px -translate-x-1/2',
                                    i === index ? 'h-0' : 'h-[6px] bg-white/25',
                                )}
                                style={{ left: `${pct(i)}%` }}
                            />
                        ))}

                        {/* The run travelled so far */}
                        <span
                            aria-hidden="true"
                            className="absolute top-[9px] left-0 h-px bg-brand-accent transition-[width] duration-300 ease-out motion-reduce:transition-none"
                            style={{ width: `${pct(index)}%` }}
                        />

                        {/* The needle */}
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 left-0 w-full transition-transform duration-300 ease-out motion-reduce:transition-none"
                            style={{ transform: `translateX(${pct(index)}%)` }}
                        >
                            <span className="absolute top-[3px] h-[13px] w-[2px] -translate-x-1/2 rounded-[1px] bg-white shadow-[0_0_0_3px_rgba(8,14,26,0.9),0_0_12px_2px_rgba(16,185,129,0.45)]" />
                        </span>

                        <input
                            type="range"
                            min={0}
                            max={years.length - 1}
                            value={index}
                            onChange={(e) => onChange(years[parseInt(e.target.value)])}
                            aria-label="Survey year"
                            className="gd-scrub absolute inset-x-0 top-0 h-[26px] w-full"
                        />
                    </div>

                    {/* Year labels, each its own hit target */}
                    <div className="relative mt-0.5 h-[14px]">
                        {years.map((y, i) => (
                            <button
                                key={y}
                                onClick={() => onChange(y)}
                                tabIndex={-1}
                                style={{ left: `${pct(i)}%` }}
                                className={clsx(
                                    'absolute -translate-x-1/2 px-1 font-mono text-[10px] tabular-nums tracking-[0.08em] transition-colors',
                                    i === index
                                        ? 'font-semibold text-brand-accent'
                                        : 'text-slate-500 hover:text-slate-300',
                                )}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ---- Readout ------------------------------------------------- */}
                <div className="shrink-0 border-l border-white/[0.08] pl-4 text-right">
                    <p className="gd-readout text-[22px] font-medium leading-none text-white">{activeYear}</p>
                    <p className="gd-eyebrow mt-1.5">Epoch</p>
                </div>
            </div>
        </div>
    );
}
