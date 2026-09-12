"use client";

import { useEffect, useRef, useState } from "react";

// Observes an element and toggles a boolean when it enters the viewport.
// Used to trigger fade-up animations on scroll.
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
  once = true
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          if (once) observer.unobserve(node);
        } else if (!once) {
          setRevealed(false);
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once]);

  return [ref, revealed];
}
