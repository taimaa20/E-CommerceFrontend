"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardGridProps {
    children: ReactNode;
    minColumnWidth?: number;
    className?: string;
}

export function DashboardGrid({
    children,
    minColumnWidth = 280,
    className,
}: DashboardGridProps) {
    return (
        <div
            className={cn("dashboard-auto-grid", className)}
            style={{ "--dashboard-min-col": `${minColumnWidth}px` } as CSSProperties}
        >
            {children}
        </div>
    );
}

export function KpiGrid({ children, className }: Omit<DashboardGridProps, "minColumnWidth">) {
    return (
        <DashboardGrid minColumnWidth={190} className={cn("dashboard-kpi-grid", className)}>
            {children}
        </DashboardGrid>
    );
}

export function DashboardPanel({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("dashboard-panel-flow", className)}>{children}</div>;
}
