"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ProductDto } from "@/types/pos";
import { formatCurrency } from "@/lib/currencies";
import { useLocale } from "@/components/locale-provider";
import { buildProductAvailabilityDateLabel, buildProductAvailabilityTimeLabel } from "@/lib/product-availability";
import { Search, SlidersHorizontal, ChefHat } from "lucide-react";

import CategoryNav from "@/components/showcase/CategoryNav";
import ProductCard from "@/components/showcase/ProductCard";
import ProductDetailPanel from "@/components/showcase/ProductDetailPanel";
import { useMenuData } from "@/lib/hooks/useMenuData";
import { buildProductSubcategorySections } from "@/lib/menu-grouping";

export default function ShowcasePage() {
    const { t, locale, setLocale } = useLocale();
    const isAr = locale === "ar";

    // Data
    const { products, categories, loading } = useMenuData(locale);

    // Filters
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Detail panel
    const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Currency — default to USD, could come from settings
    const currency = "USD";
    const fmtPrice = useCallback((amount: number) => formatCurrency(amount, currency), [currency]);

    // Locale-aware name resolver. Bypasses backend-baked `displayName` so the
    // in-page EN/AR toggle is authoritative regardless of what Accept-Language
    // was used when the data was fetched.
    const pickName = useCallback(
        (en?: string | null, ar?: string | null) =>
            locale === "ar" ? (ar || en || "") : (en || ar || ""),
        [locale]
    );

    // Filtered products
    const filteredProducts = useMemo(() => {
        let result = products;

        // Category filter
        if (activeCategoryId) {
            result = result.filter((p) => p.categoryId === activeCategoryId);
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(
                (p) =>
                    (p.displayName || p.name).toLowerCase().includes(q) ||
                    (p.nameAr || "").toLowerCase().includes(q) ||
                    (p.description || "").toLowerCase().includes(q)
            );
        }

        return result;
    }, [products, activeCategoryId, searchQuery]);

    // Grouped by category (when no category filter)
    const groupedProducts = useMemo(() => {
        if (activeCategoryId || searchQuery.trim()) return null;

        const groups: { id: string; name: string; items: ProductDto[]; sections?: ReturnType<typeof buildProductSubcategorySections> }[] = [];
        const catMap = new Map(categories.map((c) => [c.id, pickName(c.name, c.nameAr)]));
        const uncategorized: ProductDto[] = [];

        for (const p of filteredProducts) {
            if (!p.categoryId) {
                uncategorized.push(p);
                continue;
            }
            let group = groups.find((g) => g.id === p.categoryId);
            if (!group) {
                group = { id: p.categoryId, name: catMap.get(p.categoryId) || "Other", items: [] };
                groups.push(group);
            }
            group.items.push(p);
        }

        // Sort groups by category sortOrder
        const catOrder = new Map(categories.map((c) => [c.id, c.sortOrder]));
        groups.sort((a, b) => (catOrder.get(a.id) ?? 999) - (catOrder.get(b.id) ?? 999));

        if (uncategorized.length > 0) {
            groups.push({ id: "__uncategorized__", name: t("showcaseOther") || "Other", items: uncategorized });
        }

        return groups.map((group) => ({
            ...group,
            sections: buildProductSubcategorySections(
                categories.find((category) => category.id === group.id),
                group.items,
                locale,
                group.name,
            ),
        }));
    }, [filteredProducts, activeCategoryId, searchQuery, categories, t, pickName, locale]);

    const activeCategorySections = useMemo(() => {
        if (!activeCategoryId || searchQuery.trim()) return null;
        const category = categories.find((c) => c.id === activeCategoryId);
        if (!category) return null;
        return buildProductSubcategorySections(category, filteredProducts, locale, pickName(category.name, category.nameAr));
    }, [activeCategoryId, searchQuery, categories, filteredProducts, locale, pickName]);

    // Pre-localize categories so CategoryNav pills flip with the toggle.
    const localizedCategories = useMemo(
        () => categories.map((c) => ({ ...c, displayName: pickName(c.name, c.nameAr) })),
        [categories, pickName]
    );

    const handleViewProduct = useCallback((id: string) => {
        const prod = products.find((p) => p.id === id);
        if (prod) {
            setSelectedProduct(prod);
            setDetailOpen(true);
        }
    }, [products]);

    // Active category name for header
    const activeCategoryName = useMemo(() => {
        if (!activeCategoryId) return null;
        const cat = categories.find((c) => c.id === activeCategoryId);
        return cat ? pickName(cat.name, cat.nameAr) : null;
    }, [activeCategoryId, categories, pickName]);

    return (
        <div className="showcase-page">
            {/* Top header */}
            <header className="showcase-header">
                <div className="showcase-header-inner">
                    <div className="flex items-center gap-3">
                        <ChefHat className="w-8 h-8 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">
                                {t("showcaseTitle") || "Our Menu"}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {t("showcaseSubtitle") || "Discover our dishes"}
                            </p>
                        </div>
                    </div>

                    {/* Language Toggle */}
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
                        <button
                            onClick={() => setLocale('en', { reload: false })}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                locale === 'en'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLocale('ar', { reload: false })}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                locale === 'ar'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            AR
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className="showcase-search-wrapper">
                        <Search className="showcase-search-icon" />
                        <input
                            type="text"
                            placeholder={t("showcaseSearch") || "Search menu..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="showcase-search-input"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Clear search"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Category navigation */}
            <CategoryNav
                categories={localizedCategories}
                activeId={activeCategoryId}
                onSelect={setActiveCategoryId}
                allLabel={t("showcaseAll") || "All"}
            />

            {/* Main content */}
            <main className="showcase-main">
                {loading ? (
                    <div className="showcase-loading">
                        <div className="showcase-loading-spinner" />
                        <p className="text-muted-foreground text-sm mt-4">{t("loadingText") || "Loading..."}</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="showcase-empty">
                        <ChefHat className="w-16 h-16 text-muted-foreground/20 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">
                            {t("showcaseNoResults") || "No items found"}
                        </p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                            {t("showcaseTryAnother") || "Try another search or category"}
                        </p>
                    </div>
                ) : groupedProducts ? (
                    /* Grouped view */
                    <div className="showcase-grouped">
                        {groupedProducts.map((group) => (
                            <section key={group.id} className="showcase-section">
                                <h2 className="showcase-section-title">{group.name}</h2>
                                <div className="space-y-6">
                                    {(group.sections || []).map((section) => (
                                        <div key={section.id} className="space-y-3">
                                            {section.isSubcategory && <h3 className="text-lg font-bold text-slate-800">{section.name}</h3>}
                                            <div className="showcase-grid">
                                                {section.items.map((p) => (
                                                    <ProductCard
                                                        key={p.id}
                                                        id={p.id}
                                                        name={p.name}
                                                        displayName={pickName(p.name, p.nameAr)}
                                                        imageUrl={p.imageUrl}
                                                        imageKey={p.imageKey}
                                                        basePrice={p.basePrice}
                                                        discountedPrice={p.discountedPrice}
                                                        discountPercentage={p.discountPercentage}
                                                        categoryName={pickName(p.categoryName, p.categoryNameAr)}
                                                        isActive={p.isActive}
                                                        isAvailableNow={p.isAvailableNow}
                                                        availabilityLabel={buildProductAvailabilityTimeLabel(p, isAr ? "ar" : "en") || buildProductAvailabilityDateLabel(p, isAr ? "ar" : "en")}
                                                        formatPrice={fmtPrice}
                                                        onView={handleViewProduct}
                                                        viewLabel={t("showcaseView") || "View"}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    /* Flat filtered view */
                    <>
                        {activeCategoryName && (
                            <h2 className="showcase-section-title">
                                {activeCategoryName}
                                <span className="showcase-count-badge">{filteredProducts.length}</span>
                            </h2>
                        )}
                        {activeCategorySections ? (
                            <div className="space-y-6">
                                {activeCategorySections.map((section) => (
                                    <div key={section.id} className="space-y-3">
                                        {section.isSubcategory && <h3 className="text-lg font-bold text-slate-800">{section.name}</h3>}
                                        <div className="showcase-grid">
                                            {section.items.map((p) => (
                                                <ProductCard
                                                    key={p.id}
                                                    id={p.id}
                                                    name={p.name}
                                                    displayName={pickName(p.name, p.nameAr)}
                                                    imageUrl={p.imageUrl}
                                                    imageKey={p.imageKey}
                                                    basePrice={p.basePrice}
                                                    discountedPrice={p.discountedPrice}
                                                    discountPercentage={p.discountPercentage}
                                                    categoryName={pickName(p.categoryName, p.categoryNameAr)}
                                                    isActive={p.isActive}
                                                    isAvailableNow={p.isAvailableNow}
                                                    availabilityLabel={buildProductAvailabilityTimeLabel(p, isAr ? "ar" : "en") || buildProductAvailabilityDateLabel(p, isAr ? "ar" : "en")}
                                                    formatPrice={fmtPrice}
                                                    onView={handleViewProduct}
                                                    viewLabel={t("showcaseView") || "View"}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="showcase-grid">
                                {filteredProducts.map((p) => (
                                    <ProductCard
                                        key={p.id}
                                        id={p.id}
                                        name={p.name}
                                        displayName={pickName(p.name, p.nameAr)}
                                        imageUrl={p.imageUrl}
                                        imageKey={p.imageKey}
                                        basePrice={p.basePrice}
                                        discountedPrice={p.discountedPrice}
                                        discountPercentage={p.discountPercentage}
                                        categoryName={pickName(p.categoryName, p.categoryNameAr)}
                                        isActive={p.isActive}
                                        isAvailableNow={p.isAvailableNow}
                                        availabilityLabel={buildProductAvailabilityTimeLabel(p, isAr ? "ar" : "en") || buildProductAvailabilityDateLabel(p, isAr ? "ar" : "en")}
                                        formatPrice={fmtPrice}
                                        onView={handleViewProduct}
                                        viewLabel={t("showcaseView") || "View"}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Detail side panel */}
            <ProductDetailPanel
                product={selectedProduct}
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setSelectedProduct(null); }}
                formatPrice={fmtPrice}
                t={t}
            />
        </div>
    );
}
