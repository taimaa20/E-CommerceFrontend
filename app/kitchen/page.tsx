"use client";

import React, { useEffect, useState } from "react";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-provider";
import AppHeader from "@/components/layout/AppHeader";
import { appendBranchQuery } from "@/lib/branch-selection";
import {
    decideKitchenCancelRequest,
    getKitchenCancelRequests,
    getKitchenOrders,
    KitchenCancelDecision,
    KitchenCancelRequest,
    markOrderAsReady,
    markOrderItemAsReady,
    markOrderAsServed,
} from "@/lib/api";
import { usePosStore } from "@/store/posStore";
import { useAuthStore } from "@/store/authStore";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { canAccessArea, getUnauthorizedRedirect } from "@/lib/authorization";
import { config } from "@/lib/config";
import { ITEM_STATUS, ORDER_STATUS, isStatusReady, normalizeOrderStatus, getStatusLabel, getStatusClass } from "@/lib/status-constants";
import { getConnectivityState, subscribeConnectivity, type ConnectivityState } from "@/lib/offline/connectivity";
import { enqueueMarkReadyOffline, enqueueMarkServedOffline } from "@/lib/offline/orders";
import { useOfflineCashierStore } from "@/store/offlineCashierStore";
import {
    listKitchenSnapshots,
    replaceKitchenSnapshots,
    subscribeSnapshots,
} from "@/lib/offline/db";
import { formatOrderSequence } from "@/lib/order-sequence";
import { toast } from "sonner";
import { useSettingsStore } from "@/store/settingsStore";
import {
    addCalendarDays,
    formatRestaurantTime,
    getRestaurantToday,
    parseUtcInstant,
    startOfRestaurantDayUtc,
} from "@/lib/date-time";

interface KdsOrderItem {
    id: string;         // orderItemId — required for per-item ready (Guid.Empty for bundle wrapper)
    offerLineId?: number | null; // Present on bundle wrappers to identify the offer grouping
    productName: string;
    productNameAr?: string;
    quantity: number;
    notes?: string;
    itemStatus?: string;
    isNewlyAdded?: boolean; // true = item added to existing order (NEW badge)
    preparationStation: number;
    selectedOptionName?: string | null;
    selectedOptionNameAr?: string | null;
    modifiers: {
        modifierName: string;
        modifierNameAr?: string;
    }[];
    isOfferBundle?: boolean;  // True if this is a bundled offer display item
    bundledOfferProducts?: Array<{
        name: string;
        nameAr?: string;
        quantity: number;
        // Real OrderItem row id for the bundled child — kitchen Ready targets this
        orderItemId?: string;
        isReady?: boolean;
    }>;
    // Per-ingredient swap snapshot — rows where sourceAlternativeId is set mean
    // the cashier picked an alternative (Saj instead of Pita, etc.) and the
    // line cook needs to see the substitute.
    recipeSnapshot?: Array<{
        sourceAlternativeId?: string | null;
        sourceAlternativeName?: string | null;
        sourceAlternativeNameAr?: string | null;
        rawMaterialName: string;
        rawMaterialNameAr?: string;
    }>;
}

interface KdsOrder {
    id: string;
    orderNumber: string;
    orderSequenceNumber?: string | null;
    tableName: string; // Add table name
    orderType?: string; // "DineIn" or "Takeaway"
    offerNote?: string;
    status: string;
    createdAt?: string;
    lastUpdatedAt?: string; // Set when items are added/removed/updated — used for sorting
    items: KdsOrderItem[];
}

export default function KitchenPage() {
    const { t, locale } = useLocale();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const { products, fetchProducts } = usePosStore();
    const branchVersion = useActiveBranchVersion();
    const lastLoadedBranchVersionRef = React.useRef(branchVersion);
    const [mounted, setMounted] = useState(false);
    const [orders, setOrders] = useState<KdsOrder[]>([]);
    const [connection, setConnection] = useState<HubConnection | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'ready'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'dinein' | 'takeaway'>('all');
    const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
    const [searchQuery, setSearchQuery] = useState('');
    const [cancelRequests, setCancelRequests] = useState<KitchenCancelRequest[]>([]);
    const [decidingCancelId, setDecidingCancelId] = useState<string | null>(null);
    const [connectivity, setConnectivity] = useState<ConnectivityState>("online");
    const isOnline = connectivity === "online";
    const bootstrapOffline = useOfflineCashierStore((s) => s.bootstrap);

    useEffect(() => {
        setMounted(true);
        void bootstrapOffline();
        setConnectivity(getConnectivityState());
        return subscribeConnectivity(setConnectivity);
    }, [bootstrapOffline]);

    useEffect(() => {
        if (!mounted) return;
        if (!canAccessArea(user?.role, "kitchen")) {
            router.replace(getUnauthorizedRedirect(isAuthenticated, user?.role));
        }
    }, [isAuthenticated, mounted, router, user?.role]);

    // ============================================================
    // STATUS HELPERS - Use these for ALL logic and comparisons
    // ============================================================
    // ⚠️ CRITICAL: These use CONSTANTS, not translated values
    
    const getItemStatusLabel = (itemStatus?: string) => {
        // Returns: translated display label (e.g., "جاهز" in Arabic)
        return getStatusLabel(itemStatus || ITEM_STATUS.PREPARING, locale);
    };

    const getKitchenStatusClass = (status?: string) => {
        // Returns: CSS class based on NORMALIZED status (uses constants, NOT translated)
        const normalized = normalizeOrderStatus(status);
        return getStatusClass(normalized);
    };

    const getKitchenStatusLabel = (status?: string) => {
        // Returns: translated display label based on NORMALIZED status
        const normalized = normalizeOrderStatus(status);
        return getStatusLabel(normalized, locale);
    };

    const normalizeKitchenStatus = (status?: string) => {
        // Deprecated: use normalizeOrderStatus instead
        // Kept for backwards compatibility
        return normalizeOrderStatus(status);
    };

    const isPaidOrder = (status?: string) => status === ORDER_STATUS.PAID;

    const getOrderInvoiceState = (status?: string) => (status === ORDER_STATUS.PAID || status === ORDER_STATUS.CANCELLED) ? t("Close") : t("Open");
    
    const getItemDisplayName = (item: { productId?: string; productName: string; productNameAr?: string }) => {
        if (locale === 'ar') {
            const p = products.find(pr => pr.id === item.productId);
            if (p?.nameAr) return p.nameAr;
            if (item.productNameAr) return item.productNameAr;
        }
        const p = products.find(pr => pr.id === item.productId);
        return p ? (p.displayName || p.name) : item.productName;
    };

    // 0. Initial Load — re-runs on branch switch (products are branch-scoped
    // and the POS store is reset by the switch).
    useEffect(() => {
        fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchVersion]);

    useEffect(() => {
        // Branch switch: clear the feed first — the "only overwrite when
        // non-empty" guard below would otherwise pin the previous branch's
        // orders when the newly-active branch has an empty kitchen queue.
        const branchSwitched = lastLoadedBranchVersionRef.current !== branchVersion;
        lastLoadedBranchVersionRef.current = branchVersion;
        if (branchSwitched) setOrders([]);

        const fetchOrders = async () => {
            // Online: hit the server; an empty cached fallback here would blank
            // the KDS, so only overwrite local state when we actually got rows.
            // Offline/degraded: skip the fetch entirely — the hydrate effect
            // below restores the last-known queue from IDB.
            if (getConnectivityState() !== "online") return;
            const data = await getKitchenOrders(dateFilter);
            if (Array.isArray(data) && data.length > 0) {
                setOrders(data);
            }
        };
        fetchOrders();
    }, [dateFilter, branchVersion]);

    // Cancellation approvals are handled by Admin (Admin Orders screen), not the kitchen.
    // The kitchen never lists or decides cancellation requests.
    const refreshCancelRequests = async () => {
        setCancelRequests([]);
    };

    useEffect(() => {
        if (!mounted || !isOnline) return;
        void refreshCancelRequests().catch(() => {
            /* cancel approvals are best-effort during initial load */
        });
    }, [mounted, isOnline]);

    // Offline/degraded rehydrate: read the persisted kitchen feed from IDB so
    // a reload or a SignalR drop keeps the KDS populated. Subscribe so writes
    // from peer tabs (cashier puts an item through → backend pushes → other
    // kitchen tab writes snapshot → BroadcastChannel fans out here) show up
    // without a polling loop. Read-only — no mutations happen in this effect.
    useEffect(() => {
        if (!mounted) return;
        if (isOnline) return;
        let cancelled = false;
        const hydrate = async () => {
            try {
                const snaps = await listKitchenSnapshots();
                if (cancelled) return;
                if (snaps.length) {
                    setOrders(snaps.map((s) => s.data as KdsOrder));
                }
            } catch {
                /* IDB errors must never blank the KDS */
            }
        };
        void hydrate();
        const unsub = subscribeSnapshots(() => {
            void hydrate();
        });
        return () => {
            cancelled = true;
            unsub();
        };
    }, [isOnline, mounted]);

    // Mirror the in-memory kitchen queue into IDB on every change so a refresh
    // while online preserves the feed when the page comes back offline, and
    // so peer tabs pick up the same feed via the snapshot BroadcastChannel.
    // Guarded by `mounted` to avoid writing the empty initial state.
    useEffect(() => {
        if (!mounted) return;
        void replaceKitchenSnapshots(
            orders.map((o) => ({ id: o.id, data: o, status: o.status }))
        ).catch(() => {
            /* snapshot mirroring is best-effort */
        });
    }, [orders, mounted]);

    useEffect(() => {
        if (!isOnline) {
            setConnection(null);
            return;
        }
        // FIX(bug-2a): Default `.withAutomaticReconnect()` bails out after four
        // attempts (0, 2s, 10s, 30s) and then silently stays dead — the KDS went
        // cold on any outage longer than ~45s. Swap in an infinite-retry policy
        // with capped exponential backoff so the kitchen always rejoins once
        // the hub is reachable again.
        const connect = new HubConnectionBuilder()
            .withUrl(appendBranchQuery(config.signalRUrl), {
                accessTokenFactory: () => useAuthStore.getState().user?.token || ""
            })
            .withAutomaticReconnect({
                nextRetryDelayInMilliseconds: (ctx) => {
                    const steps = [0, 2_000, 5_000, 10_000, 30_000];
                    return steps[Math.min(ctx.previousRetryCount, steps.length - 1)];
                },
            })
            .configureLogging(LogLevel.Information)
            .build();

        setConnection(connect);
    // branchVersion: the hub URL carries the branch group — rebuild the
    // connection on switch so the KDS only receives the active branch's events.
    }, [isOnline, branchVersion]);

    useEffect(() => {
        if (connection) {
            // FIX(bug-2): Re-pull the full kitchen feed whenever the hub
            // reconnects. While disconnected we may have missed ReceiveNewOrder /
            // OrderReady / ItemReady pushes — without this the KDS would show
            // the pre-outage state indefinitely after recovery.
            connection.onreconnected(() => {
                if (getConnectivityState() !== "online") return;
                void getKitchenOrders(dateFilter).then((data) => {
                    if (Array.isArray(data) && data.length > 0) setOrders(data);
                }).catch(() => {
                    /* recovery fetch is best-effort */
                });
            });
            connection
                .start()
                .then(() => {
                    console.log("SignalR Connected to KitchenHub");

                    // 2. Listen for 'ReceiveNewOrder'
                    connection.on("ReceiveNewOrder", (newOrder: KdsOrder) => {
                        console.log("New Order Received:", newOrder);
                        setOrders((prev) => {
                            const exists = prev.some((order) => order.id === newOrder.id);
                            if (exists) {
                                // Update in-place; sorting will move it to top via lastUpdatedAt
                                return prev.map((order) => (order.id === newOrder.id ? newOrder : order));
                            }

                            return [newOrder, ...prev];
                        });
                    });

                    connection.on("OrderReady", (payload: any) => {
                        const readyOrderId = payload?.OrderId || payload?.orderId;
                        if (!readyOrderId) return;

                        setOrders((prev) =>
                            prev.map((order) =>
                                order.id === readyOrderId
                                    ? {
                                        ...order,
                                        status: ORDER_STATUS.READY,
                                        items: order.items.map((item) => ({ ...item, itemStatus: ITEM_STATUS.READY })),
                                    }
                                    : order
                            )
                        );
                    });

                    connection.on("OrderPaid", (payload: any) => {
                        const paidOrderId = payload?.OrderId || payload?.orderId;
                        if (!paidOrderId) return;
                        setOrders((prev) =>
                            prev.map((order) =>
                                order.id === paidOrderId ? { ...order, status: "Paid" } : order
                            )
                        );
                    });

                    connection.on("OrderServed", (payload: any) => {
                        const servedOrderId = payload?.OrderId || payload?.orderId;
                        if (!servedOrderId) return;
                        setOrders((prev) =>
                            prev.map((order) =>
                                order.id === servedOrderId ? { ...order, status: ORDER_STATUS.SERVED } : order
                            )
                        );
                    });

                    // NEW: Per-item notifications
                    connection.on("NewItemsAdded", (payload: any) => {
                        const oid = payload?.OrderId || payload?.orderId;
                        if (!oid) return;
                        console.log(`[Kitchen] New items added to Order #${payload?.OrderNumber}`, payload?.NewItems);
                        // The full order update is already handled by ReceiveNewOrder — this event is for awareness/toast only
                    });

                    connection.on("ItemReady", (payload: any) => {
                        const oid = payload?.OrderId || payload?.orderId;
                        const itemId = payload?.OrderItemId || payload?.orderItemId;
                        if (!oid || !itemId) return;
                        setOrders((prev) =>
                            prev.map((order) => {
                                if (order.id !== oid) return order;
                                const updatedItems = order.items.map((item) =>
                                    item.id === itemId ? { ...item, itemStatus: ITEM_STATUS.READY, isNewlyAdded: false } : item
                                );
                                const allReady = updatedItems.every((i) => isStatusReady(i.itemStatus));
                                return {
                                    ...order,
                                    status: allReady ? ORDER_STATUS.READY : order.status,
                                    items: updatedItems,
                                };
                            })
                        );
                    });

                    // Takeaway picked up — remove from kitchen display immediately
                    connection.on("OrderPickedUp", (payload: any) => {
                        const oid = payload?.OrderId || payload?.orderId;
                        if (!oid) return;
                        setOrders((prev) => prev.filter((order) => order.id !== oid));
                    });

                    connection.on("CancelRequested", () => {
                        void refreshCancelRequests().catch(() => {});
                    });

                    connection.on("CancellationResolved", (payload: any) => {
                        const cancelLogId = payload?.CancelLogId || payload?.cancelLogId;
                        if (cancelLogId) {
                            setCancelRequests((prev) => prev.filter((r) => r.cancelLogId !== cancelLogId));
                        } else {
                            void refreshCancelRequests().catch(() => {});
                        }
                    });
                })
                .catch((err) => {
                    // Ignore the specific error "The connection was stopped during negotiation" which happens in React Strict Mode
                    if (err.message && err.message.includes("stopped during negotiation")) {
                        console.log("SignalR connection cancelled during negotiation (cleanup).");
                    } else {
                        console.warn("SignalR not connected:", err.message);
                    }
                });

            return () => {
                connection.off("ReceiveNewOrder");
                connection.off("OrderReady");
                connection.off("OrderPaid");
                connection.off("OrderServed");
                connection.off("NewItemsAdded");
                connection.off("ItemReady");
                connection.off("OrderPickedUp");
                connection.off("CancelRequested");
                connection.off("CancellationResolved");
                connection.stop().catch(() => {
                    // Ignore stop errors
                });
            };
        }
    }, [connection]);

    const applyReadyLocally = (orderId: string) =>
        setOrders((prev) =>
            prev.map((order) =>
                order.id === orderId
                    ? {
                        ...order,
                        status: ORDER_STATUS.READY,
                        items: order.items.map((item) => ({ ...item, itemStatus: ITEM_STATUS.READY })),
                    }
                    : order
            )
        );

    const applyServedLocally = (orderId: string) =>
        setOrders((prev) =>
            prev.map((order) =>
                order.id === orderId ? { ...order, status: ORDER_STATUS.SERVED } : order
            )
        );

    const handleMarkReady = async (orderId: string) => {
        // Optimistic UI — kitchen must feel instant regardless of connectivity.
        applyReadyLocally(orderId);
        if (getConnectivityState() !== "online") {
            await enqueueMarkReadyOffline(orderId);
            return;
        }
        try {
            const success = await markOrderAsReady(orderId);
            if (!success) {
                // Network/HTTP failed — queue so the update is not lost.
                await enqueueMarkReadyOffline(orderId);
            }
        } catch (error) {
            console.error("Error marking order ready:", error);
            await enqueueMarkReadyOffline(orderId);
        }
    };

    const handleMarkServed = async (orderId: string) => {
        applyServedLocally(orderId);
        if (getConnectivityState() !== "online") {
            await enqueueMarkServedOffline(orderId);
            return;
        }
        try {
            const success = await markOrderAsServed(orderId);
            if (!success) await enqueueMarkServedOffline(orderId);
        } catch (error) {
            console.error("Error marking order as served:", error);
            await enqueueMarkServedOffline(orderId);
        }
    };

    const handleMarkItemReady = async (orderId: string, itemId: string) => {
        // Optimistic local update first so the UI is identical online/offline.
        let willAllBeReady = false;
        setOrders((prev) =>
            prev.map((order) => {
                if (order.id !== orderId) return order;
                const items = order.items.map((item) =>
                    item.id === itemId ? { ...item, itemStatus: ITEM_STATUS.READY, isNewlyAdded: false } : item
                );
                willAllBeReady = items.every((i) => isStatusReady(i.itemStatus));
                return {
                    ...order,
                    status: willAllBeReady ? ORDER_STATUS.READY : order.status,
                    items,
                };
            })
        );

        if (getConnectivityState() !== "online") {
            // Per-item endpoint has no offline action type yet — fall back to
            // enqueueing a full mark-ready once every item is locally ready.
            if (willAllBeReady) await enqueueMarkReadyOffline(orderId);
            return;
        }

        try {
            const result = await markOrderItemAsReady(orderId, itemId);
            if (!result && willAllBeReady) {
                await enqueueMarkReadyOffline(orderId);
            }
        } catch (error) {
            console.error("Error marking item ready:", error);
            if (willAllBeReady) await enqueueMarkReadyOffline(orderId);
        }
    };

    // Offer bundles are a synthetic wrapper (id = Guid.Empty). Real OrderItem rows
    // live in bundledOfferProducts[].orderItemId. Iterate children and mark each
    // real row ready, then flip the bundle's own itemStatus to Ready in local state.
    const handleMarkBundleReady = async (orderId: string, bundle: KdsOrderItem) => {
        const children = (bundle.bundledOfferProducts ?? []).filter(
            (c) => !!c.orderItemId && !c.isReady
        );
        if (children.length === 0) return;

        let lastResult: Awaited<ReturnType<typeof markOrderItemAsReady>> | null = null;
        for (const child of children) {
            try {
                const res = await markOrderItemAsReady(orderId, child.orderItemId!);
                if (res) lastResult = res;
            } catch (error) {
                console.error("Error marking bundled item ready:", error);
            }
        }
        if (!lastResult) return;

        const allReadyFromServer = lastResult.allReady;
        setOrders((prev) =>
            prev.map((order) => {
                if (order.id !== orderId) return order;
                return {
                    ...order,
                    status: allReadyFromServer ? ORDER_STATUS.READY : order.status,
                    items: order.items.map((item) => {
                        if (item.offerLineId !== bundle.offerLineId || !item.isOfferBundle) return item;
                        return {
                            ...item,
                            itemStatus: ITEM_STATUS.READY,
                            isNewlyAdded: false,
                            bundledOfferProducts: item.bundledOfferProducts?.map((c) => ({
                                ...c,
                                isReady: true,
                            })),
                        };
                    }),
                };
            })
        );
    };

    const handleCancelDecision = async (
        request: KitchenCancelRequest,
        decision: typeof KitchenCancelDecision[keyof typeof KitchenCancelDecision],
    ) => {
        setDecidingCancelId(request.cancelLogId);
        try {
            await decideKitchenCancelRequest(request.cancelLogId, decision);
            setCancelRequests((prev) => prev.filter((r) => r.cancelLogId !== request.cancelLogId));
            await getKitchenOrders(dateFilter).then((data) => {
                if (Array.isArray(data)) setOrders(data);
            });
            toast.success(locale === "ar" ? "تم تحديث طلب الإلغاء" : "Cancellation request updated");
        } catch (error: any) {
            const message = error?.response?.data || error?.message || (locale === "ar" ? "فشل القرار" : "Decision failed");
            toast.error(typeof message === "string" ? message : (locale === "ar" ? "فشل القرار" : "Decision failed"));
        } finally {
            setDecidingCancelId(null);
        }
    };

    return (
        <div className="min-h-screen kitchen-container flex flex-col">
            <AppHeader />
            <div className="p-3 sm:p-6 flex-1">
                {(() => {
                    // ✅ CRITICAL FIX: Use constants for logic, not translated values!
                    // ============================================================
                    
                    // Check if item is ready using CONSTANT, not translated label
                    const isItemReady = (itemStatus?: string) => isStatusReady(itemStatus);

                    // Check if all items in order are ready OR order-level status is Ready.
                    // Double-check covers the case where order.status was set to Ready but a
                    // concurrent ItemReady event hasn't yet updated every item in local state.
                    const isOrderReady = (o: KdsOrder) =>
                        o.items.every(i => isItemReady(i.itemStatus)) ||
                        normalizeOrderStatus(o.status) === ORDER_STATUS.READY;

                    // Check if order is still pending (any item not ready)
                    const isOrderPending = (o: KdsOrder) => !isOrderReady(o);

                    const today = getRestaurantToday(timeZone);
                    const startOfToday = parseUtcInstant(startOfRestaurantDayUtc(today, timeZone));

                    // Mirror the backend "today" DB filter locally so SignalR-pushed orders
                    // are filtered consistently without a round-trip.
                    // BOTH branches are bounded by the 3-day lookback — mirrors the backend exactly.
                    const lookbackStart = parseUtcInstant(
                        startOfRestaurantDayUtc(addCalendarDays(today, -3), timeZone),
                    );

                    const passesTodayFilter = (order: KdsOrder): boolean => {
                        if (!order.createdAt) return true; // keep if timestamp missing
                        const ts = parseUtcInstant(order.createdAt);
                        if (ts >= startOfToday) return true; // today: all statuses
                        if (ts < lookbackStart) return false; // beyond 3-day window: always exclude
                        // Previous days within window: show only if not in terminal state
                        const s = normalizeOrderStatus(order.status);
                        return s !== ORDER_STATUS.READY &&
                            s !== ORDER_STATUS.SERVED &&
                            s !== ORDER_STATUS.COMPLETED;
                    };

                    const visibleOrders = orders
                        .filter(order => order.status !== 'Cancelled')
                        .filter(order => order.items.length > 0)
                        .filter(order => dateFilter === 'all' || passesTodayFilter(order))
                        // Sort DESC by lastUpdatedAt (item added/updated) → fallback to createdAt
                        .sort((a, b) => {
                            const aTime = parseUtcInstant(a.lastUpdatedAt ?? a.createdAt ?? new Date(0)).getTime();
                            const bTime = parseUtcInstant(b.lastUpdatedAt ?? b.createdAt ?? new Date(0)).getTime();
                            return bTime - aTime;
                        });

                    const allCount     = visibleOrders.length;
                    const pendingCount = visibleOrders.filter(isOrderPending).length;
                    const readyCount   = visibleOrders.filter(isOrderReady).length;

                    const filteredOrders = visibleOrders.filter(o => {
                        // Status filter
                        if (activeFilter === 'pending' && !isOrderPending(o)) return false;
                        if (activeFilter === 'ready'   && !isOrderReady(o))   return false;

                        // Order type filter
                        if (typeFilter === 'takeaway' && o.orderType !== 'Takeaway') return false;
                        if (typeFilter === 'dinein'   && o.orderType === 'Takeaway') return false;

                        // Search filter (case-insensitive, works with Arabic + English)
                        const q = searchQuery.trim().toLowerCase();
                        if (q) {
                            const orderNum  = o.orderNumber.toLowerCase();
                            const shortNum  = o.orderNumber.substring(8).toLowerCase();
                            const seqNum    = (formatOrderSequence(o) || '').toLowerCase();
                            const tableName = (o.tableName || '').toLowerCase();
                            const typeLabel = (o.orderType === 'Takeaway' ? t('takeaway') : t('dineIn')).toLowerCase();
                            const itemText  = o.items.map(i =>
                                [i.productName, i.productNameAr || ''].join(' ')
                            ).join(' ').toLowerCase();
                            const haystack = [orderNum, shortNum, seqNum, tableName, typeLabel, itemText].join(' ');
                            if (!haystack.includes(q)) return false;
                        }

                        return true;
                    });

                    return (
                        <>
                <header className="mb-6 border-b border-slate-300 pb-4">
                    {/* Row 1: Title + Stats + Type Legend */}
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t("kitchenStation")}</h1>
                            <p className="text-slate-400 text-sm">{t("foodOrderFeed")}</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="px-4 py-2 bg-slate-100 rounded border border-slate-300">
                                <span className="text-xs text-slate-600 block">{t("allOrders")}</span>
                                <span className="text-xl font-bold text-slate-900">{allCount}</span>
                            </div>
                            <div className="px-4 py-2 bg-slate-100 rounded border border-slate-300">
                                <span className="text-xs text-slate-600 block">{t("statusPreparing")}</span>
                                <span className="text-xl font-bold text-orange-600">{pendingCount}</span>
                            </div>
                            <div className="px-4 py-2 bg-slate-100 rounded border border-slate-300">
                                <span className="text-xs text-slate-600 block">{t("statusReady")}</span>
                                <span className="text-xl font-bold text-green-600">{readyCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Search + Order Type Filter */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        {/* Search input */}
                        <div className="kitchen-search-wrapper">
                            <svg className="kitchen-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="8.5" cy="8.5" r="5.5" />
                                <line x1="13" y1="13" x2="18" y2="18" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("searchOrdersPlaceholder")}
                                className="kitchen-search-input"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="kitchen-search-clear"
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {/* Order type filter pills */}
                        <div className="flex gap-2">
                            {([
                                { key: 'all',      label: t("filterAllTypes"), dot: null },
                                { key: 'dinein',   label: t("dineIn"),         dot: 'dinein' },
                                { key: 'takeaway', label: t("takeaway"),       dot: 'takeaway' },
                            ] as const).map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setTypeFilter(f.key)}
                                    className={`order-type-badge kitchen-type-filter ${f.dot ? `order-type-${f.dot}` : 'order-type-all'} ${typeFilter === f.key ? 'active' : ''}`}
                                >
                                    {f.dot && <span className="indicator"></span>}
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Row 3: Date Scope + Status Filter Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Date scope toggle */}
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg border border-slate-300">
                            {([
                                { key: 'today', label: t('todayOrders') },
                                { key: 'all',   label: t('allOrdersFilter') },
                            ] as const).map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setDateFilter(f.key)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                        dateFilter === f.key
                                            ? 'bg-white text-slate-900 shadow-sm border border-slate-300'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Status filter pills */}
                        <div className="flex gap-2 flex-wrap">
                        {([
                            { key: 'all',     label: `${t("allOrders")} (${allCount})`,         cssClass: 'filter-all' },
                            { key: 'pending', label: `${t("statusPreparing")} (${pendingCount})`, cssClass: 'filter-pending' },
                            { key: 'ready',   label: `${t("statusReady")} (${readyCount})`,     cssClass: 'filter-ready' },
                        ] as const).map(f => (
                            <button
                                key={f.key}
                                onClick={() => setActiveFilter(f.key)}
                                className={`kitchen-filter-button ${f.cssClass} ${activeFilter === f.key ? 'active' : ''}`}
                            >
                                {f.label}
                            </button>
                        ))}
                        </div>
                    </div>
                </header>

                {cancelRequests.length > 0 && (
                    <section className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-amber-950">
                                {locale === "ar" ? "طلبات الإلغاء" : "Cancel requests"}
                            </h2>
                            <Badge className="bg-amber-200 text-amber-900">
                                {locale === "ar" ? "بانتظار الموافقة" : "Pending approval"}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {cancelRequests.map((request) => {
                                const isBusy = decidingCancelId === request.cancelLogId;
                                const affectedNames = request.affectedItems
                                    .map((item) => `${item.quantity}x ${item.itemName}`)
                                    .join(", ");
                                return (
                                    <div key={request.cancelLogId} className="rounded-md border border-amber-200 bg-white p-3 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    {formatOrderSequence(request) ?? `#${request.orderNumber.substring(8)}`} · {request.isFullOrder ? (locale === "ar" ? "طلب كامل" : "Full order") : request.itemName}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-600">
                                                    {request.tableName || request.orderType} · {request.requestedBy}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {affectedNames}
                                                </p>
                                                <p className="mt-2 text-sm font-semibold text-amber-800">
                                                    {request.isPaid
                                                        ? (locale === "ar" ? "طلب مدفوع: اختر استرداد أو استرداد + هدر" : "Paid order: choose refund or refund + waste")
                                                        : request.requiresWasteDecision
                                                            ? (locale === "ar" ? "بدأ التحضير: اختر إلغاء أو هدر" : "Started: approve cancel or waste log")
                                                            : (locale === "ar" ? "اختر إلغاء أو هدر" : "Approve cancel or waste log")}
                                                </p>
                                            </div>
                                            <Badge className="bg-amber-100 text-amber-800">
                                                {locale === "ar" ? "قرار المطبخ" : "Kitchen decision"}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {request.isPaid ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => handleCancelDecision(request, KitchenCancelDecision.Refund)}
                                                        className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                                    >
                                                        {locale === "ar" ? "استرداد" : "Refund"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => handleCancelDecision(request, KitchenCancelDecision.RefundWaste)}
                                                        className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        {locale === "ar" ? "استرداد + هدر" : "Refund + Waste"}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => handleCancelDecision(request, KitchenCancelDecision.ApprovedCancel)}
                                                        className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                                    >
                                                        {locale === "ar" ? "موافقة الإلغاء" : "Approve Cancel"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => handleCancelDecision(request, KitchenCancelDecision.Waste)}
                                                        className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        {locale === "ar" ? "تسجيل كهدر" : "Waste Log"}
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleCancelDecision(request, KitchenCancelDecision.Rejected)}
                                                className="rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                {locale === "ar" ? "رفض الإلغاء" : "Reject"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Grid Layout for Order Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredOrders.length === 0 ? (
                        <div className="col-span-full h-96 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-300 rounded-xl">
                            <span className="text-5xl mb-4">👨‍🍳</span>
                            <p className="text-xl">
                                {searchQuery || typeFilter !== 'all'
                                    ? (locale === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching orders')
                                    : t("noFoodOrders")}
                            </p>
                            {(searchQuery || typeFilter !== 'all' || dateFilter !== 'today') && (
                                <button
                                    onClick={() => { setSearchQuery(''); setTypeFilter('all'); setDateFilter('today'); }}
                                    className="mt-3 text-sm text-blue-500 hover:text-blue-700 underline"
                                >
                                    {locale === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredOrders
                            .map((order) => (
                                <Card
                                    key={order.id}
                                  
                                    className={`kitchen-card ${order.orderType === "Takeaway" ? "order-type-takeaway" : ""} animate-in fade-in zoom-in duration-300`}
                           >
                                    <CardHeader className="kitchen-card-header">
                        <div className="flex w-full justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className={`status-badge ${getKitchenStatusClass(isOrderReady(order) ? ORDER_STATUS.READY : order.status)}`}>{getKitchenStatusLabel(isOrderReady(order) ? ORDER_STATUS.READY : order.status)}</Badge>
                                              
                                                {isPaidOrder(order.status) && (
                                                    <Badge className="status-badge status-paid">{t("statusPaid")}</Badge>
                                                )}
                                                <Badge className={`status-badge ${getOrderInvoiceState(order.status) === 'Close' ? 'status-closed' : 'status-open'}`}>
                                                    {getOrderInvoiceState(order.status)}
                                                </Badge>
                                            </div>
                                            <span className="text-xs text-slate-600 font-mono">
                                                {order.lastUpdatedAt
                                                    ? <>↑ {formatRestaurantTime(order.lastUpdatedAt, timeZone, 'en-US')}</>
                                                    : order.createdAt
                                                        ? formatRestaurantTime(order.createdAt, timeZone, 'en-US')
                                                        : '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-bold text-slate-900 mb-1">
                                                {order.tableName === "TAKEAWAY" || order.orderType === "Takeaway" ? t("takeaway") : (order.tableName || "Table ?")}
                                            </CardTitle>
                                            <p className="text-xs text-slate-600 font-mono">
                                                {formatOrderSequence(order) ?? `#${order.orderNumber.substring(8)}`}
                                            </p>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="kitchen-card-content">
                                        {order.offerNote && (
                                            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs italic text-amber-800">
                                                📝 {order.offerNote}
                                            </div>
                                        )}
                                        {/* Order Items */}
                                        <ul className="space-y-4">
                                            {order.items.map((item, index) => (
                                                <li key={index} className="flex flex-col border-b border-slate-300 pb-3 last:border-0 last:pb-0">
                                                    <div className="flex items-start gap-2">
                                                        {/* Quantity badge */}
                                                        <span className="shrink-0 bg-slate-300 text-slate-900 w-6 h-6 flex items-center justify-center rounded text-sm font-bold mt-0.5">
                                                            {item.quantity}
                                                        </span>
                                                        {/* Name + badges — flex-1 so it wraps */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="font-semibold text-lg text-slate-900 leading-tight break-words">
                                                                    {getItemDisplayName(item)}
                                                                </span>
                                                                {item.isOfferBundle && (
                                                                    <span className="shrink-0 status-badge bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                                        🎁 {t("offer") || "OFFER"}
                                                                    </span>
                                                                )}
                                                                <span className={`shrink-0 status-badge ${
                                                                    isItemReady(item.itemStatus)
                                                                        ? 'status-ready'
                                                                        : 'status-pending'
                                                                }`}>
                                                                    {getItemStatusLabel(item.itemStatus)}
                                                                </span>
                                                                {item.isNewlyAdded && (
                                                                    <span className="shrink-0 status-badge bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                                                                        {t("new") || "NEW"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Per-item ready button — for bundle wrappers (Guid.Empty id),
                                                            iterate real children; for regular items, hit the item directly. */}
                                                        {!isItemReady(item.itemStatus) && (
                                                            item.isOfferBundle
                                                                ? (item.bundledOfferProducts?.some(c => c.orderItemId && !c.isReady) && (
                                                                    <button
                                                                        onClick={() => handleMarkBundleReady(order.id, item)}
                                                                        className="shrink-0 kitchen-button btn-ready"
                                                                        title={t("markItemReady") || "Mark this item ready"}
                                                                    >
                                                                        ✓ {t("ready") || "Ready"}
                                                                    </button>
                                                                ))
                                                                : (item.id && item.id !== "00000000-0000-0000-0000-000000000000" && (
                                                                    <button
                                                                        onClick={() => handleMarkItemReady(order.id, item.id)}
                                                                        className="shrink-0 kitchen-button btn-ready"
                                                                        title={t("markItemReady") || "Mark this item ready"}
                                                                    >
                                                                        ✓ {t("ready") || "Ready"}
                                                                    </button>
                                                                ))
                                                        )}
                                                    </div>

                                                    {/* Selected alternative / Modifiers / Notes */}
                                                    <div className="ps-8 mt-1 space-y-1 ">
                                                        {item.selectedOptionName && (
                                                            <div className="text-blue-800 text-sm font-semibold flex items-center gap-1">
                                                                <span>▸</span>
                                                                {locale === 'ar' && item.selectedOptionNameAr ? item.selectedOptionNameAr : item.selectedOptionName}
                                                            </div>
                                                        )}
                                                        {item.modifiers && item.modifiers.map((mod, i) => (
                                                            <div key={i} className="text-orange-700 text-sm font-medium flex items-center gap-1">
                                                                <span>•</span> {locale === 'ar' && mod.modifierNameAr ? mod.modifierNameAr : mod.modifierName}
                                                            </div>
                                                        ))}
                                                        {/* Ingredient swaps — snapshot rows where the line cook sees a substituted raw material. */}
                                                        {item.recipeSnapshot?.filter((r) => r.sourceAlternativeId).map((swap, i) => {
                                                            const swapName = locale === 'ar' && (swap.sourceAlternativeNameAr || swap.rawMaterialNameAr)
                                                                ? (swap.sourceAlternativeNameAr || swap.rawMaterialNameAr)
                                                                : (swap.sourceAlternativeName || swap.rawMaterialName);
                                                            return (
                                                                <div key={`swap-${i}`} className="text-amber-900 text-sm font-semibold inline-flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-md w-fit">
                                                                    <span>↪</span>
                                                                    <span>{swapName}</span>
                                                                    <span className="text-[10px] uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md font-bold">
                                                                        {locale === 'ar' ? 'بديل' : 'Swap'}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                        {item.notes && (
                                                            <div className="text-orange-700 text-xs italic bg-orange-100 p-1 rounded mt-1">
                                                                📝 {item.notes}
                                                            </div>
                                                        )}
                                                        {/* Bundled Offer Products */}
                                                        {item.isOfferBundle && item.bundledOfferProducts && item.bundledOfferProducts.length > 0 && (
                                                            <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-1.5 mt-2">
                                                                <div className="font-semibold text-yellow-900 mb-1">{locale === 'ar' ? 'يشمل العرض:' : 'Included in offer:'}</div>
                                                                {item.bundledOfferProducts.map((product, pidx) => (
                                                                    <div key={pidx} className="text-yellow-800 flex items-center gap-1">
                                                                        <span>•</span>
                                                                        <span>
                                                                            {locale === 'ar' && product.nameAr ? product.nameAr : product.name}
                                                                        </span>
                                                                        {product.quantity > 1 && <span className="text-yellow-700 font-medium">× {product.quantity}</span>}
                                                                        {product.isReady && (
                                                                            <span className="ms-1 text-[10px] font-bold text-green-700 bg-green-100 px-1 rounded">
                                                                                ✓
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Mark Served — Dine-In only. Takeaway exits via Ready → Paid. */}
                                        {isOrderReady(order) && order.orderType !== "Takeaway" && order.status !== ORDER_STATUS.SERVED && order.status !== ORDER_STATUS.PAID && (
                                            <div className="pt-4 mt-2 border-t border-slate-200">
                                                <button
                                                    onClick={() => handleMarkServed(order.id)}
                                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                                                >
                                                    🍽️ {t("markServed") || "Mark Served"}
                                                </button>
                                            </div>
                                        )}
                                        {order.status === ORDER_STATUS.SERVED && (
                                            <div className="pt-4 mt-2 border-t border-slate-200">
                                                <div className="w-full py-3 text-indigo-700 font-bold text-base rounded-lg flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200">
                                                    ✅ {t("served") || "Served"}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                    )}
                </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
}
