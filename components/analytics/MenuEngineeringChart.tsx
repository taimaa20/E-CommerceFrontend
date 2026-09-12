"use client";

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { MenuEngineeringDto, MenuEngineeringCategory } from '@/types/analytics';
import { usePosStore } from '@/store/posStore';
import { formatCurrency } from '@/lib/currencies';

interface MenuEngineeringChartProps {
    data: MenuEngineeringDto[];
}

// Category colors and names
const categoryConfig = {
    [MenuEngineeringCategory.Star]: {
        name: 'Star Product',
        color: '#10b981', // Emerald-500 (Green)
        description: 'High Sales + High Profit'
    },
    [MenuEngineeringCategory.Plow]: {
        name: 'Plow Product',
        color: '#f59e0b', // Amber-500 (Orange)
        description: 'High Sales + Low Profit'
    },
    [MenuEngineeringCategory.Puzzle]: {
        name: 'Puzzle Product',
        color: '#3b82f6', // Blue-500 (Blue)
        description: 'Low Sales + High Profit'
    },
    [MenuEngineeringCategory.Dog]: {
        name: 'Dog Product',
        color: '#ef4444', // Red-500 (Red)
        description: 'Low Sales + Low Profit'
    }
};

// Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
    const currency = usePosStore((state) => state.currency);
    if (active && payload && payload.length) {
        const data = payload[0].payload as MenuEngineeringDto;
        const config = categoryConfig[data.category];

        return (
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 shadow-2xl">
                <p className="font-semibold text-white text-lg mb-2">{data.productName}</p>
                <div className="space-y-1.5 text-sm">
                    <p className="text-gray-300">
                        <span className="font-medium">Category:</span>{' '}
                        <span className="font-semibold" style={{ color: config.color }}>
                            {config.name}
                        </span>
                    </p>
                    <p className="text-gray-300">
                        <span className="font-medium">Sales Volume:</span>{' '}
                        <span className="text-white font-semibold">{data.salesVolume}</span>
                    </p>
                    <p className="text-gray-300">
                        <span className="font-medium">Profit Margin:</span>{' '}
                        <span className="text-emerald-400 font-semibold">{data.profitMargin.toFixed(1)}%</span>
                    </p>
                    <p className="text-gray-300">
                        <span className="font-medium">Total Revenue:</span>{' '}
                        <span className="text-blue-400 font-semibold">{formatCurrency(data.revenue, currency)}</span>
                    </p>
                    <p className="text-gray-300">
                        <span className="font-medium">Total Profit:</span>{' '}
                        <span className="text-green-400 font-semibold">{formatCurrency(data.totalProfit, currency)}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// Custom Legend
const CustomLegend = () => {
    return (
        <div className="flex flex-wrap justify-center gap-6 mt-6 px-4">
            {Object.entries(categoryConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2 group cursor-pointer">
                    <div
                        className="w-4 h-4 rounded-full transition-transform group-hover:scale-125"
                        style={{ backgroundColor: config.color }}
                    />
                    <div className="text-sm">
                        <p className="font-semibold text-gray-200">{config.name}</p>
                        <p className="text-xs text-gray-400">{config.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function MenuEngineeringChart({ data }: MenuEngineeringChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[500px] bg-gray-800/50 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-lg">No data available</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700 p-6 shadow-2xl">
            <div className="mb-4">
                <h3 className="text-2xl font-bold text-white mb-2">Menu Engineering Analysis</h3>
                <p className="text-gray-400 text-sm">
                    BCG Matrix - Products categorized by sales volume and profit margin
                </p>
            </div>

            <ResponsiveContainer width="100%" height={500}>
                <ScatterChart
                    margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis
                        type="number"
                        dataKey="salesVolume"
                        name="Sales Volume"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                        label={{
                            value: 'Sales Volume',
                            position: 'insideBottom',
                            offset: -10,
                            fill: '#d1d5db',
                            fontSize: 14,
                            fontWeight: 600
                        }}
                    />
                    <YAxis
                        type="number"
                        dataKey="profitMargin"
                        name="Profit Margin (%)"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                        label={{
                            value: 'Profit Margin (%)',
                            angle: -90,
                            position: 'insideLeft',
                            fill: '#d1d5db',
                            fontSize: 14,
                            fontWeight: 600
                        }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Legend content={<CustomLegend />} />
                    <Scatter
                        name="Products"
                        data={data}
                        fill="#8884d8"
                        shape="circle"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={categoryConfig[entry.category].color}
                                className="transition-all hover:opacity-80 cursor-pointer"
                            />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
