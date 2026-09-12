"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import {
    EarningRuleType,
    PointsApprovalMode,
    PointsExpirationMode,
    earningRulesApi,
    type EarningRule,
    type EarningRuleUpsert,
} from "@/lib/api-marketing";

const RULE_TYPE_LABELS: Record<EarningRuleType, [string, string]> = {
    [EarningRuleType.FixedPerOrder]: ["Fixed per order", "ثابت لكل طلب"],
    [EarningRuleType.PerAmount]: ["Per amount", "حسب المبلغ"],
    [EarningRuleType.PerCategory]: ["Per category", "حسب الفئة"],
    [EarningRuleType.PerProduct]: ["Per product", "حسب المنتج"],
    [EarningRuleType.ChannelBonus]: ["Channel bonus", "مكافأة القناة"],
    [EarningRuleType.FirstOrder]: ["First order", "أول طلب"],
    [EarningRuleType.Birthday]: ["Birthday", "عيد الميلاد"],
    [EarningRuleType.Campaign]: ["Campaign", "حملة"],
};

const emptyForm = (): EarningRuleUpsert => ({
    name: "",
    nameAr: "",
    ruleType: EarningRuleType.PerAmount,
    pointsValue: null,
    pointsPerCurrencyUnit: null,
    multiplier: null,
    targetCategoryId: null,
    targetProductId: null,
    channelScope: null,
    approvalMode: PointsApprovalMode.Immediate,
    approvalDelayDays: null,
    expirationMode: PointsExpirationMode.Never,
    expirationValue: null,
    priority: 100,
    branchId: null,
    isActive: true,
});

export default function MarketingRulesPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [rules, setRules] = useState<EarningRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<EarningRule | null>(null);
    const [form, setForm] = useState<EarningRuleUpsert>(emptyForm());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(false);
            try {
                const data = await earningRulesApi.list(includeInactive);
                if (!cancelled) setRules(data);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [includeInactive, reloadKey]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setDialogOpen(true);
    };

    const openEdit = (rule: EarningRule) => {
        setEditing(rule);
        setForm({
            name: rule.name,
            nameAr: rule.nameAr ?? "",
            ruleType: rule.ruleType,
            pointsValue: rule.pointsValue ?? null,
            pointsPerCurrencyUnit: rule.pointsPerCurrencyUnit ?? null,
            multiplier: rule.multiplier ?? null,
            targetCategoryId: rule.targetCategoryId ?? null,
            targetProductId: rule.targetProductId ?? null,
            channelScope: rule.channelScope ?? null,
            approvalMode: rule.approvalMode,
            approvalDelayDays: rule.approvalDelayDays ?? null,
            expirationMode: rule.expirationMode,
            expirationValue: rule.expirationValue ?? null,
            priority: rule.priority,
            branchId: rule.branchId ?? null,
            isActive: rule.isActive,
        });
        setDialogOpen(true);
    };

    const submit = async () => {
        if (!form.name.trim()) {
            toast.error(t("Name is required.", "الاسم مطلوب."));
            return;
        }
        setSubmitting(true);
        try {
            if (editing) {
                await earningRulesApi.update(editing.ruleGroupId, form);
                toast.success(t("Rule updated (new version)", "تم تحديث القاعدة (نسخة جديدة)"));
            } else {
                await earningRulesApi.create(form);
                toast.success(t("Rule created", "تم إنشاء القاعدة"));
            }
            setDialogOpen(false);
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Save failed", "فشل الحفظ"));
        } finally {
            setSubmitting(false);
        }
    };

    const deactivate = async (rule: EarningRule) => {
        try {
            await earningRulesApi.deactivate(rule.ruleGroupId);
            toast.success(t("Rule deactivated", "تم تعطيل القاعدة"));
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Action failed", "فشل الإجراء"));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("Earning Rules", "قواعد الكسب")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("Editing a rule creates a new version; history is preserved.", "تعديل القاعدة يُنشئ نسخة جديدة؛ يُحفظ السجل.")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                        {t("Show inactive", "إظهار غير النشطة")}
                    </label>
                    <Button onClick={openCreate}>
                        <Plus className="me-2 h-4 w-4" />
                        {t("New rule", "قاعدة جديدة")}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <p className="py-12 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <p className="mb-4 text-muted-foreground">{t("Failed to load rules.", "تعذّر تحميل القواعد.")}</p>
                            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                                <RefreshCw className="me-2 h-4 w-4" />
                                {t("Retry", "إعادة المحاولة")}
                            </Button>
                        </div>
                    ) : rules.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">{t("No earning rules yet.", "لا توجد قواعد كسب.")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Name", "الاسم")}</TableHead>
                                    <TableHead>{t("Type", "النوع")}</TableHead>
                                    <TableHead className="text-end">{t("Value", "القيمة")}</TableHead>
                                    <TableHead className="text-end">{t("Priority", "الأولوية")}</TableHead>
                                    <TableHead>{t("Version", "النسخة")}</TableHead>
                                    <TableHead>{t("Status", "الحالة")}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rules.map((rule) => (
                                    <TableRow key={rule.id}>
                                        <TableCell className="font-medium">{isRtl ? rule.nameAr || rule.name : rule.name}</TableCell>
                                        <TableCell>{t(...RULE_TYPE_LABELS[rule.ruleType])}</TableCell>
                                        <TableCell className="text-end">{ruleValue(rule)}</TableCell>
                                        <TableCell className="text-end">{rule.priority}</TableCell>
                                        <TableCell>v{rule.ruleVersion}</TableCell>
                                        <TableCell>
                                            {rule.isActive ? (
                                                <Badge variant="default">{t("Active", "نشطة")}</Badge>
                                            ) : (
                                                <Badge variant="secondary">{t("Inactive", "غير نشطة")}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {rule.isActive && (
                                                    <Button variant="ghost" size="icon" onClick={() => deactivate(rule)}>
                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? t("Edit rule", "تعديل القاعدة") : t("New rule", "قاعدة جديدة")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t("Name (EN)", "الاسم (إنجليزي)")} className="sm:col-span-2">
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </Field>
                        <Field label={t("Name (AR)", "الاسم (عربي)")} className="sm:col-span-2">
                            <Input value={form.nameAr ?? ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
                        </Field>
                        <Field label={t("Rule type", "نوع القاعدة")}>
                            <Select
                                value={String(form.ruleType)}
                                onValueChange={(v) => setForm({ ...form, ruleType: Number(v) as EarningRuleType })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(EarningRuleType)
                                        .filter((v) => typeof v === "number")
                                        .map((v) => (
                                            <SelectItem key={v} value={String(v)}>
                                                {t(...RULE_TYPE_LABELS[v as EarningRuleType])}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={t("Priority", "الأولوية")}>
                            <Input
                                type="number"
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                            />
                        </Field>

                        {form.ruleType === EarningRuleType.PerAmount && (
                            <Field label={t("Points per currency unit", "نقاط لكل وحدة عملة")} className="sm:col-span-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.pointsPerCurrencyUnit ?? ""}
                                    onChange={(e) =>
                                        setForm({ ...form, pointsPerCurrencyUnit: e.target.value === "" ? null : Number(e.target.value) })
                                    }
                                />
                            </Field>
                        )}
                        {(form.ruleType === EarningRuleType.FixedPerOrder ||
                            form.ruleType === EarningRuleType.FirstOrder ||
                            form.ruleType === EarningRuleType.Birthday) && (
                            <Field label={t("Points value", "قيمة النقاط")} className="sm:col-span-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.pointsValue ?? ""}
                                    onChange={(e) => setForm({ ...form, pointsValue: e.target.value === "" ? null : Number(e.target.value) })}
                                />
                            </Field>
                        )}

                        <Field label={t("Approval mode", "نمط الاعتماد")}>
                            <Select
                                value={String(form.approvalMode)}
                                onValueChange={(v) => setForm({ ...form, approvalMode: Number(v) as PointsApprovalMode })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(PointsApprovalMode.Immediate)}>{t("Immediate", "فوري")}</SelectItem>
                                    <SelectItem value={String(PointsApprovalMode.OnOrderCompleted)}>{t("On completed", "عند الاكتمال")}</SelectItem>
                                    <SelectItem value={String(PointsApprovalMode.OnPaymentConfirmed)}>{t("On payment", "عند الدفع")}</SelectItem>
                                    <SelectItem value={String(PointsApprovalMode.Delayed)}>{t("Delayed", "مؤجل")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        {form.approvalMode === PointsApprovalMode.Delayed && (
                            <Field label={t("Delay (days)", "التأخير (أيام)")}>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.approvalDelayDays ?? ""}
                                    onChange={(e) => setForm({ ...form, approvalDelayDays: e.target.value === "" ? null : Number(e.target.value) })}
                                />
                            </Field>
                        )}

                        <Field label={t("Expiration mode", "نمط الانتهاء")}>
                            <Select
                                value={String(form.expirationMode)}
                                onValueChange={(v) => setForm({ ...form, expirationMode: Number(v) as PointsExpirationMode })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(PointsExpirationMode.Never)}>{t("Never", "أبدًا")}</SelectItem>
                                    <SelectItem value={String(PointsExpirationMode.Days)}>{t("Days", "أيام")}</SelectItem>
                                    <SelectItem value={String(PointsExpirationMode.Months)}>{t("Months", "أشهر")}</SelectItem>
                                    <SelectItem value={String(PointsExpirationMode.Years)}>{t("Years", "سنوات")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        {form.expirationMode !== PointsExpirationMode.Never && (
                            <Field label={t("Expiration value", "قيمة الانتهاء")}>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.expirationValue ?? ""}
                                    onChange={(e) => setForm({ ...form, expirationValue: e.target.value === "" ? null : Number(e.target.value) })}
                                />
                            </Field>
                        )}

                        <label className="flex items-center gap-2 text-sm sm:col-span-2">
                            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                            {t("Active", "نشطة")}
                        </label>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                            {t("Cancel", "إلغاء")}
                        </Button>
                        <Button onClick={submit} disabled={submitting}>
                            {t("Save", "حفظ")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ruleValue(rule: EarningRule): string {
    if (rule.ruleType === EarningRuleType.PerAmount && rule.pointsPerCurrencyUnit != null)
        return `${rule.pointsPerCurrencyUnit} / unit`;
    if (rule.pointsValue != null) return String(rule.pointsValue);
    if (rule.multiplier != null) return `×${rule.multiplier}`;
    return "—";
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
    return (
        <div className={`space-y-1.5 ${className ?? ""}`}>
            <Label>{label}</Label>
            {children}
        </div>
    );
}
