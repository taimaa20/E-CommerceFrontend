"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createStoreText } from "@/lib/store-copy";

/**
 * A horizontal merchandising row.
 *
 * Every discovery row in the store — offers, products — is one of these, because a row that
 * scrolls is always full: whatever the catalogue happens to hold, the shopper sees a
 * complete band of cards rather than a grid with a half-empty last line. It also gives the
 * store one scrolling behaviour instead of one per section.
 *
 * The arrows appear only when the track can actually move and disable themselves at each
 * end, so a control never promises movement it cannot deliver. They are an addition to
 * swipe, trackpad and keyboard scrolling, never the only way through.
 */
export default function StoreRail({
    isAr,
    trackClassName,
    children,
}: {
    isAr: boolean;
    /** Sets the card width for this kind of row (`sf-deal-rail`, `sf-product-rail`). */
    trackClassName: string;
    children: React.ReactNode;
}) {
    const text = createStoreText(isAr);
    const track = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ start: false, end: false });

    // Reading direction flips the sign of scrollLeft, so distance is measured as an
    // absolute value and every comparison below works unchanged in Arabic.
    useEffect(() => {
        const node = track.current;
        if (!node) return;

        const measure = () => {
            const travelled = Math.abs(node.scrollLeft);
            const total = node.scrollWidth - node.clientWidth;
            setEdges({ start: travelled > 8, end: total - travelled > 8 });
        };

        measure();
        node.addEventListener("scroll", measure, { passive: true });
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => {
            node.removeEventListener("scroll", measure);
            observer.disconnect();
        };
    }, []);

    // Just under a full screen of cards, so a step always leaves the last card of the
    // previous view in sight and the shopper keeps their place.
    const step = (direction: 1 | -1) => {
        const node = track.current;
        if (!node) return;
        const distance = node.clientWidth * 0.85 * direction;
        node.scrollBy({ left: isAr ? -distance : distance, behavior: "smooth" });
    };

    return (
        <div className="relative">
            <div
                ref={track}
                className={`sf-rail-track ${trackClassName} -mx-[var(--sf-gutter)] px-[var(--sf-gutter)] sm:mx-0 sm:px-0`}
            >
                {children}
            </div>

            <button
                type="button"
                onClick={() => step(-1)}
                disabled={!edges.start}
                aria-label={text("previous")}
                className="sf-rail-nav absolute start-0 top-1/2 hidden -translate-y-1/2 sm:inline-flex ltr:-translate-x-1/2 rtl:translate-x-1/2"
            >
                <ChevronLeft className="size-5 rtl:rotate-180" />
            </button>
            <button
                type="button"
                onClick={() => step(1)}
                disabled={!edges.end}
                aria-label={text("next")}
                className="sf-rail-nav absolute end-0 top-1/2 hidden -translate-y-1/2 sm:inline-flex ltr:translate-x-1/2 rtl:-translate-x-1/2"
            >
                <ChevronRight className="size-5 rtl:rotate-180" />
            </button>
        </div>
    );
}
