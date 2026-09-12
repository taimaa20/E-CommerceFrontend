import type { VoucherAvailability } from "@/lib/api";
import {
  DEFAULT_RESTAURANT_TIME_ZONE,
  getRestaurantToday,
} from "@/lib/date-time";

export const DEFAULT_VOUCHER_SETTINGS = {
  enabled: true,
  amount: 300,
  dailyLimit: 10,
} as const;

const CACHE_KEY = "pos:voucher-usage-cache";

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function businessDate(timeZone: string): string {
  return getRestaurantToday(timeZone);
}

export function calculateVoucherDiscount(total: number, availability: VoucherAvailability | null, enabled: boolean): number {
  const voucherAmount = availability?.enabled ? availability.voucherAmount : 0;
  if (!enabled || voucherAmount <= 0 || total <= 0) return 0;
  return roundMoney(Math.min(voucherAmount, total));
}

export function applyVoucherToTotal(total: number, discount: number): number {
  return roundMoney(Math.max(0, total - Math.max(0, discount)));
}

export function buildVoucherAvailability(
  enabled: boolean,
  voucherAmount: number,
  dailyLimit: number,
  usedToday = 0,
  timeZone = DEFAULT_RESTAURANT_TIME_ZONE
): VoucherAvailability {
  return buildFallbackAvailability(voucherAmount, dailyLimit, enabled, usedToday, timeZone);
}

export function getCachedVoucherAvailability(
  fallback?: VoucherAvailability,
  timeZone = DEFAULT_RESTAURANT_TIME_ZONE
): VoucherAvailability | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return fallback ?? null;
    const cached = JSON.parse(raw) as VoucherAvailability;
    if (cached.businessDate !== businessDate(timeZone)) return fallback ?? null;
    return cached;
  } catch {
    return fallback ?? null;
  }
}

export function saveVoucherAvailability(availability: VoucherAvailability): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(availability));
}

export function consumeVoucherLocally(
  timeZone = DEFAULT_RESTAURANT_TIME_ZONE
): VoucherAvailability | null {
  const current = getCachedVoucherAvailability(undefined, timeZone);
  if (!current) return null;

  const usedToday = Math.min(current.dailyLimit, (current.usedToday ?? 0) + 1);
  const next = buildFallbackAvailability(
    current.voucherAmount,
    current.dailyLimit,
    current.enabled,
    usedToday,
    timeZone
  );
  saveVoucherAvailability(next);
  return next;
}

function buildFallbackAvailability(
  voucherAmount: number,
  dailyLimit: number,
  enabled: boolean,
  usedToday: number,
  timeZone: string
): VoucherAvailability {
  return {
    enabled,
    voucherAmount,
    dailyLimit,
    usedToday,
    remainingToday: enabled ? Math.max(0, dailyLimit - usedToday) : 0,
    businessDate: businessDate(timeZone),
  };
}
