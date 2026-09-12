"use client";

import { Boxes, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
