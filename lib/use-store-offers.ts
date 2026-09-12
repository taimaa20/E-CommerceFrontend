"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
    onlineShoppingApi,
    type OnlineStoreOffer,
    type OnlineProductAvailability,
} from "@/lib/api-online-shopping";
import { createStoreText } from "@/lib/store-copy";
import { productImage } from "@/lib/product-image";
import { useCartStore, type CartItem } from "@/store/cartStore";
import { useStorefrontStore } from "@/store/storefrontStore";

/** How long the "offer added" confirmation stays on a card. */
const CONFIRM_MS = 1600;

interface OffersState {
    offers: OnlineStoreOffer[];
    loading: boolean;
    error: boolean;
    reload: () => void;
}

/**
 * Bundle offers that are live for the selected branch.
 *
 * The API decides what "live" means — active, in its date window and inside its daily hours
 * on the store's own clock — so the storefront cannot show an expired deal, and an offer
 * that has ended simply stops appearing on the next load.
 */
export function useStoreOffers(productId?: string): OffersState {
    const branchId = useStorefrontStore(state => state.branchId);
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState<{ key: string; offers: OnlineStoreOffer[]; error: boolean } | null>(null);
    const key = `${branchId ?? ""}:${productId ?? ""}:${revision}`;

    useEffect(() => {
        let cancelled = false;
        onlineShoppingApi.getOffers(branchId, productId)
            .then(result => { if (!cancelled) setState({ key, offers: result.offers ?? [], error: false }); })
            .catch(() => { if (!cancelled) setState({ key, offers: [], error: true }); });
        return () => { cancelled = true; };
    }, [key, branchId, productId]);

    return {
        offers: state?.offers ?? [],
        loading: state?.key !== key,
        error: state?.key === key && state.error,
        reload: () => setRevision(value => value + 1),
    };
}

/**
 * True when every product in the bundle can be sold in this branch right now, at the
 * quantity the bundle asks for.
 *
 * The one definition of "a shopper here can buy this". Both the cart and the discovery
 * surfaces go through it, so a department cannot advertise an offer that the offers row
 * would refuse to sell — the two used to disagree whenever a bundle was live for the tenant
 * but out of stock in the selected branch.
 */
function isOfferSellable(
    offer: OnlineStoreOffer,
    availability: ReadonlyMap<string, OnlineProductAvailability>,
): boolean {
    return offer.items.length > 0 && offer.items.every(item => {
        const row = availability.get(item.productId);
        return !!row?.isAvailableOnline
            && (row.availableQuantity == null || row.availableQuantity >= item.quantity);
    });
}

/**
 * Live offers this branch can actually sell.
 *
 * Discovery surfaces use this rather than the raw list: an "up to 30% off" mark on a
 * department, and the offer it points at, have to be the same offer. The offers page
 * itself deliberately does NOT filter — it is the destination, and it says plainly which
 * bundles the selected store cannot fulfil.
 */
export function useSellableOffers(): OnlineStoreOffer[] {
    const context = useStorefrontStore(state => state.context);
    const { offers } = useStoreOffers();
    const availability = new Map((context?.productAvailability ?? []).map(row => [row.productId, row]));
    return offers.filter(offer => isOfferSellable(offer, availability));
}

/**
 * The products a live bundle contains, for the "in an offer" mark on a product tile.
 *
 * It exists so every catalogue surface — the full wall, a search result, a department —
 * marks the same products from the same read, instead of each page deciding for itself
 * what counts as being in an offer.
 */
export function useOfferProductIds(): Set<string> {
    return new Set(useSellableOffers().flatMap(offer => offer.items.map(item => item.productId)));
}

export interface OfferCartHelpers {
    /** True when every product in the bundle is sellable in this branch right now. */
    isSellable: (offer: OnlineStoreOffer) => boolean;
    add: (offer: OnlineStoreOffer) => void;
    /** Offer id showing its brief post-add confirmation, if any. */
    justAddedId: number | null;
}

/**
 * Turns a live offer into cart lines.
 *
 * A bundle goes in whole: one line per product, each at the unit price the API allocated
 * from the offer total. Order intake re-derives those same numbers from the offer, so the
 * cart total and the order total are the same figure, and it refuses a partial bundle.
 */
export function useOfferCart(
    availability: OnlineProductAvailability[],
    isAr: boolean,
): OfferCartHelpers {
    const text = createStoreText(isAr);
    const addOffer = useCartStore(state => state.addOffer);
    const [justAddedId, setJustAddedId] = useState<number | null>(null);
    const byProduct = new Map(availability.map(row => [row.productId, row]));

    const isSellable = (offer: OnlineStoreOffer) => isOfferSellable(offer, byProduct);

    const add = (offer: OnlineStoreOffer) => {
        if (!isSellable(offer)) {
            toast.error(text("offerUnavailable"));
            return;
        }

        addOffer(offer.items.map<CartItem>(item => ({
            productId: item.productId,
            productName: item.name,
            productNameAr: item.nameAr,
            imageUrl: productImage(item.imageKey, item.imageUrl, "medium") ?? undefined,
            price: item.unitPrice,
            originalPrice: item.listUnitPrice,
            quantity: item.quantity,
            offerLineId: offer.id,
            offerName: offer.name,
            offerNameAr: offer.nameAr,
            offerUnitQuantity: item.quantity,
            modifiers: [],
        })));

        setJustAddedId(offer.id);
        setTimeout(() => setJustAddedId(current => (current === offer.id ? null : current)), CONFIRM_MS);
        toast.success(text("offerAdded"));
    };

    return { isSellable, add, justAddedId };
}
