"use client";

import * as React from "react";
import { AlertTriangle, Info, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardAlert } from "@/lib/dashboard/snapshot-types";

const ICON_BY_SEVERITY = {
    info:    Info,
    warning: AlertTriangle,
    danger:  Bell,
} as const;

const STYLE_BY_SEVERITY: Record<DashboardAlert["severity"], string> = {
    info:    "bg-blue-50/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200/60 dark:border-blue-800/60",
    warning: "bg-amber-50/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200/60 dark:border-amber-800/60",
    danger:  "bg-rose-50/80 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200/60 dark:border-rose-800/60",
};

export function AlertList({ alerts, title }: { alerts: DashboardAlert[]; title?: string }) {
    if (alerts.length === 0) return null;

    return (
        <section className="flex flex-col gap-2">
            {title && (
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {title}
                </h2>
            )}
            <div className="flex flex-wrap gap-2">
                {alerts.map((a) => {
                    const Icon = ICON_BY_SEVERITY[a.severity] ?? Info;
                    return (
                        <div
                            key={a.code}
                            className={cn(
                                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm",
                                STYLE_BY_SEVERITY[a.severity],
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{a.message ?? a.titleKey}</span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
