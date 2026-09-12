"use client";

import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import StoreImage from "@/components/showcase/StoreImage";
import { createStoreText } from "@/lib/store-copy";
import { categoryDealPercent, type CategoryOfferSummary } from "@/lib/store-pricing";
import type { OnlineStoreCategory } from "@/lib/api-online-shopping";

/**
 * Department tile.
 *
 * Three weights so the home page can lead with a few departments without breaking the
 * grid: `feature` is a wide image-led panel, `tile` is the standard grid unit and `rail`
 * is the compact square used in the mobile scroller.
 *
 * Every variant is exactly its media box — the name sits ON the image rather than in a row
 * beneath it. That is what keeps a department with a photo and one without the same height
 * in a rail or a grid row; a card that grew a label row would drag every neighbour with it.
 * The scrim swaps with the content: dark over a photo, a light fade over the monogram.
 */
export default function StoreCategoryCard({
    category,
    isAr,
    variant = "tile",
    priority = false,
    offers,
}: {
    category: OnlineStoreCategory;
    isAr: boolean;
    variant?: "tile" | "rail" | "feature";
    priority?: boolean;
    /** Live bundles touching this department, when the calling page has loaded them. */
    offers?: CategoryOfferSummary;
}) {
    const text = createStoreText(isAr);
    const name = isAr ? category.nameAr || category.name : category.name;
    const count = `${category.productCount} ${text(category.productCount === 1 ? "product" : "products")}`;
    const hasImage = !!category.imageUrl;
    const isFeature = variant === "feature";
    const isRail = variant === "rail";
    const deal = categoryDeal(category, offers, isAr);

    const ratio = isFeature
        ? "aspect-[16/10] sm:aspect-[2/1] lg:h-full lg:aspect-auto"
        : isRail
            ? "aspect-square"
            : "aspect-[4/3]";

    return (
        <Link
            href={`/shop/category/${category.id}`}
            className={`sf-card-link group ${isRail ? "w-[7.75rem] shrink-0 sm:w-[8.5rem]" : ""} ${isFeature ? "h-full" : ""}`}
        >
            <span className={`relative block w-full ${isFeature ? "h-full" : ""}`}>
                <StoreImage
                    src={category.imageUrl}
                    alt={name}
                    fallbackText={name}
                    priority={priority}
                    className={`${ratio} w-full`}
                    sizes={
                        isFeature ? "(max-width: 640px) 92vw, (max-width: 1024px) 60vw, 48vw"
                            : isRail ? "140px"
                            : "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
                    }
                />
                <span
                    aria-hidden
                    className={`absolute inset-0 ${
                        hasImage
                            ? "bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                            : "bg-gradient-to-t from-background via-background/70 to-transparent"
                    }`}
                />

                {/* Only departments that genuinely have something reduced or bundled are
                    marked. Marking them all would make the mark worth nothing — the
                    variation between tiles is the signal. It sits in the top corner, clear
                    of the name and count at the foot of the tile. */}
                {deal && (
                    <span className={`absolute start-2 top-2 ${deal.kind === "offer" ? "sf-cat-deal sf-cat-deal--offer" : "sf-cat-deal"} ${
                        isRail ? "text-[10.5px]" : ""
                    }`}>
                        {deal.kind === "offer" && <Tag className="size-3" />}
                        {deal.label}
                    </span>
                )}

                <span className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 ${isFeature ? "p-4 sm:p-5" : isRail ? "p-2" : "p-2.5"}`}>
                    <span className="min-w-0">
                        <span
                            className={`sf-bidi block break-words font-semibold leading-snug ${hasImage ? "text-white" : "text-foreground"} ${
                                isFeature ? "text-lg sm:text-xl" : isRail ? "line-clamp-1 text-[13px]" : "line-clamp-2 text-sm"
                            }`}
                        >
                            {name}
                        </span>
                        <span className={`block text-[11.5px] leading-4 ${hasImage ? "text-white/70" : "text-muted-foreground"} ${isFeature ? "mt-0.5 text-[13px]" : ""}`}>
                            {count}
                        </span>
                    </span>
                    {isFeature && (
                        <span className={`grid size-9 shrink-0 place-items-center rounded-full backdrop-blur transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 ${
                            hasImage ? "bg-white/15 text-white" : "bg-foreground/10 text-foreground"
                        }`}>
                            <ArrowRight className="size-4 rtl:rotate-180" />
                        </span>
                    )}
                </span>
            </span>
        </Link>
    );
}

/**
 * What this department may truthfully claim right now.
 *
 * A percentage is only stated when one can be measured: either a product here is sold below
 * its list price, or a live bundle allocates a product of this department below its list
 * price. Both figures come from the API. When a bundle touches the department but the
 * arithmetic yields nothing to quote, the tile says an offer exists and stops there rather
 * than reaching for a number.
 */
function categoryDeal(
    category: OnlineStoreCategory,
    offers: CategoryOfferSummary | undefined,
    isAr: boolean,
): { kind: "percent" | "offer"; label: string } | null {
    const text = createStoreText(isAr);
    const { percent, upTo } = categoryDealPercent(category, offers);

    if (percent > 0) {
        return {
            kind: "percent",
            label: text(upTo ? "upToPercentOff" : "percentOff").replace("{n}", String(percent)),
        };
    }

    if ((offers?.offerCount ?? 0) > 0) return { kind: "offer", label: text("offersAvailable") };
    return null;
}
