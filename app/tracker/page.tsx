"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef, memo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getTrackerOrders, markOrderAsServed, markTakeawayPickedUp, type TrackerOrder } from "@/lib/api";
import { useMenu } from "@/store/menuStore";
import { config } from "@/lib/config";
import { appendBranchQuery } from "@/lib/branch-selection";
import { ITEM_STATUS } from "@/lib/status-constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatOrderSequence } from "@/lib/order-sequence";
import {
    UtensilsCrossed, ShoppingBag, Clock, CheckCircle2, RefreshCw,
    HandPlatter, Loader2, ChefHat, Wifi, WifiOff, Package,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { formatRestaurantTime, parseUtcInstant } from "@/lib/date-time";

// ─── Types ────────────────────────────────────────────────────
interface TrackerItem {
    id: string;
    orderNumber: string;
    orderSequenceNumber?: string | null;
    orderType: "DineIn" | "Takeaway";
    status: "Preparing" | "Ready";
    isPaid: boolean;
    createdAt: string;
    readyAt?: number;
}

// ─── i18n ──────────────────────────────────────────────────────
type LangCode = "en" | "ar";

const T = {
    en: {
        dir: "ltr" as const,
        orderTracker: "Order Tracker",
        orderStatus: "Live Order Status",
        dineIn: "Dine In",
        takeaway: "Takeaway",
        noActiveOrders: "No active orders",
        activeLabel: "active",
        readyLabel: "ready",
        served: "Served",
        pickedUp: "Picked Up",
        live: "LIVE",
        reconnecting: "RECONNECTING",
        justNow: "Just now",
        totalOrders: "orders",
        preparingLabel: "Preparing",
        readyBadge: "Ready",
        readyNow: "Ready Now",
        mins: "m",
        hrs: "h",
    },
    ar: {
        dir: "rtl" as const,
        orderTracker: "متتبع الطلبات",
        orderStatus: "حالة الطلبات المباشرة",
        dineIn: "طلبات المطعم",
        takeaway: "الطلبات الخارجية",
        noActiveOrders: "لا توجد طلبات نشطة",
        activeLabel: "نشط",
        readyLabel: "جاهز",
        served: "تم التقديم",
        pickedUp: "تم الاستلام",
        live: "مباشر",
        reconnecting: "إعادة الاتصال",
        justNow: "الآن",
        totalOrders: "طلب",
        preparingLabel: "قيد التحضير",
        readyBadge: "جاهز",
        readyNow: "جاهز الآن",
        mins: "د",
        hrs: "س",
    },
} as const;

type Translations = (typeof T)["en"] | (typeof T)["ar"];

// ─── Helpers ───────────────────────────────────────────────────
function formatOrderNumber(order: Pick<TrackerItem, "orderNumber" | "orderSequenceNumber">): string {
    return formatOrderSequence(order) ?? "#" + (order.orderNumber.length > 6 ? order.orderNumber.slice(-4) : order.orderNumber);
}

function formatPayloadOrder(payload: any): string | null {
    const sequence = payload?.orderSequenceNumber || payload?.OrderSequenceNumber;
    const orderNumber = payload?.orderNumber || payload?.OrderNumber;
    if (!orderNumber && !sequence) return null;
    return formatOrderSequence({ orderSequenceNumber: sequence }) ??
        "#" + (String(orderNumber).length > 6 ? String(orderNumber).slice(-4) : String(orderNumber));
}

function getTimeSince(createdAt: string, t: Translations): string {
    const diff = Date.now() - parseUtcInstant(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t.justNow;
    if (mins < 60) return `${mins}${t.mins}`;
    return `${Math.floor(mins / 60)}${t.hrs} ${mins % 60}${t.mins}`;
}

// ─── ReadyCard ─────────────────────────────────────────────────
// Large, prominent. Green = order number ONLY. Button = dark primary.
const ReadyCard = memo(function ReadyCard({
    order,
    isNewReady,
    onServed,
    isServing,
    onPickedUp,
    isPickingUp,
    isCustomerView,
    t,
}: {
    order: TrackerItem;
    isNewReady: boolean;
    onServed?: (orderId: string) => void;
    isServing: boolean;
    onPickedUp?: (orderId: string) => void;
    isPickingUp: boolean;
    isCustomerView?: boolean;
    t: Translations;
}) {
    const isDineIn = order.orderType === "DineIn";
    const canServe  = !isCustomerView && isDineIn  && !!onServed;
    const canPickUp = !isCustomerView && !isDineIn && order.isPaid && !!onPickedUp;
    const hasAction = canServe || canPickUp;

    return (
        <div className={cn(
            "tracker-order-card relative flex flex-col rounded-2xl bg-card overflow-hidden",
            "border border-border shadow-sm transition-all duration-200",
            "hover:shadow-md hover:-translate-y-0.5",
            isNewReady && "tracker-card-ready-pulse",
        )}>
            {/* 2px top accent — the ONLY green element on the card border */}
            <div className="h-0.5 w-full bg-[var(--success)] shrink-0" />

            <div className="flex flex-col flex-1 p-4 sm:p-5 gap-3">

                {/* Meta row: time + check */}
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground tabular-nums">
                        <Clock size={9} className="shrink-0 opacity-60" />
                        {getTimeSince(order.createdAt, t)}
                    </span>
                    <CheckCircle2 size={14} className="text-[var(--success)] shrink-0" strokeWidth={2.5} />
                </div>

                {/* Order number — the hero. Green is intentional and semantic here. */}
                <div className="flex items-center justify-center flex-1 py-4 sm:py-5 lg:py-6">
                    <span className={cn(
                        "font-black font-mono tabular-nums leading-none tracking-tight select-none",
                        "text-[var(--success)]",
                        "text-4xl sm:text-5xl xl:text-[3.5rem]",
                    )}>
                        {formatOrderNumber(order)}
                    </span>
                </div>

                {/* Subtle status indicator — outlined, NOT solid green */}
                <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/35 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--success)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse shrink-0" />
                        {t.readyBadge}
                    </span>
                </div>

                {/* Action button — DARK primary (not green) */}
                {hasAction && (
                    <div className="mt-1">
                        {canServe && (
                            <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); if (!isServing) onServed!(order.id); }}
                                disabled={isServing}
                                className="w-full h-10 text-xs font-bold uppercase tracking-wider gap-2 rounded-xl"
                            >
                                {isServing
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <HandPlatter size={13} />}
                                {t.served}
                            </Button>
                        )}
                        {canPickUp && (
                            <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); if (!isPickingUp) onPickedUp!(order.id); }}
                                disabled={isPickingUp}
                                className="w-full h-10 text-xs font-bold uppercase tracking-wider gap-2 rounded-xl"
                            >
                                {isPickingUp
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <CheckCircle2 size={13} />}
                                {t.pickedUp}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// ─── PreparingCard ─────────────────────────────────────────────
// Compact, minimal. Amber accent. No action button. Dark number.
const PreparingCard = memo(function PreparingCard({
    order,
    t,
}: {
    order: TrackerItem;
    t: Translations;
}) {
    return (
        <div className="tracker-order-card relative rounded-xl bg-card border border-border/50 overflow-hidden transition-all duration-150 hover:border-border hover:shadow-sm">
            {/* Amber left accent bar */}
            <div className="absolute start-0 top-0 h-full w-[3px] bg-[var(--warning)]" />

            <div className="ps-3.5 p-3 sm:p-3.5 flex flex-col gap-1.5">
                {/* Time */}
                <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground/60 tabular-nums">
                    <Clock size={8} className="shrink-0" />
                    {getTimeSince(order.createdAt, t)}
                </span>

                {/* Number — dark, not colored */}
                <div className="flex items-center justify-center py-1.5 sm:py-2">
                    <span className="font-black font-mono tabular-nums leading-none text-foreground text-2xl sm:text-3xl select-none">
                        {formatOrderNumber(order)}
                    </span>
                </div>

                {/* Amber status pill */}
                <span className="inline-flex items-center self-start gap-1 rounded-full border border-[var(--warning)]/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--warning)]">
                    <span className="h-1 w-1 rounded-full bg-[var(--warning)] shrink-0" />
                    {t.preparingLabel}
                </span>
            </div>
        </div>
    );
});

// ─── TypeRow ───────────────────────────────────────────────────
// One labeled row of cards for a single order type within a section.
const TypeRow = memo(function TypeRow({
    orderType,
    orders,
    isReady,
    recentReadyIds,
    onServed,
    servingIds,
    onPickedUp,
    pickingUpIds,
    isCustomerView,
    t,
}: {
    orderType: "DineIn" | "Takeaway";
    orders: TrackerItem[];
    isReady: boolean;
    recentReadyIds: Set<string>;
    onServed?: (orderId: string) => void;
    servingIds: Set<string>;
    onPickedUp?: (orderId: string) => void;
    pickingUpIds: Set<string>;
    isCustomerView?: boolean;
    t: Translations;
}) {
    if (orders.length === 0) return null;
    const isDineIn = orderType === "DineIn";

    return (
        <div>
            {/* Type sub-header */}
            <div className="flex items-center gap-2.5 mb-3">
                <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shrink-0",
                    isDineIn
                        ? "bg-[var(--info)]/10 text-[var(--info)]"
                        : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                )}>
                    {isDineIn ? <UtensilsCrossed size={11} /> : <ShoppingBag size={11} />}
                    {isDineIn ? t.dineIn : t.takeaway}
                </span>
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[11px] font-semibold text-muted-foreground/40 tabular-nums shrink-0">
                    {orders.length}
                </span>
            </div>

            {/* Cards grid */}
            <div className={cn(
                "grid gap-3",
                isReady
                    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                    : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
            )}>
                {orders.map((order) =>
                    isReady ? (
                        <ReadyCard
                            key={order.id}
                            order={order}
                            isNewReady={recentReadyIds.has(order.id)}
                            onServed={onServed}
                            isServing={servingIds.has(order.id)}
                            onPickedUp={onPickedUp}
                            isPickingUp={pickingUpIds.has(order.id)}
                            isCustomerView={isCustomerView}
                            t={t}
                        />
                    ) : (
                        <PreparingCard key={order.id} order={order} t={t} />
                    )
                )}
            </div>
        </div>
    );
});


// ─── Main Page ─────────────────────────────────────────────────
function OrderTrackerContent() {
    const { settings } = useMenu();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);
    const searchParams = useSearchParams();
    const isCustomerView = searchParams?.get("mode") === "customer" || false;

    // ── Language / RTL ──────────────────────────────────
    const [lang, setLang] = useState<LangCode>(() => {
        const urlLang = searchParams?.get("lang");
        if (urlLang === "ar" || urlLang === "en") return urlLang;
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("tracker_lang") as LangCode | null;
            if (stored === "ar" || stored === "en") return stored;
        }
        return "en";
    });
    const t = T[lang];
    const toggleLang = useCallback(() => {
        setLang((prev) => {
            const next: LangCode = prev === "en" ? "ar" : "en";
            if (typeof window !== "undefined") localStorage.setItem("tracker_lang", next);
            return next;
        });
    }, []);

    // ── State ────────────────────────────────────────────
    const [orders, setOrders]             = useState<TrackerItem[]>([]);
    const [isLoading, setIsLoading]       = useState(true);
    const [loadError, setLoadError]       = useState<string | null>(null);
    const [connection, setConnection]     = useState<HubConnection | null>(null);
    const [isConnected, setIsConnected]   = useState(false);
    const [now, setNow]                   = useState(Date.now());
    const [servingIds, setServingIds]     = useState<Set<string>>(new Set());
    const [pickingUpIds, setPickingUpIds] = useState<Set<string>>(new Set());
    const recentReadyLabelsRef = useRef<Map<string, string>>(new Map());
    const [recentReadyIds, setRecentReadyIds] = useState<Set<string>>(new Set());
    const [recentReadyLabels, setRecentReadyLabels] = useState<string[]>([]);

    // ── Initial load ─────────────────────────────────────
    const loadOrders = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const data = await getTrackerOrders();
            setOrders(
                data.map((o) => ({
                    id:          o.id,
                    orderNumber: o.orderNumber,
                    orderSequenceNumber: o.orderSequenceNumber,
                    orderType:   o.orderType as "DineIn" | "Takeaway",
                    status:      o.status as "Preparing" | "Ready",
                    isPaid:      o.isPaid,
                    createdAt:   o.createdAt,
                }))
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setLoadError(msg);
            console.error("Failed to load tracker orders:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // ── Mark Served ──────────────────────────────────────
    const handleMarkServed = useCallback(async (orderId: string) => {
        setServingIds((prev) => new Set(prev).add(orderId));
        const success = await markOrderAsServed(orderId);
        if (success) setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setServingIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
    }, []);

    // ── Mark Picked Up ───────────────────────────────────
    const handlePickedUp = useCallback(async (orderId: string) => {
        setPickingUpIds((prev) => new Set(prev).add(orderId));
        const success = await markTakeawayPickedUp(orderId);
        if (success) setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setPickingUpIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
    }, []);

    // ── SignalR ──────────────────────────────────────────
    useEffect(() => {
        const hub = new HubConnectionBuilder()
            .withUrl(appendBranchQuery(config.signalRUrl))
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(LogLevel.Warning)
            .build();
        setConnection(hub);
        return () => { hub.stop().catch(() => {}); };
    }, []);

    useEffect(() => {
        if (!connection) return;

        connection.start()
            .then(() => {
                setIsConnected(true);

                connection.on("ReceiveNewOrder", (newOrder: any) => {
                    const item: TrackerItem = {
                        id:          newOrder.id,
                        orderNumber: newOrder.orderNumber,
                        orderSequenceNumber: newOrder.orderSequenceNumber,
                        orderType:   (newOrder.orderType || "DineIn") as "DineIn" | "Takeaway",
                        status:      "Preparing",
                        isPaid:      newOrder.isPaid ?? false,
                        createdAt:   newOrder.createdAt || new Date().toISOString(),
                    };
                    setOrders((prev) => {
                        if (prev.some((o) => o.id === item.id)) return prev.map((o) => o.id === item.id ? item : o);
                        return [...prev, item];
                    });
                });

                connection.on("OrderReady", (payload: any) => {
                    const orderId = payload?.OrderId || payload?.orderId;
                    if (!orderId) return;
                    let readyLabel = formatPayloadOrder(payload);
                    setRecentReadyIds((prev) => new Set(prev).add(orderId));
                    setOrders((prev) => prev.map((o) =>
                        o.id === orderId
                            ? (() => {
                                const next = { ...o, status: "Ready" as const, readyAt: Date.now() };
                                readyLabel ??= formatOrderNumber(next);
                                return next;
                            })()
                            : o
                    ));
                    recentReadyLabelsRef.current.set(orderId, readyLabel ?? "#?");
                    setRecentReadyLabels(Array.from(recentReadyLabelsRef.current.values()));
                    setTimeout(() => {
                        recentReadyLabelsRef.current.delete(orderId);
                        setRecentReadyLabels(Array.from(recentReadyLabelsRef.current.values()));
                        setRecentReadyIds((prev) => {
                            const next = new Set(prev);
                            next.delete(orderId);
                            return next;
                        });
                    }, 8000);
                });

                connection.on("OrderServed", (payload: any) => {
                    const orderId = payload?.OrderId || payload?.orderId;
                    if (!orderId) return;
                    setOrders((prev) => prev.filter((o) => o.id !== orderId));
                });

                connection.on("OrderPaid", (payload: any) => {
                    const orderId = payload?.OrderId || payload?.orderId;
                    if (!orderId) return;
                    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, isPaid: true } : o));
                });

                connection.on("OrderPickedUp", (payload: any) => {
                    const orderId = payload?.OrderId || payload?.orderId;
                    if (!orderId) return;
                    setOrders((prev) => prev.filter((o) => o.id !== orderId));
                });

                connection.onreconnected(() => { setIsConnected(true);  loadOrders(); });
                connection.onreconnecting(() => { setIsConnected(false); });
                connection.onclose(()      => { setIsConnected(false); });
            })
            .catch((err) => {
                if (err?.message?.includes("stopped during negotiation")) return;
                console.warn("SignalR tracker connection failed:", err?.message);
                setIsConnected(false);
            });

        return () => {
            connection.off("ReceiveNewOrder");
            connection.off("OrderReady");
            connection.off("OrderServed");
            connection.off("OrderPaid");
            connection.off("OrderPickedUp");
        };
    }, [connection, loadOrders]);

    // ── Clock ticker ─────────────────────────────────────
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    // ── Derived state ────────────────────────────────────
    const { dineInPreparing, dineInReady, takeawayPreparing, takeawayReady } = useMemo(() => {
        const dineInPreparing:   TrackerItem[] = [];
        const dineInReady:       TrackerItem[] = [];
        const takeawayPreparing: TrackerItem[] = [];
        const takeawayReady:     TrackerItem[] = [];
        for (const order of orders) {
            if (order.orderType === "Takeaway") {
                if (order.status === ITEM_STATUS.READY) takeawayReady.push(order);
                else                          takeawayPreparing.push(order);
            } else {
                if (order.status === ITEM_STATUS.READY) dineInReady.push(order);
                else                          dineInPreparing.push(order);
            }
        }
        return { dineInPreparing, dineInReady, takeawayPreparing, takeawayReady };
    }, [orders]);

    const totalReady     = dineInReady.length     + takeawayReady.length;
    const totalPreparing = dineInPreparing.length + takeawayPreparing.length;

    // ─── Render ───────────────────────────────────────────
    return (
        <div
            dir={t.dir}
            className="min-h-screen bg-background text-foreground flex flex-col"
        >
            {/* ════════════════════════════════════════════
                HEADER
            ════════════════════════════════════════════ */}
            <header className="shrink-0 bg-card border-b border-border">
                <div className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">

                    {/* Brand */}
                    <div className="flex items-center gap-3 min-w-0">
                        {settings.logoUrl ? (
                            <img
                                src={settings.logoUrl}
                                alt=""
                                className="h-8 w-auto object-contain shrink-0"
                                style={{ maxWidth: 100 }}
                            />
                        ) : (
                            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                                <span className="text-sm font-black text-primary-foreground">
                                    {(settings.siteName || "R").charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold text-foreground leading-tight truncate">
                                {settings.siteName || t.orderTracker}
                            </h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] leading-tight mt-0.5">
                                {t.orderStatus}
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

                        {/* Summary pills — staff only */}
                        {!isCustomerView && (
                            <div className="hidden sm:flex items-center gap-1.5 me-1">
                                {totalPreparing > 0 && (
                                    <div className="flex items-center gap-1.5 rounded-full bg-[var(--warning)]/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--warning)]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)] shrink-0" />
                                        <span className="tabular-nums">{totalPreparing}</span>
                                        <span className="hidden lg:inline opacity-70">{t.preparingLabel}</span>
                                    </div>
                                )}
                                {totalReady > 0 && (
                                    <div className="flex items-center gap-1.5 rounded-full bg-[var(--success)]/10 px-3 py-1.5 text-[11px] font-bold text-[var(--success)]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse shrink-0" />
                                        <span className="tabular-nums">{totalReady}</span>
                                        <span className="hidden lg:inline opacity-70">{t.readyBadge}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Language toggle */}
                        <div className="flex items-center rounded-lg border border-border overflow-hidden h-8">
                            <button
                                onClick={() => lang !== "en" && toggleLang()}
                                className={cn(
                                    "h-full px-3 text-[11px] font-bold transition-colors",
                                    lang === "en"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                EN
                            </button>
                            <div className="w-px h-4 bg-border" />
                            <button
                                onClick={() => lang !== "ar" && toggleLang()}
                                className={cn(
                                    "h-full px-3 text-[11px] font-bold transition-colors",
                                    lang === "ar"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                AR
                            </button>
                        </div>

                        {/* Connection status */}
                        {!isCustomerView && (
                            <div className={cn(
                                "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide",
                                isConnected
                                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                                    : "bg-destructive/10 text-destructive"
                            )}>
                                {isConnected
                                    ? <Wifi size={11} className="shrink-0" />
                                    : <WifiOff size={11} className="shrink-0 animate-pulse" />}
                                <span className="hidden sm:inline">
                                    {isConnected ? t.live : t.reconnecting}
                                </span>
                            </div>
                        )}

                        {/* Refresh */}
                        {!isCustomerView && (
                            <button
                                onClick={loadOrders}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* ════════════════════════════════════════════
                ERROR BANNER
            ════════════════════════════════════════════ */}
            {loadError && !isLoading && (
                <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-2.5 bg-destructive/10 border-b border-destructive/20 text-destructive">
                    <span className="flex-1 text-xs font-semibold truncate">
                        Failed to load orders — {loadError}
                    </span>
                    <button
                        onClick={loadOrders}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-bold underline underline-offset-2 hover:opacity-70 transition-opacity"
                    >
                        <RefreshCw size={11} />
                        Retry
                    </button>
                </div>
            )}

            {/* ════════════════════════════════════════════
                READY ANNOUNCEMENT TICKER
            ════════════════════════════════════════════ */}
            {recentReadyLabels.length > 0 && (
                <div className="shrink-0 h-10 sm:h-11 bg-[var(--success)] text-[var(--success-foreground)] flex items-center gap-3 px-4 sm:px-6 overflow-hidden">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success-foreground)] opacity-60" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--success-foreground)]" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.15em] whitespace-nowrap">
                        {t.readyBadge}:
                    </span>
                    <span className="text-sm sm:text-base font-black font-mono tracking-wide truncate">
                        {recentReadyLabels.join("    ·    ")}
                    </span>
                </div>
            )}

            {/* ════════════════════════════════════════════
                MAIN
            ════════════════════════════════════════════ */}
            {isLoading ? (
                /* Loading */
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                        <Loader2 size={28} className="animate-spin text-muted-foreground/40" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground/40">
                        Loading orders…
                    </span>
                </div>
            ) : orders.length === 0 ? (
                /* Empty */
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                    <div className="h-20 w-20 rounded-3xl bg-muted/30 flex items-center justify-center">
                        <Package size={36} className="text-muted-foreground/20" strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                        <p className="text-base font-semibold text-muted-foreground/50">{t.noActiveOrders}</p>
                        <p className="text-xs text-muted-foreground/30 mt-1 uppercase tracking-widest">{t.orderStatus}</p>
                    </div>
                </div>
            ) : (
                <main className="flex-1 overflow-y-auto tracker-scroll">
                    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10">

                        {/* ═══════════════════════════════
                            READY SECTION
                            — Full width, status-first
                            — Dine-In row then Takeaway row
                        ═══════════════════════════════ */}
                        {totalReady > 0 && (
                            <section>
                                {/* Section heading */}
                                <div className="flex items-center gap-3 mb-5 sm:mb-6">
                                    <span className="relative flex h-3 w-3 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-40" />
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--success)]" />
                                    </span>
                                    <h2 className="text-lg sm:text-xl font-black text-[var(--success)] uppercase tracking-wide">
                                        {t.readyNow}
                                    </h2>
                                    <div className="flex-1 h-px bg-[var(--success)]/15" />
                                    <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-md bg-[var(--success)] text-[var(--success-foreground)] text-[11px] font-black tabular-nums">
                                        {totalReady}
                                    </span>
                                </div>

                                {/* Dine-In ready row */}
                                <div className="space-y-6 sm:space-y-8">
                                    <TypeRow
                                        orderType="DineIn"
                                        orders={dineInReady}
                                        isReady={true}
                                        recentReadyIds={recentReadyIds}
                                        onServed={handleMarkServed}
                                        servingIds={servingIds}
                                        onPickedUp={undefined}
                                        pickingUpIds={pickingUpIds}
                                        isCustomerView={isCustomerView}
                                        t={t}
                                    />

                                    {/* Visual divider between types — only if both exist */}
                                    {dineInReady.length > 0 && takeawayReady.length > 0 && (
                                        <div className="h-px bg-border/40" />
                                    )}

                                    {/* Takeaway ready row */}
                                    <TypeRow
                                        orderType="Takeaway"
                                        orders={takeawayReady}
                                        isReady={true}
                                        recentReadyIds={recentReadyIds}
                                        onServed={undefined}
                                        servingIds={servingIds}
                                        onPickedUp={handlePickedUp}
                                        pickingUpIds={pickingUpIds}
                                        isCustomerView={isCustomerView}
                                        t={t}
                                    />
                                </div>
                            </section>
                        )}

                        {/* ═══════════════════════════════
                            PREPARING SECTION
                            — Compact, secondary
                            — Dine-In row then Takeaway row
                        ═══════════════════════════════ */}
                        {totalPreparing > 0 && (
                            <section>
                                {/* Section heading */}
                                <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
                                    <div className="h-7 w-7 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center shrink-0">
                                        <ChefHat size={14} className="text-[var(--warning)]" strokeWidth={2.5} />
                                    </div>
                                    <h2 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wide">
                                        {t.preparingLabel}
                                    </h2>
                                    <div className="flex-1 h-px bg-border/50" />
                                    <span className="text-[11px] font-semibold text-muted-foreground/50 tabular-nums">
                                        {totalPreparing}
                                    </span>
                                </div>

                                <div className="space-y-5">
                                    <TypeRow
                                        orderType="DineIn"
                                        orders={dineInPreparing}
                                        isReady={false}
                                        recentReadyIds={recentReadyIds}
                                        onServed={undefined}
                                        servingIds={servingIds}
                                        onPickedUp={undefined}
                                        pickingUpIds={pickingUpIds}
                                        isCustomerView={isCustomerView}
                                        t={t}
                                    />

                                    {dineInPreparing.length > 0 && takeawayPreparing.length > 0 && (
                                        <div className="h-px bg-border/30" />
                                    )}

                                    <TypeRow
                                        orderType="Takeaway"
                                        orders={takeawayPreparing}
                                        isReady={false}
                                        recentReadyIds={recentReadyIds}
                                        onServed={undefined}
                                        servingIds={servingIds}
                                        onPickedUp={undefined}
                                        pickingUpIds={pickingUpIds}
                                        isCustomerView={isCustomerView}
                                        t={t}
                                    />
                                </div>
                            </section>
                        )}
                    </div>
                </main>
            )}

            {/* ════════════════════════════════════════════
                FOOTER
            ════════════════════════════════════════════ */}
            <footer className="shrink-0 h-10 border-t border-border bg-card flex items-center justify-between px-4 sm:px-6 lg:px-8">
                {!isCustomerView ? (
                    <>
                        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <ChefHat size={11} className="shrink-0 opacity-50" />
                            <span className="tabular-nums font-semibold">{orders.length}</span>
                            <span className="opacity-60">{t.totalOrders}</span>
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-foreground tabular-nums font-mono">
                            {formatRestaurantTime(new Date(now), timeZone)}
                        </span>
                    </>
                ) : (
                    <span className="mx-auto font-bold text-xs sm:text-sm text-foreground tabular-nums font-mono">
                        {formatRestaurantTime(new Date(now), timeZone)}
                    </span>
                )}
            </footer>
        </div>
    );
}

export default function OrderTrackerPage() {
    return (
        <Suspense fallback={null}>
            <OrderTrackerContent />
        </Suspense>
    );
}
