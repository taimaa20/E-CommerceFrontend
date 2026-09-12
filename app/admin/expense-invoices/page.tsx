"use client";

// ─────────────────────────────────────────────────────────────────────────
// Expense / Purchase / Store-Expense Invoices — list page
//   • Server-side pagination + filtering — no client-heavy work.
//   • Bilingual: every visible label uses `t.en` / `t.ar` based on locale.
//   • Optimistic UX: status / delete actions toast immediately, then reconcile.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    FileText,
    Filter,
    Plus,
    Search,
    Trash2,
    Loader2,
    Paperclip,
    AlertCircle,
    Receipt,
    Wallet,
    CalendarDays,
    Upload,
    X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BranchFilter } from "@/components/filters/BranchFilter";
import { StandardFilter, type StandardFilterOption } from "@/components/filters/StandardFilter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { useLocale } from "@/components/locale-provider";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { useSettingsStore } from "@/store/settingsStore";
import { useExpenseInvoicesStore } from "@/store/expenseInvoicesStore";
import { useActiveBranchVersion } from "@/store/branchContextStore";
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
import {
    validateInvoicePayload,
    INVOICE_MAX_NUMBER as MAX_INVOICE_NUMBER,
    INVOICE_MAX_NOTES as MAX_NOTES,
    INVOICE_MAX_TAX_NUMBER as MAX_TAX_NUMBER,
    type InvoiceFieldErrors,
} from "@/lib/expense-invoice-validation";

// ─────────────────── Inline i18n table (no global file change) ───────────

const labels = {
    title:           { en: "Expense Invoices",            ar: "فواتير المصروفات" },
    subtitle:        { en: "Supplier bills, store expenses & uploaded receipts.", ar: "فواتير الموردين ومصروفات المتجر والإيصالات." },
    newInvoice:      { en: "New Invoice",                 ar: "فاتورة جديدة" },
    filter:          { en: "Filters",                     ar: "تصفية" },
    invoiceNumber:   { en: "Invoice Number",              ar: "رقم الفاتورة" },
    supplier:        { en: "Supplier",                    ar: "المورّد" },
    branch:          { en: "Branch",                      ar: "الفرع" },
    category:        { en: "Category",                    ar: "الفئة" },
    date:            { en: "Date",                        ar: "التاريخ" },
    dueDate:         { en: "Due Date",                    ar: "تاريخ الاستحقاق" },
    total:           { en: "Total",                       ar: "الإجمالي" },
    paidAmount:      { en: "Paid",                        ar: "المدفوع" },
    balance:         { en: "Balance",                     ar: "الرصيد" },
    relatedPurchase: { en: "Related Purchase",            ar: "عملية الشراء" },
    status:          { en: "Status",                      ar: "الحالة" },
    payment:         { en: "Payment Method",              ar: "طريقة الدفع" },
    attachments:     { en: "Attachments",                 ar: "المرفقات" },
    createdBy:       { en: "Created By",                  ar: "أضيفت بواسطة" },
    actions:         { en: "Actions",                     ar: "الإجراءات" },
    open:            { en: "Open",                        ar: "فتح" },
    delete:          { en: "Delete",                      ar: "حذف" },
    deleteConfirm:   { en: "Delete this invoice? This cannot be undone.", ar: "هل تريد حذف هذه الفاتورة؟ لا يمكن التراجع." },
    cancel:          { en: "Cancel",                      ar: "إلغاء" },
    confirm:         { en: "Confirm",                     ar: "تأكيد" },
    empty:           { en: "No invoices match these filters.", ar: "لا توجد فواتير مطابقة." },
    dateFrom:        { en: "From",                        ar: "من" },
    dateTo:          { en: "To",                          ar: "إلى" },
    apply:           { en: "Apply",                       ar: "تطبيق" },
    reset:           { en: "Reset",                       ar: "إعادة" },
    all:             { en: "All",                         ar: "الكل" },
    searchOptions:   { en: "Search...",                   ar: "بحث..." },
    noOptions:       { en: "No options found",            ar: "لا توجد نتائج" },
    loading:         { en: "Loading...",                  ar: "جار التحميل..." },
    clear:           { en: "Clear",                       ar: "مسح" },
    page:            { en: "Page",                        ar: "صفحة" },
    of:              { en: "of",                          ar: "من" },
    prev:            { en: "Previous",                    ar: "السابق" },
    next:            { en: "Next",                        ar: "التالي" },

    // Stat tiles
    totalInvoices:   { en: "Total Invoices",              ar: "إجمالي الفواتير" },
    unpaid:          { en: "Unpaid",                      ar: "غير مدفوعة" },
    overdue:         { en: "Overdue",                     ar: "متأخرة" },
    thisMonth:       { en: "This Month",                  ar: "هذا الشهر" },

    // Status enum
    Draft:           { en: "Draft",                       ar: "مسودة" },
    Unpaid:          { en: "Unpaid",                      ar: "غير مدفوعة" },
    PartiallyPaid:   { en: "Partially Paid",              ar: "مدفوعة جزئياً" },
    Paid:            { en: "Paid",                        ar: "مدفوعة" },
    Cancelled:       { en: "Cancelled",                   ar: "ملغاة" },

    // Payment method enum
    Unspecified:     { en: "Unspecified",                 ar: "غير محدد" },
    Cash:            { en: "Cash",                        ar: "نقدًا" },
    Card:            { en: "Card",                        ar: "بطاقة" },
    BankTransfer:    { en: "Bank Transfer",               ar: "حوالة بنكية" },
    Cheque:          { en: "Cheque",                      ar: "شيك" },
    Other:           { en: "Other",                       ar: "أخرى" },

    // Create dialog
    createTitle:     { en: "New Expense Invoice",         ar: "فاتورة مصروف جديدة" },
    pickSupplier:    { en: "Pick a supplier (optional)",  ar: "اختر مورّداً (اختياري)" },
    noSupplier:      { en: "— Manual / no supplier —",    ar: "— يدوي / بدون مورّد —" },
    overrideName:    { en: "Override supplier name (optional)", ar: "تجاوز اسم المورّد (اختياري)" },
    pickCategory:    { en: "Pick a category (optional)", ar: "اختر فئة (اختياري)" },
    noCategory:      { en: "— None —",            ar: "— بدون —" },
    overrideCategory:{ en: "Override category label (optional)", ar: "تجاوز اسم الفئة (اختياري)" },
    manageCategories:{ en: "Manage categories",   ar: "إدارة الفئات" },
    supplierName:    { en: "Supplier Name",               ar: "اسم المورّد" },
    supplierPhone:   { en: "Supplier Phone",              ar: "هاتف المورّد" },
    supplierTax:     { en: "Tax Number",                  ar: "الرقم الضريبي" },
    subtotal:        { en: "Subtotal",                    ar: "المبلغ قبل الضرائب" },
    tax:             { en: "Tax",                         ar: "الضريبة" },
    discount:        { en: "Discount",                    ar: "الخصم" },
    notes:           { en: "Notes",                       ar: "ملاحظات" },
    currency:        { en: "Currency",                    ar: "العملة" },
    paymentDetail:   { en: "Payment Reference",           ar: "مرجع الدفع" },
    save:            { en: "Save",                        ar: "حفظ" },
    saving:          { en: "Saving…",                     ar: "جارٍ الحفظ…" },
    uploadHint:      { en: "Drop files here or click to attach (jpg, png, webp, pdf — 10MB max). Uploaded after the invoice is created.", ar: "أسقط الملفات أو انقر لإرفاقها (jpg, png, webp, pdf — حد أقصى 10 ميجابايت). يتم الرفع بعد إنشاء الفاتورة." },
    uploading:       { en: "Uploading attachments…",      ar: "جارٍ رفع المرفقات…" },
    removeFile:      { en: "Remove",                      ar: "إزالة" },
    duplicateTitle:  { en: "Possible duplicate invoice", ar: "فاتورة مشابهة محتملة" },
    duplicateMessage:{ en: "A similar invoice already exists for this supplier and date.", ar: "توجد فاتورة مشابهة لهذا المورّد والتاريخ." },
    continueQuestion:{ en: "Do you want to continue?",    ar: "هل تريد المتابعة؟" },
    continueSave:    { en: "Continue and save",           ar: "متابعة وحفظ" },

    // Validation messages
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
};

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

const STATUS_VARIANTS: Record<ExpenseInvoiceStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Draft: "outline",
    Unpaid: "secondary",
    PartiallyPaid: "secondary",
    Paid: "default",
    Cancelled: "destructive",
};

const STATUS_OPTIONS: ExpenseInvoiceStatus[] = ["Draft", "Unpaid", "PartiallyPaid", "Paid", "Cancelled"];
const PAYMENT_OPTIONS: ExpensePaymentMethod[] = [
    "Unspecified", "Cash", "Card", "BankTransfer", "Cheque", "Other",
];

// ────────────────────────────────────────────────────────────────────────

export default function ExpenseInvoicesPage() {
    const { isRtl } = useLocale();
    const t = useCallback(
        (k: keyof typeof labels) => (isRtl ? labels[k].ar : labels[k].en),
        [isRtl]
    );

    const {
        items, totalCount, pageNumber, pageSize, loading, error,
        statistics, query, setQuery, fetchList, fetchStatistics,
    } = useExpenseInvoicesStore();

    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const branchVersion = useActiveBranchVersion();

    useEffect(() => { void fetchList(); }, [fetchList, query, branchVersion]);
    useEffect(() => { void fetchStatistics(); }, [fetchStatistics, query.branchId, branchVersion]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
        [totalCount, pageSize]
    );
    const statusFilterOptions: StandardFilterOption[] = [
        { value: "ALL", label: t("all") },
        ...STATUS_OPTIONS.map((status) => ({ value: status, label: t(status) })),
    ];
    const paymentFilterOptions: StandardFilterOption[] = [
        { value: "ALL", label: t("all") },
        ...PAYMENT_OPTIONS.map((paymentMethod) => ({ value: paymentMethod, label: t(paymentMethod) })),
    ];

    const onDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await expenseInvoicesApi.remove(deleteTarget);
            toast.success(isRtl ? "تم الحذف" : "Invoice deleted");
            setDeleteTarget(null);
            await fetchList();
            await fetchStatistics();
        } catch (err: unknown) {
            toast.error(getExpenseInvoiceErrorMessage(
                err,
                isRtl ? "فشل الحذف" : "Failed to delete",
            ));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <Receipt className="size-6" />
                        {t("title")}
                    </h1>
                    <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/ntxadminpos/expense-invoices/categories">
                        <Button variant="outline" className="gap-2">
                            {t("manageCategories")}
                        </Button>
                    </Link>
                    <Button onClick={() => setCreateOpen(true)} className="gap-2">
                        <Plus className="size-4" />
                        {t("newInvoice")}
                    </Button>
                </div>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile
                    label={t("totalInvoices")}
                    value={String(statistics?.totalCount ?? "—")}
                    icon={<FileText className="size-5" />}
                />
                <StatTile
                    label={t("unpaid")}
                    value={String(statistics?.unpaidCount ?? "—")}
                    sub={
                        statistics
                            ? formatCurrency(statistics.unpaidAmount, statistics.currencyCode)
                            : undefined
                    }
                    tone="warn"
                    icon={<Wallet className="size-5" />}
                />
                <StatTile
                    label={t("overdue")}
                    value={String(statistics?.overdueCount ?? "—")}
                    tone="danger"
                    icon={<AlertCircle className="size-5" />}
                />
                <StatTile
                    label={t("thisMonth")}
                    value={
                        statistics
                            ? formatCurrency(statistics.thisMonthAmount, statistics.currencyCode)
                            : "—"
                    }
                    icon={<CalendarDays className="size-5" />}
                />
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="size-4" />
                        <span className="font-medium">{t("filter")}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <BranchFilter
                            value={query.branchId ?? ""}
                            onValueChange={(branchId) => setQuery({ branchId: branchId || undefined })}
                            label={t("branch")}
                            triggerClassName="mt-1 w-full"
                            contentClassName="min-w-72"
                        />
                        <FilterInput
                            label={t("invoiceNumber")}
                            value={query.invoiceNumber ?? ""}
                            onChange={(v) => setQuery({ invoiceNumber: v })}
                            icon={<Search className="size-4 opacity-50" />}
                        />
                        <FilterInput
                            label={t("supplier")}
                            value={query.supplier ?? ""}
                            onChange={(v) => setQuery({ supplier: v })}
                        />
                        <StandardFilter
                            value={query.status ?? "ALL"}
                            onValueChange={(value) => {
                                const next = value ?? "ALL";
                                setQuery({ status: next === "ALL" ? "" : (next as ExpenseInvoiceStatus) });
                            }}
                            options={statusFilterOptions}
                            label={t("status")}
                            placeholder={t("status")}
                            searchPlaceholder={t("searchOptions")}
                            emptyText={t("noOptions")}
                            loadingText={t("loading")}
                            clearLabel={t("clear")}
                            clearable={false}
                            triggerClassName="mt-1 w-full"
                        />
                        <StandardFilter
                            value={query.paymentMethod ?? "ALL"}
                            onValueChange={(value) => {
                                const next = value ?? "ALL";
                                setQuery({ paymentMethod: next === "ALL" ? "" : (next as ExpensePaymentMethod) });
                            }}
                            options={paymentFilterOptions}
                            label={t("payment")}
                            placeholder={t("payment")}
                            searchPlaceholder={t("searchOptions")}
                            emptyText={t("noOptions")}
                            loadingText={t("loading")}
                            clearLabel={t("clear")}
                            clearable={false}
                            triggerClassName="mt-1 w-full"
                        />
                        <div>
                            <Label className="text-xs">{t("dateFrom")}</Label>
                            <Input
                                type="date"
                                className="mt-1"
                                value={query.dateFrom ?? ""}
                                onChange={(e) => setQuery({ dateFrom: e.target.value || undefined })}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">{t("dateTo")}</Label>
                            <Input
                                type="date"
                                className="mt-1"
                                value={query.dateTo ?? ""}
                                onChange={(e) => setQuery({ dateTo: e.target.value || undefined })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {loading && items.length === 0 ? (
                        <SkeletonRows />
                    ) : error ? (
                        <div className="p-8 text-center text-destructive">{error}</div>
                    ) : items.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">{t("empty")}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("invoiceNumber")}</TableHead>
                                        <TableHead>{t("supplier")}</TableHead>
                                        <TableHead>{t("category")}</TableHead>
                                        <TableHead>{t("date")}</TableHead>
                                        <TableHead className="text-end">{t("total")}</TableHead>
                                        <TableHead className="text-end">{t("paidAmount")}</TableHead>
                                        <TableHead className="text-end">{t("balance")}</TableHead>
                                        <TableHead>{t("status")}</TableHead>
                                        <TableHead>{t("relatedPurchase")}</TableHead>
                                        <TableHead className="text-center">{t("attachments")}</TableHead>
                                        <TableHead>{t("createdBy")}</TableHead>
                                        <TableHead className="text-end">{t("actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">{row.invoiceNumber}</TableCell>
                                            <TableCell>{row.supplierName || "—"}</TableCell>
                                            <TableCell>{row.categoryLabel || "—"}</TableCell>
                                            <TableCell>{new Date(row.invoiceDate).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-end font-medium">
                                                {formatCurrency(row.totalAmount, row.currencyCode)}
                                            </TableCell>
                                            <TableCell className="text-end">
                                                {formatCurrency(row.paidAmount, row.currencyCode)}
                                            </TableCell>
                                            <TableCell className="text-end">
                                                {formatCurrency(row.balance, row.currencyCode)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANTS[row.status]}>{t(row.status)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {row.purchaseOrderId ? (
                                                    <Link
                                                        className="text-primary hover:underline"
                                                        href={`/ntxadminpos/procurement?purchase=${row.purchaseOrderId}`}
                                                    >
                                                        {row.purchaseOrderNumber || "—"}
                                                    </Link>
                                                ) : "—"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Paperclip className="size-3" />
                                                    {row.attachmentsCount}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {row.createdByName || "—"}
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <div className="flex gap-1 justify-end">
                                                    <Link href={`/ntxadminpos/expense-invoices/${row.id}`}>
                                                        <Button size="sm" variant="ghost">{t("open")}</Button>
                                                    </Link>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDeleteTarget(row.id)}
                                                        aria-label={t("delete")}
                                                    >
                                                        <Trash2 className="size-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {items.length > 0 && (
                        <div className="flex items-center justify-between p-3 border-t">
                            <span className="text-sm text-muted-foreground">
                                {t("page")} {pageNumber} {t("of")} {totalPages} · {totalCount}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pageNumber <= 1 || loading}
                                    onClick={() => setQuery({ page: pageNumber - 1 })}
                                >
                                    {t("prev")}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pageNumber >= totalPages || loading}
                                    onClick={() => setQuery({ page: pageNumber + 1 })}
                                >
                                    {t("next")}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete confirm */}
            <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("delete")}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm">{t("deleteConfirm")}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                            {t("cancel")}
                        </Button>
                        <Button variant="destructive" onClick={onDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="size-4 animate-spin" /> : t("confirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreateInvoiceDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={async () => { setCreateOpen(false); await fetchList(); await fetchStatistics(); }}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function StatTile({
    label, value, sub, icon, tone = "default",
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
    tone?: "default" | "warn" | "danger";
}) {
    const toneClass =
        tone === "warn" ? "border-amber-500/30 bg-amber-500/5"
        : tone === "danger" ? "border-destructive/40 bg-destructive/5"
        : "";
    return (
        <Card className={toneClass}>
            <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
                <div className="min-w-0">
                    <div className="text-xs text-muted-foreground truncate">{label}</div>
                    <div className="text-xl font-semibold leading-tight">{value}</div>
                    {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
                </div>
            </CardContent>
        </Card>
    );
}

function FilterInput({
    label, value, onChange, icon,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    icon?: React.ReactNode;
}) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            <div className="relative mt-1">
                {icon && <div className="absolute inset-y-0 start-2 flex items-center pointer-events-none">{icon}</div>}
                <Input
                    className={icon ? "ps-8" : ""}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
}

function SkeletonRows() {
    return (
        <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Create dialog — minimal vertical slice that pairs with the details page
// for richer editing. Validates client-side via the shared validator in
// lib/expense-invoice-validation.ts.
// ─────────────────────────────────────────────────────────────────────────

function CreateInvoiceDialog({
    open, onClose, onCreated,
}: {
    open: boolean;
    onClose: () => void;
    onCreated: () => Promise<void>;
}) {
    const { isRtl } = useLocale();
    const t = (k: keyof typeof labels) => (isRtl ? labels[k].ar : labels[k].en);

    const [busy, setBusy] = useState(false);
    const [uploadingStage, setUploadingStage] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [errors, setErrors] = useState<InvoiceFieldErrors>({});
    const [duplicateWarning, setDuplicateWarning] =
        useState<ExpenseInvoiceDuplicateWarning | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    // Pull tenant currency from SystemSettings so the new-invoice form
    // matches the rest of the POS (no hardcoded USD).
    const tenantCurrency = useSettingsStore((s) => s.settings.currency);
    const fetchSettings = useSettingsStore((s) => s.fetchSettings);
    const isSettingsLoaded = useSettingsStore((s) => s.isLoaded);

    const [form, setForm] = useState<ExpenseInvoicePayload>({
        invoiceNumber: "",
        supplierId: null,
        supplierName: "",
        supplierPhone: "",
        supplierTaxNumber: "",
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: null,
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        paidAmount: 0,
        currencyCode: tenantCurrency,
        paymentMethod: "Unspecified",
        paymentMethodDetail: "",
        notes: "",
        status: "Unpaid",
        expenseCategoryId: null,
        categoryLabel: "",
    });

    // Ensure SystemSettings is loaded; once it arrives, snap the form's
    // currency to it (unless the user already changed it manually).
    useEffect(() => { void fetchSettings(); }, [fetchSettings]);
    useEffect(() => {
        if (isSettingsLoaded) {
            setForm((f) => (f.currencyCode === tenantCurrency ? f : { ...f, currencyCode: tenantCurrency }));
        }
        // intentionally only on settings-load — manual changes after this are preserved
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSettingsLoaded]);

    // Load the existing suppliers list once when the dialog opens. The lookup
    // is small (~10s-of-rows in practice) so a single fetch is cheaper than a
    // paginated picker. Falls back silently if the call fails — the manual
    // override field keeps the dialog usable.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        // Load suppliers + active categories in parallel — both feed dropdowns.
        Promise.all([
            ProcurementApi.getSuppliers().catch(() => [] as Supplier[]),
            expenseCategoriesApi.list(true).catch(() => [] as ExpenseCategory[]),
        ]).then(([sups, cats]) => {
            if (cancelled) return;
            setSuppliers(sups || []);
            setCategories(cats || []);
        });
        return () => { cancelled = true; };
    }, [open]);

    const onPickCategory = (cid: string | null) => {
        const picked = cid ? categories.find((c) => c.id === cid) : null;
        setForm((f) => ({
            ...f,
            expenseCategoryId: cid,
            // Clear local override so backend snapshot kicks in.
            categoryLabel: "",
            // Surface the picked color so a future tag UI can read it.
            ...(picked ? {} : {}),
        }));
    };

    // When a supplier is picked, snapshot its phone + tax into the form so
    // the user doesn't retype them. The supplier name itself is filled by
    // the backend snapshot logic — leaving SupplierName blank on the client
    // tells the backend "use the supplier's canonical name".
    const onPickSupplier = (id: string | null) => {
        const picked = id ? suppliers.find((s) => s.id === id) : null;
        setForm((f) => ({
            ...f,
            supplierId: id,
            supplierName: "", // backend will snapshot from picked supplier
            supplierPhone: picked?.mobileNumber ?? f.supplierPhone,
            supplierTaxNumber: picked?.taxNumber ?? f.supplierTaxNumber,
        }));
    };

    // Auto-recompute total whenever subtotal/tax/discount change so the user
    // never has to type it manually unless they want to override.
    useEffect(() => {
        setForm((f) => ({
            ...f,
            totalAmount: round2((f.subtotal || 0) + (f.taxAmount || 0) - (f.discountAmount || 0)),
        }));
    }, [form.subtotal, form.taxAmount, form.discountAmount]);

    // Stage files locally — they're only uploaded after the invoice POST
    // returns an id. Client-side guards mirror the backend allow-list so
    // the user sees instant feedback on a bad file.
    const stageFiles = (files: FileList | File[]) => {
        const list = Array.from(files);
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
        setPendingFiles((curr) => [...curr, ...list]);
    };

    const removePending = (idx: number) =>
        setPendingFiles((curr) => curr.filter((_, i) => i !== idx));

    const save = async (acknowledgeDuplicateWarning = false) => {
        const errs = validateInvoicePayload(form, t);
        setErrors(errs);
        if (Object.keys(errs).length > 0) {
            toast.error(t("vFixErrors"));
            return;
        }
        setBusy(true);
        try {
            const created = await expenseInvoicesApi.create({
                ...form,
                acknowledgeDuplicateWarning,
            });
            setDuplicateWarning(null);
            toast.success(isRtl ? "تم إنشاء الفاتورة" : "Invoice created");

            // Upload any staged attachments sequentially. A failure on one file
            // doesn't roll the invoice back — it surfaces as a toast and the
            // user can re-try from the details page.
            if (pendingFiles.length > 0) {
                setUploadingStage(true);
                let uploaded = 0;
                for (const f of pendingFiles) {
                    try {
                        await expenseInvoicesApi.uploadAttachment(created.id, f);
                        uploaded++;
                    } catch (err: unknown) {
                        toast.error(`${f.name}: ${getExpenseInvoiceErrorMessage(
                            err,
                            isRtl ? "فشل الرفع" : "Upload failed",
                        )}`);
                    }
                }
                if (uploaded > 0) {
                    toast.success(isRtl
                        ? `تم رفع ${uploaded} ملف`
                        : `Uploaded ${uploaded} file${uploaded === 1 ? "" : "s"}`);
                }
            }

            setPendingFiles([]);
            await onCreated();
        } catch (err: unknown) {
            const warning = getDuplicateInvoiceWarning(err);
            if (warning?.canOverride) {
                setDuplicateWarning(warning);
                return;
            }
            toast.error(getExpenseInvoiceErrorMessage(
                err,
                isRtl ? "فشل الإنشاء" : "Failed to create",
            ));
        } finally {
            setBusy(false);
            setUploadingStage(false);
        }
    };

    return (
        <>
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (o) return;
                setDuplicateWarning(null);
                onClose();
            }}
        >
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{t("createTitle")}</DialogTitle></DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label={t("invoiceNumber")} required error={errors.invoiceNumber}>
                        <Input
                            value={form.invoiceNumber}
                            maxLength={MAX_INVOICE_NUMBER}
                            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                        />
                    </Field>
                    <Field label={t("date")} required error={errors.invoiceDate}>
                        <Input
                            type="date"
                            value={(form.invoiceDate ?? "").slice(0, 10)}
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
                            maxLength={MAX_TAX_NUMBER}
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
                            value={(form.dueDate ?? "").slice(0, 10)}
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
                        <Input readOnly value={form.totalAmount} className="font-semibold" />
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
                            <Input
                                value={form.notes ?? ""}
                                maxLength={MAX_NOTES}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </Field>
                    </div>

                    {/* Attachments — staged client-side, uploaded after the
                        create POST returns. Keeps create flow single-step. */}
                    <div className="md:col-span-2">
                        <Label className="text-xs">{t("attachments")}</Label>
                        <div
                            onClick={() => fileInput.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragOver(false);
                                if (e.dataTransfer.files?.length) stageFiles(e.dataTransfer.files);
                            }}
                            role="button"
                            tabIndex={0}
                            className={
                                "mt-1 rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition " +
                                (dragOver
                                    ? "border-primary bg-primary/5"
                                    : "border-muted-foreground/30 hover:border-primary/60")
                            }
                        >
                            {uploadingStage ? (
                                <div className="flex items-center justify-center gap-2 text-sm">
                                    <Loader2 className="size-4 animate-spin" /> {t("uploading")}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1">
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
                                onChange={(e) => {
                                    if (e.target.files) stageFiles(e.target.files);
                                    e.target.value = "";
                                }}
                            />
                        </div>

                        {pendingFiles.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {pendingFiles.map((f, idx) => (
                                    <div key={`${f.name}-${idx}`} className="flex items-center gap-2 rounded border p-2 text-sm">
                                        <FileText className="size-4 opacity-60 shrink-0" />
                                        <span className="flex-1 truncate">{f.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {(f.size / 1024).toFixed(0)} KB
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            type="button"
                                            onClick={() => removePending(idx)}
                                            aria-label={t("removeFile")}
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={busy}>{t("cancel")}</Button>
                    <Button onClick={() => void save()} disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : t("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
                    <Button variant="outline" onClick={() => setDuplicateWarning(null)} disabled={busy}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={() => void save(true)} disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : t("continueSave")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

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

const round2 = (n: number) => Math.round(n * 100) / 100;
