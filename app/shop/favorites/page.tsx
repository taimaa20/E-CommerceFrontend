"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, RefreshCw } from "lucide-react";
import StoreProductCard from "@/components/showcase/StoreProductCard";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import { onlineShoppingApi, type OnlineStoreProductSet } from "@/lib/api-online-shopping";
import { formatCurrency } from "@/lib/currencies";
import { createStoreText } from "@/lib/store-copy";
import { useStoreCart } from "@/lib/use-store-cart";
import { useStoreFavorites } from "@/lib/use-store-favorites";
import { useSettingsStore } from "@/store/settingsStore";
import { useStorefrontStore } from "@/store/storefrontStore";

export default function StoreFavoritesPage() {
    return (
        <StoreShell>
            <div className="sf-container">
                <FavoritesList />
            </div>
        </StoreShell>
    );
}

/**
 * The shopper's saved products.
 *
 * The ids come from the favourites repository; everything shown about a product comes from the
 * catalogue, fetched on every visit. That split is the whole point: a product whose price
 * changed shows the new price here, and a product that was delisted simply stops appearing
 * instead of rendering stale data or breaking the page.
 */
function FavoritesList() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const favorites = useStoreFavorites();
    const settings = useSettingsStore(state => state.settings);
    const settingsLoaded = useSettingsStore(state => state.isLoaded);
    const branchId = useStorefrontStore(state => state.branchId);

    const [state, setState] = useState<{ key: string; data: OnlineStoreProductSet | null; error: boolean } | null>(null);
    const [revision, setRevision] = useState(0);
    // Keyed by the ids themselves, so removing a favourite re-reads without a manual refresh
    // and switching branch re-checks what is sellable here.
    const requestKey = `${favorites.ids.join(",")}|${branchId ?? ""}|${revision}`;

    useEffect(() => {
        if (favorites.ids.length === 0) {
            setState({ key: requestKey, data: null, error: false });
            return;
        }
        let cancelled = false;
        onlineShoppingApi.getProductSet(favorites.ids, branchId)
            .then(data => { if (!cancelled) setState({ key: requestKey, data, error: false }); })
            .catch(() => { if (!cancelled) setState({ key: requestKey, data: null, error: true }); });
        return () => { cancelled = true; };
        // The request key already encodes every input; `favorites.ids` is a fresh array
        // each render and would otherwise refetch on every paint.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey]);

    const loading = state?.key !== requestKey;
    const error = !loading && !!state?.error;
    const products = state?.key === requestKey ? state.data?.products ?? [] : [];
    const details = new Map((state?.data?.productDetails ?? []).map(row => [row.productId, row]));
    const cart = useStoreCart(state?.data?.productAvailability ?? [], isAr);
    const format = (value: number) =>
        settingsLoaded && settings.currency ? formatCurrency(value, settings.currency) : "—";

    // Saved ids the catalogue no longer returns. Said plainly once, rather than leaving the
    // shopper to wonder why their count and the grid disagree.
    const missingCount = Math.max(0, favorites.ids.length - products.length);

    return (
        <section>
            <div className="mb-5">
                <h1 className="sf-page-title">{text("favorites")}</h1>
                <p className="sf-meta mt-1 max-w-prose">{text("favoritesHint")}</p>
            </div>

            {favorites.ids.length === 0 ? (
                <div className="sf-empty">
                    <Heart className="mx-auto size-7 text-muted-foreground/60" strokeWidth={1.5} />
                    <p className="mt-3 font-semibold">{text("favoritesEmpty")}</p>
                    <p className="sf-meta mx-auto mt-1 max-w-sm">{text("favoritesEmptyHint")}</p>
                    <Link href="/shop" className="sf-btn sf-btn--primary mt-5">{text("shopNow")}</Link>
                </div>
            ) : loading ? (
                <div role="status" aria-live="polite" className="grid grid-cols-2 gap-[var(--sf-gap)] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    <span className="sr-only">{text("loadingProducts")}</span>
                    {favorites.ids.slice(0, 10).map(id => (
                        <div key={id} className="sf-card overflow-hidden">
                            <div className="sf-skel aspect-square w-full rounded-none" />
                            <div className="space-y-2 p-3">
                                <div className="sf-skel h-3.5 w-4/5" />
                                <div className="sf-skel h-3.5 w-1/2" />
                                <div className="sf-skel mt-3 h-[38px] w-full rounded-[10px]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div role="alert" className="sf-empty">
                    <p className="font-semibold">{text("couldNotLoad")}</p>
                    <p className="sf-meta mx-auto mt-1 max-w-sm">{text("networkError")}</p>
                    <button type="button" onClick={() => setRevision(value => value + 1)} className="sf-btn sf-btn--outline mt-5">
                        <RefreshCw className="size-4" />
                        {text("tryAgain")}
                    </button>
                </div>
            ) : products.length === 0 ? (
                <div className="sf-empty">
                    <Heart className="mx-auto size-7 text-muted-foreground/60" strokeWidth={1.5} />
                    <p className="mt-3 font-semibold">{text("favoritesEmpty")}</p>
                    <p className="sf-meta mx-auto mt-1 max-w-sm">{text("favoritesUnavailableNote")}</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Link href="/shop" className="sf-btn sf-btn--primary">{text("shopNow")}</Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* The same tile the grid and the rails use, so a favourite behaves exactly
                        like the product does everywhere else — heart included. */}
                    <div className="grid grid-cols-2 gap-[var(--sf-gap)] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {products.map((product, index) => (
                            <StoreProductCard
                                key={product.id}
                                product={product}
                                details={details.get(product.id)}
                                available={cart.isSellable(product)}
                                remaining={cart.remainingFor(product)}
                                isAr={isAr}
                                format={format}
                                priority={index < 5}
                                justAdded={cart.justAddedId === product.id}
                                onQuickAdd={cart.quickAdd}
                            />
                        ))}
                    </div>
                    {missingCount > 0 && (
                        <p className="sf-meta mt-4">{text("favoritesUnavailableNote")}</p>
                    )}
                </>
            )}
        </section>
    );
}
