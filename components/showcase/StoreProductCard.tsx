"use client";

import Link from "next/link";
import { Check, Plus, Tag } from "lucide-react";
import { productImage } from "@/lib/product-image";
import StoreImage from "@/components/showcase/StoreImage";
import StoreBrandMark from "@/components/showcase/StoreBrandMark";
import StoreFavoriteButton from "@/components/showcase/StoreFavoriteButton";
import StorePriceBlock from "@/components/showcase/StorePriceBlock";
import { createStoreText } from "@/lib/store-copy";
import { productPricing } from "@/lib/store-pricing";
import type { OnlineStoreProductDetails } from "@/lib/api-online-shopping";
import type { ProductDto } from "@/types/pos";

const LOW_STOCK_THRESHOLD = 5;

/**
 * Retail product tile. Visual priority is image → brand → name → price → action. The
 * brand shows its logo when one is configured and its name when it is not.
 *
 * The whole card is a link to the product page, which is where a shopper can see the
 * gallery, the details and the options. Quick-add stays on the card for products that need
 * no choice; it is always visible — hiding the only way to buy behind a hover would cost
 * more than the calm it buys back — and hover simply brings it forward.
 */
export default function StoreProductCard({
    product,
    details,
    available,
    remaining,
    isAr,
    format,
    onQuickAdd,
    justAdded = false,
    priority = false,
    inOffer = false,
}: {
    product: ProductDto;
    details?: OnlineStoreProductDetails;
    available: boolean;
    remaining?: number;
    isAr: boolean;
    format: (value: number) => string;
    onQuickAdd?: (product: ProductDto) => void;
    /** Drives the brief confirmation state after a quick add. */
    justAdded?: boolean;
    priority?: boolean;
    /** True when a live bundle includes this product, so the tile can point at it. */
    inOffer?: boolean;
}) {
    const text = createStoreText(isAr);
    const name = isAr ? product.nameAr || product.name : product.name;
    const pricing = productPricing(product);
    const needsChoice = (product.options?.some(option => option.isActive) ?? false) ||
        (product.modifierGroups ?? []).some(group => group.isRequired || group.minSelection > 0);
    const canQuickAdd = available && !needsChoice && !!onQuickAdd;
    const lowStock = available && remaining != null && remaining > 0 && remaining <= LOW_STOCK_THRESHOLD;
    const galleryCount = details?.images.length ?? 0;

    return (
        <article className="sf-card-link group relative h-full">
            <Link href={`/shop/product/${product.id}`} className="flex min-w-0 flex-1 flex-col outline-none">
                <span className="relative block w-full">
                    <StoreImage
                        src={productImage(product.imageKey, product.imageUrl, "medium")}
                        alt={name}
                        fit="contain"
                        priority={priority}
                        fallbackText={name}
                        className={`aspect-square w-full ${available ? "" : "opacity-55"}`}
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
                    />
                    {pricing.hasDiscount && available && (
                        <span className="sf-deal-badge sf-deal-badge--sm absolute start-2 top-2">
                            <span className="sf-pct">−{pricing.percent}%</span>
                        </span>
                    )}
                    {/* A product can be reduced, in a bundle, or both — the reduction is the
                        louder fact, so the bundle mark steps aside when they collide. */}
                    {inOffer && !pricing.hasDiscount && available && (
                        <span className="sf-badge sf-badge--offer absolute start-2 top-2">
                            <Tag className="size-3" />
                            {text("inOffer")}
                        </span>
                    )}
                    {!available && (
                        <span className="sf-badge sf-badge--muted absolute start-2 top-2 bg-background">
                            {text("unavailable")}
                        </span>
                    )}
                    {/* A count, not a gallery: it tells the shopper there is more to see. */}
                    {galleryCount > 0 && available && (
                        <span className="absolute bottom-2 end-2 rounded-full bg-background/85 px-1.5 py-0.5 text-[10.5px] font-semibold leading-4 text-muted-foreground backdrop-blur">
                            +{galleryCount}
                        </span>
                    )}
                </span>

                <span className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
                    {details?.brand && (
                        <span className="flex min-h-5 items-center">
                            <StoreBrandMark details={details} isAr={isAr} />
                        </span>
                    )}
                    <span className="sf-bidi line-clamp-2 break-words text-[13.5px] font-medium leading-snug text-foreground sm:text-sm">
                        {name}
                    </span>
                    <span className="mt-auto block pt-1">
                        <StorePriceBlock
                            pricing={pricing}
                            isAr={isAr}
                            format={format}
                            showSaving={false}
                        />
                    </span>
                    <span className="min-h-4 text-[11.5px] leading-4 text-amber-600 dark:text-amber-500">
                        {lowStock ? text("lowStock") : ""}
                    </span>
                </span>
            </Link>

            {/* Outside the link on purpose: a link may not contain a button, and saving a
                product must never navigate to it. The opposite corner from the sale badge. */}
            <StoreFavoriteButton
                productId={product.id}
                isAr={isAr}
                className="absolute end-2 top-2 z-10"
            />

            <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
                {canQuickAdd ? (
                    <button
                        type="button"
                        onClick={() => onQuickAdd?.(product)}
                        aria-label={`${text("addToCart")} — ${name}`}
                        className={`sf-btn sf-btn--outline sf-btn--sm sf-action w-full ${justAdded ? "sf-btn--done" : ""}`}
                    >
                        {justAdded ? <Check className="size-4" /> : <Plus className="size-4" />}
                        {justAdded ? text("addedToCart") : text("addToCart")}
                    </button>
                ) : (
                    <Link
                        href={`/shop/product/${product.id}`}
                        aria-disabled={!available}
                        className="sf-btn sf-btn--outline sf-btn--sm sf-action w-full"
                    >
                        {available ? (needsChoice ? text("viewOptions") : text("viewProduct")) : text("viewProduct")}
                    </Link>
                )}
            </div>
        </article>
    );
}
