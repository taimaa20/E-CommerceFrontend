"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarRange, X, SlidersHorizontal } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { useDashboardFilterStore } from "@/store/dashboardFilterStore";
import { dashboardApi } from "@/lib/dashboard/dashboard-api";
import type {
    DashboardFilter,
    DashboardFilterOptions,
    DashboardFilterPreset,
    DashboardScope,
} from "@/lib/dashboard/filter-types";
import { DEFAULT_PRESET_BY_SCOPE } from "@/lib/dashboard/filter-types";
import { cn } from "@/lib/utils";
import {
    addCalendarDays,
    getRestaurantDateInputValue,
    parseUtcInstant,
    startOfRestaurantDayUtc,
} from "@/lib/date-time";

interface FilterBarProps {
    scope: DashboardScope;
    showCashier?: boolean;
    showPaymentMethod?: boolean;
    showCategory?: boolean;
    showOrderType?: boolean;
}

const QUICK_PRESETS: DashboardFilterPreset[] = ["Today", "Yesterday", "ThisWeek", "ThisMonth"];
const ALL_PRESETS:   DashboardFilterPreset[] = [
    "Today", "Yesterday", "ThisWeek", "ThisMonth", "LastMonth",
    "ThisQuarter", "ThisYear", "Last7", "Last30", "Custom",
];

const PRESET_LABEL_EN: Record<DashboardFilterPreset, string> = {
    Default: "Default", Today: "Today", Yesterday: "Yesterday",
    ThisWeek: "This week", ThisMonth: "This month", LastMonth: "Last month",
    ThisQuarter: "This quarter", ThisYear: "This year",
    Last7: "Last 7 days", Last30: "Last 30 days", Custom: "Custom range",
};
const PRESET_LABEL_AR: Record<DashboardFilterPreset, string> = {
    Default: "افتراضي", Today: "اليوم", Yesterday: "أمس",
    ThisWeek: "هذا الأسبوع", ThisMonth: "هذا الشهر", LastMonth: "الشهر الماضي",
    ThisQuarter: "هذا الربع", ThisYear: "هذه السنة",
    Last7: "آخر ٧ أيام", Last30: "آخر ٣٠ يوماً", Custom: "نطاق مخصص",
};

export function DashboardFilterBar({
    scope,
    showCashier = true,
    showPaymentMethod = true,
    showCategory = false,
    showOrderType = true,
}: FilterBarProps) {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const presetLabel = ar ? PRESET_LABEL_AR : PRESET_LABEL_EN;

    const filter = useDashboardFilterStore((s) => s.filters[scope]);
    const setFilter = useDashboardFilterStore((s) => s.setFilter);
    const reset = useDashboardFilterStore((s) => s.reset);

    const [options, setOptions] = React.useState<DashboardFilterOptions | null>(null);
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        dashboardApi.getFilterOptions()
            .then((o) => { if (!cancelled) setOptions(o); })
            .catch(() => { /* options are optional */ });
        return () => { cancelled = true; };
    }, []);

    const effectivePreset = filter.preset === "Default" ? DEFAULT_PRESET_BY_SCOPE[scope] : filter.preset;
    const update = (patch: Partial<DashboardFilter>) =>
        setFilter(scope, { ...filter, ...patch });

    const isCustom = effectivePreset === "Custom";
    const hasAdvancedActive =
        !!filter.cashierId || !!filter.paymentMethod || !!filter.categoryId ||
        filter.orderType === 0 || filter.orderType === 1 || filter.orderType === 2;

    return (
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm shadow-sm">
            {/* Row 1 — preset chips + date inputs + advanced toggle */}
            <div className="flex flex-wrap items-center gap-2 p-3">
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5">
                    {QUICK_PRESETS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => update({ preset: p, startUtc: null, endUtc: null })}
                            className={cn(
                                "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                                effectivePreset === p
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                            )}
                        >
                            {presetLabel[p]}
                        </button>
                    ))}
                </div>

                <Select
                    value={effectivePreset}
                    onValueChange={(v) => update({ preset: v as DashboardFilterPreset, startUtc: null, endUtc: null })}
                >
                    <SelectTrigger className="h-8 w-[10.5rem] gap-1.5 text-xs">
                        <CalendarRange className="h-3.5 w-3.5 text-slate-500" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {ALL_PRESETS.map((p) => (
                            <SelectItem key={p} value={p} className="text-xs">{presetLabel[p]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {isCustom && (
                    <div className="flex items-center gap-1.5">
                        <Input
                            type="date"
                            className="h-8 w-[8.5rem] text-xs"
                            value={filter.startUtc
                                ? getRestaurantDateInputValue(filter.startUtc, filter.timeZone ?? "Asia/Qatar")
                                : ""}
                            onChange={(e) => update({
                                startUtc: e.target.value
                                    ? startOfRestaurantDayUtc(e.target.value, filter.timeZone ?? "Asia/Qatar")
                                    : null,
                            })}
                        />
                        <span className="text-xs text-slate-400">—</span>
                        <Input
                            type="date"
                            className="h-8 w-[8.5rem] text-xs"
                            value={filter.endUtc
                                ? getRestaurantDateInputValue(
                                    new Date(parseUtcInstant(filter.endUtc).getTime() - 1),
                                    filter.timeZone ?? "Asia/Qatar",
                                )
                                : ""}
                            onChange={(e) => update({
                                endUtc: e.target.value
                                    ? startOfRestaurantDayUtc(
                                        addCalendarDays(e.target.value, 1),
                                        filter.timeZone ?? "Asia/Qatar",
                                    )
                                    : null,
                            })}
                        />
                    </div>
                )}

                <div className="ms-auto flex items-center gap-1.5">
                    <Button
                        variant={showAdvanced || hasAdvancedActive ? "default" : "outline"}
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => setShowAdvanced((v) => !v)}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span className="text-xs">{ar ? "فلاتر متقدمة" : "Filters"}</span>
                        {hasAdvancedActive && (
                            <span className="ms-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
                                {[filter.cashierId, filter.paymentMethod, filter.categoryId, filter.orderType !== null && filter.orderType !== undefined ? 1 : null].filter(Boolean).length}
                            </span>
                        )}
                    </Button>
                    {hasAdvancedActive && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => reset(scope)} title={ar ? "إعادة تعيين" : "Reset"}>
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Row 2 — advanced filters, only when toggled */}
            {showAdvanced && (
                <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 dark:border-slate-800/60 p-3">
                    {showCashier && (
                        <FieldLabel label={ar ? "الكاشير" : "Cashier"}>
                            <Select
                                value={filter.cashierId ?? "all"}
                                onValueChange={(v) => update({ cashierId: v === "all" ? null : v })}
                            >
                                <SelectTrigger className="h-8 w-[10.5rem] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">{ar ? "الكل" : "All"}</SelectItem>
                                    {options?.cashiers?.map((c) => (
                                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FieldLabel>
                    )}

                    {showCategory && (
                        <FieldLabel label={ar ? "الفئة" : "Category"}>
                            <Select
                                value={filter.categoryId ?? "all"}
                                onValueChange={(v) => update({ categoryId: v === "all" ? null : v })}
                            >
                                <SelectTrigger className="h-8 w-[10.5rem] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">{ar ? "كل الفئات" : "All categories"}</SelectItem>
                                    {options?.categories?.map((c) => (
                                        <SelectItem key={c.id} value={c.id} className="text-xs">{ar ? (c.nameAr ?? c.name) : c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FieldLabel>
                    )}

                    {showPaymentMethod && (
                        <FieldLabel label={ar ? "طريقة الدفع" : "Payment"}>
                            <Select
                                value={filter.paymentMethod ?? "all"}
                                onValueChange={(v) => update({ paymentMethod: v === "all" ? null : v })}
                            >
                                <SelectTrigger className="h-8 w-[9rem] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">{ar ? "الكل" : "All"}</SelectItem>
                                    {options?.paymentMethods?.map((m) => (
                                        <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FieldLabel>
                    )}

                    {showOrderType && (
                        <FieldLabel label={ar ? "نوع الطلب" : "Order type"}>
                            <Select
                                value={filter.orderType === 0 ? "dinein" : filter.orderType === 1 ? "takeaway" : filter.orderType === 2 ? "delivery" : "all"}
                                onValueChange={(v) => update({ orderType: v === "all" ? null : v === "dinein" ? 0 : v === "takeaway" ? 1 : 2 })}
                            >
                                <SelectTrigger className="h-8 w-[9rem] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all"      className="text-xs">{ar ? "الكل" : "All"}</SelectItem>
                                    <SelectItem value="dinein"   className="text-xs">{ar ? "داخل المتجر" : "In-store"}</SelectItem>
                                    <SelectItem value="takeaway" className="text-xs">{ar ? "استلام" : "Pickup"}</SelectItem>
                                    <SelectItem value="delivery" className="text-xs">{ar ? "توصيل" : "Delivery"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </FieldLabel>
                    )}
                </div>
            )}
        </div>
    );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            {children}
        </label>
    );
}
