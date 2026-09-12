# Mobile Public Menu Backend APIs

This document is for the mobile team. It describes the backend APIs needed to build the same public menu experience as `/menu`.

## Backend Base URL

Local backend:

```txt
https://localhost:7142
```

Production backend:

```txt
{BACKEND_URL}
```

All endpoints below are backend endpoints:

```txt
{BACKEND_URL}/api/...
```

Do not use the frontend proxy path `/api/api-proxy` in the mobile app.

## Public Request Headers

English:

```http
Accept-Language: en
Content-Type: application/json
```

Arabic:

```http
Accept-Language: ar
Content-Type: application/json
```

Do not send `Authorization` for the public menu customer flow.

## Required APIs

### 1. Public Products

```txt
GET /api/products/public
```

Use this as the main product menu API.

It returns:

- Product cards
- Product detail data
- Prices
- Images
- Availability
- Coming soon state
- Extras / modifiers
- Ingredients
- Ingredient alternatives

Response shape:

```ts
type ProductDto = {
  id: string;
  name: string;
  nameAr?: string;
  displayName: string;
  description?: string;
  descriptionAr?: string;
  calories?: number;

  basePrice: number;
  discountedPrice?: number;
  discountPercentage: number;
  customPrice?: number | null;
  useCustomPrice: boolean;
  displayPrice: number;

  isActive: boolean;
  isSoon: boolean;
  isAvailableNow: boolean;

  categoryId?: string | null;
  categoryName?: string;
  categoryNameAr?: string;
  categoryDisplayName?: string;

  allergens: number;
  imageUrl?: string;
  imageKey?: string;

  availableStartDate?: string | null;
  availableEndDate?: string | null;
  availableFrom?: string | null;
  availableTo?: string | null;

  modifierGroups: ModifierGroupDto[];
  recipeItems: RecipeItemDto[];
};
```

Display price rule:

```ts
const shownPrice =
  product.useCustomPrice && product.customPrice != null
    ? product.customPrice
    : product.displayPrice ?? product.discountedPrice ?? product.basePrice;
```

Public behavior:

- If `isSoon === true`, show coming soon and disable ordering.
- If `isAvailableNow === false`, show unavailable and disable ordering.
- Use `nameAr || name` in Arabic.
- Use `descriptionAr || description` in Arabic.
- Use `categoryNameAr || categoryName` in Arabic.

### 2. Public Categories

```txt
GET /api/categories/public
```

Use this for:

- Category tabs
- Grouping products
- Category section headers
- Category order

Response shape:

```ts
type CategoryDto = {
  id: string;
  name: string;
  nameAr?: string;
  displayName?: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
};
```

Mobile behavior:

```ts
const activeCategories = categories
  .filter((category) => category.isActive)
  .sort((a, b) => a.sortOrder - b.sortOrder);
```

Group products with:

```ts
product.categoryId === category.id
```

### 3. Public Available Offers

```txt
GET /api/offers/public/available
```

Use this for the menu offers tab and offer cards.

This endpoint returns only active offers that are available right now by date/time.

Response shape:

```ts
type OfferResponseDto = {
  id: number;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  imageUrl?: string;

  discountType: number;
  discountValue: number;

  finalPrice: number;
  originalTotal: number;

  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;

  isActive: boolean;
  isAvailableNow: boolean;

  products: OfferProductDto[];
};

type OfferProductDto = {
  productId: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  calories?: number;
  allergens: number;
  quantity: number;
  price: number;
  isSoon: boolean;
};
```

Discount type:

```txt
0 = Fixed
1 = Percentage
```

Display behavior:

- Show `finalPrice` as the offer price.
- Show `originalTotal` as the crossed-out original price.
- Show `products[]` as the included items.
- Use `nameAr || name` in Arabic.

### 4. Public Settings

```txt
GET /api/settings
```

Use this for:

- Restaurant name
- Currency
- Tax rate
- Service charge rate
- QR menu URL

Important fields:

```ts
type SystemSettings = {
  restaurantName: string;
  currency: string;
  taxRate: number;
  serviceChargeRate: number;
  qrMenuUrl?: string | null;
};
```

### 5. Public Tenant Branding

```txt
GET /api/tenants/branding
```

Use this for:

- Logo
- Business name
- Theme colors

Response shape:

```ts
type BrandingConfig = {
  logoUrl?: string | null;
  businessName?: string | null;
  primaryColor?: string;
  primaryForeground?: string;
  accentColor?: string;
  updatedAt?: string | null;
};
```

## Extras / Modifiers

Extras are included inside:

```txt
GET /api/products/public
```

Path:

```ts
product.modifierGroups[]
```

Shape:

```ts
type ModifierGroupDto = {
  id: string;
  name: string;
  nameAr?: string;
  displayName: string;

  selectionType: number;
  displayType: number;

  minSelection: number;
  maxSelection: number;
  isRequired: boolean;

  modifiers: ModifierDto[];
};

type ModifierDto = {
  id: string;
  name: string;
  nameAr?: string;
  displayName: string;
  priceAdjustment: number;
  pricingType: number;
  isFree: boolean;
  freeQuantityLimit: number;
  isDefault: boolean;
  isActive: boolean;
  maxQuantity: number;
};
```

Selection behavior:

```txt
selectionType = 0 -> single choice
selectionType = 1 -> multiple choice
displayType = 0 -> radio
displayType = 1 -> checkbox
displayType = 2 -> quantity selector
```

Validation:

- If `minSelection > 0`, the group is required.
- If `maxSelection > 0`, do not allow more than `maxSelection`.
- Only show modifiers where `isActive === true`.
- Add `priceAdjustment` to the item price when selected.

Order payload modifier:

```ts
{
  modifierId: "modifier-guid",
  modifierName: "Extra Cheese",
  modifierNameAr: "جبنة إضافية",
  price: 1.5,
  quantity: 1
}
```

## Ingredients

Ingredients are included inside:

```txt
GET /api/products/public
```

Path:

```ts
product.recipeItems[]
```

Shape:

```ts
type RecipeItemDto = {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialNameAr?: string;
  amount: number;
  unit: string;
  alternatives: RecipeItemAlternativeDto[];
};
```

Display behavior:

- Use `rawMaterialNameAr || rawMaterialName` in Arabic.
- Use `rawMaterialName` in English.
- Hide ingredients for `useCustomPrice === true` if matching the current public web menu behavior.

## Ingredient Alternatives

Ingredient alternatives are included inside:

```txt
GET /api/products/public
```

Path:

```ts
product.recipeItems[].alternatives[]
```

Shape:

```ts
type RecipeItemAlternativeDto = {
  id: string;
  recipeItemId: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialNameAr?: string;

  name?: string | null;
  nameAr?: string | null;

  amount: number;
  unit: string;
  priceAdjustment: number;

  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};
```

Behavior:

- Show only `isActive === true`.
- Sort by `sortOrder`.
- Use `nameAr || rawMaterialNameAr || name || rawMaterialName` in Arabic.
- Use `name || rawMaterialName` in English.
- `priceAdjustment` changes the item price when selected.
- The selected alternative replaces exactly one ingredient.

Order payload alternative:

```ts
{
  recipeItemId: "original-recipe-item-guid",
  alternativeId: "alternative-guid"
}
```

## Product Options / Variants

Current backend status:

```txt
GET /api/productoptions/product/{productId}
```

This endpoint exists, but it is private and requires authentication.

Do not use it in the public mobile app.

Current public gap:

- `/api/products/public` includes modifiers, ingredients, and ingredient alternatives.
- `/api/products/public` does not currently expose product options / variants.

If the mobile public menu needs variants like `Pita`, `Saj`, `Small`, `Large`, the backend should expose them publicly by adding `options` to:

```txt
GET /api/products/public
```

Expected option shape:

```ts
type ProductOptionDto = {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  recipeItems: ProductOptionRecipeItemDto[];
};
```

Ordering already supports variants with:

```ts
selectedOptionId: "option-guid"
```

Variant behavior:

- If `selectedOptionId` is sent, option price replaces the product base price.
- Option recipe replaces the product recipe.
- Ingredient alternatives are ignored when an option is selected.

## Public Order Creation

Only needed if the mobile app allows customer ordering.

```txt
POST /api/orders/public
```

Takeaway payload:

```ts
{
  tableId: null,
  tableName: "TAKEAWAY",
  orderType: 1,
  discountPercentage: 0,
  serviceChargeRate: 0,
  taxRate: 0,
  offerId: null,
  offerQty: null,
  offerNote: null,
  customerPhone: "optional",
  items: [
    {
      productId: "product-guid",
      productName: "Chicken Sandwich",
      quantity: 1,
      price: 10.0,
      notes: "No onion",
      selectedOptionId: null,
      selectedRecipeAlternatives: [
        {
          recipeItemId: "recipe-item-guid",
          alternativeId: "alternative-guid"
        }
      ],
      modifiers: [
        {
          modifierId: "modifier-guid",
          modifierName: "Extra Cheese",
          modifierNameAr: "جبنة إضافية",
          price: 1.5,
          quantity: 1
        }
      ]
    }
  ]
}
```

Dine-in QR table payload:

```ts
{
  tableId: "table-guid",
  tableName: "Table 1",
  orderType: 0,
  discountPercentage: 0,
  serviceChargeRate: 0,
  taxRate: 0,
  items: []
}
```

Order type:

```txt
0 = DineIn
1 = Takeaway
```

## Ordering An Offer

Offer order payload should include:

```ts
{
  offerId: 12,
  offerQty: 1,
  offerNote: "optional",
  items: [
    {
      productId: "included-product-guid",
      productName: "Chicken Sandwich",
      quantity: 1,
      price: 0,
      offerLineId: 12,
      offerLineName: "Employee Offer",
      offerLineNameAr: "عرض الموظفين",
      modifiers: []
    }
  ]
}
```

Backend recalculates offer unit pricing from `offerLineId` and `offerId`.

## Table QR Menu APIs

Only needed for table QR flows.

### Public Table Info

```txt
GET /api/tables/{tableId}/public
```

### Active Table Orders

```txt
GET /api/orders/table/{tableId}/active?ticketId={ticketId}
```

### All Table Session Orders

```txt
GET /api/orders/table/{tableId}/all?ticketId={ticketId}
```

## Order Tracker

```txt
GET /api/orders/tracker
```

Response shape:

```ts
type TrackerOrderDto = {
  id: string;
  orderNumber: string;
  orderType: "DineIn" | "Takeaway";
  status: "Preparing" | "Ready";
  isPaid: boolean;
  createdAt: string;
};
```

## Optional Backend APIs

### Full Public Menu Bundle

```txt
GET /api/menu/public?language=en
```

This returns categories and products together.

For the mobile app, prefer:

```txt
GET /api/products/public
GET /api/categories/public
```

because `/api/products/public` is the richer product contract used by the current public menu UI.

### All Public Offers

```txt
GET /api/offers/public
```

Returns active offers, including offers that may not be available right now by schedule.

### Public Offer Summary

```txt
GET /api/offers/public?mode=summary
```

Used by the informative website for lightweight offer cards.

### Public Menu Branding

```txt
GET /api/menu/public/branding
```

Alternative menu-specific branding endpoint.

## Image URL Behavior

Products may have:

```ts
imageUrl?: string;
imageKey?: string;
```

If `imageKey` exists, optimized variants follow this convention:

```txt
{BACKEND_URL}/uploads/images/{imageKey}-thumb.webp
{BACKEND_URL}/uploads/images/{imageKey}-medium.webp
{BACKEND_URL}/uploads/images/{imageKey}-full.webp
```

Fallback to `imageUrl` if `imageKey` is missing.

Suggested usage:

```txt
thumb  -> small list/card thumbnails
medium -> grid cards
full   -> detail page hero image
```

## Mobile App Startup Flow

On menu screen load, fetch in parallel:

```txt
GET /api/settings
GET /api/tenants/branding
GET /api/categories/public
GET /api/products/public
GET /api/offers/public/available
```

Then:

1. Sort categories by `sortOrder`.
2. Group products by `categoryId`.
3. Show offers if the offers list is not empty.
4. Filter search by `name`, `nameAr`, `displayName`, and `description`.
5. Disable ordering for unavailable or coming-soon products.

## Private APIs To Avoid In Public Mobile App

These endpoints are private/staff/admin and must not be used in the public mobile menu:

```txt
GET /api/products
GET /api/categories
GET /api/offers
GET /api/tables
GET /api/orders/takeaway/active
GET /api/productoptions/product/{productId}
GET /api/recipeitemalternatives/recipeitem/{recipeItemId}
```
