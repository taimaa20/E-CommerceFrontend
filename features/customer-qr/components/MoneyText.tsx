"use client";

import { useT } from "../i18n/useT";
import { formatMoney } from "../utils/format";
import { cn } from "@/lib/utils";

interface Props {
  amount: number;
  className?: string;
  /** Render currency symbol slightly muted. */
  muted?: boolean;
}

export function MoneyText({ amount, className, muted }: Props) {
  const t = useT();
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        muted && "text-muted-foreground",
        className,
      )}
    >
      {formatMoney(amount, t.locale)}
    </span>
  );
}
