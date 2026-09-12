"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Edit, MapPinned, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/currencies";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { usePosStore } from "@/store/posStore";
import {
    DELIVERY_PAYMENT_MODE,
    createDeliveryZone,
    deleteDeliveryZone,
    getDeliveryPaymentModeLabel,
    getDeliveryZoneName,
    getDeliveryZones,
    updateDeliveryZone,
    type DeliveryPaymentMode,
    type DeliveryZoneDto,
    type DeliveryZoneUpsertDto,
} from "@/lib/api-delivery";

type ActiveFilter = "all" | "active" | "inactive";

interface DeliveryZoneFormState {
    nameEn: string;
    nameAr: string;
    code: string;
    deliveryFee: string;
    deliveryCost: string;
    paymentMode: string;
    isActive: boolean;
    displayOrder: string;
    notes: string;
}

const DEFAULT_PAGE_SIZE = 20;

function emptyForm(): DeliveryZoneFormState {
    return {
        nameEn: "",
        nameAr: "",
        code: "",
        deliveryFee: "0",
        deliveryCost: "0",
        paymentMode: String(DELIVERY_PAYMENT_MODE.CustomerPays),
        isActive: true,
        displayOrder: "0",
        notes: "",
    };
}

export default function DeliveryZonesPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const { currency } = usePosStore();
    const [zones, setZones] = useState<DeliveryZoneDto[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const branchVersion = useActiveBranchVersion();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<DeliveryZoneDto | null>(null);
    const [form, setForm] = useState<DeliveryZoneFormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const text = {
        title: ar ? "مناطق التوصيل" : "Delivery Zones",
        subtitle: ar ? "إدارة الرسوم والتكاليف حسب المنطقة" : "Manage area fees, costs, and cashier selection",
        add: ar ? "منطقة جديدة" : "New zone",
        refresh: ar ? "تحديث" : "Refresh",
        search: ar ? "ابحث بالاسم أو الكود" : "Search by name or code",
        all: ar ? "الكل" : "All",
        active: ar ? "فعالة" : "Active",
        inactive: ar ? "غير فعالة" : "Inactive",
        nameEn: ar ? "الاسم بالإنجليزية" : "Name English",
        nameAr: ar ? "الاسم بالعربية" : "Name Arabic",
        code: ar ? "الكود" : "Code",
        fee: ar ? "رسوم التوصيل" : "Delivery fee",
        cost: ar ? "تكلفة التوصيل" : "Delivery cost",
        profit: ar ? "الربح" : "Profit",
        paymentMode: ar ? "طريقة التحمل" : "Payment mode",
        displayOrder: ar ? "ترتيب العرض" : "Display order",
        notes: ar ? "ملاحظات" : "Notes",
        status: ar ? "الحالة" : "Status",
        actions: ar ? "إجراءات" : "Actions",
        empty: ar ? "لا توجد مناطق توصيل" : "No delivery zones found",
        edit: ar ? "تعديل منطقة" : "Edit zone",
        create: ar ? "إنشاء منطقة" : "Create zone",
        save: ar ? "حفظ" : "Save",
        cancel: ar ? "إلغاء" : "Cancel",
        required: ar ? "هذا الحقل مطلوب" : "This field is required",
        invalidAmount: ar ? "أدخل رقمًا موجبًا" : "Enter a non-negative number",
        saved: ar ? "تم حفظ منطقة التوصيل" : "Delivery zone saved",
        deleted: ar ? "تم حذف منطقة التوصيل" : "Delivery zone deleted",
        failedLoad: ar ? "تعذر تحميل مناطق التوصيل" : "Could not load delivery zones",
        failedSave: ar ? "تعذر حفظ منطقة التوصيل" : "Could not save delivery zone",
        failedDelete: ar ? "تعذر حذف منطقة التوصيل" : "Could not delete delivery zone",
        confirmDelete: ar ? "حذف منطقة التوصيل؟" : "Delete this delivery zone?",
    };

    const loadZones = async () => {
        setLoading(true);
        try {
            const page = await getDeliveryZones({
                page: pageNumber,
                pageSize,
                search,
                isActive: activeFilter === "all" ? undefined : activeFilter === "active",
            });
            setZones(page.items);
            setTotalCount(page.totalCount);
            if (page.pageNumber !== pageNumber) setPageNumber(page.pageNumber);
        } catch {
            toast.error(text.failedLoad);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadZones();
    }, [branchVersion, pageNumber, pageSize, search, activeFilter]);

    const openCreateDialog = () => {
        setEditingZone(null);
        setForm(emptyForm());
        setErrors({});
        setDialogOpen(true);
    };

    const openEditDialog = (zone: DeliveryZoneDto) => {
        setEditingZone(zone);
        setForm({
            nameEn: zone.nameEn,
            nameAr: zone.nameAr ?? "",
            code: zone.code,
            deliveryFee: String(zone.deliveryFee),
            deliveryCost: String(zone.deliveryCost),
            paymentMode: String(zone.paymentMode),
            isActive: zone.isActive,
            displayOrder: String(zone.displayOrder),
            notes: zone.notes ?? "",
        });
        setErrors({});
        setDialogOpen(true);
    };

    const updateField = (key: keyof DeliveryZoneFormState) =>
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm((current) => ({ ...current, [key]: event.target.value }));
        };

    const validateForm = () => {
        const next: Record<string, string> = {};
        const fee = Number(form.deliveryFee);
        const cost = Number(form.deliveryCost);
        const displayOrder = Number(form.displayOrder);

        if (!form.nameEn.trim()) next.nameEn = text.required;
        if (!form.nameAr.trim()) next.nameAr = text.required;
        if (!form.code.trim()) next.code = text.required;
        if (!Number.isFinite(fee) || fee < 0) next.deliveryFee = text.invalidAmount;
        if (!Number.isFinite(cost) || cost < 0) next.deliveryCost = text.invalidAmount;
        if (!Number.isInteger(displayOrder) || displayOrder < 0) next.displayOrder = text.invalidAmount;

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const toPayload = (): DeliveryZoneUpsertDto => ({
        nameEn: form.nameEn.trim(),
        nameAr: form.nameAr.trim() || null,
        code: form.code.trim(),
        deliveryFee: Number(form.deliveryFee),
        deliveryCost: Number(form.deliveryCost),
        paymentMode: Number(form.paymentMode) as DeliveryPaymentMode,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder),
        notes: form.notes.trim() || null,
    });

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const payload = toPayload();
            if (editingZone) {
                await updateDeliveryZone(editingZone.id, payload);
            } else {
                await createDeliveryZone(payload);
            }
            toast.success(text.saved);
            setDialogOpen(false);
            await loadZones();
        } catch {
            toast.error(text.failedSave);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (zone: DeliveryZoneDto) => {
        if (!confirm(text.confirmDelete)) return;
        try {
            await deleteDeliveryZone(zone.id);
            toast.success(text.deleted);
            await loadZones();
        } catch {
            toast.error(text.failedDelete);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                        <MapPinned className="h-6 w-6 text-primary" />
                        {text.title}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{text.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => void loadZones()} disabled={loading}>
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
                                    <TableHead>{text.nameEn}</TableHead>
                                    <TableHead>{text.nameAr}</TableHead>
                                    <TableHead>{text.fee}</TableHead>
                                    <TableHead>{text.cost}</TableHead>
                                    <TableHead>{text.profit}</TableHead>
                                    <TableHead>{text.paymentMode}</TableHead>
                                    <TableHead>{text.status}</TableHead>
                                    <TableHead className="text-end">{text.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                                            {ar ? "جار التحميل..." : "Loading..."}
                                        </TableCell>
                                    </TableRow>
                                ) : zones.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                                            {text.empty}
                                        </TableCell>
                                    </TableRow>
                                ) : zones.map((zone) => (
                                    <TableRow key={zone.id}>
                                        <TableCell className="font-mono text-xs">{zone.code}</TableCell>
                                        <TableCell className="font-medium">{zone.nameEn}</TableCell>
                                        <TableCell>{zone.nameAr || "—"}</TableCell>
                                        <TableCell>{formatCurrency(zone.deliveryFee, currency)}</TableCell>
                                        <TableCell>{formatCurrency(zone.deliveryCost, currency)}</TableCell>
                                        <TableCell>{formatCurrency(zone.deliveryFee - zone.deliveryCost, currency)}</TableCell>
                                        <TableCell>{getDeliveryPaymentModeLabel(zone.paymentMode, ar)}</TableCell>
                                        <TableCell>
                                            <Badge variant={zone.isActive ? "default" : "secondary"}>
                                                {zone.isActive ? text.active : text.inactive}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(zone)} title={text.edit}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void handleDelete(zone)} title={text.failedDelete}>
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
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingZone ? text.edit : text.create}</DialogTitle>
                        <DialogDescription>
                            {editingZone ? getDeliveryZoneName(editingZone, ar) : text.subtitle}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={text.nameEn} error={errors.nameEn}>
                            <Input value={form.nameEn} onChange={updateField("nameEn")} maxLength={120} />
                        </Field>
                        <Field label={text.nameAr} error={errors.nameAr}>
                            <Input value={form.nameAr} onChange={updateField("nameAr")} maxLength={120} dir="rtl" />
                        </Field>
                        <Field label={text.code} error={errors.code}>
                            <Input value={form.code} onChange={updateField("code")} maxLength={40} className="font-mono uppercase" />
                        </Field>
                        <Field label={text.displayOrder} error={errors.displayOrder}>
                            <Input type="number" min={0} step={1} value={form.displayOrder} onChange={updateField("displayOrder")} />
                        </Field>
                        <Field label={text.fee} error={errors.deliveryFee}>
                            <Input type="number" min={0} step="0.01" value={form.deliveryFee} onChange={updateField("deliveryFee")} />
                        </Field>
                        <Field label={text.cost} error={errors.deliveryCost}>
                            <Input type="number" min={0} step="0.01" value={form.deliveryCost} onChange={updateField("deliveryCost")} />
                        </Field>
                        <Field label={text.paymentMode}>
                            <Select
                                value={form.paymentMode}
                                onValueChange={(value) => setForm((current) => ({ ...current, paymentMode: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(DELIVERY_PAYMENT_MODE.CustomerPays)}>
                                        {getDeliveryPaymentModeLabel(DELIVERY_PAYMENT_MODE.CustomerPays, ar)}
                                    </SelectItem>
                                    <SelectItem value={String(DELIVERY_PAYMENT_MODE.RestaurantPays)}>
                                        {getDeliveryPaymentModeLabel(DELIVERY_PAYMENT_MODE.RestaurantPays, ar)}
                                    </SelectItem>
                                    <SelectItem value={String(DELIVERY_PAYMENT_MODE.Shared)}>
                                        {getDeliveryPaymentModeLabel(DELIVERY_PAYMENT_MODE.Shared, ar)}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
                            <Label>{text.status}</Label>
                            <Switch
                                checked={form.isActive}
                                onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Field label={text.notes}>
                                <Textarea value={form.notes} onChange={updateField("notes")} maxLength={500} rows={3} />
                            </Field>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            {text.cancel}
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={saving}>
                            {saving ? (ar ? "جار الحفظ..." : "Saving...") : text.save}
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
