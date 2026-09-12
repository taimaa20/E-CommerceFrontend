"use client";

import React from "react";
import SectionWrapper from "@/app/website/components/SectionWrapper";
import TitleBlock from "@/app/website/components/TitleBlock";
import SmartImage from "@/app/website/components/SmartImage";
import type { AboutContent } from "@/app/website/types";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";

interface AboutSectionProps {
  about: AboutContent;
}

export default function AboutSection({ about }: AboutSectionProps) {
  const { locale } = useWebsiteLocale();
  const eyebrow = pick(about, "eyebrow", locale);
  const title = pick(about, "title", locale);
  const paragraphs =
    locale === "ar" && about.paragraphsAr?.length ? about.paragraphsAr : about.paragraphs;

  return (
    <SectionWrapper id="about">
      <div className="w-about-grid">
        <div className="w-about-media">
          <SmartImage src={about.image} alt={title as string} />
        </div>
        <div>
          <TitleBlock eyebrow={eyebrow as string} title={title as string} />
          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {paragraphs.map((p, i) => (
              <p key={i} className="w-body">
                {p}
              </p>
            ))}
          </div>
          <div className="w-about-stats">
            {about.stats.map((stat, i) => (
              <div key={i}>
                <div className="w-stat-value">{stat.value}</div>
                <div className="w-stat-label">{pick(stat, "label", locale)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
