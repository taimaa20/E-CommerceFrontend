"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Tag, X } from "lucide-react";
import type { StorefrontQuotePromo } from "@/lib/api";
import type { QuoteStatus } from "@/components/showcase/checkout/useStorefrontQuote";

interface Props {
    appliedCode: string | null;
    promo: StorefrontQuotePromo | null;
    status: QuoteStatus;
    isAr: boolean;
    disabled?: boolean;
    format: (amount: number) => string;
    onApply: (code: string) => void;
    onRemove: () => void;
}

/**
 * Promo entry for the order summary. Every message shown here comes from the server's
 * evaluation of the current cart; the field itself decides nothing.
 */
export default function PromoCodeField({ appliedCode, promo, status, isAr, disabled, format, onApply, onRemove }: Props) {
    const [draft, setDraft] = useState("");
    const checking = status === "loading" && !!appliedCode;

    if (appliedCode) {
        const accepted = !!promo?.isApplied && !checking;
        return (
            <div className="mb-4">
                <div className={`flex items-center justify-between gap-2 rounded-[10px] border p-2.5 text-sm ${accepted ? "border-emerald-600/40 bg-emerald-600/5" : ""}`}>
                    <span className="flex min-w-0 items-center gap-2">
                        {checking ? <Loader2 className="size-4 shrink-0 animate-spin" /> : accepted
                            ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                            : <Tag className="size-4 shrink-0 text-muted-foreground" />}
                        <span className="truncate font-semibold" dir="ltr">{appliedCode}</span>
                        {accepted && promo && <span className="shrink-0 text-emerald-700">-{format(promo.discountAmount)}</span>}
                    </span>
                    <button type="button" disabled={disabled} onClick={() => { onRemove(); setDraft(""); }}
                        className="shrink-0 rounded p-1 hover:bg-muted" aria-label={isAr ? "إزالة الرمز" : "Remove code"}>
                        <X className="size-4" />
                    </button>
                </div>
                {!checking && promo && (
                    <p role={accepted ? "status" : "alert"} className={`mt-1.5 text-[13px] ${accepted ? "text-emerald-700" : "text-destructive"}`}>
                        {promo.message}
                    </p>
                )}
                {!checking && status === "error" && (
                    <p role="alert" className="mt-1.5 text-[13px] text-destructive">
                        {isAr ? "تعذر التحقق من الرمز. حاول مرة أخرى." : "We could not check this code. Try again."}
                    </p>
                )}
            </div>
        );
    }

    return (
        <form className="mb-4 flex gap-2" onSubmit={event => { event.preventDefault(); if (draft.trim()) onApply(draft); }}>
            <label htmlFor="sf-promo" className="sr-only">{isAr ? "رمز الخصم" : "Promo code"}</label>
            <input id="sf-promo" value={draft} maxLength={40} disabled={disabled} dir="ltr" autoComplete="off"
                onChange={event => setDraft(event.target.value)} className="sf-field min-w-0 flex-1 uppercase"
                placeholder={isAr ? "رمز الخصم" : "Promo code"} />
            <button type="submit" disabled={disabled || !draft.trim()} className="sf-btn sf-btn--outline shrink-0">
                {isAr ? "تطبيق" : "Apply"}
            </button>
        </form>
    );
}
