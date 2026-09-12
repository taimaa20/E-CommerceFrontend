"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currencies";
import { retailPurchasingApi } from "@/lib/api-retail";
import { RetailState } from "@/components/retail/retail-shared";
import type { RetailProductDto, RetailStockMovementDto, RetailStockMovementType } from "@/types/retail";

const MOVEMENT_LABEL: Record<RetailStockMovementType, { en: string; ar: string }> = {
    OpeningBalance: { en: "Opening balance", ar: "رصيد افتتاحي" },
    PurchaseReceipt: { en: "Purchase receipt", ar: "استلام مشتريات" },
    Sale: { en: "Sale", ar: "بيع" },
    SaleReversal: { en: "Sale reversal", ar: "عكس بيع" },
    AdjustmentIncrease: { en: "Adjustment (+)", ar: "تسوية (+)" },
    AdjustmentDecrease: { en: "Adjustment (−)", ar: "تسوية (−)" },
};

/**
 * The audit trail behind a finished product's stock: every movement, oldest effect first in
 * the running balance, newest row on top. This is what makes "stock is the sum of its
 * movements" inspectable rather than just true.
 */
export function MovementHistoryDialog({
    product,
    ar,
    currency,
    onClose,
}: {
    product: RetailProductDto | null;
    ar: boolean;
    currency: string;
    onClose: () => void;
}) {
    const [movements, setMovements] = useState<RetailStockMovementDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!product) {
            setMovements([]);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(false);
        retailPurchasingApi
            .movements(product.productId)
            .then((rows) => {
                if (!cancelled) setMovements(rows);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [product]);

    const money = (value: number | null | undefined) =>
        value === null || value === undefined ? "—" : formatCurrency(value, currency);

    return (
        <Dialog open={product !== null} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {ar ? "حركات المخزون" : "Stock movements"} — {product?.sku} {product?.displayName}
                    </DialogTitle>
                </DialogHeader>

                {loading && <RetailState kind="loading" ar={ar} />}
                {!loading && error && <RetailState kind="error" ar={ar} />}
                {!loading && !error && movements.length === 0 && (
                    <RetailState kind="empty" ar={ar} emptyText={ar ? "لا توجد حركات." : "No movements yet."} />
                )}

                {!loading && !error && movements.length > 0 && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{ar ? "التاريخ" : "Date"}</TableHead>
                                    <TableHead>{ar ? "النوع" : "Type"}</TableHead>
                                    <TableHead>{ar ? "المستند" : "Document"}</TableHead>
                                    <TableHead className="text-right">{ar ? "الكمية" : "Qty"}</TableHead>
                                    <TableHead className="text-right">{ar ? "تكلفة الوحدة" : "Unit cost"}</TableHead>
                                    <TableHead className="text-right">{ar ? "الرصيد بعدها" : "Balance"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.map((movement) => (
                                    <TableRow key={movement.id}>
                                        <TableCell className="whitespace-nowrap text-sm">
                                            {new Date(movement.occurredAtUtc).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {ar
                                                    ? MOVEMENT_LABEL[movement.movementType]?.ar
                                                    : MOVEMENT_LABEL[movement.movementType]?.en}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{movement.sourceReference ?? "—"}</TableCell>
                                        <TableCell
                                            className={`text-right font-medium tabular-nums ${
                                                movement.quantity < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                                            }`}
                                        >
                                            {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{money(movement.unitCost)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{movement.balanceAfter}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
