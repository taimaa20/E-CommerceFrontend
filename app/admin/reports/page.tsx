"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    Banknote,
    BarChart3,
    FileText,
    Package,
    RefreshCw,
    ShoppingBag,
    Trash2,
    Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BranchFilter } from "@/components/filters/BranchFilter";
import { useLocale } from "@/components/locale-provider";
import { usePosStore } from "@/store/posStore";
import { useBusinessFilterStore } from "@/store/businessFilterStore";
import { useDashboardFilterStore } from "@/store/dashboardFilterStore";
import { dashboardApi } from "@/lib/dashboard/dashboard-api";
import { exportSnapshotSection } from "@/lib/dashboard/export";
import type { DashboardFilterPreset } from "@/lib/dashboard/filter-types";
import type { FinancialSnapshot, InventorySnapshot } from "@/lib/dashboard/snapshot-types";
import {
    addCalendarDays,
    getRestaurantDateInputValue,
    parseUtcInstant,
    startOfRestaurantDayUtc,
} from "@/lib/date-time";

const PRESETS: DashboardFilterPreset[] = ["Today", "Yesterday", "ThisWeek", "ThisMonth", "ThisYear"];
const REPORT_KEYS = ["financial", "sales", "waste", "cashier", "product"] as const;
type ReportKey = typeof REPORT_KEYS[number];

export default function ReportsPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const searchParams = useSearchParams();
    const requestedCategory = searchParams.get("category");
    const activeCategory: ReportKey | "all" =
        requestedCategory && REPORT_KEYS.includes(requestedCategory as ReportKey)
            ? requestedCategory as ReportKey
            : "all";
    const { currency } = usePosStore();
    const filter = useBusinessFilterStore((state) => state.filter);
    const operationsFilter = useDashboardFilterStore((state) => state.filters.Operations);
    const setDashboardFilter = useDashboardFilterStore((state) => state.setFilter);
    const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot | null>(null);
    const [inventorySnapshot, setInventorySnapshot] = useState<InventorySnapshot | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            dashboardApi.getFinancial(filter),
            dashboardApi.getInventory(filter),
        ])
            .then(([financial, inventory]) => {
                if (cancelled) return;
                setFinancialSnapshot(financial);
                setInventorySnapshot(inventory);
            })
            .catch(() => {
                if (!cancelled) {
                    setFinancialSnapshot(null);
                    setInventorySnapshot(null);
                    toast.error(ar ? "تعذر تحميل التقارير" : "Failed to load reports");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [filter, ar]);

    const setPreset = (preset: DashboardFilterPreset) => {
        setDashboardFilter("Operations", {
            ...operationsFilter,
            preset,
            startUtc: null,
            endUtc: null,
        });
    };

    const setBranch = (branchId: string) => {
        setDashboardFilter("Operations", {
            ...operationsFilter,
            branchId: branchId || null,
        });
    };

    const setCustomDate = (key: "startUtc" | "endUtc", value: string) => {
        const timeZone = operationsFilter.timeZone ?? "Asia/Qatar";
        setDashboardFilter("Operations", {
            ...operationsFilter,
            preset: "Custom",
            [key]: value
                ? startOfRestaurantDayUtc(
                    key === "endUtc" ? addCalendarDays(value, 1) : value,
                    timeZone,
                )
                : null,
        });
    };

    const fmtCur = (amount: number) =>
        new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: amount >= 1000 ? 0 : 2,
        }).format(amount);

    const exportKey = activeCategory === "all" ? "financial" : activeCategory;
    const handleExport = (key: ReportKey = exportKey) => {
        const definition = getReportDefinition(key);
        const snapshot = definition.scope === "inventory" ? inventorySnapshot : financialSnapshot;
        if (!snapshot) {
            toast.error(ar ? "لا توجد بيانات للتصدير" : "No data to export");
            return;
        }

        const exported = exportSnapshotSection(
            snapshot,
            filter,
            definition.scope,
            `${definition.key}-report`,
            [...definition.sections],
        );
        if (!exported) {
            toast.error(ar ? "لا توجد بيانات مطابقة لهذا التقرير" : "No matching data for this report");
            return;
        }
        toast.success(ar ? `تم تصدير ${definition.titleAr}` : `${definition.titleEn} exported`);
    };

    const reports = [
        {
            key: "financial",
            icon: Banknote,
            title: ar ? "التقارير المالية" : "Financial Reports",
            desc: ar ? "الإيرادات، الخصومات، القسائم، الربحية" : "Revenue, discounts, vouchers, profitability",
            value: financialSnapshot ? fmtCur(financialSnapshot.revenue.net) : "—",
        },
        {
            key: "sales",
            icon: ShoppingBag,
            title: ar ? "تقارير المبيعات" : "Sales Reports",
            desc: ar ? "الطلبات المدفوعة ومتوسط قيمة الطلب" : "Paid orders and average order value",
            value: financialSnapshot ? String(financialSnapshot.revenue.orderCount) : "—",
        },
        {
            key: "waste",
            icon: Trash2,
            title: ar ? "تقارير الهدر" : "Waste Reports",
            desc: ar ? "تحليل الهدر وتكلفته وتأثيره" : "Waste cost, trends, and impact",
            value: inventorySnapshot ? fmtCur(inventorySnapshot.waste.totalCost) : "—",
        },
        {
            key: "cashier",
            icon: Banknote,
            title: ar ? "تقارير الكاشير" : "Cashier Reports",
            desc: ar ? "الدفع النقدي والبطاقة حسب الكاشير" : "Cash, card, and cashier totals",
            value: financialSnapshot ? String(financialSnapshot.revenueByCashier.length) : "—",
        },
        {
            key: "product",
            icon: Package,
            title: ar ? "تقارير المنتجات" : "Product Reports",
            desc: ar ? "الأكثر مبيعاً والأقل أداءً" : "Best sellers and low performers",
            value: financialSnapshot ? String(financialSnapshot.bestSellers.length) : "—",
        },
    ] satisfies Array<{
        key: ReportKey;
        icon: typeof Banknote;
        title: string;
        desc: string;
        value: string;
    }>;

    const visibleReports = activeCategory === "all"
        ? reports
        : reports.filter((report) => report.key === activeCategory);

    return (
        <div className="flex animate-in flex-col gap-5 p-2 duration-500">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary p-3 text-primary-foreground shadow-sm">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            {ar ? "مركز التقارير" : "Report Center"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {ar ? "مركز موحد للتقارير والفلاتر والتصدير" : "One place for reports, filters, and exports"}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                    <BranchFilter
                        value={filter.branchId ?? ""}
                        onValueChange={setBranch}
                        label={ar ? "الفرع" : "Branch"}
                        triggerClassName="h-9 min-w-44"
                        contentClassName="min-w-72"
                    />
                    {PRESETS.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => setPreset(preset)}
                            className={`h-9 rounded-lg px-3 text-sm font-semibold transition ${
                                filter.preset === preset
                                    ? "bg-slate-950 text-white"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            }`}
                        >
                            {labelPreset(preset, ar)}
                        </button>
                    ))}
                    <input
                        type="date"
                        value={filter.startUtc
                            ? getRestaurantDateInputValue(filter.startUtc, filter.timeZone ?? "Asia/Qatar")
                            : ""}
                        onChange={(event) => setCustomDate("startUtc", event.target.value)}
                        className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                        aria-label={ar ? "من" : "From"}
                    />
                    <input
                        type="date"
                        value={filter.endUtc
                            ? getRestaurantDateInputValue(
                                new Date(parseUtcInstant(filter.endUtc).getTime() - 1),
                                filter.timeZone ?? "Asia/Qatar",
                            )
                            : ""}
                        onChange={(event) => setCustomDate("endUtc", event.target.value)}
                        className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                        aria-label={ar ? "إلى" : "To"}
                    />
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                            handleExport();
                        }}
                        disabled={loading}
                    >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {ar ? "تصدير" : "Export"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                {reports.map((report) => (
                    <Link
                        key={report.key}
                        href={`/ntxadminpos/reports?category=${report.key}`}
                        className={`rounded-xl border bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md ${
                            activeCategory === report.key ? "border-primary ring-2 ring-primary/10" : "border-slate-200"
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <report.icon className="h-5 w-5 text-primary" />
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                {report.value}
                            </span>
                        </div>
                        <div className="mt-3 text-sm font-bold text-slate-950">{report.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{report.desc}</div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-950">
                                {ar ? "التقارير المتاحة" : "Available Reports"}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {ar ? "اختر بطاقة ثم صدّر التقرير بنفس الفلتر" : "Choose a card, then export it with the active filter"}
                            </p>
                        </div>
                        <BarChart3 className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
                        {visibleReports.map((report) => (
                            <Link
                                key={report.key}
                                href={`/ntxadminpos/reports?category=${report.key}`}
                                className="min-h-32 rounded-lg border border-slate-200 bg-slate-50 p-4 text-start transition hover:border-slate-300 hover:bg-white"
                            >
                                <report.icon className="mb-3 h-5 w-5 text-primary" />
                                <div className="text-sm font-bold text-slate-950">{report.title}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{report.desc}</div>
                            </Link>
                        ))}
                    </div>
                </section>

                <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-bold text-slate-950">
                        {ar ? "ملخص الفترة" : "Period Summary"}
                    </h2>
                    <div className="mt-4 space-y-3 text-sm">
                        <SummaryRow label={ar ? "صافي الإيراد" : "Net revenue"} value={financialSnapshot ? fmtCur(financialSnapshot.revenue.net) : "—"} />
                        <SummaryRow label={ar ? "إجمالي الطلبات" : "Orders"} value={financialSnapshot ? String(financialSnapshot.revenue.orderCount) : "—"} />
                        <SummaryRow label={ar ? "متوسط الطلب" : "Average order"} value={financialSnapshot ? fmtCur(financialSnapshot.revenue.averageOrderValue) : "—"} />
                        <SummaryRow label={ar ? "الخصومات" : "Discounts"} value={financialSnapshot ? fmtCur(financialSnapshot.revenue.discounts) : "—"} />
                        <SummaryRow label={ar ? "القسائم" : "Vouchers"} value={financialSnapshot ? fmtCur(financialSnapshot.revenue.vouchers) : "—"} />
                        <SummaryRow label={ar ? "تكلفة الهدر" : "Waste cost"} value={inventorySnapshot ? fmtCur(inventorySnapshot.waste.totalCost) : "—"} />
                    </div>
                </aside>
            </div>
        </div>
    );
}

function getReportDefinition(key: ReportKey) {
    const definitions = {
        financial: {
            key: "financial",
            scope: "financial",
            titleEn: "Financial Report",
            titleAr: "التقرير المالي",
            sections: ["revenue", "profitability", "channelSplit"],
        },
        sales: {
            key: "sales",
            scope: "financial",
            titleEn: "Sales Report",
            titleAr: "تقرير المبيعات",
            sections: ["revenue", "revenueByDay", "bestSellers", "worstSellers"],
        },
        waste: {
            key: "waste",
            scope: "inventory",
            titleEn: "Waste Report",
            titleAr: "تقرير الهدر",
            sections: ["waste", "topWastedProducts", "wasteByEmployee", "wasteDailyTrend", "wasteByCategory"],
        },
        cashier: {
            key: "cashier",
            scope: "financial",
            titleEn: "Cashier Report",
            titleAr: "تقرير الكاشير",
            sections: ["revenue", "channelSplit", "revenueByCashier"],
        },
        product: {
            key: "product",
            scope: "financial",
            titleEn: "Product Report",
            titleAr: "تقرير المنتجات",
            sections: ["bestSellers", "worstSellers"],
        },
    } as const;
    return definitions[key];
}

function labelPreset(preset: DashboardFilterPreset, ar: boolean) {
    const labels: Record<string, string> = ar
        ? { Today: "اليوم", Yesterday: "أمس", ThisWeek: "أسبوع", ThisMonth: "شهر", ThisYear: "سنة" }
        : { Today: "Today", Yesterday: "Yesterday", ThisWeek: "Week", ThisMonth: "Month", ThisYear: "Year" };
    return labels[preset] ?? preset;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-200 pb-2 last:border-0">
            <span className="text-slate-500">{label}</span>
            <span className="font-mono font-bold text-slate-950">{value}</span>
        </div>
    );
}
