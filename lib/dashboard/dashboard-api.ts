import { api } from "@/lib/api";
import type { DashboardFilter, DashboardFilterOptions } from "./filter-types";
import type {
    AuditSnapshot,
    CommissionAnalysis,
    FinancialSnapshot,
    HomeSnapshot,
    InventorySnapshot,
    OperationsSnapshot,
} from "./snapshot-types";

/**
 * Strips nulls/undefineds so the backend [FromQuery] binder sees absent
 * properties as truly absent (and falls back to its declared defaults).
 */
function toQueryParams(filter: DashboardFilter): Record<string, string | number> {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(filter)) {
        // Status has no visible dashboard control yet; never let a persisted hidden value constrain snapshots.
        if (k === "status") continue;
        if (v === undefined || v === null || v === "") continue;
        out[k] = v as string | number;
    }
    return out;
}

export const dashboardApi = {
    getHome: async (filter: DashboardFilter): Promise<HomeSnapshot> => {
        const res = await api.get<HomeSnapshot>("/dashboards/home", { params: toQueryParams(filter) });
        return res.data;
    },
    getOperations: async (filter: DashboardFilter): Promise<OperationsSnapshot> => {
        const res = await api.get<OperationsSnapshot>("/dashboards/operations", { params: toQueryParams(filter) });
        return res.data;
    },
    getFinancial: async (filter: DashboardFilter): Promise<FinancialSnapshot> => {
        const res = await api.get<FinancialSnapshot>("/dashboards/financial", { params: toQueryParams(filter) });
        return res.data;
    },
    getFinancialCommissionAnalysis: async (filter: DashboardFilter): Promise<CommissionAnalysis> => {
        const res = await api.get<CommissionAnalysis>("/dashboards/financial/commission-analysis", {
            params: toQueryParams(filter),
        });
        return res.data;
    },
    exportFinancial: async (filter: DashboardFilter, currency: string): Promise<Blob> => {
        const res = await api.getBlob("/dashboards/financial/export", {
            params: { ...toQueryParams(filter), currency },
        });
        return res.data;
    },
    exportHome: async (filter: DashboardFilter, currency: string): Promise<Blob> => {
        const res = await api.getBlob("/dashboards/home/export", {
            params: { ...toQueryParams(filter), currency },
        });
        return res.data;
    },
    exportOperations: async (filter: DashboardFilter, currency: string): Promise<Blob> => {
        const res = await api.getBlob("/dashboards/operations/export", {
            params: { ...toQueryParams(filter), currency },
        });
        return res.data;
    },
    exportInventory: async (filter: DashboardFilter, currency: string): Promise<Blob> => {
        const res = await api.getBlob("/dashboards/inventory/export", {
            params: { ...toQueryParams(filter), currency },
        });
        return res.data;
    },
    getInventory: async (filter: DashboardFilter): Promise<InventorySnapshot> => {
        const res = await api.get<InventorySnapshot>("/dashboards/inventory", { params: toQueryParams(filter) });
        return res.data;
    },
    getAudit: async (filter: DashboardFilter): Promise<AuditSnapshot> => {
        const res = await api.get<AuditSnapshot>("/dashboards/audit", { params: toQueryParams(filter) });
        return res.data;
    },
    getFilterOptions: async (): Promise<DashboardFilterOptions> => {
        const res = await api.get<DashboardFilterOptions>("/dashboards/filters/options");
        return res.data;
    },
};
