"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

/**
 * Storefront image slot.
 *
 * The wrapper owns the aspect ratio so category tiles, product cards, cart
 * thumbnails and the detail sheet all crop identically and never stretch.
 * When no image is configured the slot renders a designed fallback — a quiet
 * monogram or glyph on the neutral media surface — rather than a broken frame.
 */
export default function StoreImage({
    src,
    alt,
    className = "",
    fit = "cover",
    priority = false,
    sizes,
    fallbackText,
}: {
    src?: string | null;
    alt: string;
    className?: string;
    fit?: "cover" | "contain";
    priority?: boolean;
    sizes?: string;
    /** When set, the empty state shows this label's initial instead of a glyph. */
    fallbackText?: string;
}) {
    const [failed, setFailed] = useState<string>();
    const showImage = !!src && failed !== src;
    const initial = fallbackText?.trim()?.[0]?.toUpperCase();

    return (
        <div className={`sf-media ${className}`}>
            {showImage ? (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    unoptimized
                    sizes={sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
                    priority={priority}
                    loading={priority ? undefined : "lazy"}
                    decoding="async"
                    onError={() => setFailed(src)}
                    className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain p-[6%]"}`}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center" role="img" aria-label={alt}>
                    {initial ? (
                        <span className="select-none text-[clamp(1.5rem,14cqw,2.75rem)] font-semibold text-muted-foreground/35">
                            {initial}
                        </span>
                    ) : (
                        <ImageOff className="size-6 text-muted-foreground/30 sm:size-7" strokeWidth={1.5} />
                    )}
                </div>
            )}
        </div>
    );
}
