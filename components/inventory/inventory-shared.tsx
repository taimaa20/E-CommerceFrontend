"use client";

import { Boxes, Layers, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Current stock with its correction action beside it. The row's action column sits at the far
 * end of a wide, horizontally scrolling table, so an adjust control there is easily never seen;
 * next to the figure it is always in view. Pass no handler to show the figure alone.
 */
export function StockQuantityCell({
    quantity,
    ar,
    onAdjust,
}: {
    quantity: number;
    ar: boolean;
    onAdjust?: () => void;
}) {
    return (
        <div className="flex items-center justify-end gap-2">
            <span className="text-base font-semibold tabular-nums">{quantity}</span>
            {onAdjust && (
                <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onAdjust}>
                    <SlidersHorizontal className="h-3 w-3" />
                    {ar ? "تسوية" : "Adjust"}
                </Button>
            )}
        </div>
    );
}

/**
 * The two things a business stocks. The persistence models behind them differ — raw materials
 * are consumed through recipes, finished products are sold as themselves — but from here on
 * they are two *types of inventory item* in one module, not two applications.
 */
export type InventoryItemType = "finished" | "material";

const TYPE_META: Record<InventoryItemType, { en: string; ar: string; className: string }> = {
    finished: {
        en: "Product",
        ar: "منتج",
        className: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
    material: {
        en: "Raw material",
        ar: "مادة خام",
        className: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
};

export function inventoryTypeLabel(type: InventoryItemType, ar: boolean): string {
    return ar ? TYPE_META[type].ar : TYPE_META[type].en;
}

export function InventoryTypeBadge({ type, ar }: { type: InventoryItemType; ar: boolean }) {
    const meta = TYPE_META[type];
    const Icon = type === "finished" ? Boxes : Layers;
    return (
        <Badge variant="outline" className={`gap-1 font-normal ${meta.className}`}>
            <Icon className="h-3 w-3" />
            {ar ? meta.ar : meta.en}
        </Badge>
    );
}

/** Shared active/inactive chip so both inventory types read the same. */
export function InventoryActiveBadge({ isActive, ar }: { isActive: boolean; ar: boolean }) {
    return (
        <Badge
            variant="outline"
            className={
                isActive
                    ? "bg-emerald-500/15 font-normal text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-500/15 font-normal text-slate-600 dark:text-slate-300"
            }
        >
            {isActive ? (ar ? "نشط" : "Active") : ar ? "غير نشط" : "Inactive"}
        </Badge>
    );
}
