"use client";

import React from "react";
import { ChefHat, Leaf, Flame, Package } from "lucide-react";
import SectionWrapper from "@/app/website/components/SectionWrapper";
import TitleBlock from "@/app/website/components/TitleBlock";
import type { ExperienceContent, ExperienceIcon } from "@/app/website/types";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";

const ICON_MAP: Record<ExperienceIcon, React.ComponentType<{ size?: number }>> = {
  chef: ChefHat,
  leaf: Leaf,
  flame: Flame,
  box: Package,
};

interface ExperienceSectionProps {
  experience: ExperienceContent;
}

export default function ExperienceSection({ experience }: ExperienceSectionProps) {
  const { locale } = useWebsiteLocale();

  return (
    <SectionWrapper id="experience" background="cream">
      <TitleBlock
        eyebrow={pick(experience, "eyebrow", locale) as string}
        title={pick(experience, "title", locale) as string}
        align="center"
      />
      <div className="w-exp-grid">
        {experience.items.map((item, i) => {
          const Icon = ICON_MAP[item.icon];
          return (
            <div key={i} className="w-exp-card">
              <div className="w-exp-icon">
                <Icon size={24} />
              </div>
              <div className="w-exp-title">{pick(item, "title", locale)}</div>
              <p className="w-exp-desc">{pick(item, "description", locale)}</p>
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
