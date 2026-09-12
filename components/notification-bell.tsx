"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2, Package, CheckCircle2, CreditCard, AlertTriangle, XCircle } from "lucide-react";
import { useNotificationStore, PosNotification } from "@/store/notificationStore";
import { useLocale } from "@/components/locale-provider";
import { api } from "@/lib/api";

function getNotificationIcon(type: string) {
    switch (type) {
        case "NewOrder": return <Package className="w-5 h-5 text-info" />;
        case "OrderReady": return <CheckCircle2 className="w-5 h-5 text-success" />;
        case "OrderPaid": return <CreditCard className="w-5 h-5 text-primary" />;
        case "OrderCancelled": return <XCircle className="w-5 h-5 text-destructive" />;
        case "LowStock":
        case "ExpiryWarning": return <AlertTriangle className="w-5 h-5 text-warning" />;
        default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
}

function getTypeBadgeColor(type: string) {
    switch (type) {
        case "NewOrder": return "bg-info/10 text-info";
        case "OrderReady": return "bg-success/10 text-success";
        case "OrderPaid": return "bg-primary/10 text-primary";
        case "OrderCancelled": return "bg-destructive/10 text-destructive";
        case "LowStock":
        case "ExpiryWarning": return "bg-warning/10 text-warning";
        default: return "bg-muted text-muted-foreground";
    }
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
    const { t } = useLocale();
    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleMarkRead = async (n: PosNotification) => {
        markAsRead(n.id);
        try { await api.put(`/notifications/${n.id}/read`); } catch { /* silent */ }
    };

    // Clicking a cancellation-approval notification opens the request directly:
    // Orders → Pending Cancellation Approval → Order Details.
    const handleNotificationClick = (n: PosNotification) => {
        if (!n.isRead) handleMarkRead(n);
        if (n.type === "OrderCancelled" && n.referenceId) {
            setOpen(false);
            router.push(`/admin/orders?status=PendingCancellationApproval&orderId=${n.referenceId}`);
        }
    };

    const handleMarkAllRead = async () => {
        markAllAsRead();
        try { await api.put("/notifications/read-all"); } catch { /* silent */ }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-lg hover:bg-accent/50 transition-colors"
                title={t("notifications") || "Notifications"}
            >
                <Bell className="w-5 h-5 text-foreground" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold text-white bg-destructive rounded-full px-1 animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="fixed inset-x-4 top-16 max-h-[min(70vh,480px)] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col sm:absolute sm:start-auto sm:end-0 sm:inset-x-auto sm:top-full sm:mt-2 sm:w-[380px] sm:max-h-[480px]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            {t("notifications") || "Notifications"}
                            {unreadCount > 0 && (
                                <span className="text-xs bg-destructive text-white rounded-full px-2 py-0.5">
                                    {unreadCount}
                                </span>
                            )}
                        </h3>
                        <div className="flex gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded hover:bg-primary/5 transition-colors"
                                    title="Mark all as read"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => { clearNotifications(); setOpen(false); }}
                                    className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-2 py-1 rounded hover:bg-destructive/5 transition-colors"
                                    title="Clear all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Bell className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm">No notifications</p>
                            </div>
                        ) : (
                            notifications.slice(0, 50).map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-accent/30 ${
                                        !n.isRead ? "bg-primary/5" : ""
                                    }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {getNotificationIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${getTypeBadgeColor(n.type)}`}>
                                                {n.type.replace(/([A-Z])/g, " $1").trim()}
                                            </span>
                                            {!n.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                                        <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                                    </div>
                                    {!n.isRead && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleMarkRead(n); }}
                                            className="shrink-0 mt-1 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                            title="Mark as read"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
