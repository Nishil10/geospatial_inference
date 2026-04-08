export interface Region {
    id: string;
    name: string;
    bounds: [[number, number], [number, number]];
}

export const mockRegions: Region[] = [
    { id: '1', name: 'Downtown Financial Sector', bounds: [[37.77, -122.41], [37.78, -122.40]] },
    { id: '2', name: 'Industrial Zone B', bounds: [[37.76, -122.43], [37.77, -122.42]] },
    { id: '3', name: 'North Residential Expansion', bounds: [[37.79, -122.44], [37.80, -122.42]] },
    { id: '4', name: 'Eastern Port Infrastructure', bounds: [[37.75, -122.39], [37.76, -122.38]] },
];
