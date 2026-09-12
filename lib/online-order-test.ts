// Shared context for the isolated Online Order sandbox flow
// (/online-order-test → Paymob Hosted Checkout → /payment/paymob/callback).
// The Paymob redirection URL is static backend configuration and cannot carry
// the orderId, so the sandbox hands it to the callback page via sessionStorage
// (with a ?orderId= query fallback).

export const ONLINE_ORDER_TEST_CONTEXT_KEY = "online-order-test:pending-payment";

export interface OnlineOrderTestContext {
    orderId: string;
    orderNumber: string;
    amount: number;
    paymentId: string;
}

export function saveOnlineOrderTestContext(context: OnlineOrderTestContext): void {
    try {
        sessionStorage.setItem(ONLINE_ORDER_TEST_CONTEXT_KEY, JSON.stringify(context));
    } catch {
        // sessionStorage unavailable — the callback page falls back to ?orderId=.
    }
}

export function readOnlineOrderTestContext(): OnlineOrderTestContext | null {
    try {
        const raw = sessionStorage.getItem(ONLINE_ORDER_TEST_CONTEXT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<OnlineOrderTestContext>;
        if (typeof parsed.orderId !== "string" || parsed.orderId.length === 0) return null;
        return {
            orderId: parsed.orderId,
            orderNumber: typeof parsed.orderNumber === "string" ? parsed.orderNumber : "",
            amount: typeof parsed.amount === "number" ? parsed.amount : 0,
            paymentId: typeof parsed.paymentId === "string" ? parsed.paymentId : "",
        };
    } catch {
        return null;
    }
}
