"use client";

import { Badge } from "@/components/ui/badge";
import { InventoryTypeBadge, type InventoryItemType } from "@/components/inventory/inventory-shared";
import type { PurchaseItemKind, PurchaseOrderStage } from "@/lib/api-purchasing";

/**
 * The purchasing screen names things exactly as the Inventory screen does — a purchase order
 * is how an inventory item arrives, so it would be odd for the two screens to call the same
 * thing by different words. The type badge is therefore the inventory one, not a copy.
 */
export function inventoryTypeOf(kind: PurchaseItemKind): InventoryItemType {
    return kind === "FinishedProduct" ? "finished" : "material";
}

export function PurchaseItemKindBadge({ kind, ar }: { kind: PurchaseItemKind; ar: boolean }) {
    return <InventoryTypeBadge type={inventoryTypeOf(kind)} ar={ar} />;
}

const STAGE_META: Record<PurchaseOrderStage, { en: string; ar: string; className: string }> = {
    Draft: { en: "Draft", ar: "مسودة", className: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
    Ordered: { en: "Sent to supplier", ar: "أُرسل للمورد", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
    Received: { en: "Received", ar: "تم الاستلام", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    Completed: { en: "In stock", ar: "في المخزون", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    Cancelled: { en: "Cancelled", ar: "ملغى", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

export function purchaseStageLabel(stage: PurchaseOrderStage, ar: boolean): string {
    const meta = STAGE_META[stage] ?? STAGE_META.Draft;
    return ar ? meta.ar : meta.en;
}

export function PurchaseStageBadge({ stage, ar }: { stage: PurchaseOrderStage; ar: boolean }) {
    const meta = STAGE_META[stage] ?? STAGE_META.Draft;
    return (
        <Badge variant="outline" className={`font-normal ${meta.className}`}>
            {ar ? meta.ar : meta.en}
        </Badge>
    );
}
