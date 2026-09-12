"use client";

import { memo } from "react";
import type { Locale } from "@/lib/translations";
import type { ProductDto } from "@/types/pos";
import { ProductCard } from "./ProductCard";
import type { ProductActionProps, ProductSelectionLabels } from "./types";

interface ProductGridProps extends ProductActionProps {
  currency: string;
  disabled: boolean;
  emptyLabel: string;
  labels: ProductSelectionLabels;
  locale: Locale;
  products: ProductDto[];
}

function ProductGridComponent({
  currency,
  disabled,
  emptyLabel,
  labels,
  locale,
  products,
  onProductSelect,
  onProductQuickView,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-medium text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 [@media(min-width:1800px)]:grid-cols-6">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          currency={currency}
          locale={locale}
          labels={labels}
          disabled={disabled}
          onProductSelect={onProductSelect}
          onProductQuickView={onProductQuickView}
        />
      ))}
    </div>
  );
}

export const ProductGrid = memo(ProductGridComponent);
