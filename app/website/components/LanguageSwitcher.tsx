"use client";

import React from "react";
import { useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";

// EN | AR pill toggle. Inherits currentColor so it adapts to the
// navbar tone (transparent over hero vs. solid on scroll).
export default function LanguageSwitcher() {
  const { locale, setLocale } = useWebsiteLocale();
  return (
    <div className="w-lang" role="group" aria-label="Language">
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        <span>EN</span>
      </button>
      <button
        type="button"
        className={locale === "ar" ? "active" : ""}
        onClick={() => setLocale("ar")}
        aria-pressed={locale === "ar"}
      >
        <span>AR</span>
      </button>
    </div>
  );
}
