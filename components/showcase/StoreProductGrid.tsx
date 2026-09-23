"use client";

import StoreProductCard from "@/components/showcase/StoreProductCard";
import type { OnlineStoreProductDetails } from "@/lib/api-online-shopping";
import type { StoreCartHelpers } from "@/lib/use-store-cart";
import type { ProductDto } from "@/types/pos";

/**
 * The same merchandising row as `StoreProductRail`, laid out as the two-column wall a phone
 * reads better than a sideways scroller: on a narrow screen a rail hides most of a section
 * off-screen, and a shopper has to swipe each row before they can compare anything.
 *
 * It renders the identical `StoreProductCard` from the identical cart helpers, so a product
 * looks and behaves the same whether it was found here, in a rail or in the catalogue grid.
 * The page decides which of the two a viewport gets; neither fetches anything of its own.
 */
export default function StoreProductGrid({
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
        <div className="grid grid-cols-2 gap-[var(--sf-gap)]">
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
        </div>
    );
}
