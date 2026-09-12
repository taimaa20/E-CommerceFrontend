import { ORDER_STATUS, ITEM_STATUS } from "@/lib/status-constants";
import { getOrderPaymentStatus as getUnifiedOrderPaymentStatus, ORDER_PAYMENT_STATUS } from "@/lib/order-payments";
import { OrderDto } from "@/types/order";

export const CASHIER_PAYMENT_STATUS = {
    PENDING: "Pending",
    PARTIAL: "Partial",
    PAID: "Paid",
    REFUNDED: "Refunded",
} as const;

export type CashierPaymentStatus =
    typeof CASHIER_PAYMENT_STATUS[keyof typeof CASHIER_PAYMENT_STATUS];

export interface CashierOrderState {
    orderStatus: typeof ORDER_STATUS.READY | typeof ORDER_STATUS.PREPARING;
    paymentStatus: CashierPaymentStatus;
    served: boolean;
    isReady: boolean;
    isPaid: boolean;
    isRefunded: boolean;
    isTakeaway: boolean;
    isDelivery: boolean;
    isCancelled: boolean;
    isCompleted: boolean;
}

const TERMINAL_SERVED_STATUSES = new Set<string>([
    ORDER_STATUS.SERVED,
    ORDER_STATUS.COMPLETED,
]);

export function getCashierOrderStatus(order: Pick<OrderDto, "status" | "items">) {
    const items = order.items ?? [];

    if (items.length === 0) {
        return order.status === ORDER_STATUS.READY
            ? ORDER_STATUS.READY
            : ORDER_STATUS.PREPARING;
    }

    return items.every((item) => item.itemStatus === ITEM_STATUS.READY)
        ? ORDER_STATUS.READY
        : ORDER_STATUS.PREPARING;
}

export function getCashierPaymentStatus(
    order: Pick<OrderDto, "status" | "paymentMethod" | "isPaid" | "isRefunded" | "paymentStatus" | "paidAmount" | "remainingAmount" | "payments" | "totalAmount">
): CashierPaymentStatus {
    if (order.isRefunded) {
        return CASHIER_PAYMENT_STATUS.REFUNDED;
    }

    const paymentStatus = getUnifiedOrderPaymentStatus(order);

    if (paymentStatus === ORDER_PAYMENT_STATUS.PAID) {
        return CASHIER_PAYMENT_STATUS.PAID;
    }

    if (paymentStatus === ORDER_PAYMENT_STATUS.PARTIAL) {
        return CASHIER_PAYMENT_STATUS.PARTIAL;
    }

    return CASHIER_PAYMENT_STATUS.PENDING;
}

export function isCashierOrderServed(order: Pick<OrderDto, "status">) {
    return TERMINAL_SERVED_STATUSES.has(order.status);
}

export function isCashierTakeawayOrder(order: Pick<OrderDto, "orderType" | "tableName">) {
    return order.orderType === "Takeaway" || order.tableName === "TAKEAWAY";
}

export function isCashierDeliveryOrder(
    order: Pick<OrderDto, "orderType" | "orderSource">
) {
    return order.orderType === "Delivery"
        || order.orderSource === "DeliveryPartner"
        || order.orderSource === "Talabat";
}

export function isFullyCancelledOrder(
    order: Pick<OrderDto, "status" | "items" | "isFullyCancelled" | "isRefunded">
) {
    if (order.isFullyCancelled === true || order.isRefunded === true) return true;

    // A Cancelled order is terminal — the whole order is gone. Full-order cancels set the
    // order status without stamping each line item, so don't require items to be flagged.
    return order.status === ORDER_STATUS.CANCELLED;
}

export function getCashierOrderState(order: OrderDto): CashierOrderState {
    const orderStatus = getCashierOrderStatus(order);
    const paymentStatus = getCashierPaymentStatus(order);
    const served = isCashierOrderServed(order);
    const isCancelled = isFullyCancelledOrder(order);
    const isCompleted = order.status === ORDER_STATUS.COMPLETED;

    return {
        orderStatus,
        paymentStatus,
        served,
        isReady: orderStatus === ORDER_STATUS.READY,
        isPaid: paymentStatus === CASHIER_PAYMENT_STATUS.PAID,
        isRefunded: paymentStatus === CASHIER_PAYMENT_STATUS.REFUNDED,
        isTakeaway: isCashierTakeawayOrder(order),
        isDelivery: isCashierDeliveryOrder(order),
        isCancelled,
        isCompleted,
    };
}

function mergeCashierOrder(previousOrder: OrderDto | undefined, nextOrder: OrderDto) {
    if (!previousOrder) {
        return nextOrder;
    }

    const previousState = getCashierOrderState(previousOrder);
    const nextState = getCashierOrderState(nextOrder);

    if (
        previousState.served &&
        !nextState.served &&
        nextState.isPaid &&
        !nextState.isRefunded &&
        nextOrder.status === ORDER_STATUS.PAID
    ) {
        return {
            ...nextOrder,
            status: ORDER_STATUS.SERVED,
        };
    }

    return nextOrder;
}

export function mergeCashierOrders(previousOrders: OrderDto[], nextOrders: OrderDto[]) {
    const previousById = new Map(previousOrders.map((order) => [order.id, order]));
    return nextOrders.map((order) => mergeCashierOrder(previousById.get(order.id), order));
}
