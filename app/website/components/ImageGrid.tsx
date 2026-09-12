"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { GalleryImage } from "@/app/website/types";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";
import SmartImage from "@/app/website/components/SmartImage";

interface ImageGridProps {
  items: GalleryImage[];
}

// Masonry-style gallery with a lightweight lightbox.
// Images render as styled placeholders if the asset is missing — the
// CSS gradient fallback keeps the design intact before real photos land.
export default function ImageGrid({ items }: ImageGridProps) {
  const { locale } = useWebsiteLocale();
  const [active, setActive] = useState<number | null>(null);
  const portalRoot = typeof document === "undefined" ? null : document.body;

  useEffect(() => {
    if (active === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const activeItem = active === null ? null : items[active];
  const activeAlt = activeItem ? (pick(activeItem, "alt", locale) as string) : "";

  return (
    <>
      <div className="w-gallery">
        {items.map((img, i) => {
          const alt = pick(img, "alt", locale);
          return (
            <button
              type="button"
              key={i}
              className="w-gallery-item"
              onClick={() => setActive(i)}
              aria-label={alt as string}
            >
              <SmartImage src={img.src} alt={alt as string} />
              <span className="w-gallery-item-label">{alt}</span>
            </button>
          );
        })}
      </div>

      {activeItem ? (
        portalRoot
          ? createPortal(
              <div
                className="w-lightbox"
                role="dialog"
                aria-modal="true"
                aria-label={activeAlt}
                onClick={() => setActive(null)}
              >
                <div className="w-lightbox-frame" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="w-lightbox-close"
                    aria-label={locale === "ar" ? "إغلاق" : "Close"}
                    onClick={() => setActive(null)}
                  >
                    ✕
                  </button>
                  <div className="w-lightbox-media">
                    <SmartImage src={activeItem.src} alt={activeAlt} style={{ objectFit: "contain" }} />
                  </div>
                </div>
              </div>,
              portalRoot
            )
          : null
      ) : null}
    </>
  );
}
