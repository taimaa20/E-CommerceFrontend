"use client";

import { StockStatusBadge } from "@/components/retail/retail-shared";
import type { RetailProductDetail } from "@/types/retail";

/** Compact stock cell for the existing product list: quantity plus its status badge. */
export function RetailStockCell({ detail, ar }: { detail: RetailProductDetail; ar: boolean }) {
    return (
        <div className="flex items-center justify-end gap-2">
            <span className="font-semibold">{detail.stockOnHand}</span>
            <StockStatusBadge status={detail.stockStatus} ar={ar} />
        </div>
    );
}
