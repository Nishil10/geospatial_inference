import { useEffect, useState, useMemo } from 'react';
import { Activity, Building2, Trees, CarFront, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Region } from '../utils/regions';

interface SidebarProps {
    className?: string;
    selectedRegion: Region | null;
    activeYear: number;
}

const generateMockData = (seed: number) => {
    return [2019, 2020, 2021, 2022, 2023, 2024].map((year, i) => ({
        year: year.toString(),
        building: Math.floor(100 + seed * 20 + i * 40 + Math.random() * 50),
        vegetation: Math.floor(400 - seed * 10 - i * 15 + Math.random() * 40),
        traffic: Math.floor(150 + seed * 15 + i * 50 + Math.random() * 60)
    }));
};

export default function Sidebar({ className, selectedRegion, activeYear }: SidebarProps) {
    const [chartData, setChartData] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        if (selectedRegion) {
            const seed = selectedRegion.id.charCodeAt(0) % 10;
            setChartData(generateMockData(seed));
        } else {
            setChartData(generateMockData(1));
        }
    }, [selectedRegion]);

    // Find specific year data for cards
    const currentData = useMemo(() => {
        return chartData.find(d => d.year === activeYear.toString()) || {
            building: 0, vegetation: 0, traffic: 0, year: activeYear.toString()
        };
    }, [chartData, activeYear]);

    // Derived percentages simulating growth vs previous year
    const prevData = useMemo(() => {
        const prevYear = (activeYear - 1).toString();
        return chartData.find(d => d.year === prevYear) || currentData;
    }, [chartData, activeYear, currentData]);

    const getPercent = (curr: number, prev: number) => {
        if (!prev) return '+0.0';
        const diff = ((curr - prev) / prev) * 100;
        return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`;
    };

    return (
        <div className={`absolute top-4 right-0 z-[1000] bottom-4 flex items-start pointer-events-auto transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-1.5rem)]'}`}>
            {/* Toggle button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-6 h-12 bg-dark-800 border border-dark-600 border-r-0 rounded-l-md hover:bg-dark-700 transition-colors mt-8"
            >
                {isOpen ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronLeft size={16} className="text-slate-400" />}
            </button>

            {/* Sidebar content */}
            <aside className={`glass-panel flex flex-col overflow-hidden w-80 lg:w-96 h-full mr-4 shadow-2xl`}>
                <div className="p-5 border-b border-dark-700/50 bg-dark-800/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-brand-info" />
                        Change Report - {activeYear}
                    </h2>
                    {selectedRegion ? (
                        <p className="text-sm font-medium text-brand-accent mt-1 flex items-center gap-1">
                            <Info size={14} />
                            Analyzing: {selectedRegion.name}
                        </p>
                    ) : (
                        <p className="text-sm text-slate-400 mt-1">Select a region on the map to analyze changes over time.</p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 pb-6 space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-dark-900/80 p-3 flex flex-col gap-1 rounded-xl border border-dark-700/50 hover:border-brand-info/50 transition-colors">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                <Building2 size={14} className="text-brand-info" />
                                Buildings
                            </div>
                            <div className="text-2xl font-bold text-white transition-all">
                                {currentData.building.toLocaleString()}
                            </div>
                            <div className={`text-xs mt-1 ${getPercent(currentData.building, prevData.building).startsWith('-') ? 'text-brand-alert' : 'text-brand-accent'}`}>
                                {getPercent(currentData.building, prevData.building)}% vs {activeYear - 1}
                            </div>
                        </div>
                        <div className="bg-dark-900/80 p-3 flex flex-col gap-1 rounded-xl border border-dark-700/50 hover:border-brand-accent/50 transition-colors">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                <Trees size={14} className="text-brand-accent" />
                                Vegetation
                            </div>
                            <div className="text-2xl font-bold text-white transition-all">
                                {currentData.vegetation.toLocaleString()}
                            </div>
                            <div className={`text-xs mt-1 ${getPercent(currentData.vegetation, prevData.vegetation).startsWith('-') ? 'text-brand-alert' : 'text-brand-accent'}`}>
                                {getPercent(currentData.vegetation, prevData.vegetation)}% vs {activeYear - 1}
                            </div>
                        </div>
                        <div className="bg-dark-900/80 p-3 flex flex-col gap-1 rounded-xl border border-dark-700/50 col-span-2 hover:border-brand-warning/50 transition-colors">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                <CarFront size={14} className="text-brand-warning" />
                                Traffic Density (Vol)
                            </div>
                            <div className="text-2xl font-bold text-white transition-all">
                                {currentData.traffic.toLocaleString()}
                            </div>
                            <div className="flex items-center justify-between text-xs mt-1">
                                <span className={`${getPercent(currentData.traffic, prevData.traffic).startsWith('-') ? 'text-brand-accent' : 'text-brand-alert'}`}>
                                    {getPercent(currentData.traffic, prevData.traffic)}% vs {activeYear - 1}
                                </span>
                                <span className={currentData.traffic > 300 ? 'text-brand-warning bg-brand-warning/10 px-2 py-0.5 rounded-full' : 'text-slate-400'}>
                                    {currentData.traffic > 300 ? 'High Congestion' : 'Normal'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex justify-between items-center">
                            Historical Trend
                            <span className="text-xs bg-dark-700/50 px-2 py-1 rounded text-slate-400">{activeYear} Active</span>
                        </h3>
                        <div className="h-48 w-full bg-dark-900/50 rounded-xl p-2 border border-dark-700/50 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorBuilding" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorVeg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ fontSize: 12 }}
                                        labelStyle={{ fontSize: 12, color: '#94a3b8' }}
                                    />
                                    <ReferenceLine x={activeYear.toString()} stroke="#f59e0b" strokeDasharray="3 3" />
                                    <Area type="monotone" dataKey="building" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBuilding)" strokeWidth={2} name="Buildings" animationDuration={500} />
                                    <Area type="monotone" dataKey="vegetation" stroke="#10b981" fillOpacity={1} fill="url(#colorVeg)" strokeWidth={2} name="Vegetation" animationDuration={500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}
