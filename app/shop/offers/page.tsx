"use client";

import Link from "next/link";
import { ChevronRight, RefreshCw, Tag } from "lucide-react";
import StoreOfferCard from "@/components/showcase/StoreOfferCard";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { createStoreText } from "@/lib/store-copy";
import { offerPricing } from "@/lib/store-pricing";
import { useOfferCart, useStoreOffers } from "@/lib/use-store-offers";
import { useSettingsStore } from "@/store/settingsStore";
import { useStorefrontStore } from "@/store/storefrontStore";

/**
 * Public offers destination.
 *
 * It shows the bundles the store is genuinely running right now and nothing else — when
 * none are live the page says so plainly rather than padding itself with ordinary products
 * dressed up as deals.
 *
 * The deepest saving leads as a featured panel and the rest follow as a grid, so the page
 * reads as a merchandised destination at two offers and at twenty. The API already returns
 * offers deepest-saving first, so "the lead offer" is not a ranking invented here.
 */
export default function StoreOffersPage() {
    return (
        <StoreShell>
            <div className="sf-container">
                <OffersView />
            </div>
        </StoreShell>
    );
}

function OffersView() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const settings = useSettingsStore(state => state.settings);
    const settingsLoaded = useSettingsStore(state => state.isLoaded);
    const context = useStorefrontStore(state => state.context);
    const contextStatus = useStorefrontStore(state => state.status);
    const { offers, loading: offersLoading, error, reload } = useStoreOffers();
    const cart = useOfferCart(context?.productAvailability ?? [], isAr);
    const format = (value: number) =>
        settingsLoaded && settings.currency ? formatCurrency(value, settings.currency) : "—";

    // Whether a bundle can be sold here is decided by the branch availability the shell
    // loads, so the page waits for it too. Rendering earlier would put "not available in
    // this store" on every offer purely because the answer had not arrived yet — a false
    // claim, and the one thing this section must never make. A failed context is not worth
    // blocking on: the cards then say what they honestly know, and adding one is refused.
    const loading = offersLoading || contextStatus === "idle" || contextStatus === "loading";

    const [lead, ...rest] = offers;
    const deepest = offers.length > 0
        ? Math.max(...offers.map(offer => offerPricing(offer).percent))
        : 0;

    return (
        <div>
            <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1 text-[13px] text-muted-foreground">
                <Link href="/shop" className="transition-colors hover:text-foreground">{text("shop")}</Link>
                <ChevronRight className="size-3.5 rtl:rotate-180" />
                <span className="text-foreground">{text("offers")}</span>
            </nav>

            <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                    <h1 className="sf-page-title">{text("offersTitle")}</h1>
                    <p className="sf-meta mt-1">
                        {loading || offers.length === 0
                            ? text("offersHint")
                            : text(offers.length === 1 ? "offerCountOne" : "offerCountMany")
                                .replace("{n}", String(offers.length))}
                    </p>
                </div>
                {/* The headline number is the largest saving actually on this page. */}
                {!loading && deepest > 0 && (
                    <span className="sf-deal-badge sf-deal-badge--lg">
                        {text("upToPercentOff").replace("{n}", String(deepest))}
                    </span>
                )}
            </header>

            {loading && <OffersSkeleton />}

            {!loading && error && (
                <div role="alert" className="sf-empty">
                    <p className="font-semibold">{text("couldNotLoad")}</p>
                    <p className="sf-meta mx-auto mt-1 max-w-sm">{text("networkError")}</p>
                    <button type="button" onClick={reload} className="sf-btn sf-btn--outline mt-5">
                        <RefreshCw className="size-4" />
                        {text("tryAgain")}
                    </button>
                </div>
            )}

            {!loading && !error && offers.length === 0 && (
                <div className="sf-empty">
                    <Tag className="mx-auto size-8 text-muted-foreground/40" strokeWidth={1.5} />
                    <p className="mt-3 font-semibold">{text("offersEmpty")}</p>
                    <p className="sf-meta mx-auto mt-1 max-w-sm">{text("offersEmptyHint")}</p>
                    <Link href="/shop/all" className="sf-btn sf-btn--primary mt-5">{text("shopNow")}</Link>
                </div>
            )}

            {!loading && !error && offers.length > 0 && (
                <div className="space-y-[var(--sf-gap)]">
                    <StoreOfferCard
                        offer={lead}
                        available={cart.isSellable(lead)}
                        isAr={isAr}
                        format={format}
                        onAdd={cart.add}
                        justAdded={cart.justAddedId === lead.id}
                        priority
                        variant="featured"
                    />

                    {rest.length > 0 && (
                        <div className="grid gap-[var(--sf-gap)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {rest.map((offer, index) => (
                                <StoreOfferCard
                                    key={offer.id}
                                    offer={offer}
                                    available={cart.isSellable(offer)}
                                    isAr={isAr}
                                    format={format}
                                    onAdd={cart.add}
                                    justAdded={cart.justAddedId === offer.id}
                                    priority={index < 2}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function OffersSkeleton() {
    return (
        <div aria-hidden className="space-y-[var(--sf-gap)]">
            <div className="sf-skel h-[22rem] w-full rounded-[var(--sf-radius)]" />
            <div className="grid gap-[var(--sf-gap)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="sf-skel h-[26rem] w-full rounded-[var(--sf-radius)]" />
                ))}
            </div>
        </div>
    );
}
