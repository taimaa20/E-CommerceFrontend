"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Locale, getTranslations, TranslationKey } from "@/lib/translations";

type Dir = "ltr" | "rtl";
const RTL_LOCALES = ["ar", "he", "fa", "ur"] as const;
const isRtlLocale = (l: string): boolean => (RTL_LOCALES as readonly string[]).includes(l);

interface LocaleContextValue {
    locale: Locale;
    dir: Dir;
    isRtl: boolean;
    setLocale: (l: Locale, options?: { reload?: boolean }) => void;
    t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
    locale: "en",
    dir: "ltr",
    isRtl: false,
    setLocale: () => {},
    t: (key) => key,
});

/* Single source of truth for locale + direction.
   - Pre-hydration: an inline <script> in app/layout.tsx already sets html.dir/lang
     from localStorage, so first paint is FOUC-free.
   - Post-hydration: this provider re-applies on mount and on every setLocale call. */
function applyDirToDom(lang: Locale) {
    const rtl = isRtlLocale(lang);
    const dir: "rtl" | "ltr" = rtl ? "rtl" : "ltr";
    const html = document.documentElement;
    html.lang = lang;
    html.dir = dir;
    html.setAttribute("data-dir", dir);
    html.setAttribute("data-lang", lang);
    /* Mirror the dir attribute on <body> too. Some Radix portals and
       third-party widgets read dir from the closest ancestor with the
       attribute set; mirroring on body guarantees inheritance even when
       a portal lifts content out of the React tree. */
    if (document.body) {
        document.body.dir = dir;
        document.body.style.direction = dir;
    }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("en");

    useEffect(() => {
        const saved = (localStorage.getItem("app_language") ?? "en") as Locale;
        applyDirToDom(saved);
        setLocaleState(saved);
    }, []);

    const setLocale = (lang: Locale, options?: { reload?: boolean }) => {
        setLocaleState(lang);
        localStorage.setItem("app_language", lang);
        applyDirToDom(lang);
        if (options?.reload ?? true) {
            // Backend resolves entity names (tables, statuses, products) by Accept-Language.
            // Reload ensures all server-fetched copy uses the new language consistently.
            window.location.reload();
        }
    };

    const value = useMemo<LocaleContextValue>(() => {
        const isRtl = isRtlLocale(locale);
        return {
            locale,
            dir: isRtl ? "rtl" : "ltr",
            isRtl,
            setLocale,
            t: (key) => (getTranslations(locale) as Record<string, string>)[key] ?? key,
        };
    }, [locale]);

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
    return useContext(LocaleContext);
}
