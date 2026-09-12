import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
    DashboardFilter,
    DashboardFilterPreset,
    DashboardScope,
} from "@/lib/dashboard/filter-types";
import {
    createDefaultBusinessFilter,
    mergeSharedDashboardFilter,
    pickSharedDashboardFilter,
} from "@/lib/filters/business-filter";
import { useBusinessFilterStore } from "@/store/businessFilterStore";

function defaultFilter(scope: DashboardScope): DashboardFilter {
    void scope;
    return {
        ...createDefaultBusinessFilter(),
    };
}

function createDefaultFilters(): Record<DashboardScope, DashboardFilter> {
    return {
        Operations: defaultFilter("Operations"),
        Financial:  defaultFilter("Financial"),
        Inventory:  defaultFilter("Inventory"),
        Audit:      defaultFilter("Audit"),
    };
}

function applySharedToAll(
    filters: Record<DashboardScope, DashboardFilter>,
    shared: Partial<DashboardFilter>,
): Record<DashboardScope, DashboardFilter> {
    return {
        Operations: mergeSharedDashboardFilter(filters.Operations, shared),
        Financial:  mergeSharedDashboardFilter(filters.Financial, shared),
        Inventory:  mergeSharedDashboardFilter(filters.Inventory, shared),
        Audit:      mergeSharedDashboardFilter(filters.Audit, shared),
    };
}

interface DashboardFilterState {
    filters: Record<DashboardScope, DashboardFilter>;
    setFilter: (scope: DashboardScope, next: DashboardFilter) => void;
    setPreset: (scope: DashboardScope, preset: DashboardFilterPreset) => void;
    setTimeZone: (timeZone: string) => void;
    reset: (scope: DashboardScope) => void;
}

/**
 * One persisted store keyed by dashboard scope, with shared business filters
 * propagated across every scope. Scope-specific filters can still live here,
 * but date/payment/cashier/order filters stay consistent between dashboards.
 */
export const useDashboardFilterStore = create<DashboardFilterState>()(
    persist(
        (set) => ({
            filters: createDefaultFilters(),
            setFilter: (scope, next) => {
                const shared = pickSharedDashboardFilter(next);
                useBusinessFilterStore.getState().setFilter(shared);
                set((s) => ({
                    filters: {
                        ...applySharedToAll(s.filters, shared),
                        [scope]: next,
                    },
                }));
            },
            setPreset: (scope, preset) =>
                set((s) => {
                    const next = {
                        ...s.filters[scope],
                        preset,
                        startUtc: preset === "Custom" ? s.filters[scope].startUtc : null,
                        endUtc:   preset === "Custom" ? s.filters[scope].endUtc   : null,
                    };
                    const shared = pickSharedDashboardFilter(next);
                    useBusinessFilterStore.getState().setFilter(shared);
                    return {
                        filters: {
                            ...applySharedToAll(s.filters, shared),
                            [scope]: next,
                        },
                    };
                }),
            setTimeZone: (timeZone) => {
                useBusinessFilterStore.getState().setTimeZone(timeZone);
                set((state) => ({
                    filters: applySharedToAll(state.filters, { timeZone }),
                }));
            },
            reset: (scope) => {
                void scope;
                const shared = pickSharedDashboardFilter(createDefaultBusinessFilter());
                useBusinessFilterStore.getState().reset();
                set((s) => ({ filters: applySharedToAll(s.filters, shared) }));
            },
        }),
        {
            name: "ntx-dashboard-filter",
            storage: createJSONStorage(() => localStorage),
            partialize: (s) => ({ filters: s.filters }),
            merge: (persisted, current) => {
                const persistedState = persisted as Partial<DashboardFilterState>;
                const filters = {
                    ...current.filters,
                    ...persistedState.filters,
                };
                const shared = pickSharedDashboardFilter(filters.Operations);
                return {
                    ...current,
                    ...persistedState,
                    filters: applySharedToAll(filters, shared),
                };
            },
        },
    ),
);
