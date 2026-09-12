import type { Bilingual, Locale } from "../types";
import { mockRestaurant } from "../mock/restaurant";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function formatMoney(amount: number, locale: Locale): string {
  const safe = round2(Number.isFinite(amount) ? amount : 0);
  const symbol = mockRestaurant.currencySymbol[locale] ?? mockRestaurant.currency;
  const numStr = new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-JO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  // Symbol stays trailing in EN, leading in AR — both feel natural.
  return locale === "ar" ? `${numStr} ${symbol}` : `${numStr} ${symbol}`;
}

export function formatTime(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function bi(b: Bilingual, locale: Locale): string {
  return (b?.[locale] ?? b?.en ?? "") as string;
}

export function minutesUntil(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / 60_000));
}
