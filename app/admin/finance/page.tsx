"use client";

import React, { useEffect, useState } from "react";
import { format, subDays, startOfMonth, startOfWeek, subMonths, startOfYear, subYears, isSameDay } from "date-fns";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    AlertTriangle,
    PieChart,
    CalendarIcon,
    ArrowUpRight,
    ArrowDownRight,
    Minus
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDetailedAnalysis, DetailedReportResponse } from "@/lib/api-finance";
import { usePosStore } from "@/store/posStore";
import { useLocale } from "@/components/locale-provider";

export default function FinanceDashboard() {
    const { t } = useLocale()
    const { currency } = usePosStore()
    const [report, setReport] = useState<DetailedReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("month"); // 'today', 'week', 'month', 'year'

    // Initial Date Range: This Month
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
        start: startOfMonth(new Date()),
        end: new Date()
    });

    useEffect(() => {
        handlePeriodChange("month"); // Default load
    }, []);

    useEffect(() => {
        if (dateRange) {
            loadReport();
        }
    }, [dateRange]);

    const handlePeriodChange = (val: string) => {
        setPeriod(val);
        const now = new Date();
        let start = now;
        let end = now;

        switch (val) {
            case "today":
                start = now;
                end = now;
                break;
            case "yesterday":
                start = subDays(now, 1);
                end = subDays(now, 1);
                break;
            case "week":
                start = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
                end = now;
                break;
            case "month":
                start = startOfMonth(now);
                end = now;
                break;
            case "last_month":
                start = startOfMonth(subMonths(now, 1));
                end = subDays(startOfMonth(now), 1); // End of last month
                break;
            case "year":
                start = startOfYear(now);
                end = now;
                break;
            default:
                break;
        }

        setDateRange({ start, end });
    };

    const loadReport = async () => {
        setLoading(true);
        // Format dates as YYYY-MM-DD
        // Add 1 day to end date to ensure full coverage in backend strictly slightly hacky but effective for simple dbs
        // Actually the backend handles "end of day" logic if we send just date part, let's rely on backend 'end' logic which accepts date parts.
        // Wait, backend logic: var end = endDate?.Date.AddDays(1).AddTicks(-1)
        // So sending '2023-10-25' as end date covers the whole day.

        const startStr = format(dateRange.start, 'yyyy-MM-dd');
        const endStr = format(dateRange.end, 'yyyy-MM-dd');

        const data = await getDetailedAnalysis(startStr, endStr);
        setReport(data);
        setLoading(false);
    };

    // Format Helpers
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val);

    const formatPercent = (val: number) =>
        `%${val.toFixed(1)}`;

    if (loading && !report) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
                <p className="mt-4 text-slate-500">{t("analyzingFinancialData")}</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="p-8 text-center text-destructive">
                {t("couldntLoadData")}
                <Button onClick={() => loadReport()} variant="link">{t("retryBtn")}</Button>
            </div>
        );
    }

    const { currentPeriod, comparison } = report;

    // Filter Alerts (Margin < 20%)
    const lowMarginProducts = currentPeriod.productPerformance
        .filter(p => p.marginPercentage < 20)
        .sort((a, b) => a.marginPercentage - b.marginPercentage);

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">

            <div className="container mx-auto p-2 lg:p-6 space-y-8 max-w-7xl">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("financeDashboardTitle")}</h1>
                        <p className="text-slate-500">
                            {t("financeDashboardSubtitle")}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="flex items-center gap-2 bg-white p-1 rounded-md border shadow-sm">
                            <CalendarIcon className="w-4 h-4 text-slate-400 ms-2" />
                            <span className="text-xs text-slate-600 font-medium me-2">
                                {format(dateRange.start, 'd MMM')} - {format(dateRange.end, 'd MMM yyyy')}
                            </span>
                        </div>

                        <Select value={period} onValueChange={handlePeriodChange}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">{t("today")}</SelectItem>
                                <SelectItem value="yesterday">{t("yesterday")}</SelectItem>
                                <SelectItem value="week">{t("thisWeek")}</SelectItem>
                                <SelectItem value="month">{t("thisMonth")}</SelectItem>
                                <SelectItem value="last_month">{t("lastMonth")}</SelectItem>
                                <SelectItem value="year">{t("thisYear")}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button onClick={loadReport} variant="outline" size="icon" title={t("refreshBtn")}>
                            <TrendingUp className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        title={t("totalRevenue")}
                        value={formatCurrency(currentPeriod.totalRevenue)}
                        icon={<DollarSign className="text-info" />}
                        trend={comparison.revenueChangePercentage}
                        description={t("comparedToPrev")}
                    />
                    <KpiCard
                        title={t("cogsLabel")}
                        value={formatCurrency(currentPeriod.totalInfoCost)}
                        icon={<PieChart className="text-primary" />}
                        trend={comparison.costChangePercentage}
                        description={t("costOfGoodsSold")}
                        inverseTrend
                    />
                    <KpiCard
                        title={t("netProfitLabel")}
                        value={formatCurrency(currentPeriod.totalNetProfit)}
                        icon={<TrendingUp className="text-success" />}
                        valueColor="text-success"
                        trend={comparison.netProfitChangePercentage}
                        description={t("netEarnings")}
                    />
                    <KpiCard
                        title={t("avgMarginLabel")}
                        value={formatPercent(currentPeriod.totalMarginPercentage)}
                        icon={currentPeriod.totalMarginPercentage < 20 ? <TrendingDown className="text-destructive" /> : <TrendingUp className="text-success" />}
                        description={t("target30pct")}
                        valueColor={currentPeriod.totalMarginPercentage < 20 ? "text-destructive" : "text-slate-900"}
                        trend={comparison.marginChangePercentage}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Chart */}
                    <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle>{t("revenueCostAnalysis")}</CardTitle>
                            <CardDescription>
                                {period === 'today' ? t("hourlyLabel") : t("dailyLabel")} {t("incomeVsExpense")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={currentPeriod.dailyStats}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(str) => format(new Date(str), 'd MMM')}
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickFormatter={(val) => formatCurrency(val)}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: number) => formatCurrency(val)}
                                        labelFormatter={(label) => format(new Date(label), 'd MMMM yyyy')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        name={t("revenueLabel")}
                                        stroke="#22c55e"
                                        fillOpacity={1}
                                        fill="url(#colorRev)"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="cost"
                                        name={t("costLabel")}
                                        stroke="#f97316"
                                        fillOpacity={1}
                                        fill="url(#colorCost)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Alerts Table */}
                    <Card className="shadow-sm border-destructive/10 bg-destructive/5">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <CardTitle className="text-destructive">{t("criticalMarginWarnings")}</CardTitle>
                            </div>
                            <CardDescription className="text-destructive/80">
                                {t("criticalMarginDesc")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {lowMarginProducts.length === 0 ? (
                                    <div className="text-sm text-success flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        {t("allProductsPerforming")}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {lowMarginProducts.slice(0, 5).map(prod => (
                                            <div key={prod.productId} className="flex items-center justify-between bg-white p-3 rounded-lg border border-destructive/10 shadow-sm">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-900 truncate">{prod.productName}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {t("costColon")} {formatCurrency(prod.unitCost)}
                                                    </p>
                                                </div>
                                                <div className="text-end">
                                                    <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20 font-bold">
                                                        {formatPercent(prod.marginPercentage)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {lowMarginProducts.length > 5 && (
                                            <p className="text-xs text-center text-destructive pt-2">
                                                {t("andMoreLabel")} {lowMarginProducts.length - 5} {t("moreText")}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}

// KPI Card Component
function KpiCard({ title, value, icon, description, trend, valueColor = "text-slate-900", inverseTrend = false }: any) {
    const isPositive = trend > 0;
    const isNeutral = trend === 0;

    // Determine color based on trend and whether it's 'inverse' (e.g. costs going up is bad)
    // Regular: Up = Green (Good), Down = Red (Bad)
    // Inverse: Up = Red (Bad), Down = Green (Good)

    let trendColor = "text-slate-500";
    let Icon = Minus;

    if (!isNeutral) {
        if (inverseTrend) {
            trendColor = isPositive ? "text-destructive" : "text-emerald-600";
        } else {
            trendColor = isPositive ? "text-emerald-600" : "text-destructive";
        }
        Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    }

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
                <div className="flex items-center mt-1 gap-2">
                    {!isNeutral && (
                        <div className={`flex items-center text-xs font-medium ${trendColor}`}>
                            <Icon className="w-3 h-3 me-1" />
                            {Math.abs(trend)}%
                        </div>
                    )}
                    {description && (
                        <p className="text-xs text-slate-400">{description}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
