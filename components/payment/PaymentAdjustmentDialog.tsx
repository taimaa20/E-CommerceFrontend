"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { getRequestErrorMessage } from "@/lib/api";
import {
    requestOrderPaymentAdjustment,
    type PaymentAdjustmentReasonCode,
} from "@/lib/api-payment-adjustments";
import {
    getActivePaymentMethods,
    getPaymentMethodName,
    isCashPaymentMethod,
    type PaymentMethodDto,
} from "@/lib/api-payment-methods";
import { formatOrderSequence } from "@/lib/order-sequence";
import type { OrderDto, PaymentDto } from "@/types/order";

interface PaymentAdjustmentDialogProps {
    order: OrderDto;
    currency: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface AllocationRow {
    key: number;
    paymentMethodId: string;
    amount: string;
    referenceNumber: string;
}

const MAX_ALLOCATIONS = 20;
const CASH_PAYMENT_METHOD_ID = "00000000-0000-0000-0000-000000000000";
const REASONS: Array<{ code: PaymentAdjustmentReasonCode; en: string; ar: string }> = [
    { code: "WRONG_PAYMENT_TYPE", en: "Wrong payment type selected", ar: "تم اختيار نوع دفع خاطئ" },
    { code: "CUSTOMER_CHANGED_METHOD", en: "Customer changed payment method", ar: "غيّر العميل طريقة الدفع" },
    { code: "SPLIT_PAYMENT_CORRECTION", en: "Split payment correction", ar: "تصحيح دفعة مقسمة" },
    { code: "CASH_BY_MISTAKE", en: "Cash entered by mistake", ar: "تم إدخال النقد بالخطأ" },
    { code: "CARD_BY_MISTAKE", en: "Card entered by mistake", ar: "تم إدخال البطاقة بالخطأ" },
    { code: "OTHER", en: "Other", ar: "أخرى" },
];

function resolveInitialMethod(payment: PaymentDto, methods: PaymentMethodDto[]): string {
    if (payment.paymentMethodId && methods.some((method) => method.id === payment.paymentMethodId))
        return payment.paymentMethodId;

    const code = payment.paymentMethodCode?.trim().toUpperCase();
    const codeMatch = code ? methods.find((method) => method.code.toUpperCase() === code) : undefined;
    if (codeMatch) return codeMatch.id;

    if (payment.method.trim().toLowerCase() === "cash")
        return methods.find(isCashPaymentMethod)?.id ?? "";

    const nonCashMethods = methods.filter((method) => !isCashPaymentMethod(method));
    return nonCashMethods.length === 1 ? nonCashMethods[0].id : "";
}

function buildInitialRows(order: OrderDto, methods: PaymentMethodDto[]): AllocationRow[] {
    return (order.payments ?? []).map((payment, index) => ({
        key: index + 1,
        paymentMethodId: resolveInitialMethod(payment, methods),
        amount: payment.amount.toFixed(2),
        referenceNumber: payment.referenceNumber ?? "",
    }));
}

function withCashOption(methods: PaymentMethodDto[]): PaymentMethodDto[] {
    if (methods.some(isCashPaymentMethod)) return methods;
    return [{
        id: CASH_PAYMENT_METHOD_ID,
        nameEn: "Cash",
        nameAr: "نقدي",
        code: "CASH",
        displayOrder: -1,
        isActive: true,
        isDefault: false,
        requiresReferenceNumber: false,
        createdAt: "",
        updatedAt: "",
        costSharingMode: 0,
        costSharingScope: 0,
        costSharingCommissionPercentage: 0,
        costSharingRestaurantPercentage: 0,
        costSharingCounterpartyPercentage: 0
    }, ...methods];
}

function paymentName(payment: PaymentDto, locale: string): string {
    if (locale === "ar" && payment.paymentMethodNameAr) return payment.paymentMethodNameAr;
    return payment.paymentMethodName || payment.method;
}

export default function PaymentAdjustmentDialog({
    order,
    currency,
    onClose,
    onSuccess,
}: PaymentAdjustmentDialogProps) {
    const { locale } = useLocale();
    const isArabic = locale === "ar";
    const nextKey = useRef(100);
    const [methods, setMethods] = useState<PaymentMethodDto[]>([]);
    const [rows, setRows] = useState<AllocationRow[]>([]);
    const [reasonCode, setReasonCode] = useState<PaymentAdjustmentReasonCode | "">("");
    const [reasonText, setReasonText] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        getActivePaymentMethods()
            .then((activeMethods) => {
                if (!active) return;
                const availableMethods = withCashOption(activeMethods);
                setMethods(availableMethods);
                setRows(buildInitialRows(order, availableMethods));
            })
            .catch((requestError) => {
                if (!active) return;
                setError(getRequestErrorMessage(
                    requestError,
                    isArabic ? "تعذر تحميل بيانات تعديل الدفع" : "Failed to load payment adjustment data",
                ));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [isArabic, order]);

    const currentTotalCents = (order.payments ?? []).reduce(
        (total, payment) => total + Math.round(payment.amount * 100),
        0,
    );
    const adjustedTotalCents = rows.reduce((total, row) => {
        const amount = Number(row.amount);
        return total + (Number.isFinite(amount) ? Math.round(amount * 100) : 0);
    }, 0);

    const updateRow = (key: number, change: Partial<AllocationRow>) => {
        setRows((current) => current.map((row) => row.key === key ? { ...row, ...change } : row));
        setError("");
    };

    const addRow = () => {
        if (rows.length >= MAX_ALLOCATIONS) return;
        setRows((current) => [...current, {
            key: nextKey.current++,
            paymentMethodId: "",
            amount: "",
            referenceNumber: "",
        }]);
    };

    const removeRow = (key: number) => {
        if (rows.length === 1) return;
        setRows((current) => current.filter((row) => row.key !== key));
    };

    const validate = (): string | null => {
        if (rows.length === 0 || rows.some((row) => !row.paymentMethodId))
            return isArabic ? "اختر طريقة دفع لكل مبلغ" : "Select a payment method for every amount";
        if (rows.some((row) => !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0))
            return isArabic ? "أدخل مبالغ دفع صحيحة" : "Enter valid payment amounts";
        if (rows.some((row) => !/^\d+(\.\d{1,2})?$/.test(row.amount.trim())))
            return isArabic ? "يجب ألا تتجاوز المبالغ منزلتين عشريتين" : "Amounts cannot exceed two decimal places";
        if (adjustedTotalCents !== currentTotalCents)
            return isArabic ? "يجب أن يساوي الإجمالي الجديد إجمالي الدفع الحالي" : "New total must equal the current payment total";
        if (rows.some((row) => {
            const method = methods.find((item) => item.id === row.paymentMethodId);
            return method?.requiresReferenceNumber && !row.referenceNumber.trim();
        }))
            return isArabic ? "رقم المرجع مطلوب لطريقة الدفع المحددة" : "Reference number is required for the selected method";
        if (!reasonCode)
            return isArabic ? "اختر سبب التعديل" : "Select an adjustment reason";
        if (reasonCode === "OTHER" && !reasonText.trim())
            return isArabic ? "اكتب سبب التعديل" : "Enter the adjustment reason";
        return null;
    };

    const submit = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError("");
        try {
            await requestOrderPaymentAdjustment(order.id, {
                reasonCode: reasonCode as PaymentAdjustmentReasonCode,
                reasonText: reasonCode === "OTHER" ? reasonText.trim() : undefined,
                payments: rows.map((row) => ({
                    paymentMethodId: row.paymentMethodId,
                    isCash: isCashPaymentMethod(
                        methods.find((method) => method.id === row.paymentMethodId)!,
                    ),
                    amount: Number(row.amount),
                    referenceNumber: row.referenceNumber.trim() || undefined,
                })),
            });
            toast.success(isArabic ? "تم إرسال طلب تعديل الدفع للمدير" : "Payment change sent for manager approval");
            onSuccess();
        } catch (requestError) {
            setError(getRequestErrorMessage(
                requestError,
                isArabic ? "تعذر تعديل طرق الدفع" : "Failed to adjust payment methods",
            ));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
            <DialogContent className="max-h-[95dvh] sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                        {isArabic ? "طلب تعديل الدفع" : "Payment Adjustment Request"}
                    </DialogTitle>
                    <DialogDescription>
                        {formatOrderSequence(order) ?? order.orderNumber} · {isArabic
                            ? "يتطلب اعتماد مدير ولا يغيّر إجمالي الطلب"
                            : "Manager approval is required. The order total will not change."}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {isArabic ? "جاري التحميل..." : "Loading..."}
                    </div>
                ) : (
                    <div className="space-y-5">
                        <section className="space-y-2">
                            <h3 className="text-sm font-semibold">{isArabic ? "الدفع الحالي" : "Current Payments"}</h3>
                            <div className="divide-y rounded-lg border">
                                {(order.payments ?? []).map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                        <span>
                                            {paymentName(payment, locale)}
                                            {payment.referenceNumber ? ` · ${payment.referenceNumber}` : ""}
                                        </span>
                                        <span className="font-semibold">{formatCurrency(payment.amount, currency)}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">{isArabic ? "التوزيع الجديد" : "New Allocation"}</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={rows.length >= MAX_ALLOCATIONS}>
                                    <Plus className="h-4 w-4" />
                                    {isArabic ? "إضافة دفعة" : "Add Payment"}
                                </Button>
                            </div>
                            {methods.length === 0 ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    {isArabic ? "لا توجد طرق دفع نشطة" : "No active payment methods are available"}
                                </div>
                            ) : rows.map((row) => {
                                const selectedMethod = methods.find((method) => method.id === row.paymentMethodId);
                                return (
                                    <div key={row.key} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.4fr_0.7fr_1fr_auto]">
                                        <Select
                                            value={row.paymentMethodId}
                                            onValueChange={(value) => updateRow(row.key, { paymentMethodId: value, referenceNumber: "" })}
                                            disabled={submitting}
                                        >
                                            <SelectTrigger><SelectValue placeholder={isArabic ? "طريقة الدفع" : "Payment method"} /></SelectTrigger>
                                            <SelectContent>
                                                {methods.map((method) => (
                                                    <SelectItem key={method.id} value={method.id}>
                                                        {getPaymentMethodName(method, locale)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={row.amount}
                                            onChange={(event) => updateRow(row.key, { amount: event.target.value })}
                                            placeholder={isArabic ? "المبلغ" : "Amount"}
                                            disabled={submitting}
                                        />
                                        <Input
                                            value={row.referenceNumber}
                                            onChange={(event) => updateRow(row.key, { referenceNumber: event.target.value })}
                                            placeholder={selectedMethod?.requiresReferenceNumber
                                                ? (isArabic ? "رقم المرجع *" : "Reference number *")
                                                : (isArabic ? "رقم المرجع" : "Reference number")}
                                            maxLength={120}
                                            disabled={submitting}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeRow(row.key)}
                                            disabled={submitting || rows.length === 1}
                                            aria-label={isArabic ? "حذف الدفعة" : "Remove payment"}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                );
                            })}
                            <div className={`flex justify-between rounded-lg px-3 py-2 text-sm font-semibold ${
                                adjustedTotalCents === currentTotalCents
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                            }`}>
                                <span>{isArabic ? "الإجمالي الجديد" : "New Total"}</span>
                                <span>
                                    {formatCurrency(adjustedTotalCents / 100, currency)} / {formatCurrency(currentTotalCents / 100, currency)}
                                </span>
                            </div>
                        </section>

                        <div className="space-y-2">
                            <Label>{isArabic ? "سبب التعديل" : "Adjustment Reason"}</Label>
                            <Select
                                value={reasonCode}
                                onValueChange={(value) => setReasonCode(value as PaymentAdjustmentReasonCode)}
                                disabled={submitting}
                            >
                                <SelectTrigger><SelectValue placeholder={isArabic ? "اختر السبب" : "Select reason"} /></SelectTrigger>
                                <SelectContent>
                                    {REASONS.map((reason) => (
                                        <SelectItem key={reason.code} value={reason.code}>
                                            {isArabic ? reason.ar : reason.en}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {reasonCode === "OTHER" && (
                            <div className="space-y-2">
                                <Label>{isArabic ? "تفاصيل السبب" : "Reason Details"}</Label>
                                <Textarea
                                    value={reasonText}
                                    onChange={(event) => setReasonText(event.target.value)}
                                    maxLength={500}
                                    disabled={submitting}
                                />
                            </div>
                        )}

                        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        {isArabic ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button onClick={submit} disabled={loading || submitting || methods.length === 0}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isArabic ? "إرسال للموافقة" : "Send for Approval"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
