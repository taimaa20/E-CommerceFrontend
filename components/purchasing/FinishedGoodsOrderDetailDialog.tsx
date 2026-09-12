"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PurchaseStageBadge } from "@/components/purchasing/purchasing-shared";
import { formatCurrency } from "@/lib/currencies";
import type { PurchaseOrderStage } from "@/lib/api-purchasing";
import type { RetailPurchaseOrderDto, RetailPurchaseOrderStatus } from "@/types/retail";

/**
 * The detail view of a finished-goods purchase order: what was ordered, what arrived, and how
 * the shipping and clearance charges were spread across the lines to give each unit the cost
 * that actually enters stock.
 */
const STAGE_OF: Record<RetailPurchaseOrderStatus, PurchaseOrderStage> = {
    Draft: "Draft",
    Submitted: "Ordered",
    Received: "Completed",
    Cancelled: "Cancelled",
};

export function FinishedGoodsOrderDetailDialog({
    order,
    ar,
    currency,
    onClose,
}: {
    order: RetailPurchaseOrderDto | null;
    ar: boolean;
    currency: string;
    onClose: () => void;
}) {
    const money = (value: number) => formatCurrency(value, currency);

    return (
        <Dialog open={order !== null} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {order?.orderNumber} — {order?.supplierName}
                    </DialogTitle>
                </DialogHeader>

                {order && (
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            <div>
                                <p className="text-xs text-muted-foreground">{ar ? "الحالة" : "Stage"}</p>
                                <div className="mt-1">
                                    <PurchaseStageBadge stage={STAGE_OF[order.status]} ar={ar} />
                                </div>
                            </div>
                            <Fact label={ar ? "الفاتورة" : "Invoice"} value={order.invoiceNumber ?? "—"} />
                            <Fact
                                label={ar ? "تاريخ الاستلام" : "Received"}
                                value={order.receivedAtUtc ? new Date(order.receivedAtUtc).toLocaleString() : "—"}
                            />
                            <Fact
                                label={ar ? "توزيع التكاليف" : "Charges spread"}
                                value={order.landedCostAllocation === "ByValue"
                                    ? (ar ? "حسب القيمة" : "By value")
                                    : ar ? "حسب الكمية" : "By quantity"}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{ar ? "الرمز" : "SKU"}</TableHead>
                                        <TableHead>{ar ? "المنتج" : "Product"}</TableHead>
                                        <TableHead className="text-right">{ar ? "مطلوب" : "Ordered"}</TableHead>
                                        <TableHead className="text-right">{ar ? "مستلم" : "Received"}</TableHead>
                                        <TableHead className="text-right">{ar ? "تكلفة الوحدة" : "Unit cost"}</TableHead>
                                        <TableHead className="text-right">{ar ? "حصة الشحن" : "Charges"}</TableHead>
                                        <TableHead className="text-right">{ar ? "التكلفة النهائية" : "Landed unit"}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.lines.map((line) => (
                                        <TableRow key={line.id}>
                                            <TableCell className="font-mono text-xs">{line.sku}</TableCell>
                                            <TableCell className="min-w-48">{line.productName}</TableCell>
                                            <TableCell className="text-right tabular-nums">{line.quantityOrdered}</TableCell>
                                            <TableCell className="text-right tabular-nums">{line.quantityReceived}</TableCell>
                                            <TableCell className="text-right tabular-nums">{money(line.unitCost)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{money(line.allocatedCharges)}</TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">{money(line.landedUnitCost)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="rounded-lg border p-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{ar ? "تكلفة البضاعة" : "Goods cost"}</span>
                                <span className="tabular-nums">{money(order.goodsCost)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{ar ? "شحن وجمارك وتخليص" : "Shipping, customs, clearance"}</span>
                                <span className="tabular-nums">
                                    {money(order.shippingCost + order.customsCost + order.clearanceCost)}
                                </span>
                            </div>
                            <div className="mt-1 flex justify-between border-t pt-1 font-medium">
                                <span>{ar ? "الإجمالي" : "Total"}</span>
                                <span className="tabular-nums">{money(order.totalCost)}</span>
                            </div>
                        </div>

                        {order.stockPosted && (
                            <p className="text-xs text-muted-foreground">
                                {ar
                                    ? "تم ترحيل حركات المخزون لهذا الأمر. إعادة الاستلام لن تضاعف الكمية."
                                    : "Stock movements for this order have been posted. Receiving it again will not double the quantity."}
                            </p>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    );
}
