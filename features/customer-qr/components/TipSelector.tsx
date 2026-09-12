"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { TIP_PRESETS, TIP_MAX_CUSTOM_AMOUNT } from "../constants";
import { useT } from "../i18n/useT";
import type { TipState } from "../types";

interface Props {
  value: TipState;
  onChange: (next: TipState) => void;
  /** Used to compute the live tip amount shown in the preset chips. */
  subtotal: number;
}

export function TipSelector({ value, onChange, subtotal }: Props) {
  const t = useT();
  const [customOpen, setCustomOpen] = useState(value.kind === "amount");
  const [customStr, setCustomStr] = useState(
    value.kind === "amount" ? String(value.value) : "",
  );

  const handlePreset = (percent: number) => {
    setCustomOpen(false);
    setCustomStr("");
    if (percent === 0) {
      onChange({ kind: "none", value: 0 });
    } else {
      onChange({ kind: "percent", value: percent });
    }
  };

  const handleCustomChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    setCustomStr(cleaned);
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return;
    const capped = Math.min(TIP_MAX_CUSTOM_AMOUNT, Math.max(0, num));
    onChange(capped > 0 ? { kind: "amount", value: capped } : { kind: "none", value: 0 });
  };

  const isPresetActive = (p: number): boolean => {
    if (p === 0) return value.kind === "none";
    return value.kind === "percent" && value.value === p && !customOpen;
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300">
          <Heart className="size-4" />
        </span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{t("tipQuestion")}</h4>
          <p className="text-[11px] text-muted-foreground">{t("tipHint")}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {TIP_PRESETS.map((p) => {
          const active = isPresetActive(p.percent);
          const amount = subtotal * p.percent / 100;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePreset(p.percent)}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border py-2.5 px-2 text-xs font-semibold transition",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-slate-200/70 dark:border-slate-800 bg-card hover:bg-accent/40",
                p.highlight && !active && "ring-1 ring-primary/40",
              )}
            >
              <span className="text-sm">{t.bi(p.label)}</span>
              {p.percent > 0 && (
                <span className={cn("text-[10px] font-normal opacity-80")}>
                  ≈ {amount.toFixed(2)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setCustomOpen((v) => !v)}
        className={cn(
          "w-full text-start text-xs font-medium rounded-xl border px-3 py-2 transition",
          customOpen
            ? "border-primary bg-primary/5 text-primary"
            : "border-dashed border-slate-300 dark:border-slate-700 text-muted-foreground hover:bg-accent/40",
        )}
      >
        {t("customTip")}
      </button>

      {customOpen && (
        <Input
          type="text"
          inputMode="decimal"
          value={customStr}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder={t("customTipPlaceholder")}
          className="rounded-xl"
        />
      )}
    </section>
  );
}
