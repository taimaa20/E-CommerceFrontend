"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, X, Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type HrRequestKind = "leave" | "loan" | "permission";

export interface RequestStatusActionsProps {
    kind: HrRequestKind;
    requestId: string;
    status: string;             // canonical lowercase code
    update: (id: string, status: string) => Promise<unknown>;
    onChanged: () => void;
    canCancel?: boolean;        // true when current user is the requester or admin
    isAr?: boolean;
}

// Inline approve / reject / cancel buttons. Only renders for `pending` rows;
// terminal states are read-only — the parent should still show a status badge.
export function RequestStatusActions({
    requestId,
    status,
    update,
    onChanged,
    canCancel = true,
    isAr = false,
}: RequestStatusActionsProps) {
    const [busy, setBusy] = React.useState<string | null>(null);

    if (status !== "pending") return null;

    const run = async (next: string) => {
        if (busy) return;
        setBusy(next);
        try {
            await update(requestId, next);
            toast.success(labelFor(next, isAr));
            onChanged();
        } catch (e: any) {
            toast.error(e?.message ?? (isAr ? "فشل" : "Failed"));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="flex items-center gap-1">
            <Button
                size="sm"
                variant="outline"
                disabled={!!busy}
                onClick={() => run("approved")}
                className="h-8 gap-1 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            >
                {busy === "approved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span className="text-xs">{isAr ? "موافقة" : "Approve"}</span>
            </Button>
            <Button
                size="sm"
                variant="outline"
                disabled={!!busy}
                onClick={() => run("rejected")}
                className="h-8 gap-1 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
            >
                {busy === "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                <span className="text-xs">{isAr ? "رفض" : "Reject"}</span>
            </Button>
            {canCancel && (
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={!!busy}
                    onClick={() => run("cancelled")}
                    className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                >
                    {busy === "cancelled" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                    <span className="text-xs">{isAr ? "إلغاء" : "Cancel"}</span>
                </Button>
            )}
        </div>
    );
}

function labelFor(code: string, isAr: boolean): string {
    if (isAr) return code === "approved" ? "تمت الموافقة" : code === "rejected" ? "تم الرفض" : "تم الإلغاء";
    return code === "approved" ? "Approved" : code === "rejected" ? "Rejected" : "Cancelled";
}

export const STATUS_BADGE_CLASS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    rejected: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
    cancelled: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
};
