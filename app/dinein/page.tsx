
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePosStore } from "@/store/posStore";
import { useAuthStore } from "@/store/authStore";
import { config } from "@/lib/config";
import { appendBranchQuery, getSelectedBranchCacheKey } from "@/lib/branch-selection";
import { ProductDto, ProductOptionDto, Table, TableStatus } from "@/types/pos";
import { CartItemModifier } from "@/store/posStore";
import { Button } from "@/components/ui/button";
import ProductModal from "@/components/ProductModal";
import ProductQuickViewDialog from "@/components/ProductQuickViewDialog";
import { useLocale } from "@/components/locale-provider";
import { DiscountGroupSelector } from "@/components/pos/DiscountGroupSelector";
import { toast } from "sonner";
import { HubConnectionBuilder, HubConnectionState } from "@microsoft/signalr";
import { getTables, updateTableStatus, getTableAllOrders, updateOrderItem, clearTable, getSessionOrders, getTablePublic, getOffers, validateOrderPrice, getRequestErrorMessage, isNetworkRequestError, markOrderAsReadyStrict, markOrderAsServedStrict, removeOfferFromOrder, removeOfferLineFromOrder, updateOrderOfferNote } from '@/lib/api';
import { Armchair, ArrowLeft, Gift, ChefHat, Trash2, ShoppingBag, Search, ShoppingCart, Ban, CheckCircle2, Truck } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CustomerLoyaltyModal from "@/components/CustomerLoyaltyModal";
import CancelOrderModal from "@/components/cancel/CancelOrderModal";
import { formatCurrency } from "@/lib/currencies";
import {
  resolveRecipeAlternativePriceImpactForRow,
  resolveRecipeAlternativePriceLabel,
} from "@/lib/recipe-alternative-pricing";
import AppHeader from "@/components/layout/AppHeader";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { PrintReceiptButton } from "@/components/receipt/PrintReceiptButton";
import SectionGroup from "@/components/tables/SectionGroup";
import { allocateOfferLines } from "@/lib/offer-utils";
import { buildOfferContentsSummary, splitCartItemsForOfferDisplay, splitOrderItemsForOfferDisplay } from "@/lib/order-offer-display";
import { groupTablesBySection } from "@/types/table";
import { OfferResponseDto } from "@/types/offer";
import { canAccessArea, getDefaultRouteForRole } from "@/lib/authorization";
import { ITEM_STATUS, ORDER_STATUS } from "@/lib/status-constants";
import { getConnectivityState, subscribeConnectivity, type ConnectivityState } from "@/lib/offline/connectivity";
import { getReferenceCache } from "@/lib/offline/db";
import { syncTableOrderSnapshots } from "@/lib/offline/table-order-cache";
import { useOfflineCashierStore } from "@/store/offlineCashierStore";
import { enqueueMarkReadyOffline, enqueueMarkServedOffline } from "@/lib/offline/orders";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import type { OrderDto, SelectedRecipeAlternativeDto } from "@/types/order";
import { ProductSelectionPanel } from "@/components/pos/order/ProductSelectionPanel";
import { formatOrderSequence } from "@/lib/order-sequence";
import { resolveOrderLifecycleStatus } from "@/lib/order-payments";
import { computeGroupDiscountAmount } from "@/lib/order-discount";

type PaidOrderState = string | null | undefined | {
  status?: string;
  isPaid?: boolean;
  paymentMethod?: string | null;
};
type TableSessionDetails = Pick<Table, "currentTicketId"> | null | undefined;

function getOrderDisplayNumber(order: Pick<OrderDto, "orderNumber" | "orderSequenceNumber" | "displayOrderNumber"> | null | undefined): string {
  return formatOrderSequence(order) ?? `#${order?.orderNumber?.slice(-4) || "?"}`;
}

function getPayloadOrderDisplayNumber(payload: any): string {
  const sequence = payload?.orderSequenceNumber || payload?.OrderSequenceNumber;
  const orderNumber = payload?.orderNumber || payload?.OrderNumber;
  return formatOrderSequence({ orderSequenceNumber: sequence }) ?? (orderNumber ? `#${String(orderNumber).slice(-4)}` : "#?");
}

const resolveDineInModifierUnitPrice = (product: ProductDto, modifier: CartItemModifier) => {
  const quantity = modifier.quantity || 1;
  const freeQuantityLimit = modifier.freeQuantityLimit ?? 0;
  if (modifier.isFree && (freeQuantityLimit === 0 || quantity <= freeQuantityLimit)) return 0;

  const baseUnitPrice = product.discountedPrice ?? product.basePrice;
  if ((modifier.pricingType ?? 0) === 2) return 0;
  if ((modifier.pricingType ?? 0) === 1) return (baseUnitPrice * modifier.priceAdjustment) / 100;
  return modifier.priceAdjustment;
};

export default function PosPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCashier = searchParams.get("from") === "cashier";
  const { user } = useAuthStore();
  const {
    products,
    cart,
    selectedTable,
    offerId,
    offerName,
    offerNote,
    offerQty,
    discountPercentage,
    serviceChargeRate,
    taxRate,
    activeOrder,
    fetchProducts,
    addToCart,
    removeFromCart,
    removeOfferFromCart,
    clearCart,
    checkoutOrder,
    setSelectedTable,
    setActiveOrder,
    activeOrders,
    setActiveOrders,
    toggleComplimentary,
    toggleOfferComplimentary,
    setServiceChargeRate,
    setTaxRate,
    setOfferContext,
    selectedCustomer,
    redeemPoints,
    selectedDiscountGroup,
    setDiscountGroup,
    currency
  } = usePosStore();
  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductDto | null>(null);

  const getItemDisplayName = (item: { productId?: string; productName: string }) => {
    if (locale === 'ar') {
      const p = products.find(pr => pr.id === item.productId);
      if (p?.nameAr) return p.nameAr;
    }
    const p = products.find(pr => pr.id === item.productId);
    return p ? (p.displayName || p.name) : item.productName;
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [modalInitialQuantity, setModalInitialQuantity] = useState(1);
  const [modalInitialNotes, setModalInitialNotes] = useState("");
  const [modalInitialModifierIds, setModalInitialModifierIds] = useState<string[]>([]);
  const [modalInitialModifierQuantities, setModalInitialModifierQuantities] = useState<Record<string, number>>({});
  const [modalActionLabel, setModalActionLabel] = useState("Add to Cart");
  const [editingOrderContext, setEditingOrderContext] = useState<{ orderId: string; orderItemId: string; isComplimentary: boolean } | null>(null);
  const [offers, setOffers] = useState<OfferResponseDto[]>([]);
  const [highlightedCartIds, setHighlightedCartIds] = useState<Set<string>>(new Set());
  const [priceWarning, setPriceWarning] = useState<{ expectedTotal: number; submittedTotal: number; message: string } | null>(null);
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const [cancelOrderSnapshot, setCancelOrderSnapshot] = useState<{ id: string; orderNumber: string; orderSequenceNumber?: string | null; tableName: string; items: any[]; totalAmount: number } | null>(null);
  const [cancelItemTarget, setCancelItemTarget] = useState<{ itemId?: string; itemName?: string } | null>(null);
  const [markingReadyOrderId, setMarkingReadyOrderId] = useState<string | null>(null);
  const [markingPickedUpOrderId, setMarkingPickedUpOrderId] = useState<string | null>(null);
  // Offer note editing state
  const [offerNoteDialog, setOfferNoteDialog] = useState<{ orderId: string; currentNote: string } | null>(null);
  const [offerNoteValue, setOfferNoteValue] = useState("");
  const [savingOfferNote, setSavingOfferNote] = useState<string | null>(null);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
  const [rejectedCancelItems, setRejectedCancelItems] = useState<Set<string>>(new Set());
  // Offer selection dialog
  const [pendingOffer, setPendingOffer] = useState<OfferResponseDto | null>(null);
  const [pendingOfferNote, setPendingOfferNote] = useState("");
  const [pendingOfferQty, setPendingOfferQty] = useState(1);
  const [pendingOfferLines, setPendingOfferLines] = useState<Array<{ product: ProductDto; quantity: number }>>([]);
  const [pendingOfferModifiers, setPendingOfferModifiers] = useState<Record<string, CartItemModifier[]>>({});
  const isOrderLocked = useCallback((status?: string) =>
    status === ORDER_STATUS.PAID ||
    status === ORDER_STATUS.CANCELLED ||
    status === ORDER_STATUS.REFUNDED ||
    status === ORDER_STATUS.PENDING_CANCELLATION_APPROVAL, []);
  const isPaidOrder = useCallback((orderOrStatus?: PaidOrderState) => {
    if (typeof orderOrStatus === "string" || orderOrStatus == null) {
      return orderOrStatus === ORDER_STATUS.PAID;
    }

    return orderOrStatus.status === ORDER_STATUS.PAID || orderOrStatus.isPaid === true || !!orderOrStatus.paymentMethod;
  }, []);
  const isReadyOrder = (status?: string) => status === ORDER_STATUS.READY;
  const isServedOrder = (status?: string) => status === ORDER_STATUS.SERVED;
  const normalizeTicketId = (ticketId: unknown): number =>
    Number.isFinite(Number(ticketId ?? 0)) ? Number(ticketId ?? 0) : 0;
  const getOrderInvoiceState = (status?: string) => isOrderLocked(status) ? "Close" : "Open";
  const getItemPrepState = (itemStatus?: string) => itemStatus === ITEM_STATUS.READY ? ITEM_STATUS.READY : "Prepared";
  const isItemReady = (item: any) => getItemPrepState(item?.itemStatus) === ITEM_STATUS.READY;
  const hasPendingCancellation = (order: any) => order?.hasPendingCancellation === true;
  const hasPendingItemCancellation = (order: any, itemId?: string | null) =>
    !!itemId && (
      order?.hasPendingFullCancellation === true ||
      (order?.pendingCancellationItemIds ?? []).includes(itemId)
    );
  const markCancelPending = (orders: OrderDto[], orderId: string, itemId?: string): OrderDto[] =>
    orders.map((order) => {
      if (order.id !== orderId) return order;

      const pendingItemIds = new Set(order.pendingCancellationItemIds ?? []);
      if (itemId) pendingItemIds.add(itemId);

      return {
        ...order,
        hasPendingCancellation: true,
        hasPendingFullCancellation: !itemId || order.hasPendingFullCancellation === true,
        pendingCancellationItemIds: Array.from(pendingItemIds),
      };
    });
  const hasAnyReadyItems = (order: any) => (order?.items || []).some((item: any) => isItemReady(item));
  const hasAllItemsReady = (order: any) => (order?.items?.length ?? 0) > 0 && (order?.items || []).every((item: any) => isItemReady(item));
  const getOrderStage = (order: any) => {
    if (isServedOrder(order?.status)) return ORDER_STATUS.SERVED;
    if (isReadyOrder(order?.status) || hasAllItemsReady(order)) return ORDER_STATUS.READY;
    return ORDER_STATUS.PREPARING;
  };
  const getOrderStageBadgeClass = (order: any) => {
    const stage = getOrderStage(order);

    if (stage === ORDER_STATUS.SERVED) return "bg-violet-100 text-violet-700";
    if (stage === ORDER_STATUS.READY) return "bg-success/20 text-success";
    return "bg-warning/20 text-warning";
  };
  const getOrderStageLabel = (order: any) => {
    const stage = getOrderStage(order);

    if (stage === ORDER_STATUS.SERVED) return t("statusServed");
    if (stage === ORDER_STATUS.READY) return t("statusReady");
    return t("statusPreparing");
  };
  // Table Selection State
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  // Offline reactivity: subscribe to IDB snapshots + connectivity so the
  // tables grid can recompute status from locally-known orders when the
  // network is down (or for offline-created orders not yet synced).
  const [connectivity, setConnectivity] = useState<ConnectivityState>("online");
  const isOnline = connectivity === "online";
  const bootstrapOffline = useOfflineCashierStore((s) => s.bootstrap);
  const offlineSnapshots = useOfflineCashierStore((s) => s.snapshots);
  useEffect(() => {
    void bootstrapOffline();
    setConnectivity(getConnectivityState());
    return subscribeConnectivity(setConnectivity);
  }, [bootstrapOffline]);
  const [activeCategory, setActiveCategory] = useState<string>("__all__");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [currentTicketId, setCurrentTicketId] = useState<number | null>(null); // Source of truth for filtering orders
  const currentTicketIdRef = useRef<number | null>(null); // Ref so SignalR closures always see latest value
  const selectedTableRef = useRef<Table | null>(null);
  const didInitRef = useRef(false);
  const redirectingRef = useRef(false);
  const tablesLoadRequestIdRef = useRef(0);
  const postCheckoutRequestIdRef = useRef(0);
  const tableOrdersRequestIdRef = useRef<Map<string, number>>(new Map());
  // Keep ref in sync with state so SignalR handlers (stale closures) always see the latest ticketId
  useEffect(() => { currentTicketIdRef.current = currentTicketId; }, [currentTicketId]);
  useEffect(() => { selectedTableRef.current = selectedTable; }, [selectedTable]);
  const resolveSessionTicketId = (orders: OrderDto[], preferredOrderId?: string | null): number | null => {
    if (preferredOrderId) {
      const preferredOrder = orders.find((order) => order.id === preferredOrderId);
      const preferredTicketId = normalizeTicketId(preferredOrder?.ticketId);
      if (preferredTicketId > 0) {
        return preferredTicketId;
      }
    }

    const ticketIds = orders
      .map((order) => normalizeTicketId(order.ticketId))
      .filter((ticketId) => ticketId > 0);

    return ticketIds.length ? Math.max(...ticketIds) : null;
  };
  const resolveKnownTableTicketId = (table: Table, tableDetails?: TableSessionDetails): number | null => {
    const detailsTicketId = normalizeTicketId(tableDetails?.currentTicketId);
    if (detailsTicketId > 0) return detailsTicketId;

    const tableTicketId = normalizeTicketId(table.currentTicketId);
    return tableTicketId > 0 ? tableTicketId : null;
  };
  const isClosedSessionOrder = (order: OrderDto): boolean =>
    order.status === ORDER_STATUS.CANCELLED ||
    (isPaidOrder(order) && (order.status === ORDER_STATUS.SERVED || order.status === ORDER_STATUS.COMPLETED));
  const resolveRestorableSessionTicketId = (
    table: Table,
    tableDetails: TableSessionDetails,
    orders: OrderDto[]
  ): number | null => {
    const knownTicketId = resolveKnownTableTicketId(table, tableDetails);
    if (knownTicketId) return knownTicketId;
    if (table.status === TableStatus.Free) return null;

    const ticketIds = orders
      .filter((order) => !isClosedSessionOrder(order))
      .map((order) => normalizeTicketId(order.ticketId))
      .filter((ticketId) => ticketId > 0);
    return ticketIds.length ? Math.max(...ticketIds) : null;
  };
  const loadAndCacheTableOrders = async (table: Table, ticketId?: number | null): Promise<OrderDto[]> => {
    // Pass the session ticketId to the backend so prior sessions are dropped
    // at the DB level. Callers that still need cross-session data (e.g. the
    // "is this table reserved?" audit) can omit it.
    const scopedTicketId = ticketId ?? table.currentTicketId ?? null;
    const requestId = (tableOrdersRequestIdRef.current.get(table.id) ?? 0) + 1;
    tableOrdersRequestIdRef.current.set(table.id, requestId);
    const orders = await getTableAllOrders(table.id, scopedTicketId) as OrderDto[];
    if (tableOrdersRequestIdRef.current.get(table.id) !== requestId) {
      return orders;
    }
    await syncTableOrderSnapshots(
      [table.name, table.displayName].filter((value): value is string => !!value),
      orders
    );
    return orders;
  };
  useEffect(() => {
    document.body.classList.toggle("overlay-open", orderPanelOpen);
    return () => document.body.classList.remove("overlay-open");
  }, [orderPanelOpen]);
  
  // Role-based redirect: Only Waiter (role 1) and Admin (role 0) should access this page
  useEffect(() => {
    if (!user || canAccessArea(user.role, "pos")) {
      redirectingRef.current = false;
      return;
    }

    if (redirectingRef.current) return;

    redirectingRef.current = true;
    router.push(getDefaultRouteForRole(user.role));
  }, [user, router]);
  
  // Intentional one-shot bootstrap: the ref prevents Strict Mode from
  // replaying the initial table/product load and causing stale responses to
  // overwrite the active dine-in session.
  useEffect(() => {
    if (didInitRef.current) return;

    didInitRef.current = true;
    void fetchProducts();
    void loadTables();
    void loadOffers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProducts]);
  const branchVersion = useActiveBranchVersion();
  const skippedInitialBranchVersionRef = useRef(false);
  // Tables, products and offers are branch-owned — reload them for the
  // newly-active branch on switch. The initial mount is already covered by the
  // one-shot bootstrap above, so the first firing of this effect
  // (branchVersion's starting value) is skipped. Tables are cleared first:
  // loadTables deliberately never overwrites a populated grid with an empty
  // list, which would otherwise pin the previous branch's floor plan when the
  // new branch has no tables yet.
  useEffect(() => {
    if (!skippedInitialBranchVersionRef.current) {
      skippedInitialBranchVersionRef.current = true;
      return;
    }
    setTables([]);
    void loadTables();
    void fetchProducts();
    void loadOffers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchVersion]);
  useEffect(() => {
    setHighlightedCartIds(new Set());
    setPriceWarning(null);
  }, [cart, offerId]);
  const cartOfferDisplay = useMemo(() => splitCartItemsForOfferDisplay(cart), [cart]);
  const loadOffers = async () => {
    const activeOffers = await getOffers();
    setOffers(activeOffers);
  };
  const loadTables = async () => {
    const requestId = ++tablesLoadRequestIdRef.current;
    setIsLoadingTables(true);

    // FIX(bug-3b): Pre-seed from the IDB reference cache so the grid paints
    // instantly on re-mount, even before getTables() resolves. Fixes the
    // "tables disappear on navigating back" flash: local state starts at []
    // every mount, and the async fetch used to leave the screen blank until
    // it resolved (or forever, if it returned empty).
    try {
      const seeded = await getReferenceCache<Table[]>(`tables:${getSelectedBranchCacheKey()}`);
      if (seeded && seeded.length) {
        setTables((prev) => (prev.length ? prev : seeded));
      }
    } catch {
      /* best-effort seed */
    }

    const data = await getTables();
    if (tablesLoadRequestIdRef.current !== requestId) {
      return;
    }

    // FIX(bug-3b): Never overwrite a populated tables array with an empty one.
    // getTables() falls back to [] on cache miss or transient network failure;
    // previously this wiped the grid on navigation/re-mount. Preserve the
    // last-known-good list so the cashier never sees an empty layout.
    if (!data.length) {
      setIsLoadingTables(false);
      return;
    }

    // Offline: skip the per-table server enrichment (it would just time out);
    // the reactive effect below recomputes status from local IDB snapshots.
    if (getConnectivityState() !== "online") {
      setTables(() => data);
      setIsLoadingTables(false);
      return;
    }

    // Detect tables with paid orders: Occupied tables should check if they have any orders including paid
    const enrichedTables = await Promise.all(
      data.map(async (table: Table) => {
        if (table.status === TableStatus.Occupied || table.status === TableStatus.Reserved) {
          try {
            // Keep the table card scoped to one live ticket. If the explicit
            // ticket is missing, infer only from non-closed rows so old cleared
            // sessions cannot resurrect a Reserved badge.
            const knownTicketId = resolveKnownTableTicketId(table);
            const allOrders = await loadAndCacheTableOrders(table, knownTicketId);
            const sessionTicketId = resolveRestorableSessionTicketId(table, null, allOrders);
            if (!sessionTicketId) {
              return { ...table, status: TableStatus.Free, currentTicketId: null };
            }
            const sessionOrders = getSessionOrders(allOrders, sessionTicketId);

            if (sessionOrders.length === 0) {
              return { ...table, status: TableStatus.Free, currentTicketId: null };
            }
            const hasPaidOrders = sessionOrders.some((o: any) => isPaidOrder(o));
            const hasActiveOrders = sessionOrders.some((o: any) => !isPaidOrder(o) && o.status !== ORDER_STATUS.CANCELLED);

            if (hasPaidOrders && !hasActiveOrders) {
              return { ...table, status: TableStatus.Reserved, currentTicketId: sessionTicketId };
            }
            return { ...table, currentTicketId: sessionTicketId };
          } catch (error) {
            console.error(`Failed to check orders for table ${table.id}:`, error);
          }
        }
        return table;
      })
    );

    if (tablesLoadRequestIdRef.current !== requestId) {
      return;
    }

    setTables(() => enrichedTables);
    setIsLoadingTables(false);
  };

  // FIX(dine-in-reactivity): usePosStore.activeOrders is not wired to the
  // snapshot pub-sub. When an offline mutation (mark-ready from another tab,
  // or the queue drain remapping localId → serverId) updates an order's IDB
  // snapshot, the dine-in panel stays stale. Keep ONLY the latest live session
  // for the selected table here; never merge older ticket rows back into
  // memory, and never fall back to an older ticket when the latest session was
  // already cleared/closed.
  useEffect(() => {
    if (!selectedTable) return;
    if (!offlineSnapshots.length) return;
    const tableMatches = (o: OrderDto) =>
      o.orderType === "DineIn" &&
      (o.tableName === selectedTable.name || o.tableName === selectedTable.displayName);
    const tableOrders = offlineSnapshots.filter(tableMatches);
    if (!tableOrders.length) return;

    const liveOrders = tableOrders.filter((o) =>
      o.status !== ORDER_STATUS.CANCELLED &&
      !(isPaidOrder(o) && (o.status === ORDER_STATUS.SERVED || o.status === ORDER_STATUS.COMPLETED))
    );

    // STRICT SESSION FILTER — trust the DB-provided currentTicketId while
    // online. Only fall back to "max live ticketId" when offline AND no
    // currentTicketId has been resolved yet, otherwise a stale cached ticket
    // could resurrect a closed session.
    const effectiveTicketId = currentTicketId ?? (isOnline ? null : (() => {
      const ticketIds = liveOrders
        .map((o) => normalizeTicketId(o.ticketId))
        .filter((ticketId) => ticketId > 0);
      return ticketIds.length ? Math.max(...ticketIds) : null;
    })());

    const latestSessionOrders = effectiveTicketId
      ? tableOrders.filter((o) => normalizeTicketId(o.ticketId) === effectiveTicketId)
      : [];

    if (!latestSessionOrders.length) {
      // Do not let IDB snapshots blank out a valid server-loaded session while
      // online. This effect exists to enrich/refresh from snapshots, not to
      // erase the panel a moment after handleTableClick populated it.
      if (!isOnline) {
        setActiveOrders([]);
        setActiveOrder(null);
      }
      return;
    }

    setActiveOrders(latestSessionOrders as any);
    const currentActive = usePosStore.getState().activeOrder as any;
    if (currentActive) {
      const latest = latestSessionOrders.find((o) => o.id === currentActive.id) ?? null;
      if (latest !== currentActive) setActiveOrder(latest as any);
    } else {
      const firstUnpaid = latestSessionOrders.find((o) => !isPaidOrder(o)) ?? null;
      if (firstUnpaid) setActiveOrder(firstUnpaid as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineSnapshots, selectedTable, currentTicketId, isOnline]);

  // Reactive offline status: when offline (or for offline-created orders),
  // derive Occupied/Reserved/Free from IDB snapshots. An active (non-paid,
  // non-cancelled) dine-in order for this table → Occupied; only-paid
  // orders → Reserved; otherwise leave whatever loadTables assigned.
  useEffect(() => {
    if (isOnline || !offlineSnapshots.length || !tables.length) return;
    setTables((prev) => prev.map((table) => {
      const tableOrders = offlineSnapshots.filter((o) =>
        o.orderType === "DineIn" &&
        (o.tableName === table.name || o.tableName === table.displayName)
      );
      if (!tableOrders.length) return table;
      // Active = still needs kitchen/cashier work (unpaid, non-cancelled).
      const hasActive = tableOrders.some(
        (o) => !isPaidOrder(o) && o.status !== ORDER_STATUS.CANCELLED
      );
      // Paid-but-pending = cashier closed the bill but waiter hasn't served
      // the food yet. That's a valid "Reserved" state. Paid + Served/Completed
      // is a wrapped-up ticket — the table should read Free again.
      const hasPendingPaid = tableOrders.some(
        (o) =>
          isPaidOrder(o) &&
          o.status !== ORDER_STATUS.SERVED &&
          o.status !== ORDER_STATUS.COMPLETED
      );
      if (hasActive && table.status !== TableStatus.Occupied) {
        return { ...table, status: TableStatus.Occupied };
      }
      if (!hasActive && hasPendingPaid && table.status !== TableStatus.Reserved) {
        return { ...table, status: TableStatus.Reserved };
      }
      if (!hasActive && !hasPendingPaid && table.status !== TableStatus.Free) {
        return { ...table, status: TableStatus.Free };
      }
      return table;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, offlineSnapshots]);

  const categoryPills = useMemo(() => {
    const names = Array.from(
      new Set(
        tables
          .map((table) => table.categoryName?.trim())
          .filter((name): name is string => !!name)
      )
    );
    return names;
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (activeCategory === "__all__") return tables;
    return tables.filter((table) => (table.categoryName?.trim() || "") === activeCategory);
  }, [tables, activeCategory]);

  const searchFilteredTables = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return filteredTables;
    return filteredTables.filter((table) =>
      (table.displayName || table.name).toLowerCase().includes(q)
    );
  }, [filteredTables, tableSearch]);
  const handleTableClick = async (table: Table) => {
    setOrderPanelOpen(false);
    let tableToSelect = table;
    // Offline: the backend can't answer getTablePublic / getTableAllOrders, so
    // derive the session from locally-known IDB snapshots. Offline-only orders
    // (no server id yet) still surface here so the waiter can review, add
    // items, or settle them — everything is queued for sync.
    if (!isOnline) {
      // All non-cancelled dine-in orders known for this table (server-cached
      // and offline-created).
      const tableOrdersLocal = offlineSnapshots.filter((o) =>
        o.orderType === "DineIn" &&
        (o.tableName === table.name || o.tableName === table.displayName) &&
        o.status !== ORDER_STATUS.CANCELLED
      );

      // A ticket is "live" until every order in it is both paid AND
      // served/completed. Otherwise clicking an Empty table would resurrect
      // the last closed-out session instead of starting fresh.
      const isLiveOrder = (o: any) => {
        const finished =
          o.status === ORDER_STATUS.SERVED ||
          o.status === ORDER_STATUS.COMPLETED;
        return !(finished && isPaidOrder(o));
      };
      const liveOrders = tableOrdersLocal.filter(isLiveOrder);

      if (!liveOrders.length) {
        // No active session — mirror the online "Free" path and let the waiter
        // start a new ticket.
        setCurrentTicketId(null);
        setActiveOrders([]);
        setActiveOrder(null);
        setSelectedTable(table);
        return;
      }

      // Only ONE session is active at a time. Approximate the backend's
      // `Table.CurrentTicketId` offline: pick the highest positive ticketId
      // among the live orders. Never resurrect ticketId=0 rows here — if the
      // latest real session was cleared/closed, the table should open empty.
      const ticketIds = liveOrders
        .map((o) => normalizeTicketId(o.ticketId))
        .filter((t) => t > 0);
      const currentSessionTicketId = ticketIds.length ? Math.max(...ticketIds) : null;

      // Session orders include non-cancelled rows sharing the live ticketId
      // (paid-but-not-served stays visible so the waiter can still Mark Served).
      const sessionOrders = currentSessionTicketId
        ? tableOrdersLocal.filter((o) => normalizeTicketId(o.ticketId) === currentSessionTicketId)
        : [];
      const firstUnpaid = sessionOrders.find((o) => !isPaidOrder(o)) ?? null;

      setCurrentTicketId(currentSessionTicketId);
      setActiveOrders(sessionOrders as any);
      setActiveOrder(firstUnpaid as any);
      setSelectedTable(table);
      return;
    }

    if (table.status === TableStatus.Free) {
      // Check backend for an existing session before starting fresh —
      // a table may be Free in local state but still have a currentTicketId
      // (e.g. if the local cache is stale after payment).
      let existingTicketId: number | null = null;
      try {
        const tableDetails = await getTablePublic(table.id);
        existingTicketId = resolveKnownTableTicketId(table, tableDetails);
      } catch {
        // Ignore — treat as genuinely free
      }

      if (existingTicketId) {
        try {
          const allOrders = await loadAndCacheTableOrders(table, existingTicketId);
          const sessionOrders = getSessionOrders(allOrders, existingTicketId);
          if (sessionOrders.length === 0) {
            existingTicketId = null;
          } else {
            const hasUnpaidOrder = sessionOrders.some((o: any) => !isPaidOrder(o) && o.status !== ORDER_STATUS.CANCELLED);
            const restoredTable = {
              ...table,
              status: hasUnpaidOrder ? TableStatus.Occupied : TableStatus.Reserved,
              currentTicketId: existingTicketId,
            };
            setCurrentTicketId(existingTicketId);
            setActiveOrders(sessionOrders);
            const firstUnpaidOrder = sessionOrders.find((o: any) => !isPaidOrder(o)) ?? null;
            setActiveOrder(firstUnpaidOrder);
            setTables((prev) => prev.map((t) => (t.id === table.id ? restoredTable : t)));
            tableToSelect = restoredTable;
          }
        } catch (error) {
          console.error("Failed to load stale session for Free table:", error);
          existingTicketId = null;
        }
      }

      if (!existingTicketId) {
        // Genuinely free: mark Occupied and start a fresh session
        const success = await updateTableStatus(table.id, TableStatus.Occupied);
        if (!success) {
          toast.error("Failed to update table status.");
          return;
        }
        // Immutable update — avoids React missing the state change (direct mutation
        // of `table.status` is an anti-pattern and can leave `tables` stale).
        const occupiedTable = { ...table, status: TableStatus.Occupied };
        setTables((prev) => prev.map((t) => (t.id === table.id ? occupiedTable : t)));
        setCurrentTicketId(null);
        setActiveOrder(null);
        setActiveOrders([]);
        setSelectedTable(occupiedTable);
        return; // setSelectedTable already called — skip the one at the end of the function
      }
    } else {
      // Occupied or Reserved: fetch table details to get currentTicketId (source of truth)
      try {
        const tableDetails = await getTablePublic(table.id);
        const knownTicketId = resolveKnownTableTicketId(table, tableDetails);

        // Load all orders and filter using the database's currentTicketId.
        // The DB-level filter on ticketId stops prior sessions from even
        // reaching the client; getSessionOrders is the belt-and-suspenders
        // second pass in case the table shape is ever stale in memory.
        const allOrders = await loadAndCacheTableOrders(table, knownTicketId);
        const ticketId = resolveRestorableSessionTicketId(table, tableDetails, allOrders);
        const sessionOrders = getSessionOrders(allOrders, ticketId);

        if (sessionOrders.length === 0) {
          setCurrentTicketId(null);
          setActiveOrders([]);
          setActiveOrder(null);
        } else {
          setCurrentTicketId(ticketId);
          setActiveOrders(sessionOrders);
          const firstUnpaidOrder = sessionOrders.find((o: any) => !isPaidOrder(o)) ?? null;
          setActiveOrder(firstUnpaidOrder);
          tableToSelect = { ...table, currentTicketId: ticketId };
        }
      } catch (error) {
        console.error("Failed to load table session:", error);
        toast.error("Failed to load table details");
        return;
      }
    }
    setSelectedTable(tableToSelect);
  };
  const handleBackToTables = () => {
    if (cart.length > 0) {
      if (!confirm("Your cart has items. Leaving will clear the cart. Are you sure?")) return;
      clearCart();
    }
    setOrderPanelOpen(false);
    setCurrentTicketId(null);
    setActiveOrder(null);
    setActiveOrders([]);
    setSelectedTable(null);
    loadTables(); // Refresh status
  };
  const handleRefreshCurrentTable = async () => {
    if (!selectedTable || !currentTicketId) return;
    const [refreshedOrders, refreshedTables] = await Promise.all([
      loadAndCacheTableOrders(selectedTable),
      getTables(),
    ]);
    // Filter using the single source of truth: currentTicketId from database
    const sessionOrders = getSessionOrders(refreshedOrders, currentTicketId);
    setActiveOrders(sessionOrders);
    
    // Set activeOrder to first non-paid order, or null if all are paid
    const firstUnpaidOrder = sessionOrders.find((o: any) => !isPaidOrder(o)) ?? null;
    setActiveOrder(firstUnpaidOrder);
    // If no orders at all, reset table to Free (session ended)
    let refreshedSelectedTable = refreshedTables.find((table) => table.id === selectedTable.id) ?? selectedTable;
    if (refreshedOrders.length === 0) {
      refreshedSelectedTable = { ...refreshedSelectedTable, status: TableStatus.Free };
    }
    setTables((prev) =>
      prev.map((table) =>
        table.id === selectedTable.id ? refreshedSelectedTable : table
      )
    );
    setSelectedTable(refreshedSelectedTable);
  };
  const handleClearTable = async () => {
    if (!selectedTable) return;
    if (!confirm("End this session? The table will be ready for the next guest.")) return;

    // Offline: we cannot hit the API, but the waiter still needs the table to
    // reset locally so the next guest's session starts empty. Refuse the clear
    // if the current session has an unpaid order — that would silently lose
    // revenue. Otherwise drop the session's snapshots so the offline session
    // filter (picks highest ticketId among non-cleared orders) stops
    // resurrecting them on the next tap.
    if (!isOnline) {
      const hasUnpaid = activeOrders.some((o: any) => !isPaidOrder(o));
      if (hasUnpaid) {
        toast.error(locale === "ar"
          ? "لا يمكن إنهاء الجلسة دون اتصال إذا كانت هناك طلبات غير مدفوعة"
          : "Cannot clear table offline while unpaid orders exist");
        return;
      }
      // FIX(dine-in-reactivity): the hasUnpaid guard reads the optimistic,
      // post-enqueue snapshot — so a queued pay action appears Paid and passes
      // here. But deleting the snapshot leaves the pay action in the queue; on
      // drain success the drain re-inserts the order with the server copy.
      // Refuse the clear while any queue action still targets this session.
      const sessionIds = new Set(activeOrders.map((o: any) => o.id));
      const pending = useOfflineCashierStore.getState().pending;
      const hasInFlight = pending.some(
        (a) => sessionIds.has(a.orderId) &&
               (a.status === "pending" || a.status === "syncing")
      );
      if (hasInFlight) {
        toast.error(locale === "ar"
          ? "لا يمكن إنهاء الجلسة وهناك مزامنة معلقة لهذه الطلبات"
          : "Cannot clear the session while sync is still pending for these orders");
        return;
      }
      try {
        const { deleteOrderSnapshot } = await import("@/lib/offline/db");
        await Promise.all(activeOrders.map((o: any) => deleteOrderSnapshot(o.id)));
      } catch {
        /* best-effort: the pub-sub refresh below still resets the UI */
      }
      setCurrentTicketId(null);
      setActiveOrder(null);
      setActiveOrders([]);
      setOrderPanelOpen(false);
      clearCart();
      const updatedTable = { ...selectedTable, status: TableStatus.Free };
      setSelectedTable(updatedTable);
      setTables((prev) => prev.map((table) => (table.id === selectedTable.id ? updatedTable : table)));
      toast.success(locale === "ar" ? "انتهت الجلسة محليًا" : "Session ended locally");
      return;
    }

    const success = await clearTable(selectedTable.id);
    if (!success) {
      toast.error("Failed to clear table.");
      return;
    }
    // Reset local state for this table (end session)
    setCurrentTicketId(null);
    setActiveOrder(null);
    setActiveOrders([]);
    setOrderPanelOpen(false);
    clearCart();
    // Update table status locally to Free
    const updatedTable = { ...selectedTable, status: TableStatus.Free };
    setSelectedTable(updatedTable);
    setTables((prev) => prev.map((table) => (table.id === selectedTable.id ? updatedTable : table)));
    toast.success("Session ended. Table ready for next guest.");
  };
  // Open modal when product card is clicked
  const handleProductClick = useCallback((product: ProductDto) => {
    if (!product.isAvailableNow) {
      toast.warning(locale === "ar" ? "هذا المنتج غير متاح حاليًا" : "This product is not available right now");
      return;
    }
    const hasUnpaidOrder = activeOrders.some((order: OrderDto) => !isPaidOrder(order) && order.status !== ORDER_STATUS.CANCELLED);
    const isEditingUnpaidOrder = !!activeOrder && !isOrderLocked(activeOrder.status);
    // Only block when there are existing unpaid orders the user hasn't selected yet
    if (hasUnpaidOrder && !isEditingUnpaidOrder) {
      toast.error(t("selectExistingOrder"));
      return;
    }
    // Block if the selected order is already locked (Paid/Cancelled)
    if (activeOrder && isOrderLocked(activeOrder.status)) {
      toast.error(t("selectExistingOrder"));
      return;
    }
    setSelectedProduct(product);
    setModalInitialQuantity(1);
    setModalInitialNotes("");
    setModalInitialModifierIds([]);
    setModalActionLabel(t("addToCartBtn"));
    setEditingOrderContext(null);
    setIsModalOpen(true);
  }, [activeOrder, activeOrders, isOrderLocked, isPaidOrder, locale, t]);

  const handleQuickViewProduct = useCallback((product: ProductDto) => {
    setQuickViewProduct(product);
  }, []);
  const handleOfferSelect = (offer: OfferResponseDto) => {
    if (!offer.isAvailableNow) {
      toast.warning(locale === "ar" ? "هذا العرض غير متاح حاليًا" : "This offer is not available right now");
      return;
    }

    const hasUnpaidOrder = activeOrders.some((o: any) => !isPaidOrder(o) && o.status !== ORDER_STATUS.CANCELLED);
    const isEditingUnpaidOrder = !!activeOrder && !isOrderLocked(activeOrder.status) && !isPaidOrder(activeOrder);
    if ((hasUnpaidOrder && !isEditingUnpaidOrder) || (activeOrder && (isOrderLocked(activeOrder.status) || isPaidOrder(activeOrder)))) {
      toast.error(t("selectExistingOrder"));
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
    pendingOfferLines.forEach((line) => {
      addToCart(line.product, pendingOfferModifiers[line.product.id] ?? [], line.quantity * pendingOfferQty, "", true, pendingOffer.id, pendingOffer.name, pendingOffer.nameAr);
    });
    setOfferContext(pendingOffer.id, pendingOffer.name, pendingOfferNote.trim() || null, pendingOfferQty);
    toast.success(locale === "ar"
      ? `تم إضافة العرض: ${pendingOffer.nameAr || pendingOffer.name}`
      : `Offer added: ${pendingOffer.name || pendingOffer.nameAr}`);
    setPendingOffer(null);
    setPendingOfferNote("");
    setPendingOfferQty(1);
    setPendingOfferLines([]);
    setPendingOfferModifiers({});
  };
  // Add to cart from inside modal
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
    if (editingOrderContext && selectedTable) {
      const updatedOrder = await updateOrderItem(editingOrderContext.orderId, editingOrderContext.orderItemId, {
        quantity,
        price: product.basePrice,
        notes,
        isComplimentary: editingOrderContext.isComplimentary,
        modifiers: modifiers.map((m) => ({
          modifierId: m.id,
          modifierName: m.name,
          modifierNameAr: m.nameAr,
          price: resolveDineInModifierUnitPrice(product, m),
          quantity: m.quantity || 1,
        })),
        // An option fully overrides the recipe, so swaps are silently dropped.
        selectedRecipeAlternatives: selectedOption ? [] : (selectedRecipeAlternatives ?? []),
      });
      if (!updatedOrder) {
        toast.error("Failed to update item");
        return;
      }
      const refreshedOrders = await loadAndCacheTableOrders(selectedTable);
      const sessionOrders = getSessionOrders(refreshedOrders, currentTicketId);
      setActiveOrders(sessionOrders);
      const refreshedSelectedOrder = sessionOrders.find((order: any) => order.id === editingOrderContext.orderId) ?? null;
      setActiveOrder(refreshedSelectedOrder);
      toast.success("Item updated");
    } else {
      addToCart(product, modifiers, quantity, notes, false, null, null, null, selectedOption, selectedRecipeAlternatives);
    }
    setIsModalOpen(false);
    setSelectedProduct(null);
    setModalInitialQuantity(1);
    setModalInitialNotes("");
    setModalInitialModifierIds([]);
    setModalInitialModifierQuantities({});
    setModalActionLabel(t("addToCartBtn"));
    setEditingOrderContext(null);
  };
  const handleEditOrderItem = (order: any, item: any) => {
    if (isOrderLocked(order?.status)) {
      toast.error("This order is already closed.");
      return;
    }
    if (isItemReady(item)) {
      toast.error("This item is already ready.");
      return;
    }
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      toast.error("Product not found for this item");
      return;
    }
    const itemModifierNames: string[] = (item.modifiers || []).map((m: any) => m.modifierName);
    const initialModifierIds = product.modifierGroups
      .flatMap((group) => group.modifiers)
      .filter((modifier) => itemModifierNames.includes(modifier.name))
      .map((modifier) => modifier.id);
    // Build quantity map from existing order modifiers
    const modQuantities: Record<string, number> = {};
    for (const m of (item.modifiers || [])) {
      const found = product.modifierGroups
        .flatMap((g) => g.modifiers)
        .find((mod) => mod.name === m.modifierName);
      if (found && m.quantity > 1) modQuantities[found.id] = m.quantity;
    }
    setSelectedProduct(product);
    setModalInitialQuantity(Math.max(1, Number(item.quantity) || 1));
    setModalInitialNotes(item.notes || "");
    setModalInitialModifierIds(initialModifierIds);
    setModalInitialModifierQuantities(modQuantities);
    setModalActionLabel(t("updateItem"));
    setEditingOrderContext({
      orderId: order.id,
      orderItemId: item.id,
      isComplimentary: !!item.isComplimentary,
    });
    setIsModalOpen(true);
  };
  const handleRemoveOffer = async (order: any, offerLineId?: number | null) => {
    if (isOrderLocked(order?.status) || !order?.id || !selectedTable) return;
    if (!confirm(locale === "ar" ? "هل تريد إزالة هذا العرض من الطلب؟" : "Remove this offer from the order?")) return;
    setDeletingOfferId(order.id);
    try {
      const result = offerLineId != null
        ? await removeOfferLineFromOrder(order.id, offerLineId)
        : await removeOfferFromOrder(order.id);
      if (!result) {
        toast.error(locale === "ar" ? "فشل حذف العرض" : "Failed to remove offer");
        return;
      }
      const refreshedOrders = await loadAndCacheTableOrders(selectedTable);
      const sessionOrders = getSessionOrders(refreshedOrders, currentTicketId);
      setActiveOrders(sessionOrders);
      const refreshedSelectedOrder = sessionOrders.find((o: any) => o.id === activeOrder?.id) ?? null;
      setActiveOrder(refreshedSelectedOrder);
      toast.success(locale === "ar" ? "تم إزالة العرض" : "Offer removed");
    } catch {
      toast.error(locale === "ar" ? "خطأ في إزالة العرض" : "Error removing offer");
    } finally {
      setDeletingOfferId(null);
    }
  };

  const handleSaveOfferNote = async (order: any) => {
    if (!order?.id || !selectedTable) return;
    const note = offerNoteValue ?? "";
    setSavingOfferNote(order.id);
    try {
      const result = await updateOrderOfferNote(order.id, note);
      if (!result) {
        toast.error(locale === "ar" ? "فشل حفظ الملاحظة" : "Failed to save note");
        return;
      }
      const refreshedOrders = await loadAndCacheTableOrders(selectedTable);
      const sessionOrders = getSessionOrders(refreshedOrders, currentTicketId);
      setActiveOrders(sessionOrders);
      const refreshedSelectedOrder = sessionOrders.find((o: any) => o.id === activeOrder?.id) ?? null;
      setActiveOrder(refreshedSelectedOrder);
      setOfferNoteDialog(null);
      toast.success(locale === "ar" ? "تم حفظ الملاحظة" : "Note saved");
    } catch {
      toast.error(locale === "ar" ? "خطأ في حفظ الملاحظة" : "Error saving note");
    } finally {
      setSavingOfferNote(null);
    }
  };

  // Payment-preserving optimistic patch: workflow status moves forward but
  // isPaid / paymentStatus / paidAmount / paymentMethod stay untouched.
  const applyStatusPatch = (order: any, patch: Partial<any>) => ({ ...order, ...patch });

  const handleMarkOrderReady = async (order: any) => {
    setMarkingReadyOrderId(order.id);
    // Optimistic — instant UI regardless of connectivity. Spread preserves
    // payment fields so a paid order stays paid after transitioning to Ready.
    const patchedItems = (order.items ?? []).map((it: any) => ({ ...it, itemStatus: ITEM_STATUS.READY }));
    const nextStatus = resolveOrderLifecycleStatus(
      { ...order, items: patchedItems },
      isPaidOrder(order)
    );
    setActiveOrders(activeOrders.map((o: any) =>
      o.id === order.id ? applyStatusPatch(o, { status: nextStatus, items: patchedItems }) : o
    ));
    if (activeOrder?.id === order.id) {
      setActiveOrder(applyStatusPatch(activeOrder, { status: nextStatus, items: patchedItems }));
    }
    try {
      if (getConnectivityState() === "online") {
        await markOrderAsReadyStrict(order.id);
        if (selectedTable) {
          const refreshedOrders = await loadAndCacheTableOrders(selectedTable);
          const sessionOrders = getSessionOrders(refreshedOrders, currentTicketId);
          setActiveOrders(sessionOrders);
          const refreshedSelectedOrder = sessionOrders.find((o: any) => o.id === activeOrder?.id) ?? null;
          setActiveOrder(refreshedSelectedOrder);
          toast.success("Order marked as ready");
          return;
        }
      }
      // Offline / server failure: enqueue + mirror onto IDB snapshot so a
      // refresh offline still shows the order as Ready.
      await enqueueMarkReadyOffline(order.id);
      toast.success("Marked ready — will sync when online");
    } catch (error) {
      if (isNetworkRequestError(error)) {
        await enqueueMarkReadyOffline(order.id);
        toast.success("Marked ready — will sync when online");
      } else {
        setActiveOrders(activeOrders.map((candidate: any) =>
          candidate.id === order.id ? order : candidate
        ));
        if (activeOrder?.id === order.id) setActiveOrder(order);
        toast.error(getRequestErrorMessage(error, "Error marking order as ready"));
      }
    } finally {
      setMarkingReadyOrderId(null);
    }
  };

  const handleMarkOrderPickedUp = async (order: any) => {
    setMarkingPickedUpOrderId(order.id);
    // Optimistic — spread preserves payment fields.
    setActiveOrders(activeOrders.map((o: any) =>
      o.id === order.id
        ? applyStatusPatch(o, {
            status: resolveOrderLifecycleStatus(
              { ...o, status: ORDER_STATUS.SERVED },
              isPaidOrder(o)
            ),
          })
        : o
    ));
    if (activeOrder?.id === order.id) {
      setActiveOrder(applyStatusPatch(activeOrder, {
        status: resolveOrderLifecycleStatus(
          { ...activeOrder, status: ORDER_STATUS.SERVED },
          isPaidOrder(activeOrder)
        ),
      }));
    }
    try {
      if (getConnectivityState() === "online") {
        await markOrderAsServedStrict(order.id);
        if (selectedTable) {
          const refreshedOrders = await loadAndCacheTableOrders(selectedTable);
          const sessionOrders = getSessionOrders(refreshedOrders, currentTicketId);
          setActiveOrders(sessionOrders);
          const refreshedSelectedOrder = sessionOrders.find((o: any) => o.id === activeOrder?.id) ?? null;
          setActiveOrder(refreshedSelectedOrder);
          toast.success("Order marked as picked up");
          return;
        }
      }
      await enqueueMarkServedOffline(order.id);
      toast.success("Marked served — will sync when online");
    } catch (error) {
      if (isNetworkRequestError(error)) {
        await enqueueMarkServedOffline(order.id);
        toast.success("Marked served — will sync when online");
      } else {
        setActiveOrders(activeOrders.map((candidate: any) =>
          candidate.id === order.id ? order : candidate
        ));
        if (activeOrder?.id === order.id) setActiveOrder(order);
        toast.error(getRequestErrorMessage(error, "Error marking order as served"));
      }
    } finally {
      setMarkingPickedUpOrderId(null);
    }
  };

  const submitCurrentCart = async () => {
    const requestId = ++postCheckoutRequestIdRef.current;
    const selectedTableId = selectedTable?.id ?? null;

    setIsOrdering(true);
    try {
      await checkoutOrder();

      const storeState = usePosStore.getState();
      const storeOrders = storeState.activeOrders as OrderDto[];
      const selectedOrderId = storeState.activeOrder?.id ?? null;

      // checkoutOrder() sets activeOrders without ticket filtering — re-apply
      // the current session only. Prefer the freshly returned order ticketId
      // first so we do not refetch the table on a brand-new session.
      let effectiveTicketId = currentTicketIdRef.current ?? resolveSessionTicketId(storeOrders, selectedOrderId);

      if (!effectiveTicketId && selectedTableId && isOnline) {
        try {
          const tableDetails = await getTablePublic(selectedTableId);
          effectiveTicketId = tableDetails?.currentTicketId || null;
        } catch {
          // Degraded connectivity: fall through and let the store's activeOrders stand.
        }
      }

      const stillCurrentSelection = selectedTableRef.current?.id === selectedTableId;
      if (postCheckoutRequestIdRef.current !== requestId || !stillCurrentSelection) {
        return;
      }

      if (effectiveTicketId) {
        setCurrentTicketId(effectiveTicketId);
        currentTicketIdRef.current = effectiveTicketId;

        const currentTable = selectedTableRef.current;
        if (currentTable?.id === selectedTableId) {
          const tableWithSession = {
            ...currentTable,
            status: TableStatus.Occupied,
            currentTicketId: effectiveTicketId,
          };
          setSelectedTable(tableWithSession);
          selectedTableRef.current = tableWithSession;
          setTables((prev) => prev.map((table) => (
            table.id === selectedTableId ? { ...table, status: TableStatus.Occupied, currentTicketId: effectiveTicketId } : table
          )));
        }

        const sessionOrders = getSessionOrders(storeOrders, effectiveTicketId);
        setActiveOrders(sessionOrders);

        const refreshedSelectedOrder = selectedOrderId
          ? sessionOrders.find((order) => order.id === selectedOrderId) ?? null
          : null;
        const firstUnpaid = sessionOrders.find((order) => !isPaidOrder(order) && order.status !== ORDER_STATUS.CANCELLED) ?? null;

        setActiveOrder(refreshedSelectedOrder ?? firstUnpaid);
      } else if (!isOnline) {
        // Offline: surface the freshly-written activeOrders verbatim and adopt the
        // first unpaid row as the active editing target so the next item-add routes
        // through the existing-order branch.
        setActiveOrders(storeOrders);
        const firstUnpaid = storeOrders.find((order) => !isPaidOrder(order) && order.status !== ORDER_STATUS.CANCELLED) ?? null;
        setActiveOrder(firstUnpaid);
      }

      setHighlightedCartIds(new Set());
      setPriceWarning(null);
      setOrderPanelOpen(false);
      toast.success(t("itemsAddedToOrder"));
    } finally {
      if (postCheckoutRequestIdRef.current === requestId) {
        setIsOrdering(false);
      }
    }
  };
  const handleCheckout = async () => {
    const hasUnpaidOrder = activeOrders.some((o: any) => !isPaidOrder(o) && o.status !== ORDER_STATUS.CANCELLED);
    // Only require selecting an existing order when there are unpaid orders already on this table
    if (hasUnpaidOrder && !activeOrder) {
      toast.error(t("selectExistingOrder"));
      return;
    }
    // Guard: never submit if activeOrder is paid/cancelled
    if (activeOrder && isOrderLocked(activeOrder.status)) {
      toast.error(t("orderLocked"));
      return;
    }

    const distinctOfferIds = Array.from(
      new Set(cart.map((item) => item.offerLineOfferId).filter((id): id is number => id != null))
    );
    const singleOfferId = distinctOfferIds.length === 1 ? distinctOfferIds[0] : undefined;

    const validation = await validateOrderPrice({
      offerId: singleOfferId,
      offerQty: singleOfferId ? offerQty : undefined,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.isComplimentary ? 0 : item.totalPrice / item.quantity,
      })),
    });

    if (validation?.unavailableItems && validation.unavailableItems.length > 0) {
      const nextHighlights = new Set(
        cart
          .filter((item) => validation.unavailableItems.includes(item.product.name))
          .map((item) => item.cartId),
      );
      setHighlightedCartIds(nextHighlights);
      validation.unavailableItems.forEach((name) => {
        toast.warning(`المنتج ${name} غير متاح حاليًا / ${name} not available now`);
      });
    }

    await submitCurrentCart();
  };
  // Calculations
  const subTotal = cart.reduce((sum, item) => {
    return sum + (item.isComplimentary ? 0 : item.totalPrice);
  }, 0);

  const discountAmount = subTotal * (discountPercentage / 100);
  // Affiliation group discount preview — applied after the manual discount, mirroring the
  // backend. The backend re-resolves and snapshots the authoritative value at order creation.
  const discountGroupType = selectedDiscountGroup?.discountType ?? 0;
  const discountGroupValue = selectedDiscountGroup?.discountValue ?? 0;
  const discountGroupAmount = computeGroupDiscountAmount(subTotal - discountAmount, discountGroupType, discountGroupValue);
  // Loyalty Points Deduction
  let pointsDeduction = 0;
  if (selectedCustomer && redeemPoints && selectedCustomer.points > 0) {
    // Logic: Deduct points up to the order total, but keeping in mind subTotal - discountAmount
    const amountAfterGeneralDiscount = subTotal - discountAmount - discountGroupAmount;
    pointsDeduction = Math.min(selectedCustomer.points, amountAfterGeneralDiscount);
  }
  const afterDiscount = Math.max(0, subTotal - discountAmount - discountGroupAmount - pointsDeduction);
  const serviceChargeAmount = Math.round(afterDiscount * (serviceChargeRate / 100) * 100) / 100;
  const taxAmount = Math.round((afterDiscount + serviceChargeAmount) * (taxRate / 100) * 100) / 100;
  // const finalTotal = afterDiscount + serviceChargeAmount + taxAmount;
  const finalTotal = subTotal;

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  // When cart is empty but there is an active unpaid order, display the existing order amounts
  const activeOrderSubtotal = activeOrder?.subtotal ?? 0;
  const activeOrderTotal = activeOrder?.totalAmount ?? 0;
  const displaySubtotal = cart.length === 0 && activeOrder ? activeOrderSubtotal : subTotal;
  const displayDiscountAmount = cart.length === 0 && activeOrder ? (activeOrder?.discountAmount ?? 0) : discountAmount;
  const displayGroupDiscountAmount = cart.length === 0 && activeOrder ? (activeOrder?.discountGroupAmount ?? 0) : discountGroupAmount;
  const displayGroupDiscountType = cart.length === 0 && activeOrder ? (activeOrder?.discountGroupType ?? 0) : discountGroupType;
  const displayGroupDiscountValue = cart.length === 0 && activeOrder ? (activeOrder?.discountGroupValue ?? 0) : discountGroupValue;
  const displayGroupDiscountName = cart.length === 0 && activeOrder ? (activeOrder?.discountGroupName ?? "") : (selectedDiscountGroup?.name ?? "");
  const displayTotal = cart.length === 0 && activeOrder ? activeOrderTotal : finalTotal;

  // SignalR Listener for Ready Orders
  useEffect(() => {
    let cancelled = false;
    const connection = new HubConnectionBuilder()
      .withUrl(appendBranchQuery(config.signalRUrl), {
        accessTokenFactory: () => useAuthStore.getState().user?.token || ""
      })
      .withAutomaticReconnect()
      .build();
    const startConnection = async () => {
      try {
        await connection.start();
        if (cancelled) { connection.stop().catch(() => {}); return; }
        console.log("POS Connected to KitchenHub");
        connection.on("OrderReady", async (order: { orderId?: string; tableName: string; tableId: string; orderNumber: string; orderSequenceNumber?: string | null }) => {
          toast(`🔔 ${order.tableName || "Table ?"} Order Ready!`, {
            description: `Order ${getOrderDisplayNumber(order)}`,
            action: {
              label: "OK",
              onClick: () => console.log("Acknowledged"),
            },
            duration: 5000,
          });
          const storeState = usePosStore.getState();
          const currentTable = storeState.selectedTable;
          if (!currentTable || currentTable.id !== order.tableId) return;
          const refreshedOrders = await loadAndCacheTableOrders(currentTable);
          // Filter to current session using centralized function (all statuses, ticketId only)
          const sessionOrders = getSessionOrders(refreshedOrders, currentTicketIdRef.current);
          storeState.setActiveOrders(sessionOrders);
          const selectedOrderId = storeState.activeOrder?.id;
          const refreshedSelectedOrder = selectedOrderId
            ? sessionOrders.find((o: any) => o.id === selectedOrderId) ?? null
            : null;
          storeState.setActiveOrder(refreshedSelectedOrder && !isOrderLocked(refreshedSelectedOrder.status) ? refreshedSelectedOrder : null);
        });
        connection.on("OrderPaid", async (payload: any) => {
          console.log("[OrderPaid Event] Received:", payload);
          
          const paidOrderId = payload?.orderId || payload?.OrderId;
          const paidOrderNumber = payload?.orderNumber || payload?.OrderNumber;
          const paidTableName = payload?.tableName || payload?.TableName;
          const paidTableId = payload?.tableId || payload?.TableId;
          const paidOrderStatus = payload?.status || payload?.Status || ORDER_STATUS.PAID;
          console.log(`[OrderPaid Event] Parsed: orderId=${paidOrderId}, orderNumber=${paidOrderNumber}, tableName=${paidTableName}, tableId=${paidTableId}`);
          const storeState = usePosStore.getState();
          const currentTable = storeState.selectedTable;
          const currentTableTicketId = currentTable ? normalizeTicketId(currentTable.currentTicketId) : 0;
          const normalize = (value?: string) => String(value || "").trim().toLowerCase();
          const affectsCurrentTableById = !!currentTable && !!paidOrderId && (
            storeState.activeOrder?.id === paidOrderId ||
            storeState.activeOrders.some((order: any) => order.id === paidOrderId)
          );
          const affectsCurrentTableByName = !!currentTable && !!paidTableName &&
            normalize(storeState.selectedTable?.name) === normalize(String(paidTableName));
          const affectsCurrentTable = affectsCurrentTableById || affectsCurrentTableByName;
          console.log(`[OrderPaid Event] affectsCurrentTable=${affectsCurrentTable}, currentTable=${currentTable?.name}`);
          if (affectsCurrentTable) {
            const paidSessionTicketId = currentTicketIdRef.current ?? (currentTableTicketId > 0 ? currentTableTicketId : null);
            if (paidSessionTicketId) {
              setCurrentTicketId(paidSessionTicketId);
              currentTicketIdRef.current = paidSessionTicketId;
            }
            const nextOrders = storeState.activeOrders.map((order: any) => {
              const isPaidTarget = (!!paidOrderId && order.id === paidOrderId)
                || (!!paidOrderNumber && order.orderNumber === paidOrderNumber);
              if (!isPaidTarget) return order;
              return {
                ...order,
                status: paidOrderStatus,
                paymentMethod: payload?.paymentMethod || payload?.PaymentMethod,
              };
            });
            // Filter to current session using centralized function
            const sessionOrders = getSessionOrders(nextOrders, paidSessionTicketId);
            storeState.setActiveOrders(sessionOrders);
            const selectedOrderId = storeState.activeOrder?.id;
            // Keep the paid order visible in activeOrder — do NOT clear it just because it became Paid
            const nextSelectedOrder = selectedOrderId
              ? sessionOrders.find((order: any) => order.id === selectedOrderId) ?? null
              : null;
            storeState.setActiveOrder(nextSelectedOrder);
            if (currentTable) {
              const updatedTable = { ...currentTable, status: TableStatus.Reserved, currentTicketId: paidSessionTicketId };
              storeState.setSelectedTable(updatedTable);
              console.log(`[OrderPaid Event] Updated local table status to Reserved: ${currentTable.name}`);
            }
          }
          setTables((prev) =>
            prev.map((table) => {
              const tableNameMatches = !!paidTableName && normalize(table.name) === normalize(String(paidTableName));
              const tableIdMatches = !!paidTableId && table.id === paidTableId;
              const currentTableMatches = !!currentTable && table.id === currentTable.id && affectsCurrentTable;
              if (tableNameMatches || tableIdMatches || currentTableMatches) {
                // Persist Reserved status to backend
                const tableId = tableIdMatches ? paidTableId : (currentTableMatches ? currentTable?.id : table.id);
                const tableTicketId = normalizeTicketId(table.currentTicketId);
                const paidSessionTicketId = currentTicketIdRef.current
                  ?? (tableTicketId > 0 ? tableTicketId : null)
                  ?? (currentTableTicketId > 0 ? currentTableTicketId : null);
                if (tableId) {
                  console.log(`[OrderPaid Event] Calling updateTableStatus for table ${tableId}`);
                  updateTableStatus(tableId, TableStatus.Reserved)
                    .then((success) => {
                      console.log(`[OrderPaid Event] updateTableStatus result: ${success}`);
                    })
                    .catch((err) => {
                      console.error(`[OrderPaid Event] Failed to update table ${tableId} status to Reserved:`, err);
                    });
                }
                return { ...table, status: TableStatus.Reserved, currentTicketId: paidSessionTicketId };
              }
              return table;
            })
          );
          toast.success(paidOrderNumber ? `Order ${getPayloadOrderDisplayNumber(payload)} marked as paid.` : "An order was marked as paid.");
        });
        const refreshCurrentTableForCancel = async (payload: any) => {
          const orderId = payload?.orderId || payload?.OrderId;
          const storeState = usePosStore.getState();
          const currentTable = storeState.selectedTable;
          if (!currentTable || !storeState.activeOrders.some((order: any) => order.id === orderId)) return;

          const refreshedOrders = await loadAndCacheTableOrders(currentTable);
          const sessionOrders = getSessionOrders(refreshedOrders, currentTicketIdRef.current);
          storeState.setActiveOrders(sessionOrders);
          const selectedOrderId = storeState.activeOrder?.id;
          storeState.setActiveOrder(
            selectedOrderId ? sessionOrders.find((order: any) => order.id === selectedOrderId) ?? null : null
          );
        };
        connection.on("CancelRequested", refreshCurrentTableForCancel);
        connection.on("CancellationResolved", async (payload: any) => {
          const approvalStatus = payload?.approvalStatus || payload?.ApprovalStatus;
          const orderItemId = payload?.orderItemId || payload?.OrderItemId;
          if (approvalStatus === "Rejected" && orderItemId) {
            setRejectedCancelItems((prev) => new Set([...prev, String(orderItemId)]));
          }
          await refreshCurrentTableForCancel(payload);
        });
      } catch (err: any) {
        if (!cancelled) {
          console.warn("SignalR could not connect (backend may not be running):", err.message);
        }
      }
    };
    startConnection();
    return () => {
      cancelled = true;
      if (connection.state === HubConnectionState.Connected) {
        connection.stop().catch(() => {});
      }
    };
  // branchVersion: the hub connection carries the branch group in its URL, so a
  // branch switch must tear down and rejoin as the newly-active branch.
  }, [isOrderLocked, branchVersion]);
  // --- RENDER TABLE SELECTION SCREEN ---
  if (!selectedTable) {
    // Stats for the summary strip
    const totalCount = tables.length;
    const availableCount = tables.filter((t) => t.status === TableStatus.Free).length;
    const occupiedCount = tables.filter((t) => t.status === TableStatus.Occupied).length;
    const reservedCount = tables.filter((t) => t.status === TableStatus.Reserved).length;

    // Group search-filtered tables by section for rendering
    const groupedSections = groupTablesBySection(searchFilteredTables);
    const sectionNames = Object.keys(groupedSections);

    return (
      <div className="pos-root min-h-screen bg-[#F4F5F7] flex flex-col">
        <AppHeader />
        <div className="container mx-auto px-6 py-8 max-w-6xl">

          {/* Page header row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{t("tableSelection")}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{t("tableSelectionDesc")}</p>
            </div>
            {fromCashier ? (
              <button
                type="button"
                onClick={() => router.push("/ntxcashierpos")}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors shadow-sm hover:bg-primary/90"
              >
                <ArrowLeft className="rtl:-scale-x-100 w-4 h-4" />
                {t("backLabel") || "Back to Cashier"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/ntxtakeawaypos")}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors shadow-sm hover:bg-primary/90"
              >
                <ShoppingBag className="w-4 h-4" />
                {t("takeawayOrderTitle")}
              </button>
            )}
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "All Tables",  count: totalCount,     dot: "bg-slate-400" },
              { label: "Available",   count: availableCount, dot: "bg-green-500" },
              { label: "Occupied",    count: occupiedCount,  dot: "bg-[#E8651A]" },
              { label: "Reserved",    count: reservedCount,  dot: "bg-amber-400" },
            ].map(({ label, count, dot }) => (
              <div
                key={label}
                className="bg-white border border-slate-200 rounded-[11px] px-4 py-3 flex items-center gap-3"
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                <div>
                  <p className="text-[22px] font-bold text-slate-800 leading-none">{count}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Zone filter pills + search */}
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveCategory("__all__")}
                className={`px-4 py-1.5 rounded-full border text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === "__all__"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-slate-600 border-slate-200 hover:border-primary/30 hover:text-primary"
                }`}
              >
                All {totalCount}
              </button>
              {categoryPills.map((category) => {
                const catCount = tables.filter((t) => (t.categoryName?.trim() || "") === category).length;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-1.5 rounded-full border text-sm font-semibold whitespace-nowrap transition-colors ${
                      activeCategory === category
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-slate-600 border-slate-200 hover:border-primary/30 hover:text-primary"
                    }`}
                  >
                    {category} {catCount}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tables..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="ps-9 pe-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-primary transition-colors w-48"
              />
            </div>
          </div>

          {/* Table grid grouped by section */}
          {isLoadingTables ? (
            <div className="text-center py-16 text-slate-400">{t("loadingTableLayout")}</div>
          ) : sectionNames.length === 0 ? (
            <div className="text-center py-16 text-slate-400">{t("noTablesMsg")}</div>
          ) : (
            sectionNames.map((section) => (
              <SectionGroup
                key={section}
                sectionName={section}
                tables={groupedSections[section]}
                onTableClick={handleTableClick}
                defaultOpen={true}
              />
            ))
          )}
        </div>
      </div>
    );
  }
  // --- RENDER POS SCREEN ---
  const isActiveOrderLocked = !!activeOrder && (isOrderLocked(activeOrder.status) || isPaidOrder(activeOrder));
  const hasUnpaidOrder = activeOrders.some((o: any) => !isPaidOrder(o) && o.status !== ORDER_STATUS.CANCELLED);
  const isEditingUnpaidOrder = !!activeOrder && !isActiveOrderLocked;
  const isCartLocked = hasUnpaidOrder && !isEditingUnpaidOrder; // Locked only when there are existing unpaid orders and none is selected
  
  return (
    <div className="pos-root flex h-screen w-full bg-slate-50 flex-col overflow-hidden">
      <AppHeader />
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* LEFT SIDE: Product Grid */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pb-[4.5rem] sm:p-6 sm:pb-6 xl:pb-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button variant="ghost" className="w-fit gap-2" onClick={handleBackToTables}>
                  <ArrowLeft className="rtl:-scale-x-100 w-4 h-4" /> {t("backToTables")}
                </Button>
                <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">{t("menuLabel")} ({selectedTable.name})</h1>
              </div>
              <ProductSelectionPanel
                products={products}
                offers={offers}
                currency={currency}
                disabled={isCartLocked || isActiveOrderLocked}
                onProductSelect={handleProductClick}
                onProductQuickView={handleQuickViewProduct}
                onSelectOffer={handleOfferSelect}
              />
            </div>
            {/* RIGHT SIDE: Cart / Ticket — desktop (xl+) only */}
            <div className="hidden xl:flex xl:w-[22rem] xl:min-w-[20rem] xl:flex-col xl:overflow-hidden xl:border-s xl:border-slate-200 xl:bg-white xl:shadow-xl 2xl:w-[24rem]">
              {/* Header */}
              <div className="flex-shrink-0 border-b border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-slate-800">{t("orderTicketTitle")}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                      <span>
                        {t("tableCol")}: <span className="font-bold text-primary">{selectedTable.name}</span>
                      </span>
                      {activeOrders.length > 0 && activeOrders[0].ticketId && (
                        <span className="text-slate-700">{t("sessionLabel")}: <span className="font-bold">{t("ticketLabel")} #{activeOrders[0].ticketId}</span></span>
                      )}
                    </p>
                  </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {(() => {
                      const hasUnpaidForClear = activeOrders.some((o: any) => !isPaidOrder(o) && o.status !== ORDER_STATUS.CANCELLED);
                      return (
                        <button
                          onClick={handleClearTable}
                          disabled={hasUnpaidForClear}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                            hasUnpaidForClear
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-destructive/10 hover:bg-destructive/20 text-destructive"
                          }`}
                          title={hasUnpaidForClear ? t("settleOrdersFirst") : t("clearSessionHint")}
                        >
                          {t("clearSession")}
                        </button>
                      );
                    })()}
                  </div>
                </div>
                {/* Customer Search Trigger */}
                <div className="mt-4">
                  <CustomerLoyaltyModal />
                </div>
              </div>
              {/* Orders + Cart combined single scroll */}
              <div className="min-h-0 flex-1 overflow-y-auto">
              {/* All Orders for this table */}
              {activeOrders.length > 0 && (
                <div className="space-y-2 px-4 pt-4">
                  {activeOrders.map((order: any) => {
                    const groupedOrder = splitOrderItemsForOfferDisplay(order);
                    const offerDisplayName = locale === "ar"
                      ? (order.offerNameAr || order.offerName || "")
                      : (order.offerName || order.offerNameAr || "");
                    const offerContentsSummary = buildOfferContentsSummary(order.offerProducts || [], locale);
                    const orderCancelPending = hasPendingCancellation(order);
                    const orderCustomerName = locale === "ar"
                      ? (order.customerNameAr || order.customerName)
                      : (order.customerName || order.customerNameAr);

                    return (
                    <div
                      key={order.id}
                      onClick={() => {
                        if (!isOrderLocked(order.status) && !isPaidOrder(order)) setActiveOrder(order);
                      }}
                      className={`rounded-xl border p-3 space-y-1.5 transition-colors ${
                        isOrderLocked(order.status) || isPaidOrder(order)
                          ? 'cursor-default opacity-80'
                          : 'cursor-pointer'
                      } ${
                        order.id === activeOrder?.id
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2 text-primary font-semibold text-sm">
                          <ChefHat size={14} />
                          <span>{t("orderLabel")} {getOrderDisplayNumber(order)}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-slate-200 text-slate-700">({t("ticketLabel")} #{order.ticketId})</span>
                          {isPaidOrder(order) && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-success/20 text-success sm:ms-auto">{t("statusPaid")}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrderStageBadgeClass(order)}`}>
                            {getOrderStageLabel(order)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                          {["New", "Pending", "Preparing", "Ready"].includes(order.status) && !isPaidOrder(order) && (
                            <button
                              className="ms-1 inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-[10px] font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={orderCancelPending}
                              onClick={() => {
                                if (orderCancelPending) return;
                                setCancelOrderSnapshot({
                                  id: order.id,
                                  orderNumber: order.orderNumber,
                                  orderSequenceNumber: order.orderSequenceNumber,
                                  tableName: order.tableName,
                                  items: (order.items ?? []).map((i: any) => ({
                                    id: i.id ?? "",
                                    productName: i.productName,
                                    quantity: i.quantity,
                                    price: i.unitPrice ?? (i.lineTotalAmount != null ? i.lineTotalAmount / Math.max(1, i.quantity) : 0),
                                  })),
                                  totalAmount: order.totalAmount,
                                });
                                setCancelItemTarget({});
                              }}
                              title={orderCancelPending ? t("cancelPendingButton") : t("cancelOrderButton")}
                            >
                              <Ban className="h-2.5 w-2.5" />
                              {orderCancelPending ? t("cancelPendingButton") : t("cancelOrderButton")}
                            </button>
                          )}
                        </div>
                      </div>
                      {(orderCustomerName || order.customerPhone) && (
                        <div className="text-xs text-slate-500">
                          {t("customerLabel")}: {orderCustomerName || order.customerPhone}
                          {orderCustomerName && order.customerPhone ? ` - ${order.customerPhone}` : ""}
                        </div>
                      )}
                      <ul className="space-y-0.5">
                        {groupedOrder.offerBundles.length > 0 ? (
                          groupedOrder.offerBundles.map((bundle, bundleIdx) => {
                            const bundleContentsSummary = buildOfferContentsSummary(bundle.bundledOfferProducts || [], locale);
                            const bundleDisplayName = bundle.productName || (locale === "ar" ? "عرض" : "Offer");
                            const representativeChildId = bundle.bundledOfferProducts?.find((c) => !!c.orderItemId)?.orderItemId;
                            const offerCancelPending = !!representativeChildId && hasPendingItemCancellation(order, representativeChildId);
                            const offerCancelLabel = locale === "ar" ? "إلغاء العرض" : "Cancel Offer";
                            return (
                              <li key={`bundle-${order.id}-${bundleIdx}`} className="flex items-start justify-between gap-2 rounded-md bg-amber-50/80 px-2 py-1 text-xs text-amber-900">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Gift className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span className="font-semibold">
                                      {locale === "ar" ? "عرض" : "Offer"}: {bundleDisplayName}
                                    </span>
                                  </div>
                                  {bundleContentsSummary && (
                                    <div className="mt-0.5 text-[10px] text-amber-700/80">{bundleContentsSummary}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-semibold">{formatCurrency(bundle.lineTotalAmount ?? 0, currency)}</span>
                                  {order.id === activeOrder?.id && !isPaidOrder(order) && (
                                    <>
                                      <button
                                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-200/60 transition-colors"
                                        title={locale === "ar" ? "تعديل ملاحظة العرض" : "Add note"}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOfferNoteValue(order.offerNote ?? "");
                                          setOfferNoteDialog({ orderId: order.id, currentNote: order.offerNote ?? "" });
                                        }}
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                        title={offerCancelPending ? t("cancelPendingButton") : offerCancelLabel}
                                        disabled={offerCancelPending || !representativeChildId}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!representativeChildId || offerCancelPending) return;
                                          setCancelOrderSnapshot({
                                            id: order.id,
                                            orderNumber: order.orderNumber,
                                            orderSequenceNumber: order.orderSequenceNumber,
                                            tableName: order.tableName,
                                            items: (order.items ?? []).map((i: any) => ({
                                              id: i.id ?? "",
                                              productName: i.productName,
                                              quantity: i.quantity,
                                              price: i.unitPrice ?? (i.lineTotalAmount != null ? i.lineTotalAmount / Math.max(1, i.quantity) : 0),
                                            })),
                                            totalAmount: order.totalAmount,
                                          });
                                          setCancelItemTarget({ itemId: representativeChildId, itemName: bundleDisplayName });
                                        }}
                                      >
                                        <Ban className="h-3 w-3" />
                                        {offerCancelPending ? t("cancelPendingButton") : offerCancelLabel}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </li>
                            );
                          })
                        ) : (
                          !!order.offerId && (
                            <li className="flex items-start justify-between gap-2 rounded-md bg-amber-50/80 px-2 py-1 text-xs text-amber-900">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Gift className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                  <span className="font-semibold">
                                    {locale === "ar" ? "عرض" : "Offer"}: {offerDisplayName}
                                  </span>
                                </div>
                                {offerContentsSummary && (
                                  <div className="mt-0.5 text-[10px] text-amber-700/80">{offerContentsSummary}</div>
                                )}
                                {order.offerNote && (
                                  <div className="mt-0.5 text-[10px] italic text-amber-700/70">📝 {order.offerNote}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {groupedOrder.offerCoveredTotal > 0 && (
                                  <span className="font-semibold">{formatCurrency(groupedOrder.offerCoveredTotal, currency)}</span>
                                )}
                                {order.id === activeOrder?.id && !isPaidOrder(order) && (
                                  <>
                                    <button
                                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-200/60 transition-colors"
                                      title={locale === "ar" ? "تعديل ملاحظة العرض" : "Add note"}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOfferNoteValue(order.offerNote ?? "");
                                        setOfferNoteDialog({ orderId: order.id, currentNote: order.offerNote ?? "" });
                                      }}
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                      title={hasPendingCancellation(order) ? t("cancelPendingButton") : (locale === "ar" ? "إلغاء العرض" : "Cancel Offer")}
                                      disabled={hasPendingCancellation(order)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (hasPendingCancellation(order)) return;
                                        setCancelOrderSnapshot({
                                          id: order.id,
                                          orderNumber: order.orderNumber,
                                          orderSequenceNumber: order.orderSequenceNumber,
                                          tableName: order.tableName,
                                          items: (order.items ?? []).map((i: any) => ({
                                            id: i.id ?? "",
                                            productName: i.productName,
                                            quantity: i.quantity,
                                            price: i.unitPrice ?? (i.lineTotalAmount != null ? i.lineTotalAmount / Math.max(1, i.quantity) : 0),
                                          })),
                                          totalAmount: order.totalAmount,
                                        });
                                        setCancelItemTarget({});
                                      }}
                                    >
                                      <Ban className="h-3 w-3" />
                                      {hasPendingCancellation(order) ? t("cancelPendingButton") : (locale === "ar" ? "إلغاء العرض" : "Cancel Offer")}
                                    </button>
                                  </>
                                )}
                              </div>
                            </li>
                          )
                        )}
                        {groupedOrder.regularItems.map((item: any, idx: number) => {
                          const itemCancelPending = hasPendingItemCancellation(order, item.id);

                          return (
                          <li key={item.id || idx} className="flex flex-col gap-2 text-xs text-foreground sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{item.quantity}× {getItemDisplayName(item)}</span>
                                {(item.selectedOptionName || item.selectedOptionNameAr) && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                    {locale === 'ar' ? 'النوع' : 'Variant'}: {locale === 'ar' && item.selectedOptionNameAr ? item.selectedOptionNameAr : item.selectedOptionName}
                                  </span>
                                )}
                                {!isPaidOrder(order) && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                    getItemPrepState(item.itemStatus) === 'Ready'
                                      ? 'bg-success/20 text-success'
                                      : 'bg-warning/20 text-warning'
                                  }`}>{getItemPrepState(item.itemStatus)}</span>
                                )}

                              </div>
                              {Array.isArray(item.recipeSnapshot) && item.recipeSnapshot.some((r: any) => r.sourceAlternativeId) && (
                                <div className="mt-0.5 space-y-0.5 ms-4">
                                  {item.recipeSnapshot.filter((r: any) => r.sourceAlternativeId).map((r: any, swapIdx: number) => (
                                    <div key={`swap-${swapIdx}`} className="flex items-center gap-1.5 text-[10px] text-amber-700">
                                      <span>↪</span>
                                      <span>{locale === 'ar' && r.sourceAlternativeNameAr ? r.sourceAlternativeNameAr : r.sourceAlternativeName}</span>
                                      <span className="text-muted-foreground">
                                        ({locale === 'ar' && r.rawMaterialNameAr ? r.rawMaterialNameAr : r.rawMaterialName})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="mt-0.5 space-y-0.5 ms-4">
                                  {item.modifiers.map((mod: any, modIdx: number) => (
                                    <div key={modIdx} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                      <span className="text-primary/70">+</span>
                                      <span>{locale === 'ar' && mod.modifierNameAr ? mod.modifierNameAr : mod.modifierName}{(mod.quantity || 1) > 1 ? ` ×${mod.quantity}` : ""}</span>
                                      {mod.price > 0 && (
                                        <span className="text-primary font-semibold">{formatCurrency(mod.price * (mod.quantity || 1), currency)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.notes && <div className="italic text-muted-foreground truncate">{item.notes}</div>}
                            </div>
                            {order.id === activeOrder?.id && !isPaidOrder(order) && (
                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                  className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
                                  onClick={() => handleEditOrderItem(order, item)}
                                  disabled={isOrderLocked(order.status) || isItemReady(item) || !item.id || !item.productId}
                                  title={t("edit")}
                                >
                                  {t("edit")}
                                </button>
                                {item.id && rejectedCancelItems.has(item.id) ? (
                                  <span className="inline-flex items-center rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                    {locale === 'ar' ? 'تم التجهيز بالفعل' : 'Already prepared'}
                                  </span>
                                ) : (
                                  <button
                                    className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-[10px] font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                      if (isOrderLocked(order.status) || itemCancelPending || !item.id) return;
                                      setCancelOrderSnapshot({
                                        id: order.id,
                                        orderNumber: order.orderNumber,
                                        orderSequenceNumber: order.orderSequenceNumber,
                                        tableName: order.tableName,
                                        items: (order.items ?? []).map((i: any) => ({
                                          id: i.id ?? "",
                                          productName: i.productName,
                                          quantity: i.quantity,
                                          price: i.unitPrice ?? (i.lineTotalAmount != null ? i.lineTotalAmount / Math.max(1, i.quantity) : 0),
                                        })),
                                        totalAmount: order.totalAmount,
                                      });
                                      setCancelItemTarget({ itemId: item.id, itemName: getItemDisplayName(item) });
                                    }}
                                    disabled={isOrderLocked(order.status) || itemCancelPending || !item.id}
                                    title={itemCancelPending ? t("cancelPendingButton") : t("cancelOrderButtonItem")}
                                  >
                                    <Ban className="h-2.5 w-2.5" />
                                    {itemCancelPending ? t("cancelPendingButton") : t("cancelOrderButtonItem")}
                                  </button>
                                )}
                              </div>
                            )}
                          </li>
                        );
                        })}
                      </ul>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-1 text-xs font-bold text-foreground">
                        <span>{t("total")}</span>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(order.totalAmount ?? 0, currency)}</span>
                          {(order.items?.length ?? 0) > 0 && (
                            <PrintReceiptButton order={order} size="sm" />
                          )}
                        </div>
                      </div>
                      {/* Ready/Served buttons for dine-in orders */}
                      {!hasAllItemsReady(order)
                        && order.status !== ORDER_STATUS.SERVED
                        && order.status !== ORDER_STATUS.COMPLETED
                        && order.status !== ORDER_STATUS.CANCELLED && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkOrderReady(order);
                          }}
                          disabled={markingReadyOrderId === order.id}
                          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#16A34A] text-white font-bold transition-colors hover:bg-[#16A34A]/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-xs"
                        >
                          {markingReadyOrderId === order.id ? (
                            <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Ready
                        </button>
                      )}
                      {hasAllItemsReady(order)
                        && order.status !== ORDER_STATUS.SERVED
                        && order.status !== ORDER_STATUS.COMPLETED
                        && order.status !== ORDER_STATUS.CANCELLED && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkOrderPickedUp(order);
                          }}
                          disabled={markingPickedUpOrderId === order.id}
                          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#7C3AED] text-white font-bold transition-colors hover:bg-[#7C3AED]/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-xs"
                        >
                          {markingPickedUpOrderId === order.id ? (
                            <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <Truck className="h-3.5 w-3.5" />
                          )}
                          {t("served")}
                        </button>
                      )}
                    </div>
                  )})}
                </div>
              )}
              {/* Cart Items List */}
              <div className="space-y-3 p-4">
                {cart.length === 0 && !activeOrder ? (
                  <div className="flex min-h-[8rem] items-center justify-center px-4 text-center text-sm italic text-slate-400 xl:h-full">
                    {hasUnpaidOrder
                      ? t("selectOrderPrompt")
                      : t("emptyCart")}
                  </div>
                ) : cart.length === 0 && activeOrder ? (
                  <div className="flex min-h-[8rem] items-center justify-center px-4 text-center text-sm italic text-slate-400 xl:h-full">
                    {isActiveOrderLocked
                      ? t("orderLocked")
                      : activeOrder
                      ? `${t("addingToOrder")} ${getOrderDisplayNumber(activeOrder)}. ${t("pickItemsPrompt")}`
                      : t("pickItemsPrompt")}
                  </div>
                ) : (
                  <>
                  {cartOfferDisplay.offerGroups.map((group) => {
                    const groupOffer = offers.find((o) => o.id === group.offerId);
                    const groupOfferName = locale === "ar"
                      ? (groupOffer?.nameAr || groupOffer?.name || group.items[0]?.offerLineName || "Offer")
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
                      <div
                        key={group.offerId}
                        className={`flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                          group.items.some((item) => highlightedCartIds.has(item.cartId))
                            ? 'border-amber-400 bg-amber-50'
                            : group.items.every((item) => item.isComplimentary)
                              ? 'border-success/20 bg-success/5'
                              : 'border-amber-200 bg-amber-50/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Gift className="h-4 w-4 text-amber-600" />
                            <span className={`font-semibold ${group.items.every((item) => item.isComplimentary) ? 'text-success' : 'text-amber-900'}`}>
                              {locale === "ar" ? "عرض" : "Offer"}: {groupOfferName}
                            </span>
                            {group.items.every((item) => item.isComplimentary) && <span className="text-[10px] bg-success/20 text-success px-1 rounded">COMP</span>}
                          </div>
                          {groupContentsSummary && (
                            <div className="mt-1 text-xs text-amber-700/80">{groupContentsSummary}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className={`font-bold ${group.items.every((item) => item.isComplimentary) ? 'text-success line-through decoration-muted-foreground/50' : 'text-foreground'}`}>
                            {group.items.every((item) => item.isComplimentary)
                              ? formatCurrency(0, currency)
                              : formatCurrency(group.offerTotal, currency)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 transition-colors ${group.items.every((item) => item.isComplimentary) ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'}`}
                            onClick={() => toggleOfferComplimentary(group.offerId)}
                            title="Mark Complimentary"
                          >
                            <Gift className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/5"
                            onClick={() => removeOfferFromCart(group.offerId)}
                          >
                            <span className="sr-only">Remove</span>
                            ✕
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {cartOfferDisplay.regularItems.map((item) => (
                    <div
                      key={item.cartId}
                      className={`flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                        highlightedCartIds.has(item.cartId)
                          ? 'border-amber-400 bg-amber-50'
                          : item.isComplimentary
                            ? 'bg-success/5 border-success/20'
                            : 'bg-muted border-border'
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-semibold ${item.isComplimentary ? 'text-success' : 'text-foreground'}`}>
                            {item.product.name}
                          </span>
                          {item.selectedOption && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              {locale === 'ar' ? 'النوع' : 'Variant'}: {locale === 'ar' && item.selectedOption.nameAr ? item.selectedOption.nameAr : item.selectedOption.name}
                            </span>
                          )}
                          {item.isComplimentary && <span className="text-[10px] bg-success/20 text-success px-1 rounded">COMP</span>}
                        </div>
                        {item.selectedModifiers.length > 0 && (
                          <div className="text-xs mt-1.5 space-y-1">
                            {item.selectedModifiers.map((m, i) => {
                              const modifierPrice = resolveDineInModifierUnitPrice(item.product, m);
                              return (
                                <div key={i} className="flex items-center justify-between gap-2">
                                  <span className="text-slate-500">+ {m.displayName || m.name}{(m.quantity || 1) > 1 ? ` ×${m.quantity}` : ""}</span>
                                  {modifierPrice > 0 && (
                                    <span className="text-primary font-semibold whitespace-nowrap">+{formatCurrency(modifierPrice * (m.quantity || 1), currency)}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {(item.selectedRecipeAlternatives?.length ?? 0) > 0 && !item.selectedOption && (
                          <div className="text-xs mt-1.5 space-y-1">
                            {item.selectedRecipeAlternatives!.map((swap, i) => {
                              const row = item.product.recipeItems?.find((ri) => ri.id === swap.recipeItemId);
                              const alt = row?.alternatives?.find((a) => a.id === swap.alternativeId);
                              if (!row || !alt) return null;
                              const origName = locale === "ar" && row.rawMaterialNameAr ? row.rawMaterialNameAr : row.rawMaterialName;
                              const altName = locale === "ar" && (alt.nameAr || alt.rawMaterialNameAr)
                                ? (alt.nameAr || alt.rawMaterialNameAr)
                                : (alt.name || alt.rawMaterialName);
                              const priceImpact = resolveRecipeAlternativePriceImpactForRow(item.product, row, alt);
                              const priceLabel = resolveRecipeAlternativePriceLabel(priceImpact, (amount) => formatCurrency(amount, currency));
                              return (
                                <div key={i} className="flex items-center justify-between gap-2">
                                  <span className="text-amber-600">
                                    ▸ {altName} <span className="text-slate-400">({locale === "ar" ? "بدلاً من" : "instead of"} {origName})</span>
                                  </span>
                                  {priceLabel && (
                                    <span className={`${priceImpact > 0 ? "text-primary" : "text-emerald-600"} font-semibold whitespace-nowrap`}>
                                      {priceLabel}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-muted-foreground mt-1 italic">Note: {item.notes}</div>
                        )}
                        <div className="text-xs text-slate-400 mt-1">x{item.quantity}</div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className={`font-bold ${item.isComplimentary ? 'text-success line-through decoration-muted-foreground/50' : 'text-foreground'}`}>
                          {item.isComplimentary ? formatCurrency(0, currency) : formatCurrency(item.totalPrice, currency)}
                        </span>
                        {/* Complimentary Toggle */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 transition-colors ${item.isComplimentary ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'}`}
                          onClick={() => toggleComplimentary(item.cartId)}
                          title="Mark Complimentary"
                        >
                          <Gift className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/5"
                          onClick={() => removeFromCart(item.cartId)}
                        >
                          <span className="sr-only">Remove</span>
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                  </>
                )}
              </div>
              </div>{/* end orders+cart scroll */}
              {/* Footer: Totals & Actions */}
              <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 p-4">
                {cartOfferDisplay.offerGroups.length > 0 && cartOfferDisplay.regularItems.length === 0 && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    {locale === "ar" ? "العروض الحالية" : "Current offers"}: {cartOfferDisplay.offerGroups.map((g) => {
                    const o = offers.find((x) => x.id === g.offerId);
                    return locale === "ar" ? (o?.nameAr || o?.name || "Offer") : (o?.name || o?.nameAr || "Offer");
                  }).join(", ")}
                  </div>
                )}
                {!(cart.length === 0 && activeOrder) && (
                  <DiscountGroupSelector
                    value={selectedDiscountGroup}
                    onChange={setDiscountGroup}
                    className="mb-4"
                  />
                )}
                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>{t("subtotal")}</span>
                    <span>{formatCurrency(displaySubtotal, currency)}</span>
                  </div>
                  {displayDiscountAmount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>{t("discount")} ({cart.length === 0 && activeOrder ? `${activeOrder.discountPercentage}%` : `%${discountPercentage}`})</span>
                      <span>-{formatCurrency(displayDiscountAmount, currency)}</span>
                    </div>
                  )}
                  {displayGroupDiscountAmount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>{displayGroupDiscountName || t("discountGroup")}{displayGroupDiscountType === 0 && displayGroupDiscountValue > 0 ? ` (${displayGroupDiscountValue}%)` : ""}</span>
                      <span>-{formatCurrency(displayGroupDiscountAmount, currency)}</span>
                    </div>
                  )}
                  {pointsDeduction > 0 && cart.length > 0 && (
                    <div className="flex justify-between text-success font-medium">
                      <div className="flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        <span>{t("loyaltyPoints")}</span>
                      </div>
                      <span>-{formatCurrency(pointsDeduction, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-lg font-bold text-slate-800">{t("total")}</span>
                    <span className="text-3xl font-bold text-slate-900">{formatCurrency(displayTotal, currency)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="w-full text-slate-600"
                    onClick={clearCart}
                    disabled={cart.length === 0 || isOrdering}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    className={`w-full text-white flex items-center gap-2 justify-center ${
                      isCartLocked || isActiveOrderLocked
                        ? 'bg-muted-foreground cursor-not-allowed'
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || isOrdering || isActiveOrderLocked || isCartLocked}
                  >
                    {isOrdering ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        {t("processing")}
                      </>
                    ) : isCartLocked ? (
                      t("selectOrderFirst")
                    ) : isActiveOrderLocked ? (
                      t("orderLocked")
                    ) : activeOrder ? (
                      t("addToOrder")
                    ) : (
                      t("placeOrder")
                    )}
                  </Button>
                </div>
              </div>
            </div>
      </div>{/* end main flex row */}

      {/* ── MOBILE + TABLET: Slide-in Order Drawer (hidden on xl where panel is inline) ── */}
      <Sheet open={orderPanelOpen} onOpenChange={setOrderPanelOpen}>
        <SheetContent
          side="end"
          className="w-[min(85vw,380px)] p-0 flex flex-col"
        >
          {/* Sheet Header */}
          <div className="flex-shrink-0 border-b border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-slate-800">{t("orderTicketTitle")}</h2>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span>{t("tableCol")}: <span className="font-bold text-primary">{selectedTable.name}</span></span>
                {activeOrders.length > 0 && activeOrders[0].ticketId && (
                  <span>{t("sessionLabel")}: <span className="font-bold">{t("ticketLabel")} #{activeOrders[0].ticketId}</span></span>
                )}
              </p>
              {(() => {
                const hasUnpaidForClear = activeOrders.some((o: any) => !isPaidOrder(o) && o.status !== ORDER_STATUS.CANCELLED);
                return (
                  <button
                    onClick={handleClearTable}
                    disabled={hasUnpaidForClear}
                    className={`self-start text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${hasUnpaidForClear ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-destructive/10 hover:bg-destructive/20 text-destructive"}`}
                  >
                    {t("clearSession")}
                  </button>
                );
              })()}
            </div>
            <div className="mt-3"><CustomerLoyaltyModal /></div>
          </div>

          {/* Sheet Active Orders + Cart combined single scroll */}
          <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Sheet Active Orders */}
          {activeOrders.length > 0 && (
            <div className="space-y-2 px-4 pt-3">
              {activeOrders.map((order: any) => {
                const groupedOrder = splitOrderItemsForOfferDisplay(order);
                const offerDisplayName = locale === "ar" ? (order.offerNameAr || order.offerName || "") : (order.offerName || order.offerNameAr || "");
                const offerContentsSummary = buildOfferContentsSummary(order.offerProducts || [], locale);
                const orderCustomerName = locale === "ar" ? (order.customerNameAr || order.customerName) : (order.customerName || order.customerNameAr);
                return (
                  <div
                    key={order.id}
                    onClick={() => { if (!isOrderLocked(order.status)) { setActiveOrder(order); setOrderPanelOpen(false); } }}
                    className={`rounded-xl border p-3 space-y-1.5 transition-colors ${isOrderLocked(order.status) ? "cursor-default opacity-80" : "cursor-pointer"} ${order.id === activeOrder?.id ? "border-primary bg-primary/5" : "border-slate-300 bg-slate-50 hover:border-slate-400"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-primary font-semibold text-sm">
                      <ChefHat size={14} />
                      <span>{t("orderLabel")} {getOrderDisplayNumber(order)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">({t("ticketLabel")} #{order.ticketId})</span>
                      {isPaidOrder(order) && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-success/20 text-success">{t("statusPaid")}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getOrderStageBadgeClass(order)}`}>{getOrderStageLabel(order)}</span>
                    </div>
                    {(orderCustomerName || order.customerPhone) && (
                      <div className="text-xs text-slate-500">
                        {t("customerLabel")}: {orderCustomerName || order.customerPhone}
                        {orderCustomerName && order.customerPhone ? ` - ${order.customerPhone}` : ""}
                      </div>
                    )}
                    {groupedOrder.offerBundles.length > 0 ? (
                      groupedOrder.offerBundles.map((bundle, bundleIdx) => (
                        <div key={`sheet-bundle-${order.id}-${bundleIdx}`} className="flex items-center justify-between gap-2 rounded-md bg-amber-50/80 px-2 py-1 text-xs text-amber-900">
                          <span className="flex items-center gap-1 font-semibold"><Gift className="h-3 w-3 text-amber-600" /> {locale === "ar" ? "عرض" : "Offer"}: {bundle.productName || (locale === "ar" ? "عرض" : "Offer")}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{formatCurrency(bundle.lineTotalAmount ?? 0, currency)}</span>
                            {order.id === activeOrder?.id && !isPaidOrder(order) && (
                              <>
                                <button
                                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-200/60 transition-colors"
                                  title={locale === "ar" ? "تعديل ملاحظة العرض" : "Add note"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOfferNoteValue(order.offerNote ?? "");
                                    setOfferNoteDialog({ orderId: order.id, currentNote: order.offerNote ?? "" });
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                                  title={locale === "ar" ? "حذف العرض" : "Remove offer"}
                                  disabled={deletingOfferId === order.id}
                                  onClick={(e) => { e.stopPropagation(); handleRemoveOffer(order, bundle.offerLineId ?? null); }}
                                >
                                  <Ban className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      !!order.offerId && (
                        <div className="flex items-center justify-between gap-2 rounded-md bg-amber-50/80 px-2 py-1 text-xs text-amber-900">
                          <span className="flex items-center gap-1 font-semibold"><Gift className="h-3 w-3 text-amber-600" /> {locale === "ar" ? "عرض" : "Offer"}: {offerDisplayName}</span>
                          {groupedOrder.offerCoveredTotal > 0 && (
                            <span className="font-semibold">{formatCurrency(groupedOrder.offerCoveredTotal, currency)}</span>
                          )}
                        </div>
                      )
                    )}
                    {groupedOrder.regularItems.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex justify-between text-xs text-slate-700">
                        <span>{item.quantity}× {getItemDisplayName(item)}</span>
                        {item.notes && <span className="italic text-slate-400">{item.notes}</span>}
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-border pt-1 text-xs font-bold gap-2">
                      <span>{t("total")}</span>
                      <div className="flex items-center gap-2">
                        <span>{formatCurrency(order.totalAmount ?? 0, currency)}</span>
                        {(order.items?.length ?? 0) > 0 && <PrintReceiptButton order={order} size="sm" />}
                      </div>
                    </div>
                    {/* Ready/Served buttons for dine-in orders */}
                    {!hasAllItemsReady(order)
                      && order.status !== ORDER_STATUS.SERVED
                      && order.status !== ORDER_STATUS.COMPLETED
                      && order.status !== ORDER_STATUS.CANCELLED && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkOrderReady(order);
                        }}
                        disabled={markingReadyOrderId === order.id}
                        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#16A34A] text-white font-bold transition-colors hover:bg-[#16A34A]/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-xs"
                      >
                        {markingReadyOrderId === order.id ? (
                          <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Ready
                      </button>
                    )}
                    {hasAllItemsReady(order)
                      && order.status !== ORDER_STATUS.SERVED
                      && order.status !== ORDER_STATUS.COMPLETED
                      && order.status !== ORDER_STATUS.CANCELLED && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkOrderPickedUp(order);
                        }}
                        disabled={markingPickedUpOrderId === order.id}
                        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#7C3AED] text-white font-bold transition-colors hover:bg-[#7C3AED]/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-xs"
                      >
                        {markingPickedUpOrderId === order.id ? (
                          <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Truck className="h-3.5 w-3.5" />
                        )}
                        {t("served")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sheet Cart Items */}
          <div className="space-y-3 p-4">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-[6rem] items-center justify-center px-4 text-center text-sm italic text-slate-400">
                {hasUnpaidOrder ? t("selectOrderPrompt") : t("emptyCart")}
              </div>
            ) : (
              <>
                {cartOfferDisplay.offerGroups.map((group) => {
                  const groupOffer = offers.find((o) => o.id === group.offerId);
                  const groupOfferName = locale === "ar"
                    ? (groupOffer?.nameAr || groupOffer?.name || group.items[0]?.offerLineName || "Offer")
                    : (groupOffer?.name || groupOffer?.nameAr || group.items[0]?.offerLineName || "Offer");
                  return (
                    <div key={group.offerId} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Gift className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="font-semibold text-amber-900 text-sm truncate">{locale === "ar" ? "عرض" : "Offer"}: {groupOfferName}</span>
                      </div>
                      <span className="font-bold text-sm shrink-0">{formatCurrency(group.offerTotal, currency)}</span>
                    </div>
                  );
                })}
                {cartOfferDisplay.regularItems.map((item) => (
                  <div key={item.cartId} className={`flex items-center justify-between gap-2 rounded-lg border p-3 ${item.isComplimentary ? "border-success/20 bg-success/5" : "border-border bg-muted"}`}>
                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold text-sm truncate ${item.isComplimentary ? "text-success" : "text-foreground"}`}>{item.product.name}</div>
                      <div className="text-xs text-slate-400">x{item.quantity}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-sm">{item.isComplimentary ? formatCurrency(0, currency) : formatCurrency(item.totalPrice, currency)}</span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/5" onClick={() => removeFromCart(item.cartId)}>✕</Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          </div>{/* end orders+cart scroll */}

          {/* Sheet Footer: Totals + Buttons */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 p-4">

            <div className="mb-3 flex items-center justify-between">
              <span className="text-base font-bold text-slate-800">{t("total")}</span>
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(displayTotal, currency)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={clearCart} disabled={cart.length === 0 || isOrdering}>
                {t("cancel")}
              </Button>
              <Button
                className={`w-full text-white ${isCartLocked || isActiveOrderLocked ? "bg-muted-foreground cursor-not-allowed" : "bg-primary hover:bg-primary/90"}`}
                onClick={handleCheckout}
                disabled={cart.length === 0 || isOrdering || isActiveOrderLocked || isCartLocked}
              >
                {isOrdering ? (
                  <><span className="me-2 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />{t("processing")}</>
                ) : isCartLocked ? t("selectOrderFirst") : isActiveOrderLocked ? t("orderLocked") : activeOrder ? t("addToOrder") : t("placeOrder")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tablet: Floating "View Order" button (md → xl) — hidden when sheet is open */}
      {!orderPanelOpen && (
        <button
          type="button"
          onClick={() => setOrderPanelOpen(true)}
          aria-label="View order"
          className="fixed bottom-6 end-6 z-40 hidden items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-xl transition active:scale-95 md:flex xl:hidden"
        >
          <ShoppingCart className="h-5 w-5" />
          {totalCartItems > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-[11px] font-bold text-primary">
              {totalCartItems}
            </span>
          )}
          View Order
        </button>
      )}

      {/* Mobile: Fixed bottom summary bar (<md) — hidden when sheet is open */}
      {!orderPanelOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-xl md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-800">{totalCartItems}</span> items
            </div>
            <span className="text-lg font-bold text-slate-800">{formatCurrency(displayTotal, currency)}</span>
            <button
              type="button"
              onClick={() => setOrderPanelOpen(true)}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <ShoppingCart className="h-4 w-4" />
              View Order
            </button>
          </div>
        </div>
      )}

        {/* Modifier Selection Modal */}
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={selectedProduct}
          onAddToCart={handleAddProductToCart}
          initialQuantity={modalInitialQuantity}
          initialNotes={modalInitialNotes}
          initialModifierIds={modalInitialModifierIds}
          initialModifierQuantities={modalInitialModifierQuantities}
          actionLabel={modalActionLabel}
          orderType={1}
        />

        <ProductQuickViewDialog
          product={quickViewProduct}
          open={quickViewProduct !== null}
          onOpenChange={(open) => {
            if (!open) setQuickViewProduct(null);
          }}
        />

        {/* Cancel Order Modal */}
        {cancelItemTarget !== null && cancelOrderSnapshot !== null && (
          <CancelOrderModal
            order={cancelOrderSnapshot}
            cancelItemId={cancelItemTarget.itemId}
            cancelItemName={cancelItemTarget.itemName}
            onClose={() => { setCancelItemTarget(null); setCancelOrderSnapshot(null); }}
            onSuccess={async (result) => {
              const orderId = cancelOrderSnapshot.id;
              const itemId = cancelItemTarget.itemId;
              const requiresKitchenApproval = result.requiresKitchenApproval === true;

              if (requiresKitchenApproval) {
                const storeState = usePosStore.getState();
                setActiveOrders(markCancelPending(storeState.activeOrders, orderId, itemId));
                if (storeState.activeOrder?.id === orderId) {
                  setActiveOrder(markCancelPending([storeState.activeOrder], orderId, itemId)[0]);
                }
              }

              setCancelItemTarget(null);
              setCancelOrderSnapshot(null);
              if (selectedTable) {
                const updated = await loadAndCacheTableOrders(selectedTable);
                const sessionOrders = requiresKitchenApproval
                  ? markCancelPending(getSessionOrders(updated, currentTicketId), orderId, itemId)
                  : getSessionOrders(updated, currentTicketId);
                setActiveOrders(sessionOrders);
                if (activeOrder && !sessionOrders.find((o: any) => o.id === activeOrder.id)) {
                  setActiveOrder(sessionOrders[0] ?? null);
                } else if (activeOrder?.id === orderId) {
                  setActiveOrder(sessionOrders.find((o: any) => o.id === orderId) ?? activeOrder);
                }
              }
            }}
            currency={currency}
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
                  (g) => (g.availableForOrderTypes & 1) !== 0 && g.modifiers.some((m) => m.isActive !== false)
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
                              const modifierPrice = resolveDineInModifierUnitPrice(line.product, {
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
              {/* Price + Qty */}
              {pendingOffer && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xl font-bold text-amber-700">{formatCurrency(pendingOffer.finalPrice * pendingOfferQty, currency)}</span>
                    {pendingOffer.originalTotal > pendingOffer.finalPrice && (
                      <span className="ms-2 text-sm text-slate-400 line-through">{formatCurrency(pendingOffer.originalTotal * pendingOfferQty, currency)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">{locale === "ar" ? "الكمية" : "Qty"}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPendingOfferQty((q) => Math.max(1, q - 1))}
                        className="w-7 h-7 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-sm"
                      >−</button>
                      <span className="w-6 text-center font-bold text-slate-800">{pendingOfferQty}</span>
                      <button
                        onClick={() => setPendingOfferQty((q) => q + 1)}
                        className="w-7 h-7 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-sm"
                      >+</button>
                    </div>
                  </div>
                </div>
              )}
              {/* Note */}
              <div className="space-y-1">
                <Label htmlFor="pending-offer-note" className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "ملاحظة خاصة" : "Special Note"}
                </Label>
                <Textarea
                  id="pending-offer-note"
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
        <Dialog open={!!offerNoteDialog} onOpenChange={(open) => { if (!open) setOfferNoteDialog(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-600" />
                {locale === "ar" ? "ملاحظة العرض" : "Offer Note"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="offer-note" className="text-sm font-semibold text-slate-700">
                {locale === "ar" ? "ملاحظة خاصة" : "Special Note"}
              </Label>
              <Textarea
                id="offer-note"
                value={offerNoteValue}
                onChange={(e) => setOfferNoteValue(e.target.value)}
                placeholder={locale === "ar" ? "e.g. بدون بصل، حار جداً" : "e.g. No onions, extra spicy"}
                className="min-h-20"
                maxLength={500}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOfferNoteDialog(null)} disabled={!!savingOfferNote}>
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={() => {
                  const order = activeOrders.find((o: any) => o.id === offerNoteDialog?.orderId);
                  if (order) handleSaveOfferNote(order);
                }}
                disabled={!!savingOfferNote}
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
