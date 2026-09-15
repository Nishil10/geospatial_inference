import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Rectangle, CircleMarker, useMapEvents, Tooltip } from 'react-leaflet';
import { mockRegions } from '../utils/regions';
import type { Region } from '../utils/regions';
import type { BaseLayerType } from './LayerControls';
import type { Map as LeafletMap, LatLngBoundsExpression } from 'leaflet';
import type { CoveragePoint } from '../utils/useMapillary';

interface MapAreaProps {
    selectedRegion: Region | null;
    onRegionSelect: (region: Region) => void;
    baseLayer: BaseLayerType;
    trafficEnabled: boolean;
    onMapReady?: (map: LeafletMap) => void;
    onMapClick?: (coords: [number, number]) => void;
    comparisonMode?: boolean;
    coveragePoints?: CoveragePoint[];
    onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

// Component to handle map click events and bounds changes
function MapClickHandler({ 
    onMapClick, 
    comparisonMode,
    onBoundsChange 
}: { 
    onMapClick?: (coords: [number, number]) => void; 
    comparisonMode?: boolean;
    onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Leaflet fires moveend after a zoom too, so this covers both gestures.
    const map = useMapEvents({
        click: (e) => {
            if (onMapClick && comparisonMode) {
                const { lat, lng } = e.latlng;
                onMapClick([lat, lng]);
            }
        },
        // A coverage refresh fans out into several Mapillary requests, so settle
        // first instead of firing on every intermediate pan/zoom frame.
        moveend: () => {
            if (!onBoundsChange) return;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
                const bounds = map.getBounds();
                onBoundsChange({
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                });
            }, 400);
        },
    });

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    return null;
}

export default function MapArea({ selectedRegion, onRegionSelect, baseLayer, trafficEnabled, onMapReady, onMapClick, comparisonMode, coveragePoints, onBoundsChange }: MapAreaProps) {
    const showRegionBoxes = false;

    return (
        <div className={`relative z-0 h-full w-full flex-1 bg-dark-900 ${comparisonMode ? 'cursor-crosshair' : ''}`}>
            {/* Map-sheet framing. Corner ticks sit over the plate at all times;
                arming comparison mode lights them and adds a hairline rebate,
                which reads as a mode change without the 4px border shouting. */}
            <div
                aria-hidden="true"
                className={`gd-ticks pointer-events-none absolute inset-0 z-10 ${comparisonMode ? 'gd-ticks-accent' : ''}`}
            />
            {comparisonMode && (
                <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]" />
            )}
            <MapContainer
                center={[37.7749, -122.4194]}
                zoom={13}
                minZoom={3}
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%', background: '#080e1a' }}
                zoomControl={false}
                ref={onMapReady}
            >
                <MapClickHandler onMapClick={onMapClick} comparisonMode={comparisonMode} onBoundsChange={onBoundsChange} />
                {baseLayer === 'dark' && (
                    <TileLayer
                        key="dark"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        className="dark-tiles"
                        noWrap={true}
                        bounds={[[-90, -180], [90, 180]]}
                    />
                )}
                {baseLayer === 'satellite' && (
                    <TileLayer
                        key="satellite"
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        noWrap={true}
                        bounds={[[-90, -180], [90, 180]]}
                    />
                )}
                {baseLayer === 'street' && (
                    <TileLayer
                        key="street"
                        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        noWrap={true}
                        bounds={[[-90, -180], [90, 180]]}
                    />
                )}

                {trafficEnabled && (
                    <TileLayer
                        key="traffic"
                        attribution='&copy; Google'
                        url="https://mt1.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}"
                        opacity={0.8}
                        className="hue-rotate-15 contrast-125"
                        noWrap={true}
                        bounds={[[-90, -180], [90, 180]]}
                    />
                )}
                {showRegionBoxes && mockRegions.map(region => (
                    <Rectangle
                        key={region.id}
                        bounds={region.bounds as LatLngBoundsExpression}
                        pathOptions={{
                            color: selectedRegion?.id === region.id ? '#10b981' : '#3b82f6',
                            weight: selectedRegion?.id === region.id ? 3 : 1,
                            fillOpacity: selectedRegion?.id === region.id ? 0.35 : 0.1
                        }}
                        eventHandlers={{
                            click: () => onRegionSelect(region)
                        }}
                    />
                ))}

                {/* Coverage points - show only in comparison mode */}
                {comparisonMode && coveragePoints && coveragePoints.map((point) => (
                    <CircleMarker
                        key={point.id}
                        center={point.latlng}
                        radius={4}
                        pathOptions={{
                            color: '#042f2e',
                            fillColor: '#10b981',
                            fillOpacity: 0.95,
                            weight: 1.5,
                        }}
                        eventHandlers={{
                            click: () => {
                                if (onMapClick && comparisonMode) {
                                    onMapClick(point.latlng);
                                }
                            }
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -6]} opacity={0.9}>
                            <span>Street view node{comparisonMode ? <><br />Click to compare</> : ''}</span>
                        </Tooltip>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}
