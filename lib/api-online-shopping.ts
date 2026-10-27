import type { ProductDto } from "@/types/pos";
import {
    idempotencyHeaders,
    type CustomerCancelOrderResult,
    type OrderCancellationCapabilities,
} from "@/lib/api-customer-account";

const BASE = "/api/api-proxy";

export interface OnlineBranch {
    id: string;
    name: string;
    nameAr?: string;
    code: string;
    address?: string;
    phone?: string;
    isMainBranch: boolean;
}

export interface OnlineOption {
    id: string;
    name: string;
    nameAr?: string;
    price: number;
    isDefault: boolean;
}

export interface OnlineModifier {
    id: string;
    name: string;
    nameAr?: string;
    price: number;
}

export interface OnlineProductAvailability {
    productId: string;
    isAvailableOnline: boolean;
    inventoryTrackingEnabled: boolean;
    availableQuantity?: number;
}

export interface OnlineDeliveryZone {
    id: string;
    name: string;
    nameAr?: string;
    deliveryFee: number;
}

/**
 * One payment method the merchant enabled for this branch, straight from their PaymentMethod
 * registry. The storefront renders whatever the API returns, in the order it returns it, and
 * decides nothing about availability. Picking one records the method on the order, never a
 * payment — payment is collected on fulfilment.
 */
export interface OnlinePaymentMethod {
    id: string;
    name: string;
    nameAr?: string;
    code: string;
    icon?: string;
    displayOrder: number;
    /** The merchant's PaymentMethod.RequiresReferenceNumber rule. */
    requiresReferenceNumber: boolean;
    /** Presentation only — which icon to draw. Never gates availability. */
    isCash: boolean;
    isCard: boolean;
    isOnline: boolean;
}

export interface OnlineMenuOrderContext {
    branches: OnlineBranch[];
    productAvailability: OnlineProductAvailability[];
    deliveryZones: OnlineDeliveryZone[];
    paymentMethods: OnlinePaymentMethod[];
    /** Whether a shopper may order without signing in (email required). On unless the store switches it off. */
    guestCheckoutEnabled?: boolean;
}

export interface OnlineOrderResponse {
    id: string;
    orderNumber: string;
    totalAmount: number;
    subtotal: number;
    discountAmount: number;
    deliveryFee?: number;
    status: string;
}

export interface OnlineCheckoutResponse {
    paymentId: string;
    providerCode: "SIMULATED";
    paymentStatus: number;
    isDuplicate: boolean;
}

export interface OnlineOrderStatus {
    orderId: string;
    orderNumber: string;
    orderType: string;
    status: string;
    customerStatus: string;
    createdAt: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    isPaid: boolean;
    paymentStatus: string;
    paymentMethod: string;
    paymentMethodAr?: string;
    submittedPaymentReference?: string;
    scheduledFor?: string;
    dispatchedAt?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    /** One readable line, exactly as printed on the staff ticket. */
    deliveryAddress?: string;
    deliveryNotes?: string;
    deliveryZoneName?: string;
    deliveryFee?: number;
    branch: OnlineBranch;
    items: OnlineOrderItem[];
}

export interface OnlineOrderItem {
    /** Names the line in a cancellation. It opens nothing on its own — the guest token does. */
    orderItemId: string;
    name: string;
    nameAr?: string;
    /** Units still active. Zero once the line has been cancelled in full — the line is kept. */
    quantity: number;
    /** Units cancelled off this line, so the order still reads as what was placed. */
    cancelledQuantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface OnlineReceiptAccess {
    receiptUrl: string;
}

export interface OnlineStoreCategory {
    id: string;
    name: string;
    nameAr?: string;
    description?: string;
    imageUrl?: string;
    sortOrder: number;
    productCount: number;
    /** Sellable products in this department whose price is genuinely reduced. */
    discountedProductCount: number;
    /** The largest of those reductions, whole percent. 0 when nothing here is reduced. */
    maxDiscountPercent: number;
    /** Active subcategories holding products in this branch, in display order. Empty when not subdivided. */
    subcategories?: OnlineStoreSubcategory[];
}

export interface OnlineStoreSubcategory {
    id: string;
    categoryId: string;
    name: string;
    nameAr?: string;
    imageUrl?: string;
    displayOrder: number;
    productCount: number;
}

export interface OnlineStoreImage {
    imageUrl: string;
    imageKey?: string;
    altText?: string;
}

/** Customer-facing merchandising attributes. Never carries cost, supplier or margin. */
export interface OnlineStoreProductDetails {
    productId: string;
    brand?: string;
    /** Brand identity from the brand master. Absent means the brand is only a name. */
    brandName?: string;
    brandNameAr?: string;
    brandLogoUrl?: string;
    brandLogoKey?: string;
    sku?: string;
    sizeLabel?: string;
    countryOfOrigin?: string;
    images: OnlineStoreImage[];
}

export interface OnlineStoreCatalog {
    categories: OnlineStoreCategory[];
    products: ProductDto[];
    productAvailability: OnlineProductAvailability[];
    productDetails: OnlineStoreProductDetails[];
    categoryId?: string;
    subcategoryId?: string;
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

/**
 * The catalogue rows for an explicit set of product ids.
 *
 * Favourites live on the shopper's device as ids only; everything else about a product — its
 * price, its reduction, its stock, its imagery — still comes from here, so a favourite can
 * never display a price the store no longer charges. Ids that no longer resolve are simply
 * absent from `products`.
 */
export interface OnlineStoreProductSet {
    products: ProductDto[];
    productAvailability: OnlineProductAvailability[];
    productDetails: OnlineStoreProductDetails[];
}

/** Mirrors WhatsAppContactPurpose on the API: 0 general, 1 product inquiry, 2 customer service. */
export type OnlineWhatsAppPurpose = 0 | 1 | 2;

/**
 * One configured WhatsApp destination, in both languages.
 *
 * The store switches language without reloading, so the template is picked per render rather
 * than fetched per language — the same reason every other storefront payload carries its own
 * Arabic field.
 */
export interface OnlineWhatsAppContact {
    /** Digits only, ready for the wa.me URL. */
    phone: string;
    purpose: OnlineWhatsAppPurpose;
    /** The business's own template, placeholders unresolved. Empty means no prefilled text. */
    messageTemplate: string;
    messageTemplateAr: string;
}

/**
 * Stable keys the storefront maps to a localized heading. `recommended` only ever comes from
 * the signed-in home (`customerAccountApi.getStorefrontHome`), never the anonymous one.
 */
export type OnlineStoreSectionKey = "recommended" | "onSale" | "newArrivals" | "explore";

export interface OnlineStoreSection {
    key: OnlineStoreSectionKey;
    products: ProductDto[];
}

export interface OnlineStoreHome {
    categories: OnlineStoreCategory[];
    sections: OnlineStoreSection[];
    productAvailability: OnlineProductAvailability[];
    productDetails: OnlineStoreProductDetails[];
    totalProductCount: number;
}

export interface OnlineStoreProductPage {
    product: ProductDto;
    availability: OnlineProductAvailability;
    details: OnlineStoreProductDetails;
    category?: OnlineStoreCategory;
    related: ProductDto[];
    relatedAvailability: OnlineProductAvailability[];
    relatedDetails: OnlineStoreProductDetails[];
}

export interface OnlineStoreSuggestion {
    id: string;
    name: string;
    nameAr?: string;
    price: number;
    basePrice: number;
    imageUrl?: string;
    imageKey?: string;
    brand?: string;
}

export interface OnlineStoreSuggestions {
    products: OnlineStoreSuggestion[];
    categories: OnlineStoreCategory[];
}

/**
 * A bundle offer that is live right now. Every price is produced by the backend from the
 * same allocation order intake charges, so the storefront never derives an offer price.
 */
export interface OnlineStoreOffer {
    id: number;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    imageUrl?: string;
    price: number;
    originalPrice: number;
    savingAmount: number;
    savingPercent: number;
    /** ISO date, in the store's own calendar. */
    endsOn: string;
    /** HH:mm in store-local time, or null when the offer runs all day. */
    dailyStartTime?: string;
    dailyEndTime?: string;
    items: OnlineStoreOfferItem[];
}

export interface OnlineStoreOfferItem {
    productId: string;
    /** The product's own department, so the store can say where offers are running. */
    categoryId?: string;
    name: string;
    nameAr?: string;
    imageUrl?: string;
    imageKey?: string;
    quantity: number;
    /** What order intake will charge for this line inside the offer. */
    unitPrice: number;
    listUnitPrice: number;
}

/** Where a banner may send the shopper. Mirrors StorefrontBannerLinkType on the API. */
export type OnlineStoreBannerLinkType = 0 | 1 | 2 | 3 | 4 | 5;

export interface OnlineStoreBanner {
    id: string;
    title: string;
    titleAr?: string;
    subtitle?: string;
    subtitleAr?: string;
    imageUrl: string;
    imageKey?: string;
    mobileImageUrl?: string;
    mobileImageKey?: string;
    ctaLabel?: string;
    ctaLabelAr?: string;
    linkType: OnlineStoreBannerLinkType;
    linkValue?: string;
}

/** Public branding configured by the business (Tenants.PrimaryColor / AccentColor). */
export interface OnlineStoreBranding {
    siteName?: string;
    logoUrl?: string;
    bannerUrl?: string;
    primaryColor?: string;
    accentColor?: string;
}

/** Mirrors OnlineStoreCatalogSort on the API. "Featured" is the default order. */
export type OnlineStoreSort = "Featured" | "PriceAscending" | "PriceDescending" | "NameAscending";

export interface OnlineStoreCatalogParams {
    categoryId?: string;
    subcategoryId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sort?: OnlineStoreSort;
}

export interface OnlineStoreOrderLookupResult {
    trackingToken: string;
    order: OnlineOrderStatus;
}

/** A guest's own order, opened with its access token: tracking plus what it may cancel. */
export interface OnlineGuestOrder {
    order: OnlineOrderStatus;
    cancellation: OrderCancellationCapabilities;
}

async function request<T>(path: string, init?: RequestInit, branchId?: string): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    if (branchId) headers.set("X-Branch-ID", branchId);
    const response = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" });
    if (!response.ok) {
        const body = await response.json().catch(() => null) as {
            error?: string;
            message?: string;
            title?: string;
            status?: string;
        } | null;
        // The HTTP status and the API's machine-readable `status` slug ride along, so a screen can
        // react to why a request failed without parsing the message.
        throw Object.assign(new Error(body?.error || body?.message || body?.title || `Request failed (${response.status})`), {
            status: response.status,
            code: body?.status,
        });
    }
    return response.json() as Promise<T>;
}

export const onlineShoppingApi = {
    getOrderContext: (branchId?: string) =>
        request<OnlineMenuOrderContext>("/online-shopping/context", undefined, branchId),

    createOrder: (payload: unknown, branchId: string) =>
        request<OnlineOrderResponse>("/orders/public", {
            method: "POST",
            body: JSON.stringify(payload),
        }, branchId),

    createCheckout: (orderId: string, clientOrderUuid: string, branchId: string) =>
        request<OnlineCheckoutResponse>("/online-shopping/checkout", {
            method: "POST",
            body: JSON.stringify({ orderId, clientOrderUuid }),
        }, branchId),

    getCatalog: (params: OnlineStoreCatalogParams, branchId?: string) => {
        const query = new URLSearchParams();
        if (params.categoryId) query.set("categoryId", params.categoryId);
        if (params.subcategoryId) query.set("subcategoryId", params.subcategoryId);
        if (params.search?.trim()) query.set("search", params.search.trim());
        if (params.page) query.set("page", String(params.page));
        if (params.pageSize) query.set("pageSize", String(params.pageSize));
        if (params.sort && params.sort !== "Featured") query.set("sort", params.sort);
        const suffix = query.toString();
        return request<OnlineStoreCatalog>(
            `/online-shopping/catalog${suffix ? `?${suffix}` : ""}`,
            undefined,
            branchId,
        );
    },

    getHome: (branchId?: string) =>
        request<OnlineStoreHome>("/online-shopping/storefront", undefined, branchId),

    getProductPage: (productId: string, branchId?: string) =>
        request<OnlineStoreProductPage>(
            `/online-shopping/catalog/products/${encodeURIComponent(productId)}`,
            undefined,
            branchId,
        ),

    /** Current catalogue rows for ids the caller already holds — the favourites list. */
    getProductSet: (productIds: readonly string[], branchId?: string) =>
        request<OnlineStoreProductSet>(
            `/online-shopping/catalog/products?ids=${encodeURIComponent(productIds.join(","))}`,
            undefined,
            branchId,
        ),

    /** WhatsApp destinations the business configured. An empty list means none is offered. */
    getWhatsAppContacts: () =>
        request<OnlineWhatsAppContact[]>("/online-shopping/whatsapp-contacts"),

    /** Live bundle offers. `productId` narrows it to the offers containing that product. */
    getOffers: (branchId?: string, productId?: string) =>
        request<{ offers: OnlineStoreOffer[] }>(
            `/online-shopping/offers${productId ? `?productId=${encodeURIComponent(productId)}` : ""}`,
            undefined,
            branchId,
        ),

    getBanners: (branchId?: string) =>
        request<OnlineStoreBanner[]>("/online-shopping/banners", undefined, branchId),

    getSuggestions: (search: string, branchId?: string) =>
        request<OnlineStoreSuggestions>(
            `/online-shopping/catalog/suggest?q=${encodeURIComponent(search)}`,
            undefined,
            branchId,
        ),

    /** Reuses the existing public branding endpoint — no storefront-only colour store. */
    getBranding: () => request<OnlineStoreBranding>("/menu/public/branding"),

    lookupOrder: (orderNumber: string, contact: string) =>
        request<OnlineStoreOrderLookupResult>("/online-shopping/orders/lookup", {
            method: "POST",
            body: JSON.stringify({ orderNumber, contact }),
        }),

    getOrderStatus: (orderId: string, token: string) =>
        request<OnlineOrderStatus>(
            `/online-shopping/orders/${orderId}/status?token=${encodeURIComponent(token)}`,
        ),

    createReceiptAccess: (orderId: string, token: string) =>
        request<OnlineReceiptAccess>(
            `/online-shopping/orders/${orderId}/receipt?token=${encodeURIComponent(token)}`,
            { method: "POST" },
        ),

    // Guest orders: the access token travels in the body only, never in a URL.
    getGuestOrder: (orderId: string, accessToken: string) =>
        request<OnlineGuestOrder>(`/online-shopping/guest-orders/${encodeURIComponent(orderId)}/access`, {
            method: "POST",
            body: JSON.stringify({ accessToken }),
        }),

    cancelGuestOrder: (orderId: string, accessToken: string, reason: string, idempotencyKey?: string) =>
        request<CustomerCancelOrderResult>(`/online-shopping/guest-orders/${encodeURIComponent(orderId)}/cancel`, {
            method: "POST",
            headers: idempotencyHeaders(idempotencyKey),
            body: JSON.stringify({ accessToken, reason }),
        }),

    /** Pass the explicit number of units; the active quantity cancels the whole line. */
    cancelGuestOrderItem: (
        orderId: string,
        accessToken: string,
        orderItemId: string,
        reason: string,
        quantity: number,
        idempotencyKey?: string,
    ) =>
        request<CustomerCancelOrderResult>(`/online-shopping/guest-orders/${encodeURIComponent(orderId)}/items/cancel`, {
            method: "POST",
            headers: idempotencyHeaders(idempotencyKey),
            body: JSON.stringify({ accessToken, orderItemId, reason, quantity }),
        }),

    createGuestReceiptAccess: (orderId: string, accessToken: string) =>
        request<OnlineReceiptAccess>(`/online-shopping/guest-orders/${encodeURIComponent(orderId)}/receipt`, {
            method: "POST",
            body: JSON.stringify({ accessToken }),
        }),
};
