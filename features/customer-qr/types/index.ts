/**
 * Customer QR module — strict domain contracts.
 * Mirrors what a future backend response would look like, so the
 * service layer can swap mock → API with zero UI refactor.
 */

export type Locale = "en" | "ar";

/** Every display string is bilingual at the source. */
export interface Bilingual {
  en: string;
  ar: string;
}

/* ───────────────── Table ───────────────── */

export interface CustomerTable {
  id: string;            // T1, T2…
  code: string;          // Human-shown short code
  label: Bilingual;      // "Table 1" / "طاولة 1"
  area: Bilingual;       // "Main hall" / "الصالة الرئيسية"
  seats: number;
  active: boolean;
}

/* ───────────────── Menu ───────────────── */

export type MenuItemAvailability = "available" | "low" | "out";

export interface MenuExtraOption {
  id: string;
  label: Bilingual;
  priceDelta: number;        // positive = added cost
}

export interface MenuExtraGroup {
  id: string;
  label: Bilingual;
  required: boolean;
  multi: boolean;            // single-select vs multi-select
  min: number;
  max: number;
  options: MenuExtraOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: Bilingual;
  description: Bilingual;
  price: number;
  imageUrl: string;          // local /mock/... for now
  badges?: ("popular" | "new" | "spicy" | "vegan" | "gluten-free")[];
  /** Optional real rating (0–5). Rendered only when present — never faked. */
  rating?: number;
  ratingCount?: number;
  calories?: number;
  prepMinutes: number;
  availability: MenuItemAvailability;
  extras?: MenuExtraGroup[];
  offerId?: string;
}

export interface MenuCategory {
  id: string;
  name: Bilingual;
  icon?: string;             // emoji or local svg path
  sortOrder: number;
}

export interface MenuOffer {
  id: string;
  title: Bilingual;
  subtitle: Bilingual;
  imageUrl: string;
  discountPct: number;       // 0–100
  validUntilIso: string;
}

export interface MenuSnapshot {
  categories: MenuCategory[];
  items: MenuItem[];
  offers: MenuOffer[];
}

/* ───────────────── Cart ───────────────── */

export interface CartExtraSelection {
  groupId: string;
  optionIds: string[];
}

export interface CartItem {
  /** Stable client-side id for list keys + remove operations. */
  lineId: string;
  itemId: string;
  name: Bilingual;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
  notes?: string;
  extras: CartExtraSelection[];
  /** Cached unit price including selected extras. */
  unitPriceWithExtras: number;
}

/* ───────────────── Bill split ───────────────── */

export type BillSplitMode = "full" | "split";

/**
 * How the "split" amount is derived. Kept separate from `mode` so the
 * persisted `mode: "full" | "split"` shape never breaks existing carts.
 */
export type BillSplitMethod = "equal" | "amount" | "items";

export interface BillSplit {
  mode: BillSplitMode;
  /** Only meaningful when mode=split. */
  splitMethod: BillSplitMethod;
  /** When mode=split, this is the amount the diner has committed to pay. */
  splitAmount: number;
  /** Number of diners — used only to suggest a fair-share value. */
  splitParts: number;
  /** Line ids the diner has ticked when splitMethod=items. */
  selectedLineIds: string[];
}

/* ───────────────── Tip ───────────────── */

export type TipKind = "percent" | "amount" | "none";

export interface TipState {
  kind: TipKind;
  /** Percent value when kind=percent, currency value when kind=amount. */
  value: number;
}

export interface TipPreset {
  id: string;
  label: Bilingual;
  percent: number;        // 0 = none
  highlight?: boolean;
}

/* ───────────────── Payment ───────────────── */

export type PaymentMethodId =
  | "apple_pay"
  | "google_pay"
  | "visa"
  | "mastercard"
  | "card"
  | "debit"
  | "cash";

export interface PaymentMethod {
  id: PaymentMethodId;
  label: Bilingual;
  description: Bilingual;
  iconKey: PaymentMethodId;
  /** Render as the top "express" row vs the normal list. */
  express?: boolean;
  enabled: boolean;
}

export type PaymentStatus =
  | "idle"
  | "processing"
  | "succeeded"
  | "failed";

/** Settlement state of the whole order, independent of kitchen status. */
export type PaymentState = "unpaid" | "partial" | "paid";

export interface PaymentTransaction {
  id: string;
  orderId: string;
  method: PaymentMethodId;
  amount: number;
  tipAmount: number;
  taxAmount: number;
  serviceAmount: number;
  status: PaymentStatus;
  createdAtIso: string;
  /** Last 4 digits / mock card brand etc. */
  reference?: string;
  /** Lines settled by this transaction when splitting by items. */
  paidItemLineIds?: string[];
}

/* ───────────────── Order ───────────────── */

/**
 * Production-grade order lifecycle. Matches what a KDS (kitchen display
 * system) and POS would consume: `accepted` is the explicit kitchen
 * acknowledgement, `served` is the waiter handoff, `completed` is the
 * after-service close (tip reconciliation, etc.).
 */
export type OrderStatus =
  | "pending"      // submitted by the diner, awaiting kitchen pickup
  | "accepted"     // kitchen acknowledged
  | "preparing"    // on the line
  | "ready"        // plated, awaiting waiter
  | "served"       // delivered to the table
  | "completed"    // session closed
  | "cancelled"    // explicit cancel by staff
  | "draft";       // built by the diner, not yet sent to the kitchen

export type OrderChannel = "qr_self_order" | "pos_dine_in" | "takeaway" | "delivery";

export interface OrderTotals {
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  tipAmount: number;
  discountAmount: number;
  grandTotal: number;
  currency: string;
}

/**
 * The DTO the kitchen / POS would receive. Today it's persisted in
 * Zustand against the customer session; the same shape can be POSTed to
 * /orders later with zero refactor.
 */
export interface CustomerOrder {
  id: string;
  shortCode: string;          // 4-char human code (e.g. "A3K9") shown on the receipt + KDS
  tableId: string;
  channel: OrderChannel;
  items: CartItem[];
  totals: OrderTotals;
  status: OrderStatus;
  /** Status transition history — gives the kitchen a clean audit trail. */
  statusHistory: { status: OrderStatus; atIso: string }[];
  createdAtIso: string;
  estimatedReadyIso: string;
  customerName?: string;
  notes?: string;
  /** Settlement — accumulates across split / partial payments. */
  paymentState: PaymentState;
  amountPaid: number;
  /** Lines already settled (so split-by-items can't double-charge). */
  paidItemLineIds: string[];
}

/* ───────────────── Tracking ───────────────── */

export interface OrderTrackingStep {
  status: OrderStatus;
  label: Bilingual;
  reachedAtIso?: string;
  active: boolean;
  complete: boolean;
}

export interface OrderTrackingSnapshot {
  orderId: string;
  currentStatus: OrderStatus;
  steps: OrderTrackingStep[];
  etaIso: string;
}

/* ───────────────── Feedback ───────────────── */

export interface FeedbackSubmission {
  orderId: string;
  rating: number;           // 1..5
  satisfaction: "bad" | "ok" | "great";
  comment?: string;
  createdAtIso: string;
}

/* ───────────────── Session ───────────────── */

export interface CustomerSession {
  tableId: string;
  startedAtIso: string;
  /** Optional anonymous handle the diner can supply. */
  guestName?: string;
}

/* ───────────────── Restaurant config ───────────────── */

/**
 * `pay_later` — dine-in: place the order to the kitchen, settle the bill any
 * time after (default). `pay_first` — pre-pay: the order is only sent to the
 * kitchen once payment succeeds.
 */
export type OrderMode = "pay_later" | "pay_first";

export interface RestaurantInfo {
  name: Bilingual;
  tagline: Bilingual;
  logoUrl: string;
  heroImageUrl: string;
  currency: string;          // "JOD", "AED", "USD"
  currencySymbol: Bilingual;
  taxPct: number;
  servicePct: number;
  orderMode: OrderMode;
  /**
   * Optional display-only signals for the welcome hero. All consumers must
   * render their chip only when the value is present, so an unconfigured
   * tenant simply shows fewer chips. Not persisted, not sent to any backend.
   */
  rating?: number;            // e.g. 4.8
  ratingCount?: string;       // pre-formatted, e.g. "1.2k"
  avgPrepMinutes?: number;    // e.g. 12
  openNow?: boolean;
  social: {
    instagram?: string;
    tiktok?: string;
    website?: string;
  };
}
