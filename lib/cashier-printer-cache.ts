/**
 * cashier-printer-cache.ts
 * Caches the cashier's resolved receipt-printer config in localStorage so the
 * offline print path knows where to print without round-tripping to the cloud.
 * Refreshed opportunistically while the cashier is online.
 */

import { api } from "@/lib/api";

export interface CachedReceiptPrinter {
    /** 0 = Network, 1 = USB — matches backend PrinterType enum. */
    printerType: number;
    windowsPrinterName?: string | null;
    ipAddress?: string | null;
    port?: number;
    copies?: number;
}

const STORAGE_KEY = "cashier:receiptPrinter:v1";

export function getCachedReceiptPrinter(): CachedReceiptPrinter | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedReceiptPrinter;
        if (typeof parsed.printerType !== "number") return null;
        return parsed;
    } catch {
        return null;
    }
}

function saveCachedReceiptPrinter(value: CachedReceiptPrinter | null): void {
    if (typeof window === "undefined") return;
    try {
        if (value === null) {
            window.localStorage.removeItem(STORAGE_KEY);
            return;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
        /* localStorage may be full / disabled — ignore */
    }
}

/**
 * Refresh the cache from the cloud. Safe to call on every cashier-page mount
 * and on reconnect; failures are silently ignored so the existing cache stays
 * valid until the next successful refresh.
 */
export async function refreshReceiptPrinterCache(): Promise<void> {
    try {
        const res = await api.get<CachedReceiptPrinter>("/printing/me/receipt-printer-config");
        if (res.data && typeof res.data.printerType === "number") {
            saveCachedReceiptPrinter(res.data);
        }
    } catch {
        /* offline or no printer assigned — keep whatever's already cached */
    }
}
