"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Building2, Edit, Eye, Plus, Power, PowerOff, RefreshCw, Search, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";
import {
    activateBranch,
    createBranch,
    deactivateBranch,
    deleteBranch,
    getBranchName,
    getBranches,
    setMainBranch,
    updateBranch,
    type BranchDto,
    type BranchPayload,
} from "@/lib/api-branches";

type ActiveFilter = "all" | "active" | "inactive";

interface BranchFormState {
    name: string;
    nameAr: string;
    code: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    isActive: boolean;
    isMainBranch: boolean;
}

const DEFAULT_PAGE_SIZE = 20;
const FORM_ERROR_KEYS = new Set([
    "name",
    "nameAr",
    "code",
    "description",
    "address",
    "phone",
    "email",
    "isActive",
    "isMainBranch",
]);

function emptyForm(): BranchFormState {
    return {
        name: "",
        nameAr: "",
        code: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        isActive: true,
        isMainBranch: false,
    };
}

export default function BranchesPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const [branches, setBranches] = useState<BranchDto[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
    const [refreshKey, setRefreshKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<BranchDto | null>(null);
    const [detailsBranch, setDetailsBranch] = useState<BranchDto | null>(null);
    const [form, setForm] = useState<BranchFormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const text = {
        title: ar ? "الفروع" : "Branches",
        subtitle: ar ? "إدارة الفروع الأساسية بدون تغيير سلوك النظام الحالي" : "Manage branch records without changing current POS behavior",
        add: ar ? "فرع جديد" : "New branch",
        refresh: ar ? "تحديث" : "Refresh",
        search: ar ? "ابحث بالاسم أو الكود" : "Search by name or code",
        all: ar ? "الكل" : "All",
        active: ar ? "فعال" : "Active",
        inactive: ar ? "غير فعال" : "Inactive",
        name: ar ? "الاسم بالإنجليزية" : "Name English",
        nameAr: ar ? "الاسم بالعربية" : "Name Arabic",
        code: ar ? "الكود" : "Code",
        description: ar ? "الوصف" : "Description",
        address: ar ? "العنوان" : "Address",
        phone: ar ? "الهاتف" : "Phone",
        email: ar ? "البريد الإلكتروني" : "Email",
        contact: ar ? "التواصل" : "Contact",
        main: ar ? "الفرع الرئيسي" : "Main Branch",
        notMain: ar ? "فرع عادي" : "Regular branch",
        status: ar ? "الحالة" : "Status",
        updated: ar ? "آخر تحديث" : "Updated",
        actions: ar ? "إجراءات" : "Actions",
        empty: ar ? "لا توجد فروع" : "No branches found",
        edit: ar ? "تعديل فرع" : "Edit branch",
        create: ar ? "إنشاء فرع" : "Create branch",
        details: ar ? "تفاصيل الفرع" : "Branch details",
        save: ar ? "حفظ" : "Save",
        cancel: ar ? "إلغاء" : "Cancel",
        delete: ar ? "حذف" : "Delete",
        activate: ar ? "تفعيل" : "Activate",
        deactivate: ar ? "تعطيل" : "Deactivate",
        setMain: ar ? "تعيين كرئيسي" : "Set main",
        required: ar ? "هذا الحقل مطلوب" : "This field is required",
        invalidEmail: ar ? "أدخل بريدًا إلكترونيًا صحيحًا" : "Enter a valid email address",
        mainRequiresActive: ar ? "الفرع الرئيسي يجب أن يكون فعالًا" : "Main Branch must be active",
        mainCannotDeactivate: ar ? "لا يمكن تعطيل الفرع الرئيسي" : "The Main Branch cannot be deactivated",
        inactiveCannotMain: ar ? "لا يمكن جعل فرع غير فعال رئيسيًا" : "Inactive branches cannot become Main Branch",
        saved: ar ? "تم حفظ الفرع" : "Branch saved",
        deleted: ar ? "تم حذف الفرع" : "Branch deleted",
        statusChanged: ar ? "تم تحديث حالة الفرع" : "Branch status updated",
        mainChanged: ar ? "تم تحديث الفرع الرئيسي" : "Main Branch updated",
        failedLoad: ar ? "تعذر تحميل الفروع" : "Could not load branches",
        failedSave: ar ? "تعذر حفظ الفرع" : "Could not save branch",
        failedDelete: ar ? "تعذر حذف الفرع" : "Could not delete branch",
        failedAction: ar ? "تعذر تنفيذ العملية" : "Could not complete action",
        confirmDelete: ar ? "حذف هذا الفرع؟" : "Delete this branch?",
        loading: ar ? "جار التحميل..." : "Loading...",
        saving: ar ? "جار الحفظ..." : "Saving...",
        none: ar ? "غير محدد" : "Not set",
    };

    useEffect(() => {
        let cancelled = false;

        const loadBranches = async () => {
            setLoading(true);
            try {
                const page = await getBranches({
                    page: pageNumber,
                    pageSize,
                    search,
                    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
                });
                if (cancelled) return;
                setBranches(page.items);
                setTotalCount(page.totalCount);
                if (page.pageNumber !== pageNumber) setPageNumber(page.pageNumber);
            } catch {
                if (!cancelled) toast.error(ar ? "تعذر تحميل الفروع" : "Could not load branches");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void loadBranches();
        return () => {
            cancelled = true;
        };
    }, [pageNumber, pageSize, search, activeFilter, refreshKey, ar]);

    const requestReload = () => {
        setRefreshKey((current) => current + 1);
    };

    const openCreateDialog = () => {
        setEditingBranch(null);
        setForm(emptyForm());
        setErrors({});
        setDialogOpen(true);
    };

    const openEditDialog = (branch: BranchDto) => {
        setEditingBranch(branch);
        setForm({
            name: branch.name,
            nameAr: branch.nameAr ?? "",
            code: branch.code,
            description: branch.description ?? "",
            address: branch.address ?? "",
            phone: branch.phone ?? "",
            email: branch.email ?? "",
            isActive: branch.isActive,
            isMainBranch: branch.isMainBranch,
        });
        setErrors({});
        setDialogOpen(true);
    };

    const openDetailsDialog = (branch: BranchDto) => {
        setDetailsBranch(branch);
        setDetailsOpen(true);
    };

    const updateField = (key: keyof BranchFormState) =>
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm((current) => ({ ...current, [key]: event.target.value }));
        };

    const validateForm = () => {
        const next: Record<string, string> = {};
        if (!form.name.trim()) next.name = text.required;
        if (!form.code.trim()) next.code = text.required;
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            next.email = text.invalidEmail;
        }
        if (form.isMainBranch && !form.isActive) next.isMainBranch = text.mainRequiresActive;

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const toPayload = (): BranchPayload => ({
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || null,
        code: form.code.trim(),
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        isActive: form.isActive,
        isMainBranch: form.isMainBranch,
    });

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const payload = toPayload();
            if (editingBranch) {
                await updateBranch(editingBranch.id, payload);
            } else {
                await createBranch(payload);
            }
            toast.success(text.saved);
            setDialogOpen(false);
            requestReload();
        } catch (error) {
            const apiErrors = extractValidationErrors(error);
            if (apiErrors) {
                setErrors(apiErrors);
                toast.error(Object.values(apiErrors)[0] ?? text.failedSave);
            } else {
                toast.error(text.failedSave);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (branch: BranchDto) => {
        if (branch.isMainBranch && branch.isActive) {
            toast.error(text.mainCannotDeactivate);
            return;
        }

        setSaving(true);
        try {
            if (branch.isActive) {
                await deactivateBranch(branch.id);
            } else {
                await activateBranch(branch.id);
            }
            toast.success(text.statusChanged);
            requestReload();
        } catch {
            toast.error(text.failedAction);
        } finally {
            setSaving(false);
        }
    };

    const handleSetMain = async (branch: BranchDto) => {
        if (!branch.isActive) {
            toast.error(text.inactiveCannotMain);
            return;
        }

        setSaving(true);
        try {
            await setMainBranch(branch.id);
            toast.success(text.mainChanged);
            requestReload();
        } catch {
            toast.error(text.failedAction);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (branch: BranchDto) => {
        if (branch.isMainBranch) {
            toast.error(text.failedDelete);
            return;
        }
        if (!confirm(text.confirmDelete)) return;

        setSaving(true);
        try {
            await deleteBranch(branch.id);
            toast.success(text.deleted);
            requestReload();
        } catch {
            toast.error(text.failedDelete);
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (value: string) => {
        if (!value) return text.none;
        return new Intl.DateTimeFormat(ar ? "ar-QA" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(value));
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                        <Building2 className="h-6 w-6 text-primary" />
                        {text.title}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{text.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={requestReload} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        {text.refresh}
                    </Button>
                    <Button className="gap-2" onClick={openCreateDialog}>
                        <Plus className="h-4 w-4" />
                        {text.add}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">{text.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPageNumber(1);
                                }}
                                placeholder={text.search}
                                className="ps-9"
                            />
                        </div>
                        <Select
                            value={activeFilter}
                            onValueChange={(value) => {
                                setActiveFilter(value as ActiveFilter);
                                setPageNumber(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{text.all}</SelectItem>
                                <SelectItem value="active">{text.active}</SelectItem>
                                <SelectItem value="inactive">{text.inactive}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{text.code}</TableHead>
                                    <TableHead>{text.name}</TableHead>
                                    <TableHead>{text.nameAr}</TableHead>
                                    <TableHead>{text.contact}</TableHead>
                                    <TableHead>{text.status}</TableHead>
                                    <TableHead>{text.main}</TableHead>
                                    <TableHead>{text.updated}</TableHead>
                                    <TableHead className="text-end">{text.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                            {text.loading}
                                        </TableCell>
                                    </TableRow>
                                ) : branches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                            {text.empty}
                                        </TableCell>
                                    </TableRow>
                                ) : branches.map((branch) => (
                                    <TableRow key={branch.id}>
                                        <TableCell className="font-mono text-xs">{branch.code}</TableCell>
                                        <TableCell className="font-medium">{branch.name}</TableCell>
                                        <TableCell>{branch.nameAr || "—"}</TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {branch.phone || branch.email || text.none}
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => void handleToggleActive(branch)}
                                            >
                                                <Badge variant={branch.isActive ? "default" : "secondary"}>
                                                    {branch.isActive ? text.active : text.inactive}
                                                </Badge>
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            {branch.isMainBranch ? (
                                                <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                                    <Star className="h-3 w-3 fill-current" />
                                                    {text.main}
                                                </Badge>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={saving || !branch.isActive}
                                                    onClick={() => void handleSetMain(branch)}
                                                >
                                                    {text.setMain}
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-slate-600">
                                            {formatDate(branch.updatedAt)}
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openDetailsDialog(branch)} title={text.details}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(branch)} title={text.edit}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => void handleToggleActive(branch)} title={branch.isActive ? text.deactivate : text.activate}>
                                                    {branch.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    disabled={branch.isMainBranch || saving}
                                                    onClick={() => void handleDelete(branch)}
                                                    title={text.delete}
                                                >
                                                    <Trash2 className="h-4 w-4" />
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
                        onPageSizeChange={setPageSize}
                        pageSizeOptions={[10, 20, 50]}
                        isLoading={loading}
                    />
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingBranch ? text.edit : text.create}</DialogTitle>
                        <DialogDescription>
                            {editingBranch ? getBranchName(editingBranch, ar) : text.subtitle}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={text.name} error={errors.name}>
                            <Input value={form.name} onChange={updateField("name")} maxLength={120} />
                        </Field>
                        <Field label={text.nameAr}>
                            <Input value={form.nameAr} onChange={updateField("nameAr")} maxLength={120} dir="rtl" />
                        </Field>
                        <Field label={text.code} error={errors.code}>
                            <Input value={form.code} onChange={updateField("code")} maxLength={16} className="font-mono uppercase" />
                        </Field>
                        <Field label={text.phone}>
                            <Input value={form.phone} onChange={updateField("phone")} maxLength={50} />
                        </Field>
                        <Field label={text.email} error={errors.email}>
                            <Input type="email" value={form.email} onChange={updateField("email")} maxLength={200} />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ToggleField
                                label={text.status}
                                value={form.isActive}
                                disabled={form.isMainBranch}
                                onChange={(checked) => setForm((current) => ({
                                    ...current,
                                    isActive: checked,
                                    isMainBranch: checked ? current.isMainBranch : false,
                                }))}
                            />
                            <ToggleField
                                label={text.main}
                                value={form.isMainBranch}
                                disabled={editingBranch?.isMainBranch === true}
                                onChange={(checked) => setForm((current) => ({
                                    ...current,
                                    isMainBranch: checked,
                                    isActive: checked ? true : current.isActive,
                                }))}
                            />
                        </div>
                        {errors.isMainBranch ? (
                            <p className="sm:col-span-2 text-xs font-medium text-destructive">{errors.isMainBranch}</p>
                        ) : null}
                        <div className="sm:col-span-2">
                            <Field label={text.address}>
                                <Input value={form.address} onChange={updateField("address")} maxLength={500} />
                            </Field>
                        </div>
                        <div className="sm:col-span-2">
                            <Field label={text.description}>
                                <Textarea value={form.description} onChange={updateField("description")} maxLength={500} rows={3} />
                            </Field>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            {text.cancel}
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={saving}>
                            {saving ? text.saving : text.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{text.details}</DialogTitle>
                        <DialogDescription>
                            {detailsBranch ? getBranchName(detailsBranch, ar) : ""}
                        </DialogDescription>
                    </DialogHeader>
                    {detailsBranch ? (
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <DetailRow label={text.code} value={detailsBranch.code} />
                            <DetailRow label={text.status} value={detailsBranch.isActive ? text.active : text.inactive} />
                            <DetailRow label={text.main} value={detailsBranch.isMainBranch ? text.main : text.notMain} />
                            <DetailRow label={text.phone} value={detailsBranch.phone || text.none} />
                            <DetailRow label={text.email} value={detailsBranch.email || text.none} />
                            <DetailRow label={text.updated} value={formatDate(detailsBranch.updatedAt)} />
                            <div className="sm:col-span-2">
                                <DetailRow label={text.address} value={detailsBranch.address || text.none} />
                            </div>
                            <div className="sm:col-span-2">
                                <DetailRow label={text.description} value={detailsBranch.description || text.none} />
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                            {text.cancel}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
        </div>
    );
}

function ToggleField({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
            <Label>{label}</Label>
            <Switch checked={value} disabled={disabled} onCheckedChange={onChange} />
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 px-3 py-2">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-1 break-words text-slate-900">{value}</div>
        </div>
    );
}

function extractValidationErrors(error: unknown): Record<string, string> | null {
    const response = getApiErrorResponse(error);
    const errors = response?.errors;
    if (!errors || typeof errors !== "object") return null;

    const next: Record<string, string> = {};
    Object.entries(errors).forEach(([field, messages]) => {
        if (!Array.isArray(messages) || typeof messages[0] !== "string") return;
        const key = toFormErrorKey(field);
        if (key) next[key] = messages[0];
    });

    return Object.keys(next).length > 0 ? next : null;
}

function getApiErrorResponse(error: unknown): { errors?: unknown } | null {
    if (!error || typeof error !== "object" || !("response" in error)) return null;
    const response = (error as { response?: { data?: unknown } }).response;
    return response?.data && typeof response.data === "object"
        ? response.data as { errors?: unknown }
        : null;
}

function toFormErrorKey(field: string): string | null {
    const normalized = field.charAt(0).toLowerCase() + field.slice(1);
    return FORM_ERROR_KEYS.has(normalized) ? normalized : null;
}
