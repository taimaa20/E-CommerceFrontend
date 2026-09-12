"use client";

import React from "react";
import SectionWrapper from "@/app/website/components/SectionWrapper";
import TitleBlock from "@/app/website/components/TitleBlock";
import OfferCard from "@/app/website/components/OfferCard";
import { useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";
import { useOffers } from "@/app/website/hooks/useOffers";

export default function OffersSection() {
  const { locale } = useWebsiteLocale();
  const { offers } = useOffers();
  const visibleOffers = offers.slice(0, 3);

  if (visibleOffers.length === 0) return null;

  return (
    <SectionWrapper id="offers">
      <TitleBlock
        eyebrow={locale === "ar" ? "عروض مميزة" : "Box Deals"}
        title={locale === "ar" ? "عروض مصنوعة لأجلك." : "Bundles built for you."}
        description={
          locale === "ar"
            ? "اختر العرض المناسب لك ووفر أكثر في كل زيارة."
            : "Hand-picked combos, priced to share, built to satisfy."
        }
      />
      <div className="w-offers-grid">
        {visibleOffers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </SectionWrapper>
  );
}
