"use client";

import { cn } from "@/lib/utils";
import type { MenuCategory } from "../types";
import { useT } from "../i18n/useT";

interface Props {
  categories: MenuCategory[];
  activeId: string | null;
  onChange: (id: string) => void;
  counts?: Record<string, number>;
  totalCount?: number;
  showAll?: boolean;
}

export function CategoryNav({ categories, activeId, onChange, counts = {}, totalCount = 0, showAll = true }: Props) {
  const t = useT();
  return (
    <div className="-mx-4 overflow-x-auto border-t border-border/60 bg-muted/30 px-4 no-scrollbar">
      <div className={cn("flex gap-2 py-3", t.isRtl ? "flex-row-reverse" : "flex-row")}>
        {showAll && (
          <Chip active={activeId === null} count={totalCount} onClick={() => onChange("")}>
            <span>{t("all")}</span>
          </Chip>
        )}
        {categories.map((c) => (
          <Chip
            key={c.id}
            active={c.id === activeId}
            count={counts[c.id] ?? 0}
            onClick={() => onChange(c.id)}
          >
            <span>{t.bi(c.name)}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-semibold shadow-sm transition",
        active
          ? "border-red-500 bg-red-600 text-white shadow-red-600/15"
          : "border-slate-200 bg-card text-slate-700 hover:border-red-200 hover:bg-red-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-red-950/20",
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-bold",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
        )}
      >
        {count}
      </span>
      {children}
    </button>
  );
}
