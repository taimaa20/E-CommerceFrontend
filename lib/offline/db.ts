/**
 * Offline IndexedDB store — native API, no dependencies.
 *
 * Object stores:
 *  - pending_actions : queued mutations awaiting server sync
 *  - orders_snapshot : last-known server state (survives refresh)
 *  - session         : terminal_id + metadata
 *
 * All reads/writes are Promise-based and transactional.
 * NEVER import at top-level from server components — browser only.
 */

import { getSelectedBranchCacheKey } from "@/lib/branch-selection";

const DB_NAME = "pos-offline";
const DB_VERSION = 7;

export type ActionType =
    | "pay"
    | "mark-ready"
    | "mark-served"
    | "mark-pickup"
    | "open-shift"
    | "close-shift"
    | "create-order"
    | "add-items"
    | "cancel-order";

export type ActionStatus =
    | "pending"
    | "processing"
    | "syncing"
    | "completed"
    | "synced"
    | "retrying"
    | "failed"
    | "cancelled"
    | "escalated";

export type ConflictType =
    | "already-paid"
    | "already-cancelled"
    | "not-found"
    | "version-mismatch"
    | "unknown";

export interface PendingAction {
    id: string;
    transactionId?: string;
    clientActionId?: string;
    type: ActionType;
    orderId: string;
    payload: Record<string, unknown>;
    /** Branch active when this action was enqueued — replayed at sync time so a
     *  branch switch while the action is still pending doesn't re-attribute it. */
    branchId?: string;
    dependsOn?: string[];
    lockKey?: string;
    processingStartedAt?: number;
    createdAt: number;
    attempts: number;
    lastAttemptAt?: number;
    lastError?: string;
    status: ActionStatus;
    /** Expected server state after apply — used to short-circuit retry if server already matches. */
    expectedOrderState?: {
        isPaid?: boolean;
        paidAmount?: number;
        paymentStatus?: string;
        status?: string;
    };
    // Populated when the queue receives a 4xx response and classifies the failure
    // (see queue.ts). Drives the conflict resolution drawer.
    failureReason?: string;
    failureCode?: number;
    serverState?: Record<string, unknown>;
    conflictType?: ConflictType;
}

export interface OrderSnapshot {
    id: string;
    data: unknown; // OrderDto — opaque here
    cachedAt: number;
    // Branch the snapshot belongs to (getSelectedBranchCacheKey() at write time).
    // Missing on rows written before branch stamping — treated as visible so a
    // pre-upgrade offline-created order is never hidden from the cashier.
    branchKey?: string;
}

export interface OrderIdentity {
    localOrderId: string;
    clientOrderUUID: string;
    publicOrderNumber: string;
    serverOrderId?: string;
    transactionId: string;
    createdAt: number;
    syncedAt?: number;
}

export interface ReceiptTransaction {
    id: string;
    orderId: string;
    publicOrderNumber: string;
    transactionId: string;
    printedAt: number;
    status: "printed" | "skipped";
}

export interface LocalLock {
    key: string;
    ownerId: string;
    expiresAt: number;
    createdAt: number;
}

export interface SessionBlob {
    key: string;
    terminalId: string;
    createdAt: number;
    [k: string]: unknown;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function ensureIndex(
    store: IDBObjectStore,
    name: string,
    keyPath: string | string[],
    options?: IDBIndexParameters
) {
    if (!store.indexNames.contains(name)) {
        store.createIndex(name, keyPath, options);
    }
}

function openDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
        return Promise.reject(new Error("IndexedDB not available"));
    }
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            const pending = db.objectStoreNames.contains("pending_actions")
                ? req.transaction!.objectStore("pending_actions")
                : db.createObjectStore("pending_actions", { keyPath: "id" });
            ensureIndex(pending, "status", "status", { unique: false });
            ensureIndex(pending, "orderId", "orderId", { unique: false });
            ensureIndex(pending, "createdAt", "createdAt", { unique: false });
            ensureIndex(pending, "transactionId", "transactionId", { unique: true });
            ensureIndex(pending, "lockKey", "lockKey", { unique: false });
            if (!db.objectStoreNames.contains("orders_snapshot")) {
                db.createObjectStore("orders_snapshot", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("session")) {
                db.createObjectStore("session", { keyPath: "key" });
            }
            if (!db.objectStoreNames.contains("shift_mappings")) {
                db.createObjectStore("shift_mappings", { keyPath: "localId" });
            }
            if (!db.objectStoreNames.contains("order_mappings")) {
                db.createObjectStore("order_mappings", { keyPath: "localId" });
            }
            if (!db.objectStoreNames.contains("order_identity")) {
                const s = db.createObjectStore("order_identity", { keyPath: "localOrderId" });
                s.createIndex("clientOrderUUID", "clientOrderUUID", { unique: true });
                s.createIndex("publicOrderNumber", "publicOrderNumber", { unique: true });
                s.createIndex("serverOrderId", "serverOrderId", { unique: false });
            }
            if (!db.objectStoreNames.contains("receipt_transactions")) {
                const s = db.createObjectStore("receipt_transactions", { keyPath: "id" });
                s.createIndex("orderId", "orderId", { unique: false });
                s.createIndex("publicOrderNumber", "publicOrderNumber", { unique: false });
            }
            if (!db.objectStoreNames.contains("local_locks")) {
                const s = db.createObjectStore("local_locks", { keyPath: "key" });
                s.createIndex("expiresAt", "expiresAt", { unique: false });
            }
            if (!db.objectStoreNames.contains("reference_cache")) {
                // Generic key/value cache for read-mostly reference data
                // (products, tables, offers, takeaway orders). Key = domain
                // string, value = { key, data, cachedAt }.
                db.createObjectStore("reference_cache", { keyPath: "key" });
            }
            if (!db.objectStoreNames.contains("conflict_log")) {
                // Conflict audit — rows appear when the cashier escalates a
                // failed action via the conflict drawer. Managers review these
                // out-of-band; the store is append-only from the client's view.
                const s = db.createObjectStore("conflict_log", {
                    keyPath: "id",
                    autoIncrement: true,
                });
                s.createIndex("orderId", "orderId", { unique: false });
                s.createIndex("conflictType", "conflictType", { unique: false });
                s.createIndex("createdAt", "createdAt", { unique: false });
            }
            if (!db.objectStoreNames.contains("kitchen_snapshot")) {
                // Kitchen/garçon live feed, persisted so a refresh or disconnect
                // keeps the last-known KDS queue visible. Stored as an opaque
                // payload (KdsOrder) — the kitchen page owns its shape.
                const s = db.createObjectStore("kitchen_snapshot", { keyPath: "id" });
                s.createIndex("status", "status", { unique: false });
                s.createIndex("updatedAt", "updatedAt", { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    });
    return dbPromise;
}

function tx<T>(
    storeName:
        | "pending_actions"
        | "orders_snapshot"
        | "session"
        | "shift_mappings"
        | "order_mappings"
        | "order_identity"
        | "receipt_transactions"
        | "local_locks"
        | "reference_cache"
        | "conflict_log"
        | "kitchen_snapshot",
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
    return openDB().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const transaction = db.transaction(storeName, mode);
                const store = transaction.objectStore(storeName);
                const result = fn(store);
                if (result instanceof IDBRequest) {
                    result.onsuccess = () => resolve(result.result);
                    result.onerror = () => reject(result.error);
                } else {
                    result.then(resolve, reject);
                }
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error ?? new Error("tx aborted"));
            })
    );
}

// ─── Pending Actions ─────────────────────────────────────

export async function putAction(action: PendingAction): Promise<void> {
    await tx("pending_actions", "readwrite", (s) => s.put(action));
}

export async function getAction(id: string): Promise<PendingAction | undefined> {
    return tx("pending_actions", "readonly", (s) => s.get(id));
}

export async function deleteAction(id: string): Promise<void> {
    await tx("pending_actions", "readwrite", (s) => s.delete(id));
}

export async function listActions(): Promise<PendingAction[]> {
    return tx("pending_actions", "readonly", (s) => s.getAll() as IDBRequest<PendingAction[]>);
}

export async function listPendingByOrder(orderId: string): Promise<PendingAction[]> {
    return openDB().then(
        (db) =>
            new Promise((resolve, reject) => {
                const transaction = db.transaction("pending_actions", "readonly");
                const idx = transaction.objectStore("pending_actions").index("orderId");
                const req = idx.getAll(orderId);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            })
    );
}

// ─── Order Snapshots ─────────────────────────────────────

type SnapshotListener = () => void;
const snapshotListeners = new Set<SnapshotListener>();

/**
 * Cross-tab bridge. Any write that mutates `orders_snapshot`,
 * `kitchen_snapshot`, `order_mappings`, or other reactive stores posts a tick
 * on this channel; peer tabs refire their local listeners so the cashier in
 * one tab sees the garçon's table update in another tab without polling.
 *
 * Same-origin only — the POS app is a single origin so this covers every
 * page/screen running on the same device.
 */
const SNAPSHOT_CHANNEL_NAME = "pos-snapshots";
let snapshotChannel: BroadcastChannel | null = null;
let receivingFromChannel = false;

function getSnapshotChannel(): BroadcastChannel | null {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
    if (snapshotChannel) return snapshotChannel;
    snapshotChannel = new BroadcastChannel(SNAPSHOT_CHANNEL_NAME);
    snapshotChannel.onmessage = () => {
        // Peer tab wrote: fan out to local subscribers, but guard against
        // re-broadcasting to avoid an infinite channel echo.
        receivingFromChannel = true;
        try {
            for (const l of snapshotListeners) {
                try {
                    l();
                } catch {
                    /* listener errors must never break the DB layer */
                }
            }
        } finally {
            receivingFromChannel = false;
        }
    };
    return snapshotChannel;
}

/**
 * Notify every subscriber that the snapshot store changed. Fire-and-forget —
 * listeners must be cheap (usually just a Zustand setter). This is the hook
 * reactive stores use to re-render when offline helpers mutate IDB out-of-band.
 */
function notifySnapshotListeners() {
    for (const l of snapshotListeners) {
        try {
            l();
        } catch {
            /* listener errors must never break the DB layer */
        }
    }
    if (receivingFromChannel) return;
    try {
        getSnapshotChannel()?.postMessage({ t: Date.now() });
    } catch {
        /* BroadcastChannel unavailable (SSR / older browser) — local notify already fired */
    }
}

export function subscribeSnapshots(listener: SnapshotListener): () => void {
    // Lazy-init the cross-tab channel on first subscribe — keeps SSR + test
    // environments from touching BroadcastChannel at module load.
    getSnapshotChannel();
    snapshotListeners.add(listener);
    return () => {
        snapshotListeners.delete(listener);
    };
}

export async function putOrderSnapshot(id: string, data: unknown): Promise<void> {
    await tx("orders_snapshot", "readwrite", (s) =>
        s.put({ id, data, cachedAt: Date.now(), branchKey: getSelectedBranchCacheKey() } as OrderSnapshot)
    );
    notifySnapshotListeners();
}

export async function putOrderSnapshots(records: Array<{ id: string; data: unknown }>): Promise<void> {
    if (!records.length) return;
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("orders_snapshot", "readwrite");
        const store = transaction.objectStore("orders_snapshot");
        const now = Date.now();
        const branchKey = getSelectedBranchCacheKey();
        for (const r of records) store.put({ id: r.id, data: r.data, cachedAt: now, branchKey });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    notifySnapshotListeners();
}

export async function replaceOrderSnapshot(
    localOrderId: string,
    serverOrderId: string,
    serverOrder: unknown,
    // Queue drains can sync an order enqueued at Branch A after the user switched
    // to Branch B — callers that know the action's origin branch pass it here so
    // the snapshot stays attributed to the branch the order belongs to.
    branchKey?: string
): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("orders_snapshot", "readwrite");
        const store = transaction.objectStore("orders_snapshot");
        store.put({
            id: serverOrderId,
            data: serverOrder,
            cachedAt: Date.now(),
            branchKey: branchKey ?? getSelectedBranchCacheKey(),
        } as OrderSnapshot);
        store.delete(localOrderId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("snapshot replacement aborted"));
    });
    notifySnapshotListeners();
}

export async function listOrderSnapshots(): Promise<OrderSnapshot[]> {
    return tx("orders_snapshot", "readonly", (s) => s.getAll() as IDBRequest<OrderSnapshot[]>);
}

/**
 * Snapshots visible on the active branch: rows stamped with the current branch
 * key plus legacy unstamped rows (pre-upgrade writes — safer to show than to
 * hide a not-yet-synced offline order).
 */
export async function listOrderSnapshotsForActiveBranch(): Promise<OrderSnapshot[]> {
    const branchKey = getSelectedBranchCacheKey();
    const all = await listOrderSnapshots();
    return all.filter((s) => !s.branchKey || s.branchKey === branchKey);
}

export async function getOrderSnapshot(id: string): Promise<OrderSnapshot | undefined> {
    return tx("orders_snapshot", "readonly", (s) => s.get(id) as IDBRequest<OrderSnapshot | undefined>);
}

// ─── Session ─────────────────────────────────────────────

export async function getSession(): Promise<SessionBlob | undefined> {
    return tx("session", "readonly", (s) => s.get("current"));
}

export async function putSession(blob: Omit<SessionBlob, "key">): Promise<void> {
    await tx("session", "readwrite", (s) => s.put({ key: "current", ...blob }));
}

// ─── Shift ID Mapping ────────────────────────────────────
// Maps a client-generated "offline-<localId>" shift id to the
// real server uuid once open-shift syncs. Used by queued
// close-shift actions to resolve the real target.

export interface ShiftMapping {
    localId: string;   // offline-<uuid>
    serverId: string;  // real server uuid
    createdAt: number;
}

export async function putShiftMapping(localId: string, serverId: string): Promise<void> {
    await tx("shift_mappings", "readwrite", (s) =>
        s.put({ localId, serverId, createdAt: Date.now() } as ShiftMapping)
    );
}

export async function getShiftMapping(localId: string): Promise<ShiftMapping | undefined> {
    return tx("shift_mappings", "readonly", (s) => s.get(localId));
}

// ─── Order ID Mapping ────────────────────────────────────
// Maps a client-generated "offline-order-<uuid>" to the real server
// uuid once create-order syncs. Identical pattern to shift mappings.

export interface OrderMapping {
    localId: string;
    serverId: string;
    createdAt: number;
}

export async function putOrderMapping(localId: string, serverId: string): Promise<void> {
    await tx("order_mappings", "readwrite", (s) =>
        s.put({ localId, serverId, createdAt: Date.now() } as OrderMapping)
    );
    // localId → serverId swap is a reactivity event: takeaway/dine-in lists
    // keyed by id need to re-merge so the replaced row doesn't vanish.
    notifySnapshotListeners();
}

export async function getOrderMapping(localId: string): Promise<OrderMapping | undefined> {
    return tx("order_mappings", "readonly", (s) => s.get(localId));
}

// ─── Stable Order Identity ──────────────────────────────

export async function putOrderIdentity(identity: OrderIdentity): Promise<void> {
    await tx("order_identity", "readwrite", (s) => s.put(identity));
    notifySnapshotListeners();
}

export async function getOrderIdentity(localOrderId: string): Promise<OrderIdentity | undefined> {
    return tx("order_identity", "readonly", (s) => s.get(localOrderId));
}

export async function resolveOrderIdentity(orderId: string): Promise<OrderIdentity | undefined> {
    const byLocal = await getOrderIdentity(orderId);
    if (byLocal) return byLocal;

    return openDB().then(
        (db) =>
            new Promise<OrderIdentity | undefined>((resolve, reject) => {
                const transaction = db.transaction("order_identity", "readonly");
                const idx = transaction.objectStore("order_identity").index("serverOrderId");
                const req = idx.get(orderId);
                req.onsuccess = () => resolve(req.result as OrderIdentity | undefined);
                req.onerror = () => reject(req.error);
            })
    );
}

export async function markOrderIdentitySynced(localOrderId: string, serverOrderId: string): Promise<void> {
    const current = await getOrderIdentity(localOrderId);
    if (!current) return;

    await putOrderIdentity({
        ...current,
        serverOrderId,
        syncedAt: Date.now(),
    });
}

// ─── Receipt Transactions ───────────────────────────────

export async function getReceiptTransaction(id: string): Promise<ReceiptTransaction | undefined> {
    return tx("receipt_transactions", "readonly", (s) => s.get(id));
}

export async function putReceiptTransaction(entry: ReceiptTransaction): Promise<void> {
    await tx("receipt_transactions", "readwrite", (s) => s.put(entry));
}

// ─── Local Locks ────────────────────────────────────────

export async function acquireLocalLock(key: string, ownerId: string, ttlMs = 30_000): Promise<boolean> {
    const now = Date.now();
    const current = await tx("local_locks", "readonly", (s) => s.get(key)) as LocalLock | undefined;
    if (current && current.expiresAt > now && current.ownerId !== ownerId) return false;

    await tx("local_locks", "readwrite", (s) =>
        s.put({ key, ownerId, createdAt: now, expiresAt: now + ttlMs } as LocalLock)
    );
    return true;
}

export async function releaseLocalLock(key: string, ownerId: string): Promise<void> {
    const current = await tx("local_locks", "readonly", (s) => s.get(key)) as LocalLock | undefined;
    if (current && current.ownerId !== ownerId) return;
    await tx("local_locks", "readwrite", (s) => s.delete(key));
}

export async function cleanupStaleLocks(): Promise<void> {
    const locks = await tx("local_locks", "readonly", (s) => s.getAll() as IDBRequest<LocalLock[]>);
    const now = Date.now();
    await Promise.all(
        locks
            .filter((lock) => lock.expiresAt <= now)
            .map((lock) => tx("local_locks", "readwrite", (s) => s.delete(lock.key)))
    );
}

export async function deleteOrderSnapshot(id: string): Promise<void> {
    await tx("orders_snapshot", "readwrite", (s) => s.delete(id));
    notifySnapshotListeners();
}

// ─── Reference Cache ─────────────────────────────────────
// Generic read-mostly cache for menu data (products, tables,
// offers, takeaway orders). Written when a server fetch
// succeeds, read when the network is down so offline-first
// order-creation pages still render.

export interface ReferenceCacheEntry<T = unknown> {
    key: string;
    data: T;
    cachedAt: number;
}

export async function putReferenceCache<T>(key: string, data: T): Promise<void> {
    await tx("reference_cache", "readwrite", (s) =>
        s.put({ key, data, cachedAt: Date.now() } as ReferenceCacheEntry<T>)
    );
}

export async function getReferenceCache<T>(key: string): Promise<T | undefined> {
    const entry = (await tx(
        "reference_cache",
        "readonly",
        (s) => s.get(key)
    )) as ReferenceCacheEntry<T> | undefined;
    return entry?.data;
}

export async function getReferenceCacheEntry<T>(key: string): Promise<ReferenceCacheEntry<T> | undefined> {
    return tx(
        "reference_cache",
        "readonly",
        (s) => s.get(key) as IDBRequest<ReferenceCacheEntry<T> | undefined>
    );
}

export async function deleteReferenceCache(key: string): Promise<void> {
    await tx("reference_cache", "readwrite", (s) => s.delete(key));
}

// ─── Conflict Log ────────────────────────────────────────

export interface ConflictLogEntry {
    id?: number;
    orderId: string;
    conflictType: ConflictType;
    actionType: ActionType;
    failureReason: string;
    serverState?: Record<string, unknown>;
    createdAt: number;
    resolvedBy?: "discarded" | "retried" | "escalated";
    resolvedAt?: number;
}

export async function putConflictLog(entry: Omit<ConflictLogEntry, "id">): Promise<number> {
    return tx("conflict_log", "readwrite", (s) => s.add(entry) as IDBRequest<number>);
}

export async function listConflictLog(): Promise<ConflictLogEntry[]> {
    return tx("conflict_log", "readonly", (s) => s.getAll() as IDBRequest<ConflictLogEntry[]>);
}

export async function deleteConflictLog(id: number): Promise<void> {
    await tx("conflict_log", "readwrite", (s) => s.delete(id));
}

export async function clearConflictLog(): Promise<void> {
    await tx("conflict_log", "readwrite", (s) => s.clear());
}

// ─── Kitchen Snapshot ────────────────────────────────────
// Read-only mirror of the kitchen/garçon feed. Written by the kitchen page
// on every SignalR push (or after a successful REST fetch); read by the same
// page when the network drops so the KDS never goes blank.

export interface KitchenSnapshot {
    id: string;
    data: unknown; // KdsOrder — opaque here
    status?: string;
    updatedAt: number;
}

export async function putKitchenSnapshots(
    records: Array<{ id: string; data: unknown; status?: string }>
): Promise<void> {
    if (!records.length) return;
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("kitchen_snapshot", "readwrite");
        const store = transaction.objectStore("kitchen_snapshot");
        const now = Date.now();
        for (const r of records) {
            store.put({ id: r.id, data: r.data, status: r.status, updatedAt: now });
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    notifySnapshotListeners();
}

export async function deleteKitchenSnapshot(id: string): Promise<void> {
    await tx("kitchen_snapshot", "readwrite", (s) => s.delete(id));
    notifySnapshotListeners();
}

export async function listKitchenSnapshots(): Promise<KitchenSnapshot[]> {
    return tx(
        "kitchen_snapshot",
        "readonly",
        (s) => s.getAll() as IDBRequest<KitchenSnapshot[]>
    );
}

/**
 * Replace the entire kitchen queue with `records` in a single transaction —
 * used by the kitchen page after a successful SignalR-free REST refresh so
 * stale ids drop out in the same sweep writes happen. Single transaction
 * keeps the snapshot atomic for peer tabs reading mid-flight.
 */
export async function replaceKitchenSnapshots(
    records: Array<{ id: string; data: unknown; status?: string }>
): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("kitchen_snapshot", "readwrite");
        const store = transaction.objectStore("kitchen_snapshot");
        store.clear();
        const now = Date.now();
        for (const r of records) {
            store.put({ id: r.id, data: r.data, status: r.status, updatedAt: now });
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    notifySnapshotListeners();
}
