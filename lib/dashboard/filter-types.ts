/**
 * Mirrors RestaurantPos.Api.Modules.Dashboard.Filters.DashboardFilterDto.
 * Keep field names in sync — the backend reads them as [FromQuery] so the
 * casing must match exactly.
 */
export type DashboardFilterPreset =
    | "Default"
    | "Today"
    | "Yesterday"
    | "ThisWeek"
    | "ThisMonth"
    | "ThisQuarter"
    | "ThisYear"
    | "Last7"
    | "Last30"
    | "LastMonth"
    | "Custom";

export type DashboardScope = "Operations" | "Financial" | "Inventory" | "Audit";

export type ComparisonMode = "None" | "PreviousPeriod" | "PreviousYear";

export const DASHBOARD_ALL_BRANCHES_ID = "00000000-0000-0000-0000-000000000000";

export interface DashboardFilter {
    preset: DashboardFilterPreset;
    startUtc?: string | null;
    endUtc?: string | null;
    timeZone?: string | null;
    branchId?: string | null;
    warehouseId?: string | null;
    cashierId?: string | null;
    employeeId?: string | null;
    waiterId?: string | null;
    shiftId?: string | null;
    tableId?: string | null;
    categoryId?: string | null;
    productId?: string | null;
    orderType?: 0 | 1 | 2 | null;       // 0 DineIn, 1 Takeaway, 2 Delivery
    orderSource?: 0 | 1 | 2 | 3 | null; // 0 POS, 1 Talabat, 2 Partner, 3 Mobile
    status?: number | null;
    paymentMethod?: string | null;
    partner?: string | null;
    compare?: ComparisonMode;
    groupBy?: string | null;
    page?: number | null;
    pageSize?: number | null;
}

export interface DashboardFilterOptions {
    cashiers: { id: string; name: string; nameAr?: string | null }[];
    waiters: { id: string; name: string; nameAr?: string | null }[];
    categories: { id: string; name: string; nameAr?: string | null }[];
    paymentMethods: string[];
    paymentMethodOptions?: {
        value: string;
        name: string;
        nameAr?: string | null;
        isActive: boolean;
    }[];
    partners?: {
        value: string;
        name: string;
        nameAr?: string | null;
        isActive: boolean;
    }[];
    warehouses?: {
        id: string;
        name: string;
        nameAr?: string | null;
        isActive: boolean;
    }[];
}

export const PRESET_LABEL_KEYS: Record<Exclude<DashboardFilterPreset, "Default" | "Custom">, string> = {
    Today: "today",
    Yesterday: "yesterday",
    ThisWeek: "thisWeek",
    ThisMonth: "thisMonth",
    LastMonth: "lastMonth",
    ThisQuarter: "thisQuarter",
    ThisYear: "thisYear",
    Last7: "last7Days",
    Last30: "last30Days",
};

export const DEFAULT_PRESET_BY_SCOPE: Record<DashboardScope, DashboardFilterPreset> = {
    Operations: "Today",
    Financial: "ThisMonth",
    Inventory: "ThisWeek",
    Audit: "ThisWeek",
};
