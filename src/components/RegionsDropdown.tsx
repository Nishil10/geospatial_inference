import { useState, useRef, useEffect } from 'react';
import { Globe, Search, CornerDownLeft } from 'lucide-react';
import clsx from 'clsx';

interface WorldRegion {
    id: string;
    name: string;
    coordinates: [number, number];
    zoom: number;
}

const WORLD_REGIONS: WorldRegion[] = [
    { id: 'na', name: 'North America', coordinates: [45.0, -100.0], zoom: 3 },
    { id: 'sa', name: 'South America', coordinates: [-15.0, -60.0], zoom: 3 },
    { id: 'eu', name: 'Europe', coordinates: [50.0, 10.0], zoom: 4 },
    { id: 'af', name: 'Africa', coordinates: [0.0, 20.0], zoom: 3 },
    { id: 'as', name: 'Asia', coordinates: [34.0, 100.0], zoom: 3 },
    { id: 'oc', name: 'Australia / Oceania', coordinates: [-25.0, 135.0], zoom: 4 },
    { id: 'an', name: 'Antarctica', coordinates: [-80.0, 0.0], zoom: 3 },
    { id: 'me', name: 'Middle East', coordinates: [25.0, 45.0], zoom: 4 },
    { id: 'ca', name: 'Central Asia', coordinates: [45.0, 65.0], zoom: 4 },
    { id: 'sea', name: 'Southeast Asia', coordinates: [10.0, 110.0], zoom: 4 },
    { id: 'ea', name: 'East Asia', coordinates: [35.0, 115.0], zoom: 4 },
    { id: 'sa2', name: 'South Asia', coordinates: [20.0, 77.0], zoom: 4 },
];

interface RegionsDropdownProps {
    onFlyTo: (coords: [number, number], zoom: number) => void;
}

/** The target the map will actually fly to, printed as a survey fix. */
const fixOf = ([lat, lon]: [number, number]) =>
    `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;

export default function RegionsDropdown({ onFlyTo }: RegionsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredRegions = WORLD_REGIONS.filter(region =>
        region.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                className={clsx(
                    'flex items-center gap-2 rounded-[3px] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-label transition-colors',
                    isOpen ? 'bg-dark-800 text-white' : 'text-slate-400 hover:bg-dark-800 hover:text-white',
                )}
            >
                <Globe size={13} strokeWidth={2} className={isOpen ? 'text-brand-accent' : ''} />
                <span>Regions</span>
            </button>

            {isOpen && (
                <div className="gd-card gd-slip absolute right-0 top-full z-[1050] mt-2 w-72 overflow-hidden">
                    <div className="border-b border-white/[0.07] p-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                            <input
                                type="text"
                                placeholder="Filter continents…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-[2px] border border-white/[0.07] bg-dark-900/70 py-1.5 pl-8 pr-3 text-[13px] text-white outline-none transition-colors placeholder:text-slate-500 focus:border-brand-accent/50"
                            />
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-1.5">
                        {filteredRegions.length > 0 ? (
                            filteredRegions.map((region) => (
                                <button
                                    key={region.id}
                                    onClick={() => {
                                        onFlyTo(region.coordinates, region.zoom);
                                        setIsOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className="group flex w-full items-center gap-2.5 rounded-[2px] px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                                >
                                    <span className="h-4 w-[2px] shrink-0 rounded-[1px] bg-white/10 transition-colors group-hover:bg-brand-accent" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] leading-tight text-slate-300 transition-colors group-hover:text-white">
                                            {region.name}
                                        </span>
                                        <span className="gd-readout mt-0.5 block text-[10px] text-slate-600">
                                            {fixOf(region.coordinates)} &middot; z{region.zoom}
                                        </span>
                                    </span>
                                    <CornerDownLeft
                                        size={12}
                                        className="shrink-0 text-transparent transition-colors group-hover:text-brand-accent"
                                    />
                                </button>
                            ))
                        ) : (
                            <p className="px-2 py-6 text-center text-[13px] text-slate-500">No regions match</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
