import { api } from "@/lib/api";

// Matches the backend DiscountValueType enum (serialized as a number). A group's value is a
// percentage of the base (Percentage) or a flat currency amount (FixedAmount).
export enum DiscountValueType {
    Percentage = 0,
    FixedAmount = 1,
}

export interface DiscountGroup {
    id: string;
    name: string;
    nameAr?: string | null;
    discountType: DiscountValueType;
    discountValue: number;
    isActive: boolean;
    description?: string | null;
    verificationNote?: string | null;
    createdAt: string;
    updatedAt: string;
}

// Lightweight option surfaced to the cashier/order screen.
export interface DiscountGroupOption {
    id: string;
    name: string;
    nameAr?: string | null;
    discountType: DiscountValueType;
    discountValue: number;
    verificationNote?: string | null;
}

export interface DiscountGroupUpsert {
    name: string;
    nameAr?: string | null;
    discountType: DiscountValueType;
    discountValue: number;
    isActive: boolean;
    description?: string | null;
    verificationNote?: string | null;
}

export const discountGroupsApi = {
    // Management list (active + inactive).
    list: async (): Promise<DiscountGroup[]> => {
        const response = await api.get<DiscountGroup[]>("/discountgroups");
        return response.data ?? [];
    },

    // Cashier/order screen: active groups only.
    active: async (): Promise<DiscountGroupOption[]> => {
        const response = await api.get<DiscountGroupOption[]>("/discountgroups/active");
        return response.data ?? [];
    },

    create: async (payload: DiscountGroupUpsert): Promise<DiscountGroup> => {
        const response = await api.post<DiscountGroup>("/discountgroups", payload);
        return response.data;
    },

    update: async (id: string, payload: DiscountGroupUpsert): Promise<DiscountGroup> => {
        const response = await api.put<DiscountGroup>(`/discountgroups/${id}`, payload);
        return response.data;
    },

    setActive: async (id: string, isActive: boolean): Promise<DiscountGroup> => {
        const response = await api.patch<DiscountGroup>(`/discountgroups/${id}/active`, { isActive });
        return response.data;
    },
};
