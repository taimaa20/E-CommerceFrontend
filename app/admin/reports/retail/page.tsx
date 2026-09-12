"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { useSettingsStore } from "@/store/settingsStore";
import { formatCurrency } from "@/lib/currencies";
import { retailApi } from "@/lib/api-retail";
import { RetailState, RetailStatTiles, formatPercent } from "@/components/retail/retail-shared";
import { WorkbookSource } from "@/components/retail/workbook-source";
import type { RetailPerformanceReport } from "@/types/retail";

export default function RetailPerformancePage() {
    const { locale, isRtl } = useLocale();
    const ar = locale === "ar";
    const currency = useSettingsStore((state) => state.settings.currency);

    const [report, setReport] = useState<RetailPerformanceReport | null>(null);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = async (fromDate: string, toDate: string) => {
        setLoading(true);
        setError(false);
        try {
            setReport(await retailApi.performance(fromDate || undefined, toDate || undefined));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load("", "");
    }, []);

    const money = (value: number | null | undefined) =>
        value === null || value === undefined ? "—" : formatCurrency(value, currency);

    const sold = report?.products.filter((p) => p.quantitySold > 0) ?? [];

    return (
        <div className="space-y-6 p-4 sm:p-6" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        {ar ? "أداء وربحية المنتجات" : "Product Performance & Profit"}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {ar
                            ? "المبيعات والتكلفة والربح لكل منتج تجزئة، محسوبة من بيانات النظام."
                            : "Sales, cost and gross profit per product, computed from system data."}
                    </p>
                    <div className="mt-2">
                        <WorkbookSource
                            sheet="SUMMARY PROFIT"
                            note={
                                ar
                                    ? "بالحسابات المصححة (الكمية × السعر)"
                                    : "recomputed with the corrected definitions"
                            }
                        />
                    </div>
                </div>
                <div className="flex items-end gap-2">
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">{ar ? "من" : "From"}</label>
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">{ar ? "إلى" : "To"}</label>
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={() => void load(from, to)} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        {ar ? "تطبيق" : "Apply"}
                    </Button>
                </div>
            </div>

            {loading && <RetailState kind="loading" ar={ar} />}
            {!loading && error && <RetailState kind="error" ar={ar} onRetry={() => void load(from, to)} />}

            {!loading && !error && report && (
                <>
                    <RetailStatTiles
                        columns={6}
                        tiles={[
                            { label: ar ? "إجمالي المبيعات" : "Total sales", value: money(report.totalSales) },
                            { label: ar ? "الوحدات المباعة" : "Units sold", value: String(report.totalUnitsSold) },
                            { label: ar ? "تكلفة البضاعة" : "Total cost (COGS)", value: money(report.totalCost) },
                            { label: ar ? "الربح الإجمالي" : "Gross profit", value: money(report.grossProfit) },
                            { label: ar ? "هامش الربح" : "Gross margin", value: formatPercent(report.grossMarginPercent) },
                            {
                                label: ar ? "غير محصّل" : "Outstanding",
                                value: money(report.outstandingUnpaid),
                                hint: ar ? `${report.orderCount} طلب` : `${report.orderCount} orders`,
                            },
                        ]}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {ar ? "الأداء حسب المنتج" : "Performance by product"}
                                <span className="ms-2 text-sm font-normal text-muted-foreground">
                                    ({sold.length}{ar ? " منتج مباع" : " products sold"})
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sold.length === 0 ? (
                                <RetailState
                                    kind="empty"
                                    ar={ar}
                                    emptyText={ar ? "لا توجد مبيعات في هذه الفترة." : "No sales in this period."}
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{ar ? "الرمز" : "SKU"}</TableHead>
                                                <TableHead>{ar ? "المنتج" : "Product"}</TableHead>
                                                <TableHead>{ar ? "العلامة" : "Brand"}</TableHead>
                                                <TableHead>{ar ? "المورّد" : "Supplier"}</TableHead>
                                                <TableHead className="text-right">{ar ? "الكمية المباعة" : "Qty sold"}</TableHead>
                                                <TableHead className="text-right">{ar ? "إجمالي المبيعات" : "Total sales"}</TableHead>
                                                <TableHead className="text-right">{ar ? "تكلفة الوحدة اليوم" : "Cost/item today"}</TableHead>
                                                <TableHead className="text-right">{ar ? "تكلفة المبيعات" : "COGS at sale"}</TableHead>
                                                <TableHead className="text-right">{ar ? "الربح" : "Gross profit"}</TableHead>
                                                <TableHead className="text-right">{ar ? "نسبة الربح" : "Profit %"}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sold.map((row) => (
                                                <TableRow key={row.productId}>
                                                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                                                    <TableCell className="min-w-56 font-medium">{row.productName}</TableCell>
                                                    <TableCell>{row.brand ?? "—"}</TableCell>
                                                    <TableCell className="min-w-36 text-xs">{row.supplierName ?? "—"}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{row.quantitySold}</TableCell>
                                                    <TableCell className="text-right font-semibold tabular-nums">
                                                        {money(row.totalSales)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">{money(row.costPerItem)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{money(row.totalCost)}</TableCell>
                                                    <TableCell
                                                        className={`text-right font-semibold tabular-nums ${
                                                            row.grossProfit < 0 ? "text-red-600 dark:text-red-400" : ""
                                                        }`}
                                                    >
                                                        {money(row.grossProfit)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {formatPercent(row.profitPercent)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <p className="text-xs text-muted-foreground">
                        {ar
                            ? "الوحدات المباعة = مجموع الكميات، والمبيعات = مجموع (سعر البيع × الكمية) — بخلاف صيغ الملف الأصلي التي كانت تعدّ الصفوف وتجمع سعر الوحدة فقط. تكلفة البضاعة المباعة مأخوذة لحظة البيع، فلا تتغيّر أرباح الفترات المغلقة عند تغيّر التكاليف لاحقًا."
                            : "Units sold = Σ quantity and sales = Σ (sold price × quantity) — unlike the workbook, which counted rows and summed unit price. COGS is the cost captured at the moment of sale, so a later cost change cannot rewrite a closed period."}
                        {report && report.linesWithoutCostSnapshot > 0 && (
                            <>
                                {" "}
                                <span className="text-amber-600 dark:text-amber-400">
                                    {ar
                                        ? `${report.linesWithoutCostSnapshot} سطرًا لم يُخصم من المخزون بعد، وتكلفته تقديرية بتكلفة اليوم.`
                                        : `${report.linesWithoutCostSnapshot} line(s) have not been relieved from stock, so their cost falls back to today's.`}
                                </span>
                            </>
                        )}
                    </p>
                </>
            )}
        </div>
    );
}
