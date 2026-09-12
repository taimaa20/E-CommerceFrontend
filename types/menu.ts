/**
 * Public Menu Types - Frontend types matching backend PublicMenuDtos.cs
 */

// Category
export interface PublicCategoryDto {
  id: string;
  name: string;
  nameAr?: string;
  displayName: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  subcategories?: PublicSubcategoryDto[];
}

export interface PublicSubcategoryDto {
  id: string;
  categoryId: string;
  name: string;
  nameAr?: string;
  displayName: string;
  displayOrder: number;
  isActive: boolean;
}

// Modifier
export interface PublicModifierDto {
  id: string;
  name: string;
  nameAr?: string;
  displayName: string;
  priceAdjustment: number;
}

// Modifier Group
export interface PublicModifierGroupDto {
  id: string;
  name: string;
  nameAr?: string;
  displayName: string;
  selectionType: number; // 0 = Single, 1 = Multiple
  minSelection: number;
  maxSelection: number;
  modifiers: PublicModifierDto[];
}

// Ingredient Summary
export interface IngredientSummaryDto {
  name: string;
  nameAr?: string;
  displayName: string;
}

// Product
export interface PublicProductDto {
  id: string;
  name: string;
  nameAr?: string;
  displayName: string;
  description?: string;
  descriptionAr?: string;
  calories?: number;
  displayPrice: number;
  basePrice: number;
  originalPrice?: number; // For showing "was" pricing
  categoryId?: string;
  categoryName?: string;
  categoryDisplayName?: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  subcategoryNameAr?: string | null;
  subcategoryDisplayName?: string | null;
  imageUrl?: string;
  /** Optional optimized-image key; see lib/product-image.ts. Absent on legacy rows. */
  imageKey?: string;
  allergens: number; // Flags for Gluten, Dairy, Nuts, etc.
  modifierGroups: PublicModifierGroupDto[];
  ingredients?: IngredientSummaryDto[];
  isAvailable: boolean;
}

// Complete Menu
export interface PublicMenuDto {
  tenantId: string;
  tenantName: string;
  generatedAt: string;
  categories: PublicCategoryDto[];
  products: PublicProductDto[];
}

// Tenant Branding
export interface TenantBrandingDto {
  tenantId: string;
  siteName: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  phoneNumber?: string;
  address?: string;
  allowQrAccess: boolean;
  requireLanguageSelection: boolean;
}

// QR Code Metadata
export interface QrMenuMetadataDto {
  tenantId: string;
  menuUrl: string;
  qrCodeToken: string;
  generatedAt: string;
  expiresAt: string;
  accessCount: number;
  isActive: boolean;
}

// Rate Limit Check
export interface MenuAccessCheckDto {
  clientIdentifier: string;
  endpoint: string;
}

export interface MenuAccessCheckResponseDto {
  isAllowed: boolean;
  remainingRequests: number;
  resetSeconds: number;
  message: string;
}

// Menu Settings (Admin)
export interface TenantMenuSettingsDto {
  id: string;
  tenantId: string;
  menuTitle?: string;
  menuTitleAr?: string;
  menuDescription?: string;
  menuDescriptionAr?: string;
  heroBannerUrl?: string;
  heroBannerTitle?: string;
  heroBannerTitleAr?: string;
  defaultProductImageUrl?: string;
  enableQrAccess: boolean;
  qrCodeDisplayText?: string;
  qrCodeDisplayTextAr?: string;
  showPrices: boolean;
  showAllergenInfo: boolean;
  showIngredientsBreakdown: boolean;
  requireLanguageSelection: boolean;
  allowArabic: boolean;
  allowEnglish: boolean;
  enableCategoryFilter: boolean;
  enableSearch: boolean;
  enableSort: boolean;
  themePrimaryColor?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
