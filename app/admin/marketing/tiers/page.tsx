"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
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
    LegacyTier,
    TierBenefitType,
    tiersApi,
    type LoyaltyTier,
    type LoyaltyTierUpsert,
    type TierBenefitUpsert,
} from "@/lib/api-marketing";

const LEGACY_TIER_LABELS: Record<LegacyTier, [string, string]> = {
    [LegacyTier.Standard]: ["Standard", "عادي"],
    [LegacyTier.Bronze]: ["Bronze", "برونزي"],
    [LegacyTier.Silver]: ["Silver", "فضي"],
    [LegacyTier.Gold]: ["Gold", "ذهبي"],
    [LegacyTier.VIP]: ["VIP", "مميز"],
};

const BENEFIT_TYPE_LABELS: Record<TierBenefitType, [string, string]> = {
    [TierBenefitType.Multiplier]: ["Multiplier", "مضاعف"],
    [TierBenefitType.FreeDelivery]: ["Free delivery", "توصيل مجاني"],
    [TierBenefitType.ExclusiveReward]: ["Exclusive reward", "مكافأة حصرية"],
    [TierBenefitType.DiscountPercentage]: ["Discount %", "نسبة خصم"],
    [TierBenefitType.Custom]: ["Custom", "مخصص"],
};

const emptyForm = (): LoyaltyTierUpsert => ({
    name: "",
    nameAr: "",
    legacyTierEnum: LegacyTier.Standard,
    minPoints: 0,
    minSpend: 0,
    earnMultiplier: 1,
    sortOrder: 0,
    isActive: true,
    benefits: [],
});

export default function MarketingTiersPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<LoyaltyTier | null>(null);
    const [form, setForm] = useState<LoyaltyTierUpsert>(emptyForm());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(false);
            try {
                const data = await tiersApi.list(includeInactive);
                if (!cancelled) setTiers(data);
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

    const openEdit = (tier: LoyaltyTier) => {
        setEditing(tier);
        setForm({
            name: tier.name,
            nameAr: tier.nameAr ?? "",
            legacyTierEnum: tier.legacyTierEnum,
            minPoints: tier.minPoints,
            minSpend: tier.minSpend,
            earnMultiplier: tier.earnMultiplier,
            sortOrder: tier.sortOrder,
            isActive: tier.isActive,
            benefits: tier.benefits.map((b) => ({
                benefitType: b.benefitType,
                value: b.value ?? null,
                refId: b.refId ?? null,
                description: b.description ?? null,
                descriptionAr: b.descriptionAr ?? null,
            })),
        });
        setDialogOpen(true);
    };

    const addBenefit = () =>
        setForm((f) => ({
            ...f,
            benefits: [...f.benefits, { benefitType: TierBenefitType.Multiplier, value: null, description: "", descriptionAr: "" }],
        }));

    const patchBenefit = (idx: number, patch: Partial<TierBenefitUpsert>) =>
        setForm((f) => ({
            ...f,
            benefits: f.benefits.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
        }));

    const removeBenefit = (idx: number) =>
        setForm((f) => ({ ...f, benefits: f.benefits.filter((_, i) => i !== idx) }));

    const submit = async () => {
        if (!form.name.trim()) {
            toast.error(t("Name is required.", "الاسم مطلوب."));
            return;
        }
        setSubmitting(true);
        try {
            if (editing) {
                await tiersApi.update(editing.id, form);
                toast.success(t("Tier updated", "تم تحديث المستوى"));
            } else {
                await tiersApi.create(form);
                toast.success(t("Tier created", "تم إنشاء المستوى"));
            }
            setDialogOpen(false);
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Save failed", "فشل الحفظ"));
        } finally {
            setSubmitting(false);
        }
    };

    const deactivate = async (tier: LoyaltyTier) => {
        try {
            await tiersApi.deactivate(tier.id);
            toast.success(t("Tier deactivated", "تم تعطيل المستوى"));
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Action failed", "فشل الإجراء"));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("Loyalty Tiers", "مستويات الولاء")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("Editing tiers does not recalculate existing customers.", "تعديل المستويات لا يعيد احتساب العملاء الحاليين.")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                        {t("Show inactive", "إظهار غير النشطة")}
                    </label>
                    <Button onClick={openCreate}>
                        <Plus className="me-2 h-4 w-4" />
                        {t("New tier", "مستوى جديد")}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <p className="py-12 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <p className="mb-4 text-muted-foreground">{t("Failed to load tiers.", "تعذّر تحميل المستويات.")}</p>
                            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                                <RefreshCw className="me-2 h-4 w-4" />
                                {t("Retry", "إعادة المحاولة")}
                            </Button>
                        </div>
                    ) : tiers.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">{t("No tiers yet.", "لا توجد مستويات.")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Name", "الاسم")}</TableHead>
                                    <TableHead>{t("Legacy tier", "المستوى القديم")}</TableHead>
                                    <TableHead className="text-end">{t("Min points", "أدنى نقاط")}</TableHead>
                                    <TableHead className="text-end">{t("Min spend", "أدنى إنفاق")}</TableHead>
                                    <TableHead className="text-end">{t("Multiplier", "المضاعف")}</TableHead>
                                    <TableHead className="text-end">{t("Benefits", "المزايا")}</TableHead>
                                    <TableHead>{t("Status", "الحالة")}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tiers.map((tier) => (
                                    <TableRow key={tier.id}>
                                        <TableCell className="font-medium">{isRtl ? tier.nameAr || tier.name : tier.name}</TableCell>
                                        <TableCell>{t(...LEGACY_TIER_LABELS[tier.legacyTierEnum])}</TableCell>
                                        <TableCell className="text-end">{tier.minPoints.toLocaleString()}</TableCell>
                                        <TableCell className="text-end">{tier.minSpend.toLocaleString()}</TableCell>
                                        <TableCell className="text-end">×{tier.earnMultiplier}</TableCell>
                                        <TableCell className="text-end">{tier.benefits.length}</TableCell>
                                        <TableCell>
                                            {tier.isActive ? (
                                                <Badge variant="default">{t("Active", "نشط")}</Badge>
                                            ) : (
                                                <Badge variant="secondary">{t("Inactive", "غير نشط")}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(tier)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {tier.isActive && (
                                                    <Button variant="ghost" size="icon" onClick={() => deactivate(tier)}>
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
                        <DialogTitle>{editing ? t("Edit tier", "تعديل المستوى") : t("New tier", "مستوى جديد")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t("Name (EN)", "الاسم (إنجليزي)")}>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </Field>
                        <Field label={t("Name (AR)", "الاسم (عربي)")}>
                            <Input value={form.nameAr ?? ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
                        </Field>
                        <Field label={t("Legacy tier mapping", "ربط المستوى القديم")}>
                            <Select
                                value={String(form.legacyTierEnum)}
                                onValueChange={(v) => setForm({ ...form, legacyTierEnum: Number(v) as LegacyTier })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(LegacyTier)
                                        .filter((v) => typeof v === "number")
                                        .map((v) => (
                                            <SelectItem key={v} value={String(v)}>
                                                {t(...LEGACY_TIER_LABELS[v as LegacyTier])}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={t("Sort order", "ترتيب العرض")}>
                            <Input
                                type="number"
                                value={form.sortOrder}
                                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                            />
                        </Field>
                        <Field label={t("Min points", "أدنى نقاط")}>
                            <Input
                                type="number"
                                min={0}
                                value={form.minPoints}
                                onChange={(e) => setForm({ ...form, minPoints: Number(e.target.value) })}
                            />
                        </Field>
                        <Field label={t("Min spend", "أدنى إنفاق")}>
                            <Input
                                type="number"
                                min={0}
                                value={form.minSpend}
                                onChange={(e) => setForm({ ...form, minSpend: Number(e.target.value) })}
                            />
                        </Field>
                        <Field label={t("Earn multiplier", "مضاعف الكسب")}>
                            <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={form.earnMultiplier}
                                onChange={(e) => setForm({ ...form, earnMultiplier: Number(e.target.value) })}
                            />
                        </Field>
                        <label className="flex items-center gap-2 text-sm">
                            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                            {t("Active", "نشط")}
                        </label>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>{t("Benefits", "المزايا")}</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                                <Plus className="me-1 h-3.5 w-3.5" />
                                {t("Add", "إضافة")}
                            </Button>
                        </div>
                        {form.benefits.length === 0 && (
                            <p className="text-xs text-muted-foreground">{t("No benefits configured.", "لا توجد مزايا.")}</p>
                        )}
                        {form.benefits.map((b, idx) => (
                            <div key={idx} className="space-y-1 rounded-lg border p-2">
                                <div className="flex items-end gap-2">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs">{t("Type", "النوع")}</Label>
                                        <Select
                                            value={String(b.benefitType)}
                                            onValueChange={(v) => patchBenefit(idx, { benefitType: Number(v) as TierBenefitType })}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.values(TierBenefitType)
                                                    .filter((v) => typeof v === "number")
                                                    .map((v) => (
                                                        <SelectItem key={v} value={String(v)}>
                                                            {t(...BENEFIT_TYPE_LABELS[v as TierBenefitType])}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs">{t("Value", "القيمة")}</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={b.value ?? ""}
                                            onChange={(e) => patchBenefit(idx, { value: e.target.value === "" ? null : Number(e.target.value) })}
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeBenefit(idx)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                {b.benefitType !== TierBenefitType.Multiplier && (
                                    <p className="text-xs text-amber-600">
                                        {t("Configured · not yet enforced", "مُهيّأة · غير مُطبّقة بعد")}
                                    </p>
                                )}
                            </div>
                        ))}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
        </div>
    );
}
