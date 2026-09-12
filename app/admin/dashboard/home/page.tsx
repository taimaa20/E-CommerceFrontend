"use client";

import * as React from "react";
import { toast } from "sonner";
import {
    DollarSign, Receipt, Flame, TrendingUp, Trash2, AlertTriangle, Clock,
    Package, Printer, Check, ShoppingCart, User as UserIcon,
} from "lucide-react";
import { downloadWorkbook } from "@/lib/dashboard/export";
import { DashboardTopbar } from "@/components/dashboard/chrome/DashboardTopbar";
import { DashboardFilterBar } from "@/components/dashboard/chrome/DashboardFilterBar";
import {
    KPI, Card, Pill, AreaChart, BarChart, Donut, BarList, AlertRow, InitialAvatar,
    relativeTime,
} from "@/components/dashboard/primitives";
import { useDashboardFilterStore } from "@/store/dashboardFilterStore";
import { useDashboardData } from "@/lib/dashboard/use-dashboard-data";
import { useDashboardRealtime } from "@/lib/dashboard/use-dashboard-realtime";
import { dashboardApi } from "@/lib/dashboard/dashboard-api";
import { getDashboardFilterLabel, withFilterLabel, withLiveLabel } from "@/lib/dashboard/filter-label";
import { useLocale } from "@/components/locale-provider";
import { usePosStore } from "@/store/posStore";
import { formatRestaurantDate, formatRestaurantTime } from "@/lib/date-time";

const SCOPE = "Operations" as const;   // reuses the operations filter slot for the home view

// Palette cycled across configurable payment methods (Cash, Visa, InstaPay, Vodafone Cash, CliQ, ...).
const PAYMENT_PALETTE = [
    "var(--ds-primary)",
    "var(--ds-blue)",
    "var(--ds-green)",
    "var(--ds-purple)",
    "var(--ds-amber)",
    "var(--ds-red)",
];

export default function HomeDashboardPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const { currency } = usePosStore();
    const filter = useDashboardFilterStore((s) => s.filters[SCOPE]);
    const { data, loading, error, refresh } = useDashboardData(dashboardApi.getHome, filter);
    const periodLabel = getDashboardFilterLabel(filter, ar);

    useDashboardRealtime(SCOPE, refresh);

    const headline = data?.headline;
    const fmtCur = (v: number) => {
        const safe = Number.isFinite(v) ? v : 0; // never surface NaN/Infinity to users
        return new Intl.NumberFormat(undefined, {
            style: "currency", currency, maximumFractionDigits: safe >= 1000 ? 0 : 2,
        }).format(safe);
    };

    const revenueTrendSeries = data?.revenueTrend ?? [];
    const hourlyOrders = data?.hourlyOrders ?? [];
    const paymentSplit = data?.paymentSplit ?? [];
    const orderTypeSplit = data?.orderTypeSplit ?? [];
    const topCashiers = data?.topCashiers ?? [];
    const topProducts = data?.topProducts ?? [];
    const alerts = data?.alerts ?? [];
    const recentActivity = data?.recentActivity ?? [];
    const hasPaymentSplit = paymentSplit.some(s => s.value > 0);
    const hasOrderTypeSplit = orderTypeSplit.some(s => s.value > 0);

    return (
        <>
            <DashboardTopbar
                title={ar ? "نظرة عامة" : "Overview"}
                updatedAt={data?.generatedAtUtc}
                onRefresh={refresh}
                notificationCount={alerts.length || null}
                onExport={async () => {
                    if (!data) { toast.error(ar ? "لا توجد بيانات" : "No data yet"); return; }
                    try {
                        const workbook = await dashboardApi.exportHome(filter, currency);
                        downloadWorkbook(workbook, "home-dashboard");
                        toast.success(ar ? "تم تصدير ملف Excel بالعربية والإنجليزية" : "Bilingual Excel workbook exported");
                    } catch {
                        toast.error(ar ? "تعذر تصدير ملف Excel" : "Excel export failed");
                    }
                }}
            />
            <DashboardFilterBar scope={SCOPE} />

            <div className="content">
                {error && (
                    <div className="dashboard-error-strip">
                        {ar ? "تعذر تحميل بيانات النظرة العامة. تحقق من الاتصال ثم أعد التحديث." : "Overview dashboard data could not load. Check the connection, then refresh."}
                    </div>
                )}

                {/* TOP KPI ROW */}
                <div className="dashboard-auto-grid dashboard-kpi-grid">
                    <KPI label={withFilterLabel(ar ? "الإيرادات" : "Revenue", filter, ar)} icon={DollarSign}
                         value={headline ? fmtCur(headline.revenueToday) : "—"}
                         loading={loading && !data}
                         sparkColor="var(--ds-green)"
                         foot={<><span>{ar ? "متوسط الطلب" : "AOV"}</span>
                                 <span className="num">{headline ? fmtCur(headline.averageOrderValue) : "—"}</span></>} />

                    <KPI label={withFilterLabel(ar ? "الطلبات" : "Orders", filter, ar)} icon={Receipt}
                         value={headline?.ordersToday ?? "—"}
                         loading={loading && !data}
                         sparkColor="var(--ds-blue)"
                         foot={<><span>{ar ? "نشطة" : "Active"}</span>
                                 <span className="num">{headline?.activeOrders ?? "—"}</span></>} />

                    <KPI label={withLiveLabel(ar ? "طلبات نشطة" : "Active orders", ar)} icon={Flame}
                         value={headline?.activeOrders ?? "—"}
                         loading={loading && !data}
                         sparkColor="var(--ds-primary)"
                         foot={<><span>{ar ? "متأخرة > ١٥ دقيقة" : "Stale > 15 min"}</span>
                                 <span className="num">{headline?.staleOrders ?? 0}</span></>} />

                    <KPI label={withFilterLabel(ar ? "صافي الربح" : "Net profit", filter, ar)} icon={TrendingUp}
                         value={headline ? fmtCur(headline.netProfit) : "—"}
                         loading={loading && !data}
                         sparkColor="var(--ds-green)"
                         foot={<><span>{ar ? "الهامش" : "Margin"}</span>
                                 <span className="num">{headline?.marginPercent.toFixed(1) ?? "—"}%</span></>} />

                    <KPI label={withFilterLabel(ar ? "تكلفة الهدر" : "Waste cost", filter, ar)} icon={Trash2}
                         value={headline ? fmtCur(headline.wasteCost) : "—"}
                         loading={loading && !data}
                         sparkColor="var(--ds-amber)"
                         foot={<><span>{ar ? "من الإيراد" : "of revenue"}</span>
                                 <span className="num">{headline?.wastePercent.toFixed(1) ?? "—"}%</span></>} />

                </div>

                <div className="dashboard-overview-layout" style={{ marginTop: 14 }}>
                    <div className="dashboard-main-stack">
                        {alerts.length > 0 && (
                            <Card
                                title={ar ? "تنبيهات لحظية" : "Real-time alerts"}
                                subtitle={ar ? "تتطلب إجراء" : "Action required"}
                                action={
                                    <Pill color={alerts.some(a => a.severity === "red" || a.severity === "danger") ? "red" : "amber"}>
                                        {alerts.length}
                                    </Pill>
                                }
                            >
                                <div className="scroll-list">
                                    {alerts.map((a, i) => (
                                        <AlertRow
                                            key={dashboardAlertKey(a, i)}
                                            tone={mapSeverityTone(a.severity)}
                                            icon={iconForAlert(a.code)}
                                            title={localizedAlertTitle(a, ar)}
                                            meta={localizedAlertMeta(a, ar)}
                                            time={relativeTime(a.occurredAtUtc, ar ? "ar" : "en")}
                                        />
                                    ))}
                                </div>
                            </Card>
                        )}

                        {topProducts.length > 0 && (
                            <Card
                                title={ar ? "أعلى المنتجات" : "Top products"}
                                subtitle={ar ? "حسب الإيرادات" : "By revenue"}
                            >
                                <BarList
                                    color="var(--ds-primary)"
                                    fmt={(v) => fmtCur(v)}
                                    items={topProducts.map((p, i) => ({
                                        label: rankedLabel(p, ar, "صنف", i),
                                        sub: `${p.count ?? 0} ${ar ? "مباع" : "sold"}`,
                                        value: p.primaryValue,
                                    }))}
                                />
                            </Card>
                        )}

                        {topCashiers.length > 0 && (
                            <Card
                                title={ar ? "أعلى الكاشيرات" : "Top cashiers"}
                                subtitle={ar ? "حسب الإيرادات" : "By revenue"}
                            >
                                <div className="scroll-list scroll-list-sm" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {topCashiers.map((c, i) => {
                                        const label = rankedLabel(c, ar, "كاشير", i);
                                        return (
                                            <div key={(c.id ?? "") + i} className="between">
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                                    <InitialAvatar name={label} size={28} hue={[27, 200, 280, 140, 60][i % 5]} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 550, lineHeight: 1.2 }}>{label}</div>
                                                        <div style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>{c.count ?? 0} {ar ? "طلب" : "orders"}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: "end" }}>
                                                    <div className="num" style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtCur(c.primaryValue)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}

                        <Card
                            title={ar ? "اتجاه الإيرادات" : "Revenue trend"}
                            subtitle={`${periodLabel} · ${ar ? "الإيراد المؤكد" : "Confirmed revenue"}`}
                        >
                            {revenueTrendSeries.length === 0
                                ? <EmptyChart loading={loading} ar={ar} />
                                : <AreaChart
                                    height={240}
                                    showLegend={false}
                                    labels={revenueTrendSeries.map(p => formatRestaurantDate(
                                        p.bucketStartUtc,
                                        filter.timeZone ?? "Asia/Qatar",
                                        undefined,
                                        { month: "short", day: "2-digit", year: undefined },
                                    ))}
                                    series={[{
                                        name: ar ? "الإيرادات" : "Revenue",
                                        data: revenueTrendSeries.map(p => p.value),
                                        color: "var(--ds-primary)",
                                    }]}
                                />}
                        </Card>
                        <Card
                            title={ar ? "الطلبات حسب الساعة" : "Orders by hour"}
                            subtitle={`${periodLabel} · ${ar ? "مباشر" : "live"}`}
                            action={<span className="num" style={{ color: "var(--ds-text-muted)" }}>
                                {formatRestaurantTime(new Date(), filter.timeZone ?? "Asia/Qatar")}
                            </span>}
                        >
                            {hourlyOrders.length === 0
                                ? <EmptyChart loading={loading} height={200} ar={ar} />
                                : <>
                                    <BarChart
                                        height={200}
                                        color="var(--ds-primary)"
                                        labels={hourlyOrders.map(p => formatRestaurantTime(
                                            p.bucketStartUtc,
                                            filter.timeZone ?? "Asia/Qatar",
                                            undefined,
                                            { hour: "2-digit", minute: undefined, hour12: false },
                                        ))}
                                        data={hourlyOrders.map(p => p.count ?? 0)}
                                    />
                                    <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 11.5, color: "var(--ds-text-muted)" }}>
                                        <span>{ar ? "ذروة" : "Peak hour"} <span className="num" style={{ color: "var(--ds-text)" }}>
                                            {(() => {
                                                const peak = [...hourlyOrders].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))[0];
                                                return peak ? `${formatRestaurantTime(
                                                    peak.bucketStartUtc,
                                                    filter.timeZone ?? "Asia/Qatar",
                                                    undefined,
                                                    { hour: "2-digit", minute: undefined, hour12: false },
                                                )} · ${peak.count} ${ar ? "طلب" : "orders"}` : "—";
                                            })()}
                                        </span></span>
                                    </div>
                                </>}
                        </Card>
                    </div>

                    <div className="dashboard-side-stack">
                        {hasPaymentSplit && (
                            <Card
                                title={ar ? "تقسيم الدفع" : "Payment split"}
                                subtitle={periodLabel}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <Donut
                                        size={128} thickness={16}
                                        centerLabel={ar ? "الإجمالي" : "Total"}
                                        centerValue={fmtCur(paymentSplit.reduce((s, x) => s + x.value, 0))}
                                        data={paymentSplit.map((s, i) => ({
                                            value: s.value,
                                            color: PAYMENT_PALETTE[i % PAYMENT_PALETTE.length],
                                        }))}
                                    />
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                                        {paymentSplit.map((s, i) => (
                                            <div key={categorySliceKey(s, i)} className="between" style={{ fontSize: 12.5 }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: PAYMENT_PALETTE[i % PAYMENT_PALETTE.length] }} />
                                                    {ar ? (s.labelAr || s.label) : s.label}
                                                </span>
                                                <span><span className="num bold">{fmtCur(s.value)}</span>
                                                    <span style={{ color: "var(--ds-text-muted)", fontSize: 11, marginLeft: 4 }}>
                                                        {s.percentage?.toFixed(1) ?? 0}%
                                                    </span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {hasOrderTypeSplit && (
                            <Card
                                title={ar ? "نوع الطلب" : "Order type"}
                                subtitle={ar ? "حسب العدد" : "By count"}
                            >
                                {orderTypeSplit.map((s, i) => (
                                    <div key={categorySliceKey(s, i)} style={{ marginBottom: i === orderTypeSplit.length - 1 ? 0 : 10 }}>
                                        <div className="between" style={{ marginBottom: 4, fontSize: 12.5 }}>
                                            <span>{s.label === "DineIn" ? (ar ? "داخل المتجر" : "In-store") : s.label === "Takeaway" ? (ar ? "استلام" : "Pickup") : s.label === "Delivery" ? (ar ? "توصيل" : "Delivery") : s.label}</span>
                                            <span><span className="num bold">{s.value}</span>
                                                <span style={{ color: "var(--ds-text-muted)", fontSize: 11, marginLeft: 4 }}>
                                                    {s.percentage?.toFixed(0) ?? 0}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="bar"><div className="bar-fill" style={{ width: `${s.percentage ?? 0}%`, background: i === 0 ? "var(--ds-primary)" : "var(--ds-blue)" }} /></div>
                                    </div>
                                ))}
                            </Card>
                        )}

                        {recentActivity.length > 0 && (
                            <Card
                                title={ar ? "النشاط الأخير" : "Recent activity"}
                                subtitle={ar ? "أحداث النظام" : "System events"}
                            >
                                <div className="scroll-list">
                                    {recentActivity.map((act, i) => (
                                        <AlertRow
                                            key={i}
                                            tone={act.tone}
                                            icon={iconForActivity(act.kind)}
                                            title={act.title}
                                            meta={act.meta ?? undefined}
                                            time={relativeTime(act.occurredAtUtc, ar ? "ar" : "en")}
                                        />
                                    ))}
                                </div>
                            </Card>
                        )}

                        {!loading && data && !hasPaymentSplit && !hasOrderTypeSplit && topCashiers.length === 0 && topProducts.length === 0 && alerts.length === 0 && recentActivity.length === 0 && (
                            <div className="dashboard-empty-strip">
                                {ar ? `لا توجد تفاصيل إضافية لهذه الفترة: ${periodLabel}` : `No additional details for ${periodLabel}`}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

/* ───────── helpers ───────── */

function mapSeverityTone(sev: string): "neutral" | "green" | "red" | "amber" | "blue" | "purple" {
    if (sev === "danger" || sev === "red") return "red";
    if (sev === "warning" || sev === "amber") return "amber";
    if (sev === "info") return "blue";
    return "neutral";
}

function rankedLabel(row: { label: string; labelAr?: string | null }, ar: boolean, fallbackPrefixAr?: string, index?: number) {
    if (!ar) return row.label;
    if (row.labelAr?.trim()) return row.labelAr;
    return fallbackPrefixAr ? `${fallbackPrefixAr} ${index === undefined ? "" : index + 1}`.trim() : row.label;
}

function localizedAlertTitle(alert: { code: string; title: string; titleAr?: string | null }, ar: boolean) {
    if (!ar) return alert.title;
    if (alert.titleAr?.trim()) return alert.titleAr;
    if (alert.code === "LOW_STOCK") return "مخزون منخفض";
    if (alert.code === "EXPIRY_SOON") return "ينتهي قريباً";
    if (alert.code === "STALE_ORDER") return "طلب متأخر";
    if (alert.code === "PRINTER_OFFLINE") return "الطابعة غير متصلة";
    return alert.title;
}

function localizedAlertMeta(alert: { code: string; meta?: string | null; metaAr?: string | null }, ar: boolean) {
    if (!ar) return alert.meta ?? undefined;
    if (alert.metaAr?.trim()) return alert.metaAr;
    const meta = alert.meta?.trim();
    if (!meta) return undefined;
    const count = Number(meta.match(/(\d+)\s*$/)?.[1] ?? 0);
    const days = Number(meta.match(/within\s+(\d+)\s+day/i)?.[1] ?? 3);
    if (alert.code === "LOW_STOCK" && count > 0) return `${count} صنفاً أقل من حد إعادة الطلب`;
    if (alert.code === "EXPIRY_SOON" && count > 0) return `${count} دفعة تنتهي خلال ${days} أيام`;
    if (alert.code === "LOW_STOCK") return "أصناف أقل من حد إعادة الطلب";
    if (alert.code === "EXPIRY_SOON") return "دفعات تنتهي قريباً";
    if (alert.code === "STALE_ORDER") return "طلب يحتاج متابعة";
    if (alert.code === "PRINTER_OFFLINE") return "تحقق من اتصال الطابعة";
    return undefined;
}

function iconForAlert(code: string) {
    if (code === "STALE_ORDER") return Clock;
    if (code === "LOW_STOCK") return Package;
    if (code === "EXPIRY_SOON") return AlertTriangle;
    if (code === "PRINTER_OFFLINE") return Printer;
    return AlertTriangle;
}
function iconForActivity(kind: string) {
    if (kind === "OrderPaid") return Check;
    if (kind === "WasteLogged") return Trash2;
    if (kind === "OrderCancelled") return AlertTriangle;
    if (kind === "ShiftClosed") return UserIcon;
    return ShoppingCart;
}

function dashboardAlertKey(
    alert: { code: string; occurredAtUtc: string; title: string; meta?: string | null },
    index: number,
) {
    return [alert.code, alert.occurredAtUtc, alert.title, alert.meta ?? "", index].join(":");
}

function categorySliceKey(
    slice: { label: string; labelAr?: string | null; value: number; count?: number | null },
    index: number,
) {
    return [slice.label, slice.labelAr ?? "", slice.value, slice.count ?? "", index].join(":");
}

function EmptyChart({ loading, height = 240, ar = false }: { loading: boolean; height?: number; ar?: boolean }) {
    const compactHeight = loading ? Math.min(height, 140) : 88;
    return (
        <div style={{
            height: compactHeight, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ds-text-muted)", fontSize: 12,
            background: "var(--ds-bg-sunken)", borderRadius: 8,
        }}>
            {loading ? (ar ? "جار التحميل..." : "Loading...") : (ar ? "لا توجد بيانات لهذه الفترة" : "No data for this window")}
        </div>
    );
}
