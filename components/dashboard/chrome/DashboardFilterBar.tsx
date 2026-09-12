"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Building2, Calendar, ChevronDown, User, DollarSign, ShoppingBag, Search, X, Globe2, Warehouse } from "lucide-react";
import { BranchFilter } from "@/components/filters/BranchFilter";
import { StandardFilter, type StandardFilterOption } from "@/components/filters/StandardFilter";
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
    showOrderType?: boolean;
    showPartner?: boolean;
    showOrderSource?: boolean;
    showWarehouse?: boolean;
    showSearch?: boolean;
    onSearch?: (q: string) => void;
}

const PRESETS_SEG: DashboardFilterPreset[] = ["Today", "ThisWeek", "ThisMonth", "ThisQuarter", "ThisYear"];

const SEG_LABEL_EN: Record<DashboardFilterPreset, string> = {
    Default: "—", Today: "Today", Yesterday: "Yesterday", ThisWeek: "Week",
    ThisMonth: "Month", LastMonth: "Last month", ThisQuarter: "Quarter",
    ThisYear: "YTD", Last7: "7d", Last30: "30d", Custom: "Custom",
};
const SEG_LABEL_AR: Record<DashboardFilterPreset, string> = {
    Default: "—", Today: "اليوم", Yesterday: "أمس", ThisWeek: "أسبوع",
    ThisMonth: "شهر", LastMonth: "الشهر الماضي", ThisQuarter: "ربع",
    ThisYear: "السنة", Last7: "٧ ي", Last30: "٣٠ ي", Custom: "مخصص",
};

/**
 * Restaurant-POS filter bar. Renders the design package's segmented preset
 * pill group + chip selectors + search + clear.
 */
export const DashboardFilterBar: React.FC<FilterBarProps> = ({
    scope,
    showCashier = true,
    showPaymentMethod = true,
    showOrderType = true,
    showPartner = false,
    showOrderSource = false,
    showWarehouse = false,
    showSearch = true,
    onSearch,
}) => {
    const { locale, t } = useLocale();
    const ar = locale === "ar";
    const seg = ar ? SEG_LABEL_AR : SEG_LABEL_EN;

    const filter = useDashboardFilterStore((s) => s.filters[scope]);
    const setFilter = useDashboardFilterStore((s) => s.setFilter);
    const reset = useDashboardFilterStore((s) => s.reset);

    const [options, setOptions] = React.useState<DashboardFilterOptions | null>(null);
    const [searchQ, setSearchQ] = React.useState("");
    const menuText = {
        searchPlaceholder: t("filterSearchPlaceholder"),
        emptyText: t("filterNoOptions"),
        loadingText: t("loadingText"),
        clearLabel: t("filterClear"),
    };

    React.useEffect(() => {
        let cancelled = false;
        dashboardApi.getFilterOptions()
            .then((o) => { if (!cancelled) setOptions(o); })
            .catch(() => { /* options are optional */ });
        return () => { cancelled = true; };
    }, []);

    const effectivePreset = filter.preset === "Default" ? DEFAULT_PRESET_BY_SCOPE[scope] : filter.preset;
    const update = (patch: Partial<DashboardFilter>) => setFilter(scope, { ...filter, ...patch });

    const hasActiveFilters =
        !!filter.branchId
        || !!filter.warehouseId
        || !!filter.cashierId || !!filter.paymentMethod || filter.orderType === 0 || filter.orderType === 1 || filter.orderType === 2
        || !!filter.partner || filter.orderSource === 0 || filter.orderSource === 1
        || filter.orderSource === 2 || filter.orderSource === 3
        || effectivePreset !== DEFAULT_PRESET_BY_SCOPE[scope];

    const cashierLabel = filter.cashierId
        ? employeeLabel(options?.cashiers?.find(c => c.id === filter.cashierId), ar)
        : t("allFilter");

    const paymentOptions = dedupePaymentOptions(options?.paymentMethodOptions ?? []);
    const paymentFilterIdentity = normalizeOptionIdentity(filter.paymentMethod ?? "");
    const paymentOption = paymentOptions.find(m => m.value === filter.paymentMethod)
        ?? paymentOptions.find(m =>
            normalizeOptionIdentity(m.value) === paymentFilterIdentity
            || normalizeOptionIdentity(m.name) === paymentFilterIdentity);
    const paymentLabel = paymentOption
        ? optionLabel(paymentOption, ar)
        : filter.paymentMethod || t("allFilter");
    const partnerOption = options?.partners?.find(p => p.value === filter.partner);
    const partnerLabel = partnerOption
        ? optionLabel(partnerOption, ar)
        : filter.partner || t("allFilter");
    const warehouseOptions = options?.warehouses ?? [];
    const warehouseOption = warehouseOptions.find(w => w.id === filter.warehouseId);
    const warehouseLabel = warehouseOption
        ? optionLabel({ name: warehouseOption.name, nameAr: warehouseOption.nameAr, isActive: warehouseOption.isActive }, ar)
        : t("dashboardAllWarehouses");
    const orderSourceLabel =
        filter.orderSource === 0 ? (ar ? "نقطة البيع" : "POS")
      : filter.orderSource === 1 ? (ar ? "طلبات" : "Talabat")
      : filter.orderSource === 2 ? t("deliveryPartnerFilter")
      : filter.orderSource === 3 ? (ar ? "تطبيق الجوال" : "Mobile")
      : t("allFilter");
    const orderTypeLabel =
        filter.orderType === 0 ? t("dineIn")
      : filter.orderType === 1 ? t("takeaway")
      : filter.orderType === 2 ? t("delivery")
      : t("allFilter");

    return (
        <div className="filterbar">
            {/* Quick preset segmented control */}
            <div className="seg">
                {PRESETS_SEG.map((p) => (
                    <button
                        key={p}
                        type="button"
                        className={effectivePreset === p ? "active" : ""}
                        onClick={() => update({ preset: p, startUtc: null, endUtc: null })}
                    >
                        {seg[p]}
                    </button>
                ))}
            </div>

            {/* Custom date chip — opens to a custom range; for now wires to a date input pair */}
            <CustomRangeChip
                label={
                    effectivePreset === "Custom"
                        ? `${filter.startUtc
                            ? getRestaurantDateInputValue(filter.startUtc, filter.timeZone ?? "Asia/Qatar")
                            : "—"} → ${filter.endUtc
                            ? getRestaurantDateInputValue(
                                new Date(parseUtcInstant(filter.endUtc).getTime() - 1),
                                filter.timeZone ?? "Asia/Qatar",
                            )
                            : "—"}`
                        : seg[effectivePreset]
                }
                start={filter.startUtc ?? null}
                end={filter.endUtc ?? null}
                timeZone={filter.timeZone ?? "Asia/Qatar"}
                onChange={(s, e) => update({ preset: "Custom", startUtc: s, endUtc: e })}
                title={t("dashboardCustomRange")}
                fromLabel={t("fromDateLabel")}
                toLabel={t("toDateLabel")}
                doneLabel={t("dashboardDone")}
            />

            <div className="chip-divider" />

            <BranchFilter
                value={filter.branchId ?? ""}
                onValueChange={(branchId) => update({ branchId: branchId || null })}
                label={t("branchFilterLabelShort")}
                triggerClassName="chip h-[30px] min-w-0 justify-start border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-[10px] text-[12.5px] shadow-none hover:bg-[var(--ds-bg-elev)]"
                contentClassName="min-w-72"
            />

            {showWarehouse && warehouseOptions.length > 1 && (
                <SelectChip
                    icon={<Warehouse />}
                    labelMuted={t("dashboardWarehouseLabel")}
                    labelStrong={warehouseLabel}
                    value={filter.warehouseId ?? ""}
                    options={[
                        { value: "", label: t("dashboardAllWarehouses") },
                        ...warehouseOptions.map(w => ({
                            value: w.id,
                            label: optionLabel({ name: w.name, nameAr: w.nameAr, isActive: w.isActive }, ar),
                        })),
                    ]}
                    onChange={(v) => update({ warehouseId: v || null })}
                    menuText={menuText}
                />
            )}

            {showCashier && (
                <SelectChip
                    icon={<User />}
                    labelMuted={t("dashboardCashierLabel")}
                    labelStrong={cashierLabel}
                    value={filter.cashierId ?? ""}
                    options={[
                        { value: "", label: t("allFilter") },
                        ...(options?.cashiers?.map(c => ({ value: c.id, label: employeeLabel(c, ar) })) ?? []),
                    ]}
                    onChange={(v) => update({ cashierId: v || null })}
                    menuText={menuText}
                />
            )}

            {showPaymentMethod && (
                <SelectChip
                    icon={<DollarSign />}
                    labelMuted={t("dashboardPaymentLabel")}
                    labelStrong={paymentLabel}
                    value={paymentOption?.value ?? filter.paymentMethod ?? ""}
                    options={[
                        { value: "", label: t("allFilter") },
                        ...(paymentOptions.length > 0 ? paymentOptions.map(m => ({
                            value: m.value,
                            label: optionLabel(m, ar),
                        })) : dedupeLegacyPaymentMethods(options?.paymentMethods ?? []).map(m => ({
                            value: m,
                            label: m,
                        }))),
                    ]}
                    onChange={(v) => update({ paymentMethod: v || null })}
                    menuText={menuText}
                />
            )}

            {showPartner && (
                <SelectChip
                    icon={<Building2 />}
                    labelMuted={t("dashboardPartnerLabel")}
                    labelStrong={partnerLabel}
                    value={filter.partner ?? ""}
                    options={[
                        { value: "", label: t("allFilter") },
                        ...(options?.partners?.map(p => ({
                            value: p.value,
                            label: optionLabel(p, ar),
                        })) ?? []),
                    ]}
                    onChange={(v) => update({ partner: v || null })}
                    menuText={menuText}
                />
            )}

            {showOrderSource && (
                <SelectChip
                    icon={<Globe2 />}
                    labelMuted={t("dashboardSourceLabel")}
                    labelStrong={orderSourceLabel}
                    value={filter.orderSource?.toString() ?? ""}
                    options={[
                        { value: "", label: t("allFilter") },
                        { value: "0", label: ar ? "نقطة البيع" : "POS" },
                        { value: "1", label: ar ? "طلبات" : "Talabat" },
                        { value: "2", label: t("deliveryPartnerFilter") },
                        { value: "3", label: ar ? "تطبيق الجوال" : "Mobile" },
                    ]}
                    onChange={(v) => update({
                        orderSource: v === "" ? null : Number(v) as 0 | 1 | 2 | 3,
                    })}
                    menuText={menuText}
                />
            )}

            {showOrderType && (
                <SelectChip
                    icon={<ShoppingBag />}
                    labelMuted={t("dashboardTypeLabel")}
                    labelStrong={orderTypeLabel}
                    value={filter.orderType?.toString() ?? ""}
                    options={[
                        { value: "", label: t("allFilter") },
                        { value: "0", label: t("dineIn") },
                        { value: "1", label: t("takeaway") },
                        { value: "2", label: t("delivery") },
                    ]}
                    onChange={(v) => update({ orderType: v === "" ? null : Number(v) as 0 | 1 | 2 })}
                    menuText={menuText}
                />
            )}

            <div style={{ flex: 1 }} />

            {showSearch && (
                <div className="search-wrap">
                    <Search />
                    <input
                        placeholder={t("dashboardSearchPlaceholder")}
                        value={searchQ}
                        onChange={(e) => {
                            setSearchQ(e.target.value);
                            onSearch?.(e.target.value);
                        }}
                    />
                </div>
            )}

            {hasActiveFilters && (
                <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: "var(--ds-text-muted)" }}
                    onClick={() => { reset(scope); setSearchQ(""); onSearch?.(""); }}
                >
                    <X size={12} />{t("filterClear")}
                </button>
            )}
        </div>
    );
};

/* ---------------- internal pieces ---------------- */

const SelectChip: React.FC<{
    icon: React.ReactElement;
    labelMuted: string;
    labelStrong: string;
    value: string;
    options: StandardFilterOption[];
    onChange: (v: string) => void;
    menuText: {
        searchPlaceholder: string;
        emptyText: string;
        loadingText: string;
        clearLabel: string;
    };
}> = ({ icon, labelMuted, labelStrong, value, options, onChange, menuText }) => (
    <StandardFilter
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
        options={options}
        icon={icon}
        label={labelMuted}
        placeholder={labelStrong}
        searchPlaceholder={menuText.searchPlaceholder}
        emptyText={menuText.emptyText}
        loadingText={menuText.loadingText}
        clearLabel={menuText.clearLabel}
        clearable={false}
        triggerClassName="chip h-[30px] min-w-0 justify-start border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-[10px] text-[12.5px] shadow-none hover:bg-[var(--ds-bg-elev)]"
        contentClassName="min-w-72"
    />
);

function employeeLabel(employee: { name: string; nameAr?: string | null } | undefined, ar: boolean) {
    if (!employee) return "—";
    return ar ? (employee.nameAr?.trim() || employee.name) : employee.name;
}

function optionLabel(
    option: { name: string; nameAr?: string | null; isActive: boolean },
    ar: boolean,
) {
    const name = ar ? (option.nameAr?.trim() || option.name) : option.name;
    if (option.isActive) return name;
    return ar ? `${name} (غير نشط)` : `${name} (Inactive)`;
}

function dedupePaymentOptions<T extends {
    value: string;
    name: string;
    isActive: boolean;
}>(options: T[]) {
    const unique = new Map<string, T>();
    for (const option of options) {
        const key = normalizeOptionIdentity(option.name) || normalizeOptionIdentity(option.value);
        const current = unique.get(key);
        if (!current || (!current.isActive && option.isActive)) unique.set(key, option);
    }
    return Array.from(unique.values());
}

function dedupeLegacyPaymentMethods(methods: string[]) {
    return Array.from(new Map(
        methods.map(method => [normalizeOptionIdentity(method), method]),
    ).values());
}

function normalizeOptionIdentity(value: string) {
    return value.normalize("NFKC").replace(/[\s\p{P}\p{S}]+/gu, "").toLocaleUpperCase();
}

const CustomRangeChip: React.FC<{
    label: string;
    start: string | null;
    end: string | null;
    timeZone: string;
    onChange: (s: string | null, e: string | null) => void;
    title: string;
    fromLabel: string;
    toLabel: string;
    doneLabel: string;
}> = ({ label, start, end, timeZone, onChange, title, fromLabel, toLabel, doneLabel }) => {
    const [open, setOpen] = React.useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const popoverRef = React.useRef<HTMLDivElement>(null);
    const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

    // Close on outside click + Escape
    React.useEffect(() => {
        if (!open) return;
        const onDoc = (ev: MouseEvent) => {
            if (
                !wrapperRef.current?.contains(ev.target as Node)
                && !popoverRef.current?.contains(ev.target as Node)
            ) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // Compute fixed-position coordinates so the popover floats above the sticky
    // topbar/filterbar instead of being clipped by the filterbar's overflow.
    React.useLayoutEffect(() => {
        if (!open || !wrapperRef.current) { setPos(null); return; }
        const rect = wrapperRef.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 6, left: rect.left });
    }, [open]);

    return (
        <>
            <div ref={wrapperRef} style={{ display: "inline-flex" }}>
                <button type="button" className="chip" onClick={() => setOpen(v => !v)}>
                    <Calendar />
                    <span className="label-strong">{label}</span>
                    <ChevronDown />
                </button>
            </div>

            {open && pos && typeof document !== "undefined" && createPortal(
                // Wrapped in .dash so CSS variables (--ds-bg-elev, --ds-text…)
                // resolve — portals mount outside the dashboard subtree where
                // those vars are defined, which is why the popover was
                // rendering with a transparent background.
                <div className="dash"
                    ref={popoverRef}
                    style={{
                        position: "fixed",
                        top: pos.top, left: pos.left,
                        background: "#ffffff",
                        border: "1px solid rgb(228, 228, 228)",
                        borderRadius: 12,
                        boxShadow: "0 12px 32px -8px rgba(0,0,0,0.18), 0 4px 12px -4px rgba(0,0,0,0.08)",
                        padding: 14, minWidth: 280, zIndex: 100,
                        display: "flex", flexDirection: "column", gap: 10,
                        fontFamily: "var(--ds-font-sans)", color: "var(--ds-text)",
                    }}
                >
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ds-text-muted)" }}>
                        {title}
                    </div>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>{fromLabel}</span>
                        <input
                            type="date" value={start ? getRestaurantDateInputValue(start, timeZone) : ""}
                            onChange={(e) => onChange(
                                e.target.value ? startOfRestaurantDayUtc(e.target.value, timeZone) : null,
                                end,
                            )}
                            style={{
                                height: 32, border: "1px solid var(--ds-border)",
                                borderRadius: 8, padding: "0 10px", fontSize: 12.5,
                                background: "var(--ds-bg-elev)", color: "var(--ds-text)",
                                outline: "none", width: "100%",
                                fontFamily: "var(--ds-font-sans)",
                            }}
                        />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>{toLabel}</span>
                        <input
                            type="date" value={end
                                ? getRestaurantDateInputValue(
                                    new Date(parseUtcInstant(end).getTime() - 1),
                                    timeZone,
                                )
                                : ""}
                            onChange={(e) => onChange(
                                start,
                                e.target.value
                                    ? startOfRestaurantDayUtc(addCalendarDays(e.target.value, 1), timeZone)
                                    : null,
                            )}
                            style={{
                                height: 32, border: "1px solid var(--ds-border)",
                                borderRadius: 8, padding: "0 10px", fontSize: 12.5,
                                background: "var(--ds-bg-elev)", color: "var(--ds-text)",
                                outline: "none", width: "100%",
                                fontFamily: "var(--ds-font-sans)",
                            }}
                        />
                    </label>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>{doneLabel}</button>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
};
