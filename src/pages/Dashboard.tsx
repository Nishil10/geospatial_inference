import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MapArea from '../components/MapArea';
import Timeline from '../components/Timeline';
import StreetViewModal from '../components/StreetViewModal';
import type { Region } from '../utils/regions';
import { Navigate } from 'react-router-dom';
import type { BaseLayerType } from '../components/LayerControls';
import type { Map as LeafletMap } from 'leaflet';
import { useMapillary } from '../utils/useMapillary';
import type { DualStreetView } from '../utils/useMapillary';
import { useCityInsights } from '../utils/useCityInsights';
import type { CityResult } from '../components/CitySearch';

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

export default function Dashboard() {
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
    const [activeYear, setActiveYear] = useState<number>(YEARS[YEARS.length - 1]);
    const [baseLayer, setBaseLayer] = useState<BaseLayerType>('dark');
    const [trafficEnabled, setTrafficEnabled] = useState(false);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
    const [streetViewOpen, setStreetViewOpen] = useState(false);
    const [streetViewData, setStreetViewData] = useState<DualStreetView | null>(null);
    const [streetViewFix, setStreetViewFix] = useState<[number, number] | null>(null);
    const { 
        fetchStreetViewImages, 
        fetchCoveragePoints,
        clearCoveragePoints,
        coveragePoints,
        loadingCoverage,
        coverageNotice,
        loading: streetViewLoading,
        error: streetViewError,
        configured: mapillaryConfigured
    } = useMapillary();

    const { data: insights, loading: insightsLoading, error: insightsError, load: loadInsights, retry: retryInsights } = useCityInsights();
    const [requested, setRequested] = useState<{ lat: number; lon: number } | null>(null);
    const lastReadKey = useRef<string | null>(null);

    const handleRegionFlyTo = (coords: [number, number], zoom: number) => {
        if (mapInstance) {
            mapInstance.flyTo(coords, zoom, { duration: 1.5 });
        }
    };

    const handleCitySelect = (city: CityResult) => {
        if (mapInstance) {
            mapInstance.flyTo([city.lat, city.lon], 13, { duration: 1.5 });
        }
    };

    // Read whatever the map is centred on. Each read costs a live Overpass
    // query, so wait for the pan to settle and skip nudges too small to change
    // the server's cache key (it rounds coordinates to 2dp, roughly 1.1km).
    useEffect(() => {
        if (!mapInstance) return;

        let timer: number;
        const read = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                const c = mapInstance.getCenter();
                const key = `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
                if (lastReadKey.current === key) return;
                lastReadKey.current = key;
                setRequested({ lat: c.lat, lon: c.lng });
                loadInsights(c.lat, c.lng);
            }, 800);
        };

        read();
        mapInstance.on('moveend', read);
        return () => {
            window.clearTimeout(timer);
            mapInstance.off('moveend', read);
        };
    }, [mapInstance, loadInsights]);

    const handleMapClick = async (coords: [number, number]) => {
        // Only trigger street view comparison when comparison mode is enabled
        if (!comparisonMode) return;

        setStreetViewFix(coords);
        try {
            const data = await fetchStreetViewImages(coords[0], coords[1]);
            setStreetViewData(data);
            setStreetViewOpen(true);
        } catch {
            // Error is handled in useMapillary hook and displayed in modal
            setStreetViewData(null);
            setStreetViewOpen(true);
        }
    };

    // Load coverage points only when comparison mode is active
    const handleBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
        if (!comparisonMode) return;
        fetchCoveragePoints(bounds);
    }, [comparisonMode, fetchCoveragePoints]);

    // Load or clear coverage points based on comparison mode
    useEffect(() => {
        if (!mapInstance) return;

        if (!comparisonMode) {
            clearCoveragePoints();
            return;
        }

        const bounds = mapInstance.getBounds();
        fetchCoveragePoints({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
        });
    }, [comparisonMode, mapInstance, fetchCoveragePoints, clearCoveragePoints]);

    // Mock protected route
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen w-full flex-col bg-dark-900 text-slate-200 selection:bg-brand-accent selection:text-dark-900">
            <Header
                baseLayer={baseLayer}
                setBaseLayer={setBaseLayer}
                trafficEnabled={trafficEnabled}
                setTrafficEnabled={setTrafficEnabled}
                comparisonMode={comparisonMode}
                setComparisonMode={setComparisonMode}
                onRegionFlyTo={handleRegionFlyTo}
                onCitySelect={handleCitySelect}
                coords={requested}
            />
            <div className="relative flex flex-1 overflow-hidden">
                <MapArea
                    selectedRegion={selectedRegion}
                    onRegionSelect={setSelectedRegion}
                    baseLayer={baseLayer}
                    trafficEnabled={trafficEnabled}
                    onMapReady={setMapInstance}
                    onMapClick={handleMapClick}
                    comparisonMode={comparisonMode}
                    coveragePoints={coveragePoints}
                    onBoundsChange={handleBoundsChange}
                />

                {/* ---- Comparison mode -------------------------------------------
                    An armed instrument states its mode and what it wants next. One
                    LED, two mono clauses — no emoji, and no pulsing pill: the dot
                    carries the liveness so the text can stay still and readable. */}
                {comparisonMode && (
                    <>
                        <div className="glass-panel absolute left-1/2 top-4 z-[1000] flex -translate-x-1/2 items-center gap-2.5 px-3 py-1.5">
                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                                {mapillaryConfigured && (
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-accent opacity-60 motion-reduce:hidden" />
                                )}
                                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${mapillaryConfigured ? 'bg-brand-accent' : 'bg-brand-warning'}`} />
                            </span>
                            <span className={`font-mono text-[10px] uppercase tracking-label ${mapillaryConfigured ? 'text-brand-accent' : 'text-brand-warning'}`}>
                                {mapillaryConfigured ? 'Comparison armed' : 'Comparison unavailable'}
                            </span>
                            <span aria-hidden="true" className="h-3 w-px bg-white/10" />
                            <span className="font-mono text-[10px] uppercase tracking-label text-slate-400">
                                {mapillaryConfigured ? 'Select a node' : 'No Mapillary token'}
                            </span>
                        </div>

                        <div className="glass-panel absolute bottom-28 left-4 z-[1000] w-[210px] px-3 py-2.5">
                            <p className="gd-eyebrow">Key</p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-brand-accent ring-1 ring-[#042f2e]" />
                                <span className="text-[11px] text-slate-300">Street view node</span>
                            </div>
                            <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
                                {!mapillaryConfigured
                                    ? 'Set VITE_MAPILLARY_API_KEY in .env, then restart the dev server.'
                                    : loadingCoverage
                                      ? 'Loading coverage…'
                                      : coverageNotice ?? 'Click a node to compare epochs.'}
                            </p>
                        </div>
                    </>
                )}

                <Sidebar
                    insights={insights}
                    loading={insightsLoading}
                    error={insightsError}
                    onRetry={retryInsights}
                    requested={requested}
                />
                <Timeline
                    years={YEARS}
                    activeYear={activeYear}
                    onChange={setActiveYear}
                />
            </div>
            <StreetViewModal
                isOpen={streetViewOpen}
                onClose={() => setStreetViewOpen(false)}
                data={streetViewData}
                fix={streetViewFix}
                loading={streetViewLoading}
                error={streetViewError}
            />
        </div>
    );
}
