"use client";

// Paymob Hosted Checkout return page for the Online Order sandbox flow.
// Responsibilities only: read the redirect query parameters, poll the
// Payment Engine read API until the payment reaches a terminal state
// (max 30 seconds), and display the result. No business logic here —
// the webhook pipeline is the single writer of payment/order state.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getOrderById } from "@/lib/api";
import {
    getOrderPayment,
    getPaymentStatusLabel,
    isTerminalPaymentStatus,
    PaymentEngineStatus,
    type PaymentEnginePaymentDetails,
} from "@/lib/api-payment-engine";
import { readOnlineOrderTestContext } from "@/lib/online-order-test";
import {
    buildOnlineOrderTrackingUrl,
    readRememberedOnlineOrder,
} from "@/lib/online-order-status";
import { useLocale } from "@/components/locale-provider";
import type { OrderDto } from "@/types/order";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_DURATION_MS = 30_000;

type PollPhase = "polling" | "terminal" | "timeout" | "missing-order" | "error";

function findTransactionReference(payment: PaymentEnginePaymentDetails | null): string | null {
    if (!payment) return null;
    const attempts = [...payment.attempts].sort((a, b) => b.attemptNumber - a.attemptNumber);
    return attempts.find((a) => a.gatewayReference)?.gatewayReference ?? null;
}

function CallbackContent() {
    const searchParams = useSearchParams();
    const { locale } = useLocale();
    const isAr = locale === "ar";

    // Paymob appends its transaction outcome to the static redirection URL.
    const providerSuccess = searchParams.get("success");
    const providerTransactionId = searchParams.get("id");
    const providerOrderId = searchParams.get("order");
    const merchantOrderId = searchParams.get("merchant_order_id");
    const queryOrderId = searchParams.get("orderId");
    const [rememberedOrder] = useState(() => readRememberedOnlineOrder());
    const orderId = queryOrderId ?? readOnlineOrderTestContext()?.orderId ?? rememberedOrder?.orderId ?? null;

    const [phase, setPhase] = useState<PollPhase>(orderId ? "polling" : "missing-order");
    const [payment, setPayment] = useState<PaymentEnginePaymentDetails | null>(null);
    const [order, setOrder] = useState<OrderDto | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const deadline = Date.now() + MAX_POLL_DURATION_MS;

        const poll = async () => {
            try {
                const [orderPayment, orderDto] = await Promise.all([
                    getOrderPayment(orderId),
                    getOrderById(orderId).catch(() => null),
                ]);
                if (cancelled) return;

                const current = orderPayment.currentPayment
                    ?? orderPayment.payments[orderPayment.payments.length - 1]
                    ?? null;
                setPayment(current);
                if (orderDto) setOrder(orderDto);

                if (current && isTerminalPaymentStatus(current.status)) {
                    setPhase("terminal");
                    return;
                }
            } catch (error) {
                if (cancelled) return;
                setErrorMessage(error instanceof Error ? error.message : "Failed to read the payment status");
            }

            if (cancelled) return;
            if (Date.now() >= deadline) {
                setPhase("timeout");
                return;
            }
            timer = setTimeout(poll, POLL_INTERVAL_MS);
        };

        void poll();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [orderId]);

    const isPaid = payment?.status === PaymentEngineStatus.Captured;
    const isTerminalFailure = payment !== null
        && isTerminalPaymentStatus(payment.status)
        && !isPaid;

    const banner = (() => {
        if (phase === "missing-order") {
            return { tone: "warn" as const, title: "Order reference missing", detail: "The callback was opened without an order reference. Start again from /online-order-test." };
        }
        if (isPaid) {
            return { tone: "success" as const, title: "Payment Successful", detail: "The webhook confirmed the payment." };
        }
        if (isTerminalFailure) {
            return { tone: "error" as const, title: "Payment Failed", detail: `The payment ended as ${getPaymentStatusLabel(payment?.status)}.` };
        }
        if (phase === "timeout") {
            const providerHint = providerSuccess === "true"
                ? "Paymob reported success in the redirect, but the webhook has not confirmed it yet."
                : "The webhook has not reported a final state yet.";
            return { tone: "warn" as const, title: "Still processing", detail: `Stopped polling after 30 seconds. ${providerHint}` };
        }
        return { tone: "info" as const, title: "Confirming payment…", detail: "Waiting for the webhook to reach a final state (up to 30 seconds)." };
    })();

    const bannerClasses = {
        success: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
        error: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
        warn: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        info: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    }[banner.tone];

    return (
        <main className="mx-auto max-w-2xl space-y-6 p-6">
            <header>
                <h1 className="text-2xl font-semibold">Paymob Payment Result</h1>
                <p className="mt-1 text-sm text-muted-foreground">Online Order sandbox — Payment Engine status readback.</p>
            </header>

            <div className={`rounded-lg border p-4 ${bannerClasses}`}>
                <p className="font-semibold">{banner.title}</p>
                <p className="mt-1 text-sm">{banner.detail}</p>
            </div>

            <dl className="grid gap-x-8 gap-y-2 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Payment Status</dt><dd>{getPaymentStatusLabel(payment?.status)}</dd></div>
                <div><dt className="text-muted-foreground">Order Status</dt><dd>{order?.status ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Amount</dt><dd>{payment ? `${payment.amount.toFixed(2)} ${payment.currency}` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">Order Payment Status</dt><dd>{order?.paymentStatus ?? (order?.isPaid ? "Paid" : "—")}</dd></div>
                <div><dt className="text-muted-foreground">Provider Reference</dt><dd className="break-all font-mono">{payment?.gatewayReference ?? providerOrderId ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Transaction Reference</dt><dd className="break-all font-mono">{findTransactionReference(payment) ?? providerTransactionId ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Merchant Reference</dt><dd className="break-all font-mono">{payment?.merchantReference ?? merchantOrderId ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Order ID</dt><dd className="break-all font-mono">{orderId ?? "—"}</dd></div>
            </dl>

            {errorMessage && phase !== "terminal" && (
                <p className="text-sm text-red-600 dark:text-red-400">Last status read failed: {errorMessage}</p>
            )}

            <div className="flex gap-3">
                {rememberedOrder?.orderId === orderId && (
                    <Link
                        href={buildOnlineOrderTrackingUrl(rememberedOrder.orderId, rememberedOrder.token)}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                        {isAr ? "تتبع الطلب" : "Track order"}
                    </Link>
                )}
                <Link href={rememberedOrder ? "/shop" : "/online-order-test"} className="rounded-lg border px-4 py-2 text-sm">
                    {rememberedOrder
                        ? (isAr ? "العودة إلى القائمة" : "Back to menu")
                        : "Back to Online Order Test"}
                </Link>
            </div>
        </main>
    );
}

export default function PaymobCallbackPage() {
    return (
        <Suspense fallback={<main className="p-6 text-sm text-muted-foreground">Loading payment result…</main>}>
            <CallbackContent />
        </Suspense>
    );
}
