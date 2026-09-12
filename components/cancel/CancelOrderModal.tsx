"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { cancelOrder, cancelOrderItem, getCancelReasons, CancelReason } from "@/lib/api";
import type { CancelOrderResult } from "@/lib/api";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatOrderSequence } from "@/lib/order-sequence";
import { generateActionId } from "@/lib/offline/id";
import { cancelOrderOffline } from "@/lib/offline/orders";
import { getConnectivityState } from "@/lib/offline/connectivity";

interface OrderSummary {
    id: string;
    orderNumber: string;
    orderSequenceNumber?: string | null;
    tableName?: string;
    items: Array<{ id: string; productName: string; quantity: number; price: number }>;
    totalAmount: number;
}

interface CancelOrderModalProps {
    order: OrderSummary;
    /** If provided, cancels only this item. Otherwise cancels the whole order. */
    cancelItemId?: string;
    cancelItemName?: string;
    onClose: () => void;
    /** Called on successful cancel so parent can update state. */
    onSuccess: (result: CancelOrderResult) => void | Promise<void>;
    currency?: string;
}

export default function CancelOrderModal({
    order,
    cancelItemId,
    cancelItemName,
    onClose,
    onSuccess,
    currency = "JOD",
}: CancelOrderModalProps) {
    const { t, locale } = useLocale();
    const isRtl = locale === "ar";
    const isItemCancel = !!cancelItemId;

    const [reasons, setReasons] = useState<CancelReason[]>([]);
    const [selectedReason, setSelectedReason] = useState<string>("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingReasons, setLoadingReasons] = useState(true);

    const dialogRef = useRef<HTMLDivElement>(null);
    const firstFocusRef = useRef<HTMLSelectElement>(null);
    const submissionRef = useRef<{ fingerprint: string; key: string } | null>(null);

    // Fetch cancel reasons from server
    useEffect(() => {
        getCancelReasons().then((r) => {
            setReasons(r);
            setLoadingReasons(false);
        });
    }, []);

    // Focus trap: focus first focusable on open
    useEffect(() => {
        firstFocusRef.current?.focus();
    }, [loadingReasons]);

    // ESC key → Go Back (not backdrop dismiss)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const requiresNote = reasons.find((r) => r.code === selectedReason)?.requiresNote ?? false;

    const handleConfirm = async () => {
        // Validation
        if (!selectedReason) {
            setError(t("cancelOrderErrorReasonRequired"));
            return;
        }
        if (requiresNote && note.trim().length < 5) {
            setError(t("cancelOrderErrorNoteRequired"));
            return;
        }

        setError(null);
        setSubmitting(true);

        // ── Separate API call from success-path callbacks so that errors inside
        // ── onSuccess/onClose (e.g. state updates on an already-unmounting component)
        // ── are never misreported as a cancel failure.
        let succeeded = false;
        let autoApproved = false;
        let cancelResult: CancelOrderResult | null = null;
        try {
            const payload = {
                cancelReason: selectedReason,
                cancelReasonNote: requiresNote ? note.trim() : undefined,
                mode: "KITCHEN" as const,
            };
            const fingerprint = JSON.stringify({
                orderId: order.id,
                itemId: cancelItemId ?? null,
                ...payload,
            });
            if (submissionRef.current?.fingerprint !== fingerprint) {
                submissionRef.current = {
                    fingerprint,
                    key: await generateActionId(),
                };
            }
            const idempotencyKey = submissionRef.current.key;

            // Offline fallback for full-order cancellation only. Item-level
            // cancellation has no corresponding offline action type, so it
            // continues to require connectivity and falls through to the
            // online call (which will surface the network error). The queued
            // cancel-order action carries `payload` opaquely; the backend
            // applies the normal kitchen-approval workflow on replay.
            if (!isItemCancel && getConnectivityState() !== "online") {
                await cancelOrderOffline(order.id, {
                    cancelReason: selectedReason as import("@/types/order").OrderCancelReasonCode,
                    cancelReasonNote: requiresNote ? note.trim() : undefined,
                    mode: "KITCHEN",
                });
                cancelResult = {
                    cancelLogId: idempotencyKey,
                    requiresKitchenApproval: true,
                    approvalStatus: "Pending",
                    orderCancelled: true,
                };
            } else {
                cancelResult = isItemCancel
                    ? await cancelOrderItem(order.id, cancelItemId!, payload, idempotencyKey)
                    : await cancelOrder(order.id, payload, idempotencyKey);
            }

            autoApproved = cancelResult.requiresKitchenApproval === false;
            succeeded = true;
        } catch (err: unknown) {
            setError(getErrorMessage(err, t("cancelOrderErrorGeneric")));
        } finally {
            setSubmitting(false);
        }

        // Run success callbacks AFTER the try/catch so they can never trigger
        // the error banner even if they throw or cause React warnings.
        if (succeeded && cancelResult) {
            if (autoApproved) {
                toast.success(locale === "ar" ? "تم الإلغاء وتسجيله كهدر (الطلب جاهز)" : "Cancelled and logged as waste (order Ready)");
            } else {
                toast.success(locale === "ar" ? "تم إرسال طلب الإلغاء لموافقة الإدارة" : "Cancellation request sent for admin approval");
            }
            await onSuccess(cancelResult);
            onClose();
        }
    };

    const reasonLabel = (r: CancelReason) => (locale === "ar" ? r.nameAr : r.name);

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="cancel-modal-title"
        >
            {/* Dialog box — focus trap container */}
            <div
                ref={dialogRef}
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                dir={isRtl ? "rtl" : "ltr"}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <h2 id="cancel-modal-title" className="text-lg font-semibold text-slate-900">
                            {t("cancelOrderModalTitle")} — {formatOrderSequence(order) ?? `#${order.orderNumber}`}
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
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
                    {isItemCancel ? (
                        <p className="text-sm text-slate-600">
                            {t("cancelOrderButtonItem")}: <span className="font-medium text-slate-800">{cancelItemName}</span>
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {order.tableName && (
                                <p className="text-xs text-slate-500">{order.tableName}</p>
                            )}
                            <div className="max-h-28 overflow-y-auto">
                                {order.items.map((item) => (
                                    <div key={item.id} className="flex justify-between text-sm text-slate-700">
                                        <span>{item.productName} × {item.quantity}</span>
                                        <span>{(item.price * item.quantity).toFixed(2)} {currency}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-semibold text-slate-800">
                                <span>Total</span>
                                <span>{order.totalAmount.toFixed(2)} {currency}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="space-y-4 px-6 py-5">
                    {isItemCancel && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {locale === "ar"
                                ? "سيتم إرسال طلب إلغاء الصنف إلى الإدارة للموافقة قبل تغيير الطلب."
                                : "This item cancellation will be sent to Admin for approval before the order is changed."}
                        </div>
                    )}

                    {/* Reason dropdown */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            {t("cancelOrderReasonLabel")} <span className="text-red-500">*</span>
                        </label>
                        {loadingReasons ? (
                            <div className="flex h-10 items-center gap-2 text-slate-400 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("loadingText")}
                            </div>
                        ) : (
                            <select
                                ref={firstFocusRef}
                                value={selectedReason}
                                onChange={(e) => {
                                    setSelectedReason(e.target.value);
                                    setNote("");
                                    setError(null);
                                }}
                                disabled={submitting}
                                aria-label={t("cancelOrderReasonLabel")}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                            >
                                <option value="">{t("cancelOrderReasonPlaceholder")}</option>
                                {reasons.map((r) => (
                                    <option key={r.id} value={r.code}>
                                        {reasonLabel(r)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Note field — shown only when reason requires it */}
                    {requiresNote && (
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                {t("cancelOrderNoteLabel")} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => {
                                    setNote(e.target.value);
                                    setError(null);
                                }}
                                disabled={submitting}
                                placeholder={t("cancelOrderNotePlaceholder")}
                                maxLength={500}
                                rows={3}
                                aria-label={t("cancelOrderNoteLabel")}
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

                {/* Footer actions */}
                <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || !selectedReason || loadingReasons}
                        aria-busy={submitting}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {locale === "ar" ? "إرسال للموافقة" : "Send for Approval"}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                    >
                        {t("cancelOrderGoBack")}
                    </button>
                </div>
            </div>
        </div>
    );
}

function getErrorMessage(error: unknown, fallback: string) {
    if (!error || typeof error !== "object") return fallback;
    const candidate = error as { response?: { data?: unknown }; message?: unknown };
    const data = candidate.response?.data;
    if (data && typeof data === "object" && "message" in data) {
        const message = (data as { message?: unknown }).message;
        if (typeof message === "string") return message;
    }
    return typeof data === "string" ? data : typeof candidate.message === "string" ? candidate.message : fallback;
}
