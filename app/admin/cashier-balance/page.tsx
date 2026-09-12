"use client"

import * as React from "react"
import * as signalR from "@microsoft/signalr"
import { appendBranchQuery } from "@/lib/branch-selection"
import {
    AlertTriangle,
    Banknote,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    Plus,
    RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, getAdminCashierBalanceShifts, getCashierShiftOwners } from "@/lib/api"
import { useLocale } from "@/components/locale-provider"
import { labelForBlocker } from "@/lib/shift-close-blockers"
import { usePosStore } from "@/store/posStore"
import { useAuthStore } from "@/store/authStore"
import { CashierBalanceShift } from "@/types/cashier-balance"
import { config } from "@/lib/config"
import { toast } from "sonner"
import { useSettingsStore } from "@/store/settingsStore"
import { formatRestaurantDateTime, getRestaurantToday, restaurantDateRangeToUtc } from "@/lib/date-time"

interface CashierUser {
    userId: string
    username: string
    fullName: string
    role: string
}

type ShiftStatusFilter = "all" | "open" | "closed"
type DatePreset = "today" | "custom" | "all"

type ApiError = Error & {
    response?: {
        data?: {
            message?: string
        }
    }
}

function formatAmount(value: number | null | undefined, currency: string) {
    if (value == null) return "—"
    return `${value.toFixed(3)} ${currency}`
}

function formatDate(value: string | null | undefined, timeZone: string, locale: string) {
    if (!value) return "—"
    return formatRestaurantDateTime(value, timeZone, locale)
}

function varianceTextClass(value: number | null | undefined) {
    if (value == null) return "text-slate-400"
    if (value > 0) return "text-emerald-700"
    if (value < 0) return "text-rose-700"
    return "text-amber-700"
}

function classificationTone(shift: CashierBalanceShift) {
    if (!shift.isClosed) return "border-blue-200 bg-blue-50 text-blue-700"
    if (shift.classification === "Surplus") return "border-emerald-200 bg-emerald-50 text-emerald-700"
    if (shift.classification === "Deficit") return "border-rose-200 bg-rose-50 text-rose-700"
    return "border-amber-200 bg-amber-50 text-amber-700"
}

// function getRefundsTotal(shift: CashierBalanceShift) {
//     return shift.refundsTotal ?? 0
// }

function getNetTotal(shift: CashierBalanceShift) {
    return shift.netTotal ?? (shift.ordersTotal - (shift.refundsTotal ?? 0))
}

function getShiftClassificationLabel(
    shift: CashierBalanceShift,
    t: (key: "activeShiftStatus" | "shiftSurplus" | "shiftDeficit" | "shiftMatch") => string
) {
    if (!shift.isClosed) return t("activeShiftStatus")
    if (shift.classification === "Surplus") return t("shiftSurplus")
    if (shift.classification === "Deficit") return t("shiftDeficit")
    return t("shiftMatch")
}

function getVisiblePageNumbers(pageNumber: number, totalPages: number) {
    const pages: Array<number | "..."> = []

    if (totalPages <= 7) {
        for (let page = 1; page <= totalPages; page += 1) {
            pages.push(page)
        }

        return pages
    }

    pages.push(1)

    if (pageNumber > 3) {
        pages.push("...")
    }

    const start = Math.max(2, pageNumber - 1)
    const end = Math.min(totalPages - 1, pageNumber + 1)

    for (let page = start; page <= end; page += 1) {
        pages.push(page)
    }

    if (pageNumber < totalPages - 2) {
        pages.push("...")
    }

    pages.push(totalPages)
    return pages
}

export default function CashierBalancePage() {
    const { t, locale } = useLocale()
    const { currency } = usePosStore()
    const { user } = useAuthStore()
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId)
    const dateLocale = locale === "ar" ? "ar-QA" : "en-US"
    const ar = locale === "ar"
    const deliveryText = {
        title: ar ? "ملخص التوصيل" : "Delivery Summary",
        foodRevenue: ar ? "إيراد الطعام" : "Food revenue",
        deliveryCollected: ar ? "تحصيل التوصيل" : "Delivery collected",
        deliveryCost: ar ? "تكلفة التوصيل" : "Delivery cost",
        deliveryProfit: ar ? "ربح التوصيل" : "Delivery profit",
        marketplaceFees: ar ? "رسوم المنصة" : "Marketplace fees",
        marketplaceServiceFees: ar ? "رسوم خدمة المنصة" : "Marketplace service fees",
        netRestaurantRevenue: ar ? "صافي إيراد المتجر" : "Net merchant revenue",
    }
    const paymentText = {
        title: ar ? "تفصيل طرق الدفع" : "Payment Methods Breakdown",
        digitalTitle: ar ? "المدفوعات الرقمية" : "Digital Payments",
        orders: ar ? "طلبات" : "orders",
        empty: ar ? "لا توجد مدفوعات رقمية" : "No digital payments",
    }
    const sourceText = {
        title: ar ? "المبيعات حسب المصدر" : "Sales by Source",
        subtitle: ar ? "POS / طلبات / شركاء التوصيل" : "POS / Talabat / Delivery partners",
        orders: ar ? "طلبات" : "orders",
        empty: ar ? "لا توجد مبيعات" : "No sales recorded",
    }

    const today = getRestaurantToday(timeZone)

    const [shifts, setShifts] = React.useState<CashierBalanceShift[]>([])
    const [cashiers, setCashiers] = React.useState<CashierUser[]>([])
    const [loading, setLoading] = React.useState(true)
    const [refreshing, setRefreshing] = React.useState(false)
    const [expandedShiftId, setExpandedShiftId] = React.useState<string | null>(null)
    const [pageNumber, setPageNumber] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(6)

    const [datePreset, setDatePreset] = React.useState<DatePreset>("today")
    const [statusFilter, setStatusFilter] = React.useState<ShiftStatusFilter>("all")
    const [cashierFilter, setCashierFilter] = React.useState("all")
    const [fromDate, setFromDate] = React.useState(today)
    const [toDate, setToDate] = React.useState(today)

    const [openDialog, setOpenDialog] = React.useState(false)
    const [openForm, setOpenForm] = React.useState({ cashierId: "", openingBalance: "", notes: "" })
    const [openLoading, setOpenLoading] = React.useState(false)

    const [closeDialog, setCloseDialog] = React.useState(false)
    const [closeTarget, setCloseTarget] = React.useState<CashierBalanceShift | null>(null)
    const [closeForm, setCloseForm] = React.useState({ closingBalance: "", notes: "" })
    const [closeLoading, setCloseLoading] = React.useState(false)

    // Close-shift validation popup state. Populated when the backend returns a
    // 409 with a structured ShiftCloseValidationDto body.
    type Blocker = { code: string; count: number }
    type Validation = { isAllowed: boolean; blockers: Blocker[]; forceCloseAllowed: boolean }
    const [validation, setValidation] = React.useState<Validation | null>(null)
    const [forceReason, setForceReason] = React.useState("")

    const requestParams = React.useMemo(() => {
        const params: {
            isClosed?: boolean
            cashierId?: string
            from?: string
            to?: string
            toExclusive?: string
        } = {}

        if (statusFilter === "open") params.isClosed = false
        if (statusFilter === "closed") params.isClosed = true
        if (cashierFilter !== "all") params.cashierId = cashierFilter

        if (datePreset === "today") {
            const range = restaurantDateRangeToUtc(today, today, timeZone)
            params.from = range.startUtc
            params.toExclusive = range.endUtc
        } else if (datePreset === "custom") {
            if (fromDate && toDate) {
                const range = restaurantDateRangeToUtc(fromDate, toDate, timeZone)
                params.from = range.startUtc
                params.toExclusive = range.endUtc
            }
        }

        return params
    }, [cashierFilter, datePreset, fromDate, statusFilter, timeZone, toDate, today])

    const fetchAll = React.useCallback(async (silent = false) => {
        if (silent) setRefreshing(true)
        else setLoading(true)

        try {
            const [nextShifts, shiftOwners] = await Promise.all([
                getAdminCashierBalanceShifts(requestParams),
                getCashierShiftOwners(),
            ])

            setShifts(nextShifts)
            setCashiers(shiftOwners)
        } catch {
            toast.error(t("shiftLoadFailed"))
        } finally {
            if (silent) setRefreshing(false)
            else setLoading(false)
        }
    }, [requestParams, t])

    React.useEffect(() => {
        void fetchAll()
    }, [fetchAll])

    React.useEffect(() => {
        setPageNumber(1)
        setExpandedShiftId(null)
    }, [requestParams])

    React.useEffect(() => {
        const onFocus = () => void fetchAll(true)
        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                void fetchAll(true)
            }
        }

        window.addEventListener("focus", onFocus)
        document.addEventListener("visibilitychange", onVisibility)
        const interval = window.setInterval(() => {
            if (typeof document !== "undefined" && document.hidden) return
            void fetchAll(true)
        }, 30000)

        return () => {
            window.removeEventListener("focus", onFocus)
            document.removeEventListener("visibilitychange", onVisibility)
            window.clearInterval(interval)
        }
    }, [fetchAll])

    React.useEffect(() => {
        let cancelled = false
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(appendBranchQuery(config.signalRUrl), {
                accessTokenFactory: () => useAuthStore.getState().user?.token || "",
            })
            .withAutomaticReconnect()
            .build()

        const refresh = () => void fetchAll(true)

        const start = async () => {
            try {
                await connection.start()
                if (cancelled) {
                    await connection.stop()
                    return
                }

                connection.on("OrderPaid", refresh)
                connection.on("OrderRefunded", refresh)
                connection.on("CashierShiftUpdated", refresh)
            } catch {
                // Fetch + periodic refresh keeps the page usable without SignalR.
            }
        }

        void start()

        return () => {
            cancelled = true
            connection.off("OrderPaid", refresh)
            connection.off("OrderRefunded", refresh)
            connection.off("CashierShiftUpdated", refresh)
            if (connection.state === signalR.HubConnectionState.Connected) {
                void connection.stop()
            }
        }
    }, [fetchAll, user?.token])

    const sortedCashiers = React.useMemo(
        () => [...cashiers].sort((a, b) => (a.fullName || a.username).localeCompare(b.fullName || b.username)),
        [cashiers]
    )

    const activeCashierIds = React.useMemo(
        () => new Set(shifts.filter((shift) => !shift.isClosed).map((shift) => shift.cashierId)),
        [shifts]
    )

    const sortedShifts = React.useMemo(
        () =>
            [...shifts].sort((left, right) => {
                const activeDiff = Number(right.isOpen ?? !right.isClosed) - Number(left.isOpen ?? !left.isClosed)
                if (activeDiff !== 0) return activeDiff
                return new Date(right.openedAt).getTime() - new Date(left.openedAt).getTime()
            }),
        [shifts]
    )

    const activeCount = sortedShifts.filter((shift) => !shift.isClosed).length
    const closedCount = sortedShifts.filter((shift) => shift.isClosed).length
    const totalSales = sortedShifts.reduce((sum, shift) => sum + (shift.ordersTotal ?? 0), 0)
    const netTotal = sortedShifts.reduce((sum, shift) => sum + getNetTotal(shift), 0)
    const totalCount = sortedShifts.length
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    const pagedShifts = React.useMemo(
        () => sortedShifts.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
        [pageNumber, pageSize, sortedShifts]
    )
    const firstVisibleShift = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1
    const lastVisibleShift = Math.min(pageNumber * pageSize, totalCount)
    const visiblePageNumbers = React.useMemo(
        () => getVisiblePageNumbers(pageNumber, totalPages),
        [pageNumber, totalPages]
    )

    const closePreviewVariance = React.useMemo(() => {
        if (!closeTarget || closeForm.closingBalance === "") return null
        const closingValue = parseFloat(closeForm.closingBalance)
        if (Number.isNaN(closingValue)) return null
        return closingValue - closeTarget.expectedBalance
    }, [closeForm.closingBalance, closeTarget])

    React.useEffect(() => {
        if (pageNumber > totalPages) {
            setPageNumber(totalPages)
        }
    }, [pageNumber, totalPages])

    React.useEffect(() => {
        if (expandedShiftId && !pagedShifts.some((shift) => shift.id === expandedShiftId)) {
            setExpandedShiftId(null)
        }
    }, [expandedShiftId, pagedShifts])

    async function handleOpenShift() {
        if (!openForm.cashierId) {
            toast.error(t("selectCashierError"))
            return
        }

        const openingBalance = parseFloat(openForm.openingBalance)
        if (Number.isNaN(openingBalance) || openingBalance < 0) {
            toast.error(t("invalidBalanceError"))
            return
        }

        setOpenLoading(true)
        try {
            const response = await api.post<CashierBalanceShift>("/cashierbalance/open", {
                cashierId: openForm.cashierId,
                openingBalance,
                notes: openForm.notes.trim() || null,
            })
            const openedShift = response.data
            const openedAt = new Date(openedShift.openedAt).getTime()
            const matchesCurrentFilters =
                requestParams.isClosed !== true &&
                (!requestParams.cashierId || requestParams.cashierId === openedShift.cashierId) &&
                (!requestParams.from || openedAt >= new Date(requestParams.from).getTime()) &&
                (!requestParams.toExclusive || openedAt < new Date(requestParams.toExclusive).getTime())

            setShifts((current) => matchesCurrentFilters
                ? [openedShift, ...current.filter((shift) => shift.id !== openedShift.id)]
                : current.filter((shift) => shift.id !== openedShift.id))
            toast.success(t("shiftOpenedSuccess"))
            setOpenDialog(false)
            setOpenForm({ cashierId: "", openingBalance: "", notes: "" })
            await fetchAll(true)
        } catch (err) {
            const message = (err as ApiError).response?.data?.message || t("shiftOpenFailed")
            toast.error(message)
        } finally {
            setOpenLoading(false)
        }
    }

    function startClose(shift: CashierBalanceShift) {
        setCloseTarget(shift)
        setCloseForm({ closingBalance: "", notes: "" })
        setCloseDialog(true)
    }

    async function handleCloseShift(opts?: { force?: boolean }) {
        if (!closeTarget) return

        const closingBalance = parseFloat(closeForm.closingBalance)
        if (Number.isNaN(closingBalance) || closingBalance < 0) {
            toast.error(t("invalidClosingBalanceError"))
            return
        }

        setCloseLoading(true)
        try {
            await api.put<CashierBalanceShift>(`/cashierbalance/${closeTarget.id}/close`, {
                closingBalance,
                notes: closeForm.notes.trim() || null,
                force: opts?.force ?? false,
                forceReason: opts?.force ? (forceReason.trim() || null) : null,
            })

            toast.success(t("shiftClosedSuccess"))
            setCloseDialog(false)
            setCloseTarget(null)
            setValidation(null)
            setForceReason("")
            await fetchAll(true)
        } catch (err) {
            // 409 ShiftCloseBlocked carries a structured validation payload in the
            // response body. Parse and route to the blocker popup instead of a
            // generic toast so the cashier sees per-status counts.
            const raw = err instanceof Error ? err.message : String(err)
            const parsed = tryParseJson(raw) as { validation?: Validation } | null
            if (parsed?.validation && !parsed.validation.isAllowed) {
                setValidation(parsed.validation)
                setCloseDialog(false)
                return
            }
            const message = (err as ApiError).response?.data?.message || t("shiftCloseFailed")
            toast.error(message)
        } finally {
            setCloseLoading(false)
        }
    }

    function tryParseJson(text: string): unknown {
        try { return JSON.parse(text) } catch { return null }
    }

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(239,246,255,0.92)_52%,rgba(255,255,255,1))] shadow-sm">
                <div className="flex flex-col gap-6 p-6 lg:p-7">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                                    <Banknote className="h-5 w-5" />
                                </span>
                                {t("cashBalanceTitle")}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                {t("cashierBalancePageSubtitle")}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => void fetchAll(true)} disabled={loading || refreshing} className="bg-white">
                                <RefreshCw className={`me-1 h-4 w-4 ${(loading || refreshing) ? "animate-spin" : ""}`} />
                                {t("refreshBtn2")}
                            </Button>
                            <Button onClick={() => setOpenDialog(true)} className="shadow-sm">
                                <Plus className="me-1 h-4 w-4" />
                                {t("openShiftBtn")}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            icon={<Clock className="h-5 w-5 text-blue-600" />}
                            label={t("activeShiftStatus")}
                            value={String(activeCount)}
                            shellClass="border-blue-200/70 bg-white/90"
                        />
                        <MetricCard
                            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                            label={t("closedShiftStatus")}
                            value={String(closedCount)}
                            shellClass="border-emerald-200/70 bg-white/90"
                        />
                        <MetricCard
                            icon={<Banknote className="h-5 w-5 text-slate-800" />}
                            label={t("salesTotalLabel")}
                            value={formatAmount(totalSales, currency)}
                            shellClass="border-slate-200 bg-white/90"
                        />
                        <MetricCard
                            icon={<AlertTriangle className={`h-5 w-5 ${netTotal < 0 ? "text-rose-600" : "text-amber-600"}`} />}
                            label={t("netTotalLabel")}
                            value={formatAmount(netTotal, currency)}
                            valueClass={varianceTextClass(netTotal)}
                            shellClass="border-slate-200 bg-white/90"
                        />
                    </div>
                </div>
            </section>

            <Card className="rounded-[24px] border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>{t("cashierTableTitle")}</CardTitle>
                    <CardDescription>{t("cashierTableSubtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1.5">
                        <Label>{t("dateCol")}</Label>
                        <Select value={datePreset} onValueChange={(value) => setDatePreset(value as DatePreset)}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">{t("today")}</SelectItem>
                                <SelectItem value="custom">{t("customRangeLabel")}</SelectItem>
                                <SelectItem value="all">{t("allDatesLabel")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>{t("colCashier")}</Label>
                        <Select value={cashierFilter} onValueChange={setCashierFilter}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("allCashiersOption")}</SelectItem>
                                {sortedCashiers.map((cashier) => (
                                    <SelectItem key={cashier.userId} value={cashier.userId}>
                                        {cashier.fullName || cashier.username}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>{t("colStatus")}</Label>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ShiftStatusFilter)}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("allShiftsFilter")}</SelectItem>
                                <SelectItem value="open">{t("openShiftsFilter")}</SelectItem>
                                <SelectItem value="closed">{t("closedShiftsFilter")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {datePreset === "custom" ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-1">
                            <div className="space-y-1.5">
                                <Label>{t("fromDateLabel")}</Label>
                                <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t("toDateLabel")}</Label>
                                <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 xl:col-span-1">
                            {datePreset === "today" ? t("today") : t("allDatesLabel")}
                        </div>
                    )}
                </CardContent>
            </Card>

            {loading ? (
                <Card className="rounded-[24px] border-slate-200 shadow-sm">
                    <CardContent className="py-16 text-center text-slate-500">{t("loadingShifts")}</CardContent>
                </Card>
            ) : sortedShifts.length === 0 ? (
                <Card className="rounded-[24px] border-slate-200 shadow-sm">
                    <CardContent className="py-16 text-center text-slate-500">{t("noShiftsFound")}</CardContent>
                </Card>
            ) : (
                <Card className="overflow-hidden rounded-[24px] border-slate-200 shadow-sm">
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-200">
                            {pagedShifts.map((shift) => {
                                const isExpanded = expandedShiftId === shift.id
                                // const refundsTotal = getRefundsTotal(shift)
                                const netShiftTotal = getNetTotal(shift)

                                return (
                                    <div
                                        key={shift.id}
                                        className={shift.isClosed ? "bg-white" : "bg-[linear-gradient(135deg,rgba(239,246,255,0.68),rgba(255,255,255,1),rgba(236,253,245,0.5))]"}
                                    >
                                        <div className={`border-s-4 px-5 py-5 lg:px-6 ${shift.isClosed ? "border-transparent" : "border-blue-500"}`}>
                                            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                                <div className="space-y-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline" className="rounded-full border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                                                            {t("shiftNumberLabel")} #{shift.shiftNumber ?? "—"}
                                                        </Badge>
                                                        <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${classificationTone(shift)}`}>
                                                            {shift.isClosed ? t("closedShiftStatus") : t("activeShiftStatus")}
                                                        </Badge>
                                                        {shift.isClosed && (
                                                            <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs font-medium ${classificationTone(shift)}`}>
                                                                {getShiftClassificationLabel(shift, t)}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                                                            {shift.cashierName}
                                                        </h2>
                                                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                                                            <MetaChip
                                                                icon={<CalendarDays className="h-4 w-4" />}
                                                                label={t("colOpenedAt")}
                                                                value={formatDate(shift.openedAt, timeZone, dateLocale)}
                                                            />
                                                            <MetaChip
                                                                icon={<Clock className="h-4 w-4" />}
                                                                label={t("colClosedAt")}
                                                                value={formatDate(shift.closedAt, timeZone, dateLocale)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex w-full flex-col gap-4 xl:max-w-[520px] xl:items-end">
                                                    <div className="grid gap-3 sm:grid-cols-2 xl:w-full">
                                                        <SummaryPill
                                                            label={t("salesTotalLabel")}
                                                            value={formatAmount(shift.ordersTotal, currency)}
                                                        />
                                                        {/* <SummaryPill
                                                            label={t("refundsLabel")}
                                                            value={formatAmount(refundsTotal, currency)}
                                                            shellClass="border-rose-100 bg-rose-50/70"
                                                        /> */}
                                                        <SummaryPill
                                                            label={t("netTotalLabel")}
                                                            value={formatAmount(netShiftTotal, currency)}
                                                            valueClass={varianceTextClass(netShiftTotal)}
                                                            shellClass="border-slate-200 bg-white/90"
                                                        />
                                                    </div>

                                                    <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                                                            className="bg-white"
                                                        >
                                                            {isExpanded ? <ChevronUp className="me-1 h-4 w-4" /> : <ChevronDown className="me-1 h-4 w-4" />}
                                                            {t("viewDetails")}
                                                        </Button>
                                                        {!shift.isClosed && (
                                                            <Button size="sm" variant="outline" onClick={() => startClose(shift)} className="bg-white">
                                                                {t("closeShiftBtn")}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                <CompactMetric
                                                    label={t("openingBalanceLabel")}
                                                    value={formatAmount(shift.openingBalance, currency)}
                                                />
                                                <CompactMetric
                                                    label={t("expectedDrawerLabel")}
                                                    value={formatAmount(shift.expectedBalance, currency)}
                                                />
                                                <CompactMetric
                                                    label={t("actualDrawerLabel")}
                                                    value={formatAmount(shift.closingBalance, currency)}
                                                />
                                                <CompactMetric
                                                    label={t("differenceLabel")}
                                                    value={shift.variance == null ? "—" : formatAmount(shift.variance, currency)}
                                                    valueClass={varianceTextClass(shift.variance)}
                                                />
                                            </div>

                                            {isExpanded && (
                                                <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
                                                    {!shift.isClosed && (
                                                        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                                            {t("shiftStillOpenHint")}
                                                        </div>
                                                    )}

                                                    <div className="grid gap-3 md:grid-cols-3">
                                                        <DetailItem label={t("paidOrdersLabel")} value={String(shift.paidOrderCount)} />
                                                        <DetailItem label={t("cashCollectedLabel")} value={formatAmount(shift.cashOrdersTotal, currency)} />
                                                        <DetailItem label={t("cardCollectedLabel")} value={formatAmount(shift.cardOrdersTotal, currency)} />
                                                    </div>

                                                    <CashExpectedBreakdown
                                                        openingLabel={t("openingBalanceLabel")}
                                                        cashLabel={t("cashCollectedLabel")}
                                                        deliveryCostLabel={deliveryText.deliveryCost}
                                                        expectedLabel={t("finalExpectedLabel")}
                                                        openingBalance={shift.openingBalance}
                                                        cashCollected={shift.cashOrdersTotal}
                                                        deliveryCost={shift.deliveryCost ?? 0}
                                                        expectedBalance={shift.expectedBalance}
                                                        currency={currency}
                                                    />

                                                    <PaymentMethodsBreakdownPanel
                                                        shift={shift}
                                                        currency={currency}
                                                        text={paymentText}
                                                    />

                                                    <OrderSourceBreakdownPanel
                                                        shift={shift}
                                                        currency={currency}
                                                        text={sourceText}
                                                    />

                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                        <div className="mb-3 text-sm font-semibold text-slate-900">{deliveryText.title}</div>
                                                        <div className="grid gap-3 md:grid-cols-3">
                                                            <DetailItem label={deliveryText.foodRevenue} value={formatAmount(shift.foodRevenue ?? 0, currency)} />
                                                            <DetailItem label={deliveryText.deliveryCollected} value={formatAmount(shift.deliveryCollected ?? 0, currency)} />
                                                            <DetailItem label={deliveryText.deliveryCost} value={formatAmount(shift.deliveryCost ?? 0, currency)} />
                                                            <DetailItem label={deliveryText.deliveryProfit} value={formatAmount(shift.deliveryProfit ?? 0, currency)} />
                                                            <DetailItem label={deliveryText.marketplaceFees} value={formatAmount(shift.marketplaceFees ?? 0, currency)} />
                                                            <DetailItem label={deliveryText.marketplaceServiceFees} value={formatAmount(shift.marketplaceServiceFees ?? 0, currency)} />
                                                            <DetailItem label={deliveryText.netRestaurantRevenue} value={formatAmount(shift.netRestaurantRevenue ?? 0, currency)} />
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-4 lg:grid-cols-2">
                                                        <CommentCard label={t("openingNoteLabel")} value={shift.notes || "—"} />
                                                        <CommentCard label={t("cashierCommentLabel")} value={shift.closingComment || "—"} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                    <div className="text-sm text-slate-600">
                                        {totalCount === 0 ? "0 / 0" : `${firstVisibleShift}-${lastVisibleShift} / ${totalCount}`}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={String(pageSize)}
                                            onValueChange={(value) => {
                                                setPageSize(Number(value))
                                                setPageNumber(1)
                                            }}
                                        >
                                            <SelectTrigger className="h-9 w-[80px] border-slate-200 bg-white text-slate-700 shadow-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent side="top">
                                                {[6, 12, 24, 48].map((size) => (
                                                    <SelectItem key={size} value={String(size)}>
                                                        {size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <span className="text-sm text-slate-600">{t("perPage")}</span>
                                    </div>

                                    <div className="text-sm font-medium text-slate-700">
                                        {t("pageOf")} {pageNumber} / {totalPages}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                                        disabled={pageNumber <= 1}
                                        className="border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                                    >
                                        <ChevronLeft className="rtl:-scale-x-100 me-1 h-4 w-4" />
                                        {t("previous")}
                                    </Button>

                                    <div className="flex items-center gap-1">
                                        {visiblePageNumbers.map((page, index) =>
                                            page === "..." ? (
                                                <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-400">
                                                    …
                                                </span>
                                            ) : (
                                                <Button
                                                    key={page}
                                                    variant={page === pageNumber ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setPageNumber(page)}
                                                    className={`min-w-10 shadow-sm ${
                                                        page === pageNumber
                                                            ? "border-blue-600 bg-red-600 text-white hover:bg-red-700"
                                                            : "border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-blue-50 hover:text-blue-700"
                                                    }`}
                                                >
                                                    {page}
                                                </Button>
                                            )
                                        )}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
                                        disabled={pageNumber >= totalPages}
                                        className="border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                                    >
                                        {t("next")}
                                        <ChevronRight className="rtl:-scale-x-100 ms-1 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("openShiftDialogTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label>{t("colCashier")}</Label>
                            <Select value={openForm.cashierId} onValueChange={(value) => setOpenForm((current) => ({ ...current, cashierId: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("selectCashierPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedCashiers.map((cashier) => (
                                        <SelectItem key={cashier.userId} value={cashier.userId} disabled={activeCashierIds.has(cashier.userId)}>
                                            {cashier.fullName || cashier.username} ({cashier.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("openingBalanceLabel")} ({currency})</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.001"
                                placeholder="0.000"
                                value={openForm.openingBalance}
                                onChange={(event) => setOpenForm((current) => ({ ...current, openingBalance: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("openingNoteLabel")}</Label>
                            <Textarea
                                rows={3}
                                placeholder={t("notesShiftPlaceholder")}
                                value={openForm.notes}
                                onChange={(event) => setOpenForm((current) => ({ ...current, notes: event.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => setOpenDialog(false)}>
                            {t("cancelBtn2")}
                        </Button>
                        <Button onClick={handleOpenShift} disabled={openLoading}>
                            {openLoading ? t("openingShift") : t("openShiftConfirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("closeShiftDialogTitle")} — {closeTarget?.cashierName}</DialogTitle>
                    </DialogHeader>
                    {closeTarget && (
                        <div className="space-y-4 pt-2">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                                <div className="space-y-2">
                                    <DialogDetail label={t("shiftNumberLabel")} value={closeTarget.shiftNumber?.toString() || "—"} />
                                    <DialogDetail label={t("colOpenedAt")} value={formatDate(closeTarget.openedAt, timeZone, dateLocale)} />
                                    <DialogDetail label={t("openingBalanceLabel")} value={formatAmount(closeTarget.openingBalance, currency)} />
                                    <DialogDetail label={t("salesTotalLabel")} value={formatAmount(closeTarget.ordersTotal, currency)} />
                                    <DialogDetail label={deliveryText.foodRevenue} value={formatAmount(closeTarget.foodRevenue ?? 0, currency)} />
                                    <DialogDetail label={deliveryText.deliveryCollected} value={formatAmount(closeTarget.deliveryCollected ?? 0, currency)} />
                                    <DialogDetail label={deliveryText.deliveryCost} value={formatAmount(closeTarget.deliveryCost ?? 0, currency)} />
                                    <DialogDetail label={deliveryText.deliveryProfit} value={formatAmount(closeTarget.deliveryProfit ?? 0, currency)} />
                                    <DialogDetail label={deliveryText.netRestaurantRevenue} value={formatAmount(closeTarget.netRestaurantRevenue ?? 0, currency)} />
                                    {/* <DialogDetail label={t("refundsLabel")} value={formatAmount(getRefundsTotal(closeTarget), currency)} /> */}
                                    <DialogDetail label={t("netTotalLabel")} value={formatAmount(getNetTotal(closeTarget), currency)} />
                                    <DialogDetail label={t("expectedDrawerLabel")} value={formatAmount(closeTarget.expectedBalance, currency)} />
                                </div>
                            </div>
                            <CashExpectedBreakdown
                                openingLabel={t("openingBalanceLabel")}
                                cashLabel={t("cashCollectedLabel")}
                                deliveryCostLabel={deliveryText.deliveryCost}
                                expectedLabel={t("finalExpectedLabel")}
                                openingBalance={closeTarget.openingBalance}
                                cashCollected={closeTarget.cashOrdersTotal}
                                deliveryCost={closeTarget.deliveryCost ?? 0}
                                expectedBalance={closeTarget.expectedBalance}
                                currency={currency}
                            />

                            <PaymentMethodsBreakdownPanel
                                shift={closeTarget}
                                currency={currency}
                                text={paymentText}
                            />

                            <OrderSourceBreakdownPanel
                                shift={closeTarget}
                                currency={currency}
                                text={sourceText}
                            />

                            <div className="space-y-1.5">
                                <Label>{t("closingBalanceLabel")} ({currency})</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    placeholder="0.000"
                                    value={closeForm.closingBalance}
                                    onChange={(event) => setCloseForm((current) => ({ ...current, closingBalance: event.target.value }))}
                                />
                            </div>

                            {closePreviewVariance != null && (
                                <div className={`rounded-lg border p-3 text-sm ${closePreviewVariance > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : closePreviewVariance < 0 ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-medium">
                                            {closePreviewVariance > 0 ? t("shiftSurplus") : closePreviewVariance < 0 ? t("shiftDeficit") : t("shiftMatch")}
                                        </span>
                                        <span className="font-mono font-semibold">
                                            {formatAmount(closePreviewVariance, currency)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label>{t("cashierCommentLabel")}</Label>
                                <Textarea
                                    rows={3}
                                    placeholder={t("closingNotesSummary")}
                                    value={closeForm.notes}
                                    onChange={(event) => setCloseForm((current) => ({ ...current, notes: event.target.value }))}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => setCloseDialog(false)}>
                            {t("cancelBtn2")}
                        </Button>
                        <Button onClick={() => handleCloseShift()} disabled={closeLoading}>
                            {closeLoading ? t("closingShift") : t("confirmClose")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close-shift validation popup. Driven entirely by the backend's
                ShiftCloseValidationDto, so labels/counts always match server state.
                Renders force-close only when the tenant config opted in. */}
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
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            {locale === "ar" ? "لا يمكن إغلاق الوردية" : "Cannot Close Shift"}
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
                                        {locale === "ar"
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
                            {t("cancelBtn2")}
                        </Button>
                        {validation?.forceCloseAllowed && (
                            <Button
                                variant="destructive"
                                disabled={closeLoading || !forceReason.trim()}
                                onClick={() => {
                                    setValidation(null)
                                    setCloseDialog(true)
                                    void handleCloseShift({ force: true })
                                }}
                            >
                                {locale === "ar" ? "إغلاق قسري" : "Force Close"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function MetricCard({
    icon,
    label,
    value,
    valueClass = "text-slate-900",
    shellClass = "border-slate-200 bg-white",
}: {
    icon: React.ReactNode
    label: string
    value: string
    valueClass?: string
    shellClass?: string
}) {
    return (
        <div className={`rounded-[22px] border p-4 shadow-sm ${shellClass}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className={`mt-3 text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-2.5">
                    {icon}
                </div>
            </div>
        </div>
    )
}

function SummaryPill({
    label,
    value,
    valueClass = "text-slate-900",
    shellClass = "border-slate-200 bg-white/90",
}: {
    label: string
    value: string
    valueClass?: string
    shellClass?: string
}) {
    return (
        <div className={`rounded-2xl border px-4 py-3 shadow-sm ${shellClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className={`mt-2 text-sm font-semibold ${valueClass}`}>{value}</p>
        </div>
    )
}

function CompactMetric({
    label,
    value,
    valueClass = "text-slate-900",
}: {
    label: string
    value: string
    valueClass?: string
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className={`mt-2 break-words text-sm font-semibold ${valueClass}`}>{value}</p>
        </div>
    )
}

function MetaChip({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode
    label: string
    value: string
}) {
    return (
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-slate-500">{icon}</span>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                <p className="truncate text-sm font-medium text-slate-700">{value}</p>
            </div>
        </div>
    )
}

function DetailItem({
    label,
    value,
    valueClass = "text-slate-900",
}: {
    label: string
    value: string
    valueClass?: string
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-2 text-sm font-semibold ${valueClass}`}>{value}</p>
        </div>
    )
}

function CashExpectedBreakdown({
    openingLabel,
    cashLabel,
    deliveryCostLabel,
    expectedLabel,
    openingBalance,
    cashCollected,
    deliveryCost,
    expectedBalance,
    currency,
}: {
    openingLabel: string
    cashLabel: string
    deliveryCostLabel: string
    expectedLabel: string
    openingBalance: number
    cashCollected: number
    deliveryCost: number
    expectedBalance: number
    currency: string
}) {
    return (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm">
            <FormulaRow sign="" label={openingLabel} value={formatAmount(openingBalance, currency)} />
            <FormulaRow sign="+" label={cashLabel} value={formatAmount(cashCollected, currency)} />
            <FormulaRow sign="-" label={deliveryCostLabel} value={formatAmount(deliveryCost, currency)} />
            <div className="my-2 border-t border-emerald-200" />
            <FormulaRow sign="=" label={expectedLabel} value={formatAmount(expectedBalance, currency)} strong />
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">{text.title}</div>
                <div className="text-xs font-medium text-slate-500">{text.digitalTitle}</div>
            </div>
            {digitalPayments.length === 0 ? (
                <div className="text-sm text-slate-500">{text.empty}</div>
            ) : (
                <div className="space-y-2">
                    {digitalPayments.map((row) => (
                        <div key={row.method} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-sm">
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

function OrderSourceBreakdownPanel({
    shift,
    currency,
    text,
}: {
    shift: CashierBalanceShift
    currency: string
    text: {
        title: string
        subtitle: string
        orders: string
        empty: string
    }
}) {
    const rows = shift.partnerSalesBreakdown ?? []

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">{text.title}</div>
                <div className="text-xs font-medium text-slate-500">{text.subtitle}</div>
            </div>
            {rows.length === 0 ? (
                <div className="text-sm text-slate-500">{text.empty}</div>
            ) : (
                <div className="space-y-2">
                    {rows.map((row) => (
                        <div
                            key={`${row.partnerName}-${row.partnerCode ?? ""}-${row.deliveryPartnerId ?? ""}`}
                            className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                        >
                            <div>
                                <div className="font-semibold text-slate-800">{row.partnerName}</div>
                                <div className="text-xs text-slate-500">{row.orderCount} {text.orders}</div>
                            </div>
                            <div className="font-mono font-semibold text-slate-900">{formatAmount(row.totalAmount, currency)}</div>
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

function CommentCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
        </div>
    )
}

function DialogDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-900">{value}</span>
        </div>
    )
}
