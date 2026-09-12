"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { getPublicReceipt, type PublicReceiptDto } from "@/lib/api";
import { formatCurrency } from "@/lib/currencies";
import { formatOrderSequence } from "@/lib/order-sequence";

interface PublicReceiptClientProps {
    token: string;
}

const TAKEAWAY_TABLE_NAME = "TAKEAWAY";
const DELIVERY_TABLE_NAME = "DELIVERY";
const DEFAULT_RECEIPT_CURRENCY = "JOD";
const ARABIC_DATE_LOCALE = "ar-EG";
const ENGLISH_DATE_LOCALE = "en-US";

function formatReceiptDate(value: string, locale: string): string {
    return new Intl.DateTimeFormat(locale === "ar" ? ARABIC_DATE_LOCALE : ENGLISH_DATE_LOCALE, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getInitial(name: string): string {
    const trimmed = name.trim();
    return trimmed ? trimmed[0].toUpperCase() : "•";
}

function isDeliveryReceipt(receipt: PublicReceiptDto): boolean {
    return receipt.orderType === "Delivery" || receipt.tableName === DELIVERY_TABLE_NAME;
}

function isOnlinePickupReceipt(receipt: PublicReceiptDto): boolean {
    return receipt.orderSource === "Online" && receipt.orderType === "Takeaway";
}

function getReceiptLocationLabel(receipt: PublicReceiptDto, locale: string, tableLabel: string): string {
    if (isDeliveryReceipt(receipt)) return locale === "ar" ? "منطقة التوصيل" : "Delivery Area";
    if (isOnlinePickupReceipt(receipt)) return locale === "ar" ? "فرع الاستلام" : "Pickup branch";
    return tableLabel;
}

function getReceiptLocationValue(receipt: PublicReceiptDto, locale: string, takeawayLabel: string): string {
    if (isDeliveryReceipt(receipt)) {
        return receipt.deliveryZoneName || (locale === "ar" ? "توصيل" : "Delivery");
    }

    if (isOnlinePickupReceipt(receipt)) {
        return receipt.branchName || takeawayLabel;
    }

    if (receipt.tableName === TAKEAWAY_TABLE_NAME) return takeawayLabel;
    return receipt.tableName;
}

// Resolve the theme's --primary custom property to a concrete sRGB hex via a
// hidden probe + a Canvas 2D fillStyle (which serializes any color to sRGB).
// Used only to keep the brand color in the downloaded image; the captured node
// itself is built with plain hex so html2canvas never sees Tailwind v4 oklch().
function resolvePrimaryHex(fallback: string): string {
    const probe = document.createElement("span");
    probe.style.color = "var(--primary)";
    probe.style.position = "absolute";
    probe.style.opacity = "0";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
    const resolved = window.getComputedStyle(probe).color;
    document.body.removeChild(probe);
    if (!resolved) return fallback;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return resolved;
    try {
        ctx.fillStyle = "#000000";
        ctx.fillStyle = resolved;
        return ctx.fillStyle;
    } catch {
        return fallback;
    }
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function waitForImages(root: HTMLElement, timeoutMs = 4000): Promise<void> {
    const imgs = Array.from(root.querySelectorAll("img"));
    if (imgs.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
        let pending = imgs.length;
        const done = () => { if (--pending <= 0) resolve(); };
        for (const img of imgs) {
            if (img.complete) done();
            else { img.addEventListener("load", done); img.addEventListener("error", done); }
        }
        setTimeout(resolve, timeoutMs);
    });
}

interface ReceiptImageStrings {
    orderNo: string;
    systemId: string;
    date: string;
    table: string;
    orderType: string;
    subtotal: string;
    discount: string;
    service: string;
    tax: string;
    deliveryFee: string;
    voucher: string;
    total: string;
    paid: string;
    due: string;
    taxVat: string;
    dateValue: string;
    tableValue: string;
    orderTypeValue: string;
    footer: string;
}

// Build a fully self-contained receipt with inline hex colors (zero Tailwind /
// oklch), so the html2canvas snapshot is deterministic across browsers.
function buildReceiptImageHtml(
    receipt: PublicReceiptDto,
    currency: string,
    primary: string,
    s: ReceiptImageStrings,
): string {
    const r = receipt.restaurant;
    const money = (n: number) => escapeHtml(formatCurrency(n, currency));
    const metaRow = (label: string, value: string, valueDir?: string) =>
        `<div style="display:flex;justify-content:space-between;gap:16px;padding:7px 0;font-size:13px;">
            <span style="color:#94A3B8;">${escapeHtml(label)}</span>
            <span style="color:#0F172A;font-weight:600;text-align:end;"${valueDir ? ` dir="${valueDir}"` : ""}>${escapeHtml(value)}</span>
        </div>`;
    const totalRow = (label: string, value: string) =>
        `<div style="display:flex;justify-content:space-between;gap:16px;padding:4px 0;font-size:13px;">
            <span style="color:#64748B;">${escapeHtml(label)}</span>
            <span style="color:#0F172A;font-weight:600;">${value}</span>
        </div>`;
    const orderSequence = formatOrderSequence(receipt);

    const logo = r.logoUrl
        ? `<img src="${escapeHtml(r.logoUrl)}" crossorigin="anonymous" style="width:80px;height:80px;border-radius:50%;background:#fff;object-fit:contain;border:4px solid rgba(255,255,255,0.3);" />`
        : `<div style="width:80px;height:80px;border-radius:50%;background:#fff;color:${primary};display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;border:4px solid rgba(255,255,255,0.3);">${escapeHtml(getInitial(r.name))}</div>`;

    const items = receipt.items.map((item) => {
        const mods = item.modifiers
            .map((m) => `<div style="color:#94A3B8;font-size:12px;margin-top:3px;">+ ${escapeHtml(m.name)}${m.quantity > 1 ? ` ×${m.quantity}` : ""} · ${money(m.price)}</div>`)
            .join("");
        return `<div style="padding:13px 0;border-bottom:1px solid #F1F5F9;">
            <div style="display:flex;justify-content:space-between;gap:16px;">
                <div>
                    <div style="font-weight:600;color:#0F172A;">${escapeHtml(item.name)}</div>
                    <div style="color:#94A3B8;font-size:12px;margin-top:3px;">${item.quantity} × ${money(item.unitPrice)}</div>
                </div>
                <div style="font-weight:600;color:#0F172A;white-space:nowrap;">${money(item.lineTotalAmount)}</div>
            </div>${mods}
        </div>`;
    }).join("");

    return `<div style="width:480px;box-sizing:border-box;background:#ffffff;color:#0F172A;border-radius:16px;overflow:hidden;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
        <div style="background:${primary};color:#ffffff;text-align:center;padding:32px 24px;">
            <div style="display:flex;justify-content:center;">${logo}</div>
            <div style="font-size:24px;font-weight:800;margin-top:12px;">${escapeHtml(r.name)}</div>
            ${r.address ? `<div style="font-size:13px;opacity:0.9;margin-top:4px;">${escapeHtml(r.address)}</div>` : ""}
            ${r.phone ? `<div style="font-size:13px;opacity:0.9;margin-top:2px;" dir="ltr">${escapeHtml(r.phone)}</div>` : ""}
        </div>
        <div style="padding:24px;">
            ${metaRow(s.orderNo, orderSequence ?? receipt.orderNumber, "ltr")}
            ${orderSequence ? metaRow(s.systemId, receipt.orderNumber, "ltr") : ""}
            ${metaRow(s.date, s.dateValue)}
            ${metaRow(s.table, s.tableValue)}
            ${metaRow(s.orderType, s.orderTypeValue)}
            <div style="border-top:1px dashed #E2E8F0;margin:14px 0;"></div>
            ${items}
            <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin-top:16px;">
                ${totalRow(s.subtotal, money(receipt.subtotal))}
                ${receipt.discountAmount > 0 ? totalRow(s.discount, `-${money(receipt.discountAmount)}`) : ""}
                ${receipt.serviceChargeAmount > 0 ? totalRow(s.service, money(receipt.serviceChargeAmount)) : ""}
                ${receipt.taxAmount > 0 ? totalRow(s.tax, money(receipt.taxAmount)) : ""}
                ${(receipt.deliveryFee ?? 0) > 0 ? totalRow(s.deliveryFee, money(receipt.deliveryFee ?? 0)) : ""}
                ${receipt.voucherDiscountAmount > 0 ? totalRow(s.voucher, `-${money(receipt.voucherDiscountAmount)}`) : ""}
                <div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid #E2E8F0;padding-top:12px;margin-top:8px;font-size:18px;font-weight:700;">
                    <span>${escapeHtml(s.total)}</span>
                    <span style="color:${primary};">${money(receipt.totalAmount)}</span>
                </div>
                ${receipt.paidAmount > 0 ? totalRow(s.paid, money(receipt.paidAmount)) : ""}
                ${receipt.remainingAmount > 0 ? totalRow(s.due, money(receipt.remainingAmount)) : ""}
            </div>
            ${r.taxNumber ? `<div style="text-align:center;font-size:12px;color:#94A3B8;margin-top:16px;">${escapeHtml(s.taxVat)}: ${escapeHtml(r.taxNumber)}</div>` : ""}
            <div style="text-align:center;font-size:14px;font-weight:500;color:#475569;margin-top:12px;">${escapeHtml(s.footer)}</div>
        </div>
    </div>`;
}

export default function PublicReceiptClient({ token }: PublicReceiptClientProps) {
    const { t, locale, setLocale } = useLocale();
    const searchParams = useSearchParams();
    const [receipt, setReceipt] = useState<PublicReceiptDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const printedAutomatically = useRef(false);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        void getPublicReceipt(token)
            .then((data) => {
                if (!cancelled) setReceipt(data);
            })
            .catch(() => {
                if (!cancelled) setError(t("receiptLoadFailed"));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [token, locale, t]);

    useEffect(() => {
        if (!receipt || searchParams.get("print") !== "1" || printedAutomatically.current) return;
        printedAutomatically.current = true;
        const timer = setTimeout(() => window.print(), 250);
        return () => clearTimeout(timer);
    }, [receipt, searchParams]);

    const handleDownload = async () => {
        if (!receipt) return;
        setIsDownloading(true);
        let container: HTMLDivElement | null = null;
        try {
            const primary = resolvePrimaryHex("#E11D2A");
            const s: ReceiptImageStrings = {
                orderNo: t("orderNoCol"),
                systemId: locale === "ar" ? "رقم النظام" : "System ID",
                date: t("dateCol"),
                table: getReceiptLocationLabel(receipt, locale, t("tableCol")),
                orderType: t("orderTypeLabel"),
                subtotal: t("subtotal"),
                discount: t("discount"),
                service: t("serviceChargeAmountLabel"),
                tax: t("taxLabel"),
                deliveryFee: locale === "ar" ? "رسوم التوصيل" : "Delivery fee",
                voucher: t("voucherDiscountLabel"),
                total: t("totalCol"),
                paid: t("paidLabel"),
                due: t("dueLabel"),
                taxVat: t("taxVatNumber"),
                dateValue: formatReceiptDate(receipt.createdAtUtc, locale),
                tableValue: getReceiptLocationValue(receipt, locale, t("takeaway")),
                orderTypeValue: receipt.orderType === "Delivery"
                    ? (locale === "ar" ? "توصيل" : "Delivery")
                    : receipt.orderType === "Takeaway"
                        ? receipt.orderSource === "Online"
                            ? (locale === "ar" ? "استلام" : "Pickup")
                            : t("takeaway")
                        : t("dineIn"),
                footer: receipt.restaurant.footerNote || (locale === "ar" ? "شكراً لزيارتكم!" : "Thank you for your visit!"),
            };

            // Snapshot a self-contained inline-hex twin (not the live Tailwind v4
            // DOM) so html2canvas never encounters oklch()/oklab() it can't parse.
            container = document.createElement("div");
            container.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
            Object.assign(container.style, {
                position: "fixed",
                left: "-99999px",
                top: "0",
                zIndex: "-1",
                background: "#ffffff",
            });
            container.innerHTML = buildReceiptImageHtml(receipt, currency, primary, s);
            document.body.appendChild(container);
            await waitForImages(container);

            const { default: html2canvas } = await import("html2canvas");
            const target = container.firstElementChild as HTMLElement;
            const canvas = await html2canvas(target, {
                backgroundColor: "#ffffff",
                scale: 2,
                useCORS: true,
                logging: false,
            });
            const link = document.createElement("a");
            link.download = `receipt-${receipt.orderNumber}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (downloadError) {
            console.error("Receipt download failed:", downloadError);
            const { toast } = await import("sonner");
            toast.error(t("receiptDownloadFailed"));
        } finally {
            if (container) container.remove();
            setIsDownloading(false);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-[#F4F5F7] px-4 py-6 text-[#111827]">
                <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            </main>
        );
    }

    if (error || !receipt) {
        return (
            <main className="min-h-screen bg-[#F4F5F7] px-4 py-6 text-[#111827]">
                <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
                    <p className="text-lg font-semibold">{error ?? t("receiptNotFound")}</p>
                    <Link href="/shop" className="text-sm font-semibold text-primary">
                        {t("backToMenu")}
                    </Link>
                </div>
            </main>
        );
    }

    const currency = receipt.restaurant.currency || DEFAULT_RECEIPT_CURRENCY;
    const logoUrl = receipt.restaurant.logoUrl;
    const orderTypeLabel = receipt.orderType === "Delivery"
        ? (locale === "ar" ? "توصيل" : "Delivery")
        : receipt.orderType === "Takeaway"
            ? receipt.orderSource === "Online"
                ? (locale === "ar" ? "استلام" : "Pickup")
                : t("takeaway")
            : t("dineIn");
    const receiptLocationLabel = getReceiptLocationLabel(receipt, locale, t("tableCol"));
    const receiptLocationValue = getReceiptLocationValue(receipt, locale, t("takeaway"));
    const orderSequence = formatOrderSequence(receipt);
    const systemIdLabel = locale === "ar" ? "رقم النظام" : "System ID";

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#EEF1F6] to-[#F7F8FA] px-3 py-5 text-[#0F172A] sm:px-6 sm:py-10">
            <div className="mx-auto max-w-2xl">
                <div className="receipt-screen-actions mb-4 flex items-center justify-between gap-3">
                    <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748B] transition-colors hover:text-[#0F172A]"
                    >
                        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                        {t("backToMenu")}
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="inline-flex overflow-hidden rounded-full border border-[#E2E8F0] bg-white">
                            <button
                                type="button"
                                onClick={() => setLocale("en", { reload: false })}
                                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${locale === "en" ? "bg-primary text-white" : "text-[#64748B]"}`}
                            >
                                EN
                            </button>
                            <button
                                type="button"
                                onClick={() => setLocale("ar", { reload: false })}
                                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${locale === "ar" ? "bg-primary text-white" : "text-[#64748B]"}`}
                            >
                                AR
                            </button>
                        </div>
                        <Button
                            size="sm"
                            className="gap-2 rounded-full shadow-sm"
                            onClick={handleDownload}
                            disabled={isDownloading}
                        >
                            {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {isDownloading ? t("downloadingReceipt") : t("downloadReceipt")}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 rounded-full"
                            onClick={() => window.print()}
                        >
                            <Printer className="h-4 w-4" />
                            {locale === "ar" ? "طباعة" : "Print"}
                        </Button>
                    </div>
                </div>

                <section
                    className="online-public-receipt overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_10px_40px_-15px_rgba(15,23,42,0.25)]"
                >
                    <header className="flex flex-col items-center gap-3 bg-gradient-to-br from-primary to-primary/85 px-6 py-8 text-center text-white">
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logoUrl}
                                alt={receipt.restaurant.name}
                                crossOrigin="anonymous"
                                className="h-20 w-20 rounded-full border-4 border-white/30 bg-white object-contain shadow-md"
                            />
                        ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-white text-3xl font-bold text-primary shadow-md">
                                {getInitial(receipt.restaurant.name)}
                            </div>
                        )}
                        <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{receipt.restaurant.name}</h1>
                        {receipt.restaurant.address ? (
                            <p className="text-sm text-white/85">{receipt.restaurant.address}</p>
                        ) : null}
                        {receipt.restaurant.phone ? (
                            <p className="text-sm text-white/85" dir="ltr">{receipt.restaurant.phone}</p>
                        ) : null}
                    </header>

                    <div className="px-6 py-6 sm:px-8">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                            <div>
                                <p className="text-[#94A3B8]">{t("orderNoCol")}</p>
                                <p className="font-semibold" dir="ltr">{orderSequence ?? receipt.orderNumber}</p>
                                {orderSequence ? (
                                    <p className="mt-1 text-xs text-[#94A3B8]" dir="ltr">
                                        {systemIdLabel}: {receipt.orderNumber}
                                    </p>
                                ) : null}
                            </div>
                            <div className="text-end">
                                <p className="text-[#94A3B8]">{t("dateCol")}</p>
                                <p className="font-semibold">{formatReceiptDate(receipt.createdAtUtc, locale)}</p>
                            </div>
                            <div>
                                <p className="text-[#94A3B8]">{receiptLocationLabel}</p>
                                <p className="font-semibold">
                                    {receiptLocationValue}
                                </p>
                            </div>
                            <div className="text-end">
                                <p className="text-[#94A3B8]">{t("orderTypeLabel")}</p>
                                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                    {orderTypeLabel}
                                </span>
                            </div>
                            {receipt.branchName ? (
                                <div>
                                    <p className="text-[#94A3B8]">{locale === "ar" ? "الفرع" : "Branch"}</p>
                                    <p className="font-semibold">{receipt.branchName}</p>
                                </div>
                            ) : null}
                            {receipt.scheduledForUtc ? (
                                <div className="text-end">
                                    <p className="text-[#94A3B8]">
                                        {receipt.orderType === "Delivery"
                                            ? (locale === "ar" ? "التوصيل المجدول" : "Scheduled delivery")
                                            : (locale === "ar" ? "الاستلام المجدول" : "Scheduled pickup")}
                                    </p>
                                    <p className="font-semibold">{formatReceiptDate(receipt.scheduledForUtc, locale)}</p>
                                </div>
                            ) : null}
                            {receipt.customerName ? (
                                <div>
                                    <p className="text-[#94A3B8]">{locale === "ar" ? "العميل" : "Customer"}</p>
                                    <p className="font-semibold">{receipt.customerName}</p>
                                </div>
                            ) : null}
                            {receipt.customerPhone ? (
                                <div className="text-end">
                                    <p className="text-[#94A3B8]">{locale === "ar" ? "الجوال" : "Mobile"}</p>
                                    <p className="font-semibold" dir="ltr">{receipt.customerPhone}</p>
                                </div>
                            ) : null}
                            {receipt.deliveryAddress ? (
                                <div className="col-span-2">
                                    <p className="text-[#94A3B8]">{locale === "ar" ? "عنوان التوصيل" : "Delivery address"}</p>
                                    <p className="font-semibold">{receipt.deliveryAddress}</p>
                                </div>
                            ) : null}
                        </div>

                        <div className="my-5 border-t border-dashed border-[#E2E8F0]" />

                        <div className="divide-y divide-[#F1F5F9]">
                            {receipt.items.map((item, index) => (
                                <div key={`${item.name}-${index}`} className="py-3.5 first:pt-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="mt-0.5 text-xs text-[#94A3B8]">
                                                {item.quantity} × {formatCurrency(item.unitPrice, currency)}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-semibold">
                                            {formatCurrency(item.lineTotalAmount, currency)}
                                        </p>
                                    </div>
                                    {item.modifiers.length > 0 ? (
                                        <div className="mt-1.5 space-y-1 text-xs text-[#94A3B8]">
                                            {item.modifiers.map((modifier, modifierIndex) => (
                                                <p key={`${modifier.name}-${modifierIndex}`}>
                                                    + {modifier.name}
                                                    {modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""} · {formatCurrency(modifier.price, currency)}
                                                </p>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 rounded-xl bg-[#F8FAFC] p-4">
                            <ReceiptTotalRow label={t("subtotal")} value={formatCurrency(receipt.subtotal, currency)} />
                            {receipt.discountAmount > 0 ? (
                                <ReceiptTotalRow label={t("discount")} value={`-${formatCurrency(receipt.discountAmount, currency)}`} />
                            ) : null}
                            {receipt.serviceChargeAmount > 0 ? (
                                <ReceiptTotalRow label={t("serviceChargeAmountLabel")} value={formatCurrency(receipt.serviceChargeAmount, currency)} />
                            ) : null}
                            {receipt.taxAmount > 0 ? (
                                <ReceiptTotalRow label={t("taxLabel")} value={formatCurrency(receipt.taxAmount, currency)} />
                            ) : null}
                            {(receipt.deliveryFee ?? 0) > 0 ? (
                                <ReceiptTotalRow label={locale === "ar" ? "رسوم التوصيل" : "Delivery fee"} value={formatCurrency(receipt.deliveryFee ?? 0, currency)} />
                            ) : null}
                            {receipt.voucherDiscountAmount > 0 ? (
                                <ReceiptTotalRow label={t("voucherDiscountLabel")} value={`-${formatCurrency(receipt.voucherDiscountAmount, currency)}`} />
                            ) : null}
                            <div className="mt-2.5 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-lg font-bold">
                                <span>{t("totalCol")}</span>
                                <span className="text-primary">{formatCurrency(receipt.totalAmount, currency)}</span>
                            </div>
                            {receipt.paidAmount > 0 ? (
                                <ReceiptTotalRow label={t("paidLabel")} value={formatCurrency(receipt.paidAmount, currency)} />
                            ) : null}
                            {receipt.remainingAmount > 0 ? (
                                <ReceiptTotalRow label={t("dueLabel")} value={formatCurrency(receipt.remainingAmount, currency)} />
                            ) : null}
                            <ReceiptTotalRow
                                label={locale === "ar" ? "طريقة الدفع" : "Payment method"}
                                value={receipt.paymentMethod || "—"}
                            />
                            <ReceiptTotalRow
                                label={locale === "ar" ? "حالة الدفع" : "Payment status"}
                                value={getPaymentStatusLabel(receipt.paymentStatus, locale)}
                            />
                        </div>

                        {receipt.restaurant.taxNumber ? (
                            <p className="mt-5 text-center text-xs text-[#94A3B8]">
                                {t("taxVatNumber")}: {receipt.restaurant.taxNumber}
                            </p>
                        ) : null}
                        <p className="mt-3 text-center text-sm font-medium text-[#475569]">
                            {receipt.restaurant.footerNote || (locale === "ar" ? "شكراً لزيارتكم!" : "Thank you for your visit!")}
                        </p>
                    </div>
                </section>
            </div>
            <style jsx global>{`
                @media print {
                    @page { margin: 8mm; }
                    html, body { background: #fff !important; }
                    body * { visibility: hidden !important; }
                    .online-public-receipt,
                    .online-public-receipt * { visibility: visible !important; }
                    .online-public-receipt {
                        position: absolute !important;
                        inset: 0 auto auto 0 !important;
                        width: 100% !important;
                        border: 0 !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                    }
                    .receipt-screen-actions { display: none !important; }
                }
            `}</style>
        </main>
    );
}

function getPaymentStatusLabel(status: string, locale: string): string {
    const values: Record<string, [string, string]> = {
        Paid: ["Paid", "مدفوع"],
        Partial: ["Partially paid", "مدفوع جزئياً"],
        Pending: ["Pending / cash", "بانتظار الدفع / نقدي"],
        Failed: ["Failed", "فشل"],
        Refunded: ["Refunded", "تم رد المبلغ"],
    };
    const value = values[status] ?? [status, status];
    return locale === "ar" ? value[1] : value[0];
}

function ReceiptTotalRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-[#64748B]">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}
