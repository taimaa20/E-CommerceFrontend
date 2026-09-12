/**
 * print-receipt-local.ts
 * Loopback print path used when the cloud is unreachable. Posts the same HTML
 * the cloud path would have queued straight to the in-store agent's localhost
 * endpoint. Requires the cashier browser to live on the same PC as the agent.
 */

import { getCachedReceiptPrinter, type CachedReceiptPrinter } from "@/lib/cashier-printer-cache";

const DEFAULT_AGENT_URL = "http://127.0.0.1:5005";

function agentUrl(): string {
    if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_LOCAL_AGENT_URL) {
        return process.env.NEXT_PUBLIC_LOCAL_AGENT_URL;
    }
    return DEFAULT_AGENT_URL;
}

interface LocalPrintResponse {
    success?: boolean;
    error?: string;
}

/**
 * POSTs the receipt HTML to the local agent. Returns true if the agent
 * confirmed a successful print, false otherwise. Never throws.
 */
export async function printReceiptViaLocalAgent(htmlContent: string): Promise<boolean> {
    const printer: CachedReceiptPrinter | null = getCachedReceiptPrinter();
    if (!printer) {
        console.warn("[localPrint] no cached receipt printer; offline print skipped");
        return false;
    }

    const body = {
        htmlContent,
        printerType: printer.printerType,
        windowsPrinterName: printer.windowsPrinterName ?? null,
        ipAddress: printer.ipAddress ?? null,
        port: printer.port ?? 9100,
        copies: printer.copies ?? 1,
    };

    try {
        const res = await fetch(`${agentUrl()}/local/print/receipt-html`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            // Use cors so the browser sends the Origin header and runs PNA preflight.
            mode: "cors",
        });
        if (!res.ok) {
            console.warn("[localPrint] non-OK response", res.status);
            return false;
        }
        const data = (await res.json()) as LocalPrintResponse;
        if (!data.success) {
            console.warn("[localPrint] agent reported failure", data.error);
            return false;
        }
        return true;
    } catch (err) {
        console.warn("[localPrint] fetch failed", err);
        return false;
    }
}
