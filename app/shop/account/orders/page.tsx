"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Package, RefreshCw } from "lucide-react";
import AccountLayout from "@/components/showcase/account/AccountLayout";
import { customerAccountApi, type CustomerOrdersPage } from "@/lib/api-customer-account";
import { formatCurrency } from "@/lib/currencies";
import { customerOrderStatusLabel, customerOrderTypeLabel, formatCustomerOrderDate } from "@/lib/customer-order-labels";
import { useSettingsStore } from "@/store/settingsStore";

const PAGE_SIZE = 10;

export default function AccountOrdersPage() {
    return <AccountLayout>{isAr => <OrdersList isAr={isAr} />}</AccountLayout>;
}

/** Orders owned by the signed-in account — placed on this website or in the mobile app. */
function OrdersList({ isAr }: { isAr: boolean }) {
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const currency = useSettingsStore(state => state.settings.currency);
    const settingsLoaded = useSettingsStore(state => state.isLoaded);
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState<{ key: string; data: CustomerOrdersPage | null; error: boolean } | null>(null);
    const requestKey = `${page}|${revision}`;

    useEffect(() => {
        let cancelled = false;
        customerAccountApi.getOrders(page, PAGE_SIZE)
            .then(data => { if (!cancelled) setState({ key: requestKey, data, error: false }); })
            .catch(() => { if (!cancelled) setState({ key: requestKey, data: null, error: true }); });
        return () => { cancelled = true; };
        // requestKey encodes page and revision.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey]);

    const loading = state?.key !== requestKey;
    const data = loading ? null : state?.data;
    const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
    const format = (amount: number) => settingsLoaded && currency ? formatCurrency(amount, currency) : "—";

    if (loading) {
        return (
            <div role="status" className="space-y-2">
                <span className="sr-only">{t("Loading orders", "جارٍ تحميل الطلبات")}</span>
                {Array.from({ length: 4 }, (_, i) => <div key={i} className="sf-skel h-20 w-full rounded-[12px]" />)}
            </div>
        );
    }

    if (state?.error || !data) {
        return (
            <div role="alert" className="sf-empty">
                <p className="font-semibold">{t("Could not load your orders", "تعذر تحميل طلباتك")}</p>
                <button type="button" onClick={() => setRevision(v => v + 1)} className="sf-btn sf-btn--outline mt-5">
                    <RefreshCw className="size-4" />
                    {t("Try again", "إعادة المحاولة")}
                </button>
            </div>
        );
    }

    if (data.items.length === 0) {
        return (
            <div className="sf-empty">
                <Package className="mx-auto size-7 text-muted-foreground/60" strokeWidth={1.5} />
                <p className="mt-3 font-semibold">{t("No orders yet", "لا توجد طلبات بعد")}</p>
                <Link href="/shop" className="sf-btn sf-btn--primary mt-5">{t("Start shopping", "ابدأ التسوق")}</Link>
            </div>
        );
    }

    return (
        <div>
            <ul className="space-y-2">
                {data.items.map(order => (
                    <li key={order.id}>
                        <Link href={`/shop/account/orders/${order.orderId}`} className="sf-card flex items-center gap-3 p-4 transition-colors hover:bg-[var(--sf-surface-sunken)]">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold" dir="ltr">#{order.orderNumber}</p>
                                <p className="sf-meta mt-0.5">
                                    {formatCustomerOrderDate(order.createdAt, isAr)} · {customerOrderTypeLabel(order.orderType, isAr)} · {order.totalItemsCount} {t("items", "منتجات")}
                                </p>
                            </div>
                            <div className="text-end">
                                <p className="sf-price">{format(order.totalAmount)}</p>
                                <p className="sf-meta mt-0.5">{customerOrderStatusLabel(order.status, isAr)}</p>
                            </div>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                        </Link>
                    </li>
                ))}
            </ul>
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="sf-btn sf-btn--outline sf-btn--sm">
                        {t("Previous", "السابق")}
                    </button>
                    <span className="sf-meta">{page} / {totalPages}</span>
                    <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="sf-btn sf-btn--outline sf-btn--sm">
                        {t("Next", "التالي")}
                    </button>
                </div>
            )}
        </div>
    );
}
