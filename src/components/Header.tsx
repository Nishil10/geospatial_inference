import { Satellite, AlertTriangle } from 'lucide-react';
import LayerControls from './LayerControls';
import type { BaseLayerType } from './LayerControls';
import RegionsDropdown from './RegionsDropdown';

interface HeaderProps {
    baseLayer?: BaseLayerType;
    setBaseLayer?: (layer: BaseLayerType) => void;
    trafficEnabled?: boolean;
    setTrafficEnabled?: (enabled: boolean) => void;
    comparisonMode?: boolean;
    setComparisonMode?: (enabled: boolean) => void;
    onRegionFlyTo?: (coords: [number, number], zoom: number) => void;
}

export default function Header({ baseLayer, setBaseLayer, trafficEnabled, setTrafficEnabled, comparisonMode, setComparisonMode, onRegionFlyTo }: HeaderProps) {
    return (
        <header className="h-16 bg-dark-900 border-b border-dark-700/50 flex items-center justify-between px-6 z-[1010] relative drop-shadow-md">
            <div className="flex items-center gap-3">
                <div className="bg-brand-accent/10 p-2 rounded-lg text-brand-accent">
                    <Satellite size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        Geo Detect
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-dark-700 text-slate-300">v1.2</span>
                    </h1>
                    <p className="text-xs text-slate-400">Geospatial Change Monitoring</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {baseLayer && setBaseLayer && setTrafficEnabled !== undefined ? (
                    <LayerControls
                        baseLayer={baseLayer}
                        setBaseLayer={setBaseLayer}
                        trafficEnabled={trafficEnabled!}
                        setTrafficEnabled={setTrafficEnabled}
                        comparisonMode={comparisonMode}
                        setComparisonMode={setComparisonMode}
                    />
                ) : null}
                {onRegionFlyTo && (
                    <RegionsDropdown onFlyTo={onRegionFlyTo} />
                )}
                <div className="w-px h-6 bg-dark-700 mx-2"></div>
                <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg bg-dark-800 border border-dark-600 hover:border-brand-accent/50 hover:bg-dark-700 transition-all text-white">
                    <AlertTriangle size={16} className="text-brand-warning" />
                    <span>Active Alerts</span>
                </button>
            </div>
        </header>
    );
}
