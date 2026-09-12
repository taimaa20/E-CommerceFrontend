import type { ProductDto } from "@/types/pos";

/**
 * Resolving a typed or scanned code to one sellable product, for the till.
 *
 * A barcode scanner behaves as a keyboard: it types the code into whatever field has focus
 * and presses Enter. So there is no separate "scanner mode" — the same search box handles a
 * cashier typing "dior" and a scanner firing "3348900418875".
 *
 * Everything here is pure so the rules can be reasoned about (and exercised) without a POS.
 */

/** Codes are compared case-insensitively with surrounding whitespace removed. Scanners
 *  routinely append CR/LF and some prepend a prefix character; trim covers both. */
export function normalizeCode(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? "";
}

export type CodeMatchKind = "none" | "single" | "ambiguous";

export interface CodeMatchResult {
    kind: CodeMatchKind;
    /** Empty for "none", one entry for "single", two or more for "ambiguous". */
    matches: ProductDto[];
}

/**
 * Exact barcode/SKU match — never a partial one. A scanned code that merely appears inside
 * some other product's SKU must not ring that product up, so this deliberately does not use
 * `includes`. Barcode is checked before SKU because a scanner emits barcodes.
 *
 * More than one hit is reported as ambiguous rather than silently resolved: two products
 * sharing a barcode is a data error, and picking one of them at the till would sell the
 * wrong item and relieve the wrong stock.
 */
export function findProductsByCode(products: ProductDto[], code: string): CodeMatchResult {
    const needle = normalizeCode(code);
    if (!needle) return { kind: "none", matches: [] };

    const byBarcode = products.filter((product) => normalizeCode(product.retail?.barcode) === needle);
    const matches = byBarcode.length > 0
        ? byBarcode
        : products.filter((product) => normalizeCode(product.retail?.sku) === needle);

    if (matches.length === 0) return { kind: "none", matches: [] };
    if (matches.length === 1) return { kind: "single", matches };
    return { kind: "ambiguous", matches };
}

/**
 * True when the cashier must be asked something before the line can be priced — an option
 * (which replaces the base price), a modifier group, or a recipe row with alternatives.
 *
 * A scan that lands on such a product opens the normal product dialog instead of adding
 * straight to the cart. Matching the parent product is NOT permission to pick a variant for
 * the customer: the price and the stock relieved both depend on that choice.
 */
export function productRequiresChoice(product: ProductDto): boolean {
    const hasOption = (product.options ?? []).some((option) => option.isActive);
    const hasModifierGroup = (product.modifierGroups ?? []).length > 0;
    const hasRecipeAlternative = (product.recipeItems ?? []).some(
        (item) => (item.alternatives ?? []).some((alternative) => alternative.isActive),
    );
    return hasOption || hasModifierGroup || hasRecipeAlternative;
}

/** Stock on hand for a ledger-tracked retail product. `null` means the product is not
 *  stock-tracked (an ordinary recipe product), which is not the same as "none left". */
export function stockOnHandOf(product: ProductDto): number | null {
    return product.retail ? product.retail.stockOnHand : null;
}
