"use client";

import React from "react";
import SectionWrapper from "@/app/website/components/SectionWrapper";
import TitleBlock from "@/app/website/components/TitleBlock";
import ImageGrid from "@/app/website/components/ImageGrid";
import type { GalleryImage } from "@/app/website/types";
import { useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";

interface GallerySectionProps {
  gallery: GalleryImage[];
}

export default function GallerySection({ gallery }: GallerySectionProps) {
  const { locale } = useWebsiteLocale();
  return (
    <SectionWrapper id="gallery">
      <TitleBlock
        eyebrow={locale === "ar" ? "من مطبخنا" : "From Our Kitchen"}
        title={locale === "ar" ? "لمحة من داخل البوكس." : "A peek inside the box."}
        description={
          locale === "ar"
            ? "لحظات مصنوعة بحب، من المطبخ إليك."
            : "Moments from our kitchen, crafted with love."
        }
      />
      <ImageGrid items={gallery} />
    </SectionWrapper>
  );
}
