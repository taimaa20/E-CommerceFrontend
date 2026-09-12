"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import type { DashboardFilter, DashboardScope } from "./filter-types";

/**
 * Generic loader for any dashboard endpoint. Re-runs when the filter changes,
 * exposes refresh + loading + error. Decouples the realtime hook so callers
 * can opt into SignalR refresh separately.
 */
export function useDashboardData<T>(
    fetcher: (f: DashboardFilter) => Promise<T>,
    filter: DashboardFilter,
    deps: DashboardScope[] = [],
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const filterKey = JSON.stringify(filter);
    const loadedFilterKey = useRef(filterKey);
    const reqId = useRef(0);
    // A "current branch" filter (branchId unset) resolves through the X-Branch-ID
    // header — refetch when the administrator switches the active branch.
    const branchVersion = useActiveBranchVersion();

    const refresh = useCallback(async () => {
        const id = ++reqId.current;
        setLoading(true);
        setError(null);
        if (loadedFilterKey.current !== filterKey) {
            loadedFilterKey.current = filterKey;
            setData(null);
        }
        try {
            const res = await fetcher(filter);
            if (id === reqId.current) setData(res);
        } catch (e) {
            if (id === reqId.current) setError(e instanceof Error ? e.message : "Failed");
        } finally {
            if (id === reqId.current) setLoading(false);
        }
    }, [fetcher, filterKey, branchVersion]);

    useEffect(() => { void refresh(); }, [refresh]);

    void deps;
    return { data, loading, error, refresh };
}
