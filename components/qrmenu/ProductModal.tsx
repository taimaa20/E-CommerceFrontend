
"use client";

import { useMenu } from '@/store/menuStore';
import { usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ModifierGroupDto, ProductDto } from '@/types/pos';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currencies';
import {
    resolveRecipeAlternativePriceImpactForRow,
    resolveRecipeAlternativePriceLabel,
} from '@/lib/recipe-alternative-pricing';
import { buildProductAvailabilityDateLabel, buildProductAvailabilityTimeLabel } from '@/lib/product-availability';
import { X, Minus, Plus, Check, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import type { SelectedModifier } from './CategoryAccordion';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: ProductDto | null;
    language: 'en' | 'ar';
    onAddToBasket?: (product: ProductDto, quantity: number, notes: string, modifiers: SelectedModifier[]) => void;
}

export default function ProductModal({ isOpen, onClose, product, language, onAddToBasket }: ProductModalProps) {
    const { t } = useLocale();
    const [isVisible, setIsVisible] = useState(false);
    const { settings } = useMenu();
    const { currency } = usePosStore();
    const { settings: systemSettings } = useSettingsStore();
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState("");
    const [selectedModifiers, setSelectedModifiers] = useState<Record<string, Set<string>>>({});
    const [imgError, setImgError] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    const isAr = language === 'ar';
    const isOrderMode = !!onAddToBasket;
    const isOrderableNow = product?.isActive && product?.isAvailableNow;
    const availabilityTimeLabel = product ? buildProductAvailabilityTimeLabel(product, isAr ? 'ar' : 'en') : null;
    const availabilityDateLabel = product ? buildProductAvailabilityDateLabel(product, isAr ? 'ar' : 'en') : null;

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
            setQuantity(1);
            setNote("");
            setSelectedModifiers({});
            setImgError(false);
            setImgLoaded(false);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;
    if (!product) return null;

    const displayName = (isAr && product.nameAr) ? product.nameAr : (product.displayName || product.name);
    const displayDescription = isAr
        ? (product.descriptionAr || "")
        : (product.description || product.descriptionAr || "");

    const imageSrc = !imgError && product.imageUrl && product.imageUrl.length > 5
        ? product.imageUrl
        : (settings.defaultProductImage && settings.defaultProductImage.length > 5)
            ? settings.defaultProductImage
            : null;

    const hasModifiers = product.modifierGroups && product.modifierGroups.length > 0;
    const effectiveCurrency = systemSettings.currency || currency || 'JOD';
    const fmt = (n: number) => formatCurrency(n, effectiveCurrency);
    const getModifierPrice = (mod: ProductDto["modifierGroups"][number]["modifiers"][number]) =>
        mod.isFree || mod.pricingType === 2 ? 0 : mod.priceAdjustment;

    // ─── Modifier logic ─────────────────────────────────────
    const toggleModifier = (group: ModifierGroupDto, modifierId: string) => {
        setSelectedModifiers(prev => {
            const current = prev[group.id] ? new Set(prev[group.id]) : new Set<string>();
            if (group.selectionType === 0) {
                const newSet = new Set<string>();
                if (!current.has(modifierId)) newSet.add(modifierId);
                return { ...prev, [group.id]: newSet };
            } else {
                if (current.has(modifierId)) {
                    current.delete(modifierId);
                } else {
                    const max = group.maxSelection > 0 ? group.maxSelection : Infinity;
                    if (current.size < max) current.add(modifierId);
                }
                return { ...prev, [group.id]: current };
            }
        });
    };

    const buildSelectedModifiers = (): SelectedModifier[] => {
        if (!hasModifiers) return [];
        const result: SelectedModifier[] = [];
        for (const group of product.modifierGroups) {
            const selected = selectedModifiers[group.id];
            if (!selected) continue;
            for (const modId of selected) {
                const mod = group.modifiers.find(m => m.id === modId);
                if (mod) {
                    result.push({
                        modifierName: (isAr && mod.nameAr) ? mod.nameAr : (mod.displayName || mod.name),
                        price: getModifierPrice(mod),
                    });
                }
            }
        }
        return result;
    };

    const modifierExtra = isOrderMode ? buildSelectedModifiers().reduce((sum, m) => sum + m.price, 0) : 0;
    const unitPrice = (product.discountedPrice || product.basePrice) + modifierExtra;

    const handleAdd = () => {
        if (!product.isActive || !product.isAvailableNow) {
            return;
        }
        if (onAddToBasket) {
            onAddToBasket(product, quantity, note, buildSelectedModifiers());
            onClose();
        }
    };

    // Check if all required modifier groups are satisfied
    const requiredGroupsSatisfied = !hasModifiers || product.modifierGroups.every(group => {
        if (group.minSelection <= 0) return true;
        const selected = selectedModifiers[group.id];
        return selected && selected.size >= group.minSelection;
    });

    return (
        <div className={cn(
            "fixed inset-0 z-[60] flex items-end sm:items-center justify-center transition-all duration-300",
            isOpen ? "visible opacity-100" : "invisible opacity-0"
        )}>
            {/* Backdrop */}
            <div
                className={cn("absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0")}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={cn(
                    "relative w-[calc(100vw-1rem)] sm:w-[min(680px,92vw)] overflow-hidden bg-white shadow-2xl transition-all duration-300 transform flex flex-col",
                    "rounded-t-3xl sm:rounded-3xl h-[100dvh] sm:h-auto sm:max-h-[90vh] min-h-0",
                    isOpen ? "scale-100 translate-y-0" : "translate-y-full sm:scale-95 sm:translate-y-8"
                )}
                dir={isAr ? 'rtl' : 'ltr'}
            >
                {/* Drag indicator (mobile) */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="h-1 w-10 rounded-full bg-gray-200" />
                </div>

                {/* Sticky modal header */}
                <div className="sticky top-0 z-30 flex items-center justify-end border-b border-gray-100 bg-white/95 px-3 py-2 backdrop-blur-sm">
                    <button
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-90 transition-all"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth touch-pan-y">
                    {/* Hero Image */}
                    {imageSrc ? (
                        <div className="relative aspect-[16/10] w-full bg-gray-100 overflow-hidden">
                            <img
                                src={imageSrc}
                                alt=""
                                className={cn(
                                    "absolute inset-0 w-full h-full object-cover transition-all duration-700",
                                    imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
                                )}
                                onLoad={() => setImgLoaded(true)}
                                onError={() => setImgError(true)}
                            />
                            {!imgLoaded && (
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
                            )}

                            {/* Gradient scrim for readability */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />

                            {/* Price badge on image */}
                            <div className="absolute bottom-4 end-4 flex items-center gap-2">
                                {product.discountedPrice ? (
                                    <>
                                        <span className="text-sm text-white/60 line-through drop-shadow-md">{fmt(product.basePrice)}</span>
                                        <span className="rounded-xl px-3 py-1.5 text-lg font-black text-white shadow-lg backdrop-blur-md" style={{ backgroundColor: 'var(--primary)' }}>
                                            {fmt(product.discountedPrice)}
                                        </span>
                                    </>
                                ) : (
                                    <span className="rounded-xl px-3 py-1.5 text-lg font-black text-white shadow-lg backdrop-blur-md" style={{ backgroundColor: 'var(--primary)' }}>
                                        {fmt(product.basePrice)}
                                    </span>
                                )}
                            </div>

                            {/* Sale badge */}
                            {product.discountedPrice && (
                                <div className="absolute top-4 start-4 rounded-lg bg-red-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                                    {t("saleLabel") || "SALE"}
                                </div>
                            )}

                            {/* Out of stock overlay */}
                            {!product.isActive && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                                    <span className="rounded-full bg-white/90 px-5 py-2 text-sm font-bold text-gray-900 shadow-md">
                                        {t("outOfStock") || "Out of Stock"}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* No image — styled header */
                        <div className="relative px-6 pt-14 pb-6" style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #000))' }}>
                            <div className="flex items-center gap-3">
                                {product.discountedPrice ? (
                                    <>
                                        <span className="text-3xl font-black text-white">{fmt(product.discountedPrice)}</span>
                                        <span className="text-base text-white/50 line-through">{fmt(product.basePrice)}</span>
                                    </>
                                ) : (
                                    <span className="text-3xl font-black text-white">{fmt(product.basePrice)}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Details Section */}
                    <div className={cn("p-4 sm:p-6 space-y-5", "text-start") }>
                        {/* Title & Description */}
                        <div className={cn("text-start")}>
                            <h2 className="text-xl font-bold leading-tight text-gray-900 mb-1">{displayName}</h2>
                            {!imageSrc && (
                                <p className="text-lg font-bold mt-1" style={{ color: 'var(--primary)' }}>{fmt(product.basePrice)}</p>
                            )}
                            {displayDescription && (
                                <p className="text-sm text-gray-500 leading-relaxed mt-2">{displayDescription}</p>
                            )}
                        </div>

                        {/* Product Variants (read-only display). Shows Pita / Saj / etc.
                            so customers know variants exist. Actual selection
                            happens in the POS modal at order time. */}
                        {(product.options?.filter((o) => o.isActive).length ?? 0) > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        {isAr ? "الأنواع المتاحة" : "Choose Your Variant"}
                                    </h3>
                                    <span className="text-[10px] text-gray-400">
                                        {product.options!.filter((o) => o.isActive).length} {isAr ? "خيارات" : "options"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                                    {product.options!.filter((o) => o.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((opt) => {
                                        const displayName = (isAr && opt.nameAr) ? opt.nameAr : opt.name;
                                        const secondaryName = (isAr && opt.nameAr) ? opt.name : (opt.nameAr || null);
                                        return (
                                            <div
                                                key={opt.id}
                                                className={cn(
                                                    "relative flex flex-col gap-1 rounded-2xl border-2 bg-gradient-to-br from-white to-gray-50/80 p-3 shadow-sm transition-all",
                                                    opt.isDefault ? "border-primary/60 ring-2 ring-primary/10" : "border-gray-200"
                                                )}
                                            >
                                                {opt.isDefault && (
                                                    <span
                                                        className={cn(
                                                            "absolute -top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md",
                                                            isAr ? "end-2" : "start-2"
                                                        )}
                                                        style={{ backgroundColor: 'var(--primary)' }}
                                                    >
                                                        {isAr ? "الافتراضي" : "Default"}
                                                    </span>
                                                )}
                                                <div className={cn("flex flex-col", "items-start text-start")}>
                                                    <span className="text-sm font-bold text-gray-800 leading-tight">{displayName}</span>
                                                    {secondaryName && (
                                                        <span className="text-[10px] text-gray-400 leading-tight">{secondaryName}</span>
                                                    )}
                                                </div>
                                                <div className={cn("mt-auto pt-1", "text-start")}>
                                                    <span className="text-base font-black" style={{ color: 'var(--primary)' }}>
                                                        {fmt(opt.price)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Ingredients / Recipe — each ingredient lists its available
                            swap alternatives (Pita → Saj, etc.) so customers know
                            which parts of the dish can be customized at order time. */}
                        {product.recipeItems && product.recipeItems.length > 0 && (
                            <div>
                                <h3 className={cn("text-xs font-bold uppercase tracking-wider text-gray-400 mb-2", "text-start")}>
                                    {t("ingredients") || "Ingredients"}
                                </h3>
                                <div className={cn("flex flex-wrap gap-1.5", isAr ? "justify-end" : "justify-start")}>
                                    {product.recipeItems.map(ri => {
                                        const activeAlts = (ri.alternatives ?? []).filter(a => a.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
                                        const hasAlts = activeAlts.length > 0;
                                        const origName = (isAr && ri.rawMaterialNameAr) ? ri.rawMaterialNameAr : ri.rawMaterialName;
                                        return (
                                            <div
                                                key={ri.id}
                                                className={cn(
                                                    "inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]",
                                                    hasAlts ? "border-primary/30 bg-primary/[0.03]" : "border-gray-200 bg-gray-50 text-gray-700"
                                                )}
                                            >
                                                <span className="font-semibold">{origName}</span>
                                                {hasAlts && (
                                                    <>
                                                        <span
                                                            className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase text-white"
                                                            style={{ backgroundColor: 'var(--primary)' }}
                                                        >
                                                            {isAr ? "قابل للتبديل" : "Swappable"}
                                                        </span>
                                                        {activeAlts.map(alt => {
                                                            const altName = (isAr && (alt.nameAr || alt.rawMaterialNameAr))
                                                                ? (alt.nameAr || alt.rawMaterialNameAr)
                                                                : (alt.name || alt.rawMaterialName);
                                                            const priceImpact = resolveRecipeAlternativePriceImpactForRow(product, ri, alt);
                                                            const priceLabel = resolveRecipeAlternativePriceLabel(priceImpact, fmt);
                                                            return (
                                                                <span
                                                                    key={alt.id}
                                                                    className={cn(
                                                                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                                                        alt.isDefault
                                                                            ? "border-primary/50 bg-primary/10 text-primary"
                                                                            : "border-gray-300 bg-white text-gray-700"
                                                                    )}
                                                                >
                                                                    {alt.isDefault && (
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider">
                                                                            {isAr ? "الافتراضي" : "Default"}
                                                                        </span>
                                                                    )}
                                                                    <span>↪ {altName}</span>
                                                                    {priceLabel && (
                                                                        <span
                                                                            className={cn(
                                                                                "font-bold",
                                                                                priceImpact < 0 ? "text-emerald-600" : ""
                                                                            )}
                                                                            style={priceImpact > 0 ? { color: 'var(--primary)' } : undefined}
                                                                        >
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
                        {hasModifiers && (
                            <div className="space-y-4">
                                {product.modifierGroups.map(group => {
                                    const groupName = (isAr && group.nameAr) ? group.nameAr : (group.displayName || group.name);
                                    const selected = selectedModifiers[group.id] ?? new Set<string>();
                                    const isRequired = group.minSelection > 0;
                                    const isSingle = group.selectionType === 0;

                                    return (
                                        <div key={group.id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-bold text-gray-800">{groupName}</h4>
                                                {isOrderMode && (
                                                    <span className={cn(
                                                        "text-[10px] px-2.5 py-0.5 rounded-full font-semibold",
                                                        isRequired ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-500"
                                                    )}>
                                                        {isRequired ? (t("required") || "Required") : (t("optional") || "Optional")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={isOrderMode ? "space-y-2" : "flex flex-wrap gap-2"}>
                                                {group.modifiers.map(mod => {
                                                    const modName = (isAr && mod.nameAr) ? mod.nameAr : (mod.displayName || mod.name);
                                                    const isSelected = selected.has(mod.id);

                                                    if (!isOrderMode) {
                                                        return (
                                                            <span key={mod.id} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
                                                                {modName}
                                                                {getModifierPrice(mod) > 0 && (
                                                                    <span className="text-[10px] font-semibold" style={{ color: 'var(--primary)' }}>
                                                                        +{fmt(getModifierPrice(mod))}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <button
                                                            key={mod.id}
                                                            onClick={() => toggleModifier(group, mod.id)}
                                                            className={cn(
                                                                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200",
                                                                isSelected
                                                                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                                                                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "flex h-5 w-5 items-center justify-center border-2 transition-all shrink-0",
                                                                    isSingle ? "rounded-full" : "rounded-md",
                                                                    isSelected ? "border-primary bg-primary" : "border-gray-300"
                                                                )}>
                                                                    {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                                                </div>
                                                                <span>{modName}</span>
                                                            </div>
                                                            {getModifierPrice(mod) > 0 ? (
                                                                <span className="text-xs font-semibold text-gray-400">
                                                                    +{fmt(getModifierPrice(mod))}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs font-semibold text-gray-400">
                                                                    {t("freeLabel")}
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {!isOrderableNow && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                                <div>{isAr ? "هذا المنتج غير متاح حاليًا ولا يمكن إضافته إلى السلة" : "This product is not available right now and cannot be added to the cart."}</div>
                                {availabilityTimeLabel && <div className="mt-1 text-xs text-amber-600">{availabilityTimeLabel}</div>}
                                {availabilityDateLabel && <div className="mt-1 text-xs text-amber-600">{availabilityDateLabel}</div>}
                            </div>
                        )}

                        {/* Order mode: Notes + Quantity + Add button */}
                        {isOrderMode && isOrderableNow && (
                            <>
                                <div>
                                    <label className={cn("block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2", "text-start")}>
                                        {t("addNoteLabel") || "Special requests"}
                                    </label>
                                    <textarea
                                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all bg-gray-50/50 placeholder:text-gray-400"
                                        rows={2}
                                        placeholder={t("specialRequestsPlaceholder") || "Any special requests?"}
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        dir={isAr ? 'rtl' : 'ltr'}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Sticky bottom bar for ordering */}
                {isOrderMode && isOrderableNow && (
                    <div className="sticky bottom-0 flex flex-col gap-3 border-t border-gray-100 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center">
                        {/* Quantity selector */}
                        <div className="flex items-center justify-center rounded-xl bg-gray-100 p-1 sm:justify-start">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="h-10 w-10 flex items-center justify-center rounded-lg bg-white shadow-sm text-gray-700 hover:bg-gray-50 active:scale-90 transition-all"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="w-10 text-center font-bold text-lg text-gray-900">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="h-10 w-10 flex items-center justify-center rounded-lg bg-white shadow-sm text-gray-700 hover:bg-gray-50 active:scale-90 transition-all"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* Add button */}
                        <button
                            onClick={handleAdd}
                            disabled={!requiredGroupsSatisfied}
                            className={cn(
                                "flex h-auto min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-md transition-all sm:flex-1",
                                requiredGroupsSatisfied
                                    ? "active:scale-[0.97]"
                                    : "opacity-50 cursor-not-allowed"
                            )}
                            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                        >
                            <ShoppingBag size={16} />
                            <span>{t("addToCartBtn") || "Add to cart"}</span>
                            <span className="mx-1 opacity-40">·</span>
                            <span>{fmt(unitPrice * quantity)}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
