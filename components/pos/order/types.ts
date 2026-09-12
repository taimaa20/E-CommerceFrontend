import type { ProductDto } from "@/types/pos";

export interface ProductCategoryTab {
  id: string;
  label: string;
  count: number;
  variant?: "default" | "offer";
}

export interface ProductSelectionLabels {
  allCategories: string;
  containsAllergens: string;
  noProducts: string;
  options: string;
  quickView: string;
  searchPlaceholder: string;
  unavailable: string;
  /** Retail stock wording. Absent stock (a non-tracked product) shows none of these. */
  inStock: string;
  lowStock: string;
  outOfStock: string;
}

export interface ProductActionProps {
  onProductSelect: (product: ProductDto) => void;
  onProductQuickView: (product: ProductDto) => void;
}
