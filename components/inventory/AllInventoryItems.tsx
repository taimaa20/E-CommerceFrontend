"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, History, ShoppingCart, SlidersHorizontal } from "lucide-react";
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
import { getTranslatedUnit } from "@/lib/utils";
import { getRawMaterialsPaginated, type RawMaterial } from "@/lib/api";
import { retailApi } from "@/lib/api-retail";
import { RetailState, StockStatusBadge } from "@/components/retail/retail-shared";
import { InventoryActiveBadge, InventoryTypeBadge, type InventoryItemType } from "@/components/inventory/inventory-shared";
import { MovementHistoryDialog } from "@/components/inventory/StockMovementHistoryDialog";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { FinishedProductDialog } from "@/components/inventory/FinishedProductDialog";
import type { RetailProductDto, RetailStockStatus } from "@/types/retail";

/**
 * Everything this branch stocks, in one list.
 *
 * The two persistence models stay where they are — finished goods on the movement ledger, raw
 * materials on batches — and are merged here for reading only. Merge paging asks each source
 * for the window up to the requested page and combines them, so the read stays bounded and the
 * page numbers stay honest; nothing here writes stock.
 *
 * Row actions follow the row. A finished product is edited, adjusted and traced without
 * leaving this view. A raw material has its own batch, expiry and warehouse workflow, so its
 * Edit action takes the operator to the Raw materials filter with that item already searched,
 * rather than growing a second copy of that dialog here.
 */
export function AllInventoryItems({
    search,
    branchId,
    onOpenMaterial,
}: {
    search: string;
    branchId: string | null;
    /** Switches the module to the Raw materials filter, searching for this item. */
    onOpenMaterial: (name: string) => void;
}) {
    const router = useRouter();
    const { locale } = useLocale();
    const ar = locale === "ar";
    const currency = useSettingsStore((state) => state.settings.currency);
    const branchVersion = useActiveBranchVersion();
    const canAdjustStock = isSuperAdminRole(useAuthStore((state) => state.user?.role));

    const [rows, setRows] = useState<InventoryRow[]>([]);
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
        const readWindow = pageNumber * pageSize;
        try {
            // Each half is guarded on its own: a branch or a role may legitimately have only one.
            const [materials, catalogue] = await Promise.all([
                getRawMaterialsPaginated(1, readWindow, search, "name", "asc").catch(() => null),
                retailApi.catalog({ pageNumber: 1, pageSize: readWindow, search, currentBranchOnly: true }).catch(() => null),
            ]);

            const merged = [
                ...((materials?.items ?? []) as RawMaterial[]).map((material) => toMaterialRow(material, ar, locale)),
                ...(catalogue?.items ?? []).map((product) => toFinishedRow(product, ar)),
            ].sort((a, b) => a.name.localeCompare(b.name, ar ? "ar" : "en"));

            setRows(merged.slice((pageNumber - 1) * pageSize, pageNumber * pageSize));
            setTotalCount((materials?.totalCount ?? 0) + (catalogue?.totalCount ?? 0));

            if (!materials && !catalogue) setError(true);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [pageNumber, pageSize, search, branchVersion]);

    useEffect(() => {
        setPageNumber(1);
    }, [search]);

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    {loading && <RetailState kind="loading" ar={ar} />}
                    {!loading && error && <RetailState kind="error" ar={ar} onRetry={() => void load()} />}
                    {!loading && !error && rows.length === 0 && (
                        <RetailState
                            kind="empty"
                            ar={ar}
                            emptyText={ar ? "لا توجد أصناف مطابقة." : "No inventory items match."}
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
                                            <TableHead>{ar ? "المصدر" : "Source"}</TableHead>
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
                                            <TableRow key={row.key}>
                                                <TableCell className="min-w-52">
                                                    <div className="font-medium">{row.name}</div>
                                                    {row.subtitle && (
                                                        <div className="text-xs text-muted-foreground">{row.subtitle}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{row.code}</TableCell>
                                                <TableCell><InventoryTypeBadge type={row.type} ar={ar} /></TableCell>
                                                <TableCell>{row.category}</TableCell>
                                                <TableCell className="text-sm">{row.source}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{row.unit}</TableCell>
                                                <TableCell className="text-right text-base font-semibold tabular-nums">
                                                    {row.stock}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                                    {row.alertLevel}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{money(row.unitCost)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{money(row.stock * row.unitCost)}</TableCell>
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
                                                                if (row.finished) {
                                                                    setEditProduct(row.finished);
                                                                    setFormOpen(true);
                                                                } else {
                                                                    onOpenMaterial(row.name);
                                                                }
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        {row.finished && canAdjustStock && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                title={ar ? "تسوية المخزون" : "Adjust stock"}
                                                                onClick={() => setAdjustProduct(row.finished ?? null)}
                                                            >
                                                                <SlidersHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title={ar ? "حركات المخزون" : "Stock movements"}
                                                            onClick={() => {
                                                                if (row.finished) setHistoryProduct(row.finished);
                                                                else onOpenMaterial(row.name);
                                                            }}
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

/** One inventory line, in the column vocabulary both types share. */
interface InventoryRow {
    key: string;
    type: InventoryItemType;
    name: string;
    subtitle?: string;
    code: string;
    category: string;
    source: string;
    unit: string;
    stock: number;
    alertLevel: number;
    unitCost: number;
    stockStatus: RetailStockStatus;
    isActive: boolean;
    /** Present for finished goods, which are edited and adjusted in place. */
    finished?: RetailProductDto;
}

function toFinishedRow(product: RetailProductDto, ar: boolean): InventoryRow {
    return {
        key: `finished-${product.id}`,
        type: "finished",
        name: product.displayName,
        subtitle: product.brand ?? undefined,
        code: product.sku,
        category: product.categoryDisplayName ?? "—",
        source: product.supplierDisplayName ?? "—",
        unit: ar ? "قطعة" : "pcs",
        stock: product.stockOnHand,
        alertLevel: product.reorderLevel,
        unitCost: product.costPerItem ?? 0,
        stockStatus: product.stockStatus,
        isActive: product.isActive,
        finished: product,
    };
}

function toMaterialRow(material: RawMaterial, ar: boolean, locale: "en" | "ar"): InventoryRow {
    return {
        key: `material-${material.id}`,
        type: "material",
        name: ar && material.nameAr?.trim() ? material.nameAr : material.displayName || material.name,
        code: "—",
        category: "—",
        source: material.defaultWarehouseName ?? "—",
        unit: getTranslatedUnit(material.unit, locale),
        stock: material.currentStock,
        alertLevel: material.minimumAlertLevel,
        unitCost: material.costPerUnit ?? 0,
        stockStatus: materialStockStatus(material),
        // Raw materials carry no active flag, so they never render an inactive chip.
        isActive: true,
    };
}

/** Same words the finished-goods list uses, worked out from the material own thresholds. */
function materialStockStatus(material: RawMaterial): RetailStockStatus {
    if (material.currentStock <= 0) return "OutOfStock";
    if (material.minimumAlertLevel > 0 && material.currentStock <= material.minimumAlertLevel) return "ReorderNow";
    return "Ok";
}
