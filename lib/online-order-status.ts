import type { OnlineOrderStatus } from "@/lib/api-online-shopping";

export const ONLINE_ORDER_POLL_INTERVAL_MS = 10_000;
const ONLINE_ORDER_CONTEXT_KEY = "online-shopping:last-order:v1";
const ONLINE_ORDER_HISTORY_KEY = "online-shopping:orders:v1";
const ONLINE_ORDER_HISTORY_LIMIT = 10;

export interface OnlineOrderAccess {
    orderId: string;
    orderNumber: string;
    token: string;
    /** Guest checkout only: the secret that owns the order. It is the only way to reopen it. */
    guestAccessToken?: string;
    /** ISO timestamp, kept only so the device list can be sorted and dated. */
    savedAt?: string;
}

export interface OnlineOrderProgressStep {
    key: string;
    label: string;
    state: "completed" | "current" | "upcoming";
}

export interface OnlineOrderProgress {
    title: string;
    message: string;
    isExceptional: boolean;
    steps: OnlineOrderProgressStep[];
}

const DELIVERY_STEPS = [
    "OrderPlaced",
    "Confirmed",
    "Preparing",
    "Ready",
    "OutForDelivery",
    "Delivered",
    "Completed",
] as const;

const PICKUP_STEPS = [
    "OrderPlaced",
    "Confirmed",
    "Preparing",
    "ReadyForPickup",
    "PickedUp",
    "Completed",
] as const;

const COPY = {
    en: {
        OrderPlaced: ["Order placed", "We received your order."],
        Confirmed: ["Confirmed", "Your order has been confirmed."],
        Preparing: ["Preparing", "Your order is being prepared."],
        Ready: ["Ready", "Your order is ready and will be sent for delivery."],
        ReadyForPickup: ["Ready for pickup", "Your order is ready for pickup."],
        OutForDelivery: ["Out for delivery", "Your order is on the way."],
        Delivered: ["Delivered", "Your order has been delivered."],
        PickedUp: ["Picked up", "Your order has been picked up."],
        Completed: ["Completed", "Order completed."],
        Cancelled: ["Order cancelled", "This order has been cancelled."],
        Refunded: ["Order refunded", "This order has been refunded."],
        PaymentFailed: ["Payment failed", "Payment was not completed for this order."],
    },
    ar: {
        OrderPlaced: ["تم استلام الطلب", "استلمنا طلبك."],
        Confirmed: ["تم التأكيد", "تم تأكيد طلبك."],
        Preparing: ["قيد التحضير", "يتم الآن تحضير طلبك."],
        Ready: ["جاهز", "طلبك جاهز وسيتم إرساله للتوصيل."],
        ReadyForPickup: ["جاهز للاستلام", "طلبك جاهز للاستلام."],
        OutForDelivery: ["خرج للتوصيل", "طلبك في الطريق إليك."],
        Delivered: ["تم التوصيل", "تم توصيل طلبك."],
        PickedUp: ["تم الاستلام", "تم استلام طلبك."],
        Completed: ["مكتمل", "اكتمل الطلب."],
        Cancelled: ["تم إلغاء الطلب", "تم إلغاء هذا الطلب."],
        Refunded: ["تم رد المبلغ", "تم رد مبلغ هذا الطلب."],
        PaymentFailed: ["فشل الدفع", "لم تكتمل عملية الدفع لهذا الطلب."],
    },
} as const;

type CopyKey = keyof typeof COPY.en;

export function getOnlineOrderStatus(
    order: Pick<OnlineOrderStatus, "customerStatus" | "orderType">,
    locale: "en" | "ar",
): OnlineOrderProgress {
    const copy = COPY[locale];
    const current = order.customerStatus as CopyKey;
    const text = copy[current] ?? copy.Confirmed;
    const isExceptional = current === "Cancelled" || current === "Refunded" || current === "PaymentFailed";
    if (isExceptional) {
        return { title: text[0], message: text[1], isExceptional: true, steps: [] };
    }

    const keys: readonly CopyKey[] = order.orderType === "Delivery" ? DELIVERY_STEPS : PICKUP_STEPS;
    const currentIndex = Math.max(0, keys.indexOf(current));
    return {
        title: text[0],
        message: text[1],
        isExceptional: false,
        steps: keys.map((key, index) => ({
            key,
            label: copy[key][0],
            state: index < currentIndex ? "completed" : index === currentIndex ? "current" : "upcoming",
        })),
    };
}

/**
 * Device-local order memory.
 *
 * Only the three values needed to re-open the existing tracking endpoint are
 * stored (order id, printed order number, the order's access token) plus the
 * date it was saved. No customer details, address or payment data ever go to
 * browser storage — the backend stays the only source of order content.
 */
const EMPTY_ORDERS: OnlineOrderAccess[] = [];
const listeners = new Set<() => void>();
let snapshotSource: string | null = null;
let snapshotValue: OnlineOrderAccess[] = EMPTY_ORDERS;

/**
 * useSyncExternalStore plumbing for the device-local order list. The snapshot is
 * memoised against the raw storage strings so React gets a stable reference, and
 * the `storage` event keeps a second tab of the store in step.
 */
export function subscribeToRememberedOnlineOrders(listener: () => void): () => void {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
}

export function getRememberedOnlineOrdersSnapshot(): OnlineOrderAccess[] {
    const source = `${readRaw(ONLINE_ORDER_HISTORY_KEY)}|${readRaw(ONLINE_ORDER_CONTEXT_KEY)}`;
    if (source !== snapshotSource) {
        snapshotSource = source;
        snapshotValue = readRememberedOnlineOrders();
    }
    return snapshotValue;
}

export function getRememberedOnlineOrdersServerSnapshot(): OnlineOrderAccess[] {
    return EMPTY_ORDERS;
}

function readRaw(key: string): string {
    try {
        return localStorage.getItem(key) ?? "";
    } catch {
        return "";
    }
}

function notifyRememberedOrdersChanged(): void {
    for (const listener of listeners) listener();
}

export function rememberOnlineOrder(access: OnlineOrderAccess): void {
    const entry: OnlineOrderAccess = { ...access, savedAt: access.savedAt ?? new Date().toISOString() };
    try {
        localStorage.setItem(ONLINE_ORDER_CONTEXT_KEY, JSON.stringify(entry));
        const history = [entry, ...readRememberedOnlineOrders().filter(row => row.orderId !== entry.orderId)]
            .slice(0, ONLINE_ORDER_HISTORY_LIMIT);
        localStorage.setItem(ONLINE_ORDER_HISTORY_KEY, JSON.stringify(history));
    } catch {
        // The URL still contains the access token when storage is unavailable.
    }
    notifyRememberedOrdersChanged();
}

export function forgetOnlineOrder(orderId: string): void {
    try {
        const history = readRememberedOnlineOrders().filter(row => row.orderId !== orderId);
        localStorage.setItem(ONLINE_ORDER_HISTORY_KEY, JSON.stringify(history));
        if (readRememberedOnlineOrder()?.orderId === orderId) {
            localStorage.removeItem(ONLINE_ORDER_CONTEXT_KEY);
        }
    } catch {
        // Nothing to clean up when storage is unavailable.
    }
    notifyRememberedOrdersChanged();
}

export function readRememberedOnlineOrders(): OnlineOrderAccess[] {
    const entries = new Map<string, OnlineOrderAccess>();
    for (const candidate of [...readHistory(), ...singleton(readRememberedOnlineOrder())]) {
        if (!entries.has(candidate.orderId)) entries.set(candidate.orderId, candidate);
    }
    return [...entries.values()].sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
}

export function readRememberedOnlineOrder(): OnlineOrderAccess | null {
    try {
        return parseAccess(localStorage.getItem(ONLINE_ORDER_CONTEXT_KEY));
    } catch {
        return null;
    }
}

function readHistory(): OnlineOrderAccess[] {
    try {
        const raw = localStorage.getItem(ONLINE_ORDER_HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(row => parseAccess(row))
            .filter((row): row is OnlineOrderAccess => row !== null);
    } catch {
        return [];
    }
}

function singleton(value: OnlineOrderAccess | null): OnlineOrderAccess[] {
    return value ? [value] : [];
}

function parseAccess(source: string | unknown): OnlineOrderAccess | null {
    try {
        const parsed = (typeof source === "string" ? JSON.parse(source) : source) as Partial<OnlineOrderAccess> | null;
        // A guest order opened from its link on another device has no client token, only its
        // guest access token — either one is enough to reopen it.
        if (!parsed?.orderId || !parsed.orderNumber || (!parsed.token && !parsed.guestAccessToken)) return null;
        return {
            orderId: parsed.orderId,
            orderNumber: parsed.orderNumber,
            token: typeof parsed.token === "string" ? parsed.token : "",
            guestAccessToken: typeof parsed.guestAccessToken === "string" ? parsed.guestAccessToken : undefined,
            savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined,
        };
    } catch {
        return null;
    }
}

export function buildOnlineOrderTrackingUrl(orderId: string, token: string): string {
    return `/shop/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`;
}

const GUEST_ACCESS_FRAGMENT_KEY = "access";

/**
 * A guest order's link. The token rides in the fragment, which browsers never send to a server,
 * so it stays out of access logs, proxies and referrers while the link can still be bookmarked.
 */
export function buildGuestOrderTrackingUrl(orderId: string, guestAccessToken: string): string {
    return `/shop/orders/${encodeURIComponent(orderId)}#${GUEST_ACCESS_FRAGMENT_KEY}=${encodeURIComponent(guestAccessToken)}`;
}

export function readGuestAccessTokenFromFragment(hash: string): string | null {
    return new URLSearchParams(hash.replace(/^#/, "")).get(GUEST_ACCESS_FRAGMENT_KEY);
}

/** Where a remembered order reopens: guest orders only through their access token. */
export function buildRememberedOrderUrl(access: OnlineOrderAccess): string {
    return access.guestAccessToken
        ? buildGuestOrderTrackingUrl(access.orderId, access.guestAccessToken)
        : buildOnlineOrderTrackingUrl(access.orderId, access.token);
}
