"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { LanguageSwitcher } from "@/features/customer-qr/components/LanguageSwitcher";
import { EmptyState } from "@/features/customer-qr/components/EmptyState";
import { MoneyText } from "@/features/customer-qr/components/MoneyText";
import { useOrder } from "@/features/customer-qr/store/orderStore";
import { useT } from "@/features/customer-qr/i18n/useT";
import { tableUrl } from "@/features/customer-qr/constants";
import { remainingBalance } from "@/features/customer-qr/services";
import { formatDateTime } from "@/features/customer-qr/utils/format";

/** Confetti particles fanned out evenly around the check (CSS-driven burst). */
const CONFETTI = ["#e11d2e", "#cc9c34", "#2e7d32", "#1565c0", "#e11d2e", "#cc9c34"].map(
  (color, i, arr) => {
    const angle = (i / arr.length) * Math.PI * 2;
    return {
      color,
      cx: `${Math.cos(angle) * 70}px`,
      cy: `${Math.sin(angle) * 70}px`,
    };
  },
);

export default function SuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tableId } = use(params);
  const router = useRouter();
  const t = useT();
  const order = useOrder(tableId, (s) => s.order);
  const payment = useOrder(tableId, (s) => s.payment);

  if (!order || !payment) {
    return (
      <MobileShell>
        <EmptyState
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

  const remaining = remainingBalance(order);
  const isPartial = order.paymentState !== "paid" && remaining > 0.01;

  return (
    <MobileShell
      footer={
        <div className="p-4 space-y-2">
          {isPartial && (
            <Button
              size="lg"
              className="rounded-2xl w-full h-14"
              onClick={() => router.push(tableUrl(tableId, "bill"))}
            >
              <span className="inline-flex items-center gap-2 font-semibold">
                {t("payRemaining")} · <MoneyText amount={remaining} />
              </span>
            </Button>
          )}
          <Button
            size="lg"
            variant={isPartial ? "outline" : "default"}
            className="rounded-2xl w-full h-14"
            onClick={() => router.push(tableUrl(tableId, "receipt"))}
          >
            {t("getReceipt")}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl h-12"
              onClick={() => router.push(tableUrl(tableId, "order"))}
            >
              {t("viewCurrentOrder")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl h-12"
              onClick={() => router.push(tableUrl(tableId, "feedback"))}
            >
              <Star className="size-4" />
              {t("feedback")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex items-center justify-end px-5 pt-3">
        <LanguageSwitcher />
      </div>

      {/* Big animated check + confetti burst */}
      <div className="px-5 pt-2 pb-6 flex flex-col items-center text-center">
        <div className="relative cqr-success-pop size-24 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="cqr-confetti"
              style={
                {
                  background: c.color,
                  animationDelay: `${i * 0.03}s`,
                  "--cqr-cx": c.cx,
                  "--cqr-cy": c.cy,
                } as React.CSSProperties
              }
            />
          ))}
          <svg viewBox="0 0 52 52" className="relative size-12 text-emerald-500" fill="none">
            <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path
              d="M14 27l8 8 16-18"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="cqr-check-path"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold">{t("paymentSuccess")}</h1>
      </div>

      {/* Receipt summary card */}
      <div className="px-5">
        <section className="rounded-2xl bg-card border border-border/70 p-5 space-y-3 cqr-shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {t("tableLabel")} {tableId.replace(/^T/, "")}
            </span>
            {isPartial ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 px-2.5 py-0.5 text-[11px] font-semibold">
                <span className="size-1.5 rounded-full bg-amber-500" />
                {t("partiallyPaid")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {t("fullyPaid")}
              </span>
            )}
          </div>

          <div className="border-t border-dashed border-border/80" />

          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{t("youPaid")}</span>
            <MoneyText amount={payment.amount} className="text-lg font-bold" />
          </div>
          {isPartial && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                {t("remainingBalance")}
              </span>
              <MoneyText amount={remaining} className="font-semibold" />
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">
            {t("paidOn")} {formatDateTime(payment.createdAtIso, t.locale)}
          </div>
          {payment.reference && (
            <div className="text-[11px] text-muted-foreground capitalize">
              {t("paidWith")} {payment.method.replace("_", " ")} · {payment.reference}
            </div>
          )}
        </section>
      </div>

      <div className="h-4" />
    </MobileShell>
  );
}
