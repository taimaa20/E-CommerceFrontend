"use client";

import { useRef, useState } from "react";
import { Clock3, Loader2, Minus, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { CustomerCancelOrderResult, OrderCancellationCapabilities } from "@/lib/api-customer-account";
import { generateUUID } from "@/lib/uuid";

export const MIN_CANCEL_REASON_LENGTH = 3;

const ORDER_CANCELLED_STATUS = "Cancelled";

type Translate = (en: string, ar: string) => string;
const translator = (isAr: boolean): Translate => (en, ar) => (isAr ? ar : en);

interface CancellationFailure {
    status?: number;
    code?: string;
}

/**
 * One idempotency key per deliberate request. A retry of the same choice reuses the key, so a
 * response lost on the way back is replayed by the server instead of cancelling again; a different
 * choice, or a new attempt after the server answered, gets a fresh key.
 */
export function useCancellationRequestKey() {
    const pending = useRef<{ fingerprint: string; key: string } | null>(null);
    return {
        keyFor(fingerprint: string): string {
            if (pending.current?.fingerprint !== fingerprint)
                pending.current = { fingerprint, key: generateUUID() };
            return pending.current.key;
        },
        settle() {
            pending.current = null;
        },
    };
}

/**
 * True when the server definitively answered the request — a business refusal or a bad request —
 * so the order should be re-read and any retry is a new decision. A 409 without a reason code is the
 * idempotency guard saying the first attempt is still in flight: keep the key and let the shopper retry.
 */
export function isSettledFailure(error: unknown): boolean {
    const failure = (error ?? {}) as CancellationFailure;
    if (typeof failure.status !== "number" || failure.status === 401) return false;
    if (failure.status === 409 && !failure.code) return false;
    return failure.status >= 400 && failure.status < 500;
}

/** The backend sends a reason code; the words are ours, so no enum or policy name reaches the shopper. */
export function cancellationFailureMessage(error: unknown, isAr: boolean): string {
    const t = translator(isAr);
    const failure = (error ?? {}) as CancellationFailure;

    switch (failure.code) {
        case "StatusNotAllowed":
            return t("This order can no longer be changed.", "لم يعد بالإمكان تعديل هذا الطلب.");
        case "WindowElapsed":
            return t("The cancellation period for this order has ended.", "انتهت مدة إلغاء هذا الطلب.");
        case "LineAlreadyCancelled":
            return t("This item has already been cancelled.", "تم إلغاء هذا العنصر بالفعل.");
        case "AlreadyCancelled":
            return t("This order has already been cancelled.", "تم إلغاء هذا الطلب بالفعل.");
        case "QuantityUnavailable":
        case "NothingLeftToCancel":
            return t(
                "That quantity is no longer available to cancel. Refresh the order and try again.",
                "لم تعد هذه الكمية متاحة للإلغاء. حدّث الطلب وحاول مرة أخرى.",
            );
        case "RequestPending":
            return t(
                "A cancellation request for this order is already being reviewed.",
                "هناك طلب إلغاء لهذا الطلب قيد المراجعة بالفعل.",
            );
        case "PaymentRecorded":
            return t("This order has already been paid. Contact us and we'll help.", "هذا الطلب مدفوع بالفعل. تواصل معنا وسنساعدك.");
        case "ActionDisabled":
        case "CustomerCancellationDisabled":
            return t(
                "Online cancellation isn't available for this order. Contact us and we'll help.",
                "الإلغاء عبر الإنترنت غير متاح لهذا الطلب. تواصل معنا وسنساعدك.",
            );
    }

    if (failure.status === 404)
        return t("We couldn't find this order. Refresh the page and try again.", "تعذر العثور على هذا الطلب. حدّث الصفحة وحاول مرة أخرى.");
    if (failure.status === 409)
        return t(
            "Your previous request is still being processed. Wait a moment, then try again.",
            "لا يزال طلبك السابق قيد المعالجة. انتظر قليلاً ثم حاول مرة أخرى.",
        );
    if (failure.status === 400)
        return t("Please check the details and try again.", "يرجى التحقق من التفاصيل والمحاولة مرة أخرى.");
    return t("We couldn't cancel this right now. Please try again.", "تعذر الإلغاء حالياً. حاول مرة أخرى.");
}

/**
 * Feedback once the backend accepted a cancellation. A paid order only raises a request, so the
 * shopper is never told something was cancelled before staff actually cancel it.
 */
export function announceCancellation(result: CustomerCancelOrderResult, isAr: boolean, units?: number) {
    const t = translator(isAr);
    if (result.requiresStaffApproval) {
        toast.success(t("Your cancellation request has been submitted for review.", "تم إرسال طلب الإلغاء للمراجعة."));
        return;
    }

    if (units === undefined) {
        toast.success(t("Your order has been cancelled.", "تم إلغاء طلبك."));
    } else {
        const cancelledUnits = units === 1 ? t("1 item cancelled.", "تم إلغاء عنصر واحد.") : t(`${units} items cancelled.`, `تم إلغاء ${units} عناصر.`);
        toast.success(result.status === ORDER_CANCELLED_STATUS
            ? `${cancelledUnits} ${t("Nothing is left on this order, so it is now cancelled.", "لم يتبقَّ شيء في هذا الطلب، لذا تم إلغاؤه.")}`
            : cancelledUnits);
    }

    if (result.promoWithdrawnReason) {
        toast.info(t(
            "Your promo code no longer applies to what is left of this order.",
            "لم يعد رمز الخصم ينطبق على ما تبقى من هذا الطلب.",
        ));
    }
}

/**
 * The unit counts this shopper may cancel off a line, read straight from the backend's two flags:
 * cancelling the whole line, and reducing it. Neither the status nor the policy is judged here.
 */
function cancellableQuantities(active: number, capabilities: OrderCancellationCapabilities): number[] {
    const upTo = capabilities.canCancelItems ? active : active - 1;
    const from = capabilities.canReduceQuantity ? 1 : active;
    return Array.from({ length: Math.max(0, upTo - from + 1) }, (_, index) => from + index);
}

/**
 * How much of a line is still live. A line is never hidden once cancelled: the shopper keeps seeing
 * what they ordered, with the cancelled part marked.
 */
export function OrderLineQuantity({
    quantity,
    cancelledQuantity,
    unitPrice,
    isAr,
}: {
    quantity: number;
    cancelledQuantity: number;
    /** Already formatted in the store's currency. */
    unitPrice: string;
    isAr: boolean;
}) {
    const t = translator(isAr);
    const ordered = quantity + cancelledQuantity;

    if (quantity <= 0) {
        return (
            <p className="sf-meta mt-0.5 flex flex-wrap items-center gap-2 tabular-nums">
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    {t("Cancelled", "ملغى")}
                </span>
                <span>{t(`Ordered ${ordered} · Cancelled ${cancelledQuantity}`, `المطلوب ${ordered} · الملغى ${cancelledQuantity}`)}</span>
            </p>
        );
    }

    return (
        <>
            <p className="sf-meta mt-0.5 tabular-nums">{quantity} × {unitPrice}</p>
            {cancelledQuantity > 0 && (
                <p className="sf-meta tabular-nums text-rose-700 dark:text-rose-300">
                    {t(
                        `Ordered ${ordered} · Active ${quantity} · Cancelled ${cancelledQuantity}`,
                        `المطلوب ${ordered} · النشط ${quantity} · الملغى ${cancelledQuantity}`,
                    )}
                </p>
            )}
        </>
    );
}

/**
 * "Cancel item" for one line, shared by the signed-in and guest order pages. Whether it appears and
 * which quantities it offers come from the backend's capabilities; the caller supplies the request,
 * so each page keeps its own proof of ownership and every rule stays on the server.
 */
export function OrderLineCancelControl({
    productName,
    unitPrice,
    activeQuantity,
    capabilities,
    pending,
    isAr,
    onConfirm,
    onSettled,
}: {
    productName: string;
    /** Already formatted in the store's currency. */
    unitPrice: string;
    activeQuantity: number;
    capabilities: OrderCancellationCapabilities;
    /** A request for this line is waiting for staff. */
    pending: boolean;
    isAr: boolean;
    onConfirm: (quantity: number, reason: string, idempotencyKey: string) => Promise<CustomerCancelOrderResult>;
    /** Re-read the order: after a cancellation, or after the server refused one. */
    onSettled: () => void;
}) {
    const t = translator(isAr);
    const requestKey = useCancellationRequestKey();
    const [open, setOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    if (pending) {
        return (
            <p className="sf-meta mt-1.5 flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <Clock3 className="size-3.5" />
                {t("Cancellation requested · under review", "تم طلب الإلغاء · قيد المراجعة")}
            </p>
        );
    }

    const choices = cancellableQuantities(activeQuantity, capabilities);
    if (choices.length === 0) return null;

    const min = choices[0];
    const max = choices[choices.length - 1];
    // A reload after a cancellation can leave a remembered count above what is left.
    const selected = Math.min(Math.max(quantity, min), max);
    const confirmLabel = selected === activeQuantity
        ? (activeQuantity === 1 ? t("Cancel item", "إلغاء العنصر") : t(`Cancel all ${activeQuantity}`, `إلغاء الكل (${activeQuantity})`))
        : (selected === 1 ? t("Cancel 1 item", "إلغاء عنصر واحد") : t(`Cancel ${selected} items`, `إلغاء ${selected} عناصر`));

    const close = () => {
        if (busy) return;
        setOpen(false);
        setReason("");
        setQuantity(1);
    };

    const submit = async () => {
        const trimmed = reason.trim();
        if (trimmed.length < MIN_CANCEL_REASON_LENGTH) {
            toast.error(t("Please tell us why in a few words.", "يرجى ذكر السبب بكلمات قليلة."));
            return;
        }

        setBusy(true);
        try {
            const result = await onConfirm(selected, trimmed, requestKey.keyFor(JSON.stringify([selected, trimmed])));
            requestKey.settle();
            announceCancellation(result, isAr, selected);
            setOpen(false);
            setReason("");
            setQuantity(1);
            onSettled();
        } catch (error: unknown) {
            toast.error(cancellationFailureMessage(error, isAr));
            if (isSettledFailure(error)) {
                // The server decided; drop the stale view rather than leave a button it will refuse again.
                requestKey.settle();
                setOpen(false);
                onSettled();
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="sf-btn sf-btn--quiet sf-btn--sm mt-1.5 -ms-2">
                <XCircle className="size-4" />
                {t("Cancel item", "إلغاء العنصر")}
            </button>

            <Dialog open={open} onOpenChange={next => { if (!next) close(); }}>
                <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
                    <DialogHeader>
                        <DialogTitle>{activeQuantity === 1 ? t("Cancel this item?", "إلغاء هذا العنصر؟") : t("Cancel item", "إلغاء عنصر")}</DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("Choose how many to cancel and tell us why.", "اختر الكمية المراد إلغاؤها وأخبرنا بالسبب.")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <p className="font-medium">{productName}</p>
                            {activeQuantity === 1 && <p className="sf-meta tabular-nums">1 × {unitPrice}</p>}
                        </div>

                        {choices.length > 1 ? (
                            <div>
                                <p className="text-sm font-medium">{t("How many would you like to cancel?", "كم عدد القطع التي تريد إلغاءها؟")}</p>
                                <div className="mt-2 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(min, selected - 1))}
                                        disabled={busy || selected <= min}
                                        aria-label={t("Cancel one fewer", "تقليل الكمية")}
                                        className="sf-btn sf-btn--outline sf-btn--sm size-9 p-0"
                                    >
                                        <Minus className="size-4" />
                                    </button>
                                    <span className="min-w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">{selected}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.min(max, selected + 1))}
                                        disabled={busy || selected >= max}
                                        aria-label={t("Cancel one more", "زيادة الكمية")}
                                        className="sf-btn sf-btn--outline sf-btn--sm size-9 p-0"
                                    >
                                        <Plus className="size-4" />
                                    </button>
                                </div>
                                <p className="sf-meta mt-2">
                                    {t(`You currently have ${activeQuantity} in this order.`, `لديك حالياً ${activeQuantity} في هذا الطلب.`)}
                                </p>
                            </div>
                        ) : activeQuantity > 1 && (
                            <p className="sf-meta">{t(`This cancels all ${activeQuantity}.`, `سيؤدي هذا إلى إلغاء الكمية كاملة (${activeQuantity}).`)}</p>
                        )}

                        <label className="block">
                            <span className="text-sm font-medium">{t("Why are you cancelling this item?", "لماذا تريد إلغاء هذا العنصر؟")}</span>
                            <input
                                value={reason}
                                onChange={event => setReason(event.target.value)}
                                maxLength={500}
                                disabled={busy}
                                className="sf-field mt-1"
                                placeholder={t("e.g. Changed my mind", "مثال: غيرت رأيي")}
                            />
                        </label>

                        {capabilities.requiresStaffApproval && (
                            <p className="sf-meta">
                                {t(
                                    "This order is already paid, so your request goes to our team for review before anything is cancelled.",
                                    "هذا الطلب مدفوع بالفعل، لذا يُرسل طلبك إلى فريقنا للمراجعة قبل إلغاء أي شيء.",
                                )}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <button type="button" onClick={close} disabled={busy} className="sf-btn sf-btn--outline">
                            {t("Keep item", "الاحتفاظ بالعنصر")}
                        </button>
                        <button type="button" onClick={submit} disabled={busy} className="sf-btn sf-btn--primary">
                            {busy && <Loader2 className="size-4 animate-spin" />}
                            {confirmLabel}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
