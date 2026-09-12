"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";
import { getRequestErrorMessage } from "@/lib/api";
import {
    approvePaymentAdjustment,
    getPendingPaymentAdjustment,
    rejectPaymentAdjustment,
    type PaymentAdjustmentReview,
    type PaymentAdjustmentReviewPayment,
} from "@/lib/api-payment-adjustments";
import { formatCurrency } from "@/lib/currencies";

interface Props {
    orderId: string;
    adjustmentId: string;
    currency: string;
    onResolved: () => void;
}

export default function PaymentAdjustmentApproval({
    orderId,
    adjustmentId,
    currency,
    onResolved,
}: Props) {
    const { locale } = useLocale();
    const isArabic = locale === "ar";
    const [review, setReview] = useState<PaymentAdjustmentReview | null>(null);
    const [managerNotes, setManagerNotes] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        getPendingPaymentAdjustment(orderId, adjustmentId)
            .then((data) => {
                if (active) setReview(data);
            })
            .catch((requestError) => {
                if (active) setError(getRequestErrorMessage(
                    requestError,
                    isArabic ? "تعذر تحميل طلب تعديل الدفع" : "Failed to load payment change request",
                ));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [adjustmentId, isArabic, orderId]);

    const decide = async (approve: boolean) => {
        setBusy(true);
        setError("");
        try {
            if (approve) {
                const result = await approvePaymentAdjustment(orderId, adjustmentId, managerNotes);
                toast.success(result.approvedBy
                    ? (isArabic
                        ? `تم اعتماد تعديل الدفع بواسطة ${result.approvedBy}`
                        : `Payment change approved by ${result.approvedBy}`)
                    : (isArabic ? "تم اعتماد تعديل الدفع" : "Payment change approved"));
            } else {
                await rejectPaymentAdjustment(orderId, adjustmentId, managerNotes);
                toast.success(isArabic ? "تم رفض تعديل الدفع" : "Payment change rejected");
            }
            onResolved();
        } catch (requestError) {
            setError(getRequestErrorMessage(
                requestError,
                isArabic ? "تعذر حفظ قرار المدير" : "Failed to save manager decision",
            ));
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isArabic ? "جاري تحميل طلب تعديل الدفع..." : "Loading payment change request..."}
            </div>
        );
    }

    if (!review) {
        return error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null;
    }

    return (
        <div className="space-y-4 rounded-md border border-amber-300 bg-amber-50 p-4">
            <div>
                <div className="font-semibold text-amber-950">
                    {isArabic ? "طلب تعديل دفع بانتظار الموافقة" : "Payment Change Awaiting Approval"}
                </div>
                <div className="mt-1 text-xs text-amber-800">
                    {isArabic ? "طلب بواسطة" : "Requested by"}: {review.requestedBy}
                    {" · "}
                    {new Date(review.requestedAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}
                </div>
                <div className="mt-1 text-sm text-amber-900">
                    {isArabic ? "السبب" : "Reason"}: {review.reason}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <PaymentList
                    title={isArabic ? "الدفع الحالي" : "Current Payments"}
                    payments={review.currentPayments}
                    currency={currency}
                    locale={locale}
                />
                <PaymentList
                    title={isArabic ? "الدفع المقترح" : "Proposed Payments"}
                    payments={review.proposedPayments}
                    currency={currency}
                    locale={locale}
                />
            </div>

            <div className="space-y-2">
                <Label>{isArabic ? "ملاحظة المدير (اختياري)" : "Manager Note (optional)"}</Label>
                <Textarea
                    value={managerNotes}
                    onChange={(event) => setManagerNotes(event.target.value)}
                    maxLength={500}
                    rows={2}
                    disabled={busy}
                />
            </div>

            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => decide(true)} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {isArabic ? "اعتماد التعديل" : "Approve Change"}
                </Button>
                <Button variant="outline" onClick={() => decide(false)} disabled={busy}>
                    <X className="h-4 w-4" />
                    {isArabic ? "رفض الطلب" : "Reject Request"}
                </Button>
            </div>
        </div>
    );
}

function PaymentList({
    title,
    payments,
    currency,
    locale,
}: {
    title: string;
    payments: PaymentAdjustmentReviewPayment[];
    currency: string;
    locale: string;
}) {
    return (
        <div className="rounded-md border border-amber-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-amber-800">{title}</div>
            <div className="space-y-2">
                {payments.map((payment, index) => (
                    <div key={`${payment.paymentMethodId ?? payment.paymentMethodCode}-${index}`} className="text-sm">
                        <div className="flex justify-between gap-2">
                            <span>{locale === "ar"
                                ? payment.paymentMethodNameAr || payment.paymentMethodName
                                : payment.paymentMethodName}</span>
                            <span className="font-semibold">{formatCurrency(payment.amount, currency)}</span>
                        </div>
                        {payment.referenceNumber && (
                            <div className="font-mono text-xs text-muted-foreground">{payment.referenceNumber}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
