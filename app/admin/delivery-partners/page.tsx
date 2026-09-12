"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Edit, Eye, Plus, RefreshCw, Search, Trash2, Truck } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";
import { config } from "@/lib/config";
import {
    DELIVERY_PARTNER_DELIVERY_COST_RULE,
    DELIVERY_PARTNER_PRICING_RULE,
    DELIVERY_PARTNER_STATUS,
    createDeliveryPartner,
    deleteDeliveryPartner,
    getDeliveryPartnerName,
    getDeliveryPartners,
    getPricingRuleLabel,
    updateDeliveryPartner,
    type DeliveryPartnerDto,
    type DeliveryPartnerPricingRule,
    type DeliveryPartnerStatus,
    type DeliveryPartnerUpsertDto,
} from "@/lib/api-delivery-partners";
import {
    COST_SHARING_MODE,
    COST_SHARING_SCOPE,
    formatCostSharingSummary,
    getCostSharingModeLabel,
    getCostSharingScopeLabel,
    type CostSharingMode,
    type CostSharingScope,
} from "@/lib/cost-sharing";

type StatusFilter = "all" | "active" | "disabled";

interface PartnerFormState {
    name: string;
    nameAr: string;
    code: string;
    description: string;
    descriptionAr: string;
    logoUrl: string;
    status: string;
    defaultPricingRuleType: string;
    defaultPricingRuleValue: string;
    integrationEnabled: boolean;
    sortOrder: string;
    costSharingMode: string;
    costSharingScope: string;
    costSharingCommissionPercentage: string;
    costSharingRestaurantPercentage: string;
    costSharingCounterpartyPercentage: string;
}

const DEFAULT_PAGE_SIZE = 20;

function emptyForm(): PartnerFormState {
    return {
        name: "",
        nameAr: "",
        code: "",
        description: "",
        descriptionAr: "",
        logoUrl: "",
        status: String(DELIVERY_PARTNER_STATUS.Active),
        defaultPricingRuleType: String(DELIVERY_PARTNER_PRICING_RULE.None),
        defaultPricingRuleValue: "0",
        integrationEnabled: false,
        sortOrder: "0",
        costSharingMode: String(COST_SHARING_MODE.RestaurantBearsAll),
        costSharingScope: String(COST_SHARING_SCOPE.PerPartnerOrCard),
        costSharingCommissionPercentage: "0",
        costSharingRestaurantPercentage: "100",
        costSharingCounterpartyPercentage: "0",
    };
}

export default function DeliveryPartnersPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const [partners, setPartners] = useState<DeliveryPartnerDto[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<DeliveryPartnerDto | null>(null);
    const [form, setForm] = useState<PartnerFormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const text = {
        title: ar ? "شركاء التوصيل" : "Delivery Partners",
        subtitle: ar ? "إدارة المنصات والأسعار ومعرّفات المنتجات" : "Manage marketplaces, partner prices, and product IDs",
        add: ar ? "شريك جديد" : "New partner",
        refresh: ar ? "تحديث" : "Refresh",
        search: ar ? "ابحث بالاسم أو الكود" : "Search by name or code",
        all: ar ? "الكل" : "All",
        active: ar ? "فعال" : "Active",
        disabled: ar ? "معطل" : "Disabled",
        name: ar ? "الاسم بالإنجليزية" : "Name English",
        nameAr: ar ? "الاسم بالعربية" : "Name Arabic",
        code: ar ? "الكود" : "Code",
        logoUrl: ar ? "رابط الشعار" : "Logo URL",
        description: ar ? "الوصف بالإنجليزية" : "Description English",
        descriptionAr: ar ? "الوصف بالعربية" : "Description Arabic",
        pricingRule: ar ? "قاعدة السعر" : "Pricing rule",
        pricingValue: ar ? "قيمة السعر" : "Pricing value",
        costSharing: ar ? "تقاسم التكلفة" : "Cost sharing",
        costSharingMode: ar ? "من يتحمل العمولة" : "Who bears the commission",
        costSharingScope: ar ? "نطاق التطبيق" : "Application scope",
        commissionPercentage: ar ? "نسبة العمولة %" : "Commission %",
        restaurantShare: ar ? "حصة المتجر %" : "Merchant share %",
        counterpartyShare: ar ? "حصة الشريك %" : "Partner share %",
        integration: ar ? "التكامل" : "Integration",
        sortOrder: ar ? "ترتيب العرض" : "Sort order",
        status: ar ? "الحالة" : "Status",
        products: ar ? "منتجات الشريك" : "Partner products",
        actions: ar ? "إجراءات" : "Actions",
        details: ar ? "تفاصيل المنتجات" : "Product details",
        edit: ar ? "تعديل" : "Edit",
        delete: ar ? "حذف" : "Delete",
        empty: ar ? "لا يوجد شركاء توصيل" : "No delivery partners found",
        create: ar ? "إنشاء شريك" : "Create partner",
        save: ar ? "حفظ" : "Save",
        cancel: ar ? "إلغاء" : "Cancel",
        required: ar ? "هذا الحقل مطلوب" : "This field is required",
        invalidNumber: ar ? "أدخل رقمًا موجبًا" : "Enter a non-negative number",
        invalidPercentage: ar ? "أدخل نسبة من 0 إلى 100" : "Enter a percentage from 0 to 100",
        sharesMustTotal: ar ? "يجب أن يساوي مجموع الحصص 100%" : "Shares must total 100%",
        saved: ar ? "تم حفظ الشريك" : "Delivery partner saved",
        deleted: ar ? "تم حذف الشريك" : "Delivery partner deleted",
        failedLoad: ar ? "تعذر تحميل الشركاء" : "Could not load delivery partners",
        failedSave: ar ? "تعذر حفظ الشريك" : "Could not save delivery partner",
        failedDelete: ar ? "تعذر حذف الشريك" : "Could not delete delivery partner",
        confirmDelete: ar ? "حذف شريك التوصيل؟" : "Delete this delivery partner?",
        featureOff: ar ? "ميزة شركاء التوصيل غير مفعلة" : "Delivery Partners is disabled",
    };

    const loadPartners = async () => {
        if (!config.deliveryPartnersEnabled) return;
        setLoading(true);
        try {
            const status = statusFilter === "active"
                ? DELIVERY_PARTNER_STATUS.Active
                : statusFilter === "disabled"
                    ? DELIVERY_PARTNER_STATUS.Disabled
                    : undefined;
            const page = await getDeliveryPartners({ page: pageNumber, pageSize, search, status });
            setPartners(page.items);
            setTotalCount(page.totalCount);
        } catch {
            toast.error(text.failedLoad);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadPartners();
    }, [pageNumber, pageSize, search, statusFilter]);

    if (!config.deliveryPartnersEnabled) {
        return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">{text.featureOff}</div>;
    }

    const openCreateDialog = () => {
        setEditingPartner(null);
        setForm(emptyForm());
        setErrors({});
        setDialogOpen(true);
    };

    const openEditDialog = (partner: DeliveryPartnerDto) => {
        setEditingPartner(partner);
        setForm({
            name: partner.name,
            nameAr: partner.nameAr ?? "",
            code: partner.code,
            description: partner.description ?? "",
            descriptionAr: partner.descriptionAr ?? "",
            logoUrl: partner.logoUrl ?? "",
            status: String(partner.status),
            defaultPricingRuleType: String(partner.defaultPricingRuleType),
            defaultPricingRuleValue: String(partner.defaultPricingRuleValue),
            integrationEnabled: partner.integrationEnabled,
            sortOrder: String(partner.sortOrder),
            costSharingMode: String(partner.costSharingMode ?? COST_SHARING_MODE.RestaurantBearsAll),
            costSharingScope: String(partner.costSharingScope ?? COST_SHARING_SCOPE.PerPartnerOrCard),
            costSharingCommissionPercentage: String(partner.costSharingCommissionPercentage ?? 0),
            costSharingRestaurantPercentage: String(partner.costSharingRestaurantPercentage ?? 100),
            costSharingCounterpartyPercentage: String(partner.costSharingCounterpartyPercentage ?? 0),
        });
        setErrors({});
        setDialogOpen(true);
    };

    const updateField = (key: keyof PartnerFormState) =>
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm((current) => ({ ...current, [key]: event.target.value }));
        };

    const isSharedCostSharing = Number(form.costSharingMode) === COST_SHARING_MODE.Shared;

    const validateForm = () => {
        const next: Record<string, string> = {};
        const value = Number(form.defaultPricingRuleValue);
        const sortOrder = Number(form.sortOrder);
        const commission = Number(form.costSharingCommissionPercentage);
        const restaurantShare = Number(form.costSharingRestaurantPercentage);
        const counterpartyShare = Number(form.costSharingCounterpartyPercentage);
        if (!form.name.trim()) next.name = text.required;
        if (!form.nameAr.trim()) next.nameAr = text.required;
        if (!form.code.trim()) next.code = text.required;
        if (!Number.isFinite(value) || value < 0) next.defaultPricingRuleValue = text.invalidNumber;
        if (!Number.isInteger(sortOrder) || sortOrder < 0) next.sortOrder = text.invalidNumber;
        if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
            next.costSharingCommissionPercentage = text.invalidPercentage;
        }
        if (isSharedCostSharing) {
            if (!Number.isFinite(restaurantShare) || restaurantShare < 0 || restaurantShare > 100) {
                next.costSharingRestaurantPercentage = text.invalidPercentage;
            }
            if (!Number.isFinite(counterpartyShare) || counterpartyShare < 0 || counterpartyShare > 100) {
                next.costSharingCounterpartyPercentage = text.invalidPercentage;
            }
            if (Math.abs(restaurantShare + counterpartyShare - 100) > 0.01) {
                next.costSharingShares = text.sharesMustTotal;
            }
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const toPayload = (): DeliveryPartnerUpsertDto => {
        const mode = Number(form.costSharingMode) as CostSharingMode;
        const restaurantShare = mode === COST_SHARING_MODE.Shared
            ? Number(form.costSharingRestaurantPercentage)
            : mode === COST_SHARING_MODE.CounterpartyBearsAll ? 0 : 100;
        const counterpartyShare = mode === COST_SHARING_MODE.Shared
            ? Number(form.costSharingCounterpartyPercentage)
            : mode === COST_SHARING_MODE.CounterpartyBearsAll ? 100 : 0;

        return {
            name: form.name.trim(),
            nameAr: form.nameAr.trim(),
            code: form.code.trim(),
            description: form.description.trim() || null,
            descriptionAr: form.descriptionAr.trim() || null,
            logoUrl: form.logoUrl.trim() || null,
            status: Number(form.status) as DeliveryPartnerStatus,
            defaultPricingRuleType: Number(form.defaultPricingRuleType) as DeliveryPartnerPricingRule,
            defaultPricingRuleValue: Number(form.defaultPricingRuleValue),
            deliveryCostRuleType: DELIVERY_PARTNER_DELIVERY_COST_RULE.ManualEntry,
            defaultDeliveryCostValue: 0,
            integrationEnabled: form.integrationEnabled,
            integrationSettingsJson: editingPartner?.integrationSettingsJson ?? null,
            sortOrder: Number(form.sortOrder),
            costSharingMode: mode,
            costSharingScope: Number(form.costSharingScope) as CostSharingScope,
            costSharingCommissionPercentage: Number(form.costSharingCommissionPercentage),
            costSharingRestaurantPercentage: restaurantShare,
            costSharingCounterpartyPercentage: counterpartyShare,
        };
    };

    const handleSavePartner = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const payload = toPayload();
            if (editingPartner) {
                await updateDeliveryPartner(editingPartner.id, payload);
            } else {
                await createDeliveryPartner(payload);
            }
            toast.success(text.saved);
            setDialogOpen(false);
            await loadPartners();
        } catch {
            toast.error(text.failedSave);
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePartner = async (partner: DeliveryPartnerDto) => {
        if (!confirm(text.confirmDelete)) return;
        try {
            await deleteDeliveryPartner(partner.id);
            toast.success(text.deleted);
            await loadPartners();
        } catch {
            toast.error(text.failedDelete);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                        <Truck className="h-6 w-6 text-primary" />
                        {text.title}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{text.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => void loadPartners()} disabled={loading}>
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
                            <Input value={search} onChange={(event) => { setSearch(event.target.value); setPageNumber(1); }} placeholder={text.search} className="ps-9" />
                        </div>
                        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as StatusFilter); setPageNumber(1); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{text.all}</SelectItem>
                                <SelectItem value="active">{text.active}</SelectItem>
                                <SelectItem value="disabled">{text.disabled}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{text.code}</TableHead>
                                    <TableHead>{text.name}</TableHead>
                                    <TableHead>{text.pricingRule}</TableHead>
                                    <TableHead>{text.costSharing}</TableHead>
                                    <TableHead>{text.products}</TableHead>
                                    <TableHead>{text.integration}</TableHead>
                                    <TableHead>{text.status}</TableHead>
                                    <TableHead className="text-end">{text.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-slate-500">{ar ? "جار التحميل..." : "Loading..."}</TableCell></TableRow>
                                ) : partners.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-slate-500">{text.empty}</TableCell></TableRow>
                                ) : partners.map((partner) => (
                                    <TableRow key={partner.id}>
                                        <TableCell className="font-mono text-xs">{partner.code}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{getDeliveryPartnerName(partner, ar)}</div>
                                            <div className="text-xs text-slate-500">{partner.nameAr || " "}</div>
                                        </TableCell>
                                        <TableCell>{getPricingRuleLabel(partner.defaultPricingRuleType, ar)} {partner.defaultPricingRuleValue > 0 ? partner.defaultPricingRuleValue : ""}</TableCell>
                                        <TableCell className="text-xs text-slate-600">{formatCostSharingSummary(partner, ar)}</TableCell>
                                        <TableCell>{partner.enabledProductCount}/{partner.productMappingCount}</TableCell>
                                        <TableCell>
                                            <Badge variant={partner.integrationEnabled ? "default" : "secondary"}>
                                                {partner.integrationEnabled ? text.active : text.disabled}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={partner.status === DELIVERY_PARTNER_STATUS.Active ? "default" : "secondary"}>
                                                {partner.status === DELIVERY_PARTNER_STATUS.Active ? text.active : text.disabled}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-1">
                                                <Button asChild variant="ghost" size="icon" title={text.details}>
                                                    <Link href={`/ntxadminpos/delivery-partners/${partner.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(partner)} title={text.edit}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void handleDeletePartner(partner)} title={text.delete}>
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
                        <DialogTitle>{editingPartner ? text.edit : text.create}</DialogTitle>
                        <DialogDescription>
                            {editingPartner ? getDeliveryPartnerName(editingPartner, ar) : text.subtitle}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={text.name} error={errors.name}><Input value={form.name} onChange={updateField("name")} maxLength={140} /></Field>
                        <Field label={text.nameAr} error={errors.nameAr}><Input value={form.nameAr} onChange={updateField("nameAr")} maxLength={140} dir="rtl" /></Field>
                        <Field label={text.code} error={errors.code}><Input value={form.code} onChange={updateField("code")} maxLength={60} className="font-mono uppercase" /></Field>
                        <Field label={text.logoUrl}><Input value={form.logoUrl} onChange={updateField("logoUrl")} maxLength={500} /></Field>
                        <Field label={text.status}>
                            <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(DELIVERY_PARTNER_STATUS.Active)}>{text.active}</SelectItem>
                                    <SelectItem value={String(DELIVERY_PARTNER_STATUS.Disabled)}>{text.disabled}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={text.sortOrder} error={errors.sortOrder}><Input type="number" min={0} step={1} value={form.sortOrder} onChange={updateField("sortOrder")} /></Field>
                        <Field label={text.pricingRule}>
                            <Select value={form.defaultPricingRuleType} onValueChange={(value) => setForm((current) => ({ ...current, defaultPricingRuleType: value }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.None)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.None, ar)}</SelectItem>
                                    <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.PercentageIncrease)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.PercentageIncrease, ar)}</SelectItem>
                                    <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.PercentageDiscount)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.PercentageDiscount, ar)}</SelectItem>
                                    <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.FixedIncrease)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.FixedIncrease, ar)}</SelectItem>
                                    <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.FixedDiscount)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.FixedDiscount, ar)}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={text.pricingValue} error={errors.defaultPricingRuleValue}><Input type="number" min={0} step="0.01" value={form.defaultPricingRuleValue} onChange={updateField("defaultPricingRuleValue")} /></Field>
                        <Field label={text.commissionPercentage} error={errors.costSharingCommissionPercentage}>
                            <Input type="number" min={0} max={100} step="0.01" value={form.costSharingCommissionPercentage} onChange={updateField("costSharingCommissionPercentage")} />
                        </Field>
                        <Field label={text.costSharingMode}>
                            <Select
                                value={form.costSharingMode}
                                onValueChange={(value) => setForm((current) => ({
                                    ...current,
                                    costSharingMode: value,
                                    costSharingRestaurantPercentage: value === String(COST_SHARING_MODE.CounterpartyBearsAll) ? "0"
                                        : value === String(COST_SHARING_MODE.RestaurantBearsAll) ? "100"
                                            : current.costSharingRestaurantPercentage,
                                    costSharingCounterpartyPercentage: value === String(COST_SHARING_MODE.CounterpartyBearsAll) ? "100"
                                        : value === String(COST_SHARING_MODE.RestaurantBearsAll) ? "0"
                                            : current.costSharingCounterpartyPercentage,
                                }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(COST_SHARING_MODE.RestaurantBearsAll)}>{getCostSharingModeLabel(COST_SHARING_MODE.RestaurantBearsAll, ar)}</SelectItem>
                                    <SelectItem value={String(COST_SHARING_MODE.CounterpartyBearsAll)}>{getCostSharingModeLabel(COST_SHARING_MODE.CounterpartyBearsAll, ar)}</SelectItem>
                                    <SelectItem value={String(COST_SHARING_MODE.Shared)}>{getCostSharingModeLabel(COST_SHARING_MODE.Shared, ar)}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={text.costSharingScope}>
                            <Select value={form.costSharingScope} onValueChange={(value) => setForm((current) => ({ ...current, costSharingScope: value }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(COST_SHARING_SCOPE.AllOrders)}>{getCostSharingScopeLabel(COST_SHARING_SCOPE.AllOrders, ar)}</SelectItem>
                                    <SelectItem value={String(COST_SHARING_SCOPE.PerPartnerOrCard)}>{getCostSharingScopeLabel(COST_SHARING_SCOPE.PerPartnerOrCard, ar)}</SelectItem>
                                    <SelectItem value={String(COST_SHARING_SCOPE.PerOrder)}>{getCostSharingScopeLabel(COST_SHARING_SCOPE.PerOrder, ar)}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        {isSharedCostSharing ? (
                            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                                <Field label={text.restaurantShare} error={errors.costSharingRestaurantPercentage}>
                                    <Input type="number" min={0} max={100} step="0.01" value={form.costSharingRestaurantPercentage} onChange={updateField("costSharingRestaurantPercentage")} />
                                </Field>
                                <Field label={text.counterpartyShare} error={errors.costSharingCounterpartyPercentage}>
                                    <Input type="number" min={0} max={100} step="0.01" value={form.costSharingCounterpartyPercentage} onChange={updateField("costSharingCounterpartyPercentage")} />
                                </Field>
                            </div>
                        ) : null}
                        {errors.costSharingShares ? (
                            <p className="sm:col-span-2 text-xs font-medium text-destructive">{errors.costSharingShares}</p>
                        ) : null}
                        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
                            <Label>{text.integration}</Label>
                            <Switch checked={form.integrationEnabled} onCheckedChange={(checked) => setForm((current) => ({ ...current, integrationEnabled: checked }))} />
                        </div>
                        <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                            <Field label={text.description}><Textarea value={form.description} onChange={updateField("description")} maxLength={1000} rows={3} /></Field>
                            <Field label={text.descriptionAr}><Textarea value={form.descriptionAr} onChange={updateField("descriptionAr")} maxLength={1000} rows={3} dir="rtl" /></Field>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{text.cancel}</Button>
                        <Button onClick={() => void handleSavePartner()} disabled={saving}>{saving ? (ar ? "جار الحفظ..." : "Saving...") : text.save}</Button>
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
