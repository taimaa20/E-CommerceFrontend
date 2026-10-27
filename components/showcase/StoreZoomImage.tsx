"use client";

import { useEffect, useRef } from "react";
import StoreImage from "@/components/showcase/StoreImage";

/** Pointer position inside the frame as a 0–100 percentage, kept inside the frame. */
const toPercent = (offset: number, length: number) => Math.min(100, Math.max(0, (offset / length) * 100));

function focusAt(element: HTMLElement, clientX: number, clientY: number) {
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    element.style.setProperty("--sf-zoom-x", `${toPercent(clientX - box.left, box.width)}%`);
    element.style.setProperty("--sf-zoom-y", `${toPercent(clientY - box.top, box.height)}%`);
}

function setZoomed(element: HTMLElement, zoomed: boolean) {
    // Nothing to inspect when the slot is showing its fallback monogram.
    element.toggleAttribute("data-zoomed", zoomed && !!element.querySelector("img"));
}

/**
 * Product image that magnifies in place.
 *
 * A mouse or pen magnifies on hover around the pointer, and the focal point follows it;
 * leaving the frame eases back. A touch tap toggles the same magnification around the
 * tapped point, and a tap elsewhere or a scroll/swipe that starts on the image resets it,
 * so the page never stops scrolling naturally.
 *
 * The focal point lives in CSS custom properties written straight to the element, so
 * pointer movement never re-renders React. Mount it with a `key` per image so switching
 * images always starts unmagnified.
 */
export default function StoreZoomImage({
    src,
    alt,
    fallbackText,
    sizes,
    priority = false,
}: {
    src?: string | null;
    alt: string;
    fallbackText?: string;
    sizes?: string;
    priority?: boolean;
}) {
    const surface = useRef<HTMLDivElement>(null);
    const pointerType = useRef<string>("");

    useEffect(() => {
        const onOutside = (event: PointerEvent) => {
            const element = surface.current;
            if (element && !element.contains(event.target as Node)) setZoomed(element, false);
        };
        document.addEventListener("pointerdown", onOutside);
        return () => document.removeEventListener("pointerdown", onOutside);
    }, []);

    const hover = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === "touch") return;
        focusAt(event.currentTarget, event.clientX, event.clientY);
        setZoomed(event.currentTarget, true);
    };

    const tap = (event: React.MouseEvent<HTMLDivElement>) => {
        if (pointerType.current !== "touch") return;
        const element = event.currentTarget;
        if (element.hasAttribute("data-zoomed")) { setZoomed(element, false); return; }
        focusAt(element, event.clientX, event.clientY);
        setZoomed(element, true);
    };

    return (
        <div
            ref={surface}
            className="sf-zoom"
            onPointerDown={event => { pointerType.current = event.pointerType; }}
            onPointerEnter={hover}
            onPointerMove={hover}
            onPointerLeave={event => { if (event.pointerType !== "touch") setZoomed(event.currentTarget, false); }}
            // The browser took the touch for a scroll or swipe — the shopper has moved on.
            onPointerCancel={event => setZoomed(event.currentTarget, false)}
            onClick={tap}
        >
            <StoreImage
                src={src}
                alt={alt}
                fit="contain"
                priority={priority}
                fallbackText={fallbackText}
                sizes={sizes}
                className="sf-zoom-layer aspect-square w-full"
            />
        </div>
    );
}
