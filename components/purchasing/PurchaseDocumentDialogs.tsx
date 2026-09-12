"use client";

import { useEffect, useState } from "react";
import {
    ChevronDown,
    Loader2,
    PackageCheck,
    Plus,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { StandardFilter } from "@/components/filters/StandardFilter";
import { useLocale } from "@/components/locale-provider";
import { PurchaseItemKindBadge } from "@/components/purchasing/purchasing-shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getRawMaterials, type RawMaterial } from "@/lib/api";
import {
    expenseInvoicesApi,
    getDuplicateInvoiceWarning,
    getExpenseInvoiceErrorMessage,
    type ExpenseInvoiceDuplicateWarning,
    type ExpensePaymentMethod,
} from "@/lib/api-expense-invoices";
import {
    ProcurementApi,
    type SimplePurchaseDetails,
    type SimplePurchasePayload,
    type Supplier,
} from "@/lib/api-procurement";
import { retailApi, retailPurchasingApi } from "@/lib/api-retail";
import type { PurchaseItemKind } from "@/lib/api-purchasing";
import type { RetailLandedCostAllocation, RetailProductDto } from "@/types/retail";
import { formatCurrency } from "@/lib/currencies";
import { generateUUID } from "@/lib/uuid";
import { useBranchContextStore } from "@/store/branchContextStore";
import { usePosStore } from "@/store/posStore";

const QUANTITY_STEP = "0.01";
const UNIT_COST_STEP = "0.001";

type PaymentChoice = "Unpaid" | "PartiallyPaid" | "Paid";

interface PurchaseLine {
    key: string;
    itemId: string;
    quantity: string;
    unitCost: string;
}

/**
 * One thing that can be bought, whichever stock model holds it. The picker offers raw
 * materials and finished products side by side; `kind` is what the form uses afterwards to
 * decide which receiving path the document takes.
 */
interface PurchasableItem {
    id: string;
    kind: PurchaseItemKind;
    label: string;
    searchText: string;
    unitLabel: string;
    defaultUnitCost: number;
}

/** Lookup ceiling for the finished-goods half of the picker. */
const CATALOG_LOOKUP_SIZE = 500;

function toPurchasableMaterial(material: RawMaterial, ar: boolean): PurchasableItem {
    return {
        id: material.id,
        kind: "RawMaterial",
        label: materialName(material, ar),
        searchText: `${material.name} ${material.nameAr ?? ""}`,
        unitLabel: unitName(material.unit, ar),
        defaultUnitCost: material.costPerUnit ?? 0,
    };
}

function toPurchasableProduct(product: RetailProductDto, ar: boolean): PurchasableItem {
    const name = ar && product.nameAr?.trim() ? product.nameAr : product.displayName || product.name;
    return {
        // The purchase line references the product, so the product id is the item id.
        id: product.productId,
        kind: "FinishedProduct",
        label: product.sku ? `${name} · ${product.sku}` : name,
        searchText: `${product.name} ${product.nameAr ?? ""} ${product.sku} ${product.barcode ?? ""} ${product.brand ?? ""}`,
        unitLabel: ar ? "وحدة" : "Unit",
        defaultUnitCost: product.costPerItem ?? 0,
    };
}

const copy = {
    purchases: ["Purchases", "المشتريات"],
    newPurchaseOrder: ["New Purchase Order", "أمر شراء جديد"],
    oneKindPerDocument: [
        "This order is for these items. Start another order to buy the other kind.",
        "هذا الأمر مخصص لهذا النوع من الأصناف. أنشئ أمرًا آخر لشراء النوع الآخر.",
    ],
    landedCosts: ["Shipping & clearance", "الشحن والتخليص"],
    landedCostsHint: [
        "Spread across the lines, so the cost that enters stock is what the goods actually cost to land.",
        "تُوزَّع على الأصناف، فتكون التكلفة الداخلة للمخزون هي التكلفة الفعلية حتى الوصول.",
    ],
    shipping: ["Shipping", "الشحن"],
    customs: ["Customs", "الجمارك"],
    clearance: ["Clearance", "التخليص"],
    allocation: ["Spread charges", "توزيع التكاليف"],
    byQuantity: ["By quantity", "حسب الكمية"],
    byValue: ["By value", "حسب القيمة"],
    goodsCost: ["Goods cost", "تكلفة البضاعة"],
    landedCharges: ["Shipping, customs, clearance", "شحن وجمارك وتخليص"],
    receiveNowFinishedHint: [
        "Stock increases the moment the order is received. Receiving it twice changes nothing.",
        "يزيد المخزون فور استلام الأمر. تكرار الاستلام لا يغيّر شيئًا.",
    ],
    invoiceNumber: ["Invoice Number", "رقم الفاتورة"],
    invoiceRequiredForFinancials: [
        "Add an invoice number to record tax, discount or payment.",
        "أضف رقم الفاتورة لتسجيل الضريبة أو الخصم أو الدفع.",
    ],
    supplier: ["Supplier", "المورّد"],
    searchSupplier: ["Search suppliers...", "ابحث عن مورد..."],
    noSuppliers: ["No suppliers found", "لا يوجد موردون"],
    addSupplier: ["Quick add supplier", "إضافة مورد سريعاً"],
    supplierName: ["English name", "الاسم بالإنجليزية"],
    supplierNameAr: ["Arabic name", "الاسم بالعربية"],
    mobile: ["Mobile number", "رقم الجوال"],
    add: ["Add", "إضافة"],
    invoiceDate: ["Purchase Date", "تاريخ الشراء"],
    purchaseInformation: ["Purchase Information", "معلومات الشراء"],
    itemsSection: ["Items", "الأصناف"],
    item: ["Item", "الصنف"],
    searchItem: ["Search items...", "ابحث عن صنف..."],
    noItems: ["No items found", "لا توجد أصناف"],
    quantity: ["Quantity", "الكمية"],
    unit: ["Unit", "الوحدة"],
    unitCost: ["Unit Cost", "تكلفة الوحدة"],
    lineTotal: ["Total", "الإجمالي"],
    addItem: ["Add Item", "إضافة صنف"],
    subtotal: ["Subtotal", "الإجمالي الفرعي"],
    tax: ["Tax", "الضريبة"],
    discount: ["Discount", "الخصم"],
    total: ["Total", "الإجمالي"],
    receiving: ["Receiving", "الاستلام"],
    receiveNow: ["Mark as received on save", "تحديدها كمستلمة عند الحفظ"],
    activeBranch: [
        "Approval is required before inventory is updated.",
        "يلزم الاعتماد قبل تحديث المخزون.",
    ],
    payment: ["Payment", "الدفع"],
    summary: ["Purchase Summary", "ملخص الشراء"],
    unpaid: ["Unpaid", "غير مدفوعة"],
    partiallyPaid: ["Partially Paid", "مدفوعة جزئياً"],
    paid: ["Paid", "مدفوعة"],
    paidAmount: ["Paid Amount", "المبلغ المدفوع"],
    paymentMethod: ["Payment Method", "طريقة الدفع"],
    reference: ["Payment reference (optional)", "مرجع الدفع (اختياري)"],
    attachment: ["Invoice attachment (optional)", "مرفق الفاتورة (اختياري)"],
    additionalPurchase: ["Additional Purchase Details", "تفاصيل شراء إضافية"],
    generatedOnSave: ["Generated automatically on save", "يتم إنشاؤه تلقائياً عند الحفظ"],
    additionalInvoice: ["Additional Invoice Details", "تفاصيل فاتورة إضافية"],
    dueDate: ["Invoice Due Date", "تاريخ استحقاق الفاتورة"],
    notes: ["Invoice Notes", "ملاحظات الفاتورة"],
    save: ["Save Purchase", "حفظ عملية الشراء"],
    saving: ["Saving...", "جارٍ الحفظ..."],
    purchaseNumber: ["Purchase #", "رقم الشراء"],
    date: ["Date", "التاريخ"],
    items: ["Items", "الأصناف"],
    paidColumn: ["Paid", "المدفوع"],
    balance: ["Balance", "الرصيد"],
    paymentStatus: ["Payment Status", "حالة الدفع"],
    receivingStatus: ["Receiving Status", "حالة الاستلام"],
    actions: ["Actions", "الإجراءات"],
    receive: ["Receive", "استلام"],
    approve: ["Approve", "اعتماد"],
    recordPayment: ["Record Payment", "تسجيل دفعة"],
    view: ["View", "عرض"],
    invoices: ["Invoices", "الفواتير"],
    search: ["Search purchase, invoice or supplier", "ابحث برقم الشراء أو الفاتورة أو المورد"],
    all: ["All", "الكل"],
    notReceived: ["Not Received", "غير مستلمة"],
    pendingApproval: ["Pending Approval", "بانتظار الاعتماد"],
    received: ["Received", "مستلمة"],
    approved: ["Approved", "معتمدة"],
    cancelled: ["Cancelled", "ملغاة"],
    loading: ["Loading...", "جارٍ التحميل..."],
    empty: ["No purchases match these filters.", "لا توجد مشتريات مطابقة."],
    previous: ["Previous", "السابق"],
    next: ["Next", "التالي"],
    purchaseDetails: ["Purchase Details", "تفاصيل عملية الشراء"],
    branch: ["Branch / Warehouse", "الفرع / المستودع"],
    receivedDate: ["Received Date", "تاريخ الاستلام"],
    close: ["Close", "إغلاق"],
    paymentSaved: ["Payment updated", "تم تحديث الدفعة"],
    purchaseSaved: ["Purchase saved", "تم حفظ عملية الشراء"],
    receivedSuccess: ["Purchase received and sent for approval", "تم استلام المشتريات وإرسالها للاعتماد"],
    approvedSuccess: ["Purchase approved and inventory updated", "تم اعتماد المشتريات وتحديث المخزون"],
    invalidForm: ["Complete the required purchase fields.", "أكمل حقول الشراء المطلوبة."],
    paymentInvalid: ["Paid amount must be between zero and the invoice total.", "يجب أن يكون المبلغ المدفوع بين صفر وإجمالي الفاتورة."],
    failed: ["Something went wrong", "حدث خطأ"],
    duplicateTitle: ["Possible duplicate invoice", "فاتورة مكررة محتملة"],
    duplicateText: ["This supplier already has an invoice with this number and date. Save anyway?", "يوجد لهذا المورد فاتورة بنفس الرقم والتاريخ. هل تريد الحفظ رغم ذلك؟"],
    continue: ["Continue and Save", "متابعة وحفظ"],
    cancel: ["Cancel", "إلغاء"],
    cash: ["Cash", "نقداً"],
    card: ["Card", "بطاقة"],
    bankTransfer: ["Bank Transfer", "تحويل بنكي"],
    cheque: ["Cheque", "شيك"],
    other: ["Other", "أخرى"],
    unspecified: ["Unspecified", "غير محدد"],
    remove: ["Remove item", "إزالة الصنف"],
} as const;
/**
 * The one New Purchase Order form.
 *
 * The operator picks a supplier and then items. What kind of item lands on the first line is
 * what decides the receiving path — a raw material goes through the batch/FIFO purchase, a
 * finished product through the stock-ledger purchase order — and the form shows only the cost
 * fields that path actually has. A document stays one kind, because the two receiving
 * implementations own their own totals and cannot share one set of charges.
 */
export function NewPurchaseOrderDialog({
    open,
    onOpenChange,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => Promise<void>;
}) {
    const { locale } = useLocale();
    const currency = usePosStore((state) => state.currency);
    const ar = locale === "ar";
    const t = (key: keyof typeof copy) => copy[key][ar ? 1 : 0];
    const currentBranch = useBranchContextStore((state) => state.context?.currentBranch);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [items, setItems] = useState<PurchasableItem[]>([]);
    const [supplierId, setSupplierId] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(today());
    const [dueDate, setDueDate] = useState("");
    const [lines, setLines] = useState<PurchaseLine[]>([blankLine()]);
    const [taxAmount, setTaxAmount] = useState("0");
    const [discountAmount, setDiscountAmount] = useState("0");
    const [shippingCost, setShippingCost] = useState("0");
    const [customsCost, setCustomsCost] = useState("0");
    const [clearanceCost, setClearanceCost] = useState("0");
    const [allocation, setAllocation] = useState<RetailLandedCostAllocation>("ByQuantity");
    const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("Unpaid");
    const [paidAmount, setPaidAmount] = useState("0");
    const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>("Unspecified");
    const [paymentReference, setPaymentReference] = useState("");
    const [receiveNow, setReceiveNow] = useState(true);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [invoiceNotes, setInvoiceNotes] = useState("");
    const [purchaseDetailsOpen, setPurchaseDetailsOpen] = useState(false);
    const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState(false);
    const [quickSupplier, setQuickSupplier] = useState(false);
    const [supplierName, setSupplierName] = useState("");
    const [supplierNameAr, setSupplierNameAr] = useState("");
    const [supplierMobile, setSupplierMobile] = useState("");
    const [savingSupplier, setSavingSupplier] = useState(false);
    const [saving, setSaving] = useState(false);
    const [duplicate, setDuplicate] = useState<ExpenseInvoiceDuplicateWarning | null>(null);

    const loadReferences = async () => {
        // Each lookup is guarded on its own: the two halves have different role grants, and a
        // buyer who may only see one of them must still get a working form for that one.
        const [supplierRows, materialRows, catalogue] = await Promise.all([
            ProcurementApi.getSuppliers().catch(() => [] as Supplier[]),
            getRawMaterials().catch(() => [] as RawMaterial[]),
            retailApi.catalog({ pageSize: CATALOG_LOOKUP_SIZE }).catch(() => null),
        ]);
        setSuppliers(supplierRows);
        setItems([
            ...materialRows.map((material) => toPurchasableMaterial(material, ar)),
            ...(catalogue?.items ?? []).map((product) => toPurchasableProduct(product, ar)),
        ]);
    };

    useEffect(() => {
        if (open) void loadReferences();
    }, [open]);

    const itemOf = (itemId: string) => items.find((item) => item.id === itemId);

    // The document kind follows the first item on it. Nothing asks the operator up front.
    const documentKind: PurchaseItemKind | null =
        lines.map((line) => itemOf(line.itemId)?.kind).find(Boolean) ?? null;
    const isFinishedGoods = documentKind === "FinishedProduct";

    const goodsCost = round2(lines.reduce(
        (sum, line) => sum + number(line.quantity) * number(line.unitCost),
        0,
    ));
    const landedCharges = round2(number(shippingCost) + number(customsCost) + number(clearanceCost));
    const subtotal = goodsCost;
    const total = isFinishedGoods
        ? round2(goodsCost + landedCharges)
        : round2(subtotal + number(taxAmount) - number(discountAmount));
    const resolvedPaid = isFinishedGoods
        ? 0
        : paymentChoice === "Paid"
            ? Math.max(total, 0)
            : paymentChoice === "Unpaid"
                ? 0
                : number(paidAmount);

    const updateLine = (key: string, change: Partial<PurchaseLine>) => {
        setLines((current) => current.map((line) => line.key === key ? { ...line, ...change } : line));
    };

    const selectItem = (line: PurchaseLine, itemId: string) => {
        const item = itemOf(itemId);
        updateLine(line.key, {
            itemId,
            unitCost: item && item.defaultUnitCost > 0
                ? item.defaultUnitCost.toFixed(3)
                : line.unitCost,
        });
    };

    const updateInvoiceNumber = (value: string) => {
        setInvoiceNumber(value);
        if (value.trim()) return;

        setTaxAmount("0");
        setDiscountAmount("0");
        setPaymentChoice("Unpaid");
        setPaidAmount("0");
        setPaymentMethod("Unspecified");
        setPaymentReference("");
        setDueDate("");
        setAttachment(null);
        setInvoiceNotes("");
        setInvoiceDetailsOpen(false);
    };

    const addQuickSupplier = async () => {
        if (!supplierName.trim() || !supplierMobile.trim()) {
            toast.error(t("invalidForm"));
            return;
        }
        setSavingSupplier(true);
        try {
            const created = await ProcurementApi.createSupplier({
                name: supplierName.trim(),
                nameAr: supplierNameAr.trim() || undefined,
                mobileNumber: supplierMobile.trim(),
                leadTimeDays: 3,
            });
            await loadReferences();
            if (created.id) setSupplierId(created.id);
            setQuickSupplier(false);
            setSupplierName("");
            setSupplierNameAr("");
            setSupplierMobile("");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("failed"));
        } finally {
            setSavingSupplier(false);
        }
    };

    const parsedLines = () => lines.map((line) => ({
        itemId: line.itemId,
        quantity: number(line.quantity),
        unitCost: number(line.unitCost),
    }));

    const linesAreValid = () => {
        const parsed = parsedLines();
        const unique = new Set(parsed.map((line) => line.itemId));
        return !parsed.some((line) => !line.itemId || line.quantity <= 0 || line.unitCost <= 0)
            && unique.size === parsed.length;
    };

    const saveFinishedGoodsOrder = async () => {
        const created = await retailPurchasingApi.create({
            supplierId,
            invoiceNumber: invoiceNumber.trim() || undefined,
            orderDateUtc: new Date(`${invoiceDate}T00:00:00Z`).toISOString(),
            shippingCost: number(shippingCost),
            customsCost: number(customsCost),
            clearanceCost: number(clearanceCost),
            landedCostAllocation: allocation,
            lines: parsedLines().map((line) => ({
                productId: line.itemId,
                quantity: line.quantity,
                unitCost: line.unitCost,
            })),
        });

        if (!created) throw new Error(t("failed"));

        // Receiving is the only thing that raises finished-goods stock, and it is idempotent,
        // so doing it here is the same document reaching the same state one step sooner.
        if (receiveNow) {
            await retailPurchasingApi.receive(created.id, { lines: [] });
        }
    };

    const saveRawMaterialPurchase = async (acknowledgeDuplicateWarning: boolean) => {
        const payload: SimplePurchasePayload = {
            supplierId,
            invoiceNumber: invoiceNumber.trim() || null,
            invoiceDate: new Date(`${invoiceDate}T00:00:00Z`).toISOString(),
            dueDate: dueDate ? new Date(`${dueDate}T00:00:00Z`).toISOString() : null,
            items: parsedLines().map((line) => ({
                rawMaterialId: line.itemId,
                quantity: line.quantity,
                unitCost: line.unitCost,
            })),
            taxAmount: number(taxAmount),
            discountAmount: number(discountAmount),
            paidAmount: resolvedPaid,
            currencyCode: currency,
            paymentMethod: paymentChoice === "Unpaid" ? "Unspecified" : paymentMethod,
            paymentMethodDetail: paymentChoice === "Unpaid"
                ? null
                : paymentReference.trim() || null,
            notes: invoiceNotes.trim() || null,
            receiveIntoInventory: receiveNow,
            acknowledgeDuplicateWarning,
        };

        const created = await ProcurementApi.createSimplePurchase(payload);
        if (attachment && created.invoiceId) {
            try {
                await expenseInvoicesApi.uploadAttachment(created.invoiceId, attachment);
            } catch {
                toast.error(ar
                    ? "تم حفظ الشراء، لكن تعذر رفع المرفق."
                    : "Purchase saved, but the attachment could not be uploaded.");
            }
        }
    };

    const save = async (acknowledgeDuplicateWarning = false) => {
        const hasInvoiceNumber = invoiceNumber.trim().length > 0;
        const hasInvoiceDetails = dueDate !== ""
            || invoiceNotes.trim() !== ""
            || paymentReference.trim() !== ""
            || attachment !== null;

        const invalid = !supplierId
            || !invoiceDate
            || !linesAreValid()
            || total < 0
            || (!isFinishedGoods && (
                (dueDate !== "" && dueDate < invoiceDate)
                || resolvedPaid < 0
                || resolvedPaid > total
                || (paymentChoice === "PartiallyPaid" && (resolvedPaid <= 0 || resolvedPaid >= total))
                || (paymentChoice !== "Unpaid" && paymentMethod === "Unspecified")
                || (!hasInvoiceNumber && (
                    number(taxAmount) > 0
                    || number(discountAmount) > 0
                    || resolvedPaid > 0
                    || hasInvoiceDetails
                ))
            ));
        if (invalid) {
            toast.error(t("invalidForm"));
            return;
        }

        setSaving(true);
        try {
            if (isFinishedGoods) {
                await saveFinishedGoodsOrder();
            } else {
                await saveRawMaterialPurchase(acknowledgeDuplicateWarning);
            }
            toast.success(t("purchaseSaved"));
            reset();
            onOpenChange(false);
            await onSaved();
        } catch (error) {
            const warning = getDuplicateInvoiceWarning(error);
            if (warning) {
                setDuplicate(warning);
            } else {
                toast.error(getExpenseInvoiceErrorMessage(error, t("failed")));
            }
        } finally {
            setSaving(false);
        }
    };

    const reset = () => {
        setSupplierId("");
        setInvoiceNumber("");
        setInvoiceDate(today());
        setDueDate("");
        setLines([blankLine()]);
        setTaxAmount("0");
        setDiscountAmount("0");
        setShippingCost("0");
        setCustomsCost("0");
        setClearanceCost("0");
        setAllocation("ByQuantity");
        setPaymentChoice("Unpaid");
        setPaidAmount("0");
        setPaymentMethod("Unspecified");
        setPaymentReference("");
        setReceiveNow(true);
        setAttachment(null);
        setInvoiceNotes("");
        setPurchaseDetailsOpen(false);
        setInvoiceDetailsOpen(false);
        setDuplicate(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(next) => {
                if (!next && !saving) reset();
                onOpenChange(next);
            }}>
                <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-[1150px] flex-col gap-0 overflow-hidden p-0 sm:w-[94vw] sm:max-w-[1150px]">
                    <DialogHeader className="shrink-0 border-b bg-background px-5 py-4 sm:px-6">
                        <DialogTitle>{t("newPurchaseOrder")}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-5 py-4 sm:px-6">
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold">{t("purchaseInformation")}</h3>
                            <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,.8fr)_minmax(0,1fr)]">
                                <Field label={`${t("supplier")} *`}>
                                    <div className="flex min-w-0 gap-2">
                                        <StandardFilter
                                            value={supplierId || null}
                                            onValueChange={(value) => setSupplierId(value ?? "")}
                                            options={suppliers
                                                .filter((supplier) => supplier.id)
                                                .map((supplier) => ({
                                                    value: supplier.id as string,
                                                    label: supplier.displayName || supplier.name,
                                                    searchText: `${supplier.name} ${supplier.nameAr ?? ""} ${supplier.mobileNumber ?? ""}`,
                                                }))}
                                            placeholder={t("supplier")}
                                            searchPlaceholder={t("searchSupplier")}
                                            emptyText={t("noSuppliers")}
                                            loadingText={t("loading")}
                                            clearLabel={t("cancel")}
                                            triggerClassName="min-w-0 flex-1"
                                        />
                                        <Button type="button" variant="outline" size="icon" title={t("addSupplier")} onClick={() => setQuickSupplier((value) => !value)}>
                                            <Plus className="size-4" />
                                        </Button>
                                    </div>
                                </Field>
                                <Field label={`${t("invoiceDate")} *`}>
                                    <Input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
                                </Field>
                                <Field label={t("invoiceNumber")}>
                                    <Input value={invoiceNumber} maxLength={50} onChange={(event) => updateInvoiceNumber(event.target.value)} />
                                </Field>
                            </div>

                            {quickSupplier && (
                                <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-2 lg:grid-cols-4">
                                    <Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder={t("supplierName")} />
                                    <Input value={supplierNameAr} onChange={(event) => setSupplierNameAr(event.target.value)} placeholder={t("supplierNameAr")} dir="rtl" />
                                    <Input value={supplierMobile} onChange={(event) => setSupplierMobile(event.target.value)} placeholder={t("mobile")} />
                                    <Button type="button" onClick={() => void addQuickSupplier()} disabled={savingSupplier}>
                                        {savingSupplier ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                        {t("add")}
                                    </Button>
                                </div>
                            )}
                        </section>

                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">{t("itemsSection")}</h3>
                                {documentKind && <PurchaseItemKindBadge kind={documentKind} ar={ar} />}
                            </div>
                            {documentKind && (
                                <p className="text-xs text-muted-foreground">{t("oneKindPerDocument")}</p>
                            )}
                            <div className="overflow-hidden rounded-lg border">
                                <div className="hidden grid-cols-[minmax(0,3fr)_minmax(0,.8fr)_minmax(0,.7fr)_minmax(0,1fr)_minmax(0,1.15fr)_auto] items-center gap-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground lg:grid">
                                    <span>{t("item")} *</span>
                                    <span>{t("quantity")} *</span>
                                    <span>{t("unit")}</span>
                                    <span>{t("unitCost")} *</span>
                                    <span className="text-end">{t("lineTotal")}</span>
                                    <span className="sr-only">{t("actions")}</span>
                                </div>
                                {lines.map((line, index) => {
                                    const item = itemOf(line.itemId);
                                    return (
                                        <div
                                            key={line.key}
                                            className={`grid min-w-0 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,3fr)_minmax(0,.8fr)_minmax(0,.7fr)_minmax(0,1fr)_minmax(0,1.15fr)_auto] lg:items-center ${index > 0 ? "border-t" : "lg:border-t"}`}
                                        >
                                            <Field
                                                label={`${t("item")} *`}
                                                className="sm:col-span-2 lg:col-span-1"
                                                labelClassName="lg:sr-only"
                                            >
                                                <StandardFilter
                                                    value={line.itemId || null}
                                                    onValueChange={(value) => value && selectItem(line, value)}
                                                    options={items.map((option) => ({
                                                        value: option.id,
                                                        label: option.label,
                                                        searchText: option.searchText,
                                                        disabled:
                                                            lines.some((other) => other.key !== line.key && other.itemId === option.id)
                                                            || (documentKind !== null && option.kind !== documentKind),
                                                    }))}
                                                    placeholder={t("item")}
                                                    searchPlaceholder={t("searchItem")}
                                                    emptyText={t("noItems")}
                                                    loadingText={t("loading")}
                                                    clearLabel={t("cancel")}
                                                    triggerClassName="min-w-0 w-full"
                                                />
                                            </Field>
                                            <Field label={`${t("quantity")} *`} labelClassName="lg:sr-only">
                                                <Input type="number" min={QUANTITY_STEP} step={QUANTITY_STEP} value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} />
                                            </Field>
                                            <Field label={t("unit")} labelClassName="lg:sr-only">
                                                <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm">
                                                    {item ? item.unitLabel : "—"}
                                                </div>
                                            </Field>
                                            <Field label={`${t("unitCost")} *`} labelClassName="lg:sr-only">
                                                <Input type="number" min={UNIT_COST_STEP} step={UNIT_COST_STEP} value={line.unitCost} onChange={(event) => updateLine(line.key, { unitCost: event.target.value })} />
                                            </Field>
                                            <Field label={t("lineTotal")} labelClassName="lg:sr-only">
                                                <div className="flex h-9 items-center justify-end whitespace-nowrap rounded-md bg-muted/30 px-3 text-sm font-medium">
                                                    {formatCurrency(number(line.quantity) * number(line.unitCost), currency)}
                                                </div>
                                            </Field>
                                            <div className="flex items-end justify-end lg:items-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t("remove")}
                                                    aria-label={t("remove")}
                                                    onClick={() => setLines((current) => current.length === 1 ? current : current.filter((item) => item.key !== line.key))}
                                                    disabled={lines.length === 1}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, blankLine()])}>
                                <Plus className="size-4" />
                                {t("addItem")}
                            </Button>
                        </section>

                        <label className="flex items-start gap-3 rounded-lg border p-4">
                            <Checkbox checked={receiveNow} onCheckedChange={(checked) => setReceiveNow(checked === true)} />
                            <span>
                                <span className="block text-sm font-medium">{t("receiveNow")}</span>
                                <span className="block text-xs text-muted-foreground">
                                    {isFinishedGoods ? t("receiveNowFinishedHint") : t("activeBranch")}
                                </span>
                            </span>
                        </label>

                        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                            {isFinishedGoods ? (
                                <section className="space-y-4 rounded-lg border p-4">
                                    <div>
                                        <h3 className="text-sm font-semibold">{t("landedCosts")}</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">{t("landedCostsHint")}</p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <Field label={t("shipping")}>
                                            <Input type="number" min="0" step="0.01" value={shippingCost} onChange={(event) => setShippingCost(event.target.value)} />
                                        </Field>
                                        <Field label={t("customs")}>
                                            <Input type="number" min="0" step="0.01" value={customsCost} onChange={(event) => setCustomsCost(event.target.value)} />
                                        </Field>
                                        <Field label={t("clearance")}>
                                            <Input type="number" min="0" step="0.01" value={clearanceCost} onChange={(event) => setClearanceCost(event.target.value)} />
                                        </Field>
                                    </div>
                                    <Field label={t("allocation")}>
                                        <Select value={allocation} onValueChange={(value) => setAllocation(value as RetailLandedCostAllocation)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ByQuantity">{t("byQuantity")}</SelectItem>
                                                <SelectItem value="ByValue">{t("byValue")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </section>
                            ) : (
                                <section className="space-y-4 rounded-lg border p-4">
                                    <h3 className="text-sm font-semibold">{t("payment")}</h3>
                                    <div className="space-y-2">
                                        <Label>{t("paymentStatus")}</Label>
                                        <RadioGroup
                                            value={paymentChoice}
                                            onValueChange={(value) => setPaymentChoice(value as PaymentChoice)}
                                            className="flex flex-wrap gap-x-5 gap-y-2"
                                            disabled={!invoiceNumber.trim()}
                                        >
                                            {(["Unpaid", "PartiallyPaid", "Paid"] as const).map((choice) => (
                                                <label key={choice} className="flex items-center gap-2 text-sm">
                                                    <RadioGroupItem value={choice} />
                                                    <span>{choice === "Unpaid" ? t("unpaid") : choice === "Paid" ? t("paid") : t("partiallyPaid")}</span>
                                                </label>
                                            ))}
                                        </RadioGroup>
                                        {!invoiceNumber.trim() && (
                                            <p className="text-xs text-muted-foreground">{t("invoiceRequiredForFinancials")}</p>
                                        )}
                                    </div>
                                    {paymentChoice !== "Unpaid" && (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {paymentChoice === "PartiallyPaid" && (
                                                <Field label={`${t("paidAmount")} *`}>
                                                    <Input type="number" min="0" max={Math.max(total, 0)} step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
                                                </Field>
                                            )}
                                            <Field label={`${t("paymentMethod")} *`}>
                                                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as ExpensePaymentMethod)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Unspecified">{t("unspecified")}</SelectItem>
                                                        <SelectItem value="Cash">{t("cash")}</SelectItem>
                                                        <SelectItem value="Card">{t("card")}</SelectItem>
                                                        <SelectItem value="BankTransfer">{t("bankTransfer")}</SelectItem>
                                                        <SelectItem value="Cheque">{t("cheque")}</SelectItem>
                                                        <SelectItem value="Other">{t("other")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                        </div>
                                    )}
                                </section>
                            )}

                            <section className="space-y-3 rounded-lg border p-4">
                                <h3 className="text-sm font-semibold">{t("summary")}</h3>
                                <SummaryRow label={isFinishedGoods ? t("goodsCost") : t("subtotal")} value={formatCurrency(subtotal, currency)} />
                                {isFinishedGoods ? (
                                    <SummaryRow label={t("landedCharges")} value={formatCurrency(landedCharges, currency)} />
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between gap-4">
                                            <Label htmlFor="purchase-tax">{t("tax")}</Label>
                                            <Input id="purchase-tax" className="h-9 w-32 text-end" type="number" min="0" step="0.01" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} disabled={!invoiceNumber.trim()} />
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <Label htmlFor="purchase-discount">{t("discount")}</Label>
                                            <Input id="purchase-discount" className="h-9 w-32 text-end" type="number" min="0" step="0.01" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} disabled={!invoiceNumber.trim()} />
                                        </div>
                                    </>
                                )}
                                <SummaryRow label={t("total")} value={formatCurrency(total, currency)} strong />
                                {!isFinishedGoods && (
                                    <>
                                        <SummaryRow label={t("paidColumn")} value={formatCurrency(resolvedPaid, currency)} />
                                        <SummaryRow label={t("balance")} value={formatCurrency(Math.max(0, total - resolvedPaid), currency)} />
                                    </>
                                )}
                            </section>
                        </div>

                        <section className="rounded-lg border">
                            <Button type="button" variant="ghost" className="w-full justify-between rounded-lg px-4" onClick={() => setPurchaseDetailsOpen((value) => !value)}>
                                {t("additionalPurchase")}
                                <ChevronDown className={`size-4 transition-transform ${purchaseDetailsOpen ? "rotate-180" : ""}`} />
                            </Button>
                            {purchaseDetailsOpen && (
                                <div className="grid gap-3 border-t p-4 sm:grid-cols-2">
                                    <SummaryRow
                                        label={t("purchaseNumber")}
                                        value={t("generatedOnSave")}
                                    />
                                    <SummaryRow
                                        label={t("branch")}
                                        value={currentBranch
                                            ? ar && currentBranch.nameAr?.trim()
                                                ? currentBranch.nameAr
                                                : currentBranch.name
                                            : "—"}
                                    />
                                </div>
                            )}
                        </section>

                        {!isFinishedGoods && (
                            <section className="rounded-lg border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-between rounded-lg px-4"
                                    onClick={() => setInvoiceDetailsOpen((value) => !value)}
                                    disabled={!invoiceNumber.trim()}
                                >
                                    {t("additionalInvoice")}
                                    <ChevronDown className={`size-4 transition-transform ${invoiceDetailsOpen ? "rotate-180" : ""}`} />
                                </Button>
                                {invoiceDetailsOpen && invoiceNumber.trim() && (
                                    <div className="grid gap-4 border-t p-4 md:grid-cols-2">
                                        <Field label={t("dueDate")}>
                                            <Input type="date" min={invoiceDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                                        </Field>
                                        <Field label={t("attachment")}>
                                            <Input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />
                                        </Field>
                                        {paymentChoice !== "Unpaid" && (
                                            <Field label={t("reference")}>
                                                <Input value={paymentReference} maxLength={120} onChange={(event) => setPaymentReference(event.target.value)} />
                                            </Field>
                                        )}
                                        <div className="md:col-span-2">
                                            <Field label={t("notes")}>
                                                <Textarea rows={3} maxLength={2000} value={invoiceNotes} onChange={(event) => setInvoiceNotes(event.target.value)} />
                                            </Field>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    <DialogFooter className="shrink-0 border-t bg-background px-5 py-4 sm:px-6">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("cancel")}</Button>
                        <Button onClick={() => void save()} disabled={saving}>
                            {saving ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                            {saving ? t("saving") : t("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!duplicate} onOpenChange={(next) => !next && setDuplicate(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t("duplicateTitle")}</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">{t("duplicateText")}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDuplicate(null)}>{t("cancel")}</Button>
                        <Button onClick={() => {
                            setDuplicate(null);
                            void save(true);
                        }}>{t("continue")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
/**
 * The minimum a purchase document needs before a payment can be recorded against it. Stated
 * structurally so the dialog serves the unified list without knowing which table the row
 * came from — only a document with an invoice can be paid, and the flag says so.
 */
export interface PayablePurchaseDocument {
    invoiceId?: string | null;
    totalAmount: number;
    paidAmount: number;
    balance: number;
}

export function RecordPaymentDialog({
    order,
    onOpenChange,
    onSaved,
}: {
    order: PayablePurchaseDocument | null;
    onOpenChange: (open: boolean) => void;
    onSaved: () => Promise<void>;
}) {
    const { locale } = useLocale();
    const currency = usePosStore((state) => state.currency);
    const ar = locale === "ar";
    const t = (key: keyof typeof copy) => copy[key][ar ? 1 : 0];
    const [paidAmount, setPaidAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>("Unspecified");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setPaidAmount(order ? String(order.paidAmount ?? 0) : "");
    }, [order]);

    const save = async () => {
        if (!order?.invoiceId) return;
        const amount = number(paidAmount);
        const total = order.totalAmount;
        if (amount < 0 || amount > total) {
            toast.error(t("paymentInvalid"));
            return;
        }
        setSaving(true);
        try {
            await expenseInvoicesApi.updatePayment(order.invoiceId, { paidAmount: amount, paymentMethod });
            toast.success(t("paymentSaved"));
            onOpenChange(false);
            await onSaved();
        } catch (error) {
            toast.error(getExpenseInvoiceErrorMessage(error, t("failed")));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={!!order} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>{t("recordPayment")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <SummaryRow label={t("total")} value={formatCurrency(order?.totalAmount ?? 0, currency)} />
                    <SummaryRow label={t("balance")} value={formatCurrency(order?.balance ?? 0, currency)} />
                    <Field label={t("paidAmount")}>
                        <Input type="number" min="0" max={order?.totalAmount ?? 0} step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
                    </Field>
                    <Field label={t("paymentMethod")}>
                        <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as ExpensePaymentMethod)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Unspecified">{t("unspecified")}</SelectItem>
                                <SelectItem value="Cash">{t("cash")}</SelectItem>
                                <SelectItem value="Card">{t("card")}</SelectItem>
                                <SelectItem value="BankTransfer">{t("bankTransfer")}</SelectItem>
                                <SelectItem value="Cheque">{t("cheque")}</SelectItem>
                                <SelectItem value="Other">{t("other")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
                    <Button onClick={() => void save()} disabled={saving}>
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        {t("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function PurchaseDetailsDialog({
    details,
    onOpenChange,
}: {
    details: SimplePurchaseDetails | null;
    onOpenChange: (open: boolean) => void;
}) {
    const { locale } = useLocale();
    const configuredCurrency = usePosStore((state) => state.currency);
    const ar = locale === "ar";
    const t = (key: keyof typeof copy) => copy[key][ar ? 1 : 0];
    const detailCurrency = details?.currencyCode || configuredCurrency;
    return (
        <Dialog open={!!details} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader><DialogTitle>{t("purchaseDetails")}</DialogTitle></DialogHeader>
                {details && (
                    <div className="space-y-5">
                        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                            <SummaryRow label={t("purchaseNumber")} value={details.purchaseNumber} />
                            <SummaryRow label={t("supplier")} value={details.supplierName} />
                            <SummaryRow label={t("invoiceNumber")} value={details.invoiceNumber || "—"} />
                            <SummaryRow label={t("invoiceDate")} value={formatDate(details.invoiceDate, locale)} />
                            <SummaryRow label={t("branch")} value={details.branchName || "—"} />
                            <SummaryRow label={t("receivedDate")} value={details.receivedDate ? formatDate(details.receivedDate, locale) : "—"} />
                        </div>
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("item")}</TableHead>
                                        <TableHead>{t("quantity")}</TableHead>
                                        <TableHead>{t("unit")}</TableHead>
                                        <TableHead className="text-end">{t("unitCost")}</TableHead>
                                        <TableHead className="text-end">{t("lineTotal")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {details.items.map((item) => (
                                        <TableRow key={item.rawMaterialId}>
                                            <TableCell>{item.itemName}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{item.unit}</TableCell>
                                            <TableCell className="text-end">{formatCurrency(item.unitCost, detailCurrency)}</TableCell>
                                            <TableCell className="text-end">{formatCurrency(item.lineTotal, detailCurrency)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="grid gap-2 rounded-lg border p-4 sm:grid-cols-2">
                            <SummaryRow label={t("subtotal")} value={formatCurrency(details.subtotal, detailCurrency)} />
                            <SummaryRow label={t("tax")} value={formatCurrency(details.taxAmount, detailCurrency)} />
                            <SummaryRow label={t("discount")} value={formatCurrency(details.discountAmount, detailCurrency)} />
                            <SummaryRow label={t("total")} value={formatCurrency(details.totalAmount, detailCurrency)} strong />
                            <SummaryRow label={t("paidColumn")} value={formatCurrency(details.paidAmount, detailCurrency)} />
                            <SummaryRow label={t("balance")} value={formatCurrency(details.balance, detailCurrency)} />
                        </div>
                    </div>
                )}
                <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{t("close")}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Field({
    label,
    children,
    className = "",
    labelClassName = "",
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
    labelClassName?: string;
}) {
    return (
        <div className={`min-w-0 space-y-1.5 ${className}`}>
            <Label className={labelClassName}>{label}</Label>
            {children}
        </div>
    );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className={`flex items-center justify-between gap-3 text-sm ${strong ? "border-t pt-2 font-semibold" : ""}`}>
            <span className="text-muted-foreground">{label}</span>
            <span>{value}</span>
        </div>
    );
}

export function PaymentBadge({ status, ar }: { status: string; ar: boolean }) {
    const label = status === "Paid"
        ? copy.paid[ar ? 1 : 0]
        : status === "PartiallyPaid"
            ? copy.partiallyPaid[ar ? 1 : 0]
            : copy.unpaid[ar ? 1 : 0];
    return <Badge variant={status === "Paid" ? "default" : "secondary"}>{label}</Badge>;
}

function blankLine(): PurchaseLine {
    return { key: generateUUID(), itemId: "", quantity: "1", unitCost: "" };
}

function materialName(material: RawMaterial, ar: boolean): string {
    return ar && material.nameAr?.trim()
        ? material.nameAr
        : material.displayName || material.name;
}

function unitName(unit: number, ar: boolean): string {
    const names = ar
        ? ["جرام", "كيلوجرام", "وحدة", "لتر", "ملليلتر"]
        : ["Gram", "Kilogram", "Unit", "Litre", "Millilitre"];
    return names[unit] ?? String(unit);
}

function number(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string, locale: string): string {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-QA" : "en-QA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(value));
}
