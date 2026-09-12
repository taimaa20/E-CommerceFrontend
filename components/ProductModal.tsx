"use client";

import { useEffect, useState, useCallback } from "react";
import { usePosStore } from "@/store/posStore";
import { CartItemModifier } from "@/store/posStore";
import { formatCurrency } from "@/lib/currencies";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ProductDto, ModifierDto, ModifierGroupDto, ProductOptionDto } from "@/types/pos";
import type { SelectedRecipeAlternativeDto } from "@/types/order";
import { getTranslatedUnit } from "@/lib/utils";
import { buildProductAvailabilityDateLabel, buildProductAvailabilityTimeLabel } from "@/lib/product-availability";
import {
    resolveRecipeAlternativePriceImpact,
    resolveRecipeAlternativePriceImpactForRow,
    resolveRecipeAlternativePriceLabel,
} from "@/lib/recipe-alternative-pricing";
import { Plus, Minus, AlertCircle, Check } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface ProductModalProps {
    product: ProductDto | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (
        product: ProductDto,
        modifiers: CartItemModifier[],
        quantity: number,
        notes: string,
        selectedOption?: ProductOptionDto | null,
        selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[],
    ) => void;
    initialQuantity?: number;
    initialNotes?: string;
    initialModifierIds?: string[];
    initialModifierQuantities?: Record<string, number>;
    actionLabel?: string;
    orderType?: number; // 1=DineIn, 2=Takeaway, 4=Delivery; undefined = show all
}

export default function ProductModal({
    product,
    isOpen,
    onClose,
    onAddToCart,
    initialQuantity,
    initialNotes,
    initialModifierIds,
    initialModifierQuantities,
    actionLabel,
    orderType,
}: ProductModalProps) {
    const [selectedModifiers, setSelectedModifiers] = useState<CartItemModifier[]>([]);
    const [selectedOption, setSelectedOption] = useState<ProductOptionDto | null>(null);
    // Per-ingredient swap choices keyed by recipeItemId. A missing key or empty
    // string means "no swap" — keep the original ingredient from the recipe.
    const [altChoices, setAltChoices] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const currency = usePosStore((state) => state.currency);
    const { t, locale } = useLocale();
    const isOrderableNow = product?.isActive && product?.isAvailableNow;
    const availabilityTimeLabel = product ? buildProductAvailabilityTimeLabel(product, locale === "ar" ? "ar" : "en") : null;
    const availabilityDateLabel = product ? buildProductAvailabilityDateLabel(product, locale === "ar" ? "ar" : "en") : null;

    // Convert ModifierDto to CartItemModifier
    const toCartModifier = useCallback((m: ModifierDto, qty: number = 1): CartItemModifier => ({
        id: m.id,
        name: m.name,
        nameAr: m.nameAr,
        displayName: m.displayName,
        priceAdjustment: m.priceAdjustment,
        pricingType: m.pricingType,
        isFree: m.isFree,
        freeQuantityLimit: m.freeQuantityLimit,
        maxQuantity: m.maxQuantity,
        isDefault: m.isDefault,
        isActive: m.isActive,
        quantity: qty,
        recipeItems: m.recipeItems,
    }), []);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen && product) {
            setQuantity(Math.max(1, initialQuantity ?? 1));
            setNotes(initialNotes ?? "");
            setValidationErrors([]);

            if (initialModifierIds && initialModifierIds.length > 0) {
                const allModifiers = product.modifierGroups.flatMap((group) => group.modifiers);
                const selected = allModifiers
                    .filter((modifier) => initialModifierIds.includes(modifier.id))
                    .map((m) => toCartModifier(m, initialModifierQuantities?.[m.id] ?? 1));
                setSelectedModifiers(selected);
            } else {
                // Pre-select default modifiers (only active ones)
                const defaults = product.modifierGroups.flatMap((group) =>
                    group.modifiers.filter((m) => m.isDefault && m.isActive !== false)
                ).map((m) => toCartModifier(m, 1));
                setSelectedModifiers(defaults);
            }

            // Pre-select default option. If no default configured, fall back
            // to the first active option so the customer never sees an
            // "unselected" state when options exist.
            const activeOptions = product.options?.filter((o) => o.isActive) ?? [];
            const defaultOption = activeOptions.find((o) => o.isDefault) ?? activeOptions[0] ?? null;
            setSelectedOption(defaultOption);

            // Pre-select default ingredient alternative per recipe row (if any).
            // "" means keep the original ingredient — the row is still rendered
            // so the cashier can change it at will.
            const defaults: Record<string, string> = {};
            for (const ri of product.recipeItems ?? []) {
                if (!ri.alternatives?.length) continue;
                const defAlt = ri.alternatives.find((a) => a.isDefault && a.isActive);
                defaults[ri.id] = defAlt?.id ?? "";
            }
            setAltChoices(defaults);
        } else if (!product) {
            setSelectedModifiers([]);
            setSelectedOption(null);
            setAltChoices({});
        }
    }, [isOpen, product, initialQuantity, initialNotes, initialModifierIds, initialModifierQuantities, toCartModifier]);

    if (!product) return null;

    const baseUnitPrice = product.displayPrice ?? product.discountedPrice ?? product.basePrice;

    // Count selected modifiers in a specific group
    const getGroupSelectedCount = (group: ModifierGroupDto): number =>
        selectedModifiers.filter((m) => group.modifiers.some((gm) => gm.id === m.id)).length;

    // Handle Radio Change (Single Selection / Variation: selectionType=0)
    const handleRadioChange = (group: ModifierGroupDto, modifierId: string) => {
        const selectedModifier = group.modifiers.find((m) => m.id === modifierId);
        if (!selectedModifier) return;

        setSelectedModifiers((prev) => {
            const filtered = prev.filter(
                (m) => !group.modifiers.some((gm) => gm.id === m.id)
            );
            return [...filtered, toCartModifier(selectedModifier, 1)];
        });
        setValidationErrors([]);
    };

    // Handle Checkbox Change (Multiple Selection / Extras: selectionType=1)
    const handleCheckboxChange = (
        checked: boolean,
        group: ModifierGroupDto,
        modifier: ModifierDto
    ) => {
        setSelectedModifiers((prev) => {
            if (checked) {
                // Enforce maxSelection
                const currentCount = prev.filter((m) => group.modifiers.some((gm) => gm.id === m.id)).length;
                if (group.maxSelection > 0 && currentCount >= group.maxSelection) {
                    return prev; // Don't add — max reached
                }
                return [...prev, toCartModifier(modifier, 1)];
            } else {
                return prev.filter((m) => m.id !== modifier.id);
            }
        });
        setValidationErrors([]);
    };

    // Handle modifier quantity change (for extras)
    const handleModifierQuantityChange = (modifierId: string, delta: number) => {
        setSelectedModifiers((prev) =>
            prev.map((m) => {
                if (m.id !== modifierId) return m;
                const newQty = Math.max(1, (m.quantity || 1) + delta);
                return { ...m, quantity: newQty };
            })
        );
    };

    // Filter modifier groups by the current order type
    const visibleModifierGroups = product?.modifierGroups?.filter((g) =>
        orderType === undefined || (g.availableForOrderTypes & orderType) !== 0
    ) ?? [];

    // Validate min/max selection constraints
    const validate = (): boolean => {
        const errors: string[] = [];
        for (const group of visibleModifierGroups) {
            const activeModifiers = group.modifiers.filter((m) => m.isActive !== false);
            if (activeModifiers.length === 0) continue;

            const selectedCount = getGroupSelectedCount(group);
            const groupName = group.displayName || group.name;

            if (group.isRequired && group.minSelection > 0 && selectedCount < group.minSelection) {
                errors.push(`${groupName}: select at least ${group.minSelection}`);
            }
            if (group.maxSelection > 0 && selectedCount > group.maxSelection) {
                errors.push(`${groupName}: max ${group.maxSelection} allowed`);
            }
        }
        setValidationErrors(errors);
        return errors.length === 0;
    };

    // Calculate effective price for a modifier considering pricingType and isFree
    const getModifierEffectivePrice = useCallback((m: ModifierDto | CartItemModifier, qty: number = 1): number => {
        const mod = m as ModifierDto;
        const freeQuantityLimit = mod.freeQuantityLimit ?? 0;
        if (mod.isFree && freeQuantityLimit > 0 && qty <= freeQuantityLimit) return 0;
        if (mod.isFree && freeQuantityLimit === 0) return 0;
        const pricingType = mod.pricingType ?? 0;
        if (pricingType === 2) return 0; // Included
        if (pricingType === 1 && product) {
            // Percentage of base price
            return (baseUnitPrice * mod.priceAdjustment) / 100;
        }
        return mod.priceAdjustment; // Fixed
    }, [baseUnitPrice, product]);

    // Recipe rows that expose ingredient alternatives — rendered as a
    // picker block. Ignored entirely when a ProductOption is selected,
    // since an option fully overrides the base recipe.
    const swappableRecipeRows = (product.recipeItems ?? []).filter(
        (ri) => (ri.alternatives?.length ?? 0) > 0 && ri.alternatives!.some((a) => a.isActive)
    );

    const alternativesPriceImpact = (): number => {
        if (selectedOption) return 0;
        const selectedAlternatives = Object.entries(altChoices)
            .filter(([, alternativeId]) => alternativeId)
            .map(([recipeItemId, alternativeId]) => ({ recipeItemId, alternativeId }));

        return resolveRecipeAlternativePriceImpact(product, selectedAlternatives);
    };

    const buildSelectedAlternatives = (): SelectedRecipeAlternativeDto[] => {
        if (selectedOption) return [];
        const out: SelectedRecipeAlternativeDto[] = [];
        for (const [recipeItemId, altId] of Object.entries(altChoices)) {
            if (altId) out.push({ recipeItemId, alternativeId: altId });
        }
        return out;
    };

    const calculateTotal = () => {
        if (selectedOption)
            return selectedOption.price * quantity;
        const overrideTotal = selectedModifiers
            .filter((m) => (m.recipeItems?.length ?? 0) > 0)
            .reduce((sum, m) => sum + getModifierEffectivePrice(m, 1), 0);
        const modifiersPrice = selectedModifiers
            .filter((m) => (m.recipeItems?.length ?? 0) === 0)
            .reduce((sum, m) => sum + getModifierEffectivePrice(m, m.quantity || 1) * (m.quantity || 1), 0);
        const unitTotal = (overrideTotal > 0 ? overrideTotal : baseUnitPrice) + modifiersPrice + alternativesPriceImpact();
        return unitTotal * quantity;
    };

    const calculateUnitTotal = () => {
        if (selectedOption)
            return selectedOption.price;
        const overrideTotal = selectedModifiers
            .filter((m) => (m.recipeItems?.length ?? 0) > 0)
            .reduce((sum, m) => sum + getModifierEffectivePrice(m, 1), 0);
        const modifiersPrice = selectedModifiers
            .filter((m) => (m.recipeItems?.length ?? 0) === 0)
            .reduce((sum, m) => sum + getModifierEffectivePrice(m, m.quantity || 1) * (m.quantity || 1), 0);
        return (overrideTotal > 0 ? overrideTotal : baseUnitPrice) + modifiersPrice + alternativesPriceImpact();
    };

    const handleAddToCart = () => {
        if (!product.isActive || !product.isAvailableNow) {
            setValidationErrors([
                locale === "ar" ? "هذا المنتج غير متاح حاليًا" : "This product is not available right now",
            ]);
            return;
        }
        if (!validate()) return;
        onAddToCart(product, selectedModifiers, quantity, notes.trim(), selectedOption, buildSelectedAlternatives());
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] flex flex-col p-0 gap-0 overflow-hidden bg-white sm:max-w-[600px] sm:max-h-[85vh]"
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
            >

                <DialogHeader className={`border-b border-slate-100 p-4 pb-4 sm:p-6 ${"text-start"}`}>
                    <DialogTitle className={`text-2xl font-bold text-slate-800 ${"text-start"}`}>
                        {locale === 'ar' && product.nameAr ? product.nameAr : (product.displayName || product.name)}
                    </DialogTitle>
                    <p className={`text-lg text-primary font-semibold ${"text-start"}`} style={{ direction: locale === 'ar' ? 'rtl' : 'ltr', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                        {formatCurrency(selectedOption ? selectedOption.price : baseUnitPrice, currency)}
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6">
                    {!isOrderableNow && (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <div>{locale === "ar" ? "هذا المنتج غير متاح حاليًا ولا يمكن إضافته إلى الطلب" : "This product is currently unavailable and cannot be added to the order."}</div>
                                {availabilityTimeLabel && <div className="mt-1 text-xs text-amber-600">{availabilityTimeLabel}</div>}
                                {availabilityDateLabel && <div className="mt-1 text-xs text-amber-600">{availabilityDateLabel}</div>}
                            </div>
                        </div>
                    )}

                    {/* ─── PRODUCT OPTIONS (whole-product variant override) ─── */}
                    {(product.options?.filter((o) => o.isActive).length ?? 0) > 0 && (
                        <div className="space-y-3">
                            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h3 className="font-bold text-base text-slate-800">
                                    {locale === "ar" ? "اختر النوع" : "Choose Variant"}
                                </h3>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-100">
                                    {t("required")}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {product.options!.filter((o) => o.isActive).map((opt) => {
                                    const isSelected = selectedOption?.id === opt.id;
                                    const label = locale === "ar" && opt.nameAr ? opt.nameAr : opt.name;
                                    return (
                                        <button
                                            type="button"
                                            key={opt.id}
                                            onClick={() => setSelectedOption(opt)}
                                            className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-start transition-all min-h-[60px]
                                                ${isSelected
                                                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                            <span className="text-sm font-semibold text-slate-700 truncate max-w-full">{label}</span>
                                            <span className="text-[11px] font-bold mt-0.5 text-primary">
                                                {formatCurrency(opt.price, currency)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── INGREDIENT SWAPS (per-recipe-row alternatives) ─── */}
                    {swappableRecipeRows.length > 0 && !selectedOption && (
                        <div className="space-y-3">
                            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h3 className="font-bold text-base text-slate-800">
                                    {locale === "ar" ? "البدائل" : "Ingredient Swaps"}
                                </h3>
                                <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100">
                                    {t("optional")}
                                </span>
                            </div>
                            {swappableRecipeRows.map((row) => {
                                const rowLabel = locale === "ar" && row.rawMaterialNameAr
                                    ? row.rawMaterialNameAr
                                    : row.rawMaterialName;
                                const activeAlts = (row.alternatives ?? []).filter((a) => a.isActive);
                                const currentChoice = altChoices[row.id] ?? "";
                                const unitLabel = getTranslatedUnit(row.unit, locale);
                                const originalLabel = `${rowLabel} (${row.amount} ${unitLabel})`;
                                return (
                                    <div key={row.id} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/40 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold text-slate-700">{rowLabel}</span>
                                            <span className="text-[11px] text-slate-400">
                                                {locale === "ar" ? "اختر بديلاً" : "Pick an alternative"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {/* Original (no swap) chip */}
                                            <button
                                                type="button"
                                                onClick={() => setAltChoices((prev) => ({ ...prev, [row.id]: "" }))}
                                                className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-start transition-all min-h-[60px]
                                                    ${currentChoice === ""
                                                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                                            >
                                                {currentChoice === "" && (
                                                    <div className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                                <span className="text-sm font-semibold text-slate-700 truncate max-w-full">{originalLabel}</span>
                                                <span className="text-[11px] text-slate-400 mt-0.5">
                                                    {locale === "ar" ? "افتراضي" : "Default"}
                                                </span>
                                            </button>
                                            {activeAlts.map((alt) => {
                                                const isSelected = currentChoice === alt.id;
                                                const altName = locale === "ar" && (alt.nameAr || alt.rawMaterialNameAr)
                                                    ? (alt.nameAr || alt.rawMaterialNameAr)
                                                    : (alt.name || alt.rawMaterialName);
                                                const altUnitLabel = getTranslatedUnit(alt.unit, locale);
                                                const label = `${altName} (${alt.amount} ${altUnitLabel})`;
                                                const priceImpact = resolveRecipeAlternativePriceImpactForRow(product, row, alt);
                                                const priceBadge = resolveRecipeAlternativePriceLabel(priceImpact, (amount) => formatCurrency(amount, currency));
                                                const priceClass = priceImpact < 0 ? "text-emerald-600" : "text-primary";
                                                return (
                                                    <button
                                                        type="button"
                                                        key={alt.id}
                                                        onClick={() => setAltChoices((prev) => ({ ...prev, [row.id]: alt.id }))}
                                                        className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-start transition-all min-h-[60px]
                                                            ${isSelected
                                                                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                                <Check className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                        <span className="text-sm font-semibold text-slate-700 truncate max-w-full">{label}</span>
                                                        {priceBadge && <span className={`text-[11px] font-bold mt-0.5 ${priceClass}`}>{priceBadge}</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {visibleModifierGroups.length > 0 ? (
                        visibleModifierGroups.map((group) => {
                            const activeModifiers = group.modifiers.filter((m) => m.isActive !== false);
                            if (activeModifiers.length === 0) return null;

                            const isVariation = group.selectionType === 0;
                            const isRequired = group.isRequired;
                            const selectedCount = getGroupSelectedCount(group);
                            const maxReached = group.maxSelection > 0 && selectedCount >= group.maxSelection;
                            const displayType = group.displayType ?? (isVariation ? 0 : 1); // 0=Radio, 1=Checkbox, 2=QuantitySelector

                            return (
                            <div key={group.id} className="space-y-3">
                                {/* Group header */}
                                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-base text-slate-800">
                                            {locale === 'ar' && group.nameAr ? group.nameAr : (group.displayName || group.name)}
                                        </h3>
                                        {isRequired ? (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-100">
                                                {t("required")}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100">
                                                {t("optional")}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md ${"text-start"}`}>
                                        {isVariation
                                            ? t("chooseOne")
                                            : group.maxSelection > 0
                                                ? `${selectedCount}/${group.maxSelection}`
                                                : selectedCount > 0
                                                    ? `${selectedCount} ${t("selectedLabel")}`
                                                    : t("anyOption")
                                        }
                                    </span>
                                </div>

                                {isVariation ? (
                                    /* ─── SINGLE SELECTION / VARIATION (Radio) ─── */
                                    <RadioGroup
                                        value={selectedModifiers.find((m) => group.modifiers.some((gm) => gm.id === m.id))?.id}
                                        onValueChange={(val) => handleRadioChange(group, val)}
                                        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                                    >
                                        {activeModifiers.map((modifier) => {
                                            const isSelected = selectedModifiers.some((m) => m.id === modifier.id);
                                            const fullModifierId = `radio-${group.id}-${modifier.id}`;
                                            const effectivePrice = getModifierEffectivePrice(modifier, 1);
                                            const pricingLabel = modifier.pricingType === 1 ? "%" : modifier.pricingType === 2 ? "incl." : "";

                                            return (
                                                <div
                                                    key={modifier.id}
                                                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-center min-h-[72px]
                                                        ${isSelected
                                                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                                                    onClick={() => handleRadioChange(group, modifier.id)}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                            <Check className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                    <RadioGroupItem value={modifier.id} id={fullModifierId} className="sr-only" />
                                                    <Label htmlFor={fullModifierId} className="cursor-pointer font-semibold text-sm text-slate-700">
                                                        {locale === 'ar' && modifier.nameAr ? modifier.nameAr : (modifier.displayName || modifier.name)}
                                                    </Label>
                                                    {modifier.isFree || effectivePrice === 0 ? (
                                                        <span className="text-[10px] text-slate-400 mt-1">{t("freeLabel")}</span>
                                                    ) : (
                                                        <span className={`text-xs font-bold mt-1 ${effectivePrice > 0 ? "text-primary" : "text-blue-600"}`}>
                                                            {effectivePrice > 0 ? "+" : ""}{formatCurrency(effectivePrice, currency)} {pricingLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </RadioGroup>
                                ) : displayType === 2 ? (
                                    /* ─── QUANTITY SELECTOR ─── */
                                    <div className="flex flex-col gap-2">
                                        {activeModifiers.map((modifier) => {
                                            const cartMod = selectedModifiers.find((m) => m.id === modifier.id);
                                            const currentQty = cartMod?.quantity || 0;
                                            const effectivePrice = getModifierEffectivePrice(modifier, currentQty);
                                            const maxQty = modifier.maxQuantity > 0 ? modifier.maxQuantity : 99;

                                            return (
                                                <div
                                                    key={modifier.id}
                                                    className={`flex flex-col items-start gap-3 rounded-xl border-2 p-3 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between
                                                        ${currentQty > 0
                                                            ? "border-primary bg-primary/5 shadow-sm"
                                                            : "border-slate-200 hover:border-slate-300"}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium text-sm text-slate-700">
                                                            {locale === 'ar' && modifier.nameAr ? modifier.nameAr : (modifier.displayName || modifier.name)}
                                                        </span>
                                                    </div>
                                                    <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                                                        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                                                            <button
                                                                type="button"
                                                                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all"
                                                                onClick={() => {
                                                                    if (currentQty <= 1) {
                                                                        setSelectedModifiers(prev => prev.filter(m => m.id !== modifier.id));
                                                                    } else if (currentQty > 0) {
                                                                        handleModifierQuantityChange(modifier.id, -1);
                                                                    }
                                                                }}
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="w-7 text-center text-sm font-bold text-slate-700">
                                                                {currentQty}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all"
                                                                onClick={() => {
                                                                    if (currentQty === 0) {
                                                                        setSelectedModifiers(prev => [...prev, toCartModifier(modifier, 1)]);
                                                                    } else if (currentQty < maxQty) {
                                                                        handleModifierQuantityChange(modifier.id, 1);
                                                                    }
                                                                }}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        {modifier.isFree || effectivePrice === 0 ? (
                                                            <span className="text-xs text-slate-400 min-w-[40px] text-end">{t("freeLabel")}</span>
                                                        ) : (
                                                            <span className="text-sm font-bold min-w-[60px] text-end text-primary">
                                                                +{formatCurrency(effectivePrice * currentQty, currency)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* ─── MULTIPLE SELECTION / EXTRAS (Checkbox + Quantity) ─── */
                                    <div className="flex flex-col gap-2">
                                        {activeModifiers.map((modifier) => {
                                            const cartMod = selectedModifiers.find((m) => m.id === modifier.id);
                                            const isChecked = !!cartMod;
                                            const isDisabled = !isChecked && maxReached;
                                            const fullModifierId = `check-${group.id}-${modifier.id}`;
                                            const effectivePrice = getModifierEffectivePrice(modifier, cartMod?.quantity || 1);

                                            return (
                                                <div
                                                    key={modifier.id}
                                                    className={`flex flex-col items-start gap-3 rounded-xl border-2 p-3 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between
                                                        ${isChecked
                                                            ? "border-primary bg-primary/5 shadow-sm"
                                                            : isDisabled
                                                                ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed"
                                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"}`}
                                                    onClick={() => !isDisabled && handleCheckboxChange(!isChecked, group, modifier)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                                            isChecked ? "bg-primary border-primary" : "border-slate-300"
                                                        }`}>
                                                            {isChecked && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <Label htmlFor={fullModifierId} className={`font-medium text-sm ${isDisabled ? "text-slate-400" : "text-slate-700 cursor-pointer"}`}>
                                                            {locale === 'ar' && modifier.nameAr ? modifier.nameAr : (modifier.displayName || modifier.name)}
                                                        </Label>
                                                    </div>

                                                    <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                                                        {/* Quantity controls — only visible when selected */}
                                                        {isChecked && (
                                                            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    type="button"
                                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all"
                                                                    onClick={() => handleModifierQuantityChange(modifier.id, -1)}
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="w-7 text-center text-sm font-bold text-slate-700">
                                                                    {cartMod?.quantity || 1}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all"
                                                                    onClick={() => handleModifierQuantityChange(modifier.id, 1)}
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {modifier.isFree || effectivePrice === 0 ? (
                                                            <span className="text-xs text-slate-400 min-w-[40px] text-end">{t("freeLabel")}</span>
                                                        ) : (
                                                            <span className={`text-sm font-bold min-w-[60px] text-end ${effectivePrice > 0 ? "text-primary" : "text-blue-600"}`}>
                                                                {effectivePrice > 0 ? "+" : ""}{formatCurrency(
                                                                    effectivePrice * (cartMod?.quantity || 1),
                                                                    currency
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );})
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <span className="text-4xl mb-2">🍽️</span>
                            <p>{t("noExtraOptions")}</p>
                        </div>
                    )}

                    {/* ─── SELECTED EXTRAS SUMMARY ─── */}
                    {selectedModifiers.length > 0 && selectedModifiers.some(m => getModifierEffectivePrice(m, m.quantity || 1) > 0) && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t("priceBreakdown")}</h4>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>{locale === 'ar' && product.nameAr ? product.nameAr : (product.displayName || product.name)}</span>
                                    <span className="font-medium">{formatCurrency(baseUnitPrice, currency)}</span>
                                </div>
                                {selectedModifiers.filter(m => getModifierEffectivePrice(m, m.quantity || 1) !== 0).map((m, i) => (
                                    <div key={i} className="flex justify-between text-sm text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-primary" />
                                            {locale === 'ar' && m.nameAr ? m.nameAr : (m.displayName || m.name)}
                                            {(m.quantity || 1) > 1 && <span className="text-slate-400">×{m.quantity}</span>}
                                        </span>
                                        <span className="font-medium text-primary">
                                            +{formatCurrency(getModifierEffectivePrice(m, m.quantity || 1) * (m.quantity || 1), currency)}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold text-slate-800 pt-1.5 border-t border-slate-200">
                                    <span>{t("unitPrice")}</span>
                                    <span>{formatCurrency(calculateUnitTotal(), currency)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isOrderableNow && (
                    <div className="space-y-4 border-t border-slate-100 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="qty" className="text-sm font-semibold text-slate-700">{t("qty")}</Label>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 w-10 p-0"
                                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                                >
                                    -
                                </Button>
                                <Input
                                    id="qty"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={(e) => {
                                        const next = parseInt(e.target.value || "1", 10);
                                        setQuantity(Number.isNaN(next) ? 1 : Math.max(1, next));
                                    }}
                                    className="w-full text-center sm:w-24"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 w-10 p-0"
                                    onClick={() => setQuantity((prev) => prev + 1)}
                                >
                                    +
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">{t("specialNote")}</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. No onions, extra spicy"
                                className="min-h-20"
                            />
                        </div>
                    </div>
                    )}
                </div>

                <DialogFooter className="mt-auto border-t border-slate-100 bg-white p-4 sm:p-5">
                    <div className="flex flex-col w-full gap-3">
                        {/* Validation errors */}
                        {validationErrors.length > 0 && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>{validationErrors.join(" · ")}</div>
                            </div>
                        )}

                        {isOrderableNow && (
                            <Button
                                className="flex h-auto min-h-14 w-full flex-col items-start gap-1 rounded-xl bg-primary px-4 py-3 text-start text-base text-white shadow-lg shadow-primary/20 hover:bg-primary/90 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                                onClick={handleAddToCart}
                            >
                                <span className="font-semibold">{actionLabel || t("addToCartBtn")}</span>
                                <span className="flex items-center gap-2">
                                    <span className="text-xs opacity-80">{quantity} × {formatCurrency(calculateUnitTotal(), currency)}</span>
                                    <span className="font-bold text-lg">{formatCurrency(calculateTotal(), currency)}</span>
                                </span>
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
