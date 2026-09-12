"use client";

import * as React from "react";
import { toast } from "sonner";
import {
    Package, Trash2, Clock, AlertTriangle, ShoppingCart, RefreshCw,
} from "lucide-react";
import { downloadWorkbook } from "@/lib/dashboard/export";
import { DashboardTopbar } from "@/components/dashboard/chrome/DashboardTopbar";
import { DashboardFilterBar } from "@/components/dashboard/chrome/DashboardFilterBar";
import {
    KPI, Card, Pill, AreaChart, BarChart, Donut, BarList, AlertRow,
    InitialAvatar,
} from "@/components/dashboard/primitives";
import { useDashboardFilterStore } from "@/store/dashboardFilterStore";
import { useDashboardData } from "@/lib/dashboard/use-dashboard-data";
import { useDashboardRealtime } from "@/lib/dashboard/use-dashboard-realtime";
import { dashboardApi } from "@/lib/dashboard/dashboard-api";
import { getDashboardFilterLabel, withFilterLabel, withLiveLabel } from "@/lib/dashboard/filter-label";
import { useLocale } from "@/components/locale-provider";
import { usePosStore } from "@/store/posStore";
import { formatRestaurantDate } from "@/lib/date-time";

const SCOPE = "Inventory" as const;

export default function InventoryDashboardPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const { currency } = usePosStore();
    const filter = useDashboardFilterStore((s) => s.filters[SCOPE]);
    const { data, loading, refresh } = useDashboardData(dashboardApi.getInventory, filter);
    useDashboardRealtime(SCOPE, refresh);
    const periodLabel = getDashboardFilterLabel(filter, ar);

    const fmtCur = (v: number) => {
        const safe = Number.isFinite(v) ? v : 0; // never surface NaN/Infinity to users
        return new Intl.NumberFormat(undefined, {
            style: "currency", currency, maximumFractionDigits: safe >= 1000 ? 0 : 2,
        }).format(safe);
    };

    const stock = data?.stockHealth;
    const waste = data?.waste;
    const wasteByCategory = data?.wasteByCategory ?? [];
    const wasteCategoryCostTotal = wasteByCategory.reduce((sum, s) => sum + s.value, 0);
    const wasteCategoryCountTotal = wasteByCategory.reduce((sum, s) => sum + (s.count ?? 0), 0);
    const showWasteCategoryCounts = wasteCategoryCostTotal === 0 && wasteCategoryCountTotal > 0;
    const wasteTrend = data?.wasteDailyTrend ?? [];
    const wasteTrendCostTotal = wasteTrend.reduce((sum, p) => sum + p.value, 0);
    const wasteTrendCountTotal = wasteTrend.reduce((sum, p) => sum + (p.count ?? 0), 0);
    const showWasteTrendCounts = wasteTrendCostTotal === 0 && wasteTrendCountTotal > 0;

    return (
        <>
            <DashboardTopbar
                title={ar ? "المخزون والهدر" : "Inventory & Waste"}
                updatedAt={data?.generatedAtUtc}
                onRefresh={refresh}
                live={false}
                onExport={async () => {
                    if (!data) { toast.error(ar ? "لا توجد بيانات" : "No data yet"); return; }
                    try {
                        const workbook = await dashboardApi.exportInventory(filter, currency);
                        downloadWorkbook(workbook, "inventory-dashboard");
                        toast.success(ar ? "تم تصدير ملف Excel بالعربية والإنجليزية" : "Bilingual Excel workbook exported");
                    } catch {
                        toast.error(ar ? "تعذر تصدير ملف Excel" : "Excel export failed");
                    }
                }}
            />
            <DashboardFilterBar scope={SCOPE} showCashier={false} showPaymentMethod={false} showOrderType={false} showWarehouse />

            <div className="content">
                {filter.warehouseId && (
                    <div className="dashboard-empty-strip" style={{ marginBottom: 12 }}>
                        {ar
                            ? "أرقام المخزون (القيمة، النفاد، المنخفض، إعادة الطلب) تخص المخزن المحدد. الهدر والمنتجات قرب الانتهاء محسوبة عبر كل المخازن."
                            : "Stock figures (value, out, low, reorder) reflect the selected warehouse. Waste & expiring stock are calculated across all warehouses."}
                    </div>
                )}
                <div className="dashboard-auto-grid dashboard-kpi-grid">
                    <KPI label={withLiveLabel(ar ? "قيمة المخزون" : "Inventory value", ar)} icon={Package}
                         value={stock ? fmtCur(stock.totalInventoryValue) : "—"} loading={loading && !data}
                         sparkColor="var(--ds-blue)"
                         foot={(stock?.stockTurnoverRatio ?? 0) > 0
                            ? <><span>{ar ? "دوران المخزون" : "Stock turnover"}</span>
                                <span className="num">{(stock?.stockTurnoverRatio ?? 0).toFixed(2)}×</span></>
                            : undefined} />
                    {(stock?.stockTurnoverRatio ?? 0) > 0 && (
                        <KPI label={withFilterLabel(ar ? "أيام تغطية المخزون" : "Days inventory on hand", filter, ar)} icon={Clock}
                             value={(stock?.daysInventoryOnHand ?? 0).toFixed(0)} unit={ar ? "يوم" : "days"} loading={loading && !data}
                             sparkColor="var(--ds-purple)" invertDelta
                             foot={<><span>{ar ? "تكلفة مستهلكة" : "COGS in window"}</span>
                                     <span className="num">{fmtCur(stock?.periodCogs ?? 0)}</span></>} />
                    )}
                    <KPI label={withFilterLabel(ar ? "تكلفة الهدر" : "Waste cost", filter, ar)} icon={Trash2}
                         value={waste ? fmtCur(waste.totalCost) : "—"} loading={loading && !data}
                         sparkColor="var(--ds-red)"
                         foot={<><span>{ar ? "من الإيراد" : "of revenue"}</span>
                                 <span className="num">{waste ? waste.wastePercentOfRevenue.toFixed(1) : "—"}%</span></>} />
                    <KPI label={withLiveLabel(ar ? "ينتهي خلال 3 أيام" : "Expiring < 3d", ar)} icon={Clock}
                         value={stock?.expiringWithin3Days ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-amber)" invertDelta
                         foot={<><span>{ar ? "للمتابعة" : "Watch closely"}</span></>} />
                    <KPI label={withLiveLabel(ar ? "نفد المخزون" : "Out of stock", ar)} icon={AlertTriangle}
                         value={stock?.outOfStockCount ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-red)"
                         foot={<><span>{ar ? "منخفض أيضاً" : "Low stock"}</span>
                                 <span className="num">{stock?.lowStockCount ?? 0}</span></>} />
                    <KPI label={withLiveLabel(ar ? "يحتاج طلب" : "Reorder needed", ar)} icon={ShoppingCart}
                         value={stock?.reorderNeededCount ?? "—"} loading={loading && !data}
                         sparkColor="var(--ds-amber)" invertDelta
                         foot={<><span>{ar ? "ابدأ طلب" : "Start PO"}</span></>} />
                    <KPI label={withFilterLabel(ar ? "إدخالات الهدر" : "Waste entries", filter, ar)} icon={Trash2}
                         value={(waste?.manualCount ?? 0) + (waste?.expiryCount ?? 0) + (waste?.cancellationCount ?? 0)}
                         loading={loading && !data}
                         sparkColor="var(--ds-text-muted)"
                         foot={<><span>{ar ? "خسارة بيعية" : "Sale-price loss"}</span>
                                 <span className="num">{waste ? fmtCur(waste.salePriceLoss) : "—"}</span></>} />
                </div>

                <div className="dashboard-stack-layout" style={{ marginTop: 14 }}>
                    <div className="dashboard-main-stack">
                        <Card title={ar ? "أعلى المنتجات هدراً" : "Top wasted products"} subtitle={ar ? "حسب التكلفة" : "By cost"}>
                            <BarList
                                color="var(--ds-red)"
                                fmt={(v) => fmtCur(v)}
                                items={(data?.topWastedProducts ?? []).slice(0, 6).map((p, i) => ({
                                    label: rankedLabel(p, ar, "صنف", i),
                                    sub: `${p.count ?? 0} ${ar ? "إدخال" : "entries"}`,
                                    value: p.primaryValue,
                                }))}
                            />
                        </Card>

                        <Card title={ar ? "الهدر حسب الموظف" : "Waste by employee"}
                              subtitle={`${periodLabel} · ${ar ? "من سجل الأكثر" : "Who recorded most"}`}>
                            {(data?.wasteByEmployee ?? []).length === 0
                                ? <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>—</div>
                                : <div className="scroll-list scroll-list-sm" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {data!.wasteByEmployee.slice(0, 6).map((c, i) => (
                                        <div key={(c.id ?? "") + i} className="between">
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <InitialAvatar name={rankedLabel(c, ar, "موظف", i)} size={28} hue={[27, 200, 280, 140, 60][i % 5]} />
                                                <div>
                                                    <div style={{ fontSize: 12.5, fontWeight: 550 }}>{rankedLabel(c, ar, "موظف", i)}</div>
                                                    <div style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>{c.count ?? 0} {ar ? "إدخال" : "entries"}</div>
                                                </div>
                                            </div>
                                            <div className="num bold" style={{ fontSize: 13, color: "var(--ds-red-text)" }}>{fmtCur(c.primaryValue)}</div>
                                        </div>
                                    ))}
                                </div>}
                        </Card>

                        <Card title={ar ? "الهدر حسب النوع" : "Waste by type"}
                              subtitle={periodLabel}>
                            {wasteByCategory.filter(s => s.value > 0 || (s.count ?? 0) > 0).length === 0
                                ? <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>—</div>
                                : <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <Donut
                                        size={130} thickness={18}
                                        centerLabel={showWasteCategoryCounts ? (ar ? "إدخال" : "entries") : currency}
                                        centerValue={showWasteCategoryCounts ? String(wasteCategoryCountTotal) : fmtCur(wasteCategoryCostTotal)}
                                        data={wasteByCategory.map((s, i) => ({
                                            value: showWasteCategoryCounts ? (s.count ?? 0) : s.value,
                                            color: i === 0 ? "var(--ds-red)" : i === 1 ? "var(--ds-amber)" : i === 2 ? "var(--ds-primary)" : "var(--ds-text-faint)",
                                        }))}
                                    />
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                                        {wasteByCategory.map((s, i) => (
                                            <div key={s.label} className="between" style={{ fontSize: 12.5 }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: i === 0 ? "var(--ds-red)" : i === 1 ? "var(--ds-amber)" : i === 2 ? "var(--ds-primary)" : "var(--ds-text-faint)" }} />
                                                    {categoryLabel(s, ar)}
                                                </span>
                                                <span><span className="num bold">{showWasteCategoryCounts ? `${s.count ?? 0}` : fmtCur(s.value)}</span>
                                                    <span style={{ color: "var(--ds-text-muted)", fontSize: 11, marginLeft: 4 }}>{showWasteCategoryCounts ? (ar ? "إدخال" : "entries") : `${s.percentage?.toFixed(1) ?? 0}%`}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>}
                        </Card>

                        <Card title={ar ? "صحة المخزون" : "Stock health"} subtitle={ar ? "نظرة سريعة" : "At a glance"}>
                            <div className="dashboard-auto-grid dashboard-kpi-grid">
                                <StockTile label={ar ? "نفد" : "Out of stock"} value={stock?.outOfStockCount ?? 0} tone="red" />
                                <StockTile label={ar ? "منخفض" : "Low stock"} value={stock?.lowStockCount ?? 0} tone="amber" />
                                <StockTile label={ar ? "ينتهي قريباً" : "Expiring < 3d"} value={stock?.expiringWithin3Days ?? 0} tone="amber" />
                                <StockTile label={ar ? "يحتاج طلب" : "Reorder"} value={stock?.reorderNeededCount ?? 0} tone="amber" />
                                <StockTile label={ar ? "قيمة المخزون" : "Inventory value"} value={stock ? fmtCur(stock.totalInventoryValue) : "—"} tone="green" />
                            </div>
                        </Card>

                        <Card title={ar ? "اتجاه الهدر اليومي" : "Daily waste trend"}
                              subtitle={`${periodLabel} · ${showWasteTrendCounts ? (ar ? "الإدخالات" : "Entries") : (ar ? "التكلفة" : "Cost")}`}>
                            {wasteTrend.length === 0
                                ? <EmptyChart loading={loading} height={240} />
                                : <BarChart
                                    height={240}
                                    color="var(--ds-red)"
                                    formatY={(v) => showWasteTrendCounts ? String(Math.round(v)) : (v / 1000).toFixed(1) + "k"}
                                    labels={wasteTrend.map(p => formatRestaurantDate(
                                        p.bucketStartUtc,
                                        filter.timeZone ?? "Asia/Qatar",
                                        undefined,
                                        { month: "short", day: "2-digit", year: undefined },
                                    ))}
                                    data={wasteTrend.map(p => showWasteTrendCounts ? (p.count ?? 0) : p.value)}
                                />}
                        </Card>

                        <Card title={ar ? "تنتهي قريباً" : "Expiring soon"}
                              subtitle={`${ar ? "خلال 7 أيام" : "Next 7 days"} · ${ar ? "أعلى قيمة في خطر" : "Highest at-risk value"}`}>
                            {(data?.expiringSoon ?? []).length === 0
                                ? <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>—</div>
                                : <div className="scroll-list scroll-list-sm" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {data!.expiringSoon.slice(0, 7).map((b, i) => (
                                        <div key={b.id ?? b.label} className="between" style={{ fontSize: 12.5 }}>
                                            <span style={{ fontWeight: 500 }}>{rankedLabel(b, ar, "مادة", i)}</span>
                                            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                                <span className="num bold">{fmtCur(b.primaryValue)}</span>
                                                <span className="muted" style={{ fontSize: 11 }}>{b.secondaryValue ?? "—"}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>}
                        </Card>
                    </div>
                    <div className="dashboard-side-stack">
                    </div>
                </div>
            </div>
        </>
    );
}

function StockTile({ label, value, tone }: { label: string; value: number | string; tone: "red" | "amber" | "green" }) {
    const bg = tone === "red" ? "var(--ds-red-soft)" : tone === "amber" ? "var(--ds-amber-soft)" : "var(--ds-green-soft)";
    const fg = tone === "red" ? "var(--ds-red-text)" : tone === "amber" ? "var(--ds-amber-text)" : "var(--ds-green-text)";
    return (
        <div style={{ padding: "14px 16px", background: bg, borderRadius: 12, color: fg, border: "1px solid color-mix(in oklch, currentColor 20%, transparent)" }}>
            <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.04 }}>{label}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 4 }}>{value}</div>
        </div>
    );
}

function rankedLabel(row: { label: string; labelAr?: string | null }, ar: boolean, fallbackPrefixAr?: string, index?: number) {
    if (!ar) return row.label;
    if (row.labelAr?.trim()) return row.labelAr;
    return fallbackPrefixAr ? `${fallbackPrefixAr} ${index === undefined ? "" : index + 1}`.trim() : row.label;
}

function categoryLabel(row: { label: string; labelAr?: string | null }, ar: boolean) {
    if (!ar) return row.label;
    if (row.labelAr?.trim()) return row.labelAr;
    if (row.label === "CancelProduct") return "إلغاء منتج";
    if (row.label === "ExpiryProduct") return "انتهاء منتج";
    if (row.label === "ManualProduct") return "هدر منتج يدوي";
    if (row.label === "ManualMaterial") return "هدر مادة يدوي";
    return row.label;
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
