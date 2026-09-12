"use client";

import * as React from "react";
import { toast } from "sonner";
import {
    RotateCcw, AlertTriangle, X, Package, Clock, Shield, Eye,
} from "lucide-react";
import { DashboardTopbar } from "@/components/dashboard/chrome/DashboardTopbar";
import { DashboardFilterBar } from "@/components/dashboard/chrome/DashboardFilterBar";
import {
    KPI, Card, Pill, AreaChart, BarChart, BarList, AlertRow, InitialAvatar,
} from "@/components/dashboard/primitives";
import { useDashboardFilterStore } from "@/store/dashboardFilterStore";
import { useDashboardData } from "@/lib/dashboard/use-dashboard-data";
import { dashboardApi } from "@/lib/dashboard/dashboard-api";
import { getDashboardFilterLabel, withFilterLabel } from "@/lib/dashboard/filter-label";
import { useLocale } from "@/components/locale-provider";
import { usePosStore } from "@/store/posStore";
import { formatRestaurantDate } from "@/lib/date-time";

const SCOPE = "Audit" as const;

export default function AuditDashboardPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const { currency } = usePosStore();
    const filter = useDashboardFilterStore((s) => s.filters[SCOPE]);
    const { data, loading, refresh } = useDashboardData(dashboardApi.getAudit, filter);
    const periodLabel = getDashboardFilterLabel(filter, ar);

    const fmtCur = (v: number) => new Intl.NumberFormat(undefined, {
        style: "currency", currency, maximumFractionDigits: v >= 1000 ? 0 : 2,
    }).format(v);

    const counters = data?.counters;
    // Composite "anomaly score" — light client-side computation purely for
    // visual ranking. The real values are server-side rankings; this just
    // turns them into a 0–10 score per employee.
    const empAnomaly = React.useMemo(() => {
        if (!data) return [];
        const map = new Map<string, { label: string; labelAr?: string | null; ref: number; can: number; dis: number; ed: number; }>();
        const merge = (rows: { id?: string | null; label: string; labelAr?: string | null; count?: number | null }[], key: "ref" | "can" | "dis" | "ed") => {
            for (const r of rows) {
                const k = (r.id ?? r.label);
                const prev = map.get(k) ?? { label: r.label, labelAr: r.labelAr, ref: 0, can: 0, dis: 0, ed: 0 };
                if (!prev.labelAr && r.labelAr) prev.labelAr = r.labelAr;
                prev[key] = (r.count ?? 0) + prev[key];
                map.set(k, prev);
            }
        };
        merge(data.refundsByEmployee, "ref");
        merge(data.cancellationsByEmployee, "can");
        merge(data.discountsByEmployee, "dis");
        merge(data.manualStockReductions, "ed");
        const max = (k: "ref" | "can" | "dis" | "ed") =>
            Math.max(1, ...Array.from(map.values()).map(v => v[k]));
        const maxRef = max("ref"), maxCan = max("can"), maxDis = max("dis"), maxEd = max("ed");
        return Array.from(map.entries())
            .map(([id, v]) => {
                const score = Math.round(((v.ref / maxRef) * 2.5 + (v.can / maxCan) * 3 + (v.dis / maxDis) * 2 + (v.ed / maxEd) * 2.5) * 10) / 10;
                const tone = score >= 6 ? "red" as const : score >= 3.5 ? "amber" as const : "green" as const;
                const status = score >= 6 ? (ar ? "خطر عالٍ" : "High risk")
                              : score >= 3.5 ? (ar ? "تحت المراقبة" : "Watch")
                              : (ar ? "طبيعي" : "Normal");
                return { id, label: v.label, labelAr: v.labelAr, ref: v.ref, can: v.can, dis: v.dis, ed: v.ed, score, tone, status };
            })
            .sort((a, b) => b.score - a.score);
    }, [data, ar]);

    return (
        <>
            <DashboardTopbar
                title={ar ? "التدقيق والأمان" : "Audit & Security"}
                updatedAt={data?.generatedAtUtc}
                onRefresh={refresh}
                live={false}
                onExport={() => {
                    if (!data) { toast.error(ar ? "لا توجد بيانات" : "No data yet"); return; }
                    // import helper lazily so audit doesn't pay the cost when never exported
                    import("@/lib/dashboard/export").then(m => {
                        m.exportSnapshotToCsv(data, filter, "audit");
                        toast.success(ar ? "تم تصدير التدقيق" : "Audit snapshot exported");
                    });
                }}
            />
            <DashboardFilterBar scope={SCOPE} showPaymentMethod={false} showOrderType={false} />

            <div className="content">
                {/* Top KPIs */}
                <div className="dashboard-auto-grid dashboard-kpi-grid">
                    <KPI label={withFilterLabel(ar ? "المرتجعات" : "Refunds", filter, ar)} icon={RotateCcw}
                         value={counters?.totalRefunds ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-red)" invertDelta
                         foot={<><span>{ar ? "الإجمالي" : "Total"}</span>
                                 <span className="num">{counters ? fmtCur(counters.totalRefundAmount) : "—"}</span></>} />
                    <KPI label={withFilterLabel(ar ? "خصومات مشبوهة" : "Suspicious discounts", filter, ar)} icon={AlertTriangle}
                         value={data?.discountsByEmployee.length ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-amber)" invertDelta />
                    <KPI label={withFilterLabel(ar ? "إلغاءات غير طبيعية" : "Abnormal cancels", filter, ar)} icon={X}
                         value={counters?.totalCancellations ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-red)" invertDelta
                         foot={<><span>{ar ? "بعد الدفع" : "Post-payment"}</span>
                                 <span className="num">{counters?.cancelledAfterPayment ?? 0}</span></>} />
                    <KPI label={withFilterLabel(ar ? "تعديلات يدوية" : "Manual stock edits", filter, ar)} icon={Package}
                         value={counters?.manualWasteEntries ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-blue)" />
                    <KPI label={withFilterLabel(ar ? "نشاط ليلي متأخر" : "Late-night ops", filter, ar)} icon={Clock}
                         value={counters?.lateNightCancellations ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-purple)" invertDelta />
                    <KPI label={withFilterLabel(ar ? "طلبات بقيمة صفر" : "Zero-value orders", filter, ar)} icon={Shield}
                         value={counters?.zeroValueOrders ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-amber)" invertDelta />
                </div>

                <div className="dashboard-stack-layout" style={{ marginTop: 14 }}>
                    <div className="dashboard-main-stack">
                        <Card title={ar ? "تنبيهات الأمان" : "Security alerts"} subtitle={ar ? "الآن" : "Now"}
                              action={empAnomaly.filter(r => r.tone === "red").length > 0
                                  ? <Pill color="red">{empAnomaly.filter(r => r.tone === "red").length} {ar ? "حرج" : "critical"}</Pill> : null}>
                            {empAnomaly.filter(r => r.tone !== "green").length === 0
                                ? <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>
                                    {ar ? "لا توجد تنبيهات حرجة" : "No critical alerts"}
                                  </div>
                                : (
                                    <div className="scroll-list">
                                        {empAnomaly.filter(r => r.tone !== "green").map((r, i) => (
                                            <AlertRow
                                                key={r.id + i}
                                                tone={r.tone}
                                                icon={r.tone === "red" ? AlertTriangle : Eye}
                                                title={`${rankedLabel(r, ar, "موظف", i)} — ${r.status}`}
                                                meta={auditAlertMeta(r, ar)}
                                            />
                                        ))}
                                    </div>
                                )}
                        </Card>

                        <Card title={ar ? "تحليل سلوك الموظفين" : "Employee Behavior Score"}
                              subtitle={periodLabel}>
                            {empAnomaly.length === 0
                                ? <div className="muted" style={{ fontSize: 12, padding: 24, textAlign: "center" }}>
                                    {loading ? "Loading…" : (ar ? "لا توجد بيانات" : "No anomalies recorded")}
                                  </div>
                                : <div className="tbl-scroll">
                                    <table className="tbl">
                                        <thead>
                                            <tr>
                                                <th>{ar ? "الموظف" : "Employee"}</th>
                                                <th style={{ textAlign: "end" }}>{ar ? "مرتجعات" : "Refunds"}</th>
                                                <th style={{ textAlign: "end" }}>{ar ? "إلغاءات" : "Cancels"}</th>
                                                <th style={{ textAlign: "end" }}>{ar ? "خصومات" : "Discounts"}</th>
                                                <th style={{ textAlign: "end" }}>{ar ? "تعديلات" : "Edits"}</th>
                                                <th>{ar ? "النتيجة" : "Score"}</th>
                                                <th>{ar ? "الحالة" : "Status"}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {empAnomaly.slice(0, 12).map((r, i) => {
                                                const label = rankedLabel(r, ar, "موظف", i);
                                                return (
                                                    <tr key={r.id + i}>
                                                        <td>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <InitialAvatar name={label} size={24} hue={[27, 200, 280, 140, 60, 320][i % 6]} />
                                                                <span className="bold">{label}</span>
                                                            </div>
                                                        </td>
                                                        <td className="num" style={{ textAlign: "end" }}>{r.ref}</td>
                                                        <td className="num" style={{ textAlign: "end" }}>{r.can}</td>
                                                        <td className="num" style={{ textAlign: "end" }}>{r.dis}</td>
                                                        <td className="num" style={{ textAlign: "end" }}>{r.ed}</td>
                                                        <td>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <div style={{ width: 56, height: 5, background: "var(--ds-bg-sunken)", borderRadius: 999, overflow: "hidden" }}>
                                                                    <div style={{
                                                                        width: `${(r.score / 10) * 100}%`,
                                                                        height: "100%",
                                                                        background: r.tone === "red" ? "var(--ds-red)" : r.tone === "amber" ? "var(--ds-amber)" : "var(--ds-green)",
                                                                    }} />
                                                                </div>
                                                                <span className="num bold" style={{ fontSize: 12, color: r.tone === "red" ? "var(--ds-red-text)" : r.tone === "amber" ? "var(--ds-amber-text)" : "var(--ds-text)" }}>{r.score}</span>
                                                            </div>
                                                        </td>
                                                        <td><Pill color={r.tone === "green" ? "neutral" : r.tone}>{r.status}</Pill></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>}
                        </Card>

                        <Card title={ar ? "اتجاه الإلغاءات" : "Cancellation trend"} subtitle={periodLabel}>
                            {(data?.cancellationTrend ?? []).length === 0
                                ? <EmptyChart loading={loading} height={220} />
                                : <BarChart
                                    height={220}
                                    color="var(--ds-amber)"
                                    formatY={(v) => (v / 1000).toFixed(1) + "k"}
                                    labels={data!.cancellationTrend.map(p => formatRestaurantDate(
                                        p.bucketStartUtc,
                                        filter.timeZone ?? "Asia/Qatar",
                                        undefined,
                                        { month: "short", day: "2-digit", year: undefined },
                                    ))}
                                    data={data!.cancellationTrend.map(p => p.value)}
                                />}
                        </Card>

                        <Card title={ar ? "اتجاه المرتجعات" : "Refund amount trend"} subtitle={periodLabel}>
                            {(data?.refundTrend ?? []).length === 0
                                ? <EmptyChart loading={loading} height={220} />
                                : <BarChart
                                    height={220}
                                    color="var(--ds-red)"
                                    formatY={(v) => (v / 1000).toFixed(1) + "k"}
                                    labels={data!.refundTrend.map(p => formatRestaurantDate(
                                        p.bucketStartUtc,
                                        filter.timeZone ?? "Asia/Qatar",
                                        undefined,
                                        { month: "short", day: "2-digit", year: undefined },
                                    ))}
                                    data={data!.refundTrend.map(p => p.value)}
                                />}
                        </Card>
                    </div>

                    <div className="dashboard-side-stack">
                        <Card title={ar ? "ترتيب الإلغاء" : "Cancellation ranking"} subtitle={`${periodLabel} · ${ar ? "حسب الموظف" : "By employee"}`}>
                            <BarList
                                color="var(--ds-red)"
                                fmt={(v) => fmtCur(v)}
                                items={(data?.cancellationsByEmployee ?? []).slice(0, 6).map((c, i) => ({
                                    label: rankedLabel(c, ar, "موظف", i),
                                    sub: `${c.count ?? 0} ${ar ? "إلغاء" : "cancels"}`,
                                    value: c.primaryValue,
                                }))}
                            />
                        </Card>

                        <Card title={ar ? "مرتجعات حسب الموظف" : "Refunds by employee"} subtitle={`${periodLabel} · ${ar ? "حسب القيمة" : "By amount"}`}>
                            <BarList
                                color="var(--ds-red)"
                                fmt={(v) => fmtCur(v)}
                                items={(data?.refundsByEmployee ?? []).slice(0, 6).map((c, i) => ({
                                    label: rankedLabel(c, ar, "موظف", i), sub: `${c.count ?? 0} ${ar ? "مرتجع" : "refunds"}`, value: c.primaryValue,
                                }))}
                            />
                        </Card>

                        <Card title={ar ? "خصومات حسب الموظف" : "Discounts by employee"}>
                            <BarList
                                color="var(--ds-amber)"
                                fmt={(v) => fmtCur(v)}
                                items={(data?.discountsByEmployee ?? []).slice(0, 6).map((c, i) => ({
                                    label: rankedLabel(c, ar, "موظف", i), sub: `${c.count ?? 0} ${ar ? "طلب" : "orders"}`, value: c.primaryValue,
                                }))}
                            />
                        </Card>

                        <Card title={ar ? "استخدام القسائم" : "Voucher use"} subtitle={ar ? "نمط التكرار" : "Repetition pattern"}>
                            <BarList
                                color="var(--ds-purple)"
                                fmt={(v) => fmtCur(v)}
                                items={(data?.voucherAbuseByCashier ?? []).slice(0, 6).map((c, i) => ({
                                    label: rankedLabel(c, ar, "كاشير", i), sub: `${c.count ?? 0} ${ar ? "استخدام" : "uses"}`, value: c.primaryValue,
                                }))}
                            />
                        </Card>
                    </div>
                </div>
            </div>
        </>
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

function rankedLabel(row: { label: string; labelAr?: string | null }, ar: boolean, fallbackPrefixAr?: string, index?: number) {
    if (!ar) return row.label;
    if (row.labelAr?.trim()) return row.labelAr;
    return fallbackPrefixAr ? `${fallbackPrefixAr} ${index === undefined ? "" : index + 1}`.trim() : row.label;
}

function auditAlertMeta(row: { ref: number; can: number; dis: number }, ar: boolean) {
    if (!ar) return `${row.ref} refunds · ${row.can} cancels · ${row.dis} discounts`;
    return `مرتجعات ${row.ref} · إلغاءات ${row.can} · خصومات ${row.dis}`;
}
