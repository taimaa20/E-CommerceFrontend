/**
 * Cancellation i18n — single source of truth for turning cancellation-related
 * enum/code values into localized labels. Used by every cancellation page, popup,
 * and notification so technical values (PendingCancellationApproval, WRONG_ORDER,
 * CancelWithWaste, …) are never shown to users.
 */

export type Locale = "en" | "ar";

interface Label { en: string; ar: string }

// Covers both Order.status strings AND CancelLog.ApprovalStatus strings, so one
// helper translates every cancellation status the API can return.
const STATUS_LABELS: Record<string, Label> = {
    // Order statuses
    PendingCancellationApproval: { en: "Pending Cancellation Approval", ar: "بانتظار موافقة الإلغاء" },
    CancellationRejected: { en: "Cancellation Rejected", ar: "تم رفض طلب الإلغاء" },
    Cancelled: { en: "Cancelled", ar: "ملغي" },
    Refunded: { en: "Refunded", ar: "تم الاسترداد" },
    New: { en: "New", ar: "جديد" },
    Preparing: { en: "Preparing", ar: "قيد التحضير" },
    Ready: { en: "Ready", ar: "جاهز" },
    Served: { en: "Served", ar: "تم التقديم" },
    Paid: { en: "Paid", ar: "مدفوع" },
    Completed: { en: "Completed", ar: "مكتمل" },
    // CancelLog approval statuses
    PendingManagerApproval: { en: "Pending Cancellation Approval", ar: "بانتظار موافقة الإلغاء" },
    PendingKitchenApproval: { en: "Pending Cancellation Approval", ar: "بانتظار موافقة الإلغاء" },
    ApprovedCancelled: { en: "Cancelled", ar: "ملغي" },
    Waste: { en: "Cancelled + Waste", ar: "ملغي + هدر" },
    RefundedWaste: { en: "Refunded + Waste", ar: "تم الاسترداد + هدر" },
    Rejected: { en: "Cancellation Rejected", ar: "تم رفض طلب الإلغاء" },
};

const MANAGER_DECISION_LABELS: Record<string, Label> = {
    CancelNotPrepared: { en: "Cancel Order", ar: "إلغاء الطلب" },
    CancelWithWaste: { en: "Cancel + Waste", ar: "إلغاء + هدر" },
    // Backend KitchenCancellationDecision enum names.
    ApprovedCancel: { en: "Cancel Order", ar: "إلغاء الطلب" },
    Waste: { en: "Cancel + Waste", ar: "إلغاء + هدر" },
    Refund: { en: "Refund", ar: "استرداد" },
    RefundWaste: { en: "Refund + Waste", ar: "استرداد + هدر" },
    RefundPaid: { en: "Refund", ar: "استرداد" },
    RefundWithWaste: { en: "Refund + Waste", ar: "استرداد + هدر" },
    Rejected: { en: "Rejected", ar: "مرفوض" },
};

// Fallback reason labels keyed by a normalized (alphanumeric-only, upper) code.
// The reasons lookup from /cancel-reasons is preferred; this only covers cases
// where the lookup is unavailable so a raw code is never shown.
const REASON_FALLBACK: Record<string, Label> = {
    WRONGORDER: { en: "Wrong Order", ar: "طلب خاطئ" },
    WRONGORDERENTERED: { en: "Wrong Order", ar: "طلب خاطئ" },
    CUSTOMERCHANGEDMIND: { en: "Customer Changed Mind", ar: "تراجع العميل" },
    CLIENTCHANGEDMIND: { en: "Customer Changed Mind", ar: "تراجع العميل" },
    DUPLICATEORDER: { en: "Duplicate Order", ar: "طلب مكرر" },
    OTHER: { en: "Other", ar: "أخرى" },
    CLIENTLEFT: { en: "Client Left", ar: "غادر العميل" },
    ALLERGYCONCERN: { en: "Allergy Concern", ar: "مشكلة حساسية" },
    ITEMUNAVAILABLE: { en: "Item Unavailable", ar: "المنتج غير متوفر" },
    REFUND: { en: "Refund", ar: "استرداد" },
};

const pick = (label: Label | undefined, locale: Locale) => (label ? label[locale] : undefined);

export function getCancellationStatusLabel(status: string | null | undefined, locale: Locale): string {
    if (!status) return "-";
    return pick(STATUS_LABELS[status], locale) ?? prettify(status);
}

export function getManagerDecisionLabel(decision: string | null | undefined, locale: Locale): string {
    if (!decision) return "-";
    return pick(MANAGER_DECISION_LABELS[decision], locale) ?? prettify(decision);
}

export interface ReasonLookupEntry { code: string; name: string; nameAr: string }

export function getCancellationReasonLabel(
    code: string | null | undefined,
    locale: Locale,
    reasons?: ReasonLookupEntry[],
): string {
    if (!code) return "-";
    const match = reasons?.find((r) => r.code === code);
    if (match) return locale === "ar" ? (match.nameAr || match.name) : (match.name || match.nameAr);
    const normalized = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return pick(REASON_FALLBACK[normalized], locale) ?? prettify(code);
}

export function getOrderTypeLabel(orderType: string | null | undefined, locale: Locale): string {
    switch (orderType) {
        case "Delivery": return locale === "ar" ? "توصيل" : "Delivery";
        case "Takeaway": return locale === "ar" ? "سفري" : "Takeaway";
        case "DineIn": return locale === "ar" ? "داخل المتجر" : "In-store";
        default: return orderType ? prettify(orderType) : "-";
    }
}

// Last-resort: turn SNAKE_CASE / camelCase / PascalCase into spaced Title Case so the
// UI never leaks a raw enum/code value, even for codes we have not mapped explicitly.
function prettify(value: string): string {
    return value
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}
