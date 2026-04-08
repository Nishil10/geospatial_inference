import { Play, Pause } from 'lucide-react';
import { useState, useEffect } from 'react';

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

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] glass-panel px-6 py-4 flex items-center gap-6 w-[600px] pointer-events-auto shadow-2xl">
            <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 rounded-full bg-brand-accent text-dark-900 hover:bg-brand-accent/90 transition-colors shadow-lg shadow-brand-accent/20"
            >
                {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
            </button>

            <div className="flex-1">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-3 px-2">
                    {years.map(year => (
                        <span
                            key={year}
                            className={`transition-colors duration-300 ${activeYear === year ? 'text-brand-accent text-sm scale-110' : 'hover:text-slate-300 cursor-pointer'}`}
                            onClick={() => onChange(year)}
                        >
                            {year}
                        </span>
                    ))}
                </div>
                <div className="relative flex items-center h-2">
                    <input
                        type="range"
                        min={0}
                        max={years.length - 1}
                        value={years.indexOf(activeYear)}
                        onChange={(e) => onChange(years[parseInt(e.target.value)])}
                        className="absolute w-full h-1 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-brand-accent pb-1 z-10 opacity-0"
                        title="Timeline Year"
                    />
                    <div className="w-full h-1.5 bg-dark-700/80 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand-accent transition-all duration-300 ease-in-out"
                            style={{ width: `${(years.indexOf(activeYear) / (years.length - 1)) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
