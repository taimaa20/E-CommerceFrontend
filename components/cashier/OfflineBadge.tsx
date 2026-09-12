"use client";

import { memo, useState } from "react";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useOfflineCashierStore } from "@/store/offlineCashierStore";
import { Button } from "@/components/ui/button";
import { ConflictDrawer } from "@/components/cashier/ConflictDrawer";

/**
 * Compact pill indicator — shows connectivity + pending-sync count.
 * Click to trigger a manual sync, or open the conflict drawer when the badge
 * is red (one or more actions are stuck on the server). Never blocks cashier
 * workflow.
 */
function OfflineBadgeImpl() {
    const connectivity = useOfflineCashierStore((s) => s.connectivity);
    const pending = useOfflineCashierStore((s) => s.pending);
    const syncNow = useOfflineCashierStore((s) => s.syncNow);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const activeCount = pending.filter((a) =>
        a.status === "pending" ||
        a.status === "processing" ||
        a.status === "syncing" ||
        a.status === "retrying"
    ).length;
    const failedCount = pending.filter((a) => a.status === "failed").length;

    // Hide entirely when everything is clean and online
    if (connectivity === "online" && activeCount === 0 && failedCount === 0) return null;

    const online = connectivity === "online";
    const degraded = connectivity === "degraded";
    const offline = connectivity === "offline";

    const tone = failedCount > 0
        ? "border-red-300 bg-red-50 text-red-700"
        : offline
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : degraded
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

    const icon = failedCount > 0 ? (
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
    ) : offline ? (
        <WifiOff className="h-4 w-4" aria-hidden="true" />
    ) : (
        <Wifi className="h-4 w-4" aria-hidden="true" />
    );

    const label = failedCount > 0
        ? `${failedCount} sync failed`
        : offline
        ? "Offline"
        : degraded
        ? "Server unreachable"
        : online && activeCount > 0
        ? `${activeCount} pending sync`
        : "Offline";

    // Red badge (failedCount > 0) opens the Conflict Drawer so the cashier can
    // discard / retry / escalate each stuck action. Amber/blue still triggers
    // a manual sync — there's nothing to resolve, just nudge the queue.
    const handleClick = () => {
        if (failedCount > 0) {
            setDrawerOpen(true);
            return;
        }
        void syncNow();
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClick}
                disabled={offline && failedCount === 0}
                aria-label={
                    failedCount > 0
                        ? `Connectivity: ${label}. Click to review sync conflicts.`
                        : `Connectivity: ${label}. Click to retry sync.`
                }
                className={`gap-1.5 border ${tone} hover:opacity-90`}
            >
                {icon}
                <span className="text-xs font-semibold">{label}</span>
                {activeCount > 0 && online && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
            </Button>
            <ConflictDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        </>
    );
}

export const OfflineBadge = memo(OfflineBadgeImpl);
