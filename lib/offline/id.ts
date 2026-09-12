import { getSession, putSession, type SessionBlob } from "./db";
import { generateUUID } from "@/lib/uuid";

/**
 * Composite local action id:
 *   [terminalShort]-[timestampMs]-[rand4]
 *
 * Terminal id is generated once per device and persisted in IndexedDB's
 * `session` store. It stays stable across refreshes and tabs.
 *
 * NOTE: Backend currently has no `X-Idempotency-Key` middleware. When
 * it lands, this same value becomes the idempotency key; no client
 * change needed.
 */

let terminalIdPromise: Promise<string> | null = null;

function rand4(): string {
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
        const buf = new Uint8Array(2);
        crypto.getRandomValues(buf);
        return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    return Math.floor(Math.random() * 0xffff)
        .toString(16)
        .padStart(4, "0");
}

const newUuid = generateUUID;

const TERMINAL_SUFFIX_MODULO = 100;
const OFFLINE_REFERENCE_COUNTER_MODULO = 100;
const TERMINAL_HASH_MULTIPLIER = 31;

function offlineReferenceTimestamp(date: Date): string {
    return [
        String(date.getFullYear()).slice(-2),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0"),
        String(date.getSeconds()).padStart(2, "0"),
    ].join("");
}

function numericTerminalSuffix(terminalId: string): string {
    let hash = 0;
    for (let i = 0; i < terminalId.length; i++) {
        hash = (hash * TERMINAL_HASH_MULTIPLIER + terminalId.charCodeAt(i)) % TERMINAL_SUFFIX_MODULO;
    }
    return String(hash).padStart(2, "0");
}

export function ensureTerminalId(): Promise<string> {
    if (terminalIdPromise) return terminalIdPromise;
    terminalIdPromise = (async () => {
        const existing = await getSession().catch(() => undefined);
        if (existing?.terminalId) return existing.terminalId;
        const terminalId = newUuid();
        await putSession({ terminalId, createdAt: Date.now() }).catch(() => {});
        return terminalId;
    })();
    return terminalIdPromise;
}

export async function generateActionId(): Promise<string> {
    const terminalId = await ensureTerminalId().catch(() => "notx");
    return `${terminalId.slice(0, 8)}-${Date.now()}-${rand4()}`;
}

export function generateClientOrderUUID(): string {
    return newUuid();
}

export async function generatePublicOrderNumber(): Promise<string> {
    const terminalId = await ensureTerminalId().catch(() => "notx0000");
    const current = await getSession().catch(() => undefined);
    const nextCounter = Number(current?.offlineOrderCounter ?? 0) + 1;
    const now = new Date();
    await putSession({
        ...(current ?? { terminalId, createdAt: Date.now() }),
        terminalId,
        offlineOrderCounter: nextCounter,
        lastOfflineOrderNumberAt: now.getTime(),
    }).catch(() => {});

    const counterSuffix = String(nextCounter % OFFLINE_REFERENCE_COUNTER_MODULO).padStart(2, "0");

    return `OFF-${offlineReferenceTimestamp(now)}${numericTerminalSuffix(terminalId)}${counterSuffix}`;
}

// Provisional display number used only until the server assigns DI-N / TA-N / PT-N.

interface SequenceState {
    counters: Record<string, number>;
}

/** Trailing numeric part of a "#16" / "OFF#16" reference; null when not parseable. */
function parseSequenceValue(value: string | null | undefined): number | null {
    if (typeof value !== "string") return null;
    const match = value.match(/(\d+)\s*$/);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function readSequenceState(blob: SessionBlob | undefined): SequenceState {
    const raw = blob?.orderSequence as Partial<SequenceState> | undefined;
    return {
        counters: raw?.counters ?? {},
    };
}

/**
 * Record server-issued "#N" values so offline numbering can continue from the last synced one.
 * Offline ("OFF#...") references are ignored: they are client-minted, not authoritative.
 */
export async function recordServerSequences(
    orders: Array<{ orderSequenceNumber?: string | null; orderType?: string | null }>
): Promise<void> {
    const current = await getSession().catch(() => undefined);
    const state = readSequenceState(current);
    let changed = false;
    for (const order of orders) {
        const value = order.orderSequenceNumber;
        if (typeof value !== "string" || value.includes("-OFF-")) continue;
        const n = parseSequenceValue(value);
        const prefix = getSequencePrefix(order.orderType);
        if (n != null && n > (state.counters[prefix] ?? 0)) {
            state.counters[prefix] = n;
            changed = true;
        }
    }
    if (!changed) return;

    const terminalId = current?.terminalId ?? (await ensureTerminalId().catch(() => "notx0000"));
    await putSession({
        ...(current ?? { terminalId, createdAt: Date.now() }),
        terminalId,
        orderSequence: state,
    }).catch(() => {});
}

/**
 * Mint the next offline running number ("OFF#N"), continuing from the highest of the
 * last synced server "#N" and the last offline number minted locally.
 */
export async function generateOfflineSequenceNumber(orderType?: number | string | null): Promise<string> {
    const current = await getSession().catch(() => undefined);
    const state = readSequenceState(current);
    const terminalId = current?.terminalId ?? (await ensureTerminalId().catch(() => "notx0000"));
    const prefix = getSequencePrefix(orderType);
    const next = (state.counters[prefix] ?? 0) + 1;
    state.counters[prefix] = next;
    await putSession({
        ...(current ?? { terminalId, createdAt: Date.now() }),
        terminalId,
        orderSequence: state,
    }).catch(() => {});

    return `${prefix}-OFF-${numericTerminalSuffix(terminalId)}-${next}`;
}

function getSequencePrefix(orderType?: number | string | null): string {
    if (orderType === 1 || orderType === "Takeaway") return "TA";
    if (orderType === 2 || orderType === "Delivery") return "PT";
    return "DI";
}

/** Sentinel prefix for orders created offline. Checked by the queue and the
 *  order-overlay to decide when a server id swap is required. */
export const OFFLINE_ORDER_PREFIX = "offline-order-";

export function isOfflineOrderId(id: string | null | undefined): boolean {
    return typeof id === "string" && id.startsWith(OFFLINE_ORDER_PREFIX);
}

export function generateLocalOrderId(): string {
    return `${OFFLINE_ORDER_PREFIX}${newUuid()}`;
}
