"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useNotificationStore, PosNotification } from "@/store/notificationStore";
import { useAuthStore } from "@/store/authStore";
import { getRoleName, isAdminRole } from "@/lib/authorization";
import { HubConnectionBuilder, HubConnectionState, LogLevel, HubConnection } from "@microsoft/signalr";
import config from "@/lib/config";
import { appendBranchQuery } from "@/lib/branch-selection";
import { usePathname } from "next/navigation";
import { formatOrderSequence } from "@/lib/order-sequence";

// Simple beep using Web Audio API (no external sound files needed)
function playNotificationSound(volume: number = 0.7, type: "newOrder" | "ready" | "alert" = "newOrder") {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = Math.min(1, Math.max(0, volume));

        switch (type) {
            case "newOrder":
                osc.frequency.value = 880;
                osc.type = "sine";
                break;
            case "ready":
                osc.frequency.value = 660;
                osc.type = "sine";
                break;
            case "alert":
                osc.frequency.value = 440;
                osc.type = "triangle";
                break;
        }

        osc.start();
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(volume, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.4);
        osc.stop(ctx.currentTime + 0.45);
    } catch {
        // Web Audio not available — silently skip
    }
}

function getNotificationOrderNumber(payload: any): string {
    const sequence = payload?.orderSequenceNumber || payload?.OrderSequenceNumber;
    const orderNumber = payload?.orderNumber || payload?.OrderNumber;
    return formatOrderSequence({ orderSequenceNumber: sequence }) ?? (orderNumber ? `#${String(orderNumber).slice(-4)}` : "#?");
}

function getSoundType(notifType: string): "newOrder" | "ready" | "alert" {
    switch (notifType) {
        case "NewOrder": return "newOrder";
        case "OrderReady":
        case "OrderPaid": return "ready";
        default: return "alert";
    }
}

// Check if a notification's targetRole matches the current user's role
function isTargetedToUser(targetRole: string | undefined | null, userRoleName: string, isAdminLevel = false): boolean {
    // No targetRole = broadcast to all (shouldn't happen with new backend, but fallback)
    if (!targetRole) return true;
    // targetRole can be comma-separated like "Cashier,Waiter"
    const roles = targetRole.split(",").map(r => r.trim());
    if (roles.includes(userRoleName)) return true;
    // SuperAdmin is a strict superset of Admin — it receives every Admin-targeted notification.
    return isAdminLevel && roles.includes("Admin");
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { addNotification, settings } = useNotificationStore();
    const connectionRef = useRef<HubConnection | null>(null);
    const processedIdsRef = useRef<Set<string>>(new Set());
    const pathname = usePathname();
    const isSilentRoute =
        pathname === "/shop" ||
        pathname.startsWith("/shop/") ||
        pathname === "/menu" ||
        pathname.startsWith("/menu/") ||
        pathname === "/" ||
        pathname.startsWith("/website") ||
        pathname === "/followus" ||
        pathname === "/payment";

    const pushNotification = useCallback((data: PosNotification) => {
        // Deduplicate by id
        if (processedIdsRef.current.has(data.id)) return;
        processedIdsRef.current.add(data.id);
        if (processedIdsRef.current.size > 500) {
            const arr = Array.from(processedIdsRef.current);
            processedIdsRef.current = new Set(arr.slice(-250));
        }

        // Role-based filtering: only show notifications targeted to current user's role
        const user = useAuthStore.getState().user;
        const userRoleName = user ? getRoleName(user.role) : "";
        if (userRoleName && !isTargetedToUser(data.targetRole, userRoleName, isAdminRole(user?.role))) {
            return; // Not for this user's role
        }

        // Check if notification type is enabled in settings
        const { notifyNewOrder, notifyOrderReady, notifyLowStock, soundEnabled, soundVolume } = settings;
        const shouldShow =
            (data.type === "NewOrder" && notifyNewOrder) ||
            (data.type === "OrderReady" && notifyOrderReady) ||
            (data.type === "OrderPaid" && notifyOrderReady) ||
            (data.type === "LowStock" && notifyLowStock) ||
            (data.type === "ExpiryWarning" && notifyLowStock) ||
            // Cancellation-approval requests are already role-targeted to Admin/Manager
            // by the backend, so always surface them to those users.
            data.type === "OrderCancelled";

        if (!shouldShow) return;

        addNotification(data);

        if (soundEnabled && !isSilentRoute) {
            playNotificationSound(soundVolume, getSoundType(data.type));
        }
    }, [addNotification, isSilentRoute, settings]);

    useEffect(() => {
        if (isSilentRoute) {
            return;
        }

        const token = useAuthStore.getState().user?.token || "";
        const userRole = useAuthStore.getState().user?.role;
        const userRoleName = getRoleName(userRole);

        const connection = new HubConnectionBuilder()
            .withUrl(appendBranchQuery(config.signalRUrl), {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();

        connectionRef.current = connection;

        // 1. Listen for backend-persisted notifications (from NotificationService)
        //    These already have targetRole set — pushNotification filters by role
        connection.on("ReceiveNotification", (data: PosNotification) => {
            pushNotification(data);
        });

        // 2. Listen for existing SignalR events and convert to notifications
        //    Apply role-based routing: NewOrder → Kitchen, OrderReady → Cashier+Waiter, OrderPaid → Cashier+Waiter

        // NewOrder → Kitchen only
        if (userRoleName === "Kitchen" || userRoleName === "Admin") {
            connection.on("ReceiveNewOrder", (order: any) => {
                if (userRoleName !== "Kitchen") return; // Admin gets it via ReceiveNotification if needed
                const orderNum = getNotificationOrderNumber(order);
                const tableName = order?.tableName || order?.TableName || "";
                const orderType = order?.orderType === 1 || order?.orderType === "Takeaway" ? "Pickup" : "In-store";
                pushNotification({
                    id: `new-order-${order?.id || order?.Id || Date.now()}`,
                    type: "NewOrder",
                    title: `New Order ${orderNum}`,
                    message: `${orderType} — ${tableName || orderType}`,
                    referenceId: order?.id || order?.Id,
                    targetRole: "Kitchen",
                    isRead: false,
                    createdAt: new Date().toISOString(),
                });
            });
        }

        // OrderReady → Cashier + Waiter only
        if (userRoleName === "Cashier" || userRoleName === "Waiter") {
            connection.on("OrderReady", (data: any) => {
                const orderNum = getNotificationOrderNumber(data);
                const tableName = data?.tableName || data?.TableName || "";
                pushNotification({
                    id: `order-ready-${data?.orderId || data?.OrderId || Date.now()}`,
                    type: "OrderReady",
                    title: `Order ${orderNum} Ready`,
                    message: tableName ? `Table: ${tableName}` : "Order is ready for pickup",
                    referenceId: data?.orderId || data?.OrderId,
                    targetRole: "Cashier,Waiter",
                    isRead: false,
                    createdAt: new Date().toISOString(),
                });
            });

            // OrderPaid → Cashier + Waiter
            connection.on("OrderPaid", (data: any) => {
                const orderNum = getNotificationOrderNumber(data);
                const tableName = data?.tableName || data?.TableName || "";
                const amount = data?.totalAmount || data?.TotalAmount || 0;
                const method = data?.paymentMethod || data?.PaymentMethod || "";
                pushNotification({
                    id: `order-paid-${data?.orderId || data?.OrderId || Date.now()}`,
                    type: "OrderPaid",
                    title: `Order ${orderNum} Paid`,
                    message: `${tableName || "Takeaway"} — ${method}${amount ? ` (${amount})` : ""}`,
                    referenceId: data?.orderId || data?.OrderId,
                    targetRole: "Cashier,Waiter",
                    isRead: false,
                    createdAt: new Date().toISOString(),
                });
            });
        }

        let cancelled = false;
        const startConn = async () => {
            try {
                await connection.start();
                if (cancelled) { connection.stop().catch(() => {}); return; }
            } catch (err) {
                if (!cancelled) console.warn("[NotificationProvider] SignalR connection failed:", err);
            }
        };
        startConn();

        return () => {
            cancelled = true;
            connection.off("ReceiveNotification");
            connection.off("ReceiveNewOrder");
            connection.off("OrderReady");
            connection.off("OrderPaid");
            if (connection.state === HubConnectionState.Connected) {
                connection.stop();
            }
        };
    }, [isSilentRoute, pushNotification]);

    return <>{children}</>;
}
