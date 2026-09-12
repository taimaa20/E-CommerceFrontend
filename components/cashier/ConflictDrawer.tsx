"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, RotateCw, ShieldAlert, Trash2 } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { useOfflineCashierStore } from "@/store/offlineCashierStore";
import {
    discardAction as discardPending,
    escalateAction as escalatePending,
    retryAction as retryPending,
    drainNow,
} from "@/lib/offline/queue";
import {
    putConflictLog,
    putOrderSnapshot,
    type PendingAction,
    type ActionType,
    type ConflictType,
} from "@/lib/offline/db";
import { getCashierOrdersStrict } from "@/lib/api";
import { getConnectivityState } from "@/lib/offline/connectivity";

interface ConflictDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Conflict resolution drawer — opens when the cashier taps the red sync badge.
 * Lists every `failed` pending action grouped by orderId. Each row offers
 * Discard (drop + refresh snapshot), Retry (requeue), or Escalate (park for a
 * manager). A single "Resolve All" discards every failed row and pulls fresh
 * server state for each affected order so the UI catches back up in one sweep.
 *
 * Read-only for non-failed rows — pending and syncing actions continue to be
 * handled by the queue drain loop.
 */
export function ConflictDrawer({ open, onOpenChange }: ConflictDrawerProps) {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const pending = useOfflineCashierStore((s) => s.pending);
    const snapshots = useOfflineCashierStore((s) => s.snapshots);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [busyAll, setBusyAll] = useState(false);

    const failedByOrder = useMemo(() => {
        const failed = pending.filter((a) => a.status === "failed");
        const groups = new Map<string, PendingAction[]>();
        for (const a of failed) {
            const bucket = groups.get(a.orderId);
            if (bucket) bucket.push(a);
            else groups.set(a.orderId, [a]);
        }
        return Array.from(groups.entries()).map(([orderId, actions]) => {
            const sortedActions = [...actions].sort((x, y) => x.createdAt - y.createdAt);
            return {
                orderId,
                orderReference: getOrderReferenceLabel(orderId, sortedActions, snapshots),
                actions: sortedActions,
            };
        });
    }, [pending, snapshots]);

    const totalFailed = failedByOrder.reduce((s, g) => s + g.actions.length, 0);

    const handleDiscard = async (action: PendingAction) => {
        setBusyId(action.id);
        try {
            await discardPending(action.id);
            await refreshOrderSnapshot(action.orderId);
            toast.success(isAr ? "تم تجاهل الإجراء" : "Action discarded");
        } catch {
            toast.error(isAr ? "فشل التجاهل" : "Failed to discard");
        } finally {
            setBusyId(null);
        }
    };

    const handleRetry = async (action: PendingAction) => {
        setBusyId(action.id);
        try {
            await retryPending(action.id);
            if (getConnectivityState() === "online") {
                void drainNow();
            }
            toast.success(isAr ? "أعيدت المحاولة" : "Retry queued");
        } catch {
            toast.error(isAr ? "فشل إعادة المحاولة" : "Failed to retry");
        } finally {
            setBusyId(null);
        }
    };

    const handleEscalate = async (action: PendingAction) => {
        setBusyId(action.id);
        try {
            await putConflictLog({
                orderId: action.orderId,
                conflictType: action.conflictType ?? "unknown",
                actionType: action.type,
                failureReason: action.failureReason ?? action.lastError ?? "Server rejected the request",
                serverState: action.serverState,
                createdAt: Date.now(),
                resolvedBy: "escalated",
                resolvedAt: Date.now(),
            });
            await escalatePending(action.id);
            toast.success(
                isAr ? "تم التصعيد إلى المدير" : "Escalated to manager"
            );
        } catch {
            toast.error(isAr ? "فشل التصعيد" : "Failed to escalate");
        } finally {
            setBusyId(null);
        }
    };

    const handleResolveAll = async () => {
        setBusyAll(true);
        const orderIds = new Set<string>();
        try {
            for (const group of failedByOrder) {
                orderIds.add(group.orderId);
                for (const a of group.actions) {
                    await discardPending(a.id);
                }
            }
            await Promise.all(
                Array.from(orderIds).map((id) => refreshOrderSnapshot(id).catch(() => {}))
            );
            toast.success(
                isAr
                    ? "تم حل جميع المزامنات الفاشلة"
                    : "All failed syncs resolved"
            );
            onOpenChange(false);
        } catch {
            toast.error(isAr ? "فشلت العملية" : "Resolve all failed");
        } finally {
            setBusyAll(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        {isAr ? "مزامنات فاشلة" : "Sync Conflicts"}
                        {totalFailed > 0 && (
                            <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
                                {totalFailed}
                            </Badge>
                        )}
                    </SheetTitle>
                    <SheetDescription>
                        {isAr
                            ? "هذه الإجراءات لم يقبلها الخادم. راجعها قبل أن تتابع."
                            : "These actions were rejected by the server. Resolve them before continuing."}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {totalFailed === 0 ? (
                        <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-slate-500">
                            <Check className="h-6 w-6 text-green-500" />
                            {isAr ? "لا توجد مزامنات فاشلة" : "No failed syncs"}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {failedByOrder.map((group) => (
                                <div
                                    key={group.orderId}
                                    className="rounded-lg border border-red-200 bg-red-50/50 p-3"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs font-mono text-slate-600" title={group.orderId}>
                                            {isAr ? "الطلب" : "Order"}{" "}
                                            {group.orderReference}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            {group.actions.length}
                                        </Badge>
                                    </div>
                                    <ul className="space-y-2">
                                        {group.actions.map((action) => (
                                            <li
                                                key={action.id}
                                                className="rounded-md border border-red-200 bg-white p-2.5"
                                            >
                                                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                                    <span className="text-sm font-semibold text-slate-900">
                                                        {labelForAction(action.type, isAr)}
                                                    </span>
                                                    <ConflictTypeBadge
                                                        type={action.conflictType ?? "unknown"}
                                                        isAr={isAr}
                                                    />
                                                    {typeof action.failureCode === "number" && (
                                                        <span className="text-[10px] font-mono text-slate-500">
                                                            HTTP {action.failureCode}
                                                        </span>
                                                    )}
                                                </div>
                                                {action.failureReason && (
                                                    <p className="mb-2 text-xs text-red-700">
                                                        {action.failureReason}
                                                    </p>
                                                )}
                                                <ServerStateSummary state={action.serverState} isAr={isAr} />
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={busyId === action.id || busyAll}
                                                        onClick={() => void handleDiscard(action)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        {isAr ? "تجاهل" : "Discard"}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                                        disabled={busyId === action.id || busyAll}
                                                        onClick={() => void handleRetry(action)}
                                                    >
                                                        <RotateCw className="h-3.5 w-3.5" />
                                                        {isAr ? "إعادة المحاولة" : "Retry"}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                                        disabled={busyId === action.id || busyAll}
                                                        onClick={() => void handleEscalate(action)}
                                                    >
                                                        <ShieldAlert className="h-3.5 w-3.5" />
                                                        {isAr ? "تصعيد" : "Escalate"}
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {totalFailed > 0 && (
                    <SheetFooter className="border-t">
                        <Button
                            type="button"
                            variant="default"
                            className="w-full bg-red-600 hover:bg-red-700"
                            disabled={busyAll}
                            onClick={() => void handleResolveAll()}
                        >
                            <Check className="h-4 w-4" />
                            {isAr ? "حل كل المزامنات الفاشلة" : "Resolve All"}
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}

// Pull fresh server state into the snapshot store for a specific order so the
// cashier UI catches up after a discard/resolve. No-op when offline — the
// snapshot becomes authoritative again on reconnect via the normal drain path.
async function refreshOrderSnapshot(orderId: string): Promise<void> {
    if (getConnectivityState() !== "online") return;
    if (orderId.startsWith("offline-")) return; // no server row to fetch yet
    try {
        const orders = await getCashierOrdersStrict("today");
        const match = orders.find((o) => o.id === orderId);
        if (match) await putOrderSnapshot(orderId, match);
    } catch {
        /* best-effort — leave the stale snapshot in place */
    }
}

function getOrderReferenceLabel(
    orderId: string,
    actions: PendingAction[],
    snapshots: Array<{ id: string; orderNumber?: string | null; publicOrderNumber?: string | null }>
): string {
    for (const action of actions) {
        const actionReference = getActionOrderReference(action);
        if (actionReference) return actionReference;
    }

    const snapshot = snapshots.find((order) => order.id === orderId);
    const snapshotReference =
        cleanOrderReference(snapshot?.publicOrderNumber) ??
        cleanOrderReference(snapshot?.orderNumber);

    return snapshotReference ?? formatOrderId(orderId);
}

function getActionOrderReference(action: PendingAction): string | null {
    const payload = action.payload as {
        orderNumber?: unknown;
        publicOrderNumber?: unknown;
        order?: {
            orderNumber?: unknown;
            publicOrderNumber?: unknown;
        };
    };

    return (
        cleanOrderReference(payload.publicOrderNumber) ??
        cleanOrderReference(payload.orderNumber) ??
        cleanOrderReference(payload.order?.publicOrderNumber) ??
        cleanOrderReference(payload.order?.orderNumber)
    );
}

function cleanOrderReference(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function formatOrderId(id: string): string {
    if (id.startsWith("offline-")) return `${id.slice(0, 16)}…`;
    return id.slice(0, 8).toUpperCase();
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

function ConflictTypeBadge({ type, isAr }: { type: ConflictType; isAr: boolean }) {
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

function ServerStateSummary({
    state,
    isAr,
}: {
    state?: Record<string, unknown>;
    isAr: boolean;
}) {
    if (!state) return null;
    const status = typeof state.status === "string" ? state.status : undefined;
    const paidAmount =
        typeof state.paidAmount === "number" ? state.paidAmount : undefined;
    const totalAmount =
        typeof state.totalAmount === "number" ? state.totalAmount : undefined;
    if (!status && paidAmount == null && totalAmount == null) return null;
    return (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
            <span className="font-semibold">
                {isAr ? "حالة الخادم:" : "Server:"}
            </span>
            {status && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                    {status}
                </span>
            )}
            {paidAmount != null && totalAmount != null && (
                <span className="font-mono">
                    {paidAmount.toFixed(2)} / {totalAmount.toFixed(2)}
                </span>
            )}
        </div>
    );
}
