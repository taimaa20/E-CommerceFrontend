"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "../i18n/useT";
import { formatTime } from "../utils/format";
import type { CustomerOrder, OrderStatus, OrderTrackingSnapshot } from "../types";

interface Props {
  snapshot: OrderTrackingSnapshot;
  /** The full order — used to pull the real status-history timestamps. */
  order: CustomerOrder;
}

/**
 * Production-style vertical timeline:
 *   ● Order received           03:35 PM
 *   ● Accepted by kitchen      03:36 PM
 *   ○ Preparing                  —
 *   ○ Ready                      —
 *   ○ Served                     —
 *
 * Timestamps come from the order's statusHistory when the step was
 * actually reached; future steps render with a placeholder.
 */
export function TrackingTimeline({ snapshot, order }: Props) {
  const t = useT();

  // Map status → ISO timestamp when it was first entered (audit trail).
  const reachedAt: Partial<Record<OrderStatus, string>> = {};
  for (const entry of order.statusHistory) {
    if (!reachedAt[entry.status]) reachedAt[entry.status] = entry.atIso;
  }

  return (
    <ol className="space-y-0">
      {snapshot.steps.map((step) => {
        const reached = step.complete || step.active;
        const ts = reachedAt[step.status];
        return (
          <li
            key={step.status}
            className="flex items-center gap-3 py-3 border-b border-border/60 last:border-b-0"
          >
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full border-2 transition",
                step.complete
                  ? "bg-primary border-primary text-primary-foreground"
                  : step.active
                    ? "border-primary"
                    : "border-border bg-background",
              )}
            >
              {step.complete ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : step.active ? (
                <span className="size-2 rounded-full bg-primary animate-pulse" />
              ) : null}
            </span>
            <span
              className={cn(
                "flex-1 text-sm",
                reached ? "font-semibold" : "text-muted-foreground",
              )}
            >
              {t.bi(step.label)}
            </span>
            <span
              className={cn(
                "text-xs tabular-nums",
                reached ? "text-foreground/80" : "text-muted-foreground/60",
              )}
            >
              {reached && ts ? formatTime(ts, t.locale) : "—"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
