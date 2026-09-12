/**
 * print-receipt.ts
 * Generates a bilingual (EN / AR) thermal-style receipt and opens a print window.
 * Uses existing order data — no API changes required.
 */

import type { OrderDto, OrderItemDto } from "@/types/order";
import type { SystemSettings } from "@/store/settingsStore";
import type { ProductDto } from "@/types/pos";
import { getOrderPaidAmount, getPaymentBreakdown, getPaymentSummaryLabel } from "@/lib/order-payments";
import { calculateOrderDiscountTotals } from "@/lib/order-discount";
import { printReceiptDirect } from "@/lib/api";
import { getReceiptQr, getReceiptQrImageUrl } from "@/lib/receipt-qr";
import { formatOrderSequence } from "@/lib/order-sequence";
import { toast } from "sonner";
import { putReceiptTransaction } from "@/lib/offline/db";
import {
    formatRestaurantDateTime,
    formatRestaurantTime,
} from "@/lib/date-time";

export interface PrintReceiptOptions {
    order: OrderDto;
    settings: SystemSettings;
    logoUrl?: string | null;
    businessName?: string | null;
    /** posStore.products — used to look up Arabic product names */
    products?: ProductDto[];
    currency?: string;
    /** posStore store-level rates — used as fallback when order.serviceChargeRate / taxRate are 0 */
    storeServiceChargeRate?: number;
    storeTaxRate?: number;
    /** Customer phone number (optional) */
    customerPhone?: string;
    /** Customer display name (optional) */
    customerName?: string;
    /** Cash amount handed by customer (optional, Cash payments only) */
    amountTendered?: number;
    /** Change returned to customer = amountTendered - grandTotal */
    changeAmount?: number;
    /** Pre-opened print window from a direct user click to avoid popup blocking */
    targetWindow?: Window | null;
    /** Prevents automatic payment/reconnect flows from printing the same receipt twice. */
    forceReprint?: boolean;
    receiptTransactionId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str: string | null | undefined): string {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function fmtMoney(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency || "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

function fmtDateTime(timeZone: string): string {
    return formatRestaurantDateTime(new Date(), timeZone, "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

function fmtTime(value: string | null | undefined, timeZone: string): string {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return formatRestaurantTime(date, timeZone, "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function resolveReceiptCustomerName(order: OrderDto, customerName?: string): string {
    return customerName?.trim()
        || order.customerName?.trim()
        || order.customerNameAr?.trim()
        || order.partnerCustomerName?.trim()
        || order.talabatCustomerName?.trim()
        || "";
}

const RECEIPT_LEDGER_KEY = "pos:printed-receipts:v1";

function getReceiptReference(order: OrderDto): string {
    return order.publicOrderNumber || order.orderNumber || order.id;
}

function getReceiptTransactionId(order: OrderDto): string {
    return `receipt:${getReceiptReference(order)}:paid:${getOrderPaidAmount(order).toFixed(2)}`;
}

function readReceiptLedger(): Record<string, number> {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(RECEIPT_LEDGER_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw) as Record<string, number>;
    } catch {
        window.localStorage.removeItem(RECEIPT_LEDGER_KEY);
        return {};
    }
}

function reserveReceiptPrint(order: OrderDto, forceReprint?: boolean): { reserved: boolean; id: string } {
    const id = forceReprint ? `${getReceiptTransactionId(order)}:reprint:${Date.now()}` : getReceiptTransactionId(order);
    if (forceReprint || typeof window === "undefined") return { reserved: true, id };

    const ledger = readReceiptLedger();
    if (ledger[id]) return { reserved: false, id };

    ledger[id] = Date.now();
    window.localStorage.setItem(RECEIPT_LEDGER_KEY, JSON.stringify(ledger));
    return { reserved: true, id };
}

function releaseReceiptReservation(id: string): void {
    if (typeof window === "undefined") return;
    const ledger = readReceiptLedger();
    delete ledger[id];
    window.localStorage.setItem(RECEIPT_LEDGER_KEY, JSON.stringify(ledger));
}

function splitOfferItemsForReceipt(order: OrderDto): {
    offerCoveredTotal: number;
    visibleItems: OrderItemDto[];
} {
    // Check if backend already bundled the items (new behavior)
    const offerBundleItem = order.items?.find(item => item.isOfferBundle);
    if (offerBundleItem) {
        // New behavior: backend already created offer bundle
        // Return bundle and regular items as-is
        return {
            offerCoveredTotal: offerBundleItem.lineTotalAmount ?? 0,
            visibleItems: order.items?.filter(item => !item.isOfferBundle) ?? []
        };
    }

    // Legacy behavior: manually separate offer items from regular items
    const coveredQuantities = new Map<string, number>();
    for (const offerProduct of order.offerProducts || []) {
        coveredQuantities.set(
            offerProduct.productId,
            (coveredQuantities.get(offerProduct.productId) ?? 0) + offerProduct.quantity,
        );
    }

    let offerCoveredTotal = 0;
    const visibleItems: OrderItemDto[] = [];

    for (const item of order.items || []) {
        const quantity = item.quantity ?? 0;
        const lineTotalAmount = item.lineTotalAmount ?? 0;
        const unitLineAmount = quantity > 0 ? lineTotalAmount / quantity : 0;
        const hasCustomizations = !!item.notes || (item.modifiers?.length ?? 0) > 0;
        const productId = item.productId ?? "";

        let coveredQuantity = 0;
        if (!hasCustomizations && productId) {
            const remainingCoveredQuantity = coveredQuantities.get(productId) ?? 0;
            if (remainingCoveredQuantity > 0) {
                coveredQuantity = Math.min(remainingCoveredQuantity, quantity);
                coveredQuantities.set(productId, remainingCoveredQuantity - coveredQuantity);
            }
        }

        if (coveredQuantity > 0) {
            offerCoveredTotal += unitLineAmount * coveredQuantity;
        }

        const extraQuantity = quantity - coveredQuantity;
        if (extraQuantity > 0) {
            visibleItems.push({
                ...item,
                quantity: extraQuantity,
                lineTotalAmount: item.isComplimentary ? 0 : Number((unitLineAmount * extraQuantity).toFixed(2)),
            });
        }
    }

    return {
        offerCoveredTotal: Number(offerCoveredTotal.toFixed(2)),
        visibleItems,
    };
}

// ─── CSS (embedded in print window) ───────────────────────────────────────────

const RECEIPT_CSS = `
:root {
  --receipt-paper-width: 80mm;
  --receipt-content-width: 64mm;
  --receipt-left-safe: 3mm;
  --receipt-amount-safe: 2mm;
}

* { margin: 0; padding: 0; box-sizing: border-box; word-break: break-word; }

body {
  font-family: Arial, Helvetica, 'Liberation Sans', sans-serif;
  font-size: 13px;
  font-weight: bold;
  background: #fff;
  color: #000;
  width: var(--receipt-paper-width);
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: geometricPrecision;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Force every element to print pure black, no grey antialiasing halos. */
* { color: #000 !important; }

.page-break { page-break-after: always; }

.receipt {
  width: var(--receipt-content-width);
  max-width: var(--receipt-content-width);
  margin-left: var(--receipt-left-safe);
  margin-right: auto;
  padding: 6px 2px 10px;
  box-sizing: border-box;
}

/* ── Header ── */
.header { text-align: center; margin-bottom: 6px; }
.logo { width: 140px; height: 140px; object-fit: contain; display: block; margin: 0 auto 6px; }
.rest-name {
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 0.5px;
  margin: 2px 0;
}
.rest-info { font-size: 10px; margin: 1px 0; }

/* ── Dividers ── */
.div-eq  { border: none; border-top: 1px solid #000; margin: 5px 0; }
.div-dash { border: none; border-top: 1px dashed #555; margin: 4px 0; }

/* ── Order meta ── */
.meta-table { width: 100%; border-collapse: collapse; margin: 3px 0; }
.meta-table td { font-size: 11px; padding: 1px 0; vertical-align: top; }
.meta-label { width: 38%; font-weight: bold; }
.meta-value {
  width: 62%;
  text-align: right;
  padding-right: var(--receipt-amount-safe);
  font-size: 10px;
  direction: ltr;
  unicode-bidi: isolate;
}
.meta-value-address { white-space: pre-wrap; }

/* ── Items ── */
.items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.items-table th {
  font-size: 10px;
  text-transform: uppercase;
  border-bottom: 1px solid #000;
  padding: 2px 1px;
}
.th-name  { text-align: left;   width: 52%; }
.th-qty   { text-align: center; width: 9%; }
.th-price { text-align: right;  width: 39%; padding-right: var(--receipt-amount-safe); white-space: nowrap; }

.items-table td { padding: 2px 1px; vertical-align: top; }
.td-name  { width: 52%; }
.td-qty   { width: 9%; text-align: center; }
.td-price {
  width: 39%;
  text-align: right;
  padding-right: var(--receipt-amount-safe);
  white-space: nowrap;
  font-size: 12px;
  direction: ltr;
  unicode-bidi: isolate;
}

/* Item names */
.name-en { font-weight: bold; font-size: 12px; }
.name-ar {
  font-family: 'Arial', 'Tahoma', sans-serif;
  font-size: 13px;
  font-weight: bold;
  direction: rtl;
  display: block;
  text-align: right;
  color: #000;
}
.comp-badge { font-size: 9px; color: #555; font-style: italic; }

/* Modifiers */
.mod-row td { font-size: 11px; font-weight: bold; color: #000; }
.mod-name { padding-left: 10px; }
.mod-name-ar {
  font-family: 'Arial', 'Tahoma', sans-serif;
  font-size: 12px;
  font-weight: bold;
  direction: rtl;
  display: block;
  text-align: right;
  padding-right: 10px;
  color: #000;
}

/* Notes */
.notes-row td { font-size: 11px; font-weight: bold; font-style: italic; color: #000; padding-left: 10px; }

/* Offer block */
.offer-box {
  border: 1px dashed #555;
  padding: 5px 6px;
  margin: 5px 0;
}
.offer-title {
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 3px;
}
.offer-subtitle {
  font-size: 9px;
  color: #333;
  margin-bottom: 4px;
}
.offer-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 0;
}
.offer-item-copy {
  flex: 1;
  min-width: 0;
}
.offer-item-qty {
  white-space: nowrap;
  font-size: 10px;
  font-weight: bold;
}
.offer-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 2px 0 5px;
  margin-bottom: 4px;
  border-bottom: 1px dashed #777;
}
.offer-price-label {
  font-size: 10px;
  font-weight: bold;
}
.offer-price-value {
  font-size: 11px;
  font-weight: bold;
}

/* Summary rows */
.sum-row td { font-size: 11px; padding: 1px 0; }
.sum-label { text-align: left; }
.sum-value {
  text-align: right;
  padding-right: var(--receipt-amount-safe);
  white-space: nowrap;
  direction: ltr;
  unicode-bidi: isolate;
}
.discount-row td { color: #333; }

/* Total row */
.total-row td {
  font-size: 13px;
  font-weight: bold;
  border-top: 2px solid #000;
  padding-top: 3px;
  padding-bottom: 2px;
}
.total-label { text-align: left; }
.total-value {
  text-align: right;
  padding-right: var(--receipt-amount-safe);
  white-space: nowrap;
  direction: ltr;
  unicode-bidi: isolate;
}

/* Payment row */
.pay-row td { font-size: 11px; color: #222; padding: 1px 0; }

/* Footer */
.footer {
  text-align: center;
  font-family: 'Tahoma', Arial, sans-serif;
  font-size: 11px;
  margin-top: 8px;
  line-height: 1.4;
}

/* QR Menu */
.qr-section {
  text-align: center;
  margin-top: 8px;
  page-break-inside: avoid;
}
.qr-title {
  font-size: 11px;
  font-weight: bold;
  margin: 4px 0 2px;
}
.qr-image {
  width: 140px;
  height: 140px;
  display: block;
  margin: 4px auto;
}
.qr-url {
  font-size: 9px;
  color: #333;
  margin-top: 2px;
  word-break: break-all;
}

@media print {
  html, body { width: var(--receipt-paper-width); }
  @page { size: 80mm auto; margin: 0; }
  .page-break { page-break-after: always; }
}
`;

// ─── Build single receipt HTML block ──────────────────────────────────────────

function buildReceiptBlock(
    order: OrderDto,
    s: SystemSettings,
    logoUrl: string | null | undefined,
    businessName: string | null | undefined,
    products: ProductDto[],
    currency: string,
    storeServiceChargeRate = 0,
    storeTaxRate = 0,
    customerPhone?: string,
    customerName?: string,
    amountTendered?: number,
    changeAmount?: number,
): string {
    const isTakeaway = order.orderType === "Takeaway";
    const isDelivery = order.orderType === "Delivery" || order.tableName === "DELIVERY";
    const isTalabat = order.orderSource === "Talabat";
    const isDeliveryPartner = order.orderSource === "DeliveryPartner";
    const deliveryAddress = order.deliveryAddress ?? "";
    const shouldPrintDeliveryAddress =
        deliveryAddress.trim().length > 0 && (isDelivery || isTalabat || isDeliveryPartner);
    const partnerName = order.deliveryPartnerName || order.deliveryPartnerCode || "Delivery Partner";
    const locationMetaLabel = isDeliveryPartner || isTalabat
        ? "Source / المصدر"
        : isDelivery
        ? "Delivery Area / منطقة التوصيل"
        : isTakeaway ? "Type" : "Table";
    const tableLabel = isDeliveryPartner
        ? "Delivery Partner / شريك توصيل"
        : isTalabat
        ? "Talabat / طلبات"
        : isDelivery
        ? (order.deliveryZoneName || "Delivery / توصيل")
        : isTakeaway
        ? "Takeaway / طلب خارجي"
        : (order.tableName || "—");
    const paymentBreakdown = getPaymentBreakdown(order);
    const paymentSummaryLabel = getPaymentSummaryLabel(order);
    const paymentTypeLabel = order.paymentMethod || paymentSummaryLabel || "";
    const paymentMethodDetailLabel =
        paymentSummaryLabel && paymentTypeLabel && paymentSummaryLabel !== paymentTypeLabel
            ? paymentSummaryLabel
            : "";
    const paymentReferenceLabel = Array.from(new Set(
        (order.payments ?? [])
            .map((payment) => payment.referenceNumber?.trim())
            .filter((reference): reference is string => !!reference)
    )).join(" + ");
    const talabatPaymentLabel = isTalabat && order.talabatPaymentMethod
        ? `${order.talabatPaymentMethod === "Cash" ? "Cash" : "Prepaid"} / ${order.talabatPaymentMethod}`
        : "";
    const partnerPaymentLabel = isDeliveryPartner && order.partnerPaymentMethod ? order.partnerPaymentMethod : "";
    const displayPaymentLabel = isTalabat
        ? (talabatPaymentLabel || paymentSummaryLabel)
        : isDeliveryPartner
        ? (partnerPaymentLabel || paymentSummaryLabel)
        : paymentTypeLabel;
    const totalPaid = paymentBreakdown.length ? getOrderPaidAmount(order) : 0;
    const receiptCustomerName = resolveReceiptCustomerName(order, customerName);
    const receiptCustomerPhone = customerPhone?.trim()
        || order.customerPhone?.trim()
        || order.partnerCustomerPhone?.trim()
        || order.talabatCustomerPhone?.trim()
        || "";
    const talabatPickupTime = fmtTime(order.talabatPickupTime, s.timeZoneId);
    const receiptItemCount = (order.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);

    // ── Header ──
    const logoHtml =
        s.showLogoOnReceipt && logoUrl
            ? `<img src="${esc(logoUrl)}" alt="logo" class="logo" />`
            : "";

    const headerHtml = `
        <div class="header">
            ${logoHtml}
            ${s.restaurantAddress ? `<div class="rest-info">${esc(s.restaurantAddress)}</div>` : ""}
            ${s.restaurantPhone   ? `<div class="rest-info">Tel: ${esc(s.restaurantPhone)}</div>` : ""}
            ${s.taxNumber         ? `<div class="rest-info">Tax No: ${esc(s.taxNumber)}</div>` : ""}
        </div>
    `;

    // ── Order meta ──
    const sequenceLabel = formatOrderSequence(order);
    const metaHtml = `
        <table class="meta-table">
            <tr>
                <td class="meta-label">Order</td>
                <td class="meta-value">${esc(sequenceLabel ?? `#${order.orderNumber.slice(-4)}`)}</td>
            </tr>
            ${sequenceLabel ? `
            <tr>
                <td class="meta-label">System ID</td>
                <td class="meta-value">${esc(order.orderNumber)}</td>
            </tr>` : ""}
            <tr>
                <td class="meta-label">${locationMetaLabel}</td>
                <td class="meta-value">${esc(tableLabel)}</td>
            </tr>
            ${shouldPrintDeliveryAddress ? `
            <tr>
                <td class="meta-label">Address / العنوان</td>
                <td class="meta-value meta-value-address">${esc(deliveryAddress)}</td>
            </tr>` : ""}
            <tr>
                <td class="meta-label">Date</td>
                <td class="meta-value">${fmtDateTime(s.timeZoneId)}</td>
            </tr>
            ${isTalabat && order.talabatOrderNumber ? `
            <tr>
                <td class="meta-label">Talabat #</td>
                <td class="meta-value">${esc(order.talabatOrderNumber)}</td>
            </tr>` : ""}
            ${isDeliveryPartner ? `
            <tr>
                <td class="meta-label">Partner</td>
                <td class="meta-value">${esc(partnerName)}</td>
            </tr>` : ""}
            ${isDeliveryPartner && order.partnerOrderNumber ? `
            <tr>
                <td class="meta-label">Partner #</td>
                <td class="meta-value">${esc(order.partnerOrderNumber)}</td>
            </tr>` : ""}
            ${isTalabat && talabatPickupTime ? `
            <tr>
                <td class="meta-label">Pickup Time</td>
                <td class="meta-value">${esc(talabatPickupTime)}</td>
            </tr>` : ""}
            ${isTalabat && receiptItemCount > 0 ? `
            <tr>
                <td class="meta-label">Items</td>
                <td class="meta-value">${receiptItemCount}</td>
            </tr>` : ""}
            ${displayPaymentLabel ? `
            <tr>
                <td class="meta-label">Payment Type</td>
                <td class="meta-value">${esc(displayPaymentLabel)}</td>
            </tr>` : ""}
            ${paymentMethodDetailLabel && !isTalabat && !isDeliveryPartner ? `
            <tr>
                <td class="meta-label">Payment Method</td>
                <td class="meta-value">${esc(paymentMethodDetailLabel)}</td>
            </tr>` : ""}
            ${paymentReferenceLabel ? `
            <tr>
                <td class="meta-label">Payment Reference</td>
                <td class="meta-value">${esc(paymentReferenceLabel)}</td>
            </tr>` : ""}
            ${receiptCustomerName ? `
            <tr>
                <td class="meta-label">Customer</td>
                <td class="meta-value">${esc(receiptCustomerName)}</td>
            </tr>` : ""}
            ${receiptCustomerPhone ? `
            <tr>
                <td class="meta-label">Phone</td>
                <td class="meta-value">${esc(receiptCustomerPhone)}</td>
            </tr>` : ""}
        </table>
    `;

    const { offerCoveredTotal, visibleItems } = splitOfferItemsForReceipt(order);

    const hasOfferDetails =
        !!order.offerId &&
        (!!order.offerName || !!order.offerNameAr || (order.offerProducts?.length ?? 0) > 0);

    const offerHtml = hasOfferDetails ? `
        <div class="offer-box">
            <div class="offer-title">Offer / العرض</div>
            <div class="offer-subtitle">Included Items / محتوى العرض</div>
            ${order.offerName ? `<span class="name-en">${esc(order.offerName)}</span>` : ""}
            ${order.offerNameAr ? `<span class="name-ar">${esc(order.offerNameAr)}</span>` : ""}
            ${offerCoveredTotal > 0 ? `
                <div class="offer-price-row">
                    <span class="offer-price-label">Offer Price / سعر العرض</span>
                    <span class="offer-price-value">${fmtMoney(offerCoveredTotal, currency)}</span>
                </div>
            ` : ""}
            ${(order.offerProducts || []).map((product) => `
                <div class="offer-item">
                    <div class="offer-item-copy">
                        ${product.name ? `<span class="name-en">${esc(product.name)}</span>` : ""}
                        ${product.nameAr ? `<span class="name-ar">${esc(product.nameAr)}</span>` : ""}
                    </div>
                    <div class="offer-item-qty">x${product.quantity}</div>
                </div>
            `).join("")}
        </div>
    ` : "";

    // ── Items ──
    let itemRows = "";
    for (const item of visibleItems) {
        const nameEn  = item.productName || "";
        const nameAr  = products.find((p) => p.id === item.productId)?.nameAr ?? "";
        const qty     = item.quantity ?? 1;
        const line    = item.isComplimentary ? 0 : (item.lineTotalAmount ?? 0);

        itemRows += `
            <tr>
                <td class="td-name">
                    <span class="name-en">${esc(nameEn)}</span>
                    ${nameAr ? `<span class="name-ar">${esc(nameAr)}</span>` : ""}
                    ${item.isComplimentary ? `<span class="comp-badge">(Complimentary)</span>` : ""}
                </td>
                <td class="td-qty">${qty}</td>
                <td class="td-price">${item.isComplimentary ? "—" : fmtMoney(line, currency)}</td>
            </tr>
        `;

        // Selected alternative (option) — shows chosen variant under the product name.
        if (item.selectedOptionName) {
            itemRows += `
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ▸ ${esc(item.selectedOptionName)}
                        ${item.selectedOptionNameAr ? `<span class="mod-name-ar">▸ ${esc(item.selectedOptionNameAr)}</span>` : ""}
                    </td>
                </tr>
            `;
        }

        // Modifier rows
        for (const mod of item.modifiers || []) {
            if (!mod.modifierName) continue;
            const modTotal = (mod.price ?? 0) * (mod.quantity ?? 1);
            itemRows += `
                <tr class="mod-row">
                    <td colspan="2" class="mod-name">
                        + ${esc(mod.modifierName)}
                        ${mod.modifierNameAr ? `<span class="mod-name-ar">+ ${esc(mod.modifierNameAr)}</span>` : ""}
                    </td>
                    <td class="td-price">${modTotal > 0 ? fmtMoney(modTotal, currency) : ""}</td>
                </tr>
            `;
        }

        // Ingredient-swap rows — snapshot rows where the cashier chose an alternative
        // for one of the recipe ingredients (e.g. Saj instead of Pita). The row shows
        // the substitute so the kitchen and the customer both see the deviation.
        for (const swap of item.recipeSnapshot || []) {
            if (!swap.sourceAlternativeId) continue;
            const swapEn = swap.sourceAlternativeName || swap.rawMaterialName || "";
            const swapAr = swap.sourceAlternativeNameAr || swap.rawMaterialNameAr || "";
            if (!swapEn && !swapAr) continue;
            itemRows += `
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ↪ ${esc(swapEn)}
                        ${swapAr ? `<span class="mod-name-ar">↪ ${esc(swapAr)}</span>` : ""}
                    </td>
                </tr>
            `;
        }

        // Notes row
        if (item.notes) {
            itemRows += `
                <tr class="notes-row">
                    <td colspan="3">Note: ${esc(item.notes)}</td>
                </tr>
            `;
        }
    }

    // ── Summary ──
    const subtotal =
        (order.subtotal && order.subtotal > 0)
            ? order.subtotal
            : (order.items || []).reduce((s, i) => s + (i.lineTotalAmount ?? 0), 0);

    // Resolve discount — use stored amount or compute from rate
    const discountAmt = (order.discountAmount && order.discountAmount > 0)
        ? order.discountAmount
        : subtotal * ((order.discountPercentage ?? 0) / 100);
    const safeDiscountAmount = Math.round(discountAmt * 100) / 100;

    // Resolve service charge — use stored amount, fall back to computing from rate
    // Mirror cashier/takeaway: prefer order rate, fall back to store-level rate
    const serviceChargeRate = (order.serviceChargeRate ?? 0) > 0 ? order.serviceChargeRate! : storeServiceChargeRate;
    const taxRate = (order.taxRate ?? 0) > 0 ? order.taxRate! : storeTaxRate;
    const discountType = order.discountType ?? (order.discountPercentage > 0 ? "Percentage" : null);
    const discountValue = order.discountValue ?? order.discountPercentage ?? 0;
    const discountGroupType = order.discountGroupType ?? 0;
    const discountGroupValue = order.discountGroupValue ?? 0;
    const computedTotals = calculateOrderDiscountTotals(subtotal, discountType, discountValue, serviceChargeRate, taxRate, discountGroupValue, discountGroupType);
    // Affiliation group discount — prefer the server-stored amount, fall back to computed.
    const discountGroupAmt = (order.discountGroupAmount && order.discountGroupAmount > 0)
        ? Math.round(order.discountGroupAmount * 100) / 100
        : computedTotals.discountGroupAmount;
    const afterDiscount = subtotal - safeDiscountAmount - discountGroupAmt;
    const serviceChargeAmt = (order.serviceChargeAmount && order.serviceChargeAmount > 0)
        ? order.serviceChargeAmount
        : computedTotals.serviceChargeAmount;

    // Resolve tax — use stored amount, fall back to computing from rate
    const taxAmt = (order.taxAmount && order.taxAmount > 0)
        ? order.taxAmount
        : computedTotals.taxAmount;

    const deliveryFee = Math.max(0, Math.round((order.deliveryFee ?? 0) * 100) / 100);
    const talabatDeliveryFee = Math.max(0, Math.round((order.talabatDeliveryFee ?? 0) * 100) / 100);
    const talabatServiceFee = Math.max(0, Math.round((order.talabatServiceFee ?? 0) * 100) / 100);
    const partnerDeliveryFee = Math.max(0, Math.round((order.partnerDeliveryFee ?? 0) * 100) / 100);
    const partnerServiceFee = Math.max(0, Math.round((order.partnerServiceFee ?? 0) * 100) / 100);
    const grandTotal = Math.round((afterDiscount + serviceChargeAmt + taxAmt + deliveryFee + talabatDeliveryFee + talabatServiceFee + partnerDeliveryFee + partnerServiceFee) * 100) / 100;

    // Voucher — read-only from stored order state (server-applied or offline snapshot).
    // Never recomputed here; we only display what was already calculated.
    const voucherApplied = order.isVoucherApplied === true;
    const voucherDiscountAmt = voucherApplied
        ? Math.max(0, Math.round((order.voucherDiscountAmount ?? 0) * 100) / 100)
        : 0;

    // Final payable matches the payment popup: max(0, grandTotal - voucher).
    // Clamp prevents a negative total when voucher exceeds the bill.
    const displayPayableTotal = Math.round(Math.max(0, grandTotal - voucherDiscountAmt) * 100) / 100;

    let summaryRows = `
        <tr class="sum-row">
            <td colspan="2" class="sum-label">Subtotal</td>
            <td class="sum-value">${fmtMoney(subtotal, currency)}</td>
        </tr>
    `;

    if (discountAmt > 0) {
        summaryRows += `
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Discount (${discountType === "Percentage" ? `${discountValue}%` : fmtMoney(discountValue, currency)})</td>
                <td class="sum-value">-${fmtMoney(discountAmt, currency)}</td>
            </tr>
        `;
    }

    if (discountGroupAmt > 0) {
        const groupSuffix = discountGroupType === 0 ? ` (${discountGroupValue}%)` : "";
        const groupLabel = order.discountGroupName
            ? `${order.discountGroupName}${groupSuffix}`
            : `Group Discount / خصم الفئة${groupSuffix}`;
        summaryRows += `
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">${groupLabel}</td>
                <td class="sum-value">-${fmtMoney(discountGroupAmt, currency)}</td>
            </tr>
        `;
    }

    if (serviceChargeAmt > 0) {
        summaryRows += `
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Service (${serviceChargeRate}%)</td>
                <td class="sum-value">${fmtMoney(serviceChargeAmt, currency)}</td>
            </tr>
        `;
    }

    if (s.showTaxOnReceipt !== false && taxAmt > 0) {
        summaryRows += `
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Tax (${taxRate}%)</td>
                <td class="sum-value">${fmtMoney(taxAmt, currency)}</td>
            </tr>
        `;
    }

    if (deliveryFee > 0) {
        summaryRows += `
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Delivery Fee / رسوم التوصيل</td>
                <td class="sum-value">${fmtMoney(deliveryFee, currency)}</td>
            </tr>
        `;
    }

    if (talabatDeliveryFee > 0) {
        summaryRows += `
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Delivery / توصيل طلبات</td>
                <td class="sum-value">${fmtMoney(talabatDeliveryFee, currency)}</td>
            </tr>
        `;
    }

    if (talabatServiceFee > 0) {
        summaryRows += `
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Service / خدمة طلبات</td>
                <td class="sum-value">${fmtMoney(talabatServiceFee, currency)}</td>
            </tr>
        `;
    }

    if (partnerDeliveryFee > 0) {
        summaryRows += `
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Delivery / توصيل الشريك</td>
                <td class="sum-value">${fmtMoney(partnerDeliveryFee, currency)}</td>
            </tr>
        `;
    }

    if (partnerServiceFee > 0) {
        summaryRows += `
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Service / خدمة الشريك</td>
                <td class="sum-value">${fmtMoney(partnerServiceFee, currency)}</td>
            </tr>
        `;
    }

    if (voucherDiscountAmt > 0) {
        summaryRows += `
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Voucher / قسيمة</td>
                <td class="sum-value">-${fmtMoney(voucherDiscountAmt, currency)}</td>
            </tr>
        `;
    }

    summaryRows += `
        <tr class="total-row">
            <td colspan="2" class="total-label">TOTAL</td>
            <td class="total-value">${fmtMoney(displayPayableTotal, currency)}</td>
        </tr>
    `;

    if (paymentBreakdown.length > 0) {
        summaryRows += paymentBreakdown.map((payment) => `
            <tr class="pay-row">
                <td colspan="2" class="sum-label">Paid: ${esc(payment.method)}</td>
                <td class="sum-value">${fmtMoney(payment.amount, currency)}</td>
            </tr>
        `).join("");
        summaryRows += `
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Total Paid</td>
                <td class="sum-value">${fmtMoney(totalPaid, currency)}</td>
            </tr>
        `;
    }

    const effectiveAmountTendered = amountTendered ?? order.amountTendered;
    const effectiveChangeAmount = changeAmount ?? order.changeAmount;

    if (effectiveAmountTendered != null && effectiveAmountTendered > 0) {
        summaryRows += `
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Cash Given</td>
                <td class="sum-value">${fmtMoney(effectiveAmountTendered, currency)}</td>
            </tr>
        `;
        const change = effectiveChangeAmount ?? Math.max(0, effectiveAmountTendered - displayPayableTotal);
        summaryRows += `
            <tr class="sum-row" style="font-weight:bold">
                <td colspan="2" class="sum-label">Change</td>
                <td class="sum-value">${fmtMoney(change, currency)}</td>
            </tr>
        `;
    }

    const footerHtml =
        s.receiptFooterNote
            ? `<hr class="div-eq" /><div class="footer">${esc(s.receiptFooterNote)}</div>`
            : "";

    const receiptQr = getReceiptQr(s);
    const qrHtml = receiptQr
        ? `
            <div class="qr-wrapper">
                <hr class="div-eq" />
                <div class="qr-section">
                    <div class="qr-title">${esc(receiptQr.title)}</div>
                    <img class="qr-image"
                         src="${esc(getReceiptQrImageUrl(receiptQr.url))}"
                         alt="${esc(receiptQr.alt)}"
                         onerror="var p=this.closest && this.closest('.qr-wrapper'); if (p) p.remove(); else this.style.display='none';" />
                </div>
            </div>
        `
        : "";

    return `
        <div class="receipt">
            ${headerHtml}
            <hr class="div-eq" />
            ${metaHtml}
            <hr class="div-eq" />
            ${offerHtml}
            ${offerHtml ? '<hr class="div-eq" />' : ""}

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="th-name">Item / الصنف</th>
                        <th class="th-qty">Qty</th>
                        <th class="th-price">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                    <tr><td colspan="3"><hr class="div-dash" /></td></tr>
                    ${summaryRows}
                </tbody>
            </table>

            ${footerHtml}
            ${qrHtml}
            <div style="height: 30px"></div>
        </div>
    `;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Opens a print window with a bilingual thermal-style receipt.
 * Respects receiptCopies, showLogoOnReceipt, showTaxOnReceipt, receiptFooterNote.
 */
export function printReceipt(options: PrintReceiptOptions): void {
    const {
        order,
        settings,
        logoUrl,
        businessName,
        products = [],
        currency = settings.currency || "USD",
        storeServiceChargeRate = 0,
        storeTaxRate = 0,
        customerPhone,
        customerName,
        amountTendered,
        changeAmount,
        targetWindow,
        forceReprint,
    } = options;

    const receiptReservation = reserveReceiptPrint(order, forceReprint);
    if (!receiptReservation.reserved) {
        if (targetWindow && !targetWindow.closed) {
            try { targetWindow.close(); } catch { /* ignored */ }
        }
        return;
    }
    const trackedOptions = {
        ...options,
        receiptTransactionId: receiptReservation.id,
    };

    // The new HTML/sidecar path doesn't use the pre-opened popup window —
    // close it immediately so the cashier doesn't see a blank "about:blank"
    // tab on every order. Callers may still pass targetWindow to dodge popup
    // blockers from a prior implementation; we just don't need it now.
    if (targetWindow && !targetWindow.closed) {
        try { targetWindow.close(); } catch { /* ignored */ }
    }

    const copies = Math.max(1, Math.min(settings.receiptCopies ?? 1, 5));

    const blocks: string[] = [];
    for (let i = 0; i < copies; i++) {
        const isLast = i === copies - 1;
        blocks.push(
            buildReceiptBlock(order, settings, logoUrl, businessName, products, currency, storeServiceChargeRate, storeTaxRate, customerPhone, customerName, amountTendered, changeAmount) +
            (isLast ? "" : '<div class="page-break"></div>'),
        );
    }

    const fullHtml = buildFullReceiptHtml(blocks, order);
    void fullHtml; // unused on the direct-print path; kept for the export below.

    // ── Image-render path (Part 1 implementation) ─────────────────────────
    // Snapshot the SAME HTML body the cashier UI already uses, send the PNG
    // to the backend, which converts it to ESC/POS raster bytes and routes
    // it via the agent. The frontend design is the source of truth — no
    // second backend "design" to maintain.
    void (async () => {
        try {
            const { printReceiptViaHtml } = await import("@/lib/print-receipt-html");
            const enqueued = await printReceiptViaHtml(trackedOptions);
            if (!enqueued) {
                releaseReceiptReservation(receiptReservation.id);
                toast.error("Receipt was not printed: no receipt printer is configured.", { duration: 6000 });
                return;
            }
            await putReceiptTransaction({
                id: receiptReservation.id,
                orderId: order.id,
                publicOrderNumber: getReceiptReference(order),
                transactionId: receiptReservation.id,
                printedAt: Date.now(),
                status: "printed",
            }).catch(() => {});
        } catch (err) {
            releaseReceiptReservation(receiptReservation.id);
            console.error("printReceipt html path failed:", err);
            toast.error("Receipt could not be sent to the printer. Check the Print queue.", { duration: 6000 });
        }
    })();
    return;
    // ── end image-render path; legacy direct-text path retained below ─────

    // Direct-print only: ask the backend to enqueue an ESC/POS receipt to
    // the configured network printer. No browser popup is ever opened —
    // direct printing is now mandatory in this deployment.
    //
    // Failure modes (all surface as toasts, never as popups):
    //   • enqueued = false → no receipt printer configured at all. Operator
    //     must configure one in /ntxadminpos/printing (Printers tab).
    //   • API rejected   → backend logged details; toast asks operator to
    //     check the print queue.
    //
    // The HTML payload (`fullHtml`) is left unused on this path — kept in
    // scope so a future "Print preview" button can render it on demand.
    void fullHtml;

    void printReceiptDirect(order.id)
        .then((enqueued) => {
            if (!enqueued) {
                toast.error(
                    "Receipt was not printed: no receipt printer is configured. Configure one under Admin → Kitchens & printers.",
                    { duration: 6000 },
                );
            }
        })
        .catch((err) => {
            console.error("printReceipt direct path failed:", err);
            toast.error(
                "Receipt could not be sent to the printer. Check the Print queue tab and the printer's network connection.",
                { duration: 6000 },
            );
        });
}

export function openReceiptPrintWindow(): Window | null {
    if (typeof window === "undefined") {
        return null;
    }

    return window.open("", "_blank", "width=460,height=700,scrollbars=yes,resizable=yes");
}

// ─── HTML builders exposed for the image-render path ──────────────────────
//
// The cashier UI's receipt design lives in `RECEIPT_CSS` + `buildReceiptBlock`.
// To print exactly that design from the agent, we render the same HTML in a
// hidden DOM node, snapshot it with html2canvas, and POST the PNG to the
// backend (see `printReceiptViaImage` below + /api/printing/orders/{id}/
// receipt-image on the server).
//
// Both helpers are pure — no side effects, no DOM access — so callers can
// reuse them for image rendering, preview, debugging, etc.

/**
 * Build the receipt HTML body (one block per copy, joined with page breaks).
 * No `<html>` / `<head>` / `<script>` wrapper — just the printable content.
 * Used by the image-render path so html2canvas captures only the receipt.
 */
export function buildReceiptBodyHtml(options: PrintReceiptOptions): string {
    const {
        order, settings, logoUrl, businessName,
        products = [],
        currency = settings.currency || "USD",
        storeServiceChargeRate = 0,
        storeTaxRate = 0,
        customerPhone, customerName, amountTendered, changeAmount,
    } = options;

    const copies = Math.max(1, Math.min(settings.receiptCopies ?? 1, 5));
    const blocks: string[] = [];
    for (let i = 0; i < copies; i++) {
        const isLast = i === copies - 1;
        blocks.push(
            buildReceiptBlock(order, settings, logoUrl, businessName, products, currency, storeServiceChargeRate, storeTaxRate, customerPhone, customerName, amountTendered, changeAmount) +
            (isLast ? "" : '<div class="page-break"></div>'),
        );
    }
    return blocks.join("\n");
}

/** The CSS the cashier UI uses, exposed for the image-render path. */
export function getReceiptCss(): string {
    return RECEIPT_CSS;
}

// Internal helper kept for the legacy popup path (window.print fallback).
function buildFullReceiptHtml(blocks: string[], order: OrderDto): string {
    const receiptTitle = formatOrderSequence(order) ?? `#${order.orderNumber.slice(-4)}`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${esc(receiptTitle)}</title>
  <style>${RECEIPT_CSS}</style>
</head>
<body>
  ${blocks.join("\n")}
  <script>
    window.onload = function () {
      var imgs = document.images;
      var pending = imgs.length;
      var fired = false;
      function fire() {
        if (fired) return;
        fired = true;
        window.print();
        setTimeout(function () { window.close(); }, 800);
      }
      if (pending === 0) { setTimeout(fire, 350); return; }
      function done() { if (--pending <= 0) setTimeout(fire, 200); }
      for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].complete) { done(); }
        else { imgs[i].addEventListener('load', done); imgs[i].addEventListener('error', done); }
      }
      setTimeout(fire, 4000);
    };
  </script>
</body>
</html>`;
}
