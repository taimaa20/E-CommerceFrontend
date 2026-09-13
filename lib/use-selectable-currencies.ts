"use client";

import { useEffect, useState } from "react";
import { currencyApi, type CurrencyLookup } from "@/lib/api-currencies";

/** One entry a currency picker may offer. */
export interface SelectableCurrency {
    code: string;
    /** The lookup's own display name, or the bare code when it does not resolve. */
    label: string;
    /**
     * True only for a value carried in from an existing record whose currency has since been
     * withdrawn from selection. Callers mark it so the user can see why it is there.
     */
    isInactive: boolean;
}

/**
 * The currencies a picker may offer, from the managed Currency lookup.
 *
 * `currentCode` is whatever the record being edited already carries. If the lookup no longer
 * offers it — the business deactivated that currency after the record was written — it is still
 * included, flagged inactive. A saved currency is historical fact: it must stay visible and
 * selectable on its own record, and must never be quietly swapped for an active one. New records
 * simply cannot choose it, which is what deactivation is for.
 *
 * Reads `activeOnly=true` once per mount, so no caller filters the list itself.
 */
export function useSelectableCurrencies(currentCode?: string | null): {
    options: SelectableCurrency[];
    loading: boolean;
} {
    const [active, setActive] = useState<CurrencyLookup[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        currencyApi.list(true)
            .then(rows => { if (!cancelled) setActive(rows); })
            // The lookup is unreachable. Offering a guessed list would be worse than offering
            // none: the record keeps the currency it already has, and the picker below still
            // represents that value rather than blanking itself.
            .catch(() => { if (!cancelled) setActive([]); })
        return () => { cancelled = true; };
    }, []);

    const code = (currentCode ?? "").trim().toUpperCase();
    const options: SelectableCurrency[] = (active ?? []).map(row => ({
        code: row.code,
        label: row.displayName || row.name,
        isInactive: false,
    }));

    if (code && !options.some(option => option.code === code)) {
        options.unshift({ code, label: code, isInactive: true });
    }

    return { options, loading: active === null };
}
