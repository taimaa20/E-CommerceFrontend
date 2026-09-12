"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePosStore } from "@/store/posStore";
import { generateUUID } from "@/lib/uuid";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { useAuthStore } from "@/store/authStore";
import { ProductDto, ProductOptionDto } from "@/types/pos";
import { CartItemModifier } from "@/store/posStore";
import { OrderCreateDto, OrderDto, OrderOfferProductDto, SelectedRecipeAlternativeDto, type OrderDiscountType } from "@/types/order";
import { DiscountGroupSelector } from "@/components/pos/DiscountGroupSelector";
import type { DiscountGroupOption } from "@/lib/api-discount-groups";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductModal from "@/components/ProductModal";
import ProductQuickViewDialog from "@/components/ProductQuickViewDialog";
import { useLocale } from "@/components/locale-provider";
import { toast } from "sonner";
import { createTakeawayOrder, getActiveTakeawayOrders, addItemsToOrder, setOrderOffer, updateOrderItem, payOrderStrict, getOffers, validateOrderPrice, removeOfferFromOrder, removeOfferLineFromOrder, updateOrderOfferNote, getRequestErrorMessage, getVoucherAvailability, isNetworkRequestError, type VoucherAvailability } from "@/lib/api";
import { getConnectivityState, subscribeConnectivity, type ConnectivityState } from "@/lib/offline/connectivity";
import { resolveRecipeAlternativePriceImpact } from "@/lib/recipe-alternative-pricing";
import { createPaidOrderOffline, createOrderSmart, enqueuePaymentOffline, enqueueMarkPickupOffline, isOfflineOrderId, OfflineOrderValidationError, OrderCreateClientError, type OrderItemDisplayHint } from "@/lib/offline/orders";
import { markConfirmedCancelledOrderSnapshot } from "@/lib/offline/terminal-orders";
import { useOfflineCashierStore, applyPendingOverlay } from "@/store/offlineCashierStore";
import CancelOrderModal from "@/components/cancel/CancelOrderModal";
import RefundOrderModal from "@/components/cancel/RefundOrderModal";
import { ArrowLeft, ShoppingBag, Trash2, Gift, Pencil, Banknote, Wallet, Ban, RotateCcw, MapPin, Truck, ChevronDown, Search, X, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/currencies";
import { calculateFinalTotalAfterVoucher } from "@/lib/order-payment-totals";
import { buildDiscountChange, calculateOrderDiscountTotals, computeGroupDiscountAmount } from "@/lib/order-discount";
import { addOrderPayment } from "@/lib/api";
import { generateActionId, generateClientOrderUUID } from "@/lib/offline/id";
import { applyPaymentToOrder, getOrderPaidAmount, getPaymentBreakdown, ORDER_PAYMENT_STATUS } from "@/lib/order-payments";
import { allocateOfferLines } from "@/lib/offer-utils";
import { buildOfferContentsSummary, splitCartItemsForOfferDisplay, splitOrderItemsForOfferDisplay } from "@/lib/order-offer-display";
import { ITEM_STATUS, ORDER_STATUS } from "@/lib/status-constants";
import AppHeader from "@/components/layout/AppHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { PrintReceiptButton } from "@/components/receipt/PrintReceiptButton";
import { openReceiptPrintWindow, printReceipt } from "@/lib/print-receipt";
import { useSettingsStore } from "@/store/settingsStore";
import { useBrandingStore } from "@/store/brandingStore";
import { OfferResponseDto } from "@/types/offer";
import { UserRole } from "@/types/auth";
import { canAccessArea, getDefaultRouteForRole, isAdminRole } from "@/lib/authorization";
import * as signalR from "@microsoft/signalr";
import { config } from "@/lib/config";
import { appendBranchQuery } from "@/lib/branch-selection";
import { VoucherControls } from "@/components/payment/VoucherControls";
import { DiscountControls } from "@/components/payment/DiscountControls";
import { CardPaymentMethodSelector } from "@/components/payment/CardPaymentMethodSelector";
import {
  buildVoucherAvailability,
  calculateVoucherDiscount,
  consumeVoucherLocally,
  getCachedVoucherAvailability,
  saveVoucherAvailability,
} from "@/lib/voucher";
import { ProductSelectionPanel } from "@/components/pos/order/ProductSelectionPanel";
import { productRequiresChoice, stockOnHandOf, type CodeMatchResult } from "@/lib/pos-product-lookup";
import { canMergeCartLines, checkStockForQuantity, type CartLineIdentity } from "@/lib/pos-cart-rules";
import {
  getActiveDeliveryZones,
  getDeliveryPaymentModeLabel,
  getDeliveryPaymentModeName,
  getDeliveryZoneName,
  type DeliveryZoneSelectDto,
} from "@/lib/api-delivery";
import {
  getActivePaymentMethods,
  getPaymentMethodName,
  isCashPaymentMethod,
  type PaymentMethodDto,
} from "@/lib/api-payment-methods";
import { formatOrderSequence } from "@/lib/order-sequence";
import { getRestaurantToday } from "@/lib/date-time";

export const dynamic = 'force-dynamic';

// Legacy refund UI is intentionally hidden. Cancellation uses the shared approval-request modal.
const LEGACY_REFUND_UI_ENABLED = false;
const COMPLETED_CANCELLATION_STATUS = "CompletedCancellation";
const CANCEL_REQUEST_BLOCKED_STATUSES = new Set<string>([
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REFUNDED,
  COMPLETED_CANCELLATION_STATUS,
]);

interface TakeawayCartItem {
  cartId: string;
  product: ProductDto;
  selectedModifiers: CartItemModifier[];
  /** Whole-product variant override. When set, replaces product price + recipe entirely. */
  selectedOption?: ProductOptionDto | null;
  /** Per-ingredient recipe swaps. Ignored when selectedOption is set. */
  selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[];
  quantity: number;
  totalPrice: number;
  notes?: string;
  isComplimentary: boolean;
  offerLineOfferId?: number | null;
  offerLineName?: string | null;
  offerLineNameAr?: string | null;
}

interface DraftTakeawayCheckout {
  orderInput: OrderCreateDto;
  displayHints: OrderItemDisplayHint[];
  previewOrder: OrderDto;
}

type FulfillmentMode = "Takeaway" | "Delivery";

const TAKEAWAY_TABLE_NAME = "TAKEAWAY";
const DELIVERY_TABLE_NAME = "DELIVERY";
const CARD_PAYMENT_SESSION_KEY = "pos:last-card-payment-method";
const TAKEAWAY_ORDER_TYPE = 1;
const DELIVERY_ORDER_TYPE = 2;
const TAKEAWAY_MODAL_ORDER_TYPE = 2;
const DELIVERY_MODAL_ORDER_TYPE = 4;
const TAKEAWAY_SEARCH_MAX_LENGTH = 100;

function getOrderDisplayNumber(order: Pick<OrderDto, "orderNumber" | "orderSequenceNumber" | "displayOrderNumber"> | null | undefined): string {
  return formatOrderSequence(order) ?? `#${order?.orderNumber?.slice(-4) || "?"}`;
}

function normalizeTakeawaySearch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function matchesTakeawaySearch(order: OrderDto, search: string): boolean {
  const normalizedSearch = normalizeTakeawaySearch(search);
  if (!normalizedSearch) return true;

  const values = [
    getOrderDisplayNumber(order),
    order.orderNumber,
    order.displayOrderNumber,
    order.systemOrderNumber,
    order.publicOrderNumber,
    order.clientOrderUUID,
    order.ticketId,
    order.tableName,
    order.customerName,
    order.customerNameAr,
    order.customerPhone,
    order.talabatOrderNumber,
    order.talabatCustomerName,
    order.talabatCustomerPhone,
    order.partnerOrderNumber,
    order.partnerCustomerName,
    order.partnerCustomerPhone,
    order.deliveryPartnerName,
    order.deliveryPartnerNameAr,
    order.deliveryPartnerCode,
    order.offerName,
    order.offerNameAr,
    order.offerNote,
    order.deliveryAddress,
    order.deliveryNotes,
    ...(order.items ?? []).flatMap((item) => [
      item.productName,
      item.productNameAr,
      item.notes,
      item.selectedOptionName,
      item.selectedOptionNameAr,
      ...(item.modifiers ?? []).flatMap((modifier) => [modifier.modifierName, modifier.modifierNameAr]),
    ]),
    ...(order.offerProducts ?? []).flatMap((product) => [product.name, product.nameAr]),
  ];
  const haystack = normalizeTakeawaySearch(values.filter((value) => value != null).join(" "));
  const compactHaystack = haystack.replace(/\s/g, "");

  return normalizedSearch.split(" ").every((term) =>
    haystack.includes(term) || compactHaystack.includes(term.replace(/\s/g, "")));
}

const resolveTakeawayBaseLinePrice = (
  product: ProductDto,
  selectedOption?: ProductOptionDto | null,
  selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[],
) => selectedOption
  ? selectedOption.price
  : (product.discountedPrice ?? product.basePrice) + resolveRecipeAlternativePriceImpact(product, selectedRecipeAlternatives);

const resolveTakeawayModifierUnitPrice = (product: ProductDto, modifier: CartItemModifier) => {
  const quantity = modifier.quantity || 1;
  const freeQuantityLimit = modifier.freeQuantityLimit ?? 0;
  if (modifier.isFree && (freeQuantityLimit === 0 || quantity <= freeQuantityLimit)) return 0;

  const baseUnitPrice = product.discountedPrice ?? product.basePrice;
  if ((modifier.pricingType ?? 0) === 2) return 0;
  if ((modifier.pricingType ?? 0) === 1) return (baseUnitPrice * modifier.priceAdjustment) / 100;
  return modifier.priceAdjustment;
};

const resolveTakeawayModifiersTotal = (product: ProductDto, modifiers: CartItemModifier[]) =>
  modifiers.reduce((sum, modifier) =>
    sum + resolveTakeawayModifierUnitPrice(product, modifier) * (modifier.quantity || 1), 0);

// Resolve variant + swap display names from the product graph so offline
// synthetic snapshots render the same "Variant:" pill and "↪ swap" chips as
// the server-returned OrderDto. Server ignores these — UI hints only.
function buildDisplayHintsFromCart(items: TakeawayCartItem[]): OrderItemDisplayHint[] {
  return items.map((item) => {
    const opt = item.selectedOption;
    const swaps = opt ? [] : (item.selectedRecipeAlternatives ?? []);
    const recipeSnapshot = swaps.flatMap((s) => {
      const row = item.product.recipeItems?.find((ri) => ri.id === s.recipeItemId);
      const alt = row?.alternatives?.find((a) => a.id === s.alternativeId);
      if (!row || !alt) return [];
      return [{
        rawMaterialId: alt.rawMaterialId,
        rawMaterialName: alt.rawMaterialName,
        rawMaterialNameAr: alt.rawMaterialNameAr,
        sourceRecipeItemId: row.id,
        sourceAlternativeId: alt.id,
        sourceAlternativeName: alt.name ?? alt.rawMaterialName,
        sourceAlternativeNameAr: alt.nameAr ?? alt.rawMaterialNameAr,
        quantity: alt.amount ?? 0,
      }];
    });
    return {
      selectedOptionName: opt?.name ?? null,
      selectedOptionNameAr: opt?.nameAr ?? null,
      recipeSnapshot,
    };
  });
}

function isTakeawayBoardOrder(order: Pick<OrderDto, "orderType">): boolean {
  return order.orderType === "Takeaway" || order.orderType === "Delivery";
}

function getCardPaymentSessionKey(userId?: string | null): string {
  return `${CARD_PAYMENT_SESSION_KEY}:${userId ?? "anonymous"}`;
}

function readLastCardPaymentMethod(userId?: string | null): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(getCardPaymentSessionKey(userId)) ?? "";
}

function saveLastCardPaymentMethod(userId: string | null | undefined, methodId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(getCardPaymentSessionKey(userId), methodId);
}

/**
 * Everything except Cash. This is NOT a claim that these are card payments — the
 * PaymentMethod model carries no type classification, so none can honestly be inferred.
 * Cash is separated only because it has its own tendered/change entry; every other
 * configured method is listed by name exactly as the branch configured it.
 */
function getNonCashPaymentMethods(methods: PaymentMethodDto[]): PaymentMethodDto[] {
  return methods.filter((method) => !isCashPaymentMethod(method));
}

export default function TakeawayPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCashier = searchParams.get("from") === "cashier";
  const { products, fetchProducts, currency, taxRate: storeTaxRate, serviceChargeRate: storeServiceChargeRate } = usePosStore();
  const branchVersion = useActiveBranchVersion();
  const { user } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);
  const logoUrl  = useBrandingStore((s) => s.logoUrl);
  const businessName = useBrandingStore((s) => s.businessName);

  // Local cart state (isolated from dine-in)
  const [cart, setCart] = useState<TakeawayCartItem[]>([]);
  // Affiliation discount group applied to the new takeaway order (backend re-resolves the %).
  const [selectedDiscountGroup, setSelectedDiscountGroup] = useState<DiscountGroupOption | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderDto | null>(null);
  const [takeawayOrders, setTakeawayOrders] = useState<OrderDto[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [serviceChargeRate, setServiceChargeRate] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [offerId, setOfferId] = useState<number | null>(null);
  const [offerName, setOfferName] = useState<string | null>(null);
  const [offers, setOffers] = useState<OfferResponseDto[]>([]);
  const [highlightedCartIds, setHighlightedCartIds] = useState<Set<string>>(new Set());
  const [priceWarning, setPriceWarning] = useState<{ expectedTotal: number; submittedTotal: number; message: string } | null>(null);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialQuantity, setModalInitialQuantity] = useState(1);
  const [modalInitialNotes, setModalInitialNotes] = useState("");
  const [modalInitialModifierIds, setModalInitialModifierIds] = useState<string[]>([]);
  const [modalInitialModifierQuantities, setModalInitialModifierQuantities] = useState<Record<string, number>>({});
  const [modalActionLabel, setModalActionLabel] = useState("Add to Cart");
  const [editingOrderContext, setEditingOrderContext] = useState<{ orderId: string; orderItemId: string; isComplimentary: boolean } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalOrder, setPaymentModalOrder] = useState<OrderDto | null>(null);
  const [pendingDraftCheckout, setPendingDraftCheckout] = useState<DraftTakeawayCheckout | null>(null);
  // ── Payment extras ──────────────────────────────────────────
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cashTendered, setCashTendered]   = useState("");
  const [pendingMethod, setPendingMethod] = useState<"Cash" | "Credit Card" | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDto[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState("");
  const [applyVoucher, setApplyVoucher] = useState(false);
  const [paymentDiscountType, setPaymentDiscountType] = useState<OrderDiscountType | null>(null);
  const [paymentDiscountValue, setPaymentDiscountValue] = useState(0);
  const [voucherAvailability, setVoucherAvailability] = useState<VoucherAvailability | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [isPayingOrder, setIsPayingOrder] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>("Takeaway");
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneSelectDto[]>([]);
  const [deliveryZoneSearch, setDeliveryZoneSearch] = useState("");
  const [deliveryZoneDropdownOpen, setDeliveryZoneDropdownOpen] = useState(false);
  const [selectedDeliveryZoneId, setSelectedDeliveryZoneId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryFeeAcknowledged, setDeliveryFeeAcknowledged] = useState(false);

  // ── Connectivity / offline ─────────────────────────────────
  const [connectivity, setConnectivity] = useState<ConnectivityState>("online");
  const isOnline = connectivity === "online";
  const bootstrapOffline = useOfflineCashierStore((s) => s.bootstrap);
  const pendingActions = useOfflineCashierStore((s) => s.pending);
  const offlineSnapshots = useOfflineCashierStore((s) => s.snapshots);
  const cacheServerOrders = useOfflineCashierStore((s) => s.cacheServerOrders);

  useEffect(() => {
    void bootstrapOffline();
    setConnectivity(getConnectivityState());
    return subscribeConnectivity(setConnectivity);
  }, [bootstrapOffline]);

  useEffect(() => {
    if (!isPaymentModalOpen) return;

    const fallbackAvailability = buildVoucherAvailability(
      settings.voucherEnabled,
      settings.voucherAmount,
      settings.voucherDailyLimit,
      0,
      settings.timeZoneId
    );
    const cached = getCachedVoucherAvailability(fallbackAvailability, settings.timeZoneId);
    setVoucherAvailability(cached);
    if (cached) saveVoucherAvailability(cached);

    if (!isOnline) return;
    void getVoucherAvailability().then((availability) => {
      if (!availability) return;
      setVoucherAvailability(availability);
      saveVoucherAvailability(availability);
    });
  }, [isPaymentModalOpen, isOnline, settings.voucherEnabled, settings.voucherAmount, settings.voucherDailyLimit, settings.timeZoneId]);

  useEffect(() => {
    if (!isPaymentModalOpen || !isOnline) return;

    let cancelled = false;
    setPaymentMethodsLoading(true);
    void getActivePaymentMethods()
      .then((methods) => {
        if (!cancelled) setPaymentMethods(methods);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(locale === "ar" ? "تعذر تحميل طرق الدفع" : "Failed to load payment methods");
        }
      })
      .finally(() => {
        if (cancelled) return;
        setPaymentMethodsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isPaymentModalOpen, isOnline, locale]);

  const nonCashPaymentMethods = getNonCashPaymentMethods(paymentMethods);
  const selectedNonCashMethod = nonCashPaymentMethods.find((method) => method.id === selectedPaymentMethodId) ?? null;
  const selectedMethodReferenceRequired = selectedNonCashMethod?.requiresReferenceNumber === true;
  const nonCashConfirmBlocked =
    pendingMethod === "Credit Card" &&
    (paymentMethodsLoading || nonCashPaymentMethods.length === 0 || !selectedNonCashMethod || (selectedMethodReferenceRequired && !paymentReferenceNumber.trim()));

  useEffect(() => {
    const availableNonCashMethods = getNonCashPaymentMethods(paymentMethods);
    if (availableNonCashMethods.length === 0) {
      if (selectedPaymentMethodId) setSelectedPaymentMethodId("");
      return;
    }

    setSelectedPaymentMethodId((current) => {
      if (availableNonCashMethods.some((method) => method.id === current)) return current;

      const stored = readLastCardPaymentMethod(user?.id);
      if (availableNonCashMethods.some((method) => method.id === stored)) return stored;

      return availableNonCashMethods.find((method) => method.isDefault)?.id ?? availableNonCashMethods[0].id;
    });
  }, [paymentMethods, selectedPaymentMethodId, user?.id]);

  const handleNonCashMethodChange = (methodId: string) => {
    setSelectedPaymentMethodId(methodId);
    setPaymentReferenceNumber("");
    saveLastCardPaymentMethod(user?.id, methodId);
  };

  // ── Cancel/refund order modals ──────────────────────────────
  const [refundOrderData, setRefundOrderData] = useState<OrderDto | null>(null);
  const [cancelOrderData, setCancelOrderData] = useState<OrderDto | null>(null);

  // ── Offer note editing ──────────────────────────────────────
  const [offerNoteEditing, setOfferNoteEditing] = useState(false);
  const [offerNoteValue, setOfferNoteValue] = useState("");
  const [savingOfferNote, setSavingOfferNote] = useState(false);
  // Offer selection dialog
  const [pendingOffer, setPendingOffer] = useState<OfferResponseDto | null>(null);
  const [pendingOfferNote, setPendingOfferNote] = useState("");
  const [pendingOfferQty, setPendingOfferQty] = useState(1);
  const [localOfferQty, setLocalOfferQty] = useState(1);
  const [pendingOfferLines, setPendingOfferLines] = useState<Array<{ product: ProductDto; quantity: number }>>([]);
  const [pendingOfferModifiers, setPendingOfferModifiers] = useState<Record<string, CartItemModifier[]>>({});
  const [newOfferNote, setNewOfferNote] = useState<string | null>(null);
  const [deletingOffer, setDeletingOffer] = useState(false);

  const isOrderLocked = useCallback((status?: string) =>
    status === ORDER_STATUS.PAID ||
    status === ORDER_STATUS.CANCELLED ||
    status === ORDER_STATUS.REFUNDED ||
    status === ORDER_STATUS.PENDING_CANCELLATION_APPROVAL, []);

  const isPaidOrder = useCallback((order: { status?: string; paymentMethod?: string | null; isPaid?: boolean } | null): boolean =>
    !!order && (order.status === "Paid" || !!order.paymentMethod || order.isPaid === true), []);
  const canIssueOrderCancel =
    isAdminRole(user?.role) ||
    user?.role === UserRole.Manager ||
    user?.role === UserRole.Cashier;
  const canRequestTakeawayOrderCancel = (order: OrderDto | null): boolean =>
    !!order &&
    canIssueOrderCancel &&
    !CANCEL_REQUEST_BLOCKED_STATUSES.has(order.status) &&
    order.status !== ORDER_STATUS.PENDING_CANCELLATION_APPROVAL &&
    order.isFullyCancelled !== true &&
    order.isRefunded !== true &&
    order.hasPendingCancellation !== true &&
    order.hasPendingFullCancellation !== true;
  const getItemDisplayName = (item: { productId?: string; productName: string }) => {
    if (locale === 'ar') {
      const p = products.find(pr => pr.id === item.productId);
      if (p?.nameAr) return p.nameAr;
    }
    const p = products.find(pr => pr.id === item.productId);
    return p ? (p.displayName || p.name) : item.productName;
  };

  // Role-based redirect: Waiter (role 1), Admin (role 0), and Cashier (role 3) can access takeaway
  useEffect(() => {
    if (user && !canAccessArea(user.role, "takeaway")) {
      router.push(getDefaultRouteForRole(user.role));
    }
  }, [user, router]);

  // ── Real-time updates via SignalR ────────────────────────────────────────────
  // mirrors the cashier page connection; filters events to Takeaway/Delivery orders only.
  // Skip when offline — the connection would just hang and waste battery.
  useEffect(() => {
    if (!canAccessArea(user?.role, "takeaway")) return;
    if (!isOnline) return;
    let cancelled = false;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(appendBranchQuery(config.signalRUrl), {
        accessTokenFactory: () => useAuthStore.getState().user?.token ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    const startConnection = async () => {
      try {
        await conn.start();
        if (cancelled) { conn.stop().catch(() => {}); return; }

        // New order created OR existing order updated (full OrderDto broadcast)
        conn.on("ReceiveNewOrder", (payload: unknown) => {
          if (!payload || typeof payload !== "object") return;
          const incoming = payload as OrderDto;
          if (!incoming?.id || !isTakeawayBoardOrder(incoming)) return;
          if (incoming.status === "Cancelled" || incoming.status === "Completed") {
            setTakeawayOrders((prev) => prev.filter((o) => o.id !== incoming.id));
            if (incoming.status === "Cancelled") {
              void markConfirmedCancelledOrderSnapshot(incoming.id, incoming, incoming.isRefunded === true);
            }
            setActiveOrder((prev) => (prev?.id === incoming.id ? null : prev));
            return;
          }
          setTakeawayOrders((prev) => {
            const exists = prev.some((o) => o.id === incoming.id);
            if (exists) return prev.map((o) => (o.id === incoming.id ? { ...o, ...incoming } : o));
            return [incoming, ...prev];
          });
          // Keep activeOrder in sync if the user has this order open
          setActiveOrder((prev) => (prev?.id === incoming.id ? { ...prev, ...incoming } : prev));
        });

        // Order paid — update status so UI reflects payment immediately
        conn.on("OrderPaid", (payload: unknown) => {
          if (!payload || typeof payload !== "object") return;
          const p = payload as Record<string, unknown>;
          const orderId = String(p["OrderId"] ?? p["orderId"] ?? "");
          if (!orderId) return;
          setTakeawayOrders((prev) =>
            prev.map((o) =>
              o.id === orderId ? { ...o, status: "Paid", isPaid: true } : o
            )
          );
          setActiveOrder((prev) =>
            prev?.id === orderId ? { ...prev, status: "Paid", isPaid: true } : prev
          );
        });

        // Order cancelled — remove from the list (no longer active)
        conn.on("OrderCancelled", (payload: unknown) => {
          if (!payload || typeof payload !== "object") return;
          const p = payload as Record<string, unknown>;
          const orderId = String(p["OrderId"] ?? p["orderId"] ?? "");
          if (!orderId) return;
          setTakeawayOrders((prev) => prev.filter((o) => o.id !== orderId));
          void markConfirmedCancelledOrderSnapshot(orderId);
          setActiveOrder((prev) => (prev?.id === orderId ? null : prev));
        });

        conn.on("OrderRefunded", (payload: unknown) => {
          if (!payload || typeof payload !== "object") return;
          const p = payload as Record<string, unknown>;
          const orderId = String(p["OrderId"] ?? p["orderId"] ?? "");
          if (!orderId) return;
          setTakeawayOrders((prev) => prev.filter((o) => o.id !== orderId));
          void markConfirmedCancelledOrderSnapshot(orderId, undefined, true);
          setActiveOrder((prev) => (prev?.id === orderId ? null : prev));
        });

        // Takeaway picked up → no longer active
        conn.on("OrderPickedUp", (payload: unknown) => {
          if (!payload || typeof payload !== "object") return;
          const p = payload as Record<string, unknown>;
          const orderId = String(p["OrderId"] ?? p["orderId"] ?? "");
          if (!orderId) return;
          setTakeawayOrders((prev) => prev.filter((o) => o.id !== orderId));
          setActiveOrder((prev) => (prev?.id === orderId ? null : prev));
        });

        // New items were added by another screen — reload to get full updated state
        conn.on("NewItemsAdded", () => {
          void loadTakeawayOrders();
        });
      } catch (err: unknown) {
        if (!cancelled)
          console.warn(
            "Takeaway SignalR could not connect:",
            err instanceof Error ? err.message : String(err)
          );
      }
    };

    void startConnection();

    return () => {
      cancelled = true;
      if (conn.state === signalR.HubConnectionState.Connected) conn.stop().catch(() => {});
    };
    // branchVersion: the hub URL carries the branch group — reconnect on switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, branchVersion]);

  // branchVersion: products, active orders, offers and zones are all
  // branch-scoped — reload the full set when the active branch changes.
  useEffect(() => {
    fetchProducts();
    loadTakeawayOrders();
    void loadOffers();
    void loadDeliveryZones();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProducts, branchVersion]);

  /**
   * Stock moves for reasons the till never sees — a receipt posted in Purchasing, a manual
   * adjustment, another terminal selling. Rather than poll, re-pull the catalogue when the
   * cashier comes back to this tab, which is exactly when a stale shelf figure would start
   * to matter. There is no stock event on KitchenHub to subscribe to (it carries order
   * events only), so this is the lightest honest trigger available.
   *
   * fetchProducts() is deliberately called WITHOUT { force }: the store's own 60s freshness
   * gate means rapid tab switching cannot turn this into polling. It writes nothing but the
   * product list, and cart, search, customer and Pickup/Delivery all live in this
   * component's own state, so none of them can be disturbed by a refresh.
   */
  useEffect(() => {
    // focus and visibilitychange both fire when a tab is returned to, and they arrive
    // together — too close for the store's gate to have written back yet, which would send
    // two identical requests. Collapse them into one.
    let lastTriggeredAt = 0;
    const refreshStock = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastTriggeredAt < 2000) return;
      lastTriggeredAt = now;
      void fetchProducts();
    };

    window.addEventListener("focus", refreshStock);
    document.addEventListener("visibilitychange", refreshStock);
    return () => {
      window.removeEventListener("focus", refreshStock);
      document.removeEventListener("visibilitychange", refreshStock);
    };
  }, [fetchProducts]);

  // FIX(issue-1): The reactive fold previously lived in this effect, but it
  // wrote back into `takeawayOrders` — racing with loadTakeawayOrders and
  // occasionally dropping fresh offline rows. The merge now happens in the
  // `mergedTakeawayOrders` useMemo (see below) which reads the store slice
  // directly, so the effect is redundant.

  // FIX(takeaway-reactivity): keep activeOrder aligned with the latest list
  // entry. After a queue drain swaps localId → serverId, the old id disappears
  // from takeawayOrders; without this, the selection silently dies. We re-anchor
  // by orderNumber when the id is gone so the panel keeps the cashier's context.
  useEffect(() => {
    if (!activeOrder) return;
    const latest = takeawayOrders.find((o) => o.id === activeOrder.id);
    if (latest) {
      if (latest !== activeOrder) setActiveOrder(latest);
      return;
    }
    if (activeOrder.orderNumber) {
      const swapped = takeawayOrders.find(
        (o) => o.orderNumber === activeOrder.orderNumber && !isOfflineOrderId(o.id)
      );
      if (swapped) {
        setActiveOrder(swapped);
        return;
      }
    }
    setActiveOrder(null);
  }, [takeawayOrders, activeOrder]);
  useEffect(() => {
    setHighlightedCartIds(new Set());
    setPriceWarning(null);
  }, [cart, offerId]);
  useEffect(() => {
    const activeOfferLine = cart.find((item) => item.offerLineOfferId != null);

    if (!activeOfferLine) {
      if (offerId !== null) setOfferId(null);
      if (offerName !== null) setOfferName(null);
      return;
    }

    if (offerId !== activeOfferLine.offerLineOfferId) {
      setOfferId(activeOfferLine.offerLineOfferId ?? null);
    }

    const matchedOffer = offers.find((offer) => offer.id === activeOfferLine.offerLineOfferId);
    const nextOfferName = matchedOffer?.name ?? offerName;
    if (nextOfferName && offerName !== nextOfferName) {
      setOfferName(nextOfferName);
    }
  }, [cart, offers, offerId, offerName]);
  const cartOfferDisplay = useMemo(() => splitCartItemsForOfferDisplay(cart), [cart]);

  const loadTakeawayOrders = async () => {
    // FIX(issue-1): loadTakeawayOrders is now ONLY responsible for the server
    // portion of the list. Offline snapshots + pending-action overlay are
    // applied at render time in `mergedTakeawayOrders` (shared with cashier
    // via useOfflineCashierStore.snapshots). This eliminates the timing race
    // where an async IDB read here would overwrite the just-injected offline
    // order before the snapshot subscriber caught up.
    const fromServer = await getActiveTakeawayOrders();
    const serverOrders: OrderDto[] = fromServer;
    setTakeawayOrders(serverOrders);
    // Persist the latest server snapshot so refreshes offline still see it.
    if (serverOrders.length > 0) cacheServerOrders(serverOrders);
    return serverOrders;
  };
  const loadOffers = async () => {
    const activeOffers = await getOffers();
    setOffers(activeOffers);
  };
  const loadDeliveryZones = async () => {
    try {
      setDeliveryZones(await getActiveDeliveryZones());
    } catch {
      toast.error(locale === "ar" ? "تعذر تحميل مناطق التوصيل" : "Could not load delivery zones");
    }
  };

  const isDeliveryMode = fulfillmentMode === "Delivery";
  const selectedDeliveryZone = deliveryZones.find((zone) => zone.id === selectedDeliveryZoneId) ?? null;
  const deliveryFeeAmount = isDeliveryMode
    ? Number((selectedDeliveryZone?.deliveryFee ?? 0).toFixed(2))
    : 0;
  const channelTableName = isDeliveryMode ? DELIVERY_TABLE_NAME : TAKEAWAY_TABLE_NAME;
  const channelOrderType = isDeliveryMode ? DELIVERY_ORDER_TYPE : TAKEAWAY_ORDER_TYPE;
  const channelOrderLabel = isDeliveryMode ? (locale === "ar" ? "توصيل" : "Delivery") : t("takeaway");
  const deliveryZoneSearchText = deliveryZoneSearch.trim().toLowerCase();
  const filteredDeliveryZones = deliveryZones
    .filter((zone) => {
      if (!deliveryZoneSearchText) return true;
      return [zone.nameEn, zone.nameAr, zone.code]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(deliveryZoneSearchText));
    })
    .slice(0, 8);

  const buildDeliverySnapshot = (
    zone: DeliveryZoneSelectDto | null,
    address = deliveryAddress,
    notes = deliveryNotes,
  ) => ({
    deliveryZoneId: zone?.id ?? null,
    deliveryZoneName: zone ? getDeliveryZoneName(zone, locale === "ar") : null,
    deliveryFee: Number((zone?.deliveryFee ?? 0).toFixed(2)),
    deliveryCost: zone ? Number(zone.deliveryCost.toFixed(2)) : null,
    deliveryPaymentMode: zone ? getDeliveryPaymentModeName(zone.paymentMode) : null,
    deliveryAddress: address.trim() || null,
    deliveryNotes: notes.trim() || null,
  });

  const applyDeliverySnapshotToOrder = (
    order: OrderDto,
    snapshot: ReturnType<typeof buildDeliverySnapshot>,
  ): OrderDto => {
    const previousFee = Math.max(0, order.deliveryFee ?? 0);
    const nextFee = Math.max(0, snapshot.deliveryFee ?? 0);
    const totalAmount = Math.round((order.totalAmount - previousFee + nextFee) * 100) / 100;
    const paidAmount = order.paidAmount ?? 0;

    return {
      ...order,
      ...snapshot,
      totalAmount,
      remainingAmount: Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100),
    };
  };

  const syncDraftDeliverySnapshot = (
    zone: DeliveryZoneSelectDto | null,
    address = deliveryAddress,
    notes = deliveryNotes,
  ) => {
    const snapshot = buildDeliverySnapshot(zone, address, notes);

    setPendingDraftCheckout((prev) => {
      if (!prev || prev.previewOrder.orderType !== "Delivery") return prev;

      return {
        ...prev,
        orderInput: {
          ...prev.orderInput,
          ...snapshot,
        },
        previewOrder: applyDeliverySnapshotToOrder(prev.previewOrder, snapshot),
      };
    });

    setPaymentModalOrder((prev) => {
      if (!prev || prev.orderType !== "Delivery" || isPaidOrder(prev)) return prev;
      return applyDeliverySnapshotToOrder(prev, snapshot);
    });
  };

  const handleDeliveryZoneSelect = (zone: DeliveryZoneSelectDto) => {
    setSelectedDeliveryZoneId(zone.id);
    setDeliveryZoneSearch(getDeliveryZoneName(zone, locale === "ar"));
    setDeliveryZoneDropdownOpen(false);
    setDeliveryFeeAcknowledged(false);
    syncDraftDeliverySnapshot(zone);
  };

  const handleDeliveryZoneSearchChange = (value: string) => {
    setDeliveryZoneSearch(value);
    setSelectedDeliveryZoneId("");
    setDeliveryZoneDropdownOpen(true);
    setDeliveryFeeAcknowledged(false);
    syncDraftDeliverySnapshot(null);
  };

  const handleDeliveryAddressChange = (value: string) => {
    setDeliveryAddress(value);
    syncDraftDeliverySnapshot(selectedDeliveryZone, value, deliveryNotes);
  };

  const handleDeliveryNotesChange = (value: string) => {
    setDeliveryNotes(value);
    syncDraftDeliverySnapshot(selectedDeliveryZone, deliveryAddress, value);
  };

  const validateFulfillment = (options?: { requireDeliveryZone?: boolean }) => {
    if (!isDeliveryMode || activeOrder) return true;
    if (!customerPhone.trim()) {
      toast.error(locale === "ar" ? "رقم هاتف العميل مطلوب للتوصيل" : "Customer phone is required for delivery");
      return false;
    }
    if (options?.requireDeliveryZone && !selectedDeliveryZone) {
      toast.error(locale === "ar" ? "اختر منطقة التوصيل" : "Select a delivery area");
      return false;
    }
    return true;
  };

  const handleProductClick = useCallback((product: ProductDto) => {
    if (!product.isAvailableNow) {
      toast.warning(locale === "ar" ? "هذا المنتج غير متاح حاليًا" : "This product is not available right now");
      return;
    }
    if (activeOrder && isOrderLocked(activeOrder.status)) {
      toast.error(locale === "ar" ? "لا يمكن إضافة عناصر إلى طلب مدفوع" : "Cannot add items to a paid order");
      return;
    }
    setSelectedProduct(product);
    setModalInitialQuantity(1);
    setModalInitialNotes("");
    setModalInitialModifierIds([]);
    setModalActionLabel(t("addToCartBtn"));
    setEditingOrderContext(null);
    setIsModalOpen(true);
  }, [activeOrder, isOrderLocked, locale, t]);

  const handleQuickViewProduct = useCallback((product: ProductDto) => {
    setQuickViewProduct(product);
  }, []);

  /** The identity a cart line is compared on. One shape, so scan, click and edit agree. */
  const cartLineIdentity = (
    product: ProductDto,
    modifiers: CartItemModifier[],
    notes: string,
    selectedOption?: ProductOptionDto | null,
    selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[],
  ): CartLineIdentity => ({
    productId: product.id,
    selectedOptionId: selectedOption?.id ?? null,
    modifiers: selectedOption ? [] : modifiers.map((m) => ({ id: m.id, quantity: m.quantity || 1 })),
    recipeAlternatives: selectedOption ? [] : (selectedRecipeAlternatives ?? []),
    notes,
    isComplimentary: false,
    offerLineOfferId: null,
  });

  const existingCartLineIdentity = (item: TakeawayCartItem): CartLineIdentity => ({
    productId: item.product.id,
    selectedOptionId: item.selectedOption?.id ?? null,
    modifiers: (item.selectedModifiers ?? []).map((m) => ({ id: m.id, quantity: m.quantity || 1 })),
    recipeAlternatives: item.selectedRecipeAlternatives ?? [],
    notes: item.notes ?? "",
    isComplimentary: item.isComplimentary,
    offerLineOfferId: item.offerLineOfferId ?? null,
  });

  /**
   * Early stock guard shared by every path into the cart. The ledger still validates at
   * order creation — this only stops the cashier being told at checkout what could be said
   * at the moment of scanning. `excludeCartId` is the line being edited, whose current
   * quantity is being replaced rather than added to.
   */
  const passesStockGuard = (
    product: ProductDto,
    requestedQuantity: number,
    excludeCartId: string | null,
  ): boolean => {
    const available = stockOnHandOf(product);
    const alreadyInCart = cart
      .filter((item) => item.product.id === product.id && item.cartId !== excludeCartId)
      .reduce((sum, item) => sum + item.quantity, 0);
    const verdict = checkStockForQuantity(available, alreadyInCart, requestedQuantity);
    if (verdict.allowed) return true;

    if (verdict.reason === "out-of-stock") {
      toast.error(locale === "ar" ? "غير متوفر في المخزون" : "Out of stock");
    } else {
      toast.warning(
        locale === "ar"
          ? `المتاح في المخزون ${verdict.available} فقط`
          : `Only ${verdict.available} available in stock`,
      );
    }
    return false;
  };

  const handleAddProductToCart = async (
    product: ProductDto,
    modifiers: CartItemModifier[],
    quantity: number,
    notes: string,
    selectedOption?: ProductOptionDto | null,
    selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[],
  ) => {
    if (!product.isAvailableNow) {
      toast.warning(locale === "ar" ? "هذا المنتج غير متاح حاليًا" : "This product is not available right now");
      return;
    }
    const basePriceForLine = resolveTakeawayBaseLinePrice(product, selectedOption, selectedRecipeAlternatives);
    if (editingOrderContext && activeOrder) {
      const updatedOrder = await updateOrderItem(editingOrderContext.orderId, editingOrderContext.orderItemId, {
        quantity,
        price: basePriceForLine,
        notes,
        isComplimentary: editingOrderContext.isComplimentary,
        selectedOptionId: selectedOption?.id ?? null,
        selectedRecipeAlternatives: selectedOption ? [] : (selectedRecipeAlternatives ?? []),
        modifiers: modifiers.map((m) => ({
          modifierId: m.id,
          modifierName: m.name,
          modifierNameAr: m.nameAr,
          price: resolveTakeawayModifierUnitPrice(product, m),
          quantity: m.quantity || 1,
        })),
      });
      if (!updatedOrder) {
        toast.error("Failed to update item");
        return;
      }
      const updatedOrders = await loadTakeawayOrders();
      const refreshed = updatedOrders.find((o) => o.id === editingOrderContext.orderId) ?? null;
      setActiveOrder(refreshed);
      toast.success("Item updated");
    } else if (editingCartId) {
      // Editing an existing cart item. Option price wins over modifiers + base.
      const modifiersPrice = selectedOption
        ? 0
        : resolveTakeawayModifiersTotal(product, modifiers);
      const unitPrice = basePriceForLine + modifiersPrice;
      const safeQuantity = Math.max(1, Math.floor(quantity));
      if (!passesStockGuard(product, safeQuantity, editingCartId)) return;
      setCart((prev) =>
        prev.map((item) =>
          item.cartId === editingCartId
            ? {
                ...item,
                product,
                selectedModifiers: selectedOption ? [] : modifiers,
                selectedOption: selectedOption ?? null,
                selectedRecipeAlternatives: selectedOption ? [] : (selectedRecipeAlternatives ?? []),
                quantity: safeQuantity,
                totalPrice: unitPrice * safeQuantity,
                notes: notes || undefined,
                offerLineOfferId: item.offerLineOfferId ?? null,
              }
            : item
        )
      );
      setEditingCartId(null);
    } else {
      const modifiersPrice = selectedOption
        ? 0
        : resolveTakeawayModifiersTotal(product, modifiers);
      const unitPrice = basePriceForLine + modifiersPrice;
      const safeQuantity = Math.max(1, Math.floor(quantity));

      if (!passesStockGuard(product, safeQuantity, null)) return;

      // Same sellable configuration as a line already on the ticket -> raise its quantity
      // instead of printing a second identical line. The unit price is unchanged by
      // definition (canMergeCartLines only allows lines that price identically), and the
      // order payload still sends one productId + quantity, so the offer engine sees exactly
      // what it saw before. Offer-bundle lines are excluded by the rule itself.
      const incoming = cartLineIdentity(product, modifiers, notes, selectedOption, selectedRecipeAlternatives);
      const mergeTarget = cart.find((item) => canMergeCartLines(existingCartLineIdentity(item), incoming));

      if (mergeTarget) {
        setCart((prev) =>
          prev.map((item) =>
            item.cartId === mergeTarget.cartId
              ? {
                  ...item,
                  quantity: item.quantity + safeQuantity,
                  totalPrice: unitPrice * (item.quantity + safeQuantity),
                }
              : item,
          ),
        );
      } else {
        const newItem: TakeawayCartItem = {
          cartId: generateUUID(),
          product,
          selectedModifiers: selectedOption ? [] : modifiers,
          selectedOption: selectedOption ?? null,
          selectedRecipeAlternatives: selectedOption ? [] : (selectedRecipeAlternatives ?? []),
          quantity: safeQuantity,
          totalPrice: unitPrice * safeQuantity,
          notes: notes || undefined,
          isComplimentary: false,
          offerLineOfferId: null,
        };
        setCart((prev) => [...prev, newItem]);
      }
    }
    setIsModalOpen(false);
    setSelectedProduct(null);
    setEditingOrderContext(null);
  };

  /**
   * A barcode scan or a typed code, arriving from the search box on Enter.
   *
   * Exactly one match and nothing to ask the cashier -> straight into the cart through the
   * same handler the product dialog calls, so pricing, offers and stock rules are identical
   * to a mouse click. One match that needs an option/modifier/alternative -> the normal
   * dialog opens, because a barcode that matched the parent product is not permission to
   * choose a variant. Several matches -> the search box is left showing them so the cashier
   * picks. No match -> say so, and never create or substitute a product.
   */
  const handleCodeSubmit = useCallback(
    (result: CodeMatchResult, term: string) => {
      if (result.kind === "none") {
        toast.error(locale === "ar" ? `لم يتم العثور على منتج: ${term}` : `Product not found: ${term}`);
        return;
      }
      if (result.kind === "ambiguous") {
        toast.warning(
          locale === "ar"
            ? `${result.matches.length} منتجات مطابقة — اختر المنتج المطلوب`
            : `${result.matches.length} products match — pick the right one`,
        );
        return;
      }

      const product = result.matches[0];
      if (productRequiresChoice(product)) {
        handleProductClick(product);
        return;
      }
      if (!product.isAvailableNow) {
        toast.warning(locale === "ar" ? "هذا المنتج غير متاح حاليًا" : "This product is not available right now");
        return;
      }
      if (activeOrder && isOrderLocked(activeOrder.status)) {
        toast.error(locale === "ar" ? "لا يمكن إضافة عناصر إلى طلب مدفوع" : "Cannot add items to a paid order");
        return;
      }
      void handleAddProductToCart(product, [], 1, "");
    },
    // handleAddProductToCart is re-created every render, so this callback is too. That is
    // deliberate: capturing the first render's copy would leave a scan acting on stale cart
    // and edit state.
    [activeOrder, handleAddProductToCart, handleProductClick, isOrderLocked, locale],
  );
  const handleOfferSelect = (offer: OfferResponseDto) => {
    if (!offer.isAvailableNow) {
      toast.warning(locale === "ar" ? "هذا العرض غير متاح حاليًا" : "This offer is not available right now");
      return;
    }

    if (activeOrder && isOrderLocked(activeOrder.status)) {
      toast.error(locale === "ar" ? "لا يمكن إضافة عناصر إلى طلب مدفوع" : "Cannot add items to a paid order");
      return;
    }

    const allocatedLines = allocateOfferLines(offer, products);
    if (allocatedLines.length === 0) {
      toast.error(locale === "ar" ? "لا يمكن تحميل منتجات العرض" : "Could not load offer products");
      return;
    }

    const defaultMods: Record<string, CartItemModifier[]> = {};
    allocatedLines.forEach((line) => {
      defaultMods[line.product.id] = line.product.modifierGroups.flatMap((g) =>
        g.modifiers.filter((m) => m.isDefault && m.isActive !== false).map((m) => ({
          id: m.id, name: m.name, nameAr: m.nameAr, displayName: m.displayName,
          priceAdjustment: m.priceAdjustment, pricingType: m.pricingType, isFree: m.isFree, freeQuantityLimit: m.freeQuantityLimit, maxQuantity: m.maxQuantity, isDefault: m.isDefault, isActive: m.isActive, quantity: 1, recipeItems: m.recipeItems,
        }))
      );
    });

    setPendingOffer(offer);
    setPendingOfferNote("");
    setPendingOfferQty(1);
    setPendingOfferLines(allocatedLines);
    setPendingOfferModifiers(defaultMods);
  };

  const handleConfirmOfferAdd = () => {
    if (!pendingOffer) return;
    setCart((prev) => [
      ...prev,
      ...pendingOfferLines.map((line) => ({
        cartId: generateUUID(),
        product: line.product,
        selectedModifiers: pendingOfferModifiers[line.product.id] ?? [],
        quantity: line.quantity * pendingOfferQty,
        totalPrice: (line.product.discountedPrice ?? line.product.basePrice) * line.quantity * pendingOfferQty,
        notes: undefined,
        isComplimentary: false,
        offerLineOfferId: pendingOffer.id,
        offerLineName: pendingOffer.name,
        offerLineNameAr: pendingOffer.nameAr,
      })),
    ]);
    setOfferId(pendingOffer.id);
    setOfferName(pendingOffer.name);
    setNewOfferNote(pendingOfferNote.trim() || null);
    setLocalOfferQty(pendingOfferQty);
    toast.success(locale === "ar"
      ? `تم إضافة العرض: ${pendingOffer.nameAr || pendingOffer.name}`
      : `Offer added: ${pendingOffer.name || pendingOffer.nameAr}`);
    setPendingOffer(null);
    setPendingOfferNote("");
    setPendingOfferQty(1);
    setPendingOfferLines([]);
    setPendingOfferModifiers({});
  };

  const handleEditOrderItem = (order: OrderDto, item: any) => {
    if (isOrderLocked(order?.status)) {
      toast.error("This order is already closed.");
      return;
    }
    if (item.itemStatus === ITEM_STATUS.READY) {
      toast.error("Cannot edit a ready item.");
      return;
    }
    const matchedProduct = products.find((p) => p.id === item.productId);
    if (!matchedProduct) {
      toast.error("Product not found in menu");
      return;
    }
    setSelectedProduct(matchedProduct);
    setModalInitialQuantity(item.quantity);
    setModalInitialNotes(item.notes ?? "");
    const modIds = (item.modifiers || []).map((m: any) => {
      const found = matchedProduct.modifierGroups
        ?.flatMap((g: any) => g.modifiers || [])
        .find((mod: any) => mod.name === m.modifierName);
      return found?.id;
    }).filter(Boolean);
    const modQuantities: Record<string, number> = {};
    for (const m of (item.modifiers || [])) {
      const found = matchedProduct.modifierGroups
        ?.flatMap((g: any) => g.modifiers || [])
        .find((mod: any) => mod.name === m.modifierName);
      if (found && m.quantity > 1) modQuantities[found.id] = m.quantity;
    }
    setModalInitialModifierIds(modIds);
    setModalInitialModifierQuantities(modQuantities);
    setModalActionLabel(t("updateItem"));
    setEditingOrderContext({ orderId: order.id, orderItemId: item.id, isComplimentary: item.isComplimentary ?? false });
    setIsModalOpen(true);
  };

  const handleRemoveOffer = async (order: OrderDto, offerLineId?: number | null) => {
    if (!order?.id) return;
    if (!confirm(locale === "ar" ? "هل تريد إزالة هذا العرض من الطلب؟" : "Remove this offer from the order?")) return;
    setDeletingOffer(true);
    try {
      const result = offerLineId != null
        ? await removeOfferLineFromOrder(order.id, offerLineId)
        : await removeOfferFromOrder(order.id);
      if (!result) {
        toast.error(locale === "ar" ? "فشل حذف العرض" : "Failed to remove offer");
        return;
      }
      await loadTakeawayOrders();
      toast.success(locale === "ar" ? "تم إزالة العرض" : "Offer removed");
    } catch {
      toast.error(locale === "ar" ? "خطأ في إزالة العرض" : "Error removing offer");
    } finally {
      setDeletingOffer(false);
    }
  };

  const handleSaveOfferNote = async (order: OrderDto) => {
    if (!order?.id) return;
    setSavingOfferNote(true);
    try {
      const result = await updateOrderOfferNote(order.id, offerNoteValue);
      if (!result) {
        toast.error(locale === "ar" ? "فشل حفظ الملاحظة" : "Failed to save note");
        return;
      }
      await loadTakeawayOrders();
      setOfferNoteEditing(false);
      toast.success(locale === "ar" ? "تم حفظ الملاحظة" : "Note saved");
    } catch {
      toast.error(locale === "ar" ? "خطأ في حفظ الملاحظة" : "Error saving note");
    } finally {
      setSavingOfferNote(false);
    }
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const removeOfferFromCart = (targetOfferId: number) => {
    setCart((prev) => prev.filter((item) => item.offerLineOfferId !== targetOfferId));
  };

  const [editingCartId, setEditingCartId] = useState<string | null>(null);

  const handleEditCartItem = (item: TakeawayCartItem) => {
    setSelectedProduct(item.product);
    setModalInitialQuantity(item.quantity);
    setModalInitialNotes(item.notes ?? "");
    const modIds = item.selectedModifiers.map((m) => m.id).filter(Boolean);
    const modQuantities: Record<string, number> = {};
    for (const m of item.selectedModifiers) {
      if (m.quantity > 1) modQuantities[m.id] = m.quantity;
    }
    setModalInitialModifierIds(modIds);
    setModalInitialModifierQuantities(modQuantities);
    setModalActionLabel(t("updateItem"));
    setEditingOrderContext(null);
    setEditingCartId(item.cartId);
    setIsModalOpen(true);
  };

  const toggleComplimentary = (cartId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartId === cartId ? { ...item, isComplimentary: !item.isComplimentary } : item
      )
    );
  };

  const toggleOfferComplimentary = (targetOfferId: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.offerLineOfferId === targetOfferId ? { ...item, isComplimentary: !item.isComplimentary } : item
      )
    );
  };

  const startNewTakeawayOrder = () => {
    setActiveOrder(null);
    setCart([]);
    setSelectedDiscountGroup(null);
    setServiceChargeRate(0);
    setTaxRate(0);
    setOfferId(null);
    setOfferName(null);
    setNewOfferNote(null);
    setLocalOfferQty(1);
    setCustomerPhone("");
    setFulfillmentMode("Takeaway");
    setSelectedDeliveryZoneId("");
    setDeliveryZoneSearch("");
    setDeliveryZoneDropdownOpen(false);
    setDeliveryAddress("");
    setDeliveryNotes("");
    setDeliveryFeeAcknowledged(false);
  };

  const buildTakeawayOrderItems = () =>
    cart.map((item) => {
      const linePrice = resolveTakeawayBaseLinePrice(
        item.product,
        item.selectedOption,
        item.selectedRecipeAlternatives,
      );

      return {
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: linePrice,
        notes: item.notes ?? "",
        isComplimentary: item.isComplimentary,
        offerLineId: item.offerLineOfferId ?? null,
        offerLineName: item.offerLineName ?? null,
        offerLineNameAr: item.offerLineNameAr ?? null,
        selectedOptionId: item.selectedOption?.id ?? null,
        selectedRecipeAlternatives: item.selectedOption ? [] : (item.selectedRecipeAlternatives ?? []),
        modifiers: item.selectedOption
          ? []
          : item.selectedModifiers.map((m) => ({
              modifierId: m.id,
              modifierName: m.name,
              modifierNameAr: m.nameAr,
              price: resolveTakeawayModifierUnitPrice(item.product, m),
              quantity: m.quantity || 1,
            })),
      };
    });

  const buildTakeawayDraftCheckout = (): DraftTakeawayCheckout => {
    const distinctOfferIds = Array.from(
      new Set(cart.map((item) => item.offerLineOfferId).filter((id): id is number => id != null))
    );
    const singleOfferId = distinctOfferIds.length === 1 ? distinctOfferIds[0] : null;
    const items = buildTakeawayOrderItems();
    const displayHints = buildDisplayHintsFromCart(cart);
    const orderInput: OrderCreateDto = {
      tenantId: user?.tenantId || config.tenantId || undefined,
      clientOrderUUID: generateClientOrderUUID(),
      tableId: null as any,
      tableName: channelTableName,
      orderType: channelOrderType,
      discountPercentage: 0,
      discountGroupId: selectedDiscountGroup?.id ?? null,
      serviceChargeRate,
      taxRate,
      offerId: singleOfferId,
      offerNote: newOfferNote,
      offerQty: localOfferQty,
      customerPhone: customerPhone.trim(),
      deliveryZoneId: isDeliveryMode ? selectedDeliveryZone?.id ?? null : null,
      deliveryZoneName: isDeliveryMode && selectedDeliveryZone ? getDeliveryZoneName(selectedDeliveryZone, locale === "ar") : null,
      deliveryFee: isDeliveryMode ? deliveryFeeAmount : null,
      deliveryCost: isDeliveryMode && selectedDeliveryZone
        ? Number(selectedDeliveryZone.deliveryCost.toFixed(2))
        : null,
      deliveryPaymentMode: isDeliveryMode && selectedDeliveryZone ? getDeliveryPaymentModeName(selectedDeliveryZone.paymentMode) : null,
      deliveryAddress: isDeliveryMode ? deliveryAddress.trim() || null : null,
      deliveryNotes: isDeliveryMode ? deliveryNotes.trim() || null : null,
      deliveryFeeOverride: null,
      items,
    };
    const selectedOffer = singleOfferId != null ? offers.find((offer) => offer.id === singleOfferId) ?? null : null;
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        (item.isComplimentary
          ? 0
          : (item.price + (item.modifiers ?? []).reduce((modifierSum, modifier) => modifierSum + (modifier.price ?? 0) * (modifier.quantity ?? 1), 0)) * item.quantity),
      0
    );
    // Affiliation group discount preview (no manual discount on takeaway create, so it
    // applies directly to subtotal). Backend re-resolves the authoritative value at creation.
    const groupDiscountType = selectedDiscountGroup?.discountType ?? 0;
    const groupDiscountValue = selectedDiscountGroup?.discountValue ?? 0;
    const groupDiscountAmount = computeGroupDiscountAmount(subtotal, groupDiscountType, groupDiscountValue);
    const afterDiscount = subtotal - groupDiscountAmount;
    const serviceChargeAmount = afterDiscount * (serviceChargeRate / 100);
    const taxAmount = (afterDiscount + serviceChargeAmount) * (taxRate / 100);
    const totalAmount = afterDiscount + serviceChargeAmount + taxAmount + deliveryFeeAmount;
    const previewItems = items.map((item, index) => {
      const hint = displayHints[index];
      const modifierTotal = (item.modifiers ?? []).reduce(
        (sum, modifier) => sum + (modifier.price ?? 0) * (modifier.quantity ?? 1),
        0
      );

      return {
        id: `draft-item-${index}`,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotalAmount: item.isComplimentary ? 0 : (item.price + modifierTotal) * item.quantity,
        notes: item.notes,
        isComplimentary: item.isComplimentary ?? false,
        itemStatus: ITEM_STATUS.PREPARING,
        isNewlyAdded: false,
        modifiers: item.modifiers ?? [],
        selectedOptionName: hint?.selectedOptionName ?? null,
        selectedOptionNameAr: hint?.selectedOptionNameAr ?? null,
        recipeSnapshot: hint?.recipeSnapshot ?? [],
      };
    });
    const previewOrder: OrderDto = {
      id: `draft-takeaway-${Date.now()}`,
      orderNumber: `DRAFT-${Date.now().toString().slice(-6)}`,
      ticketId: 0,
      tableName: channelTableName,
      orderType: fulfillmentMode,
      orderSource: "Pos",
      offerId: selectedOffer?.id ?? orderInput.offerId ?? null,
      offerName: selectedOffer?.name ?? null,
      offerNameAr: selectedOffer?.nameAr ?? null,
      offerNote: orderInput.offerNote ?? null,
      offerProducts: (selectedOffer?.products ?? []).map<OrderOfferProductDto>((product) => ({
        productId: product.productId,
        name: product.name,
        nameAr: product.nameAr,
        quantity: product.quantity,
      })),
      isPaid: false,
      subtotal,
      discountPercentage: 0,
      discountAmount: 0,
      discountGroupId: selectedDiscountGroup?.id ?? null,
      discountGroupName: selectedDiscountGroup?.name ?? null,
      discountGroupType: groupDiscountType,
      discountGroupValue: groupDiscountValue,
      discountGroupAmount: groupDiscountAmount,
      serviceChargeRate,
      serviceChargeAmount,
      taxRate,
      taxAmount,
      totalAmount,
      deliveryZoneId: orderInput.deliveryZoneId,
      deliveryZoneName: orderInput.deliveryZoneName,
      deliveryFee: orderInput.deliveryFee,
      deliveryCost: orderInput.deliveryCost,
      deliveryPaymentMode: orderInput.deliveryPaymentMode,
      deliveryAddress: orderInput.deliveryAddress,
      deliveryNotes: orderInput.deliveryNotes,
      status: "Draft",
      paymentStatus: ORDER_PAYMENT_STATUS.PENDING,
      paidAmount: 0,
      remainingAmount: totalAmount,
      customerPhone: orderInput.customerPhone,
      items: previewItems,
      createdAt: new Date().toISOString(),
    };

    return {
      orderInput,
      displayHints,
      previewOrder,
    };
  };

  const submitTakeawayOrder = async () => {
    if (cart.length === 0) return;
    if (!validateFulfillment({ requireDeliveryZone: true })) return;
    setIsOrdering(true);

    const { orderInput, displayHints } = buildTakeawayDraftCheckout();
    const singleOfferId = orderInput.offerId ?? null;
    const items = orderInput.items;

    if (activeOrder && !isOrderLocked(activeOrder.status)) {
      // Add items to existing takeaway order
      const updatedOrder = await addItemsToOrder(activeOrder.id, items);
      if (updatedOrder) {
        // Legacy Order.OfferId supports one offer only; set it only when exactly one offer exists in this batch.
        if (singleOfferId != null) {
          await setOrderOffer(activeOrder.id, singleOfferId, newOfferNote, localOfferQty);
        }
        setCart([]);
        setSelectedDiscountGroup(null);
        setOfferId(null);
        setOfferName(null);
        setNewOfferNote(null);
        setLocalOfferQty(1);
        await loadTakeawayOrders();
        setActiveOrder(updatedOrder);
        toast.success("Items added to takeaway order!");
      } else {
        toast.error("Failed to add items");
      }
    } else {
      let result: OrderDto | null = null;
      try {
        result = await createOrderSmart(orderInput, createTakeawayOrder, displayHints);
      } catch (err) {
        // 4xx from the server (validation, auth, conflict) — surface to the
        // cashier instead of silently enqueueing a payload that will fail on
        // every replay.
        if (err instanceof OrderCreateClientError || err instanceof OfflineOrderValidationError) {
          toast.error(err.message);
          setIsOrdering(false);
          return;
        }
        throw err;
      }
      if (result) {
        setCart([]);
        setSelectedDiscountGroup(null);
        setOfferId(null);
        setOfferName(null);
        setNewOfferNote(null);
        setLocalOfferQty(1);
        // FIX(bug-1): Inject the new order into the list synchronously.
        // loadTakeawayOrders reads /orders/takeaway/active which is served
        // from the stale reference cache offline, so the new offline order
        // used to appear only after the snapshot subscriber eventually fired.
        // Prepending it here guarantees it's visible the moment the user
        // hits Create Order.
        setTakeawayOrders((prev) => {
          if (prev.some((o) => o.id === result.id)) return prev;
          return [result, ...prev];
        });
        // FIX(bug-1): Skip the server reload for offline-created orders.
        // `loadTakeawayOrders` offline just re-reads the stale cached list,
        // and a timing race between its hydrateFromCache call and the
        // snapshot subscriber can drop the freshly-written offline order
        // from state. The reactive effect on offlineSnapshots/pendingActions
        // keeps the list in sync once the subscriber catches up.
        if (!isOfflineOrderId(result.id)) {
          await loadTakeawayOrders();
          // The sale moved stock, so the shelf figures on the product cards are now one
          // order out of date. Re-pull the catalogue (the store's own freshness gate would
          // otherwise reuse the list for the whole session).
          void fetchProducts({ force: true });
        }
        setActiveOrder(result);
        toast.success(
          isOfflineOrderId(result.id)
            ? (locale === "ar" ? "تم حفظ الطلب محليًا — سيُرسل عند استعادة الاتصال" : "Order saved offline — will sync when back online")
            : (locale === "ar" ? "تم إنشاء الطلب" : "Order created")
        );
      } else {
        toast.error(locale === "ar" ? "تعذر إنشاء الطلب" : "Failed to create order");
      }
    }
    setIsOrdering(false);
  };
  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    await submitTakeawayOrder();
  };

  const initializePaymentDiscount = (order: OrderDto) => {
    setPaymentDiscountType(
      order.discountType ?? (order.discountPercentage > 0 ? "Percentage" : null)
    );
    setPaymentDiscountValue(order.discountValue ?? order.discountPercentage ?? 0);
  };

  const handleCollectPayment = async () => {
    if (cart.length === 0) return;
    if (!validateFulfillment()) return;
    const draftCheckout = buildTakeawayDraftCheckout();
    setPendingDraftCheckout(draftCheckout);
    initializePaymentDiscount(draftCheckout.previewOrder);
    setPaymentModalOrder(draftCheckout.previewOrder);
    setDeliveryFeeAcknowledged(false);
    setApplyVoucher(false);
    setIsPaymentModalOpen(true);
  };

  const isDraftPaymentModal =
    !!pendingDraftCheckout && paymentModalOrder?.id === pendingDraftCheckout.previewOrder.id;

  const resetPaymentModalFields = () => {
    setCashTendered("");
    setPaymentAmount("");
    setPendingMethod(null);
    setPaymentReferenceNumber("");
    setApplyVoucher(false);
    setDeliveryFeeAcknowledged(false);
    setPaymentDiscountType(null);
    setPaymentDiscountValue(0);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentModalOrder(null);
    setPendingDraftCheckout(null);
    resetPaymentModalFields();
  };

  const upsertTakeawayOrder = (order: OrderDto) => {
    setTakeawayOrders((prev) => {
      const exists = prev.some((candidate) => candidate.id === order.id);
      if (!exists) {
        return [order, ...prev];
      }

      return prev.map((candidate) => (candidate.id === order.id ? order : candidate));
    });
    cacheServerOrders([order]);
  };

  const handleCheckoutTakeaway = async (orderId: string) => {
    const orderForPrint = takeawayOrders.find((o) => o.id === orderId) ?? activeOrder;
    const receiptWindow = settings?.autoPrintReceipt ? openReceiptPrintWindow() : null;
    // Offline path: queue the full-cash payment instead of calling the API.
    if (getConnectivityState() !== "online" || isOfflineOrderId(orderId)) {
      const total = orderForPrint?.remainingAmount ?? orderForPrint?.totalAmount ?? 0;
      await enqueuePaymentOffline(orderId, { amount: total, paymentMethod: "Cash" });
      if (activeOrder?.id === orderId) setActiveOrder(null);
      await loadTakeawayOrders();
      toast.success(locale === "ar" ? "تم تسجيل الدفعة محليًا" : "Payment saved offline");
      if (orderForPrint && settings?.autoPrintReceipt) {
        printReceipt({
          order: { ...orderForPrint, paymentMethod: "Cash" },
          settings, logoUrl, businessName, products, currency,
          storeServiceChargeRate, storeTaxRate, targetWindow: receiptWindow,
        });
      }
      return;
    }
    const clientActionId = await generateActionId();
    try {
      await payOrderStrict(orderId, "Cash", undefined, undefined, undefined, undefined, undefined, clientActionId);
      if (activeOrder?.id === orderId) setActiveOrder(null);
      await loadTakeawayOrders();
      toast.success("Takeaway order paid!");
      if (orderForPrint && settings?.autoPrintReceipt) {
        printReceipt({
          order: { ...orderForPrint, paymentMethod: "Cash" },
          settings,
          logoUrl,
          businessName,
          products,
          currency,
          storeServiceChargeRate,
          storeTaxRate,
          targetWindow: receiptWindow,
        });
      }
    } catch (error) {
      if (!isNetworkRequestError(error)) {
        if (receiptWindow && !receiptWindow.closed) receiptWindow.close();
        toast.error(getRequestErrorMessage(error, "Failed to checkout order"));
        return;
      }
      const total = orderForPrint?.remainingAmount ?? orderForPrint?.totalAmount ?? 0;
      await enqueuePaymentOffline(orderId, {
        amount: total,
        paymentMethod: "Cash",
        clientActionId,
      });
      if (activeOrder?.id === orderId) setActiveOrder(null);
      await loadTakeawayOrders();
      toast.success(locale === "ar" ? "تم تسجيل الدفعة محليًا" : "Payment queued for synchronization");
      if (orderForPrint && settings?.autoPrintReceipt) {
        printReceipt({
          order: { ...orderForPrint, paymentMethod: "Cash" },
          settings, logoUrl, businessName, products, currency,
          storeServiceChargeRate, storeTaxRate, targetWindow: receiptWindow,
        });
      }
    }
  };

  const handleTakeawayPayment = async (method: string) => {
    if (!paymentModalOrder) return;
    if (!pmIsPaymentAmountValid) {
      toast.error(locale === "ar" ? "أدخل مبلغ دفع صحيحًا" : "Enter a valid payment amount");
      return;
    }
    if (paymentDiscountType === "Percentage" && paymentDiscountValue > 100) {
      toast.error(locale === "ar" ? "نسبة الخصم لا يمكن أن تتجاوز 100%" : "Discount percentage cannot exceed 100%");
      return;
    }
    if (paymentDiscountType === "FixedAmount" && paymentDiscountValue > pmSubtotal) {
      toast.error(locale === "ar" ? "الخصم لا يمكن أن يتجاوز المجموع الفرعي" : "Discount cannot exceed the subtotal");
      return;
    }
    if (method === "Cash" && !pmCashValid) {
      toast.error(locale === "ar" ? "المبلغ النقدي يجب أن يغطي مبلغ الدفعة" : "Cash received must cover the payment amount");
      return;
    }
    const isCardPayment = method !== "Cash";
    if (isCardPayment && !selectedNonCashMethod) {
      toast.error(locale === "ar" ? "اختر طريقة الدفع" : "Select a payment method");
      return;
    }
    const paymentReference = isCardPayment ? paymentReferenceNumber.trim() : undefined;
    if (isCardPayment && selectedNonCashMethod?.requiresReferenceNumber && !paymentReference) {
      toast.error(locale === "ar" ? "أدخل رقم المرجع" : "Enter the reference number");
      return;
    }
    if (paymentModalOrder.orderType === "Delivery" && !paymentModalOrder.customerPhone?.trim()) {
      toast.error(locale === "ar" ? "رقم هاتف العميل مطلوب للتوصيل" : "Customer phone is required for delivery");
      return;
    }
    if (paymentModalOrder.orderType === "Delivery" && !paymentModalOrder.deliveryZoneId) {
      toast.error(locale === "ar" ? "اختر منطقة التوصيل" : "Select a delivery area");
      return;
    }
    if (pmNeedsDeliveryFeeConfirmation && !deliveryFeeAcknowledged) {
      toast.error(locale === "ar" ? "أكد إبلاغ العميل برسوم التوصيل" : "Confirm the customer was informed about the delivery fee");
      return;
    }
    const effectiveTaxRate = (paymentModalOrder.taxRate ?? 0) > 0 ? paymentModalOrder.taxRate! : storeTaxRate;
    const effectiveServiceRate = (paymentModalOrder.serviceChargeRate ?? 0) > 0 ? paymentModalOrder.serviceChargeRate! : storeServiceChargeRate;
    const phone    = paymentModalOrder.customerPhone?.trim() || undefined;
    const paymentMethodName = isCardPayment
      ? getPaymentMethodName(selectedNonCashMethod, locale)
      : method;
    const tendered = method === "Cash" && pmTenderedNum > 0 ? pmTenderedNum : undefined;
    const change   = tendered != null ? pmCashChange : undefined;
    const willBeFullyPaid = pmRemaining - pmPaymentAmountNum <= 0.001;
    const voucherDiscountForPayment = pmVoucherRequested ? pmVoucherDiscount : 0;
    const receiptWindow = willBeFullyPaid ? openReceiptPrintWindow() : null;
    const paymentClientActionId = await generateActionId();
    const paymentPayload = {
      amount: pmPaymentAmountNum,
      paymentMethod: method,
      paymentMethodId: selectedNonCashMethod?.id,
      paymentMethodName: selectedNonCashMethod?.nameEn,
      paymentMethodNameAr: selectedNonCashMethod?.nameAr,
      paymentMethodCode: selectedNonCashMethod?.code,
      referenceNumber: paymentReference,
      serviceChargeRate: effectiveServiceRate,
      taxRate: effectiveTaxRate,
      customerPhone: phone,
      amountTendered: tendered,
      applyVoucher: pmVoucherRequested,
      voucherDiscountAmount: voucherDiscountForPayment,
      discount: pmDiscountChange,
      clientActionId: paymentClientActionId,
    };

    if (isDraftPaymentModal && pendingDraftCheckout) {
      setIsPayingOrder(true);

      const optimisticDraftAfterPayment = {
        ...applyPaymentToOrder(pendingDraftCheckout.previewOrder, {
          amount: pmPaymentAmountNum,
          method,
          paymentMethodId: selectedNonCashMethod?.id,
          paymentMethodName: selectedNonCashMethod?.nameEn,
          paymentMethodNameAr: selectedNonCashMethod?.nameAr,
          paymentMethodCode: selectedNonCashMethod?.code,
          referenceNumber: paymentReference,
          amountTendered: tendered,
          applyVoucher: pmVoucherRequested,
          voucherDiscountAmount: voucherDiscountForPayment,
          serviceChargeRate: effectiveServiceRate,
          taxRate: effectiveTaxRate,
          discount: pmDiscountChange,
        }),
        status: willBeFullyPaid ? "Paid" : pendingDraftCheckout.previewOrder.status,
      } as OrderDto;

      let finalizedOrder: OrderDto | null = null;
      let paymentQueued = false;

      // Full + explicitly-offline → keep the existing atomic create-paid path
      // (single offline queue entry that replays as create+full-pay). Partial
      // offline must split create from pay so the queued payment carries the
      // actual amount. "degraded" connectivity (health-ping flaky but API may
      // still work) falls through to the online-first createOrderSmart branch
      // below — only navigator.onLine === false short-circuits to atomic offline.
      if (willBeFullyPaid && getConnectivityState() === "offline") {
        finalizedOrder = await createPaidOrderOffline(
          pendingDraftCheckout.orderInput,
          paymentPayload,
          pendingDraftCheckout.displayHints
        );
        paymentQueued = true;
        if (pmVoucherRequested) {
          setVoucherAvailability(consumeVoucherLocally(settings.timeZoneId));
        }
      } else {
        let createdOrder: OrderDto | null = null;
        try {
          createdOrder = await createOrderSmart(
            pendingDraftCheckout.orderInput,
            createTakeawayOrder,
            pendingDraftCheckout.displayHints
          );
        } catch (err) {
          // 4xx (validation / auth / conflict) — abort the payment flow,
          // toast the cashier, and leave the cart intact so they can fix it.
          if (err instanceof OrderCreateClientError || err instanceof OfflineOrderValidationError) {
            toast.error(err.message);
            setIsPayingOrder(false);
            return;
          }
          throw err;
        }
        if (!createdOrder) {
          // Create failed entirely (online error, not offline fallback).
        } else if (isOfflineOrderId(createdOrder.id)) {
          // Order created offline — queue the payment offline with the right
          // expectedOrderState so partial vs full state survives replay.
          await enqueuePaymentOffline(createdOrder.id, paymentPayload, {
            paidAmount: pmPaymentAmountNum,
            isPaid: willBeFullyPaid,
          });
          if (pmVoucherRequested) {
            setVoucherAvailability(consumeVoucherLocally(settings.timeZoneId));
          }
          finalizedOrder = {
            ...optimisticDraftAfterPayment,
            ...createdOrder,
            paidAmount: pmPaymentAmountNum,
            remainingAmount: Math.max(0, pmRemaining - pmPaymentAmountNum),
            isPaid: willBeFullyPaid,
            payments: optimisticDraftAfterPayment.payments,
            status: willBeFullyPaid ? "Paid" : createdOrder.status,
          };
          paymentQueued = true;
        } else {
          let result = null as Awaited<ReturnType<typeof addOrderPayment>>;
          try {
            result = await addOrderPayment({
              orderId: createdOrder.id,
              amount: pmPaymentAmountNum,
              method,
              paymentMethodId: selectedNonCashMethod?.id,
              referenceNumber: paymentReference,
              serviceChargeRate: effectiveServiceRate,
              taxRate: effectiveTaxRate,
              customerPhone: phone,
              amountTendered: tendered,
              applyVoucher: pmVoucherRequested,
              discount: pmDiscountChange,
              clientActionId: paymentClientActionId,
            });
          } catch (error) {
            if (!isNetworkRequestError(error)) {
              if (receiptWindow && !receiptWindow.closed) receiptWindow.close();
              setIsPayingOrder(false);
              upsertTakeawayOrder(createdOrder);
              setCart([]);
              setSelectedDiscountGroup(null);
              setOfferId(null);
              setOfferName(null);
              setNewOfferNote(null);
              setLocalOfferQty(1);
              setActiveOrder(createdOrder);
              setPendingDraftCheckout(null);
              setPaymentModalOrder(createdOrder);
              setPaymentAmount((createdOrder.remainingAmount ?? createdOrder.totalAmount).toFixed(2));
              toast.error(getRequestErrorMessage(error, "Order created, but payment was rejected"));
              return;
            }
            await enqueuePaymentOffline(createdOrder.id, paymentPayload, {
              paidAmount: pmPaymentAmountNum,
              isPaid: willBeFullyPaid,
            });
            if (pmVoucherRequested) {
              setVoucherAvailability(consumeVoucherLocally(settings.timeZoneId));
            }
            finalizedOrder = {
              ...optimisticDraftAfterPayment,
              ...createdOrder,
              paidAmount: pmPaymentAmountNum,
              remainingAmount: Math.max(0, pmRemaining - pmPaymentAmountNum),
              isPaid: willBeFullyPaid,
              payments: optimisticDraftAfterPayment.payments,
              status: willBeFullyPaid ? "Paid" : createdOrder.status,
            };
            paymentQueued = true;
          }

          if (result) {
            if (typeof result.voucherRemainingToday === "number") {
              const dailyLimit = voucherAvailability?.dailyLimit ?? result.voucherRemainingToday + 1;
              const nextAvailability = {
                enabled: voucherAvailability?.enabled ?? true,
                voucherAmount: voucherAvailability?.voucherAmount ?? voucherDiscountForPayment,
                dailyLimit,
                usedToday: Math.max(0, dailyLimit - result.voucherRemainingToday),
                remainingToday: result.voucherRemainingToday,
                businessDate: voucherAvailability?.businessDate ?? getRestaurantToday(settings.timeZoneId),
              };
              setVoucherAvailability(nextAvailability);
              saveVoucherAvailability(nextAvailability);
            }
            finalizedOrder = {
              ...createdOrder,
              totalAmount: result.totalAmount,
              paidAmount: result.paidAmount,
              remainingAmount: result.remainingAmount,
              paymentStatus: result.paymentStatus,
              isPaid: result.isPaid,
              paymentMethod: result.paymentMethod,
              amountTendered: result.amountTendered,
              changeAmount: result.changeAmount,
              isVoucherApplied: result.isVoucherApplied,
              voucherDiscountAmount: result.voucherDiscountAmount,
              voucherAppliedAt: result.voucherAppliedAt,
              discountType: result.discountType,
              discountValue: result.discountValue,
              discountAmount: result.discountAmount ?? 0,
              discountAppliedByName: result.discountAppliedByName,
              discountAppliedAt: result.discountAppliedAt,
              payments: result.payments,
              status: result.isPaid ? "Paid" : createdOrder.status,
            };
            await loadTakeawayOrders();
          } else if (!finalizedOrder) {
            // Online create succeeded but online pay failed → queue partial/full pay offline.
            await enqueuePaymentOffline(createdOrder.id, paymentPayload, {
              paidAmount: pmPaymentAmountNum,
              isPaid: willBeFullyPaid,
            });
            if (pmVoucherRequested) {
              setVoucherAvailability(consumeVoucherLocally(settings.timeZoneId));
            }
            finalizedOrder = {
              ...optimisticDraftAfterPayment,
              ...createdOrder,
              id: createdOrder.id,
              orderNumber: createdOrder.orderNumber,
              ticketId: createdOrder.ticketId,
              createdAt: createdOrder.createdAt,
              paidAmount: pmPaymentAmountNum,
              remainingAmount: Math.max(0, pmRemaining - pmPaymentAmountNum),
              isPaid: willBeFullyPaid,
              payments: optimisticDraftAfterPayment.payments,
              status: willBeFullyPaid ? "Paid" : createdOrder.status,
            };
            paymentQueued = true;
          }
        }
      }

      setIsPayingOrder(false);

      if (!finalizedOrder) {
        if (receiptWindow && !receiptWindow.closed) {
          receiptWindow.close();
        }
        toast.error(locale === "ar" ? "فشل في إتمام الدفع" : "Failed to complete payment");
        return;
      }

      upsertTakeawayOrder(finalizedOrder);
      if (willBeFullyPaid) {
        startNewTakeawayOrder();
        closePaymentModal();
      } else {
        // Partial: order is now persisted — clear the cart but keep it as the
        // active order so the user can collect the rest from the saved-order flow.
        setCart([]);
        setSelectedDiscountGroup(null);
        setOfferId(null);
        setOfferName(null);
        setNewOfferNote(null);
        setLocalOfferQty(1);
        setActiveOrder(finalizedOrder);
        setPendingDraftCheckout(null);
        setPaymentModalOrder(finalizedOrder);
        setPaymentAmount(Math.max(0, pmRemaining - pmPaymentAmountNum).toFixed(2));
        setCashTendered("");
        setPendingMethod(null);
        setPaymentReferenceNumber("");
      }
      toast.success(
        paymentQueued
          ? (locale === "ar" ? "تم حفظ الطلب والدفع محليًا" : "Order and payment saved locally")
          : (locale === "ar" ? `تم استلام الدفعة (${paymentMethodName})` : `Payment received (${paymentMethodName})`)
      );
      if (willBeFullyPaid) {
        printReceipt({
          order: finalizedOrder,
          settings,
          logoUrl,
          businessName,
          products,
          currency,
          storeServiceChargeRate,
          storeTaxRate,
          customerPhone: phone,
          amountTendered: tendered,
          changeAmount: change,
          targetWindow: receiptWindow,
        });
      }
      return;
    }

    const orderId = paymentModalOrder.id;
    const previousOrder = paymentModalOrder;
    const optimisticOrder = applyPaymentToOrder(paymentModalOrder, {
      amount: pmPaymentAmountNum,
      method,
      paymentMethodId: selectedNonCashMethod?.id,
      paymentMethodName: selectedNonCashMethod?.nameEn,
      paymentMethodNameAr: selectedNonCashMethod?.nameAr,
      paymentMethodCode: selectedNonCashMethod?.code,
      referenceNumber: paymentReference,
      amountTendered: tendered,
      applyVoucher: pmVoucherRequested,
      voucherDiscountAmount: voucherDiscountForPayment,
      serviceChargeRate: effectiveServiceRate,
      taxRate: effectiveTaxRate,
      discount: pmDiscountChange,
    });
    setTakeawayOrders((prev) => prev.map((o) => o.id === orderId
      ? applyPaymentToOrder(o, {
        amount: pmPaymentAmountNum,
        method,
        paymentMethodId: selectedNonCashMethod?.id,
        paymentMethodName: selectedNonCashMethod?.nameEn,
        paymentMethodNameAr: selectedNonCashMethod?.nameAr,
        paymentMethodCode: selectedNonCashMethod?.code,
        referenceNumber: paymentReference,
        amountTendered: tendered,
        applyVoucher: pmVoucherRequested,
        voucherDiscountAmount: voucherDiscountForPayment,
        serviceChargeRate: effectiveServiceRate,
        taxRate: effectiveTaxRate,
        discount: pmDiscountChange,
      })
      : o));
    setPaymentModalOrder(optimisticOrder);
    if (activeOrder?.id === orderId) {
      setActiveOrder(willBeFullyPaid ? null : optimisticOrder);
    }
    resetPaymentModalFields();
    const nextRemaining = Math.max(0, Math.round((pmPayableTotal - pmPaidAmount - pmPaymentAmountNum) * 100) / 100);
    setPaymentAmount(willBeFullyPaid ? "" : nextRemaining.toFixed(2));
    if (willBeFullyPaid) setIsPaymentModalOpen(false);

    setIsPayingOrder(true);
    let paymentQueued = getConnectivityState() === "offline" || isOfflineOrderId(orderId);
    let result = null as Awaited<ReturnType<typeof addOrderPayment>>;
    if (paymentQueued) {
      await enqueuePaymentOffline(orderId, paymentPayload);
    } else {
      try {
        result = await addOrderPayment({
          orderId,
          amount: pmPaymentAmountNum,
          method,
          paymentMethodId: selectedNonCashMethod?.id,
          referenceNumber: paymentReference,
          serviceChargeRate: effectiveServiceRate,
          taxRate: effectiveTaxRate,
          customerPhone: phone,
          amountTendered: tendered,
          applyVoucher: pmVoucherRequested,
          discount: pmDiscountChange,
          clientActionId: paymentClientActionId,
        });
      } catch (error) {
        if (!isNetworkRequestError(error)) {
          if (receiptWindow && !receiptWindow.closed) receiptWindow.close();
          setTakeawayOrders((prev) => prev.map((order) => order.id === orderId ? previousOrder : order));
          setPaymentModalOrder(previousOrder);
          if (activeOrder?.id === orderId) setActiveOrder(previousOrder);
          if (willBeFullyPaid) setIsPaymentModalOpen(true);
          setPaymentAmount(pmRemaining.toFixed(2));
          setIsPayingOrder(false);
          toast.error(getRequestErrorMessage(error, "Payment was rejected"));
          return;
        }
        await enqueuePaymentOffline(orderId, paymentPayload);
        paymentQueued = true;
      }
      if (!result && !paymentQueued) {
        await enqueuePaymentOffline(orderId, paymentPayload);
        paymentQueued = true;
      }
    }
    setIsPayingOrder(false);
    if (paymentQueued) {
      if (pmVoucherRequested) {
        setVoucherAvailability(consumeVoucherLocally(settings.timeZoneId));
      }
      toast.success(
        locale === "ar"
          ? "تم حفظ الدفعة محليًا للمزامنة"
          : "Payment queued for synchronization"
      );
      if (willBeFullyPaid) {
        printReceipt({
          order: optimisticOrder,
          settings,
          logoUrl,
          businessName,
          products,
          currency,
          storeServiceChargeRate,
          storeTaxRate,
          customerPhone: phone,
          amountTendered: tendered,
          changeAmount: change,
          targetWindow: receiptWindow,
        });
      }
      return;
    }

    if (result) {
      if (typeof result.voucherRemainingToday === "number") {
        const dailyLimit = voucherAvailability?.dailyLimit ?? result.voucherRemainingToday + 1;
        const nextAvailability = {
          enabled: voucherAvailability?.enabled ?? true,
          voucherAmount: voucherAvailability?.voucherAmount ?? voucherDiscountForPayment,
          dailyLimit,
          usedToday: Math.max(0, dailyLimit - result.voucherRemainingToday),
          remainingToday: result.voucherRemainingToday,
          businessDate: voucherAvailability?.businessDate ?? getRestaurantToday(settings.timeZoneId),
        };
        setVoucherAvailability(nextAvailability);
        saveVoucherAvailability(nextAvailability);
      }
      const persistedOrder: OrderDto = {
        ...optimisticOrder,
        totalAmount: result.totalAmount,
        paidAmount: result.paidAmount,
        remainingAmount: result.remainingAmount,
        paymentStatus: result.paymentStatus,
        isPaid: result.isPaid,
        paymentMethod: result.paymentMethod,
        amountTendered: result.amountTendered,
        changeAmount: result.changeAmount,
        isVoucherApplied: result.isVoucherApplied,
        voucherDiscountAmount: result.voucherDiscountAmount,
        voucherAppliedAt: result.voucherAppliedAt,
        discountType: result.discountType,
        discountValue: result.discountValue,
        discountAmount: result.discountAmount ?? 0,
        discountAppliedByName: result.discountAppliedByName,
        discountAppliedAt: result.discountAppliedAt,
        payments: result.payments,
        status: result.isPaid ? "Paid" : optimisticOrder.status,
      };
      setTakeawayOrders((prev) => prev.map((o) => o.id === orderId ? persistedOrder : o));
      setPaymentModalOrder((prev) => prev && prev.id === orderId ? persistedOrder : prev);
      if (activeOrder?.id === orderId) {
        setActiveOrder(willBeFullyPaid ? null : persistedOrder);
      }
      await loadTakeawayOrders();
      toast.success(
        willBeFullyPaid
          ? (locale === "ar" ? `تم استلام الدفعة (${paymentMethodName})` : `Payment received (${paymentMethodName})`)
          : (locale === "ar" ? `تم حفظ دفعة جزئية (${paymentMethodName})` : `Partial payment saved (${paymentMethodName})`)
      );
      if (willBeFullyPaid) {
        printReceipt({
          order: persistedOrder,
          settings,
          logoUrl,
          businessName,
          products,
          currency,
          storeServiceChargeRate,
          storeTaxRate,
          customerPhone: phone,
          amountTendered: tendered,
          changeAmount: change,
          targetWindow: receiptWindow,
        });
      }
      return;
    }

    const refreshedOrders = await loadTakeawayOrders();
    const persistedPaidOrder = refreshedOrders.find((o) => o.id === orderId && o.status === "Paid") ?? null;
    if (persistedPaidOrder) {
      setPaymentModalOrder(persistedPaidOrder);
      if (activeOrder?.id === orderId) setActiveOrder(persistedPaidOrder);
      toast.warning("Payment was saved, but the confirmation response failed. Data was refreshed.");
      if (willBeFullyPaid) {
        printReceipt({
          order: persistedPaidOrder,
          settings,
          logoUrl,
          businessName,
          products,
          currency,
          storeServiceChargeRate,
          storeTaxRate,
          customerPhone: phone,
          amountTendered: tendered,
          changeAmount: change,
          targetWindow: receiptWindow,
        });
      }
    } else {
      if (receiptWindow && !receiptWindow.closed) receiptWindow.close();
      toast.error("Failed to checkout order");
      if (willBeFullyPaid) setIsPaymentModalOpen(true);
    }
  };

  // Cart calculations
  const subTotal = cart.reduce((sum, item) => sum + (item.isComplimentary ? 0 : item.totalPrice), 0);

  // Filtered orders list
  // FIX(issue-1): The list is derived from THREE inputs, not just the local
  // `takeawayOrders` state — the useOfflineCashierStore snapshots slice is the
  // shared source of truth that every screen (cashier, takeaway, table) reads.
  // Folding it in here guarantees an offline-created takeaway order appears
  // instantly in the Active list the moment its snapshot hits IDB, with no
  // refresh and no race against loadTakeawayOrders.
  //
  // FIX(bug-1): Completed (picked up) and Cancelled orders are terminal and
  // must never appear here. Offline snapshots can contain them (e.g.
  // mark-pickup applied locally), so we filter in the render path rather than
  // relying on the upstream fetch.
  const mergedTakeawayOrders = useMemo(() => {
    const byId = new Map<string, OrderDto>();
    for (const o of takeawayOrders) byId.set(o.id, o);
    for (const o of offlineSnapshots) {
      if (!isTakeawayBoardOrder(o)) continue;
      byId.set(o.id, o); // snapshot wins — it carries the latest local mutation
    }
    return applyPendingOverlay(Array.from(byId.values()), pendingActions);
  }, [takeawayOrders, offlineSnapshots, pendingActions]);

  const eligibleTakeawayOrders = mergedTakeawayOrders
    .filter((o) => o.status !== "Completed" && o.status !== "Cancelled")
    .filter((o) => isPaidOrder(o))
    .filter((o) => orderStatusFilter === "All" || o.status === orderStatusFilter);
  const filteredTakeawayOrders = eligibleTakeawayOrders
    .filter((order) => matchesTakeawaySearch(order, orderSearch));

  // Payment modal computed values
  const pmEffServiceRate = paymentModalOrder
    ? ((paymentModalOrder.serviceChargeRate ?? 0) > 0 ? paymentModalOrder.serviceChargeRate! : storeServiceChargeRate)
    : storeServiceChargeRate;
  const pmEffTaxRate = paymentModalOrder
    ? ((paymentModalOrder.taxRate ?? 0) > 0 ? paymentModalOrder.taxRate! : storeTaxRate)
    : storeTaxRate;
  const pmSubtotal = (paymentModalOrder?.subtotal && paymentModalOrder.subtotal > 0)
    ? paymentModalOrder.subtotal
    : (paymentModalOrder?.items?.reduce((s, i) => s + (i.lineTotalAmount ?? 0), 0) ?? 0);
  const pmDiscountGroupType = paymentModalOrder?.discountGroupType ?? 0;
  const pmDiscountGroupValue = paymentModalOrder?.discountGroupValue ?? 0;
  const pmDiscountGroupName = paymentModalOrder?.discountGroupName ?? "";
  // The group discount is snapshotted at order creation (not editable at payment), so reproduce
  // the stored amount exactly as a fixed value — robust even if type/value are absent on the DTO.
  const pmStoredGroupDiscountAmount = paymentModalOrder?.discountGroupAmount ?? 0;
  const pmDiscountTotals = calculateOrderDiscountTotals(
    pmSubtotal,
    paymentDiscountType,
    paymentDiscountValue,
    pmEffServiceRate,
    pmEffTaxRate,
    pmStoredGroupDiscountAmount,
    1, // FixedAmount — treat the snapshotted amount as a flat value
  );
  const pmDiscount = pmDiscountTotals.discountAmount;
  const pmGroupDiscount = pmDiscountTotals.discountGroupAmount;
  const groupedPaymentModalOrder = paymentModalOrder
    ? splitOrderItemsForOfferDisplay(paymentModalOrder)
    : null;
  const paymentModalOfferDisplayName = paymentModalOrder
    ? (locale === "ar"
      ? (paymentModalOrder.offerNameAr || paymentModalOrder.offerName || "")
      : (paymentModalOrder.offerName || paymentModalOrder.offerNameAr || ""))
    : "";
  const paymentModalOfferContentsSummary = paymentModalOrder
    ? buildOfferContentsSummary(paymentModalOrder.offerProducts || [], locale)
    : "";
  const pmServiceAmount = pmDiscountTotals.serviceChargeAmount;
  const pmTaxAmount = pmDiscountTotals.taxAmount;
  const pmBaseTotal = pmDiscountTotals.totalAmount;
  const pmDeliveryFee = Math.max(0, paymentModalOrder?.deliveryFee ?? 0);
  const pmTotal = Math.round((pmBaseTotal + pmDeliveryFee) * 100) / 100;
  const pmNeedsDeliveryFeeConfirmation =
    paymentModalOrder?.orderType === "Delivery" && !isPaidOrder(paymentModalOrder);
  const pmNeedsDeliveryZone =
    pmNeedsDeliveryFeeConfirmation && !paymentModalOrder?.deliveryZoneId;
  const pmCanEditDeliveryDetails = isDraftPaymentModal && pmNeedsDeliveryFeeConfirmation;
  // ── Payment amount, tendered / change, breakdown ────────────
  const pmPaidAmount = paymentModalOrder ? getOrderPaidAmount(paymentModalOrder) : 0;
  const pmPaymentBreakdown = paymentModalOrder ? getPaymentBreakdown(paymentModalOrder) : [];
  const pmDiscountEligible = paymentModalOrder?.orderSource !== "Talabat" &&
    paymentModalOrder?.orderSource !== "DeliveryPartner" &&
    paymentModalOrder?.orderType === "Takeaway";
  const pmCanEditDiscount = pmDiscountEligible &&
    pmPaidAmount <= 0.001 &&
    pmPaymentBreakdown.length === 0;
  const pmDiscountChange = paymentModalOrder
    ? buildDiscountChange(paymentModalOrder, paymentDiscountType, paymentDiscountValue)
    : undefined;
  const pmVoucherAlreadyApplied = paymentModalOrder?.isVoucherApplied === true;
  const pmCanApplyVoucher = !!paymentModalOrder &&
    !pmVoucherAlreadyApplied &&
    pmPaidAmount <= 0.001 &&
    pmPaymentBreakdown.length === 0 &&
    voucherAvailability?.enabled === true &&
    (voucherAvailability?.remainingToday ?? 0) > 0;
  const pmCanRequestCancel = !isDraftPaymentModal && canRequestTakeawayOrderCancel(paymentModalOrder);
  const pmVoucherDisabledReason = pmVoucherAlreadyApplied
    ? (locale === "ar" ? "تم تطبيق القسيمة على هذا الطلب" : "Voucher already applied to this order")
    : pmPaidAmount > 0.001 || pmPaymentBreakdown.length > 0
      ? (locale === "ar" ? "القسيمة متاحة قبل بدء الدفع فقط" : "Voucher is available before payment starts only")
      : !voucherAvailability
        ? (locale === "ar" ? "تعذر تحميل حالة القسيمة" : "Voucher availability unavailable")
      : voucherAvailability?.enabled === false
        ? (locale === "ar" ? "القسيمة غير مفعلة" : "Voucher is disabled")
      : (voucherAvailability?.remainingToday ?? 0) <= 0
        ? (locale === "ar" ? "تم الوصول إلى الحد اليومي للقسائم" : "Daily voucher limit reached")
        : undefined;
  const pmVoucherRequested = applyVoucher && pmCanApplyVoucher;
  const pmLiveVoucherDiscount = calculateVoucherDiscount(pmTotal, voucherAvailability, pmVoucherRequested);
  const pmVoucherDiscount = pmVoucherAlreadyApplied
    ? paymentModalOrder?.voucherDiscountAmount ?? 0
    : pmLiveVoucherDiscount;
  const pmPayableTotal = calculateFinalTotalAfterVoucher(pmTotal, pmVoucherDiscount);
  const pmPaymentAmountNum = parseFloat(paymentAmount) || 0;
  const pmRemaining  = Math.max(0, Math.round((pmPayableTotal - pmPaidAmount) * 100) / 100);
  const pmZeroVoucherPayment = pmVoucherRequested && pmRemaining <= 0.001;
  const pmIsPaymentAmountValid = pmZeroVoucherPayment
    ? pmPaymentAmountNum === 0
    : pmPaymentAmountNum > 0 && pmPaymentAmountNum <= pmRemaining + 0.001;
  const pmTenderedNum = parseFloat(cashTendered) || 0;
  const pmCashChange  = Math.max(0, pmTenderedNum - pmPaymentAmountNum);
  const pmCashValid   = pendingMethod !== "Cash" || (pmIsPaymentAmountValid && pmTenderedNum >= pmPaymentAmountNum);

  // Prefill the payment-amount input with the post-tax remaining due.
  // Depends on pmTotal/pmPaidAmount so it re-syncs if storeTaxRate loads after the modal opens
  // — otherwise the input would stay stuck on the pre-tax figure captured at first render.
  // Declared here (after pm* derivations) to avoid a TDZ reference during render.
  useEffect(() => {
    if (!isPaymentModalOpen || !paymentModalOrder) return;
    setPaymentAmount(pmRemaining > 0 ? pmRemaining.toFixed(2) : pmZeroVoucherPayment ? "0.00" : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentModalOpen, paymentModalOrder?.id, pmRemaining, pmZeroVoucherPayment, isDraftPaymentModal]);

  useEffect(() => {
    if (applyVoucher && !pmCanApplyVoucher) {
      setApplyVoucher(false);
    }
  }, [applyVoucher, pmCanApplyVoucher]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 xl:h-screen xl:overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 min-h-0 flex-col xl:flex-row xl:overflow-hidden">
        {/* LEFT SIDE: Product Grid (70%) */}
        <div className="w-full min-h-0 p-4 sm:p-6 xl:w-[68%] xl:overflow-y-auto">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button 
              variant="ghost" 
              className="gap-2" 
              onClick={() => router.push(fromCashier ? "/ntxcashierpos" : getDefaultRouteForRole(user?.role))}
            >
              <ArrowLeft className="rtl:-scale-x-100 w-4 h-4" /> 
              {fromCashier ? t("backToCashier") || "Back to Cashier" : (locale === "ar" ? "رجوع" : "Back")}
            </Button>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800 sm:text-3xl">
              {isDeliveryMode ? <Truck className="h-7 w-7 text-primary" /> : <ShoppingBag className="h-7 w-7 text-primary" />}
              {channelOrderLabel}
            </h1>
            <Button className="sm:ms-auto" onClick={startNewTakeawayOrder}>
              {t("newTakeawayOrder")}
            </Button>
          </div>

          <ProductSelectionPanel
            products={products}
            offers={offers}
            currency={currency}
            disabled={!!activeOrder && isOrderLocked(activeOrder.status)}
            onProductSelect={handleProductClick}
            onProductQuickView={handleQuickViewProduct}
            onSelectOffer={handleOfferSelect}
            onCodeSubmit={handleCodeSubmit}
            autoFocusSearch
          />
        </div>

        {/* RIGHT SIDE: Cart & Orders (30%) */}
        <div className="w-full border-t bg-white xl:w-[32%] xl:border-t-0 xl:border-s xl:flex xl:flex-col xl:overflow-hidden">
          {/* Active Takeaway Orders */}
          {eligibleTakeawayOrders.length > 0 && (
            <div className="max-h-64 overflow-y-auto border-b bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-primary">{locale === "ar" ? "طلبات السفري والتوصيل" : "Active Takeaway & Delivery"}</h3>
              </div>
              <div className="relative mb-2">
                <input
                  type="search"
                  maxLength={TAKEAWAY_SEARCH_MAX_LENGTH}
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder={locale === "ar" ? "ابحث بالطلب أو العميل أو الهاتف" : "Search order, customer, or phone"}
                  aria-label={locale === "ar" ? "بحث الطلبات" : "Search orders"}
                  className="w-full ps-8 pe-9 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                />
                <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                {orderSearch && (
                  <button
                    type="button"
                    onClick={() => setOrderSearch("")}
                    aria-label={locale === "ar" ? "مسح البحث" : "Clear search"}
                    className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {/* Status Filter Tabs */}
              {/* <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                {["All", "New", "Preparing", "Ready", "Paid"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOrderStatusFilter(filter)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                      orderStatusFilter === filter
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {filter === "All" ? "All" : filter === "Paid" ? t("statusPaid") : filter === "Ready" ? t("statusReady") : filter === "New" ? t("statusNew") : filter}
                    {" "}<span className="opacity-70">({filter === "All" ? takeawayOrders.length : takeawayOrders.filter((o) => o.status === filter).length})</span>
                  </button>
                ))}
              </div> */}
              {filteredTakeawayOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  {locale === "ar" ? "لا توجد طلبات مطابقة" : "No matching orders"}
                </p>
              ) : filteredTakeawayOrders.map((order) => (
                <div
                  key={order.id}
                  className={`flex items-center justify-between p-2 rounded-lg mb-1 cursor-pointer transition-colors ${
                    activeOrder?.id === order.id ? "bg-primary/20 ring-2 ring-primary" : "bg-white hover:bg-primary/10"
                  }`}
                  onClick={() => {
                    const nextOrder = activeOrder?.id === order.id ? null : order;
                    setActiveOrder(nextOrder);
                    if (nextOrder) setFulfillmentMode(nextOrder.orderType === "Delivery" ? "Delivery" : "Takeaway");
                  }}
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-700">{getOrderDisplayNumber(order)}</span>
                    <span className={`ms-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      order.status === ITEM_STATUS.READY ? "bg-success/10 text-success" : isPaidOrder(order) ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
                    }`}>
                      {order.status === ITEM_STATUS.READY ? t("statusReady") : order.status === "New" ? t("statusNew") : isPaidOrder(order) ? t("statusPaid") : order.status}
                    </span>
                    {order.customerPhone && (
                      <div className="text-[10px] text-slate-500 mt-0.5">📞 {order.customerPhone}</div>
                    )}
                    {order.orderType === "Delivery" && (
                      <div className="mt-0.5 text-[10px] font-semibold text-primary">
                        {locale === "ar" ? "توصيل" : "Delivery"}{order.deliveryZoneName ? ` · ${order.deliveryZoneName}` : ""}
                      </div>
                    )}
                    {(order.discountGroupAmount ?? 0) > 0 && (
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-rose-600">
                        <Tag className="h-2.5 w-2.5" />
                        {order.discountGroupName || t("discountGroup")} −{formatCurrency(order.discountGroupAmount ?? 0, currency)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(order.totalAmount, currency)}</span>
                    {isPaidOrder(order) ? (
                      <>
                        <PrintReceiptButton order={order} size="icon" iconOnly className="h-6 w-6" />
                        {canRequestTakeawayOrderCancel(order) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title={t("cancelOrderButton")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelOrderData(order);
                            }}
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    ) : order.status === "Completed" ? (
                      <>
                        <PrintReceiptButton order={order} size="icon" iconOnly className="h-6 w-6" />
                      </>
                    ) : (
                      <>
                        {(order.items?.length ?? 0) > 0 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDraftCheckout(null);
                              initializePaymentDiscount(order);
                              setPaymentModalOrder(order);
                              setDeliveryFeeAcknowledged(false);
                              setApplyVoucher(false);
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            <Banknote className="h-3 w-3" />
                          </Button>
                        )}
                        {LEGACY_REFUND_UI_ENABLED && order.status === "Preparing" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                            title={t("refundOrderButton")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRefundOrderData(order);
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show active order items if selected */}
          {activeOrder && (
            <div className="border-b bg-slate-50 p-4 xl:flex-1 xl:overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-700">{t("orderLabel")} {getOrderDisplayNumber(activeOrder)}</h3>
                  {activeOrder.customerPhone && (
                    <p className="text-xs text-slate-500 mt-0.5">📞 {activeOrder.customerPhone}</p>
                  )}
                  {activeOrder.orderType === "Delivery" && (
                    <p className="mt-0.5 text-xs font-semibold text-primary">
                      {locale === "ar" ? "توصيل" : "Delivery"}{activeOrder.deliveryZoneName ? ` · ${activeOrder.deliveryZoneName}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <ul className="space-y-2">
                {(() => {
                  const groupedOrder = splitOrderItemsForOfferDisplay(activeOrder);
                  const offerDisplayName = locale === "ar"
                    ? (activeOrder.offerNameAr || activeOrder.offerName || "")
                    : (activeOrder.offerName || activeOrder.offerNameAr || "");
                  const offerContentsSummary = buildOfferContentsSummary(activeOrder.offerProducts || [], locale);

                  return (
                    <>
                {groupedOrder.offerBundles.length > 0 ? (
                  groupedOrder.offerBundles.map((bundle, bundleIdx) => {
                    const bundleContentsSummary = buildOfferContentsSummary(bundle.bundledOfferProducts || [], locale);
                    const bundleDisplayName = bundle.productName || (locale === "ar" ? "عرض" : "Offer");
                    return (
                      <li key={`active-bundle-${bundleIdx}`} className="flex items-start justify-between rounded border border-amber-200 bg-amber-50/80 p-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-amber-600 shrink-0" />
                            <span className="text-sm font-semibold text-amber-900">
                              {locale === "ar" ? "عرض" : "Offer"}: {bundleDisplayName}
                            </span>
                          </div>
                          {bundleContentsSummary && (
                            <div className="mt-1 text-xs text-amber-700/80">{bundleContentsSummary}</div>
                          )}
                          {bundleIdx === 0 && activeOrder.offerNote && (
                            <div className="mt-0.5 text-xs italic text-amber-700/70">📝 {activeOrder.offerNote}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ms-2 shrink-0">
                          <span className="text-sm font-bold text-amber-900">
                            {formatCurrency(bundle.lineTotalAmount ?? 0, currency)}
                          </span>
                          {!isOrderLocked(activeOrder.status) && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-amber-700 hover:bg-amber-200/60"
                                title={locale === "ar" ? "تعديل ملاحظة العرض" : "Add note"}
                                onClick={() => {
                                  setOfferNoteValue(activeOrder.offerNote ?? "");
                                  setOfferNoteEditing(true);
                                }}
                              >
                                <span className="text-xs">✏️</span>
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                title={locale === "ar" ? "حذف العرض" : "Remove offer"}
                                disabled={deletingOffer}
                                onClick={() => handleRemoveOffer(activeOrder, bundle.offerLineId ?? null)}
                              >
                                <Ban className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })
                ) : (
                  !!activeOrder.offerId && (
                    <li className="flex items-start justify-between rounded border border-amber-200 bg-amber-50/80 p-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="text-sm font-semibold text-amber-900">
                            {locale === "ar" ? "عرض" : "Offer"}: {offerDisplayName}
                          </span>
                        </div>
                        {offerContentsSummary && (
                          <div className="mt-1 text-xs text-amber-700/80">{offerContentsSummary}</div>
                        )}
                        {activeOrder.offerNote && (
                          <div className="mt-0.5 text-xs italic text-amber-700/70">📝 {activeOrder.offerNote}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ms-2 shrink-0">
                        <span className="text-sm font-bold text-amber-900">
                          {groupedOrder.offerCoveredTotal > 0 ? formatCurrency(groupedOrder.offerCoveredTotal, currency) : ""}
                        </span>
                        {!isOrderLocked(activeOrder.status) && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-amber-700 hover:bg-amber-200/60"
                              title={locale === "ar" ? "تعديل ملاحظة العرض" : "Add note"}
                              onClick={() => {
                                setOfferNoteValue(activeOrder.offerNote ?? "");
                                setOfferNoteEditing(true);
                              }}
                            >
                              <span className="text-xs">✏️</span>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              title={locale === "ar" ? "حذف العرض" : "Remove offer"}
                              disabled={deletingOffer}
                              onClick={() => handleRemoveOffer(activeOrder)}
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                )}
                {groupedOrder.regularItems.map((item: any) => (
                  <li key={item.id} className="flex items-start justify-between p-2 rounded bg-white border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{item.quantity}x {getItemDisplayName(item)}</span>
                        {item.isComplimentary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent-foreground font-bold">{t("freeLabel")}</span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          item.itemStatus === ITEM_STATUS.READY ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}>
                          {item.itemStatus === ITEM_STATUS.READY ? t("statusReady") : item.itemStatus === "New" ? t("statusNew") : item.itemStatus}
                        </span>
                      </div>
                      {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                      {item.selectedOptionName && (
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {locale === 'ar' ? 'النوع' : 'Variant'}: {locale === 'ar' && item.selectedOptionNameAr ? item.selectedOptionNameAr : item.selectedOptionName}
                        </div>
                      )}
                      {(item.modifiers || []).map((m: any, i: number) => (
                        <div key={i} className="text-xs text-primary">+ {locale === 'ar' && m.modifierNameAr ? m.modifierNameAr : m.modifierName}</div>
                      ))}
                      {(item.recipeSnapshot || []).filter((r: any) => r.sourceAlternativeId).map((r: any, i: number) => (
                        <div key={`swap-${i}`} className="text-xs text-amber-700">
                          ↪ {locale === 'ar' && (r.sourceAlternativeNameAr || r.rawMaterialNameAr) ? (r.sourceAlternativeNameAr || r.rawMaterialNameAr) : (r.sourceAlternativeName || r.rawMaterialName)}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 ms-2">
                      <span className="text-sm font-bold text-slate-700">
                        {formatCurrency(item.lineTotalAmount ?? 0, currency)}
                      </span>
                      {!isOrderLocked(activeOrder.status) && item.itemStatus !== ITEM_STATUS.READY && (
                        <button
                          onClick={() => handleEditOrderItem(activeOrder, item)}
                          className="px-1 text-xs text-primary hover:text-primary/80"
                        >
                          {t("edit")}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                    </>
                  );
                })()}
              </ul>
              <div className="mt-3 pt-2 border-t flex items-center justify-between gap-2">
                <span className="text-lg font-bold text-slate-800">{formatCurrency(activeOrder.totalAmount, currency)}</span>
                <div className="flex items-center gap-2">
                  {isPaidOrder(activeOrder) ? (
                    <>
                      <PrintReceiptButton order={activeOrder} size="sm" />
                      {canRequestTakeawayOrderCancel(activeOrder) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1"
                          onClick={() => setCancelOrderData(activeOrder)}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          {t("cancelOrderButton")}
                        </Button>
                      )}
                    </>
                  ) : activeOrder.status === "Completed" ? (
                    <PrintReceiptButton order={activeOrder} size="sm" />
                  ) : LEGACY_REFUND_UI_ENABLED && activeOrder.status === "Preparing" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-1"
                      onClick={() => setRefundOrderData(activeOrder)}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t("refundOrderButton")}
                    </Button>
                  ) : (activeOrder.items?.length ?? 0) > 0 ? (
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground font-bold gap-1 hover:bg-primary/90"
                      onClick={() => {
                        setPendingDraftCheckout(null);
                        initializePaymentDiscount(activeOrder);
                        setPaymentModalOrder(activeOrder);
                        setDeliveryFeeAcknowledged(false);
                        setApplyVoucher(false);
                        setIsPaymentModalOpen(true);
                      }}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Pay {formatCurrency(activeOrder.totalAmount, currency)}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* New Cart Items */}
          <div className="p-4 xl:flex-1 xl:overflow-y-auto">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              {activeOrder ? t("addMoreItems") : t("newTakeawayOrder")}
            </h3>
            {cart.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">{t("tapToStart")}</p>
            ) : (
              <ul className="space-y-2">
                {cartOfferDisplay.offerGroups.map((group) => {
                  const groupOffer = offers.find((o) => o.id === group.offerId);
                  const groupOfferName = locale === "ar"
                    ? (groupOffer?.nameAr || groupOffer?.name || group.items[0]?.offerLineNameAr || group.items[0]?.offerLineName || "Offer")
                    : (groupOffer?.name || groupOffer?.nameAr || group.items[0]?.offerLineName || "Offer");
                  const groupContentsSummary = group.items
                    .map((item) => {
                      const name = locale === "ar"
                        ? (item.product.nameAr || item.product.name)
                        : (item.product.displayName || item.product.name);
                      return `${item.quantity}× ${name}`;
                    })
                    .join(" • ");
                  return (
                    <li key={group.offerId} className={`flex items-start justify-between rounded border p-2 ${group.items.some((item) => highlightedCartIds.has(item.cartId)) ? "border-amber-400 bg-amber-50" : group.items.every((item) => item.isComplimentary) ? "border-success/20 bg-success/5" : "border-amber-200 bg-amber-50/80"}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-amber-600" />
                          <span className={`text-sm font-semibold ${group.items.every((item) => item.isComplimentary) ? "text-success" : "text-amber-900"}`}>
                            {locale === "ar" ? "عرض" : "Offer"}: {groupOfferName}
                          </span>
                          {group.items.every((item) => item.isComplimentary) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent-foreground font-bold">{t("freeLabel")}</span>
                          )}
                        </div>
                        {groupContentsSummary && (
                          <div className="mt-1 text-xs text-amber-700/80">{groupContentsSummary}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ms-2">
                        <span className="text-sm font-bold text-slate-700">
                          {group.items.every((item) => item.isComplimentary)
                            ? t("freeLabel")
                            : formatCurrency(group.offerTotal, currency)}
                        </span>
                        <button
                          onClick={() => toggleOfferComplimentary(group.offerId)}
                          className="p-0.5 text-primary/70 hover:text-primary"
                          title="Toggle complimentary"
                        >
                          <Gift className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeOfferFromCart(group.offerId)}
                          className="text-destructive hover:text-destructive p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </li>
                  );
                })}
                {cartOfferDisplay.regularItems.map((item) => (
                  <li key={item.cartId} className={`flex items-start justify-between rounded border p-2 ${highlightedCartIds.has(item.cartId) ? "border-amber-400 bg-amber-50" : "bg-slate-50"}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {item.quantity}x {locale === 'ar' && item.product.nameAr ? item.product.nameAr : (item.product.displayName || item.product.name)}
                        </span>
                        {item.isComplimentary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent-foreground font-bold">{t("freeLabel")}</span>
                        )}
                      </div>
                      {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                      {item.selectedOption && (
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {locale === 'ar' ? 'النوع' : 'Variant'}: {locale === 'ar' && item.selectedOption.nameAr ? item.selectedOption.nameAr : item.selectedOption.name}
                        </div>
                      )}
                      {item.selectedModifiers.map((m, i) => (
                        <div key={i} className="text-xs text-primary">+ {locale === 'ar' && m.nameAr ? m.nameAr : (m.displayName || m.name)}{(m.quantity || 1) > 1 ? ` (×${m.quantity})` : ""}</div>
                      ))}
                      {(item.selectedRecipeAlternatives ?? []).map((sa, i) => {
                        const row = item.product.recipeItems?.find((r) => r.id === sa.recipeItemId);
                        const alt = row?.alternatives?.find((a) => a.id === sa.alternativeId);
                        if (!alt) return null;
                        const altName = locale === 'ar' && (alt.nameAr || alt.rawMaterialNameAr) ? (alt.nameAr || alt.rawMaterialNameAr) : (alt.name || alt.rawMaterialName);
                        return (
                          <div key={`swap-${i}`} className="text-xs text-amber-700">↪ {altName}</div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1 ms-2">
                      <span className="text-sm font-bold text-slate-700">
                        {item.isComplimentary ? t("freeLabel") : formatCurrency(item.totalPrice, currency)}
                      </span>
                      <button
                        onClick={() => handleEditCartItem(item)}
                        className="p-0.5 text-primary hover:text-primary/80"
                        title="Edit item"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => toggleComplimentary(item.cartId)}
                        className="p-0.5 text-primary/70 hover:text-primary"
                        title="Toggle complimentary"
                      >
                        <Gift className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.cartId)}
                        className="text-destructive hover:text-destructive p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className="border-t bg-white p-4">
              {cartOfferDisplay.offerGroups.length > 0 && cartOfferDisplay.regularItems.length === 0 && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {locale === "ar" ? "العرض الحالي" : "Current offers"}: {cartOfferDisplay.offerGroups.map((g) => {
                    const o = offers.find((x) => x.id === g.offerId);
                    return locale === "ar" ? (o?.nameAr || o?.name || "Offer") : (o?.name || o?.nameAr || "Offer");
                  }).join(", ")}
                </div>
              )}
              <div className="mb-3 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  disabled={!!activeOrder}
                  onClick={() => {
                    setFulfillmentMode("Takeaway");
                    setDeliveryFeeAcknowledged(false);
                  }}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-60 ${
                    !isDeliveryMode ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {t("takeaway")}
                </button>
                <button
                  type="button"
                  disabled={!!activeOrder}
                  onClick={() => {
                    setFulfillmentMode("Delivery");
                    setDeliveryFeeAcknowledged(false);
                  }}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-60 ${
                    isDeliveryMode ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  {locale === "ar" ? "توصيل" : "Delivery"}
                </button>
              </div>
              {/* Customer Phone */}
              <div className="mb-3">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {t("customerPhone") || "Customer Phone"}{isDeliveryMode ? " *" : ""}
                </label>
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📞</span>
                  <input
                    type="tel"
                    required={isDeliveryMode}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 01012345678"
                    className={`w-full ps-8 pe-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white ${isDeliveryMode && !customerPhone.trim() ? "border-primary/40" : "border-slate-200"}`}
                    maxLength={20}
                  />
                </div>
              </div>
              <DiscountGroupSelector
                value={selectedDiscountGroup}
                onChange={setSelectedDiscountGroup}
                className="mb-3"
              />
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-500 text-sm">{t("subtotal")}</span>
                <span className="font-bold text-lg text-slate-800">{formatCurrency(subTotal, currency)}</span>
              </div>
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 text-lg"
                onClick={handleCollectPayment}
                disabled={isOrdering}
              >
                {isOrdering ? t("processing") : t("collectPayment")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentModalOpen} onOpenChange={(open) => { if (open) { setIsPaymentModalOpen(true); return; } closePaymentModal(); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center text-xl">
              <span>{getOrderDisplayNumber(paymentModalOrder)} — {t("paymentLabel")}</span>
              <Badge variant="outline" className="text-lg px-3 py-1 bg-slate-100">
                {formatCurrency(pmPayableTotal, currency)}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {isDraftPaymentModal
                ? (locale === "ar" ? "سيتم إنشاء الطلب عند تأكيد الدفعة (كاملة أو جزئية). إغلاق النافذة يلغي هذا الطلب المؤقت." : "The order is created when you confirm the payment (full or partial). Closing this dialog discards the draft.")
                : (t("orderDetailsDesc") || "Select a payment method to complete this order.")}
            </DialogDescription>
          </DialogHeader>

          {paymentModalOrder?.orderType === "Delivery" && (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-slate-700">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">{locale === "ar" ? "الهاتف" : "Phone"}</span>
                <span className="font-medium text-slate-900" dir="ltr">{paymentModalOrder.customerPhone || "—"}</span>
              </div>

              {pmCanEditDeliveryDetails ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      {locale === "ar" ? "منطقة التوصيل" : "Delivery Area"}
                    </label>
                    <div className="relative" onBlur={() => setTimeout(() => setDeliveryZoneDropdownOpen(false), 120)}>
                      <MapPin className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={deliveryZoneSearch}
                        onFocus={() => setDeliveryZoneDropdownOpen(true)}
                        onChange={(event) => handleDeliveryZoneSearchChange(event.target.value)}
                        placeholder={locale === "ar" ? "ابحث عن منطقة" : "Search area"}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pe-10 ps-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setDeliveryZoneDropdownOpen((open) => !open)}
                        className="absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {deliveryZoneDropdownOpen && (
                        <div className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-30 max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                          {filteredDeliveryZones.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400">
                              {locale === "ar" ? "لا توجد مناطق فعالة" : "No active zones found"}
                            </div>
                          ) : filteredDeliveryZones.map((zone) => (
                            <button
                              key={zone.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleDeliveryZoneSelect(zone)}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-primary/5 ${
                                selectedDeliveryZoneId === zone.id ? "bg-primary/10 text-primary" : "text-slate-700"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{getDeliveryZoneName(zone, locale === "ar")}</span>
                                <span className="block truncate text-xs text-slate-400">{zone.code}</span>
                              </span>
                              <span className="shrink-0 font-mono text-xs">{formatCurrency(zone.deliveryFee, currency)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      {locale === "ar" ? "رسوم التوصيل" : "Delivery fee"}
                    </label>
                    <div className="flex min-h-10 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <span className="text-slate-500">
                        {selectedDeliveryZone
                          ? getDeliveryPaymentModeLabel(selectedDeliveryZone.paymentMode, locale === "ar")
                          : (locale === "ar" ? "اختر المنطقة أولاً" : "Select an area first")}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(pmDeliveryFee, currency)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      {locale === "ar" ? "عنوان التوصيل" : "Delivery Address"}
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(event) => handleDeliveryAddressChange(event.target.value)}
                      rows={2}
                      maxLength={500}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      {locale === "ar" ? "ملاحظات التوصيل" : "Delivery Notes"}
                    </label>
                    <textarea
                      value={deliveryNotes}
                      onChange={(event) => handleDeliveryNotesChange(event.target.value)}
                      rows={2}
                      maxLength={500}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{locale === "ar" ? "منطقة التوصيل" : "Delivery area"}</span>
                    <span className="font-medium text-slate-900">{paymentModalOrder.deliveryZoneName || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{locale === "ar" ? "رسوم التوصيل" : "Delivery fee"}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(pmDeliveryFee, currency)}</span>
                  </div>
                  {paymentModalOrder.deliveryAddress && (
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">{locale === "ar" ? "العنوان" : "Address"}</span>
                      <span className="text-end font-medium text-slate-900">{paymentModalOrder.deliveryAddress}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Order Items */}
          <div className="my-2 border rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b text-xs font-semibold text-slate-500 uppercase">
              {t("orderSummary")}
            </div>
            <ScrollArea className="h-[140px] w-full bg-white p-4">
              <div className="space-y-2">
                {groupedPaymentModalOrder?.offerBundles.length ? (
                  groupedPaymentModalOrder.offerBundles.map((bundle, bundleIdx) => {
                    const bundleContentsSummary = buildOfferContentsSummary(bundle.bundledOfferProducts || [], locale);
                    const bundleDisplayName = bundle.productName || (locale === "ar" ? "عرض" : "Offer");
                    return (
                      <div key={`pm-bundle-${bundleIdx}`} className="flex justify-between items-start gap-3 rounded-md bg-amber-50/80 px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 font-medium text-amber-900">
                            <Gift className="h-4 w-4 text-amber-600" />
                            <span>{locale === "ar" ? "عرض" : "Offer"}: {bundleDisplayName}</span>
                          </div>
                          {bundleContentsSummary && (
                            <p className="mt-1 text-xs text-amber-700/80">
                              {bundleContentsSummary}
                            </p>
                          )}
                        </div>
                        <span className="text-slate-600 font-mono text-xs font-semibold text-amber-900">
                          {formatCurrency(bundle.lineTotalAmount ?? 0, currency)}
                        </span>
                      </div>
                    );
                  })
                ) : (paymentModalOrder?.offerId && groupedPaymentModalOrder && groupedPaymentModalOrder.offerCoveredTotal > 0 && (
                  <div className="flex justify-between items-start gap-3 rounded-md bg-amber-50/80 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-medium text-amber-900">
                        <Gift className="h-4 w-4 text-amber-600" />
                        <span>{locale === "ar" ? "عرض" : "Offer"}: {paymentModalOfferDisplayName}</span>
                      </div>
                      {paymentModalOfferContentsSummary && (
                        <p className="mt-1 text-xs text-amber-700/80">
                          {paymentModalOfferContentsSummary}
                        </p>
                      )}
                    </div>
                    <span className="text-slate-600 font-mono text-xs font-semibold text-amber-900">
                      {formatCurrency(groupedPaymentModalOrder.offerCoveredTotal, currency)}
                    </span>
                  </div>
                ))}
                {(groupedPaymentModalOrder?.regularItems ?? paymentModalOrder?.items ?? []).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start text-sm">
                    <div>
                      <span className="font-medium text-slate-700">
                        {item.quantity}x {getItemDisplayName(item)}
                        {item.isComplimentary && (
                          <span className="ms-1 text-xs text-success font-normal">({t("complimentary")})</span>
                        )}
                      </span>
                      {item.selectedOptionName && (
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {locale === 'ar' ? 'النوع' : 'Variant'}: {locale === 'ar' && item.selectedOptionNameAr ? item.selectedOptionNameAr : item.selectedOptionName}
                        </div>
                      )}
                      {(item.modifiers?.length ?? 0) > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.modifiers?.map((m: any) => locale === 'ar' && m.modifierNameAr ? m.modifierNameAr : m.modifierName).join(', ')}
                        </p>
                      )}
                      {(item.recipeSnapshot || []).filter((r: any) => r.sourceAlternativeId).map((r: any, i: number) => (
                        <div key={`swap-${i}`} className="text-xs text-amber-700 mt-0.5">
                          ↪ {locale === 'ar' && (r.sourceAlternativeNameAr || r.rawMaterialNameAr) ? (r.sourceAlternativeNameAr || r.rawMaterialNameAr) : (r.sourceAlternativeName || r.rawMaterialName)}
                        </div>
                      ))}
                    </div>
                    <span className="text-slate-600 font-mono text-xs">
                      {item.lineTotalAmount != null ? formatCurrency(item.lineTotalAmount, currency) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {pmDiscountEligible && (
            <DiscountControls
              locale={locale}
              canEdit={pmCanEditDiscount}
              type={paymentDiscountType}
              value={paymentDiscountValue}
              currency={currency}
              onTypeChange={setPaymentDiscountType}
              onValueChange={setPaymentDiscountValue}
              onRemove={() => {
                setPaymentDiscountType(null);
                setPaymentDiscountValue(0);
              }}
            />
          )}

          {/* Price Breakdown */}
          <div className="space-y-1.5 px-1 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>{t("subtotal")}</span>
              <span>{formatCurrency(pmSubtotal, currency)}</span>
            </div>
            {pmDiscount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>
                  {t("discount")} ({paymentDiscountType === "Percentage" ? `${paymentDiscountValue}%` : formatCurrency(paymentDiscountValue, currency)})
                </span>
                <span>-{formatCurrency(pmDiscount, currency)}</span>
              </div>
            )}
            {pmGroupDiscount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>
                  {pmDiscountGroupName || t("discountGroup")}{pmDiscountGroupType === 0 && pmDiscountGroupValue > 0 ? ` (${pmDiscountGroupValue}%)` : ""}
                </span>
                <span>-{formatCurrency(pmGroupDiscount, currency)}</span>
              </div>
            )}
            {pmEffServiceRate > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>{t("serviceChargeLabel")} ({pmEffServiceRate}%)</span>
                <span>{formatCurrency(pmServiceAmount, currency)}</span>
              </div>
            )}
            {pmEffTaxRate > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>{t("taxLabel")} ({pmEffTaxRate}%)</span>
                <span>{formatCurrency(pmTaxAmount, currency)}</span>
              </div>
            )}
            {pmDeliveryFee > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>{locale === "ar" ? "رسوم التوصيل" : "Delivery fee"}</span>
                <span>{formatCurrency(pmDeliveryFee, currency)}</span>
              </div>
            )}
            {pmVoucherDiscount > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>{locale === "ar" ? "القسيمة" : "Voucher"}</span>
                <span>-{formatCurrency(pmVoucherDiscount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold">
              <span className="text-base text-slate-800">{t("totalDue")}</span>
              <span className="text-2xl text-slate-900">{formatCurrency(pmPayableTotal, currency)}</span>
            </div>
          </div>

          {/* Total / Paid / Remaining strip — matches cashier layout */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {locale === "ar" ? "الإجمالي" : "Total"}
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {formatCurrency(pmPayableTotal, currency)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {locale === "ar" ? "المدفوع" : "Paid"}
              </div>
              <div className="mt-1 text-sm font-bold text-emerald-700">
                {formatCurrency(pmPaidAmount, currency)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {locale === "ar" ? "المتبقي" : "Remaining"}
              </div>
              <div className="mt-1 text-sm font-bold text-amber-700">
                {formatCurrency(pmRemaining, currency)}
              </div>
            </div>
          </div>

          {/* Payment Breakdown — rendered when prior partial payments exist */}
          {pmPaymentBreakdown.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {locale === "ar" ? "تفاصيل الدفعات" : "Payment Breakdown"}
              </div>
              <div className="space-y-1.5">
                {pmPaymentBreakdown.map((payment) => (
                  <div key={`${payment.method}-${payment.amount}`} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{payment.method}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(payment.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment footer — hidden for already-paid orders */}
          {!isPaidOrder(paymentModalOrder) ? (
            <div className="mt-3 space-y-3">
              {pmNeedsDeliveryFeeConfirmation && !pmNeedsDeliveryZone && (
                <label className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={deliveryFeeAcknowledged}
                    onChange={(event) => setDeliveryFeeAcknowledged(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 accent-primary"
                  />
                  <span>
                    {locale === "ar"
                      ? `تم إبلاغ العميل برسوم التوصيل ${formatCurrency(pmDeliveryFee, currency)}`
                      : `Customer was informed about the delivery fee: ${formatCurrency(pmDeliveryFee, currency)}`}
                  </span>
                </label>
              )}
              <VoucherControls
                locale={locale}
                currency={currency}
                enabled={pmVoucherRequested}
                onEnabledChange={setApplyVoucher}
                availability={voucherAvailability}
                discountAmount={pmVoucherDiscount}
                disabled={!pmCanApplyVoucher}
                disabledReason={pmVoucherDisabledReason}
              />
              {/* Payment amount (partial support) */}
              <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-medium w-28 shrink-0">
                    {locale === "ar" ? "مبلغ الدفعة" : "Payment Amount"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={pmRemaining}
                    step="0.01"
                    placeholder={`${locale === "ar" ? "حد أقصى" : "Max"} ${pmRemaining.toFixed(2)}`}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="flex-1 h-8 px-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                {!pmIsPaymentAmountValid && paymentAmount.length > 0 && (
                  <div className="text-xs font-medium text-destructive">
                    {locale === "ar"
                      ? "أدخل مبلغًا أكبر من صفر ولا يتجاوز المتبقي"
                      : "Enter an amount greater than 0 and no more than the remaining balance"}
                  </div>
                )}
              </div>

              {/* Cash tendered — shown only when Cash is selected */}
              {pendingMethod === "Cash" && (
                <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium w-28 shrink-0">{t("cashReceived") || "Cash Received"}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={`Min ${pmPaymentAmountNum > 0 ? pmPaymentAmountNum.toFixed(2) : pmRemaining.toFixed(2)}`}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      autoFocus
                      className="flex-1 h-8 px-2.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  {pmTenderedNum > 0 && (
                    <div className={`flex justify-between text-sm font-semibold px-1 ${pmCashValid ? "text-emerald-700" : "text-destructive"}`}>
                      <span>{pmCashValid ? (t("change") || "Change") : (t("shortfall") || "Shortfall")}</span>
                      <span>{pmCashValid ? `+ ${formatCurrency(pmCashChange, currency)}` : `- ${formatCurrency(Math.max(0, pmPaymentAmountNum - pmTenderedNum), currency)}`}</span>
                    </div>
                  )}
                </div>
              )}

              {pendingMethod === "Credit Card" && (
                <CardPaymentMethodSelector
                  methods={nonCashPaymentMethods}
                  selectedId={selectedPaymentMethodId}
                  onSelectedIdChange={handleNonCashMethodChange}
                  referenceNumber={paymentReferenceNumber}
                  onReferenceNumberChange={setPaymentReferenceNumber}
                  locale={locale}
                  loading={paymentMethodsLoading}
                  disabled={isPayingOrder}
                />
              )}

              <DialogFooter className="flex-col sm:flex-row gap-3 !mt-0">
                <Button
                  className={`flex-1 h-12 text-base ${pendingMethod === "Cash" ? "bg-success text-white hover:bg-success/90" : "border border-success/30 bg-success/10 text-success hover:bg-success/20"}`}
                  onClick={() => {
                    if (pendingMethod !== "Cash") { setPendingMethod("Cash"); setCashTendered(""); setPaymentReferenceNumber(""); }
                    else if (pmCashValid) handleTakeawayPayment("Cash");
                  }}
                  disabled={isPayingOrder || !pmIsPaymentAmountValid || (pendingMethod === "Cash" && !pmCashValid) || pmNeedsDeliveryZone || (pmNeedsDeliveryFeeConfirmation && !deliveryFeeAcknowledged)}
                >
                  {isPayingOrder && pendingMethod === "Cash" ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                  ) : (
                    <Banknote className="me-2 h-5 w-5" />
                  )}
                  {pendingMethod === "Cash" && pmCashValid
                    ? (pmRemaining - pmPaymentAmountNum <= 0.001
                        ? (locale === "ar" ? "إكمال نقدًا" : "Complete with Cash")
                        : (locale === "ar" ? "إضافة دفعة نقدية" : "Add Cash Payment"))
                    : t("payWithCash")}
                </Button>
                <Button
                  className={`flex-1 h-12 text-base ${pendingMethod === "Credit Card" ? "bg-info text-white hover:bg-info/90" : "border border-info/30 bg-info/10 text-info hover:bg-info/20"}`}
                  onClick={() => {
                    if (pendingMethod !== "Credit Card") setPendingMethod("Credit Card");
                    else handleTakeawayPayment("Credit Card");
                  }}
                  disabled={isPayingOrder || !pmIsPaymentAmountValid || !isOnline || pmNeedsDeliveryZone || (pmNeedsDeliveryFeeConfirmation && !deliveryFeeAcknowledged) || nonCashConfirmBlocked}
                  title={!isOnline ? (locale === "ar" ? "طرق الدفع الأخرى تتطلب اتصالاً — استخدم النقد" : "These payment methods need an online connection — use Cash") : undefined}
                >
                  {isPayingOrder && pendingMethod === "Credit Card" ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                  ) : (
                    <Wallet className="me-2 h-5 w-5" />
                  )}
                  {!isOnline
                    ? (locale === "ar" ? "يتطلب اتصالاً" : "Online only")
                    : pendingMethod === "Credit Card"
                      ? (pmRemaining - pmPaymentAmountNum <= 0.001
                          ? (locale === "ar" ? "إكمال الدفع" : "Complete Payment")
                          : (locale === "ar" ? "إضافة دفعة" : "Add Payment"))
                      : t("payWithCard")}
                </Button>
              </DialogFooter>
              {pmCanRequestCancel && (
                <Button
                  variant="outline"
                  className="h-11 w-full gap-2 border-destructive/30 text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    if (!paymentModalOrder) return;
                    const order = paymentModalOrder;
                    closePaymentModal();
                    setCancelOrderData(order);
                  }}
                >
                  <Ban className="h-4 w-4" />
                  {t("cancelOrderButton")}
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <PrintReceiptButton order={paymentModalOrder} className="h-11 flex-1 text-base" label="Reprint Receipt" />
              {pmCanRequestCancel && (
                <Button
                  variant="outline"
                  className="h-11 flex-1 gap-2 border-destructive/30 text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    if (!paymentModalOrder) return;
                    const order = paymentModalOrder;
                    closePaymentModal();
                    setCancelOrderData(order);
                  }}
                >
                  <Ban className="h-4 w-4" />
                  {t("cancelOrderButton")}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
          setEditingOrderContext(null);
          setEditingCartId(null);
        }}
        onAddToCart={handleAddProductToCart}
        initialQuantity={modalInitialQuantity}
        initialNotes={modalInitialNotes}
        initialModifierIds={modalInitialModifierIds}
        initialModifierQuantities={modalInitialModifierQuantities}
        actionLabel={modalActionLabel}
        orderType={isDeliveryMode ? DELIVERY_MODAL_ORDER_TYPE : TAKEAWAY_MODAL_ORDER_TYPE}
      />

      <ProductQuickViewDialog
        product={quickViewProduct}
        open={quickViewProduct !== null}
        onOpenChange={(open) => {
          if (!open) setQuickViewProduct(null);
        }}
      />

      {/* Cancel request modal */}
      {cancelOrderData !== null && (
        <CancelOrderModal
          order={{
            id: cancelOrderData.id,
            orderNumber: cancelOrderData.orderNumber,
            orderSequenceNumber: cancelOrderData.orderSequenceNumber,
            tableName: cancelOrderData.tableName,
            items: (cancelOrderData.items ?? []).map((item) => ({
              id: item.id ?? "",
              productName: item.productName,
              quantity: item.quantity,
              price: item.unitPrice ?? (item.lineTotalAmount != null ? item.lineTotalAmount / Math.max(1, item.quantity) : 0),
            })),
            totalAmount: cancelOrderData.totalAmount ?? 0,
          }}
          onClose={() => setCancelOrderData(null)}
          onSuccess={(result) => {
            const order = cancelOrderData;
            if (!order) return;
            if (result.orderCancelled) {
              void markConfirmedCancelledOrderSnapshot(order.id, order, false);
            } else if (result.requiresKitchenApproval === true) {
              const pendingOrder: OrderDto = {
                ...order,
                status: ORDER_STATUS.PENDING_CANCELLATION_APPROVAL,
                hasPendingCancellation: true,
                hasPendingFullCancellation: true,
              };
              setTakeawayOrders((prev) => prev.map((candidate) =>
                candidate.id === pendingOrder.id ? pendingOrder : candidate
              ));
              if (activeOrder?.id === pendingOrder.id) setActiveOrder(pendingOrder);
              if (paymentModalOrder?.id === pendingOrder.id) setPaymentModalOrder(pendingOrder);
            }
            setCancelOrderData(null);
            void loadTakeawayOrders();
          }}
          currency={currency}
        />
      )}

      {/* Legacy refund modal */}
      {refundOrderData !== null && (
        <RefundOrderModal
          order={{
            id: refundOrderData.id,
            orderNumber: refundOrderData.orderNumber,
            orderSequenceNumber: refundOrderData.orderSequenceNumber,
            totalAmount: refundOrderData.totalAmount ?? 0,
            paymentMethod: refundOrderData.paymentMethod,
            isPaid: isPaidOrder(refundOrderData),
          }}
          onClose={() => setRefundOrderData(null)}
          onSuccess={(result) => {
            if (result.orderCancelled) {
              void markConfirmedCancelledOrderSnapshot(
                refundOrderData.id,
                refundOrderData,
                result.refunded,
              );
            }
            setRefundOrderData(null);
            void loadTakeawayOrders();
          }}
          currency={currency}
          intent="cancel"
        />
      )}

      {/* Offer Selection Dialog */}
      <Dialog open={!!pendingOffer} onOpenChange={(open) => { if (!open) { setPendingOffer(null); setPendingOfferNote(""); setPendingOfferQty(1); setPendingOfferLines([]); setPendingOfferModifiers({}); } }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-600" />
              {locale === "ar" ? (pendingOffer?.nameAr || pendingOffer?.name) : (pendingOffer?.name || pendingOffer?.nameAr)}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {/* Products list */}
            {pendingOffer && (
              <div className="flex flex-wrap gap-1.5">
                {pendingOffer.products.map((p, i) => (
                  <span key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-2.5 py-0.5 font-medium">
                    {locale === "ar" ? p.nameAr : p.name} × {p.quantity * pendingOfferQty}
                  </span>
                ))}
              </div>
            )}
            {/* Modifiers per offer product */}
            {pendingOfferLines.map((line) => {
              const visibleGroups = line.product.modifierGroups.filter(
                (g) => (g.availableForOrderTypes & 2) !== 0 && g.modifiers.some((m) => m.isActive !== false)
              );
              if (visibleGroups.length === 0) return null;
              const productName = locale === "ar"
                ? (line.product.nameAr || line.product.name)
                : (line.product.displayName || line.product.name);
              return (
                <div key={line.product.id} className="border-t pt-2 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{productName}</div>
                  {visibleGroups.map((group) => {
                    const activeModifiers = group.modifiers.filter((m) => m.isActive !== false);
                    const groupName = locale === "ar" ? (group.nameAr || group.name) : (group.displayName || group.name);
                    const selectedMods = pendingOfferModifiers[line.product.id] ?? [];
                    const isRadio = group.selectionType === 0;
                    return (
                      <div key={group.id} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">{groupName}</span>
                          {group.isRequired && (
                            <span className="text-[10px] font-bold text-red-500 uppercase">{locale === "ar" ? "إلزامي" : "required"}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeModifiers.map((modifier) => {
                            const isSelected = selectedMods.some((m) => m.id === modifier.id);
                            const modName = locale === "ar" ? (modifier.nameAr || modifier.name) : (modifier.displayName || modifier.name);
                            const modifierPrice = resolveTakeawayModifierUnitPrice(line.product, {
                              id: modifier.id,
                              name: modifier.name,
                              nameAr: modifier.nameAr,
                              displayName: modifier.displayName,
                              priceAdjustment: modifier.priceAdjustment,
                              pricingType: modifier.pricingType,
                              isFree: modifier.isFree,
                              freeQuantityLimit: modifier.freeQuantityLimit,
                              maxQuantity: modifier.maxQuantity,
                              quantity: 1,
                              recipeItems: modifier.recipeItems,
                            });
                            return (
                              <button
                                key={modifier.id}
                                type="button"
                                onClick={() => {
                                  setPendingOfferModifiers((prev) => {
                                    const current = prev[line.product.id] ?? [];
                                    if (isRadio) {
                                      const filtered = current.filter((m) => !group.modifiers.some((gm) => gm.id === m.id));
                                      if (isSelected) return { ...prev, [line.product.id]: filtered };
                                      return { ...prev, [line.product.id]: [...filtered, { id: modifier.id, name: modifier.name, nameAr: modifier.nameAr, displayName: modifier.displayName, priceAdjustment: modifier.priceAdjustment, pricingType: modifier.pricingType, isFree: modifier.isFree, freeQuantityLimit: modifier.freeQuantityLimit, maxQuantity: modifier.maxQuantity, isDefault: modifier.isDefault, isActive: modifier.isActive, quantity: 1, recipeItems: modifier.recipeItems }] };
                                    } else {
                                      if (isSelected) return { ...prev, [line.product.id]: current.filter((m) => m.id !== modifier.id) };
                                      const groupCount = current.filter((m) => group.modifiers.some((gm) => gm.id === m.id)).length;
                                      if (group.maxSelection > 0 && groupCount >= group.maxSelection) return prev;
                                      return { ...prev, [line.product.id]: [...current, { id: modifier.id, name: modifier.name, nameAr: modifier.nameAr, displayName: modifier.displayName, priceAdjustment: modifier.priceAdjustment, pricingType: modifier.pricingType, isFree: modifier.isFree, freeQuantityLimit: modifier.freeQuantityLimit, maxQuantity: modifier.maxQuantity, isDefault: modifier.isDefault, isActive: modifier.isActive, quantity: 1, recipeItems: modifier.recipeItems }] };
                                    }
                                  });
                                }}
                                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                  isSelected
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                                }`}
                              >
                                {modName}{modifierPrice > 0 ? ` +${formatCurrency(modifierPrice, currency)}` : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* Qty stepper */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">{locale === "ar" ? "الكمية" : "Quantity"}</span>
              <div className="flex items-center gap-2 ms-auto">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPendingOfferQty((q) => Math.max(1, q - 1))}
                  disabled={pendingOfferQty <= 1}
                >
                  <span className="text-base leading-none">−</span>
                </Button>
                <span className="w-6 text-center font-bold text-base">{pendingOfferQty}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPendingOfferQty((q) => q + 1)}
                >
                  <span className="text-base leading-none">+</span>
                </Button>
              </div>
            </div>
            {/* Price */}
            {pendingOffer && (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-amber-700">{formatCurrency(pendingOffer.finalPrice * pendingOfferQty, currency)}</span>
                {pendingOffer.originalTotal > pendingOffer.finalPrice && (
                  <span className="text-sm text-slate-400 line-through">{formatCurrency(pendingOffer.originalTotal * pendingOfferQty, currency)}</span>
                )}
                {pendingOfferQty > 1 && (
                  <span className="text-xs text-slate-500">({formatCurrency(pendingOffer.finalPrice, currency)} × {pendingOfferQty})</span>
                )}
              </div>
            )}
            {/* Note */}
            <div className="space-y-1">
              <Label htmlFor="takeaway-pending-offer-note" className="text-sm font-semibold text-slate-700">
                {locale === "ar" ? "ملاحظة خاصة" : "Special Note"}
              </Label>
              <Textarea
                id="takeaway-pending-offer-note"
                value={pendingOfferNote}
                onChange={(e) => setPendingOfferNote(e.target.value)}
                placeholder={locale === "ar" ? "e.g. بدون بصل، حار جداً" : "e.g. No onions, extra spicy"}
                className="min-h-20"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPendingOffer(null); setPendingOfferNote(""); setPendingOfferQty(1); setPendingOfferLines([]); setPendingOfferModifiers({}); }}>
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleConfirmOfferAdd} className="bg-primary hover:bg-primary/90 text-white">
              {locale === "ar" ? "إضافة للسلة" : "Add to Cart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Note Dialog */}
      <Dialog open={offerNoteEditing} onOpenChange={(open) => { if (!open) setOfferNoteEditing(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-600" />
              {locale === "ar" ? "ملاحظة العرض" : "Offer Note"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="takeaway-offer-note" className="text-sm font-semibold text-slate-700">
              {locale === "ar" ? "ملاحظة خاصة" : "Special Note"}
            </Label>
            <Textarea
              id="takeaway-offer-note"
              value={offerNoteValue}
              onChange={(e) => setOfferNoteValue(e.target.value)}
              placeholder={locale === "ar" ? "e.g. بدون بصل، حار جداً" : "e.g. No onions, extra spicy"}
              className="min-h-20"
              maxLength={500}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOfferNoteEditing(false)} disabled={savingOfferNote}>
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => { if (activeOrder) handleSaveOfferNote(activeOrder); }}
              disabled={savingOfferNote}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {savingOfferNote ? (locale === "ar" ? "جاري الحفظ..." : "Saving...") : (locale === "ar" ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
