import type {
  PaymentMethod,
  TipPreset,
  Locale,
} from "../types";

export const MODULE_BASE_PATH = "/customer-qr";

/** Where the customer lands after scanning a table QR. */
export const tableUrl = (tableId: string, sub?: string): string =>
  `${MODULE_BASE_PATH}/table/${encodeURIComponent(tableId)}${
    sub ? `/${sub}` : ""
  }`;

/** Absolute URL used inside the QR code image itself. Lands on the table
 *  welcome screen (not straight to the menu). */
export const tableQrPayload = (origin: string, tableId: string): string =>
  `${origin}${tableUrl(tableId)}`;

/* ───────── Locale ───────── */

export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "ar"] as const;
export const DEFAULT_LOCALE: Locale = "en";
export const RTL_LOCALES: readonly Locale[] = ["ar"] as const;
export const isRtlLocale = (l: Locale): boolean =>
  (RTL_LOCALES as readonly string[]).includes(l);

/* ───────── Tip ───────── */

export const TIP_PRESETS: TipPreset[] = [
  { id: "none", label: { en: "No tip", ar: "بدون" }, percent: 0 },
  { id: "p5", label: { en: "5%", ar: "٥٪" }, percent: 5 },
  { id: "p10", label: { en: "10%", ar: "١٠٪" }, percent: 10, highlight: true },
  { id: "p15", label: { en: "15%", ar: "١٥٪" }, percent: 15 },
];

export const TIP_DEFAULT_PERCENT = 10;
export const TIP_MAX_CUSTOM_AMOUNT = 9999;

/* ───────── Payment methods (mock) ───────── */

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "apple_pay",
    iconKey: "apple_pay",
    label: { en: "Apple Pay", ar: "Apple Pay" },
    description: {
      en: "One-tap secure checkout",
      ar: "دفع آمن بنقرة واحدة",
    },
    express: true,
    enabled: true,
  },
  {
    id: "google_pay",
    iconKey: "google_pay",
    label: { en: "Google Pay", ar: "Google Pay" },
    description: {
      en: "Pay instantly with Google",
      ar: "ادفع فوراً عبر Google",
    },
    express: true,
    enabled: true,
  },
  {
    id: "visa",
    iconKey: "visa",
    label: { en: "Visa", ar: "فيزا" },
    description: {
      en: "Credit / debit Visa card",
      ar: "بطاقة فيزا ائتمانية أو خصم",
    },
    enabled: true,
  },
  {
    id: "mastercard",
    iconKey: "mastercard",
    label: { en: "Mastercard", ar: "ماستركارد" },
    description: {
      en: "Credit / debit Mastercard",
      ar: "بطاقة ماستركارد",
    },
    enabled: true,
  },
  {
    id: "card",
    iconKey: "card",
    label: { en: "Other card", ar: "بطاقة أخرى" },
    description: {
      en: "Any other credit card",
      ar: "أي بطاقة ائتمان أخرى",
    },
    enabled: true,
  },
  {
    id: "debit",
    iconKey: "debit",
    label: { en: "Bank debit", ar: "خصم بنكي" },
    description: {
      en: "Direct from your bank",
      ar: "خصم مباشر من البنك",
    },
    enabled: true,
  },
  {
    id: "cash",
    iconKey: "cash",
    label: { en: "Cash to staff", ar: "نقدي للموظف" },
    description: {
      en: "Pay the waiter directly",
      ar: "ادفع للنادل مباشرة",
    },
    enabled: true,
  },
];

/* ───────── Tracking ───────── */

export const ORDER_FLOW_STEPS = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
] as const;

export const ORDER_STEP_LABELS: Record<
  (typeof ORDER_FLOW_STEPS)[number],
  { en: string; ar: string }
> = {
  pending: { en: "Order received", ar: "تم استلام الطلب" },
  accepted: { en: "Accepted by kitchen", ar: "قبول من المطبخ" },
  preparing: { en: "Preparing", ar: "قيد التحضير" },
  ready: { en: "Ready", ar: "جاهز" },
  served: { en: "Served", ar: "تم التقديم" },
  completed: { en: "Completed", ar: "مكتمل" },
};

/**
 * Per-status timings used by the in-app order simulator while there is no
 * real kitchen yet. Once a KDS is wired in, this constant goes away and
 * status updates arrive over the live channel — no UI changes required.
 */
export const ORDER_SIMULATION_TIMINGS_MS: Record<
  (typeof ORDER_FLOW_STEPS)[number],
  number
> = {
  pending: 1500,
  accepted: 3000,
  preparing: 9000,
  ready: 6000,
  served: 5000,
  completed: 0,
};

/* ───────── Storage keys (module-scoped, won't clash with POS) ───────── */

export const STORAGE_KEYS = {
  locale: "cqr:locale",
  cart: (tableId: string) => `cqr:cart:${tableId}`,
  session: (tableId: string) => `cqr:session:${tableId}`,
  order: (tableId: string) => `cqr:order:${tableId}`,
} as const;
