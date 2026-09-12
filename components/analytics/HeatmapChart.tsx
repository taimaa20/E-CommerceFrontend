"use client";

import { HeatmapDataDto } from '@/types/analytics';
import { useState } from 'react';
import { usePosStore } from '@/store/posStore';
import { formatCurrency } from '@/lib/currencies';

interface HeatmapProps {
    data: HeatmapDataDto[];
}

// Color calculation based on intensity level
const getIntensityColor = (intensity: number): string => {
    if (intensity === 0) return 'bg-gray-800/50 border-gray-700';

    // Intensity level gradient
    if (intensity < 0.2) return 'bg-blue-900/40 border-blue-800/50 hover:bg-blue-900/60';
    if (intensity < 0.4) return 'bg-cyan-800/50 border-cyan-700/50 hover:bg-cyan-800/70';
    if (intensity < 0.6) return 'bg-emerald-700/60 border-emerald-600/50 hover:bg-emerald-700/80';
    if (intensity < 0.8) return 'bg-amber-600/70 border-amber-500/50 hover:bg-amber-600/90';
    return 'bg-red-600/80 border-red-500/60 hover:bg-red-600/100';
};

// Intensity level label
const getIntensityLabel = (intensity: number): string => {
    if (intensity === 0) return 'No Data';
    if (intensity < 0.2) return 'Very Low';
    if (intensity < 0.4) return 'Low';
    if (intensity < 0.6) return 'Medium';
    if (intensity < 0.8) return 'High';
    return 'Very High';
};

export default function HeatmapChart({ data }: HeatmapProps) {
    const [hoveredCell, setHoveredCell] = useState<HeatmapDataDto | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const currency = usePosStore((state) => state.currency);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23

    // Organize data by day and hour
    const getDataForCell = (dayIndex: number, hour: number): HeatmapDataDto | undefined => {
        return data.find(d => d.dayIndex === dayIndex && d.hour === hour);
    };

    const handleMouseEnter = (cellData: HeatmapDataDto | undefined, event: React.MouseEvent) => {
        if (cellData) {
            setHoveredCell(cellData);
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            setTooltipPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 10
            });
        }
    };

    const handleMouseLeave = () => {
        setHoveredCell(null);
    };

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[500px] bg-gray-800/50 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-lg">No data available</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700 p-6 shadow-2xl">
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Weekly Intensity Heatmap</h3>
                <p className="text-gray-400 text-sm">
                    Weekly revenue and staff intensity analysis for the restaurant
                </p>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
                <span className="text-sm text-gray-400 font-medium">Intensity Level:</span>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-900/40 border border-blue-800/50" />
                    <span className="text-xs text-gray-300">Very Low</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-cyan-800/50 border border-cyan-700/50" />
                    <span className="text-xs text-gray-300">Low</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-700/60 border border-emerald-600/50" />
                    <span className="text-xs text-gray-300">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-amber-600/70 border border-amber-500/50" />
                    <span className="text-xs text-gray-300">High</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-red-600/80 border border-red-500/60" />
                    <span className="text-xs text-gray-300">Very High</span>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    {/* Header - Saatler */}
                    <div className="flex">
                        <div className="w-32 flex-shrink-0" /> {/* Empty corner */}
                        {hours.map(hour => (
                            <div
                                key={hour}
                                className="w-12 h-10 flex items-center justify-center text-xs font-semibold text-gray-300"
                            >
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* Rows - Days */}
                    {days.map((day, dayIndex) => (
                        <div key={dayIndex} className="flex">
                            {/* Day label */}
                            <div className="w-32 flex-shrink-0 h-12 flex items-center justify-start pe-4">
                                <span className="text-sm font-semibold text-gray-200">{day}</span>
                            </div>

                            {/* Hourly cells */}
                            {hours.map(hour => {
                                const cellData = getDataForCell(dayIndex, hour);
                                const intensity = cellData?.intensity ?? 0;
                                const colorClass = getIntensityColor(intensity);

                                return (
                                    <div
                                        key={hour}
                                        className={`w-12 h-12 border ${colorClass} transition-all duration-200 cursor-pointer relative group`}
                                        onMouseEnter={(e) => handleMouseEnter(cellData, e)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tooltip */}
            {hoveredCell && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-gray-900/98 backdrop-blur-md border border-gray-700 rounded-lg p-4 shadow-2xl min-w-[280px]">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-bold text-white text-base">
                                {hoveredCell.dayOfWeek} - {hoveredCell.hour}:00
                            </p>
                            <span
                                className={`text-xs font-semibold px-2 py-1 rounded ${hoveredCell.intensity >= 0.6
                                        ? 'bg-red-500/20 text-red-300'
                                        : 'bg-blue-500/20 text-blue-300'
                                    }`}
                            >
                                {getIntensityLabel(hoveredCell.intensity)}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Avg. Revenue:</span>
                                <span className="text-emerald-400 font-bold">
                                    {formatCurrency(hoveredCell.averageRevenue, currency)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Order Count:</span>
                                <span className="text-blue-400 font-semibold">
                                    {hoveredCell.orderCount}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Waiter Count:</span>
                                <span className="text-purple-400 font-semibold">
                                    {hoveredCell.averageWaiters}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                                <span className="text-gray-400">Intensity:</span>
                                <span className="text-white font-bold">
                                    {(hoveredCell.intensity * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
