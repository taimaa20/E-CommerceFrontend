
import { Egg, Milk, Wheat, Bean, Cookie, Nut, Palmtree, FlaskConical, Carrot, Fish, Wine, Flame, Leaf, Salad } from 'lucide-react';

export const ALLERGENS = [
    { id: 'egg', nameTr: 'Yumurta ve Ürünleri', nameEn: 'Eggs and Products', icon: Egg, color: 'text-yellow-400' },
    { id: 'milk', nameTr: 'Süt ve Süt Ürünleri', nameEn: 'Milk and Dairy Products', icon: Milk, color: 'text-blue-400' },
    { id: 'gluten', nameTr: 'Glüten ve Ürünleri', nameEn: 'Gluten and Products', icon: Wheat, color: 'text-amber-400' },
    { id: 'soy', nameTr: 'Soya ve Ürünleri', nameEn: 'Soy and Products', icon: Bean, color: 'text-green-600' },
    { id: 'sesame', nameTr: 'Susam ve Ürünleri', nameEn: 'Sesame and Products', icon: Cookie, color: 'text-amber-200' },
    { id: 'peanut', nameTr: 'Yer Fıstığı ve Ürünleri', nameEn: 'Peanuts and Products', icon: Nut, color: 'text-orange-700' },
    { id: 'nuts', nameTr: 'Sert Kabuklu Meyveler', nameEn: 'Tree Nuts', icon: Palmtree, color: 'text-amber-800' },
    { id: 'mustard', nameTr: 'Hardal ve Ürünleri', nameEn: 'Mustard and Products', icon: FlaskConical, color: 'text-yellow-600' },
    { id: 'celery', nameTr: 'Kereviz', nameEn: 'Celery', icon: Carrot, color: 'text-green-500' },
    { id: 'fish', nameTr: 'Balık ve Ürünleri', nameEn: 'Fish and Products', icon: Fish, color: 'text-blue-500' },
    { id: 'alcohol', nameTr: 'Alkol', nameEn: 'Alcohol', icon: Wine, color: 'text-purple-500' },
    { id: 'spicy', nameTr: 'Acı', nameEn: 'Spicy', icon: Flame, color: 'text-red-500' },
] as const;

export const DIETS = [
    { id: 'vegan', nameTr: 'Vegan', nameEn: 'Vegan', icon: Leaf, color: 'text-green-500' },
    { id: 'vegetarian', nameTr: 'Vejetaryen', nameEn: 'Vegetarian', icon: Salad, color: 'text-green-600' },
] as const;

export type AllergenId = typeof ALLERGENS[number]['id'];
export type DietId = typeof DIETS[number]['id'];
