"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import type { HeroContent } from "@/app/website/types";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";
import { useRouter } from "next/navigation";
interface HeroSectionProps {
  hero: HeroContent;
}

export default function HeroSection({ hero }: HeroSectionProps) {
  const { locale } = useWebsiteLocale();
const router = useRouter();
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const eyebrow = pick(hero, "eyebrow", locale);
  const title = pick(hero, "title", locale);
  const subtitle = pick(hero, "subtitle", locale);
  const ctaPrimary = pick(hero, "ctaPrimary", locale);
  const ctaSecondary = pick(hero, "ctaSecondary", locale);

  return (
    <section id="top" className="w-hero">
      <div className="w-hero-bg" />
      <div className="w-hero-marks" />
      <div className="w-hero-vignette" />
      <div className="w-container w-hero-content">
        <span className="w-hero-eyebrow">{eyebrow}</span>
        <h1 className="w-display w-hero-title">{title}</h1>
        <p className="w-hero-sub">{subtitle}</p>
        <div className="w-hero-ctas">
          <button
            type="button"
            className="w-btn w-btn-primary"
            onClick={() => router.push("/shop")}
          >
            {ctaPrimary}
            <ArrowRight size={18} className="rtl-flip" />
          </button>
          <button
            type="button"
            className="w-btn w-btn-ghost-light"
            onClick={() => scrollTo("contact")}
          >
            {ctaSecondary}
          </button>
        </div>
      </div>
      <div className="w-hero-scroll" aria-hidden>
        {locale === "ar" ? "اسحب للأسفل" : "Scroll"}
      </div>
    </section>
  );
}
