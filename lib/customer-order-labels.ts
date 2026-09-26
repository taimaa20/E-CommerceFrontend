/** Shopper-facing wording for the internal OrderStatus / order type names the account API returns. */
const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
    New: { en: "Received", ar: "تم الاستلام" },
    Preparing: { en: "Preparing", ar: "قيد التحضير" },
    Ready: { en: "Ready", ar: "جاهز" },
    Served: { en: "Handed over", ar: "تم التسليم" },
    Paid: { en: "Paid", ar: "مدفوع" },
    Completed: { en: "Completed", ar: "مكتمل" },
    Cancelled: { en: "Cancelled", ar: "ملغي" },
    PendingPayment: { en: "Awaiting payment", ar: "بانتظار الدفع" },
    PaymentCancelled: { en: "Payment cancelled", ar: "تم إلغاء الدفع" },
};

export function customerOrderStatusLabel(status: string, isAr: boolean): string {
    const label = STATUS_LABELS[status];
    return label ? (isAr ? label.ar : label.en) : status;
}

export function customerOrderTypeLabel(orderType: string, isAr: boolean): string {
    if (orderType === "Delivery") return isAr ? "توصيل" : "Delivery";
    return isAr ? "استلام" : "Pickup";
}

export function formatCustomerOrderDate(value: string, isAr: boolean): string {
    return new Date(value).toLocaleString(isAr ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" });
}
