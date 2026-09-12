"use client";

import { useEffect, useState } from "react";
import { BadgePercent, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/currencies";
import { getRequestErrorMessage, updateDeliveryPartnerPriceAdjustment } from "@/lib/api";
import type {
    DeliveryPartnerPriceAdjustmentReason,
    DeliveryPartnerPriceCorrectionMode,
    OrderDto,
    OrderItemDto,
} from "@/types/order";

interface DeliveryPartnerPriceAdjustmentProps {
    order: OrderDto;
    currency: string;
    locale: string;
    canAdjust: boolean;
    isOnline: boolean;
    onSaved: (order: OrderDto) => void | Promise<void>;
}

interface AdjustmentRow {
    orderItemId: string;
    name: string;
    quantity: number;
    originalPrice: number;
    currentPrice: number;
    newPrice: string;
}

const REASONS: Array<{
    code: DeliveryPartnerPriceAdjustmentReason;
    en: string;
    ar: string;
}> = [
    { code: "PriceDifference", en: "Price Difference", ar: "فرق السعر" },
    { code: "NoDiscountApplied", en: "No Discount Applied", ar: "لم يتم تطبيق الخصم" },
    { code: "ExtraDiscountApplied", en: "Extra Discount Applied", ar: "تم تطبيق خصم إضافي" },
    { code: "Other", en: "Other", ar: "أخرى" },
];

function roundMoney(value: number): number {
    return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function itemBasePrice(item: OrderItemDto): number {
    if (item.partnerDiscountedUnitPrice != null) return item.partnerDiscountedUnitPrice;
    if (item.partnerPriceSnapshot != null) return item.partnerPriceSnapshot;
    if (item.unitPriceSnapshot != null) return item.unitPriceSnapshot;
    if (item.unitPrice != null) return item.unitPrice;
    return item.quantity > 0 && item.lineTotalAmount != null ? item.lineTotalAmount / item.quantity : 0;
}

function originalPrice(item: OrderItemDto): number {
    return roundMoney(item.partnerOriginalUnitPrice ?? item.partnerPriceSnapshot ?? itemBasePrice(item));
}

function buildRows(order: OrderDto, locale: string): AdjustmentRow[] {
    return (order.items ?? [])
        .filter((item) => item.id && !item.isOfferBundle)
        .map((item) => {
            const currentPrice = roundMoney(itemBasePrice(item));
            return {
                orderItemId: item.id!,
                name: locale === "ar" ? item.productNameAr || item.productName : item.productName,
                quantity: item.quantity,
                originalPrice: originalPrice(item),
                currentPrice,
                newPrice: currentPrice > 0 ? currentPrice.toFixed(2) : "",
            };
        });
}

function discountAmount(original: number, selling: number): number {
    return roundMoney(Math.max(0, original - selling));
}

export function DeliveryPartnerPriceAdjustment({
    order,
    currency,
    locale,
    canAdjust,
    isOnline,
    onSaved,
}: DeliveryPartnerPriceAdjustmentProps) {
    const isArabic = locale === "ar";
    const isFlagged = order.hasPriceDifference === true || order.hasPartnerDiscountOverride === true;
    const [enabled, setEnabled] = useState(isFlagged);
    const [reasonCode, setReasonCode] = useState<DeliveryPartnerPriceAdjustmentReason>("PriceDifference");
    const [note, setNote] = useState("");
    const [correctionMode, setCorrectionMode] = useState<DeliveryPartnerPriceCorrectionMode>(
        order.priceDifferenceCorrectionMode ?? "PerItem"
    );
    const [correctPartnerTotal, setCorrectPartnerTotal] = useState(
        order.correctPartnerTotal?.toFixed(2) ?? order.totalAmount.toFixed(2)
    );
    const [rows, setRows] = useState<AdjustmentRow[]>(() => buildRows(order, locale));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEnabled(order.hasPriceDifference === true || order.hasPartnerDiscountOverride === true);
        setReasonCode("PriceDifference");
        setNote("");
        setCorrectionMode(order.priceDifferenceCorrectionMode ?? "PerItem");
        setCorrectPartnerTotal(order.correctPartnerTotal?.toFixed(2) ?? order.totalAmount.toFixed(2));
        setRows(buildRows(order, locale));
        setSaving(false);
    }, [order, locale]);

    const hasInvalidPrice = rows.some((row) => {
        const value = Number(row.newPrice);
        return !Number.isFinite(value) || value <= 0;
    });
    const changedRows = rows.filter((row) => roundMoney(Number(row.newPrice)) !== row.currentPrice);
    const parsedCorrectTotal = Number(correctPartnerTotal);
    const hasInvalidTotal = !Number.isFinite(parsedCorrectTotal) || parsedCorrectTotal < 0;
    const systemTotal = order.originalPartnerTotal ?? order.totalAmount;
    const calculatedDifference = roundMoney(parsedCorrectTotal - systemTotal);
    const canSave = canAdjust && isOnline && enabled &&
        (correctionMode === "PerItem" ? !hasInvalidPrice : !hasInvalidTotal) && !saving;

    const updatePrice = (orderItemId: string, value: string) => {
        setRows((current) =>
            current.map((row) => row.orderItemId === orderItemId ? { ...row, newPrice: value } : row)
        );
    };

    const saveAdjustment = async () => {
        if (!canSave) return;

        setSaving(true);
        try {
            const updated = await updateDeliveryPartnerPriceAdjustment(order.id, {
                hasPriceDifference: enabled,
                reasonCode,
                note: note.trim() || null,
                correctionMode,
                correctPartnerTotal: correctionMode === "OrderTotal" ? roundMoney(parsedCorrectTotal) : null,
                items: correctionMode === "PerItem" ? changedRows.map((row) => ({
                    orderItemId: row.orderItemId,
                    newUnitPrice: roundMoney(Number(row.newPrice)),
                })) : [],
            });
            await onSaved(updated);
            toast.success(isArabic ? "تم حفظ تعديل سعر الشريك" : "Delivery partner price adjustment saved");
        } catch (error) {
            toast.error(getRequestErrorMessage(
                error,
                isArabic ? "تعذر حفظ تعديل سعر الشريك" : "Failed to save delivery partner price adjustment"
            ));
        } finally {
            setSaving(false);
        }
    };

    if (order.orderSource !== "DeliveryPartner") return null;

    return (
        <div className="w-full max-w-full overflow-hidden rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold text-amber-950">
                    <BadgePercent className="h-4 w-4 text-amber-700" />
                    <span>{isArabic ? "فرق سعر شريك التوصيل" : "Delivery Partner Price Difference"}</span>
                </div>
                {isFlagged ? (
                    <span className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800">
                        {isArabic ? "تم التعليم" : "Flagged"}
                    </span>
                ) : null}
            </div>

            <div className="mt-3 flex items-center gap-2">
                <Checkbox
                    id="delivery-partner-price-difference"
                    checked={enabled}
                    disabled={!canAdjust || !isOnline}
                    onCheckedChange={(checked) => setEnabled(checked === true)}
                />
                <Label htmlFor="delivery-partner-price-difference" className="text-sm font-semibold text-amber-950">
                    {isArabic ? "فرق السعر" : "Price Difference"}
                </Label>
            </div>

            {!canAdjust ? (
                <div className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800">
                    {isArabic ? "صلاحية العرض فقط" : "View only"}
                </div>
            ) : null}

            {canAdjust && !isOnline ? (
                <div className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800">
                    {isArabic ? "متاح عند الاتصال فقط" : "Available online only"}
                </div>
            ) : null}

            {enabled ? (
                <div className="mt-3 space-y-3">
                    <div className="space-y-2 rounded-md border border-amber-200 bg-white p-3">
                        <Label className="text-xs font-semibold text-amber-900">
                            {isArabic ? "وضع التصحيح" : "Correction Mode"}
                        </Label>
                        <RadioGroup
                            value={correctionMode}
                            disabled={!canAdjust || !isOnline}
                            onValueChange={(value) => setCorrectionMode(value as DeliveryPartnerPriceCorrectionMode)}
                            className="flex flex-wrap gap-4"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="PerItem" id="price-mode-per-item" />
                                <Label htmlFor="price-mode-per-item">{isArabic ? "لكل صنف" : "Per Item"}</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="OrderTotal" id="price-mode-order-total" />
                                <Label htmlFor="price-mode-order-total">{isArabic ? "إجمالي الطلب" : "Order Total"}</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="min-w-0 space-y-2">
                        <div className="min-w-0 space-y-1.5">
                            <Label className="text-xs font-semibold text-amber-900">
                                {isArabic ? "السبب" : "Reason"}
                            </Label>
                            <Select
                                value={reasonCode}
                                disabled={!canAdjust || !isOnline}
                                onValueChange={(value) => setReasonCode(value as DeliveryPartnerPriceAdjustmentReason)}
                            >
                                <SelectTrigger className="min-h-10 bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {REASONS.map((reason) => (
                                        <SelectItem key={reason.code} value={reason.code}>
                                            {isArabic ? reason.ar : reason.en}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-0 space-y-1.5">
                            <Label htmlFor="delivery-partner-price-note" className="text-xs font-semibold text-amber-900">
                                {isArabic ? "ملاحظة" : "Note"}
                            </Label>
                            <Textarea
                                id="delivery-partner-price-note"
                                value={note}
                                maxLength={500}
                                rows={2}
                                disabled={!canAdjust || !isOnline}
                                onChange={(event) => setNote(event.target.value)}
                                className="min-h-10 resize-none bg-white"
                            />
                        </div>
                    </div>

                    {correctionMode === "OrderTotal" ? (
                        <div className="space-y-2 rounded-md border border-amber-200 bg-white p-3 text-sm">
                            <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                                <span>{isArabic ? "إجمالي النظام" : "System Total"}</span>
                                <span className="font-mono font-semibold">{formatCurrency(systemTotal, currency)}</span>
                            </div>
                            <div className="rounded-md bg-amber-50 px-3 py-2">
                                <Label htmlFor="correct-partner-total" className="text-xs font-semibold text-amber-900">
                                    {isArabic ? "إجمالي الشريك الصحيح" : "Correct Partner Total"}
                                </Label>
                                <Input id="correct-partner-total" type="number" inputMode="decimal" min={0} step="0.01"
                                    value={correctPartnerTotal} disabled={!canAdjust || !isOnline}
                                    onChange={(event) => setCorrectPartnerTotal(event.target.value)}
                                    className="mt-1 bg-white text-end text-base font-semibold" />
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-md bg-amber-50 px-3 py-2">
                                <span>{isArabic ? "الفرق المحسوب" : "Calculated Difference"}</span>
                                <span className="font-mono font-semibold text-amber-950">
                                    {hasInvalidTotal ? "-" : formatCurrency(calculatedDifference, currency)}
                                </span>
                            </div>
                        </div>
                    ) : <div className="space-y-2">
                        {rows.map((row) => {
                            const newPrice = roundMoney(Number(row.newPrice));
                            const currentDiscount = discountAmount(row.originalPrice, row.currentPrice);
                            const nextDiscount = Number.isFinite(newPrice) && newPrice > 0
                                ? discountAmount(row.originalPrice, newPrice)
                                : null;

                            return (
                                <div key={row.orderItemId} className="min-w-0 rounded-md border border-amber-200 bg-white p-3">
                                    <div className="flex min-w-0 items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="break-words text-sm font-semibold text-slate-950">
                                                {row.quantity}x {row.name}
                                            </div>
                                            <div className="mt-0.5 text-xs text-slate-500">
                                                {isArabic ? "السعر الأساسي" : "Base price"}: {formatCurrency(row.originalPrice, currency)}
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={!canAdjust || !isOnline}
                                            onClick={() => updatePrice(row.orderItemId, row.originalPrice.toFixed(2))}
                                            className="h-8 shrink-0 gap-1 border-amber-200 px-2 text-amber-800 hover:bg-amber-50"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            <span>{isArabic ? "إزالة" : "Reset"}</span>
                                        </Button>
                                    </div>

                                    <div className="mt-3 space-y-2 text-sm">
                                        <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                                            <span className="min-w-0 text-slate-600">{isArabic ? "السعر الحالي في النظام" : "Current system price"}</span>
                                            <span className="shrink-0 font-mono font-semibold text-slate-950">
                                                {formatCurrency(row.currentPrice, currency)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                                            <span className="min-w-0 text-slate-600">{isArabic ? "الخصم الحالي" : "Current discount"}</span>
                                            <span className="shrink-0 font-mono font-semibold text-slate-950">
                                                {formatCurrency(currentDiscount, currency)}
                                            </span>
                                        </div>

                                        <div className="rounded-md bg-amber-50 px-3 py-2">
                                            <Label className="text-xs font-semibold text-amber-900">
                                                {isArabic ? "السعر الصحيح من الشريك" : "Correct partner price"}
                                            </Label>
                                            <Input
                                                type="number"
                                                min={0.01}
                                                step="0.01"
                                                value={row.newPrice}
                                                disabled={!canAdjust || !isOnline}
                                                onChange={(event) => updatePrice(row.orderItemId, event.target.value)}
                                                className="mt-1 h-10 bg-white text-end text-base font-semibold"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3 rounded-md bg-amber-50 px-3 py-2">
                                            <span className="min-w-0 text-slate-700">{isArabic ? "الخصم بعد الحفظ" : "Discount after save"}</span>
                                            <span className="shrink-0 font-mono font-semibold text-amber-950">
                                                {nextDiscount == null ? "-" : formatCurrency(nextDiscount, currency)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>}

                    <div className="flex">
                        <Button
                            type="button"
                            disabled={!canSave}
                            onClick={saveAdjustment}
                            className="w-full gap-2 sm:w-auto"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? (isArabic ? "جار الحفظ..." : "Saving...") : (isArabic ? "حفظ التعديل" : "Save Adjustment")}
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
