"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CancellationApprovalDecision, decideCancellationApprovalRequest, type CancelReason } from "@/lib/api";
import { useLocale } from "@/components/locale-provider";
import { getCancellationReasonLabel, getOrderTypeLabel } from "@/lib/cancellation-i18n";
import type { OrderDto } from "@/types/order";
import { markConfirmedCancelledOrderSnapshot } from "@/lib/offline/terminal-orders";

type Decision = typeof CancellationApprovalDecision[keyof typeof CancellationApprovalDecision];

interface Props {
    order: OrderDto;
    currency: string;
    reasons: CancelReason[];
    onResolved: () => void;
}

/**
 * Manager approval controls embedded inside the order-details popup. Shown only while
 * the order is awaiting a decision. Reuses the existing cancellation decision endpoint —
 * no separate approval screen, no duplicate workflow.
 */
export default function OrderCancellationApproval({ order, currency, reasons, onResolved }: Props) {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = isAr ? AR : EN;
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const info = order.cancellationInfo;
    if (!info?.cancelLogId) return null;

    const cancelLogId = info.cancelLogId;
    const isItemCancellation = !!info.orderItemId;
    const isPaid = order.isPaid === true || order.paymentStatus === "Paid";
    const fmt = (n: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

    const decide = async (decision: Decision) => {
        setBusy(true);
        try {
            const result = await decideCancellationApprovalRequest(cancelLogId, decision, { note: note.trim() || undefined });
            if (result.orderCancelled) {
                await markConfirmedCancelledOrderSnapshot(
                    order.id,
                    order,
                    result.kitchenDecision === "Refund" || result.kitchenDecision === "RefundWaste",
                );
            }
            toast.success(text.saved);
            onResolved();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, text.error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3">
            <div className="text-sm font-bold text-amber-900">{text.title}</div>

            <div className="grid grid-cols-2 gap-2 text-sm">
                <Field label={text.orderType} value={getOrderTypeLabel(order.orderType, locale)} />
                <Field label={text.cashier} value={info.requestedBy || order.cashierName || "-"} />
                <Field label={text.amount} value={fmt(order.totalAmount ?? 0)} />
                <Field label={text.paymentStatus} value={isPaid ? text.paid : text.unpaid} />
                {isItemCancellation && <Field label={text.item} value={info.itemName || "-"} />}
                <Field label={text.reason} value={getCancellationReasonLabel(info.cancellationReason, locale, reasons)} />
                <Field label={text.requestDate} value={formatDate(info.requestDate)} />
            </div>
            {info.notes && <Field label={text.requestNotes} value={info.notes} />}

            <Label className="block space-y-1 text-sm">
                <span className="font-medium text-amber-900">{text.managerNote}</span>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} rows={2} />
            </Label>

            <div className="flex flex-wrap gap-2">
                {isPaid ? (
                    <>
                        <Button type="button" disabled={busy} onClick={() => decide(CancellationApprovalDecision.RefundOnly)}>
                            <XCircle className="h-4 w-4" />
                            {text.refundOnly}
                        </Button>
                        <Button type="button" variant="destructive" disabled={busy} onClick={() => decide(CancellationApprovalDecision.RefundWithWaste)}>
                            <Trash2 className="h-4 w-4" />
                            {text.refundWaste}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button type="button" disabled={busy} onClick={() => decide(CancellationApprovalDecision.CancelNotPrepared)}>
                            <XCircle className="h-4 w-4" />
                            {isItemCancellation ? text.cancelItem : text.cancelClean}
                        </Button>
                        <Button type="button" variant="destructive" disabled={busy} onClick={() => decide(CancellationApprovalDecision.CancelWithWaste)}>
                            <Trash2 className="h-4 w-4" />
                            {isItemCancellation ? text.cancelItemWaste : text.cancelWaste}
                        </Button>
                    </>
                )}
                <Button type="button" variant="outline" disabled={busy} onClick={() => decide(CancellationApprovalDecision.Rejected)}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                    {text.reject}
                </Button>
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs font-semibold uppercase text-amber-700">{label}</div>
            <div className="mt-0.5 break-words text-amber-950">{value}</div>
        </div>
    );
}

function formatDate(value?: string | null): string {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== "object") return fallback;
    const candidate = error as { response?: { data?: unknown }; message?: unknown };
    const data = candidate.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object" && "message" in data) {
        const message = (data as { message?: unknown }).message;
        if (typeof message === "string" && message.trim()) return message;
    }
    return typeof candidate.message === "string" && candidate.message.trim() ? candidate.message : fallback;
}

const EN = {
    title: "Cancellation Request",
    orderType: "Order Type",
    cashier: "Requested By",
    amount: "Order Amount",
    paymentStatus: "Payment Status",
    item: "Item",
    paid: "Paid",
    unpaid: "Unpaid",
    reason: "Cancellation Reason",
    requestDate: "Request Date",
    requestNotes: "Request Notes",
    managerNote: "Manager Note (optional)",
    cancelClean: "Cancel Order",
    cancelWaste: "Cancel + Waste",
    cancelItem: "Cancel Item",
    cancelItemWaste: "Cancel Item + Waste",
    refundOnly: "Refund",
    refundWaste: "Refund + Waste",
    reject: "Reject Request",
    saved: "Cancellation decision saved",
    error: "Failed to save cancellation decision",
};

const AR: typeof EN = {
    title: "طلب الإلغاء",
    orderType: "نوع الطلب",
    cashier: "مقدّم الطلب",
    amount: "قيمة الطلب",
    paymentStatus: "حالة الدفع",
    item: "الصنف",
    paid: "مدفوع",
    unpaid: "غير مدفوع",
    reason: "سبب الإلغاء",
    requestDate: "تاريخ الطلب",
    requestNotes: "ملاحظات الطلب",
    managerNote: "ملاحظة المدير (اختياري)",
    cancelClean: "إلغاء الطلب",
    cancelWaste: "إلغاء + هدر",
    cancelItem: "إلغاء الصنف",
    cancelItemWaste: "إلغاء الصنف + هدر",
    refundOnly: "استرداد",
    refundWaste: "استرداد + هدر",
    reject: "رفض الطلب",
    saved: "تم حفظ قرار الإلغاء",
    error: "فشل حفظ قرار الإلغاء",
};
