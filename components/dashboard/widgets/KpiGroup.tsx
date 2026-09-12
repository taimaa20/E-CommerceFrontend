"use client";

import * as React from "react";

interface KpiGroupProps {
    title?: string;
    description?: string;
    columns?: 2 | 3 | 4 | 5;
    action?: React.ReactNode;
    children: React.ReactNode;
}

const GRID: Record<NonNullable<KpiGroupProps["columns"]>, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

export function KpiGroup({ title, description, columns = 4, action, children }: KpiGroupProps) {
    return (
        <section className="flex flex-col gap-3">
            {(title || description || action) && (
                <header className="flex items-end justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                        {title && (
                            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                {title}
                            </h2>
                        )}
                        {description && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {description}
                            </span>
                        )}
                    </div>
                    {action}
                </header>
            )}
            <div className={`grid gap-3 ${GRID[columns]}`}>{children}</div>
        </section>
    );
}
