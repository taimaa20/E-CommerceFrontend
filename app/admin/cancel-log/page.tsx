"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "@/components/locale-provider";
import { getCancelLog, CancelLogEntry } from "@/lib/api";
import { getCancellationStatusLabel } from "@/lib/cancellation-i18n";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/auth";
import { isAdminRole } from "@/lib/authorization";
import { Ban, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatOrderSequence } from "@/lib/order-sequence";
import { useSettingsStore } from "@/store/settingsStore";
import {
    addCalendarDays,
    formatRestaurantDateTime,
    getRestaurantToday,
} from "@/lib/date-time";

type DatePreset = "today" | "week" | "month" | "custom";

function todayRange(timeZone: string) {
    const today = getRestaurantToday(timeZone);
    return { dateFrom: today, dateTo: today };
}

function weekRange(timeZone: string) {
    const today = getRestaurantToday(timeZone);
    return { dateFrom: addCalendarDays(today, -6), dateTo: today };
}

function monthRange(timeZone: string) {
    const today = getRestaurantToday(timeZone);
    return { dateFrom: `${today.slice(0, 8)}01`, dateTo: today };
}

export default function CancelLogPage() {
    const { t, locale } = useLocale();
    const { user } = useAuthStore();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);
    const isRtl = locale === "ar";

    const allowedRoles = [UserRole.Admin, UserRole.SuperAdmin, UserRole.Waiter, UserRole.Cashier];
    if (!user || !allowedRoles.includes(user.role as UserRole)) {
        return (
            <div className="flex h-40 items-center justify-center text-slate-500">
                {t("anErrorOccurred")}
            </div>
        );
    }

    const [entries, setEntries] = useState<CancelLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 50;

    const [datePreset, setDatePreset] = useState<DatePreset>("today");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo]     = useState("");
    const [loading, setLoading]       = useState(false);

    const getDateRange = useCallback(() => {
        if (datePreset === "today")  return todayRange(timeZone);
        if (datePreset === "week")   return weekRange(timeZone);
        if (datePreset === "month")  return monthRange(timeZone);
        return { dateFrom: customFrom, dateTo: customTo };
    }, [datePreset, customFrom, customTo, timeZone]);

    useEffect(() => {
        const { dateFrom, dateTo } = getDateRange();
        setLoading(true);
        getCancelLog({ dateFrom, dateTo, page, limit })
            .then((r) => { setEntries(r.data); setTotal(r.total); })
            .finally(() => setLoading(false));
    }, [datePreset, customFrom, customTo, page, getDateRange]);

    useEffect(() => { setPage(1); }, [datePreset, customFrom, customTo]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const roleBadge = (role: string) => {
        const label = role === "Cashier" ? t("roleCashier") : t("roleWaiter");
        const cls   = role === "Cashier"
            ? "bg-blue-100 text-blue-700"
            : "bg-emerald-100 text-emerald-700";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
    };

    const reasonLabel = (row: CancelLogEntry) => {
        // Prefer the server-resolved label (handles tenant-defined custom reasons too).
        if (locale === "ar" && row.cancelReasonLabelAr) return row.cancelReasonLabelAr;
        if (row.cancelReasonLabel) return row.cancelReasonLabel;
        const map: Record<string, string> = {
            CLIENT_CHANGED_MIND: t("cancelOrderReasonClientChangedMind"),
            WRONG_ORDER_ENTERED: t("cancelOrderReasonWrongOrderEntered"),
            CLIENT_LEFT:         t("cancelOrderReasonClientLeft"),
            ALLERGY_CONCERN:     t("cancelOrderReasonAllergyConcern"),
            ITEM_UNAVAILABLE:    t("cancelOrderReasonItemUnavailable"),
            OTHER:               t("cancelOrderReasonOther"),
        };
        return map[row.cancelReasonCode] ?? row.cancelReasonCode;
    };

    const approvalBadge = (row: CancelLogEntry) => {
        const status = row.approvalStatus;
        if (!status) return <span className="text-slate-300">—</span>;
        const classes: Record<string, string> = {
            PendingKitchenApproval: "bg-amber-100 text-amber-700",
            PendingManagerApproval: "bg-amber-100 text-amber-700",
            ApprovedCancelled:      "bg-emerald-100 text-emerald-700",
            Waste:                  "bg-purple-100 text-purple-700",
            Refunded:               "bg-rose-100 text-rose-700",
            RefundedWaste:          "bg-purple-100 text-purple-700",
            Rejected:               "bg-rose-100 text-rose-700",
        };
        const cls = classes[status] ?? "bg-slate-100 text-slate-600";
        return (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
                {getCancellationStatusLabel(status, locale)}
            </span>
        );
    };

    return (
        <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("cancelLogPageTitle")}</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {isAdminRole(user.role)
                        ? t("wasteLogFilterAll")
                        : `${t("wasteLogColLoggedBy")}: ${user.username}`}
                </p>
            </div>

            {/* Date filters */}
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
                    <div className="flex overflow-x-auto rounded-lg border border-slate-200">
                        {(["today", "week", "month", "custom"] as DatePreset[]).map((p) => {
                            const labels: Record<DatePreset, string> = {
                                today: t("today"), week: t("thisWeek"), month: t("thisMonth"), custom: t("selectPeriod"),
                            };
                            return (
                                <button
                                    key={p}
                                    onClick={() => setDatePreset(p)}
                                    className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                                        datePreset === p ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {labels[p]}
                                </button>
                            );
                        })}
                    </div>
                    {datePreset === "custom" && (
                        <div className="flex items-center gap-2">
                            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                            <span className="text-slate-400">—</span>
                            <input type="date" value={customTo}   onChange={(e) => setCustomTo(e.target.value)}   className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex h-48 items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t("loadingText")}
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
                        <Ban className="h-8 w-8 opacity-30" />
                        <p className="text-sm">{t("noRecordsFound")}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 text-start">#</th>
                                    <th className="px-4 py-3 text-start">{t("cancelLogColOrderNum")}</th>
                                    <th className="px-4 py-3 text-start">{t("cancelLogColCancelledBy")}</th>
                                    <th className="px-4 py-3 text-start">{t("cancelLogColLevel")}</th>
                                    <th className="px-4 py-3 text-start">{t("cancelLogColReason")}</th>
                                    <th className="px-4 py-3 text-start">{locale === "ar" ? "الحالة" : "Status"}</th>
                                    <th className="px-4 py-3 text-start">{t("cancelLogColOrderTime")}</th>
                                    <th className="px-4 py-3 text-start">{t("cancelLogColCancelledAt")}</th>
                                    <th className="px-4 py-3 text-start">{t("cancelLogColWaste")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entries.map((row, idx) => {
                                    const itemDisplayName = locale === "ar"
                                        ? (row.itemNameAr || row.itemName)
                                        : (row.itemName || row.itemNameAr);
                                    const itemDisplayDir = locale === "ar" && row.itemNameAr ? "rtl" : "auto";
                                    const isItemLevel = row.isFullOrder === false || !!row.orderItemId || !!itemDisplayName;
                                    return (
                                    <tr key={row.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-500">{(page - 1) * limit + idx + 1}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-blue-600">
                                            {formatOrderSequence(row) ?? row.orderNumber ?? row.orderId.slice(-8).toUpperCase()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-slate-800">{row.cancelledByName}</span>
                                                {roleBadge(row.cancelledByRole)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {isItemLevel ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-slate-600">{t("cancelLogItemLevel")}</span>
                                                    {itemDisplayName && (
                                                        <span className="text-xs text-slate-500 whitespace-normal break-words" dir={itemDisplayDir} title={itemDisplayName}>
                                                            {itemDisplayName}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">{t("cancelLogFullOrder")}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-700">{reasonLabel(row)}</span>
                                            {row.cancelReasonNote && (
                                                <p className="mt-0.5 text-xs text-slate-400 max-w-[180px] truncate" title={row.cancelReasonNote}>
                                                    {row.cancelReasonNote}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                {approvalBadge(row)}
                                                {row.kitchenDecisionByName && (
                                                    <span className="text-[10px] text-slate-400 max-w-[140px] truncate" title={row.kitchenDecisionByName}>
                                                        {row.kitchenDecisionByName}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                            {formatRestaurantDateTime(row.orderTime, timeZone, locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                            {formatRestaurantDateTime(row.cancelledAt, timeZone, locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.hasWaste
                                                ? <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">{t("cancelLogWasteYes")}</span>
                                                : <span className="text-slate-300">{t("cancelLogWasteNo")}</span>}
                                        </td>
                                    </tr>
                                );})}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {total > limit && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
                        <p className="text-sm text-slate-500">
                            {t("pageOf")} {page} {t("of")} {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                                <ChevronLeft className="rtl:-scale-x-100 h-4 w-4" />
                            </button>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                                <ChevronRight className="rtl:-scale-x-100 h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
