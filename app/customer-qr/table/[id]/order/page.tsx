"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  Receipt as ReceiptIcon,
  Send,
  ShoppingBag,
  Star,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { BrandHeader } from "@/features/customer-qr/components/BrandHeader";
import { EmptyState } from "@/features/customer-qr/components/EmptyState";
import { CartLineItem } from "@/features/customer-qr/components/CartLineItem";
import { MoneyText } from "@/features/customer-qr/components/MoneyText";
import { PaymentProgress } from "@/features/customer-qr/components/PaymentProgress";
import { useCart } from "@/features/customer-qr/store/cartStore";
import { useOrder } from "@/features/customer-qr/store/orderStore";
import { useTable } from "@/features/customer-qr/hooks/useTable";
import { useRestaurant } from "@/features/customer-qr/hooks/useRestaurant";
import { useT } from "@/features/customer-qr/i18n/useT";
import { tableUrl } from "@/features/customer-qr/constants";
import {
  computeTotals,
  orderService,
  remainingBalance,
} from "@/features/customer-qr/services";

const NO_TIP = { kind: "none", value: 0 } as const;

export default function OrderHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tableId } = use(params);
  const t = useT();
  const router = useRouter();

  const { data: table } = useTable(tableId);
  const { data: restaurant } = useRestaurant();

  // Draft round (editable) lives in the cart store.
  const draftItems = useCart(tableId, (s) => s.items);
  const customerName = useCart(tableId, (s) => s.customerName);
  const notes = useCart(tableId, (s) => s.notes);
  const updateQty = useCart(tableId, (s) => s.updateQty);
  const remove = useCart(tableId, (s) => s.remove);
  const setCustomerName = useCart(tableId, (s) => s.setCustomerName);
  const setNotes = useCart(tableId, (s) => s.setNotes);
  const clearDraft = useCart(tableId, (s) => s.clear);

  // Placed order (sent to the kitchen) lives in the order store.
  const order = useOrder(tableId, (s) => s.order);
  const setOrder = useOrder(tableId, (s) => s.setOrder);
  const appendItems = useOrder(tableId, (s) => s.appendItems);

  const [placing, setPlacing] = useState(false);

  const orderMode = restaurant?.orderMode ?? "pay_later";
  const isPayLater = orderMode === "pay_later";
  const Arrow = t.isRtl ? ArrowLeft : ArrowRight;

  const hasOrder = !!order;
  const hasDraft = draftItems.length > 0;
  const fullyPaid = order?.paymentState === "paid";
  const remaining = order ? remainingBalance(order) : 0;

  const draftTotals = useMemo(
    () => computeTotals(draftItems, NO_TIP),
    [draftItems],
  );

  const handlePlace = async () => {
    if (placing || !hasDraft) return;
    setPlacing(true);
    try {
      if (order) {
        const mergedItems = [...order.items, ...draftItems];
        const totals = computeTotals(mergedItems, NO_TIP);
        appendItems(draftItems, totals);
      } else {
        const created = await orderService.create({
          tableId,
          items: draftItems,
          customerName: customerName || undefined,
          notes: notes || undefined,
        });
        setOrder(created);
      }
      clearDraft();
      toast.success(t("orderConfirmed"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paymentFailed"));
    } finally {
      setPlacing(false);
    }
  };

  /* Nothing placed and nothing in the draft → invite to the menu. */
  if (!hasOrder && !hasDraft) {
    return (
      <MobileShell header={<BrandHeader title={t("yourOrder")} showBack />}>
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

  return (
    <MobileShell
      header={
        <BrandHeader
          title={t("yourOrder")}
          subtitle={
            table
              ? `${t("tableLabel")} ${table.code} · ${t.bi(table.area)}`
              : undefined
          }
          showBack
        />
      }
      footer={<HubFooter />}
    >
      <div className="px-4 py-3 space-y-4">
        {/* ── Placed order ── */}
        {order && (
          <>
            {/* Order is created and sent to the kitchen. Live status tracking
                is intentionally hidden for now (see table layout). */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
              <span className="size-9 rounded-full bg-emerald-500/15 text-emerald-600 inline-flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {t("orderConfirmed")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("orderConfirmedSub")} · #{order.shortCode}
                </div>
              </div>
            </div>

            {!fullyPaid && (
              <PaymentProgress
                total={order.totals.grandTotal}
                paid={order.amountPaid}
              />
            )}

            <section className="rounded-2xl border border-border/70 bg-card divide-y divide-border/60">
              {order.items.map((line) => {
                const settled = order.paidItemLineIds.includes(line.lineId);
                return (
                  <div
                    key={line.lineId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums w-6 shrink-0">
                      {line.quantity}×
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">
                      {t.bi(line.name)}
                      {settled && (
                        <span className="ms-2 text-[10px] font-semibold text-emerald-600">
                          {t("paid")}
                        </span>
                      )}
                    </span>
                    <MoneyText
                      amount={line.unitPriceWithExtras * line.quantity}
                      className="text-sm"
                      muted={settled}
                    />
                  </div>
                );
              })}
            </section>
          </>
        )}

        {/* ── Draft round (editable) ── */}
        {hasDraft && (
          <>
            {hasOrder && (
              <div className="flex items-center gap-2 pt-1">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                <h4 className="text-sm font-semibold">{t("addToOrder")}</h4>
              </div>
            )}

            <section className="rounded-2xl border border-border/70 bg-card px-4">
              {draftItems.map((line) => (
                <CartLineItem
                  key={line.lineId}
                  line={line}
                  onIncrement={() => updateQty(line.lineId, line.quantity + 1)}
                  onDecrement={() => updateQty(line.lineId, line.quantity - 1)}
                  onRemove={() => remove(line.lineId)}
                />
              ))}
            </section>

            <Link href={tableUrl(tableId, "menu")} className="contents">
              <Button
                variant="outline"
                className="rounded-2xl w-full h-12 border-dashed font-semibold"
              >
                <Plus className="size-4" />
                {t("addMoreItems")}
                <Arrow className="size-4 ms-auto" />
              </Button>
            </Link>

            {/* Name + notes only matter before the first placement. */}
            {!hasOrder && (
              <>
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold">{t("yourName")}</h4>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t("yourNamePlaceholder")}
                    maxLength={40}
                    className="rounded-xl"
                  />
                </section>
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold">{t("specialNotes")}</h4>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("specialNotesPlaceholder")}
                    rows={2}
                    maxLength={200}
                    className="rounded-xl"
                  />
                </section>
              </>
            )}

            <section className="rounded-2xl border border-border/70 bg-card p-4 space-y-2 text-sm">
              <Row label={t("subtotal")} value={<MoneyText amount={draftTotals.subtotal} />} />
              <Row
                label={t("tax")}
                value={<MoneyText amount={draftTotals.taxAmount} muted />}
                muted
              />
              <Row
                label={t("service")}
                value={<MoneyText amount={draftTotals.serviceAmount} muted />}
                muted
              />
              <div className="h-px bg-border/60 my-1" />
              <Row
                label={<span className="font-semibold text-base">{t("total")}</span>}
                value={
                  <MoneyText
                    amount={draftTotals.grandTotal}
                    className="text-base font-bold"
                  />
                }
              />
            </section>
          </>
        )}

        <div className="h-2" />
      </div>
    </MobileShell>
  );

  /* Footer adapts to lifecycle + order mode. */
  function HubFooter() {
    // Draft present: placing comes first in pay_later; paying first otherwise.
    if (hasDraft) {
      if (isPayLater) {
        return (
          <div className="p-4">
            <Button
              size="lg"
              disabled={placing}
              onClick={handlePlace}
              className="rounded-2xl w-full h-14 font-semibold justify-between"
            >
              <span className="inline-flex items-center gap-2">
                <Send className="size-4" />
                {hasOrder ? t("addToOrder") : t("placeOrder")}
              </span>
              <MoneyText amount={draftTotals.grandTotal} />
            </Button>
          </div>
        );
      }
      // pay_first: pay now, order is created at payment success.
      return (
        <div className="p-4">
          <Button
            size="lg"
            className="rounded-2xl w-full h-14 font-semibold justify-between"
            onClick={() => router.push(tableUrl(tableId, "bill"))}
          >
            <span className="inline-flex items-center gap-2">
              <Wallet className="size-4" />
              {t("payNow")}
            </span>
            <MoneyText amount={draftTotals.grandTotal} />
          </Button>
        </div>
      );
    }

    // No draft. An order exists.
    if (fullyPaid) {
      return (
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
          >
            <Star className="size-4" /> {t("feedback")}
          </Button>
        </div>
      );
    }

    return (
      <div className="p-4">
        <Button
          size="lg"
          className="rounded-2xl w-full h-14 font-semibold justify-between"
          onClick={() => router.push(tableUrl(tableId, "bill"))}
        >
          <span className="inline-flex items-center gap-2">
            <Wallet className="size-4" />
            {order && order.paymentState === "partial"
              ? t("payRemaining")
              : t("payNow")}
          </span>
          <MoneyText amount={remaining} />
        </Button>
      </div>
    );
  }
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
