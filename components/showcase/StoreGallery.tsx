"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import StoreImage from "@/components/showcase/StoreImage";
import StoreImageViewer from "@/components/showcase/StoreImageViewer";
import StoreZoomImage from "@/components/showcase/StoreZoomImage";
import { createStoreText } from "@/lib/store-copy";

export interface GalleryImage {
    /** Already-resolved URL — the caller decides which variant size to request. */
    src: string | null;
    alt?: string;
}

/**
 * Product image gallery.
 *
 * Desktop shows a large primary image with a thumbnail strip beside it; narrow screens get
 * a swipeable track with dots and a counter. Both drive the same `index`, so the arrows,
 * thumbnails, swipe and keyboard all stay in agreement.
 *
 * A single-image product renders just the frame — no thumbnails, no arrows, no dots — so a
 * product without a gallery never looks like one that is missing images.
 *
 * The image itself magnifies in place (hover on desktop, tap on touch). The full-screen
 * viewer opens only from the explicit expand button; it shares this component's `index`,
 * so closing it leaves the shopper on the photo they were looking at.
 */
export default function StoreGallery({
    images,
    name,
    isAr,
}: {
    images: GalleryImage[];
    name: string;
    isAr: boolean;
}) {
    const text = createStoreText(isAr);
    const [index, setIndex] = useState(0);
    const [viewerOpen, setViewerOpen] = useState(false);
    const track = useRef<HTMLDivElement>(null);
    const syncing = useRef(false);
    const multiple = images.length > 1;
    const current = images[Math.min(index, images.length - 1)] ?? images[0];

    const go = (next: number) => {
        const bounded = (next + images.length) % images.length;
        setIndex(bounded);
        // Keep the mobile track in step when the change came from a thumbnail or arrow.
        const element = track.current;
        if (element) {
            syncing.current = true;
            element.scrollTo({ left: bounded * element.clientWidth, behavior: "smooth" });
            setTimeout(() => { syncing.current = false; }, 400);
        }
    };

    // Swipe is the primary mobile gesture, so the active dot follows the scroll position.
    useEffect(() => {
        const element = track.current;
        if (!element || !multiple) return;
        const onScroll = () => {
            if (syncing.current || element.clientWidth === 0) return;
            const next = Math.round(element.scrollLeft / element.clientWidth);
            setIndex(current => (current === next ? current : next));
        };
        element.addEventListener("scroll", onScroll, { passive: true });
        return () => element.removeEventListener("scroll", onScroll);
    }, [multiple]);

    return (
        <section aria-label={text("productImages")} className="min-w-0">
            {/* Mobile / small tablet: swipe track. */}
            <div className="relative md:hidden">
                <div
                    ref={track}
                    className="sf-rail rounded-[var(--sf-radius)] border"
                    style={{ scrollSnapType: "x mandatory" }}
                >
                    {images.map((image, position) => (
                        <div key={position} className="w-full shrink-0" style={{ scrollSnapAlign: "center" }}>
                            <StoreZoomImage
                                src={image.src}
                                alt={image.alt ?? name}
                                priority={position === 0}
                                fallbackText={name}
                                sizes="100vw"
                            />
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    aria-label={text("enlargeImage")}
                    className="sf-icon-btn absolute start-3 top-3 border bg-background/85 backdrop-blur"
                >
                    <Expand className="size-[18px]" />
                </button>

                {multiple && (
                    <>
                        <p className="absolute end-3 top-3 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-semibold tabular-nums backdrop-blur">
                            {index + 1}/{images.length}
                        </p>
                        <div className="mt-3 flex items-center justify-center gap-1.5">
                            {images.map((_, position) => (
                                <button
                                    key={position}
                                    type="button"
                                    onClick={() => go(position)}
                                    aria-label={`${text("showImage")} ${position + 1}`}
                                    aria-current={position === index}
                                    className={`h-1.5 rounded-full transition-all duration-200 ${
                                        position === index
                                            ? "w-5 bg-[var(--sf-accent)]"
                                            : "w-1.5 bg-[var(--sf-line-strong)]"
                                    }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Desktop: fixed primary frame plus a thumbnail column. */}
            <div className="hidden gap-3 md:flex">
                {multiple && (
                    <div
                        role="tablist"
                        aria-label={text("productImages")}
                        aria-orientation="vertical"
                        className="flex w-[74px] shrink-0 flex-col gap-2 overflow-y-auto"
                    >
                        {images.map((image, position) => (
                            <button
                                key={position}
                                type="button"
                                role="tab"
                                aria-selected={position === index}
                                aria-label={`${text("showImage")} ${position + 1}`}
                                onClick={() => go(position)}
                                onKeyDown={event => {
                                    if (event.key === "ArrowDown") { event.preventDefault(); go(index + 1); }
                                    if (event.key === "ArrowUp") { event.preventDefault(); go(index - 1); }
                                }}
                                className={`overflow-hidden rounded-[var(--sf-radius-sm)] border-2 transition-colors ${
                                    position === index
                                        ? "border-[var(--sf-accent)]"
                                        : "border-transparent hover:border-[var(--sf-line-strong)]"
                                }`}
                            >
                                <StoreImage
                                    src={image.src}
                                    alt=""
                                    fit="contain"
                                    fallbackText={name}
                                    sizes="74px"
                                    className="aspect-square w-full"
                                />
                                {/* The border alone must not carry the state. */}
                                <span className="sr-only">{position === index ? text("showImage") : ""}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="relative min-w-0 flex-1 overflow-hidden rounded-[var(--sf-radius)] border">
                    <StoreZoomImage
                        key={index}
                        src={current?.src}
                        alt={current?.alt ?? name}
                        priority
                        fallbackText={name}
                        sizes="(max-width: 1280px) 45vw, 560px"
                    />
                    <button
                        type="button"
                        onClick={() => setViewerOpen(true)}
                        aria-label={text("enlargeImage")}
                        className="sf-icon-btn absolute end-2 top-2 border bg-background/85 backdrop-blur"
                    >
                        <Expand className="size-[18px]" />
                    </button>
                    {multiple && (
                        <>
                            <button
                                type="button"
                                onClick={() => go(index - 1)}
                                aria-label={text("previousImage")}
                                className="sf-icon-btn absolute start-2 top-1/2 -translate-y-1/2 border bg-background/90 backdrop-blur"
                            >
                                <ChevronLeft className="size-5 rtl:rotate-180" />
                            </button>
                            <button
                                type="button"
                                onClick={() => go(index + 1)}
                                aria-label={text("nextImage")}
                                className="sf-icon-btn absolute end-2 top-1/2 -translate-y-1/2 border bg-background/90 backdrop-blur"
                            >
                                <ChevronRight className="size-5 rtl:rotate-180" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {viewerOpen && (
                <StoreImageViewer
                    images={images}
                    index={Math.min(index, images.length - 1)}
                    name={name}
                    isAr={isAr}
                    onIndexChange={go}
                    onClose={() => setViewerOpen(false)}
                />
            )}
        </section>
    );
}
