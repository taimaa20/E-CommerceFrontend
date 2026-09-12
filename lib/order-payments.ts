import { calculateOrderDiscountTotals } from "@/lib/order-discount";
import { ITEM_STATUS, ORDER_STATUS } from "@/lib/status-constants";
import type { OrderDiscountChange, OrderDto, PaymentDto } from "@/types/order";

export const ORDER_PAYMENT_STATUS = {
  PENDING: "Pending",
  PARTIAL: "Partial",
  PAID: "Paid",
  REFUNDED: "Refunded",
} as const;

export type OrderPaymentStatus =
  typeof ORDER_PAYMENT_STATUS[keyof typeof ORDER_PAYMENT_STATUS];

export interface PaymentBreakdownRow {
  method: string;
  amount: number;
}

export interface PaymentDraft {
  amount: number;
  method: string;
  paymentMethodId?: string | null;
  paymentMethodName?: string | null;
  paymentMethodNameAr?: string | null;
  paymentMethodCode?: string | null;
  referenceNumber?: string | null;
  amountTendered?: number;
  applyVoucher?: boolean;
  voucherDiscountAmount?: number;
  voucherAppliedAt?: string;
  serviceChargeRate?: number;
  taxRate?: number;
  discount?: OrderDiscountChange;
  createdAt?: string;
  id?: string;
}

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function getOrderPaidAmount(order: Pick<OrderDto, "paidAmount" | "payments" | "totalAmount" | "paymentMethod" | "isPaid" | "status">): number {
  if (typeof order.paidAmount === "number") {
    return roundMoney(order.paidAmount);
  }

  if (order.payments?.length) {
    return roundMoney(order.payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0));
  }

  if (order.isPaid || order.status === "Paid" || !!order.paymentMethod) {
    return roundMoney(order.totalAmount ?? 0);
  }

  return 0;
}

export function getOrderRemainingAmount(order: Pick<OrderDto, "remainingAmount" | "totalAmount" | "paidAmount" | "payments" | "paymentMethod" | "isPaid" | "status">): number {
  if (typeof order.remainingAmount === "number") {
    return roundMoney(Math.max(0, order.remainingAmount));
  }

  return roundMoney(Math.max(0, (order.totalAmount ?? 0) - getOrderPaidAmount(order)));
}

export function getOrderPaymentStatus(order: Pick<OrderDto, "isRefunded" | "paymentStatus" | "remainingAmount" | "totalAmount" | "paidAmount" | "payments" | "paymentMethod" | "isPaid" | "status">): OrderPaymentStatus {
  if (order.isRefunded || order.status === ORDER_PAYMENT_STATUS.REFUNDED) {
    return ORDER_PAYMENT_STATUS.REFUNDED;
  }

  if (order.paymentStatus === ORDER_PAYMENT_STATUS.PAID || order.paymentStatus === ORDER_PAYMENT_STATUS.PARTIAL) {
    return order.paymentStatus;
  }

  const paidAmount = getOrderPaidAmount(order);
  const remainingAmount = getOrderRemainingAmount(order);

  if ((order.isPaid || order.status === "Paid") && remainingAmount <= 0) {
    return ORDER_PAYMENT_STATUS.PAID;
  }

  if (paidAmount <= 0) {
    return ORDER_PAYMENT_STATUS.PENDING;
  }

  return remainingAmount <= 0
    ? ORDER_PAYMENT_STATUS.PAID
    : ORDER_PAYMENT_STATUS.PARTIAL;
}

export function getPaymentBreakdown(order: Pick<OrderDto, "payments" | "paymentMethod" | "totalAmount" | "isPaid" | "status" | "paidAmount" | "remainingAmount" | "paymentStatus">): PaymentBreakdownRow[] {
  if (order.payments?.length) {
    const grouped = new Map<string, number>();

    for (const payment of order.payments) {
      const method = getPaymentDisplayName(payment);
      grouped.set(method, roundMoney((grouped.get(method) ?? 0) + (payment.amount ?? 0)));
    }

    return Array.from(grouped.entries()).map(([method, amount]) => ({ method, amount }));
  }

  if (getOrderPaymentStatus(order) === ORDER_PAYMENT_STATUS.PAID && order.paymentMethod) {
    return [{ method: order.paymentMethod, amount: roundMoney(order.totalAmount ?? 0) }];
  }

  return [];
}

export function getPaymentSummaryLabel(order: Pick<OrderDto, "payments" | "paymentMethod" | "totalAmount" | "isPaid" | "status" | "paidAmount" | "remainingAmount" | "paymentStatus">): string | undefined {
  const methods = getPaymentBreakdown(order).map((payment) => payment.method);
  if (methods.length === 0) {
    return order.paymentMethod ?? undefined;
  }

  return Array.from(new Set(methods)).join(" + ");
}

export function getPaymentTypeSummaryLabel(payments: PaymentDto[]): string | undefined {
  const methods = payments
    .map((payment) => payment.method?.trim())
    .filter((method): method is string => !!method);

  return methods.length === 0
    ? undefined
    : Array.from(new Set(methods)).join(" + ");
}

export function getPaymentDisplayName(payment: PaymentDto): string {
  const type = payment.method?.trim();
  if (type && !isCashMethod(type) && payment.paymentMethodName?.trim()) {
    return payment.paymentMethodName.trim();
  }

  return type || "Unknown";
}

function isCashMethod(method: string): boolean {
  const normalized = method.toLowerCase();
  return normalized.includes("cash") || normalized.includes("nakit");
}

export function resolveOrderLifecycleStatus(
  order: Pick<OrderDto, "status" | "items">,
  isPaid: boolean,
): string {
  if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.COMPLETED) {
    return order.status;
  }

  const isReady = (order.items ?? []).every((item) => item.itemStatus === ITEM_STATUS.READY);
  const isHandedOff = order.status === ORDER_STATUS.SERVED;

  if (isReady && isPaid && isHandedOff) return ORDER_STATUS.COMPLETED;
  if (isHandedOff) return ORDER_STATUS.SERVED;
  if (isPaid) return ORDER_STATUS.PAID;
  if (isReady) return ORDER_STATUS.READY;
  return order.status;
}

export function applyPaymentToOrder(order: OrderDto, draft: PaymentDraft): OrderDto {
  const paymentAmount = roundMoney(draft.amount);
  const discountType = draft.discount?.operation === "Remove"
    ? null
    : draft.discount?.type ?? order.discountType ?? (order.discountPercentage > 0 ? "Percentage" : null);
  const discountValue = draft.discount?.operation === "Remove"
    ? 0
    : draft.discount?.value ?? order.discountValue ?? order.discountPercentage ?? 0;
  const discountTotals = calculateOrderDiscountTotals(
    order.subtotal ?? 0,
    discountType,
    discountValue,
    draft.serviceChargeRate ?? order.serviceChargeRate ?? 0,
    draft.taxRate ?? order.taxRate ?? 0,
    order.discountGroupValue ?? 0,
    order.discountGroupType ?? 0,
  );
  const discountChanged = draft.discount != null;
  const baseTotalAmount = discountChanged ? discountTotals.totalAmount : roundMoney(order.totalAmount ?? 0);
  const voucherDiscount = draft.applyVoucher && !order.isVoucherApplied
    ? roundMoney(draft.voucherDiscountAmount ?? 0)
    : roundMoney(order.voucherDiscountAmount ?? 0);
  const voucherApplied = order.isVoucherApplied === true || (draft.applyVoucher === true && voucherDiscount > 0);
  const totalAmount = draft.applyVoucher && !order.isVoucherApplied
    ? roundMoney(Math.max(0, baseTotalAmount - voucherDiscount))
    : baseTotalAmount;
  const payments: PaymentDto[] = [
    ...(order.payments ?? []),
    {
      id: draft.id ?? `local-${Date.now()}`,
      amount: paymentAmount,
      method: draft.method,
      paymentMethodId: draft.paymentMethodId,
      paymentMethodName: draft.paymentMethodName,
      paymentMethodNameAr: draft.paymentMethodNameAr,
      paymentMethodCode: draft.paymentMethodCode,
      referenceNumber: draft.referenceNumber,
      createdAt: draft.createdAt ?? new Date().toISOString(),
    },
  ];

  const paidAmount = roundMoney(getOrderPaidAmount(order) + paymentAmount);
  const remainingAmount = roundMoney(Math.max(0, totalAmount - paidAmount));
  const isPaid = remainingAmount <= 0 && (paidAmount > 0 || voucherApplied || order.isPaid === true);
  const nextStatus = isPaid ? ORDER_PAYMENT_STATUS.PAID : ORDER_PAYMENT_STATUS.PARTIAL;
  const cashTendered = draft.method === "Cash" ? roundMoney(draft.amountTendered ?? 0) : 0;
  const cashChange = cashTendered > 0 ? roundMoney(Math.max(0, cashTendered - paymentAmount)) : 0;

  return {
    ...order,
    payments,
    totalAmount,
    discountType,
    discountValue,
    discountPercentage: discountType === "Percentage" ? discountValue : 0,
    discountAmount: discountChanged ? discountTotals.discountAmount : order.discountAmount,
    serviceChargeAmount: discountChanged ? discountTotals.serviceChargeAmount : order.serviceChargeAmount,
    taxAmount: discountChanged ? discountTotals.taxAmount : order.taxAmount,
    discountAppliedByName: order.discountAppliedByName,
    discountAppliedAt: discountChanged ? new Date().toISOString() : order.discountAppliedAt,
    isVoucherApplied: voucherApplied,
    voucherDiscountAmount: voucherApplied ? voucherDiscount : order.voucherDiscountAmount,
    voucherAppliedAt: voucherApplied ? draft.voucherAppliedAt ?? order.voucherAppliedAt ?? new Date().toISOString() : order.voucherAppliedAt,
    paidAmount,
    remainingAmount,
    paymentStatus: nextStatus,
    isPaid,
    status: resolveOrderLifecycleStatus(order, isPaid),
    paymentMethod: isPaid ? getPaymentTypeSummaryLabel(payments) : undefined,
    amountTendered: cashTendered > 0 ? roundMoney((order.amountTendered ?? 0) + cashTendered) : order.amountTendered,
    changeAmount: cashChange > 0 ? roundMoney((order.changeAmount ?? 0) + cashChange) : order.changeAmount,
  };
}
