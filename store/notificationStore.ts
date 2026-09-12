"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PosNotification {
    id: string;
    type: string; // "NewOrder" | "OrderReady" | "OrderPaid" | "LowStock" | "ExpiryWarning"
    title: string;
    message: string;
    referenceId?: string;
    targetRole?: string;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationSettings {
    notifyNewOrder: boolean;
    notifyOrderReady: boolean;
    notifyLowStock: boolean;
    soundEnabled: boolean;
    soundVolume: number; // 0-1
}

interface NotificationState {
    notifications: PosNotification[];
    settings: NotificationSettings;
    unreadCount: number;

    addNotification: (n: PosNotification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    setNotifications: (ns: PosNotification[]) => void;
    updateSettings: (s: Partial<NotificationSettings>) => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            settings: {
                notifyNewOrder: true,
                notifyOrderReady: true,
                notifyLowStock: true,
                soundEnabled: true,
                soundVolume: 0.7,
            },
            unreadCount: 0,

            addNotification: (n) => {
                const exists = get().notifications.some((x) => x.id === n.id);
                if (exists) return; // Prevent duplicates
                set((s) => ({
                    notifications: [n, ...s.notifications].slice(0, 100), // Keep last 100
                    unreadCount: s.unreadCount + 1,
                }));
            },

            markAsRead: (id) =>
                set((s) => ({
                    notifications: s.notifications.map((n) =>
                        n.id === id ? { ...n, isRead: true } : n
                    ),
                    unreadCount: Math.max(0, s.unreadCount - 1),
                })),

            markAllAsRead: () =>
                set((s) => ({
                    notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
                    unreadCount: 0,
                })),

            clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

            setNotifications: (ns) =>
                set({ notifications: ns, unreadCount: ns.filter((n) => !n.isRead).length }),

            updateSettings: (partial) =>
                set((s) => ({ settings: { ...s.settings, ...partial } })),
        }),
        {
            name: "pos-notifications",
            partialize: (state) => ({ settings: state.settings }), // Only persist settings
        }
    )
);
