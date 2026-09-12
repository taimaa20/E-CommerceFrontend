"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRightLeft, Ban, CheckCircle, Clock, DollarSign, Download, Eye, History, Loader, RefreshCw, RotateCcw, Search, TicketPercent, X, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BranchFilter } from "@/components/filters/BranchFilter"
import { StandardFilter, type StandardFilterOption } from "@/components/filters/StandardFilter"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { exportOrdersCsv, getCancelReasons, getOrderById, getOrders, getOrdersSummary, getPartnerDiscountOverrideAudits, updateOrderTotalOverride, updatePartnerDiscountOverride, type CancelReason } from "@/lib/api"
import { getDeliveryPartners, getDeliveryPartnerName, type DeliveryPartnerDto } from "@/lib/api-delivery-partners"
import { getPaymentMethods, getPaymentMethodName, type PaymentMethodDto } from "@/lib/api-payment-methods"
import CancelOrderModal from "@/components/cancel/CancelOrderModal"
import OrderCancellationApproval from "@/components/cancel/OrderCancellationApproval"
import RefundOrderModal from "@/components/cancel/RefundOrderModal"
import PaymentAdjustmentDialog from "@/components/payment/PaymentAdjustmentDialog"
import PaymentAdjustmentHistoryDialog from "@/components/payment/PaymentAdjustmentHistoryDialog"
import { RetailOrderLines } from "@/components/retail/RetailOrderLines"
import PaymentAdjustmentApproval from "@/components/payment/PaymentAdjustmentApproval"
import { getCancellationReasonLabel, getCancellationStatusLabel, getManagerDecisionLabel } from "@/lib/cancellation-i18n"
import { formatOrderSequence } from "@/lib/order-sequence"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { useLocale } from "@/components/locale-provider"
import { useAuthStore } from "@/store/authStore"
import { usePosStore } from "@/store/posStore"
import { useSettingsStore } from "@/store/settingsStore"
import { useActiveBranchVersion } from "@/store/branchContextStore"
import { UserRole } from "@/types/auth"
import { isAdminRole } from "@/lib/authorization"
import {
    addCalendarDays,
    formatRestaurantDateTime,
    getRestaurantToday,
    restaurantDateRangeToUtc,
} from "@/lib/date-time"
import type { OrderDto, OrderFilters, OrderItemDto, OrderListItemDto, OrderSummaryDto, PartnerPriceOverrideAuditDto } from "@/types/order"
import { toast } from "sonner"

type DatePreset = "today" | "week" | "month" | "custom" | "all"
type SortOrder = "newest" | "oldest"

const DEFAULT_PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000"
const QUERY_DATE_PRESETS = new Set<DatePreset>(["today", "week", "month", "custom", "all"])
const QUERY_ORDER_STATUSES = new Set(["Active", "New", "Preparing", "Ready", "Served", "Paid", "Completed", "PendingCancellationApproval", "Cancelled", "Refunded", "CancellationRejected"])

// Refund & cancel UI is intentionally hidden. Flip to `true` to re-enable.
// Backend endpoints (/refund, /cancel) remain reachable — this is a UI-only gate.
const REFUND_AND_CANCEL_UI_ENABLED = false

function getPresetRange(
    preset: DatePreset,
    customFrom: string,
    customTo: string,
    timeZone: string,
): Pick<OrderFilters, "dateFrom" | "dateTo"> {
    const today = getRestaurantToday(timeZone)

    if (preset === "today") {
        const range = restaurantDateRangeToUtc(today, today, timeZone)
        return { dateFrom: range.startUtc, dateTo: range.endUtc }
    }

    if (preset === "week") {
        const day = new Date(`${today}T00:00:00Z`).getUTCDay()
        const start = addCalendarDays(today, -((day + 6) % 7))
        const range = restaurantDateRangeToUtc(start, today, timeZone)
        return { dateFrom: range.startUtc, dateTo: range.endUtc }
    }

    if (preset === "month") {
        const start = `${today.slice(0, 8)}01`
        const range = restaurantDateRangeToUtc(start, today, timeZone)
        return { dateFrom: range.startUtc, dateTo: range.endUtc }
    }

    if (preset === "custom") {
        if (!customFrom && !customTo) return {}
        const from = customFrom || customTo
        const through = customTo || customFrom
        const range = restaurantDateRangeToUtc(from, through, timeZone)
        return {
            dateFrom: customFrom ? range.startUtc : undefined,
            dateTo: customTo ? range.endUtc : undefined,
        }
    }

    return {}
}

function getDatePresetFromQuery(value: string | null): DatePreset {
    if (value === "history") return "all"
    return value && QUERY_DATE_PRESETS.has(value as DatePreset) ? value as DatePreset : "today"
}

function getOrderStatusFromQuery(value: string | null) {
    return value && QUERY_ORDER_STATUSES.has(value) ? value : "all"
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs font-semibold uppercase text-amber-700">{label}</div>
            <div className="mt-0.5 text-amber-950">{value}</div>
        </div>
    )
}

function isPartnerOrder(order: Pick<OrderDto, "orderSource"> | null | undefined) {
    return order?.orderSource === "Talabat" || order?.orderSource === "DeliveryPartner"
}

export default function OrdersPage() {
    const { t, locale } = useLocale()
    const currentUser = useAuthStore((state) => state.user)
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId)
    const searchParams = useSearchParams()
    const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
        New:       { label: t("statusNew"),       color: "bg-slate-100 text-slate-700", icon: <Clock className="w-3 h-3" /> },
        Pending:   { label: t("statusPending"),   color: "bg-warning/10 text-warning", icon: <Clock className="w-3 h-3" /> },
        Preparing: { label: t("statusPreparing"), color: "bg-info/10 text-info", icon: <Loader className="w-3 h-3" /> },
        Ready:     { label: t("statusReady"),     color: "bg-success/10 text-success", icon: <CheckCircle className="w-3 h-3" /> },
        Served:    { label: t("statusServed"),    color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="w-3 h-3" /> },
        Paid:      { label: t("statusPaid"),      color: "bg-accent/10 text-accent-foreground", icon: <DollarSign className="w-3 h-3" /> },
        Completed: { label: t("statusCompleted"), color: "bg-zinc-100 text-zinc-700", icon: <CheckCircle className="w-3 h-3" /> },
        Cancelled: { label: t("statusCancelled"), color: "bg-destructive/10 text-destructive", icon: <XCircle className="w-3 h-3" /> },
        Refunded: { label: locale === "ar" ? "مسترد" : "Refunded", color: "bg-rose-100 text-rose-700", icon: <RotateCcw className="w-3 h-3" /> },
        PendingCancellationApproval: { label: locale === "ar" ? "بانتظار موافقة الإلغاء" : "Pending Cancellation Approval", color: "bg-amber-100 text-amber-900", icon: <Clock className="w-3 h-3" /> },
        CancellationRejected: { label: locale === "ar" ? "تم رفض الإلغاء" : "Cancellation Rejected", color: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3" /> },
    }

    const PAYMENT_LABELS: Record<string, string> = {
        Cash: t("paymentCash"),
        Card: t("paymentCard"),
        Online: t("paymentOnline"),
    }
    const legacyCardLabel = locale === "ar" ? "بطاقة (سابقة)" : "Card (legacy)"
    const cashLabel = locale === "ar" ? "نقدي" : "Cash"
    const LEGACY_CARD_METHODS = new Set(["card", "credit card", "creditcard", "online", "credit", "debit", "debit card"])

    const [orders, setOrders] = useState<OrderListItemDto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null)
    const [selectedPaymentAdjustmentId, setSelectedPaymentAdjustmentId] = useState<string | null>(null)
    const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null)
    const [cancelTarget, setCancelTarget] = useState<{ itemId?: string; itemName?: string } | null>(null)
    const [cancelOrderData, setCancelOrderData] = useState<OrderDto | null>(null)
    const [refundOrderData, setRefundOrderData] = useState<OrderDto | null>(null)
    const [paymentAdjustmentOrder, setPaymentAdjustmentOrder] = useState<OrderDto | null>(null)
    const [paymentAdjustmentHistoryOpen, setPaymentAdjustmentHistoryOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [partnerDiscountItem, setPartnerDiscountItem] = useState<OrderItemDto | null>(null)
    const [partnerDiscountApplied, setPartnerDiscountApplied] = useState(false)
    const [partnerDiscountOriginal, setPartnerDiscountOriginal] = useState("")
    const [partnerDiscountDiscounted, setPartnerDiscountDiscounted] = useState("")
    const [partnerDiscountReason, setPartnerDiscountReason] = useState("")
    const [partnerDiscountSaving, setPartnerDiscountSaving] = useState(false)
    const [orderTotalEditorOpen, setOrderTotalEditorOpen] = useState(false)
    const [orderTotalCorrected, setOrderTotalCorrected] = useState("")
    const [orderTotalReason, setOrderTotalReason] = useState("")
    const [orderTotalSaving, setOrderTotalSaving] = useState(false)
    const [partnerDiscountAudits, setPartnerDiscountAudits] = useState<PartnerPriceOverrideAuditDto[]>([])
    const [partnerDiscountAuditsLoading, setPartnerDiscountAuditsLoading] = useState(false)

    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [totalCount, setTotalCount] = useState(0)

    const [searchInput, setSearchInput] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState(() => getOrderStatusFromQuery(searchParams.get("status")))
    const [filterPayment, setFilterPayment] = useState("all")
    const [filterType, setFilterType] = useState("all")
    const [filterSource, setFilterSource] = useState("all")
    const [filterBranch, setFilterBranch] = useState("")
    const branchVersion = useActiveBranchVersion()
    const [filterPartner, setFilterPartner] = useState("all")
    const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartnerDto[]>([])
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDto[]>([])
    const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([])
    const [filterVoucher, setFilterVoucher] = useState("all")
    const [datePreset, setDatePreset] = useState<DatePreset>(() => getDatePresetFromQuery(searchParams.get("range")))
    const [customFrom, setCustomFrom] = useState("")
    const [customTo, setCustomTo] = useState("")
    const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
    const [stats, setStats] = useState<OrderSummaryDto>({ totalCount: 0, activeCount: 0, paidCount: 0, revenue: 0 })

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setSearchTerm(searchInput.trim())
            setPageNumber(1)
        }, SEARCH_DEBOUNCE_MS)

        return () => window.clearTimeout(timeoutId)
    }, [searchInput])

    useEffect(() => {
        fetchOrders()
    }, [pageNumber, pageSize, searchTerm, filterStatus, filterPayment, filterType, filterSource, filterBranch, filterPartner, filterVoucher, datePreset, customFrom, customTo, sortOrder, timeZone, branchVersion])

    // Master-data lookups (not the branch-filtered "/active" variants): the admin
    // order list spans branches and history, so partners/methods disabled for the
    // currently selected branch must still be filterable.
    useEffect(() => {
        getDeliveryPartners({ pageSize: 200 })
            .then((page) => setDeliveryPartners(page.items))
            .catch(() => setDeliveryPartners([]))
    }, [])

    useEffect(() => {
        getPaymentMethods()
            .then(setPaymentMethods)
            .catch(() => setPaymentMethods([]))
    }, [])

    useEffect(() => {
        getCancelReasons()
            .then(setCancelReasons)
            .catch(() => setCancelReasons([]))
    }, [])

    useEffect(() => {
        setDatePreset(getDatePresetFromQuery(searchParams.get("range")))
        setFilterStatus(getOrderStatusFromQuery(searchParams.get("status")))
        setPageNumber(1)
    }, [searchParams])

    // Deep-link from a cancellation notification: /admin/orders?orderId=<id> opens that
    // order's details popup directly (works even if it is outside the current filter).
    useEffect(() => {
        const orderId = searchParams.get("orderId")
        if (!orderId) return
        let active = true
        getOrderById(orderId)
            .then(async (order) => {
                if (!active) return
                setSelectedOrder(order)
                setPartnerDiscountAuditsLoading(true)
                try {
                    const audits = await getPartnerDiscountOverrideAudits(order.id)
                    if (active) setPartnerDiscountAudits(audits)
                } catch {
                    if (active) setPartnerDiscountAudits([])
                } finally {
                    if (active) setPartnerDiscountAuditsLoading(false)
                }
            })
            .catch(() => {
                setPartnerDiscountAudits([])
                setPartnerDiscountAuditsLoading(false)
            })
        return () => { active = false }
    }, [searchParams])

    const hasPendingItemCancellation = (order: OrderDto, itemId?: string | null) =>
        !!itemId && (
            order.hasPendingFullCancellation === true ||
            (order.pendingCancellationItemIds ?? []).includes(itemId)
        )

    const isCustomRangeInvalid = datePreset === "custom" && customFrom !== "" && customTo !== "" && customFrom > customTo

    const buildFilters = (page = pageNumber): OrderFilters => ({
        page,
        pageSize,
        search: searchTerm,
        status: filterStatus,
        payment: filterPayment,
        type: filterType,
        source: filterSource,
        branchId: filterBranch || undefined,
        partnerId: filterPartner === "all" ? undefined : filterPartner,
        voucherApplied: filterVoucher === "all" ? undefined : filterVoucher === "yes",
        sort: sortOrder,
        ...getPresetRange(datePreset, customFrom, customTo, timeZone),
    })

    const fetchOrders = async () => {
        if (isCustomRangeInvalid) {
            setError(t("invalidDateRange"))
            setOrders([])
            setTotalCount(0)
            return
        }

        setIsLoading(true)
        setError("")

        try {
            const filters = buildFilters()
            const [pageData, summary] = await Promise.all([
                getOrders(filters),
                getOrdersSummary({ ...filters, page: 1, pageSize: 1 }),
            ])

            setOrders(pageData.items)
            setTotalCount(pageData.totalCount)
            setStats(summary)
        } catch {
            setError(t("ordersLoadError"))
            setOrders([])
            setTotalCount(0)
            setStats({ totalCount: 0, activeCount: 0, paidCount: 0, revenue: 0, voucherCount: 0, voucherDiscountTotal: 0 })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefresh = () => {
        fetchOrders()
    }

    const handleExport = async () => {
        setIsExporting(true)
        setError("")

        try {
            const blob = await exportOrdersCsv(buildFilters(1))
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `orders-${getRestaurantToday(timeZone)}.csv`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch {
            setError(t("ordersExportError"))
        } finally {
            setIsExporting(false)
        }
    }

    const loadPartnerDiscountAudits = async (order: OrderDto | null) => {
        if (!order) {
            setPartnerDiscountAudits([])
            setPartnerDiscountAuditsLoading(false)
            return
        }

        setPartnerDiscountAuditsLoading(true)
        try {
            setPartnerDiscountAudits(await getPartnerDiscountOverrideAudits(order.id))
        } catch {
            setPartnerDiscountAudits([])
        } finally {
            setPartnerDiscountAuditsLoading(false)
        }
    }

    const handleOpenOrder = async (order: OrderListItemDto) => {
        setLoadingOrderId(order.id)
        setError("")
        setSelectedPaymentAdjustmentId(order.pendingPaymentAdjustmentId ?? null)

        try {
            const orderDetails = await getOrderById(order.id)
            setSelectedOrder(orderDetails)
            await loadPartnerDiscountAudits(orderDetails)
        } catch {
            setSelectedPaymentAdjustmentId(null)
            setError(t("ordersLoadError"))
            setPartnerDiscountAudits([])
        } finally {
            setLoadingOrderId(null)
        }
    }

    const canManagePartnerDiscounts =
        isAdminRole(currentUser?.role) ||
        currentUser?.role === UserRole.Manager ||
        currentUser?.role === UserRole.Owner ||
        currentUser?.roleName === "Owner"

    const canEditPartnerDiscount = (order: OrderDto | null) =>
        canManagePartnerDiscounts &&
        !!order

    const getPartnerDiscountReadOnlyMessage = () => {
        if (!canManagePartnerDiscounts) {
            return locale === "ar"
                ? "يمكن للمدير أو المالك فقط تعديل السعر."
                : "Only admins, managers, or owners can edit prices."
        }
        return null
    }

    const openPartnerDiscountEditor = (item: OrderItemDto) => {
        const original = item.partnerOriginalUnitPrice ?? item.unitPrice ?? 0
        const partnerPrice = item.partnerDiscountedUnitPrice ?? item.unitPrice ?? 0

        setPartnerDiscountItem(item)
        setPartnerDiscountApplied(item.hasPartnerDiscountOverride === true)
        setPartnerDiscountOriginal(original > 0 ? String(original) : "")
        setPartnerDiscountDiscounted(partnerPrice > 0 ? String(partnerPrice) : "")
        setPartnerDiscountReason(item.partnerDiscountReason ?? "")
    }

    const closePartnerDiscountEditor = () => {
        setPartnerDiscountItem(null)
        setPartnerDiscountApplied(false)
        setPartnerDiscountOriginal("")
        setPartnerDiscountDiscounted("")
        setPartnerDiscountReason("")
        setPartnerDiscountSaving(false)
    }

    const openOrderTotalEditor = () => {
        if (!selectedOrder) return
        setOrderTotalCorrected(String(selectedOrder.totalAmount ?? ""))
        setOrderTotalReason("")
        setOrderTotalEditorOpen(true)
    }

    const closeOrderTotalEditor = () => {
        setOrderTotalEditorOpen(false)
        setOrderTotalCorrected("")
        setOrderTotalReason("")
        setOrderTotalSaving(false)
    }

    const saveOrderTotalOverride = async () => {
        if (!selectedOrder) return

        const correctedTotal = Number(orderTotalCorrected)
        const reason = orderTotalReason.trim()

        if (!Number.isFinite(correctedTotal) || correctedTotal <= 0) {
            toast.error(locale === "ar" ? "إجمالي الطلب يجب أن يكون أكبر من صفر" : "Order total must be greater than zero")
            return
        }

        setOrderTotalSaving(true)
        try {
            await updateOrderTotalOverride(selectedOrder.id, {
                correctedTotalAmount: correctedTotal,
                reason: reason || null,
            })
            const refreshed = await getOrderById(selectedOrder.id)
            setSelectedOrder(refreshed)
            await loadPartnerDiscountAudits(refreshed)
            await fetchOrders()
            closeOrderTotalEditor()
            toast.success(isPartnerOrder(refreshed)
                ? (locale === "ar" ? "تم حفظ إجمالي سعر الشريك" : "Partner order total saved")
                : (locale === "ar" ? "تم حفظ تصحيح إجمالي الطلب" : "Order total correction saved"))
        } catch (error) {
            toast.error(error instanceof Error && error.message ? error.message : locale === "ar" ? "فشل حفظ إجمالي الطلب" : "Failed to save order total")
            setOrderTotalSaving(false)
        }
    }

    const savePartnerDiscountOverride = async () => {
        if (!selectedOrder || !partnerDiscountItem?.id) return

        const original = Number(partnerDiscountOriginal)
        const partnerPrice = Number(partnerDiscountDiscounted)
        const reason = partnerDiscountReason.trim()

        if (!Number.isFinite(partnerPrice) || partnerPrice <= 0) {
            toast.error(locale === "ar" ? "السعر يجب أن يكون أكبر من صفر" : "Price must be greater than zero")
            return
        }

        setPartnerDiscountSaving(true)
        try {
            await updatePartnerDiscountOverride(selectedOrder.id, partnerDiscountItem.id, {
                hasPartnerDiscountOverride: partnerDiscountApplied,
                partnerOriginalUnitPrice: Number.isFinite(original) && original > 0 ? original : null,
                partnerDiscountedUnitPrice: partnerPrice,
                partnerDiscountReason: reason || null,
            })
            const refreshed = await getOrderById(selectedOrder.id)
            setSelectedOrder(refreshed)
            await loadPartnerDiscountAudits(refreshed)
            await fetchOrders()
            closePartnerDiscountEditor()
            toast.success(isPartnerOrder(refreshed)
                ? (locale === "ar" ? "تم حفظ سعر الشريك" : "Partner price saved")
                : (locale === "ar" ? "تم حفظ تصحيح السعر" : "Wrong price correction saved"))
        } catch (error) {
            toast.error(error instanceof Error && error.message ? error.message : locale === "ar" ? "فشل حفظ السعر" : "Failed to save price")
            setPartnerDiscountSaving(false)
        }
    }

    const resetFilters = () => {
        setSearchInput("")
        setSearchTerm("")
        setFilterStatus("all")
        setFilterPayment("all")
        setFilterType("all")
        setFilterSource("all")
        setFilterBranch("")
        setFilterPartner("all")
        setFilterVoucher("all")
        setDatePreset("today")
        setCustomFrom("")
        setCustomTo("")
        setSortOrder("newest")
        setPageNumber(1)
    }

    const formatCurrency = (amount: number) => {
        const { currency } = usePosStore.getState()
        return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount)
    }

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "-"

        return formatRestaurantDateTime(dateString, timeZone, locale === "ar" ? "ar-QA" : "en-US")
    }

    const getStatusBadge = (status: string) => {
        const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700", icon: null }

        return (
            <Badge className={`${cfg.color} flex w-fit items-center gap-1 whitespace-nowrap`}>
                {cfg.icon}
                {cfg.label}
            </Badge>
        )
    }

    const getPaymentBadge = (paymentMethod?: string | null) => {
        if (!paymentMethod) {
            return <span className="text-sm text-muted-foreground">-</span>
        }

        return <Badge variant="outline" className="whitespace-nowrap">{PAYMENT_LABELS[paymentMethod] ?? paymentMethod}</Badge>
    }

    const getOrderPaymentLabel = (order: {
        paymentMethodName?: string | null
        paymentMethodNameAr?: string | null
        paymentMethod?: string | null
        payments?: { paymentMethodName?: string | null; paymentMethodNameAr?: string | null; method?: string }[]
    }) => {
        const fromPayment = order.payments && order.payments.length > 0
            ? order.payments[order.payments.length - 1]
            : undefined
        const nameEn = order.paymentMethodName ?? fromPayment?.paymentMethodName
        const nameAr = order.paymentMethodNameAr ?? fromPayment?.paymentMethodNameAr
        const real = locale === "ar" ? (nameAr || nameEn) : (nameEn || nameAr)
        if (real) return real
        // Configured-method snapshot is missing — fall back to legacy bucket
        // so "Card" / "Credit Card" / "Online" all show as one label.
        const legacy = (order.paymentMethod ?? fromPayment?.method ?? "").trim()
        if (!legacy) return null
        const normalized = legacy.toLowerCase()
        if (normalized.includes("cash") || normalized.includes("nakit")) return cashLabel
        if (LEGACY_CARD_METHODS.has(normalized)) return legacyCardLabel
        return legacy
    }

    const getTypeBadge = (orderType?: string | null) => (
        <Badge variant="secondary" className="whitespace-nowrap">
            {orderType === "Delivery"
                ? (locale === "ar" ? "توصيل" : "Delivery")
                : orderType === "Takeaway"
                    ? t("takeaway")
                    : orderType === "DineIn"
                        ? t("dineIn")
                        : (locale === "ar" ? "طلب" : "Order")}
        </Badge>
    )

    const getPartnerDisplayName = (
        order: Pick<OrderListItemDto, "deliveryPartnerName" | "deliveryPartnerNameAr" | "deliveryPartnerCode">
    ) => {
        if (locale === "ar" && order.deliveryPartnerNameAr) return order.deliveryPartnerNameAr
        return order.deliveryPartnerName || order.deliveryPartnerCode || (locale === "ar" ? "شريك توصيل" : "Delivery Partner")
    }

    const getSourceBadge = (
        order: Pick<OrderListItemDto, "orderSource" | "talabatOrderNumber" | "deliveryPartnerName" | "deliveryPartnerNameAr" | "deliveryPartnerCode" | "partnerOrderNumber">
    ) => {
        if (order.orderSource === "Online") {
            return (
                <Badge variant="outline" className="w-fit border-sky-300 bg-sky-50 text-sky-700">
                    {locale === "ar" ? "المتجر الإلكتروني" : "Online Shop"}
                </Badge>
            )
        }

        if (order.orderSource === "DeliveryPartner") {
            return (
                <Badge variant="outline" className="w-fit border-emerald-300 bg-emerald-50 text-emerald-700">
                    {getPartnerDisplayName(order)}{order.partnerOrderNumber ? ` #${order.partnerOrderNumber}` : ""}
                </Badge>
            )
        }

        if (order.orderSource !== "Talabat") return null

        return (
            <Badge variant="outline" className="w-fit border-orange-300 bg-orange-50 text-orange-700">
                {locale === "ar" ? "طلبات" : "Talabat"}{order.talabatOrderNumber ? ` #${order.talabatOrderNumber}` : ""}
            </Badge>
        )
    }

    const filterMenuText = {
        search: t("filterSearchPlaceholder"),
        empty: t("filterNoOptions"),
        loading: t("loadingText"),
        clear: t("filterClear"),
    }
    const datePresetOptions: StandardFilterOption[] = [
        { value: "today", label: t("today") },
        { value: "week", label: t("thisWeek") },
        { value: "month", label: t("thisMonth") },
        { value: "custom", label: t("customRangeLabel") },
        { value: "all", label: t("allOrdersFilter") },
    ]
    const statusFilterOptions: StandardFilterOption[] = [
        { value: "all", label: t("allStatuses") },
        { value: "Active", label: t("activeOrdersFilter") },
        ...["New", "Preparing", "Ready", "Served", "Paid", "Completed", "PendingCancellationApproval", "Cancelled", "Refunded", "CancellationRejected"]
            .map((status) => ({ value: status, label: STATUS_CONFIG[status]?.label ?? status })),
    ]
    const paymentFilterOptions: StandardFilterOption[] = [
        { value: "all", label: t("allPayments") },
        ...(paymentMethods.length > 0
            ? paymentMethods.map((method) => ({ value: method.code, label: getPaymentMethodName(method, locale) }))
            : [
                { value: "Cash", label: t("paymentCash") },
                { value: "Card", label: t("paymentCard") },
            ]),
    ]
    const orderTypeOptions: StandardFilterOption[] = [
        { value: "all", label: t("allOrderTypes") },
        { value: "DineIn", label: t("dineIn") },
        { value: "Takeaway", label: t("takeaway") },
        { value: "Delivery", label: t("delivery") },
    ]
    const sourceOptions: StandardFilterOption[] = [
        { value: "all", label: t("allSourcesFilter") },
        { value: "Pos", label: "POS" },
        { value: "Online", label: locale === "ar" ? "المتجر الإلكتروني" : "Online Shop" },
        { value: "DeliveryPartner", label: t("deliveryPartnerFilter") },
    ]
    const partnerOptions: StandardFilterOption[] = [
        { value: "all", label: t("allPartnersFilter") },
        ...deliveryPartners.map((partner) => ({
            value: partner.id,
            label: getDeliveryPartnerName(partner, locale === "ar"),
            searchText: `${partner.name} ${partner.nameAr ?? ""} ${partner.code ?? ""}`,
        })),
    ]
    const voucherOptions: StandardFilterOption[] = [
        { value: "all", label: t("allVouchersFilter") },
        { value: "yes", label: t("voucherAppliedFilter") },
        { value: "no", label: t("voucherNotAppliedFilter") },
    ]
    const sortOptions: StandardFilterOption[] = [
        { value: "newest", label: t("newestFirst") },
        { value: "oldest", label: t("oldestFirst") },
    ]

    const isFiltered =
        searchInput !== "" ||
        filterStatus !== "all" ||
        filterPayment !== "all" ||
        filterType !== "all" ||
        filterSource !== "all" ||
        filterBranch !== "" ||
        filterPartner !== "all" ||
        filterVoucher !== "all" ||
        datePreset !== "today" ||
        sortOrder !== "newest"

    return (
        <div className="space-y-6 p-2 lg:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        {t("ordersTitle")}
                    </h1>
                    <p className="text-muted-foreground">{t("ordersSubtitle")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setPaymentAdjustmentHistoryOpen(true)} className="h-10 gap-2">
                        <History className="h-4 w-4" />
                        {locale === "ar" ? "سجل تعديلات الدفع" : "Payment Changes"}
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={isExporting || isLoading || isCustomRangeInvalid} className="h-10 gap-2">
                        <Download className={`w-4 h-4 ${isExporting ? "animate-pulse" : ""}`} />
                        {t("exportCsv")}
                    </Button>
                    <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="h-10 gap-2">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        {t("refreshBtn")}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <Card className="border-none shadow-md">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.totalCount}</div>
                        <div className="text-sm text-muted-foreground">{t("totalOrders")}</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-info">{stats.activeCount}</div>
                        <div className="text-sm text-muted-foreground">{t("activeOrdersCard")}</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-success">{stats.paidCount}</div>
                        <div className="text-sm text-muted-foreground">{t("paidOrdersCard")}</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-accent-foreground">{formatCurrency(stats.revenue)}</div>
                        <div className="text-sm text-muted-foreground">{t("totalRevenue")}</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-700">{stats.voucherCount ?? 0}</div>
                        <div className="text-sm text-muted-foreground">{locale === "ar" ? "قسائم اليوم" : "Voucher Orders"}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
                <CardHeader>
                    <CardTitle>{t("allOrders")}</CardTitle>
                    <CardDescription>{t("allOrdersDesc")}</CardDescription>
                    <div className="grid gap-2 pt-2 md:grid-cols-2 xl:grid-cols-9">
                        <div className="relative md:col-span-2 xl:col-span-2">
                            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("searchOrdersPlaceholder")}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="ps-8"
                            />
                        </div>
                        <BranchFilter
                            value={filterBranch}
                            onValueChange={(branchId) => { setFilterBranch(branchId); setPageNumber(1); }}
                            label={t("branchFilterLabel")}
                            triggerClassName="w-full"
                            contentClassName="min-w-72"
                        />
                        <StandardFilter
                            value={datePreset}
                            onValueChange={(value) => { setDatePreset((value ?? "today") as DatePreset); setPageNumber(1); }}
                            options={datePresetOptions}
                            label={t("selectPeriod")}
                            placeholder={t("selectPeriod")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full"
                        />
                        <StandardFilter
                            value={filterStatus}
                            onValueChange={(value) => { setFilterStatus(value ?? "all"); setPageNumber(1); }}
                            options={statusFilterOptions}
                            label={t("allStatuses")}
                            placeholder={t("allStatuses")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full"
                        />
                        <StandardFilter
                            value={filterPayment}
                            onValueChange={(value) => { setFilterPayment(value ?? "all"); setPageNumber(1); }}
                            options={paymentFilterOptions}
                            label={t("allPayments")}
                            placeholder={t("allPayments")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full"
                        />
                        <StandardFilter
                            value={filterType}
                            onValueChange={(value) => { setFilterType(value ?? "all"); setPageNumber(1); }}
                            options={orderTypeOptions}
                            label={t("allOrderTypes")}
                            placeholder={t("allOrderTypes")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full"
                        />
                        <StandardFilter
                            value={filterSource}
                            onValueChange={(value) => {
                                const next = value ?? "all";
                                setFilterSource(next);
                                if (next !== "DeliveryPartner") setFilterPartner("all");
                                setPageNumber(1);
                            }}
                            options={sourceOptions}
                            label={t("allSourcesFilter")}
                            placeholder={t("allSourcesFilter")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full"
                        />
                        {deliveryPartners.length > 0 && (
                            <StandardFilter
                                value={filterPartner}
                                onValueChange={(value) => {
                                    const next = value ?? "all";
                                    setFilterPartner(next);
                                    if (next !== "all") setFilterSource("DeliveryPartner");
                                    setPageNumber(1);
                                }}
                                options={partnerOptions}
                                label={t("allPartnersFilter")}
                                placeholder={t("allPartnersFilter")}
                                searchPlaceholder={filterMenuText.search}
                                emptyText={filterMenuText.empty}
                                loadingText={filterMenuText.loading}
                                clearLabel={filterMenuText.clear}
                                clearable={false}
                                triggerClassName="w-full"
                            />
                        )}
                        <StandardFilter
                            value={filterVoucher}
                            onValueChange={(value) => { setFilterVoucher(value ?? "all"); setPageNumber(1); }}
                            options={voucherOptions}
                            label={t("voucherDiscountLabel")}
                            placeholder={t("voucherDiscountLabel")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full"
                        />
                        <StandardFilter
                            value={sortOrder}
                            onValueChange={(value) => { setSortOrder((value ?? "newest") as SortOrder); setPageNumber(1); }}
                            options={sortOptions}
                            label={t("sortBy")}
                            placeholder={t("sortBy")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full"
                        />
                    </div>
                    {datePreset === "custom" && (
                        <div className="grid gap-2 pt-2 sm:grid-cols-[minmax(0,180px)_minmax(0,180px)_auto]">
                            <Input
                                type="date"
                                aria-label={t("fromDateLabel")}
                                value={customFrom}
                                onChange={(e) => { setCustomFrom(e.target.value); setPageNumber(1); }}
                            />
                            <Input
                                type="date"
                                aria-label={t("toDateLabel")}
                                value={customTo}
                                onChange={(e) => { setCustomTo(e.target.value); setPageNumber(1); }}
                            />
                            {isFiltered && (
                                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetFilters}>
                                    <X className="w-3.5 h-3.5" />
                                    {t("resetFilters")}
                                </Button>
                            )}
                        </div>
                    )}
                    {datePreset !== "custom" && isFiltered && (
                        <div className="pt-2">
                            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetFilters}>
                                <X className="w-3.5 h-3.5" />
                                {t("resetFilters")}
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>{t("noOrdersFound")}</p>
                            {isFiltered && (
                                <Button variant="ghost" size="sm" className="mt-3" onClick={resetFilters}>
                                    {t("resetFilters")}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="font-bold">{t("orderNoCol")}</TableHead>
                                            <TableHead className="font-bold">{t("dateCol")}</TableHead>
                                            <TableHead className="font-bold">{t("tableCol")}</TableHead>
                                            <TableHead className="font-bold">{t("itemsCol")}</TableHead>
                                            <TableHead className="font-bold">{t("totalCol")}</TableHead>
                                            <TableHead className="font-bold">{locale === "ar" ? "القسيمة" : "Voucher"}</TableHead>
                                            <TableHead className="font-bold">{locale === "ar" ? "علامة السعر" : "Price Flag"}</TableHead>
                                            <TableHead className="font-bold">{t("paymentCol")}</TableHead>
                                            <TableHead className="font-bold">{locale === "ar" ? "رقم المرجع" : "Reference"}</TableHead>
                                            <TableHead className="font-bold">{t("colCashier")}</TableHead>
                                            <TableHead className="font-bold">{t("statusCol")}</TableHead>
                                            <TableHead className="text-end font-bold">{t("actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => (
                                            <TableRow key={order.id} className="transition-colors hover:bg-muted/50">
                                                <TableCell className="font-mono text-sm">
                                                    {formatOrderSequence(order) ?? `#${order.orderNumber?.slice(-6) ?? order.id.slice(-6)}`}
                                                </TableCell>
                                                <TableCell className="min-w-[150px] text-sm text-muted-foreground">
                                                    {formatDate(order.createdAt)}
                                                </TableCell>
                                                <TableCell className="min-w-[150px]">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-medium">{order.tableName ?? "-"}</span>
                                                        {getTypeBadge(order.orderType)}
                                                        {getSourceBadge(order)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {order.itemCount}
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                    {formatCurrency(order.totalAmount ?? 0)}
                                                </TableCell>
                                                <TableCell>
                                                    {order.isVoucherApplied ? (
                                                        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700">
                                                            <TicketPercent className="h-3 w-3" />
                                                            {formatCurrency(order.voucherDiscountAmount ?? 0)}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {order.hasPartnerDiscountOverride ? (
                                                        <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700">
                                                            <TicketPercent className="h-3 w-3" />
                                                            {locale === "ar" ? "نعم" : "Yes"}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">{locale === "ar" ? "لا" : "No"}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getPaymentBadge(getOrderPaymentLabel(order))}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {order.paymentReferenceNumber || "-"}
                                                </TableCell>
                                                <TableCell className="min-w-[140px] text-sm text-muted-foreground">
                                                    {order.cashierName || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1">
                                                        {getStatusBadge(filterStatus === "CancellationRejected" ? "CancellationRejected" : order.status)}
                                                        {order.hasPendingPaymentAdjustment && (
                                                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                                                                {locale === "ar" ? "تعديل دفع بانتظار الموافقة" : "Payment Change Pending"}
                                                            </Badge>
                                                        )}
                                                        {order.hasPendingCancellationApproval && (
                                                            <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700">
                                                                {locale === "ar" ? "إلغاء بانتظار الموافقة" : "Cancellation Pending"}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:bg-primary/5 hover:text-primary"
                                                        onClick={() => handleOpenOrder(order)}
                                                        disabled={loadingOrderId === order.id}
                                                    >
                                                        <Eye className={`w-4 h-4 ${loadingOrderId === order.id ? "animate-pulse" : ""}`} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <PaginationControls
                                pageNumber={pageNumber}
                                pageSize={pageSize}
                                totalCount={totalCount}
                                onPageChange={setPageNumber}
                                onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }}
                                isLoading={isLoading}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={!!selectedOrder}
                onOpenChange={() => {
                    setSelectedOrder(null)
                    setSelectedPaymentAdjustmentId(null)
                    setPartnerDiscountAudits([])
                    setPartnerDiscountAuditsLoading(false)
                    closePartnerDiscountEditor()
                    closeOrderTotalEditor()
                }}
            >
                <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {locale === "ar" ? "طلب" : "Order"} {formatOrderSequence(selectedOrder) ?? `#${selectedOrder?.orderNumber?.slice(-6) ?? selectedOrder?.id?.slice(-6)}`}
                            {" - "}{selectedOrder?.tableName}
                        </DialogTitle>
                        {selectedOrder?.orderNumber && (
                            <p className="font-mono text-xs text-muted-foreground">
                                {locale === "ar" ? "رقم النظام" : "System ID"}: {selectedOrder.orderNumber}
                            </p>
                        )}
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                {getStatusBadge(selectedOrder.status)}
                                {getTypeBadge(selectedOrder.orderType)}
                                {getSourceBadge(selectedOrder)}
                                {getPaymentBadge(getOrderPaymentLabel(selectedOrder))}
                                {selectedOrder.isVoucherApplied && (
                                    <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700">
                                        <TicketPercent className="h-3 w-3" />
                                        {locale === "ar" ? "تم تطبيق القسيمة" : "Voucher Applied"}
                                    </Badge>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground">{formatDate(selectedOrder.createdAt)}</div>
                            {selectedOrder.orderSource === "Online" && selectedOrder.scheduledFor && (
                                <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                                    <span className="font-semibold">{locale === "ar" ? "الوقت المجدول" : "Scheduled for"}:</span>{" "}
                                    {formatDate(selectedOrder.scheduledFor)}
                                </div>
                            )}
                            {(() => {
                                const refs = (selectedOrder.payments ?? [])
                                    .map((p) => p.referenceNumber)
                                    .filter((ref): ref is string => !!ref && ref.trim().length > 0)
                                if (refs.length === 0) return null
                                return (
                                    <div className="text-xs text-muted-foreground">
                                        <span className="font-semibold">{locale === "ar" ? "رقم المرجع" : "Reference"}:</span>{" "}
                                        <span className="font-mono">{refs.join(", ")}</span>
                                    </div>
                                )
                            })()}
                            {selectedOrder.orderSource === "Talabat" && (
                                <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
                                    <div className="font-semibold">{locale === "ar" ? "تفاصيل طلبات" : "Talabat Details"}</div>
                                    <div>{locale === "ar" ? "رقم الطلب" : "Order No"}: {selectedOrder.talabatOrderNumber ?? "-"}</div>
                                    {selectedOrder.talabatPickupTime && (
                                        <div>{locale === "ar" ? "وقت الاستلام" : "Pickup"}: {formatDate(selectedOrder.talabatPickupTime)}</div>
                                    )}
                                    {(selectedOrder.talabatCustomerName || selectedOrder.talabatCustomerPhone) && (
                                        <div>
                                            {locale === "ar" ? "العميل" : "Customer"}: {selectedOrder.talabatCustomerName || selectedOrder.talabatCustomerPhone}
                                            {selectedOrder.talabatCustomerName && selectedOrder.talabatCustomerPhone ? ` - ${selectedOrder.talabatCustomerPhone}` : ""}
                                        </div>
                                    )}
                                </div>
                            )}
                            {selectedOrder.orderSource === "DeliveryPartner" && (
                                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                                    <div className="font-semibold">{locale === "ar" ? "تفاصيل شريك التوصيل" : "Delivery Partner Details"}</div>
                                    <div>{locale === "ar" ? "الشريك" : "Partner"}: {getPartnerDisplayName(selectedOrder)}</div>
                                    <div>{locale === "ar" ? "رقم الطلب" : "Order No"}: {selectedOrder.partnerOrderNumber ?? "-"}</div>
                                    {selectedOrder.partnerPickupTime && (
                                        <div>{locale === "ar" ? "وقت الاستلام" : "Pickup"}: {formatDate(selectedOrder.partnerPickupTime)}</div>
                                    )}
                                    {(selectedOrder.partnerCustomerName || selectedOrder.partnerCustomerPhone) && (
                                        <div>
                                            {locale === "ar" ? "العميل" : "Customer"}: {selectedOrder.partnerCustomerName || selectedOrder.partnerCustomerPhone}
                                            {selectedOrder.partnerCustomerName && selectedOrder.partnerCustomerPhone ? ` - ${selectedOrder.partnerCustomerPhone}` : ""}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(selectedOrder.items ?? []).some((item) => item.id && !item.isOfferBundle) && (
                                <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="font-semibold">
                                            {isPartnerOrder(selectedOrder)
                                                ? (locale === "ar" ? "معلومات سعر الشريك" : "Partner Price Information")
                                                : (locale === "ar" ? "تصحيح السعر الخاطئ" : "Wrong Price Correction")}
                                        </div>
                                        {(selectedOrder.hasPartnerDiscountOverride || partnerDiscountAudits.length > 0) && (
                                            <Badge variant="outline" className="border-sky-300 bg-white text-sky-700">
                                                {isPartnerOrder(selectedOrder)
                                                    ? (locale === "ar" ? "طلب عليه خصم شريك" : "Partner Discount Flag")
                                                    : (locale === "ar" ? "تم تصحيح السعر" : "Wrong Price Flag")}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {(() => {
                                            const readOnlyMessage = getPartnerDiscountReadOnlyMessage()
                                            return readOnlyMessage ? (
                                                <div className="rounded-md border border-sky-100 bg-white/80 p-2 text-xs text-sky-700">
                                                    {readOnlyMessage}
                                                </div>
                                            ) : null
                                        })()}
                                        <div className="rounded-md border border-sky-100 bg-white/80 p-2">
                                            <div className="mb-2 flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="font-medium">
                                                        {isPartnerOrder(selectedOrder)
                                                            ? (locale === "ar" ? "إجمالي سعر الشريك" : "Partner Order Total")
                                                            : (locale === "ar" ? "إجمالي الطلب" : "Order Total")}
                                                    </div>
                                                </div>
                                                {canManagePartnerDiscounts && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 border-sky-300 bg-white text-sky-700 hover:bg-sky-50"
                                                        disabled={!canEditPartnerDiscount(selectedOrder)}
                                                        onClick={openOrderTotalEditor}
                                                    >
                                                        {isPartnerOrder(selectedOrder)
                                                            ? (locale === "ar" ? "تعديل إجمالي الشريك" : "Edit Partner Total")
                                                            : (locale === "ar" ? "تصحيح إجمالي الطلب" : "Correct Order Total")}
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <Detail label={locale === "ar" ? "الإجمالي الحالي" : "Current Total"} value={formatCurrency(selectedOrder.totalAmount ?? 0)} />
                                                <Detail
                                                    label={locale === "ar" ? "آخر تصحيح للإجمالي" : "Last Total Correction"}
                                                    value={(() => {
                                                        const audit = partnerDiscountAudits.find((entry) => entry.orderItemId === EMPTY_GUID)
                                                        return audit?.newPrice != null ? formatCurrency(audit.newPrice) : "-"
                                                    })()}
                                                />
                                            </div>
                                        </div>
                                        {(selectedOrder.items ?? []).filter((item) => item.id && !item.isOfferBundle).map((item) => {
                                            const originalPrice = isPartnerOrder(selectedOrder)
                                                ? item.partnerOriginalUnitPrice ?? item.partnerPriceSnapshot ?? item.unitPrice ?? 0
                                                : item.partnerOriginalUnitPrice ?? item.unitPrice ?? 0
                                            const updatedBy = item.partnerDiscountUpdatedByName ?? item.partnerDiscountUpdatedBy ?? "-"
                                            const editDisabled = !canEditPartnerDiscount(selectedOrder)

                                            return (
                                                <div key={item.id} className="rounded-md border border-sky-100 bg-white/80 p-2">
                                                    <div className="mb-2 flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="font-medium">{item.quantity}× {item.productName}</div>
                                                            <div className="text-xs text-sky-700">
                                                                {isPartnerOrder(selectedOrder)
                                                                    ? (locale === "ar" ? "تم إنشاء الطلب تحت خصم شريك" : "Created Under Partner Discount")
                                                                    : (locale === "ar" ? "تم تصحيح السعر الخاطئ" : "Wrong Price Corrected")}: {item.hasPartnerDiscountOverride ? (locale === "ar" ? "نعم" : "Yes") : (locale === "ar" ? "لا" : "No")}
                                                            </div>
                                                        </div>
                                                        {canManagePartnerDiscounts && item.id && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 border-sky-300 bg-white text-sky-700 hover:bg-sky-50"
                                                                disabled={editDisabled}
                                                                onClick={() => openPartnerDiscountEditor(item)}
                                                            >
                                                                {isPartnerOrder(selectedOrder)
                                                                    ? (locale === "ar" ? "تعديل سعر الشريك" : "Edit Partner Price")
                                                                    : (locale === "ar" ? "تصحيح السعر" : "Correct Price")}
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <Detail label={isPartnerOrder(selectedOrder) ? (locale === "ar" ? "سعر POS قبل التعديل" : "Previous POS Price") : (locale === "ar" ? "السعر قبل التصحيح" : "Price Before Correction")} value={originalPrice > 0 ? formatCurrency(originalPrice) : "-"} />
                                                        <Detail label={isPartnerOrder(selectedOrder) ? (locale === "ar" ? "سعر الشريك" : "Partner Price") : (locale === "ar" ? "السعر الصحيح" : "Corrected Price")} value={item.partnerDiscountedUnitPrice ? formatCurrency(item.partnerDiscountedUnitPrice) : "-"} />
                                                        <Detail label={locale === "ar" ? "السبب" : "Reason"} value={item.partnerDiscountReason ?? "-"} />
                                                        <Detail label={locale === "ar" ? "بواسطة" : "Updated By"} value={updatedBy} />
                                                        <Detail label={locale === "ar" ? "تاريخ التحديث" : "Updated Date"} value={item.partnerDiscountUpdatedAt ? formatDate(item.partnerDiscountUpdatedAt) : "-"} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div className="rounded-md border border-sky-100 bg-white/80 p-2">
                                            <div className="mb-2 flex items-center gap-2 font-semibold">
                                                <History className="h-4 w-4" />
                                                {locale === "ar" ? "سجل التعديلات" : "Audit Trail"}
                                            </div>
                                            {partnerDiscountAuditsLoading ? (
                                                <div className="text-xs text-sky-700">{locale === "ar" ? "جار تحميل السجل..." : "Loading audit history..."}</div>
                                            ) : partnerDiscountAudits.length === 0 ? (
                                                <div className="text-xs text-sky-700">{locale === "ar" ? "لا توجد تعديلات محفوظة." : "No saved adjustments yet."}</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {partnerDiscountAudits.map((audit) => {
                                                        const isOrderTotalAudit = audit.orderItemId === EMPTY_GUID
                                                        const item = (selectedOrder.items ?? []).find((candidate) => candidate.id === audit.orderItemId)
                                                        const updatedBy = audit.updatedByName ?? audit.updatedBy ?? "-"

                                                        return (
                                                            <div key={audit.id} className="rounded border border-sky-100 bg-sky-50/70 p-2 text-xs">
                                                                <div className="font-medium">
                                                                    {isOrderTotalAudit
                                                                        ? (locale === "ar" ? "إجمالي الطلب" : "Order Total")
                                                                        : item?.productName ?? audit.orderItemId}
                                                                </div>
                                                                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                                                                    <span>{locale === "ar" ? "وضع التصحيح" : "Correction Mode"}: {
                                                                        audit.correctionMode === "OrderTotal"
                                                                            ? (locale === "ar" ? "إجمالي الطلب" : "Order Total")
                                                                            : (locale === "ar" ? "لكل صنف" : "Per Item")
                                                                    }</span>
                                                                    <span>{isOrderTotalAudit ? (locale === "ar" ? "الإجمالي السابق" : "Old Total") : (locale === "ar" ? "السعر السابق" : "Old Price")}: {audit.oldPrice != null ? formatCurrency(audit.oldPrice) : "-"}</span>
                                                                    <span>{isOrderTotalAudit ? (locale === "ar" ? "الإجمالي الجديد" : "New Total") : (locale === "ar" ? "السعر الجديد" : "New Price")}: {audit.newPrice != null ? formatCurrency(audit.newPrice) : "-"}</span>
                                                                    {audit.differenceAmount != null && <span>{locale === "ar" ? "الفرق" : "Difference"}: {formatCurrency(audit.differenceAmount)}</span>}
                                                                    <span>{locale === "ar" ? "بواسطة" : "Updated By"}: {updatedBy}</span>
                                                                    <span>{locale === "ar" ? "التاريخ" : "Date"}: {formatDate(audit.updatedAt)}</span>
                                                                </div>
                                                                {audit.reason && <div className="mt-1">{locale === "ar" ? "السبب" : "Reason"}: {audit.reason}</div>}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(selectedOrder.status === "PendingCancellationApproval" || selectedOrder.hasPendingCancellation === true) && selectedOrder.cancellationInfo ? (
                                <OrderCancellationApproval
                                    order={selectedOrder}
                                    currency={usePosStore.getState().currency}
                                    reasons={cancelReasons}
                                    onResolved={() => { setSelectedOrder(null); fetchOrders(); }}
                                />
                            ) : selectedOrder.cancellationInfo ? (
                                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                                    <div className="mb-2 font-semibold">{locale === "ar" ? "معلومات الإلغاء" : "Cancellation Information"}</div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <Detail label={locale === "ar" ? "طلب بواسطة" : "Requested By"} value={selectedOrder.cancellationInfo.requestedBy} />
                                        <Detail label={locale === "ar" ? "تاريخ الطلب" : "Request Date"} value={formatDate(selectedOrder.cancellationInfo.requestDate)} />
                                        <Detail label={locale === "ar" ? "سبب الإلغاء" : "Cancellation Reason"} value={getCancellationReasonLabel(selectedOrder.cancellationInfo.cancellationReason, locale, cancelReasons)} />
                                        <Detail label={locale === "ar" ? "حالة الموافقة" : "Approval Status"} value={getCancellationStatusLabel(selectedOrder.cancellationInfo.approvalStatus, locale)} />
                                        <Detail label={locale === "ar" ? "قرار المدير" : "Manager Decision"} value={getManagerDecisionLabel(selectedOrder.cancellationInfo.managerDecision, locale)} />
                                        <Detail label={locale === "ar" ? "بواسطة" : "Approved/Rejected By"} value={selectedOrder.cancellationInfo.approvedOrRejectedBy ?? "-"} />
                                        <Detail label={locale === "ar" ? "تاريخ القرار" : "Decision Date"} value={selectedOrder.cancellationInfo.decisionDate ? formatDate(selectedOrder.cancellationInfo.decisionDate) : "-"} />
                                        <Detail label={locale === "ar" ? "الحالة السابقة" : "Previous Status"} value={getCancellationStatusLabel(selectedOrder.cancellationInfo.previousStatus, locale)} />
                                    </div>
                                    {(selectedOrder.cancellationInfo.notes || selectedOrder.cancellationInfo.managerNotes) && (
                                        <div className="mt-2 space-y-1">
                                            {selectedOrder.cancellationInfo.notes && (
                                                <Detail label={locale === "ar" ? "ملاحظات الطلب" : "Request Notes"} value={selectedOrder.cancellationInfo.notes} />
                                            )}
                                            {selectedOrder.cancellationInfo.managerNotes && (
                                                <Detail label={locale === "ar" ? "ملاحظات المدير" : "Manager Notes"} value={selectedOrder.cancellationInfo.managerNotes} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            {selectedPaymentAdjustmentId && (
                                <PaymentAdjustmentApproval
                                    orderId={selectedOrder.id}
                                    adjustmentId={selectedPaymentAdjustmentId}
                                    currency={usePosStore.getState().currency}
                                    onResolved={() => {
                                        setSelectedOrder(null)
                                        setSelectedPaymentAdjustmentId(null)
                                        fetchOrders()
                                    }}
                                />
                            )}

                            <div className="divide-y rounded-md border">
                                {(selectedOrder.items ?? []).map((item: OrderItemDto, i: number) => {
                                    const itemCancelPending = hasPendingItemCancellation(selectedOrder, item.id)

                                    return (
                                        <div key={`${item.id ?? "item"}-${i}`} className="p-3">
                                            <div className="flex items-start justify-between gap-2 font-medium">
                                                <span>{item.quantity}× {item.productName}</span>
                                                {REFUND_AND_CANCEL_UI_ENABLED && selectedOrder.orderType !== "Takeaway" && ["New", "Pending", "Preparing", "Ready"].includes(selectedOrder.status) && item.id && (
                                                    <button
                                                        type="button"
                                                        title={itemCancelPending ? t("cancelPendingButton") : t("cancelOrderButtonItem")}
                                                        disabled={itemCancelPending}
                                                        onClick={() => {
                                                            if (itemCancelPending) return
                                                            setCancelOrderData(selectedOrder)
                                                            setCancelTarget({ itemId: item.id, itemName: item.productName })
                                                            setSelectedOrder(null)
                                                        }}
                                                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Ban className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            {item.modifiers && item.modifiers.length > 0 && (
                                                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                                    {item.modifiers.map((modifier, j) => (
                                                        <div key={`${modifier.modifierId ?? modifier.modifierName}-${j}`}>• {modifier.modifierName}</div>
                                                    ))}
                                                </div>
                                            )}
                                            {item.notes && (
                                                <div className="mt-1 text-xs italic text-muted-foreground">{t("noteLabel")} {item.notes}</div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Merchandise facts for retail lines. Renders nothing for a restaurant order. */}
                            <RetailOrderLines orderId={selectedOrder.id} currency={usePosStore.getState().currency} />

                            <div className="flex justify-between border-t pt-2 text-lg font-bold">
                                <span>{t("totalCol")}</span>
                                <span>{formatCurrency(selectedOrder.totalAmount ?? 0)}</span>
                            </div>
                            {selectedOrder.isVoucherApplied && (
                                <div className="flex justify-between text-sm font-semibold text-amber-700">
                                    <span>{locale === "ar" ? "خصم القسيمة" : "Voucher Discount"}</span>
                                    <span>-{formatCurrency(selectedOrder.voucherDiscountAmount ?? 0)}</span>
                                </div>
                            )}

                            {["Paid", "Completed"].includes(selectedOrder.status) &&
                                (selectedOrder.payments?.length ?? 0) > 0 &&
                                !selectedPaymentAdjustmentId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPaymentAdjustmentOrder(selectedOrder)
                                        setSelectedOrder(null)
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                    <ArrowRightLeft className="h-4 w-4" />
                                    {locale === "ar" ? "تغيير طريقة الدفع" : "Change Payment Method"}
                                </button>
                            )}

                            {REFUND_AND_CANCEL_UI_ENABLED && selectedOrder.orderType !== "Takeaway" && ["New", "Pending", "Preparing", "Ready"].includes(selectedOrder.status) && (
                                <button
                                    type="button"
                                    disabled={selectedOrder.hasPendingCancellation === true}
                                    onClick={() => {
                                        if (selectedOrder.hasPendingCancellation === true) return
                                        setCancelOrderData(selectedOrder)
                                        setCancelTarget({})
                                        setSelectedOrder(null)
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Ban className="h-4 w-4" />
                                    {selectedOrder.hasPendingCancellation === true ? t("cancelPendingButton") : t("cancelOrderButton")}
                                </button>
                            )}

                            {REFUND_AND_CANCEL_UI_ENABLED && selectedOrder.status === "Paid" && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRefundOrderData(selectedOrder)
                                        setSelectedOrder(null)
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                                >
                                    {t("refundOrderButton")}
                                </button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={orderTotalEditorOpen} onOpenChange={(open) => { if (!open) closeOrderTotalEditor() }}>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {isPartnerOrder(selectedOrder)
                                ? (locale === "ar" ? "تعديل إجمالي سعر الشريك" : "Edit Partner Order Total")
                                : (locale === "ar" ? "تصحيح إجمالي الطلب" : "Correct Order Total")}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="rounded-md border bg-muted/30 p-3 text-sm">
                                <div className="font-medium">{formatOrderSequence(selectedOrder) ?? selectedOrder.orderNumber}</div>
                                <div className="text-xs text-muted-foreground">
                                    {locale === "ar" ? "الإجمالي الحالي" : "Current total"}: {formatCurrency(selectedOrder.totalAmount ?? 0)}
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="order-current-total">{locale === "ar" ? "الإجمالي قبل التصحيح" : "Total Before Correction"}</Label>
                                    <Input
                                        id="order-current-total"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={selectedOrder.totalAmount ?? 0}
                                        disabled
                                        readOnly
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="order-corrected-total">{locale === "ar" ? "الإجمالي الصحيح" : "Corrected Total"}</Label>
                                    <Input
                                        id="order-corrected-total"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={orderTotalCorrected}
                                        onChange={(event) => setOrderTotalCorrected(event.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="order-total-reason">{locale === "ar" ? "السبب" : "Reason"}</Label>
                                <Textarea
                                    id="order-total-reason"
                                    value={orderTotalReason}
                                    maxLength={500}
                                    rows={3}
                                    onChange={(event) => setOrderTotalReason(event.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={closeOrderTotalEditor} disabled={orderTotalSaving}>
                                    {locale === "ar" ? "إلغاء" : "Cancel"}
                                </Button>
                                <Button type="button" onClick={saveOrderTotalOverride} disabled={orderTotalSaving}>
                                    {orderTotalSaving ? (locale === "ar" ? "جار الحفظ..." : "Saving...") : (locale === "ar" ? "حفظ" : "Save")}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!partnerDiscountItem} onOpenChange={(open) => { if (!open) closePartnerDiscountEditor() }}>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {isPartnerOrder(selectedOrder)
                                ? (locale === "ar" ? "تعديل سعر الشريك" : "Edit Partner Price")
                                : (locale === "ar" ? "تصحيح السعر الخاطئ" : "Correct Wrong Price")}
                        </DialogTitle>
                    </DialogHeader>
                    {partnerDiscountItem && (
                        <div className="space-y-4">
                            <div className="rounded-md border bg-muted/30 p-3 text-sm">
                                <div className="font-medium">{partnerDiscountItem.productName}</div>
                                <div className="text-xs text-muted-foreground">
                                    {locale === "ar" ? "السعر الحالي" : "Current price"}: {formatCurrency(partnerDiscountItem.unitPrice ?? 0)}
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-md border p-3">
                                <Label htmlFor="partner-discount-applied">
                                    {isPartnerOrder(selectedOrder)
                                        ? (locale === "ar" ? "تم إنشاء الطلب تحت خصم شريك" : "Created Under Partner Discount")
                                        : (locale === "ar" ? "تم تصحيح السعر الخاطئ" : "Wrong Price Corrected")}
                                </Label>
                                <Switch
                                    id="partner-discount-applied"
                                    checked={partnerDiscountApplied}
                                    onCheckedChange={setPartnerDiscountApplied}
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="partner-original-price">
                                        {isPartnerOrder(selectedOrder)
                                            ? (locale === "ar" ? "سعر POS قبل التعديل" : "Previous POS Price")
                                            : (locale === "ar" ? "السعر قبل التصحيح" : "Price Before Correction")}
                                    </Label>
                                    <Input
                                        id="partner-original-price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={partnerDiscountOriginal}
                                        disabled
                                        onChange={(event) => setPartnerDiscountOriginal(event.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="partner-discounted-price">
                                        {isPartnerOrder(selectedOrder)
                                            ? (locale === "ar" ? "سعر الشريك" : "Partner Price")
                                            : (locale === "ar" ? "السعر الصحيح" : "Corrected Price")}
                                    </Label>
                                    <Input
                                        id="partner-discounted-price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={partnerDiscountDiscounted}
                                        onChange={(event) => setPartnerDiscountDiscounted(event.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="partner-discount-reason">{locale === "ar" ? "السبب" : "Reason"}</Label>
                                <Textarea
                                    id="partner-discount-reason"
                                    value={partnerDiscountReason}
                                    maxLength={500}
                                    rows={3}
                                    onChange={(event) => setPartnerDiscountReason(event.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={closePartnerDiscountEditor} disabled={partnerDiscountSaving}>
                                    {locale === "ar" ? "إلغاء" : "Cancel"}
                                </Button>
                                <Button type="button" onClick={savePartnerDiscountOverride} disabled={partnerDiscountSaving}>
                                    {partnerDiscountSaving ? (locale === "ar" ? "جار الحفظ..." : "Saving...") : (locale === "ar" ? "حفظ" : "Save")}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {paymentAdjustmentOrder !== null && (
                <PaymentAdjustmentDialog
                    order={paymentAdjustmentOrder}
                    currency={usePosStore.getState().currency}
                    onClose={() => setPaymentAdjustmentOrder(null)}
                    onSuccess={() => {
                        setPaymentAdjustmentOrder(null)
                        fetchOrders()
                    }}
                />
            )}

            {paymentAdjustmentHistoryOpen && (
                <PaymentAdjustmentHistoryDialog
                    paymentMethods={paymentMethods}
                    currency={usePosStore.getState().currency}
                    timeZone={timeZone}
                    onClose={() => setPaymentAdjustmentHistoryOpen(false)}
                />
            )}

            {cancelTarget !== null && cancelOrderData !== null && (
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
                    cancelItemId={cancelTarget.itemId}
                    cancelItemName={cancelTarget.itemName}
                    onClose={() => { setCancelTarget(null); setCancelOrderData(null); }}
                    onSuccess={() => {
                        setCancelTarget(null)
                        setCancelOrderData(null)
                        fetchOrders()
                    }}
                    currency={usePosStore.getState().currency}
                />
            )}

            {refundOrderData !== null && (
                <RefundOrderModal
                    order={{
                        id: refundOrderData.id,
                        orderNumber: refundOrderData.orderNumber,
                        orderSequenceNumber: refundOrderData.orderSequenceNumber,
                        tableName: refundOrderData.tableName,
                        totalAmount: refundOrderData.totalAmount ?? 0,
                        paymentMethod: refundOrderData.paymentMethod ?? undefined,
                        isPaid: refundOrderData.isPaid === true ||
                            refundOrderData.paymentStatus === "Paid" ||
                            refundOrderData.status === "Paid",
                    }}
                    onClose={() => setRefundOrderData(null)}
                    onSuccess={() => {
                        setRefundOrderData(null)
                        fetchOrders()
                    }}
                    currency={usePosStore.getState().currency}
                    intent="cancel"
                />
            )}
        </div>
    )
}
