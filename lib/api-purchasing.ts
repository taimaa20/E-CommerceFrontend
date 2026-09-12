import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api-procurement";

/**
 * The one Purchasing screen.
 *
 * Reading is unified — this endpoint merges both purchase documents into one list — while
 * writing still goes to whichever service owns the stock model the chosen item uses. The
 * operator never picks a purchasing application; the item on the line decides.
 */

/** What a purchase order brings in. Decides which receiving path runs. */
export type PurchaseItemKind = "RawMaterial" | "FinishedProduct";

/**
 * The shared workflow vocabulary. `Completed` is the only stage in which the goods are in
 * inventory, whichever stock model is behind the document.
 */
export type PurchaseOrderStage = "Draft" | "Ordered" | "Received" | "Completed" | "Cancelled";

export interface PurchaseOrderRow {
    id: string;
    itemKind: PurchaseItemKind;
    documentNumber: string;
    invoiceNumber?: string | null;
    supplierId: string;
    supplierDisplayName: string;
    documentDateUtc: string;
    lineCount: number;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    paymentStatus: string;
    stage: PurchaseOrderStage;
    stockPosted: boolean;
    invoiceId?: string | null;
    canSubmit: boolean;
    canReceive: boolean;
    canApprove: boolean;
    canCancel: boolean;
}

export interface PurchaseOrderQuery {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    itemKind?: PurchaseItemKind;
    stage?: PurchaseOrderStage;
    /** Narrows to raw-material purchases, the only documents that carry a supplier invoice. */
    paymentStatus?: string;
}

const EMPTY_PAGE: PaginatedResponse<PurchaseOrderRow> = {
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 0,
};

export const purchasingApi = {
    orders: async (query: PurchaseOrderQuery = {}): Promise<PaginatedResponse<PurchaseOrderRow>> => {
        const response = await api.get<PaginatedResponse<PurchaseOrderRow>>("/purchasing/orders", {
            params: {
                pageNumber: query.pageNumber ?? 1,
                pageSize: query.pageSize ?? 10,
                search: query.search || undefined,
                itemKind: query.itemKind || undefined,
                stage: query.stage || undefined,
                paymentStatus: query.paymentStatus || undefined,
            },
        });
        return response.data ?? EMPTY_PAGE;
    },
};
