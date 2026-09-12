"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, Loader2, RotateCw, ShieldAlert, Trash2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/auth";
import { isAdminRole } from "@/lib/authorization";
import {
    clearConflictLog,
    deleteConflictLog,
    listConflictLog,
    type ActionType,
    type ConflictLogEntry,
    type ConflictType,
    type PendingAction,
} from "@/lib/offline/db";
import { useOfflineCashierStore } from "@/store/offlineCashierStore";
import { discardAction, retryAction, drainNow } from "@/lib/offline/queue";
import { getConnectivityState } from "@/lib/offline/connectivity";
import { toast } from "sonner";

/**
 * Admin — Escalated sync conflicts.
 *
 * IMPORTANT SCOPE NOTE
 * ────────────────────
 * Conflict logs are currently stored in the browser's IndexedDB on the device
 * that escalated them (see `lib/offline/db.ts::conflict_log`). There is no
 * backend sync yet, so this page only reflects what happened on THIS device.
 * Escalations created on another cashier's iPad are visible only on that iPad.
 *
 * The banner at the top tells managers this explicitly so no one assumes a
 * single admin tab shows every escalation across the branch. A future vertical
 * slice (Conflicts controller + service + DB table) would lift this into a
 * real cross-device view.
 */
export default function EscalationsPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const { user } = useAuthStore();

    const pending = useOfflineCashierStore((s) => s.pending);
    const [logs, setLogs] = useState<ConflictLogEntry[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | number | null>(null);

    const loadLogs = useCallback(async () => {
        try {
            const rows = await listConflictLog();
            setLogs(rows.sort((a, b) => b.createdAt - a.createdAt));
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    // Escalated pending actions — still in the queue, parked for a manager.
    const escalated = useMemo(
        () => pending.filter((a) => a.status === "escalated"),
        [pending]
    );

    // Gate access: Admin only. Other roles land on the same "access denied"
    // shape used elsewhere in /admin pages.
    if (!user || !isAdminRole(user.role)) {
        return (
            <div className="flex h-40 items-center justify-center text-slate-500">
                {isAr ? "غير مصرح" : "Access denied"}
            </div>
        );
    }

    const handleDismissLog = async (id: number | undefined) => {
        if (typeof id !== "number") return;
        setBusyId(id);
        try {
            await deleteConflictLog(id);
            await loadLogs();
            toast.success(isAr ? "تم الحذف" : "Entry removed");
        } catch {
            toast.error(isAr ? "فشل الحذف" : "Failed to remove");
        } finally {
            setBusyId(null);
        }
    };

    const handleClearAllLogs = async () => {
        if (!logs || logs.length === 0) return;
        const confirmed = window.confirm(
            isAr
                ? "هل أنت متأكد من مسح كل السجلات على هذا الجهاز؟"
                : "Clear all escalation history on this device?"
        );
        if (!confirmed) return;
        try {
            await clearConflictLog();
            await loadLogs();
            toast.success(isAr ? "تم المسح" : "History cleared");
        } catch {
            toast.error(isAr ? "فشل المسح" : "Failed to clear");
        }
    };

    const handleRetry = async (action: PendingAction) => {
        setBusyId(action.id);
        try {
            await retryAction(action.id);
            if (getConnectivityState() === "online") {
                void drainNow();
            }
            toast.success(isAr ? "أعيدت المحاولة" : "Retry queued");
        } catch {
            toast.error(isAr ? "فشل" : "Failed to retry");
        } finally {
            setBusyId(null);
        }
    };

    const handleDiscard = async (action: PendingAction) => {
        setBusyId(action.id);
        try {
            await discardAction(action.id);
            toast.success(isAr ? "تم التجاهل" : "Action discarded");
        } catch {
            toast.error(isAr ? "فشل التجاهل" : "Failed to discard");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
            {/* Header */}
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                    <ShieldAlert className="h-6 w-6 text-amber-600" />
                    {isAr ? "التصعيدات" : "Escalated Sync Conflicts"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    {isAr
                        ? "الإجراءات التي صعّدها الكاشير للمراجعة الإدارية."
                        : "Actions cashiers flagged for management review."}
                </p>
            </div>

            {/* Device-local scope warning */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                    <p className="font-semibold">
                        {isAr ? "نطاق هذه الصفحة" : "What this page shows"}
                    </p>
                    <p className="mt-1 leading-relaxed">
                        {isAr
                            ? "التصعيدات محفوظة على هذا الجهاز فقط. لعرض تصعيدات جهاز آخر، افتح لوحة الإدارة على ذلك الجهاز. (مزامنة على مستوى الفرع ميزة قادمة.)"
                            : "Escalations are stored on this device only. To see escalations from another device, open the admin panel on that device. (Branch-wide sync is a planned upgrade.)"}
                    </p>
                </div>
            </div>

            {/* Parked actions (status=escalated, still in queue) */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        {isAr ? "إجراءات موقوفة للمراجعة" : "Parked actions awaiting review"}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {escalated.length}
                        </span>
                    </h2>
                </div>

                {escalated.length === 0 ? (
                    <div className="flex h-28 items-center justify-center text-sm text-slate-400">
                        {isAr ? "لا توجد إجراءات موقوفة" : "No parked actions"}
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {escalated.map((action) => (
                            <li key={action.id} className="p-4 sm:px-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-sm font-semibold text-slate-900">
                                                {labelForAction(action.type, isAr)}
                                            </span>
                                            <ConflictBadge
                                                type={action.conflictType ?? "unknown"}
                                                isAr={isAr}
                                            />
                                            {typeof action.failureCode === "number" && (
                                                <span className="font-mono text-[10px] text-slate-500">
                                                    HTTP {action.failureCode}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-mono text-xs text-slate-500">
                                            {isAr ? "الطلب" : "Order"}{" "}
                                            {formatOrderId(action.orderId)}
                                        </p>
                                        {action.failureReason && (
                                            <p className="text-xs text-red-700">
                                                {action.failureReason}
                                            </p>
                                        )}
                                        <p className="text-[11px] text-slate-400">
                                            {isAr ? "وقت التصعيد" : "Escalated at"}:{" "}
                                            {formatDateTime(action.lastAttemptAt ?? action.createdAt, isAr)}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={busyId === action.id}
                                            onClick={() => void handleRetry(action)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                                        >
                                            <RotateCw className="h-3.5 w-3.5" />
                                            {isAr ? "إعادة المحاولة" : "Retry"}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busyId === action.id}
                                            onClick={() => void handleDiscard(action)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            {isAr ? "تجاهل" : "Discard"}
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Escalation history (conflict_log audit) */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <h2 className="text-base font-semibold text-slate-800">
                        {isAr ? "سجل التصعيدات" : "Escalation history"}
                        <span className="ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {logs?.length ?? 0}
                        </span>
                    </h2>
                    {logs && logs.length > 0 && (
                        <button
                            type="button"
                            onClick={() => void handleClearAllLogs()}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                            {isAr ? "مسح الكل" : "Clear all"}
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex h-28 items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isAr ? "جارٍ التحميل" : "Loading"}
                    </div>
                ) : !logs || logs.length === 0 ? (
                    <div className="flex h-28 items-center justify-center text-sm text-slate-400">
                        {isAr ? "لا توجد سجلات" : "No history yet"}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 text-start">{isAr ? "الطلب" : "Order"}</th>
                                    <th className="px-4 py-3 text-start">{isAr ? "الإجراء" : "Action"}</th>
                                    <th className="px-4 py-3 text-start">{isAr ? "النوع" : "Conflict"}</th>
                                    <th className="px-4 py-3 text-start">{isAr ? "السبب" : "Reason"}</th>
                                    <th className="px-4 py-3 text-start">{isAr ? "الحل" : "Resolution"}</th>
                                    <th className="px-4 py-3 text-start">{isAr ? "الوقت" : "When"}</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-xs text-blue-600">
                                            {formatOrderId(row.orderId)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {labelForAction(row.actionType, isAr)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ConflictBadge type={row.conflictType} isAr={isAr} />
                                        </td>
                                        <td className="px-4 py-3 max-w-[260px] truncate text-xs text-slate-600" title={row.failureReason}>
                                            {row.failureReason}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ResolutionBadge value={row.resolvedBy} isAr={isAr} />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                                            {formatDateTime(row.createdAt, isAr)}
                                        </td>
                                        <td className="px-4 py-3 text-end">
                                            <button
                                                type="button"
                                                disabled={busyId === row.id}
                                                onClick={() => void handleDismissLog(row.id)}
                                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                                                aria-label={isAr ? "حذف" : "Delete"}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function labelForAction(type: ActionType, isAr: boolean): string {
    const labels: Record<ActionType, [string, string]> = {
        "create-order": ["Create order", "إنشاء طلب"],
        "add-items": ["Add items", "إضافة عناصر"],
        "cancel-order": ["Cancel order", "إلغاء الطلب"],
        pay: ["Payment", "دفع"],
        "mark-ready": ["Mark ready", "وضع علامة جاهز"],
        "mark-served": ["Mark served", "وضع علامة مُقدَّم"],
        "mark-pickup": ["Mark picked up", "وضع علامة استلام"],
        "open-shift": ["Open shift", "فتح وردية"],
        "close-shift": ["Close shift", "إغلاق وردية"],
    };
    const pair = labels[type] ?? [type, type];
    return isAr ? pair[1] : pair[0];
}

function ConflictBadge({ type, isAr }: { type: ConflictType; isAr: boolean }) {
    const labels: Record<ConflictType, [string, string]> = {
        "already-paid": ["Already paid", "مدفوع مسبقاً"],
        "already-cancelled": ["Already cancelled", "ملغى مسبقاً"],
        "not-found": ["Not found", "غير موجود"],
        "version-mismatch": ["Version mismatch", "تعارض نسخة"],
        unknown: ["Unknown", "غير معروف"],
    };
    const pair = labels[type] ?? labels.unknown;
    return (
        <span className="rounded border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
            {isAr ? pair[1] : pair[0]}
        </span>
    );
}

function ResolutionBadge({
    value,
    isAr,
}: {
    value?: "discarded" | "retried" | "escalated";
    isAr: boolean;
}) {
    if (!value) {
        return <span className="text-slate-300">—</span>;
    }
    const labels: Record<NonNullable<typeof value>, [string, string, string]> = {
        discarded: ["Discarded", "مُتجاهَل", "bg-slate-100 text-slate-600"],
        retried: ["Retried", "أُعيدت", "bg-blue-100 text-blue-700"],
        escalated: ["Escalated", "مُصعَّد", "bg-amber-100 text-amber-700"],
    };
    const [en, ar, cls] = labels[value];
    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
            {isAr ? ar : en}
        </span>
    );
}

function formatOrderId(id: string): string {
    if (id.startsWith("offline-")) return `${id.slice(0, 16)}…`;
    return id.slice(0, 8).toUpperCase();
}

function formatDateTime(ts: number, isAr: boolean): string {
    return new Date(ts).toLocaleString(isAr ? "ar-SA" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
    });
}
