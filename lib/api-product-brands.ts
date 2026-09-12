import { api } from "@/lib/api";

/**
 * Brand identity for the catalogue. A brand row carries the artwork and the Arabic name for a
 * brand the products already name in text — it never prices or stocks anything.
 */
export interface ProductBrand {
    id: string;
    name: string;
    nameAr?: string;
    logoUrl?: string;
    logoKey?: string;
    isActive: boolean;
    sortOrder: number;
    /** Catalogue products whose brand text resolves to this row. */
    productCount: number;
}

/** A brand the catalogue already uses that has no row — and therefore no logo — yet. */
export interface UnregisteredProductBrand {
    name: string;
    productCount: number;
}

export interface ProductBrandInput {
    name: string;
    nameAr?: string;
    logoUrl?: string;
    logoKey?: string;
    isActive: boolean;
    sortOrder: number;
}

const BASE = "/product-brands";

export const productBrandApi = {
    list: async (): Promise<ProductBrand[]> =>
        (await api.get<ProductBrand[]>(BASE)).data ?? [],

    unregistered: async (): Promise<UnregisteredProductBrand[]> =>
        (await api.get<UnregisteredProductBrand[]>(`${BASE}/unregistered`)).data ?? [],

    create: async (input: ProductBrandInput): Promise<ProductBrand> =>
        (await api.post<ProductBrand>(BASE, input)).data,

    update: async (id: string, input: ProductBrandInput): Promise<ProductBrand> =>
        (await api.put<ProductBrand>(`${BASE}/${id}`, input)).data,

    remove: async (id: string): Promise<void> => {
        await api.delete(`${BASE}/${id}`);
    },
};
