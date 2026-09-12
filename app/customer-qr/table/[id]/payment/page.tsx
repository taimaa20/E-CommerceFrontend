"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { BrandHeader } from "@/features/customer-qr/components/BrandHeader";
import { LoadingState } from "@/features/customer-qr/components/LoadingState";
import { PaymentMethodCard } from "@/features/customer-qr/components/PaymentMethodCard";
import { PaymentIcon } from "@/features/customer-qr/components/PaymentIcon";
import { MoneyText } from "@/features/customer-qr/components/MoneyText";
import { useCart } from "@/features/customer-qr/store/cartStore";
import { useOrder } from "@/features/customer-qr/store/orderStore";
import { useAsyncResource } from "@/features/customer-qr/hooks/useAsyncResource";
import { useT } from "@/features/customer-qr/i18n/useT";
import { tableUrl } from "@/features/customer-qr/constants";
import {
  computeTotals,
  computeTip,
  computePayable,
  orderService,
  paymentService,
} from "@/features/customer-qr/services";
import type { BillingBasis } from "@/features/customer-qr/services";
import type { BillSplit, PaymentMethodId, TipState } from "@/features/customer-qr/types";

const NO_TIP: TipState = { kind: "none", value: 0 };
const DEFAULT_BILL: BillSplit = {
  mode: "full",
  splitMethod: "equal",
  splitAmount: 0,
  splitParts: 2,
  selectedLineIds: [],
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tableId } = use(params);
  const router = useRouter();
  const t = useT();

  const draftItems = useCart(tableId, (s) => s.items);
  const tip = useCart(tableId, (s) => s.tip);
  const bill = useCart(tableId, (s) => s.bill);
  const customerName = useCart(tableId, (s) => s.customerName);
  const notes = useCart(tableId, (s) => s.notes);
  const setTip = useCart(tableId, (s) => s.setTip);
  const setBill = useCart(tableId, (s) => s.setBill);
  const clear = useCart(tableId, (s) => s.clear);

  const order = useOrder(tableId, (s) => s.order);
  const setOrder = useOrder(tableId, (s) => s.setOrder);
  const addPayment = useOrder(tableId, (s) => s.addPayment);

  const { data: methods, loading: methodsLoading } = useAsyncResource(
    () => paymentService.listMethods(),
    [],
  );

  const draftTotals = useMemo(
    () => computeTotals(draftItems, NO_TIP),
    [draftItems],
  );
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

  const payable = computePayable(basis, bill);
  const tipAmount = computeTip(payable, tip);
  const youPay = payable + tipAmount;

  const isItems = bill.mode === "split" && bill.splitMethod === "items";
  const paidLineIds = isItems
    ? bill.selectedLineIds.filter(
        (id) =>
          basis.items.some((l) => l.lineId === id) &&
          !basis.paidItemLineIds.includes(id),
      )
    : undefined;

  const [selected, setSelected] = useState<PaymentMethodId | null>("apple_pay");
  const [processing, setProcessing] = useState(false);

  const orderedMethods = (methods ?? []).filter(
    (m) =>
      m.id === "apple_pay" ||
      m.id === "visa" ||
      m.id === "mastercard",
  );

  const handlePay = async () => {
    if (!selected || processing) return;
    if (basis.items.length === 0) {
      toast.error(t("emptyCart"));
      return;
    }
    setProcessing(true);
    try {
      // pay_first (no placed order yet): create it now, then settle.
      const createdNow = !order;
      const activeOrder = order
        ? order
        : await orderService.create({
            tableId,
            items: draftItems,
            customerName: customerName || undefined,
            notes: notes || undefined,
          });
      if (createdNow) setOrder(activeOrder);

      const tx = await paymentService.charge(activeOrder, selected);
      const ratio =
        activeOrder.totals.grandTotal > 0
          ? payable / activeOrder.totals.grandTotal
          : 1;
      addPayment({
        ...tx,
        amount: payable,
        tipAmount,
        taxAmount: round2(activeOrder.totals.taxAmount * ratio),
        serviceAmount: round2(activeOrder.totals.serviceAmount * ratio),
        paidItemLineIds: paidLineIds,
      });

      // Reset the split/tip selection so any "pay remaining" starts clean.
      // When we just created the order, the draft items now belong to it.
      if (createdNow) {
        clear();
      } else {
        setBill({ ...DEFAULT_BILL });
        setTip({ ...NO_TIP });
      }

      toast.success(t("paymentSucceeded"));
      router.replace(tableUrl(tableId, "success"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paymentFailed"));
    } finally {
      setProcessing(false);
    }
  };

  const isApplePay = selected === "apple_pay";

  return (
    <MobileShell
      header={<BrandHeader title={t("paymentLabel")} showBack />}
      footer={
        <div className="p-4 space-y-2">
          <Button
            size="lg"
            disabled={!selected || processing || basis.items.length === 0}
            onClick={handlePay}
            className={
              "w-full rounded-2xl h-14 justify-center gap-2 " +
              (isApplePay
                ? "bg-black text-white hover:bg-black/90"
                : "bg-foreground text-background hover:bg-foreground/90")
            }
          >
            {processing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {t("processingPayment")}
              </span>
            ) : isApplePay ? (
              <span className="inline-flex items-center gap-2 font-semibold">
                {t("checkoutWith")} <PaymentIcon id="apple_pay" />
              </span>
            ) : (
              <span className="font-semibold inline-flex items-center gap-2">
                {t("payNow")} · <MoneyText amount={youPay} />
              </span>
            )}
          </Button>
          <p className="inline-flex w-full items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="size-3" /> {t("secureCheckout")}
          </p>
        </div>
      }
    >
      <div className="px-4 py-4 space-y-4">
        {/* You pay */}
        <section className="rounded-2xl bg-card border border-border/70 p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="text-sm font-semibold">{t("youPay")}</h3>
              <p className="text-[11px] text-muted-foreground">
                {t("inclusiveOfTaxes")}
              </p>
            </div>
            <MoneyText amount={youPay} className="text-lg font-bold" />
          </div>
          {tipAmount > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("tip")}: {tipAmount.toFixed(2)}
            </p>
          )}
        </section>

        {/* Payment method */}
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">{t("selectPayment")}</h4>
          {methodsLoading || !methods ? (
            <LoadingState />
          ) : (
            <div className="space-y-2">
              {orderedMethods.map((m) => (
                <PaymentMethodCard
                  key={m.id}
                  method={m}
                  selected={selected === m.id}
                  onSelect={() => setSelected(m.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Trust indicators */}
        <div className="flex flex-col items-center gap-2.5 pt-1">
          <div className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-600" />
            {t.bi({
              en: "Encrypted & securely processed",
              ar: "مشفّر ويُعالج بأمان",
            })}
          </div>
          <div className="flex items-center gap-1.5 opacity-90">
            {(["visa", "mastercard", "apple_pay"] as const).map((id) => (
              <span
                key={id}
                className="inline-flex h-6 items-center rounded-md border border-border bg-card px-1.5"
              >
                <PaymentIcon id={id} />
              </span>
            ))}
          </div>
        </div>

        <div className="h-2" />
      </div>
    </MobileShell>
  );
}
