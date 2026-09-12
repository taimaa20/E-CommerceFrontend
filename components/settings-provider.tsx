"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { usePosStore } from "@/store/posStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useDashboardFilterStore } from "@/store/dashboardFilterStore";

/**
 * SettingsProvider loads system settings from the backend on mount
 * and syncs them to the posStore and notificationStore for immediate use.
 *
 * This component should be placed inside providers that handle auth
 * so it can make authenticated API calls.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { fetchSettings, settings, isLoaded } = useSettingsStore();
    const { setCurrency, setTaxRate, setServiceChargeRate } = usePosStore();
    const { updateSettings: updateNotifSettings } = useNotificationStore();
    const setDashboardTimeZone = useDashboardFilterStore((state) => state.setTimeZone);

    // Fetch settings from backend on mount
    useEffect(() => {
        fetchSettings();
    }, []);

    // When settings load, sync finance & notification settings to existing stores
    useEffect(() => {
        if (!isLoaded) return;

        // Sync finance settings to posStore
        if (settings.currency) setCurrency(settings.currency);
        if (settings.taxRate !== undefined) setTaxRate(settings.taxRate);
        if (settings.serviceChargeRate !== undefined) setServiceChargeRate(settings.serviceChargeRate);
        setDashboardTimeZone(settings.timeZoneId);

        // Sync notification settings to notificationStore
        updateNotifSettings({
            notifyNewOrder: settings.notifyNewOrder,
            notifyOrderReady: settings.notifyOrderReady,
            notifyLowStock: settings.notifyLowStock,
            soundEnabled: settings.soundEnabled,
        });
    }, [isLoaded, settings, setCurrency, setTaxRate, setServiceChargeRate, setDashboardTimeZone, updateNotifSettings]);

    return <>{children}</>;
}
