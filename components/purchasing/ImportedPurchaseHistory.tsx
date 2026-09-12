"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { useSettingsStore } from "@/store/settingsStore";
import { formatCurrency } from "@/lib/currencies";
import { retailApi } from "@/lib/api-retail";
import { RetailState, RetailStatTiles } from "@/components/retail/retail-shared";
import { WorkbookSource } from "@/components/retail/workbook-source";
import type { RetailLegacyPurchaseDto } from "@/types/retail";

function statusClass(status?: string | null): string {
    switch ((status ?? "").trim().toUpperCase()) {
        case "RECEIVED":
            return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
        case "CANCELLED":
            return "bg-red-500/15 text-red-600 dark:text-red-400";
        case "PENDING":
            return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
        default:
            return "bg-slate-500/15 text-slate-600 dark:text-slate-300";
    }
}

/**
 * READ-ONLY archive of the purchase-order headers imported from the workbook, shown beneath
 * the operational purchase orders so the buying history is continuous. Header-only by design:
 * the workbook has no SKU-level lines, so none are invented and these rows move no stock and
 * carry no COGS. Everything bought from now on goes through the operational flow above.
 */
export function ImportedPurchaseHistory() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const currency = useSettingsStore((state) => state.settings.currency);

    const [rows, setRows] = useState<RetailLegacyPurchaseDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(false);
        try {
            setRows(await retailApi.purchases());
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
    const totals = rows.reduce(
        (acc, row) => ({
            quantity: acc.quantity + row.quantityPieces,
            supplier: acc.supplier + row.supplierCost,
            shipping: acc.shipping + row.shippingCustomsClearance,
            total: acc.total + row.totalCost,
        }),
        { quantity: 0, supplier: 0, shipping: 0, total: 0 },
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        {ar ? "سجل مشتريات مستورد (للقراءة فقط)" : "Imported purchase history (read-only)"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {ar
                            ? "رؤوس طلبات من ملف DOHA LUXE. لا تؤثر على المخزون ولا على تكلفة البضاعة المباعة."
                            : "Order headers from the DOHA LUXE workbook. They move no stock and carry no COGS."}
                    </p>
                    <div className="mt-1">
                        <WorkbookSource
                            sheet="PURCHASE ORDER"
                            note={ar ? "رؤوس الطلبات فقط — الملف لا يحتوي بنودًا" : "headers only — the workbook has no line items"}
                        />
                    </div>
                </div>
                <Button variant="outline" onClick={() => void load()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    {ar ? "تحديث" : "Refresh"}
                </Button>
            </div>

            {!loading && !error && rows.length > 0 && (
                <RetailStatTiles
                    columns={4}
                    tiles={[
                        { label: ar ? "عدد الطلبات" : "Purchase orders", value: String(rows.length) },
                        { label: ar ? "إجمالي القطع" : "Total pieces", value: String(totals.quantity) },
                        { label: ar ? "تكلفة المورّد" : "Supplier cost", value: money(totals.supplier) },
                        { label: ar ? "إجمالي التكلفة" : "Total cost", value: money(totals.total) },
                    ]}
                />
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{ar ? "سجل الشراء" : "Purchase history"}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading && <RetailState kind="loading" ar={ar} />}
                    {!loading && error && <RetailState kind="error" ar={ar} onRetry={() => void load()} />}
                    {!loading && !error && rows.length === 0 && (
                        <RetailState
                            kind="empty"
                            ar={ar}
                            emptyText={
                                ar
                                    ? "لا يوجد سجل مشتريات مستورد."
                                    : "No imported purchase history."
                            }
                        />
                    )}

                    {!loading && !error && rows.length > 0 && (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{ar ? "التاريخ" : "Date"}</TableHead>
                                        <TableHead>{ar ? "رقم الطلب" : "PO number"}</TableHead>
                                        <TableHead>{ar ? "المورّد" : "Supplier"}</TableHead>
                                        <TableHead>{ar ? "رقم الفاتورة" : "Invoice"}</TableHead>
                                        <TableHead className="text-right">{ar ? "القطع" : "Qty (pieces)"}</TableHead>
                                        <TableHead className="text-right">{ar ? "تكلفة المورّد" : "Supplier cost"}</TableHead>
                                        <TableHead className="text-right">
                                            {ar ? "الشحن والجمارك" : "Shipping / customs"}
                                        </TableHead>
                                        <TableHead className="text-right">{ar ? "الإجمالي" : "Total cost"}</TableHead>
                                        <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="whitespace-nowrap text-xs">
                                                {new Date(row.orderDateUtc).toLocaleDateString(ar ? "ar" : "en-GB")}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{row.purchaseOrderNumber}</TableCell>
                                            <TableCell className="min-w-40 font-medium">{row.supplierName}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {row.invoiceNumber ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{row.quantityPieces}</TableCell>
                                            <TableCell className="text-right tabular-nums">{money(row.supplierCost)}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {money(row.shippingCustomsClearance)}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums">
                                                {money(row.totalCost)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={statusClass(row.status)}>
                                                    {row.status ?? "—"}
                                                </Badge>
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
                    ? "هذه سجلات تاريخية للعرض فقط: لا تُنشئ حركة مخزون ولا تكلفة بضاعة مباعة، لأن الملف لا يربط الطلب بالمنتجات."
                    : "These are view-only historical records: they create no stock movement and no COGS, because the workbook never linked a purchase order to its products."}
            </p>
        </div>
    );
}
