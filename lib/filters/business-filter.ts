import type { DashboardFilter, DashboardFilterPreset } from "@/lib/dashboard/filter-types";
import {
    addCalendarDays,
    DEFAULT_RESTAURANT_TIME_ZONE,
    getRestaurantToday,
    restaurantDateRangeToUtc,
} from "@/lib/date-time";

export type SharedDatePreset = "Today" | "Yesterday" | "ThisWeek" | "ThisMonth" | "ThisYear" | "Custom";
export type CashierDateFilter = "active" | "today" | "mine" | "week" | "month" | "all";

export const DEFAULT_SHARED_FILTER: DashboardFilter = {
    preset: "Today",
    compare: "None",
    startUtc: null,
    endUtc: null,
    timeZone: DEFAULT_RESTAURANT_TIME_ZONE,
    branchId: null,
    cashierId: null,
    paymentMethod: null,
    orderType: null,
    orderSource: null,
    partner: null,
};

export const SHARED_DASHBOARD_FILTER_KEYS = [
    "preset",
    "startUtc",
    "endUtc",
    "timeZone",
    "branchId",
    "cashierId",
    "paymentMethod",
    "orderType",
    "orderSource",
    "partner",
    "compare",
] as const satisfies readonly (keyof DashboardFilter)[];

export function createDefaultBusinessFilter(
    timeZone: string = DEFAULT_RESTAURANT_TIME_ZONE,
): DashboardFilter {
    return {
        ...DEFAULT_SHARED_FILTER,
        timeZone,
    };
}

export function pickSharedDashboardFilter(filter: DashboardFilter): Partial<DashboardFilter> {
    const shared: Partial<DashboardFilter> = {};
    for (const key of SHARED_DASHBOARD_FILTER_KEYS) {
        shared[key] = filter[key] as never;
    }
    return shared;
}

export function mergeSharedDashboardFilter<T extends DashboardFilter>(
    target: T,
    shared: Partial<DashboardFilter>,
): T {
    return { ...target, ...shared };
}

export function mapPresetToCashierDateFilter(preset: DashboardFilterPreset): CashierDateFilter {
    if (preset === "ThisWeek" || preset === "Last7") return "week";
    if (preset === "ThisMonth" || preset === "Last30" || preset === "LastMonth") return "month";
    if (preset === "ThisYear" || preset === "Custom") return "all";
    return "today";
}

export function toUtcDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
}

export function resolveLocalPresetRange(
    preset: SharedDatePreset,
    now: Date = new Date(),
    timeZone: string = DEFAULT_RESTAURANT_TIME_ZONE,
): { startUtc: string | null; endUtc: string | null } {
    if (preset === "Custom") return { startUtc: null, endUtc: null };

    const today = getRestaurantToday(timeZone, now);
    let from = today;
    let through = today;

    if (preset === "Yesterday") {
        from = addCalendarDays(today, -1);
        through = from;
    }

    if (preset === "ThisWeek") {
        const day = new Date(`${today}T00:00:00Z`).getUTCDay();
        from = addCalendarDays(today, -((day + 6) % 7));
        through = addCalendarDays(from, 6);
    }

    if (preset === "ThisMonth") {
        from = `${today.slice(0, 8)}01`;
        const [year, month] = today.split("-").map(Number);
        through = addCalendarDays(
            new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
            0,
        );
    }

    if (preset === "ThisYear") {
        from = `${today.slice(0, 4)}-01-01`;
        through = `${today.slice(0, 4)}-12-31`;
    }

    return restaurantDateRangeToUtc(from, through, timeZone);
}
