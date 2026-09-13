/**
 * Bilingual copy for the public online store. Kept in one place so every
 * storefront surface (header, catalogue, cart, order tracking) stays
 * consistent in both languages instead of repeating inline ternaries.
 */
const COPY = {
    shop: ["Shop", "التسوق"],
    categories: ["Categories", "الأقسام"],
    categoryOne: ["category", "قسم"],
    categoryMany: ["categories", "أقسام"],
    allProducts: ["All products", "كل المنتجات"],
    myOrders: ["My orders", "طلباتي"],
    trackOrder: ["Track order", "تتبع الطلب"],
    cart: ["Cart", "السلة"],
    menu: ["Menu", "القائمة"],
    close: ["Close", "إغلاق"],
    search: ["Search", "بحث"],
    searchProducts: ["Search products", "ابحث عن منتج"],
    searchResults: ["Search results", "نتائج البحث"],
    clearSearch: ["Clear search", "مسح البحث"],
    store: ["Store", "المتجر"],
    onlineStore: ["Online store", "المتجر الإلكتروني"],
    shopByCategory: ["Shop by category", "تسوق حسب القسم"],
    browseCollections: ["Browse our collections", "تصفح مجموعاتنا"],
    featured: ["Featured products", "منتجات مختارة"],
    products: ["products", "منتج"],
    product: ["product", "منتج"],
    viewAll: ["View all", "عرض الكل"],
    viewProduct: ["View product", "عرض المنتج"],
    viewOptions: ["View options", "عرض الخيارات"],
    sortLabel: ["Sort", "ترتيب"],
    sortRelevance: ["Featured", "المميزة"],
    sortPriceLow: ["Price: low to high", "السعر: من الأقل"],
    sortPriceHigh: ["Price: high to low", "السعر: من الأعلى"],
    sortNameAz: ["Name A–Z", "الاسم أ–ي"],
    addToCart: ["Add to cart", "أضف إلى السلة"],
    unavailable: ["Currently unavailable", "غير متوفر حالياً"],
    lowStock: ["Only a few left", "الكمية محدودة"],
    inStock: ["In stock", "متوفر"],
    maxInCart: ["All available units are in your cart", "كل الكمية المتاحة في سلتك"],
    loading: ["Loading…", "جارٍ التحميل…"],
    loadingProducts: ["Loading products…", "جارٍ تحميل المنتجات…"],
    couldNotLoad: ["We could not load the store", "تعذر تحميل المتجر"],
    tryAgain: ["Try again", "إعادة المحاولة"],
    noProducts: ["No products here yet", "لا توجد منتجات هنا بعد"],
    noProductsHint: ["This collection is empty right now. Try another category.", "هذا القسم فارغ حالياً. جرّب قسماً آخر."],
    noResults: ["No products match your search", "لا توجد منتجات مطابقة لبحثك"],
    noResultsHint: ["Try a different word or browse the categories.", "جرّب كلمة أخرى أو تصفح الأقسام."],
    backToShop: ["Back to shop", "العودة إلى المتجر"],
    previous: ["Previous", "السابق"],
    next: ["Next", "التالي"],
    page: ["Page", "صفحة"],
    of: ["of", "من"],
    showing: ["Showing", "عرض"],
    contactUs: ["Contact us", "تواصل معنا"],
    nextStep: ["Next", "التالي"],
    orderProgress: ["Order progress", "مسار الطلب"],
    // Orders
    recentOrders: ["Recent orders on this device", "الطلبات الأخيرة على هذا الجهاز"],
    recentOrdersHint: [
        "Orders placed from this browser are kept here for quick access.",
        "الطلبات التي تمت من هذا المتصفح تُحفظ هنا للوصول السريع.",
    ],
    noRecentOrders: ["No recent orders on this device", "لا توجد طلبات حديثة على هذا الجهاز"],
    noRecentOrdersHint: [
        "Orders you place here will appear in this list. You can also look up an order below.",
        "ستظهر طلباتك هنا. يمكنك أيضاً البحث عن طلب بالأسفل.",
    ],
    lookupTitle: ["Find an order", "ابحث عن طلب"],
    lookupHint: [
        "Enter your order number and the phone or email you used at checkout.",
        "أدخل رقم الطلب ورقم الجوال أو البريد الإلكتروني الذي استخدمته عند الطلب.",
    ],
    orderNumber: ["Order number", "رقم الطلب"],
    phoneOrEmail: ["Phone or email", "رقم الجوال أو البريد الإلكتروني"],
    findOrder: ["Find my order", "ابحث عن طلبي"],
    lookupFailed: [
        "We could not find an order matching those details. Check the order number and contact details and try again.",
        "لم نتمكن من العثور على طلب مطابق. تحقق من رقم الطلب وبيانات التواصل ثم أعد المحاولة.",
    ],
    lookupRequired: [
        "Enter both the order number and your phone or email.",
        "أدخل رقم الطلب ورقم الجوال أو البريد الإلكتروني.",
    ],
    remove: ["Remove", "حذف"],
    orderPlacedOn: ["Saved", "محفوظ"],
    view: ["View", "عرض"],
    continueShopping: ["Continue shopping", "متابعة التسوق"],
    // Merchandising sections — headings only, no claim about the products themselves.
    sectionOnSale: ["Reduced right now", "أسعار مخفّضة الآن"],
    sectionOnSaleHint: ["Products with a price reduction today", "منتجات عليها تخفيض اليوم"],
    sectionNewArrivals: ["Recently added", "أضيف حديثاً"],
    sectionNewArrivalsHint: ["The newest products in the catalogue", "أحدث المنتجات في المتجر"],
    sectionExplore: ["Explore the store", "استكشف المتجر"],
    sectionExploreHint: ["One pick from each department", "اختيار من كل قسم"],
    popularCategories: ["Popular departments", "أقسام رئيسية"],
    allProductsSection: ["All products", "كل المنتجات"],
    browseEverything: ["Browse the full catalogue", "تصفح كامل المنتجات"],
    discoverCollections: ["Discover our collections", "اكتشف مجموعاتنا"],
    shopNow: ["Start shopping", "ابدأ التسوق"],
    itemsCount: ["items", "منتج"],

    // Product detail page
    productDetails: ["Product details", "تفاصيل المنتج"],
    aboutThisProduct: ["About this product", "نبذة عن المنتج"],
    specifications: ["Specifications", "المواصفات"],
    brand: ["Brand", "العلامة التجارية"],
    size: ["Size", "الحجم"],
    origin: ["Country of origin", "بلد المنشأ"],
    itemCode: ["Item code", "رمز المنتج"],
    department: ["Department", "القسم"],
    options: ["Options", "الخيارات"],
    required: ["Required", "مطلوب"],
    quantity: ["Quantity", "الكمية"],
    relatedProducts: ["More from this department", "المزيد من هذا القسم"],
    productNotFound: ["This product is no longer listed", "هذا المنتج غير مدرج"],
    productNotFoundHint: ["It may have been removed. Browse the store to find something else.", "ربما تمت إزالته. تصفح المتجر لاختيار بديل."],
    addedToCart: ["Added", "تمت الإضافة"],
    viewCart: ["View cart", "عرض السلة"],
    decreaseQuantity: ["Decrease quantity", "تقليل الكمية"],
    increaseQuantity: ["Increase quantity", "زيادة الكمية"],

    // Gallery
    productImages: ["Product images", "صور المنتج"],
    showImage: ["Show image", "عرض الصورة"],
    previousImage: ["Previous image", "الصورة السابقة"],
    nextImage: ["Next image", "الصورة التالية"],
    enlargeImage: ["Enlarge image", "تكبير الصورة"],
    closeViewer: ["Close image viewer", "إغلاق عارض الصور"],
    zoomIn: ["Zoom in", "تكبير"],
    zoomOut: ["Zoom out", "تصغير"],
    imageViewer: ["Image viewer", "عارض الصور"],

    // Offers — every string here describes a real, currently running bundle offer.
    offers: ["Offers", "العروض"],
    offersTitle: ["Current offers", "العروض الحالية"],
    offersHint: ["Bundles running right now", "عروض متاحة الآن"],
    offersEmpty: ["No offers are running right now", "لا توجد عروض حالياً"],
    offersEmptyHint: [
        "When the store runs an offer it will appear here. Browse the catalogue in the meantime.",
        "عند توفر عرض سيظهر هنا. تصفح المتجر في هذه الأثناء.",
    ],
    offerBundle: ["Offer", "عرض"],
    offerIncludes: ["Includes", "يشمل"],
    offerSave: ["Save", "توفير"],
    offerWas: ["Separately", "بشكل منفصل"],
    offerAddToCart: ["Add offer to cart", "أضف العرض إلى السلة"],
    offerAdded: ["Offer added", "تمت إضافة العرض"],
    offerUnavailable: ["Not available in this store right now", "غير متوفر في هذا المتجر حالياً"],
    offerEndsOn: ["Ends", "ينتهي"],
    offerDailyBetween: ["Available between", "متاح بين"],
    offerPartOf: ["Part of an offer", "ضمن عرض"],
    offerPartOfHint: [
        "This product is included in an offer running right now.",
        "هذا المنتج مشمول ضمن عرض متاح حالياً.",
    ],
    viewOffer: ["View offer", "عرض التفاصيل"],
    viewOffers: ["View offers", "عرض العروض"],
    offerItemQuantity: ["×", "×"],
    /** {n} is replaced with the number of bundle items the tile had no room for. */
    offerAndMore: ["+{n} more in this offer", "+{n} أخرى ضمن العرض"],
    offersInCategory: ["Offers in this department", "عروض في هذا القسم"],
    offersInCategoryHint: [
        "Bundles running right now that include products from here",
        "عروض متاحة الآن تشمل منتجات من هذا القسم",
    ],
    allProductsHeading: ["All products", "كل المنتجات"],
    inOffer: ["In an offer", "ضمن عرض"],
    offerCountOne: ["1 offer", "عرض واحد"],
    /** {n} is replaced with the number of live offers touching the department. */
    offerCountMany: ["{n} offers", "{n} عروض"],

    // Discount marks. Every one of these is only ever rendered from a reduction the
    // API reported — never from a number this app made up.
    upToPercentOff: ["Up to {n}% off", "خصم حتى {n}%"],
    percentOff: ["{n}% off", "خصم {n}%"],
    offersAvailable: ["Offers available", "عروض متاحة"],
    youSave: ["You save", "توفّر"],
    offerValidUntil: ["Offer ends", "ينتهي العرض"],

    // Favourites — device-local until customer accounts exist, which is what the page says.
    favorites: ["Favourites", "المفضلة"],
    addToFavorites: ["Add to favourites", "أضف إلى المفضلة"],
    removeFromFavorites: ["Remove from favourites", "إزالة من المفضلة"],
    favoritesEmpty: ["You have no favourites yet", "لا توجد لديك مفضلة بعد"],
    favoritesEmptyHint: [
        "Tap the heart on any product to keep it here.",
        "اضغط على القلب في أي منتج للاحتفاظ به هنا.",
    ],
    favoritesHint: [
        "Saved on this device. Prices and availability are always the store's current ones.",
        "محفوظة على هذا الجهاز. الأسعار والتوفر تُعرض دائماً حسب حالة المتجر الحالية.",
    ],
    favoritesUnavailableNote: [
        "Some products you saved are no longer listed and are not shown here.",
        "بعض المنتجات المحفوظة لم تعد مدرجة ولا تظهر هنا.",
    ],
    clearFavorites: ["Clear favourites", "مسح المفضلة"],

    // WhatsApp — the button labels only. Every message sent is the business's own template.
    whatsApp: ["WhatsApp", "واتساب"],
    chatOnWhatsApp: ["Chat on WhatsApp", "تواصل عبر واتساب"],
    askAboutProduct: ["Ask about this product", "استفسر عن هذا المنتج"],
    askAboutCategory: ["Ask about this department", "استفسر عن هذا القسم"],
    orderHelpOnWhatsApp: ["Help with my order", "مساعدة بخصوص طلبي"],
    categoryWhatsAppHint: [
        "Prefer to ask first? Send us a message about this department and we will reply on WhatsApp.",
        "تفضّل الاستفسار أولاً؟ أرسل لنا رسالة عن هذا القسم وسنرد عليك عبر واتساب.",
    ],
    orderHelpHint: [
        "Cannot find your order, or something looks wrong? Message customer service and we will check it for you.",
        "لم تجد طلبك، أو هناك ما لا يبدو صحيحاً؟ راسل خدمة العملاء وسنتحقق من ذلك لك.",
    ],

    // Search suggestions
    suggestions: ["Suggestions", "اقتراحات"],
    seeAllResults: ["See all results", "عرض كل النتائج"],
    noSuggestions: ["No matches yet", "لا توجد نتائج"],

    networkError: [
        "We could not reach the store. Check your connection and try again.",
        "تعذر الوصول إلى المتجر. تحقق من اتصالك ثم أعد المحاولة.",
    ],
} as const;

export type StoreCopyKey = keyof typeof COPY;

export function storeText(key: StoreCopyKey, isAr: boolean): string {
    return COPY[key][isAr ? 1 : 0];
}

/** Convenience factory so components can bind the locale once. */
export function createStoreText(isAr: boolean): (key: StoreCopyKey) => string {
    return (key) => storeText(key, isAr);
}
