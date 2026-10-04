"use client";

import { useEffect, useState } from "react";
import { quotePublicOrder, type StorefrontQuote, type StorefrontQuoteLine } from "@/lib/api";
import { getCustomerAccessToken } from "@/lib/api-customer-account";
import type { CartItem } from "@/store/cartStore";

const QUOTE_DEBOUNCE_MS = 350;

export type QuoteStatus = "idle" | "loading" | "error";

/** The cart as the server needs it to price: lines and quantities, never prices. */
export function toQuoteLines(items: CartItem[]): StorefrontQuoteLine[] {
    return items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        offerLineId: item.offerLineId,
        selectedOptionId: item.selectedOptionId,
        modifiers: (item.modifiers ?? []).map(modifier => ({ modifierId: modifier.modifierId, quantity: modifier.quantity ?? 1 })),
    }));
}

export const normalizePromoCode = (code: string) => code.trim().toUpperCase();

interface Args {
    enabled: boolean;
    /** Guest checkout prices the cart anonymously; everyone else is quoted as their account. */
    asGuest?: boolean;
    branchId?: string | null;
    items: CartItem[];
    orderType: number;
    deliveryZoneId?: string;
}

interface QuoteResult {
    key: string;
    quote: StorefrontQuote | null;
    failed: boolean;
}

/**
 * Keeps a server-priced quote of the cart in step with every change that affects price —
 * lines, quantities, fulfilment, delivery area and the promo code. A code is re-evaluated on
 * each change, so a code that stops qualifying (the cart dropped below its minimum) is shown
 * as no longer applied instead of lingering. Checkout re-validates independently regardless.
 */
export function useStorefrontQuote({ enabled, asGuest = false, branchId, items, orderType, deliveryZoneId }: Args) {
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [result, setResult] = useState<QuoteResult | null>(null);
    const lines = toQuoteLines(items);
    const active = enabled && !!branchId && lines.length > 0;
    // Everything that changes the price. A result is only trusted for the key it was fetched for.
    const requestKey = JSON.stringify({ branchId, lines, orderType, deliveryZoneId, appliedCode, refreshKey, asGuest });

    useEffect(() => {
        if (!active || !branchId) return;
        let cancelled = false;
        const { lines: requestLines } = JSON.parse(requestKey) as { lines: StorefrontQuoteLine[] };
        const timer = setTimeout(() => {
            void (async () => {
                try {
                    const token = asGuest ? undefined : await getCustomerAccessToken() ?? undefined;
                    if (!asGuest && !token) throw new Error("Signed out");
                    const quote = await quotePublicOrder({
                        orderType,
                        deliveryZoneId,
                        promoCode: appliedCode ?? undefined,
                        items: requestLines,
                    }, branchId, token);
                    if (!cancelled) setResult({ key: requestKey, quote, failed: false });
                } catch {
                    if (!cancelled) setResult({ key: requestKey, quote: null, failed: true });
                }
            })();
        }, QUOTE_DEBOUNCE_MS);
        return () => { cancelled = true; clearTimeout(timer); };
        // requestKey encodes lines, order type, delivery zone, code and refresh count.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, requestKey]);

    const current = active && result?.key === requestKey ? result : null;
    const status: QuoteStatus = !active ? "idle" : !current ? "loading" : current.failed ? "error" : "idle";
    const quote = current?.quote ?? null;
    const promo = appliedCode && quote?.promo?.code === appliedCode ? quote.promo : null;

    return {
        quote,
        status,
        appliedCode,
        promo,
        /** True only when the latest server quote accepted the code for the cart as it is now. */
        promoApplied: status === "idle" && !!promo?.isApplied,
        apply: (code: string) => setAppliedCode(normalizePromoCode(code) || null),
        remove: () => setAppliedCode(null),
        refresh: () => setRefreshKey(key => key + 1),
    };
}
