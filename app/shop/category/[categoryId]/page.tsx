"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import StoreCatalogBrowser from "@/components/showcase/StoreCatalogBrowser";
import StoreImage from "@/components/showcase/StoreImage";
import StoreOfferShelf from "@/components/showcase/StoreOfferShelf";
import StoreSectionHeading from "@/components/showcase/StoreSectionHeading";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import type { OnlineStoreCategory, OnlineStoreOffer } from "@/lib/api-online-shopping";
import { formatCurrency } from "@/lib/currencies";
import { createStoreText } from "@/lib/store-copy";
import { categoryDealPercent, offerProductIds, summariseOffersByCategory } from "@/lib/store-pricing";
import type { CategoryOfferSummary } from "@/lib/store-pricing";
import { useOfferCart, useSellableOffers, type OfferCartHelpers } from "@/lib/use-store-offers";
import { useSettingsStore } from "@/store/settingsStore";
import { useStorefrontStore } from "@/store/storefrontStore";

export default function StoreCategoryPage() {
    return (
        <StoreShell>
            <div className="sf-container">
                <Suspense fallback={<CategorySkeleton />}>
                    <CategoryBrowser />
                </Suspense>
            </div>
        </StoreShell>
    );
}

function CategoryBrowser() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const params = useParams<{ categoryId: string }>();
    const categoryId = params.categoryId;

    const settings = useSettingsStore(state => state.settings);
    const settingsLoaded = useSettingsStore(state => state.isLoaded);
    const context = useStorefrontStore(state => state.context);
    const offers = useSellableOffers();
    const offerCart = useOfferCart(context?.productAvailability ?? [], isAr);
    const format = (value: number) =>
        settingsLoaded && settings.currency ? formatCurrency(value, settings.currency) : "—";

    // A department's offers are the live bundles that contain one of its products. The
    // filter runs on the payload the store already loads for the deals row, so entering a
    // department costs no extra request and cannot show an offer the home page would not.
    const categoryOffers = offers.filter(offer =>
        offer.items.some(item => item.categoryId === categoryId),
    );
    const inOffer = offerProductIds(categoryOffers);
    // What those bundles do to this department's own products, summarised the same way the
    // department tile on the home page summarises it.
    const offerSummary = summariseOffersByCategory(categoryOffers).get(categoryId);

    return (
        <StoreCatalogBrowser
            basePath={`/shop/category/${categoryId}`}
            categoryId={categoryId}
            inOffer={inOffer}
            // The browser already loads the catalogue page; the header reads the department
            // out of that same response instead of fetching it again.
            header={({ category, loading }) => (
                <>
                    <CategoryHeader
                        category={category}
                        loading={loading}
                        isAr={isAr}
                        offers={offerSummary}
                    />
                    {/* Offers lead the department, because a shopper who scrolls a grid of
                        sixty products will never find them on their own. The grid below is
                        unchanged and still lists every product, these included — the rail
                        is a signpost to the bundle price, not a second catalogue. */}
                    {categoryOffers.length > 0 && (
                        <CategoryOffers
                            offers={categoryOffers}
                            cart={offerCart}
                            isAr={isAr}
                            format={format}
                        />
                    )}
                </>
            )}
            emptyAction={
                <Link href="/shop/categories" className="sf-btn sf-btn--outline">{text("categories")}</Link>
            }
        />
    );
}

/** The offers band between a department's header and its product grid. */
function CategoryOffers({
    offers,
    cart,
    isAr,
    format,
}: {
    offers: OnlineStoreOffer[];
    cart: OfferCartHelpers;
    isAr: boolean;
    format: (value: number) => string;
}) {
    const text = createStoreText(isAr);

    return (
        <section className="mb-8">
            <StoreSectionHeading
                eyebrow={text("offers")}
                title={text("offersInCategory")}
                hint={text("offersInCategoryHint")}
                href="/shop/offers"
                linkLabel={text("viewAll")}
            />
            <StoreOfferShelf offers={offers} cart={cart} isAr={isAr} format={format} />
            <h2 className="sf-section-title mt-8 border-t pt-6">{text("allProductsHeading")}</h2>
        </section>
    );
}

/**
 * Department header. The image is a badge, never a tall banner, so the first row of
 * products stays close to the fold.
 */
function CategoryHeader({
    category,
    loading,
    isAr,
    offers,
}: {
    category?: OnlineStoreCategory;
    loading: boolean;
    isAr: boolean;
    /** What the live bundles do to this department's products. */
    offers?: CategoryOfferSummary;
}) {
    const text = createStoreText(isAr);
    const name = category ? (isAr ? category.nameAr || category.name : category.name) : "";
    // The same rule the department tile uses, so a shopper who saw "25% off" on the tile is
    // not met with "up to 25% off" on arriving here.
    const { percent, upTo } = categoryDealPercent(category ?? {}, offers);

    return (
        <>
            <nav aria-label="breadcrumb" className="mb-3 flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
                <Link href="/shop" className="shrink-0 transition-colors hover:text-foreground">{text("shop")}</Link>
                <ChevronRight className="size-3.5 shrink-0 rtl:rotate-180" />
                <Link href="/shop/categories" className="shrink-0 transition-colors hover:text-foreground">{text("categories")}</Link>
                {name && (
                    <>
                        <ChevronRight className="size-3.5 shrink-0 rtl:rotate-180" />
                        <span className="sf-bidi truncate text-foreground">{name}</span>
                    </>
                )}
            </nav>

            <header className="mb-6 border-b pb-4">
                <div className="flex items-start gap-3 sm:gap-4">
                    {loading && !category ? (
                        <div className="sf-skel size-14 shrink-0 rounded-[var(--sf-radius)] sm:size-[72px]" />
                    ) : (
                        <StoreImage
                            src={category?.imageUrl}
                            alt=""
                            fallbackText={name}
                            sizes="80px"
                            className="size-14 shrink-0 rounded-[var(--sf-radius)] border sm:size-[72px]"
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        {name ? (
                            <>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="sf-page-title sf-bidi break-words">{name}</h1>
                                    {percent > 0 && (
                                        <span className="sf-deal-badge">
                                            {text(upTo ? "upToPercentOff" : "percentOff").replace("{n}", String(percent))}
                                        </span>
                                    )}
                                </div>
                                <p className="sf-meta mt-1">
                                    {category!.productCount} {text(category!.productCount === 1 ? "product" : "products")}
                                </p>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <div className="sf-skel h-7 w-48" />
                                <div className="sf-skel h-3.5 w-24" />
                            </div>
                        )}
                    </div>
                </div>
                {category?.description && (
                    <p className="sf-bidi mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                        {category.description}
                    </p>
                )}
            </header>
        </>
    );
}

function CategorySkeleton() {
    return (
        <div className="space-y-6" aria-hidden>
            <div className="sf-skel h-4 w-56" />
            <div className="flex items-center gap-4">
                <div className="sf-skel size-14 rounded-[var(--sf-radius)] sm:size-[72px]" />
                <div className="space-y-2">
                    <div className="sf-skel h-6 w-44" />
                    <div className="sf-skel h-3.5 w-24" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-[var(--sf-gap)] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                    <div key={index} className="sf-skel aspect-[3/4] w-full rounded-[var(--sf-radius)]" />
                ))}
            </div>
        </div>
    );
}
