"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Flame,
  Plus,
  ReceiptText,
  UtensilsCrossed,
} from "lucide-react";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { LanguageSwitcher } from "@/features/customer-qr/components/LanguageSwitcher";
import { LoadingState } from "@/features/customer-qr/components/LoadingState";
import { MoneyText } from "@/features/customer-qr/components/MoneyText";
import { useTable } from "@/features/customer-qr/hooks/useTable";
import { useRestaurant } from "@/features/customer-qr/hooks/useRestaurant";
import { useMenu } from "@/features/customer-qr/hooks/useMenu";
import { useSession } from "@/features/customer-qr/store/sessionStore";
import { useCart } from "@/features/customer-qr/store/cartStore";
import { useOrder } from "@/features/customer-qr/store/orderStore";
import { useT } from "@/features/customer-qr/i18n/useT";
import { tableUrl, ORDER_STEP_LABELS } from "@/features/customer-qr/constants";
import { computeTotals, remainingBalance } from "@/features/customer-qr/services";
import type { MenuItem } from "@/features/customer-qr/types";

const NO_TIP = { kind: "none", value: 0 } as const;
const isPlaceholder = (url: string) => url.includes("/mock/");

export default function TableWelcomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { data: table, loading } = useTable(id);
  const { data: restaurant } = useRestaurant();
  const { data: menu } = useMenu();

  const session = useSession(id, (s) => s.session);
  const start = useSession(id, (s) => s.start);

  const order = useOrder(id, (s) => s.order);
  const draftItems = useCart(id, (s) => s.items);
  const draftTotals = useMemo(() => computeTotals(draftItems, NO_TIP), [draftItems]);
  const draftCount = draftItems.reduce((sum, i) => sum + i.quantity, 0);

  const hasPlacedOrder = !!order;
  const hasDraft = draftCount > 0;
  const hasOpenOrder = hasPlacedOrder || hasDraft;

  const statusLabel =
    order && ORDER_STEP_LABELS[order.status as keyof typeof ORDER_STEP_LABELS];
  const orderRemaining = order ? remainingBalance(order) : 0;
  const fullyPaid = order?.paymentState === "paid";

  const Arrow = t.isRtl ? ArrowLeft : ArrowRight;

  const catEmoji = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of menu?.categories ?? []) if (c.icon) m.set(c.id, c.icon);
    return m;
  }, [menu]);

  // Merchandising previews — derived from existing badge flags; no fake data.
  const special = useMemo<MenuItem | undefined>(() => {
    const items = (menu?.items ?? []).filter((i) => i.availability !== "out");
    return (
      // A real photo makes the most appetising hero card; fall back to badges.
      items.find((i) => !isPlaceholder(i.imageUrl)) ??
      items.find((i) => i.badges?.includes("new")) ??
      items.find((i) => i.badges?.includes("popular")) ??
      items[0]
    );
  }, [menu]);
  const bestSellers = useMemo(
    () =>
      (menu?.items ?? [])
        .filter((i) => i.badges?.includes("popular") && i.availability !== "out")
        .slice(0, 8),
    [menu],
  );

  useEffect(() => {
    if (table && !session) start(table.id);
  }, [table, session, start]);

  if (loading || !table || !restaurant) {
    return (
      <MobileShell>
        <LoadingState />
      </MobileShell>
    );
  }

  return (
    <MobileShell
      className="bg-muted"
      footer={
        <div className="p-4 space-y-2">
          <Link
            href={tableUrl(table.id, "menu")}
            className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.99]"
          >
            <span className="pointer-events-none absolute -end-8 -top-10 size-28 rounded-full bg-white/10" />
            <span className="relative text-base font-bold">
              {hasOpenOrder ? t("continueOrder") : t("startOrder")}
            </span>
            <Arrow className="relative size-5" />
          </Link>
          {hasOpenOrder ? (
            <Link
              href={`${tableUrl(table.id, "menu")}?mode=view`}
              className="block py-1.5 text-center text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
            >
              {t("browseMenu")}
            </Link>
          ) : (
            <Link
              href={`${tableUrl(table.id, "menu")}?mode=view`}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-bold transition hover:border-primary hover:text-primary cqr-press"
            >
              <UtensilsCrossed className="size-4" />
              {t("browseMenu")}
            </Link>
          )}
        </div>
      }
    >
      {/* ── Compact brand hero (subtle food photography + logo + name) ── */}
      <div className="relative overflow-hidden px-5 pt-5 pb-7 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={restaurant.heroImageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 cqr-hero-twilight opacity-[0.82]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/45" />
        <div className="relative z-10 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
            <span className="inline-flex size-4 items-center justify-center rounded bg-primary">
              <UtensilsCrossed className="size-2.5" />
            </span>
            {t("tableLabel")} {table.code}
            <span className="size-1 rounded-full bg-white/40" />
            {t.bi(table.area)}
          </span>
          <LanguageSwitcher onDark />
        </div>

        <div className="relative z-10 mt-5 flex items-center gap-3.5">
          {/* Wordmark rendered white (logo art is dark) so it reads on the
              dark hero without a boxed background. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={restaurant.logoUrl}
            alt={t.bi(restaurant.name)}
            className="h-11 w-auto max-w-[140px] shrink-0 object-contain object-left brightness-0 invert rtl:object-right"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold leading-tight">
              {t.bi(restaurant.name)}
            </h1>
            <p className="truncate text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--cqr-gold)]">
              {t.bi(restaurant.tagline)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Body: order status + food previews fill the screen ── */}
      <div className="px-4 pt-5 pb-6 space-y-6 cqr-fade-up">
        {/* Resume / bill — only when something is open. */}
        {hasOpenOrder && (
          <div className="space-y-2.5">
            <Link
              href={tableUrl(table.id, "order")}
              className="flex items-center gap-3.5 rounded-2xl border border-primary/40 bg-card p-3.5 cqr-shadow-card"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <ReceiptText className="size-5" />
              </span>
              <span className="min-w-0 flex-1 text-start">
                <span className="block text-sm font-bold leading-tight">
                  {t("viewCurrentOrder")}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] font-medium text-muted-foreground">
                  {hasPlacedOrder ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {statusLabel ? t.bi(statusLabel) : t("orderInKitchen")}
                      {" · "}
                      {fullyPaid ? (
                        t("fullyPaid")
                      ) : (
                        <>
                          {t("remaining")}: <MoneyText amount={orderRemaining} muted />
                        </>
                      )}
                    </span>
                  ) : (
                    <>
                      {draftCount} {draftCount === 1 ? t("itemSingular") : t("items")} ·{" "}
                      <MoneyText amount={draftTotals.subtotal} muted />
                    </>
                  )}
                </span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" />
            </Link>

            {hasPlacedOrder && !fullyPaid && (
              <Link
                href={tableUrl(table.id, "bill")}
                className="flex items-center justify-between rounded-2xl bg-foreground px-4 py-3 text-background"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <ReceiptText className="size-4" />
                  {t("viewCurrentBill")}
                </span>
                <MoneyText amount={orderRemaining} className="text-sm" />
              </Link>
            )}
          </div>
        )}

        {/* Today's special — featured food image. */}
        {special && (
          <section className="space-y-2.5">
            <h2 className="px-1 text-base font-bold tracking-tight">
              {t("todaysSpecial")}
            </h2>
            <Link
              href={tableUrl(table.id, "menu")}
              className="group relative block h-44 overflow-hidden rounded-3xl cqr-shadow-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={special.imageUrl}
                alt={t.bi(special.name)}
                className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              {isPlaceholder(special.imageUrl) && catEmoji.get(special.categoryId) && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center pb-12 text-6xl drop-shadow">
                  {catEmoji.get(special.categoryId)}
                </span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              {special.badges?.includes("popular") && (
                <span className="cqr-badge cqr-badge-popular absolute top-3 start-3">
                  <Flame className="size-2.5" />
                  {t("popular")}
                </span>
              )}
              <div className="absolute inset-x-4 bottom-3.5 text-white">
                <div className="text-lg font-extrabold leading-tight">
                  {t.bi(special.name)}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] font-medium opacity-85">
                  {t.bi(special.description)}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[15px] font-extrabold tabular-nums drop-shadow">
                    <MoneyText amount={special.price} />
                  </span>
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/30">
                    <Plus className="size-4" strokeWidth={2.5} />
                  </span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Best sellers preview. */}
        {bestSellers.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="px-1 text-base font-bold tracking-tight">
              {t("bestSellers")}
            </h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
              {bestSellers.map((it) => (
                <Link
                  key={it.id}
                  href={tableUrl(table.id, "menu")}
                  className="group w-36 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card cqr-shadow-card cqr-lift"
                >
                  <div className="relative h-24 w-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.imageUrl}
                      alt={t.bi(it.name)}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-110"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {isPlaceholder(it.imageUrl) && catEmoji.get(it.categoryId) && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl">
                        {catEmoji.get(it.categoryId)}
                      </span>
                    )}
                    <span className="cqr-badge cqr-badge-popular absolute top-2 start-2">
                      <Flame className="size-2.5" />
                      {t("popular")}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <div className="truncate text-[13px] font-bold">{t.bi(it.name)}</div>
                    <MoneyText amount={it.price} className="text-[13px] font-bold" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </MobileShell>
  );
}
