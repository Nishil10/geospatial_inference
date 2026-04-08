import { useState, useCallback } from 'react';

export interface StreetViewImage {
  id: string;
  capturedAt: number;
  latlng: [number, number];
  url: string;
}

export interface DualStreetView {
  older: StreetViewImage | null;
  newer: StreetViewImage | null;
  location: [number, number];
}

export interface CoveragePoint {
  id: string;
  latlng: [number, number];
}

export const useMapillary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coveragePoints, setCoveragePoints] = useState<CoveragePoint[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(false);

  // Fetch coverage points for visible map area
  const fetchCoveragePoints = useCallback(
    async (bounds: { north: number; south: number; east: number; west: number }) => {
      setLoadingCoverage(true);

      try {
        const apiKey = import.meta.env.VITE_MAPILLARY_API_KEY;

        if (!apiKey) {
          setCoveragePoints([]);
          setLoadingCoverage(false);
          return;
        }

        // Fetch maximum coverage points to show dense green dots along roads
        const searchUrl = new URL('https://graph.mapillary.com/images');
        searchUrl.searchParams.append('fields', 'id,geometry');
        searchUrl.searchParams.append('bbox', `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
        searchUrl.searchParams.append('limit', '2000'); // Maximum to get dense coverage
        searchUrl.searchParams.append('access_token', apiKey);

        const response = await fetch(searchUrl.toString());

        if (!response.ok) {
          setCoveragePoints([]);
          setLoadingCoverage(false);
          return;
        }

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
          setCoveragePoints([]);
          setLoadingCoverage(false);
          return;
        }

        // Use all points for dense coverage display (like Mapillary's green dots)
        const points: CoveragePoint[] = data.data.map((img: any) => ({
          id: img.id,
          latlng: [img.geometry.coordinates[1], img.geometry.coordinates[0]] as [number, number],
        }));

        setCoveragePoints(points);
        setLoadingCoverage(false);
      } catch {
        setCoveragePoints([]);
        setLoadingCoverage(false);
      }
    },
    []
  );

  const clearCoveragePoints = useCallback(() => {
    setCoveragePoints([]);
  }, []);

  const fetchStreetViewImages = useCallback(
    async (latitude: number, longitude: number): Promise<DualStreetView> => {
      setLoading(true);
      setError(null);

      try {
        const apiKey = import.meta.env.VITE_MAPILLARY_API_KEY;

        if (!apiKey) {
          throw new Error('Mapillary API key not configured. Please add VITE_MAPILLARY_API_KEY to .env.local');
        }

        // Search for image sequences near the clicked location
        const searchUrl = new URL('https://graph.mapillary.com/images');
        searchUrl.searchParams.append('fields', 'id,geometry,captured_at,thumb_256_url');
        searchUrl.searchParams.append('bbox', `${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}`);
        searchUrl.searchParams.append('limit', '100');
        searchUrl.searchParams.append('access_token', apiKey);

        const response = await fetch(searchUrl.toString());

        if (!response.ok) {
          throw new Error(`Mapillary API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
          throw new Error('No street view images available for this location');
        }

        // Sort images by capture date
        const sortedImages = data.data.sort((a: any, b: any) => {
          return new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime();
        });

        // Get oldest and newest images
        const olderImage = sortedImages[0];
        const newerImage = sortedImages[sortedImages.length - 1];

        const result: DualStreetView = {
          older: olderImage
            ? {
                id: olderImage.id,
                capturedAt: new Date(olderImage.captured_at).getTime(),
                latlng: [olderImage.geometry.coordinates[1], olderImage.geometry.coordinates[0]],
                url: olderImage.thumb_256_url,
              }
            : null,
          newer: newerImage
            ? {
                id: newerImage.id,
                capturedAt: new Date(newerImage.captured_at).getTime(),
                latlng: [newerImage.geometry.coordinates[1], newerImage.geometry.coordinates[0]],
                url: newerImage.thumb_256_url,
              }
            : null,
          location: [latitude, longitude],
        };

        setLoading(false);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch street view images';
        setError(errorMessage);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  return {
    fetchStreetViewImages,
    fetchCoveragePoints,
    clearCoveragePoints,
    coveragePoints,
    loadingCoverage,
    loading,
    error,
  };
};
