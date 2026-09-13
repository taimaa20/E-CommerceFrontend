import { api } from "@/lib/api";

/**
 * Currency lookup: which currency codes the business may select, and how each is named.
 *
 * It is metadata, not money. No amount is stored against a currency row, nothing converts
 * between them, and deactivating one only withdraws it from new selection — every record that
 * already names the code keeps its meaning.
 */
export interface CurrencyLookup {
    id: string;
    /** ISO-4217 code. Business identity, and fixed once the currency is created. */
    code: string;
    name: string;
    nameAr?: string;
    displayName: string;
    symbol?: string;
    isActive: boolean;
    sortOrder: number;
    /** True for the currency the store operates in today. It cannot be deactivated. */
    isStoreCurrency: boolean;
}

export interface CurrencyCreateInput {
    code: string;
    name: string;
    nameAr?: string;
    symbol?: string;
    isActive: boolean;
    sortOrder: number;
}

/** Carries no code — a currency's code is never edited after it exists. */
export type CurrencyUpdateInput = Omit<CurrencyCreateInput, "code">;

const BASE = "/currencies";

export const currencyApi = {
    /** `activeOnly` is what a selector asks for, so no caller filters the list itself. */
    list: async (activeOnly = false): Promise<CurrencyLookup[]> =>
        (await api.get<CurrencyLookup[]>(BASE, { params: { activeOnly } })).data ?? [],

    create: async (input: CurrencyCreateInput): Promise<CurrencyLookup> =>
        (await api.post<CurrencyLookup>(BASE, input)).data,

    update: async (id: string, input: CurrencyUpdateInput): Promise<CurrencyLookup> =>
        (await api.put<CurrencyLookup>(`${BASE}/${id}`, input)).data,
};
