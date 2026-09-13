"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, PackageSearch, Receipt, Search, Trash2 } from "lucide-react";
import StoreShell from "@/components/showcase/StoreShell";
import StoreWhatsAppLink from "@/components/showcase/StoreWhatsAppLink";
import { useLocale } from "@/components/locale-provider";
import { onlineShoppingApi } from "@/lib/api-online-shopping";
import { createStoreText } from "@/lib/store-copy";
import { WHATSAPP_PURPOSE } from "@/lib/whatsapp";
import {
    buildOnlineOrderTrackingUrl,
    forgetOnlineOrder,
    getRememberedOnlineOrdersServerSnapshot,
    getRememberedOnlineOrdersSnapshot,
    rememberOnlineOrder,
    subscribeToRememberedOnlineOrders,
} from "@/lib/online-order-status";

export default function StoreOrdersPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const router = useRouter();
    // localStorage is only readable on the client; the server snapshot is empty.
    const recent = useSyncExternalStore(
        subscribeToRememberedOnlineOrders,
        getRememberedOnlineOrdersSnapshot,
        getRememberedOnlineOrdersServerSnapshot,
    );
    const [orderNumber, setOrderNumber] = useState("");
    const [contact, setContact] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [lookupError, setLookupError] = useState("");

    const formatDate = (value?: string) => {
        if (!value) return "";
        const parsed = new Date(value);
        return Number.isFinite(parsed.getTime())
            ? new Intl.DateTimeFormat(isAr ? "ar" : "en", { dateStyle: "medium" }).format(parsed)
            : "";
    };

    const lookup = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting) return;
        if (!orderNumber.trim() || !contact.trim()) {
            setLookupError(text("lookupRequired"));
            return;
        }
        setSubmitting(true);
        setLookupError("");
        try {
            const result = await onlineShoppingApi.lookupOrder(orderNumber.trim(), contact.trim());
            rememberOnlineOrder({
                orderId: result.order.orderId,
                orderNumber: result.order.orderNumber,
                token: result.trackingToken,
            });
            router.push(buildOnlineOrderTrackingUrl(result.order.orderId, result.trackingToken));
        } catch {
            // Deliberately identical for "no such order" and "details do not match".
            setLookupError(text("lookupFailed"));
            setSubmitting(false);
        }
    };

    return (
        <StoreShell>
            <div className="sf-container">
            <div className="mx-auto max-w-3xl">
                <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1 text-[13px] text-muted-foreground">
                    <Link href="/shop" className="hover:text-foreground">{text("shop")}</Link>
                    <ChevronRight className="size-3.5 rtl:rotate-180" />
                    <span className="text-foreground">{text("myOrders")}</span>
                </nav>

                <header className="mb-6 border-b pb-4">
                    <h1 className="sf-page-title">{text("myOrders")}</h1>
                    <p className="sf-meta mt-1">{text("recentOrdersHint")}</p>
                </header>

                <section className="mb-8">
                    <h2 className="sf-section-title mb-3">{text("recentOrders")}</h2>
                    {recent.length === 0 ? (
                        <div className="sf-empty">
                            <Receipt className="mx-auto size-7 text-muted-foreground/60" strokeWidth={1.5} />
                            <p className="mt-3 font-semibold">{text("noRecentOrders")}</p>
                            <p className="sf-meta mx-auto mt-1 max-w-sm">{text("noRecentOrdersHint")}</p>
                            <Link href="/shop" className="sf-btn sf-btn--outline mt-5">
                                <PackageSearch className="size-4" />
                                {text("continueShopping")}
                            </Link>
                        </div>
                    ) : (
                        <ul className="sf-card sf-divide px-4">
                            {recent.map(order => (
                                <li key={order.orderId} className="flex flex-wrap items-center gap-3 py-3.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold" dir="ltr">{order.orderNumber}</p>
                                        {order.savedAt && (
                                            <p className="sf-meta">{text("orderPlacedOn")} · {formatDate(order.savedAt)}</p>
                                        )}
                                    </div>
                                    <Link
                                        href={buildOnlineOrderTrackingUrl(order.orderId, order.token)}
                                        className="sf-btn sf-btn--outline sf-btn--sm"
                                    >
                                        {text("trackOrder")}
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => forgetOnlineOrder(order.orderId)}
                                        aria-label={`${text("remove")} ${order.orderNumber}`}
                                        className="sf-icon-btn size-9 shrink-0 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="sf-panel">
                    <h2 className="sf-section-title">{text("lookupTitle")}</h2>
                    <p className="sf-meta mt-1">{text("lookupHint")}</p>
                    <form onSubmit={lookup} className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor="sf-order-number" className="sf-label">{text("orderNumber")}</label>
                            <input
                                id="sf-order-number"
                                value={orderNumber}
                                onChange={event => setOrderNumber(event.target.value)}
                                maxLength={64}
                                autoComplete="off"
                                dir="ltr"
                                className="sf-field"
                            />
                        </div>
                        <div>
                            <label htmlFor="sf-contact" className="sf-label">{text("phoneOrEmail")}</label>
                            <input
                                id="sf-contact"
                                value={contact}
                                onChange={event => setContact(event.target.value)}
                                maxLength={200}
                                autoComplete="off"
                                dir="ltr"
                                className="sf-field"
                            />
                        </div>
                        {lookupError && (
                            <p role="alert" className="text-[13px] font-medium text-destructive sm:col-span-2">{lookupError}</p>
                        )}
                        <button type="submit" disabled={submitting} className="sf-btn sf-btn--primary sm:col-span-2">
                            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                            {text("findOrder")}
                        </button>
                    </form>
                    {/* A shopper who cannot find their order is exactly who the
                        customer-service destination exists for. */}
                    <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="sf-meta max-w-prose">{text("orderHelpHint")}</p>
                        <StoreWhatsAppLink
                            purpose={WHATSAPP_PURPOSE.customerService}
                            isAr={isAr}
                            variant="brand"
                            className="w-full shrink-0 sm:w-auto"
                        />
                    </div>
                </section>
            </div>
            </div>
        </StoreShell>
    );
}
