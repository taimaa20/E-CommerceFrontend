"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import StoreImage from "@/components/showcase/StoreImage";
import { productImage } from "@/lib/product-image";
import { createStoreText } from "@/lib/store-copy";
import type { OnlineStoreBanner } from "@/lib/api-online-shopping";

/**
 * Scheduled promotional banner for the storefront home.
 *
 * The merchant supplies the artwork and the destination; this component decides nothing
 * about when it appears — the API only ever returns banners that are live right now.
 *
 * Several banners rotate on the shopper's own input, never on a timer: an advert that moves
 * while someone is reading it is worse than one they can step through themselves.
 */
export default function StoreBanner({
    banners,
    isAr,
}: {
    banners: OnlineStoreBanner[];
    isAr: boolean;
}) {
    const text = createStoreText(isAr);
    const [index, setIndex] = useState(0);
    if (banners.length === 0) return null;

    const banner = banners[Math.min(index, banners.length - 1)];
    const multiple = banners.length > 1;
    const title = isAr ? banner.titleAr || banner.title : banner.title;
    const subtitle = isAr ? banner.subtitleAr || banner.subtitle : banner.subtitle;
    const ctaLabel = isAr ? banner.ctaLabelAr || banner.ctaLabel : banner.ctaLabel;
    const href = bannerHref(banner);
    const external = banner.linkType === 5;

    // With more than one banner the side arrows sit over the copy, so the text block keeps
    // clear of them rather than being read through a chevron.
    const copyInset = multiple ? "px-14 sm:ps-16 sm:pe-20" : "px-5 sm:px-8";

    const content = (
        <>
            {/* Two crops, one banner: the portrait file (when supplied) below `sm`, the wide
                one above it, so a phone never gets a letterboxed strip of unreadable text. */}
            <StoreImage
                src={productImage(banner.mobileImageKey, banner.mobileImageUrl, "full")
                    ?? productImage(banner.imageKey, banner.imageUrl, "full")}
                alt={title}
                priority
                sizes="100vw"
                className="absolute inset-0 h-full w-full sm:hidden"
            />
            <StoreImage
                src={productImage(banner.imageKey, banner.imageUrl, "full")}
                alt={title}
                priority
                sizes="100vw"
                className="absolute inset-0 hidden h-full w-full sm:block"
            />
            <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/10 sm:bg-gradient-to-r sm:from-black/80 sm:via-black/45 sm:to-transparent"
            />
            {/* The hero is short now, so the copy is clamped rather than allowed to grow into
                the artwork: a long merchant title truncates instead of pushing out the CTA. */}
            <span className={`relative flex h-full flex-col justify-end py-4 text-white sm:justify-center sm:py-6 ${copyInset}`}>
                <span className="sf-bidi line-clamp-2 block max-w-xl break-words text-lg font-bold leading-tight tracking-tight sm:text-2xl lg:text-[1.75rem]">
                    {title}
                </span>
                {subtitle && (
                    <span className="sf-bidi mt-1.5 line-clamp-2 block max-w-lg break-words text-[13px] text-white/85 sm:text-[15px]">
                        {subtitle}
                    </span>
                )}
                {ctaLabel && href && (
                    <span className="sf-btn sf-btn--accent sf-btn--sm mt-3 w-fit sm:mt-4">
                        {ctaLabel}
                        <ArrowRight className="size-4 rtl:rotate-180" />
                    </span>
                )}
            </span>
        </>
    );

    return (
        <section aria-label={title} className="sf-container">
            <div className="sf-hero relative overflow-hidden rounded-[var(--sf-radius-lg)] border">
                {href ? (
                    external ? (
                        // An external destination is opened in a new tab and carries no
                        // referrer or opener back into the store.
                        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="block h-full">
                            {content}
                        </a>
                    ) : (
                        <Link href={href} className="block h-full">{content}</Link>
                    )
                ) : (
                    <div className="h-full">{content}</div>
                )}

                {multiple && (
                    <>
                        <button
                            type="button"
                            onClick={() => setIndex((index - 1 + banners.length) % banners.length)}
                            aria-label={text("previous")}
                            className="sf-icon-btn absolute start-2 top-1/2 -translate-y-1/2 bg-black/35 text-white backdrop-blur hover:bg-black/55"
                        >
                            <ChevronLeft className="size-5 rtl:rotate-180" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIndex((index + 1) % banners.length)}
                            aria-label={text("next")}
                            className="sf-icon-btn absolute end-2 top-1/2 -translate-y-1/2 bg-black/35 text-white backdrop-blur hover:bg-black/55"
                        >
                            <ChevronRight className="size-5 rtl:rotate-180" />
                        </button>
                        <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1.5">
                            {banners.map((row, position) => (
                                <button
                                    key={row.id}
                                    type="button"
                                    onClick={() => setIndex(position)}
                                    aria-label={`${position + 1}`}
                                    aria-current={position === index}
                                    className={`h-1.5 rounded-full transition-all duration-200 ${
                                        position === index ? "w-6 bg-white" : "w-1.5 bg-white/55"
                                    }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

/**
 * Turns a stored destination into a route.
 *
 * The link type — not the stored string — decides the shape of the URL, so a value in the
 * database can only ever become one of the store's own routes or an https address the API
 * already validated. Anything unrecognised produces no link at all.
 */
function bannerHref(banner: OnlineStoreBanner): string | undefined {
    const value = banner.linkValue?.trim();
    switch (banner.linkType) {
        case 1: return value ? `/shop/category/${encodeURIComponent(value)}` : undefined;
        case 2: return value ? `/shop/product/${encodeURIComponent(value)}` : undefined;
        case 3: return "/shop/offers";
        case 4: return value ? `/shop?q=${encodeURIComponent(value)}` : undefined;
        case 5: return value && /^https:\/\//i.test(value) ? value : undefined;
        default: return undefined;
    }
}
