"use client";

import Link from "next/link";
import { Check, Clock, ShoppingCart, Tag } from "lucide-react";
import StoreImage from "@/components/showcase/StoreImage";
import StorePriceBlock from "@/components/showcase/StorePriceBlock";
import { productImage } from "@/lib/product-image";
import { offerPricing } from "@/lib/store-pricing";
import { createStoreText } from "@/lib/store-copy";
import type { OnlineStoreOffer, OnlineStoreOfferItem } from "@/lib/api-online-shopping";

/** How the tile uses the space it is given. */
export type OfferCardVariant = "standard" | "featured";

/** Bundle lines shown in full on a tile; the rest are summarised as "+N more". */
const COMPACT_ITEM_LIMIT = 3;

/**
 * The API sends the last day the offer runs as a plain calendar date in the store's own
 * calendar, so it is rendered as a date and never turned into a countdown.
 */
function formatEndDate(isoDate: string, isAr: boolean): string {
    const parsed = new Date(`${isoDate}T00:00:00`);
    return Number.isNaN(parsed.getTime())
        ? isoDate
        : parsed.toLocaleDateString(isAr ? "ar" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * A bundle offer tile.
 *
 * Every number on it comes from the API: the bundle price, what the same items cost bought
 * separately and the saving between them. Nothing is derived here beyond the percentage,
 * which is arithmetic on those two figures, so the card cannot show a discount the order
 * would not honour — and an offer with no genuine saving never reaches this component.
 *
 * Two variants, one card. `standard` is the unit of the deals rail; `featured` lays the same
 * content across the full content width as image-beside-detail, which is what a store with a
 * single live offer needs — a lone narrow tile in a wide band reads as an empty section, not
 * as a deal. Both show the same facts in the same order, so switching between them changes
 * the composition and never the claim.
 *
 * When the offer has no promotional image the tile falls back to the packshots of the
 * products inside it, which is honest — those are the things being sold.
 */
export default function StoreOfferCard({
    offer,
    available,
    isAr,
    format,
    onAdd,
    justAdded = false,
    priority = false,
    variant = "standard",
}: {
    offer: OnlineStoreOffer;
    available: boolean;
    isAr: boolean;
    format: (value: number) => string;
    onAdd?: (offer: OnlineStoreOffer) => void;
    justAdded?: boolean;
    priority?: boolean;
    variant?: OfferCardVariant;
}) {
    const text = createStoreText(isAr);
    const featured = variant === "featured";
    const name = isAr ? offer.nameAr || offer.name : offer.name;
    const description = isAr ? offer.descriptionAr || offer.description : offer.description;
    const pricing = offerPricing(offer);
    const dailyWindow = offer.dailyStartTime && offer.dailyEndTime
        ? `${offer.dailyStartTime}–${offer.dailyEndTime}`
        : null;
    const endsOn = formatEndDate(offer.endsOn, isAr);
    const shown = featured ? offer.items : offer.items.slice(0, COMPACT_ITEM_LIMIT);
    const hidden = offer.items.length - shown.length;

    const media = (
        <div className={`relative ${featured ? "h-full" : ""}`}>
            {offer.imageUrl ? (
                <StoreImage
                    src={offer.imageUrl}
                    alt={name}
                    fit="cover"
                    priority={priority}
                    fallbackText={name}
                    sizes={featured
                        ? "(max-width: 768px) 100vw, 46vw"
                        : "(max-width: 640px) 82vw, 21rem"}
                    className={`w-full ${featured ? "h-full min-h-[15rem] md:aspect-auto" : "h-[15rem]"} ${available ? "" : "opacity-55"}`}
                />
            ) : (
                // No banner: show what is actually in the box, in the proportions of the box.
                <div className={`grid w-full gap-px bg-[var(--sf-line-soft)] ${featured ? "h-full min-h-[15rem]" : "h-[15rem]"} ${
                    offer.items.length > 2 ? "grid-cols-3" : "grid-cols-2"
                } ${available ? "" : "opacity-55"}`}>
                    {offer.items.slice(0, 3).map(item => (
                        <StoreImage
                            key={item.productId}
                            src={productImage(item.imageKey, item.imageUrl, "medium")}
                            alt=""
                            fit="contain"
                            priority={priority}
                            fallbackText={isAr ? item.nameAr || item.name : item.name}
                            sizes="30vw"
                            className="h-full w-full"
                        />
                    ))}
                </div>
            )}

            {/* The percentage is the first thing to read on the tile, so it sits on the
                image rather than in the body where the price already competes for weight. */}
            <span className={`sf-deal-badge absolute start-3 top-3 ${featured ? "sf-deal-badge--lg" : ""}`}>
                <span className="sf-pct">−{pricing.percent}%</span>
            </span>
            {!available && (
                <span className="sf-badge sf-badge--muted absolute end-3 top-3 bg-background">
                    {text("offerUnavailable")}
                </span>
            )}
        </div>
    );

    const body = (
        <div className={`flex min-w-0 flex-1 flex-col ${featured ? "gap-4 p-5 sm:p-6" : "gap-3 p-4"}`}>
            <div className="min-w-0">
                <p className="sf-eyebrow mb-1.5 flex items-center gap-1.5">
                    <Tag className="size-3.5" />
                    {text("offerBundle")}
                </p>
                <h3 className={`sf-bidi break-words font-semibold leading-snug ${
                    featured ? "text-xl sm:text-2xl" : "line-clamp-2 min-h-[2.6em] text-[15px]"
                }`}>
                    {name}
                </h3>
                {description && (
                    <p className={`sf-bidi sf-meta mt-1 break-words ${featured ? "max-w-prose" : "line-clamp-2"}`}>
                        {description}
                    </p>
                )}
            </div>

            <ul className={`min-w-0 space-y-1.5 ${featured ? "sm:space-y-2" : ""}`}>
                {shown.map(item => (
                    <OfferItemRow key={item.productId} item={item} isAr={isAr} featured={featured} />
                ))}
                {hidden > 0 && (
                    <li className="sf-meta ps-[calc(38px+0.625rem)] text-[12.5px]">
                        {text("offerAndMore").replace("{n}", String(hidden))}
                    </li>
                )}
            </ul>

            <div className={`mt-auto ${featured ? "pt-1" : ""}`}>
                <StorePriceBlock
                    pricing={pricing}
                    isAr={isAr}
                    format={format}
                    size={featured ? "lg" : "md"}
                />

                {/* Only facts the offer actually carries: its last day and, when it is
                    not an all-day offer, the hours it runs. No countdown, no urgency. */}
                <p className="sf-meta mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Clock className="size-3.5 shrink-0" />
                    <span>{text("offerEndsOn")} {endsOn}</span>
                    {dailyWindow && <span dir="ltr">· {text("offerDailyBetween")} {dailyWindow}</span>}
                </p>

                <button
                    type="button"
                    disabled={!available || !onAdd}
                    onClick={() => onAdd?.(offer)}
                    className={`sf-btn sf-btn--primary mt-3 w-full ${featured ? "sf-btn--lg sm:w-auto sm:min-w-[16rem]" : ""} ${
                        justAdded ? "sf-btn--done" : ""
                    }`}
                >
                    {justAdded ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
                    {justAdded ? text("offerAdded") : text("offerAddToCart")}
                </button>
            </div>
        </div>
    );

    if (featured) {
        return (
            <article className="sf-card grid overflow-hidden md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                {media}
                {body}
            </article>
        );
    }

    return (
        <article className="sf-card flex h-full flex-col overflow-hidden">
            {media}
            {body}
        </article>
    );
}

/**
 * One thing inside the bundle: its packshot, its name and how many of it you get.
 *
 * The quantity is the fact worth reading here — the per-line price is a share of the
 * bundle total, not something the shopper can buy at, so showing it as a price would
 * invite the wrong comparison. The whole-bundle numbers live under the card.
 */
function OfferItemRow({
    item,
    isAr,
    featured,
}: {
    item: OnlineStoreOfferItem;
    isAr: boolean;
    featured: boolean;
}) {
    const name = isAr ? item.nameAr || item.name : item.name;

    return (
        <li className="flex items-center gap-2.5">
            {/* Cropped, not fitted: at 40px a contained packshot is a speck on white, and
                the point of the row is to be recognisable at a glance. */}
            <StoreImage
                src={productImage(item.imageKey, item.imageUrl, "medium")}
                alt=""
                fit="cover"
                fallbackText={name}
                sizes="56px"
                className={`sf-thumb ${featured ? "sf-thumb--lg" : ""}`}
            />
            <Link
                href={`/shop/product/${item.productId}`}
                className={`sf-bidi min-w-0 flex-1 truncate transition-colors hover:text-[var(--sf-accent-ink)] ${
                    featured ? "text-sm" : "text-[13px]"
                }`}
            >
                {name}
            </Link>
            {item.quantity > 1 && (
                <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-muted-foreground">
                    ×{item.quantity}
                </span>
            )}
        </li>
    );
}
