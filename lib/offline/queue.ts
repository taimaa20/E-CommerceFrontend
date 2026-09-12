import {
    PendingAction,
    ActionType,
    ConflictType,
    listActions,
    putAction,
    deleteAction,
    putShiftMapping,
    getShiftMapping,
    putOrderMapping,
    getOrderMapping,
    markOrderIdentitySynced,
    replaceOrderSnapshot,
    cleanupStaleLocks,
    acquireLocalLock,
    releaseLocalLock,
    getOrderSnapshot,
    putOrderSnapshot,
    resolveOrderIdentity,
} from "./db";
import { generateActionId, isOfflineOrderId } from "./id";
import { readSelectedBranchId } from "@/lib/branch-selection";
import {
    getConnectivityState,
    subscribeConnectivity,
    startConnectivity,
} from "./connectivity";
import {
    addOrderPayment,
    payOrderStrict,
    markOrderAsReadyStrict,
    markOrderAsServedStrict,
    markTakeawayPickedUpStrict,
    getCashierOrdersStrict,
    getActiveOrdersStrict,
    openMyCashierShift,
    closeCashierShift,
    getActiveCashierShift,
    createOrderAndReturn,
    addItemsToOrder,
    cancelOrder,
    isNetworkRequestError,
} from "@/lib/api";
import type { OrderPaymentResult } from "@/lib/api";
import type { CashierBalanceShift, CloseCashierShiftPayload } from "@/types/cashier-balance";
import type { OrderCreateDto, OrderItemCreateDto, CancelOrderPayload } from "@/types/order";
import { CASHIER_PAYMENT_STATUS, getCashierOrderState } from "@/lib/cashier-order-selectors";
import { getOrderPaidAmount, getOrderPaymentStatus } from "@/lib/order-payments";
import { ORDER_STATUS } from "@/lib/status-constants";
import type { OrderDto } from "@/types/order";

/**
 * Sync queue — single-source-of-truth for cashier mutations.
 *
 * Contract:
 *  1. UI calls enqueue(...) → returns instantly; action persisted to IDB.
 *  2. Queue drains asynchronously; never blocks UI.
 *  3. Before each attempt, queue fetches current server state of the order
 *     and short-circuits if server already reflects the expected state
 *     (paired with backend idempotency for replay safety).
 *  4. Retries only on network-level errors (fetch rejection, timeout, or
 *     the BFF's explicit upstream-unreachable response). Confirmed server
 *     rejections are treated as hard failures → status: "failed".
 *  5. Dedup: enqueue rejects if an identical pending action already exists
 *     for the same orderId+type.
 */

type Listener = (actions: PendingAction[]) => void;
const listeners = new Set<Listener>();

/**
 * Fired the moment an action transitions to `status: "failed"`. Lets the UI
 * surface a toast so the cashier sees the failure immediately — the red
 * sync badge alone is too easy to miss, especially on offer orders where
 * the operator already moved on to the next ticket.
 */
type FailureListener = (event: {
    action: PendingAction;
    reason: string;
    code?: number;
}) => void;
const failureListeners = new Set<FailureListener>();
export function subscribeFailures(listener: FailureListener): () => void {
    failureListeners.add(listener);
    return () => {
        failureListeners.delete(listener);
    };
}
function emitFailure(event: { action: PendingAction; reason: string; code?: number }) {
    for (const l of failureListeners) {
        try {
            l(event);
        } catch {
            /* listener errors must never break the queue */
        }
    }
}

/**
 * Reconciliation hook — lets the shift store update its in-memory state
 * when a queued open-shift/close-shift action syncs. Decouples the queue
 * from the Zustand store to avoid a circular import.
 */
type ShiftReconciler = (event:
    | { kind: "opened"; localId: string; shift: CashierBalanceShift }
    | { kind: "closed"; shift: CashierBalanceShift }
) => void;
let shiftReconciler: ShiftReconciler | null = null;
export function registerShiftReconciler(fn: ShiftReconciler | null) {
    shiftReconciler = fn;
}

let cachedActions: PendingAction[] = [];
let draining = false;
let drainScheduled = false;
let lastServerOrders: OrderDto[] | null = null;
let lastServerOrdersAt = 0;

const BACKOFF_MS = [2_000, 5_000, 15_000, 45_000, 120_000];
const SERVER_ORDER_CACHE_MS = 5_000;
const RECONCILIATION_PAGE_SIZE = 200;
const RECONCILIATION_MAX_PAGES = 5;
const REPLAY_SAFE_SINGLETON_TYPES = new Set<ActionType>([
    "mark-ready",
    "mark-served",
    "mark-pickup",
    "cancel-order",
]);

function notify() {
    for (const l of listeners) {
        try {
            l(cachedActions.slice());
        } catch {
            /* listener errors must never break the queue */
        }
    }
}

async function reload() {
    cachedActions = await listActions().catch(() => [] as PendingAction[]);
    // Sort oldest-first so drain order matches creation order
    cachedActions.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    notify();
}

export function getCachedActions(): PendingAction[] {
    return cachedActions.slice();
}

export function getPendingCount(): number {
    return cachedActions.filter(isActiveStatus).length;
}

export function subscribeQueue(listener: Listener): () => void {
    listeners.add(listener);
    // Fire once so subscribers can initialize
    try {
        listener(cachedActions.slice());
    } catch {
        /* ignore */
    }
    return () => {
        listeners.delete(listener);
    };
}

export async function initQueue(): Promise<void> {
    startConnectivity();
    await cleanupStaleLocks().catch(() => {});
    await reload();
    subscribeConnectivity((state) => {
        if (state === "online") scheduleDrain(200);
    });
    // Drain attempt on boot if we came back with pending items
    if (getPendingCount() > 0) scheduleDrain(500);
}

// ─── Enqueue ─────────────────────────────────────────────

export interface EnqueueInput {
    type: ActionType;
    orderId: string;
    payload: Record<string, unknown>;
    expectedOrderState?: PendingAction["expectedOrderState"];
    dependsOn?: string[];
    lockKey?: string;
    transactionId?: string;
    clientActionId?: string;
}

export async function enqueue(input: EnqueueInput): Promise<PendingAction> {
    // Ensure connectivity polling is running even if the app booted into a
    // screen that never called initQueue (e.g. direct to shift widget).
    startConnectivity();

    const id = input.transactionId ?? await generateActionId();
    const lockOwnerId = id;
    const hasLock = !!input.lockKey;
    const lockAcquired = hasLock
        ? await acquireLocalLock(input.lockKey!, lockOwnerId).catch(() => false)
        : false;

    if (hasLock && !lockAcquired) {
        const dup = await waitForDuplicateAction(input);
        if (dup) return dup;
    }

    try {
        const dup = await findDuplicateAction(input);
        if (dup) return dup;

        const action: PendingAction = {
            id,
            transactionId: id,
            clientActionId: input.clientActionId ?? id,
            type: input.type,
            orderId: input.orderId,
            payload: input.payload,
            branchId: readSelectedBranchId() ?? undefined,
            dependsOn: input.dependsOn,
            lockKey: input.lockKey,
            createdAt: Date.now(),
            attempts: 0,
            status: "pending",
            expectedOrderState: input.expectedOrderState,
        };
        await putAction(action);
        await reload();
        scheduleDrain(50);
        return action;
    } finally {
        if (hasLock && lockAcquired) {
            await releaseLocalLock(input.lockKey!, lockOwnerId).catch(() => {});
        }
    }
}

export async function removeAction(id: string): Promise<void> {
    await deleteAction(id);
    await reload();
}

async function findDuplicateAction(input: EnqueueInput): Promise<PendingAction | undefined> {
    const allActions = await listActions();
    const existing = allActions.filter(
        (action) => action.orderId === input.orderId || (!!input.lockKey && action.lockKey === input.lockKey)
    );

    return existing.find((action) => {
        if (input.lockKey && action.lockKey === input.lockKey) {
            return isActiveStatus(action) || isReplaySafeSingletonAction(input.type);
        }

        if (!isActiveStatus(action)) {
            return false;
        }

        if (action.orderId !== input.orderId || action.type !== input.type) {
            return false;
        }

        if (input.type !== "pay") {
            return true;
        }

        return JSON.stringify(action.payload) === JSON.stringify(input.payload);
    });
}

function isReplaySafeSingletonAction(type: ActionType): boolean {
    return REPLAY_SAFE_SINGLETON_TYPES.has(type);
}

async function waitForDuplicateAction(input: EnqueueInput): Promise<PendingAction | undefined> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const dup = await findDuplicateAction(input);
        if (dup) return dup;
        await delay(50);
    }

    return undefined;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Drain ───────────────────────────────────────────────

export function scheduleDrain(delayMs = 100) {
    if (drainScheduled) return;
    drainScheduled = true;
    setTimeout(() => {
        drainScheduled = false;
        void drain();
    }, delayMs);
}

interface ServerOrderLookup {
    orders: OrderDto[];
    verified: boolean;
}

async function refreshServerOrders(force = false): Promise<ServerOrderLookup> {
    const now = Date.now();
    if (!force && lastServerOrders && now - lastServerOrdersAt < SERVER_ORDER_CACHE_MS) {
        return { orders: lastServerOrders, verified: true };
    }
    try {
        const orders = await getCashierOrdersStrict("today", {
            page: 1,
            pageSize: RECONCILIATION_PAGE_SIZE,
        });
        lastServerOrders = orders;
        lastServerOrdersAt = now;
        return { orders, verified: true };
    } catch {
        return { orders: lastServerOrders ?? [], verified: false };
    }
}

async function loadServerOrdersForReconciliation(): Promise<ServerOrderLookup> {
    const orders: OrderDto[] = [];
    try {
        const activeOrders = await getActiveOrdersStrict();
        orders.push(...activeOrders);
        for (let page = 1; page <= RECONCILIATION_MAX_PAGES; page++) {
            const batch = await getCashierOrdersStrict("all", {
                page,
                pageSize: RECONCILIATION_PAGE_SIZE,
            });
            for (const order of batch) {
                if (!orders.some((candidate) => candidate.id === order.id)) {
                    orders.push(order);
                }
            }
            if (batch.length < RECONCILIATION_PAGE_SIZE) break;
        }
        lastServerOrders = orders;
        lastServerOrdersAt = Date.now();
        return { orders, verified: true };
    } catch {
        return { orders: lastServerOrders ?? [], verified: false };
    }
}

function matchesExpected(order: OrderDto | undefined, expected?: PendingAction["expectedOrderState"]): boolean {
    if (!expected || !order) return false;
    const state = getCashierOrderState(order);
    if (expected.isPaid === true && !(state.paymentStatus === CASHIER_PAYMENT_STATUS.PAID)) return false;
    if (typeof expected.paidAmount === "number" && getOrderPaidAmount(order) + 0.001 < expected.paidAmount) return false;
    if (expected.paymentStatus && getOrderPaymentStatus(order) !== expected.paymentStatus) return false;
    if (expected.status) {
        if (expected.status === ORDER_STATUS.READY && !state.isReady) return false;
        if (
            (expected.status === ORDER_STATUS.SERVED || expected.status === ORDER_STATUS.COMPLETED) &&
            !state.served
        )
            return false;
    }
    return true;
}

async function rewriteQueuedCloseShifts(localId: string, serverId: string): Promise<void> {
    const all = await listActions();
    for (const a of all) {
        if (
            a.type === "close-shift" &&
            (a.payload as { shiftId?: string }).shiftId === localId
        ) {
            await putAction({
                ...a,
                orderId: serverId, // keep orderId in sync with resolved shift id
                payload: { ...a.payload, shiftId: serverId },
            });
        }
    }
}

async function failDependentCloseShifts(localId: string, reason: string): Promise<void> {
    const all = await listActions();
    for (const a of all) {
        if (
            a.type === "close-shift" &&
            (a.payload as { shiftId?: string }).shiftId === localId &&
            (a.status === "pending" || a.status === "syncing")
        ) {
            await putAction({ ...a, status: "failed", lastError: reason });
        }
    }
}

/**
 * Resolve a possibly-synthetic order id to its server id. Returns:
 *   - the input unchanged if it's already a real id
 *   - the mapped server id if the create-order action has synced
 *   - null if the mapping doesn't exist yet (caller should return "retry")
 */
async function resolveOrderId(orderId: string): Promise<string | null> {
    if (!isOfflineOrderId(orderId)) return orderId;
    const mapping = await getOrderMapping(orderId);
    return mapping ? mapping.serverId : null;
}

/**
 * Mirror the backend's payment snapshot onto the persisted order snapshot so a
 * synced paid order keeps its resolved lifecycle status after queue removal.
 * Best-effort: the server remains authoritative on the next list refresh, so a
 * write failure here is non-fatal.
 */
async function persistPaidSnapshot(orderId: string, result: OrderPaymentResult): Promise<void> {
    try {
        const snap = await getOrderSnapshot(orderId);
        if (!snap) return;
        const order = snap.data as OrderDto;
        await putOrderSnapshot(orderId, {
            ...order,
            isPaid: result.isPaid,
            paymentStatus: result.paymentStatus,
            paidAmount: result.paidAmount,
            remainingAmount: result.remainingAmount,
            totalAmount: result.totalAmount,
            paymentMethod: result.paymentMethod ?? order.paymentMethod,
            amountTendered: result.amountTendered ?? order.amountTendered,
            changeAmount: result.changeAmount ?? order.changeAmount,
            payments: result.payments ?? order.payments,
            status: result.status ?? order.status,
            syncedAt: new Date().toISOString(),
        });
    } catch {
        /* snapshot mirror is best-effort */
    }
}

async function persistConfirmedServerOrder(order?: OrderDto): Promise<void> {
    if (!order) return;
    await putOrderSnapshot(order.id, order);
}

async function markOrderPaymentSynced(orderId: string): Promise<void> {
    const identity = await resolveOrderIdentity(orderId);
    if (!identity?.serverOrderId) return;
    await markOrderIdentitySynced(identity.localOrderId, identity.serverOrderId);
}

async function hasActivePaymentAction(localOrderId: string): Promise<boolean> {
    const actions = await listActions();
    return actions.some(
        (action) =>
            action.type === "pay" &&
            action.orderId === localOrderId &&
            isActiveStatus(action)
    );
}

async function rewriteQueuedOrderActions(localId: string, serverId: string): Promise<void> {
    const all = await listActions();
    for (const a of all) {
        if (a.orderId !== localId) continue;
        if (a.type === "create-order") continue; // do not rewrite the anchor action itself
        await putAction({ ...a, orderId: serverId });
    }
}

function getCreateActionPayload(action: PendingAction): {
    localId: string;
    order: OrderCreateDto;
} | null {
    if (action.type !== "create-order") return null;
    const payload = action.payload as { localId?: unknown; order?: unknown };
    if (!payload.order || typeof payload.order !== "object") return null;
    return {
        localId: typeof payload.localId === "string" ? payload.localId : action.orderId,
        order: payload.order as OrderCreateDto,
    };
}

function normalizedReference(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

async function findServerOrderForAction(
    action: PendingAction,
    orders: OrderDto[]
): Promise<OrderDto | undefined> {
    const direct = orders.find((order) => order.id === action.orderId);
    if (direct) return direct;

    const createPayload = getCreateActionPayload(action);
    const identity = await resolveOrderIdentity(action.orderId).catch(() => undefined);
    const clientOrderUuid = normalizedReference(
        createPayload?.order.clientOrderUUID ?? identity?.clientOrderUUID
    );
    const publicOrderNumber = normalizedReference(
        createPayload?.order.publicOrderNumber ??
        identity?.publicOrderNumber ??
        action.payload.publicOrderNumber
    );
    const orderNumber = normalizedReference(action.payload.orderNumber);

    return orders.find((order) => {
        if (
            clientOrderUuid &&
            normalizedReference(order.clientOrderUUID) === clientOrderUuid
        ) {
            return true;
        }
        if (
            publicOrderNumber &&
            normalizedReference(order.publicOrderNumber) === publicOrderNumber
        ) {
            return true;
        }
        return orderNumber && normalizedReference(order.orderNumber) === orderNumber;
    });
}

async function reconcileCreatedOrder(
    action: PendingAction,
    serverOrder: OrderDto
): Promise<void> {
    const payload = getCreateActionPayload(action);
    const localId = payload?.localId ?? action.orderId;
    const paymentPending = await hasActivePaymentAction(localId);

    await putOrderMapping(localId, serverOrder.id);
    await rewriteQueuedOrderActions(localId, serverOrder.id);
    await replaceOrderSnapshot(localId, serverOrder.id, serverOrder, action.branchId);
    if (!paymentPending) {
        await markOrderIdentitySynced(localId, serverOrder.id);
    }
}

async function confirmActionAlreadyApplied(action: PendingAction): Promise<{
    applied: boolean;
    verified: boolean;
}> {
    const lookup = await loadServerOrdersForReconciliation();
    if (!lookup.verified) return { applied: false, verified: false };

    const serverOrder = await findServerOrderForAction(action, lookup.orders);
    if (!serverOrder) return { applied: false, verified: true };

    if (action.type === "create-order") {
        await reconcileCreatedOrder(action, serverOrder);
        return { applied: true, verified: true };
    }

    if (!matchesExpected(serverOrder, action.expectedOrderState)) {
        return { applied: false, verified: true };
    }

    await persistConfirmedServerOrder(serverOrder);
    if (action.type === "pay") {
        await markOrderPaymentSynced(action.orderId);
    }
    return { applied: true, verified: true };
}

async function failDependentOrderActions(localId: string, reason: string): Promise<void> {
    const all = await listActions();
    for (const a of all) {
        if (a.orderId !== localId) continue;
        if (a.type === "create-order") continue;
        if (a.status === "pending" || a.status === "syncing") {
            await putAction({ ...a, status: "failed", lastError: reason });
        }
    }
}

interface ApplyFailure {
    status: number;
    body?: Record<string, unknown>;
    message: string;
}

function classifyFailure(failure: ApplyFailure): ConflictType {
    const { status, body } = failure;
    const bodyText = JSON.stringify(body ?? {}).toLowerCase();
    if (status === 404) return "not-found";
    if (status === 409) {
        if (bodyText.includes("paid")) return "already-paid";
        if (bodyText.includes("cancel")) return "already-cancelled";
        if (bodyText.includes("version")) return "version-mismatch";
    }
    return "unknown";
}

// Populated by applyAction's catch block when a 4xx fires. Drain reads this
// before transitioning the action to "failed" so the row in IDB carries the
// classified conflictType + serverState the Conflict Drawer needs.
let lastFailure: ApplyFailure | null = null;

function takeLastFailure(): ApplyFailure | null {
    const f = lastFailure;
    lastFailure = null;
    return f;
}

async function applyAction(
    action: PendingAction,
    idempotencyKey: string,
): Promise<"success" | "retry" | "fail"> {
    // Resolve synthetic order ids up front. For shift actions the orderId
    // slot carries the shift id, so we only do this for order-scoped types.
    let resolvedOrderId = action.orderId;
    if (
        action.type !== "open-shift" &&
        action.type !== "close-shift" &&
        action.type !== "create-order"
    ) {
        const resolved = await resolveOrderId(action.orderId);
        if (resolved === null) return "retry"; // waiting for create-order to sync
        resolvedOrderId = resolved;
    }

    try {
        switch (action.type) {
            case "pay": {
                const p = action.payload;
                if (typeof p.amount === "number") {
                    const result = await addOrderPayment({
                        orderId: resolvedOrderId,
                        amount: p.amount as number,
                        method: p.paymentMethod as string,
                        paymentMethodId: p.paymentMethodId as string | undefined,
                        referenceNumber: p.referenceNumber as string | undefined,
                        serviceChargeRate: p.serviceChargeRate as number | undefined,
                        taxRate: p.taxRate as number | undefined,
                        customerPhone: p.customerPhone as string | undefined,
                        amountTendered: p.amountTendered as number | undefined,
                        applyVoucher: p.applyVoucher as boolean | undefined,
                        discount: p.discount as import("@/types/order").OrderDiscountChange | undefined,
                        clientActionId: action.clientActionId ?? action.id,
                        paidAt: p.paidAt as string | undefined,
                        branchIdOverride: action.branchId,
                    });
                    // FIX(issue-4): On success, stamp the paid state onto the
                    // order snapshot. Once this action is deleted from the
                    // queue, the pending-action overlay no longer re-applies
                    // "paid"; without this the snapshot reverts to the unpaid
                    // server DTO that create-order sync swapped in, and the
                    // order flips back to Unpaid until the next manual refresh.
                    // The backend is the source of truth, so we mirror its
                    // returned snapshot verbatim — idempotent across re-syncs.
                    if (result) {
                        await persistPaidSnapshot(resolvedOrderId, result);
                        await markOrderPaymentSynced(resolvedOrderId);
                    }
                    return result ? "success" : "retry";
                }

                await payOrderStrict(
                    resolvedOrderId,
                    p.paymentMethod as string,
                    p.serviceChargeRate as number | undefined,
                    p.taxRate as number | undefined,
                    p.customerPhone as string | undefined,
                    p.amountTendered as number | undefined,
                    p.applyVoucher as boolean | undefined,
                    idempotencyKey,
                    action.branchId,
                );
                await markOrderPaymentSynced(resolvedOrderId);
                return "success";
            }
            case "mark-ready": {
                await markOrderAsReadyStrict(resolvedOrderId, idempotencyKey, action.branchId);
                return "success";
            }
            case "mark-served": {
                await markOrderAsServedStrict(resolvedOrderId, idempotencyKey, action.branchId);
                return "success";
            }
            case "mark-pickup": {
                await markTakeawayPickedUpStrict(resolvedOrderId, idempotencyKey, action.branchId);
                return "success";
            }
            case "create-order": {
                const p = action.payload as {
                    localId: string;
                    order: OrderCreateDto;
                };
                // publicOrderNumber is preserved verbatim — the OFF-… number
                // shown on the offline receipt MUST stay the same after sync
                // so a cashier looking up the order finds it under the number
                // they handed to the customer.
                const dto = await createOrderAndReturn(p.order, action.branchId);
                if (!dto) return "retry";
                await reconcileCreatedOrder(action, dto);
                return "success";
            }
            case "add-items": {
                const p = action.payload as { items: OrderItemCreateDto[] };
                const result = await addItemsToOrder(resolvedOrderId, p.items, idempotencyKey, action.branchId);
                return result ? "success" : "retry";
            }
            case "cancel-order": {
                const p = action.payload as unknown as CancelOrderPayload;
                try {
                    await cancelOrder(resolvedOrderId, p, idempotencyKey, action.branchId);
                    return "success";
                } catch (err: unknown) {
                    const anyErr = err as { response?: { status?: number; data?: Record<string, unknown> }; message?: string };
                    const status = anyErr?.response?.status;
                    if (status === 404 || status === 409) return "success"; // already gone / already cancelled
                    if (status) {
                        lastFailure = {
                            status,
                            body: anyErr.response?.data,
                            message: anyErr.message ?? "Server rejected the request",
                        };
                        return "fail";
                    }
                    return "retry";
                }
            }
            case "open-shift": {
                const p = action.payload;
                const localId = p.localId as string | undefined;
                const cashierId = p.cashierId as string | undefined;

                // State check: if server already has an active shift for this
                // cashier (open-shift request may have reached server but the
                // response was lost), reconcile instead of opening again.
                if (cashierId) {
                    const existing = await getActiveCashierShift(cashierId);
                    if (existing && !existing.isClosed) {
                        if (localId) {
                            await putShiftMapping(localId, existing.id);
                            await rewriteQueuedCloseShifts(localId, existing.id);
                            shiftReconciler?.({ kind: "opened", localId, shift: existing });
                        }
                        return "success";
                    }
                }

                const shift = await openMyCashierShift({
                    openingBalance: (p.openingBalance as number) ?? 0,
                    notes: (p.notes as string | null) ?? null,
                    clientActionId: action.clientActionId ?? action.id,
                    branchIdOverride: action.branchId,
                });
                if (!shift) return "retry";
                if (localId) {
                    await putShiftMapping(localId, shift.id);
                    await rewriteQueuedCloseShifts(localId, shift.id);
                    shiftReconciler?.({ kind: "opened", localId, shift });
                }
                return "success";
            }
            case "close-shift": {
                const p = action.payload as {
                    shiftId: string;
                    closingBalance: number;
                    notes?: string | null;
                    force?: boolean;
                    forceReason?: string | null;
                };
                // If shift id still looks local, the open-shift action hasn't synced
                // yet. Check the mapping in case it completed in this same sweep.
                let targetId = p.shiftId;
                if (targetId.startsWith("offline-")) {
                    const mapping = await getShiftMapping(targetId);
                    if (!mapping) return "retry"; // wait for open-shift to sync
                    targetId = mapping.serverId;
                }
                const payload: CloseCashierShiftPayload = {
                    closingBalance: p.closingBalance,
                    notes: p.notes ?? null,
                    clientActionId: action.clientActionId ?? action.id,
                    force: p.force ?? false,
                    forceReason: p.force ? (p.forceReason ?? null) : null,
                };
                const shift = await closeCashierShift(targetId, payload, action.branchId);
                if (!shift) return "retry";
                shiftReconciler?.({ kind: "closed", shift });
                return "success";
            }
            default:
                return "fail";
        }
    } catch (err: unknown) {
        // Network errors, including the BFF's upstream-unreachable response,
        // stay retryable. Confirmed server rejections hard-fail below.
        if (isNetworkRequestError(err)) return "retry";
        const anyErr = err as { response?: { status?: number; data?: Record<string, unknown> }; message?: string };
        const status = anyErr?.response?.status;
        if (status) {
            lastFailure = {
                status,
                body: anyErr.response?.data,
                message: anyErr.message ?? "Server rejected the request",
            };
            return "fail";
        }
        return "retry";
    }
}

function nextBackoffMs(attempts: number): number {
    const idx = Math.min(attempts, BACKOFF_MS.length - 1);
    const base = BACKOFF_MS[idx];
    const jitter = Math.floor(Math.random() * 1000);
    return base + jitter;
}

async function drain() {
    if (draining) return;
    if (getConnectivityState() !== "online") return;
    draining = true;
    try {
        const actions = cachedActions.filter(
            (a) => a.status === "pending" ||
                ((a.status === "syncing" || a.status === "retrying") && shouldRetryNow(a))
        );
        if (!actions.length) return;

        // Preload server state once per drain sweep
        const serverLookup = await refreshServerOrders();

        for (const action of actions) {
            const dependencyState = getDependencyState(action, cachedActions);
            if (dependencyState === "blocked") continue;
            if (dependencyState === "failed") {
                await putAction({
                    ...action,
                    status: "failed",
                    lastError: "Dependency failed",
                });
                await reload();
                continue;
            }

            // Short-circuit if server already reflects expected state (order actions only)
            if (action.type !== "open-shift" && action.type !== "close-shift") {
                const serverOrder = await findServerOrderForAction(action, serverLookup.orders);
                const alreadyApplied = action.type === "create-order"
                    ? !!serverOrder
                    : matchesExpected(serverOrder, action.expectedOrderState);
                if (alreadyApplied && serverOrder) {
                    if (action.type === "create-order") {
                        await reconcileCreatedOrder(action, serverOrder);
                    } else {
                        await persistConfirmedServerOrder(serverOrder);
                        if (action.type === "pay") {
                            await markOrderPaymentSynced(action.orderId);
                        }
                    }
                    await deleteAction(action.id);
                    await reload();
                    continue;
                }
            }

            const running: PendingAction = {
                ...action,
                status: "syncing",
                attempts: action.attempts + 1,
                lastAttemptAt: Date.now(),
                processingStartedAt: Date.now(),
            };
            await putAction(running);

            const result = await applyAction(running, running.transactionId ?? running.id);
            if (result === "success") {
                await deleteAction(action.id);
            } else if (result === "fail") {
                const failure = takeLastFailure();
                const conflictType = failure ? classifyFailure(failure) : "unknown";

                const confirmation =
                    running.type === "open-shift" || running.type === "close-shift"
                        ? { applied: false, verified: true }
                        : await confirmActionAlreadyApplied(running);

                if (confirmation.applied) {
                    await deleteAction(running.id);
                    await reload();
                    continue;
                }

                if (!confirmation.verified) {
                    await putAction({
                        ...running,
                        status: "retrying",
                        lastError: failure?.message ?? "Server state could not be verified",
                    });
                    setTimeout(() => scheduleDrain(50), nextBackoffMs(running.attempts));
                    await reload();
                    continue;
                }

                const failedAction: PendingAction = {
                    ...running,
                    status: "failed",
                    lastError: failure?.message ?? "Server rejected the request",
                    failureReason: failure?.message,
                    failureCode: failure?.status,
                    serverState: failure?.body,
                    conflictType,
                };
                await putAction(failedAction);
                emitFailure({
                    action: failedAction,
                    reason: failedAction.lastError ?? "Server rejected the request",
                    code: failure?.status,
                });
                if (running.type === "open-shift") {
                    const localId = (running.payload as { localId?: string }).localId;
                    if (localId) {
                        await failDependentCloseShifts(
                            localId,
                            "Paired open-shift was rejected"
                        );
                    }
                } else if (running.type === "create-order") {
                    await failDependentOrderActions(
                        running.orderId,
                        "Paired create-order was rejected"
                    );
                }
            } else {
                // retry
                if (running.attempts >= BACKOFF_MS.length) {
                    const confirmation =
                        running.type === "open-shift" || running.type === "close-shift"
                            ? { applied: false, verified: false }
                            : await confirmActionAlreadyApplied(running);
                    if (confirmation.applied) {
                        await deleteAction(running.id);
                        await reload();
                        continue;
                    }

                    await putAction({
                        ...running,
                        status: "retrying",
                        attempts: BACKOFF_MS.length,
                        lastError: "Network unavailable; synchronization will keep retrying",
                    });
                    setTimeout(() => scheduleDrain(50), nextBackoffMs(BACKOFF_MS.length));
                } else {
                    await putAction({ ...running, status: "retrying", lastError: "Network error" });
                    setTimeout(() => scheduleDrain(50), nextBackoffMs(running.attempts));
                }
            }
            await reload();
        }
    } finally {
        draining = false;
    }
}

function shouldRetryNow(a: PendingAction): boolean {
    if (!a.lastAttemptAt) return true;
    const elapsed = Date.now() - a.lastAttemptAt;
    return elapsed >= nextBackoffMs(a.attempts);
}

function isActiveStatus(action: PendingAction): boolean {
    return action.status === "pending" ||
        action.status === "processing" ||
        action.status === "syncing" ||
        action.status === "retrying";
}

function getDependencyState(action: PendingAction, actions: PendingAction[]): "ready" | "blocked" | "failed" {
    const dependencyIds = action.dependsOn ?? [];
    if (!dependencyIds.length) return "ready";

    for (const dependencyId of dependencyIds) {
        const dependency = actions.find((candidate) => candidate.id === dependencyId);
        if (!dependency) continue;
        if (dependency.status === "failed" || dependency.status === "cancelled" || dependency.status === "escalated") {
            return "failed";
        }
        if (isActiveStatus(dependency)) return "blocked";
    }

    return "ready";
}

function resetActionForRetry(action: PendingAction): PendingAction {
    return {
        ...action,
        status: "pending",
        attempts: 0,
        lastAttemptAt: undefined,
        lastError: undefined,
        failureReason: undefined,
        failureCode: undefined,
        serverState: undefined,
        conflictType: undefined,
    };
}

// Manual trigger — exposed for Sync Drawer "Retry" button
export async function retryAction(id: string): Promise<void> {
    const actions = await listActions();
    const current = actions.find((action) => action.id === id);
    if (!current) return;

    await putAction(resetActionForRetry(current));
    if (current.type === "create-order") {
        const failedDependents = actions.filter(
            (action) =>
                action.orderId === current.orderId &&
                action.type !== "create-order" &&
                (action.status === "failed" ||
                    action.status === "cancelled" ||
                    action.status === "escalated")
        );
        for (const dependent of failedDependents) {
            await putAction(resetActionForRetry(dependent));
        }
    }

    await reload();
    scheduleDrain(50);
}

// Conflict drawer — cashier chose to throw the action away. Paired with a
// server-state refresh in the drawer component so the snapshot catches up.
export async function discardAction(id: string): Promise<void> {
    await deleteAction(id);
    await reload();
}

export async function escalateAction(id: string): Promise<void> {
    const current = cachedActions.find((a) => a.id === id);
    if (!current) return;
    await putAction({ ...current, status: "escalated" });
    await reload();
}

export async function drainNow(): Promise<void> {
    lastServerOrders = null; // force fresh server fetch
    return drain();
}
