"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { retailApi } from "@/lib/api-retail";
import type { RetailSaleLineDto } from "@/types/retail";

/**
 * Retail detail for the lines of ONE order, rendered inside the existing Orders screen.
 *
 * Retail orders are ordinary orders — this adds the merchandise facts the restaurant view has
 * no reason to carry (SKU, barcode, brand, approved vs sold price, cost and profit) so nobody
 * has to open a second "retail sales" screen to see them. It renders nothing at all for an
 * order with no retail lines, which is every restaurant order.
 */
export function RetailOrderLines({ orderId, currency }: { orderId: string; currency: string }) {
    const { locale } = useLocale();
    const ar = locale === "ar";

    const [lines, setLines] = useState<RetailSaleLineDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        retailApi
            .sales({ orderId, pageSize: 100 })
            .then((page) => {
                if (!cancelled) setLines(page.items);
            })
            .catch(() => {
                if (!cancelled) setLines([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [orderId]);

    if (loading || lines.length === 0) return null;

    const money = (value: number) => formatCurrency(value, currency);
    const totalCost = lines.reduce((sum, line) => sum + line.lineCost, 0);
    const totalProfit = lines.reduce((sum, line) => sum + line.lineProfit, 0);
    const anyMissingSnapshot = lines.some((line) => !line.hasCostSnapshot);

    return (
        <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Store className="h-4 w-4 text-primary" />
                {ar ? "تفاصيل الصنف" : "Item detail"}
            </div>

            <div className="space-y-2">
                {lines.map((line) => (
                    <div key={line.orderItemId} className="space-y-1 border-b pb-2 last:border-b-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-mono text-xs text-muted-foreground">{line.sku}</span>
                            <span className="font-medium">{line.productName}</span>
                            {line.brand && (
                                <Badge variant="outline" className="text-xs font-normal">
                                    {line.brand}
                                </Badge>
                            )}
                            {line.isPriceOverride && (
                                <Badge variant="outline" className="bg-amber-500/15 text-xs font-normal text-amber-600 dark:text-amber-400">
                                    {ar ? "سعر معدّل" : "Price override"}
                                </Badge>
                            )}
                            {line.isGift && (
                                <Badge variant="outline" className="bg-sky-500/15 text-xs font-normal text-sky-600 dark:text-sky-400">
                                    {ar ? "هدية" : "Gift"}
                                </Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                            {line.barcode && <Detail label={ar ? "الباركود" : "Barcode"} value={line.barcode} />}
                            <Detail label={ar ? "الكمية" : "Quantity"} value={String(line.quantity)} />
                            <Detail
                                label={ar ? "السعر المعتمد" : "Approved price"}
                                value={line.approvedUnitPrice === null || line.approvedUnitPrice === undefined ? "—" : money(line.approvedUnitPrice)}
                            />
                            <Detail label={ar ? "سعر البيع" : "Sold price"} value={money(line.soldUnitPrice)} />
                            <Detail label={ar ? "التكلفة" : "Cost"} value={money(line.lineCost)} />
                            <Detail label={ar ? "الربح" : "Profit"} value={money(line.lineProfit)} />
                            {line.supplierName && <Detail label={ar ? "المورد" : "Supplier"} value={line.supplierName} />}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">{ar ? "تكلفة البضاعة / الربح" : "Cost of goods / profit"}</span>
                <span className="font-medium tabular-nums">
                    {money(totalCost)} / {money(totalProfit)}
                </span>
            </div>

            {anyMissingSnapshot && (
                <p className="text-xs text-muted-foreground">
                    {ar
                        ? "بعض الأسطر لم تُخصم من المخزون بعد، لذا التكلفة تقديرية حتى الاستيفاء."
                        : "Some lines have not been relieved from stock yet, so their cost is indicative until fulfilment."}
                </p>
            )}
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span>{label}: </span>
            <span className="font-medium text-foreground">{value}</span>
        </div>
    );
}
