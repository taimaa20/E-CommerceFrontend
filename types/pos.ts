import type { RetailProductDetail } from "@/types/retail";

export enum StationType {
  Kitchen = 0,
  Bar = 1
}

export enum StationRouting {
  KitchenOnly = 0,
  BarOnly = 1,
  Both = 2
}

export enum AllergenType {
  None = 0,
  Gluten = 1,
  Dairy = 2,
  Nuts = 4,
  Eggs = 8,
  Fish = 16,
  Shellfish = 32,
  Soy = 64,
  Sesame = 128
}

/** One gallery image beside the product's primary image. */
export interface ProductImageDto {
  id: string;
  imageUrl: string;
  imageKey?: string;
  altText?: string;
  sortOrder: number;
}

/** A hand-picked storefront "you may also like" product, as the admin product form lists it. */
export interface ProductRelatedProductDto {
  productId: string;
  name: string;
  nameAr?: string;
  imageUrl?: string;
  imageKey?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ProductDto {
  id: string; // Guid
  name: string;
  nameAr?: string;
  displayName?: string;
  description?: string;
  descriptionAr?: string;
  calories?: number;
  basePrice: number;
  costPrice?: number;
  pricingMode?: "manual" | "margin" | "multiplier";
  markup?: number;
  markupType?: "multiplier" | "percentage" | "fixed";
  profitAmount?: number;
  profitMargin?: number;
  profitMultiplier?: number;
  discountPercentage?: number;
  discountedPrice?: number;
  // Promotional pricing — public menu / informative website only.
  // POS, cart, and order math continue to use basePrice / discountedPrice.
  customPrice?: number | null;
  useCustomPrice?: boolean;
  /** Server-computed price for menu/website rendering. Falls back to basePrice. */
  displayPrice?: number;
  deliveryPartnerId?: string | null;
  deliveryPartnerName?: string | null;
  deliveryPartnerNameAr?: string | null;
  deliveryPartnerCode?: string | null;
  partnerPrice?: number | null;
  priceSource?: string | null;
  isActive: boolean;
  status?: string;
  // UI-only "Coming Soon" flag — used by /menu and the informative website.
  // POS and order flows ignore this; pricing/APIs are unchanged.
  isSoon?: boolean;
  categoryId?: string | null;
  categoryName?: string;
  categoryNameAr?: string;
  categoryDisplayName?: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  subcategoryNameAr?: string | null;
  subcategoryDisplayName?: string | null;
  allergens: number; // AllergenType as int (flags)
  stationRouting: number; // StationRouting as int
  printerIds?: string; // JSON string
  // Multi-kitchen routing target. Null = falls back to the tenant's default
  // kitchen (lowest-SortOrder active Kitchen) at print time.
  kitchenId?: string | null;
  kitchenName?: string | null;
  kitchenNameAr?: string | null;
  // Multi-printer assignment. When allKitchenPrinters is true, the product
  // prints on every active kitchen printer and kitchenPrinterIds is ignored.
  allKitchenPrinters?: boolean;
  kitchenPrinterIds?: string[];
  imageUrl?: string;
  /**
   * Optimized-image key. When present, UI code should prefer the WebP variant
   * set (thumb/medium/full) via `lib/product-image.ts`. When absent (legacy
   * rows), callers fall back to `imageUrl`. Optional to preserve wire-compat
   * with older backend responses.
   */
  imageKey?: string;
  /**
   * Additional storefront gallery images, in display order. Populated by the ADMIN
   * product endpoints only — cashier and public-menu payloads leave it empty, so an
   * empty array means "single-image product", never "images failed to load".
   */
  images?: ProductImageDto[];
  preparationStation: number; // Legacy field
  isAvailableNow: boolean;
  availableStartDate?: string | null;
  availableEndDate?: string | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  modifierGroups: ModifierGroupDto[];
  recipeItems?: RecipeItemDto[];
  options?: ProductOptionDto[];
  /**
   * Retail attributes (SKU, barcode, brand, supplier, retail costing/stock). Absent for
   * ordinary restaurant products — its presence is the only signal a screen needs.
   */
  retail?: RetailProductDetail | null;
}

export interface ProductOptionRecipeItemDto {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialNameAr?: string;
  showInMenu?: boolean;
  isPostPrice?: boolean;
  amount: number;
  unit: string;
  unitCost?: number;
  totalCost?: number;
}

export interface ProductOptionDto {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  recipeItems: ProductOptionRecipeItemDto[];
}

export interface ProductOptionCreateDto {
  productId: string;
  name: string;
  nameAr?: string;
  price: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface ProductOptionUpdateDto {
  name: string;
  nameAr?: string;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface ProductOptionRecipeItemCreateDto {
  productOptionId: string;
  rawMaterialId: string;
  amount: number;
}

export interface ModifierGroupDto {
  id: string;
  name: string;
  nameAr?: string;
  displayName?: string;
  selectionType: number; // 0 = Single, 1 = Multiple
  minSelection: number;
  maxSelection: number;
  isShared?: boolean;
  displayType: number; // 0=Radio, 1=Checkbox, 2=QuantitySelector
  isRequired: boolean;
  availableForOrderTypes: number; // Flags: DineIn=1, Takeaway=2, Delivery=4, All=7
  printOnReceipt: boolean;
  printInKitchen: boolean;
  modifiers: ModifierDto[];
}

export interface ModifierGroupLibraryDto {
  id: string;
  name: string;
  nameAr?: string;
  selectionType: number;
  minSelection: number;
  maxSelection: number;
  displayType: number;
  isRequired: boolean;
  availableForOrderTypes: number;
  printOnReceipt: boolean;
  printInKitchen: boolean;
  modifiers: ModifierDto[];
  usedByProducts: { productId: string; productName: string }[];
}

export interface ModifierDto {
  id: string;
  name: string;
  nameAr?: string;
  displayName?: string;
  priceAdjustment: number;
  isDefault?: boolean;
  isActive?: boolean;
  pricingType: number; // 0=Fixed, 1=Percentage, 2=Included
  isFree: boolean;
  freeQuantityLimit: number;
  maxQuantity: number;
  linkedRawMaterialId?: string;
  linkedProductId?: string;
  linkedMaterialAmount: number;
  recipeItems?: ModifierRecipeItemDto[];
}

export interface ModifierRecipeItemDto {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialNameAr?: string;
  amount: number;
  unit: string;
}

export interface RecipeItemDto {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialNameAr?: string;
  showInMenu?: boolean;
  /** Mirrors RawMaterial.IsPostPrice. UI-only flag — pricing logic is unchanged. */
  isPostPrice?: boolean;
  amount: number;
  // Arrives from the API as the Unit enum name (e.g. "Gram", "Kilogram") and
  // from optimistic local creates as the numeric index ("0", "1"). Both forms
  // are accepted by `getTranslatedUnit` — never parseInt this field directly.
  unit: string;
  unitCost?: number;
  totalCost?: number;
  /** Ingredient-level swap choices. Empty ⇒ this row is not swappable. */
  alternatives?: RecipeItemAlternativeDto[];
}

export interface RecipeItemAlternativeDto {
  id: string;
  recipeItemId: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialNameAr?: string;
  /** Optional display override; falls back to rawMaterialName. */
  name?: string | null;
  nameAr?: string | null;
  amount: number;
  unit: string;
  /** Replacement price for this recipe row when the alternative is selected. */
  priceAdjustment: number;
  alternativePricingType?: RecipeItemAlternativePricingType;
  customerAdditionalPrice?: number | null;
  fixedOverridePrice?: number | null;
  customerPriceImpact?: number;
  costImpact?: number;
  unitCost?: number;
  totalCost?: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface RecipeItemAlternativeCreateDto {
  recipeItemId: string;
  rawMaterialId: string;
  name?: string | null;
  nameAr?: string | null;
  amount: number;
  priceAdjustment?: number;
  alternativePricingType?: RecipeItemAlternativePricingType;
  customerAdditionalPrice?: number | null;
  fixedOverridePrice?: number | null;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface RecipeItemAlternativeUpdateDto {
  rawMaterialId: string;
  name?: string | null;
  nameAr?: string | null;
  amount: number;
  priceAdjustment: number;
  alternativePricingType?: RecipeItemAlternativePricingType;
  customerAdditionalPrice?: number | null;
  fixedOverridePrice?: number | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export enum RecipeItemAlternativePricingType {
  Included = 0,
  PriceDifference = 1,
  FixedOverride = 2,
}

/** Wire contract for a swap chosen at order time. */
export interface SelectedRecipeAlternativeDto {
  recipeItemId: string;
  alternativeId: string;
}

export enum TableStatus {
  Free = 0,
  Occupied = 1,
  Reserved = 2
}

export interface TableCategoryDto {
  id: string;
  name: string;
  nameAr?: string;
  displayName?: string;
  color?: string;
  tableCount: number;
}

export interface Table {
  id: string;
  name: string;
  nameAr?: string;
  displayName?: string;
  capacity: number;
  status: TableStatus;
  // Mirrors Table.CurrentTicketId from the backend.
  // null/undefined/0 = no active session; any positive value identifies the live ticket.
  currentTicketId?: number | null;
  tableCategoryId?: string;
  categoryName?: string;
  categoryColor?: string;
}

export enum CategoryDisplayMode {
  Grid = 0,
  List = 1,
  ListNoImage = 2,
  CardCarousel = 3
}

export interface CategoryDto {
  id: string;
  name: string;
  nameAr?: string;
  displayName?: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  displayMode: CategoryDisplayMode;
  isActive: boolean;
  subcategories?: SubcategoryDto[];
}

export interface SubcategoryDto {
  id: string;
  categoryId: string;
  name: string;
  nameAr?: string | null;
  displayName?: string;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
}
