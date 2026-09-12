"use client";

import { CheckCircle2, ChefHat } from "lucide-react";
import { ORDER_STEP_LABELS } from "../constants";
import { minutesUntil } from "../utils/format";
import { useT } from "../i18n/useT";
import type { CustomerOrder } from "../types";

/** Compact live-status header shown on the order hub once an order is placed. */
export function OrderStatusBanner({ order }: { order: CustomerOrder }) {
  const t = useT();
  const label = ORDER_STEP_LABELS[order.status as keyof typeof ORDER_STEP_LABELS];
  const done = order.status === "served" || order.status === "completed";
  const eta = minutesUntil(order.estimatedReadyIso);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 flex items-center gap-3 cqr-shadow-card">
      <span
        className={
          "size-11 rounded-2xl inline-flex items-center justify-center shrink-0 " +
          (done
            ? "bg-emerald-500/15 text-emerald-600"
            : "bg-primary/10 text-primary")
        }
      >
        {done ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <ChefHat className="size-5" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {t("liveStatus")} · {order.shortCode}
        </div>
        <div className="text-sm font-semibold inline-flex items-center gap-2">
          {!done && (
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          )}
          {label ? t.bi(label) : t("orderInKitchen")}
        </div>
      </div>
      {!done && (
        <div className="text-end shrink-0">
          <div className="text-[11px] text-muted-foreground">
            {t("estimatedReady")}
          </div>
          <div className="text-sm font-semibold tabular-nums">
            ≈ {eta} {t("minutes")}
          </div>
        </div>
      )}
    </div>
  );
}
