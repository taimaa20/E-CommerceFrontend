import { api } from "@/lib/api";
import type { PaymentDto } from "@/types/order";

export const PAYMENT_ADJUSTMENT_REASONS = [
    "WRONG_PAYMENT_TYPE",
    "CUSTOMER_CHANGED_METHOD",
    "SPLIT_PAYMENT_CORRECTION",
    "CASH_BY_MISTAKE",
    "CARD_BY_MISTAKE",
    "OTHER",
] as const;

export type PaymentAdjustmentReasonCode = typeof PAYMENT_ADJUSTMENT_REASONS[number];

export interface PaymentAdjustmentAllocation {
    paymentMethodId: string;
    isCash?: boolean;
    amount: number;
    referenceNumber?: string;
}

export interface PaymentAdjustmentCreateRequest {
    reasonCode: PaymentAdjustmentReasonCode;
    reasonText?: string;
    payments: PaymentAdjustmentAllocation[];
}

export interface PaymentAdjustmentResult {
    adjustmentId: string;
    orderId: string;
    status: string;
    totalAmount: number;
    paymentMethod: string;
    requestedAt: string;
    approvedAt?: string | null;
    approvedByUserId?: string | null;
    approvedBy?: string | null;
    payments: PaymentDto[];
}

export interface PaymentAdjustmentReviewPayment {
    paymentMethodId?: string | null;
    paymentMethodName: string;
    paymentMethodNameAr?: string | null;
    paymentMethodCode?: string | null;
    amount: number;
    referenceNumber?: string | null;
}

export interface PaymentAdjustmentReview {
    adjustmentId: string;
    orderId: string;
    orderNumber: string;
    status: string;
    reason: string;
    requestedBy: string;
    requestedAt: string;
    totalAmount: number;
    currentPayments: PaymentAdjustmentReviewPayment[];
    proposedPayments: PaymentAdjustmentReviewPayment[];
}

export interface PaymentAdjustmentHistoryItem {
    adjustmentId: string;
    orderId: string;
    orderNumber: string;
    orderType: string;
    oldPaymentMethod: string;
    oldPaymentMethodAr?: string | null;
    newPaymentMethod: string;
    newPaymentMethodAr?: string | null;
    amount: number;
    requestedBy: string;
    approvedBy: string;
    reason: string;
    approvedAt: string;
}

export interface PaymentAdjustmentHistoryPage {
    items: PaymentAdjustmentHistoryItem[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface PaymentAdjustmentHistoryFilter {
    page: number;
    pageSize: number;
    dateFrom?: string;
    dateTo?: string;
    user?: string;
    manager?: string;
    paymentMethodId?: string;
    orderType?: string;
}

export async function requestOrderPaymentAdjustment(
    orderId: string,
    request: PaymentAdjustmentCreateRequest,
): Promise<PaymentAdjustmentResult> {
    const response = await api.post<PaymentAdjustmentResult>(
        `/payment-adjustments/orders/${orderId}`,
        request,
    );
    return response.data;
}

export async function getPendingPaymentAdjustment(
    orderId: string,
    adjustmentId: string,
): Promise<PaymentAdjustmentReview> {
    const response = await api.get<PaymentAdjustmentReview>(
        `/payment-adjustments/orders/${orderId}/requests/${adjustmentId}`,
    );
    return response.data;
}

export async function approvePaymentAdjustment(
    orderId: string,
    adjustmentId: string,
    managerNotes?: string,
): Promise<PaymentAdjustmentResult> {
    const response = await api.post<PaymentAdjustmentResult>(
        `/payment-adjustments/orders/${orderId}/requests/${adjustmentId}/approve`,
        { managerNotes: managerNotes?.trim() || undefined },
    );
    return response.data;
}

export async function rejectPaymentAdjustment(
    orderId: string,
    adjustmentId: string,
    managerNotes?: string,
): Promise<void> {
    await api.post(
        `/payment-adjustments/orders/${orderId}/requests/${adjustmentId}/reject`,
        { managerNotes: managerNotes?.trim() || undefined },
    );
}

export async function getPaymentAdjustmentHistory(
    filter: PaymentAdjustmentHistoryFilter,
): Promise<PaymentAdjustmentHistoryPage> {
    const response = await api.get<PaymentAdjustmentHistoryPage>(
        "/payment-adjustments/history",
        { params: filter },
    );
    return response.data ?? {
        items: [],
        totalCount: 0,
        pageNumber: filter.page,
        pageSize: filter.pageSize,
    };
}
