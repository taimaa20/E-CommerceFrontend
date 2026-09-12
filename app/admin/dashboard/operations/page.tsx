"use client";

import * as React from "react";
import { toast } from "sonner";
import {
    Flame, Check, Zap, DollarSign, Receipt, RotateCcw,
    AlertTriangle, Package, Printer,
} from "lucide-react";
import { downloadWorkbook } from "@/lib/dashboard/export";
import { DashboardTopbar } from "@/components/dashboard/chrome/DashboardTopbar";
import { DashboardFilterBar } from "@/components/dashboard/chrome/DashboardFilterBar";
import {
    KPI, Card, Pill, AreaChart, Donut, BarList, AlertRow,
    elapsedMMSS,
} from "@/components/dashboard/primitives";
import { useDashboardFilterStore } from "@/store/dashboardFilterStore";
import { useDashboardData } from "@/lib/dashboard/use-dashboard-data";
import { useDashboardRealtime } from "@/lib/dashboard/use-dashboard-realtime";
import { dashboardApi } from "@/lib/dashboard/dashboard-api";
import { getDashboardFilterLabel, withFilterLabel } from "@/lib/dashboard/filter-label";
import { orderStatusLabel } from "@/lib/dashboard/order-status-label";
import { useLocale } from "@/components/locale-provider";
import { usePosStore } from "@/store/posStore";
import type { PillColor } from "@/components/dashboard/primitives";
import { formatOrderSequence } from "@/lib/order-sequence";
import { formatRestaurantTime } from "@/lib/date-time";

const SCOPE = "Operations" as const;
const PAYMENT_PALETTE = [
    "var(--ds-primary)",
    "var(--ds-blue)",
    "var(--ds-green)",
    "var(--ds-purple)",
    "var(--ds-amber)",
    "var(--ds-red)",
];

export default function OperationsDashboardPage() {
    const { locale, t } = useLocale();
    const ar = locale === "ar";
    const { currency } = usePosStore();
    const filter = useDashboardFilterStore((s) => s.filters[SCOPE]);
    const { data, loading, refresh } = useDashboardData(dashboardApi.getOperations, filter);
    useDashboardRealtime(SCOPE, refresh);
    const periodLabel = getDashboardFilterLabel(filter, ar);

    const fmtCur = (v: number) => {
        const safe = Number.isFinite(v) ? v : 0; // never surface NaN/Infinity to users
        return new Intl.NumberFormat(undefined, {
            style: "currency", currency, maximumFractionDigits: safe >= 1000 ? 0 : 2,
        }).format(safe);
    };

    const orders = data?.orders;
    const revenue = data?.revenue;
    const health  = data?.health;
    const recent  = data?.recentOrders ?? [];
    const paymentOrderTypeBreakdown = revenue?.paymentOrderTypeBreakdown ?? [];
    const paymentBreakdown = revenue
        ? (revenue.paymentBreakdown?.length
            ? revenue.paymentBreakdown
            : [
                { label: "Cash", labelAr: "نقدي", value: revenue.cash, percentage: revenue.cashPercentage, count: 0 },
                { label: "Card", labelAr: "بطاقة", value: revenue.card, percentage: revenue.cardPercentage, count: 0 },
            ].filter((row) => row.value > 0))
        : [];
    const orderTypeSplit = data?.orderTypeSplit ?? [];
    const orderTypeCountTotal = orderTypeSplit.reduce((sum, row) => sum + (row.count ?? 0), 0);

    // All four pipeline tiles use the same windowed counters so they share one
    // scale. "New" = OrderCounters.Waiting (status New); previously it counted
    // only the New orders within the 12-row recent list, which under-reported.
    const counts = {
        new:        orders?.waiting ?? 0,
        preparing:  orders?.preparing ?? 0,
        ready:      orders?.ready ?? 0,
        stale:      orders?.staleOverThreshold ?? 0,
    };

    return (
        <>
            <DashboardTopbar
                title={ar ? "العمليات" : "Operations"}
                updatedAt={data?.generatedAtUtc}
                onRefresh={refresh}
                notificationCount={data?.alerts.length ?? null}
                onExport={async () => {
                    if (!data) { toast.error(ar ? "لا توجد بيانات" : "No data yet"); return; }
                    try {
                        const workbook = await dashboardApi.exportOperations(filter, currency);
                        downloadWorkbook(workbook, "operations-dashboard");
                        toast.success(ar ? "تم تصدير ملف Excel بالعربية والإنجليزية" : "Bilingual Excel workbook exported");
                    } catch {
                        toast.error(ar ? "تعذر تصدير ملف Excel" : "Excel export failed");
                    }
                }}
            />
            <DashboardFilterBar scope={SCOPE} />

            <div className="content">
                {/* TOP KPIs */}
                <div className="dashboard-auto-grid dashboard-kpi-grid">
                    <KPI label={withFilterLabel(ar ? "إجمالي الطلبات" : "Total orders", filter, ar)} icon={Receipt}
                         value={orders?.total ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-primary)"
                         foot={<><span>{ar ? "نشطة" : "Active"}</span><span className="num">{orders?.active ?? 0}</span></>} />
                    <KPI label={withFilterLabel(ar ? "الإيراد المؤكد" : "Confirmed revenue", filter, ar)} icon={DollarSign}
                         value={revenue ? fmtCur(revenue.confirmed) : "—"} loading={loading && !data}
                         sparkColor="var(--ds-green)"
                         foot={<><span>{ar ? "معلق" : "Pending"}</span><span className="num">{revenue ? fmtCur(revenue.pending) : "—"}</span></>} />
                    <KPI label={withFilterLabel(ar ? "طلبات مدفوعة" : "Paid orders", filter, ar)} icon={Check}
                         value={orders?.paid ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-green)"
                         foot={<><span>{ar ? "تم التقديم" : "Served"}</span><span className="num">{orders?.served ?? 0}</span></>} />
                    <KPI label={withFilterLabel(ar ? "متوسط زمن التحضير" : "Avg prep time", filter, ar)} icon={Zap}
                         value={health && health.prepOrderCount > 0 ? health.averagePrepMinutes.toFixed(1) : "—"}
                         unit={health && health.prepOrderCount > 0 ? (ar ? "د" : "min") : undefined} loading={loading && !data}
                         sparkColor="var(--ds-blue)"
                         foot={<><span>{ar ? "الهدف" : "Target"}</span><span className="num">12 min</span></>} />
                    <KPI label={withFilterLabel(ar ? "متوسط الطلب" : "Average order", filter, ar)} icon={Flame}
                         value={orders ? fmtCur(orders.averageOrderValue) : "—"} loading={loading && !data}
                         sparkColor="var(--ds-amber)"
                         foot={<><span>{ar ? "جاهزة" : "Ready"}</span><span className="num">{orders?.ready ?? 0}</span></>} />
                    <KPI label={withFilterLabel(ar ? "الإلغاءات" : "Cancellations", filter, ar)} icon={RotateCcw}
                         value={orders?.cancelled ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-red)" invertDelta
                         foot={<><span>{ar ? "مرتجعات" : "Refunded"}</span><span className="num">{orders?.refunded ?? 0}</span></>} />
                </div>

                <div className="dashboard-stack-layout" style={{ marginTop: 14 }}>
                    {/* LEFT: live pipeline */}
                    <div className="dashboard-main-stack">
                        <Card
                            title={ar ? "خط إنتاج الطلبات المباشر" : "Live order pipeline"}
                            subtitle={`${periodLabel} · ${ar ? "تدفق لحظي" : "Real-time flow"}`}
                        >
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                                {[
                                    { l: ar ? "جديدة" : "New",        n: counts.new,        c: "blue"  as PillColor },
                                    { l: ar ? "قيد التحضير" : "Preparing", n: counts.preparing, c: "amber" as PillColor },
                                    { l: ar ? "جاهزة" : "Ready",       n: counts.ready,      c: "green" as PillColor },
                                    { l: ar ? "متأخرة" : "Delayed",    n: counts.stale,      c: "red"   as PillColor },
                                ].map(s => (
                                    <div key={s.l} style={{ background: "var(--ds-bg-sunken)", borderRadius: 10, padding: "10px 12px" }}>
                                        <div style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>{s.l}</div>
                                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                                            <span className="num" style={{ fontSize: 20, fontWeight: 600 }}>{s.n}</span>
                                            <Pill color={s.c}>{s.l.toLowerCase()}</Pill>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {recent.length === 0
                                ? <div className="muted" style={{ fontSize: 12, padding: 24, textAlign: "center" }}>
                                    {loading ? "Loading…" : (ar ? "لا توجد طلبات" : "No orders yet")}
                                  </div>
                                : <div className="tbl-scroll">
                                    <table className="tbl">
                                        <thead>
                                            <tr>
                                                <th>{ar ? "الطلب" : "Order"}</th>
                                                <th>{ar ? "القناة / النوع" : "Channel / type"}</th>
                                                <th style={{ textAlign: "end" }}>{ar ? "الأصناف" : "Items"}</th>
                                                <th style={{ textAlign: "end" }}>{ar ? "الإجمالي" : "Total"}</th>
                                                <th>{ar ? "الحالة" : "Status"}</th>
                                                <th>{ar ? "الزمن المنقضي" : "Elapsed"}</th>
                                                <th>{ar ? "الكاشير" : "Cashier"}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recent.map((o, i) => (
                                                <tr key={o.id}>
                                                    <td style={{ fontFamily: "var(--ds-font-mono)", fontSize: 12 }}>{formatOrderSequence(o) ?? o.orderNumber}</td>
                                                    <td>{o.tableName}</td>
                                                    <td className="muted" style={{ textAlign: "end" }}>{o.itemCount}</td>
                                                    <td className="num bold" style={{ textAlign: "end" }}>{fmtCur(o.total)}</td>
                                                    <td><Pill color={o.tone as PillColor}>{orderStatusLabel(o.status, t)}</Pill></td>
                                                    <td className="num" style={{ color: o.tone === "red" ? "var(--ds-red-text)" : "inherit" }}>
                                                        {elapsedMMSS(o.elapsedSeconds)}
                                                    </td>
                                                    <td>{cashierLabel(o.cashier, o.cashierAr, ar, i)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>}
                        </Card>

                        <Card title={ar ? "معدل التجهيز" : "Fulfilment throughput"} subtitle={`${periodLabel} · ${ar ? "إيراد مؤكد" : "Confirmed revenue"}`}>
                            {(data?.hourlySeries ?? []).length === 0
                                ? <EmptyChart loading={loading} height={220} />
                                : <AreaChart
                                    height={220}
                                    showLegend={false}
                                    labels={data!.hourlySeries.map(p => formatRestaurantTime(
                                        p.bucketStartUtc,
                                        filter.timeZone ?? "Asia/Qatar",
                                        undefined,
                                        { hour: "2-digit", minute: undefined, hour12: false },
                                    ))}
                                    series={[{ name: "Revenue", data: data!.hourlySeries.map(p => p.value), color: "var(--ds-primary)" }]}
                                />}
                        </Card>
                    </div>

                    {/* RIGHT: alerts + revenue */}
                    <div className="dashboard-side-stack">
                        <Card
                            title={ar ? "إيرادات لحظية" : "Live revenue"}
                            subtitle={periodLabel}
                        >
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                                <MiniStat label={ar ? "إجمالي المبيعات" : "Gross sales"} value={revenue ? fmtCur(revenue.gross) : "—"} accent="var(--ds-blue)" />
                                <MiniStat label={ar ? "الخصومات" : "Discounts"} value={revenue ? fmtCur(revenue.discounts) : "—"} accent="var(--ds-amber)" />
                                <MiniStat label={ar ? "صافي المبيعات" : "Net sales"} value={revenue ? fmtCur(revenue.net) : "—"} accent="var(--ds-green)" />
                                <MiniStat label={ar ? "معلق" : "Pending"} value={revenue ? fmtCur(revenue.pending) : "—"} accent="var(--ds-amber)" />
                                {paymentBreakdown.map((row, index) => (
                                    <MiniStat
                                        key={`${row.label}-${index}`}
                                        label={ar ? (row.labelAr || row.label) : row.label}
                                        value={fmtCur(row.value)}
                                        sub={ar
                                            ? `${row.count ?? 0} طلب · ${row.percentage?.toFixed(0) ?? 0}% من الإيراد`
                                            : `${row.count ?? 0} orders · ${row.percentage?.toFixed(0) ?? 0}% of revenue`}
                                        accent={PAYMENT_PALETTE[index % PAYMENT_PALETTE.length]}
                                    />
                                ))}
                            </div>
                        </Card>

                        <Card
                            title={ar ? "تنبيهات مباشرة" : "Live alerts"}
                            subtitle={ar ? "تتطلب إجراء" : "Action required"}
                            action={
                                data?.alerts && data.alerts.length > 0
                                    ? <Pill color="amber">{data.alerts.length}</Pill> : null
                            }
                        >
                            {(data?.alerts ?? []).length === 0
                                ? <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>
                                    {ar ? "كل شيء على ما يرام" : "All clear"}
                                  </div>
                                : (
                                    <div className="scroll-list">
                                        {data!.alerts.map(a => (
                                            <AlertRow
                                                key={a.code}
                                                tone={a.severity === "danger" ? "red" : a.severity === "warning" ? "amber" : "blue"}
                                                icon={a.code === "LOW_STOCK" ? Package : a.code === "EXPIRY_SOON" ? AlertTriangle : Printer}
                                                title={a.titleKey === "dashboardAlertLowStock" ? (ar ? "مخزون منخفض" : "Low stock") : a.titleKey === "dashboardAlertExpirySoon" ? (ar ? "ينتهي قريباً" : "Expiring soon") : a.titleKey}
                                                meta={localizedOperationAlertMeta(a, ar)}
                                            />
                                        ))}
                                    </div>
                                )}
                        </Card>

                        <Card title={ar ? "نوع الطلب" : "Order type"} subtitle={periodLabel}>
                            {orderTypeSplit.filter(s => (s.count ?? 0) > 0).length === 0
                                ? <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>—</div>
                                : <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <Donut
                                        size={130} thickness={16}
                                        centerLabel={ar ? "مدفوع" : "Paid"}
                                        centerValue={orderTypeCountTotal.toString()}
                                        data={orderTypeSplit.map((s, i) => ({
                                            value: s.count ?? 0,
                                            color: i === 0 ? "var(--ds-primary)" : i === 1 ? "var(--ds-blue)" : "var(--ds-purple)",
                                        }))}
                                    />
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                                        {orderTypeSplit.map((s, i) => (
                                            <div key={s.label} className="between" style={{ fontSize: 12.5 }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: i === 0 ? "var(--ds-primary)" : i === 1 ? "var(--ds-blue)" : "var(--ds-purple)" }} />
                                                    <span>
                                                        <span>{orderTypeLabel(s.label, ar)}</span>
                                                        <span style={{ display: "block", color: "var(--ds-text-muted)", fontSize: 10.5 }}>{fmtCur(s.value)}</span>
                                                    </span>
                                                </span>
                                                <span><span className="num bold">{s.count ?? 0}</span>
                                                    <span style={{ color: "var(--ds-text-muted)", fontSize: 11, marginInlineStart: 4 }}>
                                                        {orderTypeCountTotal === 0 ? 0 : Math.round((s.count ?? 0) / orderTypeCountTotal * 100)}%
                                                    </span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>}
                        </Card>

                        <Card title={ar ? "طريقة الدفع × نوع الطلب" : "Payment method × order type"} subtitle={periodLabel}>
                            {paymentOrderTypeBreakdown.length === 0
                                ? <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>—</div>
                                : <div className="tbl-scroll">
                                    <table className="tbl">
                                        <thead>
                                            <tr>
                                                <th>{ar ? "نوع الطلب" : "Order type"}</th>
                                                <th>{ar ? "طريقة الدفع" : "Payment method"}</th>
                                                <th style={{ textAlign: "end" }}>{ar ? "الطلبات" : "Orders"}</th>
                                                <th style={{ textAlign: "end" }}>{ar ? "المبلغ" : "Amount"}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paymentOrderTypeBreakdown.map((row) => (
                                                <tr key={`${row.orderType}-${row.paymentMethod}`}>
                                                    <td>{orderTypeLabel(row.orderType, ar)}</td>
                                                    <td>{ar ? (row.paymentMethodAr || row.paymentMethod) : row.paymentMethod}</td>
                                                    <td className="num bold" style={{ textAlign: "end" }}>{row.count}</td>
                                                    <td className="num" style={{ textAlign: "end" }}>{fmtCur(row.value)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>}
                        </Card>

                        <Card title={ar ? "أعلى المنتجات" : "Top selling items"} subtitle={ar ? "ترتيب مباشر" : "Live ranking"}>
                            <BarList
                                color="var(--ds-blue)"
                                fmt={(v) => `${v} ${ar ? "مباع" : "sold"}`}
                                items={(data?.topProducts ?? []).map((p, i) => ({
                                    label: rankedLabel(p, ar, "صنف", i),
                                    sub: fmtCur(p.primaryValue),
                                    value: p.count ?? 0,
                                }))}
                            />
                        </Card>

                        <Card title={ar ? "حالة الجهاز" : "Device status"} subtitle={ar ? "الجلسات النشطة" : "Active sessions"}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                                <DeviceRow label={ar ? "الكاشيرات النشطة" : "Active cashiers"} value={health?.activeCashierSessions ?? 0} tone="green" />
                                <DeviceRow label={ar ? "الطلبات أونلاين" : "Online orders live"} value={health?.onlineOrdersLive ?? 0} tone={health && health.onlineOrdersLive > 5 ? "amber" : "green"} />
                                                                <DeviceRow label={ar ? "طابور التجهيز" : "Fulfilment queue"} value={health?.kitchenQueueLength ?? 0} tone={health && health.kitchenQueueLength > 10 ? "amber" : "green"} />
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─── small bits ─── */

function MiniStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
    return (
        <div style={{ padding: "10px 12px", background: "var(--ds-bg-sunken)", borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>{label}</div>
            <div className="num" style={{
                fontSize: 18, fontWeight: 600, letterSpacing: 0,
                color: accent ?? "var(--ds-text)", marginTop: 2,
            }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>{sub}</div>}
        </div>
    );
}

function rankedLabel(row: { label: string; labelAr?: string | null }, ar: boolean, fallbackPrefixAr?: string, index?: number) {
    if (!ar) return row.label;
    if (row.labelAr?.trim()) return row.labelAr;
    return fallbackPrefixAr ? `${fallbackPrefixAr} ${index === undefined ? "" : index + 1}`.trim() : row.label;
}

function cashierLabel(name: string | null, nameAr: string | null | undefined, ar: boolean, index: number) {
    if (!ar) return name ?? "—";
    return nameAr?.trim() || (name ? `كاشير ${index + 1}` : "—");
}

function orderTypeLabel(orderType: string, ar: boolean) {
    if (orderType === "DineIn") return ar ? "داخل المتجر" : "In-store";
    if (orderType === "Delivery") return ar ? "توصيل" : "Delivery";
    if (orderType === "Takeaway") return ar ? "استلام" : "Pickup";
    return orderType;
}

function localizedOperationAlertMeta(alert: { code: string; message?: string | null }, ar: boolean) {
    if (!ar) return alert.message ?? undefined;
    const message = alert.message?.trim();
    if (!message) return undefined;
    const count = Number(message.match(/(\d+)\s*$/)?.[1] ?? 0);
    const days = Number(message.match(/within\s+(\d+)\s+day/i)?.[1] ?? 3);
    if (alert.code === "LOW_STOCK" && count > 0) return `${count} صنفاً أقل من حد إعادة الطلب`;
    if (alert.code === "EXPIRY_SOON" && count > 0) return `${count} دفعة تنتهي خلال ${days} أيام`;
    if (alert.code === "LOW_STOCK") return "أصناف أقل من حد إعادة الطلب";
    if (alert.code === "EXPIRY_SOON") return "دفعات تنتهي قريباً";
    if (alert.code === "PRINTER_OFFLINE") return "تحقق من اتصال الطابعة";
    return undefined;
}

function DeviceRow({ label, value, tone }: { label: string; value: number | string; tone: "green" | "amber" | "red" }) {
    return (
        <div className="between">
            <span>{label}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="num" style={{ color: "var(--ds-text-secondary)", fontSize: 11.5 }}>{value}</span>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: `var(--ds-${tone})` }} />
            </span>
        </div>
    );
}

function EmptyChart({ loading, height = 220 }: { loading: boolean; height?: number }) {
    const compactHeight = loading ? Math.min(height, 140) : 88;
    return (
        <div style={{
            height: compactHeight, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ds-text-muted)", fontSize: 12,
            background: "var(--ds-bg-sunken)", borderRadius: 8,
        }}>{loading ? "Loading…" : "No data for this window"}</div>
    );
}
