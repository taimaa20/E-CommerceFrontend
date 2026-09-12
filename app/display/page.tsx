"use client";

import React, {
    useEffect, useState, useMemo, useCallback, useRef, memo, Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import {
    getTrackerOrders, markOrderAsServed, markTakeawayPickedUp,
} from "@/lib/api";
import { useMenu } from "@/store/menuStore";
import { useAuthStore } from "@/store/authStore";
import { canAccessArea, getUnauthorizedRedirect } from "@/lib/authorization";
import { clearAuthSession } from "@/lib/auth-session";
import { config } from "@/lib/config";
import { appendBranchQuery } from "@/lib/branch-selection";
import { ITEM_STATUS } from "@/lib/status-constants";
import { cn } from "@/lib/utils";
import { formatOrderSequence } from "@/lib/order-sequence";
import {
    UtensilsCrossed, ShoppingBag, CheckCircle2,
    HandPlatter, Loader2, ChefHat, AlertCircle, RefreshCw, Search, LogOut,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { formatRestaurantTime, parseUtcInstant } from "@/lib/date-time";

// ─── Types ─────────────────────────────────────────────────────
interface DisplayOrder {
    id: string;
    orderNumber: string;
    orderSequenceNumber?: string | null;
    orderType: "DineIn" | "Takeaway";
    status: "Preparing" | "Ready";
    isPaid: boolean;
    createdAt: string;
    readyAt?: number;
}

type FilterKey = "all" | "ready" | "preparing" | "overdue" | "dinein" | "takeaway";
type SortKey   = "default" | "oldest" | "newest" | "num_asc" | "num_desc";

// ─── i18n ──────────────────────────────────────────────────────
type LangCode = "en" | "ar";

const T = {
    en: {
        dir: "ltr" as const,
        appName: "Order Display",
        orderStatus: "Live order status",
        dineIn: "Dine In",
        takeaway: "Takeaway",
        noOrders: "No active orders",
        noReadyOrders: "No ready orders",
        activeLabel: "active",
        readyLabel: "ready",
        served: "Mark served",
        pickedUp: "Mark picked up",
        live: "LIV",
        reconnecting: "Reconnecting",
        justNow: "Just now",
        preparingLabel: "Preparing",
        readyNow: "Ready now",
        mins: "m",
        hrs: "h",
        totalOrders: "orders",
        readyBadge: "✓ Ready",
        readyPickup: "↑ Ready for pickup",
        loading: "Loading orders…",
        connectionError: "Connection error",
        retry: "Retry",
        searchPlaceholder: "Search order #",
        filterAll: "All",
        filterReady: "Ready",
        filterPreparing: "Preparing",
        filterOverdue: "Overdue",
        filterDineIn: "Dine In",
        filterTakeaway: "Takeaway",
        sortBy: "Sort by",
        sortDefault: "Default",
        sortOldest: "Oldest first",
        sortNewest: "Newest first",
        sortNumAsc: "Order # asc",
        sortNumDesc: "Order # desc",
        signOut: "Sign Out",
    },
    ar: {
        dir: "rtl" as const,
        appName: "عرض الطلبات",
        orderStatus: "حالة الطلبات المباشرة",
        dineIn: "طلبات المطعم",
        takeaway: "الطلبات الخارجية",
        noOrders: "لا توجد طلبات نشطة",
        noReadyOrders: "لا توجد طلبات جاهزة",
        activeLabel: "نشط",
        readyLabel: "جاهز",
        served: "تم التقديم",
        pickedUp: "تم الاستلام",
        live: "مباشر",
        reconnecting: "إعادة الاتصال",
        justNow: "الآن",
        preparingLabel: "قيد التحضير",
        readyNow: "جاهز الآن",
        mins: "د",
        hrs: "س",
        totalOrders: "طلب",
        readyBadge: "✓ جاهز",
        readyPickup: "↑ جاهز للاستلام",
        loading: "جاري التحميل…",
        connectionError: "خطأ في الاتصال",
        retry: "إعادة المحاولة",
        searchPlaceholder: "بحث رقم الطلب",
        filterAll: "الكل",
        filterReady: "جاهز",
        filterPreparing: "قيد التحضير",
        filterOverdue: "متأخر",
        filterDineIn: "مطعم",
        filterTakeaway: "خارجي",
        sortBy: "ترتيب",
        sortDefault: "افتراضي",
        sortOldest: "الأقدم أولاً",
        sortNewest: "الأحدث أولاً",
        sortNumAsc: "رقم الطلب تصاعدي",
        sortNumDesc: "رقم الطلب تنازلي",
        signOut: "تسجيل الخروج",
    },
} as const;

type Translations = (typeof T)["en"] | (typeof T)["ar"];

// ─── Stable empty set (avoids memo churn) ──────────────────────
const EMPTY_SET = new Set<string>();

// ─── Helpers ───────────────────────────────────────────────────
function fmtOrder(order: Pick<DisplayOrder, "orderNumber" | "orderSequenceNumber">): string {
    return formatOrderSequence(order) ?? "#" + (order.orderNumber.length > 6 ? order.orderNumber.slice(-4) : order.orderNumber);
}

function timeSince(createdAt: string, t: Translations, now: number): string {
    const mins = Math.floor((now - parseUtcInstant(createdAt).getTime()) / 60000);
    if (mins < 1) return t.justNow;
    if (mins < 60) return `${mins}${t.mins}`;
    return `${Math.floor(mins / 60)}${t.hrs} ${mins % 60}${t.mins}`;
}

function clockStr(timeZone: string): string {
    return formatRestaurantTime(new Date(), timeZone);
}

function getAgeMinutes(createdAt: string, now: number): number {
    return Math.floor((now - parseUtcInstant(createdAt).getTime()) / 60000);
}

/** Returns card color classes for a preparing card based on wait time — 5 graduated levels */
function preparingCardCls(ageMins: number): { bar: string; bg: string; border: string; num: string; time: string; barH: string } {
    if (ageMins < 10) return {           // ── fresh ≤10 m ──
        bar:    "bg-emerald-500",
        barH:   "h-[3px]",
        bg:     "bg-emerald-50 dark:bg-emerald-950/30",
        border: "border-emerald-200 dark:border-emerald-800/50",
        num:    "text-emerald-800 dark:text-emerald-300",
        time:   "text-emerald-500",
    };
    if (ageMins < 30) return {           // ── normal 10–30 m ──
        bar:    "bg-amber-400",
        barH:   "h-[3px]",
        bg:     "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-800/50",
        num:    "text-amber-800 dark:text-amber-300",
        time:   "text-amber-500",
    };
    if (ageMins < 90) return {           // ── mild overdue 30–90 m ──
        bar:    "bg-orange-500",
        barH:   "h-[3px]",
        bg:     "bg-orange-50 dark:bg-orange-950/30",
        border: "border-orange-300 dark:border-orange-800/50",
        num:    "text-orange-800 dark:text-orange-300",
        time:   "text-orange-500",
    };
    if (ageMins < 360) return {          // ── overdue 90 m–6 h ──
        bar:    "bg-red-500",
        barH:   "h-1",
        bg:     "bg-red-50 dark:bg-red-950/30",
        border: "border-red-300 dark:border-red-800/50",
        num:    "text-red-700 dark:text-red-300",
        time:   "text-red-500",
    };
    return {                             // ── critical >6 h ──
        bar:    "bg-red-700",
        barH:   "h-1.5",
        bg:     "bg-red-100 dark:bg-red-950/50",
        border: "border-red-400 dark:border-red-700/60",
        num:    "text-red-900 dark:text-red-200",
        time:   "text-red-600",
    };
}

// ─── ReadyCard ─────────────────────────────────────────────────
// Top-stripe style: bold 3px green bar at top, centered big number, action button.
const ReadyCard = memo(function ReadyCard({
    order,
    isNewReady,
    onServed,
    isServing,
    onPickedUp,
    isPickingUp,
    isCustomerView,
    now,
    t,
}: {
    order: DisplayOrder;
    isNewReady: boolean;
    onServed?: (id: string) => void;
    isServing: boolean;
    onPickedUp?: (id: string) => void;
    isPickingUp: boolean;
    isCustomerView?: boolean;
    now: number;
    t: Translations;
}) {
    const isDineIn  = order.orderType === "DineIn";
    const canServe  = !isCustomerView && isDineIn && !!onServed;
    const canPickUp = !isCustomerView && !isDineIn && order.isPaid && !!onPickedUp;

    return (
        <div
            className={cn(
                "tracker-order-card",
                "relative flex flex-col overflow-hidden rounded-xl bg-card",
                "border border-border/50 shadow-sm",
                "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
                isNewReady && "tracker-card-ready-pulse",
            )}
        >
            {/* 3px green top stripe */}
            <div className="h-[3px] w-full bg-emerald-500 shrink-0" />

            {/* Content */}
            <div className="flex flex-col p-4 gap-2.5 flex-1">
                {/* Top row: time + ready badge */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
                        {timeSince(order.createdAt, t, now)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[9px] font-bold tracking-wide">
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        {isDineIn ? t.readyBadge : t.readyPickup}
                    </span>
                </div>

                {/* Order number — big & centered */}
                <div className="flex flex-1 items-center justify-center py-3">
                    <span className={cn(
                        "font-black font-mono tabular-nums leading-none tracking-tighter text-foreground select-none",
                        isCustomerView
                            ? "text-[3rem] sm:text-[4rem] lg:text-[5rem] 2xl:text-[6rem]"
                            : "text-[2.5rem] sm:text-[3rem] lg:text-[3.5rem] 2xl:text-[4rem]",
                    )}>
                        {fmtOrder(order)}
                    </span>
                </div>

                {/* Action button */}
                {(canServe || canPickUp) && (
                    <>
                        {canServe && (
                            <button
                                onClick={(e) => { e.stopPropagation(); if (!isServing) onServed!(order.id); }}
                                disabled={isServing}
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[11px] font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40"
                            >
                                {isServing ? <Loader2 size={12} className="animate-spin" /> : <HandPlatter size={12} />}
                                {t.served}
                            </button>
                        )}
                        {canPickUp && (
                            <button
                                onClick={(e) => { e.stopPropagation(); if (!isPickingUp) onPickedUp!(order.id); }}
                                disabled={isPickingUp}
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[11px] font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40"
                            >
                                {isPickingUp ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                {t.pickedUp}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

// ─── PreparingCard ─────────────────────────────────────────────
// Compact card with a 3px colored top bar + tinted background: green < 10m, amber 10-30m, red > 30m.
const PreparingCard = memo(function PreparingCard({
    order,
    now,
    t,
}: {
    order: DisplayOrder;
    now: number;
    t: Translations;
}) {
    const age = getAgeMinutes(order.createdAt, now);
    const cls = preparingCardCls(age);
    return (
        <div className={cn(
            "tracker-order-card",
            "flex flex-col overflow-hidden rounded-lg border border-border/30 bg-white dark:bg-card",
            "hover:shadow-md transition-shadow duration-150",
        )}>
            {/* Colored top bar */}
            <div className={cn("w-full shrink-0", cls.bar, cls.barH)} />
            <div className="px-2.5 py-2">
                <span className={cn(
                    "block font-black font-mono tabular-nums leading-none select-none text-base",
                    cls.num,
                )}>
                    {fmtOrder(order)}
                </span>
                <span className={cn("mt-1 block text-[9px] font-bold tabular-nums tracking-wide", cls.time)}>
                    {timeSince(order.createdAt, t, now)}
                </span>
            </div>
        </div>
    );
});

// ─── DisplayColumn ─────────────────────────────────────────────
const DisplayColumn = memo(function DisplayColumn({
    title,
    icon: Icon,
    iconCls,
    headerAccentCls,
    bodyCls,
    readyOrders,
    preparingOrders,
    recentReadyIds,
    onServed,
    servingIds = EMPTY_SET,
    onPickedUp,
    pickingUpIds = EMPTY_SET,
    isCustomerView,
    now,
    t,
}: {
    title: string;
    icon: React.ElementType;
    iconCls: string;
    headerAccentCls: string;
    bodyCls: string;
    readyOrders: DisplayOrder[];
    preparingOrders: DisplayOrder[];
    recentReadyIds: Set<string>;
    onServed?: (id: string) => void;
    servingIds?: Set<string>;
    onPickedUp?: (id: string) => void;
    pickingUpIds?: Set<string>;
    isCustomerView?: boolean;
    now: number;
    t: Translations;
}) {
    const total = readyOrders.length + preparingOrders.length;

    return (
        <div className="flex flex-col h-full min-h-0">

            {/* ══ Column header ══ */}
            <div className={cn("shrink-0 px-6 sm:px-8 pt-5 pb-4 border-b-2", headerAccentCls)}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", iconCls)}>
                            <Icon size={18} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-2xl font-black text-foreground tracking-tight leading-none truncate">
                                {title}
                            </h2>
                            <p className="text-[11px] font-semibold text-muted-foreground/60 mt-1 tabular-nums">
                                {readyOrders.length > 0
                                    ? `${readyOrders.length} ${t.readyLabel} · ${preparingOrders.length} ${t.activeLabel}`
                                    : preparingOrders.length > 0
                                        ? `${preparingOrders.length} ${t.activeLabel}`
                                        : t.noOrders
                                }
                            </p>
                        </div>
                    </div>
                    {total > 0 && (
                        <div className="h-10 min-w-[2.5rem] px-3 rounded-xl bg-foreground/8 flex items-center justify-center shrink-0">
                            <span className="text-lg font-black text-foreground tabular-nums">{total}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ Scrollable body ══ */}
            <div className={cn("flex-1 overflow-y-auto tracker-scroll", bodyCls)}>
                <div className="px-6 sm:px-8 pt-5 pb-12 space-y-5">

                    {total === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 min-h-[16rem] opacity-40">
                            <Icon size={36} strokeWidth={0.75} className="text-muted-foreground" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{t.noOrders}</p>
                        </div>
                    ) : (
                        <>
                            {/* ══ READY SECTION ══ */}
                            <section>
                                {/* Section header — green pill */}
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                                            {t.readyNow}
                                        </span>
                                    </div>
                                    <div className="flex-1 h-px bg-emerald-200/60 dark:bg-emerald-800/40" />
                                    <span className="text-[11px] font-bold text-emerald-600/60 dark:text-emerald-500/60 tabular-nums">
                                        {readyOrders.length}
                                    </span>
                                </div>

                                {readyOrders.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-muted-foreground/40 font-medium">
                                        {t.noReadyOrders}
                                    </div>
                                ) : (
                                    <div className={cn(
                                        "grid gap-3",
                                        isCustomerView
                                            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                                            : "grid-cols-2 xl:grid-cols-3",
                                    )}>
                                        {readyOrders.map((order) => (
                                            <ReadyCard
                                                key={order.id}
                                                order={order}
                                                isNewReady={recentReadyIds.has(order.id)}
                                                onServed={onServed}
                                                isServing={servingIds.has(order.id)}
                                                onPickedUp={onPickedUp}
                                                isPickingUp={pickingUpIds.has(order.id)}
                                                isCustomerView={isCustomerView}
                                                now={now}
                                                t={t}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* ══ PREPARING SECTION ══ */}
                            {preparingOrders.length > 0 && (
                                <section>
                                    {/* Section header — amber pill */}
                                    <div className="flex items-center gap-2.5 mb-2.5">
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40">
                                            <ChefHat size={11} className="text-orange-600 dark:text-orange-400 shrink-0" />
                                            <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-widest">
                                                {t.preparingLabel}
                                            </span>
                                        </div>
                                        <div className="flex-1 h-px bg-orange-200/60 dark:bg-orange-800/40" />
                                        <span className="text-[11px] font-bold text-orange-600/60 dark:text-orange-500/60 tabular-nums">
                                            {preparingOrders.length}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "grid gap-2",
                                        isCustomerView
                                            ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
                                            : "grid-cols-3 xl:grid-cols-4",
                                    )}>
                                        {preparingOrders.map((order) => (
                                            <PreparingCard
                                                key={order.id}
                                                order={order}
                                                now={now}
                                                t={t}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

// ─── Main Page ──────────────────────────────────────────────────
function DisplayTrackerContent() {
    const { settings } = useMenu();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);
    const searchParams = useSearchParams();
    const isCustomerView = searchParams?.get("mode") === "customer" || false;
    const router = useRouter();
    const { isAuthenticated, user, logout } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isCustomerView && !canAccessArea(user?.role, "display")) {
            router.replace(getUnauthorizedRedirect(isAuthenticated, user?.role));
        }
    }, [mounted, isCustomerView, isAuthenticated, router, user?.role]);

    // ── Language / RTL ──────────────────────────────────────────
    const [lang, setLang] = useState<LangCode>(() => {
        const urlLang = searchParams?.get("lang");
        if (urlLang === "ar" || urlLang === "en") return urlLang;
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("display_lang") as LangCode | null;
            if (stored === "ar" || stored === "en") return stored;
        }
        return "en";
    });
    const t = T[lang];

    const toggleLang = useCallback(() => {
        setLang((prev) => {
            const next: LangCode = prev === "en" ? "ar" : "en";
            if (typeof window !== "undefined") localStorage.setItem("display_lang", next);
            return next;
        });
    }, []);

    const handleSignOut = useCallback(() => {
        clearAuthSession(logout);
        router.push("/login");
    }, [logout, router]);

    // ── Core state ──────────────────────────────────────────────
    const [orders, setOrders]               = useState<DisplayOrder[]>([]);
    const [isLoading, setIsLoading]         = useState(true);
    const [loadError, setLoadError]         = useState<string | null>(null);
    const [connection, setConnection]       = useState<HubConnection | null>(null);
    const [isConnected, setIsConnected]     = useState(false);
    const [now, setNow]                     = useState(Date.now());
    const [clock, setClock]                 = useState(() => clockStr(timeZone));
    const [servingIds, setServingIds]       = useState<Set<string>>(new Set());
    const [pickingUpIds, setPickingUpIds]   = useState<Set<string>>(new Set());
    const recentReadyRef                    = useRef<Map<string, number>>(new Map());
    const [recentReadyIds, setRecentReadyIds] = useState<Set<string>>(new Set());

    // ── Controls state ──────────────────────────────────────────
    const [search, setSearch]           = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
    const [sort, setSort]               = useState<SortKey>("default");
    const [sortOpen, setSortOpen]       = useState(false);

    // ── Load orders ─────────────────────────────────────────────
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
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isCustomerView && (!mounted || !canAccessArea(user?.role, "display"))) {
            return;
        }
        loadOrders();
    }, [loadOrders, mounted, isCustomerView, user?.role]);

    // ── Actions ─────────────────────────────────────────────────
    const handleMarkServed = useCallback(async (orderId: string) => {
        setServingIds((prev) => new Set(prev).add(orderId));
        const ok = await markOrderAsServed(orderId);
        if (ok) setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setServingIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
    }, []);

    const handlePickedUp = useCallback(async (orderId: string) => {
        setPickingUpIds((prev) => new Set(prev).add(orderId));
        const ok = await markTakeawayPickedUp(orderId);
        if (ok) setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setPickingUpIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
    }, []);

    // ── SignalR ─────────────────────────────────────────────────
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
                    const item: DisplayOrder = {
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
                    recentReadyRef.current.set(orderId, Date.now());
                    setRecentReadyIds(new Set(recentReadyRef.current.keys()));
                    setOrders((prev) => prev.map((o) =>
                        o.id === orderId ? { ...o, status: "Ready" as const, readyAt: Date.now() } : o
                    ));
                    setTimeout(() => {
                        recentReadyRef.current.delete(orderId);
                        setRecentReadyIds(new Set(recentReadyRef.current.keys()));
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
                    setOrders((prev) => prev.map((o) => {
                        if (o.id !== orderId) return o;
                        return { ...o, isPaid: true };
                    }));
                });

                connection.on("OrderPickedUp", (payload: any) => {
                    const orderId = payload?.OrderId || payload?.orderId;
                    if (!orderId) return;
                    setOrders((prev) => prev.filter((o) => o.id !== orderId));
                });

                connection.onreconnected(() => { setIsConnected(true);  loadOrders(); });
                connection.onreconnecting(() => { setIsConnected(false); });
                connection.onclose(()       => { setIsConnected(false); });
            })
            .catch((err) => {
                if (err?.message?.includes("stopped during negotiation")) return;
                console.warn("[display] SignalR failed:", err?.message);
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

    // ── Tick every 30 s ─────────────────────────────────────────
    useEffect(() => {
        const id = setInterval(() => {
            if (typeof document !== "undefined" && document.hidden) return;
            setNow(Date.now());
            setClock(clockStr(timeZone));
        }, 30000);
        return () => clearInterval(id);
    }, [timeZone]);

    // ── Filter + sort + search ───────────────────────────────────
    const filtered = useMemo(() => {
        let list = orders;

        // Search by order number
        if (search.trim()) {
            const q = search.trim().replace(/^#/, "").toLowerCase();
            list = list.filter((o) => fmtOrder(o).toLowerCase().includes(q) || o.orderNumber.toLowerCase().includes(q));
        }

        // Status/type filter
        if (activeFilter === "ready")     list = list.filter((o) => o.status === "Ready");
        if (activeFilter === "preparing") list = list.filter((o) => o.status === "Preparing");
        if (activeFilter === "overdue")   list = list.filter((o) => o.status === "Preparing" && getAgeMinutes(o.createdAt, now) >= 30);
        if (activeFilter === "dinein")    list = list.filter((o) => o.orderType === "DineIn");
        if (activeFilter === "takeaway")  list = list.filter((o) => o.orderType === "Takeaway");

        // Sort
        if (sort === "oldest")   list = [...list].sort((a, b) => parseUtcInstant(a.createdAt).getTime() - parseUtcInstant(b.createdAt).getTime());
        if (sort === "newest")   list = [...list].sort((a, b) => parseUtcInstant(b.createdAt).getTime() - parseUtcInstant(a.createdAt).getTime());
        if (sort === "num_asc")  list = [...list].sort((a, b) => fmtOrder(a).localeCompare(fmtOrder(b), undefined, { numeric: true }));
        if (sort === "num_desc") list = [...list].sort((a, b) => fmtOrder(b).localeCompare(fmtOrder(a), undefined, { numeric: true }));

        return list;
    }, [orders, search, activeFilter, sort, now]);

    const { dineInReady, dineInPreparing, takeawayReady, takeawayPreparing } = useMemo(() => {
        const dineInReady:       DisplayOrder[] = [];
        const dineInPreparing:   DisplayOrder[] = [];
        const takeawayReady:     DisplayOrder[] = [];
        const takeawayPreparing: DisplayOrder[] = [];

        for (const o of filtered) {
            if (o.orderType === "Takeaway") {
                if (o.status === ITEM_STATUS.READY) takeawayReady.push(o);
                else                      takeawayPreparing.push(o);
            } else {
                if (o.status === ITEM_STATUS.READY) dineInReady.push(o);
                else                      dineInPreparing.push(o);
            }
        }
        return { dineInReady, dineInPreparing, takeawayReady, takeawayPreparing };
    }, [filtered]);

    const totalReady     = dineInReady.length     + takeawayReady.length;
    const totalPreparing = dineInPreparing.length + takeawayPreparing.length;

    // Whether to show just one column (section filter active)
    const showOnlyDineIn    = activeFilter === "dinein";
    const showOnlyTakeaway  = activeFilter === "takeaway";

    // Filter pills config
    const filterPills: { key: FilterKey; label: string }[] = [
        { key: "all",       label: t.filterAll },
        { key: "ready",     label: t.filterReady },
        { key: "preparing", label: t.filterPreparing },
        { key: "overdue",   label: t.filterOverdue },
        { key: "dinein",    label: t.filterDineIn },
        { key: "takeaway",  label: t.filterTakeaway },
    ];

    const sortOptions: { key: SortKey; label: string }[] = [
        { key: "default",  label: t.sortDefault },
        { key: "oldest",   label: t.sortOldest },
        { key: "newest",   label: t.sortNewest },
        { key: "num_asc",  label: t.sortNumAsc },
        { key: "num_desc", label: t.sortNumDesc },
    ];

    // ── Render ───────────────────────────────────────────────────
    return (
        <div
            dir={t.dir}
            className="h-screen bg-background text-foreground flex flex-col overflow-hidden"
            onClick={() => setSortOpen(false)}
        >
            {/* ═══════════════════════════════════════════════════
                HEADER
            ═══════════════════════════════════════════════════ */}
            <header className="shrink-0 h-14 border-b border-border/40 bg-card flex items-center justify-between px-5 sm:px-7 lg:px-9 gap-4">

                {/* Branding */}
                <div className="flex items-center gap-3 min-w-0 shrink-0">
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="" className="h-8 w-auto object-contain shrink-0" style={{ maxWidth: 110 }} />
                    ) : (
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                            <span className="text-xs font-black text-primary-foreground leading-none">
                                {(settings.siteName || "R").charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div className="min-w-0 hidden sm:block">
                        <p className="text-sm font-bold text-foreground leading-none truncate">
                            {settings.siteName || t.appName}
                        </p>
                        <p className="text-[9px] font-semibold text-muted-foreground/40 uppercase tracking-[0.15em] mt-1">
                            {isCustomerView ? t.takeaway : t.orderStatus}
                        </p>
                    </div>
                </div>

                {/* Centre stats */}
                {!isCustomerView && !isLoading && !loadError && (
                    <div className="hidden md:flex items-center gap-5">
                        <div className="flex items-center gap-2">
                            <ChefHat size={13} className="text-muted-foreground/40" />
                            <span className="text-xl font-black text-foreground tabular-nums leading-none">{totalPreparing}</span>
                            <span className="text-[9px] font-medium text-muted-foreground/40">{t.preparingLabel}</span>
                        </div>
                        <div className="w-px h-5 bg-border/40" />
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-xl font-black text-foreground tabular-nums leading-none">{totalReady}</span>
                            <span className="text-[9px] font-medium text-muted-foreground/40">{t.readyLabel}</span>
                        </div>
                    </div>
                )}

                {/* Right controls */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Language toggle */}
                    <div className="flex items-center rounded-md border border-border/40 overflow-hidden">
                        <button
                            onClick={() => lang !== "en" && toggleLang()}
                            className={cn(
                                "h-7 px-2.5 text-[10px] font-bold transition-colors",
                                lang === "en" ? "bg-foreground text-background" : "text-muted-foreground/50 hover:text-foreground",
                            )}
                        >EN</button>
                        <div className="w-px h-3 bg-border/30" />
                        <button
                            onClick={() => lang !== "ar" && toggleLang()}
                            className={cn(
                                "h-7 px-2.5 text-[10px] font-bold transition-colors",
                                lang === "ar" ? "bg-foreground text-background" : "text-muted-foreground/50 hover:text-foreground",
                            )}
                        >AR</button>
                    </div>

                    {/* Live indicator */}
                    {!isCustomerView && (
                        <div className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1 border",
                            "text-[9px] font-bold tracking-widest uppercase",
                            isConnected
                                ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                                : "text-destructive border-destructive/20 bg-destructive/5",
                        )}>
                            <span className={cn(
                                "h-1.5 w-1.5 rounded-full shrink-0",
                                isConnected ? "bg-emerald-500 animate-pulse" : "bg-destructive animate-pulse",
                            )} />
                            <span className="hidden sm:inline">
                                {isConnected ? t.live : t.reconnecting}
                            </span>
                        </div>
                    )}

                    {!isCustomerView && (
                        <button
                            onClick={handleSignOut}
                            className={cn(
                                "h-8 px-3 rounded-lg border border-destructive/20 bg-destructive/5",
                                "inline-flex items-center gap-1.5 text-xs font-semibold text-destructive transition-colors",
                                "hover:bg-destructive/10 hover:border-destructive/30",
                            )}
                        >
                            <LogOut size={13} />
                            <span>{t.signOut}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════
                CONTROLS BAR — search · filters · sort
            ═══════════════════════════════════════════════════ */}
            {!isLoading && !loadError && !isCustomerView && (
                <div className="shrink-0 border-b border-border/50 bg-white dark:bg-card shadow-sm px-5 sm:px-7 lg:px-9 py-3 flex items-center gap-3 flex-wrap">

                    {/* Search */}
                    <div className="relative flex items-center">
                        <Search size={13} className="absolute start-2.5 text-muted-foreground/50 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t.searchPlaceholder}
                            className="h-8 w-36 sm:w-44 rounded-lg border border-border/50 bg-muted/40 ps-7 pe-3 text-xs font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
                        />
                    </div>

                    {/* Filter pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {filterPills.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setActiveFilter(key)}
                                className={cn(
                                    "h-8 px-3.5 rounded-full text-xs font-semibold transition-colors border",
                                    activeFilter === key
                                        ? "bg-foreground text-background border-foreground"
                                        : "bg-transparent text-muted-foreground border-border/50 hover:border-foreground/30 hover:text-foreground",
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Sort */}
                    <div className="relative ms-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide hidden sm:block">
                                {t.sortBy}
                            </span>
                            <button
                                onClick={() => setSortOpen((o) => !o)}
                                className="h-8 px-3 rounded-lg border border-border/50 bg-muted/40 text-xs font-semibold text-foreground flex items-center gap-1.5 hover:border-foreground/30 transition-colors min-w-[7rem]"
                            >
                                <span className="flex-1 text-start">
                                    {sortOptions.find((s) => s.key === sort)?.label ?? t.sortDefault}
                                </span>
                                <span className="text-muted-foreground/40 text-[10px]">▾</span>
                            </button>
                        </div>
                        {sortOpen && (
                            <div className={cn(
                                "absolute top-full mt-1 z-50 w-44 rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden",
                                t.dir === "rtl" ? "start-0" : "end-0",
                            )}>
                                {sortOptions.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => { setSort(key); setSortOpen(false); }}
                                        className={cn(
                                            "w-full text-start px-3.5 py-2.5 text-xs font-medium transition-colors",
                                            sort === key
                                                ? "bg-primary text-primary-foreground font-semibold"
                                                : "text-foreground hover:bg-muted",
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                BODY
            ═══════════════════════════════════════════════════ */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{t.loading}</p>
                    </div>
                </div>

            ) : loadError ? (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-sm w-full rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4">
                        <AlertCircle className="h-11 w-11 text-destructive/60 mx-auto" />
                        <div>
                            <p className="text-sm font-semibold text-destructive">{t.connectionError}</p>
                            <p className="text-xs text-muted-foreground mt-1.5 break-words font-mono">{loadError}</p>
                        </div>
                        <button
                            onClick={loadOrders}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                        >
                            <RefreshCw size={12} />
                            {t.retry}
                        </button>
                    </div>
                </div>

            ) : isCustomerView ? (
                /* Customer view — Takeaway only, full width */
                <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-amber-50/60 dark:bg-amber-950/10">
                    <div className="flex-1 min-h-0 flex flex-col">
                        <DisplayColumn
                            title={t.takeaway}
                            icon={ShoppingBag}
                            iconCls="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                            headerAccentCls="bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50"
                            bodyCls="bg-amber-50/40 dark:bg-amber-950/10"
                            readyOrders={takeawayReady}
                            preparingOrders={takeawayPreparing}
                            recentReadyIds={recentReadyIds}
                            isCustomerView={isCustomerView}
                            now={now}
                            t={t}
                        />
                    </div>
                </main>

            ) : (
                /* Staff view — one or two columns depending on filter */
                <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-slate-100/70 dark:bg-slate-900/50">

                    {/* DineIn — LEFT (hidden when Takeaway-only filter active) */}
                    {!showOnlyTakeaway && (
                        <div className={cn("min-h-0 flex flex-col", showOnlyDineIn ? "flex-1" : "flex-1")}>
                            <DisplayColumn
                                title={t.dineIn}
                                icon={UtensilsCrossed}
                                iconCls="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                                headerAccentCls="bg-blue-50/80 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/50"
                                bodyCls="bg-blue-50/40 dark:bg-blue-950/10"
                                readyOrders={dineInReady}
                                preparingOrders={dineInPreparing}
                                recentReadyIds={recentReadyIds}
                                onServed={handleMarkServed}
                                servingIds={servingIds}
                                isCustomerView={isCustomerView}
                                now={now}
                                t={t}
                            />
                        </div>
                    )}

                    {/* Divider */}
                    {!showOnlyDineIn && !showOnlyTakeaway && (
                        <>
                            <div className="hidden md:block w-px bg-border/60 shrink-0" />
                            <div className="md:hidden h-px bg-border/60 shrink-0" />
                        </>
                    )}

                    {/* Takeaway — RIGHT (hidden when DineIn-only filter active) */}
                    {!showOnlyDineIn && (
                        <div className={cn("min-h-0 flex flex-col", showOnlyTakeaway ? "flex-1" : "flex-1")}>
                            <DisplayColumn
                                title={t.takeaway}
                                icon={ShoppingBag}
                                iconCls="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                headerAccentCls="bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50"
                                bodyCls="bg-amber-50/40 dark:bg-amber-950/10"
                                readyOrders={takeawayReady}
                                preparingOrders={takeawayPreparing}
                                recentReadyIds={recentReadyIds}
                                onPickedUp={handlePickedUp}
                                pickingUpIds={pickingUpIds}
                                isCustomerView={isCustomerView}
                                now={now}
                                t={t}
                            />
                        </div>
                    )}
                </main>
            )}

            {/* ═══════════════════════════════════════════════════
                FOOTER
            ═══════════════════════════════════════════════════ */}
            {!isLoading && !loadError && (
                <footer className="shrink-0 h-10 border-t border-border/50 bg-card flex items-center justify-between px-5 sm:px-7 lg:px-9">
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground/50 tracking-wider">
                        {clock}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                        {isCustomerView
                            ? `${takeawayReady.length + takeawayPreparing.length} ${t.totalOrders}`
                            : `${filtered.length} ${t.totalOrders}`
                        }
                    </span>
                </footer>
            )}
        </div>
    );
}

export default function DisplayTrackerPage() {
    return (
        <Suspense fallback={null}>
            <DisplayTrackerContent />
        </Suspense>
    );
}
