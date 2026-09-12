"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, History, RefreshCw, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { useAuthStore } from "@/store/authStore";
import { isSuperAdminRole } from "@/lib/authorization";
import { useSettingsStore } from "@/store/settingsStore";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { formatCurrency } from "@/lib/currencies";
import { retailApi } from "@/lib/api-retail";
import { RetailState, RetailStatTiles, StockStatusBadge } from "@/components/retail/retail-shared";
import { InventoryActiveBadge, InventoryTypeBadge } from "@/components/inventory/inventory-shared";
import { MovementHistoryDialog } from "@/components/inventory/StockMovementHistoryDialog";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { FinishedProductDialog } from "@/components/inventory/FinishedProductDialog";
import type { RetailCatalogSummaryDto, RetailProductDto } from "@/types/retail";

/**
 * Finished-goods inventory for the active branch, using the same column vocabulary as the
 * raw-material view so the two read as one module: name, code, type, category, source, unit,
 * current stock, reorder level, unit cost, total value, status, actions.
 *
 * Every stock number here is the sum of the product's ledger movements. Nothing on this screen
 * writes a balance — stock moves through a purchase receipt, a sale, or an explicit adjustment.
 */
export function FinishedProductsInventory({
    createSignal,
    branchId,
    search,
}: {
    /** Bumped by the module shell when the operator picks "Finished product" from Add. */
    createSignal: number;
    branchId: string | null;
    /** The module search box. Owned by the shell so the filter never moves the cursor. */
    search: string;
}) {
    const router = useRouter();
    const { locale } = useLocale();
    const ar = locale === "ar";
    const currency = useSettingsStore((state) => state.settings.currency);
    const branchVersion = useActiveBranchVersion();
    const canAdjustStock = isSuperAdminRole(useAuthStore((state) => state.user?.role));

    const [rows, setRows] = useState<RetailProductDto[]>([]);
    const [summary, setSummary] = useState<RetailCatalogSummaryDto | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [historyProduct, setHistoryProduct] = useState<RetailProductDto | null>(null);
    const [adjustProduct, setAdjustProduct] = useState<RetailProductDto | null>(null);
    const [editProduct, setEditProduct] = useState<RetailProductDto | null>(null);
    const [formOpen, setFormOpen] = useState(false);

    const money = (value: number) => formatCurrency(value, currency);

    const load = async () => {
        setLoading(true);
        setError(false);
        try {
            const [catalog, headline] = await Promise.all([
                retailApi.catalog({ pageNumber, pageSize, search, currentBranchOnly: true }),
                retailApi.summary(true),
            ]);
            setRows(catalog.items);
            setTotalCount(catalog.totalCount);
            setSummary(headline);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [pageNumber, pageSize, search, branchVersion]);

    // A new search always starts at the first page, or the list can come back empty.
    useEffect(() => {
        setPageNumber(1);
    }, [search]);

    // The shell owns the one "Add inventory item" button; this opens the matching form.
    useEffect(() => {
        if (createSignal > 0) {
            setEditProduct(null);
            setFormOpen(true);
        }
    }, [createSignal]);

    return (
        <div className="space-y-4">
            {summary && (
                <RetailStatTiles
                    columns={4}
                    tiles={[
                        { label: ar ? "الأصناف" : "Items", value: String(summary.productCount) },
                        { label: ar ? "الوحدات بالمخزون" : "Units in stock", value: String(summary.totalStockUnits) },
                        { label: ar ? "قيمة المخزون بالتكلفة" : "Stock at cost", value: money(summary.inventoryValueAtCost) },
                        {
                            label: ar ? "يحتاج انتباه" : "Needs attention",
                            value: String(summary.outOfStockCount + summary.reorderCount),
                            hint: ar
                                ? `${summary.outOfStockCount} نفد، ${summary.reorderCount} إعادة طلب`
                                : `${summary.outOfStockCount} out, ${summary.reorderCount} to reorder`,
                        },
                    ]}
                />
            )}

            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            {ar
                                ? "المتوفر = مجموع حركات المخزون لهذا الفرع."
                                : "On hand is the sum of this branch's stock movements."}
                        </p>
                        <Button variant="outline" onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {loading && <RetailState kind="loading" ar={ar} />}
                    {!loading && error && <RetailState kind="error" ar={ar} onRetry={() => void load()} />}
                    {!loading && !error && rows.length === 0 && (
                        <RetailState
                            kind="empty"
                            ar={ar}
                            emptyText={
                                ar
                                    ? "لا توجد منتجات جاهزة في هذا الفرع. أضف صنفًا للبدء."
                                    : "This branch has no finished products yet. Add an inventory item to start."
                            }
                        />
                    )}

                    {!loading && !error && rows.length > 0 && (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{ar ? "الصنف" : "Item"}</TableHead>
                                            <TableHead>{ar ? "الرمز" : "Code"}</TableHead>
                                            <TableHead>{ar ? "النوع" : "Type"}</TableHead>
                                            <TableHead>{ar ? "الفئة" : "Category"}</TableHead>
                                            <TableHead>{ar ? "المورد" : "Source"}</TableHead>
                                            <TableHead>{ar ? "الوحدة" : "Unit"}</TableHead>
                                            <TableHead className="text-right">{ar ? "المخزون الحالي" : "Current stock"}</TableHead>
                                            <TableHead className="text-right">{ar ? "حد التنبيه" : "Alert level"}</TableHead>
                                            <TableHead className="text-right">{ar ? "تكلفة الوحدة" : "Unit cost"}</TableHead>
                                            <TableHead className="text-right">{ar ? "القيمة" : "Total value"}</TableHead>
                                            <TableHead className="text-center">{ar ? "الحالة" : "Status"}</TableHead>
                                            <TableHead className="text-end">{ar ? "إجراءات" : "Actions"}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="min-w-52">
                                                    <div className="font-medium">{row.displayName}</div>
                                                    {row.brand && (
                                                        <div className="text-xs text-muted-foreground">{row.brand}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    <div>{row.sku}</div>
                                                    {/* Barcode is only worth a second line when it differs from the SKU —
                                                        in the imported DOHA LUXE catalogue the two are the same value. */}
                                                    {row.barcode && row.barcode !== row.sku && (
                                                        <div className="text-muted-foreground">{row.barcode}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <InventoryTypeBadge type="finished" ar={ar} />
                                                </TableCell>
                                                <TableCell>{row.categoryDisplayName ?? "—"}</TableCell>
                                                <TableCell className="text-sm">{row.supplierDisplayName ?? "—"}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {ar ? "قطعة" : "pcs"}
                                                </TableCell>
                                                <TableCell className="text-right text-base font-semibold tabular-nums">
                                                    {row.stockOnHand}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                                    {row.reorderLevel}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {money(row.costPerItem ?? 0)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {money(row.stockOnHand * (row.costPerItem ?? 0))}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <StockStatusBadge status={row.stockStatus} ar={ar} />
                                                        {!row.isActive && <InventoryActiveBadge isActive={false} ar={ar} />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-end">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title={ar ? "تعديل" : "Edit"}
                                                            onClick={() => {
                                                                setEditProduct(row);
                                                                setFormOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        {canAdjustStock && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                title={ar ? "تسوية المخزون" : "Adjust stock"}
                                                                onClick={() => setAdjustProduct(row)}
                                                            >
                                                                <SlidersHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title={ar ? "حركات المخزون" : "Stock movements"}
                                                            onClick={() => setHistoryProduct(row)}
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title={ar ? "شراء" : "Purchase"}
                                                            onClick={() => router.push("/ntxadminpos/procurement")}
                                                        >
                                                            <ShoppingCart className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

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
                        </>
                    )}
                </CardContent>
            </Card>

            <FinishedProductDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                editProduct={editProduct}
                branchId={branchId}
                onSaved={() => void load()}
            />

            <StockAdjustmentDialog
                product={adjustProduct}
                onClose={() => setAdjustProduct(null)}
                onAdjusted={() => void load()}
            />

            <MovementHistoryDialog
                product={historyProduct}
                ar={ar}
                currency={currency}
                onClose={() => setHistoryProduct(null)}
            />
        </div>
    );
}
