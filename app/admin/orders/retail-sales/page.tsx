"use client";

import { useEffect, useState } from "react";
import { Receipt, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { useSettingsStore } from "@/store/settingsStore";
import { formatCurrency } from "@/lib/currencies";
import { retailApi } from "@/lib/api-retail";
import { RetailState, RetailStatTiles } from "@/components/retail/retail-shared";
import { WorkbookSource } from "@/components/retail/workbook-source";
import type { RetailSaleLineDto, RetailSalesQuery } from "@/types/retail";

type PaymentFilter = "all" | "paid" | "unpaid" | "gift";

export default function RetailSalesPage() {
    const { locale, isRtl } = useLocale();
    const ar = locale === "ar";
    const currency = useSettingsStore((state) => state.settings.currency);

    const [rows, setRows] = useState<RetailSaleLineDto[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalUnits, setTotalUnits] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState<RetailSalesQuery>({});
    const [payment, setPayment] = useState<PaymentFilter>("all");
    const [brands, setBrands] = useState<string[]>([]);
    const [brand, setBrand] = useState("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = async (page: number, size: number, applied: RetailSalesQuery) => {
        setLoading(true);
        setError(false);
        try {
            const result = await retailApi.sales({ ...applied, pageNumber: page, pageSize: size });
            setRows(result.items);
            setTotalCount(result.totalCount);
            setTotalAmount(result.totalAmount);
            setTotalUnits(result.totalUnits);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load(pageNumber, pageSize, filters);
    }, [pageNumber, pageSize, filters]);

    useEffect(() => {
        retailApi.brands().then(setBrands).catch(() => setBrands([]));
    }, []);

    const applyFilters = () => {
        setPageNumber(1);
        setFilters({
            search: searchInput || undefined,
            brand: brand === "all" ? undefined : brand,
            paymentStatus: payment === "all" ? undefined : payment,
            from: from || undefined,
            to: to || undefined,
        });
    };

    const resetFilters = () => {
        setSearchInput("");
        setBrand("all");
        setPayment("all");
        setFrom("");
        setTo("");
        setPageNumber(1);
        setFilters({});
    };

    const money = (value: number | null | undefined) =>
        value === null || value === undefined ? "—" : formatCurrency(value, currency);

    return (
        <div className="space-y-6 p-4 sm:p-6" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Receipt className="h-6 w-6 text-primary" />
                        {ar ? "مبيعات المنتجات (تقرير تفصيلي)" : "Product Sales (line-level report)"}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {ar
                            ? "عرض تقريري سطرًا بسطر. الطلبات نفسها تُدار من شاشة الطلبات، وتظهر تفاصيل الصنف داخل كل طلب."
                            : "A line-by-line reporting view. The orders themselves are worked in the Orders screen, which shows the item detail inside each one."}
                    </p>
                    <div className="mt-2">
                        <WorkbookSource
                            sheet="SELLOUT 2026"
                            note={ar ? "يُقرأ من الطلبات الحالية دون تكرارها" : "read from existing orders, never duplicated"}
                        />
                    </div>
                </div>
                <Button variant="outline" onClick={() => void load(pageNumber, pageSize, filters)} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    {ar ? "تحديث" : "Refresh"}
                </Button>
            </div>

            <RetailStatTiles
                columns={4}
                tiles={[
                    { label: ar ? "عدد السطور" : "Sale lines", value: String(totalCount) },
                    { label: ar ? "الوحدات المباعة" : "Units sold", value: String(totalUnits) },
                    { label: ar ? "إجمالي المبيعات" : "Total sales", value: money(totalAmount) },
                    {
                        label: ar ? "متوسط السطر" : "Average line",
                        value: totalCount > 0 ? money(totalAmount / totalCount) : money(0),
                    },
                ]}
            />

            <Card>
                <CardHeader className="space-y-4">
                    <CardTitle className="text-base">{ar ? "سجل المبيعات" : "Sales history"}</CardTitle>
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-52 flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">
                                {ar ? "بحث" : "Search"}
                            </label>
                            <Input
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                onKeyDown={(event) => event.key === "Enter" && applyFilters()}
                                placeholder={ar ? "المنتج، الرمز، العميل، رقم الطلب" : "Product, SKU, customer, order no."}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">{ar ? "من" : "From"}</label>
                            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">{ar ? "إلى" : "To"}</label>
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                        <div className="min-w-40">
                            <label className="mb-1 block text-xs text-muted-foreground">{ar ? "العلامة" : "Brand"}</label>
                            <Select value={brand} onValueChange={setBrand}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
                                    {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-36">
                            <label className="mb-1 block text-xs text-muted-foreground">{ar ? "الدفع" : "Payment"}</label>
                            <Select value={payment} onValueChange={(v) => setPayment(v as PaymentFilter)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
                                    <SelectItem value="paid">{ar ? "مدفوع" : "Paid"}</SelectItem>
                                    <SelectItem value="unpaid">{ar ? "غير مدفوع" : "Not paid"}</SelectItem>
                                    <SelectItem value="gift">{ar ? "هدية" : "Gift"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={applyFilters} disabled={loading}>
                            <Search className="h-4 w-4" />
                            {ar ? "تطبيق" : "Apply"}
                        </Button>
                        <Button variant="ghost" onClick={resetFilters} disabled={loading}>
                            {ar ? "مسح" : "Clear"}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading && <RetailState kind="loading" ar={ar} />}
                    {!loading && error && (
                        <RetailState kind="error" ar={ar} onRetry={() => void load(pageNumber, pageSize, filters)} />
                    )}
                    {!loading && !error && rows.length === 0 && (
                        <RetailState
                            kind="empty"
                            ar={ar}
                            emptyText={ar ? "لا توجد مبيعات مطابقة." : "No matching sales."}
                        />
                    )}

                    {!loading && !error && rows.length > 0 && (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{ar ? "التاريخ" : "Date"}</TableHead>
                                            <TableHead>{ar ? "رقم الطلب" : "Order no."}</TableHead>
                                            <TableHead>{ar ? "العميل" : "Customer"}</TableHead>
                                            <TableHead>{ar ? "الهاتف" : "Phone"}</TableHead>
                                            <TableHead>{ar ? "الرمز" : "SKU"}</TableHead>
                                            <TableHead>{ar ? "المنتج" : "Product"}</TableHead>
                                            <TableHead>{ar ? "المورّد" : "Supplier"}</TableHead>
                                            <TableHead className="text-right">{ar ? "الكمية" : "Qty"}</TableHead>
                                            <TableHead className="text-right">{ar ? "السعر المعتمد" : "Approved"}</TableHead>
                                            <TableHead className="text-right">{ar ? "سعر البيع" : "Sold"}</TableHead>
                                            <TableHead className="text-right">{ar ? "الإجمالي" : "Total"}</TableHead>
                                            <TableHead className="text-right">{ar ? "التكلفة" : "Cost"}</TableHead>
                                            <TableHead className="text-right">{ar ? "الربح" : "Profit"}</TableHead>
                                            <TableHead>{ar ? "الدفع / الحالة" : "Payment / status"}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row) => (
                                            <TableRow key={row.orderItemId}>
                                                <TableCell className="whitespace-nowrap text-xs">
                                                    {new Date(row.soldAtUtc).toLocaleDateString(ar ? "ar" : "en-GB")}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    <span className="flex items-center gap-1.5">
                                                        {row.orderNumber}
                                                        {row.isImportedHistory && (
                                                            <Badge variant="outline" className="bg-slate-500/10 text-[10px]">
                                                                {ar ? "مستورد" : "imported"}
                                                            </Badge>
                                                        )}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{row.customerName ?? "—"}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {row.customerPhone ?? "—"}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                                                <TableCell className="min-w-56">
                                                    <span className="font-medium">{row.productName}</span>
                                                    {row.brand && (
                                                        <span className="block text-xs text-muted-foreground">{row.brand}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="min-w-36 text-xs">{row.supplierName ?? "—"}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                                    {money(row.approvedUnitPrice)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums">
                                                    {money(row.soldUnitPrice)}
                                                    {row.isPriceOverride && !row.isGift && (
                                                        <span className="ms-1 text-[10px] text-amber-600">
                                                            {ar ? "معدّل" : "adj"}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{money(row.lineTotal)}</TableCell>
                                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                                    {/* The cost captured when the goods left the shelf — it does not move
                                                        when the product is re-costed later. */}
                                                    {money(row.lineCost)}
                                                    {!row.hasCostSnapshot && <span className="ms-1 text-xs">*</span>}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right tabular-nums ${
                                                        row.lineProfit < 0 ? "text-red-600 dark:text-red-400" : ""
                                                    }`}
                                                >
                                                    {money(row.lineProfit)}
                                                </TableCell>
                                                <TableCell>
                                                    {row.isGift ? (
                                                        <Badge variant="outline" className="bg-purple-500/15 text-purple-600 dark:text-purple-400">
                                                            {ar ? "هدية" : "Gift"}
                                                        </Badge>
                                                    ) : row.isPaid ? (
                                                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                                            {row.paymentMethod ?? (ar ? "مدفوع" : "Paid")}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-red-500/15 text-red-600 dark:text-red-400">
                                                            {ar ? "غير مدفوع" : "Not paid"}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <p className="mt-3 text-xs text-muted-foreground">
                                {ar
                                    ? "التكلفة مأخوذة لحظة خصم البضاعة من المخزون، فلا تتغيّر أرباح الفترات السابقة عند تغيّر التكاليف لاحقًا. * يعني أن السطر لم يُخصم بعد."
                                    : "Cost is snapshotted when the goods leave stock, so past profit does not move when costs change later. * marks a line not yet relieved."}
                            </p>

                            <div className="mt-4">
                                <PaginationControls
                                    pageNumber={pageNumber}
                                    pageSize={pageSize}
                                    totalCount={totalCount}
                                    onPageChange={setPageNumber}
                                    onPageSizeChange={(size) => {
                                        setPageSize(size);
                                        setPageNumber(1);
                                    }}
                                    isLoading={loading}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
