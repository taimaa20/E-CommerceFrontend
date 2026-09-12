"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderDto } from "@/types/order";
import { getCashierOrdersStrict, type CashierOrdersDateFilter } from "@/lib/api";
import { getConnectivityState } from "@/lib/offline/connectivity";
import { recordServerSequences } from "@/lib/offline/id";
import { getReferenceCache, putReferenceCache } from "@/lib/offline/db";
import { getSelectedBranchCacheKey } from "@/lib/branch-selection";
import { mergeCashierOrders } from "@/lib/cashier-order-selectors";
import { useOfflineCashierStore } from "@/store/offlineCashierStore";
import { useActiveBranchVersion } from "@/store/branchContextStore";

const CASHIER_HISTORY_PAGE_SIZE = 200;

// Branch-scoped: the orders list is loaded with the active branch's X-Branch-ID,
// so its offline mirror must never be replayed under a different branch.
function cacheKeyForDateFilter(dateFilter: CashierOrdersDateFilter) {
    return `cashier:${getSelectedBranchCacheKey()}:${dateFilter}`;
}

interface UseCashierOrdersResult {
    /** Raw orders list — the single source of truth. Filters derive from this. */
    orders: OrderDto[];
    /** Imperative setter for optimistic updates (SignalR, payment, status changes). */
    setOrders: React.Dispatch<React.SetStateAction<OrderDto[]>>;
    /** Debounced refresh — call after any mutation (create/pay/cancel/status). */
    refresh: () => void;
    /** Initial fetch, invoked once after auth/mount gates pass. */
    load: () => Promise<OrderDto[]>;
    loadMore: () => Promise<OrderDto[]>;
    hasMore: boolean;
    isLoadingMore: boolean;
    /** Clear any pending debounce timer — call from component unmount. */
    cancelPending: () => void;
}

/**
 * Fetch + offline-cache the raw cashier orders list.
 *
 * Invariants:
 *  - Fetches the selected server window (today/week/month/all) and still
 *    applies local UI filters on top. Offline snapshots are folded in so
 *    active orders remain visible without the network.
 *  - Offline-first: always seeds from the IDB `orders_snapshot` cache before
 *    hitting the network so the screen never flashes empty.
 *  - On successful fetch, merges with local state (preserves in-flight
 *    optimistic updates) and writes back to the IDB snapshot cache.
 *  - On network/server failure, keeps the cached view rather than clearing.
 *  - IDB snapshots fan in reactively via `offlineSnapshots` so offline-created
 *    orders appear automatically without polling.
 */
export function useCashierOrders(dateFilter: CashierOrdersDateFilter = "today"): UseCashierOrdersResult {
    const [orders, setOrders] = useState<OrderDto[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const ordersRef = useRef<OrderDto[]>([]);
    const pageRef = useRef(1);
    const isLoadingRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const offlineSnapshots = useOfflineCashierStore((s) => s.snapshots);
    const cacheServerOrders = useOfflineCashierStore((s) => s.cacheServerOrders);
    const hydrateFromCache = useOfflineCashierStore((s) => s.hydrateFromCache);
    const branchVersion = useActiveBranchVersion();

    // Reset on branch switch as well as date-filter change: `load()` merges into
    // the existing list, so carrying rows across a switch would mix branches.
    useEffect(() => {
        setOrders([]);
        ordersRef.current = [];
        pageRef.current = 1;
        setHasMore(false);
    }, [dateFilter, branchVersion]);

    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    const loadOfflineBase = useCallback(async (): Promise<OrderDto[]> => {
        const [snapshotOrders, cachedCashierOrders] = await Promise.all([
            hydrateFromCache().catch(() => [] as OrderDto[]),
            getReferenceCache<OrderDto[]>(cacheKeyForDateFilter(dateFilter)).catch(() => undefined),
        ]);

        const byId = new Map<string, OrderDto>();
        for (const order of cachedCashierOrders ?? []) byId.set(order.id, order);
        for (const order of snapshotOrders) byId.set(order.id, order);
        return Array.from(byId.values());
    }, [dateFilter, hydrateFromCache]);

    const load = useCallback(async (): Promise<OrderDto[]> => {
        // Memoize the offline base for this call so seed + offline-path + error-path
        // share one IDB read instead of querying the snapshot store up to 3 times.
        let offlineBasePromise: Promise<OrderDto[]> | null = null;
        const getOfflineBase = () => (offlineBasePromise ??= loadOfflineBase());

        try {
            // Seed from IDB first so the screen has something to render while
            // the network call is in flight (or if it fails entirely).
            if (ordersRef.current.length === 0) {
                const cached = await getOfflineBase();
                if (cached.length) setOrders(cached);
            }

            // Offline: the IDB cache is authoritative. Skip the network call.
            if (getConnectivityState() !== "online") {
                const cached = await getOfflineBase();
                if (cached.length) {
                    setOrders(cached);
                    return cached;
                }
                return ordersRef.current;
            }

            const data = await getCashierOrdersStrict(dateFilter, {
                page: 1,
                pageSize: CASHIER_HISTORY_PAGE_SIZE,
            });
            const merged = mergeCashierOrders(ordersRef.current, data);
            setOrders(merged);
            pageRef.current = 1;
            setHasMore(data.length === CASHIER_HISTORY_PAGE_SIZE);
            // Keep the offline sequence high-water current so an offline switch continues "OFF#N"
            // from the last synced server "#N" instead of restarting mid-day.
            void recordServerSequences(data);
            cacheServerOrders(merged);
            void putReferenceCache(cacheKeyForDateFilter(dateFilter), merged).catch(() => {});
            return merged;
        } catch (error) {
            console.error("Failed to load cashier orders — falling back to cache", error);
            const cached = await getOfflineBase();
            if (cached.length && ordersRef.current.length === 0) {
                setOrders(cached);
            }
            return ordersRef.current;
        } finally {
            isLoadingRef.current = false;
        }
    }, [dateFilter, loadOfflineBase, cacheServerOrders]);

    const loadMore = useCallback(async (): Promise<OrderDto[]> => {
        if (getConnectivityState() !== "online" || isLoadingRef.current || isLoadingMore) {
            return ordersRef.current;
        }

        setIsLoadingMore(true);
        try {
            const nextPage = pageRef.current + 1;
            const data = await getCashierOrdersStrict(dateFilter, {
                page: nextPage,
                pageSize: CASHIER_HISTORY_PAGE_SIZE,
            });
            const merged = mergeCashierOrders(ordersRef.current, data);
            setOrders(merged);
            if (data.length > 0) pageRef.current = nextPage;
            setHasMore(data.length === CASHIER_HISTORY_PAGE_SIZE);
            void recordServerSequences(data);
            cacheServerOrders(merged);
            void putReferenceCache(cacheKeyForDateFilter(dateFilter), merged).catch(() => {});
            return merged;
        } catch (error) {
            console.error("Failed to load more cashier orders", error);
            return ordersRef.current;
        } finally {
            setIsLoadingMore(false);
        }
    }, [cacheServerOrders, dateFilter, isLoadingMore]);

    const refresh = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        timerRef.current = setTimeout(() => {
            void load();
        }, 300);
    }, [load]);

    const cancelPending = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        isLoadingRef.current = false;
    }, []);

    // Reactive fold: IDB snapshot changes (offline-created orders, queue
    // drains) fan in without a network round-trip. Server rows win; offline-
    // only rows are added.
    useEffect(() => {
        if (!offlineSnapshots.length) return;
        setOrders((prev) => {
            const byId = new Map(prev.map((o) => [o.id, o] as const));
            for (const snap of offlineSnapshots) {
                const current = byId.get(snap.id);
                if (!current || isSnapshotNewer(current, snap)) {
                    byId.set(snap.id, snap);
                }
            }
            return Array.from(byId.values());
        });
    }, [offlineSnapshots]);

    return { orders, setOrders, refresh, load, loadMore, hasMore, isLoadingMore, cancelPending };
}

function isSnapshotNewer(current: OrderDto, snapshot: OrderDto): boolean {
    const currentTimestamp = Date.parse(
        current.syncedAt ?? current.lastUpdatedAt ?? current.createdAt
    );
    const snapshotTimestamp = Date.parse(
        snapshot.syncedAt ?? snapshot.lastUpdatedAt ?? snapshot.createdAt
    );
    return Number.isFinite(snapshotTimestamp) &&
        (!Number.isFinite(currentTimestamp) || snapshotTimestamp >= currentTimestamp);
}
