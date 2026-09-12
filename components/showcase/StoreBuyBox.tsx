"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { productImage } from "@/lib/product-image";
import { createStoreText } from "@/lib/store-copy";
import type { CartItem } from "@/store/cartStore";
import type { ProductDto } from "@/types/pos";

/**
 * The buy panel of the product page: option, modifiers, quantity and add-to-cart.
 *
 * The pricing, option-override and modifier-validation rules are carried over unchanged
 * from the previous detail sheet — this component only changed where it is rendered, never
 * what a line ends up costing.
 */
export default function StoreBuyBox({
    product,
    maxQuantity,
    available,
    isAr,
    format,
    onAdd,
    justAdded,
}: {
    product: ProductDto;
    maxQuantity?: number;
    available: boolean;
    isAr: boolean;
    format: (amount: number) => string;
    onAdd: (item: CartItem) => void;
    justAdded: boolean;
}) {
    const text = createStoreText(isAr);
    const options = product.options?.filter(option => option.isActive) ?? [];
    const [optionId, setOptionId] = useState(options.find(option => option.isDefault)?.id ?? options[0]?.id);
    const [selected, setSelected] = useState<string[]>([]);
    const [quantity, setQuantity] = useState(1);
    const option = options.find(row => row.id === optionId);
    const groups = (product.modifierGroups ?? []).map(group => ({ ...group, modifiers: group.modifiers.filter(row => row.isActive !== false) }));
    const modifiers = groups.flatMap(group => group.modifiers.filter(row => selected.includes(row.id)).map(row => ({
        modifierId: row.id, modifierName: row.name, modifierNameAr: row.nameAr,
        price: row.isFree || row.pricingType === 2 ? 0 : row.pricingType === 1 ? Math.round((product.discountedPrice ?? product.basePrice) * row.priceAdjustment) / 100 : row.priceAdjustment,
        quantity: 1,
    })));
    const recipeOverride = groups.some(group => group.modifiers.some(row => selected.includes(row.id) && (row.recipeItems?.length ?? 0) > 0));
    const price = option?.price ?? (recipeOverride ? 0 : product.discountedPrice ?? product.basePrice);
    const valid = groups.every(group => {
        const count = group.modifiers.filter(row => selected.includes(row.id)).length;
        return count >= Math.max(group.minSelection, group.isRequired ? 1 : 0) && (group.maxSelection <= 0 || count <= group.maxSelection);
    });
    const unitPrice = price + modifiers.reduce((sum, row) => sum + row.price, 0);
    const toggle = (id: string, group: typeof groups[number]) => {
        setSelected(current => current.includes(id) ? current.filter(value => value !== id)
            : group.selectionType === 0 ? [...current.filter(value => !group.modifiers.some(row => row.id === value)), id]
            : group.maxSelection > 0 && group.modifiers.filter(row => current.includes(row.id)).length >= group.maxSelection ? current : [...current, id]);
    };
    const canAdd = available && valid && (maxQuantity == null || quantity <= maxQuantity);

    return (
        <div className="space-y-5">
            {options.length > 0 && (
                <fieldset>
                    <legend className="sf-label mb-2 p-0">{text("options")}</legend>
                    <div className="grid gap-2">
                        {options.map(row => (
                            <label
                                key={row.id}
                                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--sf-radius-sm)] border px-3 text-sm transition-colors ${
                                    row.id === optionId
                                        ? "border-[var(--sf-accent)] bg-[var(--sf-accent-softer)]"
                                        : "hover:bg-[var(--sf-surface-sunken)]"
                                }`}
                            >
                                <input type="radio" name="product-option" checked={row.id === optionId} onChange={() => setOptionId(row.id)} className="accent-[var(--sf-brand)]" />
                                <span className="sf-bidi min-w-0 flex-1 break-words">{isAr ? row.nameAr || row.name : row.name}</span>
                                <span className="shrink-0 font-medium tabular-nums">{format(row.price)}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            {groups.map(group => (
                <fieldset key={group.id}>
                    <legend className="sf-label mb-2 flex items-center gap-2 p-0">
                        {isAr ? group.nameAr || group.name : group.name}
                        {(group.isRequired || group.minSelection > 0) && (
                            <span className="sf-badge sf-badge--muted">{text("required")}</span>
                        )}
                    </legend>
                    <div className="grid gap-2">
                        {group.modifiers.map(row => (
                            <label
                                key={row.id}
                                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--sf-radius-sm)] border px-3 text-sm transition-colors ${
                                    selected.includes(row.id)
                                        ? "border-[var(--sf-accent)] bg-[var(--sf-accent-softer)]"
                                        : "hover:bg-[var(--sf-surface-sunken)]"
                                }`}
                            >
                                <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id, group)} className="accent-[var(--sf-brand)]" />
                                <span className="sf-bidi min-w-0 flex-1 break-words">{isAr ? row.nameAr || row.name : row.name}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            ))}

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 shrink-0 items-center rounded-[var(--sf-radius-sm)] border">
                    <button
                        type="button"
                        aria-label={text("decreaseQuantity")}
                        disabled={quantity <= 1}
                        onClick={() => setQuantity(quantity - 1)}
                        className="flex size-12 items-center justify-center transition-colors hover:bg-[var(--sf-surface-sunken)] disabled:pointer-events-none disabled:opacity-35"
                    >
                        <Minus className="size-4" />
                    </button>
                    <span aria-live="polite" className="min-w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                    <button
                        type="button"
                        aria-label={text("increaseQuantity")}
                        disabled={maxQuantity != null && quantity >= maxQuantity}
                        onClick={() => setQuantity(quantity + 1)}
                        className="flex size-12 items-center justify-center transition-colors hover:bg-[var(--sf-surface-sunken)] disabled:pointer-events-none disabled:opacity-35"
                    >
                        <Plus className="size-4" />
                    </button>
                </div>

                <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => onAdd({
                        productId: product.id, productName: product.name, productNameAr: product.nameAr,
                        imageUrl: productImage(product.imageKey, product.imageUrl, "full") ?? undefined,
                        price, quantity, selectedOptionId: option?.id, optionName: option?.name, optionNameAr: option?.nameAr, modifiers,
                    })}
                    className={`sf-btn sf-btn--primary sf-btn--lg h-12 min-w-0 flex-1 ${justAdded ? "sf-btn--done" : ""}`}
                >
                    {justAdded ? <Check className="size-4 shrink-0" /> : <ShoppingBag className="size-4 shrink-0" />}
                    <span className="truncate">{justAdded ? text("addedToCart") : text("addToCart")}</span>
                    {/* The running total is a nice confirmation but never worth truncating
                        the action itself, so it only appears once there is room. */}
                    {!justAdded && (
                        <span className="hidden shrink-0 tabular-nums opacity-90 min-[420px]:inline">
                            · {format(unitPrice * quantity)}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
