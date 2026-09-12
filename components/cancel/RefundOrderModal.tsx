"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { cancelOrder, refundOrder } from "@/lib/api";
import { Loader2, X, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currencies";
import { formatOrderSequence } from "@/lib/order-sequence";
import { generateActionId } from "@/lib/offline/id";

interface RefundOrderModalProps {
    order: {
        id: string;
        orderNumber: string;
        orderSequenceNumber?: string | null;
        tableName?: string;
        totalAmount: number;
        paymentMethod?: string;
        isPaid?: boolean;
    };
    onClose: () => void;
    onSuccess: (result: RefundOrderModalResult) => void | Promise<void>;
    currency?: string;
    intent?: "refund" | "cancel";
}

export interface RefundOrderModalResult {
    pendingApproval: boolean;
    orderCancelled: boolean;
    refunded: boolean;
}

const REFUND_REASONS = [
    { code: "QUALITY_ISSUE",         labelKey: "refundOrderReasonQualityIssue" },
    { code: "WRONG_ORDER",           labelKey: "refundOrderReasonWrongOrder" },
    { code: "CUSTOMER_DISSATISFIED", labelKey: "refundOrderReasonCustomerDissatisfied" },
    { code: "DUPLICATE_PAYMENT",     labelKey: "refundOrderReasonDuplicatePayment" },
    { code: "OTHER",                 labelKey: "refundOrderReasonOther" },
] as const;

export default function RefundOrderModal({
    order,
    onClose,
    onSuccess,
    currency = "JOD",
    intent = "refund",
}: RefundOrderModalProps) {
    const { t, locale } = useLocale();
    const isRtl = locale === "ar";
    const isCancelIntent = intent === "cancel";

    const [selectedReason, setSelectedReason] = useState("");
    const [note, setNote]                     = useState("");
    const [submitting, setSubmitting]         = useState(false);
    const [error, setError]                   = useState<string | null>(null);

    const selectRef = useRef<HTMLSelectElement>(null);
    const submissionRef = useRef<{ fingerprint: string; key: string } | null>(null);

    // Focus the dropdown on mount
    useEffect(() => {
        selectRef.current?.focus();
    }, []);

    // ESC → close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const requiresNote = selectedReason === "OTHER";

    const handleConfirm = async () => {
        if (!selectedReason) {
            setError(isCancelIntent ? t("cancelOrderErrorReasonRequired") : t("refundOrderErrorReasonRequired"));
            return;
        }
        if (requiresNote && note.trim().length < 5) {
            setError(isCancelIntent ? t("cancelOrderErrorNoteRequired") : t("refundOrderErrorNoteRequired"));
            return;
        }

        setError(null);
        setSubmitting(true);

        let result: RefundOrderModalResult | null = null;
        try {
            const noteValue = requiresNote ? note.trim() : undefined;
            const fingerprint = JSON.stringify({
                intent,
                orderId: order.id,
                isPaid: order.isPaid === true,
                reason: selectedReason,
                note: noteValue,
            });
            if (submissionRef.current?.fingerprint !== fingerprint) {
                submissionRef.current = {
                    fingerprint,
                    key: await generateActionId(),
                };
            }
            const idempotencyKey = submissionRef.current.key;

            if (isCancelIntent) {
                const cancellation = await cancelOrder(order.id, {
                    cancelReason: selectedReason,
                    cancelReasonNote: noteValue,
                }, idempotencyKey);
                result = {
                    pendingApproval: cancellation.requiresKitchenApproval === true && cancellation.orderCancelled !== true,
                    orderCancelled: cancellation.orderCancelled === true,
                    refunded: false,
                };
            } else {
                await refundOrder(order.id, {
                    refundReason: selectedReason,
                    refundNote: noteValue,
                }, idempotencyKey);
                result = {
                    pendingApproval: false,
                    orderCancelled: true,
                    refunded: true,
                };
            }
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err);
            setError(msg ?? t(isCancelIntent ? "cancelOrderErrorGeneric" : "refundOrderErrorGeneric"));
        } finally {
            setSubmitting(false);
        }

        if (result) {
            const successMessage = result.pendingApproval
                ? (locale === "ar" ? "تم إرسال طلب الإلغاء للموافقة" : "Cancellation request sent for approval")
                : isCancelIntent
                    ? t("cancelOrderDirectSuccessToast")
                    : t("refundOrderSuccessToast");
            toast.success(successMessage);
            await onSuccess(result);
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="refund-modal-title"
        >
            <div
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                dir={isRtl ? "rtl" : "ltr"}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-amber-500" />
                        <h2 id="refund-modal-title" className="text-lg font-semibold text-slate-900">
                            {isCancelIntent ? t("cancelOrderModalTitle") : t("refundOrderModalTitle")} — {formatOrderSequence(order) ?? `#${order.orderNumber}`}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        disabled={submitting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Order summary */}
                <div className="border-b border-slate-100 bg-amber-50 px-6 py-3 space-y-1">
                    {order.tableName && (
                        <p className="text-xs text-slate-500">{order.tableName}</p>
                    )}
                    {order.paymentMethod && (
                        <p className="text-xs text-slate-500">
                            {locale === "ar" ? "طريقة الدفع:" : "Payment method:"}{" "}
                            <span className="font-medium text-slate-700">{order.paymentMethod}</span>
                        </p>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                            {t("refundOrderAmountLabel")}
                        </span>
                        <span className="text-lg font-bold text-amber-700">
                            {formatCurrency(order.totalAmount, currency)}
                        </span>
                    </div>
                </div>

                {/* Warning */}
                <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                    <span>
                        {isCancelIntent
                            ? (locale === "ar" ? "سيختار المدير طريقة معالجة الإلغاء: إلغاء، هدر، استرداد، أو استرداد مع هدر." : "A manager must choose cancel, waste, refund, or refund with waste before anything is changed.")
                            : t("refundOrderWarning")}
                    </span>
                </div>

                {/* Body */}
                <div className="space-y-4 px-6 py-4">
                    {/* Reason dropdown */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            {isCancelIntent ? t("cancelOrderReasonLabel") : t("refundOrderReasonLabel")} <span className="text-red-500">*</span>
                        </label>
                        <select
                            ref={selectRef}
                            value={selectedReason}
                            onChange={(e) => {
                                setSelectedReason(e.target.value);
                                setNote("");
                                setError(null);
                            }}
                            disabled={submitting}
                            aria-label={isCancelIntent ? t("cancelOrderReasonLabel") : t("refundOrderReasonLabel")}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                        >
                            <option value="">{isCancelIntent ? t("cancelOrderReasonPlaceholder") : t("refundOrderReasonPlaceholder")}</option>
                            {REFUND_REASONS.map((r) => (
                                <option key={r.code} value={r.code}>
                                    {t(r.labelKey)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Note — only shown for OTHER */}
                    {requiresNote && (
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                {isCancelIntent ? t("cancelOrderNoteLabel") : t("refundOrderNoteLabel")} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => {
                                    setNote(e.target.value);
                                    setError(null);
                                }}
                                disabled={submitting}
                                placeholder={isCancelIntent ? t("cancelOrderNotePlaceholder") : t("refundOrderNotePlaceholder")}
                                maxLength={500}
                                rows={3}
                                aria-label={isCancelIntent ? t("cancelOrderNoteLabel") : t("refundOrderNoteLabel")}
                                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                            />
                            <p className={`mt-1 text-xs ${note.trim().length < 5 ? "text-amber-600" : "text-slate-400"}`}>
                                {note.trim().length}/500
                            </p>
                        </div>
                    )}

                    {/* Inline error */}
                    {error && (
                        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || !selectedReason}
                        aria-busy={submitting}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isCancelIntent ? t("cancelOrderConfirmButton") : t("refundOrderConfirmButton")}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                    >
                        {isCancelIntent ? t("cancelOrderGoBack") : t("refundOrderGoBack")}
                    </button>
                </div>
            </div>
        </div>
    );
}

function getApiErrorMessage(error: unknown): string | null {
    if (typeof error !== "object" || error === null || !("response" in error)) {
        return error instanceof Error && error.message.trim() ? error.message : null;
    }

    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (typeof data === "string") return data;

    if (typeof data === "object" && data !== null && "message" in data) {
        const message = (data as { message?: unknown }).message;
        return typeof message === "string" ? message : null;
    }

    return null;
}
