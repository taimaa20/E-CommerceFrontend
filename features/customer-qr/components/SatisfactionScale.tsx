"use client";

import { cn } from "@/lib/utils";
import { useT } from "../i18n/useT";
import type { DictKey } from "../i18n/dictionaries";

interface Props {
  value: number; // 1..5 (kept so the page's rating→satisfaction mapping is untouched)
  onChange: (n: number) => void;
}

/**
 * Emoji satisfaction row. The emitted value stays on the 1..5 rating scale the
 * feedback page already expects (rating ≤2 → bad, 3 → ok, ≥4 → great), so the
 * submission logic is unchanged — only the control's look changes.
 */
const OPTIONS: { rating: number; emoji: string; labelKey: DictKey }[] = [
  { rating: 5, emoji: "😍", labelKey: "excellent" },
  { rating: 4, emoji: "😊", labelKey: "good" },
  { rating: 3, emoji: "😐", labelKey: "average" },
  { rating: 2, emoji: "☹️", labelKey: "poor" },
];

export function SatisfactionScale({ value, onChange }: Props) {
  const t = useT();
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {OPTIONS.map((o) => {
        const active = value === o.rating;
        return (
          <button
            key={o.rating}
            type="button"
            onClick={() => onChange(o.rating)}
            aria-pressed={active}
            aria-label={t(o.labelKey)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border py-3.5 px-1 transition",
              active
                ? "border-primary bg-primary/5 -translate-y-0.5 shadow-sm"
                : "border-border bg-card hover:bg-accent/40",
            )}
          >
            <span
              className={cn(
                "text-3xl leading-none transition",
                active ? "grayscale-0 opacity-100 scale-110" : "grayscale opacity-60",
              )}
            >
              {o.emoji}
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t(o.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
