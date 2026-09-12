import { ProductDto } from "@/types/pos";

export type AvailabilityLocale = "ar" | "en";

function toIntlLocale(locale: AvailabilityLocale) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function normalizeDate(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function normalizeProductTime(value?: string | null): string {
  return value ? value.slice(0, 5) : "";
}

function formatProductTime(value: string, locale: AvailabilityLocale): string {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const date = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatProductDate(value: string, locale: AvailabilityLocale): string {
  const [year, month, day] = value.split("-").map(Number);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return value;
  }

  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function buildProductAvailabilityTimeLabel(
  product: ProductDto,
  locale: AvailabilityLocale,
): string | null {
  const startTime = normalizeProductTime(product.availableFrom);
  const endTime = normalizeProductTime(product.availableTo);

  if (startTime && endTime) {
    const formattedStart = formatProductTime(startTime, locale);
    const formattedEnd = formatProductTime(endTime, locale);
    return locale === "ar"
      ? `يوميًا ${formattedStart} - ${formattedEnd}`
      : `Daily ${formattedStart} - ${formattedEnd}`;
  }

  if (startTime) {
    const formattedStart = formatProductTime(startTime, locale);
    return locale === "ar" ? `يبدأ من ${formattedStart}` : `From ${formattedStart}`;
  }

  if (endTime) {
    const formattedEnd = formatProductTime(endTime, locale);
    return locale === "ar" ? `حتى ${formattedEnd}` : `Until ${formattedEnd}`;
  }

  return null;
}

export function buildProductAvailabilityDateLabel(
  product: ProductDto,
  locale: AvailabilityLocale,
): string | null {
  const startDate = normalizeDate(product.availableStartDate);
  const endDate = normalizeDate(product.availableEndDate);

  if (startDate && endDate) {
    const formattedStart = formatProductDate(startDate, locale);
    const formattedEnd = formatProductDate(endDate, locale);
    return `${formattedStart} - ${formattedEnd}`;
  }

  if (startDate) {
    const formattedStart = formatProductDate(startDate, locale);
    return locale === "ar" ? `ابتداءً من ${formattedStart}` : `From ${formattedStart}`;
  }

  if (endDate) {
    const formattedEnd = formatProductDate(endDate, locale);
    return locale === "ar" ? `حتى ${formattedEnd}` : `Until ${formattedEnd}`;
  }

  return null;
}
