/**
 * The signed-in storefront customer's own account API.
 *
 * Every call carries the customer's short-lived access token, and the backend derives the
 * customer from that token alone — no request here names a customer id. These are the same
 * endpoints the mobile app uses; only the session transport (see /api/customer-session) is
 * web-specific.
 */

import type { OnlineStoreHome } from "@/lib/api-online-shopping";

const PROXY = "/api/api-proxy";
const SESSION = "/api/customer-session";
const BRANCH_HEADER = "X-Branch-ID";

export interface CustomerProfile {
    id: string;
    customerNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    preferredLanguage: string;
    isVerified: boolean;
    createdAt: string;
    lastLoginDate?: string;
}

export interface CustomerSession {
    accessToken: string;
    accessTokenExpiresAt: string;
    customer: CustomerProfile;
}

export interface CustomerSignUpInput {
    firstName: string;
    lastName: string;
    /** E.164, e.g. "+9627XXXXXXXX" — see lib/store-phone. */
    mobileNumber: string;
    email: string;
    password: string;
    preferredLanguage?: string;
}

/** What the backend says after a code has been sent. It never carries the code itself. */
export interface CustomerEmailCodeSent {
    maskedEmail: string;
    codeExpiresAt: string;
    resendAvailableAt: string;
}

/**
 * Both sign-up and sign-in answer either with a session or with "this address still has to be
 * confirmed". The two are distinguished by `requiresEmailVerification`, never by guessing from
 * a missing token.
 */
export type CustomerAuthResult =
    | { requiresEmailVerification: false; session: CustomerSession }
    /** `email` is the account's own address, which the caller needs to confirm the code —
        the shopper may have signed in with their mobile number instead. */
    | { requiresEmailVerification: true; email: string; verification: CustomerEmailCodeSent };

export interface CustomerProfileUpdate {
    firstName: string;
    lastName: string;
    preferredLanguage?: string;
}

export interface CustomerAddress {
    id: string;
    addressName: string;
    area: string;
    street: string;
    building?: string;
    floor?: string;
    apartment?: string;
    deliveryZoneId?: string;
    isDefault: boolean;
    createdAt: string;
}

export type CustomerAddressInput = Omit<CustomerAddress, "id" | "createdAt">;

export interface CustomerOrderSummary {
    id: string;
    orderId: string;
    orderNumber: string;
    orderType: string;
    status: string;
    totalAmount: number;
    totalItemsCount: number;
    createdAt: string;
}

export interface CustomerOrderItem {
    id: string;
    productId: string;
    productName: string;
    productNameAr?: string;
    /** Units still active. Zero once the line has been cancelled in full — the line is kept. */
    quantity: number;
    /** Units cancelled off this line, so the order still reads as what was placed. */
    cancelledQuantity: number;
    unitPrice: number;
    lineTotal: number;
    selectedOptionName?: string;
    selectedOptionNameAr?: string;
    notes?: string;
}

export interface CustomerOrderDetails extends CustomerOrderSummary {
    deliveryAddress?: string;
    deliveryNotes?: string;
    subtotal: number;
    promoCode?: string | null;
    promoDiscountAmount: number;
    deliveryFee: number;
    items: CustomerOrderItem[];
    /** What the backend will allow on this order. It is the only source of truth for the controls below. */
    cancellation?: OrderCancellationCapabilities;
}

/**
 * The backend's answer to "what may this shopper do to this order right now". The UI only decides
 * what to show from it — every cancel request is re-checked server-side, so a stale page is refused
 * rather than obeyed.
 */
export interface OrderCancellationCapabilities {
    canCustomerCancel: boolean;
    canCancelItems: boolean;
    canReduceQuantity: boolean;
    /** ISO instant after which cancellation closes, or null when there is no window. */
    cancellationDeadline?: string | null;
    allowedCancellationActions: string[];
    /** Present when nothing is allowed, so the reason can be explained instead of hidden. */
    denialReason?: string | null;
    /** The request will be queued for staff to settle with a refund rather than applied at once. */
    requiresStaffApproval: boolean;
    /** A request on this order is waiting for staff to decide it. */
    hasPendingRequest?: boolean;
    /** Lines with a request waiting for staff; empty when the pending request is for the whole order. */
    pendingOrderItemIds?: string[];
}

export interface CustomerCancelOrderResult {
    success: boolean;
    status: string;
    requiresStaffApproval: boolean;
    orderItemId?: string | null;
    cancelledQuantity: number;
    remainingQuantity: number;
    totalAmount: number;
    promoDiscountAmount: number;
    /** Set when the promo code stopped qualifying on what was left and was withdrawn. */
    promoWithdrawnReason?: string | null;
    refundAmount: number;
}

export interface CustomerLoyaltyWallet {
    availablePoints: number;
    pendingPoints: number;
    lifetimePoints: number;
    redeemedPoints: number;
    expiredPoints: number;
    availableBalance: number;
    currencyCode: string;
    tier: string;
    tierAr?: string | null;
    status: string;
}

/** One ledger row. Type/Status/Source are the backend enum names (e.g. "Earn", "Available", "Order"). */
export interface CustomerLoyaltyTransaction {
    id: string;
    type: string;
    points: number;
    balanceAfter: number;
    status: string;
    source: string;
    reason?: string | null;
    createdAt: string;
    expiresAt?: string | null;
    orderId?: string | null;
    orderNumber?: string | null;
}

export interface CustomerLoyaltyTransactionsPage {
    items: CustomerLoyaltyTransaction[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface CustomerOrdersPage {
    items: CustomerOrderSummary[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface CustomerFavorites {
    productIds: string[];
}

/**
 * Carries the HTTP status so callers can tell "signed out" (401) from a transient failure,
 * and the backend's own `status` slug (e.g. "CODE_EXPIRED") so a screen can react to *why*
 * a request failed without matching on message text.
 */
export class CustomerApiError extends Error {
    constructor(message: string, readonly status: number, readonly code?: string) {
        super(message);
        this.name = "CustomerApiError";
    }
}

interface ApiErrorBody {
    /** The API's own shape (ExceptionMiddleware). */
    error?: string;
    /** Machine-readable reason, e.g. "EMAIL_NOT_VERIFIED". */
    status?: string;
    /** ASP.NET model-validation and other framework responses. */
    message?: string;
    title?: string;
    errors?: Record<string, string[]>;
}

async function readError(response: Response): Promise<CustomerApiError> {
    const body = await response.json().catch(() => null) as ApiErrorBody | string | null;
    if (typeof body === "string") return new CustomerApiError(body, response.status);

    const message = body?.error || body?.message || body?.title || firstFieldError(body?.errors);
    return new CustomerApiError(message || `Request failed (${response.status})`, response.status, body?.status);
}

/** Model-binding rejections arrive as a field map with no top-level message. */
function firstFieldError(errors: Record<string, string[]> | undefined): string | undefined {
    for (const messages of Object.values(errors ?? {})) {
        if (messages?.length) return messages[0];
    }
    return undefined;
}

async function sessionCall<T>(action: string, body?: unknown): Promise<T> {
    const response = await fetch(`${SESSION}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "same-origin",
        cache: "no-store",
    });
    if (!response.ok) throw await readError(response);
    return (response.status === 204 ? undefined : await response.json()) as T;
}

type AuthResponse = CustomerSession & { requiresEmailVerification?: boolean } & Partial<CustomerEmailCodeSent>;

function toAuthResult(body: AuthResponse): CustomerAuthResult {
    return body.requiresEmailVerification
        ? {
            requiresEmailVerification: true,
            email: body.customer?.email ?? "",
            verification: {
                maskedEmail: body.maskedEmail ?? "",
                codeExpiresAt: body.codeExpiresAt ?? "",
                resendAvailableAt: body.resendAvailableAt ?? "",
            },
        }
        : { requiresEmailVerification: false, session: body };
}

export const customerSessionApi = {
    login: async (identifier: string, password: string): Promise<CustomerAuthResult> =>
        toAuthResult(await sessionCall<AuthResponse>("login", { identifier, password })),

    register: async (input: CustomerSignUpInput): Promise<CustomerAuthResult> =>
        toAuthResult(await sessionCall<AuthResponse>("register", input)),

    verifyEmail: (email: string, code: string) =>
        sessionCall<CustomerSession>("verify-email", { email, code }),
    resendEmailCode: (email: string) =>
        sessionCall<CustomerEmailCodeSent>("resend-email-code", { email }),

    refresh: () => sessionCall<CustomerSession>("refresh"),
    logout: () => sessionCall<void>("logout"),
};

/** Supplies a valid access token, refreshing it first when needed. Wired by the session store. */
type TokenProvider = (forceRefresh?: boolean) => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;

export function setCustomerTokenProvider(provider: TokenProvider) {
    tokenProvider = provider;
}

async function authorizedFetch(path: string, init: RequestInit, token: string): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${PROXY}${path}`, { ...init, headers, cache: "no-store" });
}

export const IDEMPOTENCY_HEADER = "X-Idempotency-Key";

export function idempotencyHeaders(key?: string): HeadersInit | undefined {
    return key ? { [IDEMPOTENCY_HEADER]: key } : undefined;
}

/** One transparent retry after a 401: the access token may have expired between check and use. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await tokenProvider();
    if (!token) throw new CustomerApiError("Sign in to continue.", 401);

    let response = await authorizedFetch(path, init, token);
    if (response.status === 401) {
        const renewed = await tokenProvider(true);
        if (!renewed) throw new CustomerApiError("Sign in to continue.", 401);
        response = await authorizedFetch(path, init, renewed);
    }
    if (!response.ok) throw await readError(response);
    return (response.status === 204 ? undefined : await response.json()) as T;
}

export const customerAccountApi = {
    getProfile: () => request<CustomerProfile>("/mobile/profile"),
    updateProfile: (input: CustomerProfileUpdate) =>
        request<CustomerProfile>("/mobile/profile", { method: "PUT", body: JSON.stringify(input) }),

    getAddresses: () => request<CustomerAddress[]>("/mobile/profile/addresses"),
    addAddress: (input: CustomerAddressInput) =>
        request<CustomerAddress>("/mobile/profile/address", { method: "POST", body: JSON.stringify(input) }),
    updateAddress: (id: string, input: CustomerAddressInput) =>
        request<CustomerAddress>(`/mobile/profile/address/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }),
    deleteAddress: (id: string) =>
        request<void>(`/mobile/profile/address/${encodeURIComponent(id)}`, { method: "DELETE" }),

    getOrders: (page: number, pageSize: number) =>
        request<CustomerOrdersPage>(`/mobile/orders?page=${page}&pageSize=${pageSize}`),
    getOrder: (orderId: string) => request<CustomerOrderDetails>(`/mobile/orders/${encodeURIComponent(orderId)}`),

    getOrderCancellation: (orderId: string) =>
        request<OrderCancellationCapabilities>(`/mobile/orders/${encodeURIComponent(orderId)}/cancellation`),
    /**
     * The idempotency key makes a retry of the same request replay its first answer instead of
     * cancelling again. Reuse it for a retry; mint a new one for a new decision.
     */
    cancelOrder: (orderId: string, reason: string, idempotencyKey?: string) =>
        request<CustomerCancelOrderResult>(`/mobile/orders/${encodeURIComponent(orderId)}/cancel`, {
            method: "POST",
            headers: idempotencyHeaders(idempotencyKey),
            body: JSON.stringify({ reason }),
        }),
    /** Pass the explicit number of units; the active quantity cancels the whole line. */
    cancelOrderItem: (orderId: string, orderItemId: string, reason: string, quantity?: number, idempotencyKey?: string) =>
        request<CustomerCancelOrderResult>(`/mobile/orders/${encodeURIComponent(orderId)}/items/cancel`, {
            method: "POST",
            headers: idempotencyHeaders(idempotencyKey),
            body: JSON.stringify({ orderItemId, reason, quantity }),
        }),

    getLoyaltyWallet: () => request<CustomerLoyaltyWallet>("/mobile/loyalty/wallet"),
    getLoyaltyTransactions: (page: number, pageSize: number) =>
        request<CustomerLoyaltyTransactionsPage>(`/mobile/loyalty/transactions?page=${page}&pageSize=${pageSize}`),

    getFavorites: () => request<CustomerFavorites>("/mobile/favorites"),
    addFavorite: (productId: string) =>
        request<CustomerFavorites>(`/mobile/favorites/${encodeURIComponent(productId)}`, { method: "PUT" }),
    removeFavorite: (productId: string) =>
        request<CustomerFavorites>(`/mobile/favorites/${encodeURIComponent(productId)}`, { method: "DELETE" }),
    mergeFavorites: (productIds: string[]) =>
        request<CustomerFavorites>("/mobile/favorites/merge", { method: "POST", body: JSON.stringify({ productIds }) }),

    /** The anonymous storefront home, plus a `recommended` section when the account has one. */
    getStorefrontHome: (branchId?: string) =>
        request<OnlineStoreHome>("/mobile/storefront", { headers: branchId ? { [BRANCH_HEADER]: branchId } : undefined }),
};

/** Current access token for calls made outside this module (order placement). */
export function getCustomerAccessToken(): Promise<string | null> {
    return tokenProvider();
}
