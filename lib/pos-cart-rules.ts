/**
 * Two till rules that must behave identically however a line reaches the cart — scanned,
 * clicked, or edited. Pure, so both can be reasoned about (and exercised) on their own.
 *
 *   1. When is an incoming line the SAME sellable thing as a line already in the cart?
 *   2. How many units of a product may the cart hold before the shelf is empty?
 */

export interface CartLineIdentity {
    productId: string;
    selectedOptionId?: string | null;
    modifiers?: { id: string; quantity?: number }[];
    recipeAlternatives?: { recipeItemId: string; alternativeId: string }[];
    notes?: string | null;
    isComplimentary?: boolean;
    /** Non-null marks the line as part of an offer bundle. */
    offerLineOfferId?: number | null;
}

function normalizeNotes(value: string | null | undefined): string {
    return value?.trim() ?? "";
}

/** Order-independent signature, so [A,B] and [B,A] compare equal. */
function modifierSignature(modifiers: CartLineIdentity["modifiers"]): string {
    return (modifiers ?? [])
        .map((modifier) => `${modifier.id}:${modifier.quantity ?? 1}`)
        .sort()
        .join("|");
}

function alternativeSignature(alternatives: CartLineIdentity["recipeAlternatives"]): string {
    return (alternatives ?? [])
        .map((alternative) => `${alternative.recipeItemId}:${alternative.alternativeId}`)
        .sort()
        .join("|");
}

/**
 * True only when merging the two lines cannot change what is sold or what it costs.
 *
 * Everything that can move a line's price or its meaning has to match: the product, the
 * variant, the modifier set (with quantities), the recipe swaps, the note printed on the
 * ticket, and whether the line is complimentary.
 *
 * Offer-bundle lines are excluded outright. Their composition is decided by the offer
 * engine when the bundle is added, and collapsing two of them would change the shape the
 * engine allocates against. A scanned line is never part of a bundle, so refusing to merge
 * them costs the cashier nothing and keeps the allocation authoritative.
 */
export function canMergeCartLines(a: CartLineIdentity, b: CartLineIdentity): boolean {
    if (a.offerLineOfferId != null || b.offerLineOfferId != null) return false;
    if (a.productId !== b.productId) return false;
    if ((a.selectedOptionId ?? null) !== (b.selectedOptionId ?? null)) return false;
    if (!!a.isComplimentary !== !!b.isComplimentary) return false;
    if (normalizeNotes(a.notes) !== normalizeNotes(b.notes)) return false;
    if (modifierSignature(a.modifiers) !== modifierSignature(b.modifiers)) return false;
    if (alternativeSignature(a.recipeAlternatives) !== alternativeSignature(b.recipeAlternatives)) return false;
    return true;
}

export type StockCheck =
    | { allowed: true; reason: "untracked" | "within-stock" }
    | { allowed: false; reason: "out-of-stock" | "exceeds-stock"; available: number };

/**
 * Early guard only. The ledger behind `IProductStockLedger.ValidateAvailabilityAsync` stays
 * the authority and still runs at order creation — this exists so the cashier is told at the
 * moment of scanning rather than at checkout.
 *
 * `available === null` means the product is not stock-tracked (an ordinary recipe product),
 * which is deliberately NOT treated as zero.
 *
 * @param alreadyInCart units of this same sellable line already in the cart
 * @param requested     units being added now
 */
export function checkStockForQuantity(
    available: number | null,
    alreadyInCart: number,
    requested: number,
): StockCheck {
    if (available === null) return { allowed: true, reason: "untracked" };
    if (available <= 0) return { allowed: false, reason: "out-of-stock", available: 0 };
    if (alreadyInCart + requested > available) {
        return { allowed: false, reason: "exceeds-stock", available };
    }
    return { allowed: true, reason: "within-stock" };
}
