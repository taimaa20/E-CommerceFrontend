"use client";

import { createStoreText } from "@/lib/store-copy";
import type { StorePricing } from "@/lib/store-pricing";

/** How loud the price is. The discount language is identical at every size. */
type PriceSize = "sm" | "md" | "lg";

const PRICE_SIZE: Record<PriceSize, string> = {
    sm: "text-[15px]",
    md: "text-[17px] sm:text-lg",
    lg: "text-2xl sm:text-[1.75rem]",
};

const WAS_SIZE: Record<PriceSize, string> = {
    sm: "text-[12.5px]",
    md: "text-[13px]",
    lg: "text-sm",
};

/**
 * The one way the store states a price.
 *
 * Reading order is fixed and the same everywhere: what you pay, what it used to cost,
 * what you keep. A shopper who learns it on a grid tile reads a product page or an offer
 * without re-learning anything, and — more importantly — a reduction cannot be styled to
 * look bigger in one place than another.
 *
 * It renders only what the pricing model reports. `hasDiscount` is false whenever the API
 * gave no genuinely higher "was" price, and then this is simply a price.
 */
export default function StorePriceBlock({
    pricing,
    isAr,
    format,
    size = "sm",
    showSaving = true,
}: {
    pricing: StorePricing;
    isAr: boolean;
    format: (value: number) => string;
    size?: PriceSize;
    /** Off on the tightest tiles, where the struck price already carries the message. */
    showSaving?: boolean;
}) {
    const text = createStoreText(isAr);

    // A span, not a div: this block is rendered inside anchors and inline runs on the
    // product tiles, and a div there is invalid nesting.
    return (
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className={`sf-price ${PRICE_SIZE[size]} ${pricing.hasDiscount ? "text-[var(--sf-sale-ink)]" : ""}`}>
                {format(pricing.price)}
            </span>
            {pricing.hasDiscount && (
                <>
                    <span className={`sf-price--was ${WAS_SIZE[size]}`}>{format(pricing.wasPrice!)}</span>
                    {showSaving && (
                        <span className="sf-save">
                            {text("offerSave")} {format(pricing.saving)}
                        </span>
                    )}
                </>
            )}
        </span>
    );
}
