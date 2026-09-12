"use client";

import { useMemo } from "react";
import type { ProductDto } from "@/types/pos";

export const ALL_PRODUCT_CATEGORIES = "__all__";
export const UNCATEGORIZED_PRODUCT_CATEGORY = "__uncategorized__";

const normalizeText = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const productMatchesSearch = (product: ProductDto, searchTerm: string) => {
  if (!searchTerm) return true;

  // SKU, barcode and brand come from the retail detail and are absent on ordinary
  // recipe products, so this stays correct for a restaurant catalogue too.
  return [
    product.name,
    product.nameAr,
    product.displayName,
    product.description,
    product.descriptionAr,
    product.categoryName,
    product.categoryNameAr,
    product.categoryDisplayName,
    product.retail?.sku,
    product.retail?.barcode,
    product.retail?.brand,
  ].some((field) => normalizeText(field).includes(searchTerm));
};

export const getProductCategoryKey = (product: ProductDto) =>
  product.categoryId ?? UNCATEGORIZED_PRODUCT_CATEGORY;

export function filterProducts(
  products: ProductDto[],
  search: string,
  category: string,
) {
  const searchTerm = normalizeText(search);

  return products.filter((product) => {
    const categoryMatches =
      category === ALL_PRODUCT_CATEGORIES || getProductCategoryKey(product) === category;

    return categoryMatches && productMatchesSearch(product, searchTerm);
  });
}

export function useProductFilter(
  products: ProductDto[],
  search: string,
  category: string,
) {
  return useMemo(
    () => filterProducts(products, search, category),
    [products, search, category],
  );
}
