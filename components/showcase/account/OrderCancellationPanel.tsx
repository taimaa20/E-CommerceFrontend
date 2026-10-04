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
import {
    customerAccountApi,
    type CustomerOrderDetails,
    type OrderCancellationCapabilities,
} from "@/lib/api-customer-account";

/**
 * Whole-order cancellation for one order, drawn entirely from the capabilities the backend attached
 * to the order. Nothing here decides whether cancellation is allowed — the rules live in the
 * cancellation policy, and every request below is re-checked server-side, so this only chooses
 * what to offer and how to explain a refusal. Cancelling single lines is offered on the lines
 * themselves (OrderLineCancelControl).
 */
export default function OrderCancellationPanel({
    order,
    isAr,
    onCancelled,
}: {
    order: CustomerOrderDetails;
    isAr: boolean;
    onCancelled: () => void;
}) {
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const capabilities = order.cancellation;
    const [confirming, setConfirming] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const requestKey = useCancellationRequestKey();

    if (!capabilities) return null;

    const canDoAnything = capabilities.allowedCancellationActions.length > 0;

    if (!canDoAnything) {
        return capabilities.denialReason
            ? <p className="sf-meta mt-4 border-t pt-4">{denialCopy(capabilities, isAr)}</p>
            : null;
    }

    const close = () => {
        setConfirming(false);
        setReason("");
    };

    const submit = async () => {
        if (reason.trim().length < MIN_CANCEL_REASON_LENGTH) {
            toast.error(t("Please tell us why in a few words.", "يرجى ذكر السبب بكلمات قليلة."));
            return;
        }

        setBusy(true);
        try {
            const trimmed = reason.trim();
            const result = await customerAccountApi.cancelOrder(order.orderId, trimmed, requestKey.keyFor(trimmed));
            requestKey.settle();
            announceCancellation(result, isAr);
            close();
            // Re-fetch rather than patching local state: the backend re-priced the order and
            // re-evaluated what is still allowed, and both have to come from it.
            onCancelled();
        } catch (error: unknown) {
            toast.error(cancellationFailureMessage(error, isAr));
            if (isSettledFailure(error)) {
                requestKey.settle();
                close();
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
            {capabilities.hasPendingRequest && (
                <p className="sf-meta mt-1 text-amber-700 dark:text-amber-300">
                    {t(
                        "Your cancellation request has been submitted for review.",
                        "تم إرسال طلب الإلغاء للمراجعة.",
                    )}
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

            {capabilities.canCustomerCancel && !confirming && (
                <button type="button" onClick={() => setConfirming(true)} className="sf-btn sf-btn--outline sf-btn--sm mt-3">
                    <XCircle className="size-4" />
                    {t("Cancel order", "إلغاء الطلب")}
                </button>
            )}

            {confirming && (
                <div className="sf-card mt-3 space-y-3 p-4">
                    <p className="font-medium">{t("Cancel this order?", "إلغاء هذا الطلب؟")}</p>

                    <label className="block">
                        <span className="sf-meta">{t("Reason", "السبب")}</span>
                        <input
                            value={reason}
                            onChange={e => setReason(e.target.value)}
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
                        <button type="button" onClick={close} disabled={busy} className="sf-btn sf-btn--outline sf-btn--sm">
                            {t("Keep order", "الاحتفاظ بالطلب")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** The backend sends a code, not a sentence, so the copy stays translatable on this side. */
export function denialCopy(capabilities: OrderCancellationCapabilities, isAr: boolean): string {
    const t = (en: string, ar: string) => (isAr ? ar : en);

    switch (capabilities.denialReason) {
        case "WindowElapsed":
            return t("The cancellation window for this order has closed.", "انتهت مدة إلغاء هذا الطلب.");
        case "StatusNotAllowed":
            return t("This order is too far along to cancel online.", "تقدم هذا الطلب كثيراً بحيث لا يمكن إلغاؤه عبر الإنترنت.");
        case "PaymentRecorded":
            return t("This order is paid — contact us and we'll help.", "هذا الطلب مدفوع — تواصل معنا وسنساعدك.");
        case "AlreadyCancelled":
            return t("This order is already cancelled.", "هذا الطلب ملغى بالفعل.");
        case "RequestPending":
            return t("Your cancellation request is being reviewed.", "طلب الإلغاء الخاص بك قيد المراجعة.");
        case "CustomerCancellationDisabled":
        case "ActionDisabled":
            return t("Online cancellation isn't available — contact us and we'll help.", "الإلغاء عبر الإنترنت غير متاح — تواصل معنا وسنساعدك.");
        default:
            return t("This order can't be cancelled online.", "لا يمكن إلغاء هذا الطلب عبر الإنترنت.");
    }
}
