"use client";

import * as React from "react";
import { Download, RefreshCw } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { relativeTime } from "@/components/dashboard/primitives";

interface DashboardTopbarProps {
    title: string;
    /** Show the green "Live" pulse — only on dashboards whose data is push-driven. */
    live?: boolean;
    /** ISO/Date of the snapshot's GeneratedAtUtc. */
    updatedAt?: string | Date | null;
    /** Click handler for the refresh icon button. */
    onRefresh?: () => void;
    /** Optional export-CSV/PDF action. */
    onExport?: () => void;
    /**
     * Kept for source-compatibility with existing call sites. The notification
     * bell is intentionally hidden in this build because clicking it had no
     * effect — the in-page Alerts card already surfaces the same count and
     * is itself actionable. If a real notification panel is wired in the
     * future, re-introduce the icon here.
     */
    notificationCount?: number | null;
}

/**
 * Sticky glass-blur header sitting at the top of every dashboard. Mirrors the
 * design package's `.topbar` exactly, minus the branch selector — this is a
 * single-location POS.
 */
export const DashboardTopbar: React.FC<DashboardTopbarProps> = ({
    title, live = true, updatedAt, onRefresh, onExport, notificationCount: _notificationCount = null,
}) => {
    const { locale } = useLocale();
    const ar = locale === "ar";

    const [now, setNow] = React.useState(Date.now());
    React.useEffect(() => {
        if (!updatedAt) return;
        const id = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(id);
    }, [updatedAt]);
    void now;

    const rel = updatedAt ? relativeTime(updatedAt, ar ? "ar" : "en") : null;

    return (
        <div className="topbar">
            <div className="topbar-title">
                <h1>{title}</h1>
                {live && (
                    <span className="live-pill">
                        <span className="live-dot" />{ar ? "مباشر" : "Live"}
                    </span>
                )}
                {rel && (
                    <span className="updated">
                        {ar ? "محدث" : "Updated"} <span className="num">{rel}</span>
                    </span>
                )}
            </div>
            <div className="topbar-spacer" />
            <div className="topbar-right">
                {onExport && (
                    <button className="btn" onClick={onExport}>
                        <Download size={13} />
                        {ar ? "تصدير" : "Export"}
                    </button>
                )}
                {onRefresh && (
                    <button className="btn btn-icon" onClick={onRefresh} title={ar ? "تحديث" : "Refresh"}>
                        <RefreshCw size={14} />
                    </button>
                )}
                {/* Bell intentionally omitted — see prop doc above. */}
            </div>
        </div>
    );
};
