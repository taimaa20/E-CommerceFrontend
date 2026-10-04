import { ProductDto, ModifierGroupDto, ModifierGroupLibraryDto, ModifierDto, Table, TableStatus, TableCategoryDto, CategoryDto, SubcategoryDto, ProductOptionDto, ProductOptionCreateDto, ProductOptionUpdateDto, ProductOptionRecipeItemCreateDto, RecipeItemAlternativeDto, RecipeItemAlternativeCreateDto, RecipeItemAlternativeUpdateDto } from "@/types/pos";
import { DeliveryPartnerPriceAdjustmentPayload, OrderCreateDto, OrderDto, OrderFilters, OrderListItemDto, OrderSummaryDto, OrderTotalOverrideDto, OrderTotalOverridePayload, PartnerDiscountOverrideDto, PartnerDiscountOverridePayload, PartnerPriceOverrideAuditDto, ValidatePriceRequest, ValidatePriceResponse } from "@/types/order";
import { CreateOfferRequest, OfferResponseDto } from "@/types/offer";
import { CashierBalanceShift, CloseCashierShiftPayload, OpenCashierShiftPayload } from "@/types/cashier-balance";
import { useAuthStore } from "@/store/authStore";
import { config } from "@/lib/config";
import { deleteOfferCache, readOfferCache, warmOfferImageCache, writeOfferCache } from "@/lib/offer-cache";
import { getConnectivityState, reportApiSuccess, reportApiFailure } from "@/lib/offline/connectivity";
import { cachedReferenceList, cachedReferenceFetch } from "@/lib/offline/reference-cache";
import { getIdempotencyHeaders } from "@/lib/offline/idempotency";
import { generateActionId, generateClientOrderUUID } from "@/lib/offline/id";
import { invalidateAllMenuCaches, isMenuCacheStale, readMenuCache, writeMenuCache } from "@/lib/menu-cache";
import { deleteReferenceCache } from "@/lib/offline/db";
import { BRANCH_HEADER, getBranchHeaders, getSelectedBranchCacheKey } from "@/lib/branch-selection";
import { formatValidationProblem } from "@/lib/validation-errors";

// Offline-queue replays call these *Strict/addOrderPayment/etc. functions with the
// branch the action was originally enqueued under, so a sync that fires after the
// user has switched branches still attributes the action to its origin branch
// instead of silently picking up whatever branch is active at drain time.
function withBranchOverride(headers: Record<string, string>, branchIdOverride?: string | null): Record<string, string> {
    return branchIdOverride ? { ...headers, [BRANCH_HEADER]: branchIdOverride } : headers;
}

export interface RawMaterial {
    id: string;
    name: string;
    nameAr?: string;
    displayName?: string;
    unit: number;
    currentStock: number;
    minimumAlertLevel: number;
    costPerUnit: number;
    showInMenu: boolean;
    isPostPrice: boolean;
    defaultWarehouseId?: string | null;
    defaultWarehouseName?: string | null;
    defaultWarehouseCode?: string | null;
}

export interface StockBatch {
    id: string;
    materialId: string;
    materialName: string;
    materialNameAr?: string;
    name?: string;
    nameAr?: string;
    quantity: number;
    remainingQuantity: number;
    unitCost?: number;
    totalCost?: number;
    expiryDate: string;
    purchaseOrderId?: string;
    purchaseOrderNumber?: string;
    batchNumber: string;
    createdAt: string;
    isApproved?: boolean;
    status?: string;
    supplierName?: string;
    supplierNameAr?: string;
    finishedAt?: string | null;
}

export type StockBatchFilter = "all" | "active" | "expired" | "finished";

export interface StockBatchCreateDto {
    materialId: string;
    quantity: number;
    expiryDate: string;
    purchaseOrderId?: string;
    batchNumber: string;
    unitCost?: number;
}

const OFFER_CACHE_KEYS = {
    active: "offers:active",
    public: "offers:public",
    publicAvailable: "offers:public-available",
    admin: "offers:admin",
} as const;

const TENANT_HEADER = "X-Tenant-ID";
const DEFAULT_API_TIMEOUT_MS = 60_000;
const configuredApiTimeoutMs = Number.parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? "", 10);
const API_TIMEOUT_MS = Number.isFinite(configuredApiTimeoutMs) && configuredApiTimeoutMs > 0
    ? configuredApiTimeoutMs
    : DEFAULT_API_TIMEOUT_MS;
const REQUEST_TIMEOUT_ERROR_NAME = "TimeoutError";
const inFlightOrderCreates = new Map<string, Promise<OrderDto | null>>();

const getTenantId = (): string => {
    const authTenantId = useAuthStore.getState().user?.tenantId;
    if (authTenantId) return authTenantId;
    if (typeof window !== "undefined") {
        return localStorage.getItem("tenantId") || config.tenantId;
    }
    return config.tenantId;
};

const getTenantHeaders = (): Record<string, string> => {
    const tenantId = getTenantId();
    return tenantId ? { [TENANT_HEADER]: tenantId } : {};
};

const fetchWithTimeout = async (
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs = API_TIMEOUT_MS
) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(createRequestTimeoutError(timeoutMs)), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

function createRequestTimeoutError(timeoutMs: number): DOMException | Error {
    const message = `Request timed out after ${timeoutMs}ms`;
    if (typeof DOMException === "function") {
        return new DOMException(message, REQUEST_TIMEOUT_ERROR_NAME);
    }
    const error = new Error(message);
    error.name = REQUEST_TIMEOUT_ERROR_NAME;
    return error;
}

type ApiRequestError = Error & {
    response?: { status: number; data?: unknown };
};

async function createResponseError(response: Response, fallback: string): Promise<ApiRequestError> {
    const responseText = await response.text().catch(() => "");
    let data: unknown = responseText;
    try {
        data = responseText ? JSON.parse(responseText) : null;
    } catch {
        // Keep the response text for exact operator-facing errors.
    }
    const message =
        data && typeof data === "object" && typeof (data as { message?: unknown }).message === "string"
            ? (data as { message: string }).message
            : data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
                ? (data as { error: string }).error
            // ValidationProblemDetails: surface the per-field errors instead of
            // the raw JSON text / generic "One or more validation errors occurred."
            : formatValidationProblem(data)
                ?? (data && typeof data === "object" && typeof (data as { title?: unknown }).title === "string"
                    ? (data as { title: string }).title
                    : responseText || fallback);
    const error = new Error(message) as ApiRequestError;
    error.response = { status: response.status, data };
    return error;
}

export function isNetworkRequestError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) return true;
    const candidate = error as ApiRequestError;
    const status = candidate.response?.status;
    const data = candidate.response?.data;
    const isProxyUpstreamFailure =
        status === 502
        && typeof data === "object"
        && data !== null
        && (data as { error?: unknown }).error === "Upstream request failed";
    return candidate.name === "AbortError"
        || candidate.name === REQUEST_TIMEOUT_ERROR_NAME
        || typeof status !== "number"
        || status === 408
        || status === 504
        || isProxyUpstreamFailure;
}

export function getRequestErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export interface LegacyLoginResponse {
    token: string;
    tenantId?: string;
    username: string;
    fullName?: string | null;
    fullNameAr?: string | null;
    role: number;
    roleName: string;
    userId: string;
    canApplyDiscount: boolean;
}

async function persistOfferCache(cacheKey: string, offers: OfferResponseDto[]) {
    await writeOfferCache(cacheKey, offers);
    void warmOfferImageCache(offers);
}

async function invalidateOfferCaches(): Promise<void> {
    await Promise.all(Object.values(OFFER_CACHE_KEYS).map((key) => deleteOfferCache(key)));
}

export interface StockBatchUpdateDto {
    quantity: number;
    expiryDate: string;
    batchNumber: string;
}

export const UnitLabels = ["Gram", "Kilogram", "Adet", "Litre", "Mililitre", "Pieces"];

export async function getRawMaterials(): Promise<RawMaterial[]> {
    try {
        const response = await api.get('/rawmaterials');
        return (response.data || []).map((item: RawMaterial) => ({
            ...item,
            // Keep name as English; use displayName for locale-aware display
        }));
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getRawMaterialsPaginated(
    pageNumber: number = 1,
    pageSize: number = 10,
    searchTerm: string = "",
    sortBy: string = "name",
    sortOrder: string = "asc"
): Promise<any> {
    try {
        const normalizedSearchTerm = searchTerm.trim();
        const response = await api.get('/rawmaterials/paginated', {
            params: { pageNumber, pageSize, searchTerm: normalizedSearchTerm, sortBy, sortOrder }
        });
        return {
            ...response.data,
            items: (response.data?.items || []).map((item: RawMaterial) => ({
                ...item,
            })),
        };
    } catch (error) {
        console.error(error);
        return { items: [], totalCount: 0, pageNumber, pageSize };
    }
}

export async function createRawMaterial(data: any): Promise<boolean> {
    await api.post('/rawmaterials', data);
    await invalidateAllMenuCaches();
    return true;
}

export async function updateRawMaterial(id: string, data: any): Promise<boolean> {
    // Fetch the current material first
    const response = await api.get(`/rawmaterials`);
    const materials: RawMaterial[] = response.data || [];
    const currentMaterial = materials.find((m: RawMaterial) => m.id === id);

    if (!currentMaterial) {
        throw new Error("Material not found");
    }

    // Merge the updates with the current data
    const updatedMaterial = {
        ...currentMaterial,
        ...data,
        id: id // Ensure ID is always set correctly
    };

    // Send the complete material object
    await api.put(`/rawmaterials/${id}`, updatedMaterial);
    await invalidateAllMenuCaches();
    return true;
}

export interface StockAdjustmentResult {
    id: string;
    materialId: string;
    materialName: string;
    materialNameAr?: string;
    kind: string; // "StockQuantity" | "UnitCost"
    previousStock: number;
    newStock: number;
    adjustmentQuantity: number;
    previousUnitCost?: number | null;
    newUnitCost?: number | null;
    unit: string;
    reason: string;
    performedBy: string;
    createdAt: string;
}

// SuperAdmin-only. Backend applies the change through the batch/FIFO engine and
// records an audit row; a 403 here means the caller is not a SuperAdmin.
export async function adjustRawMaterialStock(
    materialId: string,
    payload: { newStock: number; reason: string }
): Promise<StockAdjustmentResult> {
    const response = await api.post(`/rawmaterials/${materialId}/stock-adjustments`, payload);
    await invalidateAllMenuCaches();
    return response.data as StockAdjustmentResult;
}

// SuperAdmin-only. Adjustment history (both stock-quantity and unit-cost) for a
// material on the active branch, newest first.
export async function getRawMaterialAdjustments(materialId: string): Promise<StockAdjustmentResult[]> {
    const response = await api.get(`/rawmaterials/${materialId}/stock-adjustments`);
    return (response.data ?? []) as StockAdjustmentResult[];
}

// SuperAdmin-only. Adjustment history for ALL materials on the active branch
// (newest first). Drives the audit page.
export async function getBranchStockAdjustments(): Promise<StockAdjustmentResult[]> {
    const response = await api.get(`/stock-adjustments`);
    return (response.data ?? []) as StockAdjustmentResult[];
}

// SuperAdmin-only. Revalues remaining batches / reference cost through the costing
// engine; a 403 means the caller is not a SuperAdmin.
export async function adjustRawMaterialUnitCost(
    materialId: string,
    payload: { newUnitCost: number; reason: string }
): Promise<StockAdjustmentResult> {
    const response = await api.post(`/rawmaterials/${materialId}/unit-cost-adjustments`, payload);
    await invalidateAllMenuCaches();
    return response.data as StockAdjustmentResult;
}

export async function deleteRawMaterial(id: string): Promise<boolean> {
    try {
        await api.delete(`/rawmaterials/${id}`);
        await invalidateAllMenuCaches();
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function getMaterialBatches(
    materialId: string,
    filter: StockBatchFilter = "all"
): Promise<StockBatch[]> {
    try {
        const response = await api.get(`/materials/${materialId}/batches`, {
            params: filter && filter !== "all" ? { filter } : undefined,
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function createStockBatch(data: StockBatchCreateDto): Promise<StockBatch | null> {
    try {
        const response = await api.post('/stock-batches', data);
        return response.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function updateStockBatch(id: string, data: StockBatchUpdateDto): Promise<boolean> {
    try {
        await api.put(`/stock-batches/${id}`, data);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function deleteStockBatch(id: string): Promise<boolean> {
    try {
        await api.delete(`/stock-batches/${id}`);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// --- Public Menu APIs ---

export async function getTablePublic(id: string): Promise<any> { // Replace 'any' with Table type if available in client
    try {
        const response = await fetch(`${API_BASE_URL}/tables/${id}/public`, {
            cache: "no-store",
            headers: getPublicHeaders(),
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch public table:", error);
        return null;
    }
}

export async function uploadProductsExcel(file: File): Promise<any> {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await api.post("/products/import", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });
        await invalidateAllMenuCaches();
        await invalidateOfferCaches();
        return response.data;
    } catch (error) {
        console.error("Upload failed", error);
        return null;
    }
}

/**
 * `customerAccessToken` identifies the signed-in storefront customer who will own the order.
 * The QR dine-in menu omits it; storefront (online) orders are rejected by the API without it.
 */
export async function createPublicOrder(orderData: unknown, branchId?: string, customerAccessToken?: string): Promise<OrderDto> {
    const headers: Record<string, string> = withBranchOverride(getPublicHeaders(), branchId);
    if (customerAccessToken) headers["Authorization"] = `Bearer ${customerAccessToken}`;
    const response = await fetch(`${API_BASE_URL}/orders/public`, {
        method: "POST",
        headers,
        body: JSON.stringify(orderData),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => null) as string | {
            message?: string;
            title?: string;
        } | null;
        const message = typeof body === "string"
            ? body
            : body?.message || body?.title;
        throw Object.assign(new Error(message || `Order request failed (${response.status})`), {
            status: response.status,
            code: typeof body === "object" && body ? (body as { code?: string }).code : undefined,
        });
    }
    return await response.json() as OrderDto;
}

export interface StorefrontQuoteLine {
    productId: string;
    quantity: number;
    offerLineId?: number;
    selectedOptionId?: string;
    modifiers: { modifierId?: string; quantity: number }[];
}

export interface StorefrontQuoteRequest {
    orderType: number;
    deliveryZoneId?: string;
    promoCode?: string;
    items: StorefrontQuoteLine[];
}

export interface StorefrontQuotePromo {
    code?: string | null;
    isApplied: boolean;
    reason?: string | null;
    message: string;
    discountAmount: number;
    eligibleSubtotal: number;
    minOrderAmount?: number | null;
}

/** Server-priced cart preview. Informational only: checkout re-prices everything itself. */
export interface StorefrontQuote {
    subtotal: number;
    promoDiscountAmount: number;
    subtotalAfterDiscount: number;
    deliveryFee: number;
    total: number;
    promo?: StorefrontQuotePromo | null;
}

export async function quotePublicOrder(request: StorefrontQuoteRequest, branchId: string, customerAccessToken?: string): Promise<StorefrontQuote> {
    const headers: Record<string, string> = withBranchOverride(getPublicHeaders(), branchId);
    if (customerAccessToken) headers["Authorization"] = `Bearer ${customerAccessToken}`;
    const response = await fetch(`${API_BASE_URL}/orders/public/quote`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw Object.assign(new Error(body?.message || `Quote request failed (${response.status})`), { status: response.status });
    }
    return await response.json() as StorefrontQuote;
}

export async function getTableActiveOrder(tableId: string): Promise<any[]> {
    try {
        const response = await api.get(`/orders/table/${tableId}/active`);
        return response.data;
    } catch (error: any) {
        console.error("Failed to fetch active order for table:", error);
        return [];
    }
}

export async function getTableAllOrders(tableId: string, ticketId?: number | null): Promise<any[]> {
    try {
        const query = ticketId && ticketId > 0 ? `?ticketId=${ticketId}` : "";
        const response = await api.get(`/orders/table/${tableId}/all${query}`);
        return response.data;
    } catch (error: any) {
        console.error("Failed to fetch all orders for table:", error);
        return [];
    }
}

export async function addItemsToOrder(
    orderId: string,
    items: any[],
    idempotencyKey?: string,
    branchIdOverride?: string,
): Promise<any | null> {
    try {
        const response = await api.post(
            `/orders/${orderId}/items`,
            items,
            { headers: withBranchOverride(getIdempotencyHeaders(idempotencyKey), branchIdOverride) },
        );
        return response.data;
    } catch (error) {
        console.error("Failed to add items to order:", error);
        return null;
    }
}

export async function updateOrderItem(orderId: string, orderItemId: string, item: any): Promise<any | null> {
    try {
        const response = await api.put(`/orders/${orderId}/items/${orderItemId}`, item);
        return response.data;
    } catch (error) {
        console.error("Failed to update order item:", error);
        return null;
    }
}

export async function deleteOrderItem(orderId: string, orderItemId: string): Promise<boolean> {
    try {
        await api.delete(`/orders/${orderId}/items/${orderItemId}`);
        return true;
    } catch (error) {
        console.error("Failed to delete order item:", error);
        return false;
    }
}

export async function deleteOrder(orderId: string): Promise<boolean> {
    try {
        await api.delete(`/orders/${orderId}`);
        return true;
    } catch (error) {
        console.error("Failed to delete order:", error);
        return false;
    }
}

export async function removeOfferFromOrder(orderId: string): Promise<any | null> {
    try {
        const response = await api.delete(`/orders/${orderId}/offer`);
        return response.data;
    } catch (error) {
        console.error("Failed to remove offer from order:", error);
        return null;
    }
}

export async function removeOfferLineFromOrder(orderId: string, offerLineId: number): Promise<any | null> {
    try {
        const response = await api.delete(`/orders/${orderId}/offer-line/${offerLineId}`);
        return response.data;
    } catch (error) {
        console.error("Failed to remove offer line from order:", error);
        return null;
    }
}

export async function setOrderOffer(orderId: string, offerId: number, offerNote?: string | null, offerQty?: number): Promise<any | null> {
    try {
        const response = await api.patch(`/orders/${orderId}/offer`, { offerId, offerNote: offerNote ?? null, offerQty: offerQty ?? 1 });
        return response.data;
    } catch (error) {
        console.error("Failed to set offer on order:", error);
        return null;
    }
}

export async function updateOrderOfferNote(orderId: string, note: string): Promise<any | null> {
    try {
        const response = await api.patch(`/orders/${orderId}/offer-note`, { note });
        return response.data;
    } catch (error) {
        console.error("Failed to update offer note:", error);
        return null;
    }
}

export async function addRecipeItem(data: { productId: string, rawMaterialId: string, amount: number }): Promise<boolean> {
    try {
        // Only send DTO fields
        await api.post(`/products/${data.productId}/recipes`, {
            rawMaterialId: data.rawMaterialId,
            amount: data.amount
        });
        return true;
    } catch (error) {
        console.error("addRecipeItem failed:", error);
        throw error; // Re-throw to be caught by UI
    }
}

export async function deleteRecipeItem(id: string): Promise<boolean> {
    try {
        await api.delete(`/recipeitems/${id}`);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function updateRecipeItem(id: string, amount: number): Promise<boolean> {
    try {
        await api.put(`/recipeitems/${id}`, { amount });
        return true;
    } catch (error) {
        console.error("updateRecipeItem failed:", error);
        return false;
    }
}
/**
 * Upload result — extended (non-breaking) shape.
 *
 * `url` continues to be the absolute URL of the original file, unchanged from
 * the pre-pipeline contract. New callers may also persist `imageKey` on the
 * product record so future page loads render the optimized WebP variants
 * (lib/product-image.ts). The field is optional: a backend that fails to
 * produce variants still returns a valid `url` and the legacy path keeps
 * working without any caller changes.
 */
export interface UploadImageResult {
    url: string;
    imageKey?: string;
    fileName?: string;
    contentType?: string;
}

/**
 * Backward-compatible overload: existing callers that treat `uploadImage` as
 * `Promise<string | null>` continue to work. New callers pass `{ detailed: true }`
 * to receive the full result with `imageKey`.
 */
export async function uploadImage(file: File): Promise<string | null>;
export async function uploadImage(file: File, opts: { detailed: true }): Promise<UploadImageResult | null>;
export async function uploadImage(
    file: File,
    opts?: { detailed?: boolean }
): Promise<string | UploadImageResult | null> {
    try {
        const formData = new FormData();
        formData.append("file", file);
        // Use config and useAuthStore directly — both are top-level imports
        // and available before API_BASE_URL / getAuthHeaders are declared below.
        const token = useAuthStore.getState().user?.token;
        const baseUrl = config.apiBaseUrl;

        const response = await fetch(`${baseUrl}/uploads/image`, {
            method: "POST",
            headers: {
                // No Content-Type — browser sets multipart/form-data boundary automatically
                ...getTenantHeaders(),
                ...getBranchHeaders(),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Upload failed (${response.status}): ${err}`);
        }

        const data = await response.json();
        if (opts?.detailed) {
            return {
                url: data.url as string,
                imageKey: typeof data.imageKey === "string" ? data.imageKey : undefined,
                fileName: typeof data.fileName === "string" ? data.fileName : undefined,
                contentType: typeof data.contentType === "string" ? data.contentType : undefined,
            };
        }
        return data.url as string;
    } catch (error) {
        console.error("uploadImage failed:", error);
        return null;
    }
}
const API_BASE_URL = config.apiBaseUrl;
const inFlightPayments = new Map<string, Promise<OrderPaymentResult | null>>();

const getPreferredLanguage = () => {
    if (typeof window === "undefined") {
        return "en";
    }

    return localStorage.getItem("app_language") || "en";
};

const getAuthHeaders = (idempotencyKey?: string) => {

    const token = useAuthStore.getState().user?.token;
    return {
        "Content-Type": "application/json",
        "Accept-Language": getPreferredLanguage(),
        ...getTenantHeaders(),
        ...getBranchHeaders(),
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...getIdempotencyHeaders(idempotencyKey),
    };
};

const getPublicHeadersForLanguage = (language: string) => ({
    "Content-Type": "application/json",
    "Accept-Language": language === "ar" ? "ar" : "en",
    ...getTenantHeaders(),
});

const getPublicHeaders = () => getPublicHeadersForLanguage(getPreferredLanguage());

function mapPublicProduct(product: ProductDto): ProductDto {
    return {
        ...product,
        modifierGroups: (product.modifierGroups || []).map((group: ModifierGroupDto) => ({
            ...group,
            modifiers: (group.modifiers || []).map((modifier: ModifierDto) => ({
                ...modifier,
            })),
        })),
    };
}

function mapPublicCategory(category: CategoryDto): CategoryDto {
    return {
        ...category,
    };
}

async function fetchPublicProductsFromApi(language: string): Promise<ProductDto[]> {
    const response = await fetch(`${API_BASE_URL}/products/public`, {
        cache: "no-store",
        headers: getPublicHeadersForLanguage(language),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch public products: ${response.statusText}`);
    }

    const data = await response.json();
    return (data || []).map((product: ProductDto) => mapPublicProduct(product));
}

async function fetchPublicCategoriesFromApi(language: string): Promise<CategoryDto[]> {
    const response = await fetch(`${API_BASE_URL}/categories/public`, {
        cache: "no-store",
        headers: getPublicHeadersForLanguage(language),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch public categories: ${response.statusText}`);
    }

    const data = await response.json();
    return (data || []).map((category: CategoryDto) => mapPublicCategory(category));
}

// Coalesce simultaneous network fetches for the same language so multiple
// components mounting at once share one /products/public + /categories/public
// pair instead of each firing their own. Keyed by language because the AR
// and EN payloads differ; cleared on settle so the IDB-cache short-circuit
// stays the primary path.
const inFlightMenuFetches = new Map<
    string,
    Promise<{ products: ProductDto[]; categories: CategoryDto[]; lastUpdated: number }>
>();

export async function getPublicMenuData(
    language: string = getPreferredLanguage(),
    options?: { forceRefresh?: boolean },
): Promise<{ products: ProductDto[]; categories: CategoryDto[]; lastUpdated: number }> {
    const normalizedLanguage = language === "ar" ? "ar" : "en";
    const cached = await readMenuCache(normalizedLanguage);
    const cachedHasData = !!cached && (cached.products.length > 0 || cached.categories.length > 0);
    const connectivity = getConnectivityState();

    if (!options?.forceRefresh) {
        if (connectivity !== "online" && cached) {
            return cached;
        }

        if (cachedHasData && !isMenuCacheStale(cached.lastUpdated)) {
            return cached;
        }
    }

    const existing = inFlightMenuFetches.get(normalizedLanguage);
    if (existing) return existing;

    const fetchPromise = (async () => {
        try {
            const [products, categories] = await Promise.all([
                fetchPublicProductsFromApi(normalizedLanguage),
                fetchPublicCategoriesFromApi(normalizedLanguage),
            ]);

            return await writeMenuCache(normalizedLanguage, { products, categories });
        } catch (error) {
            if (cached) {
                return cached;
            }

            console.error("Failed to fetch public menu data:", error);
            return {
                products: [],
                categories: [],
                lastUpdated: 0,
            };
        } finally {
            inFlightMenuFetches.delete(normalizedLanguage);
        }
    })();

    inFlightMenuFetches.set(normalizedLanguage, fetchPromise);
    return fetchPromise;
}

// --- Table Categories ---

export async function getTableCategories(): Promise<TableCategoryDto[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/tablecategories`, {
            cache: "no-store",
            headers: getAuthHeaders(),
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch table categories:", error);
        return [];
    }
}

export async function createTableCategory(name: string, nameAr?: string, color?: string): Promise<TableCategoryDto | null> {
    const response = await fetch(`${API_BASE_URL}/tablecategories`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, nameAr, color })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error: any = new Error(data?.message || "Failed to create category");
        error.response = { status: response.status, data };
        throw error;
    }
    return response.json();
}

export async function updateTableCategory(id: string, name: string, nameAr?: string, color?: string): Promise<TableCategoryDto> {
    const response = await fetch(`${API_BASE_URL}/tablecategories/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, nameAr, color })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error: any = new Error(data?.message || "Failed to update category");
        error.response = { status: response.status, data };
        throw error;
    }
    return response.json();
}

export async function deleteTableCategory(id: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/tablecategories/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to delete table category:", error);
        return false;
    }
}

// --- Tables ---

export async function getTables(): Promise<Table[]> {
    // Tables are branch-owned server-side — key the offline cache per branch so
    // a branch switch never serves the previous branch's floor plan.
    return cachedReferenceList<Table>(`tables:${getSelectedBranchCacheKey()}`, async () => {
        const response = await fetch(`${API_BASE_URL}/tables`, {
            cache: "no-store",
            headers: getAuthHeaders(),
        });
        if (!response.ok) return [];
        const data = await response.json();
        return (data || []).map((table: Table) => ({
            ...table,
            name: table.displayName || table.name,
        }));
    });
}

export async function createTable(name: string, capacity: number, nameAr?: string, tableCategoryId?: string): Promise<Table> {
    const response = await fetch(`${API_BASE_URL}/tables`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, nameAr, capacity, status: TableStatus.Free, tableCategoryId: tableCategoryId ?? null })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error: any = new Error(data?.message || "Failed to create table");
        error.response = { status: response.status, data };
        throw error;
    }
    return response.json();
}

export async function updateTable(id: string, name: string, capacity: number, nameAr?: string, tableCategoryId?: string): Promise<Table> {
    const response = await fetch(`${API_BASE_URL}/tables/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, nameAr, capacity, tableCategoryId: tableCategoryId ?? null })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error: any = new Error(data?.message || "Failed to update table");
        error.response = { status: response.status, data };
        throw error;
    }
    return response.json();
}

export async function deleteTable(id: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/tables/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to delete table:", error);
        return false;
    }
}

export async function updateTableStatus(id: string, status: TableStatus): Promise<boolean> {
    try {
        console.log(`[API] updateTableStatus: id=${id}, status=${status}`);
        const response = await fetch(`${API_BASE_URL}/tables/${id}/status`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(status)
        });
        console.log(`[API] updateTableStatus response: ${response.status} (${response.statusText})`);
        return response.ok;
    } catch (error) {
        console.error("[API] Failed to update table status:", error);
        return false;
    }
}

export async function resetTable(id: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/tables/${id}/reset`, {
            method: "PUT",
            headers: getAuthHeaders()
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to reset table:", error);
        return false;
    }
}

function normalizeProduct(product: ProductDto): ProductDto {
    return {
        ...product,
        categoryName: product.categoryDisplayName || product.categoryName,
        modifierGroups: (product.modifierGroups || []).map((group: ModifierGroupDto) => ({
            ...group,
            modifiers: (group.modifiers || []).map((modifier: ModifierDto) => ({
                ...modifier,
            })),
        })),
    };
}

export async function getProducts(): Promise<ProductDto[]> {
    return cachedReferenceList<ProductDto>("products", async () => {
        const response = await fetch(`${API_BASE_URL}/products`, {
            cache: "no-store",
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Error fetching products: ${response.statusText}`);
        }

        const data = await response.json();
        return (data || []).map(normalizeProduct);
    });
}

function buildCashierProductsUrl(deliveryPartnerId?: string | null): string {
    // String concatenation rather than `new URL(...)` because API_BASE_URL is a
    // relative path (`/api/api-proxy`) in BFF proxy mode, and the URL constructor
    // throws "Invalid URL" on relative inputs. This previously failed silently —
    // cachedReferenceList caught the exception and returned [] from IDB, hiding
    // the bug for months. See getProducts() for the same string-concat pattern.
    const qs = deliveryPartnerId ? `?deliveryPartnerId=${encodeURIComponent(deliveryPartnerId)}` : "";
    return `${API_BASE_URL}/products/cashier${qs}`;
}

export async function getCashierProducts(deliveryPartnerId?: string | null): Promise<ProductDto[]> {
    const cacheKey = `products:cashier:${getSelectedBranchCacheKey()}:${deliveryPartnerId || "pos"}`;
    return cachedReferenceList<ProductDto>(cacheKey, async () => {
        const response = await fetch(buildCashierProductsUrl(deliveryPartnerId), {
            cache: "no-store",
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Error fetching cashier products: ${response.statusText}`);
        }

        const data = await response.json();
        return (data || []).map(normalizeProduct);
    });
}

/**
 * Direct (uncached) variant of getCashierProducts. Bypasses cachedReferenceList
 * so transport errors (504, 500, network) propagate as thrown exceptions instead
 * of silently degrading to an empty IDB fallback. Use in interactive flows
 * where the cashier must SEE why pricing failed to load.
 */
export async function getCashierProductsDirect(deliveryPartnerId?: string | null): Promise<ProductDto[]> {
    const response = await fetch(buildCashierProductsUrl(deliveryPartnerId), {
        cache: "no-store",
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`getCashierProducts ${response.status} ${response.statusText} — ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    return (data || []).map(normalizeProduct);
}

export async function getProductsPaginated(
    pageNumber: number = 1,
    pageSize: number = 10,
    search: string = "",
    categoryId?: string,
    status?: "active" | "inactive" | "all",
    stationRouting?: number
): Promise<PaginatedResult<ProductDto>> {
    const params: Record<string, any> = { pageNumber, pageSize };
    if (search.trim()) params.search = search.trim();
    if (categoryId) params.categoryId = categoryId;
    if (status && status !== "all") params.status = status;
    if (stationRouting !== undefined) params.stationRouting = stationRouting;
    const response = await api.get('/products/paginated', { params });
    return {
        items: (response.data?.items || []).map((product: ProductDto) => ({
            ...product,
            categoryName: product.categoryDisplayName || product.categoryName,
        })),
        totalCount: response.data?.totalCount ?? 0,
        pageNumber: response.data?.pageNumber ?? pageNumber,
        pageSize: response.data?.pageSize ?? pageSize,
    };
}

export async function createProduct(productData: any): Promise<ProductDto> {
    const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(productData),
    });

    if (!response.ok || response.status !== 201) {
        const errorText = await response.text();
        let errorData: any = null;
        try { errorData = JSON.parse(errorText); } catch { /* not JSON */ }
        const err: any = new Error(errorData?.message || errorText || response.statusText);
        err.response = { status: response.status, data: errorData };
        throw err;
    }
    await invalidateAllMenuCaches();
    await invalidateOfferCaches();
    return await response.json();
}

export async function updateProduct(id: string, productData: any): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(productData),
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = null;
        try { errorData = JSON.parse(errorText); } catch { /* not JSON */ }
        const err: any = new Error(errorData?.message || errorText || response.statusText);
        err.response = { status: response.status, data: errorData };
        throw err;
    }
    await invalidateAllMenuCaches();
    await invalidateOfferCaches();
    return true;
}

export async function deleteProduct(id: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error deleting product: ${response.status} ${response.statusText} - ${errorText}`);
        }
        await invalidateAllMenuCaches();
        await invalidateOfferCaches();
        return true;
    } catch (error) {
        console.error("Failed to delete product:", error);
        return false;
    }
}

export async function getOffers(): Promise<OfferResponseDto[]> {
    // Offers are branch-enabled server-side, so the reference cache must be keyed
    // per branch (same pattern as the cashier products cache) or a branch switch
    // would keep serving the previous branch's offers.
    const cacheKey = `offers:active:${getSelectedBranchCacheKey()}`;
    return cachedReferenceList<OfferResponseDto>(cacheKey, async () => {
        try {
            const response = await api.get<OfferResponseDto[]>('/offers');
            const offers = response.data || [];
            await persistOfferCache(OFFER_CACHE_KEYS.active, offers);
            return offers;
        } catch (error) {
            console.error("Failed to fetch offers:", error);
            return await readOfferCache(OFFER_CACHE_KEYS.active);
        }
    });
}

export async function getPublicProducts(language: string = getPreferredLanguage()): Promise<ProductDto[]> {
    const snapshot = await getPublicMenuData(language);
    return snapshot.products;
}

export async function getPublicMenuOffers(): Promise<OfferResponseDto[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/offers/public`, {
            cache: "no-store",
            headers: getPublicHeaders(),
        });
        if (!response.ok) throw new Error(response.statusText);
        const offers = await response.json() as OfferResponseDto[];
        await persistOfferCache(OFFER_CACHE_KEYS.public, offers);
        return offers;
    } catch (error) {
        console.error("Failed to fetch public menu offers:", error);
        return await readOfferCache(OFFER_CACHE_KEYS.public);
    }
}

export async function getPublicAvailableMenuOffers(): Promise<OfferResponseDto[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/offers/public/available`, {
            cache: "no-store",
            headers: getPublicHeaders(),
        });
        if (!response.ok) throw new Error(response.statusText);
        const offers = await response.json() as OfferResponseDto[];
        await persistOfferCache(OFFER_CACHE_KEYS.publicAvailable, offers);
        return offers;
    } catch (error) {
        console.error("Failed to fetch public available menu offers:", error);
        return await readOfferCache(OFFER_CACHE_KEYS.publicAvailable);
    }
}

export async function getAllOffers(): Promise<OfferResponseDto[]> {
    try {
        const response = await api.get<OfferResponseDto[]>('/offers/all');
        const offers = response.data || [];
        await persistOfferCache(OFFER_CACHE_KEYS.admin, offers);
        return offers;
    } catch (error) {
        console.error("Failed to fetch all offers:", error);
        return await readOfferCache(OFFER_CACHE_KEYS.admin);
    }
}

export async function createOffer(data: CreateOfferRequest): Promise<OfferResponseDto | null> {
    try {
        const response = await api.post<OfferResponseDto>('/offers', data);
        return response.data;
    } catch (error) {
        console.error("Failed to create offer:", error);
        throw error;
    }
}

export async function updateOffer(id: number, data: CreateOfferRequest): Promise<OfferResponseDto | null> {
    try {
        const response = await api.put<OfferResponseDto>(`/offers/${id}`, data);
        return response.data;
    } catch (error) {
        console.error("Failed to update offer:", error);
        throw error;
    }
}

export async function deleteOffer(id: number): Promise<boolean> {
    try {
        await api.delete(`/offers/${id}`);
        return true;
    } catch (error) {
        console.error("Failed to delete offer:", error);
        return false;
    }
}

export async function deactivateOffer(id: number): Promise<boolean> {
    try {
        await api.put(`/offers/${id}/deactivate`);
        return true;
    } catch (error) {
        console.error("Failed to deactivate offer:", error);
        return false;
    }
}

export async function reactivateOffer(id: number): Promise<boolean> {
    try {
        await api.put(`/offers/${id}/reactivate`);
        return true;
    } catch (error) {
        console.error("Failed to reactivate offer:", error);
        return false;
    }
}

export async function createOrder(orderData: OrderCreateDto): Promise<boolean> {
    const dto = await createOrderAndReturn(orderData);
    return dto !== null;
}

/**
 * Throwing variant — returns the full OrderDto so the caller can capture
 * the server-generated id (needed by the offline queue to map the client's
 * synthetic id to the real one before dispatching dependent actions).
 * Network/HTTP failures propagate as thrown errors.
 */
export async function createOrderAndReturn(orderData: OrderCreateDto, branchIdOverride?: string): Promise<OrderDto | null> {
    const createKey = stableOrderCreateKey(orderData);
    const existing = inFlightOrderCreates.get(createKey);
    if (existing) return existing;

    const request = (async () => {
        // Guid-typed DTO fields must never be sent as "": System.Text.Json
        // fails to bind "" to Guid, ASP.NET returns an automatic 400
        // ($.tenantId + "The input field is required.") before the controller
        // runs. Empty values are dropped so the backend's tenant/branch
        // resolvers take over. This is the single POST /orders chokepoint, so
        // it also repairs stale offline-queue payloads persisted before this fix.
        const payload: OrderCreateDto = {
            ...orderData,
            tenantId: orderData.tenantId || undefined,
            tableId: orderData.tableId || undefined,
            customerId: orderData.customerId || undefined,
            deliveryZoneId: orderData.deliveryZoneId || undefined,
            deliveryPartnerId: orderData.deliveryPartnerId || undefined,
            clientOrderUUID: orderData.clientOrderUUID ?? generateClientOrderUUID(),
            orderSequenceNumber: undefined,
        };
        const idempotencyKey = getOrderCreateIdempotencyKey(payload);
        const requestBody = JSON.stringify(payload);
        if (process.env.NODE_ENV === "development") {
            console.info("[OrderCreate] request body", requestBody);
        }
        // fetchWithTimeout caps the request so a hung connection doesn't block
        // the online-first flow indefinitely. Timeout/abort errors fall back
        // to the offline queue.
        const response = await fetchWithTimeout(`${API_BASE_URL}/orders`, {
            method: "POST",
            headers: withBranchOverride(getAuthHeaders(idempotencyKey), branchIdOverride),
            body: requestBody,
        });

        if (!response.ok) {
            const errorText = await response.text();
            // Shape the error so the offline queue's failure classifier (looks for
            // err.response.status) treats 4xx as hard fails instead of retrying forever.
            let parsed: unknown = errorText;
            try { parsed = JSON.parse(errorText); } catch { /* keep as text */ }
            const err = new Error(`Error creating order: ${response.status} ${response.statusText} - ${errorText}`) as Error & {
                response?: { status: number; data?: unknown };
            };
            err.response = { status: response.status, data: typeof parsed === "object" && parsed ? parsed as Record<string, unknown> : { message: errorText } };
            throw err;
        }

        return (await response.json()) as OrderDto;
    })();

    inFlightOrderCreates.set(createKey, request);
    try {
        return await request;
    } finally {
        inFlightOrderCreates.delete(createKey);
    }
}

function getOrderCreateIdempotencyKey(payload: OrderCreateDto): string {
    if (payload.publicOrderNumber) {
        return `order:${payload.publicOrderNumber}`;
    }

    return payload.clientOrderUUID!;
}

export async function validateOrderPrice(request: ValidatePriceRequest): Promise<ValidatePriceResponse | null> {
    try {
        const response = await api.post<ValidatePriceResponse>('/orders/validate-price', request);
        return response.data;
    } catch (error) {
        console.error("Failed to validate order price:", error);
        return null;
    }
}

// Errors must propagate so the online-first wrapper (createOrderSmart) can
// classify them: 4xx client failures stop the flow with a toast, network/5xx
// failures fall through to the offline queue. Swallowing errors here would
// erase that signal and force every failure into an offline-queue write.
export async function createTakeawayOrder(orderData: OrderCreateDto): Promise<OrderDto | null> {
    return await createOrderAndReturn({
        ...orderData,
        orderType: orderData.orderType ?? 1,
        customerPhone: orderData.customerPhone || undefined,
    });
}

function stableOrderCreateKey(orderData: OrderCreateDto): string {
    // clientOrderUUID is excluded so identical payloads dispatched with
    // different pre-generated UUIDs still coalesce against the same in-flight
    // promise (rapid double-click protection survives the online-first
    // pre-generation step).
    return stableJson({
        ...orderData,
        clientOrderUUID: undefined,
        publicOrderNumber: undefined,
        customerPhone: orderData.customerPhone || undefined,
        items: orderData.items ?? [],
    });
}

function stableJson(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    return `{${Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
        .join(",")}}`;
}

export async function getActiveTakeawayOrders(): Promise<OrderDto[]> {
    const cacheKey = `takeaway:active:${getSelectedBranchCacheKey()}`;
    return cachedReferenceFetch<OrderDto[]>(cacheKey, async () => {
        const response = await fetch(`${API_BASE_URL}/orders/takeaway/active`, {
            cache: "no-store",
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            console.error("Failed to fetch takeaway orders:", response.statusText);
            throw new Error(`Error fetching takeaway orders: ${response.statusText}`);
        }

        return await response.json();
    }, () => false, []);
}

export async function getActiveOrders(): Promise<any[]> {
    try {
        return await getActiveOrdersStrict();
    } catch (error) {
        console.error("Failed to fetch active orders:", error);
        return [];
    }
}

export async function getActiveOrdersStrict(): Promise<OrderDto[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/orders/active`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw await createResponseError(response, "Failed to fetch active orders.");
    }
    return (await response.json()) as OrderDto[];
}

export async function getKitchenOrders(filter: 'today' | 'all' = 'today'): Promise<any[]> {
    return cachedReferenceList<any>(`kitchen:${getSelectedBranchCacheKey()}:${filter}`, async () => {
        const response = await fetch(`${API_BASE_URL}/orders/kitchen?filter=${filter}`, {
            cache: "no-store",
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Error fetching kitchen orders: ${response.statusText}`);
        }
        return await response.json();
    });
}

export async function markOrderAsReady(orderId: string, idempotencyKey?: string): Promise<boolean> {
    try {
        await markOrderAsReadyStrict(orderId, idempotencyKey);
        return true;
    } catch (error) {
        // Recoverable: the caller falls back to the offline queue when this
        // returns false (e.g. a 504 Gateway Timeout or a dropped connection),
        // so the order is never lost. Log as a warning, not an error, so dev
        // tooling doesn't surface a red "Console Error" for a handled retry.
        console.warn("Marking order ready failed; will fall back to offline queue:", error);
        return false;
    }
}

export async function markOrderAsReadyStrict(
    orderId: string,
    idempotencyKey?: string,
    branchIdOverride?: string
): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/orders/${orderId}/ready`, {
        method: "PUT",
        headers: withBranchOverride(getAuthHeaders(idempotencyKey), branchIdOverride),
    });
    if (!response.ok) {
        throw await createResponseError(response, "Failed to mark order ready.");
    }
}

export async function markOnlineOrderPreparingStrict(orderId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/orders/${orderId}/preparing`, {
        method: "PUT",
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw await createResponseError(response, "Failed to start preparing the order.");
    }
}

export async function markOnlineOrderDispatchedStrict(orderId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/orders/${orderId}/dispatch`, {
        method: "PUT",
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw await createResponseError(response, "Failed to dispatch the order.");
    }
}

export async function markOrderItemAsReady(orderId: string, orderItemId: string): Promise<{ allReady: boolean; orderStatus: string } | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/items/${orderItemId}/ready`, {
            method: "PUT",
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Error marking item ready: HTTP ${response.status}${body ? ` — ${body}` : ''}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to mark order item ready:", error);
        return null;
    }
}

// ─── Order Tracker (public, no auth) ──────────────────────
export interface TrackerOrder {
    id: string;
    orderNumber: string;
    orderSequenceNumber?: string | null;
    orderType: string; // "DineIn" | "Takeaway"
    status: string;    // "Preparing" | "Ready"
    isPaid: boolean;   // true when the order has been paid (Takeaway: shows "Reserved" button when Ready+Paid)
    createdAt: string;
}

export interface OrderPaymentResult {
    orderId: string;
    status?: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
    isPaid: boolean;
    paymentMethod?: string;
    amountTendered?: number;
    changeAmount?: number;
    isVoucherApplied?: boolean;
    voucherDiscountAmount?: number;
    voucherAppliedAt?: string | null;
    discountType?: import("@/types/order").OrderDiscountType | null;
    discountValue?: number;
    discountAmount?: number;
    discountAppliedByName?: string | null;
    discountAppliedAt?: string | null;
    voucherRemainingToday?: number | null;
    payment: {
        id: string;
        amount: number;
        method: string;
        paymentMethodId?: string | null;
        paymentMethodName?: string | null;
        paymentMethodNameAr?: string | null;
        paymentMethodCode?: string | null;
        referenceNumber?: string | null;
        createdAt: string;
    };
    payments: Array<{
        id: string;
        amount: number;
        method: string;
        paymentMethodId?: string | null;
        paymentMethodName?: string | null;
        paymentMethodNameAr?: string | null;
        paymentMethodCode?: string | null;
        referenceNumber?: string | null;
        createdAt: string;
    }>;
}

export interface VoucherAvailability {
    enabled: boolean;
    voucherAmount: number;
    dailyLimit: number;
    usedToday: number;
    remainingToday: number;
    businessDate: string;
}

export interface VoucherAuditItem {
    orderId: string;
    orderNumber: string;
    orderSequenceNumber?: string | null;
    usedAt: string;
    discountAmount: number;
    createdByName?: string | null;
}

export interface VoucherAuditSummary extends VoucherAvailability {
    orders: VoucherAuditItem[];
}

export async function getTrackerOrders(): Promise<TrackerOrder[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/tracker`, {
            cache: "no-store",
        });
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch tracker orders:", error);
        return [];
    }
}

export async function markOrderAsServed(orderId: string, idempotencyKey?: string): Promise<boolean> {
    try {
        await markOrderAsServedStrict(orderId, idempotencyKey);
        return true;
    } catch (error) {
        console.error("[markOrderAsServed] network error:", error);
        return false;
    }
}

export async function markOrderAsServedStrict(
    orderId: string,
    idempotencyKey?: string,
    branchIdOverride?: string
): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/orders/${orderId}/served`, {
        method: "PUT",
        headers: withBranchOverride(getAuthHeaders(idempotencyKey), branchIdOverride),
    });
    if (!response.ok) {
        throw await createResponseError(response, "Failed to mark order served.");
    }
}

/**
 * Records the takeaway handoff. The server promotes the order to Completed
 * once payment and readiness are also present.
 */
export async function markTakeawayPickedUp(orderId: string, idempotencyKey?: string): Promise<boolean> {
    try {
        await markTakeawayPickedUpStrict(orderId, idempotencyKey);
        return true;
    } catch (error) {
        console.error("Failed to mark takeaway as picked up:", error);
        return false;
    }
}

export async function markTakeawayPickedUpStrict(
    orderId: string,
    idempotencyKey?: string,
    branchIdOverride?: string
): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/orders/${orderId}/pickup`, {
        method: "PUT",
        headers: withBranchOverride(getAuthHeaders(idempotencyKey), branchIdOverride),
    });
    if (!response.ok) {
        throw await createResponseError(response, "Failed to mark takeaway picked up.");
    }
}

export type CashierOrdersDateFilter = "active" | "today" | "mine" | "week" | "month" | "recent" | "all";

interface CashierOrdersQuery {
    page?: number;
    pageSize?: number;
}

export async function getCashierOrders(dateFilter: CashierOrdersDateFilter = "today", query?: CashierOrdersQuery): Promise<OrderDto[]> {
    try {
        return await getCashierOrdersStrict(dateFilter, query);
    } catch (error) {
        console.error("Failed to fetch cashier orders:", error);
        return [];
    }
}

/**
 * Throwing variant of `getCashierOrders`. Use when the caller needs to
 * distinguish a network/server failure from an authentic empty result
 * (e.g. the cashier page, which falls back to the IDB cache on failure).
 */
export async function getCashierOrdersStrict(
    dateFilter: CashierOrdersDateFilter = "today",
    query?: CashierOrdersQuery,
): Promise<OrderDto[]> {
    const params = new URLSearchParams();
    params.set("dateFilter", dateFilter === "mine" ? "today" : dateFilter);
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    const url = `${API_BASE_URL}/orders/cashier${params.size ? `?${params}` : ""}`;
    const response = await fetch(url, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Error fetching cashier orders: ${response.statusText}`);
    }

    return (await response.json()) as OrderDto[];
}

export async function getCashierBalanceShifts(params?: {
    isClosed?: boolean;
    cashierId?: string;
    from?: string;
    to?: string;
}): Promise<CashierBalanceShift[]> {
    try {
        const response = await api.get<CashierBalanceShift[]>("/cashierbalance", { params });
        return response.data || [];
    } catch (error) {
        console.error("Failed to fetch cashier balance shifts:", error);
        return [];
    }
}

export async function getAdminCashierBalanceShifts(params?: {
    isClosed?: boolean;
    cashierId?: string;
    from?: string;
    to?: string;
    toExclusive?: string;
}): Promise<CashierBalanceShift[]> {
    try {
        const response = await api.get<CashierBalanceShift[]>("/admin/cashier-balances", { params });
        return response.data || [];
    } catch (error) {
        console.error("Failed to fetch admin cashier balance shifts:", error);
        return [];
    }
}

export async function getActiveCashierShift(cashierId: string): Promise<CashierBalanceShift | null> {
    try {
        const response = await api.get<CashierBalanceShift>(`/cashierbalance/active/${cashierId}`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch active cashier shift:", error);
        return null;
    }
}

export async function openCashierShift(payload: OpenCashierShiftPayload): Promise<CashierBalanceShift | null> {
    try {
        const response = await api.post<CashierBalanceShift>("/cashierbalance/open", payload);
        return response.data;
    } catch (error) {
        console.error("Failed to open cashier shift:", error);
        return null;
    }
}

export async function openMyCashierShift(payload?: { openingBalance?: number; notes?: string | null; clientActionId?: string; branchIdOverride?: string }): Promise<CashierBalanceShift | null> {
    try {
        const body = {
            openingBalance: payload?.openingBalance ?? 0,
            notes: payload?.notes ?? null,
            clientActionId: payload?.clientActionId,
        };
        const response = await api.post<CashierBalanceShift>(
            "/cashierbalance/open-self",
            body,
            { headers: withBranchOverride(getIdempotencyHeaders(payload?.clientActionId), payload?.branchIdOverride) },
        );
        return response.data;
    } catch (error) {
        console.error("Failed to open own cashier shift:", error);
        return null;
    }
}

export async function closeCashierShift(shiftId: string, payload: CloseCashierShiftPayload, branchIdOverride?: string): Promise<CashierBalanceShift | null> {
    const response = await api.put<CashierBalanceShift>(
        `/cashierbalance/${shiftId}/close`,
        payload,
        { headers: withBranchOverride(getIdempotencyHeaders(payload.clientActionId), branchIdOverride) },
    );
    return response.data;
}

export interface CashierShiftOwnerOption {
    userId: string;
    username: string;
    fullName: string;
    role: "Admin" | "Cashier";
}

export async function getCashierShiftOwners(): Promise<CashierShiftOwnerOption[]> {
    const response = await api.get<CashierShiftOwnerOption[]>("/admin/cashier-balances/cashiers");
    return response.data || [];
}

function buildOrderFilterParams(filters: OrderFilters): Record<string, string | number> {
    const params: Record<string, string | number> = {
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
        sort: filters.sort ?? "newest",
    };

    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.status && filters.status !== "all") params.status = filters.status;
    if (filters.payment && filters.payment !== "all") params.payment = filters.payment;
    if (filters.type && filters.type !== "all") params.type = filters.type;
    if (filters.source && filters.source !== "all") params.source = filters.source;
    if (filters.branchId) params.branchId = filters.branchId;
    if (typeof filters.voucherApplied === "boolean") params.voucherApplied = String(filters.voucherApplied);
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;

    return params;
}

export async function getOrders(filters: OrderFilters): Promise<PaginatedResult<OrderListItemDto>> {
    const pageNumber = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const response = await api.get<PaginatedResult<OrderListItemDto>>("/orders", {
        params: buildOrderFilterParams(filters),
    });

    return {
        items: response.data?.items || [],
        totalCount: response.data?.totalCount ?? 0,
        pageNumber: response.data?.pageNumber ?? pageNumber,
        pageSize: response.data?.pageSize ?? pageSize,
    };
}

export async function getOrdersSummary(filters: OrderFilters): Promise<OrderSummaryDto> {
    const response = await api.get<OrderSummaryDto>("/orders/summary", {
        params: buildOrderFilterParams({ ...filters, page: 1, pageSize: 1 }),
    });

    return response.data ?? { totalCount: 0, activeCount: 0, paidCount: 0, revenue: 0, voucherCount: 0, voucherDiscountTotal: 0 };
}

export async function exportOrdersCsv(filters: OrderFilters): Promise<Blob> {
    const searchParams = new URLSearchParams();
    Object.entries(buildOrderFilterParams({ ...filters, page: 1, pageSize: 1 })).forEach(([key, value]) => {
        searchParams.append(key, String(value));
    });

    const queryString = searchParams.toString();
    const response = await fetch(`${API_BASE_URL}/orders/export${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(await response.text() || response.statusText);
    }

    return response.blob();
}

export async function getVoucherAvailability(): Promise<VoucherAvailability | null> {
    try {
        const response = await api.get<VoucherAvailability>("/vouchers/availability");
        return response.data;
    } catch (error) {
        console.error("Failed to fetch voucher availability:", error);
        return null;
    }
}

export async function getVoucherAuditToday(): Promise<VoucherAuditSummary | null> {
    try {
        const response = await api.get<VoucherAuditSummary>("/vouchers/audit/today");
        return response.data;
    } catch (error) {
        console.error("Failed to fetch voucher audit:", error);
        return null;
    }
}

export async function getOrderById(orderId: string): Promise<OrderDto> {
    const response = await api.get<OrderDto>(`/orders/${orderId}`);
    return response.data;
}

export async function updatePartnerDiscountOverride(
    orderId: string,
    orderItemId: string,
    payload: PartnerDiscountOverridePayload
): Promise<PartnerDiscountOverrideDto> {
    const response = await api.patch<PartnerDiscountOverrideDto>(
        `/orders/${orderId}/items/${orderItemId}/partner-discount`,
        payload
    );
    return response.data;
}

export async function updateDeliveryPartnerPriceAdjustment(
    orderId: string,
    payload: DeliveryPartnerPriceAdjustmentPayload
): Promise<OrderDto> {
    const response = await api.patch<OrderDto>(
        `/orders/${orderId}/delivery-partner-price-adjustment`,
        payload
    );
    return response.data;
}

export async function updateOrderTotalOverride(
    orderId: string,
    payload: OrderTotalOverridePayload
): Promise<OrderTotalOverrideDto> {
    const response = await api.patch<OrderTotalOverrideDto>(
        `/orders/${orderId}/price-override`,
        payload
    );
    return response.data;
}

export async function getPartnerDiscountOverrideAudits(orderId: string): Promise<PartnerPriceOverrideAuditDto[]> {
    const response = await api.get<PartnerPriceOverrideAuditDto[]>(
        `/orders/${orderId}/partner-discount/audits`
    );
    return response.data;
}

export async function getOrdersPaginated(
    pageNumber: number = 1,
    pageSize: number = 10,
    search: string = "",
    status?: string
): Promise<PaginatedResult<OrderListItemDto>> {
    return getOrders({ page: pageNumber, pageSize, search, status });
}

export async function payOrder(
    orderId: string,
    paymentMethod: string,
    serviceChargeRate?: number,
    taxRate?: number,
    customerPhone?: string,
    amountTendered?: number,
    applyVoucher?: boolean,
    idempotencyKey?: string,
): Promise<boolean> {
    try {
        await payOrderStrict(
            orderId,
            paymentMethod,
            serviceChargeRate,
            taxRate,
            customerPhone,
            amountTendered,
            applyVoucher,
            idempotencyKey
        );
        return true;
    } catch (error) {
        console.error("Failed to pay order:", error);
        return false;
    }
}

export async function payOrderStrict(
    orderId: string,
    paymentMethod: string,
    serviceChargeRate?: number,
    taxRate?: number,
    customerPhone?: string,
    amountTendered?: number,
    applyVoucher?: boolean,
    idempotencyKey?: string,
    branchIdOverride?: string,
): Promise<void> {
    const params = new URLSearchParams({ paymentMethod });
    if (serviceChargeRate !== undefined) params.set("serviceChargeRate", String(serviceChargeRate));
    if (taxRate !== undefined) params.set("taxRate", String(taxRate));
    if (customerPhone) params.set("customerPhone", customerPhone);
    if (amountTendered !== undefined) params.set("amountTendered", String(amountTendered));
    if (applyVoucher !== undefined) params.set("applyVoucher", String(applyVoucher));

    const response = await fetchWithTimeout(
        `${API_BASE_URL}/orders/${orderId}/checkout?${params.toString()}`,
        {
            method: "PUT",
            headers: withBranchOverride(getAuthHeaders(idempotencyKey), branchIdOverride),
        }
    );
    if (!response.ok) {
        throw await createResponseError(response, "Failed to pay order.");
    }
}

export async function addOrderPayment(payload: {
    orderId: string;
    amount: number;
    method: string;
    paymentMethodId?: string;
    referenceNumber?: string;
    serviceChargeRate?: number;
    taxRate?: number;
    customerPhone?: string;
    amountTendered?: number;
    applyVoucher?: boolean;
    discount?: import("@/types/order").OrderDiscountChange;
    clientActionId?: string;
    paidAt?: string;
    branchIdOverride?: string;
}): Promise<OrderPaymentResult | null> {
    const requestKey = stablePaymentKey(payload);
    const existing = inFlightPayments.get(requestKey);
    if (existing) return existing;

    const request = (async () => {
        const clientActionId = payload.clientActionId ?? await generateActionId();
        try {
            const response = await api.post<OrderPaymentResult>("/payments", {
                    orderId: payload.orderId,
                    amount: payload.amount,
                    method: payload.method,
                    paymentMethodId: payload.paymentMethodId,
                    referenceNumber: payload.referenceNumber,
                    serviceChargeRate: payload.serviceChargeRate,
                    taxRate: payload.taxRate,
                    customerPhone: payload.customerPhone,
                    amountTendered: payload.amountTendered,
                    applyVoucher: payload.applyVoucher ?? false,
                    discount: payload.discount,
                    clientActionId,
                    paidAt: payload.paidAt,
                }, {
                    headers: withBranchOverride(getIdempotencyHeaders(clientActionId), payload.branchIdOverride),
                    timeoutMs: API_TIMEOUT_MS,
                });
            return response.data;
        } finally {
            inFlightPayments.delete(requestKey);
        }
    })();

    inFlightPayments.set(requestKey, request);
    return request;
}

function stablePaymentKey(payload: {
    orderId: string;
    amount: number;
    method: string;
    paymentMethodId?: string;
    referenceNumber?: string;
    serviceChargeRate?: number;
    taxRate?: number;
    customerPhone?: string;
    amountTendered?: number;
    applyVoucher?: boolean;
    clientActionId?: string;
    paidAt?: string;
}): string {
    return [
        payload.orderId,
        payload.amount.toFixed(2),
        payload.method.trim().toLowerCase(),
        payload.paymentMethodId ?? "",
        payload.referenceNumber ?? "",
        payload.serviceChargeRate ?? "",
        payload.taxRate ?? "",
        payload.customerPhone ?? "",
        payload.amountTendered ?? "",
        payload.applyVoucher === true ? "voucher" : "no-voucher",
        payload.clientActionId ?? "",
        payload.paidAt ?? "",
    ].join("|");
}

export async function clearTable(tableId: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/tables/${tableId}/reset`, {
            method: "PUT",
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Error clearing table: ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error("Failed to clear table:", error);
        return false;
    }
}

export async function login(username: string, password: string): Promise<LegacyLoginResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept-Language": getPreferredLanguage(),
                ...getTenantHeaders(),
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        return await response.json();
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
}

// Connectivity feedback (P0): Every successful API round-trip is stronger
// evidence of online state than a periodic health ping, so we surface it
// to the connectivity singleton. Network-level failures (fetch reject /
// abort) nudge the next ping forward; HTTP status errors do NOT count as
// connectivity failures — they're business-level rejections.
function isNetworkLevelFailure(err: unknown): boolean {
    if (typeof err !== "object" || err === null) return false;
    const e = err as { response?: unknown; name?: string };
    if (e.response) return false; // HTTP error with response → server reachable
    if (e.name === "AbortError" || e.name === REQUEST_TIMEOUT_ERROR_NAME) return true;
    return true; // bare Error without response → fetch reject (network)
}

// Generic API client for axios-like usage
export const api = {
    get: async <T = any>(endpoint: string, config?: { params?: Record<string, any>; public?: boolean }) => {
        let url = `${API_BASE_URL}${endpoint}`;
        if (config?.params) {
            const searchParams = new URLSearchParams();
            Object.entries(config.params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            url = queryString ? `${url}?${queryString}` : url;
        }
        let response: Response;
        try {
            response = await fetchWithTimeout(url, {
                cache: "no-store",
                headers: config?.public ? getPublicHeaders() : getAuthHeaders(),
            });
        } catch (err) {
            if (isNetworkLevelFailure(err)) reportApiFailure();
            throw err;
        }
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || response.statusText);
        }
        reportApiSuccess();
        const text = await response.text();
        return { data: text ? JSON.parse(text) : null as T };
    },
    getBlob: async (endpoint: string, config?: { params?: Record<string, unknown> }) => {
        let url = `${API_BASE_URL}${endpoint}`;
        if (config?.params) {
            const searchParams = new URLSearchParams();
            Object.entries(config.params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) searchParams.append(key, String(value));
            });
            const queryString = searchParams.toString();
            url = queryString ? `${url}?${queryString}` : url;
        }

        let response: Response;
        try {
            response = await fetchWithTimeout(url, {
                cache: "no-store",
                headers: getAuthHeaders(),
            });
        } catch (err) {
            if (isNetworkLevelFailure(err)) reportApiFailure();
            throw err;
        }
        if (!response.ok) throw await createResponseError(response, "Download failed");
        reportApiSuccess();
        return { data: await response.blob() };
    },
    post: async <T = any>(
        endpoint: string,
        data: any,
        config?: { headers?: Record<string, string>; timeoutMs?: number }
    ) => {
        const headers = { ...getAuthHeaders(), ...config?.headers };
        let response: Response;
        try {
            const request = {
                method: "POST",
                headers: config?.headers?.["Content-Type"] === "multipart/form-data" ?
                    {
                        ...(headers["Authorization"] ? { "Authorization": headers["Authorization"] } : {}),
                        ...getTenantHeaders(),
                        ...getBranchHeaders(),
                    } :
                    headers,
                body: data instanceof FormData ? data : JSON.stringify(data),
            };
            response = config?.timeoutMs
                ? await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, request, config.timeoutMs)
                : await fetch(`${API_BASE_URL}${endpoint}`, request);
        } catch (err) {
            if (isNetworkLevelFailure(err)) reportApiFailure();
            throw err;
        }
        if (!response.ok) {
            const errorText = await response.text();
            let errorData: any = null;
            try { errorData = JSON.parse(errorText); } catch { /* not JSON */ }
            const err: any = new Error(errorData?.message || errorText || response.statusText);
            err.response = { status: response.status, data: errorData };
            throw err;
        }
        reportApiSuccess();
        const text = await response.text();
        return { data: text ? JSON.parse(text) : null as T };
    },
    put: async <T = any>(endpoint: string, data?: any, config?: { headers?: Record<string, string> }) => {
        let response: Response;
        try {
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: "PUT",
                headers: { ...getAuthHeaders(), ...config?.headers },
                body: data ? JSON.stringify(data) : undefined,
            });
        } catch (err) {
            if (isNetworkLevelFailure(err)) reportApiFailure();
            throw err;
        }
        if (!response.ok) {
            const errorText = await response.text();
            let errorData: any = null;
            try { errorData = JSON.parse(errorText); } catch { /* not JSON */ }
            const err: any = new Error(errorData?.message || errorText || response.statusText);
            err.response = { status: response.status, data: errorData };
            throw err;
        }
        reportApiSuccess();
        const text = await response.text();
        return { data: text ? JSON.parse(text) : null as T };
    },
    patch: async <T = any>(endpoint: string, data?: any) => {
        let response: Response;
        try {
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: data ? JSON.stringify(data) : undefined,
            });
        } catch (err) {
            if (isNetworkLevelFailure(err)) reportApiFailure();
            throw err;
        }
        if (!response.ok) {
            const errorText = await response.text();
            let errorData: any = null;
            try { errorData = JSON.parse(errorText); } catch { /* not JSON */ }
            const err: any = new Error(errorData?.message || errorText || response.statusText);
            err.response = { status: response.status, data: errorData };
            throw err;
        }
        reportApiSuccess();
        const text = await response.text();
        return { data: text ? JSON.parse(text) : null as T };
    },
    delete: async <T = any>(endpoint: string) => {
        let response: Response;
        try {
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });
        } catch (err) {
            if (isNetworkLevelFailure(err)) reportApiFailure();
            throw err;
        }
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || response.statusText);
        }
        reportApiSuccess();
        const text = await response.text();
        return { data: text ? JSON.parse(text) : null as T };
    }
};

/**
 * SINGLE SOURCE OF TRUTH for filtering orders by session
 * Always use this when displaying session orders. Also deduplicates by id so
 * merge races between server fetch + IDB snapshot mirror can never surface the
 * same order twice in the dine-in panel.
 * @param orders All orders from API
 * @param currentTicketId The table's current session ticket ID from database
 * @returns Orders filtered to current session only, deduplicated by id
 */
export function getSessionOrders(orders: any[], currentTicketId: number | null | undefined): any[] {
    const normalizedTicketId = Number(currentTicketId ?? 0);
    if (!Number.isFinite(normalizedTicketId) || normalizedTicketId <= 0) {
        return [];
    }
    const filtered = orders.filter((order) => Number(order?.ticketId ?? 0) === normalizedTicketId);
    return removeDuplicatesById(filtered);
}

/**
 * Deduplicate a list of order-like rows by their `id`. The last occurrence
 * wins so freshly-fetched server rows override stale local snapshots when the
 * caller has merged the two streams. Rows without an id are preserved as-is.
 */
export function removeDuplicatesById<T extends { id?: string | null }>(items: T[]): T[] {
    const seen = new Map<string, T>();
    const anonymous: T[] = [];
    for (const item of items) {
        const id = item?.id;
        if (typeof id === "string" && id.length > 0) {
            seen.set(id, item);
        } else {
            anonymous.push(item);
        }
    }
    return [...seen.values(), ...anonymous];
}

// ============ CATEGORY API ============
export async function getCategories(): Promise<CategoryDto[]> {
    return cachedReferenceList<CategoryDto>(`categories:${getSelectedBranchCacheKey()}`, async () => {
        try {
            const response = await api.get<CategoryDto[]>('/categories');
            return (response.data || []).map((category: CategoryDto) => ({
                ...category,
                // Keep name as English; displayName is locale-resolved by the API
            }));
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            return [];
        }
    });
}

export async function getCategoriesPaginated(
    pageNumber: number = 1,
    pageSize: number = 10,
    search: string = "",
    isActive?: boolean
): Promise<PaginatedResult<CategoryDto>> {
    try {
        const response = await api.get('/categories/paginated', {
            params: {
                pageNumber,
                pageSize,
                search: search.trim() || undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            }
        });
        return {
            items: response.data?.items || [],
            totalCount: response.data?.totalCount ?? 0,
            pageNumber: response.data?.pageNumber ?? pageNumber,
            pageSize: response.data?.pageSize ?? pageSize,
        };
    } catch (error) {
        console.error('Failed to fetch categories (paginated):', error);
        return { items: [], totalCount: 0, pageNumber, pageSize };
    }
}

export async function getPublicCategories(language: string = getPreferredLanguage()): Promise<CategoryDto[]> {
    const snapshot = await getPublicMenuData(language);
    return snapshot.categories;
}

export async function createCategory(data: {
    name: string;
    nameAr?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
    displayMode?: number;
    isActive?: boolean;
}): Promise<boolean> {
    await api.post('/categories', data);
    await invalidateCategoryCaches();
    return true;
}

export async function updateCategory(id: string, data: {
    name: string;
    nameAr?: string;
    description?: string;
    imageUrl?: string;
    sortOrder: number;
    displayMode: number;
    isActive: boolean;
}): Promise<boolean> {
    await api.put(`/categories/${id}`, data);
    await invalidateCategoryCaches();
    return true;
}

export async function deleteCategory(id: string): Promise<boolean> {
    try {
        await api.delete(`/categories/${id}`);
        await deleteReferenceCache("categories");
        await invalidateAllMenuCaches();
        return true;
    } catch (error) {
        console.error('Failed to delete category:', error);
        return false;
    }
}

async function invalidateCategoryCaches() {
    await deleteReferenceCache("categories");
    await invalidateAllMenuCaches();
}

export async function createSubcategory(categoryId: string, data: {
    name: string;
    nameAr?: string;
    imageUrl?: string;
    displayOrder?: number;
    isActive?: boolean;
}): Promise<SubcategoryDto> {
    const response = await api.post<SubcategoryDto>(`/categories/${categoryId}/subcategories`, data);
    await invalidateCategoryCaches();
    return response.data;
}

export async function updateSubcategory(id: string, data: {
    name: string;
    nameAr?: string;
    imageUrl?: string;
    displayOrder: number;
    isActive: boolean;
}): Promise<SubcategoryDto> {
    const response = await api.put<SubcategoryDto>(`/categories/subcategories/${id}`, data);
    await invalidateCategoryCaches();
    return response.data;
}

export async function setSubcategoryActive(id: string, isActive: boolean): Promise<SubcategoryDto> {
    const response = await api.patch<SubcategoryDto>(`/categories/subcategories/${id}/active`, { isActive });
    await invalidateCategoryCaches();
    return response.data;
}

export async function deleteSubcategory(id: string): Promise<boolean> {
    try {
        await api.delete(`/categories/subcategories/${id}`);
        await invalidateCategoryCaches();
        return true;
    } catch (error) {
        console.error('Failed to delete subcategory:', error);
        return false;
    }
}

export async function reorderSubcategories(
    categoryId: string,
    items: { id: string; displayOrder: number }[],
): Promise<SubcategoryDto[]> {
    const response = await api.put<SubcategoryDto[]>(`/categories/${categoryId}/subcategories/reorder`, items);
    await invalidateCategoryCaches();
    return response.data || [];
}

// ─── Branding ────────────────────────────────────────────────────────────────

export interface BrandingConfig {
    logoUrl: string | null;
    businessName: string | null;
    primaryColor: string | null;
    primaryForeground: string | null;
    accentColor: string | null;
    updatedAt: string | null;
}

// ── Multi-kitchen routing ───────────────────────────────────────────────────
export interface KitchenDto {
    id: string;
    name: string;
    nameAr?: string | null;
    isActive: boolean;
    sortOrder: number;
    printerCount: number;
}

export interface KitchenUpsertDto {
    name: string;
    nameAr?: string | null;
    isActive: boolean;
    sortOrder: number;
}

export interface PrinterDto {
    id: string;
    name: string;
    nameAr?: string | null;
    kitchenId?: string | null;
    kitchenName?: string | null;
    type: number; // 0 = Network, 1 = Usb
    ipAddress?: string | null;
    port: number;
    windowsPrinterName?: string | null;
    usbPortName?: string | null;
    codePage: number;
    isActive: boolean;
    isReceiptPrinter: boolean;
    isDefault: boolean;
    useLocalAgent: boolean;
    copiesPerJob: number;
}

export interface PrinterUpsertDto {
    name: string;
    nameAr?: string | null;
    kitchenId?: string | null;
    type: number;
    ipAddress?: string | null;
    port: number;
    windowsPrinterName?: string | null;
    usbPortName?: string | null;
    codePage: number;
    isActive: boolean;
    isReceiptPrinter: boolean;
    isDefault: boolean;
    useLocalAgent: boolean;
    copiesPerJob: number;
}

export interface CashierPrinterAssignmentDto {
    userId: string;
    username: string;
    fullName?: string | null;
    fullNameAr?: string | null;
    role: string;
    receiptPrinterId?: string | null;
    receiptPrinterName?: string | null;
}

export interface PrintJobDto {
    id: string;
    orderId: string;
    orderNumber?: string | null;
    kitchenId?: string | null;
    kitchenName?: string | null;
    printerId: string;
    jobType: number;   // 0 = KitchenTicket, 1 = CustomerReceipt
    isReprint: boolean;
    status: number;    // 0 Pending | 1 Printing | 2 Completed | 3 Failed | 4 DeadLetter
    attemptCount: number;
    maxAttempts: number;
    lastAttemptAt?: string | null;
    nextAttemptAt?: string | null;
    completedAt?: string | null;
    lastError?: string | null;
    createdAt: string;
}

export interface ResendKitchenTicketJobDto {
    jobId: string;
    kitchenId: string;
    kitchenName: string;
    itemCount: number;
}

export interface ResendKitchenTicketResponse {
    enqueued: boolean;
    jobs: ResendKitchenTicketJobDto[];
    skippedKitchenIds: string[];
    reason?: string | null;
}

export interface PublicReceiptShareDto {
    receiptUrl: string;
    customerPhone: string;
    message: string;
    expiresAtUtc?: string | null;
}

export interface PublicReceiptDto {
    restaurant: {
        name: string;
        logoUrl?: string | null;
        address?: string | null;
        phone?: string | null;
        taxNumber?: string | null;
        currency: string;
        footerNote?: string | null;
    };
    orderNumber: string;
    orderSequenceNumber?: string | null;
    tableName: string;
    orderType: string;
    orderSource: string;
    branchName?: string | null;
    branchAddress?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    deliveryAddress?: string | null;
    createdAtUtc: string;
    paidAtUtc?: string | null;
    scheduledForUtc?: string | null;
    subtotal: number;
    discountAmount: number;
    discountType?: import("@/types/order").OrderDiscountType | null;
    discountValue?: number;
    serviceChargeAmount: number;
    taxAmount: number;
    voucherDiscountAmount: number;
    promoCode?: string | null;
    promoDiscountAmount?: number;
    deliveryFee?: number | null;
    deliveryZoneName?: string | null;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    paymentMethod?: string | null;
    paymentStatus: string;
    isRefunded: boolean;
    items: PublicReceiptItemDto[];
}

export interface PublicReceiptItemDto {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotalAmount: number;
    isComplimentary: boolean;
    modifiers: PublicReceiptModifierDto[];
}

export interface PublicReceiptModifierDto {
    name: string;
    quantity: number;
    price: number;
}

export async function getKitchens(): Promise<KitchenDto[]> {
    try {
        const response = await api.get<KitchenDto[]>('/printing/kitchens');
        return response.data || [];
    } catch (error) {
        console.error('Failed to fetch kitchens:', error);
        return [];
    }
}

export async function createKitchen(input: KitchenUpsertDto): Promise<KitchenDto | null> {
    try {
        const response = await api.post<KitchenDto>('/printing/kitchens', input);
        return response.data;
    } catch (error) {
        console.error('Failed to create kitchen:', error);
        throw error;
    }
}

export async function updateKitchen(id: string, input: KitchenUpsertDto): Promise<KitchenDto | null> {
    try {
        const response = await api.put<KitchenDto>(`/printing/kitchens/${id}`, input);
        return response.data;
    } catch (error) {
        console.error('Failed to update kitchen:', error);
        throw error;
    }
}

export async function deleteKitchen(id: string): Promise<boolean> {
    try {
        await api.delete(`/printing/kitchens/${id}`);
        return true;
    } catch (error) {
        console.error('Failed to delete kitchen:', error);
        throw error;
    }
}

export async function getPrinters(): Promise<PrinterDto[]> {
    try {
        const response = await api.get<PrinterDto[]>('/printing/printers');
        return response.data || [];
    } catch (error) {
        console.error('Failed to fetch printers:', error);
        return [];
    }
}

export async function createPrinter(input: PrinterUpsertDto): Promise<PrinterDto | null> {
    try {
        const response = await api.post<PrinterDto>('/printing/printers', input);
        return response.data;
    } catch (error) {
        console.error('Failed to create printer:', error);
        throw error;
    }
}

export async function updatePrinter(id: string, input: PrinterUpsertDto): Promise<PrinterDto | null> {
    try {
        const response = await api.put<PrinterDto>(`/printing/printers/${id}`, input);
        return response.data;
    } catch (error) {
        console.error('Failed to update printer:', error);
        throw error;
    }
}

export async function deletePrinter(id: string): Promise<boolean> {
    try {
        await api.delete(`/printing/printers/${id}`);
        return true;
    } catch (error) {
        console.error('Failed to delete printer:', error);
        throw error;
    }
}

export async function getCashierAssignments(): Promise<CashierPrinterAssignmentDto[]> {
    try {
        const response = await api.get<CashierPrinterAssignmentDto[]>('/printing/cashiers');
        return response.data || [];
    } catch (error) {
        console.error('Failed to fetch cashier assignments:', error);
        return [];
    }
}

export async function setCashierPrinter(userId: string, receiptPrinterId: string | null): Promise<boolean> {
    try {
        await api.put(`/printing/cashiers/${userId}/printer`, { receiptPrinterId });
        return true;
    } catch (error) {
        console.error('Failed to update cashier printer:', error);
        throw error;
    }
}

export async function getPrintJobs(status?: number, take = 100): Promise<PrintJobDto[]> {
    try {
        const params: Record<string, any> = { take };
        if (status !== undefined) params.status = status;
        const response = await api.get<PrintJobDto[]>('/printing/jobs', { params });
        return response.data || [];
    } catch (error) {
        console.error('Failed to fetch print jobs:', error);
        return [];
    }
}

export async function resendKitchenTicket(
    orderId: string,
    kitchenIds: string[]
): Promise<ResendKitchenTicketResponse> {
    const response = await api.post<ResendKitchenTicketResponse>('/printing/resend-kitchen', {
        orderId,
        kitchenIds,
    });
    return response.data;
}

export async function createWhatsAppReceiptShare(orderId: string): Promise<PublicReceiptShareDto> {
    const response = await api.post<PublicReceiptShareDto>(
        `/public/receipt/orders/${orderId}/whatsapp-share`,
        {},
    );
    return response.data;
}

export async function getPublicReceipt(token: string): Promise<PublicReceiptDto> {
    const response = await api.get<PublicReceiptDto>(
        `/public/receipt/${encodeURIComponent(token)}`,
        { public: true },
    );
    return response.data;
}

/**
 * Trigger a customer receipt for an existing order, sent direct to the
 * configured network receipt printer (no browser popup, no driver).
 * Returns true if the backend enqueued a job, false if no receipt printer is
 * configured (caller may fall back to a browser-based print).
 */
export async function printReceiptDirect(orderId: string): Promise<boolean> {
    try {
        const response = await api.post<{ enqueued: boolean; reason?: string }>(
            `/printing/orders/${orderId}/receipt`,
            {},
        );
        return Boolean(response.data?.enqueued);
    } catch (error) {
        console.error('Failed to enqueue direct receipt:', error);
        return false;
    }
}

export async function reprintJob(id: string): Promise<boolean> {
    try {
        await api.post(`/printing/jobs/${id}/reprint`, {});
        return true;
    } catch (error) {
        console.error('Failed to reprint:', error);
        return false;
    }
}

export async function getTenantBranding(): Promise<BrandingConfig | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/tenants/branding`, {
            cache: "no-store",
            headers: getPublicHeaders(),
        });
        if (!response.ok) return null;
        return await response.json() as BrandingConfig;
    } catch (error) {
        console.error('Failed to fetch tenant branding:', error);
        return null;
    }
}

export async function saveTenantBranding(data: Partial<BrandingConfig>): Promise<boolean> {
    try {
        await api.put('/tenants/branding', data);
        return true;
    } catch (error) {
        console.error('Failed to save tenant branding:', error);
        return false;
    }
}

export interface ExpiryAlertBatch {
    id: string;
    batchNumber: string;
    materialName: string;
    materialNameAr?: string;
    remainingQuantity: number;
    expiryDate: string;
    status: "Expired" | "ExpiringSoon";
}

export interface ExpiryAlertsResponse {
    expiredCount: number;
    expiringSoonCount: number;
    expired: ExpiryAlertBatch[];
    expiringSoon: ExpiryAlertBatch[];
}

export async function getExpiryAlerts(daysThreshold: number = 3): Promise<ExpiryAlertsResponse | null> {
    try {
        const response = await api.get(`/materials/expiry-alerts?daysThreshold=${daysThreshold}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch expiry alerts:', error);
        return null;
    }
}

// ─── MENU API FUNCTIONS ──────────────────────────────────────────

import { PublicMenuDto, PublicCategoryDto, PublicProductDto, TenantBrandingDto, MenuAccessCheckResponseDto } from "@/types/menu";

/**
 * Get complete public menu (categories + products)
 * Public access - no authentication required
 */
export async function getPublicMenu(language: string = "en"): Promise<PublicMenuDto | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/public?language=${encodeURIComponent(language)}`, {
            headers: getPublicHeadersForLanguage(language),
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch public menu:", error);
        return null;
    }
}

/**
 * Get public categories
 */
export async function getPublicMenuCategories(language: string = "en"): Promise<PublicCategoryDto[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/public/categories?language=${encodeURIComponent(language)}`, {
            headers: getPublicHeadersForLanguage(language),
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch menu categories:", error);
        return [];
    }
}

/**
 * Get public products
 */
export async function getPublicMenuProducts(language: string = "en"): Promise<PublicProductDto[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/public/products?language=${encodeURIComponent(language)}`, {
            headers: getPublicHeadersForLanguage(language),
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch menu products:", error);
        return [];
    }
}

/**
 * Get public products by category
 */
export async function getPublicMenuProductsByCategory(categoryId: string, language: string = "en"): Promise<PublicProductDto[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/public/categories/${categoryId}/products?language=${encodeURIComponent(language)}`, {
            headers: getPublicHeadersForLanguage(language),
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch category products:", error);
        return [];
    }
}

/**
 * Get tenant branding for public menu
 */
export async function getMenuTenantBranding(): Promise<TenantBrandingDto | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/public/branding`, {
            headers: getPublicHeaders(),
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch branding:", error);
        return null;
    }
}

/**
 * Validate menu access (rate limiting check)
 */
export async function validateMenuAccess(clientIdentifier: string, endpoint: string): Promise<MenuAccessCheckResponseDto | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/public/validate-access`, {
            method: "POST",
            headers: getPublicHeaders(),
            body: JSON.stringify({ clientIdentifier, endpoint }),
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Failed to validate menu access:", error);
        return null;
    }
}

/**
 * Generate QR code (admin only)
 */
export async function generateQrCode(description?: string): Promise<{ qrToken: string; menuUrl: string } | null> {
    try {
        const response = await api.post<{ qrToken: string; menuUrl: string }>("/menu/qrcode/generate", description);
        return response.data;
    } catch (error) {
        console.error("Failed to generate QR code:", error);
        return null;
    }
}

/**
 * Get menu settings (admin only)
 */
export async function getMenuSettings(): Promise<any | null> {
    try {
        const response = await api.get("/menu/settings");
        return response.data;
    } catch (error) {
        console.error("Failed to fetch menu settings:", error);
        return null;
    }
}

/**
 * Update menu settings (admin only)
 */
export async function updateMenuSettings(settings: any): Promise<boolean> {
    try {
        await api.put("/menu/settings", settings);
        return true;
    } catch (error) {
        console.error("Failed to update menu settings:", error);
        return false;
    }
}

// ─── MODIFIER GROUPS LIBRARY API ─────────────────────────────────

export interface PaginatedResult<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export async function getModifierGroups(): Promise<ModifierGroupLibraryDto[]> {
    try {
        const response = await api.get<ModifierGroupLibraryDto[]>('/modifiergroups');
        return response.data || [];
    } catch (error) {
        console.error('Failed to fetch modifier groups:', error);
        return [];
    }
}

export async function getModifierGroupsPaginated(
    pageNumber: number = 1,
    pageSize: number = 10,
    search: string = ""
): Promise<PaginatedResult<ModifierGroupLibraryDto>> {
    try {
        const response = await api.get('/modifiergroups/paginated', {
            params: { pageNumber, pageSize, search: search.trim() || undefined }
        });
        return {
            items: response.data?.items || [],
            totalCount: response.data?.totalCount ?? 0,
            pageNumber: response.data?.pageNumber ?? pageNumber,
            pageSize: response.data?.pageSize ?? pageSize,
        };
    } catch (error) {
        console.error('Failed to fetch modifier groups (paginated):', error);
        return { items: [], totalCount: 0, pageNumber, pageSize };
    }
}

export async function createModifierGroup(data: {
    name: string;
    nameAr?: string;
    selectionType: number;
    minSelection: number;
    maxSelection: number;
    displayType: number;
    isRequired: boolean;
    availableForOrderTypes: number;
    printOnReceipt: boolean;
    printInKitchen: boolean;
    modifiers: {
        name: string;
        nameAr?: string;
        priceAdjustment: number;
        isDefault: boolean;
        isActive: boolean;
        pricingType: number;
        isFree: boolean;
        freeQuantityLimit: number;
        maxQuantity: number;
        linkedRawMaterialId?: string;
        linkedProductId?: string;
        linkedMaterialAmount: number;
    }[];
}): Promise<ModifierGroupLibraryDto | null> {
    try {
        const response = await api.post<ModifierGroupLibraryDto>('/modifiergroups', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create modifier group:', error);
        throw error;
    }
}

export async function updateModifierGroup(id: string, data: {
    name: string;
    nameAr?: string;
    selectionType: number;
    minSelection: number;
    maxSelection: number;
    displayType: number;
    isRequired: boolean;
    availableForOrderTypes: number;
    printOnReceipt: boolean;
    printInKitchen: boolean;
    modifiers: {
        id?: string;
        name: string;
        nameAr?: string;
        priceAdjustment: number;
        isDefault: boolean;
        isActive: boolean;
        pricingType: number;
        isFree: boolean;
        freeQuantityLimit: number;
        maxQuantity: number;
        linkedRawMaterialId?: string;
        linkedProductId?: string;
        linkedMaterialAmount: number;
    }[];
}): Promise<boolean> {
    try {
        await api.put(`/modifiergroups/${id}`, data);
        return true;
    } catch (error) {
        console.error('Failed to update modifier group:', error);
        throw error;
    }
}

export async function deleteModifierGroup(id: string): Promise<boolean> {
    try {
        await api.delete(`/modifiergroups/${id}`);
        return true;
    } catch (error) {
        console.error('Failed to delete modifier group:', error);
        throw error;
    }
}

// ─── Product Options ────────────────────────────────────────────────────────────────────────────

export async function getProductOptions(productId: string): Promise<ProductOptionDto[]> {
    const response = await api.get<ProductOptionDto[]>(`/productoptions/product/${productId}`);
    return response.data ?? [];
}

export async function createProductOption(data: ProductOptionCreateDto): Promise<ProductOptionDto> {
    const response = await api.post<ProductOptionDto>('/productoptions', data);
    return response.data;
}

export async function updateProductOption(id: string, data: ProductOptionUpdateDto): Promise<ProductOptionDto> {
    const response = await api.put<ProductOptionDto>(`/productoptions/${id}`, data);
    return response.data;
}

export async function deleteProductOption(id: string): Promise<void> {
    await api.delete(`/productoptions/${id}`);
}

export async function addProductOptionRecipeItem(optionId: string, data: ProductOptionRecipeItemCreateDto): Promise<void> {
    await api.post(`/productoptions/${optionId}/recipe`, data);
}

export async function updateProductOptionRecipeItem(itemId: string, amount: number): Promise<void> {
    await api.put(`/productoptions/recipe/${itemId}`, amount);
}

export async function deleteProductOptionRecipeItem(itemId: string): Promise<void> {
    await api.delete(`/productoptions/recipe/${itemId}`);
}

// ─── Recipe-item-level ingredient alternatives ─────────────────────────────────
// Swap ONE ingredient within a product's recipe (e.g. Pita → Saj).
// Scoped per RecipeItem (not per product). Ignored when a ProductOption is chosen.

export async function getRecipeItemAlternatives(recipeItemId: string): Promise<RecipeItemAlternativeDto[]> {
    const response = await api.get<RecipeItemAlternativeDto[]>(`/recipeitemalternatives/recipeitem/${recipeItemId}`);
    return response.data ?? [];
}

export async function createRecipeItemAlternative(data: RecipeItemAlternativeCreateDto): Promise<RecipeItemAlternativeDto> {
    const response = await api.post<RecipeItemAlternativeDto>(`/recipeitemalternatives`, data);
    return response.data;
}

export async function updateRecipeItemAlternative(id: string, data: RecipeItemAlternativeUpdateDto): Promise<RecipeItemAlternativeDto> {
    const response = await api.put<RecipeItemAlternativeDto>(`/recipeitemalternatives/${id}`, data);
    return response.data;
}

export async function deleteRecipeItemAlternative(id: string): Promise<void> {
    await api.delete(`/recipeitemalternatives/${id}`);
}

// ─── Waste Log ────────────────────────────────────────────────────────────────

export type WasteLogCategory = "CancelProduct" | "ExpiryProduct" | "ManualProduct" | "ManualMaterial";
export type ManualWasteType =
    | "DAMAGED"
    | "GIFT"
    | "STOLEN"
    | "STAFF_MEAL"
    | "WRONG_PREPARATION"
    | "CUSTOMER_COMPENSATION"
    | "OTHER";
export type WasteLogStatus = "Pending" | "Approved" | "Rejected";

export interface WasteLogAuditEntry {
    id: string;
    action: "Created" | "Approved" | "Rejected" | "Updated" | string;
    performedById?: string | null;
    performedByName?: string | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    notes?: string | null;
    changedFields?: string | null;
    previousValues?: string | null;
    newValues?: string | null;
    createdAt: string;
}

export interface WasteLogEntry {
    id: string;
    wasteNumber?: string | null;
    wasteType?: ManualWasteType | string | null;
    category: WasteLogCategory | string;
    wasteCategory?: WasteLogCategory | string;
    itemId?: string | null;
    productId?: string | null;
    materialId?: string | null;
    itemName: string;
    itemNameAr?: string | null;
    quantity: number;
    unit: string;
    reason: string;
    reasonAr?: string | null;
    notes?: string | null;
    costAmount?: number;
    salePriceLoss?: number;
    status?: WasteLogStatus | string;
    createdById?: string | null;
    createdBy?: string | null;
    loggedBy: string;
    employees?: WasteParticipant[];
    approvedById?: string | null;
    approvedBy?: string | null;
    decisionAt?: string | null;
    branchId?: string | null;
    orderId?: string | null;
    sourceOrderId?: string | null;
    orderNumber?: string | null;
    sourceBatchId?: string | null;
    batchNumber?: string | null;
    attachmentUrl?: string | null;
    isAffectingInventory?: boolean;
    wasteDate?: string;
    createdAt: string;
    updatedAt?: string;
    auditTrail?: WasteLogAuditEntry[];
}

export interface WasteLogPage {
    data: WasteLogEntry[];
    total: number;
    page: number;
    limit: number;
}

export interface WasteLogSummary {
    totalCount: number;
    cancelCount: number;
    expiryCount: number;
    manualCount: number;
    manualPendingCount: number;
    manualApprovedCount: number;
    totalWasteCost: number;
    totalSalePriceLoss: number;
    totalQuantity: number;
}

export interface WasteMetric {
    key: string;
    label: string;
    labelAr?: string | null;
    quantity: number;
    costAmount: number;
    salePriceLoss: number;
    count: number;
}

export interface WasteLogAnalytics {
    totalCount: number;
    manualCount: number;
    expiryCount: number;
    cancellationCount: number;
    totalWasteCost: number;
    totalSalePriceLoss: number;
    totalQuantity: number;
    pendingApprovalCount: number;
    approvedCount: number;
    rejectedCount: number;
    staffMealCount: number;
    staffMealQuantity: number;
    staffMealCost: number;
    wasteByType: WasteMetric[];
    wasteByEmployee: WasteMetric[];
    topWastedProducts: WasteMetric[];
    staffMealsByEmployee: WasteMetric[];
}

export interface WasteEmployeeOption {
    id: string;
    name: string;
    nameAr?: string | null;
    username: string;
    role: string;
    staffNo?: string | null;
}

export interface WasteParticipant {
    employeeId?: string | null;
    name: string;
    nameAr?: string | null;
}

export interface WasteLogCreatePayload {
    wasteType: ManualWasteType;
    wasteCategory?: WasteLogCategory;
    wasteDate?: string;
    productId?: string;
    materialId?: string;
    employeeIds?: string[];
    quantity: number;
    unit?: string;
    reason: string;
    notes?: string;
    salePriceLoss?: number;
    branchId?: string;
    orderId?: string;
    attachmentUrl?: string;
    isAffectingInventory: boolean;
}

export interface WasteLogDecisionPayload {
    notes?: string;
}

export interface WasteLogQueryParams {
    category?: string;
    wasteType?: string;
    status?: string;
    employeeId?: string;
    staffMealEmployeeId?: string;
    productId?: string;
    materialId?: string;
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

export async function getWasteLog(params: WasteLogQueryParams): Promise<WasteLogPage> {
    try {
        const response = await api.get<WasteLogPage>("/waste-log", { params });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch waste log:", error);
        return { data: [], total: 0, page: params.page ?? 1, limit: params.limit ?? 50 };
    }
}

export async function getWasteLogById(id: string): Promise<WasteLogEntry | null> {
    try {
        const response = await api.get<WasteLogEntry>(`/waste-log/${id}`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch waste log details:", error);
        return null;
    }
}

export async function getWasteLogSummary(params: WasteLogQueryParams = {}): Promise<WasteLogSummary> {
    try {
        const response = await api.get<WasteLogSummary>("/waste-log/summary", { params });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch waste log summary:", error);
        return {
            totalCount: 0,
            cancelCount: 0,
            expiryCount: 0,
            manualCount: 0,
            manualPendingCount: 0,
            manualApprovedCount: 0,
            totalWasteCost: 0,
            totalSalePriceLoss: 0,
            totalQuantity: 0,
        };
    }
}

export async function getWasteLogAnalytics(params: WasteLogQueryParams = {}): Promise<WasteLogAnalytics> {
    try {
        const response = await api.get<WasteLogAnalytics>("/waste-log/analytics", { params });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch waste analytics:", error);
        return {
            totalCount: 0,
            manualCount: 0,
            expiryCount: 0,
            cancellationCount: 0,
            totalWasteCost: 0,
            totalSalePriceLoss: 0,
            totalQuantity: 0,
            pendingApprovalCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            staffMealCount: 0,
            staffMealQuantity: 0,
            staffMealCost: 0,
            wasteByType: [],
            wasteByEmployee: [],
            topWastedProducts: [],
            staffMealsByEmployee: [],
        };
    }
}

export async function searchWasteEmployees(search?: string, limit = 20): Promise<WasteEmployeeOption[]> {
    try {
        const response = await api.get<WasteEmployeeOption[]>("/waste-log/employees", {
            params: { search: search || undefined, limit },
        });
        return response.data;
    } catch (error) {
        console.error("Failed to search waste employees:", error);
        return [];
    }
}

export function getWasteLogExportUrl(params: WasteLogQueryParams): string {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
    });
    const query = qs.toString();
    return `${config.apiBaseUrl}/waste-log/export${query ? `?${query}` : ""}`;
}

export async function createWasteLog(payload: WasteLogCreatePayload): Promise<WasteLogEntry> {
    const response = await api.post<WasteLogEntry>("/waste-log", payload);
    return response.data;
}

export async function updateWasteLog(id: string, payload: WasteLogCreatePayload): Promise<WasteLogEntry> {
    const response = await api.put<WasteLogEntry>(`/waste-log/${id}`, payload);
    return response.data;
}

export async function approveWasteLog(id: string, payload: WasteLogDecisionPayload = {}): Promise<WasteLogEntry> {
    const response = await api.post<WasteLogEntry>(`/waste-log/${id}/approve`, payload);
    return response.data;
}

export async function rejectWasteLog(id: string, payload: WasteLogDecisionPayload = {}): Promise<WasteLogEntry> {
    const response = await api.post<WasteLogEntry>(`/waste-log/${id}/reject`, payload);
    return response.data;
}

export async function logInventoryWaste(materialId: string, quantity: number, reason: string): Promise<{ id: string } | null> {
    try {
        const response = await api.post<WasteLogEntry>(`/inventory/${materialId}/waste`, { quantity, reason });
        return { id: response.data.id };
    } catch (error) {
        console.error("Failed to log inventory waste:", error);
        return null;
    }
}

export type PosLogType = "CANCEL" | "WASTE";

export interface PosLogEntry {
    id: string;
    type: PosLogType;
    orderId?: string;
    orderNumber?: string;
    orderSequenceNumber?: string | null;
    itemId?: string;
    orderItemId?: string;
    itemName?: string;
    quantity: number;
    amount: number;
    reason: string;
    createdAt: string;
    shiftId?: string;
    shiftNumber?: number | null;
    actorName?: string;
    source: "ORDER" | "ITEM";
}

export interface PosLogPage {
    data: PosLogEntry[];
    total: number;
    page: number;
    limit: number;
}

export async function getPosLogs(params: {
    date?: "today" | "all";
    type?: "cancel" | "waste";
    shiftId?: string;
    page?: number;
    limit?: number;
}): Promise<PosLogPage> {
    const response = await api.get<PosLogPage>("/pos/logs", { params });
    return response.data;
}

// ─── Cancel Log ───────────────────────────────────────────────────────────────

export interface CancelLogEntry {
    id: string;
    orderId: string;
    orderNumber?: string;
    orderSequenceNumber?: string | null;
    orderItemId?: string;
    isFullOrder?: boolean;
    itemName?: string;
    itemNameAr?: string;
    cancelledByName: string;
    cancelledByRole: string;
    orderTime: string;
    cancelledAt: string;
    cancelMode?: "DIRECT" | "KITCHEN" | string | null;
    cancelReasonCode: string;
    cancelReasonLabel?: string;
    cancelReasonLabelAr?: string;
    cancelReasonNote?: string;
    hasWaste: boolean;
    wasteLogId?: string;
    requiresKitchenApproval?: boolean;
    approvalStatus?: "PendingKitchenApproval" | "ApprovedCancelled" | "Waste" | "Rejected";
    kitchenDecision?: "Cancel" | "Waste" | "Rejected" | null;
    kitchenDecisionByName?: string | null;
    kitchenDecisionAt?: string | null;
    /** Staff, Customer (signed-in account), Guest (order access token) or System. */
    actorType?: string;
    /** Units this event cancelled — or asked to, while a request is pending. */
    quantity?: number;
    previousQuantity?: number | null;
    /** Value this event removed: the order total for a whole order, the line's share for a line. */
    amount?: number;
    previousOrderStatus?: string | null;
    newOrderStatus?: string | null;
    /** Units the retail stock ledger has put back for this event; null while pending or untracked. */
    stockReturnedQuantity?: number | null;
    refundAmount?: number | null;
}

export interface CancelLogPage {
    data: CancelLogEntry[];
    total: number;
    page: number;
    limit: number;
}

export async function getCancelLog(params: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}): Promise<CancelLogPage> {
    try {
        const response = await api.get("/cancel-log", { params });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch cancel log:", error);
        return { data: [], total: 0, page: 1, limit: 50 };
    }
}

// ─── Cancel Reasons ───────────────────────────────────────────────────────────

export interface CancelReason {
    id: number;
    code: string;
    name: string;
    nameAr: string;
    requiresNote: boolean;
}

const DEFAULT_CANCEL_REASONS: CancelReason[] = [
    { id: 1, code: "CLIENT_CHANGED_MIND", name: "Client changed mind", nameAr: "العميل غير رأيه", requiresNote: false },
    { id: 2, code: "WRONG_ORDER_ENTERED", name: "Wrong order entered", nameAr: "تم إدخال طلب خاطئ", requiresNote: false },
    { id: 3, code: "CLIENT_LEFT", name: "Client left", nameAr: "العميل غادر", requiresNote: false },
    { id: 4, code: "ALLERGY_CONCERN", name: "Allergy concern", nameAr: "مشكلة حساسية", requiresNote: false },
    { id: 5, code: "ITEM_UNAVAILABLE", name: "Item unavailable", nameAr: "المنتج غير متوفر", requiresNote: false },
    { id: 6, code: "OTHER", name: "Other", nameAr: "سبب آخر", requiresNote: true },
];

export async function getCancelReasons(): Promise<CancelReason[]> {
    try {
        const response = await api.get("/cancel-reasons");
        return Array.isArray(response.data) && response.data.length > 0
            ? response.data
            : DEFAULT_CANCEL_REASONS;
    } catch (error) {
        console.error("Failed to fetch cancel reasons:", error);
        return DEFAULT_CANCEL_REASONS;
    }
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────

export interface CancelOrderPayload {
    cancelReason: string;
    cancelReasonNote?: string;
    mode?: "DIRECT" | "KITCHEN";
}

export interface CancelOrderResult {
    cancelLogId: string;
    wasteLogIds?: string[];
    wasteLogId?: string;
    requiresKitchenApproval?: boolean;
    cancelMode?: "DIRECT" | "KITCHEN" | string;
    approvalStatus?: string;
    orderCancelled?: boolean;
}

export async function cancelOrder(
    orderId: string,
    payload: CancelOrderPayload,
    idempotencyKey?: string,
    branchIdOverride?: string,
): Promise<CancelOrderResult> {
    const response = await api.post(
        `/orders/${orderId}/cancel`,
        payload,
        { headers: withBranchOverride(getIdempotencyHeaders(idempotencyKey), branchIdOverride) },
    );
    return response.data;
}

export async function cancelOrderItem(
    orderId: string,
    itemId: string,
    payload: CancelOrderPayload,
    idempotencyKey?: string,
): Promise<CancelOrderResult> {
    const response = await api.post(
        `/orders/${orderId}/items/${itemId}/cancel`,
        payload,
        { headers: getIdempotencyHeaders(idempotencyKey) },
    );
    return response.data;
}

export interface KitchenCancelRequest {
    cancelLogId: string;
    orderId: string;
    orderItemId?: string | null;
    isFullOrder: boolean;
    orderNumber: string;
    orderSequenceNumber?: string | null;
    orderType: string;
    tableName: string;
    requestedBy: string;
    /** Staff, Customer (signed-in account) or Guest (order access token). */
    requestedByType?: string;
    /** Units asked for on an item request — can be part of a line. Null for a whole order. */
    requestedQuantity?: number | null;
    requestedAt: string;
    reason: string;
    note?: string | null;
    approvalStatus: string;
    paymentStatus: string;
    isPaid: boolean;
    orderAmount: number;
    paidAmount: number;
    preparationStatus: string;
    inventoryImpact: {
        hasConsumedInventory: boolean;
        consumedCost: number;
        restorableCost: number;
        preparedItemCount: number;
        itemCount: number;
    };
    itemName?: string | null;
    affectedItems: Array<{
        itemId: string;
        itemName: string;
        itemNameAr?: string | null;
        quantity: number;
        amount: number;
        stockDeducted: boolean;
        stockDeductedCost: number;
        isReady: boolean;
        offerLineId?: number | null;
    }>;
    requiresWasteDecision: boolean;
}

export const KitchenCancelDecision = {
    ApprovedCancel: 0,
    Rejected: 1,
    Waste: 2,
    Refund: 3,
    RefundWaste: 4,
} as const;

export const CancellationApprovalDecision = {
    CancelNotPrepared: KitchenCancelDecision.ApprovedCancel,
    CancelWithWaste: KitchenCancelDecision.Waste,
    RefundOnly: KitchenCancelDecision.Refund,
    RefundWithWaste: KitchenCancelDecision.RefundWaste,
    Rejected: KitchenCancelDecision.Rejected,
} as const;

export async function getKitchenCancelRequests(): Promise<KitchenCancelRequest[]> {
    const response = await api.get("/orders/cancel-requests");
    return response.data;
}

export async function decideKitchenCancelRequest(
    cancelLogId: string,
    decision: typeof KitchenCancelDecision[keyof typeof KitchenCancelDecision],
    payload?: { note?: string },
): Promise<{ approvalStatus: string; kitchenDecision?: string; wasteLogIds?: string[]; orderCancelled?: boolean }> {
    const response = await api.post(`/orders/cancel-requests/${cancelLogId}/decision`, { decision, ...payload });
    return response.data;
}

export const getCancellationApprovalRequests = getKitchenCancelRequests;
export const decideCancellationApprovalRequest = decideKitchenCancelRequest;

// ─── Refund Order ──────────────────────────────────────────────────────────────

export interface RefundOrderPayload {
    refundReason: string;
    refundNote?: string;
}

export interface RefundOrderResult {
    refundLogId: string;
    cancelLogId: string;
    refundAmount: number;
}

export async function refundOrder(
    orderId: string,
    payload: RefundOrderPayload,
    idempotencyKey?: string,
): Promise<RefundOrderResult> {
    const response = await api.post(
        `/orders/${orderId}/refund`,
        payload,
        { headers: getIdempotencyHeaders(idempotencyKey) },
    );
    return response.data;
}

