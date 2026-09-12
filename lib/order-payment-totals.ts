export interface OrderPaymentTotals {
  afterDiscount: number;
  serviceAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateOrderPaymentTotals(
  subtotal: number,
  discountAmount: number,
  serviceRate: number,
  taxRate: number,
  // Affiliation group discount — a snapshot on the order, applied after the manual discount.
  groupDiscountAmount: number = 0,
): OrderPaymentTotals {
  const afterDiscount = Math.max(0, subtotal - discountAmount - Math.max(0, groupDiscountAmount));
  const serviceAmount = Math.round(afterDiscount * (serviceRate / 100) * 100) / 100;
  const taxAmount = Math.round(afterDiscount * (taxRate / 100) * 100) / 100;
  const total = Math.round((afterDiscount + serviceAmount + taxAmount) * 100) / 100;

  return {
    afterDiscount,
    serviceAmount,
    taxAmount,
    total,
  };
}

export function calculateFinalTotalAfterVoucher(total: number, voucherDiscount: number): number {
  return Math.round(Math.max(0, total - Math.max(0, voucherDiscount)) * 100) / 100;
}
