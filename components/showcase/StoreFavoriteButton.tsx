"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { showSoftSignInPrompt } from "@/lib/customer-auth-prompt";
import { createStoreText } from "@/lib/store-copy";
import { useStoreFavorites } from "@/lib/use-store-favorites";
import { useCustomerSessionStore } from "@/store/customerSessionStore";

/**
 * The heart. One component for every surface that offers to save a product, so the icon, the
 * label, the accessible state and the storage call cannot drift apart between a card and a
 * product page.
 *
 * It knows nothing about where favourites are kept — only `useStoreFavorites`, which is what
 * lets the persistence move to a customer account later without touching this file.
 */
export default function StoreFavoriteButton({
    productId,
    isAr,
    variant = "icon",
    className = "",
}: {
    productId: string;
    isAr: boolean;
    /** `icon` for the tile overlay, `button` for the labelled action on the product page. */
    variant?: "icon" | "button";
    className?: string;
}) {
    const text = createStoreText(isAr);
    const favorites = useStoreFavorites();
    const sessionStatus = useCustomerSessionStore(state => state.status);
    const router = useRouter();
    const pathname = usePathname();
    const saved = favorites.isFavorite(productId);
    const label = saved ? text("removeFromFavorites") : text("addToFavorites");

    // The tile is a link; the heart sits inside it and must not navigate.
    const activate = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const nowSaved = favorites.toggle(productId);
        // A guest's favourite is kept on this device; suggest an account once, without blocking.
        if (nowSaved && sessionStatus === "guest") {
            showSoftSignInPrompt("favorite", { isAr, next: pathname, navigate: router.push });
        }
    };

    if (variant === "icon") {
        return (
            <button
                type="button"
                onClick={activate}
                aria-label={label}
                aria-pressed={saved}
                title={label}
                className={`flex size-9 items-center justify-center rounded-full bg-background/85 backdrop-blur transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-brand)] ${className}`}
            >
                <Heart
                    className={`size-[18px] transition-colors ${saved ? "fill-[var(--sf-sale)] text-[var(--sf-sale)]" : "text-muted-foreground"}`}
                    strokeWidth={saved ? 2 : 1.75}
                />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={activate}
            aria-pressed={saved}
            className={`sf-btn sf-btn--outline ${className}`}
        >
            <Heart
                className={`size-4 ${saved ? "fill-[var(--sf-sale)] text-[var(--sf-sale)]" : ""}`}
            />
            {label}
        </button>
    );
}
