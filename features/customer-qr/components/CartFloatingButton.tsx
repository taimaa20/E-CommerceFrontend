"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { tableUrl } from "../constants";
import { MoneyText } from "./MoneyText";
import { useT } from "../i18n/useT";

interface Props {
  tableId: string;
  quantity: number;
  total: number;
}

export function CartFloatingButton({ tableId, quantity, total }: Props) {
  const t = useT();
  if (quantity <= 0) return null;
  return (
    <Link
      href={tableUrl(tableId, "order")}
      className="mx-4 my-3 flex items-center justify-between gap-3 rounded-2xl bg-primary text-primary-foreground py-3.5 px-5 shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
    >
      <span className="inline-flex items-center gap-2 text-sm font-semibold">
        <Receipt className="size-4" />
        {t("viewOrder")} <span className="opacity-90">({quantity})</span>
      </span>
      <MoneyText amount={total} className="font-semibold" />
    </Link>
  );
}
