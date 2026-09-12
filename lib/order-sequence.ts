/**
 * Single source of truth for displaying the human-friendly order sequence number.
 *
 * The value is stored fully formatted by the server ("#16") and by the offline generator
 * ("OFF#16"), so display is verbatim and never re-sliced or reformatted per screen. This keeps
 * the number identical across the kitchen, cashier, orders, receipts, and cancel/refund views,
 * which is the whole point: staff read the same "#16" everywhere it was created.
 */

export interface HasOrderSequence {
    /** Legacy field, present on some older payload shapes. */
    orderSequenceNumber?: string | null;
    /** Configurable per-tenant identifier ("TA-1", "TA-20260610-1", "BR01-TA-S001-1", ...). */
    displayOrderNumber?: string | null;
}

/**
 * Returns the user-facing running number, verbatim from the server.
 * Preference order (matches backend ResolveOrderNumber):
 *   1. displayOrderNumber (per-tenant configurable format — TA-1, TA-202606-1, …)
 *   2. orderSequenceNumber (legacy field name on a few older payloads)
 * Null when neither is set, so callers can fall back to e.g. the short-id.
 */
export function formatOrderSequence(order: HasOrderSequence | null | undefined): string | null {
    const candidates = [order?.displayOrderNumber, order?.orderSequenceNumber];
    for (const raw of candidates) {
        if (typeof raw !== "string") continue;
        const trimmed = raw.trim();
        if (trimmed.length > 0) return trimmed;
    }
    return null;
}

/** True when the order was created offline (OFF# prefix). */
export function isOfflineSequence(value: string | null | undefined): boolean {
    return typeof value === "string" && value.trim().toUpperCase().startsWith("OFF");
}
