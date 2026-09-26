/**
 * The signed-in storefront customer's own account API.
 *
 * Every call carries the customer's short-lived access token, and the backend derives the
 * customer from that token alone — no request here names a customer id. These are the same
 * endpoints the mobile app uses; only the session transport (see /api/customer-session) is
 * web-specific.
 */

const PROXY = "/api/api-proxy";
const SESSION = "/api/customer-session";

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
    email: string;
    mobileNumber: string;
    password: string;
    preferredLanguage?: string;
}

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
    quantity: number;
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

/** Carries the HTTP status so callers can tell "signed out" (401) from a transient failure. */
export class CustomerApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = "CustomerApiError";
    }
}

async function readError(response: Response): Promise<CustomerApiError> {
    const body = await response.json().catch(() => null) as { message?: string; title?: string } | string | null;
    const message = typeof body === "string" ? body : body?.message || body?.title;
    return new CustomerApiError(message || `Request failed (${response.status})`, response.status);
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

export const customerSessionApi = {
    login: (identifier: string, password: string) =>
        sessionCall<CustomerSession>("login", { identifier, password }),
    register: (input: CustomerSignUpInput) => sessionCall<CustomerSession>("register", input),
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
};

/** Current access token for calls made outside this module (order placement). */
export function getCustomerAccessToken(): Promise<string | null> {
    return tokenProvider();
}
