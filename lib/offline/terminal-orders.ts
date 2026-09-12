import { ORDER_STATUS } from "@/lib/status-constants";
import type { OrderDto } from "@/types/order";
import { getSelectedBranchCacheKey } from "@/lib/branch-selection";
import { getOrderSnapshot, getReferenceCache, putOrderSnapshot } from "@/lib/offline/db";

function getOrderListCacheKeys(): string[] {
    return [
        `takeaway:active:${getSelectedBranchCacheKey()}`,
        "cashier:active",
        "cashier:today",
        "cashier:mine",
        "cashier:week",
        "cashier:month",
        "cashier:recent",
        "cashier:all",
    ];
}

export async function markConfirmedCancelledOrderSnapshot(
    orderId: string,
    confirmedOrder?: OrderDto,
    refunded = false,
): Promise<void> {
    const snapshot = await getOrderSnapshot(orderId).catch(() => undefined);
    const cachedOrder = snapshot?.data as OrderDto | undefined;
    const referenceOrder = cachedOrder || confirmedOrder
        ? undefined
        : await findReferenceOrder(orderId);
    const baseOrder = cachedOrder ?? confirmedOrder ?? referenceOrder;
    if (!baseOrder) return;

    await putOrderSnapshot(orderId, {
        ...confirmedOrder,
        ...baseOrder,
        status: ORDER_STATUS.CANCELLED,
        isFullyCancelled: true,
        isRefunded: refunded || baseOrder.isRefunded === true || confirmedOrder?.isRefunded === true,
        hasPendingCancellation: false,
        hasPendingFullCancellation: false,
        pendingCancellationItemIds: [],
        syncedAt: confirmedOrder?.syncedAt ?? new Date().toISOString(),
    });
}

async function findReferenceOrder(orderId: string): Promise<OrderDto | undefined> {
    const cachedLists = await Promise.all(
        getOrderListCacheKeys().map((key) =>
            getReferenceCache<OrderDto[]>(key).catch(() => undefined)
        )
    );
    return cachedLists.flatMap((orders) => orders ?? []).find((order) => order.id === orderId);
}
