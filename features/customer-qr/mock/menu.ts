import type { MenuCategory, MenuItem, MenuOffer, MenuSnapshot } from "../types";

const categories: MenuCategory[] = [
  { id: "starters", name: { en: "Starters", ar: "المقبلات" }, icon: "🥗", sortOrder: 1 },
  { id: "mains", name: { en: "Mains", ar: "الأطباق الرئيسية" }, icon: "🍔", sortOrder: 2 },
  { id: "pizza", name: { en: "Pizza", ar: "بيتزا" }, icon: "🍕", sortOrder: 3 },
  { id: "pasta", name: { en: "Pasta", ar: "باستا" }, icon: "🍝", sortOrder: 4 },
  { id: "desserts", name: { en: "Desserts", ar: "الحلويات" }, icon: "🍰", sortOrder: 5 },
  { id: "drinks", name: { en: "Drinks", ar: "المشروبات" }, icon: "🥤", sortOrder: 6 },
  { id: "coffee", name: { en: "Coffee & Tea", ar: "قهوة وشاي" }, icon: "☕", sortOrder: 7 },
];

const sizeGroup = (basePrice: number) => ({
  id: "size",
  label: { en: "Size", ar: "الحجم" },
  required: true,
  multi: false,
  min: 1,
  max: 1,
  options: [
    { id: "small", label: { en: "Small", ar: "صغير" }, priceDelta: 0 },
    { id: "medium", label: { en: "Medium", ar: "وسط" }, priceDelta: +Math.round(basePrice * 0.25 * 100) / 100 },
    { id: "large", label: { en: "Large", ar: "كبير" }, priceDelta: +Math.round(basePrice * 0.5 * 100) / 100 },
  ],
});

const extrasGroup = {
  id: "extras",
  label: { en: "Extras", ar: "إضافات" },
  required: false,
  multi: true,
  min: 0,
  max: 4,
  options: [
    { id: "cheese", label: { en: "Extra cheese", ar: "جبنة إضافية" }, priceDelta: 0.75 },
    { id: "bacon", label: { en: "Bacon", ar: "بيكون" }, priceDelta: 1.25 },
    { id: "avocado", label: { en: "Avocado", ar: "أفوكادو" }, priceDelta: 1.5 },
    { id: "egg", label: { en: "Fried egg", ar: "بيضة مقلية" }, priceDelta: 0.5 },
  ],
};

const spicyGroup = {
  id: "spicy",
  label: { en: "Spice level", ar: "درجة الحرارة" },
  required: true,
  multi: false,
  min: 1,
  max: 1,
  options: [
    { id: "mild", label: { en: "Mild", ar: "خفيف" }, priceDelta: 0 },
    { id: "medium", label: { en: "Medium", ar: "وسط" }, priceDelta: 0 },
    { id: "hot", label: { en: "Hot 🌶", ar: "حار 🌶" }, priceDelta: 0 },
  ],
};

const items: MenuItem[] = [
  // Starters
  {
    id: "i-bruschetta",
    categoryId: "starters",
    name: { en: "Tomato Bruschetta", ar: "بروشيتا الطماطم" },
    description: {
      en: "Toasted sourdough, vine tomatoes, basil, olive oil.",
      ar: "خبز محمص مع طماطم وريحان وزيت زيتون.",
    },
    price: 4.5,
    imageUrl: "/mock/customer-qr/menu/bruschetta.svg",
    badges: ["popular", "vegan"],
    calories: 280,
    prepMinutes: 8,
    availability: "available",
  },
  {
    id: "i-soup",
    categoryId: "starters",
    name: { en: "Lentil Soup", ar: "شوربة عدس" },
    description: {
      en: "Slow-cooked red lentils, cumin, lemon.",
      ar: "عدس أحمر مطبوخ على نار هادئة مع كمون وليمون.",
    },
    price: 3.25,
    imageUrl: "/mock/customer-qr/menu/lentil-soup.svg",
    badges: ["vegan", "gluten-free"],
    calories: 220,
    prepMinutes: 6,
    availability: "available",
  },
  {
    id: "i-fries",
    categoryId: "starters",
    name: { en: "Truffle Fries", ar: "بطاطس بزيت الكمأة" },
    description: {
      en: "Crispy fries, truffle oil, parmesan dust.",
      ar: "بطاطس مقرمشة مع زيت كمأة وجبنة بارميزان.",
    },
    price: 5.75,
    imageUrl: "/mock/customer-qr/menu/truffle-fries.svg",
    badges: ["popular"],
    calories: 410,
    prepMinutes: 9,
    availability: "available",
    extras: [extrasGroup],
  },
  // Mains
  {
    id: "i-burger",
    categoryId: "mains",
    name: { en: "Smashed Beef Burger", ar: "برغر لحم مهروس" },
    description: {
      en: "Double smashed patties, cheddar, pickles, signature sauce.",
      ar: "قرصان لحم مهروسان، شيدر، مخلل، صلصة المحل.",
    },
    price: 9.5,
    imageUrl: "/website/brand/photo-wraps-board.jpg",
    badges: ["popular"],
    calories: 760,
    prepMinutes: 14,
    availability: "available",
    extras: [extrasGroup, spicyGroup],
  },
  {
    id: "i-chicken",
    categoryId: "mains",
    name: { en: "Grilled Chicken Plate", ar: "صحن دجاج مشوي" },
    description: {
      en: "Chicken breast, garlic rice, charred peppers.",
      ar: "صدر دجاج مع أرز بالثوم وفليفلة مشوية.",
    },
    price: 11.25,
    imageUrl: "/mock/customer-qr/menu/grilled-chicken.svg",
    badges: ["gluten-free"],
    calories: 580,
    prepMinutes: 16,
    availability: "available",
  },
  {
    id: "i-steak",
    categoryId: "mains",
    name: { en: "Ribeye Steak", ar: "ستيك ريب آي" },
    description: {
      en: "300g ribeye, peppercorn jus, seasonal greens.",
      ar: "ستيك 300غ مع صلصة الفلفل وخضار موسمية.",
    },
    price: 22.0,
    imageUrl: "/mock/customer-qr/menu/steak.svg",
    badges: ["new"],
    calories: 920,
    prepMinutes: 22,
    availability: "low",
  },
  // Pizza
  {
    id: "i-margherita",
    categoryId: "pizza",
    name: { en: "Margherita", ar: "مارجريتا" },
    description: {
      en: "San Marzano tomato, fresh mozzarella, basil.",
      ar: "طماطم سان مارزانو، موزاريلا طازجة، ريحان.",
    },
    price: 8.0,
    imageUrl: "/mock/customer-qr/menu/margherita.svg",
    badges: ["popular"],
    calories: 720,
    prepMinutes: 12,
    availability: "available",
    extras: [sizeGroup(8), extrasGroup],
  },
  {
    id: "i-pepperoni",
    categoryId: "pizza",
    name: { en: "Pepperoni", ar: "ببروني" },
    description: {
      en: "Spicy pepperoni, mozzarella, oregano.",
      ar: "ببروني حار، موزاريلا، أوريغانو.",
    },
    price: 9.75,
    imageUrl: "/mock/customer-qr/menu/pepperoni.svg",
    badges: ["spicy"],
    calories: 880,
    prepMinutes: 12,
    availability: "available",
    extras: [sizeGroup(9.75)],
  },
  // Pasta
  {
    id: "i-carbonara",
    categoryId: "pasta",
    name: { en: "Carbonara", ar: "كاربونارا" },
    description: {
      en: "Egg yolk, guanciale, pecorino, black pepper.",
      ar: "صفار البيض، جوانشيالي، بيكورينو، فلفل أسود.",
    },
    price: 10.5,
    imageUrl: "/mock/customer-qr/menu/carbonara.svg",
    badges: ["popular"],
    calories: 690,
    prepMinutes: 13,
    availability: "available",
  },
  {
    id: "i-pesto",
    categoryId: "pasta",
    name: { en: "Pesto Linguine", ar: "لينغويني بالبيستو" },
    description: {
      en: "Basil pesto, toasted pine nuts, parmesan.",
      ar: "بيستو الريحان، صنوبر محمص، بارميزان.",
    },
    price: 9.25,
    imageUrl: "/mock/customer-qr/menu/pesto.svg",
    badges: ["vegan"],
    calories: 610,
    prepMinutes: 12,
    availability: "available",
  },
  // Desserts
  {
    id: "i-cheesecake",
    categoryId: "desserts",
    name: { en: "Berry Cheesecake", ar: "تشيز كيك التوت" },
    description: {
      en: "New York style, raspberry coulis.",
      ar: "تشيز كيك نيويورك مع صلصة التوت.",
    },
    price: 4.75,
    imageUrl: "/mock/customer-qr/menu/cheesecake.svg",
    badges: ["popular"],
    calories: 420,
    prepMinutes: 3,
    availability: "available",
  },
  {
    id: "i-brownie",
    categoryId: "desserts",
    name: { en: "Molten Brownie", ar: "براوني سائل" },
    description: {
      en: "Dark chocolate centre, vanilla ice-cream.",
      ar: "براوني بقلب شوكولاتة سائلة مع آيس كريم فانيلا.",
    },
    price: 5.25,
    imageUrl: "/mock/customer-qr/menu/brownie.svg",
    badges: ["new"],
    calories: 510,
    prepMinutes: 6,
    availability: "available",
  },
  // Drinks
  {
    id: "i-lemonade",
    categoryId: "drinks",
    name: { en: "Fresh Lemonade", ar: "ليمونادة طازجة" },
    description: {
      en: "Hand-pressed lemons, mint, light cane sugar.",
      ar: "ليمون معصور يدوياً مع نعناع وسكر قصب خفيف.",
    },
    price: 2.75,
    imageUrl: "/mock/customer-qr/menu/lemonade.svg",
    badges: ["popular"],
    calories: 120,
    prepMinutes: 3,
    availability: "available",
  },
  {
    id: "i-orange",
    categoryId: "drinks",
    name: { en: "Orange Juice", ar: "عصير برتقال" },
    description: {
      en: "100% freshly squeezed orange.",
      ar: "برتقال معصور طازج 100٪.",
    },
    price: 3.0,
    imageUrl: "/mock/customer-qr/menu/orange.svg",
    calories: 110,
    prepMinutes: 2,
    availability: "available",
  },
  // Coffee
  {
    id: "i-latte",
    categoryId: "coffee",
    name: { en: "Cafe Latte", ar: "كافيه لاتيه" },
    description: {
      en: "Double espresso, steamed milk, light foam.",
      ar: "إسبريسو مزدوج، حليب مبخر، رغوة خفيفة.",
    },
    price: 3.25,
    imageUrl: "/mock/customer-qr/menu/latte.svg",
    badges: ["popular"],
    calories: 180,
    prepMinutes: 4,
    availability: "available",
    extras: [sizeGroup(3.25)],
  },
  {
    id: "i-cappuccino",
    categoryId: "coffee",
    name: { en: "Cappuccino", ar: "كابتشينو" },
    description: {
      en: "Velvety foam, single origin espresso.",
      ar: "رغوة ناعمة مع إسبريسو من مصدر واحد.",
    },
    price: 3.0,
    imageUrl: "/mock/customer-qr/menu/cappuccino.svg",
    calories: 140,
    prepMinutes: 4,
    availability: "available",
  },
];

const offers: MenuOffer[] = [
  {
    id: "o-burger-combo",
    title: { en: "Burger + Fries + Drink", ar: "برغر + بطاطس + مشروب" },
    subtitle: { en: "Save up to 20% on the combo", ar: "وفّر حتى ٢٠٪ على الكومبو" },
    imageUrl: "/mock/customer-qr/offers/burger-combo.svg",
    discountPct: 20,
    validUntilIso: "2030-12-31T23:59:59.000Z",
  },
  {
    id: "o-happy-hour",
    title: { en: "Happy Hour Drinks", ar: "ساعة سعيدة للمشروبات" },
    subtitle: { en: "Buy 2 get 1 free — 4PM to 6PM", ar: "اشترِ ٢ والثالث مجاناً — من ٤ إلى ٦" },
    imageUrl: "/mock/customer-qr/offers/happy-hour.svg",
    discountPct: 33,
    validUntilIso: "2030-12-31T23:59:59.000Z",
  },
];

export const mockMenu: MenuSnapshot = {
  categories,
  items,
  offers,
};
