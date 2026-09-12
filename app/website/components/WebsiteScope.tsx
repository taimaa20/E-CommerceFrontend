"use client";

import React, { useEffect } from "react";
import { useWebsiteLocale, isRTL } from "@/app/website/hooks/useWebsiteLocale";

// Wraps the whole website in a scoped node that owns the design tokens
// (via .w-scope in website.css) and applies the correct dir attribute.
// By scoping to a div — not <html> — we avoid fighting the POS app's
// global direction when users navigate between the two.
export default function WebsiteScope({ children }: { children: React.ReactNode }) {
  const { locale } = useWebsiteLocale();
  const dir = isRTL(locale) ? "rtl" : "ltr";
  const lang = locale === "ar" ? "ar" : "en";

  // Mirror direction on <html> while the website is mounted, so scrollbars,
  // focus rings, and any portal/modal rendered outside the scope (e.g. the
  // lightbox) still respect the chosen direction. Restore on unmount.
  useEffect(() => {
    const html = document.documentElement;
    const prevDir = html.getAttribute("dir");
    const prevLang = html.getAttribute("lang");
    html.setAttribute("dir", dir);
    html.setAttribute("lang", lang);
    return () => {
      if (prevDir) html.setAttribute("dir", prevDir);
      else html.removeAttribute("dir");
      if (prevLang) html.setAttribute("lang", prevLang);
      else html.removeAttribute("lang");
    };
  }, [dir, lang]);

  return (
    <div className="w-scope" dir={dir} lang={lang}>
      {children}
    </div>
  );
}
