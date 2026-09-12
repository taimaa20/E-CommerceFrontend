"use client";

import { AlertTriangle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RetailStockStatus } from "@/types/retail";

/**
 * Wording only — the four codes and the rule that produces them are unchanged.
 * "Urgent" and "Reorder now" are kept apart on purpose: the backend distinguishes stock
 * *below* the reorder level from stock *at* it, and collapsing both into "low stock" would
 * throw that away. Only the healthy state is renamed, because "OK" says nothing about stock.
 */
const STOCK_STATUS: Record<RetailStockStatus, { en: string; ar: string; className: string }> = {
    OutOfStock: { en: "Out of stock", ar: "غير متوفر", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
    Urgent: { en: "Low stock", ar: "مخزون منخفض", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
    ReorderNow: { en: "Reorder now", ar: "أعد الطلب الآن", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    Ok: { en: "In stock", ar: "متوفر", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

export function StockStatusBadge({ status, ar }: { status: RetailStockStatus; ar: boolean }) {
    const config = STOCK_STATUS[status] ?? STOCK_STATUS.Ok;
    return (
        <Badge variant="outline" className={config.className}>
            {ar ? config.ar : config.en}
        </Badge>
    );
}

/** Loading / empty / error state shared by every retail screen. */
export function RetailState({
    kind,
    ar,
    onRetry,
    emptyText,
}: {
    kind: "loading" | "error" | "empty";
    ar: boolean;
    onRetry?: () => void;
    emptyText?: string;
}) {
    if (kind === "loading") {
        return (
            <p className="py-12 text-center text-sm text-muted-foreground">
                {ar ? "جارٍ التحميل…" : "Loading…"}
            </p>
        );
    }

    if (kind === "error") {
        return (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p>{ar ? "تعذّر تحميل البيانات." : "Could not load this data."}</p>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        {ar ? "إعادة المحاولة" : "Try again"}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <Package className="h-5 w-5" />
            <p>
                {emptyText ??
                    (ar
                        ? "لا توجد بيانات تجزئة. شغّل استيراد ملف DOHA LUXE أولًا."
                        : "No retail data yet. Run the DOHA LUXE workbook import first.")}
            </p>
        </div>
    );
}

export interface StatTile {
    label: string;
    value: string;
    hint?: string;
}

export function RetailStatTiles({ tiles, columns = 6 }: { tiles: StatTile[]; columns?: number }) {
    const gridClass =
        columns >= 6
            ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
            : columns === 4
            ? "grid grid-cols-2 gap-3 lg:grid-cols-4"
            : "grid grid-cols-2 gap-3 sm:grid-cols-3";

    return (
        <div className={gridClass}>
            {tiles.map((tile) => (
                <Card key={tile.label}>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">{tile.label}</p>
                        <p className="mt-1 text-xl font-semibold tabular-nums">{tile.value}</p>
                        {tile.hint && <p className="mt-0.5 text-xs text-muted-foreground">{tile.hint}</p>}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

/** Formats a nullable percentage; keeps whole numbers clean. */
export function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return "—";
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}%`;
}
