"use client";

import React, { memo } from "react";
import type { MenuItem } from "@/app/website/types";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";
import SmartImage from "@/app/website/components/SmartImage";

interface MenuCardProps {
  item: MenuItem;
}

// Display-only card. No cart, no add button — this is a showroom.
function MenuCardImpl({ item }: MenuCardProps) {
  const { locale } = useWebsiteLocale();
  const name = pick(item, "name", locale);
  const description = pick(item, "description", locale);
  const badge = item.badge ? pick(item, "badge", locale) : null;
  const currency = locale === "ar" ? "ج.م" : "EGP";
  const viewLabel = locale === "ar" ? "تفاصيل" : "View";
  const isAr = locale === "ar";
  const isSoon = item.isSoon === true;
  const hasDiscount =
    !isSoon &&
    item.originalPrice != null &&
    item.originalPrice > item.price &&
    item.discountPercentage != null &&
    item.discountPercentage > 0;
  const comingSoonLabel = isAr ? "الأسعار قريباً 🤩" : "Prices coming soon 🤩";
  const saleLabel = isAr
    ? `خصم ${item.discountPercentage}%`
    : `${item.discountPercentage}% OFF`;

  return (
    <article
      className="w-menu-card"
      aria-label={isSoon ? `${name} — ${comingSoonLabel}` : (name as string)}
      aria-disabled={isSoon || undefined}
    >
      <div className="w-menu-card-media">
        {isSoon ? (
          // Pill sits at the top of the image as an overlay. Gradient + shadow
          // + white type for high contrast. Stays inside the media wrapper to
          // respect the existing overflow:hidden clipping.
          <span
            aria-label={comingSoonLabel}
            style={{
              position: "absolute",
              top: "10px",
              [isAr ? "right" : "left"]: "10px",
              zIndex: 5,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
              padding: "10px 18px",
              borderRadius: "9999px",
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: isAr ? "normal" : "0.02em",
              boxShadow: "0 8px 22px rgba(15,23,42,0.35), 0 0 0 1px rgba(255,255,255,0.12) inset",
              pointerEvents: "none",
            }}
          >
            {comingSoonLabel}
          </span>
        ) : (
          <>
            {badge ? <span className="w-menu-card-badge">{badge}</span> : null}
            {hasDiscount ? (
              <span className="w-menu-card-sale-badge" dir={isAr ? "rtl" : "ltr"}>
                {saleLabel}
              </span>
            ) : null}
          </>
        )}
        <SmartImage src={item.image} alt={name as string} />
        {!isSoon && (
          <span className="w-menu-card-view" aria-hidden="true">{viewLabel}</span>
        )}
      </div>
      <div className="w-menu-card-body">
        <h3 className="w-menu-card-name">{name}</h3>
        {isSoon ? (
          // Reduced view: only description under the name. No price, no CTA.
          description ? <p className="w-menu-card-desc">{description}</p> : null
        ) : (
          <>
            {description && <p className="w-menu-card-desc">{description}</p>}
            <div className="w-menu-card-foot">
              <div className="w-menu-card-price" dir={isAr ? "rtl" : "ltr"}>
                {hasDiscount ? (
                  <span className="w-menu-card-original-price">
                    <bdi>{item.originalPrice}</bdi>
                    <span>{currency}</span>
                  </span>
                ) : null}
                <span className="w-menu-card-current-price">
                  <span className="amount"><bdi>{item.price}</bdi></span>
                  <span className="currency">{currency}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

const MenuCard = memo(MenuCardImpl);
export default MenuCard;
