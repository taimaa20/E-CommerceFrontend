"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "../types";
import { DEFAULT_LOCALE, STORAGE_KEYS, SUPPORTED_LOCALES, isRtlLocale } from "../constants";

interface LocaleState {
  locale: Locale;
  /** Avoids hydration mismatch — first paint uses default, then we mark hydrated. */
  hydrated: boolean;
  setLocale: (l: Locale) => void;
  toggle: () => void;
  markHydrated: () => void;
}

export const useModuleLocale = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: DEFAULT_LOCALE,
      hydrated: false,
      setLocale: (l) => {
        if (!SUPPORTED_LOCALES.includes(l)) return;
        set({ locale: l });
      },
      toggle: () => set({ locale: get().locale === "en" ? "ar" : "en" }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: STORAGE_KEYS.locale,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ locale: s.locale }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

export const useDir = (): "ltr" | "rtl" => {
  const l = useModuleLocale((s) => s.locale);
  return isRtlLocale(l) ? "rtl" : "ltr";
};
