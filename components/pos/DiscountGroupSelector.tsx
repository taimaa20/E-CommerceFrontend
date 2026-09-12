"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { discountGroupsApi, DiscountValueType, type DiscountGroupOption } from "@/lib/api-discount-groups";
import { useLocale } from "@/components/locale-provider";
import { useSettingsStore } from "@/store/settingsStore";
import { formatCurrency } from "@/lib/currencies";

const NONE_VALUE = "_none";

interface DiscountGroupSelectorProps {
    value: DiscountGroupOption | null;
    onChange: (group: DiscountGroupOption | null) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Affiliation discount-group picker for the order screen. Loads active groups once and lets
 * the cashier pick one (or None). Purely a selection surface — the backend re-resolves the
 * authoritative percentage from the chosen group's Id at order creation.
 */
export function DiscountGroupSelector({ value, onChange, disabled, className }: DiscountGroupSelectorProps) {
    const { t, isRtl } = useLocale();
    const currency = useSettingsStore((state) => state.settings.currency);
    const [groups, setGroups] = useState<DiscountGroupOption[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const list = await discountGroupsApi.active();
                if (!cancelled) setGroups(list);
            } catch {
                if (!cancelled) setGroups([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Hide the control entirely when there are no active groups to apply — keeps the order
    // screen clean for tenants that never configured any.
    if (!loading && groups.length === 0 && !value) return null;

    const groupLabel = (g: DiscountGroupOption) => {
        const name = isRtl && g.nameAr ? g.nameAr : g.name;
        const val = g.discountType === DiscountValueType.FixedAmount
            ? formatCurrency(g.discountValue, currency)
            : `${g.discountValue}%`;
        return `${name} — ${val}`;
    };

    return (
        <div className={className}>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Tag className="size-3.5" />
                {t("discountGroup")}
            </label>
            <Select
                value={value?.id ?? NONE_VALUE}
                disabled={disabled}
                onValueChange={(v) => onChange(v === NONE_VALUE ? null : groups.find((g) => g.id === v) ?? null)}
            >
                <SelectTrigger className="h-9 w-full bg-white text-sm dark:bg-slate-900">
                    <SelectValue placeholder={t("discountGroupNone")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NONE_VALUE}>{t("discountGroupNone")}</SelectItem>
                    {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{groupLabel(g)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {value?.verificationNote && (
                <p className="mt-1 text-[11px] text-muted-foreground">{value.verificationNote}</p>
            )}
        </div>
    );
}
