"use client";

import * as React from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/posStore";

export type KpiIntent = "neutral" | "success" | "warning" | "danger" | "info";

interface KpiCardProps {
    title: string;
    value: number | string | null | undefined;
    description?: string;
    format?: "currency" | "number" | "percent" | "text" | "minutes";
    icon?: LucideIcon;
    intent?: KpiIntent;
    deltaPercent?: number | null;
    loading?: boolean;
    onClick?: () => void;
    compact?: boolean;
}

const INTENT_TOKENS: Record<
    KpiIntent,
    { chipBg: string; chipFg: string; ring: string; valueFg: string }
> = {
    neutral: {
        chipBg: "bg-slate-100 dark:bg-slate-800",
        chipFg: "text-slate-600 dark:text-slate-300",
        ring: "ring-slate-200/60 dark:ring-slate-700/60",
        valueFg: "text-slate-900 dark:text-slate-50",
    },
    success: {
        chipBg: "bg-emerald-50 dark:bg-emerald-900/40",
        chipFg: "text-emerald-600 dark:text-emerald-300",
        ring: "ring-emerald-100 dark:ring-emerald-900/40",
        valueFg: "text-slate-900 dark:text-slate-50",
    },
    warning: {
        chipBg: "bg-amber-50 dark:bg-amber-900/40",
        chipFg: "text-amber-600 dark:text-amber-300",
        ring: "ring-amber-100 dark:ring-amber-900/40",
        valueFg: "text-slate-900 dark:text-slate-50",
    },
    danger: {
        chipBg: "bg-rose-50 dark:bg-rose-900/40",
        chipFg: "text-rose-600 dark:text-rose-300",
        ring: "ring-rose-100 dark:ring-rose-900/40",
        valueFg: "text-slate-900 dark:text-slate-50",
    },
    info: {
        chipBg: "bg-blue-50 dark:bg-blue-900/40",
        chipFg: "text-blue-600 dark:text-blue-300",
        ring: "ring-blue-100 dark:ring-blue-900/40",
        valueFg: "text-slate-900 dark:text-slate-50",
    },
};

/**
 * Modern KPI card — every numeric tile across every dashboard renders through
 * this single component. The visual idiom matches enterprise dashboards
 * (Stripe / Linear): small color-coded icon chip + small label + large value
 * + optional delta pill + optional description.
 *
 * Loading is rendered as a shimmer skeleton (NOT "…") so the page never looks
 * "broken" while data arrives.
 */
export function KpiCard({
    title,
    value,
    description,
    format = "number",
    icon: Icon,
    intent = "neutral",
    deltaPercent,
    loading = false,
    onClick,
    compact = false,
}: KpiCardProps) {
    const { currency } = usePosStore();
    const tokens = INTENT_TOKENS[intent];

    const formatted = React.useMemo(() => {
        if (value === null || value === undefined) return "—";
        if (typeof value === "string") return value;
        if (format === "currency") {
            return new Intl.NumberFormat(undefined, {
                style: "currency",
                currency,
                maximumFractionDigits: value >= 1000 ? 0 : 2,
            }).format(value);
        }
        if (format === "percent")  return `${value.toFixed(1)}%`;
        if (format === "minutes")  return `${value.toFixed(0)} min`;
        return new Intl.NumberFormat().format(value);
    }, [value, format, currency]);

    const isInteractive = !!onClick;
    const Wrapper: any = isInteractive ? "button" : "div";

    return (
        <Card
            className={cn(
                "group relative overflow-hidden border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-zinc-950 shadow-sm",
                "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                isInteractive && "cursor-pointer",
            )}
        >
            <Wrapper
                type={isInteractive ? "button" : undefined}
                onClick={onClick}
                className="block w-full text-start"
            >
                <div className={cn("flex flex-col gap-2", compact ? "p-3" : "p-4")}>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            {Icon && (
                                <span
                                    className={cn(
                                        "inline-flex items-center justify-center rounded-lg shrink-0",
                                        compact ? "h-7 w-7" : "h-8 w-8",
                                        tokens.chipBg,
                                        tokens.chipFg,
                                    )}
                                >
                                    <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                                </span>
                            )}
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
                                {title}
                            </span>
                        </div>
                        {typeof deltaPercent === "number" && <DeltaPill value={deltaPercent} />}
                    </div>

                    <div className="flex items-baseline gap-2 min-h-[2.25rem]">
                        {loading ? (
                            <div className="h-7 w-24 rounded-md bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]" />
                        ) : (
                            <span className={cn("font-bold tracking-tight tabular-nums", compact ? "text-xl" : "text-2xl", tokens.valueFg)}>
                                {formatted}
                            </span>
                        )}
                    </div>

                    {description && !loading && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {description}
                        </span>
                    )}
                </div>

                {/* Subtle bottom accent line carries the intent color without shouting */}
                <div
                    className={cn(
                        "absolute inset-x-0 bottom-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                        intent === "success" ? "bg-emerald-500"
                      : intent === "warning" ? "bg-amber-500"
                      : intent === "danger"  ? "bg-rose-500"
                      : intent === "info"    ? "bg-blue-500"
                                             : "bg-slate-400",
                    )}
                />
            </Wrapper>
        </Card>
    );
}

function DeltaPill({ value }: { value: number }) {
    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
    const tone =
        value > 0 ? "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/40"
      : value < 0 ? "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/40"
                  : "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800";
    return (
        <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", tone)}>
            <Icon className="h-3 w-3" />
            {Math.abs(value).toFixed(1)}%
        </span>
    );
}
