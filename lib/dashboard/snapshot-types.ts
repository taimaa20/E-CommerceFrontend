/**
 * Mirrors backend snapshot DTOs. Property names match the API response
 * (camelCase courtesy of System.Text.Json default settings).
 */
import type { DashboardFilter, DashboardScope } from "./filter-types";

export interface DashboardSnapshotEnvelope {
    scope: DashboardScope;
    generatedAtUtc: string;
    windowStartUtc: string;
    windowEndUtc: string;
    appliedFilter: DashboardFilter;
}

export interface TimeSeriesPoint { bucketStartUtc: string; value: number; count?: number | null }
export interface CategorySlice { label: string; labelAr?: string | null; value: number; percentage?: number | null; count?: number | null }
export interface RankedRow {
    id?: string | null;
    label: string;
    labelAr?: string | null;
    primaryValue: number;
    secondaryValue?: number | null;
    count?: number | null;
}
export interface DashboardAlert {
    code: string;
    severity: "info" | "warning" | "danger";
    titleKey: string;
    message?: string | null;
    payload?: unknown;
}

// ─── Operations ─────────────────────────────────────────────────────────────
export interface LivePipelineOrder {
    id: string;
    orderNumber: string;
    orderSequenceNumber?: string | null;
    tableName: string;
    orderType: "DineIn" | "Takeaway" | "Delivery";
    itemCount: number;
    total: number;
    status: "New" | "Preparing" | "Ready" | "Served" | "Paid" | "Cancelled" | "Completed";
    tone: "blue" | "amber" | "green" | "red" | "neutral";
    createdAtUtc: string;
    elapsedSeconds: number;
    cashier: string | null;
    cashierAr?: string | null;
}

export interface PaymentOrderTypeSlice {
    orderType: "DineIn" | "Takeaway" | "Delivery" | string;
    paymentMethod: string;
    paymentMethodAr?: string | null;
    value: number;
    count: number;
    percentage?: number | null;
}

export interface OperationsSnapshot extends DashboardSnapshotEnvelope {
    orders: {
        total: number;
        active: number; waiting: number; preparing: number; ready: number;
        paid: number; served: number; cancelled: number; refunded: number;
        staleOverThreshold: number; averageOrderValue: number;
    };
    revenue: {
        confirmed: number; gross: number; discounts: number; net: number; pending: number;
        cash: number; card: number;
        cashPercentage: number; cardPercentage: number;
        paymentBreakdown: CategorySlice[];
        paymentOrderTypeBreakdown?: PaymentOrderTypeSlice[];
    };
    health: {
        activeDineInTables: number; kitchenQueueLength: number;
        onlineOrdersLive: number; activeCashierSessions: number;
        averagePrepMinutes: number; prepOrderCount: number;
    };
    hourlySeries: TimeSeriesPoint[];
    orderTypeSplit: CategorySlice[];
    topProducts: RankedRow[];
    alerts: DashboardAlert[];
    recentOrders: LivePipelineOrder[];
}

// ─── Home / Overview ────────────────────────────────────────────────────────
export interface HomeSnapshotAlert {
    code: string;
    severity: "info" | "warning" | "danger" | "amber" | "red";
    title: string;
    titleAr?: string | null;
    meta?: string | null;
    metaAr?: string | null;
    occurredAtUtc: string;
}
export interface ActivityEntry {
    kind: "OrderPaid" | "WasteLogged" | "OrderCancelled" | "ShiftClosed" | string;
    title: string;
    meta?: string | null;
    occurredAtUtc: string;
    tone: "green" | "blue" | "amber" | "red" | "purple" | "neutral";
}
export interface HomeSnapshot extends DashboardSnapshotEnvelope {
    headline: {
        revenueToday: number; ordersToday: number; activeOrders: number; staleOrders: number;
        netProfit: number; marginPercent: number;
        wasteCost: number; wastePercent: number;
        activeTables: number; totalTables: number;
        averageOrderValue: number;
    };
    revenueTrend: TimeSeriesPoint[];
    hourlyOrders: TimeSeriesPoint[];
    topProducts: RankedRow[];
    topCashiers: RankedRow[];
    paymentSplit: CategorySlice[];
    orderTypeSplit: CategorySlice[];
    alerts: HomeSnapshotAlert[];
    recentActivity: ActivityEntry[];
}

// ─── Financial ──────────────────────────────────────────────────────────────

export interface KpiValue<T = number> {
    value: T;
    previousValue?: T | null;
    changePercent?: number | null;
}

export interface ExecutiveSummary {
    revenue: KpiValue;
    netProfit: KpiValue;
    grossMarginPercent: KpiValue;
    foodCostPercent: KpiValue;
    discountPercent: KpiValue;
    refundPercent: KpiValue;
    averageOrderValue: KpiValue;
    orders: KpiValue;
    customers: KpiValue;
    revenueGrowthPercent: number;
    lastUpdatedUtc: string;
}

export interface CategoryRevenue {
    categoryId?: string | null;
    name: string;
    nameAr?: string | null;
    revenue: number;
    revenuePercentage: number;
    cost?: number;
    profit?: number;
    marginPercent?: number;
    quantity: number;
    orderCount: number;
}

export interface CustomerRevenue {
    uniqueCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    revenueFromIdentified: number;
    revenueFromAnonymous: number;
    averageCustomerSpend: number;
    averagePurchaseFrequency: number;
    profitFromIdentified?: number;
    averageCustomerProfit?: number;
    topCustomers: RankedRow[];
}

export interface ProductProfitability {
    productId?: string | null;
    name: string;
    nameAr?: string | null;
    revenue: number;
    cost: number;
    profit: number;
    marginPercent: number;
    quantity: number;
}

export interface LaborCost {
    laborCost: number;
    laborCostPercentage: number;
    laborHours: number;
    revenuePerLaborHour: number;
    shiftCount: number;
    hasLaborData: boolean;
}

export interface DiscountCost {
    manualDiscounts: number;
    voucherDiscounts: number;
    complimentaryValue: number;
    partnerDiscounts: number;
    totalDiscountCost: number;
    discountPercentage: number;
}

export interface SalesMix {
    totalItems: number;
    averageItemsPerOrder: number;
    modifierRevenue: number;
    complimentaryItemCount: number;
    complimentaryValue: number;
}

export interface GrowthRow {
    id?: string | null;
    name: string;
    nameAr?: string | null;
    current: number;
    previous: number;
    changePercent: number;
}

export interface PurchasePriceVariance {
    rawMaterialId: string;
    name: string;
    nameAr?: string | null;
    minUnitPrice: number;
    maxUnitPrice: number;
    latestUnitPrice: number;
    averageUnitPrice: number;
    variancePercentage: number;
    purchaseCount: number;
}

export interface FoodCost {
    actualFoodCost: number;
    theoreticalFoodCost: number;
    foodCostPercentage: number;
    theoreticalFoodCostPercentage: number;
    foodCostVariance: number;
    foodCostVariancePercentage: number;
    hasTheoreticalData: boolean;
}

export interface SupplierSpend {
    supplierId: string;
    name: string;
    nameAr?: string | null;
    totalSpend: number;
    orderCount: number;
    spendPercentage: number;
    averageLeadTimeDays?: number;
    onTimeDeliveryPercentage?: number;
    receivedOrderCount?: number;
}

export interface RefundReason {
    reason: string;
    count: number;
    amount: number;
    percentage: number;
}

export interface TaxBreakdown {
    rate: number;
    taxableSales: number;
    taxAmount: number;
    orderCount: number;
}

export interface Purchasing {
    totalPurchasingCost: number;
    purchaseOrderCount: number;
    supplierSpend: SupplierSpend[];
    purchaseTrend: TimeSeriesPoint[];
}

export interface FinancialSnapshot extends DashboardSnapshotEnvelope {
    revenue: {
        gross: number; discounts: number; discountPercentage?: number; vouchers: number; refunds: number;
        net: number; tax: number; serviceCharge: number;
        orderCount: number; averageOrderValue: number;
    };
    profitability: {
        cogs: number; laborCost: number;
        primeCost?: number; primeCostPercentage?: number;
        grossProfit: number; grossMarginPercent?: number; netProfit: number;
        marginPercent: number; profitPerOrder?: number;
    };
    executiveSummary?: ExecutiveSummary;
    alerts?: HomeSnapshotAlert[];
    delivery: {
        orderCount: number; revenue: number; cost: number; profit: number;
    };
    costSharing?: CostSharingMetrics;
    revenueByDay: TimeSeriesPoint[];
    channelSplit: CategorySlice[];
    bestSellers: RankedRow[];
    worstSellers: RankedRow[];
    revenueByCashier: RankedRow[];
    discountsByUser?: RankedRow[];
    paymentMethodAnalytics?: PaymentMethodAnalytics[];
    orderSourceAnalytics?: OrderSourceAnalytics[];
    partnerAnalytics?: PartnerAnalytics[];
    cardBreakdown?: CategorySlice[];
    payMobBreakdown?: CategorySlice[];
    cancellations?: CancellationSummary;
    categoryRevenue?: CategoryRevenue[];
    customerRevenue?: CustomerRevenue;
    foodCost?: FoodCost;
    purchasing?: Purchasing;
    productProfitability?: ProductProfitability[];
    laborCost?: LaborCost;
    discountCost?: DiscountCost;
    salesMix?: SalesMix;
    revenueByWaiter?: RankedRow[];
    revenueByTable?: RankedRow[];
    revenueByHour?: TimeSeriesPoint[];
    productGrowth?: GrowthRow[];
    categoryGrowth?: GrowthRow[];
    purchasePriceVariance?: PurchasePriceVariance[];
    revenueByWeekday?: CategorySlice[];
    refundReasons?: RefundReason[];
    taxBreakdown?: TaxBreakdown[];
    comparison?: {
        previousRevenue: FinancialSnapshot["revenue"];
        previousProfitability: FinancialSnapshot["profitability"];
        revenueChangePercent: number;
        netProfitChangePercent: number;
        marginChangePercent: number;
    } | null;
}

export interface CommissionAnalysis extends DashboardSnapshotEnvelope {
    summary: CommissionSummary;
    partners: PartnerCommission[];
    paymentProviders: PaymentProviderCommission[];
    coverage: CommissionCoverage;
}

export interface CommissionCoverage {
    analyzed: number;
    fromSnapshot: number;
    reconstructed: number;
    excluded: number;
}

export type CommissionBasis = "Snapshot" | "Reconstructed" | "Mixed";

export interface CommissionSummary {
    totalPartnerCommission: number;
    totalPaymentFees: number;
    totalRestaurantCostSharing: number;
    totalProviderCostSharing: number;
    totalCommissionTransactions: number;
    averageCommissionPercentage: number;
    averageFeePerOrder: number;
}

export interface PartnerCommission {
    key: string;
    partner: string;
    partnerAr?: string | null;
    numberOfOrders: number;
    grossSales: number;
    commissionPercentage: number;
    commissionAmount: number;
    restaurantShare: number;
    partnerShare: number;
    restaurantFinalRevenue: number;
    averageCommissionPerOrder: number;
    basis: CommissionBasis;
    orders: CommissionOrder[];
}

export interface PaymentProviderCommission {
    key: string;
    paymentMethod: string;
    paymentMethodAr?: string | null;
    transactions: number;
    grossAmount: number;
    feePercentage: number;
    feeAmount: number;
    restaurantShare: number;
    providerShare: number;
    netAmountReceived: number;
    basis: CommissionBasis;
    orders: CommissionOrder[];
}

export interface CommissionOrder {
    orderId: string;
    orderNumber: string;
    dateUtc: string;
    customer: string;
    orderTotal: number;
    commissionPercentage: number;
    commissionAmount: number;
    restaurantShare: number;
    providerShare: number;
    netAmount: number;
    basis: CommissionBasis;
}

export interface CancellationSummary {
    cancelledBeforePaymentCount: number;
    cancelledBeforePaymentAmount: number;
    refundedOrderCount: number;
    refundedAmount: number;
}

export interface CostSharingMetrics {
    totalCommission: number;
    commissionPaidByRestaurant: number;
    commissionPaidByCounterparty: number;
    netRevenueAfterCostSharing: number;
}

export interface PaymentMethodAnalytics {
    key: string;
    name: string;
    nameAr?: string | null;
    isActive: boolean;
    totalOrders: number;
    grossRevenue: number;
    refundedOrderCount: number;
    refundAmount: number;
    discountAmount: number;
    netRevenue: number;
    totalCommission: number;
    restaurantShare: number;
    counterpartyShare: number;
    netSettlement: number;
    netRevenueAfterCostSharing: number;
    averageOrderValue: number;
    revenuePercentage: number;
}

export interface OrderSourceAnalytics {
    key: string;
    name: string;
    nameAr: string;
    orderCount: number;
    grossRevenue: number;
    netRevenue: number;
    refundedOrderCount: number;
    refundAmount: number;
    cancelledBeforePaymentCount: number;
    cancelledBeforePaymentAmount: number;
    averageOrderValue: number;
}

export interface PartnerAnalytics {
    key: string;
    name: string;
    nameAr?: string | null;
    isActive: boolean;
    orderCount: number;
    grossRevenue: number;
    netRevenue: number;
    deliveryFees: number;
    partnerFees: number;
    refundAmount: number;
    totalCommission: number;
    restaurantShare: number;
    counterpartyShare: number;
    netSettlement: number;
    netRevenueAfterCostSharing: number;
    averageOrderValue: number;
    cashOrderCount: number;
    cashRevenue: number;
    creditOrderCount: number;
    creditRevenue: number;
}

// ─── Inventory ──────────────────────────────────────────────────────────────
export interface InventorySnapshot extends DashboardSnapshotEnvelope {
    stockHealth: {
        outOfStockCount: number; lowStockCount: number;
        expiringWithin3Days: number; totalInventoryValue: number;
        reorderNeededCount: number;
        periodCogs?: number; stockTurnoverRatio?: number; daysInventoryOnHand?: number;
    };
    waste: {
        manualCount: number; expiryCount: number; cancellationCount: number;
        totalCost: number; salePriceLoss: number; wastePercentOfRevenue: number;
    };
    topWastedProducts: RankedRow[];
    wasteByEmployee: RankedRow[];
    wasteDailyTrend: TimeSeriesPoint[];
    expiringSoon: RankedRow[];
    wasteByCategory: CategorySlice[];
}

// ─── Audit ──────────────────────────────────────────────────────────────────
export interface AuditSnapshot extends DashboardSnapshotEnvelope {
    refundsByEmployee: RankedRow[];
    cancellationsByEmployee: RankedRow[];
    discountsByEmployee: RankedRow[];
    voucherAbuseByCashier: RankedRow[];
    manualStockReductions: RankedRow[];
    counters: {
        totalRefunds: number; totalRefundAmount: number;
        totalCancellations: number; totalCancelledAmount: number;
        cancelledAfterPayment: number; lateNightCancellations: number;
        zeroValueOrders: number; manualWasteEntries: number;
    };
    cancellationTrend: TimeSeriesPoint[];
    refundTrend: TimeSeriesPoint[];
}
