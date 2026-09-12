import { api } from "@/lib/api";
import type { CostSharingConfig } from "@/lib/cost-sharing";

export interface PaymentMethodDto extends CostSharingConfig {
    id: string;
    nameEn: string;
    nameAr?: string | null;
    code: string;
    icon?: string | null;
    displayOrder: number;
    isActive: boolean;
    isDefault: boolean;
    requiresReferenceNumber: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentMethodPayload extends CostSharingConfig {
    nameEn: string;
    nameAr?: string | null;
    code: string;
    icon?: string | null;
    displayOrder: number;
    isActive: boolean;
    isDefault: boolean;
    requiresReferenceNumber: boolean;
}

export async function getActivePaymentMethods(): Promise<PaymentMethodDto[]> {
    const response = await api.get<PaymentMethodDto[]>("/payment-methods/active");
    return response.data ?? [];
}

export async function getPaymentMethods(): Promise<PaymentMethodDto[]> {
    const response = await api.get<PaymentMethodDto[]>("/payment-methods");
    return response.data ?? [];
}

export async function createPaymentMethod(payload: PaymentMethodPayload): Promise<PaymentMethodDto> {
    const response = await api.post<PaymentMethodDto>("/payment-methods", payload);
    return response.data;
}

export async function updatePaymentMethod(id: string, payload: PaymentMethodPayload): Promise<PaymentMethodDto> {
    const response = await api.put<PaymentMethodDto>(`/payment-methods/${id}`, payload);
    return response.data;
}

export async function deletePaymentMethod(id: string): Promise<void> {
    await api.delete(`/payment-methods/${id}`);
}

export function getPaymentMethodName(method: PaymentMethodDto | null | undefined, locale: string): string {
    if (!method) return "";
    return locale === "ar"
        ? method.nameAr || method.nameEn
        : method.nameEn || method.nameAr || method.code;
}

export function isCashPaymentMethod(method: Pick<PaymentMethodDto, "code" | "nameEn" | "nameAr">): boolean {
    return method.code.trim().toUpperCase() === "CASH";
}
