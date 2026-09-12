"use client";

import { useMemo } from "react";
import type { Bilingual, Locale } from "../types";
import { DICTIONARIES, type DictKey } from "./dictionaries";
import { useModuleLocale } from "../store/localeStore";

export interface T {
  (key: DictKey): string;
  /** Pick the right side of a Bilingual string. */
  bi: (b: Bilingual) => string;
  locale: Locale;
  isRtl: boolean;
}

export function useT(): T {
  const locale = useModuleLocale((s) => s.locale);
  return useMemo<T>(() => {
    const dict = DICTIONARIES[locale];
    // Build the callable + its metadata in one allocation. Attaching
    // properties after the fact mutates a value the React Compiler treats
    // as frozen, so compose everything through a single Object.assign.
    return Object.assign((key: DictKey) => dict[key] ?? key, {
      bi: (b: Bilingual) => (b?.[locale] ?? b?.en ?? "") as string,
      locale,
      isRtl: locale === "ar",
    }) as T;
  }, [locale]);
}
