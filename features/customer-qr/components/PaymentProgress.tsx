"use client";

import { MoneyText } from "./MoneyText";
import { useT } from "../i18n/useT";

interface Props {
  total: number;
  paid: number;
}

/** Paid-vs-remaining bar shown on the order hub for split / partial bills. */
export function PaymentProgress({ total, paid }: Props) {
  const t = useT();
  const remaining = Math.max(0, total - paid);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const fullyPaid = remaining < 0.01 && paid > 0;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {fullyPaid ? t("fullyPaid") : t("remainingBalance")}
        </span>
        <MoneyText
          amount={fullyPaid ? paid : remaining}
          className="font-bold"
        />
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {t("amountPaid")}: <MoneyText amount={paid} muted />
        </span>
        <span>
          {t("total")}: <MoneyText amount={total} muted />
        </span>
      </div>
    </div>
  );
}
