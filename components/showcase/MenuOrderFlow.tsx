"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import StoreImage from "@/components/showcase/StoreImage";
import {
    Banknote,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    FileText,
    Loader2,
    MapPin,
    Minus,
    Plus,
    Printer,
    ShoppingBag,
    Route,
    Store,
    Tag,
    Trash2,
    Wallet,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { createPublicOrder } from "@/lib/api";
import { onlineShoppingApi, type OnlinePaymentMethod } from "@/lib/api-online-shopping";
import { formatCurrency } from "@/lib/currencies";
import {
    buildOnlineOrderTrackingUrl,
    rememberOnlineOrder,
} from "@/lib/online-order-status";
import { generateUUID } from "@/lib/uuid";
import {
    EMPTY_CHECKOUT_DETAILS,
    readCheckoutDetails,
    rememberCheckoutDetails,
    type StoreCheckoutDetails,
} from "@/lib/store-checkout-details";
import { useCartStore, type CartItem } from "@/store/cartStore";
import { useSettingsStore } from "@/store/settingsStore";
import { activeStorefrontBranchId, useStorefrontStore } from "@/store/storefrontStore";
import type { OrderDto } from "@/types/order";

type Fulfilment = "Pickup" | "Delivery";
type Timing = "asap" | "scheduled";
type Step = "cart" | "checkout" | "confirmation";
/** The route that is the checkout. Landing on it opens this flow at its checkout step. */
const CHECKOUT_PATH = "/shop/checkout";
const MINIMUM_SCHEDULE_LEAD_MINUTES = 1;
const MILLISECONDS_PER_MINUTE = 60_000;
function getMinimumScheduledFor(): string {
    const minimum = new Date(
        Date.now() + MINIMUM_SCHEDULE_LEAD_MINUTES * MILLISECONDS_PER_MINUTE,
    );
    minimum.setSeconds(0, 0);
    minimum.setMinutes(minimum.getMinutes() + 1);
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${minimum.getFullYear()}-${pad(minimum.getMonth() + 1)}-${pad(minimum.getDate())}T${pad(minimum.getHours())}:${pad(minimum.getMinutes())}`;
}

function itemTotal(item: CartItem) {
    const modifiers = (item.modifiers ?? []).reduce(
        (total, modifier) => total + modifier.price * (modifier.quantity ?? 1),
        0,
    );
    return (item.price + modifiers) * item.quantity;
}

type CartRow =
    | { kind: "item"; key: string; item: CartItem }
    | { kind: "offer"; key: string; offerLineId: number; name: string; nameAr?: string; lines: CartItem[]; copies: number };

/**
 * Groups the flat cart into display rows, keeping every line in its original position so
 * the list does not reshuffle when a bundle is added.
 */
function buildCartRows(items: CartItem[]): CartRow[] {
    const rows: CartRow[] = [];
    const seenOffers = new Set<number>();

    for (const item of items) {
        if (item.offerLineId == null) {
            rows.push({
                kind: "item",
                key: `${item.productId}-${item.selectedOptionId ?? ""}-${JSON.stringify(item.modifiers)}`,
                item,
            });
            continue;
        }
        if (seenOffers.has(item.offerLineId)) continue;
        seenOffers.add(item.offerLineId);

        const lines = items.filter(row => row.offerLineId === item.offerLineId);
        rows.push({
            kind: "offer",
            key: `offer-${item.offerLineId}`,
            offerLineId: item.offerLineId,
            name: item.offerName ?? item.productName,
            nameAr: item.offerNameAr,
            lines,
            copies: Math.max(1, Math.round(item.quantity / (item.offerUnitQuantity || item.quantity || 1))),
        });
    }

    return rows;
}

function itemDiscount(item: CartItem) {
    if (!item.originalPrice || item.originalPrice <= item.price) return 0;
    return (item.originalPrice - item.price) * item.quantity;
}

export default function MenuOrderFlow() {
    const { locale } = useLocale();
    const orderContext = useStorefrontStore(state => state.context);
    const selectedBranchId = useStorefrontStore(state => state.branchId);
    const onBranchChange = useStorefrontStore(state => state.setBranchId);
    const loadContext = useStorefrontStore(state => state.loadContext);
    const open = useStorefrontStore(state => state.cartOpen);
    const setOpen = useStorefrontStore(state => state.setCartOpen);
    const branchId = activeStorefrontBranchId({ context: orderContext, branchId: selectedBranchId });
    const onRefresh = () => { void loadContext(); };
    const currency = useSettingsStore((state) => state.settings.currency);
    const settingsLoaded = useSettingsStore((state) => state.isLoaded);
    const items = useCartStore((state) => state.items);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeFromCart = useCartStore((state) => state.removeFromCart);
    const removeOffer = useCartStore((state) => state.removeOffer);
    const setOfferCopies = useCartStore((state) => state.setOfferCopies);
    const clearCart = useCartStore((state) => state.clearCart);
    const itemCount = useCartStore((state) => state.itemCount);
    const [step, setStep] = useState<Step>("cart");
    const [fulfilment, setFulfilment] = useState<Fulfilment>("Pickup");
    const [timing, setTiming] = useState<Timing>("asap");
    const [details, setDetails] = useState<StoreCheckoutDetails>(EMPTY_CHECKOUT_DETAILS);
    const [notes, setNotes] = useState("");
    const [scheduledFor, setScheduledFor] = useState("");
    const [paymentMethodId, setPaymentMethodId] = useState("");
    const [paymentReference, setPaymentReference] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const pendingRequest = useRef<{ fingerprint: string; token: string } | null>(null);
    const [orderError, setOrderError] = useState("");
    const [confirmedOrder, setConfirmedOrder] = useState<OrderDto | null>(null);
    const [confirmedToken, setConfirmedToken] = useState("");
    const isAr = locale === "ar";

    // Prefilled from what this shopper last entered on this device — a guest storefront has
    // no signed-in customer to read a saved address from. Runs once, after mount, so nothing
    // touches storage during server rendering.
    useEffect(() => setDetails(readCheckoutDetails()), []);

    // /shop/checkout is a real address, so arriving on it — from a bookmark, a shared link or
    // the back button — opens the checkout itself rather than the page behind it. It waits for
    // the cart to have something in it (the store can rehydrate after this mounts) and then
    // fires once, so closing the dialog does not immediately reopen it.
    const pathname = usePathname();
    const openedForRoute = useRef(false);
    useEffect(() => {
        if (openedForRoute.current || pathname !== CHECKOUT_PATH || items.length === 0) return;
        openedForRoute.current = true;
        setStep("checkout");
        setOpen(true);
    }, [pathname, items.length, setOpen]);
    const setField = (field: keyof StoreCheckoutDetails, value: string) =>
        setDetails(current => ({ ...current, [field]: value }));

    const subtotal = items.reduce((total, item) => total + itemTotal(item), 0);
    const discount = items.reduce((total, item) => total + itemDiscount(item), 0);
    // The API already limits this to the branch's configured cash and card methods.
    const availablePaymentMethods = orderContext?.paymentMethods ?? [];
    const unavailableItems = items.filter(item => {
        const stock = orderContext?.productAvailability.find(row => row.productId === item.productId);
        const quantity = items.filter(row => row.productId === item.productId).reduce((sum, row) => sum + row.quantity, 0);
        return !stock?.isAvailableOnline || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
            (stock.availableQuantity != null && quantity > stock.availableQuantity);
    });
    const canIncrease = (item: CartItem) => {
        const stock = orderContext?.productAvailability.find(row => row.productId === item.productId);
        const quantity = items.filter(row => row.productId === item.productId).reduce((sum, row) => sum + row.quantity, 0);
        return !!stock?.isAvailableOnline && (stock.availableQuantity == null || quantity < stock.availableQuantity);
    };
    // A bundle is one row in the cart, not one row per product: the offer price only holds
    // for whole copies, so its parts cannot be edited independently.
    const cartRows = buildCartRows(items);
    const canIncreaseOffer = (lines: CartItem[]) => lines.every(line => {
        const stock = orderContext?.productAvailability.find(row => row.productId === line.productId);
        const held = items.filter(row => row.productId === line.productId).reduce((sum, row) => sum + row.quantity, 0);
        return !!stock?.isAvailableOnline
            && (stock.availableQuantity == null || held + (line.offerUnitQuantity ?? line.quantity) <= stock.availableQuantity);
    });
    // Whatever the merchant enabled for this branch, in the order they configured. The store
    // picks nothing and excludes nothing; it only falls back to the first entry when the current
    // selection is not offered here — which happens when the shopper switches branch.
    const selectedPayment = availablePaymentMethods.find(method => method.id === paymentMethodId)
        ?? availablePaymentMethods[0];
    const needsPaymentReference = !!selectedPayment?.requiresReferenceNumber;

    // Delivery is priced by zone, which is how this business already charges for it. A branch
    // with no zones configured cannot take a delivery order, so the option says so rather than
    // quietly disappearing.
    const deliveryZones = orderContext?.deliveryZones ?? [];
    const deliveryAvailable = deliveryZones.length > 0;
    const isDelivery = fulfilment === "Delivery" && deliveryAvailable;
    const selectedZone = deliveryZones.find(zone => zone.id === details.zoneId);
    const deliveryFee = isDelivery ? selectedZone?.deliveryFee ?? 0 : 0;
    const estimatedTotal = subtotal + deliveryFee;
    const fmt = (amount: number) => settingsLoaded && currency ? formatCurrency(amount, currency) : "—";
    const minimumScheduledFor = getMinimumScheduledFor();

    const resetAfterConfirmation = () => {
        setConfirmedOrder(null);
        setConfirmedToken("");
        setPaymentReference("");
        setTiming("asap");
        setScheduledFor("");
        setStep("cart");
        setOpen(false);
    };

    const validateCheckout = () => {
        if (!details.name.trim() || !details.phone.trim()) {
            toast.error(isAr ? "الاسم ورقم الجوال مطلوبان" : "Name and mobile number are required");
            return false;
        }
        if (fulfilment === "Delivery" && !deliveryAvailable) {
            toast.error(isAr ? "التوصيل غير متاح من هذا المتجر" : "Delivery is not available from this store");
            return false;
        }
        if (isDelivery && !selectedZone) {
            toast.error(isAr ? "اختر منطقة التوصيل" : "Select a delivery area");
            return false;
        }
        if (isDelivery && (!details.address.trim() || !details.buildingNo.trim() || !details.street.trim())) {
            toast.error(isAr
                ? "أدخل العنوان ورقم المبنى واسم الشارع"
                : "Enter the address, building number and street");
            return false;
        }
        if (timing === "scheduled" && !scheduledFor) {
            toast.error(isAr ? "اختر وقت الطلب" : "Choose an order time");
            return false;
        }
        if (needsPaymentReference && !paymentReference.trim()) {
            toast.error(isAr
                ? `أدخل رقم العملية لـ ${methodLabel(selectedPayment!)}`
                : `Enter your ${methodLabel(selectedPayment!)} reference number`);
            return false;
        }
        if (details.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) {
            toast.error(isAr ? "أدخل بريداً إلكترونياً صحيحاً" : "Enter a valid email address");
            return false;
        }
        const scheduledTimestamp = new Date(scheduledFor).getTime();
        if (timing === "scheduled" &&
            (!Number.isFinite(scheduledTimestamp) ||
                scheduledTimestamp <
                    Date.now() + MINIMUM_SCHEDULE_LEAD_MINUTES * MILLISECONDS_PER_MINUTE)) {
            toast.error(isAr
                ? "يجب أن يكون وقت الطلب المجدول في المستقبل"
                : "Scheduled order time must be in the future");
            return false;
        }
        return true;
    };

    const buildOrderPayload = (clientOrderUUID: string) => ({
        tableId: null,
        tableName: isDelivery ? "ONLINE DELIVERY" : "ONLINE PICKUP",
        orderType: isDelivery ? 2 : 1,
        orderSource: "Online",
        clientOrderUUID,
        customerName: details.name.trim(),
        customerPhone: details.phone.trim(),
        customerEmail: details.email.trim() || undefined,
        // The method the shopper chose, not a payment: the order stays unpaid until one is
        // taken, whichever method this is.
        paymentMethod: selectedPayment?.code,
        // Only sent when the merchant's configuration asks for it; the server applies the same
        // rule again and ignores anything a method was not configured to need.
        paymentReferenceNumber: needsPaymentReference ? paymentReference.trim() : undefined,
        scheduledFor: timing === "scheduled" ? new Date(scheduledFor).toISOString() : undefined,
        deliveryZoneId: isDelivery ? details.zoneId : undefined,
        deliveryAddress: isDelivery ? details.address.trim() : undefined,
        deliveryBuildingNo: isDelivery ? details.buildingNo.trim() : undefined,
        deliveryStreet: isDelivery ? details.street.trim() : undefined,
        deliveryFloor: isDelivery ? details.floor.trim() || undefined : undefined,
        deliveryNotes: notes.trim() || undefined,
        items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            // The offer id only tells intake which offer to re-price this line from; the
            // server discards `price` and derives the amount from the offer itself.
            offerLineId: item.offerLineId,
            selectedOptionId: item.selectedOptionId,
            notes: item.notes,
            modifiers: (item.modifiers ?? []).map((modifier) => ({
                modifierId: modifier.modifierId,
                modifierName: modifier.modifierName,
                modifierNameAr: modifier.modifierNameAr,
                price: modifier.price,
                quantity: modifier.quantity ?? 1,
            })),
        })),
    });

    const placeOrder = async () => {
        if (submittingRef.current || items.length === 0 || unavailableItems.length > 0 || !orderContext ||
            !branchId || !selectedPayment || !settingsLoaded || !validateCheckout()) return;
        submittingRef.current = true;
        setSubmitting(true);
        setOrderError("");
        const fingerprint = JSON.stringify({ branchId, payload: buildOrderPayload("") });
        try {
            // Minted inside the try so a failure to produce a secure token surfaces through
            // the normal error path and releases the button, rather than escaping placeOrder
            // and leaving submittingRef latched on with the spinner stuck.
            if (pendingRequest.current?.fingerprint !== fingerprint)
                pendingRequest.current = { fingerprint, token: generateUUID() };
            const clientOrderUUID = pendingRequest.current.token;
            const order = await createPublicOrder(buildOrderPayload(clientOrderUUID), branchId);
            setConfirmedToken(clientOrderUUID);
            setConfirmedOrder(order);
            setStep("confirmation");
            rememberCheckoutDetails(details);
            clearCart();
            pendingRequest.current = null;
            rememberOnlineOrder({ orderId: order.id, orderNumber: order.orderNumber, token: clientOrderUUID });
        } catch {
            setOrderError(isAr
                ? "تعذر تأكيد الطلب. تحقق من المنتجات والكمية وبياناتك ثم أعد المحاولة. سلتك محفوظة."
                : "Could not confirm your order. Check product availability, quantities and your details, then retry. Your cart is saved.");
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    /** The merchant's own name for the method, in the shopper's language. */
    const methodLabel = (method: OnlinePaymentMethod) =>
        isAr ? method.nameAr || method.name : method.name;

    /**
     * When and how this method is collected. A method the merchant configured to need a
     * transfer reference is one the shopper settles themselves; everything else is collected
     * when the order is handed over, because no method has an executable online flow here yet.
     */
    const methodHint = (method: OnlinePaymentMethod) => {
        if (method.requiresReferenceNumber) {
            return isAr
                ? "حوّل المبلغ وأدخل رقم العملية"
                : "Transfer, then enter your reference";
        }
        return isDelivery
            ? (isAr ? "الدفع عند التوصيل" : "Pay on delivery")
            : (isAr ? "الدفع عند الاستلام" : "Pay on pickup");
    };

    /** The single line the confirmation and the summary both use. */
    const paymentSummary = () => (selectedPayment ? methodLabel(selectedPayment) : "");

    const openReceipt = async (print: boolean) => {
        if (!confirmedOrder || !confirmedToken) return;
        const printWindow = print ? window.open("about:blank", "_blank") : null;
        try {
            const access = await onlineShoppingApi.createReceiptAccess(
                confirmedOrder.id,
                confirmedToken,
            );
            const url = print ? `${access.receiptUrl}?print=1` : access.receiptUrl;
            if (printWindow) printWindow.location.assign(url);
            else window.location.assign(url);
        } catch {
            printWindow?.close();
            toast.error(isAr ? "تعذر فتح الإيصال" : "Could not open the receipt");
        }
    };



    const cartLabel = (item: CartItem) => isAr ? item.productNameAr || item.productName : item.productName;
    const dialogWidth = step === "checkout" ? "sm:max-w-4xl" : "sm:max-w-lg";

    return (
        <>
            {/* Compact bottom summary bar — full width with a hairline top border, so
                it reads as store chrome rather than a floating notification. */}
            {!open && itemCount() > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/90">
                    <div className="sf-container flex h-[4.5rem] items-center gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-[10px] border">
                                <ShoppingBag className="size-[18px]" />
                                <span className="absolute -end-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                                    {itemCount()}
                                </span>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[13px] text-muted-foreground">
                                    {itemCount()} {isAr ? (itemCount() === 1 ? "منتج" : "منتجات") : (itemCount() === 1 ? "item" : "items")}
                                </span>
                                <span className="sf-price block leading-tight">{fmt(subtotal)}</span>
                            </span>
                        </div>
                        <button
                            id="store-cart"
                            type="button"
                            onClick={() => { setStep("cart"); setOpen(true); }}
                            className="sf-btn sf-btn--primary shrink-0"
                        >
                            {isAr ? "عرض السلة" : "View cart"}
                        </button>
                    </div>
                </div>
            )}

            <Dialog open={open} onOpenChange={value => { if (!submitting && step !== "confirmation") setOpen(value); }}>
                <DialogContent
                    showCloseButton={false}
                    aria-describedby={undefined}
                    className={`storefront flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:p-0 ${dialogWidth}`}
                    dir={isAr ? "rtl" : "ltr"}
                >
                    <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
                        <div className="min-w-0">
                            <DialogTitle className="text-base font-semibold">
                                {step === "cart"
                                    ? (isAr ? "سلة التسوق" : "Shopping cart")
                                    : step === "checkout"
                                        ? (isAr ? "إتمام الطلب" : "Checkout")
                                        : (isAr ? "تم تأكيد الطلب" : "Order confirmed")}
                            </DialogTitle>
                            {step !== "confirmation" && (
                                <p className="sf-meta">
                                    {itemCount()} {isAr ? (itemCount() === 1 ? "منتج" : "منتجات") : (itemCount() === 1 ? "item" : "items")}
                                </p>
                            )}
                        </div>
                        {step !== "confirmation" && (
                            <button
                                type="button"
                                disabled={submitting}
                                aria-label={isAr ? "إغلاق" : "Close"}
                                onClick={() => setOpen(false)}
                                className="sf-icon-btn -me-2 shrink-0"
                            >
                                <X className="size-[18px]" />
                            </button>
                        )}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {orderError && (
                            <div role="alert" className="m-5 mb-0 rounded-[10px] border border-destructive/40 bg-destructive/5 p-3.5 text-sm text-destructive">
                                {orderError}
                                <button
                                    type="button"
                                    onClick={() => { setStep("cart"); onRefresh(); }}
                                    className="sf-btn sf-btn--outline sf-btn--sm mt-3"
                                >
                                    {isAr ? "مراجعة السلة" : "Review cart"}
                                </button>
                            </div>
                        )}

                        {step === "cart" && (
                            <div className="p-5">
                                {items.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <ShoppingBag className="mx-auto size-8 text-muted-foreground/40" strokeWidth={1.5} />
                                        <p className="mt-3 font-semibold">{isAr ? "سلتك فارغة" : "Your cart is empty"}</p>
                                        <p className="sf-meta mt-1">{isAr ? "أضف منتجات لتبدأ طلبك." : "Add products to start your order."}</p>
                                        <button type="button" onClick={() => setOpen(false)} className="sf-btn sf-btn--primary mt-5">
                                            {isAr ? "متابعة التسوق" : "Continue shopping"}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {unavailableItems.length > 0 && (
                                            <p role="alert" className="mb-4 rounded-[10px] border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
                                                {isAr ? "تحقق من توفر وكمية:" : "Check availability and quantity:"}{" "}
                                                {unavailableItems.map(cartLabel).join(", ")}
                                            </p>
                                        )}
                                        <ul className="sf-divide">
                                            {cartRows.map((row) => row.kind === "offer" ? (
                                                <li key={row.key} className="py-4 first:pt-0">
                                                    <div className="rounded-[var(--sf-radius-sm)] border border-[var(--sf-accent-line)] bg-[var(--sf-accent-softer)] p-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--sf-accent-ink)]">
                                                                    <Tag className="size-3" />
                                                                    {isAr ? "عرض" : "Offer"}
                                                                </p>
                                                                <p className="sf-bidi break-words text-sm font-medium leading-snug">
                                                                    {isAr ? row.nameAr || row.name : row.name}
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeOffer(row.offerLineId)}
                                                                aria-label={isAr ? "حذف العرض" : "Remove offer"}
                                                                className="sf-icon-btn -me-2 -mt-2 size-9 shrink-0 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </div>

                                                        <ul className="mt-2 space-y-1">
                                                            {row.lines.map((line) => (
                                                                <li key={line.productId} className="sf-meta sf-bidi flex items-center gap-2">
                                                                    <span className="shrink-0 tabular-nums">{line.quantity}×</span>
                                                                    <span className="min-w-0 flex-1 truncate">{cartLabel(line)}</span>
                                                                    <span className="shrink-0 tabular-nums">{fmt(line.price * line.quantity)}</span>
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        <div className="mt-3 flex items-center justify-between gap-2">
                                                            <div className="flex h-9 items-center rounded-[10px] border bg-background">
                                                                <button type="button" aria-label={isAr ? "تقليل الكمية" : "Decrease quantity"} onClick={() => setOfferCopies(row.offerLineId, row.copies - 1)} className="flex size-9 items-center justify-center"><Minus className="size-3.5" /></button>
                                                                <span className="min-w-6 text-center text-[13px] font-semibold tabular-nums">{row.copies}</span>
                                                                <button type="button" disabled={!canIncreaseOffer(row.lines)} aria-label={isAr ? "زيادة الكمية" : "Increase quantity"} onClick={() => setOfferCopies(row.offerLineId, row.copies + 1)} className="flex size-9 items-center justify-center disabled:opacity-35"><Plus className="size-3.5" /></button>
                                                            </div>
                                                            <strong className="sf-price">
                                                                {fmt(row.lines.reduce((total, line) => total + itemTotal(line), 0))}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </li>
                                            ) : (
                                                <li key={row.key} className="flex gap-3 py-4 first:pt-0">
                                                    {(() => { const item = row.item; return (<>
                                                    <StoreImage
                                                        src={item.imageUrl}
                                                        alt={cartLabel(item)}
                                                        fit="contain"
                                                        sizes="72px"
                                                        className="size-[72px] shrink-0 rounded-[10px] border"
                                                    />
                                                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="sf-bidi break-words text-sm font-medium leading-snug">{cartLabel(item)}</p>
                                                                {item.optionName && (
                                                                    <p className="sf-meta sf-bidi">{isAr ? item.optionNameAr || item.optionName : item.optionName}</p>
                                                                )}
                                                                {(item.modifiers?.length ?? 0) > 0 && (
                                                                    <p className="sf-meta sf-bidi line-clamp-2">
                                                                        {item.modifiers?.map((modifier) => isAr ? modifier.modifierNameAr || modifier.modifierName : modifier.modifierName).join(", ")}
                                                                    </p>
                                                                )}
                                                                <p className="sf-meta mt-0.5 tabular-nums">{fmt(itemTotal(item) / item.quantity)}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFromCart(item.productId, item.modifiers, item.selectedOptionId)}
                                                                aria-label={isAr ? "حذف المنتج" : "Remove item"}
                                                                className="sf-icon-btn -me-2 -mt-2 size-9 shrink-0 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex h-9 items-center rounded-[10px] border">
                                                                <button type="button" aria-label={isAr ? "تقليل الكمية" : "Decrease quantity"} onClick={() => updateQuantity(item.productId, item.quantity - 1, item.modifiers, item.selectedOptionId)} className="flex size-9 items-center justify-center"><Minus className="size-3.5" /></button>
                                                                <span className="min-w-6 text-center text-[13px] font-semibold tabular-nums">{item.quantity}</span>
                                                                <button type="button" disabled={!canIncrease(item)} aria-label={isAr ? "زيادة الكمية" : "Increase quantity"} onClick={() => updateQuantity(item.productId, item.quantity + 1, item.modifiers, item.selectedOptionId)} className="flex size-9 items-center justify-center disabled:opacity-35"><Plus className="size-3.5" /></button>
                                                            </div>
                                                            <strong className="sf-price">{fmt(itemTotal(item))}</strong>
                                                        </div>
                                                    </div>
                                                    </>); })()}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-5 border-t pt-4">
                                            <OrderTotals subtotal={subtotal} discount={discount} deliveryFee={0} total={subtotal} format={fmt} isAr={isAr} />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {step === "checkout" && (
                            <fieldset disabled={submitting} className="min-w-0 md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
                                <div className="divide-y p-5 sm:p-6">
                                    <section className="pb-6">
                                        <h3 className="sf-checkout-heading">{isAr ? "بيانات التواصل" : "Contact information"}</h3>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="sf-name" className="sf-label">{isAr ? "الاسم الكامل" : "Full name"}</label>
                                                <input id="sf-name" autoComplete="name" maxLength={120} required value={details.name} onChange={(event) => setField("name", event.target.value)} className="sf-field" />
                                            </div>
                                            <div>
                                                <label htmlFor="sf-phone" className="sf-label">{isAr ? "رقم الجوال" : "Mobile number"}</label>
                                                <input id="sf-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} required value={details.phone} onChange={(event) => setField("phone", event.target.value)} dir="ltr" className="sf-field" />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label htmlFor="sf-email" className="sf-label">
                                                    {isAr ? "البريد الإلكتروني" : "Email"}{" "}
                                                    <span className="font-normal">({isAr ? "اختياري" : "optional"})</span>
                                                </label>
                                                <input id="sf-email" autoComplete="email" maxLength={200} type="email" value={details.email} onChange={(event) => setField("email", event.target.value)} dir="ltr" className="sf-field" />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="py-6">
                                        <h3 className="sf-checkout-heading">{isAr ? "طريقة الاستلام" : "Fulfilment method"}</h3>
                                        {/* Both methods are always shown. Delivery states plainly when this store
                                            cannot deliver rather than vanishing from the choice. */}
                                        <div className="grid gap-2.5 sm:grid-cols-2">
                                            <ChoiceCard
                                                selected={fulfilment === "Pickup"}
                                                onSelect={() => setFulfilment("Pickup")}
                                                icon={<Store className="size-[18px]" />}
                                                title={isAr ? "الاستلام من المتجر" : "Store pickup"}
                                                hint={isAr ? "استلم طلبك من الفرع" : "Collect from the store"}
                                            />
                                            <ChoiceCard
                                                selected={isDelivery}
                                                disabled={!deliveryAvailable}
                                                onSelect={() => setFulfilment("Delivery")}
                                                icon={<MapPin className="size-[18px]" />}
                                                title={isAr ? "التوصيل" : "Delivery"}
                                                hint={deliveryAvailable
                                                    ? (isAr ? "نوصل الطلب إلى عنوانك" : "Delivered to your address")
                                                    : (isAr ? "غير متاح من هذا المتجر" : "Not available from this store")}
                                            />
                                        </div>

                                        {(orderContext?.branches.length ?? 0) > 1 && (
                                            <div className="mt-4">
                                                <label htmlFor="sf-branch" className="sf-label">{isAr ? "المتجر" : "Store"}</label>
                                                <select id="sf-branch" value={branchId ?? ""} onChange={(event) => onBranchChange(event.target.value)} className="sf-field">
                                                    {orderContext?.branches.map((branch) => <option key={branch.id} value={branch.id}>{isAr ? branch.nameAr || branch.name : branch.name}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        {isDelivery && (
                                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                <div className="sm:col-span-2">
                                                    <label htmlFor="sf-zone" className="sf-label">{isAr ? "المنطقة" : "Area"}</label>
                                                    <select id="sf-zone" required value={deliveryZones.some(zone => zone.id === details.zoneId) ? details.zoneId : ""} onChange={(event) => setField("zoneId", event.target.value)} className="sf-field">
                                                        <option value="">{isAr ? "اختر منطقة التوصيل" : "Select delivery area"}</option>
                                                        {deliveryZones.map((zone) => <option key={zone.id} value={zone.id}>{isAr ? zone.nameAr || zone.name : zone.name} · {fmt(zone.deliveryFee)}</option>)}
                                                    </select>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label htmlFor="sf-address" className="sf-label">{isAr ? "العنوان" : "Address"}</label>
                                                    <input id="sf-address" autoComplete="address-line1" maxLength={500} required value={details.address} onChange={(event) => setField("address", event.target.value)} className="sf-field" placeholder={isAr ? "المنطقة، أقرب معلم" : "District, nearest landmark"} />
                                                </div>
                                                <div>
                                                    <label htmlFor="sf-building" className="sf-label">{isAr ? "رقم المبنى / الفيلا" : "Building / villa"}</label>
                                                    <input id="sf-building" maxLength={120} required value={details.buildingNo} onChange={(event) => setField("buildingNo", event.target.value)} className="sf-field" />
                                                </div>
                                                <div>
                                                    <label htmlFor="sf-street" className="sf-label">{isAr ? "الشارع" : "Street"}</label>
                                                    <input id="sf-street" maxLength={160} required value={details.street} onChange={(event) => setField("street", event.target.value)} className="sf-field" />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label htmlFor="sf-floor" className="sf-label">
                                                        {isAr ? "الطابق / الشقة" : "Floor / apartment"}{" "}
                                                        <span className="font-normal">({isAr ? "اختياري" : "optional"})</span>
                                                    </label>
                                                    <input id="sf-floor" maxLength={120} value={details.floor} onChange={(event) => setField("floor", event.target.value)} className="sf-field" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-4 grid grid-cols-2 gap-2.5">
                                            <button type="button" aria-pressed={timing === "asap"} onClick={() => setTiming("asap")} className={`sf-choice sf-choice--compact ${timing === "asap" ? "sf-choice--on" : ""}`}>{isAr ? "في أقرب وقت" : "ASAP"}</button>
                                            <button type="button" aria-pressed={timing === "scheduled"} onClick={() => { setTiming("scheduled"); if (!scheduledFor || scheduledFor < minimumScheduledFor) setScheduledFor(minimumScheduledFor); }} className={`sf-choice sf-choice--compact ${timing === "scheduled" ? "sf-choice--on" : ""}`}><CalendarClock className="size-4" />{isAr ? "مجدول" : "Scheduled"}</button>
                                        </div>
                                        {timing === "scheduled" && (
                                            <div className="mt-3">
                                                <label htmlFor="sf-time" className="sf-label">
                                                    {isDelivery ? (isAr ? "وقت التوصيل" : "Delivery time") : (isAr ? "وقت الاستلام" : "Pickup time")}
                                                </label>
                                                <input id="sf-time" required type="datetime-local" min={minimumScheduledFor} value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="sf-field" />
                                            </div>
                                        )}
                                    </section>

                                    <section className="py-6">
                                        <h3 className="sf-checkout-heading">{isAr ? "طريقة الدفع" : "Payment method"}</h3>
                                        {availablePaymentMethods.length === 0 ? (
                                            <p role="alert" className="text-sm text-destructive">{isAr ? "لا توجد طريقة دفع متاحة حالياً" : "No payment method is currently available"}</p>
                                        ) : (
                                            <>
                                                {/* One card per method the merchant enabled for this branch, in their
                                                    configured order. Nothing here is hardcoded to a provider. */}
                                                <div className="grid gap-2.5 sm:grid-cols-2">
                                                    {availablePaymentMethods.map((method) => (
                                                        <ChoiceCard
                                                            key={method.id}
                                                            selected={selectedPayment?.id === method.id}
                                                            onSelect={() => { setPaymentMethodId(method.id); setPaymentReference(""); }}
                                                            icon={<PaymentMethodIcon method={method} />}
                                                            title={methodLabel(method)}
                                                            hint={methodHint(method)}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Shown only for a method the merchant configured to require one. */}
                                                {needsPaymentReference && selectedPayment && (
                                                    <div className="mt-3">
                                                        <label htmlFor="sf-payment-reference" className="sf-label">
                                                            {isAr
                                                                ? `رقم العملية — ${methodLabel(selectedPayment)}`
                                                                : `${methodLabel(selectedPayment)} reference number`}
                                                        </label>
                                                        <input
                                                            id="sf-payment-reference"
                                                            required
                                                            maxLength={120}
                                                            value={paymentReference}
                                                            onChange={(event) => setPaymentReference(event.target.value)}
                                                            dir="ltr"
                                                            className="sf-field"
                                                        />
                                                        <p className="sf-meta mt-1.5">
                                                            {isAr
                                                                ? "سنتحقق من التحويل قبل تجهيز الطلب."
                                                                : "We confirm the transfer before preparing your order."}
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </section>

                                    <section className="pt-6">
                                        <h3 className="sf-checkout-heading">
                                            {isDelivery ? (isAr ? "ملاحظات التوصيل" : "Delivery notes") : (isAr ? "ملاحظات الطلب" : "Order notes")}
                                        </h3>
                                        <label htmlFor="sf-notes" className="sr-only">
                                            {isDelivery ? (isAr ? "ملاحظات التوصيل" : "Delivery notes") : (isAr ? "ملاحظات الطلب" : "Order notes")}
                                        </label>
                                        <textarea
                                            id="sf-notes"
                                            value={notes}
                                            onChange={(event) => setNotes(event.target.value)}
                                            maxLength={500}
                                            className="sf-field min-h-20"
                                            placeholder={isDelivery
                                                ? (isAr ? "إرشادات للسائق، أو أي شيء يجب أن نعرفه" : "Anything the driver should know")
                                                : (isAr ? "أي شيء يجب أن نعرفه عن طلبك" : "Anything we should know about your order")}
                                        />
                                    </section>
                                </div>

                                <aside className="border-t bg-[var(--sf-surface-sunken)] p-5 sm:p-6 md:sticky md:top-0 md:h-full md:border-s md:border-t-0">
                                    <h3 className="sf-checkout-heading">{isAr ? "ملخص الطلب" : "Order summary"}</h3>
                                    <ul className="mb-4 space-y-2 text-[13px]">
                                        {items.map((item, index) => (
                                            <li key={index} className="flex justify-between gap-3">
                                                <span className="sf-bidi min-w-0">
                                                    <span className="text-muted-foreground">{item.quantity} × </span>
                                                    {cartLabel(item)}
                                                    {item.optionName && <span className="text-muted-foreground"> · {isAr ? item.optionNameAr || item.optionName : item.optionName}</span>}
                                                </span>
                                                <span className="shrink-0 tabular-nums">{fmt(itemTotal(item))}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <OrderTotals subtotal={subtotal} discount={discount} deliveryFee={deliveryFee} total={estimatedTotal} format={fmt} isAr={isAr} />
                                    {selectedPayment && (
                                        <dl className="mt-3 flex justify-between gap-3 border-t pt-3 text-[13px]">
                                            <dt className="text-muted-foreground">{isAr ? "الدفع" : "Payment"}</dt>
                                            <dd className="sf-bidi text-end font-medium">{paymentSummary()}</dd>
                                        </dl>
                                    )}
                                    <p className="sf-meta mt-3 leading-relaxed">
                                        {isAr
                                            ? "الأسعار تقديرية وسيتم التحقق منها عند تأكيد الطلب. الدفع عند الاستلام أو التوصيل."
                                            : "Prices are estimates and are rechecked when you place your order. Payment is collected on pickup or delivery."}
                                    </p>
                                </aside>
                            </fieldset>
                        )}

                        {step === "confirmation" && confirmedOrder && (
                            <div className="p-5 sm:p-6">
                                <div className="text-center">
                                    <CheckCircle2 className="mx-auto size-12 text-emerald-600" strokeWidth={1.5} />
                                    <h3 className="mt-3 text-lg font-semibold">{isAr ? "تم استلام طلبك" : "Thanks — your order is in"}</h3>
                                    <p className="sf-meta mt-1">
                                        {isAr ? "سنبدأ التحضير ويمكنك متابعة الحالة في أي وقت." : "We’ll start preparing it. You can follow its status any time."}
                                    </p>
                                </div>

                                <div className="sf-card mt-5 divide-y">
                                    <div className="flex items-center justify-between gap-3 p-4">
                                        <span className="sf-meta">{isAr ? "رقم الطلب" : "Order number"}</span>
                                        <strong className="text-lg tracking-tight" dir="ltr">{confirmedOrder.orderNumber}</strong>
                                    </div>
                                    <dl className="space-y-2 p-4 text-sm">
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-muted-foreground">{isAr ? "طريقة الاستلام" : "Fulfilment"}</dt>
                                            <dd className="font-medium">{isDelivery ? (isAr ? "توصيل" : "Delivery") : (isAr ? "استلام" : "Pickup")}</dd>
                                        </div>
                                        {selectedPayment && (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-muted-foreground">{isAr ? "الدفع" : "Payment"}</dt>
                                                <dd className="sf-bidi text-end font-medium">{paymentSummary()}</dd>
                                            </div>
                                        )}
                                        {confirmedOrder.submittedPaymentReference && (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-muted-foreground">{isAr ? "رقم العملية" : "Reference"}</dt>
                                                <dd className="font-medium" dir="ltr">{confirmedOrder.submittedPaymentReference}</dd>
                                            </div>
                                        )}
                                        {confirmedOrder.scheduledFor && (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-muted-foreground">{isAr ? "الوقت" : "Time"}</dt>
                                                <dd className="font-medium">{new Date(confirmedOrder.scheduledFor).toLocaleString(locale)}</dd>
                                            </div>
                                        )}
                                        {confirmedOrder.deliveryAddress && (
                                            <div className="flex justify-between gap-3">
                                                <dt className="shrink-0 text-muted-foreground">{isAr ? "العنوان" : "Address"}</dt>
                                                <dd className="sf-bidi max-w-[60%] break-words text-end font-medium">{confirmedOrder.deliveryAddress}</dd>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-3 border-t pt-2">
                                            <dt className="font-semibold">{isAr ? "الإجمالي" : "Total"}</dt>
                                            <dd className="sf-price">{fmt(confirmedOrder.totalAmount)}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => window.location.assign(buildOnlineOrderTrackingUrl(confirmedOrder.id, confirmedToken))}
                                        className="sf-btn sf-btn--primary sm:col-span-2"
                                    >
                                        <Route className="size-4" />
                                        {isAr ? "تتبع الطلب" : "Track order"}
                                    </button>
                                    <button type="button" onClick={() => void openReceipt(false)} className="sf-btn sf-btn--outline">
                                        <FileText className="size-4" />
                                        {isAr ? "عرض الإيصال" : "View receipt"}
                                    </button>
                                    <button type="button" onClick={() => void openReceipt(true)} className="sf-btn sf-btn--outline">
                                        <Printer className="size-4" />
                                        {isAr ? "طباعة الإيصال" : "Print receipt"}
                                    </button>
                                </div>

                                <p className="sf-meta mt-4 text-center">
                                    {isAr
                                        ? "حفظنا هذا الطلب على هذا الجهاز حتى تتمكن من العودة إليه من صفحة «طلباتي»."
                                        : "We saved this order on this device so you can reopen it from “My orders”."}
                                </p>
                                <button type="button" onClick={resetAfterConfirmation} className="sf-btn sf-btn--quiet mt-1 w-full">
                                    {isAr ? "متابعة التسوق" : "Continue shopping"}
                                </button>
                            </div>
                        )}
                    </div>

                    {step !== "confirmation" && items.length > 0 && (
                        <div className="border-t p-4 sm:px-5">
                            {step === "cart" ? (
                                <div className="flex items-center gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="sf-meta">{isAr ? "الإجمالي التقديري" : "Estimated total"}</p>
                                        <p className="sf-price leading-tight">{fmt(subtotal)}</p>
                                    </div>
                                    <button type="button" disabled={!orderContext || unavailableItems.length > 0} onClick={() => setStep("checkout")} className="sf-btn sf-btn--primary shrink-0 px-6">
                                        {isAr ? "متابعة الدفع" : "Checkout"}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button type="button" disabled={submitting} onClick={() => setStep("cart")} className="sf-btn sf-btn--outline">
                                        {isAr ? "رجوع" : "Back"}
                                    </button>
                                    <button type="button" disabled={submitting || !settingsLoaded || !selectedPayment || !branchId || !orderContext || unavailableItems.length > 0} onClick={placeOrder} className="sf-btn sf-btn--primary min-w-0 flex-1">
                                        {submitting && <Loader2 className="size-4 animate-spin" />}
                                        <span className="truncate">{isAr ? "تأكيد الطلب" : "Confirm order"} • {fmt(estimatedTotal)}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

/**
 * The glyph for a configured payment method. Classification is presentation only — a method
 * the store cannot classify still renders, with the neutral wallet mark.
 */
function PaymentMethodIcon({ method }: { method: OnlinePaymentMethod }) {
    if (method.isCash) return <Banknote className="size-[18px]" />;
    if (method.isCard) return <CreditCard className="size-[18px]" />;
    return <Wallet className="size-[18px]" />;
}

/**
 * One selectable option — a fulfilment method, a payment method. A card rather than a radio
 * row: these are the two decisions that change what the rest of the form asks for, so they
 * should read as choices, not as list items.
 */
function ChoiceCard({
    selected,
    disabled = false,
    onSelect,
    icon,
    title,
    hint,
}: {
    selected: boolean;
    disabled?: boolean;
    onSelect: () => void;
    icon: React.ReactNode;
    title: string;
    hint: string;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={onSelect}
            className={`sf-choice sf-choice--card ${selected ? "sf-choice--on" : ""}`}
        >
            <span className="sf-choice__icon">{icon}</span>
            <span className="min-w-0 flex-1 text-start">
                <span className="block truncate text-sm font-semibold leading-tight">{title}</span>
                <span className="sf-choice__hint">{hint}</span>
            </span>
        </button>
    );
}

function OrderTotals({
    subtotal,
    discount,
    deliveryFee,
    total,
    format,
    isAr,
}: {
    subtotal: number;
    discount: number;
    deliveryFee: number;
    total: number;
    format: (amount: number) => string;
    isAr: boolean;
}) {
    return (
        <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{isAr ? "المجموع الفرعي" : "Subtotal"}</dt>
                <dd className="tabular-nums">{format(subtotal + discount)}</dd>
            </div>
            {discount > 0 && (
                <div className="flex justify-between gap-3 text-emerald-600">
                    <dt>{isAr ? "الخصم" : "Discount"}</dt>
                    <dd className="tabular-nums">-{format(discount)}</dd>
                </div>
            )}
            {deliveryFee > 0 && (
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{isAr ? "التوصيل" : "Delivery"}</dt>
                    <dd className="tabular-nums">{format(deliveryFee)}</dd>
                </div>
            )}
            <div className="flex justify-between gap-3 border-t pt-2">
                <dt className="font-semibold">{isAr ? "الإجمالي التقديري" : "Estimated total"}</dt>
                <dd className="sf-price">{format(total)}</dd>
            </div>
        </dl>
    );
}
