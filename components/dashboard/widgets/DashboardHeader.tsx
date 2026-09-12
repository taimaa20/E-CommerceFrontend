"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { formatRestaurantDate, parseUtcInstant } from "@/lib/date-time";

interface DashboardHeaderProps {
    title: string;
    subtitle?: string;
    windowStartUtc?: string;
    windowEndUtc?: string;
    onRefresh?: () => void;
    refreshing?: boolean;
    accent?: "operations" | "financial" | "inventory" | "audit";
}

const ACCENT_GRADIENTS: Record<NonNullable<DashboardHeaderProps["accent"]>, string> = {
    operations: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    financial:  "from-blue-500/10 via-blue-500/5 to-transparent",
    inventory:  "from-amber-500/10 via-amber-500/5 to-transparent",
    audit:      "from-rose-500/10 via-rose-500/5 to-transparent",
};

/**
 * Hero band that sits above the filter bar on every dashboard. Provides the
 * dashboard's identity (title, accent), shows the effective window in a human
 * format, and hosts global page actions (refresh, future export).
 */
export function DashboardHeader({
    title,
    subtitle,
    windowStartUtc,
    windowEndUtc,
    onRefresh,
    refreshing,
    accent = "operations",
}: DashboardHeaderProps) {
    const { locale } = useLocale();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);

    const formattedRange = React.useMemo(() => {
        if (!windowStartUtc || !windowEndUtc) return null;
        const endInclusive = new Date(parseUtcInstant(windowEndUtc).getTime() - 1);
        const startDate = formatRestaurantDate(windowStartUtc, timeZone, "en-CA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const endDate = formatRestaurantDate(endInclusive, timeZone, "en-CA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const sameDay = startDate === endDate;

        const fmt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
        const localeTag = locale === "ar" ? "ar-EG" : undefined;

        if (sameDay) return formatRestaurantDate(windowStartUtc, timeZone, localeTag, fmt);
        return `${formatRestaurantDate(windowStartUtc, timeZone, localeTag, { day: "numeric", month: "short", year: undefined })} — ${formatRestaurantDate(endInclusive, timeZone, localeTag, fmt)}`;
    }, [windowStartUtc, windowEndUtc, locale, timeZone]);

    return (
        <header className={cn("relative overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm shadow-sm")}>
            <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", ACCENT_GRADIENTS[accent])} />
            <div className="relative flex flex-wrap items-end justify-between gap-3 p-4 md:p-5">
                <div className="flex flex-col gap-1 min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                        {title}
                    </h1>
                    {(subtitle || formattedRange) && (
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                            {subtitle}
                            {subtitle && formattedRange && <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>}
                            {formattedRange && <span className="font-medium text-slate-600 dark:text-slate-300">{formattedRange}</span>}
                        </p>
                    )}
                </div>

                {onRefresh && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="h-8 gap-1.5"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                        <span className="text-xs">{locale === "ar" ? "تحديث" : "Refresh"}</span>
                    </Button>
                )}
            </div>
        </header>
    );
}
