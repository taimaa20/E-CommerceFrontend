import type { CashierBalanceShift } from "@/types/cashier-balance";
import type { PendingAction } from "@/lib/offline/db";
import type { OrderDto } from "@/types/order";
import { getOrderRemainingAmount } from "@/lib/order-payments";

/**
 * Project a cashier shift with pending (not-yet-synced) pay actions overlaid.
 *
 * Business contract:
 *  - Server-side shift values remain the source of truth for everything that
 *    has synced. We only *add* deltas from pending/syncing actions.
 *  - A `pay` action contributes to `ordersTotal` and one of
 *    `cashOrdersTotal` / `cardOrdersTotal`. `expectedBalance` is always
 *    openingBalance + cashOrdersTotal - deliveryCost - cashExpensesTotal — card
 *    payments never change the drawer, and documented cash payouts always do.
 *    Mirrors CashierShiftService.CalculateExpectedBalance on the server.
 *  - Amount resolution order:
 *      1. explicit `payload.amount` (split payments carry it),
 *      2. cached order's remaining amount (legacy full-pay enqueue),
 *      3. cached order's total amount.
 *    Actions we can't value are skipped — a conservative under-count beats a
 *    hallucinated over-count.
 *  - `paidOrderCount` counts *distinct* orderIds that have any pending pay.
 *    That is an approximation (a split payment won't fully pay an order on
 *    its own), but it mirrors what the cashier perceives while offline and
 *    reconciles exactly when the server reports back.
 *  - Pure function. Safe inside React `useMemo`.
 */
export function projectShiftWithPending(
    shift: CashierBalanceShift,
    pending: PendingAction[],
    cachedOrders: OrderDto[] = []
): CashierBalanceShift {
    if (!pending.length) return shift;

    const payActions = pending.filter(
        (a) => a.type === "pay" && (a.status === "pending" || a.status === "syncing")
    );
    if (!payActions.length) return shift;

    const ordersById = new Map(cachedOrders.map((o) => [o.id, o]));
    const countedOrderIds = new Set<string>();
    let deltaOrdersTotal = 0;
    let deltaCash = 0;
    let deltaCard = 0;
    const breakdown = new Map(
        (shift.paymentMethodsBreakdown ?? []).map((row) => [
            `${row.isCash ? "cash" : "digital"}:${row.method.toLowerCase()}`,
            { ...row },
        ])
    );

    for (const action of payActions) {
        const p = action.payload as {
            amount?: number;
            paymentMethod?: string;
            paymentMethodName?: string;
        };

        const amount = resolveAmount(p, ordersById.get(action.orderId));
        if (amount == null || amount <= 0) continue;

        deltaOrdersTotal += amount;
        const isCash = isCashPaymentMethod(p.paymentMethod);
        const method = resolvePaymentMethodLabel(p.paymentMethod, p.paymentMethodName);
        if (isCash) deltaCash += amount;
        else deltaCard += amount;
        addBreakdownAmount(breakdown, method, amount, isCash);

        countedOrderIds.add(action.orderId);
    }

    const cashCollected = round(shift.cashOrdersTotal + deltaCash);

    return {
        ...shift,
        paidOrderCount: shift.paidOrderCount + countedOrderIds.size,
        ordersTotal: round(shift.ordersTotal + deltaOrdersTotal),
        cashOrdersTotal: cashCollected,
        cardOrdersTotal: round(shift.cardOrdersTotal + deltaCard),
        expectedBalance: round(
            shift.openingBalance + cashCollected - (shift.deliveryCost ?? 0) - (shift.cashExpensesTotal ?? 0)
        ),
        paymentMethodsBreakdown: Array.from(breakdown.values()),
    };
}

function addBreakdownAmount(
    breakdown: Map<string, NonNullable<CashierBalanceShift["paymentMethodsBreakdown"]>[number]>,
    method: string,
    amount: number,
    isCash: boolean
) {
    const key = `${isCash ? "cash" : "digital"}:${method.toLowerCase()}`;
    const current = breakdown.get(key);
    if (!current) {
        breakdown.set(key, { method, amount: round(amount), orderCount: 1, isCash });
        return;
    }

    breakdown.set(key, {
        ...current,
        amount: round(current.amount + amount),
        orderCount: current.orderCount + 1,
    });
}

function isCashPaymentMethod(paymentMethod: string | undefined): boolean {
    if (!paymentMethod?.trim()) return true;
    const normalized = paymentMethod.trim().toLowerCase();
    return normalized.includes("cash") || normalized.includes("nakit");
}

function resolvePaymentMethodLabel(paymentMethod: string | undefined, paymentMethodName: string | undefined): string {
    if (!isCashPaymentMethod(paymentMethod) && paymentMethodName?.trim()) return paymentMethodName.trim();
    return paymentMethod?.trim() || "Cash";
}

function resolveAmount(
    payload: { amount?: number },
    order: OrderDto | undefined
): number | null {
    if (typeof payload.amount === "number" && Number.isFinite(payload.amount)) {
        return payload.amount;
    }
    if (order) {
        const remaining = getOrderRemainingAmount(order);
        if (remaining > 0) return remaining;
        if (typeof order.totalAmount === "number") return order.totalAmount;
    }
    return null;
}

function round(value: number): number {
    // Match backend decimal(18,2) rounding — shift numbers render with 3dp
    // but the underlying scale is 2. Rounding here keeps subtotals stable.
    return Math.round(value * 1000) / 1000;
}
