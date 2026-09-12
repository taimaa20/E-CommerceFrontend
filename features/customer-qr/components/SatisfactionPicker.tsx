"use client";

import { Frown, Meh, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "../i18n/useT";

type Sat = "bad" | "ok" | "great";

interface Props {
  value: Sat | null;
  onChange: (s: Sat) => void;
}

export function SatisfactionPicker({ value, onChange }: Props) {
  const t = useT();
  const opts: { id: Sat; Icon: typeof Smile; cls: string; label: string }[] = [
    { id: "bad", Icon: Frown, cls: "text-rose-500", label: t("bad") },
    { id: "ok", Icon: Meh, cls: "text-amber-500", label: t("ok") },
    { id: "great", Icon: Smile, cls: "text-emerald-500", label: t("great") },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map(({ id, Icon, cls, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border py-3 transition",
              active
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-slate-200/70 dark:border-slate-800 hover:bg-accent/40",
            )}
          >
            <Icon className={cn("size-7", cls)} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
