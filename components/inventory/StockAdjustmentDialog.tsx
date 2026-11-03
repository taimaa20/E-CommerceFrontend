"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/locale-provider";
import { getRequestErrorMessage, isNetworkRequestError } from "@/lib/api";
import { retailStockAdjustmentApi } from "@/lib/api-retail";
import { generateUUID } from "@/lib/uuid";
import type { RetailProductDto } from "@/types/retail";

/** 409 status slug the server sends when the shelf figure moved after the dialog opened. */
const STOCK_CHANGED = "stock_changed";
/** Mirrors the server's reason limit (the movement's Notes column). */
const REASON_MAX_LENGTH = 300;

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
    // One id per intended adjustment. It survives a failed send, so retrying after a dropped
    // connection can never post twice, and is replaced whenever what is being asked changes.
    const [requestKey, setRequestKey] = useState(generateUUID);

    const productId = product?.productId;
    const seenStock = product?.stockOnHand;

    // Reset the form only when a different product opens. A refresh of the same product
    // (after a stale-stock conflict) must keep what the operator typed.
    useEffect(() => {
        setNewStock(seenStock === undefined ? "" : String(seenStock));
        setReason("");
        setError("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId]);

    useEffect(() => {
        setRequestKey(generateUUID());
    }, [productId, seenStock]);

    const parsed = Number.parseFloat(newStock);
    const delta = product && Number.isFinite(parsed) ? parsed - product.stockOnHand : null;

    const editNewStock = (value: string) => {
        setNewStock(value);
        setRequestKey(generateUUID());
        setError("");
    };

    const editReason = (value: string) => {
        setReason(value);
        setRequestKey(generateUUID());
        setError("");
    };

    const describeFailure = (adjustError: unknown) => {
        const response = (adjustError as { response?: { data?: unknown; status?: number } })?.response;
        const status = (response?.data as { status?: string } | null)?.status;

        if (isNetworkRequestError(adjustError))
            return ar
                ? "تعذّر الاتصال بالخادم. أعد المحاولة — لن تُسجَّل التسوية مرتين."
                : "Could not reach the server. Retry — the adjustment will not be posted twice.";
        if (response?.status === 403)
            return ar ? "تعديل المخزون يتطلب صلاحية Admin أو SuperAdmin." : "Adjusting stock requires Admin or SuperAdmin.";
        if (response?.status === 401)
            return ar ? "انتهت الجلسة. سجّل الدخول مجددًا." : "Your session has expired. Sign in again.";
        if (status === STOCK_CHANGED)
            return ar
                ? "تغيّر المخزون منذ فتح النافذة. تم تحديث المخزون الحالي — راجع الكمية ثم أعد الحفظ."
                : "Stock changed since you opened this. Current stock has been refreshed — review the quantity and save again.";
        return getRequestErrorMessage(adjustError, ar ? "تعذّر تعديل المخزون" : "Could not adjust stock");
    };

    const submit = async () => {
        if (!product || saving) return;
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
                expectedOnHand: product.stockOnHand,
                idempotencyKey: requestKey,
            });
            const onHand = result?.stockOnHand ?? result?.newStock ?? parsed;

            if (result && result.delta === 0) {
                toast.info(ar ? "المخزون مطابق بالفعل — لم تُسجَّل حركة." : "Stock already matched — nothing posted.");
            } else {
                toast.success(ar ? `تم تعديل المخزون إلى ${onHand}` : `Stock adjusted to ${onHand}`);
            }
            onAdjusted();
            onClose();
        } catch (adjustError) {
            setError(describeFailure(adjustError));
            const status = ((adjustError as { response?: { data?: { status?: string } } })?.response?.data)?.status;
            // Pull the current figure so the dialog shows what the shelf now holds.
            if (status === STOCK_CHANGED) onAdjusted();
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
                            onChange={(event) => editNewStock(event.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>
                            {ar ? "السبب" : "Reason"} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={reason}
                            maxLength={REASON_MAX_LENGTH}
                            onChange={(event) => editReason(event.target.value)}
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
