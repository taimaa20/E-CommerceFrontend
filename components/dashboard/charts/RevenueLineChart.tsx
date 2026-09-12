"use client";

import * as React from "react";
import {
    Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { TimeSeriesPoint } from "@/lib/dashboard/snapshot-types";
import { usePosStore } from "@/store/posStore";
import { useSettingsStore } from "@/store/settingsStore";
import { formatRestaurantDate } from "@/lib/date-time";

interface RevenueLineChartProps {
    data: TimeSeriesPoint[];
    height?: number;
    color?: string;
}

export function RevenueLineChart({ data, height = 260, color = "hsl(var(--primary))" }: RevenueLineChartProps) {
    const { currency } = usePosStore();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);
    const gradientId = React.useId();

    const series = data.map((p) => ({
        date: formatRestaurantDate(p.bucketStartUtc, timeZone, undefined, {
            month: "short",
            day: "2-digit",
            year: undefined,
        }),
        value: p.value,
    }));

    const formatter = (v: number) =>
        new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v);

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor={color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "currentColor" }} className="text-slate-500" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={64}
                       tickFormatter={(v) => formatter(v).replace(/\.00$/, "")}
                       tick={{ fill: "currentColor" }} className="text-slate-500" />
                <Tooltip
                    contentStyle={{
                        borderRadius: 8,
                        border: "1px solid rgb(226 232 240)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        fontSize: 12,
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                    formatter={(v: number) => [formatter(v), "Value"]}
                />
                <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradientId})`} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

