import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DashboardFilter, DashboardFilterPreset } from "@/lib/dashboard/filter-types";
import {
    createDefaultBusinessFilter,
    pickSharedDashboardFilter,
} from "@/lib/filters/business-filter";

interface BusinessFilterState {
    filter: DashboardFilter;
    setFilter: (patch: Partial<DashboardFilter>) => void;
    replaceFilter: (filter: DashboardFilter) => void;
    setPreset: (preset: DashboardFilterPreset) => void;
    setTimeZone: (timeZone: string) => void;
    reset: () => void;
}

const defaultFilter = createDefaultBusinessFilter;

export const useBusinessFilterStore = create<BusinessFilterState>()(
    persist(
        (set) => ({
            filter: defaultFilter(),
            setFilter: (patch) =>
                set((state) => ({
                    filter: {
                        ...state.filter,
                        ...patch,
                    },
                })),
            replaceFilter: (filter) =>
                set(() => ({
                    filter: {
                        ...defaultFilter(),
                        ...pickSharedDashboardFilter(filter),
                    },
                })),
            setPreset: (preset) =>
                set((state) => ({
                    filter: {
                        ...state.filter,
                        preset,
                        startUtc: preset === "Custom" ? state.filter.startUtc : null,
                        endUtc: preset === "Custom" ? state.filter.endUtc : null,
                    },
                })),
            setTimeZone: (timeZone) =>
                set((state) => ({
                    filter: { ...state.filter, timeZone },
                })),
            reset: () => set({ filter: defaultFilter() }),
        }),
        {
            name: "ntx-business-filter",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ filter: state.filter }),
        },
    ),
);
