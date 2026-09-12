"use client";

import { MoneyText } from "./MoneyText";
import { useT } from "../i18n/useT";
import type { OrderTotals } from "../types";

interface Props {
  totals: OrderTotals;
  /** Hide tip line until it has a value. */
  hideTipIfZero?: boolean;
}

export function CartSummary({ totals, hideTipIfZero }: Props) {
  const t = useT();
  return (
    <div className="space-y-2 text-sm">
      <Row label={t("subtotal")} value={<MoneyText amount={totals.subtotal} />} />
      <Row label={t("tax")} value={<MoneyText amount={totals.taxAmount} muted />} muted />
      <Row label={t("service")} value={<MoneyText amount={totals.serviceAmount} muted />} muted />
      {!(hideTipIfZero && totals.tipAmount === 0) && (
        <Row label={t("tip")} value={<MoneyText amount={totals.tipAmount} />} />
      )}
      {totals.discountAmount > 0 && (
        <Row
          label={t("discount")}
          value={
            <span className="text-emerald-600 dark:text-emerald-400">
              − <MoneyText amount={totals.discountAmount} />
            </span>
          }
        />
      )}
      <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />
      <Row
        label={<span className="font-semibold text-base">{t("total")}</span>}
        value={<MoneyText amount={totals.grandTotal} className="text-base font-bold" />}
      />
    </div>
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
    <div className={"flex items-center justify-between " + (muted ? "text-muted-foreground" : "")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
