"use client";

import { useState } from "react";
import { toast } from "sonner";
import { productImage } from "@/lib/product-image";
import { createStoreText } from "@/lib/store-copy";
import type { OnlineProductAvailability } from "@/lib/api-online-shopping";
import { useCartStore, type CartItem } from "@/store/cartStore";
import type { ProductDto } from "@/types/pos";

/** How long the "added" confirmation stays on a card before it returns to normal. */
const CONFIRM_MS = 1400;

export interface StoreCartHelpers {
    /** True when the branch sells this product and its schedule allows it right now. */
    isSellable: (product: ProductDto) => boolean;
    /** Units the shopper may still add, or undefined when stock is not tracked. */
    remainingFor: (product: ProductDto) => number | undefined;
    /** Adds a fully-built line (used by the buy box, which resolves options first). */
    add: (item: CartItem) => boolean;
    /** One-tap add for a product that needs no choice. */
    quickAdd: (product: ProductDto) => void;
    /** Product id showing its brief post-add confirmation, if any. */
    justAddedId: string | null;
}

/**
 * The one place the storefront turns a product into a cart line.
 *
 * Availability is always re-checked against the branch payload before anything is added,
 * so a stale grid can never push an unsellable line into the cart. Every surface — grid,
 * rail, product page — shares this so the rules cannot drift apart.
 */
export function useStoreCart(availability: OnlineProductAvailability[], isAr: boolean): StoreCartHelpers {
    const text = createStoreText(isAr);
    const items = useCartStore(state => state.items);
    const addToCart = useCartStore(state => state.addToCart);
    const [justAddedId, setJustAddedId] = useState<string | null>(null);

    const byProduct = new Map(availability.map(row => [row.productId, row]));

    const isSellable = (product: ProductDto) =>
        !!byProduct.get(product.id)?.isAvailableOnline && product.isAvailableNow;

    const inCart = (productId: string) =>
        items.filter(item => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);

    const remainingFor = (product: ProductDto) => {
        const stock = byProduct.get(product.id)?.availableQuantity;
        return stock == null ? undefined : Math.max(0, stock - inCart(product.id));
    };

    const confirm = (productId: string) => {
        setJustAddedId(productId);
        setTimeout(() => setJustAddedId(current => (current === productId ? null : current)), CONFIRM_MS);
    };

    const add = (item: CartItem) => {
        if (!byProduct.get(item.productId)?.isAvailableOnline) return false;
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) return false;
        addToCart(item);
        confirm(item.productId);
        toast.success(isAr ? "تمت الإضافة إلى السلة" : "Added to cart");
        return true;
    };

    const quickAdd = (product: ProductDto) => {
        const remaining = remainingFor(product);
        if (remaining != null && remaining < 1) {
            toast.error(text("unavailable"));
            return;
        }
        add({
            productId: product.id,
            productName: product.name,
            productNameAr: product.nameAr,
            imageUrl: productImage(product.imageKey, product.imageUrl, "medium") ?? undefined,
            price: product.discountedPrice ?? product.basePrice,
            quantity: 1,
            modifiers: [],
        });
    };

    return { isSellable, remainingFor, add, quickAdd, justAddedId };
}
