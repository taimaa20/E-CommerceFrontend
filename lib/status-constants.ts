/**
 * STATUS CONSTANTS - Language-Independent
 * ========================================
 * 
 * These are the ONLY values that should be used in logic/comparisons.
 * Translation should ONLY affect display, never logic.
 * 
 * API returns these values: "Ready", "Preparing", "Paid", "Served", "Cancelled", "Completed", etc.
 * These values are STABLE and DO NOT change based on language.
 */

// Item Status Constants
export const ITEM_STATUS = {
  READY: "Ready",      // Item is ready for service
  PREPARING: "Preparing", // Item is being prepared
  CANCELLED: "Cancelled", // Item was cancelled
} as const;

// Order Status Constants (normalized to display layer)
export const ORDER_STATUS = {
  NEW: "New",          // Newly accepted order
  READY: "Ready",      // All items ready
  PREPARING: "Preparing", // Some items still preparing
  PAID: "Paid",        // Order paid (shown to kitchen as "Preparing")
  SERVED: "Served",    // Order served
  CANCELLED: "Cancelled", // Order cancelled
  COMPLETED: "Completed", // Order completed
  REFUNDED: "Refunded",   // Order refunded
  PENDING_CANCELLATION_APPROVAL: "PendingCancellationApproval",
  CANCELLATION_REJECTED: "CancellationRejected",
} as const;

export const PRODUCT_STATUS = {
  ACTIVE: "Active",
} as const;

// Status type definitions
export type ItemStatus = typeof ITEM_STATUS[keyof typeof ITEM_STATUS];
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];

/**
 * Translation Mapping - For Display Only
 * ======================================
 * 
 * Usage: getStatusLabel(item.status, locale)
 */
export const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  "Ready": {
    en: "Ready",
    ar: "جاهز",
  },
  "Preparing": {
    en: "Preparing",
    ar: "قيد التحضير",
  },
  "Paid": {
    en: "Paid",
    ar: "مدفوع",
  },
  "Served": {
    en: "Served",
    ar: "تم التقديم",
  },
  "Cancelled": {
    en: "Cancelled",
    ar: "ملغي",
  },
  "Completed": {
    en: "Completed",
    ar: "مكتمل",
  },
  "Refunded": {
    en: "Refunded",
    ar: "مسترد",
  },
  "PendingCancellationApproval": {
    en: "Pending Cancellation Approval",
    ar: "بانتظار موافقة الإلغاء",
  },
  "CancellationRejected": {
    en: "Cancellation Rejected",
    ar: "تم رفض الإلغاء",
  },
  "Prepared": {
    en: "Prepared",
    ar: "قيد التحضير",
  },
} as const;

/**
 * Get localized status label
 * @param status - The status constant value
 * @param locale - "en" or "ar"
 * @returns Translated label or original status if not found
 */
export function getStatusLabel(status: string, locale: "en" | "ar" = "en"): string {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS]?.[locale] || status;
}

/**
 * Check if item/order is ready
 * @param status - The status value from API
 * @returns true if status is "Ready"
 * 
 * ✅ CORRECT USAGE:
 * if (isStatusReady(item.itemStatus)) { ... }
 */
export function isStatusReady(status?: string): boolean {
  return status === ITEM_STATUS.READY;
}

/**
 * Check if item/order is preparing
 * @param status - The status value from API
 * @returns true if status is not "Ready"
 */
export function isStatusPreparing(status?: string): boolean {
  return !isStatusReady(status);
}

/**
 * Normalize order status for display
 * Map "Paid" → "Preparing" (since paid orders are still in kitchen)
 * @param status - The status value from API
 * @returns Normalized status
 */
export function normalizeOrderStatus(status?: string): string {
  if (status === ORDER_STATUS.READY) return ORDER_STATUS.READY;
  if (status === ORDER_STATUS.SERVED) return ORDER_STATUS.SERVED;
  if (status === ORDER_STATUS.CANCELLED) return ORDER_STATUS.CANCELLED;
  if (status === ORDER_STATUS.REFUNDED) return ORDER_STATUS.REFUNDED;
  if (status === ORDER_STATUS.PENDING_CANCELLATION_APPROVAL) return ORDER_STATUS.PENDING_CANCELLATION_APPROVAL;
  if (status === ORDER_STATUS.CANCELLATION_REJECTED) return ORDER_STATUS.CANCELLATION_REJECTED;
  if (status === ORDER_STATUS.PAID) return ORDER_STATUS.PREPARING; // Paid orders show as "Preparing" in kitchen
  return ORDER_STATUS.PREPARING; // Default
}

/**
 * Get CSS class for status badge
 * @param status - The normalized status
 * @returns CSS class name
 */
export function getStatusClass(status: string): string {
  switch (status) {
    case ORDER_STATUS.READY:
      return "status-ready";
    case ORDER_STATUS.SERVED:
      return "status-served";
    case ORDER_STATUS.PAID:
      return "status-paid";
    case ORDER_STATUS.CANCELLED:
    case ORDER_STATUS.REFUNDED:
      return "status-cancelled";
    case ORDER_STATUS.PENDING_CANCELLATION_APPROVAL:
      return "status-pending";
    case ORDER_STATUS.CANCELLATION_REJECTED:
      return "status-cancelled";
    default:
      return "status-preparing";
  }
}
