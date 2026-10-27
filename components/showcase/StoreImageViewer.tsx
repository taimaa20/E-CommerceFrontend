"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ImageOff, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { createStoreText } from "@/lib/store-copy";
import type { GalleryImage } from "@/components/showcase/StoreGallery";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
/** One button press or keyboard step multiplies the magnification by this much. */
const ZOOM_STEP = 1.6;
/** Double-click / double-tap jumps straight to a scale where a label is readable. */
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
/** Wheel delta → scale exponent. Small so a trackpad pinch feels continuous. */
const WHEEL_SENSITIVITY = 0.0015;
/** Horizontal travel, in pixels, before an unmagnified drag counts as a swipe. */
const SWIPE_THRESHOLD = 55;
/** Movement under this many pixels is still a click/tap, not a drag. */
const TAP_SLOP = 6;

interface View { scale: number; x: number; y: number }
interface Point { x: number; y: number }

const IDENTITY: View = { scale: MIN_SCALE, x: 0, y: 0 };
const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Full-screen product image viewer.
 *
 * The stage is sized by the viewport (never by the image), and the photo fills it with
 * `object-fit: contain`, so it is always centred at its own aspect ratio. Magnification is a
 * single CSS transform on that photo: buttons, `+`/`-`, mouse wheel, double-click/tap and a
 * two-finger pinch all zoom around the point the shopper aimed at, and a drag pans. Panning
 * is bounded by the photo's rendered edges, so it can never be dragged out of view.
 *
 * Unmagnified, a horizontal swipe moves between images and a click outside the photo closes;
 * Escape and the close button always close. It renders through a portal and carries the
 * `storefront` class itself, because a portal escapes the shell where `--sf-*` is defined.
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
    const [mounted, setMounted] = useState(false);
    const [view, setView] = useState<View>(IDENTITY);
    const [failed, setFailed] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const stage = useRef<HTMLDivElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const loaded = useRef<{ src: string; width: number; height: number } | null>(null);
    const viewRef = useRef<View>(IDENTITY);
    const pointers = useRef(new Map<number, Point>());
    const gesture = useRef<{ start: Point; moved: boolean; pinch?: { distance: number; scale: number } } | null>(null);
    const lastTap = useRef(0);
    const multiple = images.length > 1;
    const current = images[index] ?? images[0];
    const src = current?.src ?? null;
    const showImage = !!src && failed !== src;
    const zoomed = view.scale > MIN_SCALE;
    /** Natural size of the photo on screen; ignored until that photo has actually loaded. */
    const naturalSize = () => (loaded.current && loaded.current.src === src ? loaded.current : null);

    /** Half the room the magnified photo has beyond the stage on each axis. */
    const panLimit = (scale: number) => {
        const box = stage.current?.getBoundingClientRect();
        if (!box) return { x: 0, y: 0 };
        const size = naturalSize();
        const fit = size ? Math.min(box.width / size.width, box.height / size.height) : 1;
        const width = size ? size.width * fit : box.width;
        const height = size ? size.height * fit : box.height;
        return { x: Math.max(0, (width * scale - box.width) / 2), y: Math.max(0, (height * scale - box.height) / 2) };
    };

    const apply = (next: View) => {
        const scale = clampScale(next.scale);
        const limit = panLimit(scale);
        const bounded = {
            scale,
            x: Math.min(limit.x, Math.max(-limit.x, next.x)),
            y: Math.min(limit.y, Math.max(-limit.y, next.y)),
        };
        viewRef.current = bounded;
        setView(bounded);
    };

    /** Zooms to `scale` keeping the photo point under `focus` (client coords) where it is. */
    const zoomAt = (scale: number, focus?: Point) => {
        const box = stage.current?.getBoundingClientRect();
        const previous = viewRef.current;
        const target = clampScale(scale);
        if (!box || !focus) { apply({ ...previous, scale: target }); return; }
        const offsetX = focus.x - (box.left + box.width / 2);
        const offsetY = focus.y - (box.top + box.height / 2);
        const ratio = target / previous.scale;
        apply({
            scale: target,
            x: offsetX - (offsetX - previous.x) * ratio,
            y: offsetY - (offsetY - previous.y) * ratio,
        });
    };

    const reset = () => apply(IDENTITY);
    const step = (delta: number) => onIndexChange((index + delta + images.length) % images.length);

    useEffect(() => setMounted(true), []);

    // Zoom is per-image: moving to another photo starts it unmagnified again.
    useEffect(() => {
        viewRef.current = IDENTITY;
        setView(IDENTITY);
    }, [index]);

    // The page behind must not scroll while the viewer owns the screen, and focus returns
    // to whatever opened the viewer when it closes.
    useEffect(() => {
        if (!mounted) return;
        const opener = document.activeElement as HTMLElement | null;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeButton.current?.focus();
        return () => {
            document.body.style.overflow = previous;
            opener?.focus?.();
        };
    }, [mounted]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
            if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomAt(viewRef.current.scale * ZOOM_STEP); return; }
            if (event.key === "-") { event.preventDefault(); zoomAt(viewRef.current.scale / ZOOM_STEP); return; }
            if (event.key === "0") { event.preventDefault(); reset(); return; }
            if (!multiple || viewRef.current.scale > MIN_SCALE) return;
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

    // React registers wheel listeners as passive, so the page-zoom default can only be
    // cancelled from a native listener.
    useEffect(() => {
        const element = stage.current;
        if (!mounted || !element) return;
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            zoomAt(viewRef.current.scale * Math.exp(-event.deltaY * WHEEL_SENSITIVITY), { x: event.clientX, y: event.clientY });
        };
        element.addEventListener("wheel", onWheel, { passive: false });
        return () => element.removeEventListener("wheel", onWheel);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    // Re-clamp the pan when the viewport changes (rotation, window resize).
    useEffect(() => {
        const onResize = () => apply(viewRef.current);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Whether a client point lands on the rendered photo rather than the letterbox. */
    const onPhoto = (point: Point) => {
        const box = stage.current?.getBoundingClientRect();
        if (!box || !showImage) return false;
        const { scale, x, y } = viewRef.current;
        const size = naturalSize();
        const fit = size ? Math.min(box.width / size.width, box.height / size.height) : 1;
        const halfWidth = ((size ? size.width * fit : box.width) * scale) / 2;
        const halfHeight = ((size ? size.height * fit : box.height) * scale) / 2;
        const centreX = box.left + box.width / 2 + x;
        const centreY = box.top + box.height / 2 + y;
        return Math.abs(point.x - centreX) <= halfWidth && Math.abs(point.y - centreY) <= halfHeight;
    };

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = { x: event.clientX, y: event.clientY };
        pointers.current.set(event.pointerId, point);
        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            gesture.current = { start: midpoint(a, b), moved: true, pinch: { distance: distance(a, b), scale: viewRef.current.scale } };
            return;
        }
        gesture.current = { start: point, moved: false };
        setDragging(true);
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const previous = pointers.current.get(event.pointerId);
        const active = gesture.current;
        if (!previous || !active) return;
        const point = { x: event.clientX, y: event.clientY };
        pointers.current.set(event.pointerId, point);

        if (active.pinch && pointers.current.size >= 2) {
            const [a, b] = [...pointers.current.values()];
            zoomAt(active.pinch.scale * (distance(a, b) / active.pinch.distance), midpoint(a, b));
            return;
        }
        if (distance(point, active.start) > TAP_SLOP) active.moved = true;
        if (viewRef.current.scale <= MIN_SCALE) return;
        apply({
            ...viewRef.current,
            x: viewRef.current.x + point.x - previous.x,
            y: viewRef.current.y + point.y - previous.y,
        });
    };

    const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        const point = { x: event.clientX, y: event.clientY };
        const active = gesture.current;
        pointers.current.delete(event.pointerId);
        if (pointers.current.size > 0) {
            // One finger lifted from a pinch: carry on as a pan with the remaining finger.
            const [remaining] = [...pointers.current.values()];
            gesture.current = { start: remaining, moved: true };
            return;
        }
        gesture.current = null;
        setDragging(false);
        if (!active || event.type === "pointercancel") return;

        if (active.moved) {
            const travel = point.x - active.start.x;
            if (multiple && viewRef.current.scale <= MIN_SCALE && !active.pinch && Math.abs(travel) >= SWIPE_THRESHOLD) {
                // A leftward drag advances in LTR and goes back in RTL.
                step(travel < 0 === !isAr ? 1 : -1);
            }
            return;
        }

        const now = event.timeStamp;
        const doubleTap = now - lastTap.current < DOUBLE_TAP_MS;
        lastTap.current = doubleTap ? 0 : now;
        if (doubleTap && onPhoto(point)) {
            if (viewRef.current.scale > MIN_SCALE) reset();
            else zoomAt(DOUBLE_TAP_SCALE, point);
            return;
        }
        // A single click on the backdrop around an unmagnified photo dismisses the viewer.
        if (!doubleTap && !onPhoto(point) && viewRef.current.scale <= MIN_SCALE) onClose();
    };

    if (!mounted) return null;

    const control = "sf-icon-btn text-white hover:bg-white/15 disabled:pointer-events-none disabled:opacity-35";

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${text("imageViewer")} — ${name}`}
            dir={isAr ? "rtl" : "ltr"}
            className="storefront fixed inset-0 z-[60] isolate flex flex-col bg-black/85 text-white backdrop-blur-sm"
        >
            <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 p-3">
                <p className="sf-bidi min-w-0 truncate text-sm font-medium">{name}</p>
                <div className="flex shrink-0 items-center gap-1">
                    {multiple && (
                        <span className="px-2 text-xs font-semibold tabular-nums text-white/80">
                            {index + 1}/{images.length}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => zoomAt(view.scale / ZOOM_STEP)}
                        disabled={!zoomed || !showImage}
                        aria-label={text("zoomOut")}
                        className={control}
                    >
                        <ZoomOut className="size-5" />
                    </button>
                    <span className="w-11 text-center text-xs font-semibold tabular-nums text-white/80" aria-live="polite">
                        {Math.round(view.scale * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() => zoomAt(view.scale * ZOOM_STEP)}
                        disabled={view.scale >= MAX_SCALE || !showImage}
                        aria-label={text("zoomIn")}
                        className={control}
                    >
                        <ZoomIn className="size-5" />
                    </button>
                    <button
                        type="button"
                        onClick={reset}
                        disabled={!zoomed}
                        aria-label={text("resetZoom")}
                        className={`${control} hidden sm:inline-flex`}
                    >
                        <RotateCcw className="size-[18px]" />
                    </button>
                    <button
                        ref={closeButton}
                        type="button"
                        onClick={onClose}
                        aria-label={text("closeViewer")}
                        className={control}
                    >
                        <X className="size-5" />
                    </button>
                </div>
            </div>

            <div
                className="relative min-h-0 flex-1"
                // The margin around the stage is backdrop too.
                onClick={event => { if (event.target === event.currentTarget) onClose(); }}
            >
                <div
                    ref={stage}
                    className={`absolute inset-2 touch-none select-none overflow-hidden sm:inset-6 ${
                        zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
                    }`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
                            transition: dragging ? "none" : "transform 200ms var(--sf-ease)",
                        }}
                    >
                        {showImage ? (
                            <Image
                                key={src}
                                src={src}
                                alt={current?.alt ?? name}
                                fill
                                unoptimized
                                priority
                                sizes="100vw"
                                draggable={false}
                                onLoad={event => {
                                    const image = event.currentTarget;
                                    loaded.current = { src, width: image.naturalWidth, height: image.naturalHeight };
                                }}
                                onError={() => setFailed(src)}
                                className="object-contain"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center" role="img" aria-label={current?.alt ?? name}>
                                <ImageOff className="size-10 text-white/40" strokeWidth={1.5} />
                            </div>
                        )}
                    </div>
                </div>

                {multiple && !zoomed && (
                    <>
                        <button
                            type="button"
                            onClick={() => step(-1)}
                            aria-label={text("previousImage")}
                            className="sf-icon-btn absolute start-2 top-1/2 z-10 -translate-y-1/2 bg-white/10 text-white backdrop-blur hover:bg-white/25"
                        >
                            <ChevronLeft className="size-6 rtl:rotate-180" />
                        </button>
                        <button
                            type="button"
                            onClick={() => step(1)}
                            aria-label={text("nextImage")}
                            className="sf-icon-btn absolute end-2 top-1/2 z-10 -translate-y-1/2 bg-white/10 text-white backdrop-blur hover:bg-white/25"
                        >
                            <ChevronRight className="size-6 rtl:rotate-180" />
                        </button>
                    </>
                )}
            </div>

            {multiple && (
                <div className="sf-rail relative z-10 shrink-0 justify-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
                    {images.map((image, position) => (
                        <button
                            key={position}
                            type="button"
                            onClick={() => onIndexChange(position)}
                            aria-label={`${text("showImage")} ${position + 1}`}
                            aria-current={position === index}
                            className={`relative size-14 shrink-0 overflow-hidden rounded-[var(--sf-radius-sm)] border-2 bg-white/5 transition-opacity ${
                                position === index ? "border-white" : "border-transparent opacity-55 hover:opacity-100"
                            }`}
                        >
                            {image.src ? (
                                <Image src={image.src} alt="" fill unoptimized sizes="56px" className="object-contain" />
                            ) : (
                                <ImageOff className="m-auto size-5 text-white/40" strokeWidth={1.5} />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>,
        document.body,
    );
}
