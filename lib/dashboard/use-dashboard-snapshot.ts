"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardApi } from "./dashboard-api";
import type { DashboardFilter, DashboardScope } from "./filter-types";
import type {
    AuditSnapshot,
    FinancialSnapshot,
    InventorySnapshot,
    OperationsSnapshot,
} from "./snapshot-types";
import { useDashboardRealtime } from "./use-dashboard-realtime";

type SnapshotByScope = {
    Operations: OperationsSnapshot;
    Financial: FinancialSnapshot;
    Inventory: InventorySnapshot;
    Audit: AuditSnapshot;
};

const FETCHER: { [S in DashboardScope]: (f: DashboardFilter) => Promise<SnapshotByScope[S]> } = {
    Operations: (f) => dashboardApi.getOperations(f),
    Financial:  (f) => dashboardApi.getFinancial(f),
    Inventory:  (f) => dashboardApi.getInventory(f),
    Audit:      (f) => dashboardApi.getAudit(f),
};

/**
 * Generic snapshot hook — fetches the snapshot for the given scope using the
 * current filter, refetches when the filter changes, and listens for SignalR
 * invalidation pings to refresh automatically when the underlying data
 * changes server-side.
 */
export function useDashboardSnapshot<S extends DashboardScope>(scope: S, filter: DashboardFilter) {
    const [snapshot, setSnapshot] = useState<SnapshotByScope[S] | null>(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const requestId = useRef(0);

    const refetch = useCallback(async () => {
        const id = ++requestId.current;
        setLoading(true);
        setError(null);
        try {
            const data = await FETCHER[scope](filter);
            if (id === requestId.current) setSnapshot(data as SnapshotByScope[S]);
        } catch (e) {
            if (id === requestId.current) {
                const msg = e instanceof Error ? e.message : "Failed to load dashboard";
                setError(msg);
            }
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [scope, JSON.stringify(filter)]);

    useEffect(() => { void refetch(); }, [refetch]);

    // SignalR-driven refresh — silently re-fetches when the backend pings.
    useDashboardRealtime(scope, () => { void refetch(); });

    return { snapshot, loading, error, refetch };
}
