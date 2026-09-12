import { api } from "@/lib/api";
import type { DeliveryPaymentMode } from "@/lib/api-delivery";

export type BranchConfigurationKind =
    | "products"
    | "categories"
    | "subcategories"
    | "modifiers"
    | "modifier-groups"
    | "product-options"
    | "payment-methods"
    | "delivery-partners"
    | "delivery-zones"
    | "printers"
    | "offers"
    | "settings";

export interface BranchConfigurationOption {
    id: string;
    name: string;
    nameAr?: string | null;
    code?: string | null;
    secondaryLabel?: string | null;
    isActive: boolean;
}

/** Offers keep their legacy int PK, so their option list uses a numeric id. */
export interface BranchConfigurationOfferOption {
    id: number;
    name: string;
    nameAr?: string | null;
    isActive: boolean;
}

export interface BranchConfigurationOptions {
    branches: BranchConfigurationOption[];
    products: BranchConfigurationOption[];
    categories: BranchConfigurationOption[];
    subcategories: BranchConfigurationOption[];
    modifiers: BranchConfigurationOption[];
    modifierGroups: BranchConfigurationOption[];
    productOptions: BranchConfigurationOption[];
    paymentMethods: BranchConfigurationOption[];
    deliveryPartners: BranchConfigurationOption[];
    printers: BranchConfigurationOption[];
    offers: BranchConfigurationOfferOption[];
}

export interface BranchConfigurationPage<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface BranchConfigurationBase {
    id: string;
    tenantId: string;
    branchId: string;
    branchName: string;
    branchNameAr?: string | null;
    branchCode: string;
    createdById?: string | null;
    updatedById?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BranchProductConfiguration extends BranchConfigurationBase {
    productId: string;
    productName: string;
    productNameAr?: string | null;
    categoryName?: string | null;
    categoryNameAr?: string | null;
    productIsActive: boolean;
    isAvailable: boolean;
    isVisible: boolean;
    displayOrder: number;
}

export interface BranchCategoryConfiguration extends BranchConfigurationBase {
    categoryId: string;
    categoryName: string;
    categoryNameAr?: string | null;
    categoryIsActive: boolean;
    isVisible: boolean;
    displayOrder: number;
}

export interface BranchSubcategoryConfiguration extends BranchConfigurationBase {
    subcategoryId: string;
    subcategoryName: string;
    subcategoryNameAr?: string | null;
    categoryName: string;
    categoryNameAr?: string | null;
    subcategoryIsActive: boolean;
    isVisible: boolean;
    displayOrder: number;
}

export interface BranchModifierConfiguration extends BranchConfigurationBase {
    modifierId: string;
    modifierName: string;
    modifierNameAr?: string | null;
    modifierGroupName: string;
    modifierGroupNameAr?: string | null;
    modifierIsActive: boolean;
    isAvailable: boolean;
}

export interface BranchModifierGroupConfiguration extends BranchConfigurationBase {
    modifierGroupId: string;
    modifierGroupName: string;
    modifierGroupNameAr?: string | null;
    selectionType: number;
    isRequired: boolean;
    isAvailable: boolean;
    isVisible: boolean;
    displayOrder: number;
}

export interface BranchProductOptionConfiguration extends BranchConfigurationBase {
    productOptionId: string;
    productOptionName: string;
    productOptionNameAr?: string | null;
    productId: string;
    productName: string;
    productNameAr?: string | null;
    productOptionIsActive: boolean;
    isAvailable: boolean;
    isVisible: boolean;
    displayOrder: number;
}

export interface BranchPaymentMethodConfiguration extends BranchConfigurationBase {
    paymentMethodId: string;
    paymentMethodName: string;
    paymentMethodNameAr?: string | null;
    paymentMethodCode: string;
    paymentMethodIsActive: boolean;
    isEnabled: boolean;
}

export interface BranchDeliveryPartnerConfiguration extends BranchConfigurationBase {
    deliveryPartnerId: string;
    deliveryPartnerName: string;
    deliveryPartnerNameAr?: string | null;
    deliveryPartnerCode: string;
    deliveryPartnerIsActive: boolean;
    isEnabled: boolean;
}

export interface BranchDeliveryZoneConfiguration extends BranchConfigurationBase {
    nameEn: string;
    nameAr?: string | null;
    code: string;
    deliveryFee: number;
    deliveryCost: number;
    paymentMode: DeliveryPaymentMode;
    centerLatitude?: number | null;
    centerLongitude?: number | null;
    radiusMeters?: number | null;
    isActive: boolean;
    displayOrder: number;
    notes?: string | null;
}

export interface BranchPrinterConfiguration extends BranchConfigurationBase {
    printerId: string;
    printerName: string;
    printerNameAr?: string | null;
    printerIsActive: boolean;
    printerIsReceiptPrinter: boolean;
    printerKitchenName?: string | null;
    printerKitchenNameAr?: string | null;
    isEnabled: boolean;
    displayOrder: number;
}

export interface BranchOfferConfiguration extends BranchConfigurationBase {
    offerId: number;
    offerName: string;
    offerNameAr?: string | null;
    offerIsActive: boolean;
    isEnabled: boolean;
}

export interface BranchSettingsConfiguration extends BranchConfigurationBase {
    settingKey: string;
    settingValue?: string | null;
    valueType: string;
    description?: string | null;
    isEnabled: boolean;
}

export type BranchConfigurationRow =
    | BranchProductConfiguration
    | BranchCategoryConfiguration
    | BranchSubcategoryConfiguration
    | BranchModifierConfiguration
    | BranchModifierGroupConfiguration
    | BranchProductOptionConfiguration
    | BranchPaymentMethodConfiguration
    | BranchDeliveryPartnerConfiguration
    | BranchDeliveryZoneConfiguration
    | BranchPrinterConfiguration
    | BranchOfferConfiguration
    | BranchSettingsConfiguration;

export interface BranchConfigurationPayload {
    branchId: string;
    productId?: string;
    categoryId?: string;
    subcategoryId?: string;
    modifierId?: string;
    modifierGroupId?: string;
    productOptionId?: string;
    paymentMethodId?: string;
    deliveryPartnerId?: string;
    deliveryZoneId?: string;
    printerId?: string;
    offerId?: number;
    nameEn?: string;
    nameAr?: string | null;
    code?: string;
    deliveryFee?: number;
    deliveryCost?: number;
    paymentMode?: DeliveryPaymentMode;
    centerLatitude?: number | null;
    centerLongitude?: number | null;
    radiusMeters?: number | null;
    notes?: string | null;
    isActive?: boolean;
    settingKey?: string;
    settingValue?: string | null;
    valueType?: string;
    description?: string | null;
    isAvailable?: boolean;
    isVisible?: boolean;
    isEnabled?: boolean;
    displayOrder?: number;
}

const ENDPOINT = "/branch-configurations";

export async function getBranchConfigurationOptions(): Promise<BranchConfigurationOptions> {
    const response = await api.get<BranchConfigurationOptions>(`${ENDPOINT}/options`);
    return response.data;
}

export async function getBranchConfigurations<T extends BranchConfigurationRow>(
    kind: BranchConfigurationKind,
    query: {
        branchId?: string;
        productId?: string;
        categoryId?: string;
        subcategoryId?: string;
        modifierId?: string;
        modifierGroupId?: string;
        productOptionId?: string;
        paymentMethodId?: string;
        deliveryPartnerId?: string;
        deliveryZoneId?: string;
        printerId?: string;
        offerId?: number;
        search?: string;
        page?: number;
        pageSize?: number;
    } = {}
): Promise<BranchConfigurationPage<T>> {
    const response = await api.get<BranchConfigurationPage<T>>(`${ENDPOINT}/${kind}`, {
        params: {
            branchId: query.branchId || undefined,
            productId: query.productId || undefined,
            categoryId: query.categoryId || undefined,
            subcategoryId: query.subcategoryId || undefined,
            modifierId: query.modifierId || undefined,
            modifierGroupId: query.modifierGroupId || undefined,
            productOptionId: query.productOptionId || undefined,
            paymentMethodId: query.paymentMethodId || undefined,
            deliveryPartnerId: query.deliveryPartnerId || undefined,
            deliveryZoneId: query.deliveryZoneId || undefined,
            printerId: query.printerId || undefined,
            offerId: query.offerId || undefined,
            search: query.search?.trim() || undefined,
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 25,
        },
    });
    return response.data;
}

export async function createBranchConfiguration<T extends BranchConfigurationRow>(
    kind: BranchConfigurationKind,
    payload: BranchConfigurationPayload
): Promise<T> {
    const response = await api.post<T>(`${ENDPOINT}/${kind}`, payload);
    return response.data;
}

export async function updateBranchConfiguration<T extends BranchConfigurationRow>(
    kind: BranchConfigurationKind,
    id: string,
    payload: BranchConfigurationPayload
): Promise<T> {
    const response = await api.put<T>(`${ENDPOINT}/${kind}/${id}`, payload);
    return response.data;
}

export async function deleteBranchConfiguration(kind: BranchConfigurationKind, id: string): Promise<void> {
    await api.delete(`${ENDPOINT}/${kind}/${id}`);
}
