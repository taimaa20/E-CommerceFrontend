"use client";

import { useEffect, useState } from "react";
import {
    onlineShoppingApi,
    type OnlineStoreCatalog,
    type OnlineStoreSort,
} from "@/lib/api-online-shopping";
import { useStorefrontStore } from "@/store/storefrontStore";

export const STORE_PAGE_SIZE = 12;

export interface StoreCatalogState {
    catalog: OnlineStoreCatalog | null;
    loading: boolean;
    error: boolean;
    reload: () => void;
}

interface CatalogResult {
    key: string;
    catalog: OnlineStoreCatalog | null;
    error: boolean;
}

/**
 * Loads one page of the public catalogue. Category, search term and page are the
 * only inputs — the server does the filtering and the paging, so a large
 * catalogue never lands in the browser at once. `branchId` is the shopper's
 * explicit branch choice; when it is undefined the API resolves the main branch.
 *
 * `loading` is derived by comparing the request key with the key of the result
 * held in state, so the previous page stays on screen (category header, counts)
 * while the next one is fetched.
 */
export function useStoreCatalog(params: {
    categoryId?: string;
    subcategoryId?: string;
    search: string;
    page: number;
    sort?: OnlineStoreSort;
    /** Category-only screens pass 1 so they do not download a product page they never render. */
    pageSize?: number;
}): StoreCatalogState {
    const branchId = useStorefrontStore(state => state.branchId);
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState<CatalogResult | null>(null);
    const { categoryId, subcategoryId, search, page, sort = "Featured", pageSize = STORE_PAGE_SIZE } = params;
    const key = JSON.stringify([categoryId ?? "", subcategoryId ?? "", search, page, sort, pageSize, branchId ?? "", revision]);

    useEffect(() => {
        let cancelled = false;
        onlineShoppingApi
            .getCatalog({ categoryId, subcategoryId, search, page, sort, pageSize }, branchId)
            .then(catalog => { if (!cancelled) setResult({ key, catalog, error: false }); })
            .catch(() => { if (!cancelled) setResult({ key, catalog: null, error: true }); });
        return () => { cancelled = true; };
    }, [key, categoryId, subcategoryId, search, page, sort, pageSize, branchId]);

    const loading = result?.key !== key;
    return {
        catalog: result?.catalog ?? null,
        loading,
        error: !loading && !!result?.error,
        reload: () => setRevision(value => value + 1),
    };
}
