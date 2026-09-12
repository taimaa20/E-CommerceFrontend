"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/components/locale-provider";
import { ProductDto, RecipeItemDto } from "@/types/pos";
import { Flame } from "lucide-react";

interface ProductQuickViewDialogProps {
  product: ProductDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const text = {
  en: {
    description: "Description",
    noDescription: "No description available",
    calories: "Calories",
    calorieUnit: "kcal",
    noCalories: "Not specified",
    ingredients: "Ingredients",
    noIngredients: "No ingredients listed",
  },
  ar: {
    description: "الوصف",
    noDescription: "لا يوجد وصف",
    calories: "السعرات الحرارية",
    calorieUnit: "سعرة",
    noCalories: "غير محدد",
    ingredients: "المكونات",
    noIngredients: "لا توجد مكونات مسجلة",
  },
};

const getProductName = (product: ProductDto, locale: string) =>
  locale === "ar" && product.nameAr ? product.nameAr : product.displayName || product.name;

const getDescription = (product: ProductDto, locale: string) =>
  locale === "ar" && product.descriptionAr ? product.descriptionAr : product.description;

const getIngredientName = (item: RecipeItemDto, locale: string) =>
  locale === "ar" && item.rawMaterialNameAr ? item.rawMaterialNameAr : item.rawMaterialName;

const shouldShowIngredient = (item: RecipeItemDto) => item.showInMenu !== false;

function CaloriesBlock({ calories, copy }: { calories?: number; copy: typeof text.en }) {
  return (
    <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-800">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <Flame className="h-4 w-4" />
        {copy.calories}
      </div>
      <div>{calories != null ? `${calories} ${copy.calorieUnit}` : copy.noCalories}</div>
    </div>
  );
}

function IngredientsBlock({ ingredients, locale, copy }: { ingredients: RecipeItemDto[]; locale: string; copy: typeof text.en }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{copy.ingredients}</h3>
      {ingredients.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {ingredients.map((item) => (
            <span key={item.id} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              {getIngredientName(item, locale)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{copy.noIngredients}</p>
      )}
    </div>
  );
}

export default function ProductQuickViewDialog({ product, open, onOpenChange }: ProductQuickViewDialogProps) {
  const { locale } = useLocale();
  const copy = locale === "ar" ? text.ar : text.en;
  const description = product ? getDescription(product, locale) : "";
  const ingredients = (product?.recipeItems ?? []).filter(shouldShowIngredient);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {product && (
          <>
            <DialogHeader>
              <DialogTitle className="pe-8 text-xl leading-snug">
                {getProductName(product, locale)}
              </DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">
                {description || copy.noDescription}
              </p>
              <CaloriesBlock calories={product.calories} copy={copy} />
              <IngredientsBlock ingredients={ingredients} locale={locale} copy={copy} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
