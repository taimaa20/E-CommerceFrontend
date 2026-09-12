"use client";

import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    ChevronRight,
    Clock3,
    FileText,
    MapPin,
    Printer,
    RefreshCw,
    Store,
} from "lucide-react";
import { toast } from "sonner";
import StoreOrderTimeline from "@/components/showcase/StoreOrderTimeline";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { onlineShoppingApi, type OnlineOrderStatus } from "@/lib/api-online-shopping";
import { createStoreText } from "@/lib/store-copy";
import {
    getOnlineOrderStatus,
    ONLINE_ORDER_POLL_INTERVAL_MS,
    rememberOnlineOrder,
} from "@/lib/online-order-status";
import { useSettingsStore } from "@/store/settingsStore";

export default function OnlineOrderTrackingPage() {
    return (
        <StoreShell>
            <div className="sf-container">
            <Suspense fallback={<TrackingSkeleton />}>
                <OnlineOrderTrackingContent />
            </Suspense>
            </div>
        </StoreShell>
    );
}

function OnlineOrderTrackingContent() {
    const params = useParams<{ orderId: string }>();
    const searchParams = useSearchParams();
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const currency = useSettingsStore((state) => state.settings.currency);
    const [order, setOrder] = useState<OnlineOrderStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openingReceipt, setOpeningReceipt] = useState(false);
    const token = searchParams.get("token") ?? "";

    useEffect(() => {
        if (!params.orderId || !token) {
            setError(isAr ? "رابط تتبع الطلب غير صالح." : "This tracking link is invalid.");
            setLoading(false);
            return;
        }

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const load = async (initial: boolean) => {
            if (!initial) setRefreshing(true);
            try {
                const result = await onlineShoppingApi.getOrderStatus(params.orderId, token);
                if (cancelled) return;
                setOrder(result);
                setError(null);
                // A verified tracking link becomes a device-local entry so the same
                // browser can reopen it later from "My orders".
                if (initial) {
                    rememberOnlineOrder({
                        orderId: result.orderId,
                        orderNumber: result.orderNumber,
                        token,
                    });
                }
                if (!["Completed", "Cancelled", "Refunded", "PaymentFailed"].includes(result.customerStatus)) {
                    timer = setTimeout(() => void load(false), ONLINE_ORDER_POLL_INTERVAL_MS);
                }
            } catch {
                if (!cancelled) {
                    if (initial) {
                        setError(isAr ? "تعذر تحميل حالة الطلب." : "Could not load the order status.");
                    }
                    timer = setTimeout(() => void load(false), ONLINE_ORDER_POLL_INTERVAL_MS);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        };

        void load(true);
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [params.orderId, token, isAr]);

    const openReceipt = async (print: boolean) => {
        if (!order) return;
        const printWindow = print ? window.open("about:blank", "_blank") : null;
        setOpeningReceipt(true);
        try {
            const access = await onlineShoppingApi.createReceiptAccess(order.orderId, token);
            const url = print ? `${access.receiptUrl}?print=1` : access.receiptUrl;
            if (printWindow) printWindow.location.assign(url);
            else window.location.assign(url);
        } catch {
            printWindow?.close();
            toast.error(isAr ? "تعذر فتح الإيصال." : "Could not open the receipt.");
        } finally {
            setOpeningReceipt(false);
        }
    };

    if (loading) return <TrackingSkeleton />;

    if (error || !order) {
        return (
            <div className="sf-empty mx-auto max-w-md">
                <p className="font-semibold">{error}</p>
                <p className="sf-meta mt-1">{text("lookupHint")}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Link href="/shop/orders" className="sf-btn sf-btn--primary">{text("trackOrder")}</Link>
                    <Link href="/shop" className="sf-btn sf-btn--outline">
                        <ArrowLeft className="size-4 rtl:rotate-180" />
                        {text("backToShop")}
                    </Link>
                </div>
            </div>
        );
    }

    const progress = getOnlineOrderStatus(order, isAr ? "ar" : "en");
    const nextStep = progress.steps.find(step => step.state === "upcoming");
    const dateLocale = isAr ? "ar" : "en";
    const formatDate = (value: string) => new Intl.DateTimeFormat(dateLocale, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
    const typeLabel = order.orderType === "Delivery"
        ? (isAr ? "توصيل" : "Delivery")
        : (isAr ? "استلام" : "Pickup");
    const paymentMethod = isAr ? order.paymentMethodAr || order.paymentMethod : order.paymentMethod;

    return (
        <div className="mx-auto max-w-5xl">
            <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1 text-[13px] text-muted-foreground">
                <Link href="/shop" className="hover:text-foreground">{text("shop")}</Link>
                <ChevronRight className="size-3.5 rtl:rotate-180" />
                <Link href="/shop/orders" className="hover:text-foreground">{text("myOrders")}</Link>
            </nav>

            {/* Status first: what happened, what is next, which order. */}
            <section className={`sf-panel ${progress.isExceptional ? "border-destructive/40" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                        <h1 className={`text-xl font-semibold sm:text-2xl ${progress.isExceptional ? "text-destructive" : ""}`}>
                            {progress.title}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">{progress.message}</p>
                        {!progress.isExceptional && nextStep && (
                            <p className="mt-2 text-[13px]">
                                <span className="text-muted-foreground">{text("nextStep")}: </span>
                                <span className="font-medium">{nextStep.label}</span>
                            </p>
                        )}
                    </div>
                    <dl className="flex shrink-0 gap-6 text-sm">
                        <div>
                            <dt className="sf-meta">{text("orderNumber")}</dt>
                            <dd className="font-semibold tracking-tight" dir="ltr">{order.orderNumber}</dd>
                        </div>
                        <div>
                            <dt className="sf-meta">{typeLabel}</dt>
                            <dd className="font-medium">{formatDate(order.createdAt)}</dd>
                        </div>
                    </dl>
                </div>

                {!progress.isExceptional && (
                    <div className="mt-6 border-t pt-5">
                        <p className="sf-label sr-only">{text("orderProgress")}</p>
                        <StoreOrderTimeline steps={progress.steps} />
                    </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
                    <button type="button" onClick={() => void openReceipt(false)} disabled={openingReceipt} className="sf-btn sf-btn--outline sf-btn--sm">
                        <FileText className="size-4" />
                        {isAr ? "عرض الإيصال" : "View receipt"}
                    </button>
                    <button type="button" onClick={() => void openReceipt(true)} disabled={openingReceipt} className="sf-btn sf-btn--outline sf-btn--sm">
                        <Printer className="size-4" />
                        {isAr ? "طباعة الإيصال" : "Print receipt"}
                    </button>
                    <Link href="/shop" className="sf-btn sf-btn--quiet sf-btn--sm ms-auto">
                        {text("continueShopping")}
                    </Link>
                    <span className="sf-meta inline-flex items-center gap-1.5">
                        {refreshing && <RefreshCw className="size-3 animate-spin" />}
                        {isAr ? "تحديث تلقائي" : "Updates automatically"}
                    </span>
                </div>
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <section className="sf-panel">
                    <h2 className="mb-4 text-sm font-semibold">{isAr ? "تفاصيل الطلب" : "Order details"}</h2>
                    <dl className="space-y-3 text-sm">
                        <Detail label={isAr ? "التاريخ" : "Order date"} value={formatDate(order.createdAt)} />
                        <Detail label={isAr ? "النوع" : "Fulfilment"} value={typeLabel} />
                        <Detail
                            label={order.scheduledFor
                                ? order.orderType === "Delivery"
                                    ? (isAr ? "التوصيل المجدول" : "Scheduled delivery")
                                    : (isAr ? "الاستلام المجدول" : "Scheduled pickup")
                                : (isAr ? "الوقت" : "Timing")}
                            value={order.scheduledFor ? formatDate(order.scheduledFor) : (isAr ? "في أقرب وقت" : "ASAP")}
                            icon={<Clock3 className="size-4" />}
                        />
                        <Detail label={isAr ? "طريقة الدفع" : "Payment method"} value={paymentMethod || "—"} />
                        <Detail label={isAr ? "حالة الدفع" : "Payment status"} value={paymentStatusLabel(order.paymentStatus, isAr)} />
                        {order.submittedPaymentReference && (
                            <Detail label={isAr ? "رقم العملية" : "Reference number"} value={order.submittedPaymentReference} />
                        )}
                        {order.orderType === "Delivery" ? (
                            <>
                                {order.deliveryZoneName && (
                                    <Detail label={isAr ? "المنطقة" : "Area"} value={order.deliveryZoneName} />
                                )}
                                {/* The one line the driver was given, so what the shopper sees
                                    and what the store prints can never disagree. */}
                                <Detail
                                    label={isAr ? "عنوان التوصيل" : "Delivery address"}
                                    value={order.deliveryAddress || "—"}
                                    icon={<MapPin className="size-4" />}
                                />
                                {order.deliveryNotes && (
                                    <Detail label={isAr ? "ملاحظات التوصيل" : "Delivery notes"} value={order.deliveryNotes} />
                                )}
                            </>
                        ) : (
                            <Detail
                                label={isAr ? "فرع الاستلام" : "Pickup branch"}
                                value={`${isAr ? order.branch.nameAr || order.branch.name : order.branch.name}${order.branch.address ? ` · ${order.branch.address}` : ""}`}
                                icon={<Store className="size-4" />}
                            />
                        )}
                    </dl>
                </section>

                <section className="sf-panel">
                    <h2 className="mb-2 text-sm font-semibold">{isAr ? "ملخص المنتجات" : "Order summary"}</h2>
                    <ul className="sf-divide">
                        {order.items.map((item, index) => (
                            <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className="sf-bidi break-words text-sm font-medium">{isAr ? item.nameAr || item.name : item.name}</p>
                                    <p className="sf-meta mt-0.5 tabular-nums">
                                        {item.quantity} × {formatCurrency(item.unitPrice, currency)}
                                    </p>
                                </div>
                                <p className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(item.lineTotal, currency)}</p>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <span className="text-sm font-semibold">{isAr ? "الإجمالي" : "Total"}</span>
                        <span className="sf-price text-lg">{formatCurrency(order.totalAmount, currency)}</span>
                    </div>
                </section>
            </div>
        </div>
    );
}

function TrackingSkeleton() {
    return (
        <div className="mx-auto max-w-5xl space-y-5" aria-hidden>
            <div className="sf-skel h-4 w-40" />
            <div className="sf-panel space-y-4">
                <div className="sf-skel h-7 w-56" />
                <div className="sf-skel h-4 w-72" />
                <div className="sf-skel h-16 w-full" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                <div className="sf-skel h-56 w-full rounded-[var(--sf-radius)]" />
                <div className="sf-skel h-56 w-full rounded-[var(--sf-radius)]" />
            </div>
        </div>
    );
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">{icon}{label}</dt>
            <dd className="sf-bidi max-w-[62%] break-words text-end font-medium">{value}</dd>
        </div>
    );
}

function paymentStatusLabel(status: string, isAr: boolean): string {
    const labels: Record<string, [string, string]> = {
        Paid: ["Paid", "مدفوع"],
        Partial: ["Partially paid", "مدفوع جزئياً"],
        Pending: ["Awaiting payment", "بانتظار الدفع"],
        Failed: ["Failed", "فشل"],
        Refunded: ["Refunded", "تم رد المبلغ"],
    };
    const label = labels[status] ?? [status, status];
    return isAr ? label[1] : label[0];
}
