"use client";

import * as React from "react";
import { toast } from "sonner";
import {
    Ban, DollarSign, TrendingUp, Zap, RotateCcw, Package, Truck, Users, AlertTriangle,
} from "lucide-react";
import { DashboardTopbar } from "@/components/dashboard/chrome/DashboardTopbar";
import { DashboardFilterBar } from "@/components/dashboard/chrome/DashboardFilterBar";
import { CommissionCostSharingAnalysis } from "@/components/dashboard/financial/CommissionCostSharingAnalysis";
import {
    KPI, Card, Pill, AreaChart, Donut, BarChart, BarList, AlertRow,
} from "@/components/dashboard/primitives";
import { getDashboardFilterLabel } from "@/lib/dashboard/filter-label";
import { useDashboardFilterStore } from "@/store/dashboardFilterStore";
import { useDashboardData } from "@/lib/dashboard/use-dashboard-data";
import { useDashboardRealtime } from "@/lib/dashboard/use-dashboard-realtime";
import { dashboardApi } from "@/lib/dashboard/dashboard-api";
import { useLocale } from "@/components/locale-provider";
import { usePosStore } from "@/store/posStore";
import { formatRestaurantDate } from "@/lib/date-time";
import type {
    CategorySlice,
    OrderSourceAnalytics,
    PartnerAnalytics,
    PaymentMethodAnalytics,
} from "@/lib/dashboard/snapshot-types";

const SCOPE = "Financial" as const;

// Palette cycled across configurable payment methods (Cash, Visa, InstaPay, Vodafone Cash, CliQ, ...).
const PAYMENT_PALETTE = [
    "var(--ds-primary)",
    "var(--ds-blue)",
    "var(--ds-green)",
    "var(--ds-purple)",
    "var(--ds-amber)",
    "var(--ds-red)",
];

export default function FinancialDashboardPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const { currency } = usePosStore();
    const filter = useDashboardFilterStore((s) => s.filters[SCOPE]);
    const { data, loading, error, refresh } = useDashboardData(dashboardApi.getFinancial, filter);
    const {
        data: commissionAnalysis,
        loading: commissionLoading,
        error: commissionError,
        refresh: refreshCommissionAnalysis,
    } = useDashboardData(dashboardApi.getFinancialCommissionAnalysis, filter);
    const [exporting, setExporting] = React.useState(false);
    useDashboardRealtime(SCOPE, () => {
        void refresh();
        void refreshCommissionAnalysis();
    });

    const fmtCur = (v: number) => new Intl.NumberFormat(undefined, {
        style: "currency", currency, maximumFractionDigits: v >= 1000 ? 0 : 2,
    }).format(v);

    const rev = data?.revenue;
    const profit = data?.profitability;
    const delivery = data?.delivery;
    const costSharing = data?.costSharing;
    const cmp = data?.comparison;
    const periodLabel = getDashboardFilterLabel(filter, ar);
    const revenueByCashier = data?.revenueByCashier ?? [];
    const discountsByUser = data?.discountsByUser ?? [];
    const bestSellers = data?.bestSellers ?? [];
    const worstSellers = data?.worstSellers ?? [];
    const paymentAnalytics = data?.paymentMethodAnalytics ?? [];
    const orderSourceAnalytics = data?.orderSourceAnalytics ?? [];
    const partnerAnalytics = data?.partnerAnalytics ?? [];
    const cardBreakdown = data?.cardBreakdown ?? [];
    const payMobBreakdown = data?.payMobBreakdown ?? [];
    const cancellations = data?.cancellations;
    const exec = data?.executiveSummary;
    const alerts = data?.alerts ?? [];
    const categoryRevenue = data?.categoryRevenue ?? [];
    const customerRevenue = data?.customerRevenue;
    const foodCost = data?.foodCost;
    const purchasing = data?.purchasing;
    const productProfitability = data?.productProfitability ?? [];
    const laborCost = data?.laborCost;
    const discountCost = data?.discountCost;
    const salesMix = data?.salesMix;
    const revenueByWaiter = data?.revenueByWaiter ?? [];
    const revenueByTable = data?.revenueByTable ?? [];
    const revenueByHour = data?.revenueByHour ?? [];
    const productGrowth = data?.productGrowth ?? [];
    const categoryGrowth = data?.categoryGrowth ?? [];
    const purchasePriceVariance = data?.purchasePriceVariance ?? [];
    const revenueByWeekday = data?.revenueByWeekday ?? [];
    const refundReasons = data?.refundReasons ?? [];
    const taxBreakdown = data?.taxBreakdown ?? [];
    const hasAdvancedAnalytics = paymentAnalytics.length > 0
        || orderSourceAnalytics.length > 0
        || partnerAnalytics.length > 0;
    const hasCostSharingMetrics = (costSharing?.totalCommission ?? 0) > 0;
    const hasDetailRows = revenueByCashier.length > 0
        || discountsByUser.length > 0
        || bestSellers.length > 0
        || worstSellers.length > 0
        || hasAdvancedAnalytics
        || categoryRevenue.length > 0
        || (customerRevenue?.uniqueCustomers ?? 0) > 0
        || (foodCost?.actualFoodCost ?? 0) > 0
        || (purchasing?.purchaseOrderCount ?? 0) > 0
        || productProfitability.length > 0
        || revenueByWaiter.length > 0
        || revenueByTable.length > 0
        || revenueByHour.length > 0
        || productGrowth.length > 0
        || purchasePriceVariance.length > 0
        || (laborCost?.hasLaborData ?? false)
        || (discountCost?.totalDiscountCost ?? 0) > 0
        || revenueByWeekday.some(d => d.value > 0)
        || refundReasons.length > 0
        || taxBreakdown.length > 0
        || hasCostSharingMetrics;
    const discountPercentage = rev?.discountPercentage
        ?? (rev && rev.gross > 0 ? (rev.discounts / rev.gross) * 100 : 0);
    const fmtAxis = (value: number) => new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
    const monthlyRevenue = buildMonthlyRevenue(data?.revenueByDay ?? [], filter.timeZone ?? "Asia/Qatar", locale);

    const exportWorkbook = async () => {
        if (!data || exporting) {
            if (!data) toast.error(ar ? "لا توجد بيانات للتصدير" : "No data to export yet");
            return;
        }

        setExporting(true);
        try {
            const workbook = await dashboardApi.exportFinancial(filter, currency);
            downloadWorkbook(workbook);
            toast.success(ar ? "تم تصدير ملف Excel بالعربية والإنجليزية" : "Bilingual Excel workbook exported");
        } catch {
            toast.error(ar ? "تعذر تصدير ملف Excel" : "Excel export failed");
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <DashboardTopbar
                title={ar ? "المالية" : "Financial"}
                updatedAt={data?.generatedAtUtc}
                onRefresh={() => {
                    void refresh();
                    void refreshCommissionAnalysis();
                }}
                live={false}
                notificationCount={alerts.length || null}
                onExport={() => void exportWorkbook()}
            />
            <DashboardFilterBar
                scope={SCOPE}
                showSearch={false}
                showPartner
                showOrderSource
            />

            <div className="content">
                {error && (
                    <div className="dashboard-error-strip">
                        <span>{ar ? "تعذر تحميل بيانات لوحة المالية. تحقق من الاتصال ثم أعد التحديث." : "Financial dashboard data could not load. Check the connection, then refresh."}</span>
                        <button type="button" className="btn btn-ghost" onClick={refresh}>
                            {ar ? "إعادة المحاولة" : "Retry"}
                        </button>
                    </div>
                )}

                <DashboardSection title={ar ? "الملخص التنفيذي" : "Executive summary"} meta={periodLabel}>
                    <div className="dashboard-auto-grid dashboard-kpi-grid dashboard-executive-grid">
                        <KPI label={ar ? "الإيراد الإجمالي" : "Gross revenue"} icon={DollarSign}
                             value={rev ? fmtCur(rev.gross) : "—"} loading={loading && !data}
                             sparkColor="var(--ds-green)"
                             delta={cmp?.revenueChangePercent ?? undefined}
                             foot={<><span>{ar ? "النمو" : "Growth"}</span>
                                     <span className="num">{exec ? `${exec.revenueGrowthPercent >= 0 ? "+" : ""}${exec.revenueGrowthPercent.toFixed(1)}%` : "—"}</span></>} />
                        <KPI label={ar ? "صافي الإيراد" : "Net revenue"} icon={DollarSign}
                             value={rev ? fmtCur(rev.net) : "—"} loading={loading && !data}
                             spark={(data?.revenueByDay ?? []).map(p => p.value)}
                             sparkColor="var(--ds-green)"
                             delta={exec?.revenue.changePercent ?? undefined}
                             foot={<><span>{ar ? "رسوم الخدمة" : "Service charge"}</span>
                                     <span className="num">{rev ? fmtCur(rev.serviceCharge) : "—"}</span></>} />
                        <KPI label={ar ? "الربح الإجمالي" : "Gross profit"} icon={TrendingUp}
                             value={profit ? fmtCur(profit.grossProfit) : "—"} loading={loading && !data}
                             sparkColor="var(--ds-blue)"
                             foot={<><span>{ar ? "الهامش الإجمالي" : "Gross margin"}</span>
                                     <span className="num">{profit ? `${(profit.grossMarginPercent ?? profit.marginPercent).toFixed(1)}%` : "—"}</span></>} />
                        <KPI label={ar ? "الربح الصافي" : "Net profit"} icon={TrendingUp}
                             value={profit ? fmtCur(profit.netProfit) : "—"} loading={loading && !data}
                             sparkColor="var(--ds-green)"
                             delta={cmp?.netProfitChangePercent ?? exec?.netProfit.changePercent ?? undefined}
                             foot={<><span>{ar ? "الهامش الصافي" : "Net margin"}</span>
                                     <span className="num">{profit ? `${profit.marginPercent.toFixed(1)}%` : "—"}</span></>} />
                        <KPI label={ar ? "الطلبات" : "Orders"} icon={Package}
                             value={rev?.orderCount ?? (exec ? Math.round(exec.orders.value) : "—")} loading={loading && !data}
                             sparkColor="var(--ds-purple)"
                             foot={<><span>{ar ? "الفترة" : "Window"}</span><span className="num">{periodLabel}</span></>} />
                        <KPI label={ar ? "متوسط الطلب" : "Average order value"} icon={DollarSign}
                             value={rev ? fmtCur(rev.averageOrderValue) : exec ? fmtCur(exec.averageOrderValue.value) : "—"}
                             loading={loading && !data}
                             sparkColor="var(--ds-purple)"
                             delta={exec?.averageOrderValue.changePercent ?? undefined}
                             foot={<><span>{ar ? "حسب الطلبات المؤكدة" : "Confirmed orders"}</span>
                                     <span className="num">{rev?.orderCount ?? "—"}</span></>} />
                        <KPI label={ar ? "المرتجعات" : "Refunds"} icon={RotateCcw}
                             value={rev ? fmtCur(rev.refunds) : "—"} loading={loading && !data}
                             sparkColor="var(--ds-red)"
                             foot={<><span>{ar ? "من الإيراد" : "of revenue"}</span>
                                     <span className="num">{rev && rev.gross > 0 ? `${((rev.refunds / rev.gross) * 100).toFixed(1)}%` : exec ? `${exec.refundPercent.value.toFixed(1)}%` : "—"}</span></>} />
                        <KPI label={ar ? "الخصومات" : "Discounts"} icon={DollarSign}
                             value={rev ? fmtCur(rev.discounts) : "—"} loading={loading && !data}
                             sparkColor="var(--ds-amber)"
                             foot={<><span>{ar ? "نسبة الخصم" : "Discount %"}</span>
                                     <span className="num">{rev ? `${discountPercentage.toFixed(1)}%` : exec ? `${exec.discountPercent.value.toFixed(1)}%` : "—"}</span></>} />
                        <KPI label={ar ? "تكلفة الطعام" : "Food cost"} icon={Package}
                             value={foodCost ? fmtCur(foodCost.actualFoodCost) : profit ? fmtCur(profit.cogs) : "—"}
                             loading={loading && !data}
                             sparkColor="var(--ds-amber)"
                             foot={<><span>{ar ? "نسبة الإيراد" : "% of revenue"}</span>
                                     <span className="num">{foodCost ? `${foodCost.foodCostPercentage.toFixed(1)}%` : exec ? `${exec.foodCostPercent.value.toFixed(1)}%` : "—"}</span></>} />
                        <KPI label={ar ? "الضريبة" : "Tax"} icon={DollarSign}
                             value={rev ? fmtCur(rev.tax) : "—"} loading={loading && !data}
                             sparkColor="var(--ds-blue)"
                             foot={<><span>{ar ? "شرائح الضريبة" : "Tax rates"}</span>
                                     <span className="num">{taxBreakdown.length || "—"}</span></>} />
                    </div>
                </DashboardSection>

                <DashboardSection title={ar ? "أداء الإيرادات" : "Revenue performance"} meta={periodLabel}>
                    <div className="dashboard-auto-grid dashboard-detail-grid">
                        <Card
                            className="dashboard-card-wide"
                            title={ar ? "اتجاه الإيرادات" : "Revenue trend"}
                            subtitle={periodLabel}
                        >
                            <div style={{ display: "flex", gap: 28, marginBottom: 12, flexWrap: "wrap" }}>
                                <SummaryStat label={ar ? "إيراد إجمالي" : "Gross revenue"} value={rev ? fmtCur(rev.gross) : "—"} />
                                <SummaryStat label={ar ? "صافي الإيراد" : "Net revenue"} value={rev ? fmtCur(rev.net) : "—"} />
                                <SummaryStat label={ar ? "البضاعة" : "COGS"} value={profit ? fmtCur(profit.cogs) : "—"} dim />
                                <SummaryStat label={ar ? "الهامش الإجمالي" : "Gross margin"}
                                             value={profit && rev && rev.net > 0
                                                ? `${((profit.grossProfit / rev.net) * 100).toFixed(1)}%`
                                                : "—"}
                                             accent="var(--ds-green-text)" />
                                {cmp && (
                                    <div style={{ marginInlineStart: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                        <Pill color={cmp.netProfitChangePercent >= 0 ? "green" : "red"}>
                                            {cmp.netProfitChangePercent >= 0 ? "+" : ""}{cmp.netProfitChangePercent.toFixed(1)}% {ar ? "ربح" : "profit"}
                                        </Pill>
                                    </div>
                                )}
                            </div>
                            {(data?.revenueByDay ?? []).length === 0
                                ? <EmptyChart loading={loading} height={260} ar={ar} />
                                : <AreaChart
                                    height={260}
                                    showLegend={false}
                                    labels={data!.revenueByDay.map(p => formatRestaurantDate(
                                        p.bucketStartUtc,
                                        filter.timeZone ?? "Asia/Qatar",
                                        undefined,
                                        { month: "short", day: "2-digit", year: undefined },
                                    ))}
                                    series={[{ name: "Revenue", data: data!.revenueByDay.map(p => p.value), color: "var(--ds-primary)" }]}
                                />}
                        </Card>
                        {revenueByHour.length > 0 && (
                            <Card
                                title={ar ? "الإيراد حسب الساعة" : "Revenue by hour"}
                                subtitle={ar ? "بتوقيت UTC" : "UTC"}
                            >
                                <BarChart
                                    height={220}
                                    color="var(--ds-amber)"
                                    labels={revenueByHour.map((p) => `${new Date(p.bucketStartUtc).getUTCHours()}:00`)}
                                    data={revenueByHour.map((p) => p.value)}
                                    formatY={fmtAxis}
                                />
                            </Card>
                        )}
                        {revenueByWeekday.some(d => d.value > 0) && (
                            <Card
                                title={ar ? "الإيراد حسب اليوم" : "Revenue by day"}
                                subtitle={periodLabel}
                            >
                                <BarChart
                                    height={220}
                                    color="var(--ds-primary)"
                                    labels={revenueByWeekday.map((d) => (ar ? (d.labelAr || d.label) : d.label).slice(0, 3))}
                                    data={revenueByWeekday.map((d) => d.value)}
                                    formatY={fmtAxis}
                                />
                            </Card>
                        )}
                        {monthlyRevenue.labels.length > 0 && (
                            <Card
                                title={ar ? "الإيراد حسب الشهر" : "Revenue by month"}
                                subtitle={periodLabel}
                            >
                                <BarChart
                                    height={220}
                                    color="var(--ds-green)"
                                    labels={monthlyRevenue.labels}
                                    data={monthlyRevenue.values}
                                    formatY={fmtAxis}
                                />
                            </Card>
                        )}
                    </div>

                    <DisclosureCard
                        title={ar ? "ملخص الفترة" : "Period summary"}
                        subtitle={cmp ? `${periodLabel} · ${ar ? "مقارنة بالفترة السابقة" : "vs previous period"}` : periodLabel}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                            <SummaryRow label={ar ? "إيراد إجمالي" : "Gross revenue"} value={rev ? fmtCur(rev.gross) : "—"} delta={cmp?.revenueChangePercent} />
                            <SummaryRow label={ar ? "صافي الإيراد" : "Net revenue"} value={rev ? fmtCur(rev.net) : "—"} />
                            <SummaryRow label={ar ? "البضاعة" : "COGS"} value={profit ? fmtCur(profit.cogs) : "—"} invert />
                            <SummaryRow label={ar ? "الخصومات" : "Discounts"} value={rev ? fmtCur(rev.discounts) : "—"} invert />
                            <SummaryRow label={ar ? "القسائم" : "Vouchers"} value={rev ? fmtCur(rev.vouchers) : "—"} invert />
                            <SummaryRow label={ar ? "المرتجعات" : "Refunds"} value={rev ? fmtCur(rev.refunds) : "—"} invert />
                            <SummaryRow label={ar ? "رسوم الخدمة" : "Service charge"} value={rev ? fmtCur(rev.serviceCharge) : "—"} />
                            <SummaryRow label={ar ? "ربح التوصيل" : "Delivery profit"} value={delivery ? fmtCur(delivery.profit) : "—"} />
                            <SummaryRow label={ar ? "الربح الصافي" : "Net profit"} value={profit ? fmtCur(profit.netProfit) : "—"} delta={cmp?.netProfitChangePercent} accent />
                        </div>
                    </DisclosureCard>
                </DashboardSection>

                {(paymentAnalytics.length > 0 || (data?.channelSplit ?? []).length > 0 || cardBreakdown.length > 0 || payMobBreakdown.length > 0) && (
                    <DashboardSection title={ar ? "تحليلات الدفع" : "Payment analytics"} meta={periodLabel}>
                        <div className="dashboard-auto-grid dashboard-detail-grid">
                            {paymentAnalytics.length > 0 && (
                                <Card title={ar ? "الإيراد حسب طريقة الدفع" : "Revenue by payment type"} subtitle={ar ? "توزيع الإيراد الإجمالي" : "Gross revenue distribution"}>
                                    <AnalyticsDonut
                                        rows={paymentAnalytics.map((row) => ({
                                            key: row.key,
                                            label: localizedName(row, ar),
                                            value: row.grossRevenue,
                                        }))}
                                        centerLabel={ar ? "الإيراد" : "Revenue"}
                                        formatValue={fmtCur}
                                    />
                                </Card>
                            )}
                            {paymentAnalytics.length > 0 && (
                                <Card title={ar ? "الطلبات حسب طريقة الدفع" : "Orders by payment type"} subtitle={ar ? "عدد الطلبات المؤكدة" : "Confirmed order count"}>
                                    <BarChart
                                        height={230}
                                        labels={paymentAnalytics.map((row) => chartLabel(localizedName(row, ar)))}
                                        data={paymentAnalytics.map((row) => row.totalOrders)}
                                        color="var(--ds-blue)"
                                    />
                                </Card>
                            )}
                            {(data?.channelSplit ?? []).length > 0 && (
                                <Card title={ar ? "توزيع الدفع" : "Payment distribution"} subtitle={ar ? "حسب الإيراد" : "By revenue"}>
                                    {(data?.channelSplit ?? []).filter(s => s.value > 0).length === 0
                                        ? <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>—</div>
                                        : <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                            <Donut
                                                size={130} thickness={16}
                                                centerLabel={ar ? "الإجمالي" : "Total"}
                                                centerValue={fmtCur(data!.channelSplit.reduce((s, x) => s + x.value, 0))}
                                                data={data!.channelSplit.map((s, i) => ({
                                                    value: s.value,
                                                    color: PAYMENT_PALETTE[i % PAYMENT_PALETTE.length],
                                                }))}
                                            />
                                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                                                {data!.channelSplit.map((s, i) => (
                                                    <div key={s.label} className="between" style={{ fontSize: 12.5 }}>
                                                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            <span style={{ width: 8, height: 8, borderRadius: 2, background: PAYMENT_PALETTE[i % PAYMENT_PALETTE.length] }} />
                                                            {ar ? (s.labelAr || s.label) : s.label}
                                                        </span>
                                                        <span className="num bold">{s.percentage?.toFixed(1) ?? 0}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>}
                                </Card>
                            )}
                        </div>

                        {paymentAnalytics.length > 0 && (
                            <DisclosureCard
                                title={ar ? "تفاصيل طرق الدفع والتسوية" : "Payment type details & settlement"}
                                subtitle={ar ? "تشمل طرق الدفع النشطة وغير النشطة والتاريخية" : "Includes active, inactive and historical methods"}
                                padding={false}
                            >
                                <PaymentAnalyticsTable rows={paymentAnalytics} ar={ar} formatCurrency={fmtCur} />
                            </DisclosureCard>
                        )}

                        {(cardBreakdown.length > 0 || payMobBreakdown.length > 0) && (
                            <div className="dashboard-auto-grid dashboard-detail-grid">
                                {cardBreakdown.length > 0 && (
                                    <DisclosureCard title={ar ? "تفاصيل البطاقات" : "Card details"} subtitle={ar ? "عند توفر نوع البطاقة في البيانات" : "When card type is stored"} padding={false}>
                                        <CategoryBreakdownTable rows={cardBreakdown} ar={ar} formatCurrency={fmtCur} />
                                    </DisclosureCard>
                                )}
                                {payMobBreakdown.length > 0 && (
                                    <DisclosureCard title={ar ? "تفاصيل باي موب" : "PayMob details"} subtitle={ar ? "عند توفر نوع معاملة باي موب" : "When PayMob transaction type is stored"} padding={false}>
                                        <CategoryBreakdownTable rows={payMobBreakdown} ar={ar} formatCurrency={fmtCur} />
                                    </DisclosureCard>
                                )}
                            </div>
                        )}
                    </DashboardSection>
                )}

                {orderSourceAnalytics.length > 0 && (
                    <DashboardSection title={ar ? "تحليلات مصدر الطلب" : "Order source analytics"} meta={periodLabel}>
                        <div className="dashboard-auto-grid dashboard-detail-grid">
                            <Card title={ar ? "الإيراد حسب مصدر الطلب" : "Revenue by order source"} subtitle={ar ? "توزيع الإيراد الإجمالي" : "Gross revenue distribution"}>
                                <AnalyticsDonut
                                    rows={orderSourceAnalytics.map((row) => ({
                                        key: row.key,
                                        label: localizedName(row, ar),
                                        value: row.grossRevenue,
                                    }))}
                                    centerLabel={ar ? "الإيراد" : "Revenue"}
                                    formatValue={fmtCur}
                                />
                            </Card>
                            <Card title={ar ? "الطلبات حسب مصدر الطلب" : "Orders by order source"} subtitle={ar ? "داخل المتجر، استلام، توصيل، شركاء" : "In-store, pickup, delivery, partners"}>
                                <BarChart
                                    height={230}
                                    labels={orderSourceAnalytics.map((row) => chartLabel(localizedName(row, ar)))}
                                    data={orderSourceAnalytics.map((row) => row.orderCount)}
                                    color="var(--ds-primary)"
                                />
                            </Card>
                        </div>
                        <DisclosureCard
                            title={ar ? "تفاصيل مصادر الطلب" : "Order source details"}
                            subtitle={periodLabel}
                            padding={false}
                        >
                            <OrderSourceAnalyticsTable rows={orderSourceAnalytics} ar={ar} formatCurrency={fmtCur} />
                        </DisclosureCard>
                    </DashboardSection>
                )}

                {(partnerAnalytics.length > 0 || (hasCostSharingMetrics && costSharing)) && (
                    <DashboardSection title={ar ? "أداء الشركاء" : "Partner performance"} meta={periodLabel}>
                        {hasCostSharingMetrics && costSharing && (
                            <div className="dashboard-auto-grid dashboard-kpi-grid">
                                <KPI label={ar ? "إجمالي العمولة" : "Total commission"} icon={DollarSign}
                                     value={fmtCur(costSharing.totalCommission)} loading={loading && !data}
                                     sparkColor="var(--ds-amber)"
                                     foot={<><span>{ar ? "تقاسم التكلفة" : "Cost sharing"}</span><span className="num">{periodLabel}</span></>} />
                                <KPI label={ar ? "حصة المتجر" : "Merchant share"} icon={DollarSign}
                                     value={fmtCur(costSharing.commissionPaidByRestaurant)} loading={loading && !data}
                                     sparkColor="var(--ds-red)"
                                     foot={<><span>{ar ? "من العمولة" : "of commission"}</span>
                                             <span className="num">{costSharing.totalCommission > 0 ? `${((costSharing.commissionPaidByRestaurant / costSharing.totalCommission) * 100).toFixed(1)}%` : "—"}</span></>} />
                                <KPI label={ar ? "حصة الشريك/البطاقة" : "Partner/card share"} icon={DollarSign}
                                     value={fmtCur(costSharing.commissionPaidByCounterparty)} loading={loading && !data}
                                     sparkColor="var(--ds-blue)"
                                     foot={<><span>{ar ? "من العمولة" : "of commission"}</span>
                                             <span className="num">{costSharing.totalCommission > 0 ? `${((costSharing.commissionPaidByCounterparty / costSharing.totalCommission) * 100).toFixed(1)}%` : "—"}</span></>} />
                                <KPI label={ar ? "الصافي بعد التقاسم" : "Net after sharing"} icon={TrendingUp}
                                     value={fmtCur(costSharing.netRevenueAfterCostSharing)} loading={loading && !data}
                                     sparkColor="var(--ds-green)"
                                     foot={<><span>{ar ? "لا يغير صافي الإيراد الأساسي" : "Base net revenue unchanged"}</span></>} />
                            </div>
                        )}

                        {partnerAnalytics.length > 0 && (
                            <>
                                <div className="dashboard-auto-grid dashboard-detail-grid">
                                    <Card title={ar ? "الإيراد حسب الشريك" : "Revenue by partner"} subtitle={ar ? "كل شريك على حدة" : "Individual partner performance"}>
                                        <BarChart
                                            height={230}
                                            labels={partnerAnalytics.map((row) => chartLabel(localizedName(row, ar)))}
                                            data={partnerAnalytics.map((row) => row.grossRevenue)}
                                            color="var(--ds-purple)"
                                            formatY={fmtAxis}
                                        />
                                    </Card>
                                    <Card title={ar ? "الطلبات حسب الشريك" : "Orders by partner"} subtitle={ar ? "عدد الطلبات لكل شريك" : "Orders per partner"}>
                                        <BarChart
                                            height={230}
                                            labels={partnerAnalytics.map((row) => chartLabel(localizedName(row, ar)))}
                                            data={partnerAnalytics.map((row) => row.orderCount)}
                                            color="var(--ds-amber)"
                                        />
                                    </Card>
                                    <Card
                                        title={ar ? "تحصيل الشريك: نقدي مقابل آجل" : "Partner credit vs cash"}
                                        subtitle={ar ? "الأخضر: نقدي، الأزرق: آجل" : "Green: cash, blue: credit"}
                                    >
                                        <BarChart
                                            height={230}
                                            labels={partnerAnalytics.map((row) => chartLabel(localizedName(row, ar)))}
                                            data={partnerAnalytics.map((row) => [row.cashRevenue, row.creditRevenue])}
                                            colors={["var(--ds-green)", "var(--ds-blue)"]}
                                            formatY={fmtAxis}
                                        />
                                    </Card>
                                </div>
                                <DisclosureCard
                                    title={ar ? "تفاصيل الشركاء والتحصيل" : "Partner details and settlement"}
                                    subtitle={ar ? "النقدي محصل لدى المتجر، والآجل محصل لدى الشريك" : "Cash is merchant-collected; credit is partner-collected"}
                                    padding={false}
                                >
                                    <PartnerAnalyticsTable rows={partnerAnalytics} ar={ar} formatCurrency={fmtCur} />
                                </DisclosureCard>
                            </>
                        )}
                    </DashboardSection>
                )}

                {(profit || foodCost || productProfitability.length > 0 || categoryRevenue.some(c => (c.profit ?? 0) !== 0) || bestSellers.length > 0 || worstSellers.length > 0 || purchasing || purchasePriceVariance.length > 0) && (
                    <DashboardSection title={ar ? "الربحية" : "Profitability"} meta={periodLabel}>
                        <div className="dashboard-auto-grid dashboard-kpi-grid">
                            <KPI label={ar ? "نسبة الهامش" : "Profit margin"} icon={Zap}
                                 value={profit ? profit.marginPercent.toFixed(1) : "—"} unit="%"
                                 loading={loading && !data}
                                 sparkColor="var(--ds-purple)"
                                 delta={cmp?.marginChangePercent ?? undefined}
                                 foot={<><span>{ar ? "الهدف" : "Target"}</span><span className="num">35%</span></>} />
                            <KPI label={ar ? "تكلفة البضاعة" : "COGS"} icon={Package}
                                 value={profit ? fmtCur(profit.cogs) : "—"} loading={loading && !data}
                                 sparkColor="var(--ds-text-muted)"
                                 foot={<><span>{ar ? "العمالة" : "Labour"}</span>
                                         <span className="num">{profit ? fmtCur(profit.laborCost) : "—"}</span></>} />
                            {foodCost && (
                                <KPI
                                    label={ar ? "تكلفة الطعام الفعلية" : "Actual food cost"}
                                    icon={Package}
                                    value={fmtCur(foodCost.actualFoodCost)} loading={loading && !data}
                                    sparkColor="var(--ds-amber)"
                                    foot={<><span>{ar ? "نسبة الإيراد" : "% of revenue"}</span>
                                            <span className="num">{`${foodCost.foodCostPercentage.toFixed(1)}%`}</span></>}
                                />
                            )}
                            {foodCost?.hasTheoreticalData && (
                                <>
                                    <KPI
                                        label={ar ? "التكلفة النظرية" : "Theoretical food cost"}
                                        icon={Package}
                                        value={fmtCur(foodCost.theoreticalFoodCost)} loading={loading && !data}
                                        sparkColor="var(--ds-blue)"
                                        foot={<><span>{ar ? "نسبة الإيراد" : "% of revenue"}</span>
                                                <span className="num">{`${foodCost.theoreticalFoodCostPercentage.toFixed(1)}%`}</span></>}
                                    />
                                    <KPI
                                        label={ar ? "فرق التكلفة" : "Food cost variance"}
                                        icon={TrendingUp}
                                        value={fmtCur(Math.abs(foodCost.foodCostVariance))}
                                        loading={loading && !data}
                                        sparkColor={foodCost.foodCostVariance > 0 ? "var(--ds-red)" : "var(--ds-green)"}
                                        foot={<>
                                            <span>{foodCost.foodCostVariance > 0
                                                ? (ar ? "أعلى من النظري" : "Over theoretical")
                                                : (ar ? "أقل من النظري" : "Under theoretical")}</span>
                                            <span className="num">{`${Math.abs(foodCost.foodCostVariancePercentage).toFixed(1)}%`}</span>
                                        </>}
                                    />
                                </>
                            )}
                            <KPI label={ar ? "التكلفة الأولية" : "Prime cost"} icon={Zap}
                                 value={profit ? `${profit.primeCostPercentage?.toFixed(1) ?? "—"}%` : "—"} loading={loading && !data}
                                 invertDelta sparkColor="var(--ds-red)"
                                 foot={<><span>{ar ? "بضاعة + عمالة" : "COGS + labor"}</span>
                                         <span className="num">{profit ? fmtCur(profit.primeCost ?? 0) : "—"}</span></>} />
                        </div>

                        <div className="dashboard-auto-grid dashboard-detail-grid">
                            <Card title={ar ? "جسر الربحية" : "Profitability bridge"} subtitle={periodLabel}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                                    <SummaryRow label={ar ? "الربح الإجمالي" : "Gross profit"} value={profit ? fmtCur(profit.grossProfit) : "—"} />
                                    <SummaryRow label={ar ? "الهامش الإجمالي" : "Gross margin"} value={profit ? `${(profit.grossMarginPercent ?? profit.marginPercent).toFixed(1)}%` : "—"} />
                                    <SummaryRow label={ar ? "الربح الصافي" : "Net profit"} value={profit ? fmtCur(profit.netProfit) : "—"} delta={cmp?.netProfitChangePercent} accent />
                                    <SummaryRow label={ar ? "الهامش الصافي" : "Net margin"} value={profit ? `${profit.marginPercent.toFixed(1)}%` : "—"} delta={cmp?.marginChangePercent} />
                                    {typeof profit?.profitPerOrder === "number" && (
                                        <SummaryRow label={ar ? "الربح لكل طلب" : "Profit per order"} value={fmtCur(profit.profitPerOrder)} />
                                    )}
                                </div>
                            </Card>
                            {productProfitability.length > 0 && (
                                <Card title={ar ? "ربحية المنتجات" : "Product profitability"} subtitle={ar ? "حسب الربح الصافي" : "By net profit"}>
                                    <BarList
                                        color="var(--ds-green)"
                                        fmt={(v) => fmtCur(v)}
                                        items={productProfitability.map((p) => ({
                                            label: ar ? (p.nameAr || p.name) : p.name,
                                            sub: `${p.marginPercent.toFixed(1)}% · ${p.quantity} ${ar ? "قطعة" : "sold"}`,
                                            value: p.profit,
                                        }))}
                                    />
                                </Card>
                            )}
                            {categoryRevenue.some(c => (c.profit ?? 0) !== 0) && (
                                <Card title={ar ? "ربحية الفئات" : "Category profitability"} subtitle={ar ? "الربح والهامش" : "Profit & margin"}>
                                    <BarList
                                        color="var(--ds-blue)"
                                        fmt={(v) => fmtCur(v)}
                                        items={categoryRevenue
                                            .filter(c => (c.profit ?? 0) !== 0)
                                            .map((c) => ({
                                                label: ar ? (c.nameAr || c.name) : c.name,
                                                sub: `${(c.marginPercent ?? 0).toFixed(1)}%`,
                                                value: c.profit ?? 0,
                                            }))}
                                    />
                                </Card>
                            )}
                            {bestSellers.length > 0 && (
                                <Card title={ar ? "الأكثر مبيعاً" : "Top products"} subtitle={ar ? "حسب الإيراد" : "By revenue"}>
                                    <BarList
                                        color="var(--ds-blue)"
                                        fmt={(v) => fmtCur(v)}
                                        items={bestSellers.slice(0, 6).map((p, i) => ({
                                            label: rankedLabel(p, ar, "صنف", i),
                                            sub: `${p.count ?? 0} ${ar ? "مباع" : "sold"}`,
                                            value: p.primaryValue,
                                        }))}
                                    />
                                </Card>
                            )}
                            {worstSellers.length > 0 && (
                                <Card title={ar ? "الأقل أداءً" : "Worst performing products"} subtitle={ar ? "للمراجعة" : "Review candidates"}>
                                    <BarList
                                        color="var(--ds-amber)"
                                        fmt={(v) => fmtCur(v)}
                                        items={worstSellers.slice(0, 5).map((p, i) => ({
                                            label: rankedLabel(p, ar, "صنف", i),
                                            sub: `${p.count ?? 0} ${ar ? "مباع" : "sold"}`,
                                            value: p.primaryValue,
                                        }))}
                                    />
                                </Card>
                            )}
                            {purchasePriceVariance.length > 0 && (
                                <Card
                                    title={ar ? "تقلب أسعار المواد الخام" : "Raw material price volatility"}
                                    subtitle={ar ? "أعلى تباين خلال الفترة" : "Highest variance in window"}
                                >
                                    <BarList
                                        color="var(--ds-amber)"
                                        fmt={(v) => `${v.toFixed(1)}%`}
                                        items={purchasePriceVariance.map((v) => ({
                                            label: ar ? (v.nameAr || v.name) : v.name,
                                            sub: `${fmtCur(v.minUnitPrice)}–${fmtCur(v.maxUnitPrice)} · ${ar ? "آخر" : "latest"} ${fmtCur(v.latestUnitPrice)}`,
                                            value: v.variancePercentage,
                                        }))}
                                    />
                                </Card>
                            )}
                        </div>

                        {purchasing && purchasing.purchaseOrderCount > 0 && (
                            <DisclosureCard title={ar ? "تكاليف المشتريات" : "Purchasing costs"} subtitle={periodLabel}>
                                <div className="dashboard-auto-grid dashboard-kpi-grid" style={{ marginBottom: 14 }}>
                                    <KPI
                                        label={ar ? "إجمالي المشتريات" : "Total purchasing cost"}
                                        icon={Package}
                                        value={fmtCur(purchasing.totalPurchasingCost)} loading={loading && !data}
                                        sparkColor="var(--ds-amber)"
                                        foot={<><span>{ar ? "أوامر الشراء" : "Purchase orders"}</span>
                                                <span className="num">{purchasing.purchaseOrderCount}</span></>}
                                    />
                                    <KPI
                                        label={ar ? "متوسط أمر الشراء" : "Avg purchase order"}
                                        icon={Package}
                                        value={purchasing.purchaseOrderCount > 0
                                            ? fmtCur(purchasing.totalPurchasingCost / purchasing.purchaseOrderCount)
                                            : "—"}
                                        loading={loading && !data}
                                        sparkColor="var(--ds-blue)"
                                        foot={<><span>{ar ? "الموردون" : "Suppliers"}</span>
                                                <span className="num">{purchasing.supplierSpend.length}</span></>}
                                    />
                                </div>
                                {purchasing.supplierSpend.length > 0 && (
                                    <div className="dashboard-auto-grid dashboard-detail-grid">
                                        <Card
                                            title={ar ? "الإنفاق على الموردين" : "Supplier spend"}
                                            subtitle={ar ? "حسب إجمالي الإنفاق" : "By total spend"}
                                        >
                                            <BarList
                                                color="var(--ds-primary)"
                                                fmt={(v) => fmtCur(v)}
                                                items={purchasing.supplierSpend.map((s) => ({
                                                    label: ar ? (s.nameAr || s.name) : s.name,
                                                    sub: (s.receivedOrderCount ?? 0) > 0
                                                        ? `${s.spendPercentage.toFixed(1)}% · ${ar ? "مهلة" : "lead"} ${(s.averageLeadTimeDays ?? 0).toFixed(1)}${ar ? "ي" : "d"} · ${ar ? "بالموعد" : "on-time"} ${(s.onTimeDeliveryPercentage ?? 0).toFixed(0)}%`
                                                        : `${s.orderCount} ${ar ? "أمر" : "orders"} · ${s.spendPercentage.toFixed(1)}%`,
                                                    value: s.totalSpend,
                                                }))}
                                            />
                                        </Card>
                                        {purchasing.purchaseTrend.length > 0 && (
                                            <Card
                                                title={ar ? "اتجاه المشتريات" : "Purchase trend"}
                                                subtitle={periodLabel}
                                            >
                                                <AreaChart
                                                    height={200}
                                                    showLegend={false}
                                                    labels={purchasing.purchaseTrend.map((p) => formatRestaurantDate(
                                                        p.bucketStartUtc,
                                                        filter.timeZone ?? "Asia/Qatar",
                                                        undefined,
                                                        { month: "short", day: "2-digit", year: undefined },
                                                    ))}
                                                    series={[{
                                                        name: ar ? "المشتريات" : "Purchasing",
                                                        data: purchasing.purchaseTrend.map((p) => p.value),
                                                        color: "var(--ds-amber)",
                                                    }]}
                                                />
                                            </Card>
                                        )}
                                    </div>
                                )}
                            </DisclosureCard>
                        )}
                    </DashboardSection>
                )}

                {(delivery || revenueByCashier.length > 0 || revenueByWaiter.length > 0 || revenueByTable.length > 0 || categoryRevenue.length > 0 || customerRevenue || (laborCost?.hasLaborData ?? false) || salesMix || productGrowth.length > 0 || categoryGrowth.length > 0) && (
                    <DashboardSection title={ar ? "الأداء التشغيلي" : "Operational performance"} meta={periodLabel}>
                        <div className="dashboard-auto-grid dashboard-kpi-grid">
                            <KPI label={ar ? "طلبات التوصيل" : "Delivery orders"} icon={Truck}
                                 value={delivery?.orderCount ?? "—"} loading={loading && !data}
                                 sparkColor="var(--ds-blue)"
                                 foot={<><span>{ar ? "الفترة" : "Window"}</span><span className="num">{periodLabel}</span></>} />
                            <KPI label={ar ? "إيراد التوصيل" : "Delivery revenue"} icon={DollarSign}
                                 value={delivery ? fmtCur(delivery.revenue) : "—"} loading={loading && !data}
                                 sparkColor="var(--ds-green)"
                                 foot={<><span>{ar ? "لكل طلب" : "Per order"}</span>
                                         <span className="num">{delivery && delivery.orderCount > 0 ? fmtCur(delivery.revenue / delivery.orderCount) : "—"}</span></>} />
                            <KPI label={ar ? "تكلفة التوصيل" : "Delivery cost"} icon={Package}
                                 value={delivery ? fmtCur(delivery.cost) : "—"} loading={loading && !data}
                                 sparkColor="var(--ds-amber)"
                                 foot={<><span>{ar ? "من الإيراد" : "of revenue"}</span>
                                         <span className="num">{delivery && delivery.revenue > 0 ? `${((delivery.cost / delivery.revenue) * 100).toFixed(1)}%` : "—"}</span></>} />
                            <KPI label={ar ? "ربح التوصيل" : "Delivery profit"} icon={TrendingUp}
                                 value={delivery ? fmtCur(delivery.profit) : "—"} loading={loading && !data}
                                 sparkColor="var(--ds-purple)"
                                 foot={<><span>{ar ? "الهامش" : "Margin"}</span>
                                         <span className="num">{delivery && delivery.revenue > 0 ? `${((delivery.profit / delivery.revenue) * 100).toFixed(1)}%` : "—"}</span></>} />
                            {laborCost?.hasLaborData && (
                                <>
                                    <KPI label={ar ? "تكلفة العمالة" : "Labor cost"} icon={Users}
                                         value={fmtCur(laborCost.laborCost)} loading={loading && !data}
                                         sparkColor="var(--ds-amber)"
                                         foot={<><span>{ar ? "نسبة الإيراد" : "% of revenue"}</span>
                                                 <span className="num">{laborCost.laborCostPercentage.toFixed(1)}%</span></>} />
                                    <KPI label={ar ? "الإيراد لكل ساعة عمل" : "Revenue / labor hour"} icon={DollarSign}
                                         value={fmtCur(laborCost.revenuePerLaborHour)} loading={loading && !data}
                                         sparkColor="var(--ds-green)"
                                         foot={<><span>{ar ? "ساعات العمل" : "Labor hours"}</span>
                                                 <span className="num">{laborCost.laborHours.toFixed(1)}</span></>} />
                                </>
                            )}
                            {salesMix && (
                                <>
                                    <KPI label={ar ? "متوسط الأصناف للطلب" : "Avg items / order"} icon={Package}
                                         value={salesMix.averageItemsPerOrder.toFixed(1)} loading={loading && !data}
                                         sparkColor="var(--ds-blue)"
                                         foot={<><span>{ar ? "إجمالي الأصناف" : "Total items"}</span>
                                                 <span className="num">{salesMix.totalItems}</span></>} />
                                    <KPI label={ar ? "إيراد الإضافات" : "Modifier revenue"} icon={DollarSign}
                                         value={fmtCur(salesMix.modifierRevenue)} loading={loading && !data}
                                         sparkColor="var(--ds-purple)"
                                         foot={<><span>{ar ? "أصناف مجانية" : "Complimentary"}</span>
                                                 <span className="num">{salesMix.complimentaryItemCount}</span></>} />
                                </>
                            )}
                            {customerRevenue && customerRevenue.uniqueCustomers > 0 && (
                                <>
                                    <KPI
                                        label={ar ? "عملاء فريدون" : "Unique customers"}
                                        value={customerRevenue.uniqueCustomers} loading={loading && !data}
                                        sparkColor="var(--ds-blue)"
                                        foot={<><span>{ar ? "جدد" : "New"}</span><span className="num">{customerRevenue.newCustomers}</span></>}
                                    />
                                    <KPI
                                        label={ar ? "عملاء عائدون" : "Returning customers"}
                                        value={customerRevenue.returningCustomers} loading={loading && !data}
                                        sparkColor="var(--ds-green)"
                                        foot={<><span>{ar ? "معدل العودة" : "Return rate"}</span>
                                                <span className="num">
                                                    {customerRevenue.uniqueCustomers > 0
                                                        ? `${((customerRevenue.returningCustomers / customerRevenue.uniqueCustomers) * 100).toFixed(1)}%`
                                                        : "—"}
                                                </span></>}
                                    />
                                    <KPI
                                        label={ar ? "متوسط إنفاق العميل" : "Avg customer spend"}
                                        value={fmtCur(customerRevenue.averageCustomerSpend)} loading={loading && !data}
                                        sparkColor="var(--ds-purple)"
                                        foot={<><span>{ar ? "إيراد معروف" : "Identified revenue"}</span>
                                                <span className="num">{fmtCur(customerRevenue.revenueFromIdentified)}</span></>}
                                    />
                                    <KPI
                                        label={ar ? "معدل تكرار الشراء" : "Purchase frequency"}
                                        value={`${customerRevenue.averagePurchaseFrequency.toFixed(1)}x`} loading={loading && !data}
                                        sparkColor="var(--ds-amber)"
                                        foot={<><span>{ar ? "إيراد مجهول" : "Anonymous revenue"}</span>
                                                <span className="num">{fmtCur(customerRevenue.revenueFromAnonymous)}</span></>}
                                    />
                                </>
                            )}
                        </div>

                        <div className="dashboard-auto-grid dashboard-detail-grid">
                            {revenueByCashier.length > 0 && (
                                <Card title={ar ? "الإيراد حسب الكاشير" : "Revenue by cashier"} subtitle={periodLabel}>
                                    <BarList
                                        color="var(--ds-primary)"
                                        fmt={(v) => fmtCur(v)}
                                        items={revenueByCashier.map((c, i) => ({
                                            label: rankedLabel(c, ar, "كاشير", i),
                                            sub: `${c.count ?? 0} ${ar ? "طلب" : "orders"}`,
                                            value: c.primaryValue,
                                        }))}
                                    />
                                </Card>
                            )}
                            {revenueByWaiter.length > 0 && (
                                <Card title={ar ? "الإيراد حسب الموظف" : "Revenue by staff"} subtitle={periodLabel}>
                                    <BarList
                                        color="var(--ds-primary)"
                                        fmt={(v) => fmtCur(v)}
                                        items={revenueByWaiter.map((w, i) => ({
                                            label: rankedLabel(w, ar, "موظف", i),
                                            sub: `${w.count ?? 0} ${ar ? "طلب" : "orders"}`,
                                            value: w.primaryValue,
                                        }))}
                                    />
                                </Card>
                            )}
                            {revenueByTable.length > 0 && (
                                <Card title={ar ? "الإيراد حسب القناة" : "Revenue by channel"} subtitle={ar ? "الإيراد + الربح" : "Revenue + profit"}>
                                    <BarList
                                        color="var(--ds-blue)"
                                        fmt={(v) => fmtCur(v)}
                                        items={revenueByTable.map((t) => ({
                                            label: t.label,
                                            sub: `${ar ? "ربح" : "profit"} ${fmtCur(t.secondaryValue ?? 0)}`,
                                            value: t.primaryValue,
                                        }))}
                                    />
                                </Card>
                            )}
                            {categoryRevenue.length > 0 && (
                                <>
                                    <Card
                                        title={ar ? "توزيع إيراد الفئات" : "Category revenue split"}
                                        subtitle={ar ? "نسبة مئوية حسب الفئة" : "Revenue share by category"}
                                    >
                                        <AnalyticsDonut
                                            rows={categoryRevenue.map((c) => ({
                                                key: c.categoryId ?? "uncategorized",
                                                label: ar ? (c.nameAr || c.name) : c.name,
                                                value: c.revenue,
                                            }))}
                                            centerLabel={ar ? "الإيراد" : "Revenue"}
                                            formatValue={fmtCur}
                                        />
                                    </Card>
                                    <Card
                                        title={ar ? "أداء الفئات" : "Category performance"}
                                        subtitle={periodLabel}
                                    >
                                        <BarList
                                            color="var(--ds-primary)"
                                            fmt={(v) => fmtCur(v)}
                                            items={categoryRevenue.map((c) => ({
                                                label: ar ? (c.nameAr || c.name) : c.name,
                                                sub: `${c.revenuePercentage.toFixed(1)}% · ${c.quantity} ${ar ? "قطعة" : "items"}`,
                                                value: c.revenue,
                                            }))}
                                        />
                                    </Card>
                                </>
                            )}
                            {customerRevenue && customerRevenue.topCustomers.length > 0 && (
                                <Card
                                    title={ar ? "أعلى العملاء إنفاقاً" : "Top customers by spend"}
                                    subtitle={periodLabel}
                                >
                                    <BarList
                                        color="var(--ds-blue)"
                                        fmt={(v) => fmtCur(v)}
                                        items={customerRevenue.topCustomers.map((c, i) => ({
                                            label: rankedLabel(c, ar, "عميل", i),
                                            sub: `${c.count ?? 0} ${ar ? "طلب" : "orders"}`,
                                            value: c.primaryValue,
                                        }))}
                                    />
                                </Card>
                            )}
                            {productGrowth.length > 0 && (
                                <Card title={ar ? "نمو المنتجات" : "Product growth"} subtitle={ar ? "الإيراد والتغير %" : "Revenue & change %"}>
                                    <BarList
                                        color="var(--ds-green)"
                                        fmt={(v) => fmtCur(v)}
                                        items={productGrowth.map((g) => ({
                                            label: ar ? (g.nameAr || g.name) : g.name,
                                            sub: `${g.changePercent >= 0 ? "+" : ""}${g.changePercent.toFixed(1)}%`,
                                            value: g.current,
                                        }))}
                                    />
                                </Card>
                            )}
                            {categoryGrowth.length > 0 && (
                                <Card title={ar ? "نمو الفئات" : "Category growth"} subtitle={ar ? "الإيراد والتغير %" : "Revenue & change %"}>
                                    <BarList
                                        color="var(--ds-blue)"
                                        fmt={(v) => fmtCur(v)}
                                        items={categoryGrowth.map((g) => ({
                                            label: ar ? (g.nameAr || g.name) : g.name,
                                            sub: `${g.changePercent >= 0 ? "+" : ""}${g.changePercent.toFixed(1)}%`,
                                            value: g.current,
                                        }))}
                                    />
                                </Card>
                            )}
                        </div>
                    </DashboardSection>
                )}

                {(alerts.length > 0 || cancellations || discountsByUser.length > 0 || refundReasons.length > 0 || taxBreakdown.length > 0 || (discountCost?.totalDiscountCost ?? 0) > 0) && (
                    <DashboardSection title={ar ? "الاستثناءات والمشاكل المالية" : "Exceptions & financial issues"} meta={periodLabel}>
                        <div className="dashboard-auto-grid dashboard-kpi-grid">
                            <KPI label={ar ? "ملغاة قبل الدفع" : "Cancelled before payment"} icon={Ban}
                                 value={cancellations?.cancelledBeforePaymentCount ?? "—"} loading={loading && !data}
                                 sparkColor="var(--ds-amber)"
                                 foot={<><span>{ar ? "لا تؤثر على الإيراد" : "Excluded from revenue"}</span>
                                         <span className="num">{cancellations ? fmtCur(cancellations.cancelledBeforePaymentAmount) : "—"}</span></>} />
                            <KPI label={ar ? "الطلبات المستردة" : "Refunded orders"} icon={RotateCcw}
                                 value={cancellations?.refundedOrderCount ?? "—"} loading={loading && !data}
                                 sparkColor="var(--ds-red)"
                                 foot={<><span>{ar ? "قيمة الاسترداد" : "Refunded amount"}</span>
                                         <span className="num">{cancellations ? fmtCur(cancellations.refundedAmount) : "—"}</span></>} />
                            {discountCost && discountCost.totalDiscountCost > 0 && (
                                <KPI label={ar ? "تكلفة الخصومات" : "Discount cost"} icon={DollarSign}
                                     value={fmtCur(discountCost.totalDiscountCost)} loading={loading && !data}
                                     sparkColor="var(--ds-amber)"
                                     foot={<><span>{ar ? "من الإيراد" : "of revenue"}</span>
                                             <span className="num">{discountCost.discountPercentage.toFixed(1)}%</span></>} />
                            )}
                        </div>

                        <div className="dashboard-auto-grid dashboard-detail-grid">
                            {alerts.length > 0 && (
                                <Card
                                    title={ar ? "تنبيهات الأعمال" : "Business alerts"}
                                    subtitle={ar ? "تتطلب إجراءً" : "Action required"}
                                    action={
                                        <Pill color={alerts.some(a => a.severity === "danger" || a.severity === "red") ? "red" : "amber"}>
                                            {alerts.length}
                                        </Pill>
                                    }
                                >
                                    <div className="scroll-list">
                                        {alerts.map((a, i) => (
                                            <AlertRow
                                                key={`${a.code}:${i}`}
                                                tone={mapSeverityTone(a.severity)}
                                                icon={AlertTriangle}
                                                title={ar ? (a.titleAr || a.title) : a.title}
                                                meta={ar ? (a.metaAr || a.meta || undefined) : (a.meta || undefined)}
                                            />
                                        ))}
                                    </div>
                                </Card>
                            )}
                            {refundReasons.length > 0 && (
                                <Card title={ar ? "المرتجعات حسب السبب" : "Refunds by reason"} subtitle={periodLabel}>
                                    <BarList
                                        color="var(--ds-red)"
                                        fmt={(v) => fmtCur(v)}
                                        items={refundReasons.map((r) => ({
                                            label: r.reason,
                                            sub: `${r.count} ${ar ? "طلب" : "orders"} · ${r.percentage.toFixed(1)}%`,
                                            value: r.amount,
                                        }))}
                                    />
                                </Card>
                            )}
                            {discountsByUser.length > 0 && (
                                <Card title={ar ? "الخصومات حسب المستخدم" : "Discounts by user"} subtitle={periodLabel}>
                                    <BarList
                                        color="var(--ds-amber)"
                                        fmt={(v) => fmtCur(v)}
                                        items={discountsByUser.map((row, i) => ({
                                            label: rankedLabel(row, ar, "مستخدم", i),
                                            sub: `${row.count ?? 0} ${ar ? "خصم" : "discounts"}`,
                                            value: row.primaryValue,
                                        }))}
                                    />
                                </Card>
                            )}
                            {discountCost && discountCost.totalDiscountCost > 0 && (
                                <Card
                                    title={ar ? "تكلفة الخصومات حسب النوع" : "Discount cost by type"}
                                    subtitle={`${discountCost.discountPercentage.toFixed(1)}% ${ar ? "من الإيراد" : "of revenue"}`}
                                >
                                    <AnalyticsDonut
                                        centerLabel={ar ? "الخصومات" : "Discounts"}
                                        formatValue={fmtCur}
                                        rows={[
                                            { key: "manual", label: ar ? "يدوي" : "Manual", value: discountCost.manualDiscounts },
                                            { key: "voucher", label: ar ? "قسائم" : "Voucher", value: discountCost.voucherDiscounts },
                                            { key: "comp", label: ar ? "مجاني" : "Complimentary", value: discountCost.complimentaryValue },
                                            { key: "partner", label: ar ? "الشركاء" : "Partner", value: discountCost.partnerDiscounts },
                                        ]}
                                    />
                                </Card>
                            )}
                            {taxBreakdown.length > 0 && (
                                <Card title={ar ? "الضريبة حسب النسبة" : "Tax by rate"} subtitle={ar ? "أساس إقرار الضريبة" : "Tax filing basis"}>
                                    <BarList
                                        color="var(--ds-blue)"
                                        fmt={(v) => fmtCur(v)}
                                        items={taxBreakdown.map((t) => ({
                                            label: `${t.rate.toFixed(t.rate % 1 === 0 ? 0 : 2)}%`,
                                            sub: `${ar ? "وعاء" : "base"} ${fmtCur(t.taxableSales)} · ${t.orderCount} ${ar ? "طلب" : "orders"}`,
                                            value: t.taxAmount,
                                        }))}
                                    />
                                </Card>
                            )}
                        </div>
                    </DashboardSection>
                )}

                <CommissionCostSharingAnalysis
                    analysis={commissionAnalysis}
                    loading={commissionLoading}
                    error={commissionError}
                    ar={ar}
                    periodLabel={periodLabel}
                    currency={currency}
                    locale={locale}
                    timeZone={filter.timeZone ?? "Asia/Qatar"}
                    formatCurrency={fmtCur}
                />

                {!hasDetailRows && !loading && data && (
                    <div className="dashboard-empty-strip" style={{ marginTop: 14 }}>
                        {ar ? `لا توجد تفاصيل ترتيب لهذه الفترة: ${periodLabel}` : `No ranking details for ${periodLabel}`}
                    </div>
                )}
            </div>
        </>
    );
}

/* ─── helpers ─── */

function DashboardSection({
    title,
    meta,
    children,
    defaultOpen = true,
}: {
    title: string;
    meta?: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    return (
        <details className="dashboard-section" open={defaultOpen ? true : undefined}>
            <summary className="dashboard-section-summary">
                <span className="dashboard-section-title">{title}</span>
                {meta && <span className="dashboard-section-meta">{meta}</span>}
            </summary>
            <div className="dashboard-section-body">
                {children}
            </div>
        </details>
    );
}

function DisclosureCard({
    title,
    subtitle,
    children,
    padding = true,
    defaultOpen = false,
}: {
    title: string;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    padding?: boolean;
    defaultOpen?: boolean;
}) {
    return (
        <details className="card dashboard-disclosure-card" open={defaultOpen ? true : undefined}>
            <summary className="card-header dashboard-disclosure-summary">
                <span className="col-stack">
                    <span className="card-title">{title}</span>
                    {subtitle && <span className="card-subtitle">{subtitle}</span>}
                </span>
            </summary>
            <div className={padding ? "card-body" : ""}>
                {children}
            </div>
        </details>
    );
}

function buildMonthlyRevenue(
    points: Array<{ bucketStartUtc: string; value: number }>,
    timeZone: string,
    locale: string,
) {
    const keyFormatter = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        timeZone,
    });
    const labelFormatter = new Intl.DateTimeFormat(locale, {
        month: "short",
        year: "2-digit",
        timeZone,
    });
    const monthly = new Map<string, { label: string; value: number }>();

    for (const point of points) {
        const date = new Date(point.bucketStartUtc);
        const parts = keyFormatter.formatToParts(date);
        const year = parts.find((part) => part.type === "year")?.value ?? "";
        const month = parts.find((part) => part.type === "month")?.value.padStart(2, "0") ?? "";
        const key = `${year}-${month}`;
        const current = monthly.get(key);
        if (current) {
            current.value += point.value;
        } else {
            monthly.set(key, { label: labelFormatter.format(date), value: point.value });
        }
    }

    const rows = Array.from(monthly.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, row]) => row);

    return {
        labels: rows.map((row) => row.label),
        values: rows.map((row) => row.value),
    };
}

function SummaryStat({ label, value, dim, accent }: { label: string; value: string; dim?: boolean; accent?: string }) {
    return (
        <div>
            <div style={{ fontSize: 11.5, color: "var(--ds-text-muted)" }}>{label}</div>
            <div className="num bold" style={{
                fontSize: 20, letterSpacing: "-0.02em",
                color: accent ?? (dim ? "var(--ds-text-secondary)" : "var(--ds-text)"),
                marginTop: 2,
            }}>{value}</div>
        </div>
    );
}

function mapSeverityTone(sev: string): "neutral" | "green" | "red" | "amber" | "blue" | "purple" {
    if (sev === "danger" || sev === "red") return "red";
    if (sev === "warning" || sev === "amber") return "amber";
    if (sev === "info") return "blue";
    return "neutral";
}

function rankedLabel(row: { label: string; labelAr?: string | null }, ar: boolean, fallbackPrefixAr?: string, index?: number) {
    const fallback = fallbackPrefixAr ? `${fallbackPrefixAr} ${index === undefined ? "" : index + 1}`.trim() : "—";
    if (!ar) return row.label.trim() || fallback;
    if (row.labelAr?.trim()) return row.labelAr;
    return row.label.trim() || fallback;
}

function SummaryRow({ label, value, delta, invert, accent }: {
    label: string; value: string; delta?: number; invert?: boolean; accent?: boolean;
}) {
    return (
        <div className="between" style={{ paddingBottom: 6, borderBottom: "1px dashed var(--ds-border-subtle)" }}>
            <span style={{ color: "var(--ds-text-secondary)" }}>{label}</span>
            <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span className="num bold" style={{ color: accent ? "var(--ds-green-text)" : "var(--ds-text)" }}>{value}</span>
                {typeof delta === "number" && (
                    <span className="num" style={{
                        fontSize: 11,
                        color: (invert ? delta < 0 : delta >= 0) ? "var(--ds-green-text)" : "var(--ds-red-text)",
                    }}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}%</span>
                )}
            </span>
        </div>
    );
}

function EmptyChart({ loading, height = 220, ar = false }: { loading: boolean; height?: number; ar?: boolean }) {
    const compactHeight = loading ? Math.min(height, 140) : 88;
    return (
        <div style={{
            height: compactHeight, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ds-text-muted)", fontSize: 12,
            background: "var(--ds-bg-sunken)", borderRadius: 8,
        }}>{loading ? (ar ? "جار التحميل..." : "Loading...") : (ar ? "لا توجد بيانات لهذه الفترة" : "No data for this window")}</div>
    );
}

function AnalyticsDonut({
    rows,
    centerLabel,
    formatValue,
}: {
    rows: Array<{ key: string; label: string; value: number }>;
    centerLabel: string;
    formatValue: (value: number) => string;
}) {
    const visibleRows = rows.filter((row) => row.value > 0);
    const total = visibleRows.reduce((sum, row) => sum + row.value, 0);
    if (visibleRows.length === 0) return <div className="muted" style={{ padding: 12, textAlign: "center" }}>—</div>;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Donut
                size={142}
                thickness={17}
                centerLabel={centerLabel}
                centerValue={formatValue(total)}
                data={visibleRows.map((row, index) => ({
                    value: row.value,
                    color: PAYMENT_PALETTE[index % PAYMENT_PALETTE.length],
                }))}
            />
            <div style={{ flex: 1, minWidth: 170, display: "flex", flexDirection: "column", gap: 8 }}>
                {visibleRows.map((row, index) => (
                    <div key={row.key} className="between" style={{ fontSize: 12 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                background: PAYMENT_PALETTE[index % PAYMENT_PALETTE.length],
                            }} />
                            {row.label}
                        </span>
                        <span className="num bold">{((row.value / total) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PaymentAnalyticsTable({
    rows,
    ar,
    formatCurrency,
}: {
    rows: PaymentMethodAnalytics[];
    ar: boolean;
    formatCurrency: (value: number) => string;
}) {
    return (
        <div className="tbl-scroll">
            <table className="tbl">
                <thead>
                    <tr>
                        <th>{ar ? "طريقة الدفع" : "Payment method"}</th>
                        <th>{ar ? "الطلبات" : "Orders"}</th>
                        <th>{ar ? "ملغاة بعد الدفع" : "Refunded orders"}</th>
                        <th>{ar ? "الإيراد الإجمالي" : "Gross revenue"}</th>
                        <th>{ar ? "المرتجعات" : "Refunds"}</th>
                        <th>{ar ? "الخصومات" : "Discounts"}</th>
                        <th>{ar ? "صافي الإيراد" : "Net revenue"}</th>
                        <th>{ar ? "إجمالي العمولة" : "Total commission"}</th>
                        <th>{ar ? "حصة المتجر" : "Merchant share"}</th>
                        <th>{ar ? "حصة البطاقة" : "Card share"}</th>
                        <th>{ar ? "صافي التسوية" : "Net settlement"}</th>
                        <th>{ar ? "الصافي بعد التقاسم" : "Net after sharing"}</th>
                        <th>{ar ? "متوسط الطلب" : "AOV"}</th>
                        <th>{ar ? "نسبة الإيراد" : "Revenue %"}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.key}>
                            <td className="bold">{localizedName(row, ar)}</td>
                            <td className="num">{row.totalOrders}</td>
                            <td className="num">{row.refundedOrderCount}</td>
                            <td className="num">{formatCurrency(row.grossRevenue)}</td>
                            <td className="num">{formatCurrency(row.refundAmount)}</td>
                            <td className="num">{formatCurrency(row.discountAmount)}</td>
                            <td className="num bold">{formatCurrency(row.netRevenue)}</td>
                            <td className="num">{formatCurrency(row.totalCommission ?? 0)}</td>
                            <td className="num">{formatCurrency(row.restaurantShare ?? 0)}</td>
                            <td className="num">{formatCurrency(row.counterpartyShare ?? 0)}</td>
                            <td className="num">{formatCurrency(row.netSettlement ?? 0)}</td>
                            <td className="num bold">{formatCurrency(row.netRevenueAfterCostSharing ?? row.netRevenue)}</td>
                            <td className="num">{formatCurrency(row.averageOrderValue)}</td>
                            <td className="num">{row.revenuePercentage.toFixed(1)}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function OrderSourceAnalyticsTable({
    rows,
    ar,
    formatCurrency,
}: {
    rows: OrderSourceAnalytics[];
    ar: boolean;
    formatCurrency: (value: number) => string;
}) {
    return (
        <div className="tbl-scroll">
            <table className="tbl">
                <thead>
                    <tr>
                        <th>{ar ? "مصدر الطلب" : "Order source"}</th>
                        <th>{ar ? "الطلبات" : "Orders"}</th>
                        <th>{ar ? "الإيراد الإجمالي" : "Gross revenue"}</th>
                        <th>{ar ? "صافي الإيراد" : "Net revenue"}</th>
                        <th>{ar ? "ملغاة بعد الدفع" : "Refunded orders"}</th>
                        <th>{ar ? "المرتجعات" : "Refunds"}</th>
                        <th>{ar ? "ملغاة قبل الدفع" : "Cancelled before payment"}</th>
                        <th>{ar ? "قيمة الإلغاءات" : "Cancelled value"}</th>
                        <th>{ar ? "متوسط الطلب" : "AOV"}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.key}>
                            <td className="bold">{localizedName(row, ar)}</td>
                            <td className="num">{row.orderCount}</td>
                            <td className="num">{formatCurrency(row.grossRevenue)}</td>
                            <td className="num bold">{formatCurrency(row.netRevenue)}</td>
                            <td className="num">{row.refundedOrderCount}</td>
                            <td className="num">{formatCurrency(row.refundAmount)}</td>
                            <td className="num">{row.cancelledBeforePaymentCount}</td>
                            <td className="num">{formatCurrency(row.cancelledBeforePaymentAmount)}</td>
                            <td className="num">{formatCurrency(row.averageOrderValue)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function PartnerAnalyticsTable({
    rows,
    ar,
    formatCurrency,
}: {
    rows: PartnerAnalytics[];
    ar: boolean;
    formatCurrency: (value: number) => string;
}) {
    return (
        <div className="tbl-scroll">
            <table className="tbl">
                <thead>
                    <tr>
                        <th>{ar ? "الشريك" : "Partner"}</th>
                        <th>{ar ? "الحالة" : "Status"}</th>
                        <th>{ar ? "الطلبات" : "Orders"}</th>
                        <th>{ar ? "الإيراد الإجمالي" : "Gross revenue"}</th>
                        <th>{ar ? "صافي الإيراد" : "Net revenue"}</th>
                        <th>{ar ? "رسوم التوصيل" : "Delivery fees"}</th>
                        <th>{ar ? "رسوم الشريك" : "Partner fees"}</th>
                        <th>{ar ? "المرتجعات" : "Refunds"}</th>
                        <th>{ar ? "إجمالي العمولة" : "Total commission"}</th>
                        <th>{ar ? "حصة المتجر" : "Merchant share"}</th>
                        <th>{ar ? "حصة الشريك" : "Partner share"}</th>
                        <th>{ar ? "صافي التسوية" : "Net settlement"}</th>
                        <th>{ar ? "الصافي بعد التقاسم" : "Net after sharing"}</th>
                        <th>{ar ? "متوسط الطلب" : "AOV"}</th>
                        <th>{ar ? "طلبات نقدية" : "Cash orders"}</th>
                        <th>{ar ? "إيراد نقدي" : "Cash revenue"}</th>
                        <th>{ar ? "طلبات آجلة" : "Credit orders"}</th>
                        <th>{ar ? "إيراد آجل" : "Credit revenue"}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.key} style={row.isActive ? undefined : { opacity: 0.72 }}>
                            <td className="bold">{localizedName(row, ar)}</td>
                            <td>
                                <Pill color={row.isActive ? "green" : "neutral"}>
                                    {row.isActive ? (ar ? "نشط" : "Active") : (ar ? "غير نشط" : "Inactive")}
                                </Pill>
                            </td>
                            <td className="num">{row.orderCount}</td>
                            <td className="num">{formatCurrency(row.grossRevenue)}</td>
                            <td className="num bold">{formatCurrency(row.netRevenue)}</td>
                            <td className="num">{formatCurrency(row.deliveryFees)}</td>
                            <td className="num">{formatCurrency(row.partnerFees)}</td>
                            <td className="num">{formatCurrency(row.refundAmount)}</td>
                            <td className="num">{formatCurrency(row.totalCommission ?? 0)}</td>
                            <td className="num">{formatCurrency(row.restaurantShare ?? 0)}</td>
                            <td className="num">{formatCurrency(row.counterpartyShare ?? 0)}</td>
                            <td className="num">{formatCurrency(row.netSettlement ?? row.netRevenue)}</td>
                            <td className="num bold">{formatCurrency(row.netRevenueAfterCostSharing ?? row.netRevenue)}</td>
                            <td className="num">{formatCurrency(row.averageOrderValue)}</td>
                            <td className="num">{row.cashOrderCount}</td>
                            <td className="num">{formatCurrency(row.cashRevenue)}</td>
                            <td className="num">{row.creditOrderCount}</td>
                            <td className="num">{formatCurrency(row.creditRevenue)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CategoryBreakdownTable({
    rows,
    ar,
    formatCurrency,
}: {
    rows: CategorySlice[];
    ar: boolean;
    formatCurrency: (value: number) => string;
}) {
    return (
        <div className="tbl-scroll">
            <table className="tbl">
                <thead>
                    <tr>
                        <th>{ar ? "النوع" : "Type"}</th>
                        <th>{ar ? "الطلبات" : "Orders"}</th>
                        <th>{ar ? "الإيراد" : "Revenue"}</th>
                        <th>{ar ? "النسبة" : "Percentage"}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label}>
                            <td className="bold">{ar ? (row.labelAr || row.label) : row.label}</td>
                            <td className="num">{row.count ?? 0}</td>
                            <td className="num">{formatCurrency(row.value)}</td>
                            <td className="num">{(row.percentage ?? 0).toFixed(1)}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function localizedName(row: { name: string; nameAr?: string | null }, ar: boolean) {
    return ar ? (row.nameAr?.trim() || row.name) : row.name;
}

function chartLabel(value: string) {
    return value.length > 12 ? `${value.slice(0, 11)}…` : value;
}

function downloadWorkbook(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `financial-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
