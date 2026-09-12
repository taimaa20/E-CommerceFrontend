"use client";

import { memo, useCallback, type KeyboardEvent, type MouseEvent } from "react";
import { Package, Flame, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currencies";
import { buildProductAvailabilityDateLabel, buildProductAvailabilityTimeLabel } from "@/lib/product-availability";
import { productImageProps } from "@/lib/product-image";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/translations";
import { stockOnHandOf } from "@/lib/pos-product-lookup";
import type { ProductDto } from "@/types/pos";
import type { ProductActionProps, ProductSelectionLabels } from "./types";

interface ProductCardProps extends ProductActionProps {
  currency: string;
  disabled: boolean;
  index: number;
  labels: ProductSelectionLabels;
  locale: Locale;
  product: ProductDto;
}

const FIRST_FOLD_PRODUCT_COUNT = 12;

function ProductCardComponent({
  currency,
  disabled,
  index,
  labels,
  locale,
  product,
  onProductSelect,
  onProductQuickView,
}: ProductCardProps) {
  const isArabic = locale === "ar";
  const currentPrice = product.displayPrice ?? product.discountedPrice ?? product.basePrice;
  const hasDiscount = product.displayPrice == null && !!product.discountedPrice && product.discountedPrice < product.basePrice;
  const hasAllergens = !!(product.allergens && product.allergens > 0);
  const activeOptionsCount = product.options?.filter((option) => option.isActive).length ?? 0;
  const isDisabled = disabled || !product.isAvailableNow;
  const isFirstFold = index < FIRST_FOLD_PRODUCT_COUNT;
  const displayName = isArabic && product.nameAr ? product.nameAr : product.displayName || product.name;
  const availabilityLabel =
    buildProductAvailabilityTimeLabel(product, isArabic ? "ar" : "en") ||
    buildProductAvailabilityDateLabel(product, isArabic ? "ar" : "en");
  const image = productImageProps(product.imageKey, product.imageUrl, "medium");
  // Stock comes from the retail ledger via ProductDto.retail. A product with no retail row
  // is not stock-tracked at all, so it shows no stock chip rather than a misleading zero.
  // This is display only — the authoritative check stays server-side at order creation.
  const stockOnHand = stockOnHandOf(product);
  const isTracked = stockOnHand !== null;
  const isOutOfStock = isTracked && stockOnHand <= 0;
  const isLowStock = isTracked && !isOutOfStock && product.retail!.stockStatus !== "Ok";
  const sku = product.retail?.sku;

  const handleSelect = useCallback(() => {
    if (!isDisabled) {
      onProductSelect(product);
    }
  }, [isDisabled, onProductSelect, product]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      handleSelect();
    },
    [handleSelect],
  );

  const handleQuickView = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onProductQuickView(product);
    },
    [onProductQuickView, product],
  );

  return (
    <Card
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative min-h-[13rem] overflow-hidden border-slate-200 py-0 transition duration-100",
        isDisabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary/40 hover:shadow-md active:scale-[0.98]",
        !isDisabled && isOutOfStock && "opacity-60",
      )}
    >
      {hasDiscount && (
        <div className="absolute start-2 top-2 z-10 rounded-md bg-destructive px-2 py-1 text-[11px] font-bold text-white shadow">
          SALE
        </div>
      )}

      {hasAllergens && (
        <div className="absolute end-2 top-2 z-10 rounded-full bg-warning px-2 py-1 text-[11px] font-bold text-warning-foreground shadow">
          !
        </div>
      )}

      <button
        type="button"
        aria-label={labels.quickView}
        title={labels.quickView}
        onClick={handleQuickView}
        className={cn(
          "absolute end-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white hover:text-primary",
          hasAllergens ? "top-11" : "top-2",
        )}
      >
        <Info className="h-4 w-4" />
      </button>

      {!product.isAvailableNow && (
        <div className="absolute start-2 top-11 z-10 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow">
          {labels.unavailable}
        </div>
      )}

      {isOutOfStock && (
        <div className="absolute start-2 bottom-2 z-10 rounded-md bg-slate-800/90 px-2 py-1 text-[10px] font-bold text-white shadow">
          {labels.outOfStock}
        </div>
      )}

      {image ? (
        <div className="h-32 w-full overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 17vw"
            alt={displayName}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading={isFirstFold ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={isFirstFold ? "high" : "low"}
          />
        </div>
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-slate-100 text-slate-300">
          <Package className="h-10 w-10" />
        </div>
      )}

      <CardHeader className="p-3 pb-1">
        <CardTitle className="line-clamp-2 min-h-10 text-center text-sm font-bold leading-5 text-slate-800">
          {displayName}
        </CardTitle>
        {sku && (
          <div className="text-center font-mono text-[10px] leading-4 text-slate-400" title={sku}>
            {sku}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-1 px-3 pb-3 pt-0 text-center">
        {hasDiscount && (
          <div className="text-xs font-medium text-slate-400 line-through">
            {formatCurrency(product.basePrice, currency)}
          </div>
        )}
        <div className={cn("text-lg font-bold", hasDiscount ? "text-destructive" : "text-success")}>
          {formatCurrency(currentPrice, currency)}
        </div>
        {(isTracked || product.calories != null || activeOptionsCount > 0 || hasAllergens || (!product.isAvailableNow && availabilityLabel)) && (
          <div className="flex min-h-5 flex-wrap justify-center gap-1">
            {isTracked && !isOutOfStock && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  isLowStock ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
                )}
              >
                {isLowStock ? labels.lowStock : labels.inStock} · {stockOnHand}
              </span>
            )}
            {product.calories != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                <Flame className="h-3 w-3" />
                {product.calories}
              </span>
            )}
            {activeOptionsCount > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {labels.options}
              </span>
            )}
            {hasAllergens && (
              <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                {labels.containsAllergens}
              </span>
            )}
            {!product.isAvailableNow && availabilityLabel && (
              <span className="line-clamp-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {availabilityLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const ProductCard = memo(ProductCardComponent);
