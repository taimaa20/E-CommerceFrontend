"use client";

import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { TimeSeriesPoint } from "@/lib/dashboard/snapshot-types";
import { usePosStore } from "@/store/posStore";
import { useSettingsStore } from "@/store/settingsStore";
import { formatRestaurantTime } from "@/lib/date-time";

interface HourlyBarChartProps {
    data: TimeSeriesPoint[];
    height?: number;
}

export function HourlyBarChart({ data, height = 260 }: HourlyBarChartProps) {
    const { currency } = usePosStore();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);

    const series = data.map((p) => ({
        hour: formatRestaurantTime(p.bucketStartUtc, timeZone, undefined, {
            hour: "2-digit",
            minute: undefined,
            hour12: false,
        }),
        value: p.value,
        count: p.count ?? 0,
    }));

    const formatter = (v: number) =>
        new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v);

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "currentColor" }} className="text-slate-500" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={64}
                       tickFormatter={(v) => formatter(v).replace(/\.00$/, "")}
                       tick={{ fill: "currentColor" }} className="text-slate-500" />
                <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.06)" }}
                    contentStyle={{
                        borderRadius: 8,
                        border: "1px solid rgb(226 232 240)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        fontSize: 12,
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                    formatter={(v: number) => [formatter(v), "Revenue"]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="url(#bar-gradient)" maxBarSize={36} />
            </BarChart>
        </ResponsiveContainer>
    );
}
