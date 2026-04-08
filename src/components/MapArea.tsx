import { MapContainer, TileLayer, Rectangle, CircleMarker, useMapEvents, Tooltip } from 'react-leaflet';
import { mockRegions } from '../utils/regions';
import type { Region } from '../utils/regions';
import type { BaseLayerType } from './LayerControls';
import type { Map as LeafletMap } from 'leaflet';
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
    const map = useMapEvents({
        click: (e) => {
            if (onMapClick && comparisonMode) {
                const { lat, lng } = e.latlng;
                onMapClick([lat, lng]);
            }
        },
        moveend: () => {
            // Always update bounds to load coverage points
            if (onBoundsChange) {
                const bounds = map.getBounds();
                onBoundsChange({
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                });
            }
        },
        zoomend: () => {
            // Always update bounds to load coverage points
            if (onBoundsChange) {
                const bounds = map.getBounds();
                onBoundsChange({
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                });
            }
        },
    });
    return null;
}

export default function MapArea({ selectedRegion, onRegionSelect, baseLayer, trafficEnabled, onMapReady, onMapClick, comparisonMode, coveragePoints, onBoundsChange }: MapAreaProps) {
    const showRegionBoxes = false;

    return (
        <div className={`flex-1 h-full w-full bg-dark-800 relative z-0 ${comparisonMode ? 'cursor-crosshair' : ''}`}>
            {/* Comparison mode border indicator */}
            {comparisonMode && (
                <div className="absolute inset-0 border-4 border-brand-accent/50 pointer-events-none z-10 rounded-sm" />
            )}
            <MapContainer
                center={[37.7749, -122.4194]}
                zoom={13}
                minZoom={3}
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%', background: '#0f172a' }}
                zoomControl={false}
                ref={onMapReady}
            >
                <MapClickHandler onMapClick={onMapClick} comparisonMode={comparisonMode} onBoundsChange={onBoundsChange} />
                {baseLayer === 'dark' && (
                    <TileLayer
                        key="dark"
                        attribution='&copy; <a href="https://carto.com/">Carto</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
                        bounds={region.bounds as any}
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
                            color: '#065f46',
                            fillColor: '#10b981',
                            fillOpacity: 1,
                            weight: 1,
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
                            <span className="text-xs font-medium">📸 Street View Available{comparisonMode ? <><br/>Click to compare</> : ''}</span>
                        </Tooltip>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}
