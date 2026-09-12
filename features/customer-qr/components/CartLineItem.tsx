"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyText } from "./MoneyText";
import { useT } from "../i18n/useT";
import type { CartItem } from "../types";

interface Props {
  line: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export function CartLineItem({ line, onIncrement, onDecrement, onRemove }: Props) {
  const t = useT();
  return (
    <div className="flex gap-3 py-3 border-b border-slate-200/70 dark:border-slate-800 last:border-b-0">
      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={line.imageUrl}
          alt={t.bi(line.name)}
          className="absolute inset-0 size-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight line-clamp-2">
            {t.bi(line.name)}
          </h4>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            aria-label={t("remove")}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        {line.notes && (
          <p className="text-[11px] text-muted-foreground italic line-clamp-2">
            “{line.notes}”
          </p>
        )}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 p-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDecrement}
              aria-label={t("decrement")}
              className="rounded-full size-7"
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="w-6 text-center text-xs font-semibold tabular-nums">
              {line.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onIncrement}
              aria-label={t("increment")}
              className="rounded-full size-7"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <MoneyText
            amount={line.unitPriceWithExtras * line.quantity}
            className="text-sm font-semibold"
          />
        </div>
      </div>
    </div>
  );
}
