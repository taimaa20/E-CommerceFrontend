import type { OrderDto } from "@/types/order";
import type { PendingAction } from "./db";
import { applyPaymentToOrder, resolveOrderLifecycleStatus } from "@/lib/order-payments";
import { ORDER_STATUS } from "@/lib/status-constants";

// Payment state (isPaid, paymentStatus, paidAmount, payments, paymentMethod,
// amountTendered, changeAmount) is orthogonal to the kitchen/service workflow
// status (Preparing → Ready → Served → Completed). Every status transition
// MUST preserve these fields untouched so a paid order never "un-pays" just
// because the waiter hits "Mark Ready".
function preservePayment(order: OrderDto): Pick<
    OrderDto,
    "isPaid" | "paymentStatus" | "paidAmount" | "remainingAmount" |
    "payments" | "paymentMethod" | "amountTendered" | "changeAmount" |
    "isVoucherApplied" | "voucherDiscountAmount" | "voucherAppliedAt"
> {
    return {
        isPaid: order.isPaid,
        paymentStatus: order.paymentStatus,
        paidAmount: order.paidAmount,
        remainingAmount: order.remainingAmount,
        payments: order.payments,
        paymentMethod: order.paymentMethod,
        amountTendered: order.amountTendered,
        changeAmount: order.changeAmount,
        isVoucherApplied: order.isVoucherApplied,
        voucherDiscountAmount: order.voucherDiscountAmount,
        voucherAppliedAt: order.voucherAppliedAt,
    };
}

// Treat an order as "paid" for the purposes of preserving the legacy PAID
// status across status transitions. `status === "Paid"` alone is unreliable
// because our model now uses isPaid/paymentStatus as the truth.
function isEffectivelyPaid(order: OrderDto): boolean {
    return (
        order.isPaid === true ||
        order.paymentStatus === "Paid" ||
        order.status === ORDER_STATUS.PAID ||
        !!order.paymentMethod
    );
}

/**
 * Pure function: apply a single pending action to an order snapshot.
 *
 * Used in two places so that offline UI stays consistent across page
 * refreshes (where the overlay is gone once sync drains) and across
 * concurrent views (where every screen should read the same IDB state):
 *  1. Inside `applyPendingOverlay` — renders the queue on top of server data.
 *  2. Inside the offline helpers (`orders.ts`) — mutates the persisted
 *     snapshot at enqueue time so a reload offline reconstructs the
 *     correct UI even without the pending queue.
 *
 * Returning `null` means the order should be dropped from the list
 * (e.g. a cancel-order action).
 */
export function applyActionToOrder(order: OrderDto, action: PendingAction): OrderDto | null {
    if (
        order.status === ORDER_STATUS.CANCELLED ||
        order.isFullyCancelled === true ||
        order.isRefunded === true
    ) {
        return order;
    }

    switch (action.type) {
        case "pay":
            return applyPaymentToOrder(order, {
                amount: Number(action.payload.amount ?? order.remainingAmount ?? order.totalAmount ?? 0),
                method: (action.payload.paymentMethod as string) ?? order.paymentMethod ?? "Cash",
                paymentMethodId: action.payload.paymentMethodId as string | undefined,
                paymentMethodName: action.payload.paymentMethodName as string | undefined,
                paymentMethodNameAr: action.payload.paymentMethodNameAr as string | undefined,
                paymentMethodCode: action.payload.paymentMethodCode as string | undefined,
                referenceNumber: action.payload.referenceNumber as string | undefined,
                amountTendered: action.payload.amountTendered as number | undefined,
                applyVoucher: action.payload.applyVoucher as boolean | undefined,
                voucherDiscountAmount: action.payload.voucherDiscountAmount as number | undefined,
                createdAt: new Date(action.createdAt).toISOString(),
                id: action.id,
            });
        case "mark-ready": {
            const readyOrder = {
                ...order,
                ...preservePayment(order),
                items: (order.items ?? []).map((it) => ({ ...it, itemStatus: "Ready" })),
            };
            return {
                ...readyOrder,
                status: resolveOrderLifecycleStatus(readyOrder, isEffectivelyPaid(readyOrder)),
            };
        }
        case "mark-served":
        case "mark-pickup": {
            const handedOffOrder = {
                ...order,
                ...preservePayment(order),
                status: ORDER_STATUS.SERVED,
            };
            return {
                ...handedOffOrder,
                status: resolveOrderLifecycleStatus(handedOffOrder, isEffectivelyPaid(handedOffOrder)),
            };
        }
        case "add-items": {
            // `snapshotItems` is the UI-friendly projection written by
            // `addOrderItemsOffline`; fall back to `items` for queued actions
            // written before that field existed.
            const incoming = ((action.payload.snapshotItems as unknown[]) ??
                (action.payload.items as unknown[]) ??
                []) as OrderDto["items"];
            if (!incoming?.length) return order;
            const extraTotal = incoming.reduce(
                (sum, it) => sum + (it.lineTotalAmount ?? (it.unitPrice ?? 0) * (it.quantity ?? 0)),
                0
            );
            return {
                ...order,
                items: [...(order.items ?? []), ...incoming],
                totalAmount: (order.totalAmount ?? 0) + extraTotal,
                subtotal: (order.subtotal ?? 0) + extraTotal,
                remainingAmount: (order.remainingAmount ?? order.totalAmount ?? 0) + extraTotal,
            };
        }
        case "cancel-order": {
            // P3 (production fix): Offline cancellations used to drop the
            // order from the snapshot immediately, which diverged from the
            // backend whenever a manager-approval rule was configured —
            // the server holds the order as "pending cancellation", but
            // the cashier already saw it disappear and adjusted the till.
            // Keep the order visible with a pending-cancellation marker;
            // the server-side approval flow then drives the final state
            // (Cancelled on approval, back to its previous status on
            // rejection) when the queued cancel-order action syncs.
            const payload = action.payload as { cancelReason?: string; cancelReasonNote?: string | null } | undefined;
            return {
                ...order,
                ...preservePayment(order),
                hasPendingCancellation: true,
                hasPendingFullCancellation: true,
                cancellationInfo: order.cancellationInfo ?? {
                    cancelLogId: action.id,
                    requestedBy: "",
                    requestDate: new Date(action.createdAt).toISOString(),
                    cancellationReason: payload?.cancelReason ?? "",
                    notes: payload?.cancelReasonNote ?? null,
                    approvalStatus: "Pending",
                    previousStatus: order.status,
                },
            };
        }
        default:
            return order;
    }
}
