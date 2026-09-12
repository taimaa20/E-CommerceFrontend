import { create } from "zustand";
import {
    AssetDashboard,
    AssetDetails,
    AssetListItem,
    AssetQuery,
    assetsApi,
} from "@/lib/api-assets";

interface AssetsState {
    items: AssetListItem[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    loading: boolean;
    error: string | null;
    query: AssetQuery;
    dashboard: AssetDashboard | null;
    dashboardLoading: boolean;
    setQuery: (patch: Partial<AssetQuery>) => void;
    resetQuery: () => void;
    fetchList: () => Promise<void>;
    fetchDashboard: () => Promise<void>;
}

const DEFAULT_QUERY: AssetQuery = {
    page: 1,
    pageSize: 25,
    sortBy: "createdAt",
    sortDirection: "desc",
};

export const useAssetsStore = create<AssetsState>()((set, get) => ({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 25,
    loading: false,
    error: null,
    query: { ...DEFAULT_QUERY },
    dashboard: null,
    dashboardLoading: false,

    setQuery: (patch) => set((state) => ({
        query: { ...state.query, ...patch, page: patch.page ?? 1 },
    })),
    resetQuery: () => set({ query: { ...DEFAULT_QUERY } }),
    fetchList: async () => {
        set({ loading: true, error: null });
        try {
            const res = await assetsApi.list(get().query);
            set({
                items: res.items,
                totalCount: res.totalCount,
                pageNumber: res.pageNumber,
                pageSize: res.pageSize,
                loading: false,
            });
        } catch (err: any) {
            set({ loading: false, error: err?.message || "Failed to load assets" });
        }
    },
    fetchDashboard: async () => {
        set({ dashboardLoading: true });
        try {
            const dashboard = await assetsApi.dashboard();
            set({ dashboard, dashboardLoading: false });
        } catch {
            set({ dashboardLoading: false });
        }
    },
}));

interface AssetDetailsState {
    current: AssetDetails | null;
    loading: boolean;
    error: string | null;
    load: (id: string) => Promise<void>;
    set: (asset: AssetDetails | null) => void;
    clear: () => void;
}

export const useAssetDetailsStore = create<AssetDetailsState>()((set) => ({
    current: null,
    loading: false,
    error: null,
    load: async (id) => {
        set({ loading: true, error: null });
        try {
            const current = await assetsApi.details(id);
            set({ current, loading: false });
        } catch (err: any) {
            set({ loading: false, error: err?.message || "Failed to load asset" });
        }
    },
    set: (asset) => set({ current: asset }),
    clear: () => set({ current: null, error: null }),
}));
