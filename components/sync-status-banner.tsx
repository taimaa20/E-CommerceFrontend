"use client";

import { useEffect, useMemo } from "react";
import { CloudOff, CloudUpload, Loader2, AlertTriangle } from "lucide-react";
import { useOfflineCashierStore } from "@/store/offlineCashierStore";
import { useLocale } from "@/components/locale-provider";
import { useAuthStore } from "@/store/authStore";
import { usePathname } from "next/navigation";

/**
 * Global connectivity + queue-drain indicator.
 *
 * Shown as a small fixed pill in the bottom-right corner of every page.
 * Hidden entirely when everything is healthy (online + queue empty) so
 * cashiers never see noise during normal operation.
 *
 * States (priority order — first match wins):
 *   1. FAILED      — queue has 4xx/conflict actions the drain can't retry.
 *                    Red. Staff must open the conflict drawer.
 *   2. SYNCING     — drain in progress, at least one action mid-flight.
 *                    Blue with a spinner.
 *   3. OFFLINE     — navigator.onLine false. Amber with cloud-off icon.
 *                    If there's a pending queue, show the count so the
 *                    cashier knows work is not lost.
 *   4. DEGRADED    — online but server unreachable (ISP up, Azure down).
 *                    Amber with "server unreachable" wording.
 *   5. HIDDEN      — online + queue empty.
 *
 * This component self-bootstraps the offline store, so placing it in
 * the root layout is enough — no other page needs to touch it.
 */
export function SyncStatusBanner() {
    const { locale } = useLocale();
    const pending = useOfflineCashierStore((s) => s.pending);
    const connectivity = useOfflineCashierStore((s) => s.connectivity);
    const bootstrapped = useOfflineCashierStore((s) => s.bootstrapped);
    const bootstrap = useOfflineCashierStore((s) => s.bootstrap);
    const pathname = usePathname();
    // Only the cashier-side surfaces (cashier, takeaway, kitchen, mobile, admin)
    // need the offline reference cache + queue. Public pages render this same
    // banner via the root layout but have no use for the warmup. Without this
    // gate, a visitor on /shop pays for /products, /categories, /tables,
    // /offers, /orders/takeaway/active and /settings on first paint.
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isPublicRoute = pathname === "/"
        || pathname === "/shop" || pathname.startsWith("/shop/")
        || pathname === "/menu" || pathname.startsWith("/menu/")
        || pathname === "/website" || pathname.startsWith("/website/")
        || pathname === "/showcase"
        || pathname === "/login";

    useEffect(() => {
        if (isPublicRoute) return;
        if (!isAuthenticated) return;
        if (!bootstrapped) {
            void bootstrap();
        }
    }, [bootstrap, bootstrapped, isAuthenticated, isPublicRoute]);

    const counts = useMemo(() => {
        let pendingLike = 0;
        let syncing = 0;
        let failed = 0;
        for (const a of pending) {
            if (a.status === "syncing" || a.status === "processing") syncing += 1;
            if (a.status === "pending" || a.status === "retrying") pendingLike += 1;
            if (a.status === "failed" || a.status === "escalated") failed += 1;
        }
        return { pendingLike, syncing, failed, unresolved: pendingLike + syncing };
    }, [pending]);

    const ar = locale === "ar";

    // Suppress the visual entirely for unauth visitors — the banner is meant
    // for cashiers tracking queue drain, not customers browsing the menu.
    // Placed after all hooks to keep the call order stable across renders.
    if (isPublicRoute || !isAuthenticated) return null;

    // Hidden state: online + clean queue. Nothing to report — don't clutter.
    if (
        connectivity === "online" &&
        counts.unresolved === 0 &&
        counts.failed === 0
    ) {
        return null;
    }

    // Failed actions take precedence over everything else — user action needed.
    if (counts.failed > 0) {
        return (
            <Pill tone="danger" rtl={ar}>
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>
                    {ar
                        ? `${counts.failed} عملية تحتاج مراجعة`
                        : `${counts.failed} action${counts.failed === 1 ? "" : "s"} need review`}
                </span>
            </Pill>
        );
    }

    // Active drain in progress — reassure the user something is happening.
    if (counts.syncing > 0) {
        return (
            <Pill tone="info" rtl={ar}>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>
                    {ar
                        ? `جارٍ المزامنة (${counts.syncing})`
                        : `Syncing ${counts.syncing}…`}
                </span>
            </Pill>
        );
    }

    // Offline: tell the user the queue is safe and how big it is.
    if (connectivity === "offline") {
        return (
            <Pill tone="warning" rtl={ar}>
                <CloudOff className="w-4 h-4" aria-hidden="true" />
                <span>
                    {counts.pendingLike > 0
                        ? ar
                            ? `غير متصل — ${counts.pendingLike} في قائمة الانتظار`
                            : `Offline — ${counts.pendingLike} queued`
                        : ar
                            ? "غير متصل"
                            : "Offline"}
                </span>
            </Pill>
        );
    }

    // Degraded: ISP is fine, backend is not. Distinct wording helps triage.
    if (connectivity === "degraded") {
        return (
            <Pill tone="warning" rtl={ar}>
                <CloudUpload className="w-4 h-4" aria-hidden="true" />
                <span>
                    {counts.pendingLike > 0
                        ? ar
                            ? `الخادم غير متاح — ${counts.pendingLike} في قائمة الانتظار`
                            : `Server unreachable — ${counts.pendingLike} queued`
                        : ar
                            ? "الخادم غير متاح"
                            : "Server unreachable"}
                </span>
            </Pill>
        );
    }

    return null;
}

type Tone = "info" | "warning" | "danger";

function Pill({
    tone,
    rtl,
    children,
}: {
    tone: Tone;
    rtl: boolean;
    children: React.ReactNode;
}) {
    // Tailwind classes held inline — this pill is used exactly once so a
    // variant abstraction would be premature.
    const palette: Record<Tone, string> = {
        info: "bg-blue-600 text-white border-blue-700",
        warning: "bg-amber-500 text-white border-amber-600",
        danger: "bg-red-600 text-white border-red-700",
    };

    return (
        <div
            role="status"
            aria-live="polite"
            dir={rtl ? "rtl" : "ltr"}
            className={[
                "fixed z-50 bottom-4 end-4 flex items-center gap-2",
                "px-3 py-1.5 rounded-full text-xs font-semibold",
                "shadow-lg border",
                "pointer-events-none select-none",
                palette[tone],
            ].join(" ")}
        >
            {children}
        </div>
    );
}
