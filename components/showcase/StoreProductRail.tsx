"use client";

import StoreProductCard from "@/components/showcase/StoreProductCard";
import StoreRail from "@/components/showcase/StoreRail";
import type { OnlineStoreProductDetails } from "@/lib/api-online-shopping";
import type { StoreCartHelpers } from "@/lib/use-store-cart";
import type { ProductDto } from "@/types/pos";

/**
 * A merchandising row of products.
 *
 * It is the same scrolling track the deals row uses, so discovery reads as one rhythm down
 * the page and a section is always a full band of cards — a grid would leave whatever the
 * catalogue could not divide evenly as empty space at the end of the row. Cards are the
 * same component the catalogue grid uses, so a product looks identical wherever it is found;
 * the wall behind "view all" is where the grid belongs.
 */
export default function StoreProductRail({
    products,
    details,
    cart,
    isAr,
    format,
    priority = false,
    inOffer,
}: {
    products: ProductDto[];
    details: Map<string, OnlineStoreProductDetails>;
    cart: StoreCartHelpers;
    isAr: boolean;
    format: (value: number) => string;
    priority?: boolean;
    /** Products a live bundle contains, so a tile can point at the offer. */
    inOffer?: ReadonlySet<string>;
}) {
    if (products.length === 0) return null;

    return (
        <StoreRail isAr={isAr} trackClassName="sf-product-rail">
            {products.map((product, index) => (
                <StoreProductCard
                    key={product.id}
                    product={product}
                    details={details.get(product.id)}
                    available={cart.isSellable(product)}
                    remaining={cart.remainingFor(product)}
                    isAr={isAr}
                    format={format}
                    priority={priority && index < 2}
                    justAdded={cart.justAddedId === product.id}
                    onQuickAdd={cart.quickAdd}
                    inOffer={inOffer?.has(product.id)}
                />
            ))}
        </StoreRail>
    );
}
