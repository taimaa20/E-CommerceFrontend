import type { OrderDto } from "@/types/order";
import { deleteOrderSnapshot, listOrderSnapshots, putOrderSnapshots } from "@/lib/offline/db";
import { isOfflineOrderId } from "@/lib/offline/id";
import { getConnectivityState } from "@/lib/offline/connectivity";

const normalizeName = (value?: string | null): string =>
    String(value ?? "").trim().toLowerCase();

export async function syncTableOrderSnapshots(
    tableNames: string[],
    orders: OrderDto[]
): Promise<void> {
    const normalizedNames = new Set(
        tableNames
            .map((name) => normalizeName(name))
            .filter((name) => name.length > 0)
    );

    if (!normalizedNames.size) return;

    // FIX(issue-3): Never reconcile snapshots against an authoritative-empty
    // list while offline. `getTableAllOrders` returns [] on network failure,
    // which used to wipe every offline-created order for the table and make
    // them vanish the moment the waiter reopened the panel.
    const online = getConnectivityState() === "online";
    if (!online) {
        if (orders.length) {
            await putOrderSnapshots(orders.map((order) => ({ id: order.id, data: order })));
        }
        return;
    }

    const snapshots = await listOrderSnapshots();
    const keepIds = new Set(orders.map((order) => order.id));
    const staleIds = snapshots
        .map((snapshot) => snapshot.data as OrderDto)
        .filter((order) =>
            order.orderType === "DineIn" &&
            normalizedNames.has(normalizeName(order.tableName)) &&
            !keepIds.has(order.id) &&
            // FIX(issue-3): Preserve offline-created orders — they have no
            // server counterpart yet, so they will never appear in `orders`
            // until the queue drains. Deleting them here causes the table
            // panel to flicker empty right after submit.
            !isOfflineOrderId(order.id)
        )
        .map((order) => order.id);

    if (staleIds.length) {
        await Promise.all(staleIds.map((id) => deleteOrderSnapshot(id)));
    }

    if (!orders.length) return;

    await putOrderSnapshots(orders.map((order) => ({ id: order.id, data: order })));
}
