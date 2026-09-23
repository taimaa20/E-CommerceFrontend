"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronRight, RefreshCw } from "lucide-react";
import StoreBanner from "@/components/showcase/StoreBanner";
import StoreCatalogBrowser from "@/components/showcase/StoreCatalogBrowser";
import StoreCategoryCard from "@/components/showcase/StoreCategoryCard";
import StoreImage from "@/components/showcase/StoreImage";
import StoreOfferShelf from "@/components/showcase/StoreOfferShelf";
import StoreProductGrid from "@/components/showcase/StoreProductGrid";
import StoreProductRail from "@/components/showcase/StoreProductRail";
import StoreSectionHeading from "@/components/showcase/StoreSectionHeading";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import type { OnlineStoreSectionKey } from "@/lib/api-online-shopping";
import { formatCurrency } from "@/lib/currencies";
import { createStoreText, type StoreCopyKey } from "@/lib/store-copy";
import { offerProductIds, summariseOffersByCategory } from "@/lib/store-pricing";
import { useStoreCart } from "@/lib/use-store-cart";
import { useStoreBanners, useStoreHome } from "@/lib/use-store-home";
import { useOfferCart, useOfferProductIds, useSellableOffers } from "@/lib/use-store-offers";
import { useSettingsStore } from "@/store/settingsStore";
import { useStorefrontStore } from "@/store/storefrontStore";

/**
 * Departments shown on the home page; the full list lives on /shop/categories.
 *
 * Eleven, not a round ten: the lead department occupies four cells of the grid, so 4 + 11
 * is a whole number of rows at the three-column and the five-column breakpoint alike, and
 * the section never ends on a half-empty line.
 */
const HOME_CATEGORY_LIMIT = 11;
const RAIL_CATEGORY_LIMIT = 14;
/**
 * Offers on the home page. The row steps horizontally past four, so this is about how
 * much of the page the deals band is allowed to own, not about what the row can fit.
 */
const HOME_OFFER_LIMIT = 8;
/**
 * Products per section on a phone, where the row is a two-column wall rather than a rail.
 * Six is three complete rows — enough to judge a section, short enough that four of them
 * still leave the page scrollable in a few flicks.
 */
const PHONE_SECTION_LIMIT = 6;

/** Heading and sub-heading for each row the API is willing to return. */
const SECTION_COPY: Record<OnlineStoreSectionKey, { title: StoreCopyKey; hint: StoreCopyKey }> = {
    onSale: { title: "sectionOnSale", hint: "sectionOnSaleHint" },
    newArrivals: { title: "sectionNewArrivals", hint: "sectionNewArrivalsHint" },
    explore: { title: "sectionExplore", hint: "sectionExploreHint" },
};

export default function StorePage() {
    return (
        <StoreShell>
            <Suspense fallback={<HomeSkeleton />}>
                <StoreRoot />
            </Suspense>
        </StoreShell>
    );
}

/**
 * `/shop` is the discovery home, but a shared `/shop?q=…` link — and the header search,
 * which posts here — must still land on results. A query string therefore switches this
 * route to the catalogue browser instead of breaking an existing link.
 */
function StoreRoot() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const searchParams = useSearchParams();
    const browsing = ["q", "page", "sort"].some(key => !!searchParams.get(key));
    const inOffer = useOfferProductIds();

    if (!browsing) return <StoreHome />;

    return (
        <div className="sf-container">
            <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1 text-[13px] text-muted-foreground">
                <Link href="/shop" className="transition-colors hover:text-foreground">{text("shop")}</Link>
                <ChevronRight className="size-3.5 rtl:rotate-180" />
                <span className="text-foreground">{text("searchResults")}</span>
            </nav>
            <StoreCatalogBrowser
                basePath="/shop"
                inOffer={inOffer}
                emptyAction={
                    <Link href="/shop/categories" className="sf-btn sf-btn--outline">{text("shopByCategory")}</Link>
                }
            />
        </div>
    );
}

function StoreHome() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const settings = useSettingsStore(state => state.settings);
    const settingsLoaded = useSettingsStore(state => state.isLoaded);
    const { data, loading, error, reload } = useStoreHome();
    const { banners } = useStoreBanners();
    const liveOffers = useSellableOffers();
    const context = useStorefrontStore(state => state.context);
    const format = (value: number) =>
        settingsLoaded && settings.currency ? formatCurrency(value, settings.currency) : "—";

    const cart = useStoreCart(data?.productAvailability ?? [], isAr);
    // Offer availability comes from the branch-wide payload the shell already loaded, so a
    // bundle is never offered for sale when one of its products is not sellable here.
    const offerCart = useOfferCart(context?.productAvailability ?? [], isAr);
    const details = new Map((data?.productDetails ?? []).map(row => [row.productId, row]));
    const inOffer = offerProductIds(liveOffers);

    if (loading) return <HomeSkeleton />;

    if (error || !data) {
        return (
            <div className="sf-container">
                <div role="alert" className="sf-empty">
                    <p className="font-semibold">{text("couldNotLoad")}</p>
                    <p className="sf-meta mx-auto mt-1 max-w-sm">{text("networkError")}</p>
                    <button type="button" onClick={reload} className="sf-btn sf-btn--outline mt-5">
                        <RefreshCw className="size-4" />
                        {text("tryAgain")}
                    </button>
                </div>
            </div>
        );
    }

    // Which departments the live offers touch, measured from the same payload the deals
    // row renders — so a "20% off" mark on a tile and the offer it points at are the
    // same reduction, never two numbers that drifted apart.
    const categoryOffers = summariseOffersByCategory(liveOffers);

    // Departments with a photo lead the page; the rest still appear, just after them.
    const categories = [...data.categories].sort(
        (a, b) => Number(!!b.imageUrl) - Number(!!a.imageUrl) || b.productCount - a.productCount,
    );
    const [feature, ...rest] = categories;
    const sections = data.sections;

    return (
        <div>
            {/* A scheduled campaign banner leads when the merchant configured one; otherwise
                the store's own cover panel does, exactly as before banners existed. */}
            {banners.length > 0 ? (
                <StoreBanner banners={banners} isAr={isAr} />
            ) : (
                <StoreHero
                    isAr={isAr}
                    productCount={data.totalProductCount}
                    categoryCount={categories.length}
                />
            )}

            {/* Departments come before the deals band: a shopper who did not arrive for the
                banner is looking for a department next, and on a phone the offers shelf is
                tall enough to push every department below the fold. */}
            {categories.length > 0 && (
                <section className="sf-container mt-[var(--sf-section)]">
                    <StoreSectionHeading
                        eyebrow={text("discoverCollections")}
                        title={text("shopByCategory")}
                        href="/shop/categories"
                        linkLabel={text("viewAll")}
                    />

                    {/* Phone: a rail keeps the first products close to the fold. */}
                    <div className="sf-rail -mx-[var(--sf-gutter)] px-[var(--sf-gutter)] sm:hidden">
                        {categories.slice(0, RAIL_CATEGORY_LIMIT).map((category, index) => (
                            <StoreCategoryCard
                                key={category.id}
                                category={category}
                                isAr={isAr}
                                variant="rail"
                                priority={index < 3}
                                offers={categoryOffers.get(category.id)}
                            />
                        ))}
                    </div>

                    {/* Desktop: one department leads at double width, the rest follow. */}
                    <div className="hidden gap-[var(--sf-gap)] sm:grid sm:grid-cols-3 lg:grid-cols-5">
                        {feature && (
                            <div className="sm:col-span-2 sm:row-span-2">
                                <StoreCategoryCard
                                    category={feature}
                                    isAr={isAr}
                                    variant="feature"
                                    priority
                                    offers={categoryOffers.get(feature.id)}
                                />
                            </div>
                        )}
                        {rest.slice(0, HOME_CATEGORY_LIMIT).map(category => (
                            <StoreCategoryCard
                                key={category.id}
                                category={category}
                                isAr={isAr}
                                offers={categoryOffers.get(category.id)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {liveOffers.length > 0 && (
                <section className="sf-band sf-band--tint mt-[var(--sf-section)]">
                    <div className="sf-container">
                        <StoreSectionHeading
                            eyebrow={text("offers")}
                            title={text("offersTitle")}
                            hint={text("offersHint")}
                            href="/shop/offers"
                            linkLabel={text("viewAll")}
                        />
                        {/* The shelf, not this page, decides whether one offer becomes a
                            featured panel and several become a rail. */}
                        <StoreOfferShelf
                            offers={liveOffers.slice(0, HOME_OFFER_LIMIT)}
                            cart={offerCart}
                            isAr={isAr}
                            format={format}
                            priority
                        />
                    </div>
                </section>
            )}

            {sections.map((section, index) => {
                const copy = SECTION_COPY[section.key];
                if (!copy) return null;
                // Alternating grounds give the page rhythm without inventing a new look
                // per section — one tint, one plain, all from the same brand token.
                const tinted = index % 2 === 1;
                return (
                    <section
                        key={section.key}
                        className={`mt-[var(--sf-section)] ${tinted ? "sf-band sf-band--tint" : ""}`}
                    >
                        <div className="sf-container">
                            <StoreSectionHeading
                                title={text(copy.title)}
                                hint={text(copy.hint)}
                                href="/shop/all"
                                linkLabel={text("viewAll")}
                            />
                            {/* Phone: a two-column wall, so a whole section is comparable
                                without swiping. Tablet and desktop keep the rail. */}
                            <div className="sm:hidden">
                                <StoreProductGrid
                                    products={section.products.slice(0, PHONE_SECTION_LIMIT)}
                                    details={details}
                                    cart={cart}
                                    isAr={isAr}
                                    format={format}
                                    priority={index === 0}
                                    inOffer={inOffer}
                                />
                            </div>
                            <div className="hidden sm:block">
                                <StoreProductRail
                                    products={section.products}
                                    details={details}
                                    cart={cart}
                                    isAr={isAr}
                                    format={format}
                                    priority={index === 0}
                                    inOffer={inOffer}
                                />
                            </div>
                        </div>
                    </section>
                );
            })}

            <section className="sf-container mt-[var(--sf-section)]">
                <div className="flex flex-col items-start gap-4 rounded-[var(--sf-radius-lg)] border bg-[var(--sf-surface-sunken)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                    <div className="min-w-0">
                        <h2 className="sf-section-title">{text("allProductsSection")}</h2>
                        <p className="sf-meta mt-1">
                            {data.totalProductCount} {text("itemsCount")} · {text("browseEverything")}
                        </p>
                    </div>
                    <Link href="/shop/all" className="sf-btn sf-btn--primary shrink-0">
                        {text("shopNow")}
                        <ArrowRight className="size-4 rtl:rotate-180" />
                    </Link>
                </div>
            </section>
        </div>
    );
}

/**
 * Merchandising banner. It shows the business's own cover image when one is configured and
 * otherwise a typographic panel — either way it states only what is true: the store's name,
 * its tagline and how much it carries. No offer, discount or claim is invented here.
 */
function StoreHero({
    isAr,
    productCount,
    categoryCount,
}: {
    isAr: boolean;
    productCount: number;
    categoryCount: number;
}) {
    const text = createStoreText(isAr);
    const settings = useSettingsStore(state => state.settings);
    const isLoaded = useSettingsStore(state => state.isLoaded);
    if (!isLoaded) return null;

    const facts = [
        `${productCount} ${text("itemsCount")}`,
        `${categoryCount} ${text(categoryCount === 1 ? "categoryOne" : "categoryMany")}`,
    ];

    return (
        <section className="sf-container">
            <div className="relative overflow-hidden rounded-[var(--sf-radius-lg)] border bg-[var(--sf-accent-soft)]">
                {settings.coverImageUrl && (
                    <>
                        <StoreImage
                            src={settings.coverImageUrl}
                            alt=""
                            priority
                            sizes="100vw"
                            className="absolute inset-0 h-full w-full"
                        />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
                    </>
                )}
                {/* Kept to the same vertical budget as the campaign banner, so the first row of
                    products sits at the same place whether or not a banner is scheduled. */}
                <div className={`relative px-5 py-7 sm:px-8 sm:py-10 ${settings.coverImageUrl ? "text-white" : ""}`}>
                    <p className={`sf-eyebrow ${settings.coverImageUrl ? "text-white/75" : ""}`}>
                        {text("onlineStore")}
                    </p>
                    <h1 className="sf-bidi mt-2 max-w-xl break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                        {settings.restaurantName}
                    </h1>
                    {settings.restaurantTagline && (
                        <p className={`sf-bidi mt-2 max-w-lg text-sm sm:text-base ${settings.coverImageUrl ? "text-white/85" : "text-muted-foreground"}`}>
                            {settings.restaurantTagline}
                        </p>
                    )}
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <Link href="/shop/all" className="sf-btn sf-btn--primary">
                            {text("shopNow")}
                            <ArrowRight className="size-4 rtl:rotate-180" />
                        </Link>
                        <Link
                            href="/shop/categories"
                            className={`sf-btn ${settings.coverImageUrl ? "border border-white/40 text-white hover:bg-white/10" : "sf-btn--outline"}`}
                        >
                            {text("shopByCategory")}
                        </Link>
                    </div>
                    <p className={`mt-4 text-[13px] ${settings.coverImageUrl ? "text-white/70" : "text-muted-foreground"}`}>
                        {facts.join(" · ")}
                    </p>
                </div>
            </div>
        </section>
    );
}

/** Matches the real layout so the first paint does not jump. */
function HomeSkeleton() {
    return (
        <div className="sf-container space-y-8" aria-hidden>
            <div className="sf-skel h-52 w-full rounded-[var(--sf-radius-lg)] sm:h-64" />
            <div className="space-y-3">
                <div className="sf-skel h-5 w-44" />
                <div className="grid grid-cols-2 gap-[var(--sf-gap)] sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="sf-skel aspect-[4/3] w-full rounded-[var(--sf-radius)]" />
                    ))}
                </div>
            </div>
            <div className="space-y-3">
                <div className="sf-skel h-5 w-40" />
                <div className="grid grid-cols-2 gap-[var(--sf-gap)] sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="sf-skel aspect-[3/4] w-full rounded-[var(--sf-radius)]" />
                    ))}
                </div>
            </div>
        </div>
    );
}
