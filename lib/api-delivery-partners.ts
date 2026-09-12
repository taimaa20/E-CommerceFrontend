import { api } from "@/lib/api";
import { getSelectedBranchCacheKey } from "@/lib/branch-selection";
import type { CostSharingConfig } from "@/lib/cost-sharing";
import { cachedReferenceList } from "@/lib/offline/reference-cache";

const DELIVERY_PARTNERS_ENDPOINT = "/deliverypartners";
// Reference-cache key for the active partner list. Warmed online so the
// partner-order dialog can resolve partner Id / Name / Code / Type while
// offline instead of rendering an empty dropdown.
const ACTIVE_PARTNERS_CACHE_KEY_PREFIX = "delivery-partners:active";

export const DELIVERY_PARTNER_STATUS = {
    Active: 0,
    Disabled: 1,
} as const;

export const DELIVERY_PARTNER_PRICING_RULE = {
    None: 0,
    PercentageIncrease: 1,
    PercentageDiscount: 2,
    FixedIncrease: 3,
    FixedDiscount: 4,
    CustomPrice: 5,
} as const;

export const DELIVERY_PARTNER_DELIVERY_COST_RULE = {
    ManualEntry: 0,
    FixedAmount: 1,
    PercentageOfDeliveryFee: 2,
} as const;

export type DeliveryPartnerStatus = typeof DELIVERY_PARTNER_STATUS[keyof typeof DELIVERY_PARTNER_STATUS];
export type DeliveryPartnerPricingRule = typeof DELIVERY_PARTNER_PRICING_RULE[keyof typeof DELIVERY_PARTNER_PRICING_RULE];
export type DeliveryPartnerDeliveryCostRule = typeof DELIVERY_PARTNER_DELIVERY_COST_RULE[keyof typeof DELIVERY_PARTNER_DELIVERY_COST_RULE];

export interface DeliveryPartnerDto extends CostSharingConfig {
    id: string;
    name: string;
    nameAr?: string | null;
    code: string;
    description?: string | null;
    descriptionAr?: string | null;
    logoUrl?: string | null;
    status: DeliveryPartnerStatus;
    defaultPricingRuleType: DeliveryPartnerPricingRule;
    defaultPricingRuleValue: number;
    deliveryCostRuleType: DeliveryPartnerDeliveryCostRule;
    defaultDeliveryCostValue: number;
    integrationEnabled: boolean;
    integrationSettingsJson?: string | null;
    hasCredentials: boolean;
    sortOrder: number;
    productMappingCount: number;
    enabledProductCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface DeliveryPartnerUpsertDto extends CostSharingConfig {
    name: string;
    nameAr?: string | null;
    code: string;
    description?: string | null;
    descriptionAr?: string | null;
    logoUrl?: string | null;
    status: DeliveryPartnerStatus;
    defaultPricingRuleType: DeliveryPartnerPricingRule;
    defaultPricingRuleValue: number;
    deliveryCostRuleType: DeliveryPartnerDeliveryCostRule;
    defaultDeliveryCostValue: number;
    integrationEnabled: boolean;
    integrationSettingsJson?: string | null;
    credentialsJson?: string | null;
    sortOrder: number;
}

export interface DeliveryPartnerPage {
    items: DeliveryPartnerDto[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

interface DeliveryPartnerPageApi {
    items?: DeliveryPartnerDto[];
    totalCount?: number;
    page?: number;
    pageNumber?: number;
    pageSize?: number;
    totalPages?: number;
}

export interface DeliveryPartnerProductMappingDto {
    id?: string | null;
    partnerId: string;
    partnerName: string;
    partnerNameAr?: string | null;
    partnerCode: string;
    partnerStatus: DeliveryPartnerStatus;
    partnerDefaultPricingRuleType: DeliveryPartnerPricingRule;
    partnerDefaultPricingRuleValue: number;
    productId: string;
    productName: string;
    productNameAr?: string | null;
    productCategoryId?: string | null;
    productCategoryName?: string | null;
    productCategoryNameAr?: string | null;
    productBasePrice: number;
    productIsActive: boolean;
    partnerProductId?: string | null;
    isEnabled: boolean;
    isAvailable: boolean;
    pricingRuleType?: DeliveryPartnerPricingRule | null;
    pricingRuleValue?: number | null;
    customPrice?: number | null;
    effectivePrice: number;
    effectivePricingRuleType: DeliveryPartnerPricingRule;
    effectivePricingRuleValue: number;
    priceSource: string;
    availableStartDate?: string | null;
    availableEndDate?: string | null;
    availableFrom?: string | null;
    availableTo?: string | null;
    updatedAt?: string | null;
}

export interface DeliveryPartnerProductMappingUpsertDto {
    partnerProductId?: string | null;
    isEnabled: boolean;
    isAvailable: boolean;
    pricingRuleType?: DeliveryPartnerPricingRule | null;
    pricingRuleValue?: number | null;
    customPrice?: number | null;
    availableStartDate?: string | null;
    availableEndDate?: string | null;
    availableFrom?: string | null;
    availableTo?: string | null;
}

export interface DeliveryPartnerProductPage {
    items: DeliveryPartnerProductMappingDto[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

interface DeliveryPartnerProductPageApi {
    items?: DeliveryPartnerProductMappingDto[];
    totalCount?: number;
    page?: number;
    pageNumber?: number;
    pageSize?: number;
    totalPages?: number;
}

export function getDeliveryPartnerName(partner: Pick<DeliveryPartnerDto, "name" | "nameAr">, ar: boolean): string {
    return ar ? (partner.nameAr || partner.name) : partner.name;
}

export function getDeliveryPartnerMappingPartnerName(row: Pick<DeliveryPartnerProductMappingDto, "partnerName" | "partnerNameAr">, ar: boolean): string {
    return ar ? (row.partnerNameAr || row.partnerName) : row.partnerName;
}

export function getDeliveryPartnerMappingProductName(row: Pick<DeliveryPartnerProductMappingDto, "productName" | "productNameAr">, ar: boolean): string {
    return ar ? (row.productNameAr || row.productName) : row.productName;
}

export function getDeliveryPartnerMappingCategoryName(
    row: Pick<DeliveryPartnerProductMappingDto, "productCategoryName" | "productCategoryNameAr">,
    ar: boolean,
): string {
    return ar ? (row.productCategoryNameAr || row.productCategoryName || "") : (row.productCategoryName || row.productCategoryNameAr || "");
}

export function getPricingRuleLabel(rule: DeliveryPartnerPricingRule | null | undefined, ar: boolean): string {
    if (rule === DELIVERY_PARTNER_PRICING_RULE.PercentageIncrease) return ar ? "زيادة بالنسبة" : "Percentage increase";
    if (rule === DELIVERY_PARTNER_PRICING_RULE.PercentageDiscount) return ar ? "خصم بالنسبة" : "Percentage discount";
    if (rule === DELIVERY_PARTNER_PRICING_RULE.FixedIncrease) return ar ? "زيادة ثابتة" : "Fixed increase";
    if (rule === DELIVERY_PARTNER_PRICING_RULE.FixedDiscount) return ar ? "خصم ثابت" : "Fixed discount";
    if (rule === DELIVERY_PARTNER_PRICING_RULE.CustomPrice) return ar ? "سعر مخصص" : "Custom price";
    return ar ? "بدون تعديل" : "No adjustment";
}

export function calculateDeliveryPartnerPrice(
    basePrice: number,
    rule: DeliveryPartnerPricingRule,
    value: number,
    customPrice?: number | null,
): number {
    const result =
        rule === DELIVERY_PARTNER_PRICING_RULE.PercentageIncrease ? basePrice + (basePrice * value / 100) :
        rule === DELIVERY_PARTNER_PRICING_RULE.PercentageDiscount ? basePrice - (basePrice * value / 100) :
        rule === DELIVERY_PARTNER_PRICING_RULE.FixedIncrease ? basePrice + value :
        rule === DELIVERY_PARTNER_PRICING_RULE.FixedDiscount ? basePrice - value :
        rule === DELIVERY_PARTNER_PRICING_RULE.CustomPrice ? (customPrice ?? basePrice) :
        basePrice;

    if (!Number.isFinite(result) || result <= 0) return 0;

    return rule === DELIVERY_PARTNER_PRICING_RULE.CustomPrice
        ? result
        : Math.round((result + Number.EPSILON) * 100) / 100;
}

export function resolveMappingEffectivePrice(row: DeliveryPartnerProductMappingDto): DeliveryPartnerProductMappingDto {
    const rule = row.pricingRuleType ?? row.partnerDefaultPricingRuleType;
    const value = row.pricingRuleType == null ? row.partnerDefaultPricingRuleValue : (row.pricingRuleValue ?? 0);
    const customPrice = row.pricingRuleType === DELIVERY_PARTNER_PRICING_RULE.CustomPrice ? row.customPrice : undefined;
    return {
        ...row,
        effectivePricingRuleType: rule,
        effectivePricingRuleValue: rule === DELIVERY_PARTNER_PRICING_RULE.CustomPrice ? (row.customPrice ?? 0) : value,
        effectivePrice: calculateDeliveryPartnerPrice(row.productBasePrice, rule, value, customPrice),
        priceSource: row.pricingRuleType == null ? "PartnerDefault" : "ProductOverride",
    };
}

export async function getDeliveryPartners(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: DeliveryPartnerStatus;
} = {}): Promise<DeliveryPartnerPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const response = await api.get<DeliveryPartnerPageApi>(DELIVERY_PARTNERS_ENDPOINT, {
        params: { page, pageSize, search: query.search?.trim() || undefined, status: query.status },
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

export async function getActiveDeliveryPartners(): Promise<DeliveryPartnerDto[]> {
    // Cache-first so the partner-order dialog still lists partners offline. The
    // last-known active partners are read from IDB when the network is down.
    const cacheKey = `${ACTIVE_PARTNERS_CACHE_KEY_PREFIX}:${getSelectedBranchCacheKey()}`;
    return cachedReferenceList(cacheKey, async () => {
        const response = await api.get<DeliveryPartnerDto[]>(`${DELIVERY_PARTNERS_ENDPOINT}/active`);
        return response.data ?? [];
    });
}

export async function getDeliveryPartner(id: string): Promise<DeliveryPartnerDto> {
    const response = await api.get<DeliveryPartnerDto>(`${DELIVERY_PARTNERS_ENDPOINT}/${id}`);
    return response.data;
}

export async function createDeliveryPartner(payload: DeliveryPartnerUpsertDto): Promise<DeliveryPartnerDto> {
    const response = await api.post<DeliveryPartnerDto>(DELIVERY_PARTNERS_ENDPOINT, payload);
    return response.data;
}

export async function updateDeliveryPartner(id: string, payload: DeliveryPartnerUpsertDto): Promise<DeliveryPartnerDto> {
    const response = await api.put<DeliveryPartnerDto>(`${DELIVERY_PARTNERS_ENDPOINT}/${id}`, payload);
    return response.data;
}

export async function deleteDeliveryPartner(id: string): Promise<void> {
    await api.delete(`${DELIVERY_PARTNERS_ENDPOINT}/${id}`);
}

export async function getDeliveryPartnerProductMappings(productId: string): Promise<DeliveryPartnerProductMappingDto[]> {
    const response = await api.get<DeliveryPartnerProductMappingDto[]>(
        `${DELIVERY_PARTNERS_ENDPOINT}/products/${productId}/mappings`,
    );
    return (response.data ?? []).map(resolveMappingEffectivePrice);
}

export async function upsertDeliveryPartnerProductMapping(
    productId: string,
    partnerId: string,
    payload: DeliveryPartnerProductMappingUpsertDto,
): Promise<DeliveryPartnerProductMappingDto> {
    const response = await api.put<DeliveryPartnerProductMappingDto>(
        `${DELIVERY_PARTNERS_ENDPOINT}/products/${productId}/mappings/${partnerId}`,
        payload,
    );
    return resolveMappingEffectivePrice(response.data);
}

export async function getDeliveryPartnerProducts(partnerId: string, query: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
    enabledOnly?: boolean;
} = {}): Promise<DeliveryPartnerProductPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const response = await api.get<DeliveryPartnerProductPageApi>(`${DELIVERY_PARTNERS_ENDPOINT}/${partnerId}/products`, {
        params: {
            page,
            pageSize,
            search: query.search?.trim() || undefined,
            categoryId: query.categoryId || undefined,
            enabledOnly: query.enabledOnly,
        },
    });
    const data = response.data ?? {};
    return {
        items: (data.items ?? []).map(resolveMappingEffectivePrice),
        totalCount: data.totalCount ?? 0,
        pageNumber: data.page ?? data.pageNumber ?? page,
        pageSize: data.pageSize ?? pageSize,
        totalPages: data.totalPages ?? Math.max(1, Math.ceil((data.totalCount ?? 0) / pageSize)),
    };
}
