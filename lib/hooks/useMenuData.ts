"use client";

import { useCallback, useEffect, useState } from "react";
import { getPublicMenuData } from "@/lib/api";
import { subscribeMenuCacheInvalidation } from "@/lib/menu-cache";
import type { CategoryDto, ProductDto } from "@/types/pos";

interface UseMenuDataResult {
    products: ProductDto[];
    categories: CategoryDto[];
    loading: boolean;
    refresh: () => Promise<void>;
}

export function useMenuData(language: "en" | "ar"): UseMenuDataResult {
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        try {
            const snapshot = await getPublicMenuData(language, { forceRefresh });
            setProducts(snapshot.products);
            setCategories(snapshot.categories);
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        void load(false);
    }, [load]);

    useEffect(() => {
        return subscribeMenuCacheInvalidation((event) => {
            if (event.keys.includes(`menu:${language}`)) {
                void load(true);
            }
        });
    }, [language, load]);

    const refresh = useCallback(async () => {
        await load(true);
    }, [load]);

    return { products, categories, loading, refresh };
}
