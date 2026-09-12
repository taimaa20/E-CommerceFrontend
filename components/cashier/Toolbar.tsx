"use client";

import type { ReactNode } from "react";
import { Search, ChevronDown, CalendarDays, LayoutList, Ban, Trash2, UserRound } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export type StatusFilter = "all" | "ready" | "served" | "paid";
export type TypeFilter = "all" | "dine" | "takeaway";
export type SortOption = "newest" | "oldest" | "highest" | "lowest";
export type DateFilter = "active" | "today" | "mine" | "week" | "month" | "all";
export type ActivityFilter = "orders" | "waste" | "cancelled";

interface ToolbarProps {
    // Counts for tab badges
    totalCount: number;
    readyCount: number;
    paidCount: number;
    filteredCount: number;

    // State
    statusFilter: StatusFilter;
    typeFilter: TypeFilter;
    tableFilter: string;
    sortBy: SortOption;
    query: string;
    tableOptions: string[];
    dateFilter: DateFilter;
    activityFilter: ActivityFilter;

    // Setters
    onStatusFilter: (v: StatusFilter) => void;
    onTypeFilter: (v: TypeFilter) => void;
    onTableFilter: (v: string) => void;
    onSortBy: (v: SortOption) => void;
    onQuery: (v: string) => void;
    onDateFilter: (v: DateFilter) => void;
    onActivityFilter: (v: ActivityFilter) => void;
}

export function Toolbar({
    totalCount, readyCount, paidCount, filteredCount,
    statusFilter, typeFilter, tableFilter, sortBy, query, tableOptions,
    dateFilter, activityFilter, onStatusFilter, onTypeFilter, onTableFilter, onSortBy, onQuery, onDateFilter, onActivityFilter,
}: ToolbarProps) {
    const { t, locale } = useLocale()
    const ar = locale === "ar"
    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Date filter toggle */}
            <div className="flex w-full flex-wrap items-center gap-1 rounded-xl border border-[#E4E6EA] bg-white p-1 sm:w-auto">
                <DateTab icon={<UserRound className="w-3.5 h-3.5" />} label={t("myOrdersFilter")} active={dateFilter === "mine"} onClick={() => onDateFilter("mine")} />
                <DateTab icon={<CalendarDays className="w-3.5 h-3.5" />} label={t("todayOrders")} active={dateFilter === "today"} onClick={() => onDateFilter("today")} />
                <DateTab icon={<LayoutList className="w-3.5 h-3.5" />} label={t("allOrdersFilter")} active={dateFilter === "all"} onClick={() => onDateFilter("all")} />
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-7 bg-[#E4E6EA]" aria-hidden="true" />

            <div className="flex w-full flex-wrap items-center gap-1 rounded-xl border border-[#E4E6EA] bg-white p-1 sm:w-auto">
                <button
                    onClick={() => onActivityFilter("orders")}
                    aria-pressed={activityFilter === "orders"}
                    className={`flex min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        activityFilter === "orders"
                            ? "bg-primary text-primary-foreground"
                            : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F5F7]"
                    }`}
                >
                    <LayoutList className="w-3.5 h-3.5" />
                    {t("allOrders")}
                </button>
                <button
                    onClick={() => onActivityFilter("waste")}
                    aria-pressed={activityFilter === "waste"}
                    className={`flex min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        activityFilter === "waste"
                            ? "bg-red-600 text-white"
                            : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F5F7]"
                    }`}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("cashierLogWaste")}
                </button>
                <button
                    onClick={() => onActivityFilter("cancelled")}
                    aria-pressed={activityFilter === "cancelled"}
                    className={`flex min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        activityFilter === "cancelled"
                            ? "bg-orange-500 text-white"
                            : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F5F7]"
                    }`}
                >
                    <Ban className="w-3.5 h-3.5" />
                    {t("cashierLogCancelled")}
                </button>
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-7 bg-[#E4E6EA]" aria-hidden="true" />

            {activityFilter === "orders" && (
                <>
                    {/* Status tabs */}
                    <div className="flex w-full flex-wrap items-center gap-1 rounded-xl border border-[#E4E6EA] bg-white p-1 sm:w-auto">
                        <StatusTab
                            label={t("allOrders")}
                            count={totalCount}
                            active={statusFilter === "all"}
                            activeClass="bg-primary text-primary-foreground"
                            onClick={() => onStatusFilter("all")}
                        />
                        <StatusTab
                            label={t("statusReady")}
                            count={readyCount}
                            active={statusFilter === "ready"}
                            activeClass="bg-primary text-primary-foreground"
                            onClick={() => onStatusFilter("ready")}
                        />
                        <StatusTab
                            label={t("statusPaid")}
                            count={paidCount}
                            active={statusFilter === "paid"}
                            activeClass="bg-primary text-primary-foreground"
                            onClick={() => onStatusFilter("paid")}
                        />
                    </div>

                    {/* Separator */}
                    <div className="hidden md:block w-px h-7 bg-[#E4E6EA]" aria-hidden="true" />

                    {/* Search */}
                    <div className="relative w-full md:w-[210px]">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
                        <input
                            type="text"
                            aria-label={t("searchCashierPlaceholder")}
                            value={query}
                            onChange={(e) => onQuery(e.target.value)}
                            placeholder={t("searchCashierPlaceholder")}
                            className="w-full ps-8 pe-3 py-2 text-sm bg-white border border-[#E4E6EA] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition text-[#111827] placeholder:text-[#9CA3AF]"
                        />
                    </div>

                    <SelectFilter
                        label={t("allTablesFilter")}
                        value={tableFilter}
                        onChange={onTableFilter}
                        options={[
                            { value: "all", label: t("allTablesFilter") },
                            ...tableOptions.map((tbl) => ({ value: tbl.toLowerCase(), label: tbl })),
                        ]}
                    />

                    <SelectFilter
                        label={t("filterAllTypes")}
                        value={typeFilter}
                        onChange={(v) => onTypeFilter(v as TypeFilter)}
                        options={[
                            { value: "all", label: t("filterAllTypes") },
                            { value: "dine", label: t("dineIn") },
                            { value: "takeaway", label: t("takeaway") },
                        ]}
                    />

                    <SelectFilter
                        label={t("newestFirst")}
                        value={sortBy}
                        onChange={(v) => onSortBy(v as SortOption)}
                        options={[
                            { value: "newest", label: t("newestFirst") },
                            { value: "oldest", label: t("oldestFirst") },
                            { value: "highest", label: t("highestAmount") },
                            { value: "lowest", label: t("lowestAmount") },
                        ]}
                    />
                </>
            )}

            {/* Results label pushed to right on desktop */}
            <span className="ms-auto text-xs text-[#9CA3AF] whitespace-nowrap">
                {(activityFilter === "orders" ? t("showingOrdersOf") : t("showingLogsOf"))
                    .replace("{count}", String(filteredCount))
                    .replace("{total}", String(totalCount))}
            </span>
        </div>
    );
}

/* ── sub-components ─────────────────────────────────────────────── */

interface DateTabProps {
    icon: ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

function DateTab({ icon, label, active, onClick }: DateTabProps) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className={`flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                active
                    ? "bg-primary text-primary-foreground"
                    : "text-[#6B7280] hover:bg-[#F4F5F7] hover:text-[#111827]"
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

interface StatusTabProps {
    label: string;
    count: number;
    active: boolean;
    activeClass: string;
    onClick: () => void;
}

function StatusTab({ label, count, active, activeClass, onClick }: StatusTabProps) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className={`flex min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                active ? activeClass : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F5F7]"
            }`}
        >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                active ? "bg-white/20 text-inherit" : "bg-[#F4F5F7] text-[#6B7280]"
            }`}>
                {count}
            </span>
        </button>
    );
}

interface SelectFilterProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}

function SelectFilter({ label, value, onChange, options }: SelectFilterProps) {
    return (
        <div className="relative w-full sm:w-auto">
            <select
                aria-label={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#E4E6EA] bg-white py-2 ps-3 pe-7 text-sm text-[#111827] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer sm:w-auto"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
        </div>
    );
}
