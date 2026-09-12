"use client";

import { useLocale } from "@/components/locale-provider";

/**
 * Direction hook. Thin wrapper over `useLocale` for code that branches on
 * direction without needing locale or translation.
 *
 * Prefer Tailwind's `rtl:` / `ltr:` variants for styling. Use this hook only
 * for non-style logic (e.g. carousel direction prop, transform math).
 */
export function useDirection(): { dir: "ltr" | "rtl"; isRtl: boolean } {
    const { dir, isRtl } = useLocale();
    return { dir, isRtl };
}
