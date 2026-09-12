"use client";

import { use } from "react";
import Link from "next/link";
import { Download, Receipt as ReceiptIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { BrandHeader } from "@/features/customer-qr/components/BrandHeader";
import { EmptyState } from "@/features/customer-qr/components/EmptyState";
import { CartSummary } from "@/features/customer-qr/components/CartSummary";
import { MoneyText } from "@/features/customer-qr/components/MoneyText";
import { useOrder } from "@/features/customer-qr/store/orderStore";
import { useRestaurant } from "@/features/customer-qr/hooks/useRestaurant";
import { useT } from "@/features/customer-qr/i18n/useT";
import { tableUrl } from "@/features/customer-qr/constants";
import { remainingBalance } from "@/features/customer-qr/services";
import { formatDateTime } from "@/features/customer-qr/utils/format";

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tableId } = use(params);
  const t = useT();
  const order = useOrder(tableId, (s) => s.order);
  const payment = useOrder(tableId, (s) => s.payment);
  const payments = useOrder(tableId, (s) => s.payments);
  const { data: restaurant } = useRestaurant();

  const tipTotal = payments.reduce((s, p) => s + p.tipAmount, 0);
  const paidTotal = payments.reduce((s, p) => s + p.amount + p.tipAmount, 0);
  const remaining = order ? remainingBalance(order) : 0;

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  if (!order) {
    return (
      <MobileShell header={<BrandHeader title={t("receipt")} showBack />}>
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

  return (
    <MobileShell
      header={<BrandHeader title={t("receiptTitle")} subtitle={t("receiptSub")} showBack />}
      footer={
        <div className="p-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="rounded-2xl h-12"
            onClick={handlePrint}
          >
            <Download className="size-4" />
            {t("downloadReceipt")}
          </Button>
          <Link href={tableUrl(tableId, "feedback")} className="contents">
            <Button className="rounded-2xl h-12 w-full">
              <Star className="size-4" />
              {t("feedback")}
            </Button>
          </Link>
        </div>
      }
    >
      <div className="px-4 py-5 space-y-4">
        <section className="rounded-3xl bg-card border border-slate-200/70 dark:border-slate-800 p-5 cqr-shadow-card">
          <div className="flex flex-col items-center text-center space-y-1">
            {restaurant && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={restaurant.logoUrl}
                  alt={t.bi(restaurant.name)}
                  className="h-9 w-auto max-w-[60%] object-contain mb-1"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="text-base font-bold">{t.bi(restaurant.name)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t.bi(restaurant.tagline)}
                </div>
              </>
            )}
          </div>

          <div className="my-4 border-t border-dashed border-slate-300 dark:border-slate-700" />

          <dl className="grid grid-cols-2 gap-y-1 text-xs">
            <dt className="text-muted-foreground">{t("orderCode")}</dt>
            <dd className="text-end font-semibold">{order.shortCode}</dd>
            <dt className="text-muted-foreground">{t("table")}</dt>
            <dd className="text-end">{order.tableId}</dd>
            {payment && (
              <>
                <dt className="text-muted-foreground">{t("paidAt")}</dt>
                <dd className="text-end">
                  {formatDateTime(payment.createdAtIso, t.locale)}
                </dd>
                <dt className="text-muted-foreground">{t("paidWith")}</dt>
                <dd className="text-end capitalize">
                  {payment.method.replace("_", " ")}
                  {payment.reference && (
                    <span className="ms-1 text-muted-foreground">
                      · {payment.reference}
                    </span>
                  )}
                </dd>
              </>
            )}
          </dl>

          <div className="my-4 border-t border-dashed border-slate-300 dark:border-slate-700" />

          <ul className="space-y-2 text-sm">
            {order.items.map((line) => (
              <li key={line.lineId} className="flex justify-between gap-3">
                <span className="flex-1">
                  <span className="text-muted-foreground tabular-nums">
                    {line.quantity}×
                  </span>{" "}
                  {t.bi(line.name)}
                </span>
                <MoneyText
                  amount={line.unitPriceWithExtras * line.quantity}
                  className="text-sm"
                />
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-dashed border-slate-300 dark:border-slate-700" />

          <CartSummary totals={order.totals} hideTipIfZero />

          {payments.length > 0 && (
            <>
              <div className="my-4 border-t border-dashed border-slate-300 dark:border-slate-700" />
              <div className="space-y-2 text-sm">
                {tipTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <span>{t("tip")}</span>
                    <MoneyText amount={tipTotal} />
                  </div>
                )}
                <div className="flex items-center justify-between font-semibold">
                  <span>{t("youPaid")}</span>
                  <MoneyText amount={paidTotal} />
                </div>
                {remaining > 0.01 && (
                  <div className="flex items-center justify-between text-amber-600">
                    <span>{t("remainingBalance")}</span>
                    <MoneyText amount={remaining} />
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <div className="h-2" />
      </div>
    </MobileShell>
  );
}
