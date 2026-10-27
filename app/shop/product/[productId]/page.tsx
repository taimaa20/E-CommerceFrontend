"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, RefreshCw, Tag } from "lucide-react";
import StoreBrandMark from "@/components/showcase/StoreBrandMark";
import StoreBuyBox from "@/components/showcase/StoreBuyBox";
import StoreFavoriteButton from "@/components/showcase/StoreFavoriteButton";
import StoreGallery, { type GalleryImage } from "@/components/showcase/StoreGallery";
import StoreOfferShelf from "@/components/showcase/StoreOfferShelf";
import StorePriceBlock from "@/components/showcase/StorePriceBlock";
import StoreProductRail from "@/components/showcase/StoreProductRail";
import StoreSectionHeading from "@/components/showcase/StoreSectionHeading";
import StoreShell from "@/components/showcase/StoreShell";
import StoreWhatsAppLink from "@/components/showcase/StoreWhatsAppLink";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { productImage } from "@/lib/product-image";
import { createStoreText } from "@/lib/store-copy";
import { offerProductIds, productPricing } from "@/lib/store-pricing";
import { useStoreCart } from "@/lib/use-store-cart";
import { useStoreProduct } from "@/lib/use-store-home";
import { useOfferCart, useStoreOffers } from "@/lib/use-store-offers";
import { useSettingsStore } from "@/store/settingsStore";
import { useStorefrontStore } from "@/store/storefrontStore";
import { WHATSAPP_PURPOSE } from "@/lib/whatsapp";

const LOW_STOCK_THRESHOLD = 5;
/** A blank line ends the lead paragraph; the rest belongs to the full description. */
const SUMMARY_BREAK = /\n\s*\n/;

export default function StoreProductPage() {
    return (
        <StoreShell>
            <div className="sf-container">
                <ProductDetail />
            </div>
        </StoreShell>
    );
}

function ProductDetail() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const params = useParams<{ productId: string }>();
    const settings = useSettingsStore(state => state.settings);
    const settingsLoaded = useSettingsStore(state => state.isLoaded);
    const { data, loading, error, reload } = useStoreProduct(params.productId);
    // Only the offers this product actually belongs to; the API does the filtering so the
    // page never has to decide what counts as a live offer.
    const { offers } = useStoreOffers(params.productId);
    const context = useStorefrontStore(state => state.context);
    const offerCart = useOfferCart(context?.productAvailability ?? [], isAr);
    const format = (value: number) =>
        settingsLoaded && settings.currency ? formatCurrency(value, settings.currency) : "—";

    // Availability for the product and its neighbours travels in one payload, so the
    // cart rules on this page are the same rules the grid used.
    const cart = useStoreCart(
        data ? [data.availability, ...data.relatedAvailability] : [],
        isAr,
    );

    if (loading) return <ProductSkeleton />;

    if (error || !data) {
        return (
            <div role="alert" className="sf-empty">
                <p className="font-semibold">{error ? text("productNotFound") : text("couldNotLoad")}</p>
                <p className="sf-meta mx-auto mt-1 max-w-sm">{text("productNotFoundHint")}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={reload} className="sf-btn sf-btn--outline">
                        <RefreshCw className="size-4" />
                        {text("tryAgain")}
                    </button>
                    <Link href="/shop" className="sf-btn sf-btn--primary">{text("backToShop")}</Link>
                </div>
            </div>
        );
    }

    const { product, details, category, related } = data;
    const name = isAr ? product.nameAr || product.name : product.name;
    const description = isAr ? product.descriptionAr || product.description : product.description;
    const categoryName = category ? (isAr ? category.nameAr || category.name : category.name) : undefined;
    const available = cart.isSellable(product);
    const remaining = cart.remainingFor(product);
    const pricing = productPricing(product);

    // Primary image first, then the gallery — one ordered list drives every viewport.
    const images: GalleryImage[] = [
        { src: productImage(product.imageKey, product.imageUrl, "full"), alt: name },
        ...details.images.map(image => ({
            src: productImage(image.imageKey, image.imageUrl, "full"),
            alt: image.altText ?? name,
        })),
    ].filter(image => !!image.src);

    const specs = [
        categoryName && { key: "department", label: text("department"), value: categoryName },
        details.brand && { key: "brand", label: text("brand"), value: details.brand },
        details.sizeLabel && { key: "size", label: text("size"), value: details.sizeLabel },
        details.countryOfOrigin && { key: "origin", label: text("origin"), value: details.countryOfOrigin },
        details.sku && { key: "sku", label: text("itemCode"), value: details.sku },
    ].filter(Boolean) as { key: string; label: string; value: string }[];

    // Absolute, so the address pasted into a chat opens for the person receiving it. Built
    // from the browser's own origin rather than a configured base URL, which keeps a staging
    // link pointing at staging and a live link at live.
    const productUrl = typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/shop/product/${product.id}`;

    const relatedDetails = new Map(data.relatedDetails.map(row => [row.productId, row]));
    // Hand-picked products may come from any department, so the department heading and its
    // "view all" link are kept only while every product shown really is from this department.
    const relatedFromDepartment = !!category && related.every(row => row.categoryId === category.id);
    const summary = description?.split(SUMMARY_BREAK)[0]?.trim();
    const productOffers = offers.filter(offerCart.isSellable);
    const relatedInOffer = offerProductIds(productOffers);

    return (
        <div>
            <nav aria-label="breadcrumb" className="mb-4 flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
                <Link href="/shop" className="shrink-0 transition-colors hover:text-foreground">{text("shop")}</Link>
                <ChevronRight className="size-3.5 shrink-0 rtl:rotate-180" />
                {category ? (
                    <>
                        <Link href={`/shop/category/${category.id}`} className="sf-bidi shrink-0 truncate transition-colors hover:text-foreground">
                            {categoryName}
                        </Link>
                        <ChevronRight className="size-3.5 shrink-0 rtl:rotate-180" />
                    </>
                ) : null}
                <span className="sf-bidi truncate text-foreground">{name}</span>
            </nav>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
                <StoreGallery images={images} name={name} isAr={isAr} />

                <div className="min-w-0 space-y-5">
                    <div className="space-y-2">
                        {details.brand && (
                            <div className="flex min-h-7 items-center">
                                <StoreBrandMark details={details} isAr={isAr} size="md" />
                            </div>
                        )}
                        <h1 className="sf-page-title sf-bidi break-words">{name}</h1>
                        {details.sizeLabel && <p className="sf-meta">{details.sizeLabel}</p>}
                    </div>

                    <div className="border-y py-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <StorePriceBlock pricing={pricing} isAr={isAr} format={format} size="lg" />
                            {pricing.hasDiscount && (
                                <span className="sf-deal-badge">
                                    <span className="sf-pct">−{pricing.percent}%</span>
                                </span>
                            )}
                        </div>
                        <p className={`mt-2 flex items-center gap-1.5 text-[13px] font-medium ${
                            !available ? "text-destructive"
                                : remaining === 0 ? "text-muted-foreground"
                                : remaining != null && remaining <= LOW_STOCK_THRESHOLD ? "text-amber-600 dark:text-amber-500"
                                : "text-emerald-600 dark:text-emerald-500"
                        }`}>
                            <span aria-hidden className="inline-block size-1.5 rounded-full bg-current" />
                            {!available
                                ? text("unavailable")
                                : remaining === 0 ? text("maxInCart")
                                : remaining != null && remaining <= LOW_STOCK_THRESHOLD ? text("lowStock")
                                : text("inStock")}
                        </p>
                    </div>

                    {/* A short lead here; the full text has its own section below, so the
                        buy controls stay above the fold on a phone. */}
                    {summary && (
                        <p className="sf-bidi text-sm leading-relaxed text-muted-foreground">{summary}</p>
                    )}

                    {/* This product is in a live bundle. The note states the deepest saving
                        those bundles actually carry and points at them — it never implies
                        the product itself is reduced, because it is not. */}
                    {productOffers.length > 0 && (
                        <a
                            href="#product-offers"
                            className="flex items-start gap-2.5 rounded-[var(--sf-radius-sm)] border border-[var(--sf-accent-line)] bg-[var(--sf-accent-softer)] px-3 py-2.5 text-[13px] transition-colors hover:bg-[var(--sf-accent-soft)]"
                        >
                            <Tag className="mt-0.5 size-4 shrink-0 text-[var(--sf-accent-ink)]" />
                            <span className="min-w-0 flex-1">
                                <strong className="font-semibold">{text("offerPartOf")}</strong>
                                {" — "}
                                {text("offerPartOfHint")}
                            </span>
                            <span className="sf-deal-badge sf-deal-badge--sm shrink-0">
                                <span className="sf-pct">
                                    −{Math.max(...productOffers.map(offer => offer.savingPercent))}%
                                </span>
                            </span>
                        </a>
                    )}

                    <StoreBuyBox
                        product={product}
                        available={available}
                        maxQuantity={remaining}
                        isAr={isAr}
                        format={format}
                        onAdd={cart.add}
                        justAdded={cart.justAddedId === product.id}
                    />

                    {/* Secondary actions, below the buy controls so neither competes with it.
                        The enquiry link carries this product's real name, code and address —
                        the wording around them is the business's own configured template. */}
                    {/* WhatsApp is the compact green glyph button; its sentence is the accessible
                        name and tooltip only, so favourites keeps the rest of the row. */}
                    <div className="flex items-stretch gap-2">
                        <StoreFavoriteButton
                            productId={product.id}
                            isAr={isAr}
                            variant="button"
                            className="min-w-0 flex-1"
                        />
                        <StoreWhatsAppLink
                            purpose={WHATSAPP_PURPOSE.productInquiry}
                            context={{ productName: name, sku: details.sku, productUrl: productUrl }}
                            isAr={isAr}
                            variant="icon"
                            label={text("askAboutProductWhatsApp")}
                        />
                    </div>
                </div>
            </div>

            {(description || specs.length > 0) && (
                <div className="mt-[var(--sf-section)] grid gap-8 border-t pt-8 md:grid-cols-2 md:gap-12">
                    {description && (
                        <section>
                            <h2 className="sf-section-title mb-3">{text("aboutThisProduct")}</h2>
                            <p className="sf-bidi max-w-prose whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        </section>
                    )}
                    {specs.length > 0 && (
                        <section>
                            <h2 className="sf-section-title mb-3">{text("specifications")}</h2>
                            <dl className="sf-divide overflow-hidden rounded-[var(--sf-radius)] border">
                                {specs.map(spec => (
                                    <div key={spec.key} className="flex gap-4 px-4 py-2.5 text-sm odd:bg-[var(--sf-surface-sunken)]">
                                        <dt className="w-32 shrink-0 text-muted-foreground">{spec.label}</dt>
                                        <dd className="sf-bidi min-w-0 flex-1 break-words font-medium">{spec.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}
                </div>
            )}

            {productOffers.length > 0 && (
                <section id="product-offers" className="mt-[var(--sf-section)] scroll-mt-32 border-t pt-8">
                    <StoreSectionHeading
                        eyebrow={text("offers")}
                        title={text("offersTitle")}
                        hint={text("offerPartOfHint")}
                        href="/shop/offers"
                        linkLabel={text("viewAll")}
                    />
                    <StoreOfferShelf
                        offers={productOffers}
                        cart={offerCart}
                        isAr={isAr}
                        format={format}
                    />
                </section>
            )}

            {related.length > 0 && (
                <section className="mt-[var(--sf-section)] border-t pt-8">
                    <StoreSectionHeading
                        title={text(relatedFromDepartment ? "relatedProducts" : "youMayAlsoLike")}
                        href={relatedFromDepartment ? `/shop/category/${category.id}` : undefined}
                        linkLabel={relatedFromDepartment ? text("viewAll") : undefined}
                    />
                    <StoreProductRail
                        products={related}
                        details={relatedDetails}
                        cart={cart}
                        isAr={isAr}
                        format={format}
                        inOffer={relatedInOffer}
                    />
                </section>
            )}
        </div>
    );
}

/** Mirrors the real layout so the first paint does not jump. */
function ProductSkeleton() {
    return (
        <div aria-hidden>
            <div className="sf-skel mb-4 h-4 w-56" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
                <div className="sf-skel aspect-square w-full rounded-[var(--sf-radius)]" />
                <div className="space-y-4">
                    <div className="sf-skel h-3 w-24" />
                    <div className="sf-skel h-7 w-4/5" />
                    <div className="sf-skel h-8 w-32" />
                    <div className="sf-skel h-16 w-full" />
                    <div className="sf-skel h-12 w-full rounded-[var(--sf-radius-sm)]" />
                </div>
            </div>
        </div>
    );
}
