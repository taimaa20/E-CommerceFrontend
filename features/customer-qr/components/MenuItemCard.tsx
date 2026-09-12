"use client";

import {
  Plus,
  Minus,
  Sparkles,
  Flame,
  Leaf,
  WheatOff,
  ChevronRight,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "../i18n/useT";
import { MoneyText } from "./MoneyText";
import type { MenuItem } from "../types";

interface Props {
  item: MenuItem;
  /** Current quantity already in cart for this item (any extras combined). */
  inCart: number;
  onAdd: () => void;
  onQuickAdd?: () => void;
  onQuickRemove?: () => void;
  /** Browse-only menu: no add/qty controls, the row just opens item details. */
  readOnly?: boolean;
  /** Category emoji — shown over placeholder tiles as a friendly food cue. */
  emoji?: string;
}

const BADGE_STYLES: Record<
  string,
  { labelKey: "popular" | "new" | "spicy" | "vegan" | "glutenFree"; cls: string; Icon: typeof Sparkles }
> = {
  popular: { labelKey: "popular", cls: "cqr-badge-popular", Icon: Flame },
  new: { labelKey: "new", cls: "cqr-badge-new", Icon: Sparkles },
  spicy: { labelKey: "spicy", cls: "cqr-badge-spicy", Icon: Flame },
  vegan: { labelKey: "vegan", cls: "cqr-badge-veg", Icon: Leaf },
  "gluten-free": { labelKey: "glutenFree", cls: "cqr-badge-new", Icon: WheatOff },
};

/**
 * Reference-style row:
 *   [thumb] Name + price        [+]  (or  [-] N [+] when in cart)
 *
 * The whole row stays clickable to open the customizer; the qty controls
 * stop propagation so the diner can adjust without re-opening the dialog.
 */
export function MenuItemCard({
  item,
  inCart,
  onAdd,
  onQuickAdd,
  onQuickRemove,
  readOnly = false,
  emoji,
}: Props) {
  const t = useT();
  const isOut = item.availability === "out";
  // Placeholder art ships from /mock; a real photo (any other path) renders
  // on its own, and the emoji cue steps aside.
  const isPlaceholder = item.imageUrl.includes("/mock/");
  const badgeKey = item.badges?.[0];
  const badge = badgeKey ? BADGE_STYLES[badgeKey] : undefined;
  const description = t.bi(item.description);

  return (
    <button
      type="button"
      onClick={isOut ? undefined : onAdd}
      disabled={isOut}
      className={cn(
        "group relative w-full text-start rounded-3xl border border-border/60 bg-card cqr-shadow-card cqr-lift overflow-hidden",
        isOut && "opacity-60 cursor-not-allowed",
      )}
    >
      <div className="flex gap-3.5 p-3">
        {/* Thumb */}
        <div className="relative size-[88px] shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-black/[0.04]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={t.bi(item.name)}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {isPlaceholder && emoji && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[34px] drop-shadow-sm">
              {emoji}
            </span>
          )}
          {isOut && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-[10px] font-semibold text-white">
              {t("outOfStock")}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start gap-2">
            <h3 className="flex-1 font-semibold text-[15px] leading-snug line-clamp-1">
              {t.bi(item.name)}
            </h3>
            {badge &&
              (() => {
                const Icon = badge.Icon;
                return (
                  <span className={cn("cqr-badge shrink-0", badge.cls)}>
                    <Icon className="size-2.5" />
                    {t(badge.labelKey)}
                  </span>
                );
              })()}
          </div>

          {description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}

          <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <MoneyText amount={item.price} className="text-base font-extrabold" />
              {typeof item.rating === "number" && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {item.rating.toFixed(1)}
                  {typeof item.ratingCount === "number" && (
                    <span className="text-muted-foreground/70">({item.ratingCount})</span>
                  )}
                </span>
              )}
            </div>

            {readOnly ? (
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition group-hover:bg-accent group-hover:text-primary">
                <ChevronRight className="size-4 rtl:rotate-180" />
              </span>
            ) : (
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                {inCart > 0 ? (
                  <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={onQuickRemove}
                      className="size-8 rounded-full hover:bg-muted inline-flex items-center justify-center text-foreground"
                      aria-label={t("decrement")}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">
                      {inCart}
                    </span>
                    <button
                      type="button"
                      onClick={onQuickAdd ?? onAdd}
                      className="size-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center"
                      aria-label={t("increment")}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    role="presentation"
                    className={cn(
                      "inline-flex items-center justify-center size-9 rounded-full shadow-sm transition active:scale-95",
                      isOut
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground group-hover:scale-105",
                    )}
                  >
                    <Plus className="size-4" strokeWidth={2.5} />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
