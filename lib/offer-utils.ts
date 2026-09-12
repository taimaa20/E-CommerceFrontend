import { formatCurrency } from "@/lib/currencies";
import {
  DEFAULT_RESTAURANT_TIME_ZONE,
  getRestaurantDateInputValue,
} from "@/lib/date-time";
import { OfferResponseDto } from "@/types/offer";
import { ProductDto } from "@/types/pos";

export interface OfferAllocatedLine {
  product: ProductDto;
  quantity: number;
}

export interface OfferPreviewItem {
  productId: string;
  quantity: number;
  price: number;
}

export function normalizeOfferDate(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function normalizeOfferTime(value?: string | null): string {
  return value ? value.slice(0, 5) : "";
}

export function toOfferApiTime(value: string): string {
  if (!value) return value;
  return value.length === 5 ? `${value}:00` : value;
}

export function buildOfferTimeLabel(offer: OfferResponseDto): string {
  return `${normalizeOfferTime(offer.startTime)} - ${normalizeOfferTime(offer.endTime)}`;
}

type OfferSchedule = Pick<
  OfferResponseDto,
  "isActive" | "startDate" | "endDate" | "startTime" | "endTime"
>;

function getDateKey(date: Date, timeZone: string): number {
  return Number(getRestaurantDateInputValue(date, timeZone).replaceAll("-", ""));
}

function getOfferDateKey(value?: string | null): number | null {
  const [year, month, day] = normalizeOfferDate(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return year * 10000 + month * 100 + day;
}

function getOfferTimeMinutes(value?: string | null): number | null {
  const [hours, minutes] = normalizeOfferTime(value).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function isOfferAvailableNow(
  offer: OfferSchedule,
  timeZone = DEFAULT_RESTAURANT_TIME_ZONE,
  now = new Date(),
): boolean {
  if (!offer.isActive) return false;

  const todayKey = getDateKey(now, timeZone);
  const startDateKey = getOfferDateKey(offer.startDate);
  const endDateKey = getOfferDateKey(offer.endDate);

  if (startDateKey !== null && todayKey < startDateKey) return false;
  if (endDateKey !== null && todayKey > endDateKey) return false;

  const startMinutes = getOfferTimeMinutes(offer.startTime);
  const endMinutes = getOfferTimeMinutes(offer.endTime);
  if (startMinutes === null || endMinutes === null) return true;

  const currentMinutes = getRestaurantMinutes(now, timeZone);
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function getRestaurantMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

export const MAJOR_OFFER_ALLERGENS = [
  { flag: 1, en: "Gluten", ar: "جلوتين" },
  { flag: 2, en: "Dairy", ar: "ألبان" },
  { flag: 4, en: "Nuts", ar: "مكسرات" },
];

export function getOfferMajorAllergens(offer: OfferResponseDto) {
  const flags = offer.products.reduce((sum, product) => sum | (product.allergens || 0), 0);
  return MAJOR_OFFER_ALLERGENS.filter((item) => (flags & item.flag) !== 0);
}

export function getEffectiveProductPrice(
  product: Pick<ProductDto, "basePrice" | "discountedPrice">,
): number {
  return product.discountedPrice ?? product.basePrice;
}

export function allocateOfferLines(
  offer: OfferResponseDto,
  products: ProductDto[],
): OfferAllocatedLine[] {
  const matchedLines = offer.products
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) return null;
      return { product, quantity: item.quantity };
    })
    .filter((item): item is { product: ProductDto; quantity: number } => !!item);

  const originalTotal = matchedLines.reduce(
    (sum, item) => sum + getEffectiveProductPrice(item.product) * item.quantity,
    0,
  );

  let runningTotal = 0;

  return matchedLines.map((item, index) => {
    const lineBaseTotal = getEffectiveProductPrice(item.product) * item.quantity;
    const lineTotal =
      index === matchedLines.length - 1
        ? offer.finalPrice - runningTotal
        : Number(((lineBaseTotal / Math.max(originalTotal, 1)) * offer.finalPrice).toFixed(2));

    runningTotal += lineTotal;

    return {
      product: {
        ...item.product,
        discountedPrice: item.quantity > 0 ? lineTotal / item.quantity : lineTotal,
      },
      quantity: item.quantity,
    };
  });
}

export function calculateOfferPreview(
  products: OfferPreviewItem[],
  discountType: number,
  discountValue: number,
) {
  const originalTotal = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalPrice =
    discountType === 0
      ? discountValue
      : originalTotal * (1 - discountValue / 100);
  const safeFinalPrice = Number(Math.max(finalPrice, 0).toFixed(2));
  const savings = Number(Math.max(originalTotal - safeFinalPrice, 0).toFixed(2));

  return {
    originalTotal: Number(originalTotal.toFixed(2)),
    finalPrice: safeFinalPrice,
    savings,
  };
}

export function formatOfferSummary(offer: OfferResponseDto, currency: string): string {
  return `${formatCurrency(offer.finalPrice, currency)} / ${buildOfferTimeLabel(offer)}`;
}
