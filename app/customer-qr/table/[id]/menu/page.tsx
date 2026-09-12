"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { BrandHeader } from "@/features/customer-qr/components/BrandHeader";
import { LoadingState } from "@/features/customer-qr/components/LoadingState";
import { EmptyState } from "@/features/customer-qr/components/EmptyState";
import { CategoryNav } from "@/features/customer-qr/components/CategoryNav";
import { MenuItemCard } from "@/features/customer-qr/components/MenuItemCard";
import { MenuItemDialog } from "@/features/customer-qr/components/MenuItemDialog";
import { OffersCarousel } from "@/features/customer-qr/components/OffersCarousel";
import { SearchInput } from "@/features/customer-qr/components/SearchInput";
import { CartFloatingButton } from "@/features/customer-qr/components/CartFloatingButton";
import { useMenu } from "@/features/customer-qr/hooks/useMenu";
import { useTable } from "@/features/customer-qr/hooks/useTable";
import { useCart } from "@/features/customer-qr/store/cartStore";
import { useT } from "@/features/customer-qr/i18n/useT";
import { computeSubtotal } from "@/features/customer-qr/services";
import { tableUrl } from "@/features/customer-qr/constants";
import type { MenuItem } from "@/features/customer-qr/types";

export default function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id: tableId } = use(params);
  const { mode } = use(searchParams);
  const readOnly = mode === "view";
  const router = useRouter();
  const t = useT();

  const { data: menu, loading: menuLoading } = useMenu();
  const { data: table } = useTable(tableId);

  const items = useCart(tableId, (s) => s.items);
  const add = useCart(tableId, (s) => s.add);
  const updateQty = useCart(tableId, (s) => s.updateQty);
  const remove = useCart(tableId, (s) => s.remove);

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  // Effective category is derived, not stored: explicit pick wins, else the
  // first category. While searching we span all categories.
  const effectiveCat = activeCat ?? menu?.categories[0]?.id ?? null;
  const displayCat = searching ? null : effectiveCat;

  const itemQuantities = useMemo(() => {
    const m = new Map<string, number>();
    for (const line of items) {
      m.set(line.itemId, (m.get(line.itemId) ?? 0) + line.quantity);
    }
    return m;
  }, [items]);

  const lastLineByItem = useMemo(() => {
    const m = new Map<string, string>();
    for (const line of items) m.set(line.itemId, line.lineId);
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    if (!menu) return [];
    return menu.items.filter((i) => {
      if (searching) {
        return (
          i.name.en.toLowerCase().includes(q) ||
          i.name.ar.includes(q) ||
          i.description.en.toLowerCase().includes(q) ||
          i.description.ar.includes(q)
        );
      }
      return !effectiveCat || i.categoryId === effectiveCat;
    });
  }, [menu, q, searching, effectiveCat]);

  const subtotal = computeSubtotal(items);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const catEmoji = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of menu?.categories ?? []) if (c.icon) m.set(c.id, c.icon);
    return m;
  }, [menu]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of menu?.items ?? []) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [menu]);
  const related = useMemo(
    () =>
      openItem && menu
        ? menu.items
            .filter((i) => i.categoryId === openItem.categoryId && i.id !== openItem.id)
            .slice(0, 6)
        : [],
    [openItem, menu],
  );

  const handleQuickAdd = (item: MenuItem) => {
    const lineId = lastLineByItem.get(item.id);
    if (lineId) {
      const line = items.find((l) => l.lineId === lineId);
      if (line) {
        updateQty(lineId, line.quantity + 1);
        return;
      }
    }
    add(item, 1, [], 0);
  };

  const handleQuickRemove = (item: MenuItem) => {
    const lineId = lastLineByItem.get(item.id);
    if (!lineId) return;
    const line = items.find((l) => l.lineId === lineId);
    if (!line) return;
    if (line.quantity <= 1) remove(lineId);
    else updateQty(lineId, line.quantity - 1);
  };

  return (
    <MobileShell
      header={
        <>
          <BrandHeader
            title={table ? t.bi(table.label) : t("menu")}
            subtitle={table ? t.bi(table.area) : undefined}
            showBack
          />
          <div className="px-4 pb-3 space-y-3">
            <SearchInput value={query} onChange={setQuery} />
            {menu && (
              <CategoryNav
                categories={menu.categories}
                activeId={displayCat}
                counts={categoryCounts}
                totalCount={menu.items.length}
                onChange={(cid) => setActiveCat(cid || null)}
              />
            )}
          </div>
        </>
      }
      footer={
        readOnly ? (
          <div className="p-4">
            <Link href={tableUrl(tableId, "menu")} className="block">
              <Button
                size="lg"
                className="rounded-2xl w-full h-14 font-semibold gap-2"
              >
                <ClipboardList className="size-5" />
                {t("startOrder")}
              </Button>
            </Link>
          </div>
        ) : (
          <CartFloatingButton tableId={tableId} quantity={totalQty} total={subtotal} />
        )
      }
      size="full"
    >
      {menuLoading || !menu ? (
        <LoadingState variant="menu" />
      ) : (
        <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-5 space-y-4 cqr-fade-up">
          {!query && menu.offers.length > 0 && (
            <OffersCarousel offers={menu.offers} />
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="size-6" />}
              title={t("noResults")}
              description={t("noResultsHint")}
            />
          ) : (
            <section className="space-y-2.5">
              {filtered.map((i) => (
                <MenuItemCard
                  key={i.id}
                  item={i}
                  inCart={itemQuantities.get(i.id) ?? 0}
                  emoji={catEmoji.get(i.categoryId)}
                  onAdd={() => setOpenItem(i)}
                  onQuickAdd={() => handleQuickAdd(i)}
                  onQuickRemove={() => handleQuickRemove(i)}
                  readOnly={readOnly}
                />
              ))}
            </section>
          )}

          <div className="h-4" />
        </div>
      )}

      <MenuItemDialog
        key={openItem?.id ?? "none"}
        item={openItem}
        open={!!openItem}
        readOnly={readOnly}
        related={related}
        emoji={openItem ? catEmoji.get(openItem.categoryId) : undefined}
        onSelectRelated={(r) => setOpenItem(r)}
        onCreateOrder={() => router.push(tableUrl(tableId, "menu"))}
        onOpenChange={(o) => !o && setOpenItem(null)}
        onConfirm={({ quantity, extras, extrasPriceDelta, notes }) => {
          if (!openItem) return;
          add(openItem, quantity, extras, extrasPriceDelta, notes);
          toast.success(t("added"));
        }}
      />
    </MobileShell>
  );
}
