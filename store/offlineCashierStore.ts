import { create } from "zustand";
import type { OrderDto } from "@/types/order";
import type { PendingAction } from "@/lib/offline/db";
import {
    putOrderSnapshots,
    listOrderSnapshotsForActiveBranch,
    subscribeSnapshots,
} from "@/lib/offline/db";
import {
    initQueue,
    subscribeQueue,
    getCachedActions,
    drainNow,
} from "@/lib/offline/queue";
import { applyActionToOrder } from "@/lib/offline/snapshot-mutations";
import {
    getConnectivityState,
    subscribeConnectivity,
    type ConnectivityState,
} from "@/lib/offline/connectivity";
import {
    warmOfflineCache,
    getCacheStatus,
    type CacheStatus,
} from "@/lib/offline/preload";

/**
 * Offline cashier store — thin reactive layer over IndexedDB queue + connectivity.
 *
 * Responsibilities:
 *  - Bootstrap IDB + connectivity once per app lifetime
 *  - Expose pending actions + online state reactively
 *  - Provide `applyOptimistic(server)` to overlay pending actions on top of
 *    server orders, returning the effective order list the cashier sees
 *  - Cache server orders to IDB so a refresh restores state offline
 */

interface OfflineCashierState {
    pending: PendingAction[];
    /**
     * Reactive snapshot of every order known to IDB (server-cached and
     * offline-created). Writes to `orders_snapshot` fan out here so any page
     * subscribing to this slice re-renders automatically when offline actions
     * mutate the underlying IDB row.
     */
    snapshots: OrderDto[];
    connectivity: ConnectivityState;
    bootstrapped: boolean;
    cacheStatus: CacheStatus;
    bootstrap: () => Promise<void>;
    syncNow: () => Promise<void>;
    hydrateFromCache: () => Promise<OrderDto[]>;
    cacheServerOrders: (orders: OrderDto[]) => void;
}

export const useOfflineCashierStore = create<OfflineCashierState>()((set, get) => ({
    pending: [],
    snapshots: [],
    connectivity: "online",
    bootstrapped: false,
    cacheStatus: "warming",

    bootstrap: async () => {
        if (get().bootstrapped) return;
        set({ bootstrapped: true });
        set({ connectivity: getConnectivityState() });
        subscribeConnectivity((c) => set({ connectivity: c }));
        subscribeQueue((actions) => set({ pending: actions }));
        // Push any IDB snapshot change into the reactive slice so dine-in,
        // cashier and takeaway pages refresh without polling.
        subscribeSnapshots(async () => {
            try {
                const snapshots = await listOrderSnapshotsForActiveBranch();
                set({ snapshots: snapshots.map((s) => s.data as OrderDto) });
            } catch {
                /* ignore read errors */
            }
        });

        // Reference cache must be warm before the queue drains so offline
        // callers reading products/tables/offers don't race against an empty
        // IDB on cold start.
        set({ cacheStatus: "warming" });
        try {
            await warmOfflineCache();
        } catch {
            /* warmOfflineCache already swallows individual fetcher errors */
        }
        set({ cacheStatus: await getCacheStatus() });

        await initQueue();
        set({ pending: getCachedActions() });
        try {
            const snapshots = await listOrderSnapshotsForActiveBranch();
            set({ snapshots: snapshots.map((s) => s.data as OrderDto) });
        } catch {
            /* ignore */
        }
    },

    syncNow: async () => {
        await drainNow();
        set({ pending: getCachedActions() });
    },

    hydrateFromCache: async () => {
        try {
            const snapshots = await listOrderSnapshotsForActiveBranch();
            const orders = snapshots.map((s) => s.data as OrderDto);
            set({ snapshots: orders });
            return orders;
        } catch {
            return [];
        }
    },

    cacheServerOrders: (orders) => {
        // Fire-and-forget; never block the UI
        void putOrderSnapshots(orders.map((o) => ({ id: o.id, data: o }))).catch(() => {});
    },
}));

/**
 * Apply pending actions as optimistic overlay on top of server orders.
 * Pure function — safe to use inside `useMemo`.
 */
export function applyPendingOverlay(serverOrders: OrderDto[], pending: PendingAction[]): OrderDto[] {
    if (!pending.length) return serverOrders;
    const active = pending.filter((a) =>
        a.status === "pending" ||
        a.status === "processing" ||
        a.status === "syncing" ||
        a.status === "retrying"
    );
    if (!active.length) return serverOrders;

    // Index actions once — avoids an O(orders*actions) scan.
    const byOrderId = new Map<string, PendingAction[]>();
    for (const a of active) {
        const bucket = byOrderId.get(a.orderId);
        if (bucket) bucket.push(a);
        else byOrderId.set(a.orderId, [a]);
    }

    const applyActionsToOrder = (order: OrderDto, actions: PendingAction[]): OrderDto | null => {
        let next: OrderDto | null = order;
        for (const a of actions) {
            if (!next) return null;
            next = applyActionToOrder(next, a);
        }
        return next;
    };

    const result: OrderDto[] = [];
    const seen = new Set<string>();

    for (const order of serverOrders) {
        const actions = byOrderId.get(order.id);
        const next = actions ? applyActionsToOrder(order, actions) : order;
        if (next) result.push(next);
        seen.add(order.id);
    }

    // Orders that exist only in the queue (offline-created, not yet synced)
    // need an anchor snapshot. The cashier page threads those in via its
    // `hydrateFromCache` path; we just make sure they aren't dropped when
    // other pending actions target them.
    return result;
}
