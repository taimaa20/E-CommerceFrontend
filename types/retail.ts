// Mirrors RestaurantPos.Api.Modules.Retail.DTOs. Every cost/price/stock aggregate here is
// derived server-side from the product, its retail detail row and its order lines — none of
// it is a stored balance.

export type RetailStockStatus = "OutOfStock" | "Urgent" | "ReorderNow" | "Ok";

/**
 * Retail attributes carried on the EXISTING ProductDto. `undefined`/`null` means the product
 * is an ordinary restaurant product — that is the only signal any screen needs.
 */
export interface RetailProductDetail {
    sku: string;
    barcode?: string | null;
    brand?: string | null;
    sizeLabel?: string | null;
    countryOfOrigin?: string | null;

    supplierId?: string | null;
    supplierName?: string | null;
    supplierNameAr?: string | null;

    receivedQuantity: number;
    soldQuantity: number;
    stockOnHand: number;
    reorderLevel: number;
    stockStatus: RetailStockStatus;

    supplierCostTotal: number;
    shippingCostPerUnit: number;
    totalCost: number;

    targetMarginPercent?: number | null;
    calculatedSellingPrice?: number | null;
    profitPerUnit?: number | null;
    actualMarginPercent?: number | null;
}

/** Write shape accepted by the existing product create/update endpoints. */
export interface RetailProductDetailUpsert {
    sku: string;
    barcode?: string | null;
    brand?: string | null;
    sizeLabel?: string | null;
    countryOfOrigin?: string | null;
    supplierId?: string | null;
    receivedQuantity: number;
    supplierCostTotal: number;
    shippingCostPerUnit: number;
    targetMarginPercent?: number | null;
}

export interface RetailProductDto extends RetailProductDetail {
    id: string;
    productId: string;
    name: string;
    nameAr?: string | null;
    displayName: string;
    categoryId?: string | null;
    categoryName?: string | null;
    categoryNameAr?: string | null;
    categoryDisplayName?: string | null;
    supplierDisplayName?: string | null;
    costPerItem?: number | null;
    approvedSellingPrice: number;
    isActive: boolean;
    imageUrl?: string | null;
}

export interface RetailCatalogSummaryDto {
    productCount: number;
    supplierCount: number;
    brandCount: number;
    totalStockUnits: number;
    inventoryValueAtCost: number;
    inventoryValueAtRetail: number;
    outOfStockCount: number;
    reorderCount: number;
}

export interface RetailCatalogPage {
    items: RetailProductDto[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface RetailCatalogQuery {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
    supplierId?: string;
    brand?: string;
    /** Scope to the active branch's catalogue and its stock position. */
    currentBranchOnly?: boolean;
}

// ── Sales history (read projection over Order / OrderItem / Payment) ──────────

export interface RetailSaleLineDto {
    orderId: string;
    orderItemId: string;
    soldAtUtc: string;
    orderNumber: string;
    customerName?: string | null;
    customerPhone?: string | null;
    productId: string;
    sku: string;
    barcode?: string | null;
    productName: string;
    brand?: string | null;
    supplierName?: string | null;
    quantity: number;
    approvedUnitPrice?: number | null;
    soldUnitPrice: number;
    lineTotal: number;
    /** Cost of goods snapshotted when the line was relieved from stock. */
    lineCost: number;
    unitCost?: number | null;
    lineProfit: number;
    hasCostSnapshot: boolean;
    orderStatus: string;
    paymentMethod?: string | null;
    isPaid: boolean;
    isGift: boolean;
    isPriceOverride: boolean;
    isImportedHistory: boolean;
}

export interface RetailSalesPage {
    items: RetailSaleLineDto[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalAmount: number;
    totalUnits: number;
}

export interface RetailSalesQuery {
    pageNumber?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    search?: string;
    productId?: string;
    sku?: string;
    brand?: string;
    paymentStatus?: "paid" | "unpaid" | "gift";
    /** Restrict to one order — used by the retail detail inside the Orders screen. */
    orderId?: string;
}

// ── Performance (corrected SUMMARY PROFIT) ───────────────────────────────────

export interface RetailProductPerformanceDto {
    productId: string;
    sku: string;
    productName: string;
    brand?: string | null;
    categoryName?: string | null;
    supplierName?: string | null;
    quantitySold: number;
    totalSales: number;
    costPerItem?: number | null;
    totalCost: number;
    linesWithoutCostSnapshot: number;
    grossProfit: number;
    profitPercent: number;
}

export interface RetailPerformanceReport {
    totalSales: number;
    totalUnitsSold: number;
    totalCost: number;
    grossProfit: number;
    grossMarginPercent: number;
    productCount: number;
    orderCount: number;
    outstandingUnpaid: number;
    linesWithoutCostSnapshot: number;
    products: RetailProductPerformanceDto[];
}

// ── Legacy purchase history + suppliers ──────────────────────────────────────

export interface RetailLegacyPurchaseDto {
    id: string;
    orderDateUtc: string;
    purchaseOrderNumber: string;
    invoiceNumber?: string | null;
    supplierId?: string | null;
    supplierName: string;
    quantityPieces: number;
    supplierCost: number;
    shippingCustomsClearance: number;
    totalCost: number;
    status?: string | null;
}

// Retail suppliers are read through the shared supplier endpoints in lib/api-procurement.ts —
// there is deliberately no retail supplier model here.

// ── Operational purchasing (SKU-level, on the shared Supplier master) ────────

export type RetailPurchaseOrderStatus = "Draft" | "Submitted" | "Received" | "Cancelled";
export type RetailLandedCostAllocation = "ByQuantity" | "ByValue";

export interface RetailPurchaseOrderLineDto {
    id: string;
    productId: string;
    sku: string;
    productName: string;
    brand?: string | null;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    lineCost: number;
    allocatedCharges: number;
    /** Unit cost including this line's share of shipping/customs/clearance. */
    landedUnitCost: number;
}

export interface RetailPurchaseOrderDto {
    id: string;
    orderNumber: string;
    invoiceNumber?: string | null;
    status: RetailPurchaseOrderStatus;
    branchId: string;
    supplierId: string;
    supplierName: string;
    supplierNameAr?: string | null;
    orderDateUtc: string;
    expectedDateUtc?: string | null;
    receivedAtUtc?: string | null;
    shippingCost: number;
    customsCost: number;
    clearanceCost: number;
    landedCostAllocation: RetailLandedCostAllocation;
    goodsCost: number;
    totalCost: number;
    totalUnitsOrdered: number;
    totalUnitsReceived: number;
    notes?: string | null;
    /** True once the receipt posted its stock movements. Receiving again does nothing. */
    stockPosted: boolean;
    lines: RetailPurchaseOrderLineDto[];
}

export interface RetailPurchaseOrderLineInput {
    productId: string;
    quantity: number;
    unitCost: number;
}

export interface RetailPurchaseOrderCreateInput {
    supplierId: string;
    orderNumber?: string;
    invoiceNumber?: string;
    orderDateUtc?: string;
    expectedDateUtc?: string;
    shippingCost: number;
    customsCost: number;
    clearanceCost: number;
    landedCostAllocation: RetailLandedCostAllocation;
    notes?: string;
    lines: RetailPurchaseOrderLineInput[];
}

export interface RetailPurchaseReceiptInput {
    invoiceNumber?: string;
    lines: { lineId: string; quantityReceived: number }[];
}

export interface RetailPurchaseOrderPage {
    items: RetailPurchaseOrderDto[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export type RetailStockMovementType =
    | "OpeningBalance"
    | "PurchaseReceipt"
    | "Sale"
    | "SaleReversal"
    | "AdjustmentIncrease"
    | "AdjustmentDecrease";

export interface RetailStockMovementDto {
    id: string;
    productId: string;
    sku: string;
    productName: string;
    branchId: string;
    movementType: RetailStockMovementType;
    /** Signed: positive adds stock, negative removes it. Stock on hand is their sum. */
    quantity: number;
    unitCost?: number | null;
    totalCost?: number | null;
    sourceDocumentType: string;
    sourceDocumentId?: string | null;
    sourceReference?: string | null;
    occurredAtUtc: string;
    performedBySystem?: string | null;
    notes?: string | null;
    balanceAfter: number;
}

// ── Manual stock corrections ─────────────────────────────────────────────────

export interface RetailStockAdjustmentCreateInput {
    /** The quantity the shelf should show — not a delta. */
    newStock: number;
    reason: string;
}

export interface RetailStockAdjustmentResultDto {
    productId: string;
    sku: string;
    productName: string;
    branchId: string;
    previousStock: number;
    newStock: number;
    delta: number;
    reason: string;
    adjustedAtUtc: string;
    /** Null when the requested stock already matched, so nothing was posted. */
    movementId?: string | null;
}
