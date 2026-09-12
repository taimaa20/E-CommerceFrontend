"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionWrapper from "@/app/website/components/SectionWrapper";
import TitleBlock from "@/app/website/components/TitleBlock";
import MenuCard from "@/app/website/components/MenuCard";
import { menuService } from "@/app/website/services/menu.service";
import type { MenuCategory, MenuItem } from "@/app/website/types";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";

// Marketing preview: up to N items per category so every category has a sample.
// The full catalog still lives at /menu (search, filters, offers, availability).
const ITEMS_PER_CATEGORY = 3;

// Marketing menu — brief preview only.
// Full catalog lives at /menu (search, filters, offers, availability).
// The CTA at the bottom of this section routes serious buyers over there.
export default function MenuSection() {
  const { locale } = useWebsiteLocale();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const isAr = locale === "ar";

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await menuService.getPreview(ITEMS_PER_CATEGORY);
      if (!alive) return;
      setCategories(data.categories);
      setItems(data.items);
      setActiveCategory(data.categories[0]?.id ?? "");
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const previewCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items) {
      map[it.categoryId] = (map[it.categoryId] || 0) + 1;
    }
    return map;
  }, [items]);

  const visibleItems = useMemo(
    () => items.filter((i) => i.categoryId === activeCategory),
    [items, activeCategory],
  );
  const activeCategoryData = categories.find((category) => category.id === activeCategory);
  const visibleSections = useMemo(() => {
    const subcategories = [...(activeCategoryData?.subcategories || [])]
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    if (subcategories.length === 0) {
      return [{ id: "__all__", name: "", items: visibleItems, isSubcategory: false }];
    }

    const activeIds = new Set(subcategories.map((subcategory) => subcategory.id));
    const sections = subcategories
      .map((subcategory) => ({
        id: subcategory.id,
        name: pick(subcategory, "name", locale),
        items: visibleItems.filter((item) => item.subcategoryId === subcategory.id),
        isSubcategory: true,
      }))
      .filter((section) => section.items.length > 0);
    const directItems = visibleItems.filter((item) => !item.subcategoryId || !activeIds.has(item.subcategoryId));
    if (directItems.length > 0) {
      sections.push({
        id: "__other__",
        name: isAr ? "أخرى" : "Other",
        items: directItems,
        isSubcategory: true,
      });
    }
    return sections;
  }, [activeCategoryData, visibleItems, locale, isAr]);

  const eyebrow = isAr ? "القائمة" : "The Menu";
  const title = isAr ? "أبرز ما نُقدّم" : "A Taste of the Menu";
  const subtitle = isAr
    ? "لمحة مختارة من مطبخنا. القائمة الكاملة مع البحث والتصفية بانتظارك."
    : "A curated glimpse from the kitchen. The full catalog — with search and filters — is one click away.";
  const ctaLabel = isAr ? "عرض القائمة الكاملة" : "View Full Menu";
  const ctaNote = isAr
    ? `أكثر من ${items.length < 24 ? "20" : items.length}+ صنف في انتظارك`
    : "20+ items waiting for you";

  return (
    <SectionWrapper id="menu" background="cream">
      <div className="w-menu-head">
        <TitleBlock eyebrow={eyebrow} title={title} description={subtitle} />
      </div>

      {loading ? (
        <>
          {/* Tab-row skeleton — preserves layout, no spinner flash. */}
          <div className="w-menu-tabs-wrap" aria-hidden="true">
            <div className="w-menu-tabs">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-menu-tab"
                  style={{
                    background: "rgba(0,0,0,0.05)",
                    color: "transparent",
                    minWidth: 96,
                    pointerEvents: "none",
                  }}
                >
                  <span>—</span>
                  <span className="w-menu-tab-count">0</span>
                </div>
              ))}
            </div>
          </div>
          <div
            className="w-menu-grid"
            role="status"
            aria-live="polite"
            aria-label={isAr ? "جارٍ تحميل القائمة" : "Loading menu"}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.04)",
                  minHeight: 360,
                  animation: "wMenuSkeletonPulse 1.4s ease-in-out infinite",
                }}
              />
            ))}
          </div>
          <style jsx>{`
            @keyframes wMenuSkeletonPulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.55; }
            }
          `}</style>
        </>
      ) : (
        <>
          <div className="w-menu-tabs-wrap">
            <div className="w-menu-tabs" role="tablist">
              {categories.map((cat) => {
                const isActive = cat.id === activeCategory;
                const count = previewCountByCategory[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={isActive}
                    className={`w-menu-tab ${isActive ? "active" : ""}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span>{pick(cat, "name", locale)}</span>
                    <span className="w-menu-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="w-menu-empty">
              <div className="w-menu-empty-dot" aria-hidden="true" />
              <p className="w-menu-empty-title">
                {isAr ? "لا توجد أصناف مميزة في هذه الفئة بعد" : "Nothing featured in this category yet"}
              </p>
              <p className="w-menu-empty-sub">
                {isAr ? "جرّب فئة أخرى من الأعلى" : "Try another category above"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleSections.map((section) => (
                <div key={section.id} className="space-y-3">
                  {section.isSubcategory && (
                    <h3 className="text-xl font-bold text-slate-900">{section.name}</h3>
                  )}
                  <div className="w-menu-grid">
                    {section.items.map((item) => (
                      <MenuCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA — drives traffic to the full catalog */}
          <div className="w-menu-cta">
            <div className="w-menu-cta-copy">
              <p className="w-menu-cta-title">
                {isAr ? "هذه مجرد البداية" : "This is just the start"}
              </p>
              <p className="w-menu-cta-note">{ctaNote}</p>
            </div>
            <Link href="/shop" className="w-menu-cta-btn" aria-label={ctaLabel}>
              <span>{ctaLabel}</span>
              <ArrowRight className="w-menu-cta-icon" aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </SectionWrapper>
  );
}
