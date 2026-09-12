import { api } from "./api";

export interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface Supplier {
    id?: string;
    name: string;
    nameAr?: string;
    displayName?: string;
    email?: string;
    mobileNumber?: string;
    contactInfo?: string; // Kept for backward compatibility
    leadTimeDays: number;
    taxNumber?: string;
    vendorCode?: string;

    // One supplier master serves the restaurant and retail sides. These four are used by
    // retail sourcing and stay null for suppliers created through restaurant procurement.
    country?: string | null;
    website?: string | null;
    brands?: string | null;
    bestSellers?: string | null;

    // How the supplier is actually used, so the single list can show it without a second
    // screen. Read-only; present on the paginated list.
    retailProductCount?: number;
    purchaseOrderCount?: number;
    retailPurchaseOrderCount?: number;
    legacyPurchaseCount?: number;
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    supplier?: Supplier;
    orderNumber: string;
    status: number; // 0=Draft, 1=Received, 2=Approved, 3=Cancelled
    totalAmount: number;
    expectedDate: string;
    receivedDate?: string;
    createdAt?: string;
    itemCount: number; // Number of items in order
    unitCost: number; // Unit cost snapshot at order creation time
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    invoiceTotalAmount?: number;
    taxAmount?: number;
    discountAmount?: number;
    paidAmount?: number;
    balance?: number;
    paymentStatus?: "Unpaid" | "PartiallyPaid" | "Paid" | "Draft" | "Cancelled";
    items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
    id?: string;
    rawMaterialId: string;
    rawMaterialName?: string; // Optional helper
    quantity: number;
    unitPrice: number;
}

export interface SuggestedOrderDto {
    rawMaterialId: string;
    rawMaterialName: string;
    currentStock: number;
    minimumStockLevel: number;
    suggestedQuantity: number;
    unit: string;
    estimatedCost: number;
}

export interface StockBatchDetailDto {
    id: string;
    materialId: string;
    materialName: string;
    materialNameAr?: string;
    batchNumber: string;
    purchaseOrderId?: string;
    purchaseOrderNumber?: string;
    quantity: number;
    remainingQuantity: number;
    unitCost: number;
    totalCost: number;
    expiryDate: string;
    createdAt: string;
    isApproved: boolean;
}

export interface SimplePurchaseItemPayload {
    rawMaterialId: string;
    quantity: number;
    unitCost: number;
}

export interface SimplePurchasePayload {
    supplierId: string;
    invoiceNumber?: string | null;
    invoiceDate: string;
    dueDate?: string | null;
    items: SimplePurchaseItemPayload[];
    taxAmount: number;
    discountAmount: number;
    paidAmount: number;
    currencyCode: string;
    paymentMethod: string;
    paymentMethodDetail?: string | null;
    notes?: string | null;
    receiveIntoInventory: boolean;
    acknowledgeDuplicateWarning?: boolean;
}

export interface SimplePurchaseDetails {
    id: string;
    purchaseNumber: string;
    supplierId: string;
    supplierName: string;
    branchId: string;
    branchName: string;
    invoiceId?: string | null;
    invoiceNumber: string;
    invoiceDate: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    paymentStatus: string;
    currencyCode: string;
    receivingStatus: string;
    receivedDate?: string | null;
    items: Array<{
        rawMaterialId: string;
        itemName: string;
        unit: string;
        quantity: number;
        unitCost: number;
        lineTotal: number;
    }>;
}

export const ProcurementApi = {
    getSuggestions: async () => {
        const res = await api.get<SuggestedOrderDto[]>("/procurement/suggestions");
        return res.data;
    },
    getSuppliers: async () => {
        const res = await api.get<Supplier[]>("/procurement/suppliers");
        return (res.data || []).map((supplier: Supplier) => ({
            ...supplier,
            name: supplier.displayName || supplier.name,
        }));
    },
    getSuppliersPaginated: async (pageNumber: number, pageSize: number, searchTerm: string = "", sortBy: string = "name", sortOrder: string = "asc") => {
        const normalizedSearchTerm = searchTerm.trim();
        const res = await api.get<PaginatedResponse<Supplier>>("/procurement/suppliers/paginated", {
            params: { pageNumber, pageSize, searchTerm: normalizedSearchTerm, sortBy, sortOrder }
        });
        return {
            ...res.data,
            items: (res.data?.items || []).map((supplier: Supplier) => ({
                ...supplier,
                name: supplier.displayName || supplier.name,
            })),
        };
    },
    createSupplier: async (supplier: Supplier) => {
        const res = await api.post<Supplier>("/procurement/suppliers", supplier);
        return res.data;
    },
    updateSupplier: async (id: string, supplier: Partial<Supplier>) => {
        const res = await api.put<Supplier>(`/procurement/suppliers/${id}`, supplier);
        return res.data;
    },
    deleteSupplier: async (id: string) => {
        await api.delete(`/procurement/suppliers/${id}`);
        return true;
    },
    getOrders: async () => {
        const res = await api.get<PurchaseOrder[]>("/procurement/orders");
        return (res.data || []).map((order: PurchaseOrder) => ({
            ...order,
            supplier: order.supplier
                ? {
                    ...order.supplier,
                    name: order.supplier.displayName || order.supplier.name,
                }
                : order.supplier,
        }));
    },
    getOrdersPaginated: async (pageNumber: number, pageSize: number, searchTerm: string = "", status?: number, sortBy: string = "createdAt", sortOrder: string = "desc", paymentStatus?: string) => {
        const params: { pageNumber: number; pageSize: number; searchTerm: string; sortBy: string; sortOrder: string; status?: number; paymentStatus?: string } = {
            pageNumber,
            pageSize,
            searchTerm: searchTerm.trim(),
            sortBy,
            sortOrder,
        };
        if (status !== undefined) params.status = status;
        if (paymentStatus) params.paymentStatus = paymentStatus;
        const res = await api.get<PaginatedResponse<PurchaseOrder>>("/procurement/orders/paginated", { params });
        return {
            ...res.data,
            items: (res.data?.items || []).map((order: PurchaseOrder) => ({
                ...order,
                supplier: order.supplier
                    ? {
                        ...order.supplier,
                        name: order.supplier.displayName || order.supplier.name,
                    }
                    : order.supplier,
            })),
        };
    },
    createOrder: async (order: Partial<PurchaseOrder>) => {
        const res = await api.post<PurchaseOrder>("/procurement/orders", order);
        return res.data;
    },
    updateOrder: async (id: string, order: Partial<PurchaseOrder>) => {
        const res = await api.put<PurchaseOrder>(`/procurement/orders/${id}`, order);
        return res.data;
    },
    updateStatus: async (id: string, status: number) => {
        const res = await api.put<PurchaseOrder>(`/procurement/orders/${id}/status?status=${status}`);
        return res.data;
    },
    getStockBatches: async (purchaseOrderId: string) => {
        const res = await api.get<StockBatchDetailDto[]>(`/procurement/orders/${purchaseOrderId}/batches`);
        return res.data || [];
    },
    createSimplePurchase: async (payload: SimplePurchasePayload) => {
        const res = await api.post<SimplePurchaseDetails>("/procurement/purchases", payload);
        return res.data;
    },
    getSimplePurchase: async (purchaseOrderId: string) => {
        const res = await api.get<SimplePurchaseDetails>(`/procurement/purchases/${purchaseOrderId}`);
        return res.data;
    },
    receiveSimplePurchase: async (purchaseOrderId: string) => {
        const res = await api.post<SimplePurchaseDetails>(
            `/procurement/purchases/${purchaseOrderId}/receive`,
            {},
        );
        return res.data;
    },
    approveSimplePurchase: async (purchaseOrderId: string) => {
        const res = await api.post<SimplePurchaseDetails>(
            `/procurement/purchases/${purchaseOrderId}/approve`,
            {},
        );
        return res.data;
    },
};
