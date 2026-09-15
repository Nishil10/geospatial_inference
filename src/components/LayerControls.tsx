import { useState, useRef, useEffect } from 'react';
import { Layers, GitCompare, Moon, Satellite, Map as MapIcon, Car } from 'lucide-react';
import clsx from 'clsx';

export type BaseLayerType = 'dark' | 'satellite' | 'street';

interface LayerControlsProps {
    baseLayer: BaseLayerType;
    setBaseLayer: (layer: BaseLayerType) => void;
    trafficEnabled: boolean;
    setTrafficEnabled: (enabled: boolean) => void;
    comparisonMode?: boolean;
    setComparisonMode?: (enabled: boolean) => void;
}

/** Each base layer names the source it actually requests, so the menu doubles
 *  as provenance — see the TileLayer urls in MapArea.tsx. */
const BASE_LAYERS: { id: BaseLayerType; name: string; source: string; Icon: typeof Moon }[] = [
    { id: 'dark', name: 'Dark GIS', source: 'OpenStreetMap', Icon: Moon },
    { id: 'satellite', name: 'Satellite', source: 'Esri World Imagery', Icon: Satellite },
    { id: 'street', name: 'Street', source: 'OpenStreetMap', Icon: MapIcon },
];

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
                aria-expanded={isOpen}
                className={clsx(
                    'flex items-center gap-2 rounded-[3px] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-label transition-colors',
                    isOpen ? 'bg-dark-800 text-white' : 'text-slate-400 hover:bg-dark-800 hover:text-white',
                )}
            >
                <Layers size={13} strokeWidth={2} className={isOpen ? 'text-brand-accent' : ''} />
                <span>Layers</span>
            </button>

            {isOpen && (
                <div className="gd-card gd-slip absolute left-0 top-full z-[1050] mt-2 w-64 p-2">
                    <p className="gd-eyebrow px-2 pb-1.5 pt-1">Base map</p>
                    <div className="space-y-px">
                        {BASE_LAYERS.map(({ id, name, source, Icon }) => {
                            const active = baseLayer === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => { setBaseLayer(id); setIsOpen(false); }}
                                    className={clsx(
                                        'flex w-full items-center gap-2.5 rounded-[2px] px-2 py-2 text-left transition-colors',
                                        active ? 'bg-brand-accent/10' : 'hover:bg-white/[0.04]',
                                    )}
                                >
                                    {/* Selection reads as a lit indicator lamp, not a filled pill. */}
                                    <span
                                        className={clsx(
                                            'h-4 w-[2px] shrink-0 rounded-[1px]',
                                            active ? 'bg-brand-accent' : 'bg-white/10',
                                        )}
                                    />
                                    <Icon
                                        size={14}
                                        strokeWidth={1.75}
                                        className={clsx('shrink-0', active ? 'text-brand-accent' : 'text-slate-400')}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className={clsx('block text-[13px] leading-tight', active ? 'text-white' : 'text-slate-300')}>
                                            {name}
                                        </span>
                                        <span className="gd-eyebrow mt-0.5 block truncate normal-case tracking-[0.1em] text-slate-600">
                                            {source}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="my-2 h-px bg-white/[0.07]" />

                    <p className="gd-eyebrow px-2 pb-1.5">Overlays</p>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-[2px] px-2 py-2 transition-colors hover:bg-white/[0.04]">
                        <span
                            className={clsx(
                                'h-4 w-[2px] shrink-0 rounded-[1px]',
                                trafficEnabled ? 'bg-brand-info' : 'bg-white/10',
                            )}
                        />
                        <Car
                            size={14}
                            strokeWidth={1.75}
                            className={clsx('shrink-0', trafficEnabled ? 'text-brand-info' : 'text-slate-400')}
                        />
                        <span className={clsx('flex-1 text-[13px]', trafficEnabled ? 'text-white' : 'text-slate-300')}>
                            Live traffic
                        </span>
                        <input
                            type="checkbox"
                            checked={trafficEnabled}
                            onChange={(e) => setTrafficEnabled(e.target.checked)}
                            className="h-3.5 w-3.5 cursor-pointer rounded-[2px] border-dark-500 bg-dark-900 text-brand-info"
                        />
                    </label>

                    {setComparisonMode && (
                        <>
                            <div className="my-2 h-px bg-white/[0.07]" />
                            <p className="gd-eyebrow px-2 pb-1.5">Street view</p>
                            <button
                                onClick={() => { setComparisonMode(!comparisonMode); setIsOpen(false); }}
                                className={clsx(
                                    'flex w-full items-center gap-2.5 rounded-[2px] px-2 py-2 text-left transition-colors',
                                    comparisonMode ? 'bg-brand-accent/10' : 'hover:bg-white/[0.04]',
                                )}
                            >
                                <span
                                    className={clsx(
                                        'h-4 w-[2px] shrink-0 rounded-[1px]',
                                        comparisonMode ? 'bg-brand-accent' : 'bg-white/10',
                                    )}
                                />
                                <GitCompare
                                    size={14}
                                    strokeWidth={1.75}
                                    className={clsx('shrink-0', comparisonMode ? 'text-brand-accent' : 'text-slate-400')}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className={clsx('block text-[13px] leading-tight', comparisonMode ? 'text-white' : 'text-slate-300')}>
                                        Comparison view
                                    </span>
                                    <span className="gd-eyebrow mt-0.5 block normal-case tracking-[0.1em] text-slate-600">
                                        {comparisonMode ? 'Armed — click a node' : 'Compare two street epochs'}
                                    </span>
                                </span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
