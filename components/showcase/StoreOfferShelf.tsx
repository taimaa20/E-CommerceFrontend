"use client";

import StoreOfferCard from "@/components/showcase/StoreOfferCard";
import StoreRail from "@/components/showcase/StoreRail";
import type { OnlineStoreOffer } from "@/lib/api-online-shopping";
import type { OfferCartHelpers } from "@/lib/use-store-offers";

/** Above this many offers the row becomes a stepped rail instead of a grid. */
const RAIL_THRESHOLD = 4;

/**
 * A merchandised row of live bundle offers.
 *
 * The number of offers a store happens to be running is a merchandising accident, not a
 * layout decision, so this component absorbs it:
 *
 *   1 offer   — the featured panel: image beside detail, across the full content width.
 *   2–4       — a grid of equal tiles that fills the row at every breakpoint.
 *   5 or more — the same tiles as a stepped rail, with arrows once it can actually scroll.
 *
 * That is the whole reason it exists. Every state uses the same card and the same facts;
 * only the composition changes, so a store never shows a lone narrow tile stranded in a
 * wide band, and never a row that visibly runs out of offers halfway across.
 */
export default function StoreOfferShelf({
    offers,
    cart,
    isAr,
    format,
    priority = false,
}: {
    offers: OnlineStoreOffer[];
    cart: OfferCartHelpers;
    isAr: boolean;
    format: (value: number) => string;
    priority?: boolean;
}) {
    if (offers.length === 0) return null;

    const card = (offer: OnlineStoreOffer, index: number) => (
        <StoreOfferCard
            key={offer.id}
            offer={offer}
            available={cart.isSellable(offer)}
            isAr={isAr}
            format={format}
            onAdd={cart.add}
            justAdded={cart.justAddedId === offer.id}
            priority={priority && index < 2}
        />
    );

    if (offers.length === 1) {
        return (
            <StoreOfferCard
                offer={offers[0]}
                available={cart.isSellable(offers[0])}
                isAr={isAr}
                format={format}
                onAdd={cart.add}
                justAdded={cart.justAddedId === offers[0].id}
                priority={priority}
                variant="featured"
            />
        );
    }

    if (offers.length <= RAIL_THRESHOLD) {
        // Column count follows the offer count, so three offers fill the row as three
        // rather than leaving a fourth column of empty band beside them.
        const columns = offers.length === 2
            ? "sm:grid-cols-2"
            : offers.length === 3
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2 lg:grid-cols-4";
        return (
            <div className={`grid gap-[var(--sf-gap)] ${columns}`}>
                {offers.map(card)}
            </div>
        );
    }

    return (
        <StoreRail isAr={isAr} trackClassName="sf-deal-rail">
            {offers.map(card)}
        </StoreRail>
    );
}
