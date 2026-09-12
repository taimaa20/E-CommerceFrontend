"use client";

import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProductDto, AllergenType } from "@/types/pos";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { TranslationKey } from "@/lib/translations";
import { buildProductAvailabilityDateLabel, buildProductAvailabilityTimeLabel } from "@/lib/product-availability";
import { productImage, productImageSrcSet } from "@/lib/product-image";
import {
    resolveRecipeAlternativePriceImpactForRow,
    resolveRecipeAlternativePriceLabel,
} from "@/lib/recipe-alternative-pricing";
import { X, AlertTriangle, Package, Layers, Flame, Minus, Plus, ShoppingBag, Check } from "lucide-react";

export interface ProductOrderSelection {
    quantity: number;
    notes: string;
    option?: NonNullable<ProductDto["options"]>[number];
    modifiers: {
        modifierId: string;
        modifierName: string;
        modifierNameAr?: string;
        price: number;
        quantity: number;
    }[];
}

interface ProductDetailPanelProps {
    product: ProductDto | null;
    open: boolean;
    onClose: () => void;
    formatPrice: (amount: number) => string;
    t: (key: TranslationKey) => string;
    onAddToCart?: (product: ProductDto, selection: ProductOrderSelection) => void;
}

const ALLERGEN_LABELS: Record<number, { en: string; ar: string; icon: string }> = {
    [AllergenType.Gluten]:    { en: "Gluten",    ar: "الجلوتين",      icon: "🌾" },
    [AllergenType.Dairy]:     { en: "Dairy",     ar: "الألبان",       icon: "🥛" },
    [AllergenType.Nuts]:      { en: "Nuts",      ar: "المكسرات",      icon: "🥜" },
    [AllergenType.Eggs]:      { en: "Eggs",      ar: "البيض",         icon: "🥚" },
    [AllergenType.Fish]:      { en: "Fish",      ar: "الأسماك",       icon: "🐟" },
    [AllergenType.Shellfish]: { en: "Shellfish", ar: "المحار",        icon: "🦐" },
    [AllergenType.Soy]:       { en: "Soy",       ar: "الصويا",        icon: "🫘" },
    [AllergenType.Sesame]:    { en: "Sesame",    ar: "السمسم",        icon: "🌱" },
};

function getAllergens(flags: number): { en: string; ar: string; icon: string }[] {
    return Object.entries(ALLERGEN_LABELS)
        .filter(([bit]) => (flags & Number(bit)) !== 0)
        .map(([, label]) => label);
}

export default function ProductDetailPanel({
    product,
    open,
    onClose,
    formatPrice,
    t,
    onAddToCart,
}: ProductDetailPanelProps) {
    const { locale } = useLocale();
    const isAr = locale === 'ar';
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const [selectedOptionId, setSelectedOptionId] = useState("");
    const [selectedModifiers, setSelectedModifiers] = useState<Record<string, Set<string>>>({});

    useEffect(() => {
        if (!open || !product) return;
        const activeOptions = product.options?.filter((option) => option.isActive) ?? [];
        setQuantity(1);
        setNotes("");
        setSelectedOptionId(
            activeOptions.find((option) => option.isDefault)?.id
            ?? activeOptions[0]?.id
            ?? "",
        );
        setSelectedModifiers({});
    }, [open, product]);

    if (!product) return null;

    // Promotional CustomPrice (public-menu-only) overrides basePrice when active.
    const promoActive = !!product.useCustomPrice && product.customPrice != null;
    const shownPrice = promoActive ? (product.customPrice as number) : (product.displayPrice ?? product.basePrice);
    const hasDiscount = !promoActive && product.discountedPrice != null && product.discountedPrice < product.basePrice;
    const allergens = getAllergens(product.allergens);
    const displayName = isAr ? (product.nameAr || product.displayName || product.name) : (product.displayName || product.name);
    const displayCategory = isAr
        ? (product.categoryNameAr || product.categoryDisplayName || product.categoryName)
        : (product.categoryDisplayName || product.categoryName);
    const displayDescription = isAr
        ? (product.descriptionAr || "")
        : (product.description || product.descriptionAr || "");
    const availabilityTimeLabel = buildProductAvailabilityTimeLabel(product, isAr ? "ar" : "en");
    const availabilityDateLabel = buildProductAvailabilityDateLabel(product, isAr ? "ar" : "en");
    const orderMode = !!onAddToCart;
    const selectedOption = product.options?.find((option) => option.id === selectedOptionId && option.isActive);
    const selectedModifierRows = product.modifierGroups.flatMap((group) =>
        group.modifiers
            .filter((modifier) => selectedModifiers[group.id]?.has(modifier.id))
            .map((modifier) => ({
                modifierId: modifier.id,
                modifierName: modifier.name,
                modifierNameAr: modifier.nameAr,
                price: modifier.isFree || modifier.pricingType === 2 ? 0 : modifier.priceAdjustment,
                quantity: 1,
            })),
    );
    const modifierTotal = selectedModifierRows.reduce((total, modifier) => total + modifier.price, 0);
    const orderUnitPrice = (selectedOption?.price ?? (hasDiscount ? product.discountedPrice! : shownPrice)) + modifierTotal;
    const requiredModifiersSelected = product.modifierGroups.every((group) =>
        group.minSelection <= 0
        || (selectedModifiers[group.id]?.size ?? 0) >= group.minSelection,
    );
    const canAdd = orderMode && product.isActive && product.isAvailableNow && requiredModifiersSelected;

    const toggleModifier = (groupId: string, modifierId: string, single: boolean, maxSelection: number) => {
        setSelectedModifiers((current) => {
            const selected = new Set(current[groupId] ?? []);
            if (single) {
                selected.clear();
                selected.add(modifierId);
            } else if (selected.has(modifierId)) {
                selected.delete(modifierId);
            } else if (maxSelection <= 0 || selected.size < maxSelection) {
                selected.add(modifierId);
            }
            return { ...current, [groupId]: selected };
        });
    };

    const addToCart = () => {
        if (!canAdd || !onAddToCart) return;
        onAddToCart(product, {
            quantity,
            notes: notes.trim(),
            option: selectedOption,
            modifiers: selectedModifierRows,
        });
        onClose();
    };

    // Coming-soon: drastically reduced view. No price, no discount badge, no
    // calories, no allergens, no ingredients, no modifiers, no CTAs — just
    // name + description + a prominent "Prices coming soon" pill.
    const isSoon = product.isSoon === true;
    const comingSoonLabel = isAr ? "الأسعار قريباً 🤩" : "Prices coming soon 🤩";

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent
                side="right"
                showCloseButton={false}
                className="showcase-detail-sheet w-full sm:max-w-lg p-0 flex flex-col h-[100dvh] min-h-0"
                dir={isAr ? 'rtl' : 'ltr'}
            >
                {/* Hero image */}
                <div className="showcase-detail-hero">
                    {(() => {
                        // productImage(..., "full") returns the 1600-px WebP
                        // variant when an imageKey exists, otherwise the legacy
                        // absolute URL — hero keeps working for pre-pipeline
                        // products. srcSet lets the browser down-swap to the
                        // medium/thumb variants on narrower screens.
                        const heroSrc = productImage(product.imageKey, product.imageUrl, "full");
                        const heroSrcSet = productImageSrcSet(product.imageKey, product.imageUrl);
                        return heroSrc ? (
                            <img
                                src={heroSrc}
                                srcSet={heroSrcSet}
                                sizes="(max-width: 640px) 100vw, 512px"
                                alt={displayName}
                                className="w-full h-full object-cover"
                                // Hero is above-the-fold — hint the browser to
                                // fetch/decode at high priority and off the main
                                // thread so paint isn't blocked by the image.
                                decoding="async"
                                fetchPriority="high"
                            />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                <Package className="w-16 h-16 text-muted-foreground/20" />
                            </div>
                        );
                    })()}

                    {/* Close floating button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 end-4 z-10 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {!isSoon && hasDiscount && (
                        <Badge
                            className="absolute top-4 start-4 z-10 bg-destructive text-white text-sm px-3 py-1"
                            dir={isAr ? "rtl" : "ltr"}
                        >
                            {product.discountPercentage != null && product.discountPercentage > 0
                                ? isAr
                                    ? `${t("showcaseOff") || "خصم"} ${product.discountPercentage}%`
                                    : `${product.discountPercentage}% ${t("showcaseOff") || "OFF"}`
                                : t("saleLabel") || (isAr ? "تخفيض" : "Sale")}
                        </Badge>
                    )}

                    {isSoon && (
                        <span
                            className={cn(
                                "absolute z-20 inline-flex items-center gap-1.5 whitespace-nowrap",
                                "rounded-full px-5 py-2.5 text-base font-bold text-white",
                                "shadow-xl ring-1 ring-white/20 backdrop-blur-sm",
                                "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
                            )}
                            style={{
                                top: "16px",
                                [isAr ? "right" : "left"]: "16px",
                            }}
                        >
                            {comingSoonLabel}
                        </span>
                    )}
                </div>

                {/* Scrollable body */}
                <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
                    <div className="px-6 pt-5 pb-8 space-y-6 text-start">
                        {/* Header */}
                        <SheetHeader className="p-0 space-y-2 text-start">
                            {!isSoon && displayCategory && (
                                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                                    {displayCategory}
                                </span>
                            )}
                            <SheetTitle className="text-2xl font-bold text-foreground leading-tight">
                                {displayName}
                            </SheetTitle>
                        </SheetHeader>

                        {/* Price — hidden entirely for coming-soon items */}
                        {!isSoon && (
                            <div className="flex items-baseline gap-3" style={{ direction: isAr ? 'rtl' : 'ltr', flexDirection:  'row' }}>
                                {hasDiscount ? (
                                    <>
                                        <span className="text-3xl font-extrabold text-primary" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
                                            {formatPrice(product.discountedPrice!)}
                                        </span>
                                        <span className="text-lg text-muted-foreground line-through" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
                                            {formatPrice(product.basePrice)}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-3xl font-extrabold text-foreground" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
                                        {formatPrice(shownPrice)}
                                    </span>
                                )}
                            </div>
                        )}

                        {!isSoon && !product.isAvailableNow && (
                            <div className={cn("rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700", "text-start")}>
                                <div className="font-semibold">{isAr ? "غير متاح الآن" : "Unavailable now"}</div>
                                {availabilityTimeLabel && <div className="mt-1">{availabilityTimeLabel}</div>}
                                {availabilityDateLabel && <div className="mt-1 text-xs text-amber-600">{availabilityDateLabel}</div>}
                            </div>
                        )}

                        {/* Calories */}
                        {!isSoon && product.calories != null && (
                            <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
                                <Flame className="h-4 w-4" /> {product.calories} kcal
                            </div>
                        )}

                        {/* Description */}
                        {displayDescription && (
                            <p className="text-muted-foreground text-sm leading-relaxed text-start">
                                {displayDescription}
                            </p>
                        )}

                        {/* Allergens */}
                        {!isSoon && allergens.length > 0 && (
                            <div className="showcase-detail-section" dir={isAr ? 'rtl' : 'ltr'}>
                                <h4
                                    className={cn("showcase-detail-section-title", "text-start")}
                                    dir="ltr"
                                    style={{
                                        flexDirection: isAr ? 'row-reverse' : 'row',
                                        justifyContent: isAr ? 'flex-end' : 'flex-start',
                                        width: isAr ? 'fit-content' : '100%',
                                        marginInlineStart: isAr ? 'auto' : undefined
                                    }}
                                >
                                    <AlertTriangle className="w-4 h-4 text-warning" />
                                    {t("showcaseAllergens") || "Allergens"}
                                </h4>
                                <div
                                    className={cn("flex flex-wrap gap-2", isAr ? "justify-end" : "justify-start")}
                                    dir="ltr"
                                    style={{ justifyContent: isAr ? 'flex-end' : 'flex-start' }}
                                >
                                    {allergens.map((a) => (
                                        <Badge key={a.en} variant="outline" className="gap-1.5 px-3 py-1.5 text-sm" dir="ltr">
                                            <span>{a.icon}</span>
                                            {isAr ? a.ar : a.en}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Product Variants */}
                        {!isSoon && (product.options?.filter((o) => o.isActive).length ?? 0) > 0 && (
                            <div className="showcase-detail-section" dir={isAr ? 'rtl' : 'ltr'}>
                                <h4
                                    className={cn("showcase-detail-section-title", "text-start")}
                                    dir="ltr"
                                    style={{
                                        flexDirection: isAr ? 'row-reverse' : 'row',
                                        justifyContent: isAr ? 'flex-end' : 'flex-start',
                                        width: isAr ? 'fit-content' : '100%',
                                        marginInlineStart: isAr ? 'auto' : undefined
                                    }}
                                >
                                    <Package className="w-4 h-4 text-primary" />
                                    {isAr ? "الأنواع المتاحة" : "Choose Your Variant"}
                                </h4>
                                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" dir={isAr ? 'rtl' : 'ltr'}>
                                    {product.options!
                                        .filter((o) => o.isActive)
                                        .sort((a, b) => a.sortOrder - b.sortOrder)
                                        .map((opt) => {
                                            const displayName = (isAr && opt.nameAr) ? opt.nameAr : opt.name;
                                            const secondaryName = (isAr && opt.nameAr) ? opt.name : (opt.nameAr || null);
                                            return (
                                                <button
                                                    type="button"
                                                    key={opt.id}
                                                    disabled={!orderMode}
                                                    onClick={() => orderMode && setSelectedOptionId(opt.id)}
                                                    className={cn(
                                                        "relative flex flex-col gap-1 rounded-2xl border-2 bg-gradient-to-br from-background to-muted/40 p-3 shadow-sm",
                                                        orderMode && selectedOptionId === opt.id
                                                            ? "border-primary ring-2 ring-primary/10"
                                                            : opt.isDefault
                                                                ? "border-primary/60"
                                                                : "border-border",
                                                        orderMode && "cursor-pointer active:scale-[0.98]",
                                                    )}
                                                >
                                                    {opt.isDefault && (
                                                        <span
                                                            className={cn(
                                                                "absolute -top-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-md",
                                                                isAr ? "end-2" : "start-2"
                                                            )}
                                                        >
                                                            {isAr ? "الافتراضي" : "Default"}
                                                        </span>
                                                    )}
                                                    <div className={cn("flex flex-col", "items-start text-start")}>
                                                        <span className="text-sm font-bold leading-tight text-foreground">{displayName}</span>
                                                        {secondaryName && (
                                                            <span className="text-[10px] leading-tight text-muted-foreground">{secondaryName}</span>
                                                        )}
                                                    </div>
                                                    <div className={cn("mt-auto pt-1", "text-start")}>
                                                        <span className="text-base font-black text-primary">{formatPrice(opt.price)}</span>
                                                    </div>
                                                    {orderMode && selectedOptionId === opt.id && (
                                                        <Check className="absolute top-2 end-2 h-4 w-4 text-primary" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* Ingredients from recipeItems — each row lists its
                            available swap alternatives (Pita → Saj, etc.) so
                            customers know which parts of the dish can be
                            customized at order time.
                            Hidden for promo-only products (UseCustomPrice = true):
                            those are treated as marketing listings rather than
                            costed recipes, so the public detail panel skips them. */}
                        {!isSoon && !product.useCustomPrice && product.recipeItems && product.recipeItems.length > 0 && (
                            <div className="showcase-detail-section" dir={isAr ? 'rtl' : 'ltr'}>
                                <h4
                                    className={cn("showcase-detail-section-title", "text-start")}
                                    dir="ltr"
                                    style={{
                                        flexDirection: isAr ? 'row-reverse' : 'row',
                                        justifyContent: isAr ? 'flex-end' : 'flex-start',
                                        width: isAr ? 'fit-content' : '100%',
                                        marginInlineStart: isAr ? 'auto' : undefined
                                    }}
                                >
                                    <Layers className="w-4 h-4 text-info" />
                                    {t("showcaseIngredients") || "Ingredients"}
                                </h4>
                                <div className={cn("flex flex-wrap gap-1.5", isAr ? "justify-end" : "justify-start")} dir={isAr ? 'rtl' : 'ltr'}>
                                    {product.recipeItems.map((ri) => {
                                        const activeAlts = (ri.alternatives ?? [])
                                            .filter((a) => a.isActive)
                                            .sort((a, b) => a.sortOrder - b.sortOrder);
                                        const hasAlts = activeAlts.length > 0;
                                        const origName = isAr ? (ri.rawMaterialNameAr || ri.rawMaterialName) : ri.rawMaterialName;
                                        return (
                                            <div
                                                key={ri.id}
                                                className={cn(
                                                    "inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                                                    hasAlts ? "border-primary/30 bg-primary/[0.04] text-primary" : "border-border bg-muted/40 text-foreground"
                                                )}
                                            >
                                                <span className="font-semibold">{origName}</span>
                                                {hasAlts && (
                                                    <>
                                                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary-foreground">
                                                            {isAr ? "قابل للتبديل" : "Swappable"}
                                                        </span>
                                                        {activeAlts.map((alt) => {
                                                            const altName = (isAr && (alt.nameAr || alt.rawMaterialNameAr))
                                                                ? (alt.nameAr || alt.rawMaterialNameAr)
                                                                : (alt.name || alt.rawMaterialName);
                                                            const priceImpact = resolveRecipeAlternativePriceImpactForRow(product, ri, alt);
                                                            const priceLabel = resolveRecipeAlternativePriceLabel(priceImpact, formatPrice);
                                                            return (
                                                                <span
                                                                    key={alt.id}
                                                                    className={cn(
                                                                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                                                                        alt.isDefault
                                                                            ? "border-primary/50 bg-primary/10 text-primary"
                                                                            : "border-border bg-background text-foreground"
                                                                    )}
                                                                >
                                                                    {alt.isDefault && (
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider">
                                                                            {isAr ? "الافتراضي" : "Default"}
                                                                        </span>
                                                                    )}
                                                                    <span>↪ {altName}</span>
                                                                    {priceLabel && (
                                                                        <span className={cn("font-bold", priceImpact < 0 ? "text-emerald-600" : "text-primary")}>
                                                                            {priceLabel}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Modifier Groups */}
                        {!isSoon && product.modifierGroups && product.modifierGroups.length > 0 && (
                            <div className="showcase-detail-section" dir={isAr ? 'rtl' : 'ltr'}>
                                <h4
                                    className={cn("showcase-detail-section-title", "text-start")}
                                    dir="ltr"
                                    style={{
                                        flexDirection: isAr ? 'row-reverse' : 'row',
                                        justifyContent: isAr ? 'flex-end' : 'flex-start',
                                        width: isAr ? 'fit-content' : '100%',
                                        marginInlineStart: isAr ? 'auto' : undefined
                                    }}
                                >
                                    <Package className="w-4 h-4 text-primary" />
                                    {t("showcaseCustomize") || "Customize"}
                                </h4>
                                {product.modifierGroups.map((group) => (
                                    <div key={group.id} className="mb-4 last:mb-0">
                                        <p
                                            className={cn("text-sm font-semibold text-foreground mb-2", "text-start")}
                                            dir={isAr ? 'rtl' : 'ltr'}
                                            style={{
                                                display: 'flex',
                                                justifyContent: isAr ? 'flex-end' : 'flex-start',
                                                alignItems: 'baseline',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <span>{isAr ? (group.nameAr || group.displayName || group.name) : (group.displayName || group.name)}</span>
                                            <span className="text-xs text-muted-foreground font-normal">
                                                {group.selectionType === 0
                                                    ? `(${t("showcasePickOne") || "Pick one"})`
                                                    : `(${t("showcasePickMultiple") || "Pick up to"} ${group.maxSelection})`}
                                            </span>
                                        </p>
                                        <div className="space-y-1.5">
                                            {group.modifiers.filter((modifier) => modifier.isActive !== false).map((mod) => (
                                                <button
                                                    type="button"
                                                    key={mod.id}
                                                    disabled={!orderMode}
                                                    onClick={() => orderMode && toggleModifier(
                                                        group.id,
                                                        mod.id,
                                                        group.selectionType === 0,
                                                        group.maxSelection,
                                                    )}
                                                    className={cn(
                                                        "showcase-modifier-row w-full text-start",
                                                        orderMode && "cursor-pointer",
                                                        selectedModifiers[group.id]?.has(mod.id)
                                                            && "border-primary bg-primary/5 ring-1 ring-primary/20",
                                                    )}
                                                    dir={isAr ? 'rtl' : 'ltr'}
                                                    style={{ direction: isAr ? 'rtl' : 'ltr' }}
                                                >
                                                    <span className="flex items-center gap-2 text-sm text-foreground">
                                                        {orderMode && (
                                                            <span className={cn(
                                                                "flex h-4 w-4 items-center justify-center rounded-full border",
                                                                selectedModifiers[group.id]?.has(mod.id)
                                                                    ? "border-primary bg-primary text-primary-foreground"
                                                                    : "border-border",
                                                            )}>
                                                                {selectedModifiers[group.id]?.has(mod.id) && <Check className="h-3 w-3" />}
                                                            </span>
                                                        )}
                                                            {isAr ? (mod.nameAr || mod.displayName || mod.name) : (mod.displayName || mod.name)}
                                                    </span>
                                                    {mod.priceAdjustment > 0 && (
                                                        <span className="text-xs text-primary font-semibold">
                                                            +{formatPrice(mod.priceAdjustment)}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {orderMode && !isSoon && (
                            <textarea
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                maxLength={500}
                                placeholder={isAr ? "ملاحظات على المنتج" : "Item notes"}
                                className="min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                            />
                        )}
                    </div>
                </ScrollArea>

                {orderMode && !isSoon && (
                    <div className="showcase-detail-footer">
                        <div className="showcase-qty-selector">
                            <button
                                type="button"
                                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                                className="showcase-qty-btn"
                                aria-label={isAr ? "تقليل الكمية" : "Decrease quantity"}
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center text-lg font-bold text-foreground tabular-nums">{quantity}</span>
                            <button
                                type="button"
                                onClick={() => setQuantity((current) => current + 1)}
                                className="showcase-qty-btn"
                                aria-label={isAr ? "زيادة الكمية" : "Increase quantity"}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <Button
                            type="button"
                            className="h-12 flex-1 gap-2 text-base font-bold"
                            disabled={!canAdd}
                            onClick={addToCart}
                        >
                            <ShoppingBag className="h-4 w-4" />
                            {isAr ? "أضف للسلة" : "Add to cart"}
                            <span className="opacity-70">{formatPrice(orderUnitPrice * quantity)}</span>
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
