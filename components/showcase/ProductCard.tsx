"use client";

import React, { memo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Eye, Flame, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { productImage, productImageSrcSet } from "@/lib/product-image";

interface ProductCardProps {
    id: string;
    name: string;
    displayName?: string;
    imageUrl?: string;
    /** Optional optimized-image key; paired with imageUrl (legacy fallback). */
    imageKey?: string;
    basePrice: number;
    discountedPrice?: number;
    discountPercentage?: number;
    categoryName?: string;
    isActive: boolean;
    isAvailableNow?: boolean;
    availabilityLabel?: string | null;
    formatPrice: (amount: number) => string;
    onView: (id: string) => void;
    viewLabel: string;
    calories?: number;
    /** Optional short description (EN/AR). Line-clamped to 2 lines. */
    description?: string;
    /** Optional highlight badge shown on image (e.g. "NEW", "POPULAR"). Takes precedence over discount when both exist. */
    badge?: string;
    /** Public-menu-only "Coming Soon" flag. Replaces price, disables click. */
    isSoon?: boolean;
    /** True when the product exposes one or more active ProductOption variants. Renders a small badge so the customer knows to expect a selector. */
    hasOptions?: boolean;
}

function ProductCardImpl({
    id,
    name,
    displayName,
    imageUrl,
    imageKey,
    basePrice,
    discountedPrice,
    discountPercentage,
    categoryName,
    isActive,
    isAvailableNow = true,
    availabilityLabel,
    formatPrice,
    onView,
    viewLabel,
    calories,
    description,
    badge,
    isSoon = false,
    hasOptions = false,
}: ProductCardProps) {
    const { locale, t } = useLocale();
    const isAr = locale === 'ar';
    // Track image load failure so we can fall back to the placeholder SVG.
    // Without this, a broken `imageUrl` (404, wrong host, CORS) leaves the
    // card with an invisible empty <img>, which is exactly how it renders
    // when admins uploaded photos against a different backend host than the
    // one currently configured — the absolute URL in the DB no longer resolves.
    const [imageFailed, setImageFailed] = useState(false);
    // Reset the failure flag if the consumer hands us a different src — e.g.
    // after admin re-uploads the product image and the cache invalidates.
    useEffect(() => { setImageFailed(false); }, [imageUrl, imageKey]);
    // Prefer the optimized WebP "medium" variant (≤600 px / ~30-60 KB) when
    // imageKey is present. Legacy rows with only imageUrl continue to render
    // unchanged via the fallback — no migration required for the UI.
    const resolvedSrc = productImage(imageKey, imageUrl, "medium");
    const resolvedSrcSet = productImageSrcSet(imageKey, imageUrl);
    const showImage = !!resolvedSrc && !imageFailed;
    const hasDiscount = !isSoon && discountedPrice != null && discountedPrice < basePrice;
    const label = displayName || name;
    const isUnavailableNow = isActive && !isAvailableNow;
    // Coming-soon items are now clickable (to open a reduced detail view).
    // Purchase is still blocked downstream — the detail panel suppresses price,
    // modifiers and the (already-hidden) add-to-order CTA.
    const comingSoonLabel = isAr ? "الأسعار قريباً 🤩" : "Prices coming soon 🤩";

    return (
        <article
            className={cn(
                "showcase-product-card group",
                (!isActive || isUnavailableNow) && "opacity-60",
                isSoon && "showcase-product-card--soon",
            )}
            onClick={() => onView(id)}
            role="button"
            tabIndex={0}
            aria-label={isSoon ? `${label} — ${comingSoonLabel}` : label}
            aria-disabled={!isAvailableNow}
            onKeyDown={(e) => e.key === "Enter" && onView(id)}
        >
            {/* Image */}
            <div className="showcase-product-image-wrapper">
                {showImage ? (
                    <img
                        src={resolvedSrc!}
                        srcSet={resolvedSrcSet}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                        alt={label}
                        className="showcase-product-image"
                        loading="lazy"
                        decoding="async"
                        // Grid cards are below-the-fold after the first row —
                        // deprioritize vs. page chunks, hero, and fonts so the
                        // critical path isn't starved when 100+ cards mount.
                        fetchPriority="low"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <div className="showcase-product-placeholder">
                        <svg className="w-10 h-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                    </div>
                )}

                {/* Coming-Soon badge replaces all other badges & the hover overlay.
                    Sits ABOVE the image (negative top + z-10) as a prominent pill
                    so the value proposition lands before the food does. */}
                {isSoon ? (
                    // Sits at the TOP of the image (overlay), pill-shaped,
                    // gradient + shadow + white type — high-contrast so it
                    // reads before the photo. Avoids negative offsets because
                    // the image wrapper uses overflow:hidden.
                    <span
                        className={cn(
                            "absolute z-20 inline-flex items-center gap-1.5 whitespace-nowrap",
                            "rounded-full px-4 py-2 text-sm font-bold text-white",
                            "shadow-lg ring-1 ring-white/20 backdrop-blur-sm",
                            "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
                        )}
                        style={{
                            top: "10px",
                            [isAr ? "right" : "left"]: "10px",
                            letterSpacing: isAr ? "normal" : "0.02em",
                        }}
                    >
                        {comingSoonLabel}
                    </span>
                ) : (
                    <>
                        {/* Highlight badge (New / Popular / Featured) — takes top-start */}
                        {badge && (
                            <span className="showcase-highlight-badge">{badge}</span>
                        )}

                        {/* Discount badge — top-end */}
                        {hasDiscount && (
                            <span className="showcase-discount-badge" dir={isAr ? "rtl" : "ltr"}>
                                {discountPercentage != null && discountPercentage > 0
                                    ? isAr
                                        ? `${t("showcaseOff") || "خصم"} ${discountPercentage}%`
                                        : `${discountPercentage}% ${t("showcaseOff") || "OFF"}`
                                    : t("saleLabel") || (isAr ? "تخفيض" : "Sale")}
                            </span>
                        )}

                        {/* Quick view overlay (desktop hover) */}
                        <div className="showcase-product-overlay">
                            <span className="showcase-quick-view-btn">
                                <Eye className="w-4 h-4" />
                                {viewLabel}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="showcase-product-content">
                {categoryName && (
                    <span className="showcase-product-category">{categoryName}</span>
                )}
                <h3 className="showcase-product-name">{label}</h3>
                {isSoon ? (
                    description ? (
                        <p className="showcase-product-desc">{description}</p>
                    ) : null
                ) : (
                    <>
                        {description && (
                            <p className="showcase-product-desc">{description}</p>
                        )}
                        <div className="showcase-product-pricing" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
                            {hasDiscount ? (
                                <>
                                    <span className="showcase-price-discounted">{formatPrice(discountedPrice!)}</span>
                                    <span className="showcase-price-original">{formatPrice(basePrice)}</span>
                                </>
                            ) : (
                                <span className="showcase-price-current">{formatPrice(basePrice)}</span>
                            )}
                            <span className="showcase-product-chevron" aria-hidden="true">
                                <ChevronRight className="rtl:-scale-x-100 w-3.5 h-3.5" />
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {calories != null && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                                    <Flame className="h-3 w-3" /> {calories} kcal
                                </span>
                            )}
                            {hasOptions && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                    {isAr ? "متعدد الأنواع" : "Options"}
                                </span>
                            )}
                        </div>
                        {isUnavailableNow && (
                            <div className={cn("mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700", "text-start")}>
                                <div className="font-semibold">{isAr ? "غير متاح الآن" : "Unavailable now"}</div>
                                {availabilityLabel && (
                                    <div className="mt-1 text-[10px] text-amber-600">{availabilityLabel}</div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </article>
    );
}

// Memoized — search/category filtering in the parent re-renders the whole grid every keystroke.
const ProductCard = memo(ProductCardImpl);
export default ProductCard;
