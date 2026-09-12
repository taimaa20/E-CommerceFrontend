"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/components/locale-provider";
import { useSettingsStore } from "@/store/settingsStore";
import { formatCurrency } from "@/lib/currencies";
import { createProduct, updateProduct, getCategories } from "@/lib/api";
import type { CategoryDto } from "@/types/pos";
import { ProcurementApi, type Supplier } from "@/lib/api-procurement";
import {
    createBranchConfiguration,
    deleteBranchConfiguration,
    getBranchConfigurations,
    type BranchProductConfiguration,
} from "@/lib/api-branch-configurations";
import { useBranchContextStore } from "@/store/branchContextStore";
import type { RetailProductDto } from "@/types/retail";

const NO_CATEGORY = "__none__";
const NO_SUPPLIER = "__none__";

interface FormState {
    name: string;
    nameAr: string;
    sku: string;
    barcode: string;
    brand: string;
    categoryId: string;
    sizeLabel: string;
    supplierId: string;
    countryOfOrigin: string;
    targetMarginPercent: string;
    basePrice: string;
    costPrice: string;
    openingQuantity: string;
    isActive: boolean;
}

const emptyForm: FormState = {
    name: "",
    nameAr: "",
    sku: "",
    barcode: "",
    brand: "",
    categoryId: NO_CATEGORY,
    sizeLabel: "",
    supplierId: NO_SUPPLIER,
    countryOfOrigin: "",
    targetMarginPercent: "",
    basePrice: "",
    costPrice: "0",
    openingQuantity: "0",
    isActive: true,
};

/**
 * Create or edit a finished product from the Inventory module.
 *
 * It writes through the SAME product endpoints the Products screen uses, with the same
 * optional `retail` block — so a product added here is the one Product record that shows up in
 * Products, the POS, the online shop, Orders and Reports. There is no inventory-only product.
 *
 * Stock is deliberately absent from the edit path: an existing product's position is the sum of
 * its movements, so it changes through a purchase receipt, a sale, or an explicit adjustment.
 * The opening quantity is offered once, at creation, and becomes the product's first movement.
 */
export function FinishedProductDialog({
    open,
    onOpenChange,
    editProduct,
    branchId,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (value: boolean) => void;
    /** Null to create. */
    editProduct: RetailProductDto | null;
    /** Active branch — a new product is assigned to it so it is stocked and sellable there. */
    branchId: string | null;
    onSaved: () => void;
}) {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const currency = useSettingsStore((state) => state.settings.currency);
    const branches = useBranchContextStore((state) => state.context?.assignedBranches ?? []);
    const mainBranchId = branches.find((b) => b.isMainBranch)?.id ?? null;

    const [form, setForm] = useState<FormState>(emptyForm);
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const isEdit = editProduct !== null;

    useEffect(() => {
        if (!open) return;
        void Promise.all([getCategories(), ProcurementApi.getSuppliers()])
            .then(([categoryRows, supplierRows]) => {
                setCategories(categoryRows.filter((c) => c.isActive));
                setSuppliers(supplierRows);
            })
            .catch(() => {
                setCategories([]);
                setSuppliers([]);
            });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        if (!editProduct) {
            setForm(emptyForm);
            return;
        }
        setForm({
            name: editProduct.name ?? "",
            nameAr: editProduct.nameAr ?? "",
            sku: editProduct.sku ?? "",
            barcode: editProduct.barcode ?? "",
            brand: editProduct.brand ?? "",
            categoryId: editProduct.categoryId ?? NO_CATEGORY,
            sizeLabel: editProduct.sizeLabel ?? "",
            supplierId: editProduct.supplierId ?? NO_SUPPLIER,
            countryOfOrigin: editProduct.countryOfOrigin ?? "",
            targetMarginPercent:
                editProduct.targetMarginPercent == null ? "" : String(editProduct.targetMarginPercent),
            basePrice: String(editProduct.approvedSellingPrice ?? 0),
            costPrice: String(editProduct.costPerItem ?? 0),
            openingQuantity: "0",
            isActive: editProduct.isActive,
        });
    }, [open, editProduct]);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key as string]: "" }));
    };

    const number = (value: string) => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const margin = Number.parseFloat(form.targetMarginPercent);
    const cost = number(form.costPrice);
    // The workbook's rule: margin is a share of the selling price, rounded to the nearest whole
    // unit. Shown as a suggestion — the approved price stays a human decision.
    const suggestedPrice =
        Number.isFinite(margin) && margin > 0 && margin < 100 && cost > 0
            ? Math.round(cost / (1 - margin / 100))
            : null;

    const validate = (): boolean => {
        const next: Record<string, string> = {};
        if (!form.name.trim()) next.name = ar ? "الاسم مطلوب" : "Name is required";
        if (!form.sku.trim()) next.sku = ar ? "الرمز مطلوب" : "SKU is required";
        if (form.categoryId === NO_CATEGORY) next.categoryId = ar ? "الفئة مطلوبة" : "Category is required";
        if (number(form.basePrice) < 0) next.basePrice = ar ? "قيمة غير صالحة" : "Invalid value";
        if (number(form.costPrice) < 0) next.costPrice = ar ? "قيمة غير صالحة" : "Invalid value";
        if (Number.isFinite(margin) && (margin < 0 || margin >= 100)) {
            next.targetMarginPercent = ar ? "يجب أن تكون بين 0 و 99.99" : "Must be between 0 and 99.99";
        }
        if (!isEdit && number(form.openingQuantity) < 0) {
            next.openingQuantity = ar ? "قيمة غير صالحة" : "Invalid value";
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const save = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                nameAr: form.nameAr.trim() || undefined,
                basePrice: number(form.basePrice),
                costPrice: number(form.costPrice),
                categoryId: form.categoryId,
                isActive: form.isActive,
                retail: {
                    sku: form.sku.trim(),
                    barcode: form.barcode.trim() || undefined,
                    brand: form.brand.trim() || undefined,
                    sizeLabel: form.sizeLabel.trim() || undefined,
                    countryOfOrigin: form.countryOfOrigin.trim() || undefined,
                    supplierId: form.supplierId === NO_SUPPLIER ? undefined : form.supplierId,
                    // Only meaningful on create; the backend ignores changes to it afterwards
                    // because stock belongs to the ledger.
                    receivedQuantity: isEdit ? 0 : number(form.openingQuantity),
                    supplierCostTotal: 0,
                    shippingCostPerUnit: 0,
                    targetMarginPercent: Number.isFinite(margin) ? margin : undefined,
                },
            };

            if (isEdit && editProduct) {
                await updateProduct(editProduct.productId, payload);
                toast.success(ar ? "تم تحديث المنتج" : "Product updated");
            } else {
                const created = await createProduct(payload);
                if (branchId && created?.id) {
                    try {
                        await placeOnBranchAsync(created.id, branchId, mainBranchId);
                    } catch {
                        toast.warning(
                            ar
                                ? "أُنشئ المنتج لكن لم يُربط بالفرع الحالي. اربطه من إعدادات الفرع."
                                : "Product created but not assigned to this branch. Assign it in branch configuration.",
                        );
                    }
                }
                toast.success(ar ? "تم إنشاء المنتج" : "Product created");
            }
            onSaved();
            onOpenChange(false);
        } catch (error) {
            const data = (error as { response?: { data?: unknown; status?: number } })?.response;
            const message =
                typeof data?.data === "string"
                    ? data.data
                    : (data?.data as { message?: string })?.message;
            if (data?.status === 409 || (message ?? "").toLowerCase().includes("sku")) {
                setErrors({ sku: message ?? (ar ? "الرمز مستخدم بالفعل" : "SKU already in use") });
            } else {
                toast.error(message ?? (ar ? "تعذّر الحفظ" : "Could not save"));
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit
                            ? ar
                                ? "تعديل منتج جاهز"
                                : "Edit product"
                            : ar
                              ? "منتج جاهز جديد"
                              : "New product"}
                    </DialogTitle>
                    <DialogDescription>
                        {ar
                            ? "يُنشأ كمنتج واحد يظهر في المنتجات ونقطة البيع والطلبات والتقارير."
                            : "Saved as one Product — the same record that appears in Products, the POS, Orders and Reports."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    <Section title={ar ? "التعريف" : "Identity"}>
                        <Field label={ar ? "الاسم" : "Name"} required error={errors.name}>
                            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
                        </Field>
                        <Field label={ar ? "الاسم بالعربية" : "Arabic name"}>
                            <Input dir="rtl" value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} />
                        </Field>
                        <Field label={ar ? "الرمز SKU" : "SKU"} required error={errors.sku}>
                            <Input
                                value={form.sku}
                                onChange={(e) => set("sku", e.target.value)}
                                disabled={isEdit && Boolean(editProduct?.sku)}
                            />
                        </Field>
                        <Field label={ar ? "الباركود" : "Barcode"}>
                            <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
                        </Field>
                        <Field label={ar ? "العلامة التجارية" : "Brand"}>
                            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
                        </Field>
                        <Field label={ar ? "الفئة" : "Category"} required error={errors.categoryId}>
                            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={ar ? "اختر فئة" : "Select a category"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.displayName || category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={ar ? "الحجم" : "Size"}>
                            <Input
                                value={form.sizeLabel}
                                onChange={(e) => set("sizeLabel", e.target.value)}
                                placeholder="100 ML"
                            />
                        </Field>
                    </Section>

                    <Section title={ar ? "التوريد" : "Sourcing"}>
                        <Field label={ar ? "المورد الأساسي" : "Primary supplier"}>
                            <Select value={form.supplierId} onValueChange={(v) => set("supplierId", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={ar ? "بدون مورد" : "No supplier"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_SUPPLIER}>{ar ? "بدون مورد" : "No supplier"}</SelectItem>
                                    {suppliers.map((supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id ?? ""}>
                                            {supplier.displayName || supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={ar ? "بلد المنشأ" : "Country of origin"}>
                            <Input
                                value={form.countryOfOrigin}
                                onChange={(e) => set("countryOfOrigin", e.target.value)}
                            />
                        </Field>
                    </Section>

                    <Section title={ar ? "التكلفة والسعر" : "Cost and price"}>
                        <Field label={ar ? "تكلفة الوحدة" : "Unit cost"} error={errors.costPrice}>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.costPrice}
                                onChange={(e) => set("costPrice", e.target.value)}
                            />
                        </Field>
                        <Field
                            label={ar ? "هامش الربح المستهدف %" : "Target margin %"}
                            error={errors.targetMarginPercent}
                        >
                            <Input
                                type="number"
                                min="0"
                                max="99.99"
                                step="0.01"
                                value={form.targetMarginPercent}
                                onChange={(e) => set("targetMarginPercent", e.target.value)}
                            />
                        </Field>
                        <Field label={ar ? "سعر البيع المعتمد" : "Approved selling price"} error={errors.basePrice}>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.basePrice}
                                onChange={(e) => set("basePrice", e.target.value)}
                            />
                        </Field>
                        {suggestedPrice !== null && (
                            <p className="flex items-start gap-1.5 text-xs text-muted-foreground sm:col-span-2">
                                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                                {ar
                                    ? `السعر المحسوب من الهامش: ${formatCurrency(suggestedPrice, currency)} — السعر المعتمد يبقى قرارك.`
                                    : `Calculated from the margin: ${formatCurrency(suggestedPrice, currency)} — the approved price stays your decision.`}
                            </p>
                        )}
                    </Section>

                    <Section title={ar ? "المخزون" : "Stock"}>
                        {isEdit ? (
                            <p className="flex items-start gap-1.5 text-xs text-muted-foreground sm:col-span-2">
                                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                                {ar
                                    ? "المخزون الحالي = مجموع حركات المخزون. غيّره باستلام أمر شراء أو بتسوية مخزون — لا يُحرَّر هنا."
                                    : "Current stock is the sum of this product's movements. Change it by receiving a purchase order or posting an adjustment — it is not edited here."}
                            </p>
                        ) : (
                            <>
                                <Field
                                    label={ar ? "الكمية الافتتاحية" : "Opening quantity"}
                                    error={errors.openingQuantity}
                                >
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.openingQuantity}
                                        onChange={(e) => set("openingQuantity", e.target.value)}
                                    />
                                </Field>
                                <p className="flex items-start gap-1.5 text-xs text-muted-foreground sm:col-span-2">
                                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                                    {ar
                                        ? "تُسجَّل مرة واحدة كأول حركة مخزون. بعدها تأتي الكميات من أوامر الشراء."
                                        : "Recorded once as the product's first stock movement. After that, stock comes in through purchase orders."}
                                </p>
                            </>
                        )}
                    </Section>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <Label>{ar ? "نشط" : "Active"}</Label>
                            <p className="text-xs text-muted-foreground">
                                {ar ? "المنتجات غير النشطة لا تُباع." : "Inactive products cannot be sold."}
                            </p>
                        </div>
                        <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        {ar ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button onClick={() => void save()} disabled={saving}>
                        {saving ? (ar ? "جارٍ الحفظ…" : "Saving…") : ar ? "حفظ" : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Puts a newly created product on the branch it was created for.
 *
 * Product creation always assigns to the Main branch, which is right for a restaurant product
 * and wrong for one stocked at a retail branch — it would leave the restaurant showing a
 * phantom zero-stock item. So when the operator is working on another branch, the product is
 * assigned there and the automatic Main assignment is withdrawn. This uses the Branch
 * Platform's own endpoints; it changes no platform behaviour.
 */
async function placeOnBranchAsync(
    productId: string,
    branchId: string,
    mainBranchId: string | null,
): Promise<void> {
    await createBranchConfiguration("products", {
        branchId,
        productId,
        isAvailable: true,
        isVisible: true,
        displayOrder: 0,
    });

    if (!mainBranchId || mainBranchId === branchId) return;

    const onMain = await getBranchConfigurations<BranchProductConfiguration>("products", {
        branchId: mainBranchId,
        productId,
        pageSize: 5,
    });

    for (const row of onMain.items) {
        await deleteBranchConfiguration("products", row.id);
    }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
            <div className="grid gap-3 sm:grid-cols-2">{children}</div>
        </div>
    );
}

function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label>
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            {children}
            {error && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" /> {error}
                </p>
            )}
        </div>
    );
}
