"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import { createStoreText } from "@/lib/store-copy";
import { useCartStore } from "@/store/cartStore";
import { useStorefrontStore } from "@/store/storefrontStore";

/**
 * A real address for checkout.
 *
 * The checkout itself stays where it already lives — the cart flow rendered by StoreShell —
 * so there is exactly one implementation of it, shared with the cart button on every page.
 * That flow opens itself on this route; this page is what sits behind it, and what a shopper
 * sees when they arrive here with nothing in the cart.
 */
export default function CheckoutPage() {
    return (
        <StoreShell>
            <CheckoutEntry />
        </StoreShell>
    );
}

function CheckoutEntry() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const hasItems = useCartStore(state => state.items.length > 0);
    const setCartOpen = useStorefrontStore(state => state.setCartOpen);

    return (
        <div className="sf-container">
            <div className="sf-empty">
                <ShoppingBag className="mx-auto size-8 text-muted-foreground/40" strokeWidth={1.5} />
                <p className="mt-3 font-semibold">
                    {hasItems
                        ? (isAr ? "إتمام الطلب" : "Checkout")
                        : (isAr ? "سلتك فارغة" : "Your cart is empty")}
                </p>
                <p className="sf-meta mx-auto mt-1 max-w-sm">
                    {hasItems
                        ? (isAr ? "أكمل بياناتك في نافذة الطلب." : "Finish your details in the order window.")
                        : (isAr ? "أضف منتجات لتبدأ طلبك." : "Add products to start your order.")}
                </p>
                {hasItems ? (
                    <button type="button" onClick={() => setCartOpen(true)} className="sf-btn sf-btn--primary mt-5">
                        {isAr ? "متابعة الدفع" : "Continue to checkout"}
                    </button>
                ) : (
                    <Link href="/shop" className="sf-btn sf-btn--primary mt-5">{text("backToShop")}</Link>
                )}
            </div>
        </div>
    );
}
