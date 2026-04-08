import { useState, useEffect, useCallback } from 'react';
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
    const { 
        fetchStreetViewImages, 
        fetchCoveragePoints,
        clearCoveragePoints,
        coveragePoints,
        loading: streetViewLoading, 
        error: streetViewError 
    } = useMapillary();

    const handleRegionFlyTo = (coords: [number, number], zoom: number) => {
        if (mapInstance) {
            mapInstance.flyTo(coords, zoom, { duration: 1.5 });
        }
    };

    const handleMapClick = async (coords: [number, number]) => {
        // Only trigger street view comparison when comparison mode is enabled
        if (!comparisonMode) return;
        
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
        <div className="flex flex-col h-screen w-full bg-dark-900 text-slate-200 font-sans selection:bg-brand-accent selection:text-dark-900">
            <Header
                baseLayer={baseLayer}
                setBaseLayer={setBaseLayer}
                trafficEnabled={trafficEnabled}
                setTrafficEnabled={setTrafficEnabled}
                comparisonMode={comparisonMode}
                setComparisonMode={setComparisonMode}
                onRegionFlyTo={handleRegionFlyTo}
            />
            <div className="flex flex-1 overflow-hidden relative">
                {/* Comparison Mode Indicator */}
                {comparisonMode && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-brand-accent/90 text-dark-900 px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2 animate-pulse">
                        📸 Comparison Mode Active - Click on green dots to view street comparison
                    </div>
                )}

                {comparisonMode && (
                    <div className="absolute bottom-24 left-4 z-[1000] bg-dark-800/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg border border-dark-600">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                                <span className="text-xs font-medium text-slate-300">Street View Available</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Hover over dots • Click to compare</p>
                    </div>
                )}

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
                <Sidebar
                    selectedRegion={selectedRegion}
                    activeYear={activeYear}
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
                loading={streetViewLoading}
                error={streetViewError}
            />
        </div>
    );
}
