"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySlice } from "@/lib/dashboard/snapshot-types";
import { usePosStore } from "@/store/posStore";

interface BreakdownDonutProps {
    data: CategorySlice[];
    height?: number;
    format?: "currency" | "number";
}

// Carefully picked palette — perceptually balanced, accessible on light/dark.
const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#ef4444", "#8b5cf6"];

export function BreakdownDonut({ data, height = 260, format = "currency" }: BreakdownDonutProps) {
    const { currency } = usePosStore();
    const fmt = (v: number) => format === "currency"
        ? new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v)
        : new Intl.NumberFormat().format(v);

    const total = data.reduce((s, d) => s + d.value, 0);

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={3}
                        cornerRadius={4}
                        stroke="none"
                    >
                        {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            borderRadius: 8,
                            border: "1px solid rgb(226 232 240)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                            fontSize: 12,
                        }}
                        formatter={(v: number, _name, ctx) => [
                            `${fmt(v)} (${(ctx.payload as CategorySlice).percentage?.toFixed(1) ?? 0}%)`,
                            (ctx.payload as CategorySlice).label,
                        ]}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Centred total */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total</span>
                <span className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">{fmt(total)}</span>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {data.map((d, i) => (
                    <div key={`${d.label}-${i}`} className="flex items-center gap-1.5 text-[11px]">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{d.label}</span>
                        <span className="text-slate-400 tabular-nums">{d.percentage?.toFixed(0) ?? 0}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
