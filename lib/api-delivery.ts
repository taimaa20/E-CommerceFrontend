import { api } from "@/lib/api";
import { cachedReferenceList } from "@/lib/offline/reference-cache";
import { getSelectedBranchCacheKey } from "@/lib/branch-selection";

const DELIVERY_ZONES_ENDPOINT = "/deliveryzones";
// Reference-cache key for the active-zone selector. Warmed online and read
// back when offline so delivery orders can still pick a zone (and its fee /
// payment-mode snapshot) during an outage. Zones are branch-owned server-side,
// so the key is branch-scoped.
const activeZonesCacheKey = () => `delivery-zones:active:${getSelectedBranchCacheKey()}`;

export const DELIVERY_PAYMENT_MODE = {
    CustomerPays: 0,
    RestaurantPays: 1,
    Shared: 2,
} as const;

export type DeliveryPaymentMode = typeof DELIVERY_PAYMENT_MODE[keyof typeof DELIVERY_PAYMENT_MODE];

export interface DeliveryZoneDto {
    id: string;
    nameEn: string;
    nameAr?: string | null;
    code: string;
    deliveryFee: number;
    deliveryCost: number;
    paymentMode: DeliveryPaymentMode;
    isActive: boolean;
    displayOrder: number;
    notes?: string | null;
    createdAt: string;
    updatedAt?: string | null;
}

export interface DeliveryZoneSelectDto {
    id: string;
    nameEn: string;
    nameAr?: string | null;
    code: string;
    deliveryFee: number;
    deliveryCost: number;
    paymentMode: DeliveryPaymentMode;
    displayOrder: number;
}

export interface DeliveryZoneUpsertDto {
    nameEn: string;
    nameAr?: string | null;
    code: string;
    deliveryFee: number;
    deliveryCost: number;
    paymentMode: DeliveryPaymentMode;
    isActive: boolean;
    displayOrder: number;
    notes?: string | null;
}

export interface DeliveryZonePagedResult {
    items: DeliveryZoneDto[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

interface DeliveryZonePagedApiResult {
    items?: DeliveryZoneDto[];
    totalCount?: number;
    page?: number;
    pageNumber?: number;
    pageSize?: number;
    totalPages?: number;
}

export interface DeliveryZoneQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
}

export function getDeliveryZoneName(zone: Pick<DeliveryZoneDto, "nameEn" | "nameAr">, ar: boolean): string {
    return ar ? (zone.nameAr || zone.nameEn) : zone.nameEn;
}

export function getDeliveryPaymentModeLabel(mode: DeliveryPaymentMode | number | string | null | undefined, ar: boolean): string {
    const normalized = normalizeDeliveryPaymentMode(mode);
    if (normalized === DELIVERY_PAYMENT_MODE.RestaurantPays) return ar ? "المطعم يدفع" : "Restaurant pays";
    if (normalized === DELIVERY_PAYMENT_MODE.Shared) return ar ? "مشترك" : "Shared";
    return ar ? "العميل يدفع" : "Customer pays";
}

export function getDeliveryPaymentModeName(mode: DeliveryPaymentMode | number | string | null | undefined): "CustomerPays" | "RestaurantPays" | "Shared" {
    const normalized = normalizeDeliveryPaymentMode(mode);
    if (normalized === DELIVERY_PAYMENT_MODE.RestaurantPays) return "RestaurantPays";
    if (normalized === DELIVERY_PAYMENT_MODE.Shared) return "Shared";
    return "CustomerPays";
}

export function normalizeDeliveryPaymentMode(mode: DeliveryPaymentMode | number | string | null | undefined): DeliveryPaymentMode {
    if (mode === "RestaurantPays") return DELIVERY_PAYMENT_MODE.RestaurantPays;
    if (mode === "Shared") return DELIVERY_PAYMENT_MODE.Shared;
    if (mode === DELIVERY_PAYMENT_MODE.RestaurantPays || mode === DELIVERY_PAYMENT_MODE.Shared) return mode;
    return DELIVERY_PAYMENT_MODE.CustomerPays;
}

export async function getDeliveryZones(query: DeliveryZoneQuery = {}): Promise<DeliveryZonePagedResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const response = await api.get<DeliveryZonePagedApiResult>(DELIVERY_ZONES_ENDPOINT, {
        params: {
            page,
            pageSize,
            search: query.search?.trim() || undefined,
            isActive: query.isActive,
        },
    });
    const data = response.data ?? {};
    return {
        items: data.items ?? [],
        totalCount: data.totalCount ?? 0,
        pageNumber: data.page ?? data.pageNumber ?? page,
        pageSize: data.pageSize ?? pageSize,
        totalPages: data.totalPages ?? Math.max(1, Math.ceil((data.totalCount ?? 0) / pageSize)),
    };
}

export async function getActiveDeliveryZones(): Promise<DeliveryZoneSelectDto[]> {
    // Cache-first: when online the fresh list is fetched and cached; when
    // offline (or the fetch fails) the last-known active zones are returned so
    // the delivery zone selector keeps working instead of showing "No active
    // zones found". Zone Id / name / fee / payment-mode all survive in IDB.
    return cachedReferenceList(activeZonesCacheKey(), async () => {
        const response = await api.get<DeliveryZoneSelectDto[]>(`${DELIVERY_ZONES_ENDPOINT}/active`);
        return response.data ?? [];
    });
}

export async function createDeliveryZone(payload: DeliveryZoneUpsertDto): Promise<DeliveryZoneDto> {
    const response = await api.post<DeliveryZoneDto>(DELIVERY_ZONES_ENDPOINT, payload);
    return response.data;
}

export async function updateDeliveryZone(id: string, payload: DeliveryZoneUpsertDto): Promise<DeliveryZoneDto> {
    const response = await api.put<DeliveryZoneDto>(`${DELIVERY_ZONES_ENDPOINT}/${id}`, payload);
    return response.data;
}

export async function deleteDeliveryZone(id: string): Promise<void> {
    await api.delete(`${DELIVERY_ZONES_ENDPOINT}/${id}`);
}
