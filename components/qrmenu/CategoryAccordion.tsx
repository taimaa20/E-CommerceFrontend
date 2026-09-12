
"use client";

import { cn } from '@/lib/utils';
import { useState, memo } from 'react';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import { useMenu } from '@/store/menuStore';
import { CategoryDto, ProductDto } from '@/types/pos';
import { useLocale } from '@/components/locale-provider';

export interface SelectedModifier {
    modifierName: string;
    price: number;
}

interface CategoryAccordionProps {
    categories: CategoryDto[];
    products: ProductDto[];
    language: 'en' | 'ar';
    onAddToBasket?: (product: ProductDto, quantity: number, notes: string, modifiers: SelectedModifier[]) => void;
}

function CategoryAccordionInner({ categories, products, language, onAddToBasket }: CategoryAccordionProps) {
    const { t } = useLocale();
    const { settings } = useMenu();
    const isAr = language === 'ar';

    const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

    const handleProductClick = (product: ProductDto) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedProduct(null), 300);
    };

    const handleImgError = (categoryId: string) => {
        setImgErrors(prev => new Set(prev).add(categoryId));
    };

    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const otherLabel = isAr ? "أخرى" : "Other";

    return (
        <>
            <ProductModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                product={selectedProduct}
                language={language}
                onAddToBasket={onAddToBasket}
            />

            <div className="space-y-7 sm:space-y-10">
                {sorted.map((category) => {
                    const categoryProducts = products.filter(p => p.categoryId === category.id);
                    if (categoryProducts.length === 0) return null;

                    const displayName = (isAr && category.nameAr) ? category.nameAr : (category.displayName || category.name);
                    const hasValidImage = category.imageUrl && category.imageUrl.length > 5 && !imgErrors.has(category.id);
                    const activeSubcategories = [...(category.subcategories || [])]
                        .filter((subcategory) => subcategory.isActive)
                        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
                    const activeSubcategoryIds = new Set(activeSubcategories.map((subcategory) => subcategory.id));
                    const directProducts = categoryProducts.filter((product) => !product.subcategoryId || !activeSubcategoryIds.has(product.subcategoryId));

                    return (
                        <section
                            key={category.id}
                            id={`category-${category.id}`}
                            className="scroll-mt-36"
                        >
                            {/* Category Header */}
                            {hasValidImage ? (
                                <div className="relative h-28 sm:h-40 rounded-2xl overflow-hidden mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                                    <img
                                        src={category.imageUrl!}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover"
                                        onError={() => handleImgError(category.id)}
                                    />
                                    {/* Cinematic gradient overlay */}
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)'
                                    }} />
                                    <div className="relative z-10 flex h-full items-end p-6">
                                        <div>
                                            <h2
                                                className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
                                                style={{ fontFamily: settings.categoryFontFamily ? `"${settings.categoryFontFamily}", sans-serif` : undefined }}
                                            >
                                                {displayName}
                                            </h2>
                                            <p className="text-sm text-white/60 font-medium mt-1">
                                                {categoryProducts.length} {categoryProducts.length === 1 ? (t("item") || "item") : (t("itemsCol") || "items")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Text-only category header */
                                <div className="mb-5 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0 shadow-md"
                                         style={{ backgroundColor: 'var(--primary)' }}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2
                                            className="text-xl font-bold text-gray-900 tracking-tight"
                                            style={{ fontFamily: settings.categoryFontFamily ? `"${settings.categoryFontFamily}", sans-serif` : undefined }}
                                        >
                                            {displayName}
                                        </h2>
                                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                                            {categoryProducts.length} {categoryProducts.length === 1 ? (t("item") || "item") : (t("itemsCol") || "items")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeSubcategories.length === 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                                    {categoryProducts.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            language={language}
                                            layoutMode="grid"
                                            onClick={() => handleProductClick(product)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {activeSubcategories.map((subcategory) => {
                                        const subcategoryProducts = categoryProducts.filter((product) => product.subcategoryId === subcategory.id);
                                        if (subcategoryProducts.length === 0) return null;
                                        const subcategoryName = isAr ? (subcategory.nameAr || subcategory.displayName || subcategory.name) : (subcategory.displayName || subcategory.name);

                                        return (
                                            <div key={subcategory.id} className="space-y-3">
                                                <h3 className="text-base font-bold text-gray-800">{subcategoryName}</h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                                                    {subcategoryProducts.map(product => (
                                                        <ProductCard
                                                            key={product.id}
                                                            product={product}
                                                            language={language}
                                                            layoutMode="grid"
                                                            onClick={() => handleProductClick(product)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {directProducts.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-base font-bold text-gray-800">{otherLabel}</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                                                {directProducts.map(product => (
                                                    <ProductCard
                                                        key={product.id}
                                                        product={product}
                                                        language={language}
                                                        layoutMode="grid"
                                                        onClick={() => handleProductClick(product)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </>
    );
}

const CategoryAccordion = memo(CategoryAccordionInner);
export default CategoryAccordion;
