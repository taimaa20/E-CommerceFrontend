import type { OrderDto, OrderItemDto, OrderOfferProductDto } from "@/types/order";

export interface OfferCartDisplayItem {
  cartId: string;
  quantity: number;
  totalPrice: number;
  isComplimentary?: boolean;
  offerLineOfferId?: number | null;
  product: {
    id: string;
    name: string;
    nameAr?: string;
    displayName?: string;
  };
}

export interface CartOfferGroup<T extends OfferCartDisplayItem> {
  offerId: number;
  items: T[];
  offerTotal: number;
}

export function splitCartItemsForOfferDisplay<T extends OfferCartDisplayItem>(
  items: T[],
) {
  // Collect distinct offer IDs in insertion order
  const seenIds = new Set<number>();
  for (const item of items) {
    if (item.offerLineOfferId != null) seenIds.add(item.offerLineOfferId);
  }

  const offerGroups: CartOfferGroup<T>[] = [];
  for (const offerId of seenIds) {
    const groupItems = items.filter((i) => i.offerLineOfferId === offerId);
    const offerTotal = Number(
      groupItems
        .reduce((sum, i) => sum + (i.isComplimentary ? 0 : i.totalPrice), 0)
        .toFixed(2),
    );
    offerGroups.push({ offerId, items: groupItems, offerTotal });
  }

  const regularItems = items.filter((i) => i.offerLineOfferId == null);

  return {
    offerGroups,
    regularItems,
  };
}

export function splitOrderItemsForOfferDisplay(
  order: Pick<OrderDto, "offerId" | "offerProducts" | "items">,
): {
  offerBundles: OrderItemDto[];
  offerCoveredTotal: number;
  regularItems: OrderItemDto[];
} {
  // New behavior: backend already returned bundle items (supports multiple offers)
  const offerBundles = (order.items ?? []).filter((item) => item.isOfferBundle);
  if (offerBundles.length > 0) {
    const offerCoveredTotal = offerBundles.reduce((sum, item) => sum + (item.lineTotalAmount ?? 0), 0);
    return {
      offerBundles,
      offerCoveredTotal: Number(offerCoveredTotal.toFixed(2)),
      regularItems: order.items?.filter((item) => !item.isOfferBundle) ?? []
    };
  }

  // Legacy behavior: if no offer bundle from backend, return all items as-is
  // This handles cases where backend hasn't been updated or offer display is disabled
  if (!order.offerId) {
    return { offerBundles: [], offerCoveredTotal: 0, regularItems: order.items ?? [] };
  }

  const coveredQuantities = new Map<string, number>();
  for (const offerProduct of order.offerProducts || []) {
    coveredQuantities.set(
      offerProduct.productId,
      (coveredQuantities.get(offerProduct.productId) ?? 0) + offerProduct.quantity,
    );
  }

  let offerCoveredTotal = 0;
  const regularItems: OrderItemDto[] = [];

  for (const item of order.items || []) {
    const quantity = item.quantity ?? 0;
    const lineTotalAmount = item.lineTotalAmount ?? 0;
    const unitLineAmount = quantity > 0 ? lineTotalAmount / quantity : 0;
    const hasCustomizations = !!item.notes || (item.modifiers?.length ?? 0) > 0;
    const productId = item.productId ?? "";

    let coveredQuantity = 0;
    if (!hasCustomizations && productId) {
      const remainingCoveredQuantity = coveredQuantities.get(productId) ?? 0;
      if (remainingCoveredQuantity > 0) {
        coveredQuantity = Math.min(remainingCoveredQuantity, quantity);
        coveredQuantities.set(productId, remainingCoveredQuantity - coveredQuantity);
      }
    }

    if (coveredQuantity > 0) {
      offerCoveredTotal += unitLineAmount * coveredQuantity;
    }

    const extraQuantity = quantity - coveredQuantity;
    if (extraQuantity > 0) {
      regularItems.push({
        ...item,
        quantity: extraQuantity,
        lineTotalAmount: item.isComplimentary ? 0 : Number((unitLineAmount * extraQuantity).toFixed(2)),
      });
    }
  }

  // Fallback: offerId is set but no items were matched to offer products.
  // This happens when offerProducts is empty (e.g. offer deleted, or API gap).
  // Treat all order items as part of the offer so they display grouped correctly.
  if (offerCoveredTotal === 0 && regularItems.length > 0 && (order.items?.length ?? 0) > 0) {
    const fallbackTotal = (order.items ?? []).reduce(
      (sum, item) => sum + (item.lineTotalAmount ?? 0),
      0,
    );
    return {
      offerBundles: [],
      offerCoveredTotal: Number(fallbackTotal.toFixed(2)),
      regularItems: [],
    };
  }

  return {
    offerBundles: [],
    offerCoveredTotal: Number(offerCoveredTotal.toFixed(2)),
    regularItems,
  };
}

export function buildOfferContentsSummary(
  products: OrderOfferProductDto[],
  locale: string,
) {
  return products
    .map((product) => {
      const name = locale === "ar"
        ? (product.nameAr || product.name)
        : (product.name || product.nameAr);
      return `${product.quantity}× ${name}`;
    })
    .join(" • ");
}
