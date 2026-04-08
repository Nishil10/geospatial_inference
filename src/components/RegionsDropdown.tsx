import { useState, useRef, useEffect } from 'react';
import { Globe, Search, ChevronRight } from 'lucide-react';

export interface WorldRegion {
    id: string;
    name: string;
    coordinates: [number, number];
    zoom: number;
}

export const WORLD_REGIONS: WorldRegion[] = [
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
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${isOpen ? 'bg-dark-800 text-white shadow-inner' : 'hover:bg-dark-800 text-slate-300'
                    }`}
            >
                <Globe size={16} className={isOpen ? "text-brand-info" : ""} />
                <span>Regions</span>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-dark-800/90 backdrop-blur-xl border border-dark-600 shadow-2xl rounded-2xl z-[1050] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Search Bar */}
                    <div className="p-3 border-b border-dark-600/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search continents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-dark-900/50 text-white text-sm rounded-xl pl-9 pr-4 py-2 border border-dark-600 focus:border-brand-info focus:ring-1 focus:ring-brand-info outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Regions List */}
                    <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-transparent">
                        {filteredRegions.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                {filteredRegions.map((region) => (
                                    <button
                                        key={region.id}
                                        onClick={() => {
                                            onFlyTo(region.coordinates, region.zoom);
                                            setIsOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className="flex justify-between items-center w-full text-left px-3 py-2.5 rounded-xl hover:bg-dark-700/80 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-dark-900/50 text-slate-400 group-hover:text-brand-info group-hover:bg-brand-info/10 transition-colors">
                                                <Globe size={14} />
                                            </div>
                                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                                {region.name}
                                            </span>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-600 group-hover:text-brand-info group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-6 text-center text-sm text-slate-500">
                                No regions found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
