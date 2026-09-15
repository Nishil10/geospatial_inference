import { LogOut, Radio } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Mark from './Mark';
import LayerControls from './LayerControls';
import type { BaseLayerType } from './LayerControls';
import RegionsDropdown from './RegionsDropdown';
import CitySearch from './CitySearch';
import type { CityResult } from './CitySearch';

interface HeaderProps {
    baseLayer?: BaseLayerType;
    setBaseLayer?: (layer: BaseLayerType) => void;
    trafficEnabled?: boolean;
    setTrafficEnabled?: (enabled: boolean) => void;
    comparisonMode?: boolean;
    setComparisonMode?: (enabled: boolean) => void;
    onRegionFlyTo?: (coords: [number, number], zoom: number) => void;
    onCitySelect?: (city: CityResult) => void;
    /** The map centre currently being read. Rendered as the live fix. */
    coords?: { lat: number; lon: number } | null;
}

/** Decimal degrees with a hemisphere letter, the way a survey sheet prints it. */
const fix = (v: number, pos: string, neg: string) =>
    `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;

export default function Header({
    baseLayer,
    setBaseLayer,
    trafficEnabled,
    setTrafficEnabled,
    comparisonMode,
    setComparisonMode,
    onRegionFlyTo,
    onCitySelect,
    coords,
}: HeaderProps) {
    const onFeed = useLocation().pathname === '/feed';
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
    };

    return (
        <header className="relative z-[1010] flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] bg-dark-900 px-4 sm:px-5">
            {/* The seam, running along the underside of the chrome. */}
            <span aria-hidden="true" className="gd-rule absolute inset-x-0 bottom-[-1px]" />

            {/* Brand lockup — quotes AuthLayout so login -> dashboard reads continuous. */}
            <Link to="/" className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-80">
                <Mark size={26} className="text-slate-400" />
                <div className="hidden sm:block">
                    <p className="text-[13px] font-semibold uppercase leading-none tracking-brand text-white">
                        Geo Detect
                    </p>
                    <p className="gd-eyebrow mt-1.5">Urban Change Detection</p>
                </div>
            </Link>

            {/* Live fix. Real data or nothing — the readout is simply absent on
                pages that have no map centre to report. */}
            {coords && (
                <div className="hidden min-w-0 flex-1 items-baseline justify-center gap-3 xl:flex">
                    <span className="gd-eyebrow shrink-0">Fix</span>
                    <p className="gd-readout truncate text-[11px] text-slate-300">
                        {fix(coords.lat, 'N', 'S')} &nbsp;{fix(coords.lon, 'E', 'W')}
                    </p>
                    <span className="gd-eyebrow shrink-0 text-slate-600">EPSG:4326</span>
                </div>
            )}

            <div className="flex shrink-0 items-center gap-1.5">
                {onCitySelect && <CitySearch onSelect={onCitySelect} />}

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

                {onRegionFlyTo && <RegionsDropdown onFlyTo={onRegionFlyTo} />}

                <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-white/10" />

                {!onFeed && (
                    <Link
                        to="/feed"
                        className="flex items-center gap-2 rounded-[3px] border border-brand-accent/30 bg-brand-accent/10 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-label text-brand-accent transition-colors hover:bg-brand-accent/20"
                    >
                        <Radio size={13} strokeWidth={2} />
                        <span>Civic Feed</span>
                    </Link>
                )}

                <button
                    onClick={handleLogout}
                    className="group flex items-center gap-2 rounded-[3px] border border-transparent px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-label text-slate-400 transition-colors hover:border-brand-alert/30 hover:bg-brand-alert/10 hover:text-red-300"
                >
                    <LogOut size={13} strokeWidth={2} />
                    <span>Log out</span>
                </button>
            </div>
        </header>
    );
}
