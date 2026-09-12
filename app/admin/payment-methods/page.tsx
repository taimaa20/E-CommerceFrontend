"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CreditCard, Edit, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
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
import { useLocale } from "@/components/locale-provider";
import {
    createPaymentMethod,
    deletePaymentMethod,
    getPaymentMethodName,
    getPaymentMethods,
    updatePaymentMethod,
    type PaymentMethodDto,
    type PaymentMethodPayload,
} from "@/lib/api-payment-methods";
import {
    COST_SHARING_MODE,
    COST_SHARING_SCOPE,
    formatCostSharingSummary,
    getCostSharingModeLabel,
    getCostSharingScopeLabel,
    type CostSharingMode,
    type CostSharingScope,
} from "@/lib/cost-sharing";

interface PaymentMethodFormState {
    nameEn: string;
    nameAr: string;
    code: string;
    icon: string;
    displayOrder: string;
    isActive: boolean;
    isDefault: boolean;
    requiresReferenceNumber: boolean;
    costSharingMode: string;
    costSharingScope: string;
    costSharingCommissionPercentage: string;
    costSharingRestaurantPercentage: string;
    costSharingCounterpartyPercentage: string;
}

function emptyForm(): PaymentMethodFormState {
    return {
        nameEn: "",
        nameAr: "",
        code: "",
        icon: "",
        displayOrder: "0",
        isActive: true,
        isDefault: false,
        requiresReferenceNumber: false,
        costSharingMode: String(COST_SHARING_MODE.RestaurantBearsAll),
        costSharingScope: String(COST_SHARING_SCOPE.PerPartnerOrCard),
        costSharingCommissionPercentage: "0",
        costSharingRestaurantPercentage: "100",
        costSharingCounterpartyPercentage: "0",
    };
}

export default function PaymentMethodsPage() {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const [methods, setMethods] = useState<PaymentMethodDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethodDto | null>(null);
    const [form, setForm] = useState<PaymentMethodFormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const failedLoadMessage = ar ? "تعذر تحميل طرق الدفع" : "Could not load payment methods";

    const text = {
        title: ar ? "طرق الدفع" : "Payment Methods",
        subtitle: ar ? "إدارة طرق الدفع التي تظهر للكاشير عند الدفع بالبطاقة" : "Manage the card payment providers shown in the POS payment popup",
        add: ar ? "طريقة دفع جديدة" : "New payment method",
        refresh: ar ? "تحديث" : "Refresh",
        nameEn: ar ? "الاسم بالإنجليزية" : "Name English",
        nameAr: ar ? "الاسم بالعربية" : "Name Arabic",
        code: ar ? "الكود" : "Code",
        icon: ar ? "أيقونة اختيارية" : "Optional icon",
        displayOrder: ar ? "ترتيب العرض" : "Display order",
        active: ar ? "فعالة" : "Active",
        inactive: ar ? "غير فعالة" : "Inactive",
        default: ar ? "افتراضية" : "Default",
        referenceRequired: ar ? "رقم المرجع مطلوب" : "Reference required",
        costSharing: ar ? "تقاسم التكلفة" : "Cost sharing",
        costSharingMode: ar ? "من يتحمل العمولة" : "Who bears the commission",
        costSharingScope: ar ? "نطاق التطبيق" : "Application scope",
        commissionPercentage: ar ? "نسبة العمولة %" : "Commission %",
        restaurantShare: ar ? "حصة المتجر %" : "Merchant share %",
        counterpartyShare: ar ? "حصة البطاقة %" : "Card share %",
        notDefault: ar ? "غير افتراضية" : "Not default",
        status: ar ? "الحالة" : "Status",
        actions: ar ? "إجراءات" : "Actions",
        empty: ar ? "لا توجد طرق دفع" : "No payment methods found",
        edit: ar ? "تعديل طريقة دفع" : "Edit payment method",
        create: ar ? "إنشاء طريقة دفع" : "Create payment method",
        save: ar ? "حفظ" : "Save",
        cancel: ar ? "إلغاء" : "Cancel",
        required: ar ? "هذا الحقل مطلوب" : "This field is required",
        invalidOrder: ar ? "أدخل رقمًا صحيحًا موجبًا" : "Enter a non-negative whole number",
        invalidPercentage: ar ? "أدخل نسبة من 0 إلى 100" : "Enter a percentage from 0 to 100",
        sharesMustTotal: ar ? "يجب أن يساوي مجموع الحصص 100%" : "Shares must total 100%",
        defaultRequiresActive: ar ? "الطريقة الافتراضية يجب أن تكون فعالة" : "Default method must be active",
        saved: ar ? "تم حفظ طريقة الدفع" : "Payment method saved",
        deleted: ar ? "تم حذف طريقة الدفع" : "Payment method deleted",
        failedLoad: failedLoadMessage,
        failedSave: ar ? "تعذر حفظ طريقة الدفع" : "Could not save payment method",
        failedDelete: ar ? "تعذر حذف طريقة الدفع" : "Could not delete payment method",
        confirmDelete: ar ? "حذف طريقة الدفع؟" : "Delete this payment method?",
        setDefault: ar ? "تعيين كافتراضية" : "Set default",
    };

    const loadMethods = async () => {
        setLoading(true);
        try {
            setMethods(await getPaymentMethods());
        } catch {
            toast.error(text.failedLoad);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let ignore = false;

        const loadInitialMethods = async () => {
            setLoading(true);
            try {
                const nextMethods = await getPaymentMethods();
                if (!ignore) setMethods(nextMethods);
            } catch {
                if (!ignore) toast.error(failedLoadMessage);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        void loadInitialMethods();
        return () => {
            ignore = true;
        };
    }, [failedLoadMessage]);

    const openCreateDialog = () => {
        setEditingMethod(null);
        setForm(emptyForm());
        setErrors({});
        setDialogOpen(true);
    };

    const openEditDialog = (method: PaymentMethodDto) => {
        setEditingMethod(method);
        setForm({
            nameEn: method.nameEn,
            nameAr: method.nameAr ?? "",
            code: method.code,
            icon: method.icon ?? "",
            displayOrder: String(method.displayOrder),
            isActive: method.isActive,
            isDefault: method.isDefault,
            requiresReferenceNumber: method.requiresReferenceNumber,
            costSharingMode: String(method.costSharingMode ?? COST_SHARING_MODE.RestaurantBearsAll),
            costSharingScope: String(method.costSharingScope ?? COST_SHARING_SCOPE.PerPartnerOrCard),
            costSharingCommissionPercentage: String(method.costSharingCommissionPercentage ?? 0),
            costSharingRestaurantPercentage: String(method.costSharingRestaurantPercentage ?? 100),
            costSharingCounterpartyPercentage: String(method.costSharingCounterpartyPercentage ?? 0),
        });
        setErrors({});
        setDialogOpen(true);
    };

    const updateField = (key: keyof PaymentMethodFormState) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            setForm((current) => ({ ...current, [key]: event.target.value }));
        };

    const isSharedCostSharing = Number(form.costSharingMode) === COST_SHARING_MODE.Shared;

    const validateForm = () => {
        const next: Record<string, string> = {};
        const displayOrder = Number(form.displayOrder);
        const commission = Number(form.costSharingCommissionPercentage);
        const restaurantShare = Number(form.costSharingRestaurantPercentage);
        const counterpartyShare = Number(form.costSharingCounterpartyPercentage);

        if (!form.nameEn.trim()) next.nameEn = text.required;
        if (!form.nameAr.trim()) next.nameAr = text.required;
        if (!form.code.trim()) next.code = text.required;
        if (!Number.isInteger(displayOrder) || displayOrder < 0) next.displayOrder = text.invalidOrder;
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
        if (form.isDefault && !form.isActive) next.isDefault = text.defaultRequiresActive;

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const toPayload = (): PaymentMethodPayload => {
        const mode = Number(form.costSharingMode) as CostSharingMode;
        const restaurantShare = mode === COST_SHARING_MODE.Shared
            ? Number(form.costSharingRestaurantPercentage)
            : mode === COST_SHARING_MODE.CounterpartyBearsAll ? 0 : 100;
        const counterpartyShare = mode === COST_SHARING_MODE.Shared
            ? Number(form.costSharingCounterpartyPercentage)
            : mode === COST_SHARING_MODE.CounterpartyBearsAll ? 100 : 0;

        return {
            nameEn: form.nameEn.trim(),
            nameAr: form.nameAr.trim(),
            code: form.code.trim(),
            icon: form.icon.trim() || null,
            displayOrder: Number(form.displayOrder),
            isActive: form.isActive,
            isDefault: form.isDefault,
            requiresReferenceNumber: form.requiresReferenceNumber,
            costSharingMode: mode,
            costSharingScope: Number(form.costSharingScope) as CostSharingScope,
            costSharingCommissionPercentage: Number(form.costSharingCommissionPercentage),
            costSharingRestaurantPercentage: restaurantShare,
            costSharingCounterpartyPercentage: counterpartyShare,
        };
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const payload = toPayload();
            if (editingMethod) {
                await updatePaymentMethod(editingMethod.id, payload);
            } else {
                await createPaymentMethod(payload);
            }
            toast.success(text.saved);
            setDialogOpen(false);
            await loadMethods();
        } catch {
            toast.error(text.failedSave);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (method: PaymentMethodDto) => {
        if (!confirm(text.confirmDelete)) return;
        try {
            await deletePaymentMethod(method.id);
            toast.success(text.deleted);
            await loadMethods();
        } catch {
            toast.error(text.failedDelete);
        }
    };

    const quickUpdate = async (method: PaymentMethodDto, patch: Partial<PaymentMethodPayload>) => {
        setSaving(true);
        try {
            await updatePaymentMethod(method.id, {
                nameEn: method.nameEn,
                nameAr: method.nameAr ?? "",
                code: method.code,
                icon: method.icon ?? null,
                displayOrder: method.displayOrder,
                isActive: method.isActive,
                isDefault: method.isDefault,
                requiresReferenceNumber: method.requiresReferenceNumber,
                costSharingMode: method.costSharingMode ?? COST_SHARING_MODE.RestaurantBearsAll,
                costSharingScope: method.costSharingScope ?? COST_SHARING_SCOPE.PerPartnerOrCard,
                costSharingCommissionPercentage: method.costSharingCommissionPercentage ?? 0,
                costSharingRestaurantPercentage: method.costSharingRestaurantPercentage ?? 100,
                costSharingCounterpartyPercentage: method.costSharingCounterpartyPercentage ?? 0,
                ...patch,
            });
            toast.success(text.saved);
            await loadMethods();
        } catch {
            toast.error(text.failedSave);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = (method: PaymentMethodDto) => {
        const nextActive = !method.isActive;
        void quickUpdate(method, {
            isActive: nextActive,
            isDefault: nextActive ? method.isDefault : false,
        });
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                        <CreditCard className="h-6 w-6 text-primary" />
                        {text.title}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{text.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => void loadMethods()} disabled={loading}>
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
                <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{text.displayOrder}</TableHead>
                                    <TableHead>{text.code}</TableHead>
                                    <TableHead>{text.nameEn}</TableHead>
                                    <TableHead>{text.nameAr}</TableHead>
                                    <TableHead>{text.status}</TableHead>
                                    <TableHead>{text.referenceRequired}</TableHead>
                                    <TableHead>{text.costSharing}</TableHead>
                                    <TableHead>{text.default}</TableHead>
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
                                ) : methods.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                                            {text.empty}
                                        </TableCell>
                                    </TableRow>
                                ) : methods.map((method) => (
                                    <TableRow key={method.id}>
                                        <TableCell className="font-mono text-xs">{method.displayOrder}</TableCell>
                                        <TableCell className="font-mono text-xs">{method.code}</TableCell>
                                        <TableCell className="font-medium">{method.nameEn}</TableCell>
                                        <TableCell>{method.nameAr || "—"}</TableCell>
                                        <TableCell>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => toggleActive(method)}
                                            >
                                                <Badge variant={method.isActive ? "default" : "secondary"}>
                                                    {method.isActive ? text.active : text.inactive}
                                                </Badge>
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={method.requiresReferenceNumber}
                                                disabled={saving}
                                                onCheckedChange={(checked) => void quickUpdate(method, { requiresReferenceNumber: checked })}
                                            />
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600">
                                            {formatCostSharingSummary(method, ar)}
                                        </TableCell>
                                        <TableCell>
                                            {method.isDefault ? (
                                                <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                                    <Star className="h-3 w-3 fill-current" />
                                                    {text.default}
                                                </Badge>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={saving || !method.isActive}
                                                    onClick={() => void quickUpdate(method, { isDefault: true, isActive: true })}
                                                >
                                                    {text.setDefault}
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(method)} title={text.edit}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void handleDelete(method)} title={text.failedDelete}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingMethod ? text.edit : text.create}</DialogTitle>
                        <DialogDescription>
                            {editingMethod ? getPaymentMethodName(editingMethod, locale) : text.subtitle}
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
                            <Input value={form.code} onChange={updateField("code")} maxLength={60} className="font-mono uppercase" />
                        </Field>
                        <Field label={text.icon}>
                            <Input value={form.icon} onChange={updateField("icon")} maxLength={120} />
                        </Field>
                        <Field label={text.displayOrder} error={errors.displayOrder}>
                            <Input type="number" min={0} step={1} value={form.displayOrder} onChange={updateField("displayOrder")} />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ToggleField label={text.status} value={form.isActive} onChange={(checked) => setForm((current) => ({ ...current, isActive: checked, isDefault: checked ? current.isDefault : false }))} />
                            <ToggleField label={text.default} value={form.isDefault} onChange={(checked) => setForm((current) => ({ ...current, isDefault: checked, isActive: checked ? true : current.isActive }))} />
                        </div>
                        <div className="sm:col-span-2">
                            <ToggleField
                                label={text.referenceRequired}
                                value={form.requiresReferenceNumber}
                                onChange={(checked) => setForm((current) => ({ ...current, requiresReferenceNumber: checked }))}
                            />
                        </div>
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
                        {errors.isDefault ? (
                            <p className="sm:col-span-2 text-xs font-medium text-destructive">{errors.isDefault}</p>
                        ) : null}
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

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (checked: boolean) => void }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
            <Label>{label}</Label>
            <Switch checked={value} onCheckedChange={onChange} />
        </div>
    );
}
