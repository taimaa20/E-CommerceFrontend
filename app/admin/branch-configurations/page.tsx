"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Building2, Edit, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { StandardFilter, type StandardFilterOption } from "@/components/filters/StandardFilter";
import { useLocale } from "@/components/locale-provider";
import { DELIVERY_PAYMENT_MODE, getDeliveryPaymentModeLabel } from "@/lib/api-delivery";
import {
    createBranchConfiguration,
    deleteBranchConfiguration,
    getBranchConfigurationOptions,
    getBranchConfigurations,
    updateBranchConfiguration,
    type BranchConfigurationKind,
    type BranchConfigurationOption,
    type BranchConfigurationOptions,
    type BranchConfigurationPayload,
    type BranchConfigurationRow,
} from "@/lib/api-branch-configurations";

const DEFAULT_PAGE_SIZE = 25;
const ALL_BRANCHES = "all";

interface ConfigDefinition {
    kind: BranchConfigurationKind;
    label: string;
    singular: string;
    targetLabel?: string;
    optionKey?: keyof Omit<BranchConfigurationOptions, "branches" | "offers">;
    supportsAvailability?: boolean;
    supportsVisibility?: boolean;
    supportsEnabled?: boolean;
    supportsActive?: boolean;
    supportsDisplayOrder?: boolean;
    isSettings?: boolean;
    isDeliveryZone?: boolean;
}

interface FormState {
    branchIds: string[];
    targetId: string;
    nameEn: string;
    nameAr: string;
    code: string;
    deliveryFee: string;
    deliveryCost: string;
    paymentMode: string;
    centerLatitude: string;
    centerLongitude: string;
    radiusMeters: string;
    notes: string;
    settingKey: string;
    settingValue: string;
    valueType: string;
    description: string;
    isAvailable: boolean;
    isVisible: boolean;
    isEnabled: boolean;
    isActive: boolean;
    displayOrder: string;
}

function emptyForm(): FormState {
    return {
        branchIds: [],
        targetId: "",
        nameEn: "",
        nameAr: "",
        code: "",
        deliveryFee: "0",
        deliveryCost: "0",
        paymentMode: String(DELIVERY_PAYMENT_MODE.CustomerPays),
        centerLatitude: "",
        centerLongitude: "",
        radiusMeters: "",
        notes: "",
        settingKey: "",
        settingValue: "",
        valueType: "String",
        description: "",
        isAvailable: true,
        isVisible: true,
        isEnabled: true,
        isActive: true,
        displayOrder: "0",
    };
}

export default function BranchConfigurationsPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const configs = getConfigDefinitions(ar);
    const [activeKind, setActiveKind] = useState<BranchConfigurationKind>("products");
    const definition = configs.find((item) => item.kind === activeKind) ?? configs[0];
    const [options, setOptions] = useState<BranchConfigurationOptions | null>(null);
    const [rows, setRows] = useState<BranchConfigurationRow[]>([]);
    const [branchFilter, setBranchFilter] = useState(ALL_BRANCHES);
    const [search, setSearch] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<BranchConfigurationRow | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [refreshKey, setRefreshKey] = useState(0);

    const text = {
        title: ar ? "إعدادات الفروع" : "Branch Configuration",
        subtitle: ar ? "إعدادات لكل فرع دون تغيير سلوك النظام الحالي" : "Per-branch configuration records without changing current POS behavior",
        branch: ar ? "الفرع" : "Branch",
        branches: ar ? "الفروع" : "Branches",
        allBranches: ar ? "كل الفروع" : "All branches",
        selectBranches: ar ? "اختر الفروع" : "Select branches",
        searchBranches: ar ? "ابحث عن فرع..." : "Search branches...",
        searchOptions: ar ? "بحث..." : "Search...",
        selectAll: ar ? "تحديد الكل" : "Select all",
        clearAll: ar ? "مسح الكل" : "Clear all",
        noResults: ar ? "لا توجد نتائج" : "No results found",
        search: ar ? "بحث" : "Search",
        target: ar ? "العنصر" : "Item",
        status: ar ? "الحالة" : "Status",
        enabled: ar ? "مفعّل" : "Enabled",
        disabled: ar ? "معطّل" : "Disabled",
        available: ar ? "متاح" : "Available",
        unavailable: ar ? "غير متاح" : "Unavailable",
        active: ar ? "فعال" : "Active",
        inactive: ar ? "غير فعال" : "Inactive",
        visible: ar ? "ظاهر" : "Visible",
        hidden: ar ? "مخفي" : "Hidden",
        displayOrder: ar ? "ترتيب العرض" : "Display order",
        actions: ar ? "إجراءات" : "Actions",
        add: ar ? "إضافة إعداد" : "Add configuration",
        edit: ar ? "تعديل إعداد" : "Edit configuration",
        create: ar ? "إنشاء" : "Create",
        save: ar ? "حفظ" : "Save",
        cancel: ar ? "إلغاء" : "Cancel",
        delete: ar ? "حذف" : "Delete",
        refresh: ar ? "تحديث" : "Refresh",
        empty: ar ? "لا توجد إعدادات" : "No configuration records found",
        loading: ar ? "جار التحميل..." : "Loading...",
        required: ar ? "هذا الحقل مطلوب" : "This field is required",
        invalidOrder: ar ? "أدخل رقمًا صحيحًا موجبًا" : "Enter a non-negative whole number",
        saved: ar ? "تم حفظ الإعداد" : "Configuration saved",
        deleted: ar ? "تم حذف الإعداد" : "Configuration deleted",
        failedLoad: ar ? "تعذر تحميل الإعدادات" : "Could not load branch configuration",
        failedSave: ar ? "تعذر حفظ الإعداد" : "Could not save configuration",
        failedDelete: ar ? "تعذر حذف الإعداد" : "Could not delete configuration",
        confirmDelete: ar ? "حذف هذا الإعداد؟" : "Delete this configuration?",
        settingKey: ar ? "مفتاح الإعداد" : "Setting key",
        settingValue: ar ? "القيمة" : "Value",
        valueType: ar ? "نوع القيمة" : "Value type",
        description: ar ? "الوصف" : "Description",
        nameEn: ar ? "الاسم بالإنجليزية" : "Name English",
        nameAr: ar ? "الاسم بالعربية" : "Name Arabic",
        code: ar ? "الكود" : "Code",
        deliveryFee: ar ? "رسوم التوصيل" : "Delivery fee",
        deliveryCost: ar ? "تكلفة التوصيل" : "Delivery cost",
        paymentMode: ar ? "طريقة التحمل" : "Payment mode",
        centerLatitude: ar ? "خط العرض" : "Latitude",
        centerLongitude: ar ? "خط الطول" : "Longitude",
        radiusMeters: ar ? "نطاق التوصيل بالمتر" : "Delivery radius meters",
        notes: ar ? "ملاحظات" : "Notes",
        activeMaster: ar ? "البيانات الأساسية فعالة" : "Master data active",
        inactiveMaster: ar ? "البيانات الأساسية غير فعالة" : "Master data inactive",
        invalidAmount: ar ? "أدخل رقمًا موجبًا" : "Enter a non-negative number",
        invalidCoordinate: ar ? "الإحداثيات غير صحيحة" : "Coordinates are invalid",
    };

    useEffect(() => {
        let cancelled = false;
        const loadOptions = async () => {
            try {
                const next = await getBranchConfigurationOptions();
                if (!cancelled) setOptions(next);
            } catch {
                if (!cancelled) toast.error(text.failedLoad);
            }
        };

        void loadOptions();
        return () => {
            cancelled = true;
        };
    }, [text.failedLoad]);

    useEffect(() => {
        let cancelled = false;
        const loadRows = async () => {
            setLoading(true);
            try {
                const page = await getBranchConfigurations(activeKind, {
                    branchId: branchFilter === ALL_BRANCHES ? undefined : branchFilter,
                    search,
                    page: pageNumber,
                    pageSize,
                });
                if (cancelled) return;
                setRows(page.items);
                setTotalCount(page.totalCount);
                if (page.page !== pageNumber) setPageNumber(page.page);
            } catch {
                if (!cancelled) toast.error(text.failedLoad);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void loadRows();
        return () => {
            cancelled = true;
        };
    }, [activeKind, branchFilter, pageNumber, pageSize, refreshKey, search, text.failedLoad]);

    const requestReload = () => setRefreshKey((current) => current + 1);

    const openCreateDialog = () => {
        setEditingRow(null);
        setForm({
            ...emptyForm(),
            branchIds: branchFilter === ALL_BRANCHES ? [] : [branchFilter],
        });
        setErrors({});
        setDialogOpen(true);
    };

    const openEditDialog = (row: BranchConfigurationRow) => {
        setEditingRow(row);
        const nextForm = rowToForm(row, definition);
        setForm(nextForm);
        setErrors({});
        setDialogOpen(true);
    };

    const validateForm = () => {
        const next: Record<string, string> = {};
        if (form.branchIds.length === 0) next.branchIds = text.required;
        if (!definition.isSettings && !definition.isDeliveryZone && !form.targetId) next.targetId = text.required;
        if (definition.isSettings && !form.settingKey.trim()) next.settingKey = text.required;
        if (definition.isDeliveryZone) validateDeliveryZoneForm(form, next, text);
        if (definition.supportsDisplayOrder) {
            const order = Number(form.displayOrder);
            if (!Number.isInteger(order) || order < 0) next.displayOrder = text.invalidOrder;
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            await saveBranchSelection();
            toast.success(text.saved);
            setDialogOpen(false);
            requestReload();
        } catch (error) {
            const apiErrors = extractValidationErrors(error);
            if (apiErrors) setErrors(apiErrors);
            toast.error(Object.values(apiErrors ?? {})[0] ?? text.failedSave);
        } finally {
            setSaving(false);
        }
    };

    const saveBranchSelection = async () => {
        if (editingRow) {
            await updateBranchConfiguration(definition.kind, editingRow.id, toPayload(definition, form, form.branchIds[0]));
            return;
        }

        await Promise.all(form.branchIds.map((branchId) =>
            createBranchConfiguration(definition.kind, toPayload(definition, form, branchId))
        ));
    };

    const handleDelete = async (row: BranchConfigurationRow) => {
        if (!confirm(text.confirmDelete)) return;
        setSaving(true);
        try {
            await deleteBranchConfiguration(definition.kind, row.id);
            toast.success(text.deleted);
            requestReload();
        } catch {
            toast.error(text.failedDelete);
        } finally {
            setSaving(false);
        }
    };

    // Offers keep their legacy int PK — normalise their numeric ids to the string
    // shape the shared option components expect.
    const targetOptions: BranchConfigurationOption[] = definition.kind === "offers"
        ? (options?.offers ?? []).map((offer) => ({
            id: String(offer.id),
            name: offer.name,
            nameAr: offer.nameAr,
            isActive: offer.isActive,
        }))
        : definition.optionKey && options ? options[definition.optionKey] : [];

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
                    <Button className="gap-2" onClick={openCreateDialog} disabled={!options}>
                        <Plus className="h-4 w-4" />
                        {text.add}
                    </Button>
                </div>
            </div>

            <Tabs
                value={activeKind}
                onValueChange={(value) => {
                    setActiveKind(value as BranchConfigurationKind);
                    setPageNumber(1);
                    setSearch("");
                }}
            >
                <TabsList className="flex h-auto flex-wrap justify-start">
                    {configs.map((config) => (
                        <TabsTrigger key={config.kind} value={config.kind}>
                            {config.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">{definition.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
                        <StandardFilter
                            value={branchFilter}
                            onValueChange={(value) => {
                                setBranchFilter(value ?? ALL_BRANCHES);
                                setPageNumber(1);
                            }}
                            options={[
                                { value: ALL_BRANCHES, label: text.allBranches },
                                ...branchFilterOptions(options?.branches ?? [], ar),
                            ]}
                            placeholder={text.allBranches}
                            searchPlaceholder={text.searchBranches}
                            emptyText={text.noResults}
                            loadingText={text.loading}
                            clearLabel={text.clearAll}
                            disabled={!options}
                        />
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
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{text.branch}</TableHead>
                                    <TableHead>{definition.isSettings ? text.settingKey : definition.targetLabel ?? text.target}</TableHead>
                                    <TableHead>{text.status}</TableHead>
                                    {definition.supportsDisplayOrder ? <TableHead>{text.displayOrder}</TableHead> : null}
                                    <TableHead>{text.description}</TableHead>
                                    <TableHead className="text-end">{text.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            {text.loading}
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            {text.empty}
                                        </TableCell>
                                    </TableRow>
                                ) : rows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <div className="font-medium">{branchName(row, ar)}</div>
                                            <div className="font-mono text-xs text-slate-500">{row.branchCode}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{targetName(row, definition, ar)}</div>
                                            <div className="text-xs text-slate-500">{targetSecondary(row, definition, ar)}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1.5">
                                                {statusBadges(row, definition, text)}
                                            </div>
                                        </TableCell>
                                        {definition.supportsDisplayOrder ? (
                                            <TableCell>{displayOrder(row)}</TableCell>
                                        ) : null}
                                        <TableCell className="max-w-xs truncate text-sm text-slate-600">
                                            {description(row, definition)}
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(row)} disabled={saving}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => void handleDelete(row)} disabled={saving}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
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
                        pageSizeOptions={[10, 25, 50]}
                        isLoading={loading}
                    />
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingRow ? text.edit : text.add}</DialogTitle>
                        <DialogDescription>{definition.singular}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={text.branches} error={errors.branchIds}>
                            {editingRow ? (
                                <Input value={branchName(editingRow, ar)} readOnly disabled />
                            ) : (
                                <StandardFilter
                                    multiple
                                    values={form.branchIds}
                                    onValuesChange={(branchIds) => setForm((current) => ({ ...current, branchIds }))}
                                    options={branchFilterOptions(options?.branches ?? [], ar)}
                                    placeholder={text.selectBranches}
                                    searchPlaceholder={text.searchBranches}
                                    emptyText={text.noResults}
                                    loadingText={text.loading}
                                    clearLabel={text.clearAll}
                                    selectAllLabel={text.selectAll}
                                    disabled={!options || saving}
                                    maxMenuHeightClassName="max-h-72"
                                />
                            )}
                        </Field>

                        {definition.isDeliveryZone ? (
                            <>
                                <Field label={text.nameEn} error={errors.nameEn}>
                                    <Input
                                        value={form.nameEn}
                                        onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))}
                                        maxLength={120}
                                    />
                                </Field>
                                <Field label={text.nameAr}>
                                    <Input
                                        value={form.nameAr}
                                        onChange={(event) => setForm((current) => ({ ...current, nameAr: event.target.value }))}
                                        maxLength={120}
                                        dir="rtl"
                                    />
                                </Field>
                                <Field label={text.code} error={errors.code}>
                                    <Input
                                        value={form.code}
                                        onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                                        maxLength={40}
                                        className="font-mono uppercase"
                                    />
                                </Field>
                                <Field label={text.deliveryFee} error={errors.deliveryFee}>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={form.deliveryFee}
                                        onChange={(event) => setForm((current) => ({ ...current, deliveryFee: event.target.value }))}
                                    />
                                </Field>
                                <Field label={text.deliveryCost} error={errors.deliveryCost}>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={form.deliveryCost}
                                        onChange={(event) => setForm((current) => ({ ...current, deliveryCost: event.target.value }))}
                                    />
                                </Field>
                                <Field label={text.paymentMode}>
                                    <Select
                                        value={form.paymentMode}
                                        onValueChange={(paymentMode) => setForm((current) => ({ ...current, paymentMode }))}
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
                                <Field label={text.centerLatitude} error={errors.centerLatitude}>
                                    <Input
                                        type="number"
                                        min={-90}
                                        max={90}
                                        step="0.000001"
                                        value={form.centerLatitude}
                                        onChange={(event) => setForm((current) => ({ ...current, centerLatitude: event.target.value }))}
                                    />
                                </Field>
                                <Field label={text.centerLongitude}>
                                    <Input
                                        type="number"
                                        min={-180}
                                        max={180}
                                        step="0.000001"
                                        value={form.centerLongitude}
                                        onChange={(event) => setForm((current) => ({ ...current, centerLongitude: event.target.value }))}
                                    />
                                </Field>
                                <Field label={text.radiusMeters} error={errors.radiusMeters}>
                                    <Input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={form.radiusMeters}
                                        onChange={(event) => setForm((current) => ({ ...current, radiusMeters: event.target.value }))}
                                    />
                                </Field>
                                <div className="sm:col-span-2">
                                    <Field label={text.notes}>
                                        <Textarea
                                            value={form.notes}
                                            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                                            maxLength={500}
                                            rows={3}
                                        />
                                    </Field>
                                </div>
                            </>
                        ) : !definition.isSettings ? (
                            <Field label={definition.targetLabel ?? text.target} error={errors.targetId}>
                                {editingRow ? (
                                    <Input value={editTargetLabel(editingRow, definition, ar)} readOnly disabled />
                                ) : (
                                    <StandardFilter
                                        value={form.targetId || null}
                                        onValueChange={(targetId) => setForm((current) => ({ ...current, targetId: targetId ?? "" }))}
                                        options={targetOptions.map((option) => optionToFilterOption(option, ar))}
                                        placeholder={definition.targetLabel ?? text.target}
                                        searchPlaceholder={text.searchOptions}
                                        emptyText={text.noResults}
                                        loadingText={text.loading}
                                        clearLabel={text.clearAll}
                                        disabled={saving}
                                        contentClassName="min-w-80"
                                    />
                                )}
                            </Field>
                        ) : (
                            <>
                                <Field label={text.settingKey} error={errors.settingKey}>
                                    <Input
                                        value={form.settingKey}
                                        onChange={(event) => setForm((current) => ({ ...current, settingKey: event.target.value }))}
                                        maxLength={120}
                                        readOnly={Boolean(editingRow)}
                                        disabled={Boolean(editingRow)}
                                    />
                                </Field>
                                <Field label={text.valueType}>
                                    <Input
                                        value={form.valueType}
                                        onChange={(event) => setForm((current) => ({ ...current, valueType: event.target.value }))}
                                        maxLength={40}
                                    />
                                </Field>
                                <div className="sm:col-span-2">
                                    <Field label={text.settingValue}>
                                        <Textarea
                                            value={form.settingValue}
                                            onChange={(event) => setForm((current) => ({ ...current, settingValue: event.target.value }))}
                                            rows={3}
                                        />
                                    </Field>
                                </div>
                                <div className="sm:col-span-2">
                                    <Field label={text.description}>
                                        <Input
                                            value={form.description}
                                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                            maxLength={500}
                                        />
                                    </Field>
                                </div>
                            </>
                        )}

                        {definition.supportsAvailability ? (
                            <ToggleField
                                label={text.available}
                                value={form.isAvailable}
                                onChange={(isAvailable) => setForm((current) => ({ ...current, isAvailable }))}
                            />
                        ) : null}
                        {definition.supportsVisibility ? (
                            <ToggleField
                                label={text.visible}
                                value={form.isVisible}
                                onChange={(isVisible) => setForm((current) => ({ ...current, isVisible }))}
                            />
                        ) : null}
                        {definition.supportsEnabled ? (
                            <ToggleField
                                label={text.enabled}
                                value={form.isEnabled}
                                onChange={(isEnabled) => setForm((current) => ({ ...current, isEnabled }))}
                            />
                        ) : null}
                        {definition.supportsActive ? (
                            <ToggleField
                                label={text.active}
                                value={form.isActive}
                                onChange={(isActive) => setForm((current) => ({ ...current, isActive }))}
                            />
                        ) : null}
                        {definition.supportsDisplayOrder ? (
                            <Field label={text.displayOrder} error={errors.displayOrder}>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.displayOrder}
                                    onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))}
                                />
                            </Field>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            {text.cancel}
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={saving}>
                            {editingRow ? text.save : text.create}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function getConfigDefinitions(ar: boolean): ConfigDefinition[] {
    return [
        { kind: "products", label: ar ? "المنتجات" : "Products", singular: ar ? "إعداد منتج الفرع" : "Branch product configuration", targetLabel: ar ? "المنتج" : "Product", optionKey: "products", supportsAvailability: true, supportsVisibility: true, supportsDisplayOrder: true },
        { kind: "categories", label: ar ? "الفئات" : "Categories", singular: ar ? "إعداد فئة الفرع" : "Branch category configuration", targetLabel: ar ? "الفئة" : "Category", optionKey: "categories", supportsVisibility: true, supportsDisplayOrder: true },
        { kind: "subcategories", label: ar ? "الفئات الفرعية" : "Subcategories", singular: ar ? "إعداد فئة فرعية للفرع" : "Branch subcategory configuration", targetLabel: ar ? "الفئة الفرعية" : "Subcategory", optionKey: "subcategories", supportsVisibility: true, supportsDisplayOrder: true },
        { kind: "modifiers", label: ar ? "الإضافات" : "Modifiers", singular: ar ? "إعداد إضافة الفرع" : "Branch modifier configuration", targetLabel: ar ? "الإضافة" : "Modifier", optionKey: "modifiers", supportsAvailability: true },
        { kind: "modifier-groups", label: ar ? "مجموعات الإضافات" : "Modifier Groups", singular: ar ? "إعداد مجموعة إضافات للفرع" : "Branch modifier group configuration", targetLabel: ar ? "مجموعة الإضافات" : "Modifier group", optionKey: "modifierGroups", supportsAvailability: true, supportsVisibility: true, supportsDisplayOrder: true },
        { kind: "product-options", label: ar ? "خيارات المنتجات" : "Product Options", singular: ar ? "إعداد خيار منتج للفرع" : "Branch product option configuration", targetLabel: ar ? "خيار المنتج" : "Product option", optionKey: "productOptions", supportsAvailability: true, supportsVisibility: true, supportsDisplayOrder: true },
        { kind: "payment-methods", label: ar ? "طرق الدفع" : "Payment Methods", singular: ar ? "إعداد طريقة دفع الفرع" : "Branch payment method configuration", targetLabel: ar ? "طريقة الدفع" : "Payment method", optionKey: "paymentMethods", supportsEnabled: true },
        { kind: "delivery-partners", label: ar ? "شركاء التوصيل" : "Delivery Partners", singular: ar ? "إعداد شريك توصيل الفرع" : "Branch delivery partner configuration", targetLabel: ar ? "شريك التوصيل" : "Delivery partner", optionKey: "deliveryPartners", supportsEnabled: true },
        { kind: "delivery-zones", label: ar ? "مناطق التوصيل" : "Delivery Zones", singular: ar ? "إعداد منطقة توصيل للفرع" : "Branch delivery zone configuration", targetLabel: ar ? "منطقة التوصيل" : "Delivery zone", supportsActive: true, supportsDisplayOrder: true, isDeliveryZone: true },
        { kind: "printers", label: ar ? "الطابعات" : "Printers", singular: ar ? "إعداد طابعة الفرع" : "Branch printer configuration", targetLabel: ar ? "الطابعة" : "Printer", optionKey: "printers", supportsEnabled: true, supportsDisplayOrder: true },
        { kind: "offers", label: ar ? "العروض" : "Offers", singular: ar ? "إعداد عرض الفرع" : "Branch offer configuration", targetLabel: ar ? "العرض" : "Offer", supportsEnabled: true },
        { kind: "settings", label: ar ? "الإعدادات" : "Settings", singular: ar ? "إعدادات الفرع" : "Branch settings", supportsEnabled: true, isSettings: true },
    ];
}

function optionName(option: BranchConfigurationOption, ar: boolean): string {
    return ar ? option.nameAr || option.name : option.name;
}

function optionToFilterOption(option: BranchConfigurationOption, ar: boolean): StandardFilterOption {
    return {
        value: option.id,
        label: option.code ? `${optionName(option, ar)} · ${option.code}` : optionName(option, ar),
        description: option.secondaryLabel,
        disabled: !option.isActive,
        searchText: `${option.name} ${option.nameAr ?? ""} ${option.code ?? ""} ${option.secondaryLabel ?? ""}`,
    };
}

function branchFilterOptions(branches: BranchConfigurationOption[], ar: boolean): StandardFilterOption[] {
    return branches.map((branch) => optionToFilterOption(branch, ar));
}

function branchName(row: BranchConfigurationRow, ar: boolean): string {
    return ar ? row.branchNameAr || row.branchName : row.branchName;
}

function targetName(row: BranchConfigurationRow, definition: ConfigDefinition, ar: boolean): string {
    if (definition.kind === "products" && "productName" in row) return ar ? row.productNameAr || row.productName : row.productName;
    if (definition.kind === "categories" && "categoryId" in row) return ar ? row.categoryNameAr || row.categoryName : row.categoryName;
    if (definition.kind === "subcategories" && "subcategoryName" in row) return ar ? row.subcategoryNameAr || row.subcategoryName : row.subcategoryName;
    if (definition.kind === "modifiers" && "modifierName" in row) return ar ? row.modifierNameAr || row.modifierName : row.modifierName;
    if (definition.kind === "modifier-groups" && "modifierGroupName" in row) return ar ? row.modifierGroupNameAr || row.modifierGroupName : row.modifierGroupName;
    if (definition.kind === "product-options" && "productOptionName" in row) return ar ? row.productOptionNameAr || row.productOptionName : row.productOptionName;
    if (definition.kind === "payment-methods" && "paymentMethodName" in row) return ar ? row.paymentMethodNameAr || row.paymentMethodName : row.paymentMethodName;
    if (definition.kind === "delivery-partners" && "deliveryPartnerName" in row) return ar ? row.deliveryPartnerNameAr || row.deliveryPartnerName : row.deliveryPartnerName;
    if (definition.kind === "delivery-zones" && "nameEn" in row) return ar ? row.nameAr || row.nameEn : row.nameEn;
    if (definition.kind === "printers" && "printerName" in row) return ar ? row.printerNameAr || row.printerName : row.printerName;
    if (definition.kind === "offers" && "offerName" in row) return ar ? row.offerNameAr || row.offerName : row.offerName;
    if (definition.kind === "settings" && "settingKey" in row) return row.settingKey;
    return "";
}

function editTargetLabel(row: BranchConfigurationRow, definition: ConfigDefinition, ar: boolean): string {
    const name = targetName(row, definition, ar);
    const secondary = targetSecondary(row, definition, ar);
    return secondary ? `${name} · ${secondary}` : name;
}

function targetSecondary(row: BranchConfigurationRow, definition: ConfigDefinition, ar: boolean): string {
    if (definition.kind === "products" && "categoryName" in row) return ar ? row.categoryNameAr || row.categoryName || "" : row.categoryName || "";
    if (definition.kind === "subcategories" && "categoryName" in row) return ar ? row.categoryNameAr || row.categoryName || "" : row.categoryName || "";
    if (definition.kind === "modifiers" && "modifierGroupName" in row) return ar ? row.modifierGroupNameAr || row.modifierGroupName : row.modifierGroupName;
    if (definition.kind === "modifier-groups" && "selectionType" in row) return row.isRequired ? (ar ? "إجباري" : "Required") : (ar ? "اختياري" : "Optional");
    if (definition.kind === "product-options" && "productName" in row) return ar ? row.productNameAr || row.productName : row.productName;
    if (definition.kind === "payment-methods" && "paymentMethodCode" in row) return row.paymentMethodCode;
    if (definition.kind === "delivery-partners" && "deliveryPartnerCode" in row) return row.deliveryPartnerCode;
    if (definition.kind === "delivery-zones" && "code" in row) return row.code;
    if (definition.kind === "printers" && "printerKitchenName" in row) return ar ? row.printerKitchenNameAr || row.printerKitchenName || "" : row.printerKitchenName || "";
    if (definition.kind === "settings" && "settingValue" in row) return row.settingValue || "";
    return "";
}

function description(row: BranchConfigurationRow, definition: ConfigDefinition): string {
    if (definition.kind === "settings" && "description" in row) return row.description || row.valueType;
    if (definition.kind === "delivery-zones" && "deliveryFee" in row) {
        const radius = row.radiusMeters ? ` · ${row.radiusMeters}m` : "";
        return `${row.deliveryFee.toFixed(2)} / ${row.deliveryCost.toFixed(2)}${radius}`;
    }
    return row.updatedAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(row.updatedAt)) : "";
}

function displayOrder(row: BranchConfigurationRow): number | string {
    return "displayOrder" in row ? row.displayOrder : "";
}

function statusBadges(row: BranchConfigurationRow, definition: ConfigDefinition, text: Record<string, string>): ReactNode[] {
    const badges: ReactNode[] = [];
    if (definition.supportsEnabled && "isEnabled" in row) {
        badges.push(<Badge key="enabled" variant={row.isEnabled ? "default" : "secondary"}>{row.isEnabled ? text.enabled : text.disabled}</Badge>);
    }
    if (definition.supportsActive && "isActive" in row) {
        badges.push(<Badge key="active" variant={row.isActive ? "default" : "secondary"}>{row.isActive ? text.active : text.inactive}</Badge>);
    }
    if (definition.supportsAvailability && "isAvailable" in row) {
        badges.push(<Badge key="available" variant={row.isAvailable ? "default" : "secondary"}>{row.isAvailable ? text.available : text.unavailable}</Badge>);
    }
    if (definition.supportsVisibility && "isVisible" in row) {
        badges.push(<Badge key="visible" variant={row.isVisible ? "default" : "secondary"}>{row.isVisible ? text.visible : text.hidden}</Badge>);
    }
    if (!definition.isDeliveryZone) {
        badges.push(<Badge key="master" variant={isMasterActive(row, definition) ? "outline" : "secondary"}>{isMasterActive(row, definition) ? text.activeMaster : text.inactiveMaster}</Badge>);
    }
    return badges;
}

function isMasterActive(row: BranchConfigurationRow, definition: ConfigDefinition): boolean {
    if (definition.kind === "products" && "productIsActive" in row) return row.productIsActive;
    if (definition.kind === "categories" && "categoryIsActive" in row) return row.categoryIsActive;
    if (definition.kind === "subcategories" && "subcategoryIsActive" in row) return row.subcategoryIsActive;
    if (definition.kind === "modifiers" && "modifierIsActive" in row) return row.modifierIsActive;
    if (definition.kind === "product-options" && "productOptionIsActive" in row) return row.productOptionIsActive;
    if (definition.kind === "payment-methods" && "paymentMethodIsActive" in row) return row.paymentMethodIsActive;
    if (definition.kind === "delivery-partners" && "deliveryPartnerIsActive" in row) return row.deliveryPartnerIsActive;
    if (definition.kind === "printers" && "printerIsActive" in row) return row.printerIsActive;
    if (definition.kind === "offers" && "offerIsActive" in row) return row.offerIsActive;
    return true;
}

function rowToForm(row: BranchConfigurationRow, definition: ConfigDefinition): FormState {
    return {
        branchIds: [row.branchId],
        targetId: targetId(row, definition),
        nameEn: "nameEn" in row ? row.nameEn : "",
        nameAr: "nameAr" in row ? row.nameAr || "" : "",
        code: "code" in row ? row.code : "",
        deliveryFee: "deliveryFee" in row ? String(row.deliveryFee) : "0",
        deliveryCost: "deliveryCost" in row ? String(row.deliveryCost) : "0",
        paymentMode: "paymentMode" in row ? String(row.paymentMode) : String(DELIVERY_PAYMENT_MODE.CustomerPays),
        centerLatitude: "centerLatitude" in row ? String(row.centerLatitude ?? "") : "",
        centerLongitude: "centerLongitude" in row ? String(row.centerLongitude ?? "") : "",
        radiusMeters: "radiusMeters" in row ? String(row.radiusMeters ?? "") : "",
        notes: "notes" in row ? row.notes || "" : "",
        settingKey: "settingKey" in row ? row.settingKey : "",
        settingValue: "settingValue" in row ? row.settingValue || "" : "",
        valueType: "valueType" in row ? row.valueType : "String",
        description: "description" in row ? row.description || "" : "",
        isAvailable: "isAvailable" in row ? row.isAvailable : true,
        isVisible: "isVisible" in row ? row.isVisible : true,
        isEnabled: "isEnabled" in row ? row.isEnabled : true,
        isActive: "isActive" in row ? row.isActive : true,
        displayOrder: "displayOrder" in row ? String(row.displayOrder) : "0",
    };
}

function targetId(row: BranchConfigurationRow, definition: ConfigDefinition): string {
    if (definition.kind === "products" && "productId" in row) return row.productId;
    if (definition.kind === "categories" && "categoryId" in row) return row.categoryId;
    if (definition.kind === "subcategories" && "subcategoryId" in row) return row.subcategoryId;
    if (definition.kind === "modifiers" && "modifierId" in row) return row.modifierId;
    if (definition.kind === "modifier-groups" && "modifierGroupId" in row) return row.modifierGroupId;
    if (definition.kind === "product-options" && "productOptionId" in row) return row.productOptionId;
    if (definition.kind === "payment-methods" && "paymentMethodId" in row) return row.paymentMethodId;
    if (definition.kind === "delivery-partners" && "deliveryPartnerId" in row) return row.deliveryPartnerId;
    if (definition.kind === "delivery-zones") return row.id;
    if (definition.kind === "printers" && "printerId" in row) return row.printerId;
    if (definition.kind === "offers" && "offerId" in row) return String(row.offerId);
    return "";
}

function toPayload(definition: ConfigDefinition, form: FormState, branchId: string): BranchConfigurationPayload {
    const payload: BranchConfigurationPayload = { branchId };
    if (definition.kind === "products") payload.productId = form.targetId;
    if (definition.kind === "categories") payload.categoryId = form.targetId;
    if (definition.kind === "subcategories") payload.subcategoryId = form.targetId;
    if (definition.kind === "modifiers") payload.modifierId = form.targetId;
    if (definition.kind === "modifier-groups") payload.modifierGroupId = form.targetId;
    if (definition.kind === "product-options") payload.productOptionId = form.targetId;
    if (definition.kind === "payment-methods") payload.paymentMethodId = form.targetId;
    if (definition.kind === "delivery-partners") payload.deliveryPartnerId = form.targetId;
    if (definition.kind === "delivery-zones") {
        payload.nameEn = form.nameEn.trim();
        payload.nameAr = form.nameAr.trim() || null;
        payload.code = form.code.trim();
        payload.deliveryFee = Number(form.deliveryFee);
        payload.deliveryCost = Number(form.deliveryCost);
        payload.paymentMode = Number(form.paymentMode) as typeof DELIVERY_PAYMENT_MODE[keyof typeof DELIVERY_PAYMENT_MODE];
        payload.centerLatitude = form.centerLatitude.trim() ? Number(form.centerLatitude) : null;
        payload.centerLongitude = form.centerLongitude.trim() ? Number(form.centerLongitude) : null;
        payload.radiusMeters = form.radiusMeters.trim() ? Number(form.radiusMeters) : null;
        payload.notes = form.notes.trim() || null;
        payload.isActive = form.isActive;
    }
    if (definition.kind === "printers") payload.printerId = form.targetId;
    if (definition.kind === "offers") payload.offerId = Number(form.targetId);
    if (definition.supportsAvailability) payload.isAvailable = form.isAvailable;
    if (definition.supportsVisibility) payload.isVisible = form.isVisible;
    if (definition.supportsEnabled) payload.isEnabled = form.isEnabled;
    if (definition.supportsDisplayOrder) payload.displayOrder = Number(form.displayOrder);
    if (definition.isSettings) {
        payload.settingKey = form.settingKey.trim();
        payload.settingValue = form.settingValue.trim() || null;
        payload.valueType = form.valueType.trim() || "String";
        payload.description = form.description.trim() || null;
    }
    return payload;
}

function validateDeliveryZoneForm(form: FormState, errors: Record<string, string>, text: Record<string, string>) {
    const fee = Number(form.deliveryFee);
    const cost = Number(form.deliveryCost);
    const latitude = form.centerLatitude.trim() ? Number(form.centerLatitude) : null;
    const longitude = form.centerLongitude.trim() ? Number(form.centerLongitude) : null;
    const radius = form.radiusMeters.trim() ? Number(form.radiusMeters) : null;

    if (!form.nameEn.trim()) errors.nameEn = text.required;
    if (!form.code.trim()) errors.code = text.required;
    if (!Number.isFinite(fee) || fee < 0) errors.deliveryFee = text.invalidAmount;
    if (!Number.isFinite(cost) || cost < 0) errors.deliveryCost = text.invalidAmount;
    if ((latitude === null) !== (longitude === null)) errors.centerLatitude = text.invalidCoordinate;
    if (latitude !== null && (latitude < -90 || latitude > 90)) errors.centerLatitude = text.invalidCoordinate;
    if (longitude !== null && (longitude < -180 || longitude > 180)) errors.centerLatitude = text.invalidCoordinate;
    if (radius !== null && (!Number.isInteger(radius) || radius <= 0)) errors.radiusMeters = text.invalidOrder;
    if (radius !== null && latitude === null) errors.radiusMeters = text.invalidCoordinate;
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

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
            <Label>{label}</Label>
            <Switch checked={value} onCheckedChange={onChange} />
        </div>
    );
}

function extractValidationErrors(error: unknown): Record<string, string> | null {
    if (!error || typeof error !== "object" || !("response" in error)) return null;
    const data = (error as { response?: { data?: { errors?: unknown } } }).response?.data;
    if (!data?.errors || typeof data.errors !== "object") return null;

    const next: Record<string, string> = {};
    Object.entries(data.errors).forEach(([field, messages]) => {
        if (!Array.isArray(messages) || typeof messages[0] !== "string") return;
        const key = field.charAt(0).toLowerCase() + field.slice(1);
        next[key] = messages[0];
    });

    return Object.keys(next).length > 0 ? next : null;
}
