import type { OrderDiscountChange, OrderDiscountType, OrderDto } from "@/types/order";

export interface OrderDiscountTotals {
    discountAmount: number;
    discountGroupAmount: number;
    serviceChargeAmount: number;
    taxAmount: number;
    totalAmount: number;
}

export function roundMoney(value: number): number {
    return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

// Affiliation group discount amount for a given discountable base. Mirrors the backend:
// type 1 (FixedAmount) → flat value floored at 0 and capped at the base; otherwise → % of base.
export function computeGroupDiscountAmount(base: number, groupDiscountType: number, groupDiscountValue: number): number {
    const safeBase = Math.max(0, base);
    if (groupDiscountType === 1) {
        return roundMoney(Math.min(Math.max(0, groupDiscountValue), safeBase));
    }
    return roundMoney(safeBase * Math.min(100, Math.max(0, groupDiscountValue)) / 100);
}

export function calculateOrderDiscountTotals(
    subtotal: number,
    type: OrderDiscountType | null,
    value: number,
    serviceChargeRate: number,
    taxRate: number,
    // Affiliation discount group value + type. Applied after the manual order discount and
    // before service charge / tax — mirrors the backend pricing pipeline exactly.
    // groupDiscountType: 0 = Percentage, 1 = FixedAmount.
    groupDiscountValue: number = 0,
    groupDiscountType: number = 0,
): OrderDiscountTotals {
    const safeSubtotal = Math.max(0, subtotal);
    const safeValue = Math.max(0, value);
    const discountAmount = type === "Percentage"
        ? roundMoney(safeSubtotal * Math.min(100, safeValue) / 100)
        : type === "FixedAmount"
            ? roundMoney(Math.min(safeSubtotal, safeValue))
            : 0;
    const baseAfterManual = type === "FixedAmount"
        ? safeSubtotal
        : safeSubtotal - discountAmount;
    const discountGroupAmount = computeGroupDiscountAmount(baseAfterManual, groupDiscountType, groupDiscountValue);
    const chargeBase = baseAfterManual - discountGroupAmount;
    const serviceChargeAmount = roundMoney(chargeBase * Math.max(0, serviceChargeRate) / 100);
    const taxAmount = roundMoney(chargeBase * Math.max(0, taxRate) / 100);

    return {
        discountAmount,
        discountGroupAmount,
        serviceChargeAmount,
        taxAmount,
        totalAmount: roundMoney(safeSubtotal + serviceChargeAmount + taxAmount - discountAmount - discountGroupAmount),
    };
}

export function buildDiscountChange(
    order: OrderDto,
    type: OrderDiscountType | null,
    value: number,
): OrderDiscountChange | undefined {
    const normalizedValue = roundMoney(Math.max(0, value));
    const existingType = order.discountType ?? (order.discountPercentage > 0 ? "Percentage" : null);
    const existingValue = roundMoney(order.discountValue ?? order.discountPercentage ?? 0);

    if (!type || normalizedValue === 0) {
        return (order.discountAmount ?? 0) > 0 ? { operation: "Remove" } : undefined;
    }

    return existingType === type && existingValue === normalizedValue
        ? undefined
        : { operation: "Apply", type, value: normalizedValue };
}
