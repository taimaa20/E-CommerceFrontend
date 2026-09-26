"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import AccountLayout from "@/components/showcase/account/AccountLayout";
import { CustomerApiError, customerAccountApi, type CustomerOrderDetails } from "@/lib/api-customer-account";
import { formatCurrency } from "@/lib/currencies";
import { customerOrderStatusLabel, customerOrderTypeLabel, formatCustomerOrderDate } from "@/lib/customer-order-labels";
import { useSettingsStore } from "@/store/settingsStore";

export default function AccountOrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params);
    return <AccountLayout>{isAr => <OrderDetails orderId={orderId} isAr={isAr} />}</AccountLayout>;
}

/**
 * One order of the signed-in account. The API answers 404 for an order another customer owns,
 * exactly as for one that does not exist, so an id in the URL discloses nothing.
 */
function OrderDetails({ orderId, isAr }: { orderId: string; isAr: boolean }) {
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const currency = useSettingsStore(state => state.settings.currency);
    const settingsLoaded = useSettingsStore(state => state.isLoaded);
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState<{ key: string; order: CustomerOrderDetails | null; notFound: boolean } | null>(null);
    const requestKey = `${orderId}|${revision}`;

    useEffect(() => {
        let cancelled = false;
        customerAccountApi.getOrder(orderId)
            .then(order => { if (!cancelled) setState({ key: requestKey, order, notFound: false }); })
            .catch((error: unknown) => {
                if (!cancelled) setState({ key: requestKey, order: null, notFound: error instanceof CustomerApiError && error.status === 404 });
            });
        return () => { cancelled = true; };
        // requestKey encodes orderId and revision.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey]);

    const format = (amount: number) => settingsLoaded && currency ? formatCurrency(amount, currency) : "—";
    const back = (
        <Link href="/shop/account/orders" className="sf-btn sf-btn--quiet sf-btn--sm -ms-2 mb-3">
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t("My orders", "طلباتي")}
        </Link>
    );

    if (state?.key !== requestKey) {
        return (
            <div role="status">
                {back}
                <span className="sr-only">{t("Loading order", "جارٍ تحميل الطلب")}</span>
                <div className="sf-skel h-48 w-full rounded-[12px]" />
            </div>
        );
    }

    if (!state.order) {
        return (
            <div>
                {back}
                <div role="alert" className="sf-empty">
                    <p className="font-semibold">
                        {state.notFound ? t("Order not found", "الطلب غير موجود") : t("Could not load this order", "تعذر تحميل الطلب")}
                    </p>
                    {!state.notFound && (
                        <button type="button" onClick={() => setRevision(v => v + 1)} className="sf-btn sf-btn--outline mt-5">
                            <RefreshCw className="size-4" />
                            {t("Try again", "إعادة المحاولة")}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const order = state.order;
    return (
        <div>
            {back}
            <div className="sf-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold" dir="ltr">#{order.orderNumber}</h2>
                        <p className="sf-meta mt-0.5">
                            {formatCustomerOrderDate(order.createdAt, isAr)} · {customerOrderTypeLabel(order.orderType, isAr)}
                        </p>
                    </div>
                    <span className="rounded-full bg-[var(--sf-surface-sunken)] px-3 py-1 text-sm font-medium">
                        {customerOrderStatusLabel(order.status, isAr)}
                    </span>
                </div>

                {order.deliveryAddress && (
                    <p className="sf-meta mt-4">{t("Deliver to", "التوصيل إلى")}: {order.deliveryAddress}</p>
                )}

                <ul className="mt-4 divide-y border-y">
                    {order.items.map(item => (
                        <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                            <div className="min-w-0">
                                <p className="font-medium">{isAr ? item.productNameAr || item.productName : item.productName}</p>
                                {(item.selectedOptionName || item.selectedOptionNameAr) && (
                                    <p className="sf-meta">{isAr ? item.selectedOptionNameAr || item.selectedOptionName : item.selectedOptionName}</p>
                                )}
                                <p className="sf-meta">{item.quantity} × {format(item.unitPrice)}</p>
                            </div>
                            <p className="shrink-0 font-medium">{format(item.lineTotal)}</p>
                        </li>
                    ))}
                </ul>

                {/* The order's own snapshot: still correct if the promo is later edited or disabled. */}
                <dl className="mt-4 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{t("Subtotal", "المجموع الفرعي")}</dt>
                        <dd className="tabular-nums">{format(order.subtotal)}</dd>
                    </div>
                    {order.promoDiscountAmount > 0 && (
                        <div className="flex justify-between gap-3 text-emerald-700">
                            <dt>{t("Promo", "رمز الخصم")} <span dir="ltr">{order.promoCode}</span></dt>
                            <dd className="tabular-nums">-{format(order.promoDiscountAmount)}</dd>
                        </div>
                    )}
                    {order.deliveryFee > 0 && (
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{t("Delivery", "التوصيل")}</dt>
                            <dd className="tabular-nums">{format(order.deliveryFee)}</dd>
                        </div>
                    )}
                </dl>

                <div className="mt-3 flex items-center justify-between border-t pt-3 font-semibold">
                    <span>{t("Total", "الإجمالي")}</span>
                    <span className="sf-price">{format(order.totalAmount)}</span>
                </div>
            </div>
        </div>
    );
}
