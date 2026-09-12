"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WidgetSkeleton } from "../widgets/WidgetSkeleton";
import { WidgetEmpty } from "../widgets/WidgetEmpty";
import { cn } from "@/lib/utils";

interface ChartFrameProps {
    title: string;
    description?: string;
    loading?: boolean;
    empty?: boolean;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    height?: number;
}

/**
 * Wraps every chart with consistent header, loading skeleton, empty state and
 * a slot for actions (export, drill-down). Charts themselves stay presentational.
 */
export function ChartFrame({
    title, description, loading, empty, actions, children, className, height = 280,
}: ChartFrameProps) {
    return (
        <Card
            className={cn(
                "border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden",
                className,
            )}
        >
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2 px-4 pt-4">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
                    {description && (
                        <CardDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {description}
                        </CardDescription>
                    )}
                </div>
                {actions}
            </CardHeader>
            <CardContent className="px-2 pb-3 pt-1">
                <div style={{ minHeight: height }} className="flex items-center justify-center">
                    {loading ? <WidgetSkeleton className="w-full px-3" rows={6} />
                      : empty   ? <WidgetEmpty />
                                : <div className="w-full">{children}</div>}
                </div>
            </CardContent>
        </Card>
    );
}
