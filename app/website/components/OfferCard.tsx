"use client";

import React from "react";
import Image from "next/image";
import type { Offer } from "@/app/website/types";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";

interface OfferCardProps {
  offer: Offer;
}

export default function OfferCard({ offer }: OfferCardProps) {
  const { locale } = useWebsiteLocale();
  const name = pick(offer, "name", locale);
  const tagline = pick(offer, "tagline", locale);
  const description = pick(offer, "description", locale);
  const badge = pick(offer, "badge", locale);
  const currency = locale === "ar" ? "ج.م" : "EGP";

  return (
    <article className={`w-offer-card w-offer-card--${offer.color}`}>
      {offer.image ? (
        <Image
          fill
          unoptimized
          aria-hidden
          className="w-offer-card-photo"
          src={offer.image}
          alt=""
          loading="lazy"
          decoding="async"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      ) : null}
      <div>
        <span className="w-offer-badge">{badge}</span>
        <h3 className="w-offer-title">{name}</h3>
        <div className="w-offer-tagline">{tagline}</div>
        <p className="w-offer-desc">{description}</p>
      </div>
      <div className="w-offer-price">
        <div className="w-offer-price-now">
          {offer.price}
          <span className="w-offer-price-currency">{currency}</span>
        </div>
        {offer.originalPrice > offer.price ? (
          <div className="w-offer-price-original">
            {offer.originalPrice} {currency}
          </div>
        ) : null}
      </div>
    </article>
  );
}
