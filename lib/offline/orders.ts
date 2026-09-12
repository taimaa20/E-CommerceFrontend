import { enqueue } from "./queue";
import { generateClientOrderUUID, generateLocalOrderId, generateOfflineSequenceNumber, generatePublicOrderNumber, isOfflineOrderId, recordServerSequences } from "./id";
import {
    putOrderSnapshot,
    getOrderSnapshot,
    deleteOrderSnapshot,
    putOrderIdentity,
    type PendingAction,
} from "./db";
import { getConnectivityState, reportApiFailure } from "./connectivity";
import { applyActionToOrder } from "./snapshot-mutations";
import type { OrderCreateDto, OrderDto, OrderItemCreateDto, OrderItemRecipeSnapshotDto, CancelOrderPayload } from "@/types/order";
import { ORDER_STATUS, ITEM_STATUS } from "@/lib/status-constants";
import { applyPaymentToOrder } from "@/lib/order-payments";
import { formatValidationProblem } from "@/lib/validation-errors";
import { useAuthStore } from "@/store/authStore";

/**
 * Thrown by `createOrderOffline` / `createPaidOrderOffline` /
 * `addOrderItemsOffline` when the payload would be guaranteed to fail at
 * the server. We block at the boundary instead of letting a doomed action
 * sit in the queue forever and silently lose the order.
 *
 * Callers (the cart submit handler) catch this and toast the cashier so
 * the issue is fixed before they walk away from the ticket.
 */
export class OfflineOrderValidationError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = "OfflineOrderValidationError";
    }
}

/**
 * Thrown by `createOrderSmart` when the online attempt failed with a 4xx
 * (validation, auth, conflict). These MUST NOT fall through to the offline
 * queue — they would just fail at replay time and the cashier would never see
 * the original error. The wrapper rethrows so the UI can toast a real
 * message instead of silently enqueueing a doomed order.
 */
export class OrderCreateClientError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(status: number, message: string, body?: unknown) {
        super(message);
        this.name = "OrderCreateClientError";
        this.status = status;
        this.body = body;
    }
}

type OnlineCreateOutcome = "client" | "network";

/**
 * Decide whether a thrown error from the online create call should:
 *  - "client":    surface confirmed HTTP rejection to the user — no queue write
 *  - "network":   fall back to offline queue (fetch reject, abort/timeout, no status)
 */
function classifyOnlineCreateError(err: unknown): OnlineCreateOutcome {
    if (typeof err !== "object" || err === null) return "network";
    const e = err as { response?: { status?: number; data?: unknown }; name?: string };
    if (e.name === "AbortError" || e.name === "TimeoutError") return "network";
    const status = e.response?.status;
    if (typeof status !== "number") return "network";
    if (status === 408 || status === 504) return "network";
    if (
        status === 502
        && typeof e.response?.data === "object"
        && e.response.data !== null
        && (e.response.data as { error?: unknown }).error === "Upstream request failed"
    ) {
        return "network";
    }
    if (status >= 400 && status < 500) return "client";
    return "client";
}

function extractClientErrorMessage(err: unknown, fallback: string): string {
    if (typeof err !== "object" || err === null) return fallback;
    const e = err as { response?: { data?: unknown }; message?: string };
    const data = e.response?.data;
    if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        // ValidationProblemDetails: flatten the per-field errors dictionary so
        // the cashier sees the failing field instead of the generic
        // "One or more validation errors occurred." title.
        const fieldErrors = formatValidationProblem(d);
        if (fieldErrors) return fieldErrors;
        if (typeof d.message === "string" && d.message.trim()) return d.message;
        if (typeof d.detail === "string" && d.detail.trim()) return d.detail;
        if (typeof d.title === "string" && d.title.trim()) return d.title;
    }
    if (typeof data === "string" && data.trim()) return data;
    return e.message ?? fallback;
}

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

function isInvalidProductId(id: unknown): boolean {
    return typeof id !== "string" || id.length === 0 || id === EMPTY_GUID;
}

/**
 * Validate every line of an offline order payload. Server's
 * `ProcessCreateOrder` silently filters out items whose ProductId isn't
 * found in `Products`, then fails price validation when offerId is set —
 * the cashier never sees the error because the queue has already drained.
 * Block here instead.
 */
function validateItemsForOffline(
    items: OrderItemCreateDto[] | undefined,
    context: { hasOffer: boolean; offerQty?: number | null }
): void {
    if (!items || items.length === 0) {
        throw new OfflineOrderValidationError(
            "EMPTY_ITEMS",
            "Cannot queue an order with no items."
        );
    }
    for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        if (isInvalidProductId(it.productId)) {
            throw new OfflineOrderValidationError(
                "INVALID_PRODUCT_ID",
                `Item #${idx + 1} (${it.productName ?? "unnamed"}) has no valid productId.`
            );
        }
        if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
            throw new OfflineOrderValidationError(
                "INVALID_QUANTITY",
                `Item #${idx + 1} (${it.productName ?? "unnamed"}) has an invalid quantity.`
            );
        }
        if (it.price != null && (!Number.isFinite(it.price) || it.price < 0)) {
            throw new OfflineOrderValidationError(
                "INVALID_PRICE",
                `Item #${idx + 1} (${it.productName ?? "unnamed"}) has an invalid price.`
            );
        }
        for (const m of it.modifiers ?? []) {
            if (m.price != null && (!Number.isFinite(m.price) || m.price < 0)) {
                throw new OfflineOrderValidationError(
                    "INVALID_MODIFIER_PRICE",
                    `Modifier '${m.modifierName}' has an invalid price.`
                );
            }
        }
    }

    if (context.hasOffer) {
        const offerLines = items.filter((it) => it.offerLineId != null);
        if (offerLines.length === 0) {
            throw new OfflineOrderValidationError(
                "OFFER_WITHOUT_LINES",
                "Order has an offerId but no offer lines were resolved — cannot sync."
            );
        }
        if (context.offerQty != null && (!Number.isInteger(context.offerQty) || context.offerQty <= 0)) {
            throw new OfflineOrderValidationError(
                "INVALID_OFFER_QTY",
                "Offer quantity must be a positive integer."
            );
        }
    }
}

/**
 * Display-only hints for offline rendering. The server contract (OrderItemCreateDto)
 * carries only ids; the offline synthetic snapshot needs the resolved names so the
 * variant pill + swap chips render identically to the online path (both in the
 * cart tile and on the printed receipt) before the queue drains.
 *
 * One hint per item, parallel to `OrderCreateDto.items` / `addItemsOffline.items`.
 * Any missing field is tolerated — the UI simply omits that chip.
 */
export interface OrderItemDisplayHint {
    selectedOptionName?: string | null;
    selectedOptionNameAr?: string | null;
    recipeSnapshot?: OrderItemRecipeSnapshotDto[];
}

/**
 * After an offline action is enqueued, mirror its effect onto the persisted
 * `orders_snapshot` row so every page reading IDB sees the mutated state —
 * even after a refresh that wipes the pending overlay. Fire-and-forget:
 * snapshot absence is tolerable because the queue is still authoritative.
 */
async function updateSnapshotForAction(orderId: string, action: PendingAction): Promise<void> {
    try {
        const snap = await getOrderSnapshot(orderId);
        if (!snap) return;
        const current = snap.data as OrderDto;
        const next = applyActionToOrder(current, action);
        if (next === null) {
            await deleteOrderSnapshot(orderId);
        } else if (next !== current) {
            await putOrderSnapshot(orderId, next);
        }
    } catch {
        /* snapshot mutations are best-effort */
    }
}

/**
 * Offline-first order operations.
 *
 * All three entry points return instantly:
 *  1. Queue the action (persisted to IDB),
 *  2. Write an optimistic snapshot so UI overlays have something to render,
 *  3. Return the local id the caller can key its UI state by.
 *
 * The queue drains FIFO. `create-order` always runs before its dependents
 * because it is the oldest `createdAt`. Downstream handlers (add-items,
 * cancel-order, pay, mark-*) resolve the local id to the server id via the
 * `order_mappings` store once the create-order action succeeds.
 *
 * These helpers never throw for network reasons — the queue handles that.
 * They throw only for programmer errors (bad input).
 */

/**
 * Enqueue an offline order creation. Returns the freshly-minted local id so
 * the caller can:
 *   - show the order in the UI immediately (via the optimistic snapshot)
 *   - enqueue dependent actions (add-items, pay, mark-ready) keyed on it
 */
export async function createOrderOffline(
    order: OrderCreateDto,
    displayHints?: OrderItemDisplayHint[],
): Promise<{
    localId: string;
    snapshot: OrderDto;
}> {
    validateItemsForOffline(order.items, {
        hasOffer: order.offerId != null,
        offerQty: order.offerQty,
    });

    const localId = generateLocalOrderId();
    // Preserve identity assigned upstream (by createOrderSmart) so a delayed
    // online success and the offline replay reconcile to the same server order.
    const clientOrderUUID = order.clientOrderUUID ?? generateClientOrderUUID();
    const publicOrderNumber = order.publicOrderNumber ?? await generatePublicOrderNumber();
    const orderSequenceNumber = order.orderSequenceNumber ?? await generateOfflineSequenceNumber(order.orderType);
    // P1 (offline financial preservation): stamp the exact subtotal /
    // discount / service / tax / total computed at the moment the cashier
    // printed the receipt onto the queue payload so the server can replay
    // them verbatim once connectivity returns. Backend honors these only
    // when publicOrderNumber is set (OFF# marker).
    const offlineAmounts = computeOfflineFinancialSnapshot(order);
    const orderWithIdentity = {
        ...order,
        clientOrderUUID,
        publicOrderNumber,
        orderSequenceNumber,
        subtotal: order.subtotal ?? offlineAmounts.subtotal,
        discountAmount: order.discountAmount ?? offlineAmounts.discountAmount,
        serviceChargeAmount: order.serviceChargeAmount ?? offlineAmounts.serviceChargeAmount,
        taxAmount: order.taxAmount ?? offlineAmounts.taxAmount,
        totalAmount: order.totalAmount ?? offlineAmounts.totalAmount,
    };
    const action = await enqueue({
        type: "create-order",
        orderId: localId,
        payload: {
            localId,
            order: orderWithIdentity,
        },
        lockKey: `order:create:${clientOrderUUID}`,
    });

    const anchorLocalId = getCreateActionLocalId(action, localId);
    const anchorOrder = getCreateActionOrder(action, orderWithIdentity);
    const existingSnapshot = await getOrderSnapshot(anchorLocalId);
    const snapshot = (existingSnapshot?.data as OrderDto | undefined) ??
        buildSyntheticOrder(anchorLocalId, anchorOrder, displayHints);

    await putOrderSnapshot(anchorLocalId, snapshot);
    await putOrderIdentity({
        localOrderId: anchorLocalId,
        clientOrderUUID: anchorOrder.clientOrderUUID ?? clientOrderUUID,
        publicOrderNumber: anchorOrder.publicOrderNumber ?? publicOrderNumber,
        transactionId: action.transactionId ?? action.id,
        createdAt: Date.now(),
    });

    return { localId: anchorLocalId, snapshot };
}

/**
 * Match buildSyntheticOrder's formula so the receipt the cashier printed,
 * the snapshot the UI displays, and the values we ship to the server on
 * replay are byte-identical. The cashier's till reconciles against THIS
 * number; nothing on the server should be allowed to drift it.
 */
function computeOfflineFinancialSnapshot(input: OrderCreateDto): {
    subtotal: number;
    discountAmount: number;
    serviceChargeAmount: number;
    taxAmount: number;
    totalAmount: number;
} {
    const subtotal = (input.items ?? []).reduce(
        (sum, it) => sum + (it.isComplimentary
            ? 0
            : ((it.price ?? 0) + (it.modifiers ?? []).reduce(
                (modifierSum, modifier) => modifierSum + (modifier.price ?? 0) * (modifier.quantity ?? 1),
                0
            )) * it.quantity),
        0
    );
    const discountPercentage = input.discountPercentage ?? 0;
    const discountAmount = subtotal * (discountPercentage / 100);
    const afterDiscount = subtotal - discountAmount;
    const serviceChargeRate = input.serviceChargeRate ?? 0;
    const serviceChargeAmount = afterDiscount * (serviceChargeRate / 100);
    const taxRate = input.taxRate ?? 0;
    const taxAmount = (afterDiscount + serviceChargeAmount) * (taxRate / 100);
    const deliveryFee = input.orderType === 2
        ? Math.max(0, input.deliveryFeeOverride ?? input.deliveryFee ?? 0)
        : 0;
    const totalAmount = afterDiscount + serviceChargeAmount + taxAmount + deliveryFee;
    return { subtotal, discountAmount, serviceChargeAmount, taxAmount, totalAmount };
}

/**
 * Enqueue adding items to an order. Accepts either a real server id or a
 * local offline id — the queue resolves synthetic ids at drain time.
 */
export async function addOrderItemsOffline(
    orderId: string,
    items: OrderItemCreateDto[],
    displayHints?: OrderItemDisplayHint[]
): Promise<void> {
    if (!items.length) return;
    validateItemsForOffline(items, {
        hasOffer: items.some((it) => it.offerLineId != null),
    });
    // The queue replays the original OrderItemCreateDto[] to the server, but
    // snapshot math needs OrderItemDto-shaped rows (unitPrice + lineTotalAmount)
    // so cashier/takeaway overlays show the correct totals. We carry both in
    // the payload: `items` stays authoritative for replay, `snapshotItems`
    // is consumed only by applyActionToOrder.
    //
    // `displayHints[idx]` carries resolved variant/swap names so the UI renders
    // the "Variant:" pill and "↪ alternative" chips while the order is still
    // queued. Absent hints fall back to the server snapshot once the queue
    // drains.
    const snapshotItems = items.map((it, idx) => {
        const hint = displayHints?.[idx];
        return {
            id: `${orderId}-local-add-${Date.now()}-${idx}`,
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.price,
            lineTotalAmount: it.isComplimentary ? 0 : ((it.price ?? 0) + (it.modifiers ?? []).reduce((sum, modifier) => sum + (modifier.price ?? 0) * (modifier.quantity ?? 1), 0)) * (it.quantity ?? 0),
            notes: it.notes,
            isComplimentary: it.isComplimentary ?? false,
            itemStatus: ITEM_STATUS.PREPARING,
            isNewlyAdded: true,
            modifiers: it.modifiers ?? [],
            selectedOptionName: hint?.selectedOptionName ?? null,
            selectedOptionNameAr: hint?.selectedOptionNameAr ?? null,
            recipeSnapshot: hint?.recipeSnapshot ?? [],
        };
    });
    const action = await enqueue({
        type: "add-items",
        orderId,
        payload: {
            items: items as unknown as Record<string, unknown>[],
            snapshotItems: snapshotItems as unknown as Record<string, unknown>[],
        },
    });
    await updateSnapshotForAction(orderId, action);
}

/**
 * Enqueue order cancellation. Works against both synthetic and real ids.
 * The queue treats 404/409 on cancel as success (order already gone), so a
 * duplicate cancel after partial sync is a no-op.
 */
export async function cancelOrderOffline(
    orderId: string,
    payload: CancelOrderPayload
): Promise<void> {
    const action = await enqueue({
        type: "cancel-order",
        orderId,
        payload: payload as unknown as Record<string, unknown>,
    });
    await updateSnapshotForAction(orderId, action);
}

export { isOfflineOrderId };

/**
 * Enqueue an offline payment. The cashier flow already does this inline, but
 * this helper gives takeaway the same one-liner entry-point so the behaviour
 * stays identical across pages.
 */
export async function enqueuePaymentOffline(
    orderId: string,
    payload: {
        amount: number;
        paymentMethod: string;
        paymentMethodId?: string;
        paymentMethodName?: string | null;
        paymentMethodNameAr?: string | null;
        paymentMethodCode?: string | null;
        referenceNumber?: string | null;
        serviceChargeRate?: number;
        taxRate?: number;
        customerPhone?: string;
        amountTendered?: number;
        applyVoucher?: boolean;
        voucherDiscountAmount?: number;
        discount?: import("@/types/order").OrderDiscountChange;
        paidAt?: string;
        /**
         * Pre-generated stable id (P1 fix). When the cashier first tried
         * the online call with this id and the response was lost, passing
         * it here lets the idempotency middleware deduplicate the queued
         * retry against the original server-side write.
         */
        clientActionId?: string;
    },
    expectedOrderState?: PendingAction["expectedOrderState"]
): Promise<void> {
    const paymentPayload = {
        ...payload,
        paidAt: payload.paidAt ?? new Date().toISOString(),
    };
    const action = await enqueue({
        type: "pay",
        orderId,
        payload: paymentPayload as unknown as Record<string, unknown>,
        lockKey: `payment:${orderId}:${stableStringify(paymentPayload)}`,
        expectedOrderState:
            expectedOrderState ?? { paidAmount: paymentPayload.amount, isPaid: true },
        clientActionId: paymentPayload.clientActionId,
        transactionId: paymentPayload.clientActionId,
    });
    await updateSnapshotForAction(orderId, action);
}

export async function createPaidOrderOffline(
    order: OrderCreateDto,
    payment: {
        amount: number;
        paymentMethod: string;
        paymentMethodId?: string;
        paymentMethodName?: string | null;
        paymentMethodNameAr?: string | null;
        paymentMethodCode?: string | null;
        referenceNumber?: string | null;
        serviceChargeRate?: number;
        taxRate?: number;
        customerPhone?: string;
        amountTendered?: number;
        applyVoucher?: boolean;
        voucherDiscountAmount?: number;
        discount?: import("@/types/order").OrderDiscountChange;
        paidAt?: string;
    },
    displayHints?: OrderItemDisplayHint[],
): Promise<OrderDto> {
    validateItemsForOffline(order.items, {
        hasOffer: order.offerId != null,
        offerQty: order.offerQty,
    });

    const localId = generateLocalOrderId();
    // Same identity-preservation rule as createOrderOffline — keeps a
    // delayed online success deduplicated against the queued replay.
    const clientOrderUUID = order.clientOrderUUID ?? generateClientOrderUUID();
    const publicOrderNumber = order.publicOrderNumber ?? await generatePublicOrderNumber();
    const orderSequenceNumber = order.orderSequenceNumber ?? await generateOfflineSequenceNumber(order.orderType);
    // P1 (offline financial preservation): see createOrderOffline.
    const offlineAmounts = computeOfflineFinancialSnapshot(order);
    const orderWithIdentity = {
        ...order,
        clientOrderUUID,
        publicOrderNumber,
        orderSequenceNumber,
        subtotal: order.subtotal ?? offlineAmounts.subtotal,
        discountAmount: order.discountAmount ?? offlineAmounts.discountAmount,
        serviceChargeAmount: order.serviceChargeAmount ?? offlineAmounts.serviceChargeAmount,
        taxAmount: order.taxAmount ?? offlineAmounts.taxAmount,
        totalAmount: order.totalAmount ?? offlineAmounts.totalAmount,
    };
    const createAction = await enqueue({
        type: "create-order",
        orderId: localId,
        payload: {
            localId,
            order: orderWithIdentity,
        },
        lockKey: `order:create:${clientOrderUUID}`,
    });

    const anchorLocalId = getCreateActionLocalId(createAction, localId);
    const anchorOrder = getCreateActionOrder(createAction, orderWithIdentity);
    const paymentWithPaidAt = {
        ...payment,
        paidAt: payment.paidAt ?? new Date().toISOString(),
    };
    const draftSnapshot = buildSyntheticOrder(anchorLocalId, anchorOrder, displayHints);
    const paidSnapshot: OrderDto = {
        ...applyPaymentToOrder(draftSnapshot, {
            amount: paymentWithPaidAt.amount,
            method: paymentWithPaidAt.paymentMethod,
            paymentMethodId: paymentWithPaidAt.paymentMethodId,
            paymentMethodName: paymentWithPaidAt.paymentMethodName,
            paymentMethodNameAr: paymentWithPaidAt.paymentMethodNameAr,
            paymentMethodCode: paymentWithPaidAt.paymentMethodCode,
            referenceNumber: paymentWithPaidAt.referenceNumber,
            amountTendered: paymentWithPaidAt.amountTendered,
            applyVoucher: paymentWithPaidAt.applyVoucher,
            voucherDiscountAmount: paymentWithPaidAt.voucherDiscountAmount,
            serviceChargeRate: paymentWithPaidAt.serviceChargeRate,
            taxRate: paymentWithPaidAt.taxRate,
            discount: paymentWithPaidAt.discount,
            createdAt: paymentWithPaidAt.paidAt,
        }),
        customerPhone: paymentWithPaidAt.customerPhone ?? draftSnapshot.customerPhone,
    };

    await putOrderSnapshot(anchorLocalId, paidSnapshot);
    await putOrderIdentity({
        localOrderId: anchorLocalId,
        clientOrderUUID: anchorOrder.clientOrderUUID ?? clientOrderUUID,
        publicOrderNumber: anchorOrder.publicOrderNumber ?? publicOrderNumber,
        transactionId: createAction.transactionId ?? createAction.id,
        createdAt: Date.now(),
    });

    await enqueue({
        type: "pay",
        orderId: anchorLocalId,
        payload: paymentWithPaidAt as unknown as Record<string, unknown>,
        dependsOn: [createAction.id],
        lockKey: `payment:${anchorLocalId}:${stableStringify(paymentWithPaidAt)}`,
        expectedOrderState: {
            paidAmount: paymentWithPaidAt.amount,
            isPaid: true,
            paymentStatus: "Paid",
        },
    });

    return paidSnapshot;
}

export async function settleServerPaidOrderOffline(
    orderId: string,
    payment: {
        amount: number;
        paymentMethod: string;
        referenceNumber?: string | null;
        paidAt?: string;
    },
): Promise<OrderDto | null> {
    const snap = await getOrderSnapshot(orderId);
    if (!snap) return null;

    const current = snap.data as OrderDto;
    const settled = applyPaymentToOrder(current, {
        amount: payment.amount,
        method: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        createdAt: payment.paidAt ?? new Date().toISOString(),
    });
    await putOrderSnapshot(orderId, settled);
    return settled;
}

/**
 * Enqueue mark-ready for kitchen/cashier when offline.
 */
export async function enqueueMarkReadyOffline(orderId: string): Promise<void> {
    const action = await enqueue({
        type: "mark-ready",
        orderId,
        payload: await getOrderReferencePayload(orderId),
        lockKey: `status:${orderId}:ready`,
        expectedOrderState: { status: ORDER_STATUS.READY },
    });
    await updateSnapshotForAction(orderId, action);
}

export async function enqueueMarkServedOffline(orderId: string): Promise<void> {
    const action = await enqueue({
        type: "mark-served",
        orderId,
        payload: await getOrderReferencePayload(orderId),
        lockKey: `status:${orderId}:served`,
        expectedOrderState: { status: ORDER_STATUS.SERVED },
    });
    await updateSnapshotForAction(orderId, action);
}

export async function enqueueMarkPickupOffline(orderId: string): Promise<void> {
    const action = await enqueue({
        type: "mark-pickup",
        orderId,
        payload: await getOrderReferencePayload(orderId),
        lockKey: `status:${orderId}:pickup`,
        expectedOrderState: { status: ORDER_STATUS.SERVED },
    });
    await updateSnapshotForAction(orderId, action);
}

async function getOrderReferencePayload(orderId: string): Promise<Record<string, unknown>> {
    const snap = await getOrderSnapshot(orderId).catch(() => undefined);
    const order = snap?.data as Partial<OrderDto> | undefined;
    const publicOrderNumber = cleanOrderReference(order?.publicOrderNumber);
    const orderNumber = publicOrderNumber ?? cleanOrderReference(order?.orderNumber);

    if (!orderNumber) return {};
    return publicOrderNumber ? { publicOrderNumber, orderNumber } : { orderNumber };
}

function cleanOrderReference(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/**
 * Online-first order creation with safe offline fallback.
 *
 * Flow:
 *  1. Pre-generate clientOrderUUID once so the online attempt and any offline
 *     replay share identity. If the replay gains an OFF reference, the backend
 *     reconciles that reference onto the existing order instead of creating a
 *     duplicate.
 *  2. Attempt the online call unless connectivity is explicitly "offline"
 *     (navigator.onLine === false). "degraded" still tries the API — the
 *     10-second health-ping cadence is too coarse to be the only gate, and
 *     the actual POST is the truth-source for reachability.
 *  3. Classify any thrown error:
 *       - "client" (HTTP rejection): rethrow as OrderCreateClientError.
 *         Validation, auth, conflict — must surface to the cashier, NOT be
 *         queued. A bad payload sitting in the queue would just fail on
 *         every drain and never reach the user.
 *       - "network" (transport failure, timeout, or BFF upstream failure):
 *         fall through to the offline queue. The shared clientOrderUUID
 *         guarantees that if the online write actually succeeded server-side,
 *         the replay reconciles.
 *  4. If the online call resolves with `null` (caller chose to swallow), we
 *     treat it as a transient failure for backward compatibility — but the
 *     newer `createTakeawayOrder` propagates errors so this branch is
 *     mostly inert now.
 */
export async function createOrderSmart(
    order: OrderCreateDto,
    online: (order: OrderCreateDto) => Promise<OrderDto | null>,
    displayHints?: OrderItemDisplayHint[]
): Promise<OrderDto | null> {
    // Only clientOrderUUID is pre-generated. Sequence numbers are assigned by
    // the server online, or minted with OFF# only inside the offline fallback.
    const clientOrderUUID = order.clientOrderUUID ?? generateClientOrderUUID();
    const orderWithIdentity: OrderCreateDto = {
        ...order,
        clientOrderUUID,
    };

    if (getConnectivityState() !== "offline") {
        try {
            const result = await online(orderWithIdentity);
            if (result) {
                void recordServerSequences([result]);
                return result;
            }
            // null without throw → legacy "swallowed error" contract. Treat as
            // transient and fall through to offline so the order is not lost.
        } catch (err) {
            const kind = classifyOnlineCreateError(err);
            if (kind === "client") {
                const status = (err as { response?: { status: number } }).response!.status;
                throw new OrderCreateClientError(
                    status,
                    extractClientErrorMessage(err, `Order rejected (HTTP ${status}).`),
                    (err as { response?: { data?: unknown } }).response?.data,
                );
            }
            reportApiFailure();
            // Network failure or timeout -> offline fallback.
        }
    }

    const { snapshot } = await createOrderOffline(orderWithIdentity, displayHints);
    return snapshot;
}

// ─── Internals ───────────────────────────────────────────

/**
 * Generate a positive, monotonically-increasing local ticket id for offline
 * orders. `getSessionOrders` rejects anything <= 0, and negative / zero ticket
 * ids leak into the UI as "Ticket #0". We use a base timestamp (ms since
 * 2025-01-01) so the number stays int32-safe and large enough to never clash
 * with server-issued sequential ids. The counter guarantees uniqueness for
 * multiple offline orders created within the same ms.
 */
const OFFLINE_TICKET_EPOCH = Date.UTC(2025, 0, 1);
let offlineTicketCounter = 0;
function generateLocalTicketId(): number {
    offlineTicketCounter = (offlineTicketCounter + 1) % 1000;
    return Math.floor((Date.now() - OFFLINE_TICKET_EPOCH) / 1000) * 1000 + offlineTicketCounter;
}

/**
 * Legacy fallback only. New offline orders use `publicOrderNumber` so receipts
 * stay searchable after sync.
 */
function generateLocalOrderNumber(ticketId: number): string {
    return `LOCAL-${String(ticketId).slice(-6)}`;
}

function getCreateActionLocalId(action: PendingAction, fallback: string): string {
    const payload = action.payload as { localId?: unknown };
    return typeof payload.localId === "string" ? payload.localId : fallback;
}

function getCreateActionOrder(action: PendingAction, fallback: OrderCreateDto): OrderCreateDto {
    const payload = action.payload as { order?: unknown };
    return payload.order && typeof payload.order === "object"
        ? payload.order as OrderCreateDto
        : fallback;
}

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    return `{${Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
        .join(",")}}`;
}

function buildSyntheticOrder(
    localId: string,
    input: OrderCreateDto,
    displayHints?: OrderItemDisplayHint[],
): OrderDto {
    const items = (input.items ?? []).map((it, idx) => {
        const hint = displayHints?.[idx];
        return {
            id: `${localId}-item-${idx}`,
            productId: it.productId,
            productName: it.productName ?? "",
            quantity: it.quantity,
            unitPrice: it.price ?? 0,
            lineTotalAmount: it.isComplimentary ? 0 : ((it.price ?? 0) + (it.modifiers ?? []).reduce((sum, modifier) => sum + (modifier.price ?? 0) * (modifier.quantity ?? 1), 0)) * it.quantity,
            hasPartnerDiscountOverride: input.hasPriceDifference === true && it.partnerCorrectedUnitPrice != null,
            partnerOriginalUnitPrice: null,
            partnerDiscountedUnitPrice: input.hasPriceDifference === true && it.partnerCorrectedUnitPrice != null ? it.partnerCorrectedUnitPrice : null,
            notes: it.notes,
            isComplimentary: it.isComplimentary ?? false,
            itemStatus: ITEM_STATUS.PREPARING,
            isNewlyAdded: false,
            modifiers: it.modifiers ?? [],
            selectedOptionName: hint?.selectedOptionName ?? null,
            selectedOptionNameAr: hint?.selectedOptionNameAr ?? null,
            recipeSnapshot: hint?.recipeSnapshot ?? [],
        };
    }) as OrderDto["items"];

    const subtotal = (input.items ?? []).reduce(
        (sum, it) => sum + (it.isComplimentary ? 0 : ((it.price ?? 0) + (it.modifiers ?? []).reduce((modifierSum, modifier) => modifierSum + (modifier.price ?? 0) * (modifier.quantity ?? 1), 0)) * it.quantity),
        0
    );
    const discountPercentage = input.discountPercentage ?? 0;
    const discountAmount = subtotal * (discountPercentage / 100);
    const afterDiscount = subtotal - discountAmount;
    const serviceChargeRate = input.serviceChargeRate ?? 0;
    const serviceChargeAmount = afterDiscount * (serviceChargeRate / 100);
    const taxRate = input.taxRate ?? 0;
    const taxAmount = (afterDiscount + serviceChargeAmount) * (taxRate / 100);
    const deliveryFee = input.orderType === 2 ? Math.max(0, input.deliveryFeeOverride ?? input.deliveryFee ?? 0) : 0;
    const totalAmount = afterDiscount + serviceChargeAmount + taxAmount + deliveryFee;

    // FIX(issue-2): ticketId must be > 0, otherwise getSessionOrders drops the
    // order from the table view and the table card shows "#—". We honor an
    // explicit input.ticketId (add-items flow reuses the session ticket) and
    // fall back to a locally-generated positive id for brand-new sessions.
    const ticketId = input.ticketId && input.ticketId > 0 ? input.ticketId : generateLocalTicketId();

    // Minimal OrderDto shape. Server-computed fields are approximated locally
    // so the UI has sensible numbers; the real server values replace these on
    // the next refresh after sync.
    const currentUserId = useAuthStore.getState().user?.id ?? null;

    return {
        id: localId,
        orderNumber: input.publicOrderNumber ?? generateLocalOrderNumber(ticketId),
        clientOrderUUID: input.clientOrderUUID,
        publicOrderNumber: input.publicOrderNumber,
        orderSequenceNumber: input.orderSequenceNumber,
        ticketId,
        tableName: input.tableName ?? "",
        orderType: input.orderType === 2 ? "Delivery" : input.orderType === 1 ? "Takeaway" : "DineIn",
        orderSource: input.orderSource ?? "Pos",
        offerId: input.offerId ?? null,
        offerNote: input.offerNote ?? null,
        isPaid: false,
        subtotal,
        discountPercentage,
        discountAmount,
        serviceChargeRate,
        serviceChargeAmount,
        taxRate,
        taxAmount,
        totalAmount,
        deliveryZoneId: input.deliveryZoneId,
        deliveryZoneName: input.deliveryZoneName,
        deliveryFee: deliveryFee > 0 ? deliveryFee : null,
        deliveryCost: input.deliveryCost,
        deliveryPaymentMode: input.deliveryPaymentMode,
        deliveryAddress: input.deliveryAddress,
        deliveryNotes: input.deliveryNotes,
        // Delivery-partner / Talabat fields are preserved in the queue
        // payload (full `...order` spread) so they sync verbatim. Surface
        // them on the synthetic snapshot too so the cashier sees the
        // partner pill / Talabat ref while the order is still offline.
        deliveryPartnerId: input.deliveryPartnerId,
        deliveryPartnerName: input.deliveryPartnerName,
        deliveryPartnerNameAr: input.deliveryPartnerNameAr,
        deliveryPartnerCode: input.deliveryPartnerCode,
        partnerOrderNumber: input.partnerOrderNumber,
        partnerCustomerName: input.partnerCustomerName,
        partnerCustomerPhone: input.partnerCustomerPhone,
        partnerPaymentMethod: input.partnerPaymentMethod,
        partnerPickupTime: input.partnerPickupTime,
        partnerDeliveryFee: input.partnerDeliveryFee,
        partnerServiceFee: input.partnerServiceFee,
        actualDeliveryCost: input.actualDeliveryCost ?? undefined,
        hasPriceDifference: input.hasPriceDifference,
        hasPartnerDiscountOverride: input.hasPriceDifference,
        talabatOrderNumber: input.talabatOrderNumber,
        talabatCustomerName: input.talabatCustomerName,
        talabatCustomerPhone: input.talabatCustomerPhone,
        talabatPaymentMethod: input.talabatPaymentMethod,
        talabatPickupTime: input.talabatPickupTime,
        talabatDeliveryFee: input.talabatDeliveryFee,
        talabatServiceFee: input.talabatServiceFee,
        status: ORDER_STATUS.PREPARING,
        paymentStatus: "Unpaid",
        paidAmount: 0,
        remainingAmount: totalAmount,
        isVoucherApplied: false,
        voucherDiscountAmount: 0,
        customerId: input.customerId,
        customerName: input.customerName,
        customerNameAr: input.customerNameAr,
        customerPhone: input.customerPhone,
        createdBy: currentUserId,
        items,
        createdAt: new Date().toISOString(),
    };
}
