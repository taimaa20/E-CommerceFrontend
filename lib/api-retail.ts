import { api } from "@/lib/api";
import type {
    RetailCatalogPage,
    RetailCatalogQuery,
    RetailCatalogSummaryDto,
    RetailLegacyPurchaseDto,
    RetailPerformanceReport,
    RetailPurchaseOrderCreateInput,
    RetailPurchaseOrderDto,
    RetailPurchaseOrderPage,
    RetailPurchaseOrderStatus,
    RetailPurchaseReceiptInput,
    RetailSalesPage,
    RetailSalesQuery,
    RetailStockAdjustmentCreateInput,
    RetailStockAdjustmentResultDto,
    RetailStockMovementDto,
} from "@/types/retail";

const EMPTY_CATALOG: RetailCatalogPage = { items: [], totalCount: 0, pageNumber: 1, pageSize: 0 };
const EMPTY_SALES: RetailSalesPage = {
    items: [], totalCount: 0, pageNumber: 1, pageSize: 0, totalAmount: 0, totalUnits: 0,
};
const EMPTY_PURCHASE_ORDERS: RetailPurchaseOrderPage = {
    items: [], totalCount: 0, pageNumber: 1, pageSize: 0,
};

export const retailApi = {
    catalog: async (query: RetailCatalogQuery = {}): Promise<RetailCatalogPage> => {
        const response = await api.get<RetailCatalogPage>("/retail/catalog", {
            params: {
                pageNumber: query.pageNumber ?? 1,
                pageSize: query.pageSize ?? 50,
                search: query.search?.trim() || undefined,
                categoryId: query.categoryId || undefined,
                supplierId: query.supplierId || undefined,
                brand: query.brand || undefined,
                // Inventory is held per branch, so the Inventory screen asks for the active
                // branch. The tenant-wide product catalogue leaves this off.
                currentBranchOnly: query.currentBranchOnly || undefined,
            },
        });
        return response.data ?? EMPTY_CATALOG;
    },

    summary: async (currentBranchOnly = false): Promise<RetailCatalogSummaryDto | null> => {
        const response = await api.get<RetailCatalogSummaryDto>("/retail/catalog/summary", {
            params: { currentBranchOnly: currentBranchOnly || undefined },
        });
        return response.data ?? null;
    },

    brands: async (): Promise<string[]> => {
        const response = await api.get<string[]>("/retail/catalog/brands");
        return response.data ?? [];
    },

    // Line-level sales history over the existing Order/OrderItem/Payment records.
    sales: async (query: RetailSalesQuery = {}): Promise<RetailSalesPage> => {
        const response = await api.get<RetailSalesPage>("/retail/sales", {
            params: {
                pageNumber: query.pageNumber ?? 1,
                pageSize: query.pageSize ?? 50,
                from: query.from || undefined,
                to: query.to || undefined,
                search: query.search?.trim() || undefined,
                productId: query.productId || undefined,
                sku: query.sku || undefined,
                brand: query.brand || undefined,
                paymentStatus: query.paymentStatus || undefined,
                orderId: query.orderId || undefined,
            },
        });
        return response.data ?? EMPTY_SALES;
    },

    performance: async (from?: string, to?: string): Promise<RetailPerformanceReport | null> => {
        const response = await api.get<RetailPerformanceReport>("/retail/performance", {
            params: { from: from || undefined, to: to || undefined },
        });
        return response.data ?? null;
    },

    purchases: async (): Promise<RetailLegacyPurchaseDto[]> => {
        const response = await api.get<RetailLegacyPurchaseDto[]>("/retail/purchases");
        return response.data ?? [];
    },

};

/** Operational retail purchasing. Suppliers come from the shared master, not from here. */
export const retailPurchasingApi = {
    list: async (params: {
        pageNumber?: number;
        pageSize?: number;
        search?: string;
        supplierId?: string;
        status?: RetailPurchaseOrderStatus;
    } = {}): Promise<RetailPurchaseOrderPage> => {
        const response = await api.get<RetailPurchaseOrderPage>("/retail/purchase-orders", {
            params: {
                pageNumber: params.pageNumber ?? 1,
                pageSize: params.pageSize ?? 25,
                search: params.search?.trim() || undefined,
                supplierId: params.supplierId || undefined,
                status: params.status || undefined,
            },
        });
        return response.data ?? EMPTY_PURCHASE_ORDERS;
    },

    get: async (id: string): Promise<RetailPurchaseOrderDto | null> => {
        const response = await api.get<RetailPurchaseOrderDto>(`/retail/purchase-orders/${id}`);
        return response.data ?? null;
    },

    create: async (input: RetailPurchaseOrderCreateInput): Promise<RetailPurchaseOrderDto | null> => {
        const response = await api.post<RetailPurchaseOrderDto>("/retail/purchase-orders", input);
        return response.data ?? null;
    },

    update: async (id: string, input: RetailPurchaseOrderCreateInput): Promise<RetailPurchaseOrderDto | null> => {
        const response = await api.put<RetailPurchaseOrderDto>(`/retail/purchase-orders/${id}`, input);
        return response.data ?? null;
    },

    submit: async (id: string): Promise<RetailPurchaseOrderDto | null> => {
        const response = await api.post<RetailPurchaseOrderDto>(`/retail/purchase-orders/${id}/submit`, {});
        return response.data ?? null;
    },

    /** Posts the stock movements. Safe to retry — a received order returns unchanged. */
    receive: async (id: string, receipt: RetailPurchaseReceiptInput): Promise<RetailPurchaseOrderDto | null> => {
        const response = await api.post<RetailPurchaseOrderDto>(`/retail/purchase-orders/${id}/receive`, receipt);
        return response.data ?? null;
    },

    cancel: async (id: string): Promise<RetailPurchaseOrderDto | null> => {
        const response = await api.post<RetailPurchaseOrderDto>(`/retail/purchase-orders/${id}/cancel`, {});
        return response.data ?? null;
    },

    movements: async (productId: string, branchId?: string, limit = 100): Promise<RetailStockMovementDto[]> => {
        const response = await api.get<RetailStockMovementDto[]>(`/retail/stock/movements/${productId}`, {
            params: { branchId: branchId || undefined, limit },
        });
        return response.data ?? [];
    },
};

/**
 * Manual finished-goods stock corrections. The caller states the quantity the shelf should
 * show, not a delta, so resubmitting the same form is a no-op rather than a second correction.
 */
export const retailStockAdjustmentApi = {
    adjust: async (
        productId: string,
        input: RetailStockAdjustmentCreateInput,
    ): Promise<RetailStockAdjustmentResultDto | null> => {
        const response = await api.post<RetailStockAdjustmentResultDto>(
            `/retail/stock/${productId}/adjustments`,
            input,
        );
        return response.data ?? null;
    },

    history: async (productId: string): Promise<RetailStockAdjustmentResultDto[]> => {
        const response = await api.get<RetailStockAdjustmentResultDto[]>(
            `/retail/stock/${productId}/adjustments`,
        );
        return response.data ?? [];
    },
};
