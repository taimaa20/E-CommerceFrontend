"use client";

import { memo, useCallback, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { ALL_PRODUCT_CATEGORIES } from "@/lib/hooks/useProductFilter";
import type { ProductCategoryTab } from "./types";

interface CategoryTabsProps {
  allLabel: string;
  categories: ProductCategoryTab[];
  selectedCategory: string;
  totalCount: number;
  onCategoryChange: (categoryId: string) => void;
}

interface CategoryTabButtonProps {
  count: number;
  id: string;
  label: string;
  selected: boolean;
  variant?: ProductCategoryTab["variant"];
}

const getTabClassName = (selected: boolean, variant: ProductCategoryTab["variant"] = "default") =>
  cn(
    "flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    selected && variant === "offer"
      ? "border-amber-500 bg-amber-500 text-white shadow-sm"
      : selected
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : variant === "offer"
      ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100"
      : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5",
  );

function CategoryTabButton({ count, id, label, selected, variant = "default" }: CategoryTabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-category-id={id}
      className={getTabClassName(selected, variant)}
    >
      <span className="max-w-36 truncate">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[11px] leading-none",
          selected ? "bg-white/20 text-primary-foreground" : "bg-slate-100 text-slate-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function CategoryTabsComponent({
  allLabel,
  categories,
  selectedCategory,
  totalCount,
  onCategoryChange,
}: CategoryTabsProps) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-category-id]");
      const categoryId = button?.dataset.categoryId;

      if (categoryId) {
        onCategoryChange(categoryId);
      }
    },
    [onCategoryChange],
  );

  return (
    <div
      role="tablist"
      aria-label="Product categories"
      onClick={handleClick}
      className="flex min-w-0 gap-2 overflow-x-auto pb-1"
    >
      <CategoryTabButton
        id={ALL_PRODUCT_CATEGORIES}
        label={allLabel}
        count={totalCount}
        selected={selectedCategory === ALL_PRODUCT_CATEGORIES}
      />
      {categories.map((category) => (
        <CategoryTabButton
          key={category.id}
          id={category.id}
          label={category.label}
          count={category.count}
          selected={selectedCategory === category.id}
          variant={category.variant}
        />
      ))}
    </div>
  );
}

export const CategoryTabs = memo(CategoryTabsComponent);
