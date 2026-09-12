"use client";

import React, { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
    getConnectivityState,
    subscribeConnectivity,
    type ConnectivityState,
} from "@/lib/offline/connectivity";
import { subscribeFailures } from "@/lib/offline/queue";
import { useOfflineCashierStore } from "@/store/offlineCashierStore";
import { useLocale } from "@/components/locale-provider";

// Bilingual labels for action types — used in the failure toast so the
// cashier can tell at a glance which queued action just blew up.
const ACTION_LABELS: Record<string, { en: string; ar: string }> = {
    "create-order": { en: "Order create", ar: "إنشاء الطلب" },
    "add-items": { en: "Add items", ar: "إضافة عناصر" },
    "pay": { en: "Payment", ar: "الدفع" },
    "cancel-order": { en: "Cancel order", ar: "إلغاء الطلب" },
    "mark-ready": { en: "Mark ready", ar: "جاهز" },
    "mark-served": { en: "Mark served", ar: "تم التقديم" },
    "mark-pickup": { en: "Pickup", ar: "الاستلام" },
    "open-shift": { en: "Open shift", ar: "فتح الوردية" },
    "close-shift": { en: "Close shift", ar: "إغلاق الوردية" },
};

/**
 * Compact indicator showing offline / sync state.
 *
 * - Hidden when fully online with no pending actions.
 * - Amber pill + cloud-off icon when offline / degraded.
 * - Blue pill + spinning icon when online but queue has pending work.
 *
 * Kept deliberately minimal so the cashier UI never looks "different" in
 * offline mode — the core contract is: identical behaviour, subtle signal.
 */
export function OfflineIndicator() {
    const { locale } = useLocale();
    const [connectivity, setConnectivity] = useState<ConnectivityState>("online");
    const pending = useOfflineCashierStore((s) => s.pending);
    const bootstrap = useOfflineCashierStore((s) => s.bootstrap);

    useEffect(() => {
        void bootstrap();
        setConnectivity(getConnectivityState());
        return subscribeConnectivity(setConnectivity);
    }, [bootstrap]);

    // FIX(silent-sync-failure): The red sync badge alone is too easy to miss
    // — offer orders failing at server price validation used to "disappear
    // silently" because the cashier had already moved on. Toast every failed
    // transition so the operator sees the issue while the order is still
    // recoverable from the conflict drawer.
    useEffect(() => {
        return subscribeFailures(({ action, reason, code }) => {
            const labels = ACTION_LABELS[action.type] ?? { en: action.type, ar: action.type };
            const what = locale === "ar" ? labels.ar : labels.en;
            const codeStr = code ? ` (${code})` : "";
            const msg = locale === "ar"
                ? `فشل المزامنة: ${what}${codeStr} — ${reason}`
                : `Sync failed: ${what}${codeStr} — ${reason}`;
            toast.error(msg, {
                description: locale === "ar"
                    ? "افتح شريط المزامنة لإعادة المحاولة. لم يُحذف الطلب."
                    : "Open the sync drawer to retry. The order was not lost.",
                duration: 8000,
            });
        });
    }, [locale]);

    const pendingCount = pending.filter(
        (a) => a.status === "pending" || a.status === "syncing"
    ).length;
    const isOffline = connectivity !== "online";

    if (!isOffline && pendingCount === 0) return null;

    if (isOffline) {
        const label =
            locale === "ar"
                ? `وضع عدم الاتصال${pendingCount ? ` (${pendingCount})` : ""}`
                : `Offline${pendingCount ? ` (${pendingCount})` : ""}`;
        return (
            <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                title={
                    locale === "ar"
                        ? "إجراءاتك محفوظة محليًا وستتم مزامنتها عند استعادة الاتصال"
                        : "Your actions are saved locally and will sync when back online"
                }
            >
                <CloudOff className="h-3.5 w-3.5" />
                {label}
            </span>
        );
    }

    const syncLabel =
        locale === "ar" ? `مزامنة (${pendingCount})` : `Syncing (${pendingCount})`;
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
            title={
                locale === "ar"
                    ? "يتم الآن إرسال الإجراءات المؤجلة إلى الخادم"
                    : "Queued actions are being sent to the server"
            }
        >
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            {syncLabel}
        </span>
    );
}
