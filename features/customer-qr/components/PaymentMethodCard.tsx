"use client";

import { cn } from "@/lib/utils";
import { useT } from "../i18n/useT";
import type { PaymentMethod } from "../types";
import { PaymentIcon } from "./PaymentIcon";

interface Props {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
}

export function PaymentMethodCard({ method, selected, onSelect }: Props) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!method.enabled}
      className={cn(
        "w-full flex items-center gap-3 rounded-2xl border p-3.5 text-start transition",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/70 bg-card hover:bg-accent/40",
        !method.enabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <PaymentIcon id={method.id} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold leading-tight">{t.bi(method.label)}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {t.bi(method.description)}
        </div>
      </div>
      <span
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full border-2 transition",
          selected ? "border-primary" : "border-border",
        )}
      >
        {selected && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
    </button>
  );
}
