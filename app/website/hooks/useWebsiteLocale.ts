"use client";

// Self-contained locale state for the /website module so it does not
// depend on the POS LocaleProvider. Persists the user's choice to localStorage.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/app/website/types";

interface WebsiteLocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggle: () => void;
}

export const useWebsiteLocale = create<WebsiteLocaleState>()(
  persist(
    (set, get) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
      toggle: () => set({ locale: get().locale === "en" ? "ar" : "en" }),
    }),
    { name: "sandobox-website-locale" }
  )
);

export const isRTL = (locale: Locale): boolean => locale === "ar";

// Convenience picker that works with any {field, fieldAr} object shape.
export function pick<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  locale: Locale
): T[K] {
  if (locale === "ar") {
    const arKey = `${String(key)}Ar` as keyof T;
    if (arKey in obj && obj[arKey] != null && obj[arKey] !== "") {
      return obj[arKey] as T[K];
    }
  }
  return obj[key];
}
