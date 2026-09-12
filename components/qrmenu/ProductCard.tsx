
"use client";

import { usePosStore } from '@/store/posStore';
import { useMenu } from '@/store/menuStore';
import { ProductDto } from '@/types/pos';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/locale-provider';
import { buildProductAvailabilityDateLabel, buildProductAvailabilityTimeLabel } from '@/lib/product-availability';
import { productImage, productImageSrcSet } from '@/lib/product-image';
import { memo, useState } from 'react';
import { Flame, Plus } from 'lucide-react';

interface ProductCardProps {
    product: ProductDto;
    language: 'en' | 'ar';
    onClick?: () => void;
    layoutMode?: 'grid' | 'list';
}

function ProductCardInner({ product, language, onClick, layoutMode = 'grid' }: ProductCardProps) {
    const { t } = useLocale();
    const { settings } = useMenu();
    const { currency } = usePosStore();
    const [imgError, setImgError] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    const isAr = language === 'ar';
    const displayName = (isAr && product.nameAr) ? product.nameAr : (product.displayName || product.name);
    const displayDescription = (isAr && product.descriptionAr) ? product.descriptionAr : product.description;
    const isInactive = !product.isActive;
    const isUnavailableNow = product.isActive && !product.isAvailableNow;
    const isOutOfStock = isInactive || isUnavailableNow;
    const availabilityTimeLabel = buildProductAvailabilityTimeLabel(product, isAr ? 'ar' : 'en');
    const availabilityDateLabel = buildProductAvailabilityDateLabel(product, isAr ? 'ar' : 'en');

    // Prefer the optimized WebP variant when the row has been processed by the
    // new pipeline (product.imageKey). Legacy rows still resolve via imageUrl.
    // List mode uses the tiny 200-px thumb; grid mode uses the 600-px medium.
    const optimizedSrc = productImage(product.imageKey, product.imageUrl, layoutMode === 'list' ? 'thumb' : 'medium');
    const optimizedSrcSet = productImageSrcSet(product.imageKey, product.imageUrl);
    const hasImage = !imgError && !!optimizedSrc;
    const fallbackImage = settings.defaultProductImage && settings.defaultProductImage.length > 5
        ? settings.defaultProductImage : null;
    const imageSrc = hasImage ? optimizedSrc! : fallbackImage;

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
    const formattedPrice = fmt(product.basePrice);
    const formattedDiscountPrice = product.discountedPrice ? fmt(product.discountedPrice) : null;
    const modifierCount = product.modifierGroups?.length || 0;
    const hasOptions = (product.options?.filter((o) => o.isActive).length ?? 0) > 0;

    // ─── List layout ────────────────────────────────────────
    if (layoutMode === 'list') {
        return (
            <div
                onClick={isOutOfStock ? undefined : onClick}
                className={cn(
                    "group flex gap-4 p-4 bg-white rounded-2xl transition-all duration-200 cursor-pointer",
                    isOutOfStock ? "opacity-50 cursor-not-allowed" : "hover:shadow-md active:scale-[0.99]"
                )}
            >
                {imageSrc && (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        <img src={imageSrc}
                            srcSet={optimizedSrcSet}
                            sizes="80px"
                            alt="" loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            className={cn("h-full w-full object-cover", imgLoaded ? "opacity-100" : "opacity-0")}
                            onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} />
                    </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{displayName}</h3>
                    {displayDescription && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{displayDescription}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {product.calories != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                                <Flame className="h-3 w-3" /> {product.calories} kcal
                            </span>
                        )}
                        {hasOptions && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold" style={{ color: 'var(--primary)' }}>
                                {isAr ? 'متعدد الأنواع' : 'Options'}
                            </span>
                        )}
                    </div>
                    <span className="text-sm font-bold mt-1" style={{ color: 'var(--primary)', direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}>
                        {formattedDiscountPrice || formattedPrice}
                    </span>
                    {isUnavailableNow && (
                        <div className={cn("mt-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-700", "text-start")}>
                            <div className="font-semibold">{isAr ? "غير متاح الآن" : "Unavailable now"}</div>
                            {availabilityTimeLabel && <div className="mt-1 text-amber-600">{availabilityTimeLabel}</div>}
                            {!availabilityTimeLabel && availabilityDateLabel && <div className="mt-1 text-amber-600">{availabilityDateLabel}</div>}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── Grid layout (default) ──────────────────────────────
    return (
        <div
            onClick={isOutOfStock ? undefined : onClick}
            className={cn(
                "group relative flex flex-col bg-white rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 h-full",
                "shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.08)]",
                isOutOfStock
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-[0_8px_30px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            )}
        >
            {/* Image Area */}
            {imageSrc ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
                    <img
                        src={imageSrc}
                        srcSet={optimizedSrcSet}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        alt="" loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        className={cn(
                            "h-full w-full object-cover transition-all duration-700 ease-out",
                            imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]",
                            !isOutOfStock && "group-hover:scale-105"
                        )}
                        onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
                    />
                    {!imgLoaded && (
                        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
                    )}

                    {/* Discount badge */}
                    {product.discountedPrice && !isOutOfStock && (
                        <div className="absolute top-3 start-3 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 shadow-lg shadow-red-500/20">
                            <span className="text-[10px] font-bold text-white tracking-wide">{t("saleLabel") || "SALE"}</span>
                        </div>
                    )}

                    {/* Out of stock */}
                    {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[3px]">
                            <span className="rounded-full bg-gray-900 px-4 py-1.5 text-[11px] font-bold text-white tracking-wide">
                                {isInactive ? (t("outOfStock") || "Sold Out") : (isAr ? "غير متاح الآن" : "Unavailable now")}
                            </span>
                        </div>
                    )}

                    {/* Hover plus icon */}
                    {!isOutOfStock && (
                        <div className="absolute bottom-2.5 end-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100"
                             style={{ color: 'var(--primary)' }}>
                            <Plus size={16} strokeWidth={2.5} />
                        </div>
                    )}
                </div>
            ) : (
                /* No-image: gradient placeholder with initial */
                <div
                    className="relative aspect-[4/3] w-full flex items-center justify-center overflow-hidden"
                    style={{ background: `linear-gradient(145deg, color-mix(in srgb, var(--primary) 12%, #f8f8f8), color-mix(in srgb, var(--primary) 6%, #fff))` }}
                >
                    <span className="text-4xl font-black select-none" style={{ color: 'color-mix(in srgb, var(--primary) 30%, transparent)' }}>
                        {displayName.charAt(0).toUpperCase()}
                    </span>
                    {/* Discount badge */}
                    {product.discountedPrice && !isOutOfStock && (
                        <div className="absolute top-3 start-3 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 shadow-lg shadow-red-500/20">
                            <span className="text-[10px] font-bold text-white tracking-wide">{t("saleLabel") || "SALE"}</span>
                        </div>
                    )}
                    {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[3px]">
                            <span className="rounded-full bg-gray-900 px-4 py-1.5 text-[11px] font-bold text-white tracking-wide">
                                {isInactive ? (t("outOfStock") || "Sold Out") : (isAr ? "غير متاح الآن" : "Unavailable now")}
                            </span>
                        </div>
                    )}
                    {!isOutOfStock && (
                        <div className="absolute bottom-2.5 end-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100"
                             style={{ color: 'var(--primary)' }}>
                            <Plus size={16} strokeWidth={2.5} />
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
                <h3 className="text-xs sm:text-[13px] font-semibold leading-snug text-gray-900 line-clamp-2">
                    {displayName}
                </h3>

                {displayDescription && (
                    <p className="text-[10px] sm:text-[11px] leading-relaxed text-gray-400 line-clamp-2 mt-0.5">
                        {displayDescription}
                    </p>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {product.calories != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                            <Flame className="h-3 w-3" /> {product.calories} kcal
                        </span>
                    )}
                    {hasOptions && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold" style={{ color: 'var(--primary)' }}>
                            {isAr ? 'متعدد الأنواع' : 'Options'}
                        </span>
                    )}
                </div>

                {isUnavailableNow && (
                    <div className={cn("mt-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-700", "text-start")}>
                        <div className="font-semibold">{isAr ? "غير متاح الآن" : "Unavailable now"}</div>
                        {availabilityTimeLabel && <div className="mt-1 text-amber-600">{availabilityTimeLabel}</div>}
                        {!availabilityTimeLabel && availabilityDateLabel && <div className="mt-1 text-amber-600">{availabilityDateLabel}</div>}
                    </div>
                )}

                {/* Price */}
                <div className="mt-auto flex items-end justify-between pt-2">
                    <div className="flex items-baseline gap-1" style={{ direction: isAr ? 'rtl' : 'ltr', flexDirection: isAr ? 'row-reverse' : 'row' }}>
                        {formattedDiscountPrice ? (
                            <>
                                <span className="text-[13px] sm:text-[15px] font-bold" style={{ color: 'var(--primary)' }}>
                                    {formattedDiscountPrice}
                                </span>
                                <span className="text-[10px] text-gray-300 line-through">{formattedPrice}</span>
                            </>
                        ) : (
                            <span className="text-[13px] sm:text-[15px] font-bold" style={{ color: 'var(--primary)' }}>
                                {formattedPrice}
                            </span>
                        )}
                    </div>

                    {modifierCount > 0 && !isOutOfStock && (
                        <span className="text-[9px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            +{modifierCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

const ProductCard = memo(ProductCardInner);
export default ProductCard;
