"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import {
  ALL_PRODUCT_CATEGORIES,
  filterProducts,
  getProductCategoryKey,
  useProductFilter,
} from "@/lib/hooks/useProductFilter";
import { PRODUCT_STATUS } from "@/lib/status-constants";
import { useDebounce } from "@/lib/hooks/useDebounce";
import type { Locale } from "@/lib/translations";
import type { OfferResponseDto } from "@/types/offer";
import type { ProductDto } from "@/types/pos";
import { OffersSection } from "@/components/offers/OffersSection";
import { findProductsByCode, type CodeMatchResult } from "@/lib/pos-product-lookup";
import { CategoryTabs } from "./CategoryTabs";
import { ProductGrid } from "./ProductGrid";
import { SearchBar } from "./SearchBar";
import type { ProductActionProps, ProductCategoryTab, ProductSelectionLabels } from "./types";

interface ProductSelectionPanelProps extends ProductActionProps {
  currency: string;
  disabled?: boolean;
  offers?: OfferResponseDto[];
  onSelectOffer?: (offer: OfferResponseDto) => void;
  products: ProductDto[];
  /**
   * Opt-in till behaviour. When supplied, Enter in the search box (which is also how a
   * barcode scanner ends its transmission) resolves the term to a product and hands it over.
   * Screens that do not pass it keep exactly the behaviour they had.
   */
  onCodeSubmit?: (result: CodeMatchResult, term: string) => void;
  /** Focus the search box on mount, so a scan lands without clicking first. */
  autoFocusSearch?: boolean;
}

const PRODUCT_SEARCH_DEBOUNCE_MS = 300;
const OFFER_PRODUCT_CATEGORY = "__offers__";
const OTHER_PRODUCT_SUBCATEGORY = "__other_subcategory__";

const getUncategorizedLabel = (locale: Locale) => (locale === "ar" ? "أخرى" : "Other");
const getAllSubcategoriesLabel = (locale: Locale) => (locale === "ar" ? "الكل" : "All");
const getOptionsLabel = (locale: Locale) => (locale === "ar" ? "خيارات" : "Options");
const getUnavailableLabel = (locale: Locale) => (locale === "ar" ? "غير متاح" : "Unavailable");
const getNoProductsLabel = (locale: Locale) =>
  locale === "ar" ? "لا توجد منتجات مطابقة" : "No matching products";
const getNoOffersLabel = (locale: Locale) =>
  locale === "ar" ? "لا توجد عروض مطابقة" : "No matching offers";
const getNoItemsLabel = (locale: Locale) =>
  locale === "ar" ? "لا توجد عناصر مطابقة" : "No matching items";
const isActiveProduct = (product: ProductDto) =>
  product.isActive && (product.status == null || product.status === PRODUCT_STATUS.ACTIVE);

const getCategoryLabel = (product: ProductDto, locale: Locale) => {
  if (locale === "ar") {
    return product.categoryNameAr || product.categoryDisplayName || product.categoryName || getUncategorizedLabel(locale);
  }

  return product.categoryDisplayName || product.categoryName || product.categoryNameAr || getUncategorizedLabel(locale);
};

const getSubcategoryLabel = (product: ProductDto, locale: Locale) => {
  if (locale === "ar") {
    return product.subcategoryNameAr || product.subcategoryDisplayName || product.subcategoryName || getUncategorizedLabel(locale);
  }

  return product.subcategoryDisplayName || product.subcategoryName || product.subcategoryNameAr || getUncategorizedLabel(locale);
};

const buildCategories = (products: ProductDto[], locale: Locale): ProductCategoryTab[] => {
  const categories = new Map<string, ProductCategoryTab>();

  products.forEach((product) => {
    const id = getProductCategoryKey(product);
    const current = categories.get(id);

    if (current) {
      current.count += 1;
      return;
    }

    categories.set(id, {
      id,
      label: getCategoryLabel(product, locale),
      count: 1,
    });
  });

  return Array.from(categories.values());
};

const buildSubcategories = (products: ProductDto[], locale: Locale): ProductCategoryTab[] => {
  const subcategories = new Map<string, ProductCategoryTab>();

  products.forEach((product) => {
    const id = product.subcategoryId ?? OTHER_PRODUCT_SUBCATEGORY;
    const current = subcategories.get(id);

    if (current) {
      current.count += 1;
      return;
    }

    subcategories.set(id, {
      id,
      label: product.subcategoryId ? getSubcategoryLabel(product, locale) : getUncategorizedLabel(locale),
      count: 1,
    });
  });

  return Array.from(subcategories.values());
};

const offerMatchesSearch = (offer: OfferResponseDto, searchTerm: string, locale: Locale) => {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) return true;

  const offerFields = locale === "ar"
    ? [offer.nameAr, offer.name, offer.descriptionAr, offer.description]
    : [offer.name, offer.nameAr, offer.description, offer.descriptionAr];
  const productFields = offer.products.flatMap((product) =>
    locale === "ar"
      ? [product.nameAr, product.name, product.descriptionAr, product.description]
      : [product.name, product.nameAr, product.description, product.descriptionAr],
  );

  return [...offerFields, ...productFields].some((field) =>
    field?.trim().toLowerCase().includes(normalized),
  );
};

export function ProductSelectionPanel({
  currency,
  disabled = false,
  offers = [],
  onSelectOffer,
  products,
  onProductSelect,
  onProductQuickView,
  onCodeSubmit,
  autoFocusSearch = false,
}: ProductSelectionPanelProps) {
  const { locale, t } = useLocale();
  const topRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_PRODUCT_CATEGORIES);
  const [selectedSubcategory, setSelectedSubcategory] = useState(ALL_PRODUCT_CATEGORIES);
  const debouncedSearchTerm = useDebounce(searchTerm, PRODUCT_SEARCH_DEBOUNCE_MS);
  const hasOfferCategory = offers.length > 0 && !!onSelectOffer;
  const activeProducts = useMemo(
    () => products.filter(isActiveProduct),
    [products],
  );
  const categories = useMemo(() => {
    const productCategories = buildCategories(activeProducts, locale);

    if (!hasOfferCategory) {
      return productCategories;
    }

    return [
      {
        id: OFFER_PRODUCT_CATEGORY,
        label: locale === "ar" ? "العروض" : "Offers",
        count: offers.length,
        variant: "offer" as const,
      },
      ...productCategories,
    ];
  }, [activeProducts, offers.length, locale, hasOfferCategory]);
  const activeCategory = useMemo(() => {
    if (selectedCategory === ALL_PRODUCT_CATEGORIES) return selectedCategory;

    return categories.some((category) => category.id === selectedCategory)
      ? selectedCategory
      : ALL_PRODUCT_CATEGORIES;
  }, [categories, selectedCategory]);
  const filteredProducts = useProductFilter(activeProducts, debouncedSearchTerm, activeCategory);
  const subcategories = useMemo(() => {
    if (activeCategory === ALL_PRODUCT_CATEGORIES || activeCategory === OFFER_PRODUCT_CATEGORY) return [];
    return buildSubcategories(filteredProducts, locale);
  }, [activeCategory, filteredProducts, locale]);
  const activeSubcategory = useMemo(() => {
    if (selectedSubcategory === ALL_PRODUCT_CATEGORIES) return selectedSubcategory;

    return subcategories.some((subcategory) => subcategory.id === selectedSubcategory)
      ? selectedSubcategory
      : ALL_PRODUCT_CATEGORIES;
  }, [selectedSubcategory, subcategories]);
  const visibleProducts = useMemo(() => {
    if (activeSubcategory === ALL_PRODUCT_CATEGORIES) return filteredProducts;
    if (activeSubcategory === OTHER_PRODUCT_SUBCATEGORY) {
      return filteredProducts.filter((product) => !product.subcategoryId);
    }

    return filteredProducts.filter((product) => product.subcategoryId === activeSubcategory);
  }, [filteredProducts, activeSubcategory]);
  const filteredOffers = useMemo(
    () => offers.filter((offer) => offerMatchesSearch(offer, debouncedSearchTerm, locale)),
    [offers, debouncedSearchTerm, locale],
  );
  const showingAll = activeCategory === ALL_PRODUCT_CATEGORIES;
  const showingOffers = activeCategory === OFFER_PRODUCT_CATEGORY && !!onSelectOffer;
  const totalItemCount = activeProducts.length + (hasOfferCategory ? offers.length : 0);
  const labels = useMemo<ProductSelectionLabels>(
    () => ({
      allCategories: t("allCategories"),
      containsAllergens: t("containsAllergens"),
      noProducts: getNoProductsLabel(locale),
      options: getOptionsLabel(locale),
      quickView: locale === "ar" ? "عرض التفاصيل" : "Quick view",
      searchPlaceholder: t("searchProducts"),
      unavailable: getUnavailableLabel(locale),
      inStock: locale === "ar" ? "متوفر" : "In stock",
      lowStock: locale === "ar" ? "مخزون منخفض" : "Low stock",
      outOfStock: locale === "ar" ? "غير متوفر" : "Out of stock",
    }),
    [locale, t],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  /**
   * Enter / scanner. An exact barcode-or-SKU hit wins outright, whatever category tab is
   * open — a scan must work without the cashier first navigating to the right tab. Only when
   * there is no code match does it fall back to "the search narrowed to exactly one product",
   * which is what a cashier typing a name expects. Anything else is reported as "none" so the
   * caller can say so rather than guessing.
   */
  const handleCodeSubmit = useCallback(
    (term: string) => {
      if (!onCodeSubmit) return;

      const byCode = findProductsByCode(activeProducts, term);
      if (byCode.kind !== "none") {
        onCodeSubmit(byCode, term);
        return;
      }

      const narrowed = filterProducts(activeProducts, term, ALL_PRODUCT_CATEGORIES);
      onCodeSubmit(
        narrowed.length === 1
          ? { kind: "single", matches: narrowed }
          : { kind: narrowed.length === 0 ? "none" : "ambiguous", matches: narrowed },
        term,
      );
    },
    [activeProducts, onCodeSubmit],
  );

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(ALL_PRODUCT_CATEGORIES);
    topRef.current?.scrollIntoView({ block: "start" });
  }, []);

  const handleSubcategoryChange = useCallback((subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
    topRef.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <section ref={topRef} className="space-y-4">
      <div className="sticky top-0 z-30 space-y-3 border-b border-slate-200 bg-slate-50/95 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-slate-50/85">
        <SearchBar
          value={searchTerm}
          placeholder={labels.searchPlaceholder}
          onChange={handleSearchChange}
          onSubmit={onCodeSubmit ? handleCodeSubmit : undefined}
          autoFocus={autoFocusSearch}
        />
        <CategoryTabs
          allLabel={labels.allCategories}
          categories={categories}
          selectedCategory={activeCategory}
          totalCount={totalItemCount}
          onCategoryChange={handleCategoryChange}
        />
        {subcategories.some((subcategory) => subcategory.id !== OTHER_PRODUCT_SUBCATEGORY) && !showingAll && !showingOffers && (
          <CategoryTabs
            allLabel={getAllSubcategoriesLabel(locale)}
            categories={subcategories}
            selectedCategory={activeSubcategory}
            totalCount={filteredProducts.length}
            onCategoryChange={handleSubcategoryChange}
          />
        )}
      </div>
      {showingOffers ? (
        filteredOffers.length > 0 ? (
          <OffersSection
            offers={filteredOffers}
            currency={currency}
            disabled={disabled}
            onSelectOffer={onSelectOffer}
          />
        ) : (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-medium text-slate-500">
            {getNoOffersLabel(locale)}
          </div>
        )
      ) : showingAll ? (
        filteredOffers.length > 0 || filteredProducts.length > 0 ? (
          <>
            {onSelectOffer && filteredOffers.length > 0 && (
              <OffersSection
                offers={filteredOffers}
                currency={currency}
                disabled={disabled}
                onSelectOffer={onSelectOffer}
              />
            )}
            {filteredProducts.length > 0 && (
              <ProductGrid
                products={filteredProducts}
                currency={currency}
                locale={locale}
                labels={labels}
                emptyLabel={labels.noProducts}
                disabled={disabled}
                onProductSelect={onProductSelect}
                onProductQuickView={onProductQuickView}
              />
            )}
          </>
        ) : (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-medium text-slate-500">
            {getNoItemsLabel(locale)}
          </div>
        )
      ) : (
        <ProductGrid
          products={visibleProducts}
          currency={currency}
          locale={locale}
          labels={labels}
          emptyLabel={labels.noProducts}
          disabled={disabled}
          onProductSelect={onProductSelect}
          onProductQuickView={onProductQuickView}
        />
      )}
    </section>
  );
}
