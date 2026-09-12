import type { Locale } from "../types";

export type DictKey =
  | "scanToOrder"
  | "scanIntro"
  | "yourTable"
  | "viewMenu"
  | "startOrder"
  | "menu"
  | "cart"
  | "checkout"
  | "payment"
  | "tracking"
  | "receipt"
  | "feedback"
  | "back"
  | "next"
  | "addToCart"
  | "added"
  | "yourCart"
  | "emptyCart"
  | "emptyCartHint"
  | "browseMenu"
  | "subtotal"
  | "tax"
  | "service"
  | "tip"
  | "discount"
  | "total"
  | "placeOrder"
  | "checkoutWith"
  | "selectPayment"
  | "expressCheckout"
  | "otherMethods"
  | "tipQuestion"
  | "tipHint"
  | "noTip"
  | "customTip"
  | "customTipPlaceholder"
  | "popular"
  | "new"
  | "spicy"
  | "vegan"
  | "glutenFree"
  | "calories"
  | "minutes"
  | "minutesShort"
  | "outOfStock"
  | "lowStock"
  | "required"
  | "optional"
  | "selectAtLeast"
  | "selectAtMost"
  | "size"
  | "extras"
  | "spiceLevel"
  | "specialNotes"
  | "specialNotesPlaceholder"
  | "remove"
  | "increment"
  | "decrement"
  | "yourName"
  | "yourNamePlaceholder"
  | "orderConfirmed"
  | "orderConfirmedSub"
  | "estimatedReady"
  | "orderCode"
  | "trackingTitle"
  | "trackingSub"
  | "viewReceipt"
  | "orderAgain"
  | "receiptTitle"
  | "receiptSub"
  | "paidAt"
  | "paidWith"
  | "downloadReceipt"
  | "backToMenu"
  | "feedbackTitle"
  | "feedbackSub"
  | "ratingPrompt"
  | "satisfactionPrompt"
  | "bad"
  | "ok"
  | "great"
  | "commentPlaceholder"
  | "submitFeedback"
  | "thankYou"
  | "thankYouSub"
  | "followUs"
  | "language"
  | "english"
  | "arabic"
  | "demoBadge"
  | "tablesAdminTitle"
  | "tablesAdminSub"
  | "printQr"
  | "downloadQr"
  | "previewQr"
  | "openCustomerView"
  | "tables"
  | "seats"
  | "table"
  | "welcomeToTable"
  | "welcomeSub"
  | "loading"
  | "search"
  | "searchPlaceholder"
  | "noResults"
  | "noResultsHint"
  | "all"
  | "offers"
  | "promo"
  | "from"
  | "qrPayloadHint"
  | "processingPayment"
  | "paymentSucceeded"
  | "paymentFailed"
  | "tryAgain"
  | "secureCheckout"
  | "poweredBy"
  | "items"
  | "itemSingular"
  | "payNow"
  | "createOrder"
  | "addMoreItems"
  | "viewOrder"
  | "openOrder"
  | "addToOrder"
  | "smallFeeHint"
  | "bill"
  | "splitBill"
  | "payFully"
  | "payableAmount"
  | "inclusiveOfTaxes"
  | "yourOrder"
  | "serviceFee"
  | "totalBill"
  | "youPay"
  | "addTip"
  | "getReceipt"
  | "backToHome"
  | "paymentSuccess"
  | "fullyPaid"
  | "tableLabel"
  | "youPaid"
  | "paidOn"
  | "satisfactionShort"
  | "notSatisfied"
  | "verySatisfied"
  | "almostReady"
  | "readyToServe"
  | "additionalFeedback"
  | "tellUsMore"
  | "followInstagram"
  | "instagramHandle"
  | "continueOrder"
  | "whatWouldYouLikeToDo"
  | "viewCurrentOrder"
  | "viewCurrentBill"
  | "callWaiter"
  | "waiterNotified"
  | "noActiveOrder"
  | "sendToKitchen"
  | "liveStatus"
  | "orderInKitchen"
  | "addItems"
  | "splitEqually"
  | "splitByAmount"
  | "splitByItems"
  | "payFull"
  | "people"
  | "perPerson"
  | "numberOfPeople"
  | "remaining"
  | "remainingBalance"
  | "amountPaid"
  | "payRemaining"
  | "partiallyPaid"
  | "unpaid"
  | "paid"
  | "continueToPayment"
  | "selectItemsToPay"
  | "howToPay"
  | "paymentLabel"
  | "openNow"
  | "avgPrep"
  | "bestSellers"
  | "recommended"
  | "popularToday"
  | "todaysSpecial"
  | "seeAll"
  | "alsoOrdered"
  | "popularityHint"
  | "contains"
  | "excellent"
  | "good"
  | "average"
  | "poor";

type Dict = Record<DictKey, string>;

const en: Dict = {
  scanToOrder: "Scan to order",
  scanIntro: "Scan the QR on your table to view the menu and pay from your phone.",
  yourTable: "Your table",
  viewMenu: "View menu",
  startOrder: "Start ordering",
  menu: "Menu",
  cart: "Cart",
  checkout: "Checkout",
  payment: "Payment",
  tracking: "Tracking",
  receipt: "Receipt",
  feedback: "Feedback",
  back: "Back",
  next: "Continue",
  addToCart: "Add to cart",
  added: "Added",
  yourCart: "Your cart",
  emptyCart: "Your cart is empty",
  emptyCartHint: "Browse the menu and add something delicious.",
  browseMenu: "Browse menu",
  subtotal: "Subtotal",
  tax: "Tax",
  service: "Service",
  tip: "Tip",
  discount: "Discount",
  total: "Total",
  placeOrder: "Place order",
  checkoutWith: "Checkout",
  selectPayment: "Select payment method",
  expressCheckout: "Express checkout",
  otherMethods: "Other methods",
  tipQuestion: "Add a tip for the team",
  tipHint: "100% of the tip goes to staff",
  noTip: "No tip",
  customTip: "Custom amount",
  customTipPlaceholder: "Enter amount",
  popular: "Popular",
  new: "New",
  spicy: "Spicy",
  vegan: "Vegan",
  glutenFree: "Gluten-free",
  calories: "kcal",
  minutes: "min",
  minutesShort: "m",
  outOfStock: "Out of stock",
  lowStock: "Almost out",
  required: "Required",
  optional: "Optional",
  selectAtLeast: "Select at least",
  selectAtMost: "Select up to",
  size: "Size",
  extras: "Extras",
  spiceLevel: "Spice level",
  specialNotes: "Special notes",
  specialNotesPlaceholder: "Any allergy or preference?",
  remove: "Remove",
  increment: "Increase",
  decrement: "Decrease",
  yourName: "Your name (optional)",
  yourNamePlaceholder: "How should we call you?",
  orderConfirmed: "Order placed",
  orderConfirmedSub: "We sent it straight to the kitchen.",
  estimatedReady: "Estimated ready",
  orderCode: "Order code",
  trackingTitle: "Tracking your order",
  trackingSub: "Live updates from the kitchen",
  viewReceipt: "View receipt",
  orderAgain: "Order again",
  receiptTitle: "Receipt",
  receiptSub: "Thanks for dining with us!",
  paidAt: "Paid at",
  paidWith: "Paid with",
  downloadReceipt: "Download receipt",
  backToMenu: "Back to menu",
  feedbackTitle: "How was it?",
  feedbackSub: "Your feedback helps us improve.",
  ratingPrompt: "Rate your experience",
  satisfactionPrompt: "Overall feeling",
  bad: "Bad",
  ok: "OK",
  great: "Great",
  commentPlaceholder: "Tell us more (optional)",
  submitFeedback: "Submit feedback",
  thankYou: "Thank you!",
  thankYouSub: "We can't wait to see you again.",
  followUs: "Follow us",
  language: "Language",
  english: "English",
  arabic: "العربية",
  demoBadge: "",
  tablesAdminTitle: "Table QR management",
  tablesAdminSub: "Each table has its own QR. Print, download, or preview the customer view.",
  printQr: "Print",
  downloadQr: "Download",
  previewQr: "Preview",
  openCustomerView: "Open customer view",
  tables: "Tables",
  seats: "seats",
  table: "Table",
  welcomeToTable: "Welcome",
  welcomeSub: "You're seated at",
  loading: "Loading…",
  search: "Search",
  searchPlaceholder: "Search the menu…",
  noResults: "No matches",
  noResultsHint: "Try a different search term.",
  all: "All",
  offers: "Offers",
  promo: "Promo",
  from: "from",
  qrPayloadHint: "Scan to open the menu",
  processingPayment: "Processing payment…",
  paymentSucceeded: "Payment confirmed",
  paymentFailed: "Payment failed",
  tryAgain: "Try again",
  secureCheckout: "Secure checkout",
  poweredBy: "Powered by",
  items: "items",
  itemSingular: "item",
  payNow: "Pay now",
  createOrder: "Create order",
  addMoreItems: "Add more items",
  viewOrder: "View cart",
  openOrder: "Open order",
  addToOrder: "Add to order",
  smallFeeHint: "",
  bill: "Bill",
  splitBill: "Split bill",
  payFully: "Pay fully",
  payableAmount: "Payable amount",
  inclusiveOfTaxes: "Inclusive of taxes and charges",
  yourOrder: "Your order",
  serviceFee: "Service fee",
  totalBill: "Total bill",
  youPay: "You pay",
  addTip: "Add tip",
  getReceipt: "Get the receipt",
  backToHome: "Back to home",
  paymentSuccess: "Payment was successful",
  fullyPaid: "Fully paid",
  tableLabel: "Table",
  youPaid: "You paid",
  paidOn: "Paid on",
  satisfactionShort: "How was your experience?",
  notSatisfied: "Not satisfied",
  verySatisfied: "Very satisfied",
  almostReady: "Almost ready",
  readyToServe: "Ready to serve",
  additionalFeedback: "Additional feedback (optional)",
  tellUsMore: "Tell us more about your experience…",
  followInstagram: "Follow us on Instagram",
  instagramHandle: "@sando.kitchen",
  continueOrder: "Continue ordering",
  whatWouldYouLikeToDo: "What would you like to do?",
  viewCurrentOrder: "View current order",
  viewCurrentBill: "View current bill",
  callWaiter: "Call waiter",
  waiterNotified: "A waiter is on the way to your table",
  noActiveOrder: "No active order yet",
  sendToKitchen: "We'll send it straight to the kitchen",
  liveStatus: "Live status",
  orderInKitchen: "Your order is with the kitchen",
  addItems: "Add items",
  splitEqually: "Equally",
  splitByAmount: "By amount",
  splitByItems: "By items",
  payFull: "Pay full",
  people: "people",
  perPerson: "per person",
  numberOfPeople: "Number of people",
  remaining: "Remaining",
  remainingBalance: "Remaining balance",
  amountPaid: "Amount paid",
  payRemaining: "Pay remaining",
  partiallyPaid: "Partially paid",
  unpaid: "Unpaid",
  paid: "Paid",
  continueToPayment: "Continue to payment",
  selectItemsToPay: "Select the items you'll pay for",
  howToPay: "How would you like to pay?",
  paymentLabel: "Payment",
  openNow: "Open now",
  avgPrep: "min avg prep",
  bestSellers: "Best sellers",
  recommended: "Recommended for you",
  popularToday: "Popular today",
  todaysSpecial: "Today's special",
  seeAll: "See all",
  alsoOrdered: "Customers also ordered",
  popularityHint: "Ordered 40+ times today",
  contains: "Contains",
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  poor: "Poor",
};

const ar: Dict = {
  scanToOrder: "امسح للطلب",
  scanIntro: "امسح رمز QR على طاولتك لعرض القائمة والدفع من هاتفك.",
  yourTable: "طاولتك",
  viewMenu: "عرض القائمة",
  startOrder: "ابدأ الطلب",
  todaysSpecial: "طبق اليوم",
  menu: "القائمة",
  cart: "السلة",
  checkout: "الدفع",
  payment: "الدفع",
  tracking: "متابعة الطلب",
  receipt: "الفاتورة",
  feedback: "تقييمك",
  back: "رجوع",
  next: "متابعة",
  addToCart: "أضف للسلة",
  added: "تمت الإضافة",
  yourCart: "سلتك",
  emptyCart: "سلتك فارغة",
  emptyCartHint: "تصفح القائمة وأضف شيئاً لذيذاً.",
  browseMenu: "تصفح القائمة",
  subtotal: "المجموع الفرعي",
  tax: "الضريبة",
  service: "الخدمة",
  tip: "إكرامية",
  discount: "خصم",
  total: "الإجمالي",
  placeOrder: "إرسال الطلب",
  checkoutWith: "ادفع",
  selectPayment: "اختر طريقة الدفع",
  expressCheckout: "دفع سريع",
  otherMethods: "طرق أخرى",
  tipQuestion: "أضف إكرامية للفريق",
  tipHint: "تذهب الإكرامية ١٠٠٪ للطاقم",
  noTip: "بدون إكرامية",
  customTip: "مبلغ مخصص",
  customTipPlaceholder: "أدخل المبلغ",
  popular: "الأكثر طلباً",
  new: "جديد",
  spicy: "حار",
  vegan: "نباتي",
  glutenFree: "خالي من الجلوتين",
  calories: "سعرة",
  minutes: "دقيقة",
  minutesShort: "د",
  outOfStock: "غير متوفر",
  lowStock: "كمية محدودة",
  required: "مطلوب",
  optional: "اختياري",
  selectAtLeast: "اختر على الأقل",
  selectAtMost: "اختر حتى",
  size: "الحجم",
  extras: "إضافات",
  spiceLevel: "درجة الحرارة",
  specialNotes: "ملاحظات خاصة",
  specialNotesPlaceholder: "هل هناك حساسية أو تفضيل؟",
  remove: "حذف",
  increment: "زيادة",
  decrement: "تقليل",
  yourName: "اسمك (اختياري)",
  yourNamePlaceholder: "كيف ننادي عليك؟",
  orderConfirmed: "تم إرسال الطلب",
  orderConfirmedSub: "أرسلناه مباشرة إلى المطبخ.",
  estimatedReady: "الوقت المتوقع",
  orderCode: "رمز الطلب",
  trackingTitle: "متابعة طلبك",
  trackingSub: "تحديثات لحظية من المطبخ",
  viewReceipt: "عرض الفاتورة",
  orderAgain: "اطلب مرة أخرى",
  receiptTitle: "الفاتورة",
  receiptSub: "شكراً لزيارتك!",
  paidAt: "تم الدفع",
  paidWith: "وسيلة الدفع",
  downloadReceipt: "تحميل الفاتورة",
  backToMenu: "العودة للقائمة",
  feedbackTitle: "كيف كانت تجربتك؟",
  feedbackSub: "رأيك يساعدنا على التحسن.",
  ratingPrompt: "قيّم تجربتك",
  satisfactionPrompt: "الانطباع العام",
  bad: "سيئ",
  ok: "مقبول",
  great: "ممتاز",
  commentPlaceholder: "أخبرنا المزيد (اختياري)",
  submitFeedback: "إرسال التقييم",
  thankYou: "شكراً لك!",
  thankYouSub: "نتطلع لزيارتك القادمة.",
  followUs: "تابعنا",
  language: "اللغة",
  english: "English",
  arabic: "العربية",
  demoBadge: "",
  tablesAdminTitle: "إدارة طاولات QR",
  tablesAdminSub: "لكل طاولة رمز QR خاص. اطبعه، حمّله أو عاين تجربة العميل.",
  printQr: "طباعة",
  downloadQr: "تحميل",
  previewQr: "معاينة",
  openCustomerView: "افتح واجهة العميل",
  tables: "الطاولات",
  seats: "مقاعد",
  table: "طاولة",
  welcomeToTable: "أهلاً بك",
  welcomeSub: "أنت على",
  loading: "جارٍ التحميل…",
  search: "بحث",
  searchPlaceholder: "ابحث في القائمة…",
  noResults: "لا توجد نتائج",
  noResultsHint: "جرّب كلمة مختلفة.",
  all: "الكل",
  offers: "العروض",
  promo: "عرض",
  from: "ابتداءً من",
  qrPayloadHint: "امسح لفتح القائمة",
  processingPayment: "جارٍ معالجة الدفع…",
  paymentSucceeded: "تم تأكيد الدفع",
  paymentFailed: "فشل الدفع",
  tryAgain: "حاول مجدداً",
  secureCheckout: "دفع آمن",
  poweredBy: "مدعوم من",
  items: "عناصر",
  itemSingular: "عنصر",
  payNow: "ادفع الآن",
  createOrder: "أنشئ طلبك",
  addMoreItems: "أضف المزيد",
  viewOrder: "عرض السلة",
  openOrder: "طلب مفتوح",
  addToOrder: "أضف إلى الطلب",
  smallFeeHint: "",
  bill: "الفاتورة",
  splitBill: "تقسيم الفاتورة",
  payFully: "ادفع كامل المبلغ",
  payableAmount: "المبلغ المستحق",
  inclusiveOfTaxes: "شامل الضرائب والرسوم",
  yourOrder: "طلبك",
  serviceFee: "رسوم الخدمة",
  totalBill: "إجمالي الفاتورة",
  youPay: "أنت تدفع",
  addTip: "أضف إكرامية",
  getReceipt: "احصل على الفاتورة",
  backToHome: "العودة للرئيسية",
  paymentSuccess: "تم الدفع بنجاح",
  fullyPaid: "مدفوع بالكامل",
  tableLabel: "الطاولة",
  youPaid: "دفعت",
  paidOn: "تاريخ الدفع",
  satisfactionShort: "كيف كانت تجربتك؟",
  notSatisfied: "غير راضٍ",
  verySatisfied: "راضٍ جداً",
  almostReady: "أوشك على الجاهزية",
  readyToServe: "جاهز للتقديم",
  additionalFeedback: "ملاحظات إضافية (اختياري)",
  tellUsMore: "أخبرنا المزيد عن تجربتك…",
  followInstagram: "تابعنا على إنستغرام",
  instagramHandle: "@sando.kitchen",
  continueOrder: "أكمل طلبك",
  whatWouldYouLikeToDo: "ماذا تريد أن تفعل؟",
  viewCurrentOrder: "عرض الطلب الحالي",
  viewCurrentBill: "عرض الفاتورة الحالية",
  callWaiter: "نادِ النادل",
  waiterNotified: "النادل في طريقه إلى طاولتك",
  noActiveOrder: "لا يوجد طلب نشط بعد",
  sendToKitchen: "سنرسله مباشرةً إلى المطبخ",
  liveStatus: "الحالة المباشرة",
  orderInKitchen: "طلبك قيد التحضير في المطبخ",
  addItems: "أضف أصنافاً",
  splitEqually: "بالتساوي",
  splitByAmount: "مبلغ محدد",
  splitByItems: "حسب الأصناف",
  payFull: "ادفع كامل المبلغ",
  people: "أشخاص",
  perPerson: "لكل شخص",
  numberOfPeople: "عدد الأشخاص",
  remaining: "المتبقي",
  remainingBalance: "الرصيد المتبقي",
  amountPaid: "المبلغ المدفوع",
  payRemaining: "ادفع المتبقي",
  partiallyPaid: "مدفوع جزئياً",
  unpaid: "غير مدفوع",
  paid: "مدفوع",
  continueToPayment: "متابعة الدفع",
  selectItemsToPay: "اختر الأصناف التي ستدفع ثمنها",
  howToPay: "كيف تريد الدفع؟",
  paymentLabel: "الدفع",
  openNow: "مفتوح الآن",
  avgPrep: "دقيقة متوسط التحضير",
  bestSellers: "الأكثر مبيعاً",
  recommended: "موصى به لك",
  popularToday: "الأكثر طلباً اليوم",
  seeAll: "عرض الكل",
  alsoOrdered: "طلب العملاء أيضاً",
  popularityHint: "طُلب أكثر من ٤٠ مرة اليوم",
  contains: "يحتوي على",
  excellent: "ممتاز",
  good: "جيد",
  average: "مقبول",
  poor: "سيئ",
};

export const DICTIONARIES: Record<Locale, Dict> = { en, ar };
