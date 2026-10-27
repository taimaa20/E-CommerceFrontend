"use client";

import { useEffect, useState } from "react";
import {
    onlineShoppingApi,
    type OnlineStoreBanner,
    type OnlineStoreHome,
    type OnlineStoreProductPage,
} from "@/lib/api-online-shopping";
import { customerAccountApi } from "@/lib/api-customer-account";
import { useCustomerSessionStore } from "@/store/customerSessionStore";
import { useStorefrontStore } from "@/store/storefrontStore";

interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: boolean;
    reload: () => void;
}

/**
 * One request for the whole storefront home: departments plus the merchandising rows the
 * API decided it can actually support. The page never assembles those rows itself, so it
 * cannot invent a section the catalogue does not back.
 *
 * A signed-in shopper gets the signed-in home instead of the anonymous one — never both, so
 * the store is read once. It waits for the session check so it never loads one and then the
 * other, and a failed signed-in read falls back to the anonymous home: personalisation must
 * never cost the shopper the page.
 */
export function useStoreHome(): AsyncState<OnlineStoreHome> {
    const branchId = useStorefrontStore(state => state.branchId);
    const session = useCustomerSessionStore(state => state.status);
    return useRemote(
        `home:${branchId ?? ""}:${session}`,
        () => session === "authenticated"
            ? customerAccountApi.getStorefrontHome(branchId).catch(() => onlineShoppingApi.getHome(branchId))
            : onlineShoppingApi.getHome(branchId),
        [branchId, session],
        session !== "unknown",
    );
}

/**
 * Scheduled promotional banners for the home page.
 *
 * Banners are decoration: a failure resolves to an empty list so the store still renders
 * its own hero rather than an error, exactly as it did before banners existed.
 */
export function useStoreBanners(): { banners: OnlineStoreBanner[]; loading: boolean } {
    const branchId = useStorefrontStore(state => state.branchId);
    const [state, setState] = useState<{ key: string; banners: OnlineStoreBanner[] } | null>(null);
    const key = `banners:${branchId ?? ""}`;

    useEffect(() => {
        let cancelled = false;
        onlineShoppingApi.getBanners(branchId)
            .then(banners => { if (!cancelled) setState({ key, banners: banners ?? [] }); })
            .catch(() => { if (!cancelled) setState({ key, banners: [] }); });
        return () => { cancelled = true; };
    }, [key, branchId]);

    return { banners: state?.key === key ? state.banners : [], loading: state?.key !== key };
}

/** Product, gallery, attributes and same-department neighbours in one request. */
export function useStoreProduct(productId: string): AsyncState<OnlineStoreProductPage> {
    const branchId = useStorefrontStore(state => state.branchId);
    return useRemote(
        `product:${productId}:${branchId ?? ""}`,
        () => onlineShoppingApi.getProductPage(productId, branchId),
        [productId, branchId],
    );
}

/**
 * Minimal fetch-on-key helper shared by the two storefront reads above.
 *
 * `loading` is derived by comparing the request key with the key of the result already in
 * state, so a branch switch keeps the previous screen visible instead of flashing empty.
 */
function useRemote<T>(
    key: string,
    load: () => Promise<T>,
    deps: unknown[],
    enabled = true,
): AsyncState<T> {
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState<{ key: string; data: T | null; error: boolean } | null>(null);
    const requestKey = `${key}:${revision}`;

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        load()
            .then(data => { if (!cancelled) setResult({ key: requestKey, data, error: false }); })
            .catch(() => { if (!cancelled) setResult({ key: requestKey, data: null, error: true }); });
        return () => { cancelled = true; };
        // `load` is recreated every render; the dependency list is the real input set.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey, enabled, ...deps]);

    const loading = result?.key !== requestKey;
    return {
        data: result?.data ?? null,
        loading,
        error: !loading && !!result?.error,
        reload: () => setRevision(value => value + 1),
    };
}
