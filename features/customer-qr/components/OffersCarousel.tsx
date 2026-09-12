"use client";

import { useRef, useState } from "react";
import { useT } from "../i18n/useT";
import type { MenuOffer } from "../types";

interface Props {
  offers: MenuOffer[];
}

/**
 * Premium promo carousel: gradient cards (with optional photo overlay),
 * snap scrolling, and an active-dot indicator. Renders nothing when there
 * are no offers, so the section host can hide its heading too.
 */
export function OffersCarousel({ offers }: Props) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (!offers.length) return null;

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    // Closest card left edge to the current scroll position (RTL-safe via abs).
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((c, i) => {
      const dist = Math.abs(c.offsetLeft - track.scrollLeft - track.offsetLeft);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  };

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-0.5 pb-1"
      >
        {offers.map((o, i) => (
          <article
            key={o.id}
            className={`relative snap-start shrink-0 w-[82%] sm:w-[290px] min-h-[108px] rounded-2xl overflow-hidden text-white flex flex-col justify-end p-5 cqr-shadow-card cqr-promo-grad-${i % 3}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={o.imageUrl}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 size-full object-cover opacity-35 mix-blend-overlay"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="pointer-events-none absolute -top-8 -end-8 size-28 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-6 end-8 size-20 rounded-full bg-white/[0.06]" />

            <span className="absolute top-4 start-5 inline-flex items-center rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
              {o.discountPct > 0 ? `−${o.discountPct}%` : t("promo")}
            </span>

            <div className="relative z-10">
              <h3 className="text-[15px] font-extrabold leading-tight">
                {t.bi(o.title)}
              </h3>
              <p className="mt-0.5 text-[11px] font-medium opacity-85 line-clamp-1">
                {t.bi(o.subtitle)}
              </p>
            </div>
          </article>
        ))}
      </div>

      {offers.length > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {offers.map((o, i) => (
            <span
              key={o.id}
              className={`cqr-dot${i === active ? " is-active" : ""}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
