"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import StoreImage from "@/components/showcase/StoreImage";
import { createStoreText } from "@/lib/store-copy";
import type { GalleryImage } from "@/components/showcase/StoreGallery";

/** Enough magnification to read a label, small enough that panning stays predictable. */
const ZOOM_SCALE = 2.4;
/** Horizontal travel, in pixels, before a drag counts as a swipe to the next image. */
const SWIPE_THRESHOLD = 55;

/**
 * Full-screen product image viewer.
 *
 * Opened from the gallery so a shopper can actually inspect what they are buying: it fills
 * the viewport, moves between the product's images with arrows, keyboard or swipe, and
 * magnifies one image with pan. Escape and the backdrop both close it.
 *
 * It renders through a portal and carries the `storefront` class itself, because a portal
 * escapes the shell where every `--sf-*` token is defined.
 */
export default function StoreImageViewer({
    images,
    index,
    name,
    isAr,
    onIndexChange,
    onClose,
}: {
    images: GalleryImage[];
    index: number;
    name: string;
    isAr: boolean;
    onIndexChange: (index: number) => void;
    onClose: () => void;
}) {
    const text = createStoreText(isAr);
    const [zoomed, setZoomed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pan = useRef<HTMLDivElement>(null);
    const swipeStart = useRef<number | null>(null);
    const multiple = images.length > 1;
    const current = images[index] ?? images[0];

    useEffect(() => setMounted(true), []);

    // Zoom is per-image: moving to another photo starts it unmagnified again.
    useEffect(() => setZoomed(false), [index]);

    // The page behind must not scroll while the viewer owns the screen.
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
            if (!multiple) return;
            // Arrows follow the reading direction, so "next" is always the same gesture
            // the thumbnails and chevrons make on this page.
            const forward = isAr ? "ArrowLeft" : "ArrowRight";
            const back = isAr ? "ArrowRight" : "ArrowLeft";
            if (event.key === forward) { event.preventDefault(); step(1); }
            if (event.key === back) { event.preventDefault(); step(-1); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, multiple, isAr]);

    const step = (delta: number) => onIndexChange((index + delta + images.length) % images.length);

    // Zooming re-centres the pan box on the point that was tapped, so the detail the
    // shopper aimed at is the detail they get.
    const toggleZoom = (event?: React.MouseEvent<HTMLElement>) => {
        const next = !zoomed;
        setZoomed(next);
        if (!next || !event) return;
        const box = event.currentTarget.getBoundingClientRect();
        const ratioX = (event.clientX - box.left) / box.width;
        const ratioY = (event.clientY - box.top) / box.height;
        requestAnimationFrame(() => {
            const element = pan.current;
            if (!element) return;
            element.scrollLeft = ratioX * (element.scrollWidth - element.clientWidth);
            element.scrollTop = ratioY * (element.scrollHeight - element.clientHeight);
        });
    };

    if (!mounted) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${text("imageViewer")} — ${name}`}
            dir={isAr ? "rtl" : "ltr"}
            className="storefront fixed inset-0 z-[60] flex flex-col bg-black/95"
        >
            <div className="flex shrink-0 items-center justify-between gap-2 p-3 text-white">
                <p className="sf-bidi min-w-0 truncate text-sm font-medium">{name}</p>
                <div className="flex shrink-0 items-center gap-1">
                    {multiple && (
                        <span className="px-2 text-xs font-semibold tabular-nums text-white/80">
                            {index + 1}/{images.length}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => toggleZoom()}
                        aria-label={zoomed ? text("zoomOut") : text("zoomIn")}
                        aria-pressed={zoomed}
                        className="sf-icon-btn text-white hover:bg-white/15"
                    >
                        {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={text("closeViewer")}
                        className="sf-icon-btn text-white hover:bg-white/15"
                    >
                        <X className="size-5" />
                    </button>
                </div>
            </div>

            <div className="relative min-h-0 flex-1">
                <div
                    ref={pan}
                    // Magnified, this is a pan surface: touch drag and wheel both scroll it.
                    // Unmagnified, it is a plain backdrop and a click anywhere closes.
                    className={`flex h-full w-full items-center justify-center ${
                        zoomed ? "cursor-zoom-out overflow-auto" : "cursor-zoom-in overflow-hidden"
                    }`}
                    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
                    onTouchStart={event => { swipeStart.current = zoomed ? null : event.touches[0]?.clientX ?? null; }}
                    onTouchEnd={event => {
                        const start = swipeStart.current;
                        swipeStart.current = null;
                        if (start == null || !multiple) return;
                        const travel = (event.changedTouches[0]?.clientX ?? start) - start;
                        if (Math.abs(travel) < SWIPE_THRESHOLD) return;
                        // A leftward drag advances in LTR and goes back in RTL.
                        step(travel < 0 === !isAr ? 1 : -1);
                    }}
                >
                    <button
                        type="button"
                        onClick={toggleZoom}
                        aria-label={zoomed ? text("zoomOut") : text("zoomIn")}
                        className={`block ${zoomed ? "" : "max-h-full max-w-full p-2 sm:p-6"}`}
                        style={zoomed ? { width: `${ZOOM_SCALE * 100}%`, flexShrink: 0 } : undefined}
                    >
                        <StoreImage
                            key={`${index}-${zoomed}`}
                            src={current?.src}
                            alt={current?.alt ?? name}
                            fit="contain"
                            priority
                            fallbackText={name}
                            sizes={zoomed ? "240vw" : "100vw"}
                            className={zoomed ? "aspect-square w-full" : "max-h-[78dvh] w-auto"}
                        />
                    </button>
                </div>

                {multiple && !zoomed && (
                    <>
                        <button
                            type="button"
                            onClick={() => step(-1)}
                            aria-label={text("previousImage")}
                            className="sf-icon-btn absolute start-2 top-1/2 -translate-y-1/2 bg-white/10 text-white backdrop-blur hover:bg-white/25"
                        >
                            <ChevronLeft className="size-6 rtl:rotate-180" />
                        </button>
                        <button
                            type="button"
                            onClick={() => step(1)}
                            aria-label={text("nextImage")}
                            className="sf-icon-btn absolute end-2 top-1/2 -translate-y-1/2 bg-white/10 text-white backdrop-blur hover:bg-white/25"
                        >
                            <ChevronRight className="size-6 rtl:rotate-180" />
                        </button>
                    </>
                )}
            </div>

            {multiple && (
                <div className="sf-rail shrink-0 justify-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
                    {images.map((image, position) => (
                        <button
                            key={position}
                            type="button"
                            onClick={() => onIndexChange(position)}
                            aria-label={`${text("showImage")} ${position + 1}`}
                            aria-current={position === index}
                            className={`size-14 shrink-0 overflow-hidden rounded-[var(--sf-radius-sm)] border-2 transition-opacity ${
                                position === index ? "border-white" : "border-transparent opacity-55 hover:opacity-100"
                            }`}
                        >
                            <StoreImage
                                src={image.src}
                                alt=""
                                fit="contain"
                                fallbackText={name}
                                sizes="56px"
                                className="size-full"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>,
        document.body,
    );
}
