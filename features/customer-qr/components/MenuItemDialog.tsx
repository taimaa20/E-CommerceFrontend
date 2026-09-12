"use client";

import { useState } from "react";
import { Clock, ClipboardList, Flame, Heart, Minus, Plus, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useT } from "../i18n/useT";
import { MoneyText } from "./MoneyText";
import type { CartExtraSelection, MenuItem } from "../types";

interface Props {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: {
    quantity: number;
    extras: CartExtraSelection[];
    extrasPriceDelta: number;
    notes?: string;
  }) => void;
  /** Browse-only menu: show details, hide ordering controls. */
  readOnly?: boolean;
  /** Called from the read-only footer to switch into the ordering menu. */
  onCreateOrder?: () => void;
  /** Same-category items for the "also ordered" carousel (optional). */
  related?: MenuItem[];
  /** Open another item from the related carousel. */
  onSelectRelated?: (item: MenuItem) => void;
  /** Category emoji — friendly cue over a placeholder hero. */
  emoji?: string;
}

const BADGE_META: Record<string, { labelKey: "popular" | "new" | "spicy" | "vegan" | "glutenFree"; cls: string }> = {
  popular: { labelKey: "popular", cls: "cqr-badge-popular" },
  new: { labelKey: "new", cls: "cqr-badge-new" },
  spicy: { labelKey: "spicy", cls: "cqr-badge-spicy" },
  vegan: { labelKey: "vegan", cls: "cqr-badge-veg" },
  "gluten-free": { labelKey: "glutenFree", cls: "cqr-badge-new" },
};

type Selection = Record<string /* groupId */, string[] /* optionIds */>;

function seedSelection(item: MenuItem | null): Selection {
  const seed: Selection = {};
  for (const g of item?.extras ?? []) {
    seed[g.id] = g.required && g.options[0] ? [g.options[0].id] : [];
  }
  return seed;
}

/**
 * State resets per item via the `key` prop the parent sets (remount), so the
 * three pieces below initialise lazily from `item` — no setState-in-effect.
 */
export function MenuItemDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
  readOnly = false,
  onCreateOrder,
  related,
  onSelectRelated,
  emoji,
}: Props) {
  const t = useT();
  const isPlaceholder = !!item && item.imageUrl.includes("/mock/");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [selection, setSelection] = useState<Selection>(() => seedSelection(item));

  if (!item) return null;

  const extrasPriceDelta = (item.extras ?? []).reduce((sum, g) => {
    const picked = selection[g.id] ?? [];
    return (
      sum +
      g.options
        .filter((o) => picked.includes(o.id))
        .reduce((s, o) => s + o.priceDelta, 0)
    );
  }, 0);

  const unitWithExtras = item.price + extrasPriceDelta;
  const lineTotal = unitWithExtras * qty;

  const allRequiredSatisfied = (item.extras ?? []).every((g) => {
    if (!g.required) return true;
    const picked = selection[g.id] ?? [];
    return picked.length >= g.min && picked.length <= g.max;
  });

  const toggle = (groupId: string, optId: string, multi: boolean, max: number) => {
    setSelection((cur) => {
      const have = cur[groupId] ?? [];
      if (!multi) return { ...cur, [groupId]: have[0] === optId ? have : [optId] };
      if (have.includes(optId))
        return { ...cur, [groupId]: have.filter((x) => x !== optId) };
      if (have.length >= max) return cur;
      return { ...cur, [groupId]: [...have, optId] };
    });
  };

  const handleConfirm = () => {
    if (!allRequiredSatisfied) return;
    const extras: CartExtraSelection[] = Object.entries(selection)
      .filter(([, ids]) => ids.length > 0)
      .map(([groupId, optionIds]) => ({ groupId, optionIds }));
    onConfirm({
      quantity: qty,
      extras,
      extrasPriceDelta,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Radix portals this outside the module wrapper, so re-assert the
          diner palette here or it falls back to the operator (orange) theme. */}
      <DialogContent
        data-feature="customer-qr"
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden flex flex-col max-w-[480px] max-h-[calc(100dvh-2rem)] sm:rounded-3xl"
      >
        <div className="relative h-40 w-full shrink-0 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={t.bi(item.name)}
            className="absolute inset-0 size-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {isPlaceholder && emoji && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl drop-shadow">
              {emoji}
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          <DialogClose
            className="absolute top-3 end-3 inline-flex items-center justify-center size-9 rounded-full bg-white/90 text-slate-800 shadow"
            aria-label={t("back")}
          >
            <X className="size-4" />
          </DialogClose>
          {!!item.badges?.length && (
            <div className="absolute bottom-3 start-4 flex flex-wrap gap-1.5">
              {item.badges.map((b) => {
                const meta = BADGE_META[b];
                if (!meta) return null;
                return (
                  <span key={b} className={cn("cqr-badge", meta.cls)}>
                    {t(meta.labelKey)}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 pt-4 pb-2">
          <DialogHeader className="space-y-1 text-start">
            <DialogTitle className="text-lg">{t.bi(item.name)}</DialogTitle>
            <DialogDescription className="text-sm">
              {t.bi(item.description)}
            </DialogDescription>
          </DialogHeader>

          {/* Meta chips */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MetaChip
              icon={<Clock className="size-4" />}
              text={`${item.prepMinutes} ${t("minutes")}`}
            />
            {item.calories ? (
              <MetaChip
                icon={<Flame className="size-4" />}
                text={`${item.calories} ${t("calories")}`}
              />
            ) : (
              <div />
            )}
            <MetaChip
              icon={<Heart className="size-4 fill-current text-primary" />}
              text={t("popular")}
            />
          </div>

          {/* Popularity hint — only for popular items */}
          {item.badges?.includes("popular") && (
            <div
              className="mt-2.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{
                background: "var(--cqr-gold-soft)",
                color: "var(--cqr-gold-strong)",
              }}
            >
              <Sparkles className="size-4 shrink-0" />
              <span className="text-xs font-semibold">{t("popularityHint")}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-3 flex-1 min-h-0 overflow-y-auto space-y-5">
          {!readOnly &&
            item.extras?.map((g) => {
            const picked = selection[g.id] ?? [];
            return (
              <section key={g.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{t.bi(g.label)}</h4>
                  <span
                    className={cn(
                      "text-[11px] uppercase tracking-wide rounded-full px-2 py-0.5",
                      g.required
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {g.required ? t("required") : t("optional")}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {g.options.map((o) => {
                    const active = picked.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggle(g.id, o.id, g.multi, g.max)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-slate-200/70 dark:border-slate-800 hover:bg-accent/40",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex size-4 items-center justify-center rounded-full border",
                              g.multi ? "rounded-md" : "",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-slate-300 dark:border-slate-700",
                            )}
                          >
                            {active && <span className="size-1.5 rounded-full bg-current" />}
                          </span>
                          {t.bi(o.label)}
                        </span>
                        {o.priceDelta > 0 && (
                          <MoneyText
                            amount={o.priceDelta}
                            className="text-xs text-muted-foreground"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {!readOnly && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">{t("specialNotes")}</h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("specialNotesPlaceholder")}
                rows={2}
                maxLength={140}
                className="rounded-xl"
              />
            </section>
          )}

          {!!related?.length && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">{t("alsoOrdered")}</h4>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5">
                {related.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRelated?.(r)}
                    className="shrink-0 w-32 text-start rounded-2xl border border-border/60 bg-card overflow-hidden cqr-lift"
                  >
                    <div className="relative h-[76px] w-full bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.imageUrl}
                        alt={t.bi(r.name)}
                        loading="lazy"
                        className="absolute inset-0 size-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-semibold truncate">
                        {t.bi(r.name)}
                      </div>
                      <MoneyText amount={r.price} className="text-xs font-bold" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200/60 dark:border-slate-800 p-3 flex items-center gap-3">
          {readOnly ? (
            <Button
              type="button"
              size="lg"
              onClick={onCreateOrder}
              className="flex-1 rounded-full justify-center gap-2"
            >
              <ClipboardList className="size-4" />
              {t("startOrder")}
            </Button>
          ) : (
            <>
              <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label={t("decrement")}
                  className="rounded-full"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">
                  {qty}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  aria-label={t("increment")}
                  className="rounded-full"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <Button
                type="button"
                size="lg"
                disabled={!allRequiredSatisfied}
                onClick={handleConfirm}
                className="flex-1 rounded-full justify-between"
              >
                <span>{t("addToCart")}</span>
                <MoneyText amount={lineTotal} className="font-semibold" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetaChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border/60 bg-card py-2.5 px-1 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-bold leading-tight">{text}</span>
    </div>
  );
}
