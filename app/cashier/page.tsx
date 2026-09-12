"use client"

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { usePosStore } from "@/store/posStore";
import { config } from "@/lib/config";
import { appendBranchQuery } from "@/lib/branch-selection";
import { formatCurrency } from "@/lib/currencies";
import { calculateFinalTotalAfterVoucher } from "@/lib/order-payment-totals";
import { applyPaymentToOrder, getOrderPaidAmount, getOrderRemainingAmount, getPaymentBreakdown, resolveOrderLifecycleStatus } from "@/lib/order-payments";
import { buildDiscountChange, calculateOrderDiscountTotals } from "@/lib/order-discount";
import { buildOfferContentsSummary, splitOrderItemsForOfferDisplay } from "@/lib/order-offer-display";
import { OrderDto, type OrderDiscountType } from "@/types/order";
import {
    addOrderPayment,
    getCancelLog,
    getPosLogs,
    getRequestErrorMessage,
    getVoucherAvailability,
    isNetworkRequestError,
    markOnlineOrderDispatchedStrict,
    markOnlineOrderPreparingStrict,
    markOrderAsReadyStrict,
    markOrderAsServedStrict,
    markTakeawayPickedUpStrict,
    type CancelLogEntry,
    type CashierOrdersDateFilter,
    type PosLogEntry,
    type VoucherAvailability,
} from "@/lib/api";
import { useOfflineCashierStore, applyPendingOverlay } from "@/store/offlineCashierStore";
import { useCashierOrders } from "@/lib/hooks/useCashierOrders";
import { useCashierOrderFilter } from "@/lib/hooks/useCashierOrderFilter";
import {
    enqueueMarkReadyOffline,
    enqueueMarkServedOffline,
    enqueueMarkPickupOffline,
    enqueuePaymentOffline,
} from "@/lib/offline/orders";
import { getConnectivityState, subscribeConnectivity, type ConnectivityState } from "@/lib/offline/connectivity";
import { generateActionId } from "@/lib/offline/id";
import { putOrderSnapshot } from "@/lib/offline/db";
import { markConfirmedCancelledOrderSnapshot } from "@/lib/offline/terminal-orders";
import { ORDER_STATUS } from "@/lib/status-constants";
import { OfflineBadge } from "@/components/cashier/OfflineBadge";
import { StatusControl } from "@/components/cashier/StatusControl";
import { useLocale } from "@/components/locale-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, CreditCard, Banknote, Clock, ShoppingBag, Gift, Ban, Wallet } from "lucide-react";
import * as signalR from "@microsoft/signalr";

import AppHeader from "@/components/layout/AppHeader";
import { QrMenuButton } from "@/components/qrmenu/QrMenuButton";
import { PrintReceiptButton } from "@/components/receipt/PrintReceiptButton";
import { openReceiptPrintWindow, printReceipt } from "@/lib/print-receipt";
import { refreshReceiptPrinterCache } from "@/lib/cashier-printer-cache";
import { useSettingsStore } from "@/store/settingsStore";
import { useBrandingStore } from "@/store/brandingStore";
import { useBusinessFilterStore } from "@/store/businessFilterStore";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { StatsStrip } from "@/components/cashier/StatsStrip";
import { Toolbar, StatusFilter, TypeFilter, SortOption, DateFilter, ActivityFilter } from "@/components/cashier/Toolbar";
import { OrderCard } from "@/components/cashier/OrderCard";
import { DeliveryPartnerPriceAdjustment } from "@/components/cashier/DeliveryPartnerPriceAdjustment";
import { ResendKitchenTicketModal } from "@/components/cashier/ResendKitchenTicketModal";
import { TalabatOrderDialog } from "@/components/cashier/TalabatOrderDialog";
import { PosLogList } from "@/components/cashier/PosLogList";
import { ShiftBalanceWidget } from "@/components/cashier/ShiftBalanceWidget";
import { CardPaymentMethodSelector } from "@/components/payment/CardPaymentMethodSelector";
import { VoucherControls } from "@/components/payment/VoucherControls";
import { DiscountControls } from "@/components/payment/DiscountControls";
import PaymentAdjustmentDialog from "@/components/payment/PaymentAdjustmentDialog";
import {
    getActivePaymentMethods,
    getPaymentMethodName,
    isCashPaymentMethod,
    type PaymentMethodDto,
} from "@/lib/api-payment-methods";
import { canAccessArea, getUnauthorizedRedirect } from "@/lib/authorization";
import CancelOrderModal from "@/components/cancel/CancelOrderModal";
import RefundOrderModal from "@/components/cancel/RefundOrderModal";
import {
    CASHIER_PAYMENT_STATUS,
    getCashierOrderState,
    isFullyCancelledOrder,
} from "@/lib/cashier-order-selectors";
import { useCashierShiftStore } from "@/store/cashierShiftStore";
import {
    buildVoucherAvailability,
    calculateVoucherDiscount,
    consumeVoucherLocally,
    getCachedVoucherAvailability,
    saveVoucherAvailability,
} from "@/lib/voucher";
import { formatOrderSequence } from "@/lib/order-sequence";
import {
    addCalendarDays,
    getRestaurantToday,
    restaurantDateRangeToUtc,
} from "@/lib/date-time";
import { UserRole } from "@/types/auth";

const FULL_CANCEL_APPROVAL_STATUSES = new Set(["ApprovedCancelled", "Waste"]);
const FULL_CANCEL_KITCHEN_DECISIONS = new Set(["Cancel", "Waste"]);
const CANCEL_LOG_PAGE_SIZE = 200;
const CARD_PAYMENT_SESSION_KEY = "pos:last-card-payment-method";
const CANCEL_REQUEST_ROLES = new Set<UserRole>([
    UserRole.Admin,
    UserRole.SuperAdmin,
    UserRole.Manager,
    UserRole.Cashier,
]);

function logPaymentFlow(message: string, details?: unknown): void {
    if (process.env.NODE_ENV !== "development") return;
    console.log(`[PaymentFlow] ${message}`, details ?? "");
}

const DELIVERY_PARTNER_PRICE_ADJUSTMENT_ROLES = new Set<UserRole>([
    UserRole.Admin,
    UserRole.SuperAdmin,
    UserRole.Manager,
    UserRole.Cashier,
    UserRole.Owner,
]);

function describeCashierDebugTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;

    const id = target.id ? `#${target.id}` : "";
    const className = typeof target.className === "string"
        ? target.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(".")
        : "";
    const classSuffix = className ? `.${className}` : "";
    const dataTalabat = target.getAttribute("data-talabat-debug");

    return `${target.tagName.toLowerCase()}${id}${classSuffix}${dataTalabat ? `[data-talabat-debug=${dataTalabat}]` : ""}`;
}

function summarizeCashierDebugEvent(event: Event) {
    return {
        type: event.type,
        pointerType: event instanceof PointerEvent ? event.pointerType : undefined,
        touches: typeof TouchEvent !== "undefined" && event instanceof TouchEvent ? event.touches.length : undefined,
        target: describeCashierDebugTarget(event.target),
        currentTarget: describeCashierDebugTarget(event.currentTarget),
        defaultPrevented: event.defaultPrevented,
    };
}

function pushCashierTalabatDebugLog(event: string, payload: Record<string, unknown> = {}) {
    if (typeof window === "undefined") return;

    const debugWindow = window as Window & { __talabatDialogLog?: Array<Record<string, unknown>> };
    const entry = {
        scope: "CashierPage",
        event,
        at: Math.round(window.performance.now() * 100) / 100,
        ...payload,
    };

    debugWindow.__talabatDialogLog = debugWindow.__talabatDialogLog ?? [];
    debugWindow.__talabatDialogLog.push(entry);
    console.log("[CashierPage]", entry);
}
const COMPLETED_CANCELLATION_STATUS = "CompletedCancellation";
const CANCEL_REQUEST_BLOCKED_STATUSES = new Set<string>([
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.REFUNDED,
    COMPLETED_CANCELLATION_STATUS,
]);

// Refund & cancel UI is intentionally hidden. Flip to `true` to re-enable.
// Backend endpoints (/refund, /cancel) remain reachable — this is a UI-only gate.
const REFUND_AND_CANCEL_UI_ENABLED = false;

function getOrderDisplayNumber(order: Pick<OrderDto, "orderNumber" | "orderSequenceNumber" | "displayOrderNumber"> | null | undefined): string {
    return formatOrderSequence(order) ?? `#${order?.orderNumber?.slice(-4) || "?"}`;
}

function getSystemOrderDisplayNumber(
    order: Pick<OrderDto, "orderNumber" | "orderSequenceNumber" | "displayOrderNumber" | "systemOrderNumber"> | null | undefined
): string | null {
    if (!order) return null;

    const systemOrderNumber = order.systemOrderNumber
        ?? (order.orderNumber !== getOrderDisplayNumber(order) ? order.orderNumber : null);
    return systemOrderNumber?.replace(/-[0-9a-f]{32}$/i, "") ?? null;
}

function getSignalOrderDisplayNumber(payload: unknown): string {
    if (!payload || typeof payload !== "object") return "#?";
    const record = payload as Record<string, unknown>;
    const sequence = record.orderSequenceNumber ?? record.OrderSequenceNumber;
    const orderNumber = record.orderNumber ?? record.OrderNumber;
    return formatOrderSequence({ orderSequenceNumber: typeof sequence === "string" ? sequence : null }) ??
        (orderNumber ? `#${String(orderNumber).slice(-4)}` : "#?");
}

function isApprovedFullOrderCancel(log: CancelLogEntry): boolean {
    return log.isFullOrder === true && (
        log.requiresKitchenApproval === false ||
        FULL_CANCEL_APPROVAL_STATUSES.has(log.approvalStatus ?? "") ||
        FULL_CANCEL_KITCHEN_DECISIONS.has(log.kitchenDecision ?? "")
    );
}

function getCancelLogDateParams(dateFilter: DateFilter, timeZone: string) {
    const today = getRestaurantToday(timeZone);
    let from = today;
    if (dateFilter === "week") {
        const day = new Date(`${today}T00:00:00Z`).getUTCDay();
        from = addCalendarDays(today, -((day + 6) % 7));
    } else if (dateFilter === "month") {
        from = `${today.slice(0, 8)}01`;
    } else if (dateFilter === "all") {
        from = addCalendarDays(today, -1);
    }
    return { dateFrom: from };
}

function getServerCashierDateFilter(dateFilter: DateFilter): CashierOrdersDateFilter {
    if (dateFilter === "all") return "recent";
    return dateFilter === "mine" ? "today" : dateFilter;
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

function getCardPaymentMethods(methods: PaymentMethodDto[]): PaymentMethodDto[] {
    return methods.filter((method) => !isCashPaymentMethod(method));
}

function mapCashierDateToPreset(dateFilter: DateFilter) {
    if (dateFilter === "week") return "ThisWeek" as const;
    if (dateFilter === "month") return "ThisMonth" as const;
    return "Today" as const;
}

function getCashierBusinessFilterPatch(dateFilter: DateFilter, timeZone: string) {
    if (dateFilter !== "all") {
        return {
            preset: mapCashierDateToPreset(dateFilter),
            startUtc: null,
            endUtc: null,
        };
    }

    const today = getRestaurantToday(timeZone);
    const range = restaurantDateRangeToUtc(addCalendarDays(today, -1), today, timeZone);

    return {
        preset: "Custom" as const,
        startUtc: range.startUtc,
        endUtc: range.endUtc,
    };
}

async function loadFullyCancelledOrderKeys(dateFilter: DateFilter, timeZone: string): Promise<Set<string>> {
    const keys = new Set<string>();
    const cancelledOrderIds = new Set<string>();
    let page = 1;
    let total = 0;
    do {
        const result = await getCancelLog({ ...getCancelLogDateParams(dateFilter, timeZone), page, limit: CANCEL_LOG_PAGE_SIZE });
        total = result.total;
        result.data.filter(isApprovedFullOrderCancel).forEach((log) => {
            keys.add(log.orderId);
            cancelledOrderIds.add(log.orderId);
            if (log.orderNumber) keys.add(log.orderNumber);
            if (log.orderSequenceNumber) keys.add(log.orderSequenceNumber);
        });
        page += 1;
    } while ((page - 1) * CANCEL_LOG_PAGE_SIZE < total);
    await Promise.all(Array.from(cancelledOrderIds, (orderId) =>
        markConfirmedCancelledOrderSnapshot(orderId).catch(() => undefined)
    ));
    return keys;
}

export default function CashierPage() {
    const { t, locale } = useLocale();
    const branchVersion = useActiveBranchVersion();
    const settings = useSettingsStore((s) => s.settings);
    const setBusinessFilter = useBusinessFilterStore((state) => state.setFilter);
    const [dateFilter, setDateFilterState] = useState<DateFilter>("today");
    const setDateFilter = (next: DateFilter) => {
        setDateFilterState(next);
        setBusinessFilter(getCashierBusinessFilterPatch(next, settings.timeZoneId));
    };
    // Raw orders list is owned by useCashierOrders — the single source of
    // truth. Filters derive from it via useCashierOrderFilter (see below).
    const { orders, setOrders, refresh: debouncedLoadOrders, load: loadOrders, loadMore: loadMoreOrders, hasMore: hasMoreOrders, isLoadingMore, cancelPending }
        = useCashierOrders(getServerCashierDateFilter(dateFilter));
    const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
    const selectedOrderIdRef = useRef<string | null>(null);
    const [resendKitchenOrder, setResendKitchenOrder] = useState<OrderDto | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeliveryOrderModalOpen, setIsDeliveryOrderModalOpen] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isPayingOrder, setIsPayingOrder] = useState(false);
    // ── Payment extras ─────────────────────────────────────────
    const [paymentAmount, setPaymentAmount] = useState("");
    const [cashTendered, setCashTendered]   = useState("");
    const [pendingMethod, setPendingMethod] = useState<"Cash" | "Credit Card" | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDto[]>([]);
    const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
    const [paymentReferenceNumber, setPaymentReferenceNumber] = useState("");
    const [applyVoucher, setApplyVoucher] = useState(false);
    const [discountType, setDiscountType] = useState<OrderDiscountType | null>(null);
    const [discountValue, setDiscountValue] = useState(0);
    const [voucherAvailability, setVoucherAvailability] = useState<VoucherAvailability | null>(null);
    const [connectivity, setConnectivity] = useState<ConnectivityState>("online");
    const isOnline = connectivity === "online";

    useEffect(() => {
        pushCashierTalabatDebugLog("state:isDeliveryOrderModalOpen", {
            open: isDeliveryOrderModalOpen,
        });
    }, [isDeliveryOrderModalOpen]);

    const handleDeliveryOrderDialogOpenChange = (nextOpen: boolean) => {
        pushCashierTalabatDebugLog("state-request:isDeliveryOrderModalOpen", {
            currentOpen: isDeliveryOrderModalOpen,
            nextOpen,
        });
        setIsDeliveryOrderModalOpen(nextOpen);
    };

    useEffect(() => {
        setConnectivity(getConnectivityState());
        return subscribeConnectivity(setConnectivity);
    }, []);

    useEffect(() => {
        if (!isModalOpen) return;

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
    }, [isModalOpen, isOnline, settings.voucherEnabled, settings.voucherAmount, settings.voucherDailyLimit, settings.timeZoneId]);

    useEffect(() => {
        if (!isModalOpen || !isOnline) return;

        let cancelled = false;
        setPaymentMethodsLoading(true);
        void getActivePaymentMethods()
            .then((methods) => {
                if (cancelled) return;
                setPaymentMethods(methods);
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
    }, [isModalOpen, isOnline, locale]);

    // Cache the cashier's resolved receipt-printer config while online so the
    // offline (loopback) print path knows where to print without the cloud.
    // branchVersion: the resolved receipt printer is branch-scoped server-side,
    // so re-resolve it after a branch switch.
    useEffect(() => {
        if (connectivity === "online") {
            void refreshReceiptPrinterCache();
        }
    }, [connectivity, branchVersion]);

    // ── Cancel order modal ─────────────────────────────────────
    const [cancelTarget, setCancelTarget] = useState<{ itemId?: string; itemName?: string } | null>(null);

    // ── Refund order modal ─────────────────────────────────────
    const [refundOrder, setRefundOrder] = useState<OrderDto | null>(null);
    const [paymentAdjustmentOrder, setPaymentAdjustmentOrder] = useState<OrderDto | null>(null);

    // ── Offer management ───────────────────────────────────────
    const [isEditingOffer, setIsEditingOffer] = useState(false);
    const [editOfferNote, setEditOfferNote] = useState("");

    // ── Ready/Pickup actions ───────────────────────────────────
    const [markingReadyOrderId, setMarkingReadyOrderId] = useState<string | null>(null);
    const [markingPickedUpOrderId, setMarkingPickedUpOrderId] = useState<string | null>(null);
    const [updatingLifecycleOrderId, setUpdatingLifecycleOrderId] = useState<string | null>(null);

    // ── Filter / search state ──────────────────────────────────
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [typeFilter, setTypeFilter]     = useState<TypeFilter>("all");
    const [tableFilter, setTableFilter]   = useState("all");
    const [sortBy, setSortBy]             = useState<SortOption>("newest");
    const [query, setQuery]               = useState("");
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>("orders");
    const [posLogs, setPosLogs] = useState<PosLogEntry[]>([]);
    const [posLogsLoading, setPosLogsLoading] = useState(false);
    const [posLogsError, setPosLogsError] = useState<string | null>(null);
    const [posLogsRefreshKey, setPosLogsRefreshKey] = useState(0);
    const [fullyCancelledOrderKeys, setFullyCancelledOrderKeys] = useState<Set<string>>(new Set());

    const { user, isAuthenticated } = useAuthStore();
    const { currency, taxRate: storeTaxRate, serviceChargeRate: storeServiceChargeRate, products, fetchProducts } = usePosStore();
    const logoUrl   = useBrandingStore((s) => s.logoUrl);
    const businessName = useBrandingStore((s) => s.businessName);
    const router = useRouter();
    const activeShift = useCashierShiftStore((state) => state.activeShift);
    const loadedShiftCashierId = useCashierShiftStore((state) => state.loadedCashierId);
    const isShiftHydrating = useCashierShiftStore((state) => state.isHydrating);
    const hydrateActiveShift = useCashierShiftStore((state) => state.hydrateActiveShift);

    const cashierId = user?.id;
    const isShiftLoaded = !cashierId || (loadedShiftCashierId === cashierId && !isShiftHydrating);
    const isShiftOpen = !!activeShift && !activeShift.isClosed;
    const shiftClosedMessage = t("shiftNotOpenPaymentMessage");
    const cardPaymentMethods = getCardPaymentMethods(paymentMethods);
    const selectedCardPaymentMethod = cardPaymentMethods.find((method) => method.id === selectedPaymentMethodId) ?? null;
    const selectedCardReferenceRequired = selectedCardPaymentMethod?.requiresReferenceNumber === true;
    const cardPaymentConfirmBlocked =
        pendingMethod === "Credit Card" &&
        (paymentMethodsLoading || cardPaymentMethods.length === 0 || !selectedCardPaymentMethod || (selectedCardReferenceRequired && !paymentReferenceNumber.trim()));

    useEffect(() => {
        selectedOrderIdRef.current = selectedOrder?.id ?? null;
    }, [selectedOrder]);

    useEffect(() => {
        const availableCardMethods = getCardPaymentMethods(paymentMethods);
        if (availableCardMethods.length === 0) {
            if (selectedPaymentMethodId) setSelectedPaymentMethodId("");
            return;
        }

        setSelectedPaymentMethodId((current) => {
            if (availableCardMethods.some((method) => method.id === current)) return current;

            const stored = readLastCardPaymentMethod(cashierId);
            if (availableCardMethods.some((method) => method.id === stored)) return stored;

            return availableCardMethods.find((method) => method.isDefault)?.id ?? availableCardMethods[0].id;
        });
    }, [paymentMethods, cashierId, selectedPaymentMethodId]);

    const handleCardPaymentMethodChange = (methodId: string) => {
        setSelectedPaymentMethodId(methodId);
        setPaymentReferenceNumber("");
        saveLastCardPaymentMethod(cashierId, methodId);
    };

    useEffect(() => {
        if (!selectedCardReferenceRequired && paymentReferenceNumber) {
            setPaymentReferenceNumber("");
        }
    }, [selectedCardReferenceRequired, paymentReferenceNumber]);

    // Offline: bootstrap IDB + connectivity once, expose reactive overlay.
    // Snapshot hydration / server-cache writes are owned by useCashierOrders.
    const bootstrapOffline = useOfflineCashierStore((s) => s.bootstrap);
    const pendingActions = useOfflineCashierStore((s) => s.pending);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // branchVersion: products are branch-scoped; the switch resets the POS
    // store, so this refetch repopulates for the newly-active branch.
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts, branchVersion]);

    // Bootstrap offline infrastructure (IDB + connectivity + queue) — once per session.
    useEffect(() => {
        void bootstrapOffline();
    }, [bootstrapOffline]);

    // Snapshot fan-in + ordersRef sync now live inside useCashierOrders.
    // Date windows are server-filtered for performance, then refined locally
    // by status/type/search/table filters.

    // branchVersion: cashier shifts are branch-scoped — rehydrate after a switch.
    useEffect(() => {
        if (!cashierId) return;
        void hydrateActiveShift(cashierId);
    }, [cashierId, hydrateActiveShift, branchVersion]);

    useEffect(() => {
        if (activityFilter === "orders") return;

        let cancelled = false;
        const logType = activityFilter === "waste" ? "waste" : "cancel";
        const logDate: "today" | "all" =
            dateFilter === "today" || dateFilter === "mine" || dateFilter === "active"
                ? "today"
                : "all";

        setPosLogsLoading(true);
        setPosLogsError(null);

        getPosLogs({
            date: logDate,
            type: logType,
            shiftId: logDate === "today" && activeShift?.id.startsWith("offline-") !== true
                ? activeShift?.id
                : undefined,
            limit: 100,
        })
            .then((page) => {
                if (!cancelled) setPosLogs(page.data ?? []);
            })
            .catch(() => {
                if (!cancelled) {
                    setPosLogs([]);
                    setPosLogsError(t("cashierLogsLoadFailed"));
                }
            })
            .finally(() => {
                if (!cancelled) setPosLogsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [activityFilter, dateFilter, activeShift?.id, posLogsRefreshKey, t, branchVersion]);

    useEffect(() => {
        if (!mounted || !isAuthenticated) return;

        let cancelled = false;
        loadFullyCancelledOrderKeys(dateFilter, settings.timeZoneId).then((keys) => {
            if (!cancelled) setFullyCancelledOrderKeys(keys);
        });

        return () => {
            cancelled = true;
        };
    }, [mounted, isAuthenticated, dateFilter, posLogsRefreshKey, settings.timeZoneId, branchVersion]);

    // Auth check and initial load — also re-runs on a branch switch so the
    // orders list reloads scoped to the newly-active branch (useCashierOrders
    // clears its state on the same branchVersion tick).
    useEffect(() => {
        if (!mounted) return;

        if (!canAccessArea(user?.role, "cashier")) {
            router.push(getUnauthorizedRedirect(isAuthenticated, user?.role));
        } else {
            void loadOrders();
        }

        return () => {
            cancelPending();
        };
    }, [mounted, isAuthenticated, user, router, loadOrders, cancelPending, branchVersion]);

    // Keep the open modal reflective of the latest server data — when the
    // raw list refreshes, re-pick the selected order by id so the modal
    // never renders stale fields (status, payments, items).
    useEffect(() => {
        setSelectedOrder((prev) =>
            prev ? orders.find((o) => o.id === prev.id) ?? prev : prev
        );
    }, [orders]);

    // SignalR setup - skip when offline so we don't burn battery/CPU trying
    // to negotiate a doomed connection. Re-runs on connectivity changes.
    useEffect(() => {
        if (!canAccessArea(user?.role, "cashier")) return;
        if (!isOnline) return;

        let cancelled = false;

        const conn = new signalR.HubConnectionBuilder()
            .withUrl(appendBranchQuery(config.signalRUrl), {
                accessTokenFactory: () => useAuthStore.getState().user?.token || ""
            })
            .withAutomaticReconnect()
            .build();

        const startConnection = async () => {
            try {
                await conn.start();
                // If cleanup ran while we were connecting, stop cleanly and bail
                if (cancelled) {
                    conn.stop().catch(() => {});
                    return;
                }
                console.log("Cashier connected to SignalR");

                // ── ReceiveNewOrder ────────────────────────────────────────────
                // Fired when: a new order is created OR items are added to an existing
                // order OR an order is cancelled/refunded (backend always rebroadcasts
                // the full updated OrderDto). Carry out an optimistic state merge so
                // the card appears / updates instantly; then queue a background sync to
                // confirm with the server.
                conn.on("ReceiveNewOrder", (incoming: unknown) => {
                    if (!incoming || typeof incoming !== "object") return;
                    const order = incoming as OrderDto;
                    if (!order.id) return;
                    if (isFullyCancelledOrder(order)) {
                        setOrders((prev) => prev.filter((existing) => existing.id !== order.id));
                        void markConfirmedCancelledOrderSnapshot(order.id, order, order.isRefunded === true);
                        if (selectedOrderIdRef.current === order.id) {
                            setSelectedOrder(null);
                            setIsModalOpen(false);
                        }
                        return;
                    }
                    setOrders((prev) => {
                        const exists = prev.some((o) => o.id === order.id);
                        if (exists) {
                            return prev.map((o) => (o.id === order.id ? { ...o, ...order } : o));
                        }
                        // New order — prepend so it shows at the top of the "newest" sort
                        return [order, ...prev];
                    });
                    // Keep selectedOrder in sync if the user has this order open
                    setSelectedOrder((prev) => prev?.id === order.id ? { ...prev, ...order } : prev);
                    // Background sync to confirm server state (dedup-safe, 300 ms debounce)
                    debouncedLoadOrders();
                });

                // ── OrderCancelled ─────────────────────────────────────────────
                // Payload: { OrderId, OrderNumber, IsOrderCancelled }
                // Remove terminal cancellations from the active cashier screen immediately.
                conn.on("OrderCancelled", (payload: unknown) => {
                    const orderId = readSignalString(payload, "orderId", "OrderId");
                    const orderNumber = readSignalString(payload, "orderNumber", "OrderNumber");
                    if (orderId) {
                        setFullyCancelledOrderKeys((prev) => {
                            const next = new Set(prev);
                            next.add(orderId);
                            if (orderNumber) next.add(orderNumber);
                            return next;
                        });
                        setOrders((prev) => prev.filter((order) => order.id !== orderId));
                        void markConfirmedCancelledOrderSnapshot(orderId);
                        if (selectedOrderIdRef.current === orderId) {
                            setSelectedOrder(null);
                            setIsModalOpen(false);
                        }
                    }
                    setPosLogsRefreshKey((value) => value + 1);
                    debouncedLoadOrders();
                });

                conn.on("CancelRequested", () => {
                    setPosLogsRefreshKey((value) => value + 1);
                    debouncedLoadOrders();
                });

                conn.on("CancellationResolved", () => {
                    setPosLogsRefreshKey((value) => value + 1);
                    debouncedLoadOrders();
                });

                // ── OrderRefunded ──────────────────────────────────────────────
                // Payload: { OrderId, OrderNumber, RefundAmount, Status }
                conn.on("OrderRefunded", (payload: unknown) => {
                    const orderId = readSignalString(payload, "orderId", "OrderId");
                    const orderNumber = readSignalString(payload, "orderNumber", "OrderNumber");
                    if (orderId) {
                        setFullyCancelledOrderKeys((prev) => {
                            const next = new Set(prev);
                            next.add(orderId);
                            if (orderNumber) next.add(orderNumber);
                            return next;
                        });
                        setOrders((prev) => prev.filter((order) => order.id !== orderId));
                        void markConfirmedCancelledOrderSnapshot(orderId, undefined, true);
                        if (selectedOrderIdRef.current === orderId) {
                            setSelectedOrder(null);
                            setIsModalOpen(false);
                        }
                    }
                    setPosLogsRefreshKey((value) => value + 1);
                    debouncedLoadOrders();
                });

                // ── OrderPickedUp ──────────────────────────────────────────────
                // Takeaway order has been picked up (status = Completed).
                // Payload: { OrderId, OrderNumber, OrderType }
                conn.on("OrderPickedUp", (payload: unknown) => {
                    const orderId = readSignalString(payload, "orderId", "OrderId");
                    if (orderId) {
                        setOrders((prev) =>
                            prev.map((o) => (o.id === orderId ? { ...o, status: "Completed" } : o))
                        );
                        setSelectedOrder((prev) =>
                            prev?.id === orderId ? { ...prev, status: "Completed" } : prev
                        );
                    }
                    debouncedLoadOrders();
                });

                // ── NewItemsAdded ──────────────────────────────────────────────
                // Items were added to an existing order from another screen.
                // Payload: { OrderId, OrderNumber, TableName, OrderType, NewItems }
                // Full OrderDto is broadcast separately via ReceiveNewOrder; this event
                // is just used to queue a refresh in case the two arrive out of order.
                conn.on("NewItemsAdded", () => {
                    debouncedLoadOrders();
                });

                conn.on("OrderReady", () => {
                    toast.info(t("orderReadyNotif"));
                    debouncedLoadOrders();
                });
                conn.on("OrderPaid", () => {
                    debouncedLoadOrders();
                });
                conn.on("OrderServed", () => {
                    debouncedLoadOrders();
                });
                conn.on("CashierShiftUpdated", (payload: unknown) => {
                    const currentCashierId = useAuthStore.getState().user?.id;
                    if (!currentCashierId) return;
                    const updatedCashierId = readSignalString(payload, "cashierId", "CashierId");
                    if (updatedCashierId && updatedCashierId !== currentCashierId) return;
                    void useCashierShiftStore.getState().hydrateActiveShift(currentCashierId);
                });
                conn.on("ItemReady", (payload: unknown) => {
                    const productName = readSignalString(payload, "ProductName", "productName");
                    const orderType = readSignalString(payload, "OrderType", "orderType");
                    if (orderType === "Takeaway" && productName) {
                        toast.info(`Item ready: ${productName} from Order ${getSignalOrderDisplayNumber(payload)}`);
                    }
                    debouncedLoadOrders();
                });
            } catch (err: unknown) {
                if (!cancelled) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.warn("SignalR could not connect (backend may not be running):", message);
                }
            }
        };

        startConnection();

        // Cleanup: if already connected stop immediately; if still negotiating let
        // startConnection() detect `cancelled` and stop after it resolves (avoids
        // "stopped during negotiation" console error from the SignalR library).
        return () => {
            cancelled = true;
            if (conn.state === signalR.HubConnectionState.Connected) {
                conn.stop().catch(() => {});
            }
        };
    // Re-runs when connectivity flips; offline → tear down and stop retrying.
    // branchVersion: the hub URL carries the branch group — a switch must
    // reconnect so events arrive for the newly-active branch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, branchVersion]);


    const getItemDisplayName = (item: { productId?: string; productName: string }) => {
        if (locale === 'ar') {
            const p = products.find(pr => pr.id === item.productId);
            if (p?.nameAr) return p.nameAr;
        }
        return item.productName;
    };

    const readSignalString = (payload: unknown, ...keys: string[]) => {
        if (!payload || typeof payload !== "object") return undefined;
        const record = payload as Record<string, unknown>;
        for (const key of keys) {
            const value = record[key];
            if (value != null) return String(value);
        }
        return undefined;
    };

    const handleOrderClick = (order: OrderDto) => {
        setSelectedOrder(order);
        setApplyVoucher(false);
        setDiscountType(order.discountType ?? (order.discountPercentage > 0 ? "Percentage" : null));
        setDiscountValue(order.discountValue ?? order.discountPercentage ?? 0);
        setIsModalOpen(true);
    };

    const handleStartOnlinePreparation = async (order: OrderDto) => {
        setUpdatingLifecycleOrderId(order.id);
        setOrders((current) => current.map((item) =>
            item.id === order.id ? { ...item, status: ORDER_STATUS.PREPARING } : item));
        try {
            await markOnlineOrderPreparingStrict(order.id);
            toast.success(locale === "ar" ? "بدأ تحضير الطلب" : "Order preparation started");
        } catch (error) {
            setOrders((current) => current.map((item) => item.id === order.id ? order : item));
            toast.error(getRequestErrorMessage(error, locale === "ar" ? "تعذر بدء التحضير" : "Could not start preparation"));
        } finally {
            setUpdatingLifecycleOrderId(null);
        }
    };

    const handleDispatchOnlineOrder = async (order: OrderDto) => {
        const dispatchedAt = new Date().toISOString();
        setUpdatingLifecycleOrderId(order.id);
        setOrders((current) => current.map((item) =>
            item.id === order.id ? { ...item, dispatchedAt } : item));
        try {
            await markOnlineOrderDispatchedStrict(order.id);
            toast.success(locale === "ar" ? "خرج الطلب للتوصيل" : "Order is out for delivery");
        } catch (error) {
            setOrders((current) => current.map((item) => item.id === order.id ? order : item));
            toast.error(getRequestErrorMessage(error, locale === "ar" ? "تعذر إرسال الطلب" : "Could not dispatch order"));
        } finally {
            setUpdatingLifecycleOrderId(null);
        }
    };

    const handleMarkOrderReady = async (order: OrderDto) => {
        if (!order.id) {
            toast.error("Order ID is missing");
            return;
        }

        const orderState = getCashierOrderState(order);
        const readyItems = (order.items || []).map((item) => ({ ...item, itemStatus: "Ready" }));
        const nextStatus = resolveOrderLifecycleStatus(
            { ...order, items: readyItems },
            orderState.isPaid
        );

        // Optimistic update — instant UI regardless of connectivity.
        setOrders((prev) =>
            prev.map((o) =>
                o.id !== order.id
                    ? o
                    : {
                          ...o,
                          status: nextStatus,
                          items: readyItems,
                      }
            )
        );
        if (selectedOrder?.id === order.id) {
            setSelectedOrder((prev) =>
                prev
                    ? {
                          ...prev,
                          status: nextStatus,
                          items: readyItems,
                      }
                    : prev
            );
        }

        setMarkingReadyOrderId(order.id);
        try {
            if (getConnectivityState() === "online") {
                await markOrderAsReadyStrict(order.id);
                toast.success("Order marked as ready");
                return;
            }
            await enqueueMarkReadyOffline(order.id);
            toast.success("Marked ready — will sync when online");
        } catch (error) {
            if (isNetworkRequestError(error)) {
                await enqueueMarkReadyOffline(order.id);
                toast.success("Marked ready — will sync when online");
                return;
            }
            setOrders((prev) => prev.map((candidate) => candidate.id === order.id ? order : candidate));
            if (selectedOrder?.id === order.id) setSelectedOrder(order);
            toast.error(getRequestErrorMessage(error, "Failed to mark order ready"));
        } finally {
            setMarkingReadyOrderId(null);
        }
    };

    const handleMarkOrderPickedUp = async (order: OrderDto) => {
        if (!order.id) {
            toast.error("Order ID is missing");
            return;
        }

        const orderState = getCashierOrderState(order);
        const fulfilledStatus = resolveOrderLifecycleStatus(
            { ...order, status: ORDER_STATUS.SERVED },
            orderState.isPaid
        );
        setOrders((prev) =>
            prev.map((o) => (o.id === order.id ? { ...o, status: fulfilledStatus } : o))
        );
        if (selectedOrder?.id === order.id) {
            setSelectedOrder((prev) => (prev ? { ...prev, status: fulfilledStatus } : prev));
        }

        setMarkingPickedUpOrderId(order.id);
        const fulfilledLabel = orderState.isTakeaway
            ? "picked up"
            : orderState.isDelivery
            ? "delivered"
            : "served";
        try {
            if (getConnectivityState() === "online") {
                if (orderState.isTakeaway) {
                    await markTakeawayPickedUpStrict(order.id);
                    const syncedAt = new Date().toISOString();
                    await putOrderSnapshot(order.id, {
                        ...order,
                        status: fulfilledStatus,
                        lastUpdatedAt: syncedAt,
                        syncedAt,
                    });
                } else {
                    await markOrderAsServedStrict(order.id);
                }
                toast.success(`Order marked as ${fulfilledLabel}`);
                return;
            }
            if (orderState.isTakeaway) {
                await enqueueMarkPickupOffline(order.id);
            } else {
                await enqueueMarkServedOffline(order.id);
            }
            toast.success(`Marked ${fulfilledLabel} — will sync when online`);
        } catch (error) {
            if (isNetworkRequestError(error)) {
                if (orderState.isTakeaway) {
                    await enqueueMarkPickupOffline(order.id);
                } else {
                    await enqueueMarkServedOffline(order.id);
                }
                toast.success(`Marked ${fulfilledLabel} — will sync when online`);
                return;
            }
            setOrders((prev) => prev.map((candidate) => candidate.id === order.id ? order : candidate));
            if (selectedOrder?.id === order.id) setSelectedOrder(order);
            toast.error(getRequestErrorMessage(error, `Failed to mark order as ${fulfilledLabel}`));
        } finally {
            setMarkingPickedUpOrderId(null);
        }
    };

    // Unified advance trigger for StatusControl inside the modal.
    const handleAdvanceStatus = (target: "ready" | "served" | "pickup") => {
        if (!selectedOrder) return;
        if (target === "ready") return void handleMarkOrderReady(selectedOrder);
        if (target === "served" || target === "pickup") return void handleMarkOrderPickedUp(selectedOrder);
    };

    // Use the order's stored rate if it was already set, otherwise fall back to current admin settings.
    const effectiveServiceRate = selectedOrder
        ? ((selectedOrder.serviceChargeRate ?? 0) > 0 ? selectedOrder.serviceChargeRate : storeServiceChargeRate)
        : storeServiceChargeRate;
    const effectiveTaxRate = selectedOrder
        ? ((selectedOrder.taxRate ?? 0) > 0 ? selectedOrder.taxRate : storeTaxRate)
        : storeTaxRate;

    // Compute a live breakdown so the cashier always sees the correct numbers.
    // If the stored subtotal is 0 (pre-migration order), compute it live from item line totals.
    const displaySubtotal = (selectedOrder?.subtotal && selectedOrder.subtotal > 0)
        ? selectedOrder.subtotal
        : (selectedOrder?.items?.reduce((sum, item) => sum + (item.lineTotalAmount ?? 0), 0) ?? 0);
    const discountGroupType = selectedOrder?.discountGroupType ?? 0;
    const discountGroupValue = selectedOrder?.discountGroupValue ?? 0;
    const discountGroupName = selectedOrder?.discountGroupName ?? "";
    // The group discount is snapshotted on the order at creation and is not editable at
    // payment time, so reproduce the stored amount exactly (as a fixed value) rather than
    // recomputing from the configured %. Robust even if type/value are absent on the DTO.
    const storedGroupDiscountAmount = selectedOrder?.discountGroupAmount ?? 0;
    const liveDiscountTotals = calculateOrderDiscountTotals(
        displaySubtotal,
        discountType,
        discountValue,
        effectiveServiceRate,
        effectiveTaxRate,
        storedGroupDiscountAmount,
        1, // FixedAmount — treat the snapshotted amount as a flat value
    );
    const displayDiscount = liveDiscountTotals.discountAmount;
    const displayGroupDiscount = liveDiscountTotals.discountGroupAmount;
    const groupedSelectedOrder = selectedOrder
        ? splitOrderItemsForOfferDisplay(selectedOrder)
        : null;
    const selectedOrderOfferDisplayName = selectedOrder
        ? (locale === "ar"
            ? (selectedOrder.offerNameAr || selectedOrder.offerName || "")
            : (selectedOrder.offerName || selectedOrder.offerNameAr || ""))
        : "";
    const selectedOrderOfferContentsSummary = selectedOrder
        ? buildOfferContentsSummary(selectedOrder.offerProducts || [], locale)
        : "";
    const hasPendingItemCancellation = (itemId?: string | null) =>
        !!itemId && (
            selectedOrder?.hasPendingFullCancellation === true ||
            (selectedOrder?.pendingCancellationItemIds ?? []).includes(itemId)
        );
    const displayServiceAmount = liveDiscountTotals.serviceChargeAmount;
    const displayTaxAmount = liveDiscountTotals.taxAmount;
    const displayBaseTotal = liveDiscountTotals.totalAmount;
    const displayDeliveryFee = Math.max(0, selectedOrder?.deliveryFee ?? 0);
    const displayTalabatDeliveryFee = Math.max(0, selectedOrder?.talabatDeliveryFee ?? 0);
    const displayTalabatServiceFee = Math.max(0, selectedOrder?.talabatServiceFee ?? 0);
    const displayPartnerDeliveryFee = Math.max(0, selectedOrder?.partnerDeliveryFee ?? 0);
    const displayPartnerServiceFee = Math.max(0, selectedOrder?.partnerServiceFee ?? 0);
    const displayTotal = Math.round((displayBaseTotal + displayDeliveryFee + displayTalabatDeliveryFee + displayTalabatServiceFee + displayPartnerDeliveryFee + displayPartnerServiceFee) * 100) / 100;

    const handlePayment = async (method: string) => {
        const currentOrder = effectiveSelectedOrder ?? selectedOrder;

        if (!currentOrder) {
            toast.error("No order selected");
            return;
        }

        if (!isShiftLoaded) {
            toast.error(t("loadingShifts"));
            return;
        }

        if (!isShiftOpen) {
            toast.error(shiftClosedMessage);
            return;
        }

        // Validate payment method
        if (!method || method.trim() === '') {
            toast.error("Payment method is required");
            return;
        }

        if (!isPaymentAmountValid) {
            toast.error(locale === "ar" ? "أدخل مبلغ دفع صحيحًا" : "Enter a valid payment amount");
            return;
        }

        if (discountType === "Percentage" && discountValue > 100) {
            toast.error(locale === "ar" ? "نسبة الخصم لا يمكن أن تتجاوز 100%" : "Discount percentage cannot exceed 100%");
            return;
        }
        if (discountType === "FixedAmount" && discountValue > displaySubtotal) {
            toast.error(locale === "ar" ? "الخصم لا يمكن أن يتجاوز المجموع الفرعي" : "Discount cannot exceed the subtotal");
            return;
        }

        if (method === "Cash" && !isCashValid) {
            toast.error(locale === "ar" ? "المبلغ النقدي يجب أن يغطي مبلغ الدفعة" : "Cash received must cover the payment amount");
            return;
        }

        const isCardPayment = method !== "Cash";
        if (isCardPayment && !selectedCardPaymentMethod) {
            toast.error(locale === "ar" ? "اختر طريقة الدفع" : "Select a payment method");
            return;
        }

        const paymentReference = isCardPayment ? paymentReferenceNumber.trim() : undefined;
        if (isCardPayment && selectedCardPaymentMethod?.requiresReferenceNumber && !paymentReference) {
            toast.error(locale === "ar" ? "أدخل رقم المرجع" : "Enter the reference number");
            return;
        }

        const paymentMethodName = isCardPayment
            ? getPaymentMethodName(selectedCardPaymentMethod, locale)
            : method;

        const tendered = method === "Cash" && tenderedNum > 0 ? tenderedNum : undefined;
        const change   = tendered != null ? cashChange : undefined;
        const willBeFullyPaid = selectedOrderRemainingAmount - paymentAmountNum <= 0.001;
        const voucherDiscountForPayment = isVoucherRequested ? displayVoucherDiscount : 0;
        const receiptWindow = willBeFullyPaid ? openReceiptPrintWindow() : null;
        const paidOrderId = currentOrder.id;
        const paidTableName = currentOrder.tableName;
        logPaymentFlow("markOrderPaid path reached through optimistic local payment update");
        const optimisticOrder = applyPaymentToOrder(currentOrder, {
            amount: paymentAmountNum,
            method,
            paymentMethodId: selectedCardPaymentMethod?.id,
            paymentMethodName: selectedCardPaymentMethod?.nameEn,
            paymentMethodNameAr: selectedCardPaymentMethod?.nameAr,
            paymentMethodCode: selectedCardPaymentMethod?.code,
            referenceNumber: paymentReference,
            amountTendered: tendered,
            applyVoucher: isVoucherRequested,
            voucherDiscountAmount: voucherDiscountForPayment,
            serviceChargeRate: effectiveServiceRate,
            taxRate: effectiveTaxRate,
            discount: discountChange,
        });
        const previousSelectedOrder = currentOrder;

        setOrders((prev) => prev.map((order) =>
            order.id === paidOrderId
                ? applyPaymentToOrder(order, {
                    amount: paymentAmountNum,
                    method,
                    paymentMethodId: selectedCardPaymentMethod?.id,
                    paymentMethodName: selectedCardPaymentMethod?.nameEn,
                    paymentMethodNameAr: selectedCardPaymentMethod?.nameAr,
                    paymentMethodCode: selectedCardPaymentMethod?.code,
                    referenceNumber: paymentReference,
                    amountTendered: tendered,
                    applyVoucher: isVoucherRequested,
                    voucherDiscountAmount: voucherDiscountForPayment,
                    serviceChargeRate: effectiveServiceRate,
                    taxRate: effectiveTaxRate,
                    discount: discountChange,
                })
                : order
        ));
        setSelectedOrder(optimisticOrder);
        setCashTendered("");
        setPendingMethod(null);
        setPaymentReferenceNumber("");
        // Post-tax next remaining — optimisticOrder.remainingAmount uses order.totalAmount (still
        // pre-tax until the backend persists this payment), so compute from displayTotal instead.
        const nextRemaining = Math.max(0, Math.round((displayPayableTotal - selectedOrderPaidAmount - paymentAmountNum) * 100) / 100);
        setPaymentAmount(willBeFullyPaid ? "" : nextRemaining.toFixed(2));
        if (willBeFullyPaid) {
            setIsModalOpen(false);
        }
        setIsPayingOrder(true);
        let success = false;
        let persistedOrder = optimisticOrder;

        // P1 (production fix): Decision to queue MUST be based on actual
        // request success/failure, not on connectivity state. A successful
        // ping does not guarantee the next POST will land, and a failed
        // POST while still flagged "online" was previously dropped on the
        // floor — payment collected, no server record, cash drawer broken.
        //
        // We pre-generate a stable clientActionId and pass it explicitly
        // to addOrderPayment so the idempotency middleware can tie the
        // online attempt and the offline replay to the same logical
        // operation. If the response is lost mid-write, the queued retry
        // hits the same X-Idempotency-Key and the middleware replays the
        // original response (no duplicate payment recorded server-side).
        const paymentClientActionId = await generateActionId();
        let paymentSubmissionThrew = false;
        if (getConnectivityState() !== "offline") {
            try {
                logPaymentFlow("addOrderPayment() reached");
                const result = await addOrderPayment({
                    orderId: paidOrderId,
                    amount: paymentAmountNum,
                    method,
                    paymentMethodId: selectedCardPaymentMethod?.id,
                    referenceNumber: paymentReference,
                    serviceChargeRate: effectiveServiceRate,
                    taxRate: effectiveTaxRate,
                    customerPhone: currentOrder.customerPhone,
                    amountTendered: tendered,
                    applyVoucher: isVoucherRequested,
                    discount: discountChange,
                    clientActionId: paymentClientActionId,
                });
                success = !!result;
                if (result) {
                    if (typeof result.voucherRemainingToday === "number") {
                        const dailyLimit = voucherAvailability?.dailyLimit ?? result.voucherRemainingToday + 1;
                        const nextAvailability = {
                            enabled: voucherAvailability?.enabled ?? true,
                            voucherAmount: voucherAvailability?.voucherAmount ?? displayVoucherDiscount,
                            dailyLimit,
                            usedToday: Math.max(0, dailyLimit - result.voucherRemainingToday),
                            remainingToday: result.voucherRemainingToday,
                            businessDate: voucherAvailability?.businessDate ?? getRestaurantToday(settings.timeZoneId),
                        };
                        setVoucherAvailability(nextAvailability);
                        saveVoucherAvailability(nextAvailability);
                    }
                    persistedOrder = {
                        ...optimisticOrder,
                        totalAmount: result.totalAmount,
                        paidAmount: result.paidAmount,
                        remainingAmount: result.remainingAmount,
                        paymentStatus: result.paymentStatus,
                        isPaid: result.isPaid,
                        status: result.status ?? optimisticOrder.status,
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
                    };
                    setOrders((prev) => prev.map((order) => order.id === paidOrderId ? persistedOrder : order));
                    setSelectedOrder((prev) => prev && prev.id === paidOrderId ? persistedOrder : prev);
                }
            } catch (err) {
                if (!isNetworkRequestError(err)) {
                    if (receiptWindow && !receiptWindow.closed) receiptWindow.close();
                    setOrders((prev) => prev.map((order) =>
                        order.id === paidOrderId ? previousSelectedOrder : order
                    ));
                    setSelectedOrder(previousSelectedOrder);
                    setIsModalOpen(true);
                    setPaymentAmount(selectedOrderRemainingAmount.toFixed(2));
                    setIsPayingOrder(false);
                    toast.error(getRequestErrorMessage(err, t("paymentFailed")));
                    return;
                }
                paymentSubmissionThrew = true;
            }
        }
        setIsPayingOrder(false);

        if (!success) {
            // ANY failure path — null return (swallowed error in api helper),
            // thrown exception, or connectivity flagged offline — queues the
            // payment with the SAME clientActionId so the idempotency
            // middleware can deduplicate against any partially-applied
            // server-side write. Never lose a collected payment.
            await enqueuePaymentOffline(
                paidOrderId,
                {
                    amount: paymentAmountNum,
                    paymentMethod: method,
                    paymentMethodId: selectedCardPaymentMethod?.id,
                    paymentMethodName: selectedCardPaymentMethod?.nameEn,
                    paymentMethodNameAr: selectedCardPaymentMethod?.nameAr,
                    paymentMethodCode: selectedCardPaymentMethod?.code,
                    referenceNumber: paymentReference,
                    serviceChargeRate: effectiveServiceRate,
                    taxRate: effectiveTaxRate,
                    customerPhone: currentOrder.customerPhone,
                    amountTendered: tendered,
                    applyVoucher: isVoucherRequested,
                    voucherDiscountAmount: voucherDiscountForPayment,
                    discount: discountChange,
                    clientActionId: paymentClientActionId,
                },
                {
                    isPaid: optimisticOrder.isPaid,
                    paidAmount: optimisticOrder.paidAmount,
                    paymentStatus: optimisticOrder.paymentStatus,
                }
            );
            if (paymentSubmissionThrew || getConnectivityState() === "online") {
                toast.info(
                    locale === "ar"
                        ? "تعذّر تأكيد الدفع — تمت إضافته إلى قائمة المزامنة"
                        : "Payment couldn't be confirmed — queued for retry"
                );
            }
            if (isVoucherRequested) {
                setVoucherAvailability(consumeVoucherLocally(settings.timeZoneId));
            }
            toast.info(
                willBeFullyPaid
                    ? (locale === "ar" ? "تمت إضافة الدفع إلى قائمة المزامنة" : "Payment queued — will sync when online")
                    : (locale === "ar" ? "تمت إضافة الدفعة الجزئية إلى قائمة المزامنة" : "Partial payment queued — will sync when online")
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
                    amountTendered: tendered,
                    changeAmount: change,
                    targetWindow: receiptWindow,
                });
            }
            return;
        }

        logPaymentFlow("payment success toast reached");
        toast.success(
            willBeFullyPaid
                ? (locale === "ar" ? `تم استلام الدفعة (${paymentMethodName}) - ${paidTableName}` : `Payment received (${paymentMethodName}) - ${paidTableName}`)
                : (locale === "ar" ? `تم حفظ دفعة جزئية (${paymentMethodName}) - ${paidTableName}` : `Partial payment saved (${paymentMethodName}) - ${paidTableName}`)
        );
        loadOrders();
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
                amountTendered: tendered,
                changeAmount: change,
                targetWindow: receiptWindow,
            });
        }
    };

    // Overlay any IDB-queued mutations on top of the server list so the UI
    // always reflects cashier intent — even after a refresh while offline.
    const effectiveOrders = useMemo(
        () => applyPendingOverlay(orders, pendingActions),
        [orders, pendingActions]
    );

    // Derived filter/sort state — pure function of raw list + filter inputs.
    // Switching tabs re-runs this memo synchronously; no API call, no stale cache.
    const {
        scoped: scopedOrderEntries,
        sorted: sortedOrders,
        tableOptions,
    } = useCashierOrderFilter(effectiveOrders, {
        statusFilter,
        typeFilter,
        tableFilter,
        dateFilter,
        currentUserId: cashierId,
        query,
        sortBy,
        timeZone: settings.timeZoneId,
    }, fullyCancelledOrderKeys);

    // Keep the open modal reflective of overlayed state (queued pay/status changes).
    const effectiveSelectedOrder = useMemo(() => {
        if (!selectedOrder) return null;
        return effectiveOrders.find((o) => o.id === selectedOrder.id) ?? selectedOrder;
    }, [selectedOrder, effectiveOrders]);
    const selectedOrderState = useMemo(
        () => (effectiveSelectedOrder ? getCashierOrderState(effectiveSelectedOrder) : null),
        [effectiveSelectedOrder]
    );
    const selectedOrderPaymentTarget = effectiveSelectedOrder ?? selectedOrder;
    const selectedOrderCancelPending =
        selectedOrderPaymentTarget?.hasPendingCancellation === true ||
        selectedOrderPaymentTarget?.hasPendingFullCancellation === true ||
        selectedOrderPaymentTarget?.status === ORDER_STATUS.PENDING_CANCELLATION_APPROVAL ||
        selectedOrderPaymentTarget?.cancellationInfo?.approvalStatus?.startsWith("Pending") === true;
    const canRequestCancelSelectedOrder =
        user != null &&
        CANCEL_REQUEST_ROLES.has(user.role) &&
        selectedOrderPaymentTarget != null &&
        !selectedOrderCancelPending &&
        !CANCEL_REQUEST_BLOCKED_STATUSES.has(selectedOrderPaymentTarget.status) &&
        selectedOrderPaymentTarget.isFullyCancelled !== true &&
        selectedOrderPaymentTarget.isRefunded !== true;
    const canRequestCancelSelectedOrderItem =
        canRequestCancelSelectedOrder &&
        selectedOrderPaymentTarget.orderType !== "Takeaway" &&
        selectedOrderState?.paymentStatus !== CASHIER_PAYMENT_STATUS.PAID &&
        selectedOrderState?.paymentStatus !== CASHIER_PAYMENT_STATUS.PARTIAL;
    const discountEligible = selectedOrderPaymentTarget?.orderSource === "Pos" &&
        (selectedOrderPaymentTarget.orderType === "DineIn" || selectedOrderPaymentTarget.orderType === "Takeaway");
    const selectedOrderCustomerName = selectedOrderPaymentTarget
        ? (locale === "ar"
            ? selectedOrderPaymentTarget.customerNameAr || selectedOrderPaymentTarget.customerName
            : selectedOrderPaymentTarget.customerName || selectedOrderPaymentTarget.customerNameAr)
            || selectedOrderPaymentTarget.talabatCustomerName
        : "";
    const selectedOrderCustomerPhone = selectedOrderPaymentTarget?.customerPhone?.trim() || selectedOrderPaymentTarget?.talabatCustomerPhone?.trim() || "";
    const selectedOrderSystemNumber = getSystemOrderDisplayNumber(selectedOrderPaymentTarget);
    const selectedOrderPaidAmount = selectedOrderPaymentTarget
        ? getOrderPaidAmount(selectedOrderPaymentTarget)
        : 0;
    const selectedOrderPaymentBreakdown = selectedOrderPaymentTarget
        ? getPaymentBreakdown(selectedOrderPaymentTarget)
        : [];
    const canEditDiscount = discountEligible &&
        selectedOrderPaidAmount <= 0.001 &&
        selectedOrderPaymentBreakdown.length === 0;
    const discountChange = selectedOrderPaymentTarget
        ? buildDiscountChange(selectedOrderPaymentTarget, discountType, discountValue)
        : undefined;
    const voucherAlreadyApplied = selectedOrderPaymentTarget?.isVoucherApplied === true;
    const canApplyVoucher = !!selectedOrderPaymentTarget &&
        !voucherAlreadyApplied &&
        selectedOrderPaidAmount <= 0.001 &&
        selectedOrderPaymentBreakdown.length === 0 &&
        voucherAvailability?.enabled === true &&
        (voucherAvailability?.remainingToday ?? 0) > 0;
    const voucherDisabledReason = voucherAlreadyApplied
        ? (locale === "ar" ? "تم تطبيق القسيمة على هذا الطلب" : "Voucher already applied to this order")
        : selectedOrderPaidAmount > 0.001 || selectedOrderPaymentBreakdown.length > 0
            ? (locale === "ar" ? "القسيمة متاحة قبل بدء الدفع فقط" : "Voucher is available before payment starts only")
            : !voucherAvailability
                ? (locale === "ar" ? "تعذر تحميل حالة القسيمة" : "Voucher availability unavailable")
            : voucherAvailability?.enabled === false
                ? (locale === "ar" ? "القسيمة غير مفعلة" : "Voucher is disabled")
            : (voucherAvailability?.remainingToday ?? 0) <= 0
                ? (locale === "ar" ? "تم الوصول إلى الحد اليومي للقسائم" : "Daily voucher limit reached")
                : undefined;
    const isVoucherRequested = applyVoucher && canApplyVoucher;
    const liveVoucherDiscount = calculateVoucherDiscount(displayTotal, voucherAvailability, isVoucherRequested);
    const displayVoucherDiscount = voucherAlreadyApplied
        ? selectedOrderPaymentTarget?.voucherDiscountAmount ?? 0
        : liveVoucherDiscount;
    const displayPayableTotal = calculateFinalTotalAfterVoucher(displayTotal, displayVoucherDiscount);
    // Remaining must be derived from the final post-tax total (displayTotal), not the server's
    // order.remainingAmount — the backend stores order.TotalAmount pre-tax until the first payment
    // lands (see PaymentService.RecalculateOrderTotals), which would otherwise show "Remaining"
    // as the pre-tax subtotal on a fresh order.
    const selectedOrderRemainingAmount = selectedOrderPaymentTarget
        ? Math.max(0, Math.round((displayPayableTotal - selectedOrderPaidAmount) * 100) / 100)
        : displayPayableTotal;
    const paymentAmountNum = parseFloat(paymentAmount) || 0;
    const tenderedNum = parseFloat(cashTendered) || 0;
    const cashChange = Math.max(0, tenderedNum - paymentAmountNum);
    const isZeroVoucherPayment = isVoucherRequested && selectedOrderRemainingAmount <= 0.001;
    const isPaymentAmountValid = isZeroVoucherPayment
        ? paymentAmountNum === 0
        : paymentAmountNum > 0 && paymentAmountNum <= selectedOrderRemainingAmount + 0.001;
    const isCashValid = pendingMethod !== "Cash" || (isPaymentAmountValid && tenderedNum >= paymentAmountNum);
    const canAdjustDeliveryPartnerPrices =
        user != null && DELIVERY_PARTNER_PRICE_ADJUSTMENT_ROLES.has(user.role);

    const handleDeliveryPartnerPriceAdjustmentSaved = (updatedOrder: OrderDto) => {
        setSelectedOrder(updatedOrder);
        setOrders((current) => current.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
        void loadOrders();
    };

    useEffect(() => {
        if (!isModalOpen || !selectedOrderPaymentTarget) return;
        if (selectedOrderRemainingAmount <= 0) {
            setPaymentAmount(isZeroVoucherPayment ? "0.00" : "");
            return;
        }
        setPaymentAmount(selectedOrderRemainingAmount.toFixed(2));
    }, [isModalOpen, selectedOrderPaymentTarget, selectedOrderRemainingAmount, isZeroVoucherPayment]);

    useEffect(() => {
        if (applyVoucher && !canApplyVoucher) {
            setApplyVoucher(false);
        }
    }, [applyVoucher, canApplyVoucher]);

    const totalOrders = scopedOrderEntries.length;
    const readyCount = scopedOrderEntries.filter(({ state }) => state.isReady && !state.served).length;
    const servedCount = scopedOrderEntries.filter(({ state }) => state.served).length;
    const paidCount = scopedOrderEntries.filter(({ state }) => state.isPaid).length;
    const pendingRev = scopedOrderEntries.reduce((sum, { order, state }) => (
        state.isPaid ? sum : sum + getOrderRemainingAmount(order)
    ), 0);

    return (
        <div className="flex flex-col min-h-screen bg-[#F4F5F7]">
            <AppHeader />
            <div className="p-4 md:p-6 space-y-4 flex-1">

                {/* ── Top Bar ─────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111827]">
                            {t("cashierTitle")}
                        </h1>
                        <p className="text-sm text-[#6B7280] mt-0.5">
                            {t("cashierSubtitle")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <OfflineBadge />
                        <div className="hidden sm:block">
                            <QrMenuButton variant="outline" size="default" showLabel={true} />
                        </div>
                        <Button
                            className="bg-primary text-primary-foreground font-bold gap-2 px-4 py-2 hover:bg-primary/90"
                            onClick={() => router.push("/ntxtakeawaypos?from=cashier")}  disabled={!isShiftLoaded || !isShiftOpen}
                        >
                            <ShoppingBag className="w-4 h-4" />
                            {t("takeawayOrderTitle")}
                        </Button>
                        {config.deliveryPartnersEnabled && (
                            <Button
                                className="bg-primary text-primary-foreground font-bold gap-2 px-4 py-2 hover:bg-primary/90"
                                data-talabat-debug="open-trigger"
                                onPointerDown={(event) => {
                                    pushCashierTalabatDebugLog("trigger:onPointerDown", {
                                        summary: summarizeCashierDebugEvent(event.nativeEvent),
                                    });
                                }}
                                onPointerUp={(event) => {
                                    pushCashierTalabatDebugLog("trigger:onPointerUp", {
                                        summary: summarizeCashierDebugEvent(event.nativeEvent),
                                    });
                                }}
                                onTouchStart={(event) => {
                                    pushCashierTalabatDebugLog("trigger:onTouchStart", {
                                        summary: summarizeCashierDebugEvent(event.nativeEvent),
                                    });
                                }}
                                onTouchEnd={(event) => {
                                    pushCashierTalabatDebugLog("trigger:onTouchEnd", {
                                        summary: summarizeCashierDebugEvent(event.nativeEvent),
                                    });
                                }}
                                onClick={(event) => {
                                    pushCashierTalabatDebugLog("trigger:onClick", {
                                        summary: summarizeCashierDebugEvent(event.nativeEvent),
                                    });
                                    handleDeliveryOrderDialogOpenChange(true);
                                }}
                                disabled={!isShiftLoaded || !isShiftOpen}
                            >
                                <ShoppingBag className="w-4 h-4" />
                                {locale === "ar" ? "طلب توصيل" : "Delivery Order"}
                            </Button>
                        )}
                        <Button
                            className="bg-primary text-primary-foreground font-bold gap-2 px-4 py-2 hover:bg-primary/90"
                            onClick={() => setIsShiftModalOpen(true)}
                        >
                            <Wallet className="w-4 h-4" />
                            {t("myShift")}
                        </Button>
                    </div>
                </div>

                <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
                    <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-[92vw] xl:max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t("cashDrawerMyShift")}</DialogTitle>
                            <DialogDescription>{t("cashierShiftOpenSubtitle")}</DialogDescription>
                        </DialogHeader>
                        <ShiftBalanceWidget />
                    </DialogContent>
                </Dialog>

                <TalabatOrderDialog
                    open={isDeliveryOrderModalOpen}
                    onOpenChange={handleDeliveryOrderDialogOpenChange}
                    onOrderCreated={async () => {
                        await loadOrders();
                    }}
                />

                {/* ── Stats Strip ─────────────────────────── */}
                <StatsStrip
                    total={totalOrders}
                    ready={readyCount}
                    served={servedCount}
                    pendingRevenue={pendingRev}
                    currency={currency}
                />

                {/* ── Toolbar ─────────────────────────────── */}
                <div className="bg-white border border-[#E4E6EA] rounded-xl p-3">
                    <Toolbar
                        totalCount={activityFilter === "orders" ? totalOrders : posLogs.length}
                        readyCount={readyCount}
                        paidCount={paidCount}
                        filteredCount={activityFilter === "orders" ? sortedOrders.length : posLogs.length}
                        statusFilter={statusFilter}
                        typeFilter={typeFilter}
                        tableFilter={tableFilter}
                        sortBy={sortBy}
                        query={query}
                        tableOptions={tableOptions}
                        onStatusFilter={setStatusFilter}
                        onTypeFilter={setTypeFilter}
                        onTableFilter={setTableFilter}
                        onSortBy={setSortBy}
                        onQuery={setQuery}
                        dateFilter={dateFilter}
                        onDateFilter={setDateFilter}
                        activityFilter={activityFilter}
                        onActivityFilter={setActivityFilter}
                    />
                </div>

                {activityFilter === "orders" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {sortedOrders.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center p-12 text-[#9CA3AF] border-2 border-dashed border-[#E4E6EA] rounded-xl bg-white">
                                <Clock className="w-12 h-12 mb-4 text-[#E4E6EA]" />
                                <p className="text-lg font-medium text-[#6B7280]">{t("noOpenTabs")}</p>
                            </div>
                        ) : (
                            sortedOrders.map(({ order, state }, i) => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    index={i}
                                    currency={currency}
                                    storeServiceRate={storeServiceChargeRate}
                                    storeTaxRate={storeTaxRate}
                                    onCollect={handleOrderClick}
                                    onStartPreparing={handleStartOnlinePreparation}
                                    onMarkReady={handleMarkOrderReady}
                                    onMarkDispatched={handleDispatchOnlineOrder}
                                    onMarkPickedUp={handleMarkOrderPickedUp}
                                    onResendKitchen={setResendKitchenOrder}
                                    isMarkingReady={markingReadyOrderId === order.id}
                                    isMarkingPickedUp={markingPickedUpOrderId === order.id}
                                    isUpdatingLifecycle={updatingLifecycleOrderId === order.id}
                                    paymentDisabled={!state.isPaid && (!isShiftLoaded || !isShiftOpen)}
                                    paymentDisabledMessage={!isShiftLoaded ? null : !isShiftOpen ? shiftClosedMessage : null}
                                />
                            ))
                        )}
                        {hasMoreOrders && sortedOrders.length > 0 && (
                            <div className="col-span-full flex justify-center py-2">
                                <Button
                                    variant="outline"
                                    onClick={() => void loadMoreOrders()}
                                    disabled={isLoadingMore}
                                >
                                    {isLoadingMore
                                        ? (locale === "ar" ? "جاري التحميل..." : "Loading...")
                                        : (locale === "ar" ? "تحميل المزيد" : "Load more")}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <PosLogList
                        logs={posLogs}
                        loading={posLogsLoading}
                        error={posLogsError}
                        currency={currency}
                    />
                )}

                <ResendKitchenTicketModal
                    order={resendKitchenOrder}
                    open={resendKitchenOrder !== null}
                    onOpenChange={(open) => {
                        if (!open) setResendKitchenOrder(null);
                    }}
                />

                {/* Cancel Order Modal */}
                {cancelTarget !== null && selectedOrder && (
                    <CancelOrderModal
                        order={{
                            id: selectedOrder.id,
                            orderNumber: selectedOrder.orderNumber,
                            orderSequenceNumber: selectedOrder.orderSequenceNumber,
                            tableName: selectedOrder.tableName,
                            items: (selectedOrder.items ?? []).map(i => ({
                                id: i.id ?? "",
                                productName: i.productName,
                                quantity: i.quantity,
                                price: i.unitPrice ?? (i.lineTotalAmount != null ? i.lineTotalAmount / Math.max(1, i.quantity) : 0),
                            })),
                            totalAmount: selectedOrder.totalAmount,
                        }}
                        cancelItemId={cancelTarget.itemId}
                        cancelItemName={cancelTarget.itemName}
                        onClose={() => setCancelTarget(null)}
                        onSuccess={(result) => {
                            if (result.orderCancelled) {
                                setFullyCancelledOrderKeys((prev) => {
                                    const next = new Set(prev);
                                    next.add(selectedOrder.id);
                                    next.add(selectedOrder.orderNumber);
                                    if (selectedOrder.orderSequenceNumber) next.add(selectedOrder.orderSequenceNumber);
                                    return next;
                                });
                                setOrders((prev) => prev.map((order) =>
                                    order.id === selectedOrder.id
                                        ? { ...order, status: "Cancelled", isFullyCancelled: true }
                                        : order
                                ));
                            }
                            setCancelTarget(null);
                            setSelectedOrder(null);
                            setPosLogsRefreshKey((value) => value + 1);
                            loadOrders();
                        }}
                        currency={currency}
                    />
                )}

                {/* Payment Modal */}
                <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setCashTendered(""); setPaymentAmount(""); setPendingMethod(null); setPaymentReferenceNumber(""); setApplyVoucher(false); } }}>
                    <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex justify-between items-center text-xl">
                                <span>
                                    {selectedOrderPaymentTarget?.orderSource === "DeliveryPartner"
                                        ? (locale === "ar"
                                            ? selectedOrderPaymentTarget.deliveryPartnerNameAr || selectedOrderPaymentTarget.deliveryPartnerName || selectedOrderPaymentTarget.deliveryPartnerCode || "شريك توصيل"
                                            : selectedOrderPaymentTarget.deliveryPartnerName || selectedOrderPaymentTarget.deliveryPartnerCode || "Delivery Partner")
                                        : selectedOrderPaymentTarget?.orderSource === "Talabat"
                                        ? (locale === "ar" ? "طلبات" : "Talabat")
                                        : selectedOrderPaymentTarget?.tableName === "TAKEAWAY"
                                        ? t("takeaway")
                                        : selectedOrderPaymentTarget?.tableName === "DELIVERY"
                                            ? (selectedOrderPaymentTarget.deliveryZoneName || (locale === "ar" ? "توصيل" : "Delivery"))
                                            : selectedOrderPaymentTarget?.tableName} - {t("paymentLabel")}
                                </span>
                                <Badge variant="outline" className="text-lg px-3 py-1 bg-slate-100">
                                    {formatCurrency(displayPayableTotal, currency)}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription>
                                <span className="block">{t("orderDetailsDesc")}</span>
                                {selectedOrderPaymentTarget ? (
                                    <span className="mt-1 block font-mono text-xs">
                                        {getOrderDisplayNumber(selectedOrderPaymentTarget)}
                                        {selectedOrderSystemNumber
                                            ? ` · ${locale === "ar" ? "رقم النظام" : "System ID"}: ${selectedOrderSystemNumber}`
                                            : ""}
                                    </span>
                                ) : null}
                            </DialogDescription>
                        </DialogHeader>
                        {(selectedOrderCustomerName || selectedOrderCustomerPhone) && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                {selectedOrderCustomerName && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-slate-500">{t("customerName")}</span>
                                        <span className="font-medium text-slate-900">{selectedOrderCustomerName}</span>
                                    </div>
                                )}
                                {selectedOrderCustomerPhone && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-slate-500">{t("phoneNumber")}</span>
                                        <span className="font-medium text-slate-900">{selectedOrderCustomerPhone}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* {selectedOrderState && (
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className={selectedOrderState.isReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                                    {selectedOrderState.isReady ? t("statusReady") : t("statusPreparing")}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={
                                        selectedOrderState.paymentStatus === CASHIER_PAYMENT_STATUS.PAID
                                            ? "border-green-200 bg-green-50 text-green-700"
                                            : selectedOrderState.paymentStatus === CASHIER_PAYMENT_STATUS.PARTIAL
                                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                                : "border-slate-200 bg-slate-50 text-slate-700"
                                    }
                                >
                                    {selectedOrderState.paymentStatus === CASHIER_PAYMENT_STATUS.REFUNDED
                                        ? t("statusRefunded")
                                        : selectedOrderState.paymentStatus === CASHIER_PAYMENT_STATUS.PARTIAL
                                        ? (locale === "ar" ? "مدفوع جزئيًا" : "Partially Paid")
                                        : selectedOrderState.isPaid
                                        ? t("statusPaid")
                                        : t("notPaid")}
                                </Badge>
                                {selectedOrderState.served && (
                                    <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
                                        {t("statusServed")}
                                    </Badge>
                                )}
                            </div>
                        )} */}

                        {/* Full status control — advance Pending → Preparing → Ready → Served */}
                        {/* {effectiveSelectedOrder && !selectedOrderState?.isCancelled && (
                            <StatusControl
                                order={effectiveSelectedOrder}
                                onAdvance={handleAdvanceStatus}
                                disabled={markingReadyOrderId === effectiveSelectedOrder.id || markingPickedUpOrderId === effectiveSelectedOrder.id}
                                locale={locale as "en" | "ar"}
                            />
                        )} */}

                        {/* Order Item List */}
                        <div className="my-2 border rounded-lg overflow-hidden">
                            <div className="bg-slate-100 px-4 py-2 border-b text-xs font-semibold text-slate-500 uppercase">
                                {t("orderSummary")}
                            </div>
                            <div className="w-full bg-white p-4 space-y-3">
                                    {groupedSelectedOrder?.offerBundles.length ? (
                                        groupedSelectedOrder.offerBundles.map((bundle, bundleIdx) => {
                                            const bundleContentsSummary = buildOfferContentsSummary(bundle.bundledOfferProducts || [], locale);
                                            const bundleDisplayName = bundle.productName || (locale === "ar" ? "عرض" : "Offer");
                                            const bundleCancelItemId = bundle.bundledOfferProducts?.find((p) => p.orderItemId)?.orderItemId;
                                            const bundleCancelPending = hasPendingItemCancellation(bundleCancelItemId);
                                            return (
                                                <div key={`cashier-bundle-${bundleIdx}`} className="flex justify-between items-start gap-3 rounded-md bg-amber-50/80 px-3 py-2 text-sm">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 font-medium text-amber-900">
                                                            <Gift className="h-4 w-4 text-amber-600" />
                                                            <span>
                                                                {locale === "ar" ? "عرض" : "Offer"}: {bundleDisplayName}
                                                            </span>
                                                        </div>
                                                        {bundleContentsSummary && (
                                                            <p className="mt-1 text-xs text-amber-700/80">
                                                                {bundleContentsSummary}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className="text-amber-900 font-mono text-xs font-semibold">
                                                            {formatCurrency(bundle.lineTotalAmount ?? 0, currency)}
                                                        </span>
                                                        {REFUND_AND_CANCEL_UI_ENABLED && canRequestCancelSelectedOrderItem && bundleCancelItemId && (
                                                            <button
                                                                type="button"
                                                                title={bundleCancelPending ? t("cancelPendingButton") : t("cancelOrderButtonItem")}
                                                                disabled={bundleCancelPending}
                                                                onClick={() => {
                                                                    if (bundleCancelPending) return;
                                                                    setIsModalOpen(false);
                                                                    setCancelTarget({ itemId: bundleCancelItemId, itemName: `Offer: ${bundleDisplayName}` });
                                                                }}
                                                                className="flex h-6 w-6 items-center justify-center rounded text-destructive/70 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <Ban className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (selectedOrder?.offerId && groupedSelectedOrder && groupedSelectedOrder.offerCoveredTotal > 0 && (
                                        <div className="flex justify-between items-start gap-3 rounded-md bg-amber-50/80 px-3 py-2 text-sm">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 font-medium text-amber-900">
                                                    <Gift className="h-4 w-4 text-amber-600" />
                                                    <span>
                                                        {locale === "ar" ? "عرض" : "Offer"}: {selectedOrderOfferDisplayName}
                                                    </span>
                                                </div>
                                                {selectedOrderOfferContentsSummary && (
                                                    <p className="mt-1 text-xs text-amber-700/80">
                                                        {selectedOrderOfferContentsSummary}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-amber-900 font-mono text-xs font-semibold">
                                                    {formatCurrency(groupedSelectedOrder.offerCoveredTotal, currency)}
                                                </span>
                                                <button
                                                    type="button"
                                                    title="Edit offer"
                                                    onClick={() => {
                                                        setEditOfferNote("");
                                                        setIsEditingOffer(true);
                                                    }}
                                                    className="flex h-6 w-6 items-center justify-center rounded text-orange-600/70 hover:bg-orange-100 hover:text-orange-700"
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(groupedSelectedOrder?.regularItems ?? selectedOrder?.items ?? []).map((item, index) => {
                                        const itemCancelPending = hasPendingItemCancellation(item.id);

                                        return (
                                        <div key={index} className="flex justify-between items-start text-sm gap-2">
                                            <div className="min-w-0 flex-1">
                                                <span className="font-medium text-slate-700">
                                                    {item.quantity}x {getItemDisplayName(item)}
                                                    {item.isComplimentary && (
                                                        <span className="ms-1 text-xs text-success font-normal">({t("complimentary")})</span>
                                                    )}
                                                </span>
                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {item.modifiers.map(m => locale === 'ar' && m.modifierNameAr ? m.modifierNameAr : m.modifierName).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-slate-600 font-mono text-xs">
                                                    {item.lineTotalAmount != null
                                                        ? formatCurrency(item.lineTotalAmount, currency)
                                                        : ''}
                                                </span>
                                                {REFUND_AND_CANCEL_UI_ENABLED && canRequestCancelSelectedOrderItem && item.id && (
                                                    <button
                                                        type="button"
                                                        title={itemCancelPending ? t("cancelPendingButton") : t("cancelOrderButtonItem")}
                                                        disabled={itemCancelPending}
                                                        onClick={() => {
                                                            if (itemCancelPending) return;
                                                            setIsModalOpen(false);
                                                            setCancelTarget({ itemId: item.id, itemName: item.productName });
                                                        }}
                                                        className="flex h-6 w-6 items-center justify-center rounded text-destructive/70 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Ban className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {selectedOrderPaymentTarget?.orderSource === "DeliveryPartner" && (
                            <DeliveryPartnerPriceAdjustment
                                order={selectedOrderPaymentTarget}
                                currency={currency}
                                locale={locale}
                                canAdjust={canAdjustDeliveryPartnerPrices}
                                isOnline={isOnline}
                                onSaved={handleDeliveryPartnerPriceAdjustmentSaved}
                            />
                        )}

                        {discountEligible && (
                            <DiscountControls
                                locale={locale}
                                canEdit={canEditDiscount}
                                type={discountType}
                                value={discountValue}
                                currency={currency}
                                onTypeChange={setDiscountType}
                                onValueChange={setDiscountValue}
                                onRemove={() => {
                                    setDiscountType(null);
                                    setDiscountValue(0);
                                }}
                            />
                        )}

                        {/* Price Breakdown */}
                        <div className="space-y-1.5 px-1 text-sm">
                            <div className="flex justify-between text-slate-500">
                                <span>{t("subtotal")}</span>
                                <span>{formatCurrency(displaySubtotal, currency)}</span>
                            </div>
                            {displayDiscount > 0 && (
                                <div className="flex justify-between text-destructive">
                                    <span>
                                        {t("discount")} ({discountType === "Percentage" ? `${discountValue}%` : formatCurrency(discountValue, currency)})
                                    </span>
                                    <span>-{formatCurrency(displayDiscount, currency)}</span>
                                </div>
                            )}
                            {displayGroupDiscount > 0 && (
                                <div className="flex justify-between text-destructive">
                                    <span>
                                        {discountGroupName || t("discountGroup")}{discountGroupType === 0 && discountGroupValue > 0 ? ` (${discountGroupValue}%)` : ""}
                                    </span>
                                    <span>-{formatCurrency(displayGroupDiscount, currency)}</span>
                                </div>
                            )}
                            {effectiveServiceRate > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>{t("serviceChargeLabel")} ({effectiveServiceRate}%)</span>
                                    <span>{formatCurrency(displayServiceAmount, currency)}</span>
                                </div>
                            )}
                            {effectiveTaxRate > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>{t("taxLabel")} ({effectiveTaxRate}%)</span>
                                    <span>{formatCurrency(displayTaxAmount, currency)}</span>
                                </div>
                            )}
                            {displayDeliveryFee > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>{locale === "ar" ? "رسوم التوصيل" : "Delivery fee"}</span>
                                    <span>{formatCurrency(displayDeliveryFee, currency)}</span>
                                </div>
                            )}
                            {displayTalabatDeliveryFee > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>{locale === "ar" ? "توصيل طلبات" : "Talabat delivery"}</span>
                                    <span>{formatCurrency(displayTalabatDeliveryFee, currency)}</span>
                                </div>
                            )}
                            {displayTalabatServiceFee > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>{locale === "ar" ? "خدمة طلبات" : "Talabat service"}</span>
                                    <span>{formatCurrency(displayTalabatServiceFee, currency)}</span>
                                </div>
                            )}
                            {displayPartnerDeliveryFee > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>{locale === "ar" ? "توصيل الشريك" : "Partner delivery"}</span>
                                    <span>{formatCurrency(displayPartnerDeliveryFee, currency)}</span>
                                </div>
                            )}
                            {displayPartnerServiceFee > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>{locale === "ar" ? "خدمة الشريك" : "Partner service"}</span>
                                    <span>{formatCurrency(displayPartnerServiceFee, currency)}</span>
                                </div>
                            )}
                            {displayVoucherDiscount > 0 && (
                                <div className="flex justify-between text-amber-700">
                                    <span>{locale === "ar" ? "القسيمة" : "Voucher"}</span>
                                    <span>-{formatCurrency(displayVoucherDiscount, currency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold">
                                <span className="text-base text-slate-800">{t("totalDue")}</span>
                                <span className="text-2xl text-slate-900">
                                    {formatCurrency(displayPayableTotal, currency)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {locale === "ar" ? "الإجمالي" : "Total"}
                                </div>
                                <div className="mt-1 text-sm font-bold text-slate-900">
                                    {formatCurrency(displayPayableTotal, currency)}
                                </div>
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {locale === "ar" ? "المدفوع" : "Paid"}
                                </div>
                                <div className="mt-1 text-sm font-bold text-emerald-700">
                                    {formatCurrency(selectedOrderPaidAmount, currency)}
                                </div>
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {locale === "ar" ? "المتبقي" : "Remaining"}
                                </div>
                                <div className="mt-1 text-sm font-bold text-amber-700">
                                    {formatCurrency(selectedOrderRemainingAmount, currency)}
                                </div>
                            </div>
                        </div>

                        {selectedOrderPaymentBreakdown.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {locale === "ar" ? "تفاصيل الدفعات" : "Payment Breakdown"}
                                </div>
                                <div className="space-y-1.5">
                                    {selectedOrderPaymentBreakdown.map((payment) => (
                                        <div key={`${payment.method}-${payment.amount}`} className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-slate-700">{payment.method}</span>
                                            <span className="font-semibold text-slate-900">{formatCurrency(payment.amount, currency)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payment footer — hidden for already-paid or completed orders */}
                        {selectedOrderState?.paymentStatus !== CASHIER_PAYMENT_STATUS.PAID &&
                        selectedOrderState?.paymentStatus !== CASHIER_PAYMENT_STATUS.REFUNDED &&
                        !selectedOrderCancelPending &&
                        !selectedOrderState?.isCompleted ? (
                            <div className="mt-3 space-y-3">
                                {isShiftLoaded && !isShiftOpen && (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                                        {shiftClosedMessage}
                                    </div>
                                )}
                                <VoucherControls
                                    locale={locale}
                                    currency={currency}
                                    enabled={isVoucherRequested}
                                    onEnabledChange={setApplyVoucher}
                                    availability={voucherAvailability}
                                    discountAmount={displayVoucherDiscount}
                                    disabled={!canApplyVoucher}
                                    disabledReason={voucherDisabledReason}
                                />
                                <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-slate-500 font-medium w-28 shrink-0">
                                            {locale === "ar" ? "مبلغ الدفعة" : "Payment Amount"}
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={selectedOrderRemainingAmount}
                                            step="0.01"
                                            placeholder={`${locale === "ar" ? "حد أقصى" : "Max"} ${selectedOrderRemainingAmount.toFixed(2)}`}
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            className="flex-1 h-8 px-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                                        />
                                    </div>
                                    {!isPaymentAmountValid && paymentAmount.length > 0 && (
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
                                                placeholder={`Min ${paymentAmountNum > 0 ? paymentAmountNum.toFixed(2) : selectedOrderRemainingAmount.toFixed(2)}`}
                                                value={cashTendered}
                                                onChange={(e) => setCashTendered(e.target.value)}
                                                autoFocus
                                                className="flex-1 h-8 px-2.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                            />
                                        </div>
                                        {tenderedNum > 0 && (
                                            <div className={`flex justify-between text-sm font-semibold px-1 ${isCashValid ? "text-emerald-700" : "text-destructive"}`}>
                                                <span>{isCashValid ? (t("change") || "Change") : (t("shortfall") || "Shortfall")}</span>
                                                <span>{isCashValid ? `+ ${formatCurrency(cashChange, currency)}` : `- ${formatCurrency(Math.max(0, paymentAmountNum - tenderedNum), currency)}`}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {pendingMethod === "Credit Card" && (
                                    <CardPaymentMethodSelector
                                        methods={cardPaymentMethods}
                                        selectedId={selectedPaymentMethodId}
                                        onSelectedIdChange={handleCardPaymentMethodChange}
                                        referenceNumber={paymentReferenceNumber}
                                        onReferenceNumberChange={setPaymentReferenceNumber}
                                        locale={locale}
                                        loading={paymentMethodsLoading}
                                        disabled={isPayingOrder}
                                    />
                                )}

                                {/* Payment buttons */}
                                <DialogFooter className="flex-col sm:flex-row gap-3 !mt-0">
                                    <Button
                                        className={`flex-1 h-12 text-base ${pendingMethod === "Cash" ? "bg-success text-white hover:bg-success/90" : "border border-success/30 bg-success/10 text-success hover:bg-success/20"}`}
                                        onClick={() => {
                                            if (pendingMethod !== "Cash") { setPendingMethod("Cash"); setCashTendered(""); setPaymentReferenceNumber(""); }
                                            else if (isCashValid) handlePayment("Cash");
                                        }}
                                        disabled={isPayingOrder || !isShiftLoaded || !isShiftOpen || !isPaymentAmountValid || (pendingMethod === "Cash" && !isCashValid)}
                                    >
                                        {isPayingOrder && pendingMethod === "Cash" ? (
                                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                                        ) : (
                                            <Banknote className="me-2 h-5 w-5" />
                                        )}
                                        {pendingMethod === "Cash" && isCashValid
                                            ? (selectedOrderRemainingAmount - paymentAmountNum <= 0.001
                                                ? (locale === "ar" ? "إكمال نقدًا" : "Complete with Cash")
                                                : (locale === "ar" ? "إضافة دفعة نقدية" : "Add Cash Payment"))
                                            : t("payWithCash")}
                                    </Button>
                                    <Button
                                        className={`flex-1 h-12 text-base ${pendingMethod === "Credit Card" ? "bg-info text-white hover:bg-info/90" : "border border-info/30 bg-info/10 text-info hover:bg-info/20"}`}
                                        onClick={() => {
                                            if (pendingMethod !== "Credit Card") setPendingMethod("Credit Card");
                                            else handlePayment("Credit Card");
                                        }}
                                        disabled={isPayingOrder || !isShiftLoaded || !isShiftOpen || !isPaymentAmountValid || !isOnline || cardPaymentConfirmBlocked}
                                        title={!isOnline ? (locale === "ar" ? "بطاقة الائتمان غير متاحة دون اتصال — استخدم النقد" : "Card payment requires online connection — use Cash") : undefined}
                                    >
                                        {isPayingOrder && pendingMethod === "Credit Card" ? (
                                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                                        ) : (
                                            <CreditCard className="me-2 h-5 w-5" />
                                        )}
                                        {!isOnline
                                            ? (locale === "ar" ? "بطاقة (متصل فقط)" : "Card (online only)")
                                            : pendingMethod === "Credit Card"
                                                ? (selectedOrderRemainingAmount - paymentAmountNum <= 0.001
                                                    ? (locale === "ar" ? "إكمال بالبطاقة" : "Complete with Card")
                                                    : (locale === "ar" ? "إضافة دفعة بطاقة" : "Add Card Payment"))
                                                : t("payWithCard")}
                                    </Button>
                                </DialogFooter>
                            </div>
                        ) : selectedOrderCancelPending ? (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800">
                                {t("cancelPendingButton")}
                            </div>
                        ) : (
                            <div className="mt-2 space-y-3">
                                <DialogFooter className="flex justify-between items-center gap-3">
                                    <span className="text-sm font-semibold text-green-600">
                                        {selectedOrderState?.paymentStatus === CASHIER_PAYMENT_STATUS.REFUNDED
                                            ? t("statusRefunded")
                                            : `✓ ${t("alreadyPaid")}`}
                                    </span>
                                    <PrintReceiptButton order={selectedOrderPaymentTarget} className="h-11 text-base" label="Reprint Receipt" />
                                </DialogFooter>
                                {selectedOrderState?.paymentStatus === CASHIER_PAYMENT_STATUS.PAID &&
                                    (selectedOrderPaymentTarget?.payments?.length ?? 0) > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isOnline || !selectedOrderPaymentTarget) return;
                                            setIsModalOpen(false);
                                            setPaymentAdjustmentOrder(selectedOrderPaymentTarget);
                                        }}
                                        disabled={!isOnline}
                                        title={!isOnline
                                            ? (locale === "ar" ? "تعديل طريقة الدفع يتطلب اتصالاً" : "Payment adjustment requires an online connection")
                                            : undefined}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ArrowRightLeft className="h-4 w-4" />
                                        {locale === "ar" ? "تغيير طريقة الدفع" : "Change Payment Method"}
                                    </button>
                                )}
                                {/* Refund button — only for Paid orders */}
                                {REFUND_AND_CANCEL_UI_ENABLED && selectedOrderState?.paymentStatus === CASHIER_PAYMENT_STATUS.PAID && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            setRefundOrder(selectedOrderPaymentTarget);
                                        }}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                                    >
                                        {t("refundOrderButton")}
                                    </button>
                                )}
                            </div>
                        )}
                        {canRequestCancelSelectedOrder && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!selectedOrderPaymentTarget) return;
                                    setIsModalOpen(false);
                                    setSelectedOrder(selectedOrderPaymentTarget);
                                    setCancelTarget({});
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
                            >
                                <Ban className="h-4 w-4" />
                                {t("cancelOrderButton")}
                            </button>
                        )}
                    </DialogContent>
                </Dialog>

                {paymentAdjustmentOrder !== null && (
                    <PaymentAdjustmentDialog
                        order={paymentAdjustmentOrder}
                        currency={currency}
                        onClose={() => setPaymentAdjustmentOrder(null)}
                        onSuccess={() => {
                            setPaymentAdjustmentOrder(null);
                            setSelectedOrder(null);
                            loadOrders();
                        }}
                    />
                )}

                {/* Refund modal */}
                {refundOrder !== null && (
                    <RefundOrderModal
                        order={{
                            id: refundOrder.id,
                            orderNumber: refundOrder.orderNumber,
                            orderSequenceNumber: refundOrder.orderSequenceNumber,
                            tableName: refundOrder.tableName,
                            totalAmount: refundOrder.totalAmount,
                            paymentMethod: refundOrder.paymentMethod,
                            isPaid: getCashierOrderState(refundOrder).isPaid,
                        }}
                        onClose={() => setRefundOrder(null)}
                        onSuccess={(result) => {
                            const cancelledOrder = refundOrder;
                            if (!cancelledOrder) return;
                            if (result.orderCancelled) {
                                setFullyCancelledOrderKeys((prev) => {
                                    const next = new Set(prev);
                                    next.add(cancelledOrder.id);
                                    next.add(cancelledOrder.orderNumber);
                                    if (cancelledOrder.orderSequenceNumber) {
                                        next.add(cancelledOrder.orderSequenceNumber);
                                    }
                                    return next;
                                });
                                setOrders((prev) => prev.filter((order) => order.id !== cancelledOrder.id));
                                void markConfirmedCancelledOrderSnapshot(
                                    cancelledOrder.id,
                                    cancelledOrder,
                                    result.refunded,
                                );
                                setSelectedOrder(null);
                                setIsModalOpen(false);
                            } else {
                                const pendingOrder: OrderDto = {
                                    ...cancelledOrder,
                                    status: ORDER_STATUS.PENDING_CANCELLATION_APPROVAL,
                                    hasPendingCancellation: true,
                                    hasPendingFullCancellation: true,
                                };
                                setOrders((prev) => prev.map((order) =>
                                    order.id === pendingOrder.id ? pendingOrder : order
                                ));
                                setSelectedOrder(pendingOrder);
                                setIsModalOpen(true);
                            }
                            setRefundOrder(null);
                            setPosLogsRefreshKey((value) => value + 1);
                            debouncedLoadOrders();
                        }}
                        currency={currency}
                        intent="cancel"
                    />
                )}

                {/* Edit Offer Modal */}
                <Dialog open={isEditingOffer} onOpenChange={setIsEditingOffer}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Edit Offer</DialogTitle>
                            <DialogDescription>
                                Add special instructions or notes to this offer
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-2">
                                    Notes
                                </label>
                                <textarea
                                    value={editOfferNote}
                                    onChange={(e) => setEditOfferNote(e.target.value)}
                                    placeholder="Enter any special instructions..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditingOffer(false)}>
                                {t("cancel")}
                            </Button>
                            <Button
                                onClick={() => {
                                    // For now, just close the modal
                                    // In future: API call to update offer notes
                                    setIsEditingOffer(false);
                                }}
                            >
                                {t("save")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

