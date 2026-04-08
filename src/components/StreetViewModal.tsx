import { X, Calendar, MapPin, AlertCircle } from 'lucide-react';
import type { DualStreetView } from '../utils/useMapillary';

interface StreetViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DualStreetView | null;
  loading: boolean;
  error: string | null;
}

export default function StreetViewModal({ isOpen, onClose, data, loading, error }: StreetViewModalProps) {
  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-dark-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-accent-green" />
            Street View Comparison
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-dark-600 border-t-accent-green rounded-full mb-4"></div>
              <p className="text-slate-300">Loading street view images...</p>
            </div>
          )}

          {error && (
            <div className="bg-alert-red bg-opacity-10 border border-alert-red rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-alert-red flex-shrink-0" />
              <div>
                <p className="font-semibold text-alert-red">Error</p>
                <p className="text-slate-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {data && !loading && !error && (
            <div>
              {/* Location Info with Street View Availability Indicator */}
              <div className="mb-6 p-4 bg-dark-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Coordinates: {formatCoordinates(data.location[0], data.location[1])}
                  </p>
                  {/* Green dot indicator showing street view availability */}
                  <div className="flex items-center gap-2 bg-accent-green/10 px-3 py-1.5 rounded-full border border-accent-green/30">
                    <div className="w-3 h-3 rounded-full bg-accent-green shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
                    <span className="text-accent-green text-xs font-medium">Street View Available</span>
                  </div>
                </div>
              </div>

              {/* Dual View Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current/Latest Image - Show first on LEFT */}
                <div className="rounded-lg overflow-hidden bg-dark-700">
                  <div className="relative aspect-video bg-dark-600">
                    {data.newer ? (
                      <>
                        <img
                          src={data.newer.url}
                          alt="Street view - current"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-3">
                          <div className="flex items-center gap-2 text-info-blue text-sm font-semibold">
                            <Calendar className="w-4 h-4" />
                            {formatDate(data.newer.capturedAt)}
                          </div>
                          <p className="text-slate-300 text-xs mt-1">📍 Current Street View</p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        No current image available
                      </div>
                    )}
                  </div>
                  {data.newer && (
                    <div className="p-3 border-t border-dark-600">
                      <p className="text-xs text-slate-400">
                        📍 {formatCoordinates(data.newer.latlng[0], data.newer.latlng[1])}
                      </p>
                    </div>
                  )}
                </div>

                {/* Historical/Older Image - Show second on RIGHT */}
                <div className="rounded-lg overflow-hidden bg-dark-700">
                  <div className="relative aspect-video bg-dark-600">
                    {data.older ? (
                      <>
                        <img
                          src={data.older.url}
                          alt="Street view - historical"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-3">
                          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                            <Calendar className="w-4 h-4" />
                            {formatDate(data.older.capturedAt)}
                          </div>
                          <p className="text-slate-300 text-xs mt-1">🕰️ Historical Street View</p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        No historical image available
                      </div>
                    )}
                  </div>
                  {data.older && (
                    <div className="p-3 border-t border-dark-600">
                      <p className="text-xs text-slate-400">
                        📍 {formatCoordinates(data.older.latlng[0], data.older.latlng[1])}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Time Difference */}
              {data.older && data.newer && (
                <div className="mt-4 p-4 bg-accent-green bg-opacity-10 border border-accent-green rounded-lg">
                  <p className="text-accent-green font-semibold">
                    📊 Time span: {Math.round((data.newer.capturedAt - data.older.capturedAt) / (1000 * 60 * 60 * 24 * 365.25))} years
                  </p>
                </div>
              )}

              {/* Attribution */}
              <div className="mt-4 pt-4 border-t border-dark-600">
                <p className="text-xs text-slate-500">
                  📸 Street view images provided by{' '}
                  <a href="https://www.mapillary.com" target="_blank" rel="noopener noreferrer" className="text-accent-green hover:underline">
                    Mapillary
                  </a>
                </p>
              </div>
            </div>
          )}

          {!loading && !error && !data && (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <p>No data available. Try clicking on another location.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
