"use client";

import { cn } from "@/lib/utils";

interface WidgetSkeletonProps {
    className?: string;
    rows?: number;
}

/**
 * Soft shimmer skeleton used by every dashboard widget while data is in flight.
 * Mirrors the rhythm of a real list (varied widths) so the page does not feel
 * "blocked" while it loads.
 */
export function WidgetSkeleton({ className, rows = 4 }: WidgetSkeletonProps) {
    return (
        <div className={cn("space-y-2.5", className)}>
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="h-3 rounded-md bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]"
                    style={{ width: `${55 + ((i * 13) % 40)}%` }}
                />
            ))}
        </div>
    );
}
