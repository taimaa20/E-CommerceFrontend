/**
 * Localized labels for the ShiftCloseBlockerDto.code values emitted by
 * ShiftCloseValidator on the backend. Keep in sync with the AddIfAny() calls
 * in POS-Backend/Services/ShiftCloseValidator.cs — adding a code there
 * without adding a label here surfaces as a raw English token to the user.
 */

const EN: Record<string, string> = {
    PendingPayment:      "Pending Payment",
    NotReady:            "Not Ready",
    NotServed:           "Not Served",
    NotCompleted:        "Not Completed",
    Pending:             "Pending",
    Preparing:           "Preparing",
    Ready:               "Ready",
    PendingDelivery:     "Pending Delivery",
    PendingCancellation: "Pending Cancellation",
};

const AR: Record<string, string> = {
    PendingPayment:      "بانتظار الدفع",
    NotReady:            "غير جاهزة",
    NotServed:           "لم تُقدَّم",
    NotCompleted:        "غير منتهية",
    Pending:             "قيد الانتظار",
    Preparing:           "قيد التحضير",
    Ready:               "جاهزة",
    PendingDelivery:     "توصيل معلق",
    PendingCancellation: "إلغاء بانتظار الموافقة",
};

export function labelForBlocker(code: string, locale: string): string {
    const map = locale === "ar" ? AR : EN;
    return map[code] ?? code;
}
