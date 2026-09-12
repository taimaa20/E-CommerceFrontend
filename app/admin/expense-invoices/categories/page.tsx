"use client";

// Manage Expense Categories — admin CRUD page for the lookup that
// powers the Category dropdown on the New / Edit Expense Invoice forms.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import { useLocale } from "@/components/locale-provider";
import {
    expenseCategoriesApi,
    ExpenseCategory,
    ExpenseCategoryPayload,
} from "@/lib/api-expense-categories";

const labels = {
    back:         { en: "Back",                ar: "رجوع" },
    title:        { en: "Expense Categories",  ar: "فئات المصروفات" },
    subtitle:     { en: "Manage the dropdown shown on the Expense Invoice form.", ar: "إدارة القائمة المنسدلة في نموذج فاتورة المصروف." },
    add:          { en: "Add Category",        ar: "إضافة فئة" },
    name:         { en: "Name (EN)",           ar: "الاسم (إنجليزي)" },
    nameAr:       { en: "Name (AR)",           ar: "الاسم (عربي)" },
    color:        { en: "Color",               ar: "اللون" },
    sortOrder:    { en: "Sort Order",          ar: "ترتيب العرض" },
    active:       { en: "Active",              ar: "نشطة" },
    inactive:     { en: "Inactive",            ar: "غير نشطة" },
    invoices:     { en: "Invoices",            ar: "الفواتير" },
    actions:      { en: "Actions",             ar: "الإجراءات" },
    save:         { en: "Save",                ar: "حفظ" },
    saving:       { en: "Saving…",             ar: "جارٍ الحفظ…" },
    cancel:       { en: "Cancel",              ar: "إلغاء" },
    edit:         { en: "Edit",                ar: "تعديل" },
    delete:       { en: "Delete",              ar: "حذف" },
    deleteConfirm:{ en: "Delete this category? Existing invoices keep their stored label.", ar: "هل تريد حذف هذه الفئة؟ ستحتفظ الفواتير الحالية بالاسم المخزن." },
    empty:        { en: "No categories yet.",  ar: "لا توجد فئات بعد." },
    createTitle:  { en: "New Category",        ar: "فئة جديدة" },
    editTitle:    { en: "Edit Category",       ar: "تعديل فئة" },

    // Validation
    vRequired:    { en: "Required",            ar: "حقل مطلوب" },
    vNameTooLong: { en: "Name too long (max 120)", ar: "الاسم طويل جداً (١٢٠ كحد أقصى)" },
    vColor:       { en: "Color must be a hex code (#RRGGBB)", ar: "اللون يجب أن يكون كود سداسي (#RRGGBB)" },
    vSortRange:   { en: "Sort order must be 0–9999", ar: "الترتيب يجب أن يكون بين ٠ و٩٩٩٩" },
    vFixErrors:   { en: "Please fix the highlighted fields.", ar: "يرجى إصلاح الحقول المظللة." },
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MAX_NAME = 120;

type CategoryErrors = Partial<Record<"name" | "nameAr" | "color" | "sortOrder", string>>;

function validateCategory(p: ExpenseCategoryPayload, t: (k: keyof typeof labels) => string): CategoryErrors {
    const e: CategoryErrors = {};
    if (!p.name || !p.name.trim()) e.name = t("vRequired");
    else if (p.name.length > MAX_NAME) e.name = t("vNameTooLong");

    if (p.nameAr && p.nameAr.length > MAX_NAME) e.nameAr = t("vNameTooLong");
    if (p.color && p.color.trim() && !HEX_RE.test(p.color.trim())) e.color = t("vColor");
    if (!Number.isInteger(p.sortOrder) || p.sortOrder < 0 || p.sortOrder > 9999) e.sortOrder = t("vSortRange");

    return e;
}

const EMPTY_FORM: ExpenseCategoryPayload = {
    name: "",
    nameAr: "",
    color: "",
    isActive: true,
    sortOrder: 0,
};

export default function ExpenseCategoriesPage() {
    const { isRtl } = useLocale();
    const t = useCallback(
        (k: keyof typeof labels) => (isRtl ? labels[k].ar : labels[k].en),
        [isRtl]
    );

    const [items, setItems] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<ExpenseCategory | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await expenseCategoriesApi.list(false);
            setItems(list);
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل التحميل" : "Failed to load"));
        } finally {
            setLoading(false);
        }
    }, [isRtl]);

    useEffect(() => { void load(); }, [load]);

    const onSave = async (payload: ExpenseCategoryPayload) => {
        setBusy(true);
        try {
            if (editing) {
                await expenseCategoriesApi.update(editing.id, payload);
                toast.success(isRtl ? "تم الحفظ" : "Saved");
            } else {
                await expenseCategoriesApi.create(payload);
                toast.success(isRtl ? "تم الإنشاء" : "Created");
            }
            setEditing(null);
            setCreating(false);
            await load();
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الحفظ" : "Save failed"));
        } finally {
            setBusy(false);
        }
    };

    const onDelete = async () => {
        if (!deleteTarget) return;
        setBusy(true);
        try {
            await expenseCategoriesApi.remove(deleteTarget);
            toast.success(isRtl ? "تم الحذف" : "Deleted");
            setDeleteTarget(null);
            await load();
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الحذف" : "Delete failed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <Link href="/ntxadminpos/expense-invoices">
                    <Button variant="ghost" size="sm" className="gap-1">
                        <ArrowLeft className="size-4" />
                        {t("back")}
                    </Button>
                </Link>
                <Button onClick={() => setCreating(true)} className="gap-2">
                    <Plus className="size-4" />
                    {t("add")}
                </Button>
            </div>

            <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <Tag className="size-6" />
                    {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading && items.length === 0 ? (
                        <div className="p-6 space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">{t("empty")}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10" />
                                    <TableHead>{t("name")}</TableHead>
                                    <TableHead>{t("nameAr")}</TableHead>
                                    <TableHead className="text-center">{t("sortOrder")}</TableHead>
                                    <TableHead className="text-center">{t("invoices")}</TableHead>
                                    <TableHead className="text-center">{t("active")}</TableHead>
                                    <TableHead className="text-end">{t("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <div
                                                className="size-4 rounded-full border"
                                                style={{ backgroundColor: c.color || "transparent" }}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{c.nameAr || "—"}</TableCell>
                                        <TableCell className="text-center">{c.sortOrder}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{c.invoiceCount}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {c.isActive
                                                ? <Badge>{t("active")}</Badge>
                                                : <Badge variant="outline">{t("inactive")}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex gap-1 justify-end">
                                                <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={t("edit")}>
                                                    <Edit className="size-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(c.id)} aria-label={t("delete")}>
                                                    <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit dialog */}
            <CategoryFormDialog
                open={creating || !!editing}
                title={editing ? t("editTitle") : t("createTitle")}
                initial={editing
                    ? {
                        name: editing.name,
                        nameAr: editing.nameAr ?? "",
                        color: editing.color ?? "",
                        isActive: editing.isActive,
                        sortOrder: editing.sortOrder,
                    }
                    : EMPTY_FORM}
                busy={busy}
                tLabel={t}
                onCancel={() => { setEditing(null); setCreating(false); }}
                onSubmit={onSave}
            />

            {/* Delete confirm */}
            <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t("delete")}</DialogTitle></DialogHeader>
                    <p className="text-sm">{t("deleteConfirm")}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>{t("cancel")}</Button>
                        <Button variant="destructive" onClick={onDelete} disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : t("delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CategoryFormDialog({
    open, title, initial, busy, tLabel, onCancel, onSubmit,
}: {
    open: boolean;
    title: string;
    initial: ExpenseCategoryPayload;
    busy: boolean;
    tLabel: (k: keyof typeof labels) => string;
    onCancel: () => void;
    onSubmit: (payload: ExpenseCategoryPayload) => void;
}) {
    const [form, setForm] = useState<ExpenseCategoryPayload>(initial);
    const [errors, setErrors] = useState<CategoryErrors>({});

    // Reset to the parent's initial whenever the dialog reopens with new values.
    useEffect(() => { setForm(initial); setErrors({}); }, [initial, open]);

    const handleSubmit = () => {
        const errs = validateCategory(form, tLabel);
        setErrors(errs);
        if (Object.keys(errs).length > 0) {
            toast.error(tLabel("vFixErrors"));
            return;
        }
        // Trim values right before submit so trailing whitespace never reaches the DB.
        onSubmit({
            ...form,
            name: form.name.trim(),
            nameAr: form.nameAr?.trim() || null,
            color: form.color?.trim() || null,
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <DialogContent>
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs">{tLabel("name")}<span className="text-destructive ms-1">*</span></Label>
                        <Input
                            className={"mt-1 " + (errors.name ? "border-destructive" : "")}
                            value={form.name}
                            maxLength={MAX_NAME}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
                    </div>
                    <div>
                        <Label className="text-xs">{tLabel("nameAr")}</Label>
                        <Input
                            className={"mt-1 " + (errors.nameAr ? "border-destructive" : "")}
                            dir="rtl"
                            maxLength={MAX_NAME}
                            value={form.nameAr ?? ""}
                            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                        />
                        {errors.nameAr && <p className="mt-1 text-[11px] text-destructive">{errors.nameAr}</p>}
                    </div>
                    <div>
                        <Label className="text-xs">{tLabel("color")}</Label>
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                type="color"
                                className="size-9 rounded border bg-background"
                                value={form.color || "#94a3b8"}
                                onChange={(e) => setForm({ ...form, color: e.target.value })}
                            />
                            <Input
                                className={errors.color ? "border-destructive" : ""}
                                value={form.color ?? ""}
                                onChange={(e) => setForm({ ...form, color: e.target.value })}
                                placeholder="#94a3b8"
                            />
                        </div>
                        {errors.color && <p className="mt-1 text-[11px] text-destructive">{errors.color}</p>}
                    </div>
                    <div>
                        <Label className="text-xs">{tLabel("sortOrder")}</Label>
                        <Input
                            type="number"
                            min="0"
                            max="9999"
                            className={"mt-1 " + (errors.sortOrder ? "border-destructive" : "")}
                            value={form.sortOrder}
                            onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
                        />
                        {errors.sortOrder && <p className="mt-1 text-[11px] text-destructive">{errors.sortOrder}</p>}
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                        <Switch
                            checked={form.isActive}
                            onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                        />
                        <Label>{tLabel("active")}</Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={busy}>{tLabel("cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : tLabel("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
