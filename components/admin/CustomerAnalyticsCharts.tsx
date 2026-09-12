"use client";

import type { ReactNode } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart as RechartsBarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
    CustomerAnalyticsBreakdown,
    CustomerAnalyticsPartnerBreakdown,
    CustomerAnalyticsPoint,
    CustomerAnalyticsSnapshot,
} from "@/lib/api-customer-management";

interface CustomerAnalyticsChartsProps {
    snapshot: CustomerAnalyticsSnapshot;
    isRtl: boolean;
}

const BLUE = "#0ea5e9";
const AMBER = "#f59e0b";
const GREEN = "#10b981";
const RED = "#ef4444";
const VIOLET = "#8b5cf6";
const COLORS = [BLUE, AMBER, GREEN, RED, VIOLET];

export function CustomerAnalyticsCharts({ snapshot, isRtl }: CustomerAnalyticsChartsProps) {
    const text = getChartText(isRtl);

    return (
        <section className="grid gap-4 xl:grid-cols-2" aria-label={text.charts}>
            <PointLineChart title={text.customerGrowth} description={text.customerGrowthDesc} data={snapshot.customerGrowth} isRtl={isRtl} valueLabel={text.newCustomers} color={BLUE} />
            <PointLineChart title={text.ordersTrend} description={text.ordersTrendDesc} data={snapshot.ordersTrend} isRtl={isRtl} valueLabel={text.orders} color={VIOLET} />
            <RevenueAreaChart title={text.revenueTrend} description={text.revenueTrendDesc} data={snapshot.revenueTrend} isRtl={isRtl} />
            <BreakdownDonut title={text.customerDistribution} description={text.customerDistributionDesc} data={snapshot.customerDistribution} isRtl={isRtl} />
            <PartnerBarChart title={text.partnerDistribution} description={text.partnerDistributionDesc} data={snapshot.partnerDistribution} isRtl={isRtl} />
            <PointLineChart title={text.customerRetention} description={text.customerRetentionDesc} data={snapshot.customerRetention} isRtl={isRtl} valueLabel={text.retentionRate} color={RED} />
        </section>
    );
}

function PointLineChart({
    title,
    description,
    data,
    isRtl,
    valueLabel,
    color,
}: {
    title: string;
    description: string;
    data: CustomerAnalyticsPoint[];
    isRtl: boolean;
    valueLabel: string;
    color: string;
}) {
    return (
        <ChartCard title={title} description={description} empty={data.length === 0} noDataText={getChartText(isRtl).noChartData}>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={mapPointSeries(data, isRtl)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={44} />
                    <Tooltip formatter={(value: number) => [formatNumber(value, isRtl), valueLabel]} />
                    <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

function RevenueAreaChart({
    title,
    description,
    data,
    isRtl,
}: {
    title: string;
    description: string;
    data: CustomerAnalyticsPoint[];
    isRtl: boolean;
}) {
    return (
        <ChartCard title={title} description={description} empty={data.length === 0} noDataText={getChartText(isRtl).noChartData}>
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={mapPointSeries(data, isRtl)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={44} />
                    <Tooltip formatter={(value: number) => formatNumber(value, isRtl)} />
                    <Area type="monotone" dataKey="value" stroke={GREEN} fill={GREEN} fillOpacity={0.16} />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

function BreakdownDonut({
    title,
    description,
    data,
    isRtl,
}: {
    title: string;
    description: string;
    data: CustomerAnalyticsBreakdown[];
    isRtl: boolean;
}) {
    const chartData = data.map((item, index) => ({
        name: (isRtl ? item.labelAr : item.label) || item.label,
        value: item.value,
        fill: COLORS[index % COLORS.length],
    }));

    return (
        <ChartCard title={title} description={description} empty={isBreakdownEmpty(data)} noDataText={getChartText(isRtl).noChartData}>
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={104} paddingAngle={2}>
                        {chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatNumber(value, isRtl)} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

function PartnerBarChart({
    title,
    description,
    data,
    isRtl,
}: {
    title: string;
    description: string;
    data: CustomerAnalyticsPartnerBreakdown[];
    isRtl: boolean;
}) {
    return (
        <ChartCard title={title} description={description} empty={data.length === 0} noDataText={getChartText(isRtl).noChartData}>
            <div dir="ltr">
                <ResponsiveContainer width="100%" height={280}>
                    <RechartsBarChart
                        layout="vertical"
                        data={mapPartnerSeries(data, isRtl)}
                        margin={isRtl ? { left: 16, right: 132 } : { left: 132, right: 16 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tickLine={false} axisLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            orientation={isRtl ? "right" : "left"}
                            width={120}
                            tickMargin={8}
                            tick={{ fontSize: 12, fill: "#475569" }}
                            interval={0}
                        />
                        <Tooltip formatter={(value: number) => formatNumber(value, isRtl)} />
                        <Legend />
                        <Bar dataKey="orders" name={getChartText(isRtl).orders} fill={AMBER} radius={[0, 4, 4, 0]} />
                        <Bar dataKey="customers" name={getChartText(isRtl).customers} fill={BLUE} radius={[0, 4, 4, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
}

function ChartCard({
    title,
    description,
    empty,
    noDataText,
    children,
}: {
    title: string;
    description: string;
    empty: boolean;
    noDataText: string;
    children: ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {empty ? (
                    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                        {noDataText}
                    </div>
                ) : children}
            </CardContent>
        </Card>
    );
}

function mapPointSeries(points: CustomerAnalyticsPoint[], isRtl: boolean) {
    return points.map((point) => ({
        date: formatChartDate(point.date, isRtl),
        value: point.value,
    }));
}

function mapPartnerSeries(points: CustomerAnalyticsPartnerBreakdown[], isRtl: boolean) {
    return points.map((point) => ({
        name: (isRtl ? point.nameAr : point.name) || point.name,
        customers: point.customers,
        orders: point.orders,
    }));
}

function isBreakdownEmpty(data: CustomerAnalyticsBreakdown[]) {
    return data.length === 0 || data.every((item) => item.value === 0);
}

function formatChartDate(value: string, isRtl: boolean) {
    return new Intl.DateTimeFormat(isRtl ? "ar-QA" : "en-GB", {
        day: "2-digit",
        month: "short",
    }).format(new Date(value));
}

function formatNumber(value: number, isRtl: boolean) {
    return new Intl.NumberFormat(isRtl ? "ar-QA" : "en-US", {
        maximumFractionDigits: 2,
    }).format(value);
}

function getChartText(isRtl: boolean) {
    return {
        charts: isRtl ? "رسوم تحليلات العملاء" : "Customer analytics charts",
        customerGrowth: isRtl ? "نمو العملاء" : "Customer Growth",
        customerGrowthDesc: isRtl ? "العملاء الجدد حسب التاريخ" : "New customers by date",
        ordersTrend: isRtl ? "اتجاه الطلبات" : "Orders Trend",
        ordersTrendDesc: isRtl ? "طلبات العملاء حسب التاريخ" : "Customer orders by date",
        revenueTrend: isRtl ? "اتجاه الإيرادات" : "Revenue Trend",
        revenueTrendDesc: isRtl ? "إيرادات العملاء حسب التاريخ" : "Customer revenue by date",
        customerDistribution: isRtl ? "توزيع العملاء" : "Customer Distribution",
        customerDistributionDesc: isRtl ? "عملاء مباشرون مقابل عملاء الشركاء" : "Direct versus partner customers",
        partnerDistribution: isRtl ? "توزيع الشركاء" : "Partner Distribution",
        partnerDistributionDesc: isRtl ? "الطلبات والعملاء حسب الشريك" : "Orders and customers by partner",
        customerRetention: isRtl ? "احتفاظ العملاء" : "Customer Retention",
        customerRetentionDesc: isRtl ? "نسبة العملاء العائدين يومياً" : "Daily returning customer percentage",
        newCustomers: isRtl ? "عملاء جدد" : "New Customers",
        orders: isRtl ? "طلبات" : "Orders",
        customers: isRtl ? "عملاء" : "Customers",
        retentionRate: isRtl ? "معدل الاحتفاظ" : "Retention Rate",
        noChartData: isRtl ? "لا توجد بيانات للرسم البياني" : "No chart data",
    };
}
