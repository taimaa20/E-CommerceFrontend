"use client";

import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
    announceCancellation,
    cancellationFailureMessage,
    isSettledFailure,
    MIN_CANCEL_REASON_LENGTH,
    useCancellationRequestKey,
} from "@/components/showcase/account/OrderLineCancellation";
import { denialCopy } from "@/components/showcase/account/OrderCancellationPanel";
import type { OrderCancellationCapabilities } from "@/lib/api-customer-account";
import { onlineShoppingApi } from "@/lib/api-online-shopping";

/**
 * Whole-order cancellation for a guest, drawn from the capabilities the backend attached to the
 * order. The rules are the customer cancellation policy, evaluated server-side on every request;
 * this only decides what to offer and how to explain a refusal.
 */
export default function GuestOrderCancellationPanel({
    orderId,
    accessToken,
    capabilities,
    isAr,
    onCancelled,
}: {
    orderId: string;
    accessToken: string;
    capabilities: OrderCancellationCapabilities;
    isAr: boolean;
    onCancelled: () => void;
}) {
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const [confirming, setConfirming] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const requestKey = useCancellationRequestKey();

    if (!capabilities.canCustomerCancel) {
        if (capabilities.hasPendingRequest) {
            return (
                <p className="sf-meta mt-4 border-t pt-4 text-amber-700 dark:text-amber-300">
                    {t("Your cancellation request has been submitted for review.", "تم إرسال طلب الإلغاء للمراجعة.")}
                </p>
            );
        }
        return capabilities.denialReason
            ? <p className="sf-meta mt-4 border-t pt-4">{denialCopy(capabilities, isAr)}</p>
            : null;
    }

    const submit = async () => {
        if (reason.trim().length < MIN_CANCEL_REASON_LENGTH) {
            toast.error(t("Please tell us why in a few words.", "يرجى ذكر السبب بكلمات قليلة."));
            return;
        }

        setBusy(true);
        try {
            const trimmed = reason.trim();
            const result = await onlineShoppingApi.cancelGuestOrder(orderId, accessToken, trimmed, requestKey.keyFor(trimmed));
            requestKey.settle();
            announceCancellation(result, isAr);
            setConfirming(false);
            setReason("");
            // Re-fetch: the backend decided the new status and what is still allowed.
            onCancelled();
        } catch (error: unknown) {
            toast.error(cancellationFailureMessage(error, isAr));
            if (isSettledFailure(error)) {
                requestKey.settle();
                setConfirming(false);
                onCancelled();
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-4 border-t pt-4">
            {capabilities.cancellationDeadline && (
                <p className="sf-meta">
                    {t("You can cancel until", "يمكنك الإلغاء حتى")}{" "}
                    {new Date(capabilities.cancellationDeadline).toLocaleString(isAr ? "ar" : "en")}
                </p>
            )}
            {capabilities.requiresStaffApproval && (
                <p className="sf-meta mt-1">
                    {t(
                        "This order is already paid, so a team member reviews the cancellation and handles the refund.",
                        "هذا الطلب مدفوع بالفعل، لذا يقوم أحد أعضاء الفريق بمراجعة الإلغاء ومعالجة الاسترداد.",
                    )}
                </p>
            )}

            {!confirming ? (
                <button type="button" onClick={() => setConfirming(true)} className="sf-btn sf-btn--outline sf-btn--sm mt-3">
                    <XCircle className="size-4" />
                    {t("Cancel order", "إلغاء الطلب")}
                </button>
            ) : (
                <div className="sf-card mt-3 space-y-3 p-4">
                    <p className="font-medium">{t("Cancel this order?", "إلغاء هذا الطلب؟")}</p>
                    <label className="block">
                        <span className="sf-meta">{t("Reason", "السبب")}</span>
                        <input
                            value={reason}
                            onChange={event => setReason(event.target.value)}
                            maxLength={500}
                            className="sf-field mt-1"
                            placeholder={t("Changed my mind", "غيرت رأيي")}
                        />
                    </label>
                    <div className="flex gap-2">
                        <button type="button" onClick={submit} disabled={busy} className="sf-btn sf-btn--primary sf-btn--sm">
                            {busy && <Loader2 className="size-4 animate-spin" />}
                            {t("Confirm", "تأكيد")}
                        </button>
                        <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="sf-btn sf-btn--outline sf-btn--sm">
                            {t("Keep order", "الاحتفاظ بالطلب")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
