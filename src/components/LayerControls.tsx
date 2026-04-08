import { useState, useRef, useEffect } from 'react';
import { Layers, GitCompare } from 'lucide-react';

export type BaseLayerType = 'dark' | 'satellite' | 'street';

interface LayerControlsProps {
    baseLayer: BaseLayerType;
    setBaseLayer: (layer: BaseLayerType) => void;
    trafficEnabled: boolean;
    setTrafficEnabled: (enabled: boolean) => void;
    comparisonMode?: boolean;
    setComparisonMode?: (enabled: boolean) => void;
}

export default function LayerControls({
    baseLayer,
    setBaseLayer,
    trafficEnabled,
    setTrafficEnabled,
    comparisonMode,
    setComparisonMode
}: LayerControlsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isOpen ? 'bg-dark-800 text-white' : 'hover:bg-dark-800 text-slate-300'
                    }`}
            >
                <Layers size={16} className={isOpen ? "text-brand-info" : ""} />
                <span>Layers</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 flex flex-col gap-3 p-3 bg-dark-800/90 backdrop-blur-md border border-dark-600 shadow-xl rounded-xl z-[1050] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Base Map</label>
                        <button
                            onClick={() => { setBaseLayer('dark'); setIsOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${baseLayer === 'dark' ? 'bg-brand-info/20 text-brand-info border border-brand-info/30' : 'hover:bg-dark-700 text-slate-300 border border-transparent'
                                }`}
                        >
                            Dark GIS
                        </button>
                        <button
                            onClick={() => { setBaseLayer('satellite'); setIsOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${baseLayer === 'satellite' ? 'bg-brand-info/20 text-brand-info border border-brand-info/30' : 'hover:bg-dark-700 text-slate-300 border border-transparent'
                                }`}
                        >
                            🛰 Satellite View (Default)
                        </button>
                        <button
                            onClick={() => { setBaseLayer('street'); setIsOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${baseLayer === 'street' ? 'bg-brand-info/20 text-brand-info border border-brand-info/30' : 'hover:bg-dark-700 text-slate-300 border border-transparent'
                                }`}
                        >
                            🗺 Street View
                        </button>
                    </div>

                    <div className="h-px w-full bg-dark-600/50"></div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Overlays</label>
                        <label className="flex items-center gap-3 cursor-pointer group px-2 py-1.5 rounded-lg hover:bg-dark-700 transition-colors">
                            <input
                                type="checkbox"
                                checked={trafficEnabled}
                                onChange={(e) => setTrafficEnabled(e.target.checked)}
                                className="w-4 h-4 rounded border-dark-500 bg-dark-800 text-brand-info focus:ring-brand-info focus:ring-offset-dark-800 transition-colors cursor-pointer"
                            />
                            <span className={`text-sm font-medium transition-colors ${trafficEnabled ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                🚗 Live Traffic
                            </span>
                        </label>
                    </div>

                    {setComparisonMode && (
                        <>
                            <div className="h-px w-full bg-dark-600/50"></div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Street View</label>
                                <button
                                    onClick={() => { setComparisonMode(!comparisonMode); setIsOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${comparisonMode 
                                        ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' 
                                        : 'hover:bg-dark-700 text-slate-300 border border-transparent'
                                    }`}
                                >
                                    <GitCompare size={16} />
                                    <div className="text-left">
                                        <span className="block">📸 Comparison View</span>
                                        <span className="text-[10px] text-slate-400">Click map to compare street views</span>
                                    </div>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
