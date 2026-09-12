"use client";

import { useState } from "react";
import { productImage } from "@/lib/product-image";
import type { OnlineStoreProductDetails } from "@/lib/api-online-shopping";

/**
 * How a product says which brand it is.
 *
 * The name always comes from the catalogue; the artwork comes from the brand master, which is
 * where a merchant uploads it. A brand with no logo — or one whose file fails to load — falls
 * back to the same name in text, so this never renders an empty space and never needs a
 * hardcoded logo anywhere in the store.
 *
 * The logo is always contained inside its box and never cropped: brand marks are wordmarks as
 * often as they are icons, and a cropped wordmark is worse than no logo at all.
 */
export default function StoreBrandMark({
    details,
    isAr,
    size = "sm",
    className = "",
}: {
    details?: Pick<OnlineStoreProductDetails, "brand" | "brandName" | "brandNameAr" | "brandLogoUrl" | "brandLogoKey">;
    isAr: boolean;
    /** `sm` sits on a product tile, `md` heads the product page. */
    size?: "sm" | "md";
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    // The brand master's own spelling wins over the catalogue's, so one brand reads the same
    // way on every product regardless of how each was typed.
    const name = (isAr
        ? details?.brandNameAr || details?.brandName || details?.brand
        : details?.brandName || details?.brand)?.trim();
    if (!name) return null;

    const logo = productImage(details?.brandLogoKey, details?.brandLogoUrl, "thumb");
    const boxHeight = size === "md" ? "h-7" : "h-5";

    if (!logo || failed) {
        const textSize = size === "md" ? "text-xs" : "text-[11px]";
        return (
            <span
                className={`sf-bidi line-clamp-1 font-semibold uppercase tracking-wide text-muted-foreground ${textSize} ${className}`}
            >
                {name}
            </span>
        );
    }

    return (
        // Plain <img>: the box is sized by the logo's own aspect ratio, which next/image's
        // fill layout cannot express without a second wrapper per brand.
        <img
            src={logo}
            alt={name}
            title={name}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={`${boxHeight} w-auto max-w-[7.5rem] object-contain object-start ${className}`}
        />
    );
}
