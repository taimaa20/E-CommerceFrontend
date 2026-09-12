"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt as ReceiptIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { BrandHeader } from "@/features/customer-qr/components/BrandHeader";
import { EmptyState } from "@/features/customer-qr/components/EmptyState";
import { TrackingTimeline } from "@/features/customer-qr/components/TrackingTimeline";
import { useOrder } from "@/features/customer-qr/store/orderStore";
import { MoneyText } from "@/features/customer-qr/components/MoneyText";
import { useT } from "@/features/customer-qr/i18n/useT";
import { tableUrl } from "@/features/customer-qr/constants";
import { orderService, remainingBalance } from "@/features/customer-qr/services";
import { minutesUntil } from "@/features/customer-qr/utils/format";

export default function TrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tableId } = use(params);
  const t = useT();
  const router = useRouter();

  const order = useOrder(tableId, (s) => s.order);

  /* The kitchen status simulator runs in the table layout's
     OrderLifecycleDriver, so it advances on every screen — not only here. */

  /* Auto-route to feedback shortly after "completed". */
  useEffect(() => {
    if (order?.status === "completed") {
      const id = setTimeout(() => router.push(tableUrl(tableId, "feedback")), 2400);
      return () => clearTimeout(id);
    }
  }, [order?.status, router, tableId]);

  const snapshot = useMemo(
    () => (order ? orderService.buildTracking(order) : null),
    [order],
  );

  if (!order || !snapshot) {
    return (
      <MobileShell header={<BrandHeader title={t("tracking")} showBack />}>
        <EmptyState
          icon={<ReceiptIcon className="size-6" />}
          title={t("noResults")}
          description={t("noResultsHint")}
          action={
            <Link href={tableUrl(tableId, "menu")}>
              <Button className="rounded-full">{t("browseMenu")}</Button>
            </Link>
          }
        />
      </MobileShell>
    );
  }

  const etaMinutes = minutesUntil(order.estimatedReadyIso);
  const isDone = order.status === "completed";

  return (
    <MobileShell
      header={
        <BrandHeader title={t("trackingTitle")} subtitle={t("trackingSub")} showBack />
      }
      footer={
        <div className="p-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="rounded-2xl h-12"
            onClick={() => router.push(tableUrl(tableId, "receipt"))}
          >
            <ReceiptIcon className="size-4" /> {t("viewReceipt")}
          </Button>
          <Button
            className="rounded-2xl h-12"
            onClick={() => router.push(tableUrl(tableId, "feedback"))}
            disabled={!isDone && order.status !== "served"}
          >
            <Star className="size-4" /> {t("feedback")}
          </Button>
        </div>
      }
    >
      <div className="px-4 py-4 space-y-4">
        {/* Order header */}
        <section className="rounded-2xl bg-card border border-border/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {t("orderCode")}
              </div>
              <div className="text-lg font-bold tabular-nums">{order.shortCode}</div>
            </div>
            <div className="text-end">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {t("estimatedReady")}
              </div>
              <div className="text-sm font-semibold">
                ≈ {etaMinutes} {t("minutes")}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-dashed border-border/70 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              {t("paymentLabel")}
            </span>
            {order.paymentState === "paid" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {t("fullyPaid")}
              </span>
            ) : (
              <span className="text-sm font-semibold">
                {order.paymentState === "partial" ? t("partiallyPaid") : t("unpaid")}
                {" · "}
                <MoneyText amount={remainingBalance(order)} muted />
              </span>
            )}
          </div>
        </section>

        {/* Timeline */}
        <section className="rounded-2xl bg-card border border-border/70 px-4 cqr-shadow-card">
          <TrackingTimeline snapshot={snapshot} order={order} />
        </section>

        <p className="text-center text-[11px] text-muted-foreground">
          {t("trackingSub")}
        </p>

        <div className="h-2" />
      </div>
    </MobileShell>
  );
}
