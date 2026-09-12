"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/locale-provider";
import { retailStockAdjustmentApi } from "@/lib/api-retail";
import type { RetailProductDto } from "@/types/retail";

/**
 * Manual correction of a finished product's stock.
 *
 * The operator types the quantity actually on the shelf; the difference is posted as one
 * adjustment movement with their reason against it. Nothing overwrites a balance, and
 * resubmitting the same figure posts nothing — the delta is zero.
 */
export function StockAdjustmentDialog({
    product,
    onClose,
    onAdjusted,
}: {
    product: RetailProductDto | null;
    onClose: () => void;
    onAdjusted: () => void;
}) {
    const { locale } = useLocale();
    const ar = locale === "ar";

    const [newStock, setNewStock] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setNewStock(product ? String(product.stockOnHand) : "");
        setReason("");
        setError("");
    }, [product]);

    const parsed = Number.parseFloat(newStock);
    const delta = product && Number.isFinite(parsed) ? parsed - product.stockOnHand : null;

    const submit = async () => {
        if (!product) return;
        if (!Number.isFinite(parsed) || parsed < 0) {
            setError(ar ? "أدخل كمية صالحة (صفر أو أكثر)" : "Enter a valid quantity (zero or more)");
            return;
        }
        if (!reason.trim()) {
            setError(ar ? "السبب مطلوب" : "A reason is required");
            return;
        }

        setSaving(true);
        setError("");
        try {
            const result = await retailStockAdjustmentApi.adjust(product.productId, {
                newStock: parsed,
                reason: reason.trim(),
            });

            if (result && result.delta === 0) {
                toast.info(ar ? "المخزون مطابق بالفعل — لم تُسجَّل حركة." : "Stock already matched — nothing posted.");
            } else {
                toast.success(
                    ar
                        ? `تم تعديل المخزون إلى ${result?.newStock ?? parsed}`
                        : `Stock adjusted to ${result?.newStock ?? parsed}`,
                );
            }
            onAdjusted();
            onClose();
        } catch (adjustError) {
            const data = (adjustError as { response?: { data?: unknown; status?: number } })?.response;
            const message =
                typeof data?.data === "string" ? data.data : (data?.data as { message?: string })?.message;
            setError(
                data?.status === 403
                    ? ar
                        ? "تعديل المخزون يتطلب صلاحية SuperAdmin."
                        : "Adjusting stock requires SuperAdmin."
                    : message ?? (ar ? "تعذّر تعديل المخزون" : "Could not adjust stock"),
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={product !== null} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{ar ? "تسوية المخزون" : "Adjust stock"}</DialogTitle>
                    <DialogDescription>
                        {product?.sku} — {product?.displayName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-lg border p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{ar ? "المخزون الحالي" : "Current stock"}</span>
                            <span className="font-medium tabular-nums">{product?.stockOnHand ?? 0}</span>
                        </div>
                        {delta !== null && delta !== 0 && (
                            <div className="mt-1 flex justify-between">
                                <span className="text-muted-foreground">{ar ? "الفرق" : "Difference"}</span>
                                <span
                                    className={`font-medium tabular-nums ${
                                        delta < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                                    }`}
                                >
                                    {delta > 0 ? `+${delta}` : delta}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label>
                            {ar ? "الكمية الفعلية على الرف" : "Actual quantity on the shelf"}{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            type="number"
                            min="0"
                            step="1"
                            value={newStock}
                            onChange={(event) => {
                                setNewStock(event.target.value);
                                setError("");
                            }}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>
                            {ar ? "السبب" : "Reason"} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={reason}
                            onChange={(event) => {
                                setReason(event.target.value);
                                setError("");
                            }}
                            placeholder={ar ? "مثال: جرد، كسر، فقد" : "e.g. stock count, breakage, shrinkage"}
                        />
                    </div>

                    {error && (
                        <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" /> {error}
                        </p>
                    )}

                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info className="mt-0.5 h-3 w-3 shrink-0" />
                        {ar
                            ? "يُسجَّل الفرق كحركة مخزون باسمك ووقتها. لا تُعدَّل أو تُحذف أي حركة سابقة."
                            : "The difference is posted as a stock movement stamped with your name and the time. No existing movement is edited or deleted."}
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        {ar ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button onClick={() => void submit()} disabled={saving}>
                        {saving ? (ar ? "جارٍ الحفظ…" : "Saving…") : ar ? "تسجيل التسوية" : "Post adjustment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
