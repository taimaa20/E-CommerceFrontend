import { create } from 'zustand';
import { api } from '@/lib/api';
import { getReferenceCache, putReferenceCache } from '@/lib/offline/db';
import { getConnectivityState } from '@/lib/offline/connectivity';
import { DEFAULT_VOUCHER_SETTINGS } from '@/lib/voucher';
import { DEFAULT_RESTAURANT_TIME_ZONE } from '@/lib/date-time';
import type { DuplicateInvoiceBehavior } from '@/lib/api-expense-invoices';

// FIX(bug-5,bug-6): Cache key for system settings so currency/tax survive offline
// reloads. Without this the store fell back to DEFAULT_SETTINGS (JOD) whenever
// /settings failed (offline, 401, degraded), causing JOD to appear on EGP tenants.
const SETTINGS_CACHE_KEY = 'system-settings';

export interface SystemSettings {
    // Restaurant
    restaurantName: string;
    restaurantTagline: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    restaurantAddress: string | null;
    restaurantPhone: string | null;
    whatsAppNumber: string | null;
    restaurantEmail: string | null;
    taxNumber: string | null;
    timeZoneId: string;
    websiteUrl: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tikTokUrl: string | null;
    googleMapsLocationUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    allowedRadiusMeters: number | null;
    googleReviewUrl: string | null;
    qrMenuUrl: string | null;
    // Finance
    currency: string;
    taxRate: number;
    serviceChargeRate: number;
    enableDiscounts: boolean;
    enableLoyalty: boolean;
    duplicateInvoiceBehavior: DuplicateInvoiceBehavior;
    voucherEnabled: boolean;
    voucherAmount: number;
    voucherDailyLimit: number;
    // Receipt
    receiptFooterNote: string;
    receiptCopies: number;
    autoPrintReceipt: boolean;
    showTaxOnReceipt: boolean;
    showLogoOnReceipt: boolean;
    // Notifications
    notifyNewOrder: boolean;
    notifyOrderReady: boolean;
    notifyLowStock: boolean;
    soundEnabled: boolean;
    nearExpiryDays: number;
    expiryJobRunTime: string;
    expiryNotifyRoles: string;
    // System
    language: string;
    orderPrepTimeout: number;
    kitchenDisplayEnabled: boolean;
    allowDirectCancel: boolean;
    tableAutoRelease: boolean;
    // Meta
    updatedAt: string | null;
}

const DEFAULT_SETTINGS: SystemSettings = {
    restaurantName: '',
    restaurantTagline: null,
    logoUrl: null,
    coverImageUrl: null,
    restaurantAddress: null,
    restaurantPhone: null,
    whatsAppNumber: null,
    restaurantEmail: null,
    taxNumber: null,
    timeZoneId: DEFAULT_RESTAURANT_TIME_ZONE,
    websiteUrl: null,
    facebookUrl: null,
    instagramUrl: null,
    tikTokUrl: null,
    googleMapsLocationUrl: null,
    latitude: null,
    longitude: null,
    allowedRadiusMeters: null,
    googleReviewUrl: null,
    qrMenuUrl: null,
    currency: 'JOD',
    taxRate: 16,
    serviceChargeRate: 0,
    enableDiscounts: true,
    enableLoyalty: true,
    duplicateInvoiceBehavior: 'WarningOnly',
    voucherEnabled: DEFAULT_VOUCHER_SETTINGS.enabled,
    voucherAmount: DEFAULT_VOUCHER_SETTINGS.amount,
    voucherDailyLimit: DEFAULT_VOUCHER_SETTINGS.dailyLimit,
    receiptFooterNote: 'Thank you for your visit!',
    receiptCopies: 1,
    autoPrintReceipt: false,
    showTaxOnReceipt: true,
    showLogoOnReceipt: true,
    notifyNewOrder: true,
    notifyOrderReady: true,
    notifyLowStock: true,
    soundEnabled: true,
    nearExpiryDays: 3,
    expiryJobRunTime: "01:00",
    expiryNotifyRoles: "Admin,Manager",
    language: 'en',
    orderPrepTimeout: 30,
    kitchenDisplayEnabled: true,
    allowDirectCancel: false,
    tableAutoRelease: false,
    updatedAt: null,
};

interface SettingsState {
    settings: SystemSettings;
    isLoaded: boolean;
    isLoading: boolean;
    error: string | null;

    fetchSettings: () => Promise<void>;
    updateSettings: (partial: Partial<SystemSettings>) => Promise<boolean>;
    getSettings: () => SystemSettings;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
    settings: { ...DEFAULT_SETTINGS },
    isLoaded: false,
    isLoading: false,
    error: null,

    fetchSettings: async () => {
        // Avoid refetching if already loaded
        if (get().isLoaded || get().isLoading) return;

        set({ isLoading: true, error: null });

        // FIX(bug-5,bug-6): Seed from IDB cache first so currency/tax match the
        // tenant even while offline or before /settings resolves. Without this,
        // the UI flashed DEFAULT_SETTINGS (JOD) on every cold boot.
        const cached = await getReferenceCache<SystemSettings>(SETTINGS_CACHE_KEY).catch(() => undefined);
        if (cached) {
            set({ settings: { ...DEFAULT_SETTINGS, ...cached }, isLoaded: true });
        }

        // FIX(bug-5,bug-6): Skip the network call when offline — avoids a
        // guaranteed fetch error that used to overwrite the store with defaults.
        if (getConnectivityState() === 'offline') {
            set({ isLoading: false, isLoaded: true });
            return;
        }

        try {
            const response = await api.get<SystemSettings>('/settings', { public: true });
            if (response.data) {
                const next = {
                    ...DEFAULT_SETTINGS,
                    ...response.data,
                    allowDirectCancel: response.data.allowDirectCancel === true,
                };
                set({ settings: next, isLoaded: true, isLoading: false });
                void putReferenceCache(SETTINGS_CACHE_KEY, next).catch(() => {});
            } else {
                set({ isLoaded: true, isLoading: false });
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load settings';
            // FIX(bug-5,bug-6): Keep whatever is already in the store (cached or
            // defaults) — do NOT reset to defaults on error, that is what caused
            // the JOD fallback when the backend was unreachable.
            set({ isLoaded: true, isLoading: false, error: message });
        }
    },

    updateSettings: async (partial) => {
        const current = get().settings;
        const updated = { ...DEFAULT_SETTINGS, ...current, ...partial };

        try {
            const response = await api.put<SystemSettings>('/settings', updated);
            const next = response.data ?? updated;
            set({ settings: next });
            // FIX(bug-5,bug-6): Mirror the freshly saved settings into IDB so the
            // next offline cold-boot uses the new currency/tax, not stale values.
            void putReferenceCache(SETTINGS_CACHE_KEY, next).catch(() => {});
            return true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to save settings';
            console.error('Failed to save settings:', message);
            return false;
        }
    },

    getSettings: () => get().settings,
}));
