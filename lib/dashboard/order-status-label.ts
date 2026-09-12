import type { TranslationKey } from "@/lib/translations";

/**
 * Localizes an order status string (as emitted by the API: "New", "Preparing",
 * "Ready", "Served", "Paid", "Completed", "Cancelled") through the shared
 * translation system, so statuses are never shown raw/English in an Arabic UI.
 * Falls back to the raw value for any unknown status.
 */
export function orderStatusLabel(
    status: string,
    t: (key: TranslationKey) => string,
): string {
    switch (status) {
        case "New":        return t("statusNew");
        case "Preparing":  return t("statusPreparing");
        case "Ready":      return t("statusReady");
        case "Served":     return t("statusServed");
        case "Paid":       return t("statusPaid");
        case "Completed":  return t("statusCompleted");
        case "Cancelled":  return t("statusCancelled");
        default:           return status;
    }
}
