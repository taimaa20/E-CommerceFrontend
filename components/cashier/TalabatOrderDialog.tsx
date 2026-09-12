"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
    BadgePercent,
    Check,
    Clock,
    CreditCard,
    Hash,
    PackageCheck,
    Pencil,
    Phone,
    ReceiptText,
    ShoppingBag,
    Trash2,
    UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { addOrderPayment, createOrderAndReturn, getCashierProducts, getCashierProductsDirect, isNetworkRequestError } from "@/lib/api";
import { config } from "@/lib/config";
import { generateUUID } from "@/lib/uuid";
import { formatCurrency } from "@/lib/currencies";
import {
    getActiveDeliveryPartners,
    getDeliveryPartnerName,
    type DeliveryPartnerDto,
} from "@/lib/api-delivery-partners";
import { getConnectivityState } from "@/lib/offline/connectivity";
import { generateActionId } from "@/lib/offline/id";
import {
    createOrderSmart,
    enqueuePaymentOffline,
    isOfflineOrderId,
    settleServerPaidOrderOffline,
} from "@/lib/offline/orders";
import { openReceiptPrintWindow, printReceipt } from "@/lib/print-receipt";
import { resolveRecipeAlternativePriceImpact } from "@/lib/recipe-alternative-pricing";
import { useLocale } from "@/components/locale-provider";
import ProductModal from "@/components/ProductModal";
import ProductQuickViewDialog from "@/components/ProductQuickViewDialog";
import { ProductSelectionPanel } from "@/components/pos/order/ProductSelectionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";
import { CartItemModifier, usePosStore } from "@/store/posStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useBrandingStore } from "@/store/brandingStore";
import { UserRole } from "@/types/auth";
import type { DeliveryPartnerPriceAdjustmentReason, DeliveryPartnerPriceCorrectionMode, OrderCreateDto, OrderDto, SelectedRecipeAlternativeDto } from "@/types/order";
import type { ProductDto, ProductOptionDto } from "@/types/pos";

interface TalabatOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrderCreated: (order: OrderDto) => void | Promise<void>;
}

interface TalabatCartItem {
    cartId: string;
    product: ProductDto;
    selectedModifiers: CartItemModifier[];
    selectedOption?: ProductOptionDto | null;
    selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[];
    quantity: number;
    unitPrice: number;
    unitPriceInput: string;
    totalPrice: number;
    notes?: string;
}

const DELIVERY_PARTNER_SOURCE = "DeliveryPartner";
const TAKEAWAY_ORDER_TYPE = 1;
const TAKEAWAY_MODAL_ORDER_TYPE = 2;
const PICKUP_LEAD_MINUTES = 15;
const PAYMENT_METHODS = ["Online", "Credit Card", "Cash"] as const;
const DELIVERY_PARTNER_PRICE_ADJUSTMENT_ROLES = new Set<UserRole>([
    UserRole.Admin,
    UserRole.SuperAdmin,
    UserRole.Manager,
    UserRole.Cashier,
    UserRole.Owner,
]);
const PRICE_DIFFERENCE_REASONS: Array<{
    code: DeliveryPartnerPriceAdjustmentReason;
    en: string;
    ar: string;
}> = [
    { code: "PriceDifference", en: "Price Difference", ar: "فرق السعر" },
    { code: "NoDiscountApplied", en: "No Discount Applied", ar: "لم يتم تطبيق الخصم" },
    { code: "ExtraDiscountApplied", en: "Extra Discount Applied", ar: "تم تطبيق خصم إضافي" },
    { code: "Other", en: "Other", ar: "أخرى" },
];
const MAX_PHONE_LENGTH = 20;
const MAX_NAME_LENGTH = 120;
const PRODUCT_MODAL_CLOSE_PARENT_DISMISS_SUPPRESS_MS = 350;

function describeDebugTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;

    const id = target.id ? `#${target.id}` : "";
    const className = typeof target.className === "string"
        ? target.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(".")
        : "";
    const classSuffix = className ? `.${className}` : "";
    const dataSlot = target.getAttribute("data-slot");
    const dataTalabat = target.getAttribute("data-talabat-debug");

    return `${target.tagName.toLowerCase()}${id}${classSuffix}${dataSlot ? `[data-slot=${dataSlot}]` : ""}${dataTalabat ? `[data-talabat-debug=${dataTalabat}]` : ""}`;
}

function resolveDebugEvent(event: unknown): Event | null {
    if (event instanceof Event) return event;
    if (!event || typeof event !== "object") return null;

    const detail = "detail" in event ? (event as { detail?: unknown }).detail : undefined;
    if (!detail || typeof detail !== "object") return null;

    const originalEvent = "originalEvent" in detail ? (detail as { originalEvent?: unknown }).originalEvent : undefined;
    return originalEvent instanceof Event ? originalEvent : null;
}

function summarizeDebugEvent(event: unknown) {
    const resolvedEvent = resolveDebugEvent(event) ?? (event instanceof Event ? event : null);
    if (!resolvedEvent) return null;

    return {
        type: resolvedEvent.type,
        pointerType: resolvedEvent instanceof PointerEvent ? resolvedEvent.pointerType : undefined,
        touches: typeof TouchEvent !== "undefined" && resolvedEvent instanceof TouchEvent ? resolvedEvent.touches.length : undefined,
        target: describeDebugTarget(resolvedEvent.target),
        currentTarget: describeDebugTarget(resolvedEvent.currentTarget),
        defaultPrevented: resolvedEvent.defaultPrevented,
    };
}

function pushTalabatDialogDebugLog(event: string, payload: Record<string, unknown> = {}) {
    if (typeof window === "undefined") return;

    const debugWindow = window as Window & { __talabatDialogLog?: Array<Record<string, unknown>> };
    const entry = {
        scope: "TalabatOrderDialog",
        event,
        at: Math.round(window.performance.now() * 100) / 100,
        ...payload,
    };

    debugWindow.__talabatDialogLog = debugWindow.__talabatDialogLog ?? [];
    debugWindow.__talabatDialogLog.push(entry);
    console.log("[TalabatOrderDialog]", entry);
}

const copy = {
    en: {
        title: "Delivery Order",
        ticketDetails: "Ticket Details",
        products: "Products",
        receiptPreview: "Receipt Preview",
        partner: "Partner",
        orderNumber: "Partner Order Number",
        customerName: "Customer Name",
        customerPhone: "Customer Phone",
        paymentMethod: "Payment Method",
        pickupTime: "Pickup Time",
        notes: "Notes",
        items: "Items",
        itemCount: "Item Count",
        quantityCount: "Quantity",
        noItems: "Select products to build the order.",
        submit: "Submit Delivery Order",
        submitting: "Submitting...",
        requiredPartner: "Delivery partner is required.",
        requiredOrder: "Partner order number is required.",
        requiredCustomerName: "Customer name is required.",
        requiredCustomerPhone: "Customer phone is required.",
        requiredPayment: "Payment method is required.",
        requiredItems: "Add at least one item.",
        unavailable: "This product is not available right now.",
        created: "Delivery order submitted.",
        failed: "Delivery order could not be submitted.",
        partnersFailed: "Delivery partners could not be loaded.",
        pricesFailed: "Partner pricing could not be loaded.",
        noPartners: "No active delivery partners.",
        paymentFailed: "Order was created, but payment failed. Refresh orders before retrying.",
        nameTooLong: "Customer name is too long.",
        phoneTooLong: "Customer phone is too long.",
        total: "Total",
        subtotal: "Subtotal",
        tax: "Tax",
        vatIncluded: "VAT included when enabled",
        addToCart: "Add to Order",
        updateItem: "Update Item",
        prepaid: "Prepaid",
        cashCollection: "Cash",
        noCustomer: "No customer yet",
        noPhone: "No phone yet",
        priceDifference: "Price Difference",
        priceDifferenceReason: "Reason",
        priceDifferenceNote: "Note",
        correctPartnerPrice: "Correct partner price",
        currentPartnerPrice: "Current partner price",
        priceDifferenceViewOnly: "View only",
        priceDifferenceHint: "Enable to update partner item prices before sending the order.",
        priceDifferenceEnabled: "Enabled",
        priceDifferenceDisabled: "Disabled",
        invalidCorrectPrice: "Correct partner price must be greater than zero.",
        correctionMode: "Correction Mode",
        perItem: "Per Item",
        orderTotal: "Order Total",
        systemTotal: "System Total",
        correctPartnerTotal: "Correct Partner Total",
        calculatedDifference: "Calculated Difference",
        invalidCorrectTotal: "Correct partner total cannot be negative.",
    },
    ar: {
        title: "طلب توصيل",
        ticketDetails: "تفاصيل الفاتورة",
        products: "المنتجات",
        receiptPreview: "معاينة الفاتورة",
        partner: "الشريك",
        orderNumber: "رقم طلب الشريك",
        customerName: "اسم العميل",
        customerPhone: "هاتف العميل",
        paymentMethod: "طريقة الدفع",
        pickupTime: "وقت الاستلام",
        notes: "ملاحظات",
        items: "الأصناف",
        itemCount: "عدد الأصناف",
        quantityCount: "الكمية",
        noItems: "اختر المنتجات لبناء الطلب.",
        submit: "إرسال طلب التوصيل",
        submitting: "جاري الإرسال...",
        requiredPartner: "شريك التوصيل مطلوب.",
        requiredOrder: "رقم طلب الشريك مطلوب.",
        requiredCustomerName: "اسم العميل مطلوب.",
        requiredCustomerPhone: "هاتف العميل مطلوب.",
        requiredPayment: "طريقة الدفع مطلوبة.",
        requiredItems: "أضف صنفاً واحداً على الأقل.",
        unavailable: "هذا المنتج غير متاح حالياً.",
        created: "تم إرسال طلب التوصيل.",
        failed: "تعذر إرسال طلب التوصيل.",
        partnersFailed: "تعذر تحميل شركاء التوصيل.",
        pricesFailed: "تعذر تحميل أسعار الشريك.",
        noPartners: "لا يوجد شركاء توصيل نشطون.",
        paymentFailed: "تم إنشاء الطلب، لكن فشل الدفع. حدّث الطلبات قبل إعادة المحاولة.",
        nameTooLong: "اسم العميل طويل جداً.",
        phoneTooLong: "هاتف العميل طويل جداً.",
        total: "الإجمالي",
        subtotal: "المجموع الفرعي",
        tax: "الضريبة",
        vatIncluded: "الضريبة مضافة عند تفعيلها",
        addToCart: "إضافة للطلب",
        updateItem: "تحديث الصنف",
        prepaid: "مدفوع مسبقاً",
        cashCollection: "كاش",
        noCustomer: "لا يوجد عميل",
        noPhone: "لا يوجد هاتف",
        priceDifference: "فرق السعر",
        priceDifferenceReason: "السبب",
        priceDifferenceNote: "ملاحظة",
        correctPartnerPrice: "السعر الصحيح من الشريك",
        currentPartnerPrice: "سعر الشريك الحالي",
        priceDifferenceViewOnly: "صلاحية العرض فقط",
        priceDifferenceHint: "فعّلها لتعديل أسعار الشريك قبل إرسال الطلب.",
        priceDifferenceEnabled: "مفعّل",
        priceDifferenceDisabled: "غير مفعّل",
        invalidCorrectPrice: "السعر الصحيح من الشريك يجب أن يكون أكبر من صفر.",
        correctionMode: "وضع التصحيح",
        perItem: "لكل صنف",
        orderTotal: "إجمالي الطلب",
        systemTotal: "إجمالي النظام",
        correctPartnerTotal: "إجمالي الشريك الصحيح",
        calculatedDifference: "الفرق المحسوب",
        invalidCorrectTotal: "إجمالي الشريك الصحيح لا يمكن أن يكون سالباً.",
    },
};

function baseLinePrice(
    product: ProductDto,
    selectedOption?: ProductOptionDto | null,
    selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[],
) {
    return selectedOption
        ? selectedOption.price
        : (product.displayPrice ?? product.discountedPrice ?? product.basePrice) + resolveRecipeAlternativePriceImpact(product, selectedRecipeAlternatives);
}

function modifierUnitPrice(product: ProductDto, modifier: CartItemModifier) {
    const quantity = modifier.quantity || 1;
    if (modifier.isFree && (modifier.freeQuantityLimit ?? 0) === 0) return 0;
    if (modifier.isFree && (modifier.freeQuantityLimit ?? 0) > 0 && quantity <= (modifier.freeQuantityLimit ?? 0)) return 0;

    const baseUnitPrice = product.displayPrice ?? product.discountedPrice ?? product.basePrice;
    if ((modifier.pricingType ?? 0) === 2) return 0;
    if ((modifier.pricingType ?? 0) === 1) return (baseUnitPrice * modifier.priceAdjustment) / 100;
    return modifier.priceAdjustment;
}

function modifiersTotal(product: ProductDto, modifiers: CartItemModifier[]) {
    return modifiers.reduce((sum, modifier) => sum + modifierUnitPrice(product, modifier) * (modifier.quantity || 1), 0);
}

function roundMoney(value: number) {
    return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function cartModifierTotal(item: TalabatCartItem) {
    return item.selectedOption ? 0 : modifiersTotal(item.product, item.selectedModifiers);
}

function cartItemTotal(item: TalabatCartItem, unitPrice = item.unitPrice) {
    return roundMoney((unitPrice + cartModifierTotal(item)) * item.quantity);
}

function partnerCorrectedUnitPrice(item: TalabatCartItem, enabled: boolean) {
    if (!enabled) return null;

    const originalUnitPrice = roundMoney(baseLinePrice(item.product, item.selectedOption, item.selectedRecipeAlternatives));
    return item.unitPrice !== originalUnitPrice ? item.unitPrice : null;
}

function toTimeInputValue(date: Date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getDefaultPickupTime() {
    const date = new Date();
    date.setMinutes(date.getMinutes() + PICKUP_LEAD_MINUTES);
    return toTimeInputValue(date);
}

function toPickupIso(value: string) {
    const [hours, minutes] = value.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

    const now = new Date();
    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    if (date.getTime() < now.getTime()) date.setDate(date.getDate() + 1);
    return date.toISOString();
}

function formatTime(value: string) {
    return value || "--:--";
}

function getPaymentLabel(method: (typeof PAYMENT_METHODS)[number], locale: "en" | "ar") {
    if (locale === "ar") {
        if (method === "Credit Card") return "بطاقة";
        if (method === "Cash") return "كاش";
        return "أونلاين";
    }

    return method === "Credit Card" ? "Credit Card" : method;
}

function getPartnerCode(partner: DeliveryPartnerDto | null) {
    return partner?.code || partner?.name || "PARTNER";
}

export function TalabatOrderDialog({ open, onOpenChange, onOrderCreated }: TalabatOrderDialogProps) {
    const { locale } = useLocale();
    const isArabic = locale === "ar";
    const text = isArabic ? copy.ar : copy.en;
    const user = useAuthStore((state) => state.user);
    const { currency, taxRate: storeTaxRate } = usePosStore();
    const settings = useSettingsStore((state) => state.settings);
    const logoUrl = useBrandingStore((state) => state.logoUrl);
    const businessName = useBrandingStore((state) => state.businessName);

    const [partners, setPartners] = useState<DeliveryPartnerDto[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState("");
    const [pricedProducts, setPricedProducts] = useState<ProductDto[]>([]);
    const [isLoadingPartners, setIsLoadingPartners] = useState(false);
    const [isLoadingPrices, setIsLoadingPrices] = useState(false);
    const [productsError, setProductsError] = useState(false);
    const [productsReloadKey, setProductsReloadKey] = useState(0);
    const [partnerOrderNumber, setPartnerOrderNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("Credit Card");
    const [pickupTime, setPickupTime] = useState(getDefaultPickupTime);
    const [notes, setNotes] = useState("");
    const [hasPriceDifference, setHasPriceDifference] = useState(false);
    const [priceDifferenceReasonCode, setPriceDifferenceReasonCode] = useState<DeliveryPartnerPriceAdjustmentReason>("PriceDifference");
    const [priceDifferenceNote, setPriceDifferenceNote] = useState("");
    const [priceDifferenceCorrectionMode, setPriceDifferenceCorrectionMode] = useState<DeliveryPartnerPriceCorrectionMode>("PerItem");
    const [correctPartnerTotalInput, setCorrectPartnerTotalInput] = useState("");
    const [cart, setCart] = useState<TalabatCartItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
    const [quickViewProduct, setQuickViewProduct] = useState<ProductDto | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingCartId, setEditingCartId] = useState<string | null>(null);
    const [modalInitialQuantity, setModalInitialQuantity] = useState(1);
    const [modalInitialNotes, setModalInitialNotes] = useState("");
    const [modalInitialModifierIds, setModalInitialModifierIds] = useState<string[]>([]);
    const [modalInitialModifierQuantities, setModalInitialModifierQuantities] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const hasLoggedInitialOpenState = useRef(false);
    const suppressParentCloseAfterProductModalRef = useRef(false);
    const suppressParentCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedPartner = partners.find((partner) => partner.id === selectedPartnerId) ?? null;
    const partnerName = selectedPartner ? getDeliveryPartnerName(selectedPartner, isArabic) : "";
    const canAdjustDeliveryPartnerPrices = user != null &&
        DELIVERY_PARTNER_PRICE_ADJUSTMENT_ROLES.has(user.role);

    useEffect(() => {
        if (!hasLoggedInitialOpenState.current) {
            hasLoggedInitialOpenState.current = true;
            return;
        }

        pushTalabatDialogDebugLog(open ? "dialog:opened" : "dialog:closed", {
            selectedPartnerId,
            cartSize: cart.length,
            isSubmitting,
        });
    }, [cart.length, isSubmitting, open, selectedPartnerId]);

    useEffect(() => {
        if (!open || typeof document === "undefined") return;

        const documentEventTypes: Array<keyof DocumentEventMap> = ["pointerdown", "pointerup", "click", "touchstart", "touchend", "focusin"];
        const handleDocumentEvent = (event: Event) => {
            pushTalabatDialogDebugLog(`document:${event.type}`, {
                open,
                selectedPartnerId,
                summary: summarizeDebugEvent(event),
            });
        };

        documentEventTypes.forEach((eventType) => {
            document.addEventListener(eventType, handleDocumentEvent, true);
        });

        return () => {
            documentEventTypes.forEach((eventType) => {
                document.removeEventListener(eventType, handleDocumentEvent, true);
            });
        };
    }, [open, selectedPartnerId]);

    useEffect(() => () => {
        if (suppressParentCloseTimeoutRef.current) {
            clearTimeout(suppressParentCloseTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        setIsLoadingPartners(true);
        getActiveDeliveryPartners()
            .then((items) => {
                if (cancelled) return;
                setPartners(items);
                setSelectedPartnerId((current) => current || items[0]?.id || "");
            })
            .catch(() => {
                if (cancelled) return;
                setPartners([]);
                setSelectedPartnerId("");
                toast.error(text.partnersFailed);
            })
            .finally(() => {
                if (!cancelled) setIsLoadingPartners(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, text.partnersFailed]);

    useEffect(() => {
        if (!open || !selectedPartnerId) {
            setPricedProducts([]);
            setProductsError(false);
            return;
        }

        let cancelled = false;
        setIsLoadingPrices(true);
        setProductsError(false);
        const loadProducts = getConnectivityState() === "online"
            ? getCashierProductsDirect
            : getCashierProducts;
        loadProducts(selectedPartnerId)
            .then((items) => {
                if (cancelled) return;
                setPricedProducts(items);
                if (items.length === 0) {
                    setProductsError(true);
                    toast.error(text.pricesFailed);
                }
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setPricedProducts([]);
                setProductsError(true);
                const detail = err instanceof Error ? err.message : String(err);
                toast.error(`${text.pricesFailed} — ${detail}`);
            })
            .finally(() => {
                if (!cancelled) setIsLoadingPrices(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, selectedPartnerId, productsReloadKey, text.pricesFailed]);

    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const quantityCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const taxAmount = Math.round((subtotal * Math.max(0, storeTaxRate) / 100) * 100) / 100;
    const systemTotalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    const parsedCorrectPartnerTotal = Number(correctPartnerTotalInput);
    const hasValidCorrectPartnerTotal = correctPartnerTotalInput !== "" &&
        Number.isFinite(parsedCorrectPartnerTotal) && parsedCorrectPartnerTotal >= 0;
    const totalAmount = hasPriceDifference && priceDifferenceCorrectionMode === "OrderTotal" && hasValidCorrectPartnerTotal
        ? roundMoney(parsedCorrectPartnerTotal)
        : systemTotalAmount;
    const paymentStatusLabel = paymentMethod === "Cash" ? text.cashCollection : text.prepaid;

    const reset = () => {
        setPartnerOrderNumber("");
        setCustomerName("");
        setCustomerPhone("");
        setPaymentMethod("Credit Card");
        setPickupTime(getDefaultPickupTime());
        setNotes("");
        setHasPriceDifference(false);
        setPriceDifferenceReasonCode("PriceDifference");
        setPriceDifferenceNote("");
        setPriceDifferenceCorrectionMode("PerItem");
        setCorrectPartnerTotalInput("");
        setCart([]);
        setPricedProducts([]);
        setSelectedPartnerId("");
        setSelectedProduct(null);
        setQuickViewProduct(null);
        setEditingCartId(null);
        setIsProductModalOpen(false);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        pushTalabatDialogDebugLog("dialog:onOpenChange", {
            currentOpen: open,
            nextOpen,
            isSubmitting,
            selectedPartnerId,
            cartSize: cart.length,
        });
        if (!nextOpen && suppressParentCloseAfterProductModalRef.current) {
            pushTalabatDialogDebugLog("dialog:close-request-ignored:product-modal", {
                selectedPartnerId,
                cartSize: cart.length,
            });
            return;
        }
        if (isSubmitting) return;
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
    };

    const preventParentDismissWhileProductModalOpen = (event: Event) => {
        if (!isProductModalOpen) return;

        event.preventDefault();
        pushTalabatDialogDebugLog("dialog:outside-dismiss-prevented:product-modal", {
            summary: summarizeDebugEvent(event),
        });
    };

    const suppressParentCloseAfterProductModal = () => {
        suppressParentCloseAfterProductModalRef.current = true;
        if (suppressParentCloseTimeoutRef.current) {
            clearTimeout(suppressParentCloseTimeoutRef.current);
        }
        suppressParentCloseTimeoutRef.current = setTimeout(() => {
            suppressParentCloseAfterProductModalRef.current = false;
            suppressParentCloseTimeoutRef.current = null;
        }, PRODUCT_MODAL_CLOSE_PARENT_DISMISS_SUPPRESS_MS);
    };

    const closeProductModal = () => {
        suppressParentCloseAfterProductModal();
        setIsProductModalOpen(false);
        setSelectedProduct(null);
        setEditingCartId(null);
    };

    const handleProductSelect = (product: ProductDto) => {
        if (!product.isAvailableNow) {
            toast.warning(text.unavailable);
            return;
        }

        setSelectedProduct(product);
        setModalInitialQuantity(1);
        setModalInitialNotes("");
        setModalInitialModifierIds([]);
        setModalInitialModifierQuantities({});
        setEditingCartId(null);
        setIsProductModalOpen(true);
    };

    const handleAddToCart = (
        product: ProductDto,
        modifiers: CartItemModifier[],
        quantity: number,
        notes: string,
        selectedOption?: ProductOptionDto | null,
        selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[],
    ) => {
        const safeQuantity = Math.max(1, Math.floor(quantity));
        const lineBase = baseLinePrice(product, selectedOption, selectedRecipeAlternatives);
        const lineTotal = (lineBase + (selectedOption ? 0 : modifiersTotal(product, modifiers))) * safeQuantity;
        const nextItem: TalabatCartItem = {
            cartId: editingCartId ?? generateUUID(),
            product,
            selectedModifiers: selectedOption ? [] : modifiers,
            selectedOption: selectedOption ?? null,
            selectedRecipeAlternatives: selectedOption ? [] : (selectedRecipeAlternatives ?? []),
            quantity: safeQuantity,
            unitPrice: roundMoney(lineBase),
            unitPriceInput: roundMoney(lineBase).toFixed(2),
            totalPrice: roundMoney(lineTotal),
            notes: notes.trim() || undefined,
        };

        setCart((items) => editingCartId
            ? items.map((item) => item.cartId === editingCartId ? nextItem : item)
            : [...items, nextItem]);
        closeProductModal();
    };

    const handleEditItem = (item: TalabatCartItem) => {
        setSelectedProduct(item.product);
        setModalInitialQuantity(item.quantity);
        setModalInitialNotes(item.notes ?? "");
        setModalInitialModifierIds(item.selectedModifiers.map((modifier) => modifier.id).filter(Boolean));
        setModalInitialModifierQuantities(Object.fromEntries(
            item.selectedModifiers
                .filter((modifier) => (modifier.quantity || 1) > 1)
                .map((modifier) => [modifier.id, modifier.quantity])
        ));
        setEditingCartId(item.cartId);
        setIsProductModalOpen(true);
    };

    const updateCartItemUnitPrice = (cartId: string, value: string) => {
        const parsed = Number(value);
        const nextUnitPrice = Number.isFinite(parsed) ? roundMoney(parsed) : 0;
        setCart((items) =>
            items.map((item) => item.cartId === cartId
                ? { ...item, unitPrice: nextUnitPrice, unitPriceInput: value, totalPrice: cartItemTotal(item, nextUnitPrice) }
                : item)
        );
    };

    const resetCartItemUnitPrice = (cartId: string) => {
        setCart((items) =>
            items.map((item) => {
                if (item.cartId !== cartId) return item;
                const originalUnitPrice = roundMoney(baseLinePrice(item.product, item.selectedOption, item.selectedRecipeAlternatives));
                return {
                    ...item,
                    unitPrice: originalUnitPrice,
                    unitPriceInput: originalUnitPrice.toFixed(2),
                    totalPrice: cartItemTotal(item, originalUnitPrice),
                };
            })
        );
    };

    const buildOrderInput = (): OrderCreateDto => ({
        tenantId: user?.tenantId || config.tenantId || undefined,
        tableId: null,
        tableName: getPartnerCode(selectedPartner),
        orderType: TAKEAWAY_ORDER_TYPE,
        serviceChargeRate: 0,
        taxRate: storeTaxRate,
        orderSource: DELIVERY_PARTNER_SOURCE,
        deliveryPartnerId: selectedPartnerId,
        deliveryPartnerName: selectedPartner?.name ?? null,
        deliveryPartnerNameAr: selectedPartner?.nameAr ?? null,
        deliveryPartnerCode: selectedPartner?.code ?? null,
        partnerOrderNumber: partnerOrderNumber.trim(),
        partnerCustomerName: customerName.trim() || null,
        partnerCustomerPhone: customerPhone.trim() || null,
        partnerPaymentMethod: paymentMethod,
        partnerPickupTime: toPickupIso(pickupTime),
        partnerDeliveryFee: 0,
        partnerServiceFee: 0,
        actualDeliveryCost: 0,
        hasPriceDifference,
        priceDifferenceReasonCode: hasPriceDifference ? priceDifferenceReasonCode : null,
        priceDifferenceNote: hasPriceDifference ? priceDifferenceNote.trim() || null : null,
        priceDifferenceCorrectionMode: hasPriceDifference ? priceDifferenceCorrectionMode : null,
        correctPartnerTotal: hasPriceDifference && priceDifferenceCorrectionMode === "OrderTotal" ? totalAmount : null,
        customerPhone: customerPhone.trim() || undefined,
        deliveryNotes: notes.trim() || null,
        offlinePaidAt: new Date().toISOString(),
        items: cart.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.unitPrice,
            notes: item.notes ?? "",
            partnerCorrectedUnitPrice: partnerCorrectedUnitPrice(
                item,
                hasPriceDifference && priceDifferenceCorrectionMode === "PerItem"
            ),
            selectedOptionId: item.selectedOption?.id ?? null,
            selectedRecipeAlternatives: item.selectedOption ? [] : (item.selectedRecipeAlternatives ?? []),
            modifiers: item.selectedOption ? [] : item.selectedModifiers.map((modifier) => ({
                modifierId: modifier.id,
                modifierName: modifier.name,
                modifierNameAr: modifier.nameAr,
                price: modifierUnitPrice(item.product, modifier),
                quantity: modifier.quantity || 1,
            })),
        })),
    });

    const validate = () => {
        if (!selectedPartnerId) return partners.length === 0 ? text.noPartners : text.requiredPartner;
        if (!partnerOrderNumber.trim()) return text.requiredOrder;
        if (!customerName.trim()) return text.requiredCustomerName;
        if (!customerPhone.trim()) return text.requiredCustomerPhone;
        if (!paymentMethod.trim()) return text.requiredPayment;
        if (customerName.trim().length > MAX_NAME_LENGTH) return text.nameTooLong;
        if (customerPhone.trim().length > MAX_PHONE_LENGTH) return text.phoneTooLong;
        if (cart.length === 0) return text.requiredItems;
        if (hasPriceDifference && !canAdjustDeliveryPartnerPrices) return text.priceDifferenceViewOnly;
        if (hasPriceDifference && priceDifferenceCorrectionMode === "OrderTotal" && !hasValidCorrectPartnerTotal) {
            return text.invalidCorrectTotal;
        }
        if (hasPriceDifference && cart.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)) {
            return text.invalidCorrectPrice;
        }
        return null;
    };

    const handleSubmit = async () => {
        const error = validate();
        if (error) {
            toast.error(error);
            return;
        }

        setIsSubmitting(true);
        const receiptWindow = settings.autoPrintReceipt ? openReceiptPrintWindow() : null;

        try {
            const paidAt = new Date().toISOString();
            const createdOrder = await createOrderSmart(
                { ...buildOrderInput(), offlinePaidAt: paidAt },
                createOrderAndReturn,
            );
            if (!createdOrder) {
                toast.error(text.failed);
                return;
            }

            let settledOrder: OrderDto = createdOrder;
            const paymentClientActionId = await generateActionId();
            const paymentPayload = {
                amount: totalAmount,
                paymentMethod,
                referenceNumber: partnerOrderNumber.trim(),
                serviceChargeRate: 0,
                taxRate: storeTaxRate,
                customerPhone: customerPhone.trim() || undefined,
                paidAt,
                clientActionId: paymentClientActionId,
            };

            if (isOfflineOrderId(createdOrder.id)) {
                if (paymentMethod === "Cash") {
                    await enqueuePaymentOffline(createdOrder.id, paymentPayload, {
                        paidAmount: totalAmount,
                        isPaid: true,
                        paymentStatus: "Paid",
                    });
                }
                settledOrder = await settleServerPaidOrderOffline(
                    createdOrder.id,
                    paymentPayload,
                ) ?? createdOrder;
            } else if (paymentMethod === "Cash") {
                let payment = null as Awaited<ReturnType<typeof addOrderPayment>>;
                try {
                    payment = await addOrderPayment({
                        orderId: createdOrder.id,
                        amount: totalAmount,
                        method: paymentMethod,
                        referenceNumber: partnerOrderNumber.trim(),
                        serviceChargeRate: 0,
                        taxRate: storeTaxRate,
                        customerPhone: customerPhone.trim() || undefined,
                        paidAt,
                        clientActionId: paymentClientActionId,
                    });
                } catch (error) {
                    if (!isNetworkRequestError(error)) throw error;
                    await enqueuePaymentOffline(createdOrder.id, paymentPayload, {
                        paidAmount: totalAmount,
                        isPaid: true,
                        paymentStatus: "Paid",
                    });
                    settledOrder = await settleServerPaidOrderOffline(
                        createdOrder.id,
                        paymentPayload,
                    ) ?? createdOrder;
                }

                if (!payment && settledOrder === createdOrder) {
                    toast.error(text.paymentFailed);
                    return;
                }

                if (payment) {
                    settledOrder = {
                        ...createdOrder,
                        totalAmount: payment.totalAmount,
                        paidAmount: payment.paidAmount,
                        remainingAmount: payment.remainingAmount,
                        paymentStatus: payment.paymentStatus,
                        isPaid: payment.isPaid,
                        paymentMethod: payment.paymentMethod,
                        payments: payment.payments,
                        status: payment.isPaid ? "Paid" : createdOrder.status,
                    };
                }
            }

            const paidOrder: OrderDto = {
                ...settledOrder,
                customerName: customerName.trim() || settledOrder.customerName,
                customerPhone: customerPhone.trim() || settledOrder.customerPhone,
                deliveryPartnerId: selectedPartnerId,
                deliveryPartnerName: selectedPartner?.name ?? settledOrder.deliveryPartnerName,
                deliveryPartnerNameAr: selectedPartner?.nameAr ?? settledOrder.deliveryPartnerNameAr,
                deliveryPartnerCode: selectedPartner?.code ?? settledOrder.deliveryPartnerCode,
                partnerOrderNumber: partnerOrderNumber.trim() || settledOrder.partnerOrderNumber,
                partnerCustomerName: customerName.trim() || settledOrder.partnerCustomerName,
                partnerCustomerPhone: customerPhone.trim() || settledOrder.partnerCustomerPhone,
                partnerPaymentMethod: paymentMethod,
                partnerPickupTime: toPickupIso(pickupTime) ?? settledOrder.partnerPickupTime,
                deliveryNotes: notes.trim() || settledOrder.deliveryNotes,
                partnerDeliveryFee: 0,
                partnerServiceFee: 0,
                actualDeliveryCost: 0,
                customerDeliveryFee: 0,
                deliveryMargin: 0,
                hasPriceDifference,
                hasPartnerDiscountOverride: hasPriceDifference || settledOrder.hasPartnerDiscountOverride,
            };

            if (settings.autoPrintReceipt) {
                printReceipt({
                    order: paidOrder,
                    settings,
                    logoUrl,
                    businessName,
                    products: pricedProducts,
                    currency,
                    storeServiceChargeRate: 0,
                    storeTaxRate,
                    customerName: customerName.trim() || undefined,
                    customerPhone: customerPhone.trim() || undefined,
                    targetWindow: receiptWindow,
                });
            }

            await onOrderCreated(paidOrder);
            toast.success(text.created);
            reset();
            pushTalabatDialogDebugLog("dialog:close-request:submit-success", {
                selectedPartnerId,
                cartSize: cart.length,
            });
            onOpenChange(false);
        } catch (err) {
            if (receiptWindow && !receiptWindow.closed) receiptWindow.close();
            const message = err instanceof Error ? err.message : text.failed;
            toast.error(message || text.failed);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    className="flex h-[calc(100dvh-8px)] max-h-[calc(100dvh-8px)] w-[calc(100vw-8px)] max-w-none flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-none sm:p-0"
                    data-talabat-debug="content"
                    onOpenAutoFocus={(event) => {
                        pushTalabatDialogDebugLog("dialog:onOpenAutoFocus", {
                            summary: summarizeDebugEvent(event),
                        });
                    }}
                    onCloseAutoFocus={(event) => {
                        pushTalabatDialogDebugLog("dialog:onCloseAutoFocus", {
                            summary: summarizeDebugEvent(event),
                        });
                    }}
                    onInteractOutside={(event) => {
                        pushTalabatDialogDebugLog("dialog:onInteractOutside", {
                            summary: summarizeDebugEvent(event),
                        });
                        preventParentDismissWhileProductModalOpen(event);
                    }}
                    onPointerDownOutside={(event) => {
                        pushTalabatDialogDebugLog("dialog:onPointerDownOutside", {
                            summary: summarizeDebugEvent(event),
                        });
                        preventParentDismissWhileProductModalOpen(event);
                    }}
                    onFocusOutside={(event) => {
                        pushTalabatDialogDebugLog("dialog:onFocusOutside", {
                            summary: summarizeDebugEvent(event),
                        });
                        preventParentDismissWhileProductModalOpen(event);
                    }}
                    onEscapeKeyDown={(event) => {
                        pushTalabatDialogDebugLog("dialog:onEscapeKeyDown", {
                            summary: summarizeDebugEvent(event),
                        });
                    }}
                    onPointerDown={(event) => {
                        pushTalabatDialogDebugLog("dialog:onPointerDown", {
                            summary: summarizeDebugEvent(event.nativeEvent),
                        });
                    }}
                    onPointerUp={(event) => {
                        pushTalabatDialogDebugLog("dialog:onPointerUp", {
                            summary: summarizeDebugEvent(event.nativeEvent),
                        });
                    }}
                    onTouchStart={(event) => {
                        pushTalabatDialogDebugLog("dialog:onTouchStart", {
                            summary: summarizeDebugEvent(event.nativeEvent),
                        });
                    }}
                    onTouchEnd={(event) => {
                        pushTalabatDialogDebugLog("dialog:onTouchEnd", {
                            summary: summarizeDebugEvent(event.nativeEvent),
                        });
                    }}
                >
                    <DialogHeader className="border-b bg-white px-4 py-1 sm:px-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <DialogTitle className="flex items-center gap-2.5 text-base">
                                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white">
                                    <ShoppingBag className="h-4 w-4" />
                                </span>
                                <span>{text.title}</span>
                                {selectedPartner && (
                                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                                        {getPartnerCode(selectedPartner).toUpperCase()}
                                    </Badge>
                                )}
                            </DialogTitle>
                            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                                <div className="w-[220px] max-w-full xl:w-[260px]">
                                    <Select
                                        value={selectedPartnerId}
                                        onValueChange={(value) => {
                                            setSelectedPartnerId(value);
                                            setCart([]);
                                            setHasPriceDifference(false);
                                            setPriceDifferenceReasonCode("PriceDifference");
                                            setPriceDifferenceNote("");
                                            setPriceDifferenceCorrectionMode("PerItem");
                                            setCorrectPartnerTotalInput("");
                                        }}
                                        disabled={isLoadingPartners || isSubmitting}
                                    >
                                        <SelectTrigger className="h-9 border-red-200 bg-white text-sm font-bold text-red-700">
                                            <SelectValue placeholder={text.partner} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {partners.map((partner) => (
                                                <SelectItem key={partner.id} value={partner.id}>
                                                    {getDeliveryPartnerName(partner, isArabic)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Badge className="bg-red-600 text-white hover:bg-red-600">
                                    {paymentStatusLabel}
                                </Badge>
                                <Badge variant="outline" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(pickupTime)}
                                </Badge>
                                <Badge variant="outline" className="gap-1">
                                    <PackageCheck className="h-3 w-3" />
                                    {quantityCount}
                                </Badge>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_520px] xl:grid-cols-[minmax(0,1fr)_560px] 2xl:grid-cols-[minmax(0,1fr)_600px]">
                        <div className="flex min-h-0 flex-col overflow-hidden bg-slate-50">
                    <div className="border-b bg-red-50/70 px-4 py-1.5 sm:px-5">
                        <div className="mb-1.5 flex items-center gap-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <ReceiptText className="h-4 w-4 text-red-600" />
                                {text.ticketDetails}
                            </div>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-x-2 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                            <Field icon={<Hash className="h-3.5 w-3.5" />} label={text.orderNumber}>
                                <Input
                                    value={partnerOrderNumber}
                                    onChange={(event) => setPartnerOrderNumber(event.target.value)}
                                    maxLength={64}
                                    className="h-9 bg-white text-sm"
                                />
                            </Field>
                            <Field icon={<UserRound className="h-3.5 w-3.5" />} label={text.customerName}>
                                <Input
                                    value={customerName}
                                    onChange={(event) => setCustomerName(event.target.value)}
                                    maxLength={MAX_NAME_LENGTH}
                                    className="h-9 bg-white text-sm"
                                />
                            </Field>
                            <Field icon={<Phone className="h-3.5 w-3.5" />} label={text.customerPhone}>
                                <Input
                                    value={customerPhone}
                                    onChange={(event) => setCustomerPhone(event.target.value)}
                                    maxLength={MAX_PHONE_LENGTH}
                                    className="h-9 bg-white text-sm"
                                />
                            </Field>
                            <Field icon={<CreditCard className="h-3.5 w-3.5" />} label={text.paymentMethod}>
                                <Select
                                    value={paymentMethod}
                                    onValueChange={(value) => setPaymentMethod(value as (typeof PAYMENT_METHODS)[number])}
                                >
                                    <SelectTrigger className="h-9 bg-white text-sm font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map((method) => (
                                            <SelectItem key={method} value={method}>
                                                {getPaymentLabel(method, isArabic ? "ar" : "en")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field icon={<Clock className="h-3.5 w-3.5" />} label={text.pickupTime}>
                                <Input
                                    type="time"
                                    value={pickupTime}
                                    onChange={(event) => setPickupTime(event.target.value)}
                                    className="h-9 bg-white text-sm"
                                />
                            </Field>
                            <Field icon={<ReceiptText className="h-3.5 w-3.5" />} label={text.notes}>
                                <Input
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    maxLength={500}
                                    className="h-9 bg-white text-sm"
                                />
                            </Field>
                        </div>
                    </div>

                            <div className="flex items-center justify-between border-b px-4 py-2.5">
                                <h3 className="text-sm font-bold text-slate-900">{text.products}</h3>
                                <Badge variant="secondary">{isLoadingPrices ? "..." : pricedProducts.length}</Badge>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                                {productsError && !isLoadingPrices ? (
                                    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-red-200 bg-red-50 p-6 text-center text-sm">
                                        <div className="font-semibold text-red-700">{text.pricesFailed}</div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setProductsReloadKey((key) => key + 1)}
                                        >
                                            {isArabic ? "إعادة المحاولة" : "Retry"}
                                        </Button>
                                    </div>
                                ) : (
                                    <ProductSelectionPanel
                                        products={pricedProducts}
                                        currency={currency}
                                        disabled={isSubmitting || isLoadingPrices || !selectedPartnerId}
                                        onProductSelect={handleProductSelect}
                                        onProductQuickView={setQuickViewProduct}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex min-h-0 flex-col border-t bg-white lg:border-s lg:border-t-0">
                            <div className="flex items-center justify-between border-b px-4 py-2.5">
                                <h3 className="text-base font-bold text-slate-900">{text.items}</h3>
                                <Badge variant="secondary">{quantityCount}</Badge>
                            </div>

                            <div className="shrink-0 border-b bg-white">
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 border-b bg-slate-50/70 p-2 text-[11px] leading-4 text-slate-600">
                                    <SummaryRow label={text.partner} value={partnerName || "-"} />
                                    <SummaryRow label={text.orderNumber} value={partnerOrderNumber.trim() || "-"} />
                                    <SummaryRow label={text.customerName} value={customerName.trim() || text.noCustomer} />
                                    <SummaryRow label={text.customerPhone} value={customerPhone.trim() || text.noPhone} />
                                </div>
                                <div className="bg-red-50/60 p-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-700">
                                            <BadgePercent className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="text-sm font-bold text-red-950">{text.priceDifference}</div>
                                                <Badge
                                                    variant={hasPriceDifference ? "destructive" : "secondary"}
                                                    className="h-6 rounded-md px-2.5 text-xs font-bold"
                                                >
                                                    {hasPriceDifference ? text.priceDifferenceEnabled : text.priceDifferenceDisabled}
                                                </Badge>
                                            </div>
                                            <div className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-600">{text.priceDifferenceHint}</div>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant={hasPriceDifference ? "destructive" : "outline"}
                                        disabled={!canAdjustDeliveryPartnerPrices || isSubmitting}
                                        onClick={() => setHasPriceDifference((value) => !value)}
                                        className="mt-1.5 h-8 w-full justify-between rounded-md px-3 text-sm font-bold"
                                    >
                                        <span>{text.priceDifference}</span>
                                        <span className="flex h-5 w-5 items-center justify-center rounded border border-current bg-white text-red-600">
                                            {hasPriceDifference ? <Check className="h-4 w-4" /> : null}
                                        </span>
                                    </Button>
                                    {!canAdjustDeliveryPartnerPrices ? (
                                        <div className="mt-2 rounded-md border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-700">
                                            {text.priceDifferenceViewOnly}
                                        </div>
                                    ) : null}
                                    {hasPriceDifference ? (
                                        <div className="mt-2 space-y-2">
                                            <Field label={text.correctionMode}>
                                                <RadioGroup value={priceDifferenceCorrectionMode}
                                                    onValueChange={(value) => setPriceDifferenceCorrectionMode(value as DeliveryPartnerPriceCorrectionMode)}
                                                    disabled={isSubmitting} className="flex gap-4 rounded-md bg-white p-2">
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="PerItem" id="create-price-mode-per-item" />
                                                        <Label htmlFor="create-price-mode-per-item">{text.perItem}</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="OrderTotal" id="create-price-mode-order-total" />
                                                        <Label htmlFor="create-price-mode-order-total">{text.orderTotal}</Label>
                                                    </div>
                                                </RadioGroup>
                                            </Field>
                                            <div className="grid grid-cols-2 gap-2">
                                            <Field label={text.priceDifferenceReason}>
                                                <Select
                                                    value={priceDifferenceReasonCode}
                                                    onValueChange={(value) => setPriceDifferenceReasonCode(value as DeliveryPartnerPriceAdjustmentReason)}
                                                    disabled={isSubmitting}
                                                >
                                                    <SelectTrigger className="h-8 bg-white text-sm font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {PRICE_DIFFERENCE_REASONS.map((reason) => (
                                                            <SelectItem key={reason.code} value={reason.code}>
                                                                {isArabic ? reason.ar : reason.en}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <Field label={text.priceDifferenceNote}>
                                                <Input
                                                    value={priceDifferenceNote}
                                                    onChange={(event) => setPriceDifferenceNote(event.target.value)}
                                                    maxLength={500}
                                                    disabled={isSubmitting}
                                                    className="h-8 bg-white text-sm"
                                                />
                                            </Field>
                                            </div>
                                            {priceDifferenceCorrectionMode === "OrderTotal" ? (
                                                <div className="grid grid-cols-3 gap-2 rounded-md border border-red-100 bg-white p-2 text-xs">
                                                    <SummaryRow label={text.systemTotal} value={formatCurrency(systemTotalAmount, currency)} />
                                                    <Field label={text.correctPartnerTotal}>
                                                        <Input type="number" inputMode="decimal" min={0} step="0.01"
                                                            value={correctPartnerTotalInput} disabled={isSubmitting}
                                                            onChange={(event) => setCorrectPartnerTotalInput(event.target.value)}
                                                            className="h-8 text-end font-bold" />
                                                    </Field>
                                                    <SummaryRow label={text.calculatedDifference}
                                                        value={hasValidCorrectPartnerTotal
                                                            ? formatCurrency(roundMoney(parsedCorrectPartnerTotal - systemTotalAmount), currency)
                                                            : "-"} />
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                                {cart.length === 0 ? (
                                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        {text.noItems}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cart.map((item) => {
                                            const originalUnitPrice = roundMoney(baseLinePrice(item.product, item.selectedOption, item.selectedRecipeAlternatives));

                                            return (
                                            <div key={item.cartId} className="rounded-lg border bg-white p-4 shadow-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="line-clamp-2 text-base font-bold leading-6 text-slate-900">
                                                            {isArabic && item.product.nameAr ? item.product.nameAr : item.product.name}
                                                        </div>
                                                        <div className="mt-1 text-sm font-semibold text-slate-500">
                                                            {item.quantity} x {formatCurrency(item.totalPrice / item.quantity, currency)}
                                                        </div>
                                                        {item.selectedOption && (
                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                {isArabic && item.selectedOption.nameAr ? item.selectedOption.nameAr : item.selectedOption.name}
                                                            </div>
                                                        )}
                                                        {item.selectedModifiers.length > 0 && (
                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                {item.selectedModifiers.map((modifier) =>
                                                                    `${isArabic && modifier.nameAr ? modifier.nameAr : modifier.name} x${modifier.quantity || 1}`
                                                                ).join(", ")}
                                                            </div>
                                                        )}
                                                        {item.notes && <div className="mt-1 text-xs italic text-muted-foreground">{item.notes}</div>}
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="text-base font-bold text-emerald-600">{formatCurrency(item.totalPrice, currency)}</div>
                                                        <div className="mt-2 flex justify-end gap-1">
                                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditItem(item)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setCart((items) => items.filter((candidate) => candidate.cartId !== item.cartId))}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {hasPriceDifference && priceDifferenceCorrectionMode === "PerItem" ? (
                                                    <div className="mt-3 rounded-md border border-red-100 bg-red-50/70 p-3">
                                                        <div className="grid gap-2 sm:grid-cols-2">
                                                            <div className="rounded-md bg-white px-3 py-2">
                                                                <div className="text-xs font-semibold text-slate-600">{text.currentPartnerPrice}</div>
                                                                <div className="mt-1 font-mono text-sm font-bold text-slate-950">
                                                                    {formatCurrency(originalUnitPrice, currency)}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs font-bold text-red-950">
                                                                    {text.correctPartnerPrice}
                                                                </Label>
                                                                <Input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    min={0.01}
                                                                    step="0.01"
                                                                    value={item.unitPriceInput}
                                                                    disabled={isSubmitting || !canAdjustDeliveryPartnerPrices}
                                                                    onChange={(event) => updateCartItemUnitPrice(item.cartId, event.target.value)}
                                                                    className="h-9 bg-white text-end text-base font-bold text-slate-950"
                                                                />
                                                            </div>
                                                        </div>
                                                        {item.unitPrice !== originalUnitPrice ? (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={isSubmitting || !canAdjustDeliveryPartnerPrices}
                                                                onClick={() => resetCartItemUnitPrice(item.cartId)}
                                                                className="mt-2 h-8 w-full border-red-200 bg-white text-xs font-bold text-red-700 hover:bg-red-100"
                                                            >
                                                                {isArabic ? "إرجاع السعر" : "Reset price"}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="border-t bg-white p-2">
                                <div className="w-full space-y-1.5">
                                    <div className="space-y-0.5 rounded-md border bg-slate-50 p-2 text-sm">
                                        <SummaryRow label={text.subtotal} value={formatCurrency(subtotal, currency)} />
                                        {taxAmount > 0 && <SummaryRow label={`${text.tax} (${storeTaxRate}%)`} value={formatCurrency(taxAmount, currency)} />}
                                        <div className="flex items-center justify-between border-t pt-2 text-lg font-bold text-slate-950">
                                            <span>{text.total}</span>
                                            <span className="text-red-600">{formatCurrency(totalAmount, currency)}</span>
                                        </div>
                                        {taxAmount > 0 && <div className="pt-1 text-xs text-muted-foreground">{text.vatIncluded}</div>}
                                    </div>
                                    <Button className="h-9 w-full bg-red-600 font-bold hover:bg-red-700" disabled={isSubmitting} onClick={handleSubmit}>
                                        {isSubmitting ? text.submitting : text.submit}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ProductModal
                product={selectedProduct}
                isOpen={isProductModalOpen}
                onClose={closeProductModal}
                onAddToCart={handleAddToCart}
                initialQuantity={modalInitialQuantity}
                initialNotes={modalInitialNotes}
                initialModifierIds={modalInitialModifierIds}
                initialModifierQuantities={modalInitialModifierQuantities}
                actionLabel={editingCartId ? text.updateItem : text.addToCart}
                orderType={TAKEAWAY_MODAL_ORDER_TYPE}
            />
            <ProductQuickViewDialog product={quickViewProduct} open={!!quickViewProduct} onOpenChange={(nextOpen) => !nextOpen && setQuickViewProduct(null)} />
        </>
    );
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
    return (
        <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-[11px] font-semibold leading-4 text-slate-600">
                {icon}
                {label}
            </Label>
            {children}
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}
