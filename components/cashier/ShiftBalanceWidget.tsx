"use client"

import * as React from "react"
import * as signalR from "@microsoft/signalr"
import { AlertTriangle, Banknote, CheckCircle2, Clock, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useLocale } from "@/components/locale-provider"
import { ShiftExpensePanel } from "@/components/cashier/ShiftExpensePanel"
import { getCurrentShiftSummary } from "@/lib/api-shift-summary"
import { labelForBlocker } from "@/lib/shift-close-blockers"
import { usePosStore } from "@/store/posStore"
import { useAuthStore } from "@/store/authStore"
import { useCashierShiftStore } from "@/store/cashierShiftStore"
import { useOfflineCashierStore } from "@/store/offlineCashierStore"
import { projectShiftWithPending } from "@/lib/offline/shift-projection"
import { config } from "@/lib/config"
import { appendBranchQuery } from "@/lib/branch-selection"
import { toast } from "sonner"
import type { CashierBalanceShift } from "@/types/cashier-balance"
import { useSettingsStore } from "@/store/settingsStore"
import { formatRestaurantDateTime } from "@/lib/date-time"

function formatAmount(value: number | null | undefined, currency: string) {
    if (value == null) return "—"
    return `${value.toFixed(3)} ${currency}`
}

function formatDate(value: string | null | undefined, timeZone: string, locale: string) {
    if (!value) return "—"
    return formatRestaurantDateTime(value, timeZone, locale)
}

function getVarianceClasses(variance: number | null) {
    if (variance == null) return "border-slate-200 bg-slate-50 text-slate-700"
    if (variance > 0) return "border-emerald-200 bg-emerald-50 text-emerald-800"
    if (variance < 0) return "border-rose-200 bg-rose-50 text-rose-800"
    return "border-amber-200 bg-amber-50 text-amber-800"
}

export function ShiftBalanceWidget() {
    const { t, locale } = useLocale()
    const { currency } = usePosStore()
    const { user } = useAuthStore()
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId)
    const dateLocale = locale === "ar" ? "ar-QA" : "en-US"
    const ar = locale === "ar"
    const deliveryText = {
        title: ar ? "تفاصيل التوصيل" : "Delivery Details",
        foodRevenue: ar ? "إيراد الطعام" : "Food revenue",
        deliveryCollected: ar ? "تحصيل التوصيل" : "Delivery collected",
        deliveryCost: ar ? "تكلفة التوصيل المدفوعة" : "Delivery cost paid out",
        deliveryProfit: ar ? "ربح التوصيل" : "Delivery profit",
        marketplaceFees: ar ? "رسوم المنصة" : "Marketplace fees",
        marketplaceServiceFees: ar ? "رسوم خدمة المنصة" : "Marketplace service fees",
        netRestaurantRevenue: ar ? "صافي إيراد المطعم" : "Net restaurant revenue",
    }
    const expenseText = {
        cashExpenses: ar ? "مصاريف نقدية موثقة" : "Documented cash expenses",
    }
    const paymentText = {
        title: ar ? "تفصيل طرق الدفع" : "Payment Methods Breakdown",
        digitalTitle: ar ? "المدفوعات الرقمية" : "Digital Payments",
        orders: ar ? "طلبات" : "orders",
        empty: ar ? "لا توجد مدفوعات رقمية" : "No digital payments",
    }
    const cashierId = user?.id
    const cashierName = user?.username || "Cashier"
    const rawActiveShift = useCashierShiftStore((state) => state.activeShift)
    const lastClosedShift = useCashierShiftStore((state) => state.lastClosedShift)
    const loadedCashierId = useCashierShiftStore((state) => state.loadedCashierId)
    const isHydrating = useCashierShiftStore((state) => state.isHydrating)
    const hydrateActiveShift = useCashierShiftStore((state) => state.hydrateActiveShift)
    const openShiftOptimistic = useCashierShiftStore((state) => state.openShiftOptimistic)
    const closeShiftOptimistic = useCashierShiftStore((state) => state.closeShiftOptimistic)

    // Project pending pay actions onto the active shift so the drawer number
    // the cashier sees matches the cash they've actually collected while offline.
    const pendingActions = useOfflineCashierStore((s) => s.pending)
    const bootstrapOffline = useOfflineCashierStore((s) => s.bootstrap)
    const hydrateOfflineCache = useOfflineCashierStore((s) => s.hydrateFromCache)
    const [cachedOrders, setCachedOrders] = React.useState<import("@/types/order").OrderDto[]>([])
    const pendingPayCount = pendingActions.filter((a) => a.type === "pay").length
    React.useEffect(() => {
        void bootstrapOffline()
    }, [bootstrapOffline])
    // Re-read cached orders whenever a new pay action enters the queue so the
    // shift projection sees the order's total.
    React.useEffect(() => {
        void hydrateOfflineCache().then(setCachedOrders).catch(() => {})
    }, [hydrateOfflineCache, pendingPayCount])

    const activeShift = React.useMemo(
        () => (rawActiveShift ? projectShiftWithPending(rawActiveShift, pendingActions, cachedOrders) : null),
        [rawActiveShift, pendingActions, cachedOrders]
    )
    const hasPendingSync = React.useMemo(
        () => pendingActions.some((a) => a.status === "pending" || a.status === "syncing"),
        [pendingActions]
    )

    const [opening, setOpening] = React.useState(false)
    const [openingBalance, setOpeningBalance] = React.useState("0")
    const [closingBalance, setClosingBalance] = React.useState("")
    const [notes, setNotes] = React.useState("")
    const [closing, setClosing] = React.useState(false)
    const loaded = !cashierId || (loadedCashierId === cashierId && !isHydrating)

    // Close-shift validation popup state. Populated by a pre-flight call to
    // /shift-summary so the cashier can't optimistically close past the gate.
    type Blocker = { code: string; count: number }
    type Validation = { isAllowed: boolean; blockers: Blocker[]; forceCloseAllowed: boolean }
    const [validation, setValidation] = React.useState<Validation | null>(null)
    const [forceReason, setForceReason] = React.useState("")

    const parsedOpeningBalance = React.useMemo(() => {
        const value = parseFloat(openingBalance)
        return Number.isFinite(value) ? value : null
    }, [openingBalance])

    const fetchShift = React.useCallback(async () => {
        if (!cashierId) return

        await hydrateActiveShift(cashierId)
    }, [cashierId, hydrateActiveShift])

    React.useEffect(() => {
        if (!loaded) {
            void fetchShift()
        }
    }, [fetchShift, loaded])

    React.useEffect(() => {
        if (!cashierId) return

        let cancelled = false
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(appendBranchQuery(config.signalRUrl), {
                accessTokenFactory: () => useAuthStore.getState().user?.token || "",
            })
            .withAutomaticReconnect()
            .build()

        const refreshIfRelevant = (payload?: { cashierId?: string }) => {
            if (payload?.cashierId && payload.cashierId !== cashierId) return
            void fetchShift()
        }

        const start = async () => {
            try {
                await connection.start()
                if (cancelled) {
                    await connection.stop()
                    return
                }

                connection.on("OrderPaid", () => void fetchShift())
                connection.on("OrderRefunded", () => void fetchShift())
                connection.on("CashierShiftUpdated", refreshIfRelevant)
            } catch {
                // Silent fallback: the widget still works with manual refresh after actions.
            }
        }

        void start()

        return () => {
            cancelled = true
            connection.off("OrderPaid")
            connection.off("OrderRefunded")
            connection.off("CashierShiftUpdated", refreshIfRelevant)
            if (connection.state === signalR.HubConnectionState.Connected) {
                void connection.stop()
            }
        }
    }, [cashierId, fetchShift])

    const parsedClosingBalance = React.useMemo(() => {
        const value = parseFloat(closingBalance)
        return Number.isFinite(value) ? value : null
    }, [closingBalance])

    const previewVariance = React.useMemo(() => {
        if (!activeShift || parsedClosingBalance == null) return null
        return parsedClosingBalance - activeShift.expectedBalance
    }, [activeShift, parsedClosingBalance])

    const previewClassification = React.useMemo(() => {
        if (previewVariance == null) return "—"
        if (previewVariance > 0) return t("shiftSurplus")
        if (previewVariance < 0) return t("shiftDeficit")
        return t("shiftMatch")
    }, [previewVariance, t])

    async function handleOpenShift() {
        if (!cashierId) return
        if (parsedOpeningBalance == null || parsedOpeningBalance < 0) {
            toast.error(t("invalidBalanceError"))
            return
        }

        setOpening(true)
        try {
            await openShiftOptimistic({
                openingBalance: parsedOpeningBalance,
                notes: null,
                cashierId,
                cashierName,
            })
            setClosingBalance("")
            setNotes("")
            toast.success(t("shiftOpenedSuccess"))
        } catch {
            toast.error(t("shiftOpenFailed"))
        } finally {
            setOpening(false)
        }
    }

    async function handleCloseShift() {
        if (!activeShift) return
        if (parsedClosingBalance == null || parsedClosingBalance < 0) {
            toast.error(t("enterValidClosing"))
            return
        }

        setClosing(true)
        try {
            // Pre-flight: cashier close is optimistic + offline-queued, so the
            // backend's 409 never reaches the UI in time. Synchronously check
            // /shift-summary first; if blocked, show the validation popup
            // instead of enqueueing the close.
            const summary = await getCurrentShiftSummary()
            if (!summary.closeStatus.isAllowed) {
                setValidation(summary.closeStatus)
                return
            }
            await performClose({ force: false })
        } catch {
            toast.error(
                locale === "ar"
                    ? "تعذر التحقق من الطلبات المفتوحة. لا يمكن إغلاق الوردية الآن."
                    : "Could not verify open orders. The shift was not closed."
            )
        } finally {
            setClosing(false)
        }
    }

    async function performClose(opts: { force: boolean }) {
        if (!activeShift) return
        try {
            await closeShiftOptimistic({
                closingBalance: parsedClosingBalance!,
                notes: notes.trim() || null,
                force: opts.force,
                forceReason: opts.force ? (forceReason.trim() || null) : null,
            })
            setClosingBalance("")
            setNotes("")
            setValidation(null)
            setForceReason("")
            toast.success(t("shiftClosedSuccess"))
        } catch {
            try {
                const summary = await getCurrentShiftSummary()
                if (!summary.closeStatus.isAllowed) {
                    setValidation(summary.closeStatus)
                    return
                }
            } catch {
                // Keep the active shift unchanged when validation is unavailable.
            }
            toast.error(t("shiftCloseFailed"))
        }
    }

    if (!loaded) {
        return (
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-6 text-sm text-slate-500">{t("loadingShifts")}</CardContent>
            </Card>
        )
    }

    if (!activeShift && lastClosedShift) {
        const variance = lastClosedShift.variance ?? 0

        return (
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-emerald-900">
                                <CheckCircle2 className="h-5 w-5" />
                                {t("shiftSummaryTitle")}
                            </CardTitle>
                            <CardDescription className="mt-1 text-emerald-800/80">
                                {t("shiftClosedBanner")}
                            </CardDescription>
                        </div>
                        <Badge className="bg-white text-emerald-700 border border-emerald-200">
                            {variance > 0 ? t("shiftSurplus") : variance < 0 ? t("shiftDeficit") : t("shiftMatch")}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
                        <SummaryTile label={t("colCashier")} value={cashierName} />
                        <SummaryTile label={t("colOpenedAt")} value={formatDate(lastClosedShift.openedAt, timeZone, dateLocale)} />
                        <SummaryTile label={t("colClosedAt")} value={formatDate(lastClosedShift.closedAt, timeZone, dateLocale)} />
                        <SummaryTile label={t("paidOrdersLabel")} value={String(lastClosedShift.paidOrderCount)} />
                        <SummaryTile label={t("ordersTotalLabel")} value={formatAmount(lastClosedShift.ordersTotal, currency)} />
                        <SummaryTile label={ar ? "إجمالي الخصومات" : "Total discounts"} value={formatAmount(lastClosedShift.discountsTotal, currency)} />
                        <SummaryTile label={t("differenceLabel")} value={formatAmount(lastClosedShift.variance, currency)} emphasis />
                    </div>

                    <CashExpectedBreakdown
                        openingLabel={t("openingBalanceLabel")}
                        cashLabel={t("cashCollectedLabel")}
                        deliveryCostLabel={deliveryText.deliveryCost}
                        cashExpensesLabel={expenseText.cashExpenses}
                        expectedLabel={t("finalExpectedLabel")}
                        openingBalance={lastClosedShift.openingBalance}
                        cashCollected={lastClosedShift.cashOrdersTotal}
                        deliveryCost={lastClosedShift.deliveryCost ?? 0}
                        cashExpenses={lastClosedShift.cashExpensesTotal ?? 0}
                        expectedBalance={lastClosedShift.expectedBalance}
                        currency={currency}
                    />

                    <PaymentMethodsBreakdownPanel shift={lastClosedShift} currency={currency} text={paymentText} />

                    <DeliveryDetailsPanel shift={lastClosedShift} currency={currency} text={deliveryText} />

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <DetailRow label={t("openingBalanceLabel")} value={formatAmount(lastClosedShift.openingBalance, currency)} />
                        <DetailRow label={t("expectedDrawerLabel")} value={formatAmount(lastClosedShift.expectedBalance, currency)} />
                        <DetailRow label={t("actualDrawerLabel")} value={formatAmount(lastClosedShift.closingBalance, currency)} />
                        <DetailRow label={t("cashierCommentLabel")} value={lastClosedShift.closingComment || "—"} />
                    </div>
<div className="space-y-1.5 max-w-xs ">
                            <Label>{t("openingBalanceLabel")} ({currency})</Label>
                            <Input
                            className="bg-white p-4"
                                type="number"
                                min="0"
                                step="0.001"
                                placeholder="0.000"
                                value={openingBalance}
                                onChange={e => setOpeningBalance(e.target.value)}
                            />
                        </div>
                

                    <div className="flex justify-end">
                        <Button onClick={handleOpenShift} disabled={opening || parsedOpeningBalance == null || parsedOpeningBalance < 0}>
                            {opening ? t("openingShift") : t("openShiftBtn")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!activeShift) {
        return (
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-slate-900">
                                <Banknote className="h-5 w-5 text-primary" />
                                {t("cashDrawerMyShift")}
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {t("cashierShiftCardSubtitle")}
                            </CardDescription>
                        </div>
                        <Badge variant="outline">{t("noShiftStatus")}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        <SummaryTile label={t("colCashier")} value={cashierName} />
                        <SummaryTile label={t("openedAtLabel")} value={formatDate(new Date().toISOString(), timeZone, dateLocale)} />
                        <SummaryTile
                            label={t("openingBalanceLabel")}
                            value={parsedOpeningBalance == null ? "—" : formatAmount(parsedOpeningBalance, currency)}
                        />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="space-y-1.5 max-w-xs">
                            <Label>{t("openingBalanceLabel")} ({currency})</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.001"
                                placeholder="0.000"
                                value={openingBalance}
                                onChange={e => setOpeningBalance(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleOpenShift} disabled={opening || parsedOpeningBalance == null || parsedOpeningBalance < 0}>
                            {opening ? t("openingShift") : t("openShiftBtn")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-slate-900">
                            <Wallet className="h-5 w-5 text-primary" />
                            {t("cashDrawerMyShift")}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {t("cashierShiftOpenSubtitle")}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasPendingSync && (
                            <Badge className="bg-amber-50 text-amber-800 border border-amber-200">
                                {locale === "ar" ? "بانتظار المزامنة" : "Pending sync"}
                            </Badge>
                        )}
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {t("activeShiftStatus")}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <SummaryTile
                        icon={<Clock className="h-4 w-4 text-slate-500" />}
                        label={t("shiftStartedLabel")}
                        value={formatDate(activeShift.openedAt, timeZone, dateLocale)}
                    />
                    <SummaryTile
                        icon={<Banknote className="h-4 w-4 text-slate-500" />}
                        label={t("paidOrdersLabel")}
                        value={String(activeShift.paidOrderCount)}
                    />
                    <SummaryTile
                        label={t("ordersTotalLabel")}
                        value={formatAmount(activeShift.ordersTotal, currency)}
                    />
                    <SummaryTile
                        label={ar ? "إجمالي الخصومات" : "Total discounts"}
                        value={formatAmount(activeShift.discountsTotal, currency)}
                    />
                    <SummaryTile
                        label={t("expectedDrawerLabel")}
                        value={formatAmount(activeShift.expectedBalance, currency)}
                        emphasis
                    />
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
                    <div className="space-y-4">
                        {/* Server-backed: a synthetic offline shift has no row to
                            attach an expense to yet, so the panel waits for sync. */}
                        {!activeShift.id.startsWith("offline-") && (
                            <ShiftExpensePanel
                                shiftId={activeShift.id}
                                currency={currency}
                                onRecorded={() => void fetchShift()}
                            />
                        )}

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {t("closeShiftDialogTitle")}
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>{t("closingBalanceLabel")} ({currency})</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        placeholder="0.000"
                                        value={closingBalance}
                                        onChange={e => setClosingBalance(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t("cashierCommentLabel")}</Label>
                                    <Textarea
                                        rows={3}
                                        placeholder={t("closingNotesSummary")}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-xl border p-4 ${getVarianceClasses(previewVariance)}`}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 font-medium">
                                    {previewVariance != null && previewVariance > 0 && <CheckCircle2 className="h-4 w-4" />}
                                    {previewVariance != null && previewVariance < 0 && <AlertTriangle className="h-4 w-4" />}
                                    <span>{t("differenceLabel")}</span>
                                </div>
                                <span className="font-mono text-sm font-semibold">
                                    {previewVariance == null ? "—" : formatAmount(previewVariance, currency)}
                                </span>
                            </div>
                            <p className="mt-2 text-xs opacity-80">
                                {t("classificationLabel")}: {previewClassification}
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={handleCloseShift}
                                disabled={closing || parsedClosingBalance == null}
                                className="bg-slate-900 hover:bg-slate-800"
                            >
                                {closing ? t("closingShift") : t("confirmClose")}
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t("shiftBreakdownTitle")}
                        </p>
                        <CashExpectedBreakdown
                            openingLabel={t("openingBalanceLabel")}
                            cashLabel={t("cashCollectedLabel")}
                            deliveryCostLabel={deliveryText.deliveryCost}
                            cashExpensesLabel={expenseText.cashExpenses}
                            expectedLabel={t("finalExpectedLabel")}
                            openingBalance={activeShift.openingBalance}
                            cashCollected={activeShift.cashOrdersTotal}
                            deliveryCost={activeShift.deliveryCost ?? 0}
                            cashExpenses={activeShift.cashExpensesTotal ?? 0}
                            expectedBalance={activeShift.expectedBalance}
                            currency={currency}
                        />
                        <PaymentMethodsBreakdownPanel shift={activeShift} currency={currency} text={paymentText} />
                        <DeliveryDetailsPanel shift={activeShift} currency={currency} text={deliveryText} />
                        <div className="mt-4 space-y-3">
                            <DetailRow label={t("openingBalanceLabel")} value={formatAmount(activeShift.openingBalance, currency)} />
                            <DetailRow label={t("paidOrdersLabel")} value={String(activeShift.paidOrderCount)} />
                            <DetailRow label={t("ordersTotalLabel")} value={formatAmount(activeShift.ordersTotal, currency)} />
                            <DetailRow label={ar ? "إجمالي الخصومات" : "Total discounts"} value={formatAmount(activeShift.discountsTotal, currency)} />
                            <DetailRow label={t("cashCollectedLabel")} value={formatAmount(activeShift.cashOrdersTotal, currency)} />
                            <DetailRow label={t("cardCollectedLabel")} value={formatAmount(activeShift.cardOrdersTotal, currency)} />
                            <DetailRow label={deliveryText.deliveryCost} value={formatAmount(activeShift.deliveryCost ?? 0, currency)} />
                            <DetailRow label={expenseText.cashExpenses} value={formatAmount(activeShift.cashExpensesTotal ?? 0, currency)} />
                            <DetailRow label={t("expectedDrawerLabel")} value={formatAmount(activeShift.expectedBalance, currency)} />
                            <DetailRow label={t("actualDrawerLabel")} value={parsedClosingBalance == null ? "—" : formatAmount(parsedClosingBalance, currency)} />
                            <DetailRow label={t("differenceLabel")} value={previewVariance == null ? "—" : formatAmount(previewVariance, currency)} />
                            <DetailRow label={t("classificationLabel")} value={previewClassification} />
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Close-shift validation popup. Driven entirely by the backend's
                ShiftCloseValidationDto so labels/counts match server state.
                Force-close affordance appears only when AllowForcedShiftClose is
                set on ShiftRulesConfig and a reason is supplied. */}
            <Dialog
                open={!!validation}
                onOpenChange={(open) => {
                    if (!open) {
                        setValidation(null)
                        setForceReason("")
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="h-5 w-5" />
                            {ar ? "لا يمكن إغلاق الوردية" : "Cannot Close Shift"}
                        </DialogTitle>
                    </DialogHeader>
                    {validation && (
                        <div className="space-y-3 text-sm">
                            <ul className="space-y-1 rounded-md border bg-muted/40 p-3">
                                {validation.blockers.map((b) => (
                                    <li key={b.code} className="flex justify-between">
                                        <span>{labelForBlocker(b.code, locale)}</span>
                                        <span className="font-mono">{b.count}</span>
                                    </li>
                                ))}
                            </ul>
                            {validation.forceCloseAllowed && (
                                <div className="space-y-2 pt-2">
                                    <Label>
                                        {ar
                                            ? "سبب الإغلاق القسري (مطلوب)"
                                            : "Force Close Reason (required)"}
                                    </Label>
                                    <Textarea
                                        value={forceReason}
                                        onChange={(e) => setForceReason(e.target.value)}
                                        maxLength={500}
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => { setValidation(null); setForceReason("") }}
                        >
                            {ar ? "إلغاء" : "Cancel"}
                        </Button>
                        {validation?.forceCloseAllowed && (
                            <Button
                                variant="destructive"
                                disabled={closing || !forceReason.trim()}
                                onClick={() => void performClose({ force: true })}
                            >
                                {ar ? "إغلاق قسري" : "Force Close"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

function CashExpectedBreakdown({
    openingLabel,
    cashLabel,
    deliveryCostLabel,
    cashExpensesLabel,
    expectedLabel,
    openingBalance,
    cashCollected,
    deliveryCost,
    cashExpenses,
    expectedBalance,
    currency,
}: {
    openingLabel: string
    cashLabel: string
    deliveryCostLabel: string
    cashExpensesLabel: string
    expectedLabel: string
    openingBalance: number
    cashCollected: number
    deliveryCost: number
    cashExpenses: number
    expectedBalance: number
    currency: string
}) {
    return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm">
            <FormulaRow sign="" label={openingLabel} value={formatAmount(openingBalance, currency)} />
            <FormulaRow sign="+" label={cashLabel} value={formatAmount(cashCollected, currency)} />
            <FormulaRow sign="-" label={deliveryCostLabel} value={formatAmount(deliveryCost, currency)} />
            {/* Documented payouts are shown as their own line so the cashier can see
                why the expected drawer is lower — it is not a shortage. */}
            <FormulaRow sign="-" label={cashExpensesLabel} value={formatAmount(cashExpenses, currency)} />
            <div className="my-2 border-t border-emerald-200" />
            <FormulaRow sign="=" label={expectedLabel} value={formatAmount(expectedBalance, currency)} strong />
        </div>
    )
}

function DeliveryDetailsPanel({
    shift,
    currency,
    text,
}: {
    shift: CashierBalanceShift
    currency: string
    text: {
        title: string
        foodRevenue: string
        deliveryCollected: string
        deliveryCost: string
        deliveryProfit: string
        marketplaceFees: string
        marketplaceServiceFees: string
        netRestaurantRevenue: string
    }
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{text.title}</p>
            <div className="space-y-3">
                <DetailRow label={text.foodRevenue} value={formatAmount(shift.foodRevenue ?? 0, currency)} />
                <DetailRow label={text.deliveryCollected} value={formatAmount(shift.deliveryCollected ?? 0, currency)} />
                <DetailRow label={text.deliveryCost} value={formatAmount(shift.deliveryCost ?? 0, currency)} />
                <DetailRow label={text.deliveryProfit} value={formatAmount(shift.deliveryProfit ?? 0, currency)} />
                <DetailRow label={text.marketplaceFees} value={formatAmount(shift.marketplaceFees ?? 0, currency)} />
                <DetailRow label={text.marketplaceServiceFees} value={formatAmount(shift.marketplaceServiceFees ?? 0, currency)} />
                <DetailRow label={text.netRestaurantRevenue} value={formatAmount(shift.netRestaurantRevenue ?? 0, currency)} />
            </div>
        </div>
    )
}

function PaymentMethodsBreakdownPanel({
    shift,
    currency,
    text,
}: {
    shift: CashierBalanceShift
    currency: string
    text: {
        title: string
        digitalTitle: string
        orders: string
        empty: string
    }
}) {
    const digitalPayments = (shift.paymentMethodsBreakdown ?? []).filter((row) => !row.isCash)

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{text.title}</p>
                <span className="text-xs font-medium text-slate-500">{text.digitalTitle}</span>
            </div>
            {digitalPayments.length === 0 ? (
                <div className="text-sm text-slate-500">{text.empty}</div>
            ) : (
                <div className="space-y-2">
                    {digitalPayments.map((row) => (
                        <div key={row.method} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <div>
                                <div className="font-semibold text-slate-800">{row.method}</div>
                                <div className="text-xs text-slate-500">{row.orderCount} {text.orders}</div>
                            </div>
                            <div className="font-mono font-semibold text-slate-900">{formatAmount(row.amount, currency)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function FormulaRow({
    sign,
    label,
    value,
    strong = false,
}: {
    sign: string
    label: string
    value: string
    strong?: boolean
}) {
    return (
        <div className={`flex items-center justify-between gap-4 ${strong ? "font-semibold text-emerald-900" : "text-slate-700"}`}>
            <span className="flex items-center gap-2">
                <span className="w-4 text-center font-mono text-slate-500">{sign}</span>
                <span>{label}</span>
            </span>
            <span className="text-end font-mono">{value}</span>
        </div>
    )
}

function SummaryTile({
    label,
    value,
    icon,
    emphasis = false,
}: {
    label: string
    value: string
    icon?: React.ReactNode
    emphasis?: boolean
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                {icon}
                <span>{label}</span>
            </div>
            <p className={`mt-3 text-sm ${emphasis ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                {value}
            </p>
        </div>
    )
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-b-0 last:pb-0">
            <span className="text-slate-500">{label}</span>
            <span className="text-end font-medium text-slate-900">{value}</span>
        </div>
    )
}
