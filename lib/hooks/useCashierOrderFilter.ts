import { useMemo } from "react";
import type { OrderDto } from "@/types/order";
import {
    CASHIER_PAYMENT_STATUS,
    getCashierOrderState,
    isFullyCancelledOrder,
    type CashierOrderState,
} from "@/lib/cashier-order-selectors";
import type {
    DateFilter,
    SortOption,
    StatusFilter,
    TypeFilter,
} from "@/components/cashier/Toolbar";
import { formatOrderSequence } from "@/lib/order-sequence";
import {
    addCalendarDays,
    getRestaurantToday,
    parseUtcInstant,
    restaurantDateRangeToUtc,
} from "@/lib/date-time";

export interface CashierOrderFilterState {
    statusFilter: StatusFilter;
    typeFilter: TypeFilter;
    tableFilter: string;
    dateFilter: DateFilter;
    currentUserId?: string | null;
    query: string;
    sortBy: SortOption;
    timeZone: string;
}

export interface CashierOrderEntry {
    order: OrderDto;
    state: CashierOrderState;
}

export interface CashierFilterResult {
    entries: CashierOrderEntry[];
    scoped: CashierOrderEntry[];
    filtered: CashierOrderEntry[];
    sorted: CashierOrderEntry[];
    tableOptions: string[];
}

const isCreatedInUtcWindow = (isoDateString: string, startUtc: string, endUtc: string): boolean => {
    if (!isoDateString) return false;
    const createdAt = parseUtcInstant(isoDateString).getTime();
    return createdAt >= Date.parse(startUtc) && createdAt < Date.parse(endUtc);
};

function getCreatedAtRange(dateFilter: DateFilter, timeZone: string) {
    const today = getRestaurantToday(timeZone);
    let from = today;

    if (dateFilter === "all") {
        from = addCalendarDays(today, -1);
    } else if (dateFilter === "week") {
        const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
        from = addCalendarDays(today, -((weekday + 6) % 7));
    } else if (dateFilter === "month") {
        from = `${today.slice(0, 8)}01`;
    }

    return restaurantDateRangeToUtc(from, today, timeZone);
}

const normalizeId = (value?: string | null): string => value?.toLowerCase() ?? "";

const getOrderOwnerId = (order: OrderDto): string =>
    normalizeId(order.createdBy);

/**
 * Derived-state hook for the cashier orders screen.
 *
 * Takes the raw `orders` list (single source of truth) and the active filter
 * state, returns the filtered + sorted entries plus the table dropdown options.
 * Pure — never fetches, never caches. Filter switches are instant because
 * this is a memoised derivation over the already-fetched raw list.
 */
export function useCashierOrderFilter(
    orders: OrderDto[],
    filter: CashierOrderFilterState,
    hiddenFullyCancelledOrderKeys?: ReadonlySet<string>
): CashierFilterResult {
    const { statusFilter, typeFilter, tableFilter, dateFilter, currentUserId, query, sortBy, timeZone } = filter;
    const normalizedCurrentUserId = normalizeId(currentUserId);
    const createdAtRange = getCreatedAtRange(dateFilter, timeZone);

    const entries = useMemo<CashierOrderEntry[]>(
        () =>
            orders
                .filter((order) => !isFullyCancelledOrder(order))
                .filter((order) =>
                    !hiddenFullyCancelledOrderKeys?.has(order.id) &&
                    !hiddenFullyCancelledOrderKeys?.has(order.orderNumber)
                )
                .map((order) => ({ order, state: getCashierOrderState(order) })),
        [orders, hiddenFullyCancelledOrderKeys]
    );

    const tableOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    entries.map(({ order }) =>
                        order.orderSource === "DeliveryPartner"
                            ? (order.deliveryPartnerName || order.deliveryPartnerCode || "Delivery Partner")
                        : order.orderSource === "Talabat" || order.tableName === "TALABAT"
                            ? "Talabat"
                            : order.tableName === "TAKEAWAY" ? "Takeaway" : order.tableName
                    )
                )
            ).filter(Boolean) as string[],
        [entries]
    );

    const scoped = useMemo(
        () =>
            entries
                .filter(({ order, state }) => {
                    const isInRange = isCreatedInUtcWindow(
                        order.createdAt,
                        createdAtRange.startUtc,
                        createdAtRange.endUtc,
                    );
                    if (dateFilter === "active") return isInRange && !state.served && !state.isCompleted;
                    if (dateFilter === "all" || dateFilter === "today" || dateFilter === "week" || dateFilter === "month")
                        return isInRange;
                    if (dateFilter === "mine")
                        return isInRange &&
                            !!normalizedCurrentUserId &&
                            getOrderOwnerId(order) === normalizedCurrentUserId;
                    return true;
                })
                .filter(({ order }) => {
                    if (typeFilter === "all") return true;
                    const isTakeaway =
                        order.orderType === "Takeaway" || order.tableName === "TAKEAWAY";
                    if (typeFilter === "takeaway") return isTakeaway;
                    if (typeFilter === "dine") return !isTakeaway;
                    return true;
                })
                .filter(({ order }) => {
                    if (tableFilter === "all") return true;
                    const name =
                        order.orderSource === "DeliveryPartner"
                            ? (order.deliveryPartnerName || order.deliveryPartnerCode || "Delivery Partner").toLowerCase()
                        : order.orderSource === "Talabat" || order.tableName === "TALABAT"
                            ? "talabat"
                            : order.tableName === "TAKEAWAY" ? "takeaway" : order.tableName.toLowerCase();
                    return name === tableFilter;
                })
                .filter(({ order }) => {
                    if (!query.trim()) return true;
                    const q = query.toLowerCase();
                    return (
                        order.tableName.toLowerCase().includes(q) ||
                        order.orderNumber.toLowerCase().includes(q) ||
                        (formatOrderSequence(order) ?? "").toLowerCase().includes(q) ||
                        (order.talabatOrderNumber ?? "").toLowerCase().includes(q) ||
                        (order.partnerOrderNumber ?? "").toLowerCase().includes(q) ||
                        (order.deliveryPartnerName ?? "").toLowerCase().includes(q) ||
                        (order.deliveryPartnerCode ?? "").toLowerCase().includes(q) ||
                        String(order.totalAmount).includes(q)
                    );
                }),
        [entries, dateFilter, normalizedCurrentUserId, typeFilter, tableFilter, query, createdAtRange.startUtc, createdAtRange.endUtc]
    );

    const filtered = useMemo(
        () =>
            scoped.filter(({ state }) => {
                if (statusFilter === "all") return true;
                if (statusFilter === "ready") return state.isReady && !state.served;
                if (statusFilter === "served") return state.served;
                if (statusFilter === "paid")
                    return state.paymentStatus === CASHIER_PAYMENT_STATUS.PAID;
                return true;
            }),
        [scoped, statusFilter]
    );

    const sorted = useMemo(() => {
        switch (sortBy) {
            case "oldest":
                return [...filtered].sort((a, b) =>
                    parseUtcInstant(a.order.createdAt).getTime() -
                    parseUtcInstant(b.order.createdAt).getTime()
                );
            case "highest":
                return [...filtered].sort((a, b) => b.order.totalAmount - a.order.totalAmount);
            case "lowest":
                return [...filtered].sort((a, b) => a.order.totalAmount - b.order.totalAmount);
            default:
                return [...filtered].sort((a, b) =>
                    parseUtcInstant(b.order.createdAt).getTime() -
                    parseUtcInstant(a.order.createdAt).getTime()
                );
        }
    }, [filtered, sortBy]);

    return { entries, scoped, filtered, sorted, tableOptions };
}
