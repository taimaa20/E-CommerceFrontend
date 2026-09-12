export interface CashierBalanceShift {
  id: string;
  cashierId: string;
  cashierName: string;
  openedByManagerId: string;
  shiftNumber?: number | null;
  openedAt: string;
  openingBalance: number;
  closedAt: string | null;
  closingBalance: number | null;
  variance: number | null;
  classification: "Match" | "Surplus" | "Deficit" | null;
  notes: string | null;
  closingComment: string | null;
  isClosed: boolean;
  isOpen?: boolean;
  paidOrderCount: number;
  ordersTotal: number;
  discountsTotal: number;
  cashOrdersTotal: number;
  cardOrdersTotal: number;
  expectedBalance: number;
  refundsTotal?: number;
  netTotal?: number;
  foodRevenue?: number;
  deliveryCollected?: number;
  deliveryCost?: number;
  deliveryProfit?: number;
  marketplaceFees?: number;
  marketplaceServiceFees?: number;
  netRestaurantRevenue?: number;
  /** Documented shift expenses. `cashExpensesTotal` is already deducted from `expectedBalance`. */
  expenseCount?: number;
  expensesTotal?: number;
  cashExpensesTotal?: number;
  nonCashExpensesTotal?: number;
  partnerSalesBreakdown?: CashierShiftPartnerSales[];
  paymentMethodsBreakdown?: CashierShiftPaymentMethodBreakdown[];
}

export interface CashierShiftPartnerSales {
  deliveryPartnerId?: string | null;
  partnerName: string;
  partnerCode?: string | null;
  orderCount: number;
  totalAmount: number;
  foodRevenue: number;
  deliveryCollected: number;
  deliveryCost: number;
  deliveryProfit: number;
  marketplaceFees: number;
  marketplaceServiceFees: number;
  netRevenue: number;
}

export interface CashierShiftPaymentMethodBreakdown {
  method: string;
  orderCount: number;
  amount: number;
  isCash: boolean;
}

export interface OpenCashierShiftPayload {
  cashierId: string;
  openingBalance: number;
  notes?: string | null;
  clientActionId?: string;
}

export interface CloseCashierShiftPayload {
  closingBalance: number;
  notes?: string | null;
  clientActionId?: string;
  /** When true, backend bypasses close-validation gates if AllowForcedShiftClose is on. */
  force?: boolean;
  /** Reason captured into the audit log when force=true. */
  forceReason?: string | null;
}
