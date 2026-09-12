"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    Boxes,
    Package,
    Receipt,
    RefreshCw,
    ShoppingCart,
    Store,
    Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";
import { useSettingsStore } from "@/store/settingsStore";
import { formatCurrency } from "@/lib/currencies";
import { retailApi } from "@/lib/api-retail";
import { RetailState, RetailStatTiles, formatPercent } from "@/components/retail/retail-shared";
import type { RetailCatalogSummaryDto, RetailPerformanceReport } from "@/types/retail";

/**
 * Retail overview. Deliberately a summary + signpost: every piece of retail work happens in
 * the normal system screens — Products, Orders, Inventory, Purchasing, Suppliers, Reports —
 * which this page links to. There is no retail-only operational screen behind it.
 */
export default function RetailOverviewPage() {
    const { locale, isRtl } = useLocale();
    const ar = locale === "ar";
    const currency = useSettingsStore((state) => state.settings.currency);

    const [summary, setSummary] = useState<RetailCatalogSummaryDto | null>(null);
    const [performance, setPerformance] = useState<RetailPerformanceReport | null>(null);
    const [purchaseCount, setPurchaseCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(false);
        try {
            const [headline, report, purchases] = await Promise.all([
                retailApi.summary(),
                retailApi.performance(),
                retailApi.purchases(),
            ]);
            setSummary(headline);
            setPerformance(report);
            setPurchaseCount(purchases.length);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const money = (value: number) => formatCurrency(value, currency);

    const destinations = [
        {
            href: "/ntxadminpos/products",
            icon: Package,
            title: ar ? "المنتجات" : "Products",
            body: ar ? "الرمز، الباركود، العلامة، التكلفة، السعر المعتمد" : "SKU, barcode, brand, costing, approved price",
            sheet: "PRODUCT MASTER",
        },
        {
            href: "/ntxadminpos/orders",
            icon: Receipt,
            title: ar ? "الطلبات" : "Orders",
            body: ar
                ? "كل الطلبات في مكان واحد، مع تفاصيل الصنف داخل كل طلب"
                : "Every order in one place, with the item detail inside each one",
            sheet: "SELLOUT 2026",
        },
        {
            href: "/ntxadminpos/inventory",
            icon: Boxes,
            title: ar ? "المخزون" : "Inventory",
            body: ar
                ? "مخزون هذا الفرع، مبني على سجل الحركات"
                : "This branch's finished-goods stock, built from the movement ledger",
            sheet: "LIVE INVENTORY",
        },
        {
            href: "/ntxadminpos/reports/retail",
            icon: BarChart3,
            title: ar ? "الأداء والأرباح" : "Performance & Profit",
            body: ar ? "المبيعات والتكلفة والربح لكل منتج" : "Sales, cost and gross profit per product",
            sheet: "SUMMARY PROFIT",
        },
        {
            href: "/ntxadminpos/procurement",
            icon: ShoppingCart,
            title: ar ? "المشتريات" : "Purchasing",
            body: ar
                ? "أوامر شراء بأصناف SKU؛ الاستلام هو ما يزيد المخزون"
                : "SKU-level purchase orders; receiving is what raises stock",
            sheet: "PURCHASE ORDER",
        },
        {
            href: "/ntxadminpos/procurement",
            icon: Truck,
            title: ar ? "الموردون" : "Suppliers",
            body: ar
                ? "سجل موردين واحد للمواد الخام والمنتجات الجاهزة معًا"
                : "One supplier list serving every kind of purchase",
            sheet: "SUPPLIER INFORMATIONS",
        },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Store className="h-6 w-6 text-primary" />
                        {ar ? "نظرة عامة على المخزون" : "Stock Overview"}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {ar
                            ? "ملخّص المنتجات الجاهزة. التفاصيل تُدار من شاشات النظام العادية أدناه."
                            : "A summary of the stock this branch sells. The detail lives in the normal system screens below."}
                    </p>
                </div>
                <Button variant="outline" onClick={() => void load()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    {ar ? "تحديث" : "Refresh"}
                </Button>
            </div>

            {loading && <RetailState kind="loading" ar={ar} />}
            {!loading && error && <RetailState kind="error" ar={ar} onRetry={() => void load()} />}

            {!loading && !error && summary && performance && (
                <RetailStatTiles
                    columns={6}
                    tiles={[
                        { label: ar ? "المنتجات" : "Products", value: String(summary.productCount) },
                        { label: ar ? "الموردون" : "Suppliers", value: String(summary.supplierCount) },
                        {
                            label: ar ? "وحدات مستلمة" : "Units received",
                            value: String(summary.totalStockUnits + performance.totalUnitsSold),
                        },
                        { label: ar ? "وحدات مباعة" : "Units sold", value: String(performance.totalUnitsSold) },
                        {
                            label: ar ? "المخزون الحالي" : "Current stock",
                            value: String(summary.totalStockUnits),
                            hint: money(summary.inventoryValueAtCost),
                        },
                        {
                            label: ar ? "إجمالي المبيعات" : "Total sales",
                            value: money(performance.totalSales),
                            hint: `${ar ? "ربح" : "profit"} ${money(performance.grossProfit)} · ${formatPercent(performance.grossMarginPercent)}`,
                        },
                    ]}
                />
            )}

            {!loading && !error && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {ar ? "أين تُدار هذه البيانات" : "Where this is managed"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {destinations.map((destination) => (
                            <Link
                                key={`${destination.href}-${destination.sheet}`}
                                href={destination.href}
                                className="group rounded-lg border p-4 transition-colors hover:border-primary hover:bg-muted/50"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <destination.icon className="h-5 w-5 text-primary" />
                                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
                                </div>
                                <p className="mt-2 font-semibold">{destination.title}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{destination.body}</p>
                                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                                    {destination.sheet}
                                </p>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )}

            {!loading && !error && (
                <p className="text-xs text-muted-foreground">
                    {ar
                        ? `سجل المشتريات المستورد: ${purchaseCount} أمر شراء. كل هذه البيانات مقصورة على فرع DOHA LUXE Retail.`
                        : `Imported purchase history: ${purchaseCount} purchase orders. All retail data is scoped to the DOHA LUXE Retail branch.`}
                </p>
            )}
        </div>
    );
}
