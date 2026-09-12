"use client";

import { cn } from "@/lib/utils";
import { useT } from "../i18n/useT";
import type { BillSplitMethod, BillSplitMode } from "../types";

export interface SplitSelection {
  mode: BillSplitMode;
  method: BillSplitMethod;
}

interface Props {
  value: SplitSelection;
  onChange: (next: SplitSelection) => void;
}

const OPTIONS: { key: string; selection: SplitSelection; labelKey: Parameters<ReturnType<typeof useT>>[0] }[] = [
  { key: "full", selection: { mode: "full", method: "equal" }, labelKey: "payFull" },
  { key: "equal", selection: { mode: "split", method: "equal" }, labelKey: "splitEqually" },
  { key: "amount", selection: { mode: "split", method: "amount" }, labelKey: "splitByAmount" },
  { key: "items", selection: { mode: "split", method: "items" }, labelKey: "splitByItems" },
];

function isActive(value: SplitSelection, sel: SplitSelection): boolean {
  if (sel.mode === "full") return value.mode === "full";
  return value.mode === "split" && value.method === sel.method;
}

/** 4-way segmented control: Full · Equally · By amount · By items. */
export function SplitModeSelector({ value, onChange }: Props) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-2xl bg-muted p-1">
      {OPTIONS.map((opt) => {
        const active = isActive(value, opt.selection);
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.selection)}
            className={cn(
              "rounded-xl py-2.5 px-2 text-xs sm:text-sm font-semibold transition text-center",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
