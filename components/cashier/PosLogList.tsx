"use client";

import { AlertCircle, Ban, Clock, Loader2, Trash2 } from "lucide-react";
import type { PosLogEntry } from "@/lib/api";
import { useLocale } from "@/components/locale-provider";
import { formatOrderSequence } from "@/lib/order-sequence";
import { useSettingsStore } from "@/store/settingsStore";
import { formatRestaurantDateTime } from "@/lib/date-time";

interface PosLogListProps {
    logs: PosLogEntry[];
    loading: boolean;
    error: string | null;
    currency: string;
}

function formatQuantity(quantity: number): string {
    return quantity.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    });
}

function formatAmount(amount: number, currency: string): string {
    return `${currency} ${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function PosLogList({ logs, loading, error, currency }: PosLogListProps) {
    const { t, locale } = useLocale();
    const dateLocale = locale === "ar" ? "ar-SA" : "en-US";
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);

    if (loading) {
        return (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-[#E4E6EA] bg-white text-[#6B7280]">
                <Loader2 className="me-2 h-5 w-5 animate-spin" />
                {t("loadingText")}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-medium text-orange-700">
                <AlertCircle className="me-2 h-5 w-5" />
                {error}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E4E6EA] bg-white p-12 text-[#9CA3AF]">
                <Clock className="mb-4 h-12 w-12 text-[#E4E6EA]" />
                <p className="text-lg font-medium text-[#6B7280]">{t("cashierLogsEmpty")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {logs.map((log) => {
                const isWaste = log.type === "WASTE";
                const badgeClass = isWaste
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-orange-50 text-orange-700 border-orange-200";
                const Icon = isWaste ? Trash2 : Ban;

                return (
                    <article
                        key={`${log.type}-${log.id}`}
                        className="rounded-xl border border-[#E4E6EA] bg-white px-4 py-3 shadow-sm"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${badgeClass}`}>
                                        <Icon className="h-3.5 w-3.5" />
                                        {isWaste ? t("cashierLogWaste") : t("cashierLogCancelled")}
                                    </span>
                                    {(formatOrderSequence(log) ?? log.orderNumber) ? (
                                        <span className="text-sm font-mono font-semibold text-[#111827]">
                                            {formatOrderSequence(log) ?? `#${log.orderNumber}`}
                                        </span>
                                    ) : null}
                                    {log.shiftNumber ? (
                                        <span className="text-xs font-medium text-[#6B7280]">
                                            {t("cashierLogShift")} {log.shiftNumber}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-2 truncate text-base font-semibold text-[#111827]">
                                    {log.itemName || t("cashierLogUnknownItem")}
                                </p>
                                <p className="mt-1 text-sm text-[#6B7280]">
                                    {t("cashierLogReason")}: {log.reason}
                                </p>
                            </div>
                            <div className="text-end">
                                <p className="text-base font-bold text-[#111827]">
                                    {formatAmount(log.amount, currency)}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                                    {t("cashierLogQty")} {formatQuantity(log.quantity)}
                                </p>
                                <p className="mt-1 text-xs text-[#6B7280]">
                                    {formatRestaurantDateTime(log.createdAt, timeZone, dateLocale, {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                    })}
                                </p>
                            </div>
                        </div>
                        {log.actorName ? (
                            <p className="mt-2 text-xs font-medium text-[#9CA3AF]">
                                {t("cashierLogBy")} {log.actorName}
                            </p>
                        ) : null}
                    </article>
                );
            })}
        </div>
    );
}
