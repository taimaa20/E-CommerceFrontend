/**
 * print-receipt-image.ts
 *
 * Renders the cashier UI's existing HTML receipt design to a PNG using
 * html2canvas, then POSTs the image to the backend, which converts it to
 * raw ESC/POS raster bytes and enqueues a print job for the agent.
 *
 * No browser printing. No popup. The cashier's screen is untouched.
 *
 * The design — fonts, logo, layout, calculations — comes from the same
 * `buildReceiptBodyHtml` + `getReceiptCss` that the existing UI uses, so
 * any future tweak to `print-receipt.ts` flows through to the printer
 * automatically. There is no second "design" to maintain.
 */

import html2canvas from "html2canvas";
import {
    PrintReceiptOptions,
    buildReceiptBodyHtml,
    getReceiptCss,
} from "@/lib/print-receipt";
import { api } from "@/lib/api";

// 80mm thermal printer at 8 dots/mm = 576px logical width. Anything wider
// gets truncated by the printer; anything narrower wastes paper.
const THERMAL_PRINTER_WIDTH_PX = 576;

function scopeReceiptCss(css: string, scopeSelector: string): string {
    const printMediaIndex = css.indexOf("@media print");
    const screenCss = (printMediaIndex >= 0 ? css.slice(0, printMediaIndex) : css)
        .replace(/\/\*[\s\S]*?\*\//g, "");

    return Array.from(screenCss.matchAll(/([^{}]+)\{([^{}]*)\}/g))
        .map(([, rawSelectors, declarations]) => {
            const selectors = rawSelectors
                .split(",")
                .map((selector) => selector.trim())
                .filter(Boolean)
                .map((selector) => {
                    if (selector === "body" || selector === "html" || selector === ":root") {
                        return scopeSelector;
                    }

                    if (selector === "*") {
                        return `${scopeSelector} *`;
                    }

                    if (selector.startsWith(scopeSelector)) {
                        return selector;
                    }

                    return `${scopeSelector} ${selector}`;
                });

            return selectors.length > 0
                ? `${selectors.join(", ")} {${declarations}}`
                : "";
        })
        .filter(Boolean)
        .join("\n");
}

/**
 * Render the receipt HTML to a base64 PNG (no `data:` prefix). Pure
 * client-side — uses an off-screen DOM node + html2canvas. Resolves with
 * the encoded image string ready to POST to the backend.
 */
export async function renderReceiptToPngBase64(options: PrintReceiptOptions): Promise<string> {
    if (typeof window === "undefined") {
        throw new Error("renderReceiptToPngBase64 must be called in a browser context.");
    }

    const bodyHtml = buildReceiptBodyHtml(options);
    const css = getReceiptCss();

    // ── 1. Build a hidden, off-screen container ────────────────────────────
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-99999px";
    container.style.top = "0";
    container.style.width = `${THERMAL_PRINTER_WIDTH_PX}px`;
    container.style.background = "#ffffff";
    container.style.zIndex = "-1";
    container.setAttribute("data-receipt-render", "true");

    // Force LTR layout for the snapshot. The cashier UI's <html> may be
    // dir="rtl" when Arabic is active — that flips the receipt columns
    // (label vs. value, item vs. amount), which doesn't match the PDF
    // design. The Arabic TEXT inside cells still renders correctly via
    // its own bidi handling; only the page-level column order is locked.
    container.setAttribute("dir", "ltr");
    container.style.direction = "ltr";
    container.style.textAlign = "left";

    // Inline the same CSS the popup-printer used so the rendered DOM matches
    // the cashier's printable design exactly. Scoped via a parent class so it
    // can't leak onto the host page.
    const styleTag = document.createElement("style");
    styleTag.textContent = scopeReceiptCss(css, '[data-receipt-render="true"]');
    container.appendChild(styleTag);

    const inner = document.createElement("div");
    inner.innerHTML = bodyHtml;
    container.appendChild(inner);

    document.body.appendChild(container);

    try {
        // ── 2. Wait for any embedded images (logo, QR) to load ────────────
        await waitForImages(container);

        // ── 3. Snapshot the DOM ───────────────────────────────────────────
        const canvas = await html2canvas(container, {
            backgroundColor: "#ffffff",
            scale: 1,
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: THERMAL_PRINTER_WIDTH_PX,
            // Match height to the actual content height after layout.
            windowWidth: THERMAL_PRINTER_WIDTH_PX,
        });

        // ── 4. Convert to base64 PNG (strip the data URL prefix) ──────────
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
        return base64;
    } finally {
        // Always tear down the off-screen DOM, even on error.
        container.remove();
    }
}

function waitForImages(root: HTMLElement, timeoutMs = 4000): Promise<void> {
    const imgs = Array.from(root.querySelectorAll("img"));
    if (imgs.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
        let pending = imgs.length;
        const done = () => { if (--pending <= 0) resolve(); };

        for (const img of imgs) {
            if ((img as HTMLImageElement).complete) {
                done();
            } else {
                img.addEventListener("load", done);
                img.addEventListener("error", done);
            }
        }
        // Hard fallback — if a logo hangs (offline, blocked CDN), don't deadlock.
        setTimeout(resolve, timeoutMs);
    });
}

/**
 * Render the receipt to PNG and POST it to the backend. Returns true if the
 * backend enqueued a print job, false if it rejected (e.g., no receipt
 * printer configured).
 */
export async function printReceiptViaImage(options: PrintReceiptOptions): Promise<boolean> {
    try {
        const base64Png = await renderReceiptToPngBase64(options);
        const response = await api.post<{ enqueued: boolean; reason?: string }>(
            `/printing/orders/${options.order.id}/receipt-image`,
            { imageBase64: base64Png },
        );
        return Boolean(response.data?.enqueued);
    } catch (error) {
        console.error("printReceiptViaImage failed:", error);
        return false;
    }
}

/**
 * Auto-print a freshly-created order's receipt using the same HTML design
 * the cashier UI shows. Reads settings + branding from their respective
 * stores so callers (order-create flow, payment flow) only need to hand
 * over the OrderDto. Best-effort, fire-and-forget: prints if it can,
 * surfaces a toast if it can't, never blocks the caller.
 *
 * Imports the stores dynamically to avoid bundling print code into pages
 * that never print (this module is itself lazy-loaded by the caller).
 */
export async function autoPrintReceiptForOrder(
    order: import("@/types/order").OrderDto,
): Promise<void> {
    if (typeof window === "undefined") return;

    try {
        const [{ useSettingsStore }, { useBrandingStore }, { usePosStore }, { printReceipt }] = await Promise.all([
            import("@/store/settingsStore"),
            import("@/store/brandingStore"),
            import("@/store/posStore"),
            import("@/lib/print-receipt"),
        ]);

        const settings = useSettingsStore.getState().settings;
        const branding = useBrandingStore.getState();
        const pos = usePosStore.getState();

        // Route through the same HTML path takeaway uses so dine-in and
        // takeaway receipts render with identical layout/scale (80mm).
        printReceipt({
            order,
            settings,
            logoUrl: branding.logoUrl ?? null,
            businessName: branding.businessName ?? settings.restaurantName,
            products: pos.products,
            currency: pos.currency || settings.currency,
            storeServiceChargeRate: pos.serviceChargeRate,
            storeTaxRate: pos.taxRate,
        });
    } catch (error) {
        console.error("autoPrintReceiptForOrder failed:", error);
    }
}
