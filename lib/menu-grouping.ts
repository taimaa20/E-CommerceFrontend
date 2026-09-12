import type { CategoryDto, ProductDto } from "@/types/pos";
import type { Locale } from "@/lib/translations";

export interface ProductSubcategorySection {
  id: string;
  name: string;
  items: ProductDto[];
  isSubcategory: boolean;
}

const pickName = (locale: Locale, name?: string | null, nameAr?: string | null) =>
  locale === "ar" ? (nameAr || name || "") : (name || nameAr || "");

const otherName = (locale: Locale) =>
  locale === "ar" ? "أخرى" : "Other";

export function buildProductSubcategorySections(
  category: CategoryDto | undefined,
  products: ProductDto[],
  locale: Locale,
  fallbackCategoryName: string,
): ProductSubcategorySection[] {
  const subcategories = [...(category?.subcategories || [])]
    .filter((subcategory) => subcategory.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  if (subcategories.length === 0) {
    return [{ id: category?.id || "__category__", name: fallbackCategoryName, items: products, isSubcategory: false }];
  }

  const activeIds = new Set(subcategories.map((subcategory) => subcategory.id));
  const sections = subcategories
    .map((subcategory) => ({
      id: subcategory.id,
      name: pickName(locale, subcategory.name, subcategory.nameAr),
      items: products.filter((product) => product.subcategoryId === subcategory.id),
      isSubcategory: true,
    }))
    .filter((section) => section.items.length > 0);

  const directProducts = products.filter((product) => !product.subcategoryId || !activeIds.has(product.subcategoryId));
  if (directProducts.length > 0) {
    sections.push({
      id: `${category?.id || "__category__"}:other`,
      name: otherName(locale),
      items: directProducts,
      isSubcategory: true,
    });
  }

  return sections;
}
