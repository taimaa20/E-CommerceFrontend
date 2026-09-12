import type { SelectedRecipeAlternativeDto } from "@/types/order";
import type { ProductDto, RecipeItemAlternativeDto, RecipeItemDto } from "@/types/pos";
import { RecipeItemAlternativePricingType } from "@/types/pos";

const getRecipeRowPrice = (row: RecipeItemDto): number =>
  row.totalCost ?? ((row.unitCost ?? 0) * row.amount);

export const resolveRecipeAlternativePriceImpactForRow = (
  product: ProductDto,
  row: RecipeItemDto,
  alt: RecipeItemAlternativeDto,
): number => {
  if (typeof alt.customerPriceImpact === "number") return alt.customerPriceImpact;

  const pricingType = alt.alternativePricingType ?? RecipeItemAlternativePricingType.PriceDifference;
  if (pricingType === RecipeItemAlternativePricingType.Included) return 0;
  if (pricingType === RecipeItemAlternativePricingType.FixedOverride) {
    const basePrice = product.discountedPrice ?? product.basePrice;
    return (alt.fixedOverridePrice ?? alt.priceAdjustment) - basePrice;
  }

  return alt.customerAdditionalPrice ?? (alt.priceAdjustment - getRecipeRowPrice(row));
};

export const resolveRecipeAlternativePriceLabel = (
  impact: number,
  formatPrice: (amount: number) => string,
): string | null => {
  if (impact === 0) return null;
  return `${impact > 0 ? "+" : ""}${formatPrice(impact)}`;
};

export const resolveRecipeAlternativePriceImpact = (
  product: ProductDto,
  selectedAlternatives?: SelectedRecipeAlternativeDto[],
): number => {
  if (!selectedAlternatives?.length) return 0;

  let priceImpact = 0;
  let fixedOverrideImpact: number | null = null;

  for (const swap of selectedAlternatives) {
    const row = product.recipeItems?.find((ri) => ri.id === swap.recipeItemId);
    const alt = row?.alternatives?.find((a) => a.id === swap.alternativeId);
    if (!row || !alt?.isActive) continue;

    const impact = resolveRecipeAlternativePriceImpactForRow(product, row, alt);
    if ((alt.alternativePricingType ?? RecipeItemAlternativePricingType.PriceDifference) === RecipeItemAlternativePricingType.FixedOverride) {
      fixedOverrideImpact = Math.max(fixedOverrideImpact ?? impact, impact);
      continue;
    }

    priceImpact += impact;
  }

  return priceImpact + (fixedOverrideImpact ?? 0);
};
