"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widgets/WidgetEmpty";
import { WidgetSkeleton } from "@/components/dashboard/widgets/WidgetSkeleton";
import { usePosStore } from "@/store/posStore";
import type { RankedRow } from "@/lib/dashboard/snapshot-types";
import { cn } from "@/lib/utils";

interface RankedListCardProps {
    title: string;
    description?: string;
    rows: RankedRow[];
    loading?: boolean;
    format?: "currency" | "number";
    primaryLabel?: string;
    secondaryLabel?: string;
    max?: number;
}

export function RankedListCard({
    title, description, rows, loading,
    format = "currency", primaryLabel, secondaryLabel, max = 5,
}: RankedListCardProps) {
    const { currency } = usePosStore();
    const fmtNumber = (v: number) => new Intl.NumberFormat().format(v);
    const fmtCurrency = (v: number) =>
        new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v);
    const fmt = format === "currency" ? fmtCurrency : fmtNumber;

    const limited = rows.slice(0, max);
    const maxVal = limited[0]?.primaryValue ?? 0;

    return (
        <Card className="border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-zinc-950 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
                {description && <CardDescription className="text-xs">{description}</CardDescription>}
            </CardHeader>
            <CardContent className="px-4 pb-4">
                {loading ? <WidgetSkeleton rows={Math.min(5, max)} />
                  : limited.length === 0 ? <WidgetEmpty />
                  : (
                    <ol className="flex flex-col scroll-list scroll-list-sm">
                        {limited.map((row, idx) => {
                            const widthPct = maxVal === 0 ? 0 : Math.max(4, (row.primaryValue / maxVal) * 100);
                            return (
                                <li
                                    key={`${row.id ?? row.label}-${idx}`}
                                    className="relative flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                                >
                                    {/* Background magnitude bar */}
                                    <span
                                        className="absolute inset-y-1 start-0 rounded-md bg-primary/[0.06] dark:bg-primary/[0.10] pointer-events-none"
                                        style={{ width: `${widthPct}%` }}
                                    />
                                    <span className={cn(
                                        "relative inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold shrink-0",
                                        idx === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                      : idx === 1 ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                      : idx === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                                                  : "bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400",
                                    )}>
                                        {idx + 1}
                                    </span>
                                    <div className="relative flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{row.label}</div>
                                        {row.count !== null && row.count !== undefined && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {fmtNumber(row.count)}{secondaryLabel ? ` ${secondaryLabel}` : ""}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative text-end shrink-0">
                                        <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{fmt(row.primaryValue)}</div>
                                        {primaryLabel && <div className="text-[10px] text-slate-500 dark:text-slate-400">{primaryLabel}</div>}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </CardContent>
        </Card>
    );
}
