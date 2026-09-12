"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";
import { WorkbookSource } from "@/components/retail/workbook-source";
import type { RetailProductDetail } from "@/types/retail";

/**
 * Inventory and costing for a product that is stocked and sold as itself - SKU, brand, the
 * supplier it comes from, and the cost that drives its margin. Held as strings so
 * partially-typed input never fights the user.
 *
 * `enabled` mirrors the inventory behaviour chosen on the General tab: it is what tells the
 * backend to keep a stock record for this product at all, so it is set there and never
 * toggled from inside this section.
 */
export interface InventoryCostingFormState {
    enabled: boolean;
    sku: string;
    barcode: string;
    brand: string;
    sizeLabel: string;
    countryOfOrigin: string;
    supplierId: string;
    receivedQuantity: string;
    supplierCostTotal: string;
    shippingCostPerUnit: string;
    targetMarginPercent: string;
}

export const emptyInventoryCostingForm: InventoryCostingFormState = {
    enabled: false,
    sku: "",
    barcode: "",
    brand: "",
    sizeLabel: "",
    countryOfOrigin: "",
    supplierId: "",
    receivedQuantity: "0",
    supplierCostTotal: "0",
    shippingCostPerUnit: "0",
    targetMarginPercent: "",
};

export function inventoryCostingFormFromDetail(detail: RetailProductDetail | null | undefined): InventoryCostingFormState {
    if (!detail) return emptyInventoryCostingForm;
    return {
        enabled: true,
        sku: detail.sku ?? "",
        barcode: detail.barcode ?? "",
        brand: detail.brand ?? "",
        sizeLabel: detail.sizeLabel ?? "",
        countryOfOrigin: detail.countryOfOrigin ?? "",
        supplierId: detail.supplierId ?? "",
        receivedQuantity: String(detail.receivedQuantity ?? 0),
        supplierCostTotal: String(detail.supplierCostTotal ?? 0),
        shippingCostPerUnit: String(detail.shippingCostPerUnit ?? 0),
        targetMarginPercent: detail.targetMarginPercent == null ? "" : String(detail.targetMarginPercent),
    };
}

/**
 * Undefined when the product is not stocked as a finished good, so the backend leaves any
 * existing stock record untouched rather than deleting it. Switching a product back to
 * recipe-based therefore hides this section without discarding what it held.
 */
export function inventoryCostingPayloadFromForm(form: InventoryCostingFormState) {
    if (!form.enabled || !form.sku.trim()) return undefined;
    const number = (value: string) => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };
    const margin = Number.parseFloat(form.targetMarginPercent);

    return {
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        brand: form.brand.trim() || undefined,
        sizeLabel: form.sizeLabel.trim() || undefined,
        countryOfOrigin: form.countryOfOrigin.trim() || undefined,
        supplierId: form.supplierId || undefined,
        receivedQuantity: number(form.receivedQuantity),
        supplierCostTotal: number(form.supplierCostTotal),
        shippingCostPerUnit: number(form.shippingCostPerUnit),
        targetMarginPercent: Number.isFinite(margin) ? margin : undefined,
    };
}

export interface SupplierOption {
    id: string;
    name: string;
}

interface InventoryCostingFieldsProps {
    form: InventoryCostingFormState;
    onChange: (next: InventoryCostingFormState) => void;
    suppliers: SupplierOption[];
    costPerItem: number;
    approvedPrice: number;
    currencyFormatter: (value: number) => string;
    detail?: RetailProductDetail | null;
}

export function InventoryCostingFields({
    form,
    onChange,
    suppliers,
    costPerItem,
    approvedPrice,
    currencyFormatter,
    detail,
}: InventoryCostingFieldsProps) {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const set = (patch: Partial<InventoryCostingFormState>) => onChange({ ...form, ...patch });

    const margin = Number.parseFloat(form.targetMarginPercent);
    const calculatedPrice =
        costPerItem > 0 && Number.isFinite(margin) && margin >= 0 && margin < 100
            ? Math.round(costPerItem / (1 - margin / 100))
            : null;
    const profitPerUnit = costPerItem > 0 ? approvedPrice - costPerItem : null;

    return (
        <div className="space-y-4">
            <div>
                <p className="text-sm text-muted-foreground">
                    {ar
                        ? "بيانات الصنف كما يُشترى ويُخزَّن: الرمز والعلامة والمورّد والتكلفة التي يُحسب عليها الهامش."
                        : "How this item is bought and held: its code, brand, supplier, and the cost its margin is worked out from."}
                </p>
                <div className="mt-2">
                    <WorkbookSource sheet="PRODUCT MASTER" />
                </div>
            </div>

            {form.enabled && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label>{ar ? "رمز المنتج (SKU) *" : "SKU *"}</Label>
                            <Input
                                value={form.sku}
                                onChange={(e) => set({ sku: e.target.value })}
                                placeholder={ar ? "مثال: 6290360591421" : "e.g. 6290360591421"}
                            />
                        </div>
                        <div>
                            <Label>{ar ? "الباركود" : "Barcode"}</Label>
                            <Input value={form.barcode} onChange={(e) => set({ barcode: e.target.value })} />
                        </div>
                        <div>
                            <Label>{ar ? "العلامة التجارية" : "Brand"}</Label>
                            <Input value={form.brand} onChange={(e) => set({ brand: e.target.value })} />
                        </div>
                        <div>
                            <Label>{ar ? "الحجم" : "Size"}</Label>
                            <Input
                                value={form.sizeLabel}
                                onChange={(e) => set({ sizeLabel: e.target.value })}
                                placeholder={ar ? "مثال: 100 ML" : "e.g. 100 ML"}
                            />
                        </div>
                        <div>
                            <Label>{ar ? "المورّد" : "Supplier"}</Label>
                            <Select
                                value={form.supplierId || "none"}
                                onValueChange={(value) => set({ supplierId: value === "none" ? "" : value })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                                    {suppliers.map((supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>{ar ? "بلد المنشأ" : "Country of origin"}</Label>
                            <Input
                                value={form.countryOfOrigin}
                                onChange={(e) => set({ countryOfOrigin: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <Label>{ar ? "الكمية المستلمة (رصيد افتتاحي)" : "Received qty (opening balance)"}</Label>
                            <Input
                                type="number"
                                min="0"
                                value={form.receivedQuantity}
                                onChange={(e) => set({ receivedQuantity: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>{ar ? "إجمالي تكلفة المورّد" : "Total supplier cost"}</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.supplierCostTotal}
                                onChange={(e) => set({ supplierCostTotal: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>{ar ? "تكلفة الشحن للوحدة" : "Shipping cost / unit"}</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={form.shippingCostPerUnit}
                                onChange={(e) => set({ shippingCostPerUnit: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>{ar ? "الهامش المستهدف %" : "Target margin %"}</Label>
                            <Input
                                type="number"
                                min="0"
                                max="99.99"
                                step="0.01"
                                value={form.targetMarginPercent}
                                onChange={(e) => set({ targetMarginPercent: e.target.value })}
                                placeholder="50"
                            />
                        </div>
                    </div>

                    <Card className="bg-muted/40">
                        <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-4">
                            <ReadOnlyFigure
                                label={ar ? "تكلفة الوحدة" : "Cost per item"}
                                value={costPerItem > 0 ? currencyFormatter(costPerItem) : "—"}
                                hint={ar ? "من تبويب المالية" : "from the Finance tab"}
                            />
                            <ReadOnlyFigure
                                label={ar ? "السعر المحسوب" : "Calculated price"}
                                value={calculatedPrice != null ? currencyFormatter(calculatedPrice) : "—"}
                                hint={ar ? "التكلفة ÷ (١ − الهامش)" : "cost ÷ (1 − margin)"}
                            />
                            <ReadOnlyFigure
                                label={ar ? "السعر المعتمد" : "Approved price"}
                                value={approvedPrice > 0 ? currencyFormatter(approvedPrice) : "—"}
                                hint={ar ? "سعر البيع الأساسي" : "the product's base price"}
                            />
                            <ReadOnlyFigure
                                label={ar ? "ربح الوحدة" : "Profit per unit"}
                                value={profitPerUnit != null ? currencyFormatter(profitPerUnit) : "—"}
                                hint={ar ? "المعتمد − التكلفة" : "approved − cost"}
                            />
                        </CardContent>
                    </Card>

                    {detail && (
                        <p className="text-xs text-muted-foreground">
                            {ar
                                ? `المخزون الحالي: ${detail.stockOnHand} (مستلم ${detail.receivedQuantity} − مباع ${detail.soldQuantity}).`
                                : `Current stock: ${detail.stockOnHand} (received ${detail.receivedQuantity} − sold ${detail.soldQuantity}).`}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

function ReadOnlyFigure({ label, value, hint }: { label: string; value: string; hint: string }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
    );
}
