"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Minus,
  Pencil,
  Plus,
  Receipt as ReceiptIcon,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { BrandHeader } from "@/features/customer-qr/components/BrandHeader";
import { EmptyState } from "@/features/customer-qr/components/EmptyState";
import { MoneyText } from "@/features/customer-qr/components/MoneyText";
import { SplitModeSelector } from "@/features/customer-qr/components/SplitModeSelector";
import { TipSelector } from "@/features/customer-qr/components/TipSelector";
import { useCart } from "@/features/customer-qr/store/cartStore";
import { useOrder } from "@/features/customer-qr/store/orderStore";
import { useTable } from "@/features/customer-qr/hooks/useTable";
import { useT } from "@/features/customer-qr/i18n/useT";
import { tableUrl } from "@/features/customer-qr/constants";
import {
  computeTotals,
  computeTip,
  computePayable,
  remainingBalance,
  lineShareOf,
} from "@/features/customer-qr/services";
import type { BillingBasis } from "@/features/customer-qr/services";

const NO_TIP = { kind: "none", value: 0 } as const;

export default function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tableId } = use(params);
  const router = useRouter();
  const t = useT();

  const { data: table } = useTable(tableId);

  const order = useOrder(tableId, (s) => s.order);
  const draftItems = useCart(tableId, (s) => s.items);
  const tip = useCart(tableId, (s) => s.tip);
  const bill = useCart(tableId, (s) => s.bill);
  const setTip = useCart(tableId, (s) => s.setTip);
  const setBill = useCart(tableId, (s) => s.setBill);

  const Arrow = t.isRtl ? ArrowLeft : ArrowRight;

  const draftTotals = useMemo(
    () => computeTotals(draftItems, NO_TIP),
    [draftItems],
  );

  // Bill against the placed order when there is one; otherwise the draft cart.
  const basis: BillingBasis = useMemo(
    () =>
      order ?? {
        items: draftItems,
        totals: draftTotals,
        amountPaid: 0,
        paidItemLineIds: [],
      },
    [order, draftItems, draftTotals],
  );

  const remaining = remainingBalance(basis);
  // Once nothing is owed, the bill is a settled summary — not a payment form.
  const settled = remaining <= 0.01;
  const fairShare = basis.totals.grandTotal / Math.max(1, bill.splitParts);
  const unpaidLines = basis.items.filter(
    (l) => !basis.paidItemLineIds.includes(l.lineId),
  );

  const [amountStr, setAmountStr] = useState<string>(
    bill.splitAmount > 0 ? bill.splitAmount.toFixed(2) : fairShare.toFixed(2),
  );

  const payable = computePayable(basis, bill);
  const tipAmount = computeTip(payable, tip);
  const youPay = payable + tipAmount;

  if (basis.items.length === 0) {
    return (
      <MobileShell header={<BrandHeader title={t("bill")} showBack />}>
        <EmptyState
          icon={<ShoppingBag className="size-7" />}
          title={t("emptyCart")}
          description={t("emptyCartHint")}
          action={
            <Link href={tableUrl(tableId, "menu")}>
              <Button className="rounded-full">{t("browseMenu")}</Button>
            </Link>
          }
        />
      </MobileShell>
    );
  }

  const onSelectMode = (sel: { mode: "full" | "split"; method: "equal" | "amount" | "items" }) => {
    const next = { ...bill, mode: sel.mode, splitMethod: sel.method };
    if (sel.mode === "split" && sel.method === "amount" && bill.splitAmount <= 0) {
      next.splitAmount = Number(fairShare.toFixed(2));
      setAmountStr(fairShare.toFixed(2));
    }
    setBill(next);
  };

  const setParts = (n: number) => {
    const parts = Math.min(12, Math.max(1, n));
    setBill({ ...bill, splitParts: parts });
  };

  const toggleLine = (lineId: string) => {
    const selected = bill.selectedLineIds.includes(lineId)
      ? bill.selectedLineIds.filter((id) => id !== lineId)
      : [...bill.selectedLineIds, lineId];
    setBill({ ...bill, selectedLineIds: selected });
  };

  return (
    <MobileShell
      header={
        <BrandHeader
          title={table ? `${t("tableLabel")} ${table.code}` : t("bill")}
          subtitle={t("howToPay")}
          showBack
        />
      }
      footer={
        settled ? (
          <div className="p-4">
            <Button
              size="lg"
              onClick={() => router.push(tableUrl(tableId, "receipt"))}
              className="rounded-2xl w-full h-14 justify-center gap-2"
            >
              <ReceiptIcon className="size-4" />
              {t("viewReceipt")}
            </Button>
          </div>
        ) : (
          <div className="p-4">
            <Button
              size="lg"
              disabled={youPay <= 0}
              onClick={() => router.push(tableUrl(tableId, "payment"))}
              className="rounded-2xl w-full h-14 bg-foreground text-background hover:bg-foreground/90 justify-between"
            >
              <span className="font-semibold inline-flex items-center gap-2">
                {t("continueToPayment")}
                <Arrow className="size-4" />
              </span>
              <MoneyText amount={youPay} className="font-semibold" />
            </Button>
          </div>
        )
      }
    >
      <div className="px-4 py-4 space-y-4">
        {/* Settled: this is a paid summary, not a payment form. */}
        {settled && (
          <section className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shrink-0">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {t("fullyPaid")}
              </div>
              <div className="text-xs text-muted-foreground">{t("paymentSuccess")}</div>
            </div>
          </section>
        )}

        {!settled && (
          <SplitModeSelector
            value={{ mode: bill.mode, method: bill.splitMethod }}
            onChange={onSelectMode}
          />
        )}

        {/* Method-specific control */}
        {!settled && bill.mode === "split" && bill.splitMethod === "equal" && (
          <section className="rounded-2xl bg-card border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("numberOfPeople")}</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={t("decrement")}
                  onClick={() => setParts(bill.splitParts - 1)}
                  className="size-9 rounded-full border border-border inline-flex items-center justify-center hover:bg-accent/40"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-6 text-center text-base font-bold tabular-nums">
                  {bill.splitParts}
                </span>
                <button
                  type="button"
                  aria-label={t("increment")}
                  onClick={() => setParts(bill.splitParts + 1)}
                  className="size-9 rounded-full border border-border inline-flex items-center justify-center hover:bg-accent/40"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              ≈ {fairShare.toFixed(2)} {t("perPerson")}
            </p>
          </section>
        )}

        {!settled && bill.mode === "split" && bill.splitMethod === "items" && (
          <section className="rounded-2xl bg-card border border-border/70 divide-y divide-border/60">
            <p className="px-4 py-2.5 text-[11px] text-muted-foreground">
              {t("selectItemsToPay")}
            </p>
            {unpaidLines.map((line) => {
              const checked = bill.selectedLineIds.includes(line.lineId);
              return (
                <button
                  key={line.lineId}
                  type="button"
                  onClick={() => toggleLine(line.lineId)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-start"
                >
                  <span
                    className={cn(
                      "size-5 rounded-md border inline-flex items-center justify-center shrink-0 transition",
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums w-6 shrink-0">
                    {line.quantity}×
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">
                    {t.bi(line.name)}
                  </span>
                  <MoneyText amount={lineShareOf(basis, line)} className="text-sm" />
                </button>
              );
            })}
          </section>
        )}

        {/* Plain line list for full / equal / amount / settled (items mode shows the checklist instead) */}
        {(settled || !(bill.mode === "split" && bill.splitMethod === "items")) && (
          <section className="rounded-2xl bg-card border border-border/70 divide-y divide-border/60">
            {basis.items.map((line) => (
              <div key={line.lineId} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-semibold text-muted-foreground tabular-nums w-6 shrink-0">
                  {line.quantity}×
                </span>
                <span className="flex-1 text-sm font-medium truncate">
                  {t.bi(line.name)}
                </span>
                <MoneyText
                  amount={line.unitPriceWithExtras * line.quantity}
                  className="text-sm"
                />
              </div>
            ))}
          </section>
        )}

        {/* Bill totals */}
        <section className="rounded-2xl bg-card border border-border/70 p-4 space-y-2.5 text-sm">
          <Row label={t("subtotal")} value={<MoneyText amount={basis.totals.subtotal} />} />
          <Row
            label={t("serviceFee")}
            value={<MoneyText amount={basis.totals.serviceAmount} muted />}
            muted
          />
          {basis.totals.taxAmount > 0 && (
            <Row
              label={t("tax")}
              value={<MoneyText amount={basis.totals.taxAmount} muted />}
              muted
            />
          )}
          <Row
            label={<span className="font-semibold">{t("totalBill")}</span>}
            value={<MoneyText amount={basis.totals.grandTotal} className="font-semibold" />}
          />
          {basis.amountPaid > 0 && (
            <>
              <Row
                label={t("amountPaid")}
                value={<MoneyText amount={basis.amountPaid} muted />}
                muted
              />
              <Row
                label={<span className="font-semibold">{t("remaining")}</span>}
                value={<MoneyText amount={remaining} className="font-semibold" />}
              />
            </>
          )}
        </section>

        {/* By amount input */}
        {!settled && bill.mode === "split" && bill.splitMethod === "amount" && (
          <section className="rounded-2xl bg-card border border-border/70 p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="text-sm font-semibold">{t("payableAmount")}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {t("remaining")}: {remaining.toFixed(2)}
                </p>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^\d.]/g, "");
                    setAmountStr(cleaned);
                    setBill({ ...bill, splitAmount: Number(cleaned) || 0 });
                  }}
                  className="h-10 w-28 rounded-xl text-end font-semibold tabular-nums"
                />
                <Pencil className="absolute top-1/2 -translate-y-1/2 start-2 size-3.5 text-muted-foreground" />
              </div>
            </div>
          </section>
        )}

        {/* Tip — applies to the amount this diner is paying */}
        {!settled && (
          <section className="rounded-2xl bg-card border border-border/70 p-4">
            <TipSelector value={tip} onChange={setTip} subtotal={payable} />
          </section>
        )}

        {/* You pay */}
        {!settled && (
          <section className="rounded-2xl bg-foreground text-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{t("youPay")}</h3>
                <p className="text-[11px] opacity-75">{t("inclusiveOfTaxes")}</p>
              </div>
              <MoneyText amount={youPay} className="text-lg font-bold" />
            </div>
            {tipAmount > 0 && (
              <p className="mt-1 text-[11px] opacity-75">
                {t("tip")}: {tipAmount.toFixed(2)}
              </p>
            )}
          </section>
        )}

        <div className="h-2" />
      </div>
    </MobileShell>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between " +
        (muted ? "text-muted-foreground" : "")
      }
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
