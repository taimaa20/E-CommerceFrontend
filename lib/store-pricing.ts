import type { OnlineStoreOffer } from "@/lib/api-online-shopping";
import type { ProductDto } from "@/types/pos";

/**
 * The storefront's single reading of "what does this cost and what is taken off it".
 *
 * Nothing here decides a price. Every input is a figure the API already produced — the
 * product's effective price, the offer's allocated line prices — and this module only turns
 * two authoritative numbers into the third one a shopper needs to see (the percentage).
 * That is why every surface can share it: the card, the department page, the product page
 * and the offer tile all render the same discount from the same arithmetic, so a product
 * can never appear to be 25% off in a grid and 24% off on its own page.
 *
 * A discount that is not real never reaches these types: `hasDiscount` is false whenever the
 * "was" price is missing or not actually higher, and callers render the plain price instead.
 */
export interface StorePricing {
    /** What the shopper pays. */
    price: number;
    /** What it costs without the reduction, or null when there is none. */
    wasPrice: number | null;
    hasDiscount: boolean;
    /** Whole percent off, floored at 1 so a real reduction never reads as "0%". */
    percent: number;
    /** Money saved. Zero when there is no reduction. */
    saving: number;
}

const NO_DISCOUNT: Omit<StorePricing, "price"> = {
    wasPrice: null,
    hasDiscount: false,
    percent: 0,
    saving: 0,
};

/**
 * Turns a price pair into the presentation model above.
 *
 * The percentage matches the backend's own rounding rule (round half away from zero, floored
 * at 1), so an offer percentage computed here equals the `savingPercent` the API sends for
 * the same pair of numbers.
 */
export function pricingFrom(price: number, wasPrice?: number | null): StorePricing {
    if (wasPrice == null || !(wasPrice > price) || wasPrice <= 0) return { price, ...NO_DISCOUNT };
    const saving = wasPrice - price;
    return {
        price,
        wasPrice,
        hasDiscount: true,
        percent: Math.max(1, Math.round((saving / wasPrice) * 100)),
        saving,
    };
}

/** A catalogue product: its effective price against its list price. */
export function productPricing(product: ProductDto): StorePricing {
    return pricingFrom(product.discountedPrice ?? product.basePrice, product.basePrice);
}

/** A whole bundle: the offer price against what the same items cost separately. */
export function offerPricing(offer: OnlineStoreOffer): StorePricing {
    // `savingPercent` is the API's own figure and stays authoritative; the rest of the model
    // is rebuilt from the same two prices so the tile reads exactly like a product tile.
    return { ...pricingFrom(offer.price, offer.originalPrice), percent: offer.savingPercent };
}

/** What a department currently has running, from the live offers the page already loaded. */
export interface CategoryOfferSummary {
    /** Live offers containing at least one product of this department. */
    offerCount: number;
    /**
     * The deepest reduction a shopper can actually get on a product of this department:
     * the largest gap between a product's normal price and the price it is allocated
     * inside a live offer. Zero when no offer touches the department.
     */
    maxOfferPercent: number;
}

/**
 * Groups live offers by the departments their products belong to.
 *
 * The percentage is measured per product line, not taken from the offer's headline: an
 * offer that spans three departments contributes to each of them the reduction that
 * department's own items actually receive. Both numbers in the ratio are produced by the
 * backend — `listUnitPrice` is the product's normal price and `unitPrice` is what order
 * intake will charge for that line inside the bundle — so "up to X% off in this department"
 * is a claim the store can honour at checkout.
 */
export function summariseOffersByCategory(
    offers: readonly OnlineStoreOffer[],
): Map<string, CategoryOfferSummary> {
    const summary = new Map<string, CategoryOfferSummary>();

    for (const offer of offers) {
        const seen = new Set<string>();
        for (const item of offer.items) {
            if (!item.categoryId) continue;
            const { percent } = pricingFrom(item.unitPrice, item.listUnitPrice);
            const current = summary.get(item.categoryId) ?? { offerCount: 0, maxOfferPercent: 0 };
            summary.set(item.categoryId, {
                // One offer counts once per department however many of its items sit there.
                offerCount: current.offerCount + (seen.has(item.categoryId) ? 0 : 1),
                maxOfferPercent: Math.max(current.maxOfferPercent, percent),
            });
            seen.add(item.categoryId);
        }
    }

    return summary;
}

/**
 * How a department may state what it has running.
 *
 * `percent` is the deepest reduction measurable there — a product sold below its list price,
 * or a product allocated below its list price inside a live bundle — and is zero when there
 * is nothing to state. `upTo` is false when exactly one thing is behind the number, because
 * "up to 25% off" about a single reduced item is a hedge, not a fact.
 */
export function categoryDealPercent(
    category: { maxDiscountPercent?: number; discountedProductCount?: number },
    offers?: CategoryOfferSummary,
): { percent: number; upTo: boolean } {
    const percent = Math.max(category.maxDiscountPercent ?? 0, offers?.maxOfferPercent ?? 0);
    const sources = (category.discountedProductCount ?? 0) + (offers?.offerCount ?? 0);
    return { percent, upTo: sources > 1 };
}

/** Every product that is part of a live offer, for the "in an offer" mark on a tile. */
export function offerProductIds(offers: readonly OnlineStoreOffer[]): Set<string> {
    return new Set(offers.flatMap(offer => offer.items.map(item => item.productId)));
}
