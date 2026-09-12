"use client";

import { useEffect, useState } from "react";

// Reports whether the page is scrolled past `threshold` — used by the
// navbar to switch from transparent to solid state.
export function useScrollPosition(threshold = 40): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
