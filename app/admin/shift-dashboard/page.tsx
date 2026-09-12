"use client";

import React, { useEffect } from "react";
import {
    Activity,
    AlertCircle,
    BadgeCheck,
    Loader,
    CheckCircle2,
    Clock,
    DollarSign,
    Loader2,
    PackageCheck,
    ReceiptText,
    RefreshCw,
    Truck,
    Store,
    Smartphone,
    ShoppingBag,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-provider";
import { useShiftSummaryStore } from "@/store/shiftSummaryStore";
import { labelForBlocker } from "@/lib/shift-close-blockers";
import { shiftExpenseSummaryOf } from "@/lib/api-shift-summary";

const POLL_INTERVAL_MS = 10_000;

export default function ShiftDashboardPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const { summary, isLoading, error, lastFetchedAt, fetch } = useShiftSummaryStore();

    useEffect(() => {
        void fetch();
        const id = window.setInterval(() => void fetch(), POLL_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [fetch]);

    if (!summary && isLoading) {
        return (
            <div className="p-6 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isAr ? "جاري تحميل ملخص الوردية..." : "Loading shift summary..."}
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <Card>
                    <CardContent className="p-8 text-center space-y-3">
                        <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
                        <h2 className="font-semibold">
                            {isAr ? "لا توجد وردية مفتوحة" : "No active shift"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {error
                                ? error
                                : (isAr
                                    ? "افتح وردية لرؤية الإحصائيات الحية."
                                    : "Open a shift to see live KPIs.")}
                        </p>
                        <Button variant="outline" onClick={() => void fetch()} className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                            {isAr ? "تحديث" : "Refresh"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const allowed = summary.closeStatus.isAllowed;
    const blockers = summary.closeStatus.blockers;
    const expenses = shiftExpenseSummaryOf(summary);

    return (
        <div className="p-6 space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">
                        {isAr ? "ملخص الوردية المباشر" : "Live Shift Summary"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {summary.cashierName}
                        {summary.shiftNumber != null && ` • S${String(summary.shiftNumber).padStart(3, "0")}`}
                        {` • ${isAr ? "افتُحت" : "Opened"} ${new Date(summary.openedAtUtc).toLocaleString(isAr ? "ar" : "en")}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant={allowed ? "default" : "destructive"}
                        className="gap-1"
                    >
                        {allowed
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />}
                        {allowed
                            ? (isAr ? "يمكن إغلاق الوردية" : "Close Allowed")
                            : (isAr ? "إغلاق الوردية محظور" : "Close Blocked")}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => void fetch()} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        {isAr ? "تحديث" : "Refresh"}
                    </Button>
                </div>
            </header>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi icon={<Activity className="w-4 h-4" />} label={isAr ? "إجمالي الطلبات" : "Total Orders"} value={summary.totalOrders} />
                <Kpi icon={<DollarSign className="w-4 h-4" />} label={isAr ? "إجمالي الإيراد" : "Total Revenue"} value={summary.totalRevenue.toFixed(2)} />
                <Kpi icon={<BadgeCheck className="w-4 h-4" />} label={isAr ? "مدفوعة" : "Paid"} value={summary.paidOrders} />
                <Kpi icon={<CheckCircle2 className="w-4 h-4" />} label={isAr ? "منتهية" : "Completed"} value={summary.completedOrders} />
            </section>

            <section>
                <h2 className="text-sm font-semibold mb-2 text-muted-foreground">
                    {isAr ? "حسب الحالة" : "By Status"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <Kpi icon={<Clock className="w-4 h-4" />} label={isAr ? "قيد الانتظار" : "Pending"} value={summary.pendingOrders} />
                    <Kpi icon={<Loader className="w-4 h-4" />} label={isAr ? "قيد التجهيز" : "Processing"} value={summary.preparingOrders} />
                    <Kpi icon={<PackageCheck className="w-4 h-4" />} label={isAr ? "جاهزة" : "Ready"} value={summary.readyOrders} />
                    <Kpi icon={<PackageCheck className="w-4 h-4" />} label={isAr ? "مُسلَّمة" : "Fulfilled"} value={summary.servedOrders} />
                    <Kpi icon={<XCircle className="w-4 h-4" />} label={isAr ? "ملغية" : "Cancelled"} value={summary.cancelledOrders} />
                    <Kpi icon={<RefreshCw className="w-4 h-4" />} label={isAr ? "مستردة" : "Refunded"} value={summary.refundedOrders} />
                </div>
            </section>

            <section>
                <h2 className="text-sm font-semibold mb-2 text-muted-foreground">
                    {isAr ? "حسب نوع الطلب" : "By Channel"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Kpi icon={<Store className="w-4 h-4" />} label={isAr ? "داخل المتجر" : "In-Store"} value={summary.dineInOrders} />
                    <Kpi icon={<ShoppingBag className="w-4 h-4" />} label={isAr ? "استلام" : "Pickup"} value={summary.takeawayOrders} />
                    <Kpi icon={<Truck className="w-4 h-4" />} label={isAr ? "توصيل" : "Delivery"} value={summary.deliveryOrders} />
                    <Kpi icon={<Truck className="w-4 h-4" />} label={isAr ? "شريك توصيل" : "Partner"} value={summary.partnerOrders} />
                    <Kpi icon={<Smartphone className="w-4 h-4" />} label={isAr ? "QR" : "QR"} value={summary.qrOrders} />
                </div>
            </section>

            <section>
                <h2 className="text-sm font-semibold mb-2 text-muted-foreground">
                    {isAr ? "المصاريف الموثقة" : "Documented Expenses"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Kpi icon={<ReceiptText className="w-4 h-4" />} label={isAr ? "عدد المصاريف" : "Expense Count"} value={expenses.expenseCount} />
                    <Kpi icon={<ReceiptText className="w-4 h-4" />} label={isAr ? "إجمالي المصاريف" : "Total Expenses"} value={expenses.expensesTotal.toFixed(2)} />
                    <Kpi icon={<DollarSign className="w-4 h-4" />} label={isAr ? "مصاريف نقدية" : "Cash Expenses"} value={expenses.cashExpensesTotal.toFixed(2)} />
                    <Kpi icon={<DollarSign className="w-4 h-4" />} label={isAr ? "مصاريف غير نقدية" : "Non-cash Expenses"} value={expenses.nonCashExpensesTotal.toFixed(2)} />
                </div>
                {expenses.byCategory.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm">
                        {expenses.byCategory.map((row) => (
                            <li key={row.expenseCategoryId ?? row.categoryLabel} className="flex justify-between">
                                <span>{row.categoryLabel} ({row.count})</span>
                                <span className="font-mono">{row.total.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {!allowed && (
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <XCircle className="w-5 h-5" />
                            {isAr ? "لا يمكن إغلاق الوردية" : "Cannot close shift"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1 text-sm">
                            {blockers.map((b) => (
                                <li key={b.code} className="flex justify-between">
                                    <span>{labelForBlocker(b.code, locale)}</span>
                                    <span className="font-mono">{b.count}</span>
                                </li>
                            ))}
                        </ul>
                        {summary.closeStatus.forceCloseAllowed && (
                            <p className="text-xs text-muted-foreground mt-3">
                                {isAr
                                    ? "الإغلاق القسري متاح من شاشة إغلاق الوردية."
                                    : "Force close is enabled — available from the close-shift screen."}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {lastFetchedAt && (
                <p className="text-xs text-muted-foreground">
                    {isAr ? "آخر تحديث" : "Updated"}{" "}
                    {new Date(lastFetchedAt).toLocaleTimeString(isAr ? "ar" : "en")}
                </p>
            )}
        </div>
    );
}

function Kpi({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
}) {
    return (
        <Card>
            <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    {icon}
                    <span>{label}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums">{value}</div>
            </CardContent>
        </Card>
    );
}
