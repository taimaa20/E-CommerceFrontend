"use client";

import { Store, User, DollarSign, CheckCircle2, Truck, Tag } from "lucide-react";
import { OrderDto } from "@/types/order";
import { PrintReceiptButton } from "@/components/receipt/PrintReceiptButton";
import { WhatsAppReceiptButton } from "@/components/receipt/WhatsAppReceiptButton";
import { useLocale } from "@/components/locale-provider";
import { calculateOrderPaymentTotals } from "@/lib/order-payment-totals";
import { splitOrderItemsForOfferDisplay } from "@/lib/order-offer-display";
import { getCashierOrderState } from "@/lib/cashier-order-selectors";
import { getOrderRemainingAmount } from "@/lib/order-payments";
import { formatOrderSequence } from "@/lib/order-sequence";
import { ORDER_STATUS } from "@/lib/status-constants";

interface OrderCardProps {
    order: OrderDto;
    index: number;
    currency: string;
    storeServiceRate: number;
    storeTaxRate: number;
    onCollect: (order: OrderDto) => void;
    onStartPreparing?: (order: OrderDto) => void;
    onMarkReady?: (order: OrderDto) => void;
    onMarkDispatched?: (order: OrderDto) => void;
    onMarkPickedUp?: (order: OrderDto) => void;
    onResendKitchen?: (order: OrderDto) => void;
    isMarkingReady?: boolean;
    isUpdatingLifecycle?: boolean;
    isMarkingPickedUp?: boolean;
    paymentDisabled?: boolean;
    paymentDisabledMessage?: string | null;
}

function formatAmount(n: number, currencyCode: string): string {
    const sym = currencyCode || "EGP";
    return `${sym} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Mirror the same effective-total logic the payment modal uses. */
function computeEffectiveTotal(order: OrderDto, storeServiceRate: number, storeTaxRate: number): number {
    const subtotal = (order.subtotal && order.subtotal > 0)
        ? order.subtotal
        : (order.items?.reduce((s, i) => s + (i.lineTotalAmount ?? 0), 0) ?? 0);
    const discount = (order.discountAmount && order.discountAmount > 0)
        ? order.discountAmount
        : subtotal * ((order.discountPercentage ?? 0) / 100);
    const serviceRate = (order.serviceChargeRate ?? 0) > 0 ? order.serviceChargeRate : storeServiceRate;
    const taxRate     = (order.taxRate ?? 0) > 0 ? order.taxRate : storeTaxRate;
    const fees = (order.deliveryFee ?? 0)
        + (order.talabatDeliveryFee ?? 0)
        + (order.talabatServiceFee ?? 0)
        + (order.partnerDeliveryFee ?? 0)
        + (order.partnerServiceFee ?? 0);
    return calculateOrderPaymentTotals(subtotal, discount, serviceRate, taxRate, order.discountGroupAmount ?? 0).total + fees;
}

const footerActionClass =
    "inline-flex min-h-16 w-full min-w-0 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-xs font-semibold leading-tight whitespace-normal transition-colors active:scale-[0.98] sm:text-sm";

export function OrderCard({
    order,
    index,
    currency,
    storeServiceRate,
    storeTaxRate,
    onCollect,
    onStartPreparing,
    onMarkReady,
    onMarkDispatched,
    onMarkPickedUp,
    onResendKitchen,
    isMarkingReady,
    isUpdatingLifecycle,
    isMarkingPickedUp,
    paymentDisabled = false,
    paymentDisabledMessage = null,
}: OrderCardProps) {
    const { t, locale } = useLocale();
    const orderState = getCashierOrderState(order);
    const cancellationPending =
        !orderState.isCancelled &&
        order.isRefunded !== true &&
        order.isFullyCancelled !== true &&
        (order.hasPendingCancellation === true ||
            order.hasPendingFullCancellation === true ||
            order.status === ORDER_STATUS.PENDING_CANCELLATION_APPROVAL ||
            order.cancellationInfo?.approvalStatus?.startsWith("Pending") === true);
    const isReadyStage = orderState.isReady;
    const isOnlineOrder = order.orderSource === "Online";
    const isOnlineAwaitingPreparation =
        isOnlineOrder &&
        !isReadyStage &&
        (order.status === ORDER_STATUS.NEW || order.status === ORDER_STATUS.PAID);
    const canShowReadyAction =
        !isReadyStage &&
        !isOnlineAwaitingPreparation &&
        (!isOnlineOrder || order.status === ORDER_STATUS.PREPARING) &&
        !cancellationPending &&
        !orderState.isCompleted &&
        !orderState.isCancelled;
    const canShowDispatchAction =
        isOnlineOrder &&
        orderState.isDelivery &&
        isReadyStage &&
        !order.dispatchedAt &&
        !cancellationPending &&
        !orderState.served &&
        !orderState.isCompleted &&
        !orderState.isCancelled;
    const canShowFulfillmentAction =
        isReadyStage &&
        (!isOnlineOrder || !orderState.isDelivery || Boolean(order.dispatchedAt)) &&
        !cancellationPending &&
        !orderState.served &&
        !orderState.isCompleted &&
        !orderState.isCancelled;

    const effectiveTotal = computeEffectiveTotal(order, storeServiceRate, storeTaxRate);
    const remainingAmount = getOrderRemainingAmount(order);
    const groupedOrder = splitOrderItemsForOfferDisplay(order);
    const groupedItemCount = groupedOrder.regularItems.length + groupedOrder.offerBundles.length + ((groupedOrder.offerBundles.length === 0 && order.offerId && groupedOrder.offerCoveredTotal > 0) ? 1 : 0);
    const canResendKitchen = Boolean(onResendKitchen && !orderState.isCancelled && !cancellationPending);
    const canSendWhatsApp = Boolean(order.customerPhone?.trim());
    const footerActionCount = 2 + (canResendKitchen ? 1 : 0) + (canSendWhatsApp ? 1 : 0);
    const footerGridColumns = footerActionCount >= 4
        ? "grid-cols-2 sm:grid-cols-4"
        : footerActionCount === 3
        ? "grid-cols-3"
        : "grid-cols-2";

    // Left accent color
    const accentColor = orderState.paymentStatus === "Partial"
        ? "bg-amber-500"
        : cancellationPending
        ? "bg-amber-500"
        : orderState.isPaid
        ? "bg-blue-500"
        : orderState.isReady
        ? "bg-[#16A34A]"
        : orderState.served
        ? "bg-[#7C3AED]"
        : "bg-[#E8651A]";

    // Card border
    const borderColor = orderState.paymentStatus === "Partial"
        ? "border-amber-300"
        : cancellationPending
        ? "border-amber-300"
        : orderState.isPaid
        ? "border-blue-300"
        : orderState.isReady
        ? "border-green-300"
        : "border-[#E4E6EA]";

    const isPartnerOrder = order.orderSource === "DeliveryPartner";
    const partnerName = locale === "ar"
        ? order.deliveryPartnerNameAr || order.deliveryPartnerName || order.deliveryPartnerCode
        : order.deliveryPartnerName || order.deliveryPartnerCode;
    const isTalabatOrder = order.orderSource === "Talabat";
    const displayName = isOnlineOrder
        ? (locale === "ar" ? "المتجر الإلكتروني" : "Online Shop")
        : isPartnerOrder
        ? partnerName || "Delivery Partner"
        : isTalabatOrder
        ? "Talabat"
        : order.tableName === "TAKEAWAY" || order.orderType === "Takeaway"
            ? "Takeaway"
            : order.tableName || "Table";

    const orderType: "dine" | "takeaway" | "delivery" =
        orderState.isDelivery ? "delivery" : orderState.isTakeaway ? "takeaway" : "dine";
    const fulfillmentLabel = orderState.isTakeaway
        ? (locale === "ar" ? "تم الاستلام" : "Picked Up")
        : orderState.isDelivery
        ? (locale === "ar" ? "تم التوصيل" : "Delivered")
        : t("statusServed");
    const fulfillmentActionLabel = orderState.isTakeaway
        ? (locale === "ar" ? "استلام" : "Pick Up")
        : orderState.isDelivery
        ? (locale === "ar" ? "توصيل" : "Deliver")
        : t("served");

    const shortId = formatOrderSequence(order) ?? `#${order.orderNumber.substring(order.orderNumber.length - 4)}`;
    const customerDisplayName = locale === "ar"
        ? order.customerNameAr || order.customerName
        : order.customerName || order.customerNameAr;

    return (
        <div
            className={`group relative bg-white border-[1.5px] ${borderColor} rounded-[14px] overflow-hidden
                        transition-all duration-200 hover:border-[#E8651A] hover:-translate-y-[2px] hover:shadow-md
                        animate-fadeUp`}
            style={{ animationDelay: `${index * 25}ms`, animationFillMode: "forwards" }}
        >
            {/* Left accent bar */}
            <div className={`absolute top-0 start-0 w-1 h-full ${accentColor}`} />

            {/* ── Header ─────────────────────────────────────── */}
            <div className="border-b border-[#E4E6EA] px-4 py-4 sm:px-5 sm:pe-4 flex flex-wrap justify-between items-start gap-3">
                <div className="min-w-0">
                    <p className="truncate text-base font-bold leading-tight text-[#111827] md:text-lg">{displayName}</p>
                    <p className="mt-0.5 text-sm font-mono text-[#9CA3AF]">{shortId}</p>

                    {/* Badge row */}
                    <div className="flex flex-wrap gap-1 mt-2">
                        {/* Status badge */}
                        {isReadyStage && (
                            <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[#EDFAF3] px-3 py-1 text-sm font-semibold text-[#16A34A]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] flex-shrink-0" />
                                {t("statusReady")}
                            </span>
                        )}
                        {orderState.served && (
                            <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 flex-shrink-0" />
                                {fulfillmentLabel}
                            </span>
                        )}
                        {isOnlineOrder && orderState.isDelivery && order.dispatchedAt && !orderState.served && (
                            <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                                {locale === "ar" ? "خرج للتوصيل" : "Out for delivery"}
                            </span>
                        )}
                        {orderState.isPaid && (
                            <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 flex-shrink-0" />
                                {t("statusPaid")}
                            </span>
                        )}
                        {orderState.paymentStatus === "Partial" && (
                            <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0" />
                                {locale === "ar" ? "مدفوع جزئيًا" : "Partially Paid"}
                            </span>
                        )}
                        {isTalabatOrder && (
                            <span className="inline-flex min-h-8 items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                                {locale === "ar" ? "طلبات" : "Talabat"}
                                {order.talabatOrderNumber ? ` #${order.talabatOrderNumber}` : ""}
                            </span>
                        )}
                        {isPartnerOrder && (
                            <span className="inline-flex min-h-8 items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                                {partnerName || (locale === "ar" ? "شريك توصيل" : "Delivery Partner")}
                                {order.partnerOrderNumber ? ` #${order.partnerOrderNumber}` : ""}
                            </span>
                        )}

                        {/* Type badge */}
                        {orderType === "dine" ? (
                            <span className="inline-flex min-h-8 items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                                {t("dineIn")}
                            </span>
                        ) : orderType === "takeaway" ? (
                            <span className="inline-flex min-h-8 items-center rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
                                {t("takeaway")}
                            </span>
                        ) : (
                            <span className="inline-flex min-h-8 items-center rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                                {locale === "ar" ? "توصيل" : "Delivery"}
                            </span>
                        )}
                        {cancellationPending && (
                            <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-600" />
                                {t("cancelPendingButton")}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Operational action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                    {isOnlineAwaitingPreparation && onStartPreparing && (
                        <button
                            type="button"
                            onClick={() => onStartPreparing(order)}
                            disabled={isUpdatingLifecycle}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 sm:text-sm"
                        >
                            <Store className="h-4 w-4" />
                            <span className="hidden sm:inline">{locale === "ar" ? "بدء التحضير" : "Start preparing"}</span>
                        </button>
                    )}
                    {canShowReadyAction && onMarkReady && (
                        <button
                            type="button"
                            onClick={() => onMarkReady(order)}
                            disabled={isMarkingReady}
                            aria-label={`Mark as Ready ${shortId}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#16A34A] text-white font-bold transition-colors hover:bg-[#16A34A]/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
                        >
                            {isMarkingReady ? (
                                <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            )}
                            <span className="hidden sm:inline">{t("ready")}</span>
                        </button>
                    )}
                    {canShowDispatchAction && onMarkDispatched && (
                        <button
                            type="button"
                            onClick={() => onMarkDispatched(order)}
                            disabled={isUpdatingLifecycle}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50 sm:text-sm"
                        >
                            <Truck className="h-4 w-4" />
                            <span className="hidden sm:inline">{locale === "ar" ? "خرج للتوصيل" : "Out for delivery"}</span>
                        </button>
                    )}
                    {canShowFulfillmentAction && onMarkPickedUp && (
                        <button
                            type="button"
                            onClick={() => onMarkPickedUp(order)}
                            disabled={isMarkingPickedUp}
                            aria-label={`Mark as ${orderState.isTakeaway ? "Picked Up" : orderState.isDelivery ? "Delivered" : "Served"} ${shortId}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#7C3AED] text-white font-bold transition-colors hover:bg-[#7C3AED]/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
                        >
                            {isMarkingPickedUp ? (
                                <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            )}
                            <span className="hidden sm:inline">{fulfillmentActionLabel}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Body ───────────────────────────────────────── */}
            <div className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Guest */}
                    <div className="flex min-h-12 items-center gap-2 text-[#6B7280]">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <div className="min-w-0">
                            <span className="block truncate text-sm md:text-base">
                                {customerDisplayName || order.customerPhone || t("guestLabel")}
                            </span>
                            {customerDisplayName && order.customerPhone && (
                                <span className="block truncate text-xs text-[#9CA3AF]">{order.customerPhone}</span>
                            )}
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="min-w-0 text-end">
                        <p className="text-xl font-bold leading-tight text-[#111827] md:text-2xl">
                            {formatAmount(effectiveTotal, currency)}
                        </p>
                        <p className="text-sm text-[#6B7280]">
                            {orderState.paymentStatus === "Partial"
                                ? `${locale === "ar" ? "المتبقي" : "Remaining"} ${formatAmount(remainingAmount, currency)}`
                                : t("totalDue")}
                        </p>
                    </div>
                </div>

                <p className="mt-2 text-sm text-[#6B7280]">
                    {groupedItemCount} {t("itemsCol")}
                </p>

                {/* Affiliation discount group applied to this order — visible without opening details. */}
                {(order.discountGroupAmount ?? 0) > 0 && (
                    <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                        <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                            {order.discountGroupName || t("discountGroup")}
                            {order.discountGroupType === 0 && (order.discountGroupValue ?? 0) > 0 ? ` (${order.discountGroupValue}%)` : ""}
                        </span>
                        <span className="flex-shrink-0">−{formatAmount(order.discountGroupAmount ?? 0, currency)}</span>
                    </div>
                )}
            </div>

            {/* ── Footer ─────────────────────────────────────── */}
            <div className={`grid ${footerGridColumns} items-stretch gap-2 border-t border-[#E4E6EA] px-4 pb-4 pt-3 sm:px-5`}>
                <PrintReceiptButton
                    order={order}
                    variant="outline"
                    size="sm"
                    className={`${footerActionClass} h-auto border-[#E4E6EA] text-[#6B7280] hover:border-primary hover:text-primary [&_svg]:me-0`}
                />
                {canSendWhatsApp ? (
                    <WhatsAppReceiptButton
                        order={order}
                        variant="outline"
                        size="sm"
                        className={`${footerActionClass} h-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50 [&_svg]:me-0`}
                    />
                ) : null}
                {canResendKitchen ? (
                    <button
                        type="button"
                        onClick={() => onResendKitchen?.(order)}
                        className={`${footerActionClass} border border-orange-200 text-orange-700 hover:bg-orange-50`}
                    >
                        <Store className="h-4 w-4" />
                        <span>{t("resendToKitchen")}</span>
                    </button>
                ) : null}

                {!orderState.isPaid && !cancellationPending ? (
                    <div className="min-w-0">
                        <button
                            type="button"
                            onClick={() => onCollect(order)}
                            disabled={paymentDisabled}
                            aria-label={`${t("collectPayment")} ${shortId}`}
                            className={`${footerActionClass} bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                            <DollarSign className="h-4 w-4" />
                            <span>{t("collectPayment")}</span>
                        </button>
                        {paymentDisabled && paymentDisabledMessage ? (
                            <p className="mt-2 max-w-64 text-xs font-medium text-amber-700 sm:text-end">
                                {paymentDisabledMessage}
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => onCollect(order)}
                        aria-label={`${t("viewDetails")} ${shortId}`}
                        className={`${footerActionClass} border border-primary/20 text-primary hover:bg-primary/10`}
                    >
                        <span>{t("viewDetails")}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
