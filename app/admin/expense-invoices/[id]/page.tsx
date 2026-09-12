"use client";

// ─────────────────────────────────────────────────────────────────────────
// Expense Invoice — Details + Edit + Attachments
//   • Drag/drop upload with size+ext client-side filter (matches backend).
//   • Image attachments render inline; PDFs/other use a file-card.
//   • Edit panel performs PUT and re-fetches; no full page reload.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Upload,
    Trash2,
    Loader2,
    Download,
    FileText,
    ImageIcon,
    Save,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { useLocale } from "@/components/locale-provider";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { useExpenseInvoiceDetailsStore } from "@/store/expenseInvoicesStore";
import {
    expenseInvoicesApi,
    ExpenseInvoicePayload,
    ExpenseInvoiceDuplicateWarning,
    ExpenseInvoiceStatus,
    ExpensePaymentMethod,
    getDuplicateInvoiceWarning,
    getExpenseInvoiceErrorMessage,
} from "@/lib/api-expense-invoices";
import { ProcurementApi, type Supplier } from "@/lib/api-procurement";
import { expenseCategoriesApi, type ExpenseCategory } from "@/lib/api-expense-categories";
// Reuse the same validator + error type as the list page's create dialog
// so create and edit can never diverge on rules.
import { validateInvoicePayload, type InvoiceFieldErrors } from "@/lib/expense-invoice-validation";

const labels = {
    back:            { en: "Back",                  ar: "رجوع" },
    detailsTitle:    { en: "Invoice Details",       ar: "تفاصيل الفاتورة" },
    pickSupplier:    { en: "Pick a supplier (optional)", ar: "اختر مورّداً (اختياري)" },
    noSupplier:      { en: "— Manual / no supplier —",   ar: "— يدوي / بدون مورّد —" },
    overrideName:    { en: "Override supplier name (optional)", ar: "تجاوز اسم المورّد (اختياري)" },
    pickCategory:    { en: "Pick a category (optional)", ar: "اختر فئة (اختياري)" },
    noCategory:      { en: "— None —",            ar: "— بدون —" },
    overrideCategory:{ en: "Override category label (optional)", ar: "تجاوز اسم الفئة (اختياري)" },

    // Validation messages — must match the keys used in validateInvoicePayload.
    vRequired:       { en: "Required",                    ar: "حقل مطلوب" },
    vNonNegative:    { en: "Must be 0 or greater",        ar: "يجب أن يكون 0 أو أكثر" },
    vNumber:         { en: "Must be a valid number",      ar: "يجب أن يكون رقماً صحيحاً" },
    vTotalMismatch:  { en: "Total must equal Subtotal + Tax − Discount", ar: "الإجمالي يجب أن يساوي المبلغ + الضريبة − الخصم" },
    vDueBefore:      { en: "Due date cannot be before invoice date", ar: "تاريخ الاستحقاق لا يمكن أن يكون قبل تاريخ الفاتورة" },
    vInvoiceFuture:  { en: "Invoice date cannot be more than 1 year in the future", ar: "تاريخ الفاتورة لا يمكن أن يتجاوز سنة من الآن" },
    vCurrency:       { en: "Pick a currency",             ar: "اختر عملة" },
    vTaxNumber:      { en: "Tax number is too long",      ar: "الرقم الضريبي طويل جداً" },
    vPhone:          { en: "Phone number is invalid",     ar: "رقم الهاتف غير صالح" },
    vNotesTooLong:   { en: "Notes too long (max 2000)",   ar: "الملاحظات طويلة جداً (٢٠٠٠ كحد أقصى)" },
    vInvoiceTooLong: { en: "Invoice number too long (max 64)", ar: "رقم الفاتورة طويل جداً (٦٤ كحد أقصى)" },
    vFixErrors:      { en: "Please fix the highlighted fields.", ar: "يرجى إصلاح الحقول المظللة." },
    audit:           { en: "Audit",                 ar: "السجل" },
    createdBy:       { en: "Created by",            ar: "أنشأت بواسطة" },
    createdAt:       { en: "Created at",            ar: "تاريخ الإنشاء" },
    updatedAt:       { en: "Last update",           ar: "آخر تحديث" },
    attachments:     { en: "Attachments",           ar: "المرفقات" },
    uploadHint:      { en: "Drop files here or click to upload (jpg, png, webp, pdf — 10MB max).", ar: "أسقط الملفات أو انقر للرفع (jpg, png, webp, pdf — حد أقصى 10 ميجابايت)." },
    uploading:       { en: "Uploading…",            ar: "جارٍ الرفع…" },
    primary:         { en: "Primary",               ar: "أساسي" },
    remove:          { en: "Remove",                ar: "إزالة" },
    downloadFailed:  { en: "Failed to download the attachment.", ar: "تعذّر تنزيل المرفق." },
    save:            { en: "Save changes",          ar: "حفظ التعديلات" },
    saving:          { en: "Saving…",               ar: "جارٍ الحفظ…" },
    invoiceNumber:   { en: "Invoice Number",        ar: "رقم الفاتورة" },
    supplier:        { en: "Supplier",              ar: "المورّد" },
    supplierName:    { en: "Supplier Name",         ar: "اسم المورّد" },
    supplierPhone:   { en: "Supplier Phone",        ar: "هاتف المورّد" },
    supplierTax:     { en: "Tax Number",            ar: "الرقم الضريبي" },
    date:            { en: "Date",                  ar: "التاريخ" },
    dueDate:         { en: "Due Date",              ar: "تاريخ الاستحقاق" },
    subtotal:        { en: "Subtotal",              ar: "المبلغ قبل الضرائب" },
    tax:             { en: "Tax",                   ar: "الضريبة" },
    discount:        { en: "Discount",              ar: "الخصم" },
    total:           { en: "Total",                 ar: "الإجمالي" },
    paidAmount:      { en: "Paid Amount",           ar: "المبلغ المدفوع" },
    balance:         { en: "Remaining Balance",     ar: "الرصيد المتبقي" },
    relatedPurchase: { en: "Related Purchase",      ar: "عملية الشراء" },
    currency:        { en: "Currency",              ar: "العملة" },
    payment:         { en: "Payment Method",        ar: "طريقة الدفع" },
    paymentDetail:   { en: "Payment Reference",     ar: "مرجع الدفع" },
    status:          { en: "Status",                ar: "الحالة" },
    category:        { en: "Category",              ar: "الفئة" },
    notes:           { en: "Notes",                 ar: "ملاحظات" },
    confirmRemove:   { en: "Remove this attachment?", ar: "هل تريد إزالة هذا المرفق؟" },
    cancel:          { en: "Cancel",                ar: "إلغاء" },
    confirm:         { en: "Confirm",               ar: "تأكيد" },
    duplicateTitle:  { en: "Possible duplicate invoice", ar: "فاتورة مشابهة محتملة" },
    duplicateMessage:{ en: "A similar invoice already exists for this supplier and date.", ar: "توجد فاتورة مشابهة لهذا المورّد والتاريخ." },
    continueQuestion:{ en: "Do you want to continue?", ar: "هل تريد المتابعة؟" },
    continueSave:    { en: "Continue and save",     ar: "متابعة وحفظ" },

    Draft:           { en: "Draft",                 ar: "مسودة" },
    Unpaid:          { en: "Unpaid",                ar: "غير مدفوعة" },
    PartiallyPaid:   { en: "Partially Paid",        ar: "مدفوعة جزئياً" },
    Paid:            { en: "Paid",                  ar: "مدفوعة" },
    Cancelled:       { en: "Cancelled",             ar: "ملغاة" },

    Unspecified:     { en: "Unspecified",           ar: "غير محدد" },
    Cash:            { en: "Cash",                  ar: "نقدًا" },
    Card:            { en: "Card",                  ar: "بطاقة" },
    BankTransfer:    { en: "Bank Transfer",         ar: "حوالة بنكية" },
    Cheque:          { en: "Cheque",                ar: "شيك" },
    Other:           { en: "Other",                 ar: "أخرى" },
};

const STATUS_OPTIONS: ExpenseInvoiceStatus[] = ["Draft", "Unpaid", "PartiallyPaid", "Paid", "Cancelled"];
const PAYMENT_OPTIONS: ExpensePaymentMethod[] = [
    "Unspecified", "Cash", "Card", "BankTransfer", "Cheque", "Other",
];

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

// ────────────────────────────────────────────────────────────────────────

export default function ExpenseInvoiceDetailsPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const { isRtl } = useLocale();
    const t = useCallback(
        (k: keyof typeof labels) => (isRtl ? labels[k].ar : labels[k].en),
        [isRtl]
    );

    const { current, loading, error, load, set: setCurrent, clear } = useExpenseInvoiceDetailsStore();

    const [form, setForm] = useState<ExpenseInvoicePayload | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [removeId, setRemoveId] = useState<string | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [errors, setErrors] = useState<InvoiceFieldErrors>({});
    const [duplicateWarning, setDuplicateWarning] =
        useState<ExpenseInvoiceDuplicateWarning | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    // One-shot suppliers + categories fetch — both feed dropdowns. Active-only
    // for categories so retired entries don't appear in the picker (the
    // current row's stored label still renders if it was already saved).
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            ProcurementApi.getSuppliers().catch(() => [] as Supplier[]),
            expenseCategoriesApi.list(true).catch(() => [] as ExpenseCategory[]),
        ]).then(([sups, cats]) => {
            if (cancelled) return;
            setSuppliers(sups || []);
            setCategories(cats || []);
        });
        return () => { cancelled = true; };
    }, []);

    const onPickCategory = (cid: string | null) => {
        if (!form) return;
        setForm({
            ...form,
            expenseCategoryId: cid,
            categoryLabel: "", // backend snapshot will fill on save
        });
    };

    const onPickSupplier = (sid: string | null) => {
        if (!form) return;
        const picked = sid ? suppliers.find((s) => s.id === sid) : null;
        setForm({
            ...form,
            supplierId: sid,
            // Clear local override so backend snapshot kicks in. User can still
            // type a custom override in the field below.
            supplierName: "",
            supplierPhone: picked?.mobileNumber ?? form.supplierPhone,
            supplierTaxNumber: picked?.taxNumber ?? form.supplierTaxNumber,
        });
    };

    useEffect(() => {
        if (id) void load(id);
        return () => clear();
    }, [id, load, clear]);

    // Hydrate form whenever the source-of-truth `current` changes.
    useEffect(() => {
        if (!current) { setForm(null); return; }
        setForm({
            invoiceNumber: current.invoiceNumber,
            supplierName: current.supplierName ?? "",
            supplierPhone: current.supplierPhone ?? "",
            supplierTaxNumber: current.supplierTaxNumber ?? "",
            supplierId: current.supplierId ?? null,
            expenseCategoryId: current.expenseCategoryId ?? null,
            categoryLabel: current.categoryLabel ?? "",
            invoiceDate: current.invoiceDate.slice(0, 10),
            dueDate: current.dueDate ? current.dueDate.slice(0, 10) : null,
            subtotal: current.subtotal,
            taxAmount: current.taxAmount,
            discountAmount: current.discountAmount,
            totalAmount: current.totalAmount,
            paidAmount: current.paidAmount,
            purchaseOrderId: current.purchaseOrderId ?? null,
            currencyCode: current.currencyCode,
            paymentMethod: current.paymentMethod,
            paymentMethodDetail: current.paymentMethodDetail ?? "",
            notes: current.notes ?? "",
            status: current.status,
            branchId: current.branchId ?? null,
        });
    }, [current]);

    // Re-compute total automatically as the user edits component amounts.
    useEffect(() => {
        if (!form) return;
        const next = round2((form.subtotal || 0) + (form.taxAmount || 0) - (form.discountAmount || 0));
        if (Math.abs(next - (form.totalAmount || 0)) > 0.005) {
            setForm({ ...form, totalAmount: next });
        }
    }, [form?.subtotal, form?.taxAmount, form?.discountAmount]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = async (acknowledgeDuplicateWarning = false) => {
        if (!id || !form) return;
        const errs = validateInvoicePayload(form, t);
        setErrors(errs);
        if (Object.keys(errs).length > 0) {
            toast.error(t("vFixErrors"));
            return;
        }
        setSaving(true);
        try {
            const updated = await expenseInvoicesApi.update(id, {
                ...form,
                acknowledgeDuplicateWarning,
            });
            setDuplicateWarning(null);
            setCurrent(updated);
            toast.success(isRtl ? "تم الحفظ" : "Saved");
        } catch (err: unknown) {
            const warning = getDuplicateInvoiceWarning(err);
            if (warning?.canOverride) {
                setDuplicateWarning(warning);
                return;
            }
            toast.error(getExpenseInvoiceErrorMessage(
                err,
                isRtl ? "فشل الحفظ" : "Save failed",
            ));
        } finally {
            setSaving(false);
        }
    };

    const uploadFiles = async (files: FileList | File[]) => {
        if (!id) return;
        const list = Array.from(files);
        if (list.length === 0) return;

        // Client-side guard mirrors the backend allow-list so the user sees an
        // immediate error rather than a network round-trip rejection.
        for (const f of list) {
            if (!ACCEPTED_MIME.includes(f.type)) {
                toast.error(`${f.name}: ${isRtl ? "نوع غير مدعوم" : "Unsupported type"}`);
                return;
            }
            if (f.size > MAX_BYTES) {
                toast.error(`${f.name}: ${isRtl ? "حجم الملف كبير" : "File too large"}`);
                return;
            }
        }

        setUploading(true);
        try {
            for (const f of list) {
                await expenseInvoicesApi.uploadAttachment(id, f);
            }
            await load(id);
            toast.success(isRtl ? "تم الرفع" : "Uploaded");
        } catch (err: unknown) {
            toast.error(getExpenseInvoiceErrorMessage(
                err,
                isRtl ? "فشل الرفع" : "Upload failed",
            ));
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = "";
        }
    };

    const removeAttachment = async () => {
        if (!id || !removeId) return;
        try {
            await expenseInvoicesApi.deleteAttachment(id, removeId);
            setRemoveId(null);
            await load(id);
            toast.success(isRtl ? "تم الحذف" : "Removed");
        } catch (err: unknown) {
            toast.error(getExpenseInvoiceErrorMessage(
                err,
                isRtl ? "فشل الحذف" : "Remove failed",
            ));
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
    };

    const totalsValid = useMemo(() => {
        if (!form) return false;
        const computed = (form.subtotal || 0) + (form.taxAmount || 0) - (form.discountAmount || 0);
        return Math.abs(computed - (form.totalAmount || 0)) < 0.011;
    }, [form]);

    if (loading && !current) {
        return <DetailsSkeleton />;
    }
    if (error) {
        return <div className="p-8 text-destructive">{error}</div>;
    }
    if (!current || !form) {
        return null;
    }

    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push("/ntxadminpos/expense-invoices")} className="gap-1">
                    <ArrowLeft className="size-4" />
                    {t("back")}
                </Button>
                <Badge variant={current.status === "Paid" ? "default" : "secondary"}>
                    {t(current.status)}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left — invoice editable form */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>{t("detailsTitle")}</span>
                                <span className="text-xl font-bold">
                                    {formatCurrency(current.totalAmount, current.currencyCode)}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label={t("invoiceNumber")} required error={errors.invoiceNumber}>
                                <Input
                                    value={form.invoiceNumber}
                                    maxLength={64}
                                    onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                                />
                            </Field>
                            <Field label={t("date")} required error={errors.invoiceDate}>
                                <Input
                                    type="date"
                                    value={form.invoiceDate.slice(0, 10)}
                                    onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                                />
                            </Field>
                            <Field label={t("supplier")}>
                                <Select
                                    value={form.supplierId ?? "NONE"}
                                    onValueChange={(v) => onPickSupplier(v === "NONE" ? null : v)}
                                >
                                    <SelectTrigger><SelectValue placeholder={t("pickSupplier")} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">{t("noSupplier")}</SelectItem>
                                        {suppliers.map((s) => (
                                            <SelectItem key={s.id} value={s.id!}>
                                                {s.displayName || s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label={form.supplierId ? t("overrideName") : t("supplierName")}>
                                <Input
                                    value={form.supplierName ?? ""}
                                    onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                                    placeholder={form.supplierId
                                        ? (suppliers.find((s) => s.id === form.supplierId)?.name ?? "")
                                        : ""}
                                />
                            </Field>
                            <Field label={t("supplierPhone")} error={errors.supplierPhone}>
                                <Input
                                    value={form.supplierPhone ?? ""}
                                    onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })}
                                />
                            </Field>
                            <Field label={t("supplierTax")} error={errors.supplierTaxNumber}>
                                <Input
                                    value={form.supplierTaxNumber ?? ""}
                                    maxLength={64}
                                    onChange={(e) => setForm({ ...form, supplierTaxNumber: e.target.value })}
                                />
                            </Field>
                            <Field label={t("category")}>
                                <Select
                                    value={form.expenseCategoryId ?? "NONE"}
                                    onValueChange={(v) => onPickCategory(v === "NONE" ? null : v)}
                                >
                                    <SelectTrigger><SelectValue placeholder={t("pickCategory")} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">{t("noCategory")}</SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label={t("overrideCategory")}>
                                <Input
                                    value={form.categoryLabel ?? ""}
                                    onChange={(e) => setForm({ ...form, categoryLabel: e.target.value })}
                                    placeholder={form.expenseCategoryId
                                        ? (categories.find((c) => c.id === form.expenseCategoryId)?.displayName ?? "")
                                        : ""}
                                />
                            </Field>
                            <Field label={t("dueDate")} error={errors.dueDate}>
                                <Input
                                    type="date"
                                    value={form.dueDate ? form.dueDate.slice(0, 10) : ""}
                                    onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })}
                                />
                            </Field>
                            <Field label={t("currency")} error={errors.currencyCode}>
                                <Select
                                    value={form.currencyCode}
                                    onValueChange={(v) => setForm({ ...form, currencyCode: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.code} – {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label={t("subtotal")} error={errors.subtotal}>
                                <Input
                                    type="number" inputMode="decimal" step="0.01" min="0"
                                    value={form.subtotal}
                                    onChange={(e) => setForm({ ...form, subtotal: parseFloat(e.target.value) || 0 })}
                                />
                            </Field>
                            <Field label={t("tax")} error={errors.taxAmount}>
                                <Input
                                    type="number" inputMode="decimal" step="0.01" min="0"
                                    value={form.taxAmount}
                                    onChange={(e) => setForm({ ...form, taxAmount: parseFloat(e.target.value) || 0 })}
                                />
                            </Field>
                            <Field label={t("discount")} error={errors.discountAmount}>
                                <Input
                                    type="number" inputMode="decimal" step="0.01" min="0"
                                    value={form.discountAmount}
                                    onChange={(e) => setForm({ ...form, discountAmount: parseFloat(e.target.value) || 0 })}
                                />
                            </Field>
                            <Field label={t("total")} error={errors.totalAmount}>
                                <Input
                                    type="number" inputMode="decimal" step="0.01" min="0"
                                    value={form.totalAmount}
                                    onChange={(e) => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })}
                                    className={totalsValid ? "font-semibold" : "font-semibold border-destructive"}
                                />
                            </Field>
                            <Field label={t("paidAmount")}>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    max={form.totalAmount}
                                    value={form.paidAmount ?? 0}
                                    onChange={(e) => {
                                        const paidAmount = parseFloat(e.target.value) || 0;
                                        setForm({
                                            ...form,
                                            paidAmount,
                                            status: paidAmount <= 0
                                                ? "Unpaid"
                                                : paidAmount >= form.totalAmount
                                                    ? "Paid"
                                                    : "PartiallyPaid",
                                        });
                                    }}
                                />
                            </Field>
                            <Field label={t("balance")}>
                                <Input
                                    readOnly
                                    value={formatCurrency(
                                        Math.max(0, form.totalAmount - (form.paidAmount ?? 0)),
                                        form.currencyCode,
                                    )}
                                />
                            </Field>
                            {current.purchaseOrderId && (
                                <Field label={t("relatedPurchase")}>
                                    <Button variant="outline" asChild className="w-full justify-start">
                                        <Link href={`/ntxadminpos/procurement?purchase=${current.purchaseOrderId}`}>
                                            {current.purchaseOrderNumber || current.purchaseOrderId}
                                        </Link>
                                    </Button>
                                </Field>
                            )}

                            <Field label={t("payment")}>
                                <Select
                                    value={form.paymentMethod}
                                    onValueChange={(v) => setForm({ ...form, paymentMethod: v as ExpensePaymentMethod })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_OPTIONS.map((p) => (
                                            <SelectItem key={p} value={p}>{t(p)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label={t("paymentDetail")}>
                                <Input
                                    value={form.paymentMethodDetail ?? ""}
                                    onChange={(e) => setForm({ ...form, paymentMethodDetail: e.target.value })}
                                />
                            </Field>
                            <Field label={t("status")}>
                                <Select
                                    value={form.status}
                                    onValueChange={(value) => {
                                        const status = value as ExpenseInvoiceStatus;
                                        setForm({
                                            ...form,
                                            status,
                                            paidAmount: status === "Paid"
                                                ? form.totalAmount
                                                : status === "Unpaid"
                                                    ? 0
                                                    : form.paidAmount,
                                        });
                                    }}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((status) => (
                                            <SelectItem key={status} value={status}>{t(status)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <div className="md:col-span-2">
                                <Field label={t("notes")} error={errors.notes}>
                                    <Textarea
                                        rows={3}
                                        maxLength={2000}
                                        value={form.notes ?? ""}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        className={errors.notes ? "border-destructive" : ""}
                                    />
                                </Field>
                            </div>

                            <div className="md:col-span-2 flex justify-end">
                                <Button onClick={() => void save()} disabled={saving || !totalsValid} className="gap-2">
                                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                    {saving ? t("saving") : t("save")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground">{t("audit")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm grid grid-cols-2 gap-2">
                            <div><span className="text-muted-foreground">{t("createdBy")}: </span>{current.createdByName || "—"}</div>
                            <div><span className="text-muted-foreground">{t("createdAt")}: </span>{new Date(current.createdAt).toLocaleString()}</div>
                            <div><span className="text-muted-foreground">{t("updatedAt")}: </span>{new Date(current.updatedAt).toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right — attachments */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t("attachments")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div
                                onClick={() => fileInput.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={onDrop}
                                role="button"
                                tabIndex={0}
                                className={
                                    "rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition " +
                                    (dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/60")
                                }
                            >
                                {uploading ? (
                                    <div className="flex items-center justify-center gap-2 text-sm">
                                        <Loader2 className="size-4 animate-spin" /> {t("uploading")}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="size-5 opacity-60" />
                                        <span className="text-xs text-muted-foreground">{t("uploadHint")}</span>
                                    </div>
                                )}
                                <input
                                    ref={fileInput}
                                    type="file"
                                    multiple
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    className="hidden"
                                    onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                                />
                            </div>

                            <div className="space-y-2">
                                {current.attachments.length === 0 ? (
                                    <div className="text-sm text-center text-muted-foreground py-4">—</div>
                                ) : (
                                    current.attachments.map((att) => (
                                        <AttachmentCard
                                            key={att.id}
                                            id={att.id}
                                            url={att.url}
                                            name={att.originalFileName}
                                            mime={att.mimeType}
                                            size={att.fileSize}
                                            isPrimary={att.isPrimary}
                                            primaryLabel={t("primary")}
                                            removeLabel={t("remove")}
                                            onDownload={async () => {
                                                try {
                                                    await expenseInvoicesApi.downloadAttachment(
                                                        current.id,
                                                        att.id,
                                                        att.originalFileName,
                                                    );
                                                } catch {
                                                    toast.error(t("downloadFailed"));
                                                }
                                            }}
                                            onRemove={() => setRemoveId(att.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={!!duplicateWarning} onOpenChange={(o) => !o && setDuplicateWarning(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t("duplicateTitle")}</DialogTitle></DialogHeader>
                    <div className="space-y-3 text-sm">
                        <p>{t("duplicateMessage")}</p>
                        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                            <p><span className="font-medium">{t("invoiceNumber")}:</span> {duplicateWarning?.invoiceNumber}</p>
                            <p><span className="font-medium">{t("supplier")}:</span> {duplicateWarning?.supplierName || t("noSupplier")}</p>
                            <p><span className="font-medium">{t("date")}:</span> {duplicateWarning?.invoiceDate.slice(0, 10)}</p>
                        </div>
                        <p className="font-medium">{t("continueQuestion")}</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDuplicateWarning(null)} disabled={saving}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={() => void save(true)} disabled={saving}>
                            {saving ? <Loader2 className="size-4 animate-spin" /> : t("continueSave")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove attachment confirm */}
            <Dialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t("remove")}</DialogTitle></DialogHeader>
                    <p className="text-sm">{t("confirmRemove")}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRemoveId(null)}>{t("cancel")}</Button>
                        <Button variant="destructive" onClick={removeAttachment}>{t("confirm")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────

function Field({
    label, required, error, children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <Label className="text-xs">
                {label}{required && <span className="text-destructive ms-1">*</span>}
            </Label>
            <div className={"mt-1 " + (error ? "[&_input]:border-destructive [&_button[role=combobox]]:border-destructive" : "")}>
                {children}
            </div>
            {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
        </div>
    );
}

function AttachmentCard({
    url, name, mime, size, isPrimary,
    primaryLabel, removeLabel, onDownload, onRemove,
}: {
    id: string;
    url: string;
    name: string;
    mime: string;
    size: number;
    isPrimary: boolean;
    primaryLabel: string;
    removeLabel: string;
    onDownload: () => void | Promise<void>;
    onRemove: () => void;
}) {
    const isImage = mime.startsWith("image/");
    const [downloading, setDownloading] = useState(false);
    const handleDownload = async () => {
        if (downloading) return;
        setDownloading(true);
        try { await onDownload(); }
        finally { setDownloading(false); }
    };
    return (
        <div className="border rounded-lg p-2 flex gap-3 items-center">
            <div className="size-14 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {isImage && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={name} className="size-full object-cover" />
                ) : (
                    <FileText className="size-6 opacity-60" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-2">
                    {name}
                    {isPrimary && <Badge variant="secondary" className="text-[10px]">{primaryLabel}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                    {(size / 1024).toFixed(0)} KB · {mime}
                </div>
            </div>
            <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={handleDownload} disabled={downloading}>
                    {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={onRemove} aria-label={removeLabel}>
                    <Trash2 className="size-4 text-destructive" />
                </Button>
            </div>
        </div>
    );
}

function DetailsSkeleton() {
    return (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
                <div className="h-8 bg-muted animate-pulse rounded" />
                <div className="h-64 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
    );
}

const round2 = (n: number) => Math.round(n * 100) / 100;
