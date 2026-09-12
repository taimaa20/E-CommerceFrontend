"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgePercent, Edit, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import { useSettingsStore } from "@/store/settingsStore";
import { formatCurrency } from "@/lib/currencies";
import { discountGroupsApi, DiscountValueType, type DiscountGroup, type DiscountGroupUpsert } from "@/lib/api-discount-groups";

interface FormState {
    name: string;
    nameAr: string;
    discountType: DiscountValueType;
    discountValue: string;
    isActive: boolean;
    description: string;
    verificationNote: string;
}

const emptyForm: FormState = {
    name: "",
    nameAr: "",
    discountType: DiscountValueType.Percentage,
    discountValue: "0",
    isActive: true,
    description: "",
    verificationNote: "",
};

export default function DiscountGroupsPage() {
    const { t, isRtl } = useLocale();
    const currency = useSettingsStore((state) => state.settings.currency);
    const [groups, setGroups] = useState<DiscountGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(false);
        try {
            setGroups(await discountGroupsApi.list());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (group: DiscountGroup) => {
        setEditingId(group.id);
        setForm({
            name: group.name,
            nameAr: group.nameAr ?? "",
            discountType: group.discountType,
            discountValue: String(group.discountValue),
            isActive: group.isActive,
            description: group.description ?? "",
            verificationNote: group.verificationNote ?? "",
        });
        setDialogOpen(true);
    };

    const save = async () => {
        const name = form.name.trim();
        if (!name) {
            toast.error(t("discountGroupNameLabel"));
            return;
        }
        const raw = Math.max(0, Number(form.discountValue) || 0);
        // Percentage is bounded 0–100; a flat amount only needs to be non-negative.
        const value = form.discountType === DiscountValueType.Percentage ? Math.min(100, raw) : raw;
        const payload: DiscountGroupUpsert = {
            name,
            nameAr: form.nameAr.trim() || null,
            discountType: form.discountType,
            discountValue: value,
            isActive: form.isActive,
            description: form.description.trim() || null,
            verificationNote: form.verificationNote.trim() || null,
        };
        setSaving(true);
        try {
            if (editingId) {
                await discountGroupsApi.update(editingId, payload);
            } else {
                await discountGroupsApi.create(payload);
            }
            toast.success(t("discountGroupSaved"));
            setDialogOpen(false);
            await load();
        } catch {
            toast.error(t("discountGroupSaveFailed"));
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (group: DiscountGroup) => {
        try {
            await discountGroupsApi.setActive(group.id, !group.isActive);
            await load();
        } catch {
            toast.error(t("discountGroupSaveFailed"));
        }
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <BadgePercent className="size-6" />
                        {t("discountGroupsTitle")}
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("discountGroupsDesc")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void load()}>
                        <RefreshCw className="size-4" />
                    </Button>
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="size-4" />
                        {t("discountGroupNew")}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t("discountGroupsTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">…</p>
                    ) : error ? (
                        <p className="py-8 text-center text-sm text-destructive">{t("discountGroupSaveFailed")}</p>
                    ) : groups.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">{t("discountGroupsEmpty")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("discountGroupNameLabel")}</TableHead>
                                    <TableHead>{t("discountGroupValueLabel")}</TableHead>
                                    <TableHead>{t("discountGroupActiveLabel")}</TableHead>
                                    <TableHead className="text-end">{t("discountGroupEdit")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groups.map((g) => (
                                    <TableRow key={g.id}>
                                        <TableCell className="font-medium">
                                            {isRtl && g.nameAr ? g.nameAr : g.name}
                                            {g.verificationNote && (
                                                <span className="block text-xs text-muted-foreground">{g.verificationNote}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {g.discountType === DiscountValueType.FixedAmount
                                                ? formatCurrency(g.discountValue, currency)
                                                : `${g.discountValue}%`}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch checked={g.isActive} onCheckedChange={() => void toggleActive(g)} />
                                                <Badge variant={g.isActive ? "default" : "secondary"}>
                                                    {g.isActive ? t("discountGroupActiveLabel") : t("discountGroupInactiveLabel")}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>
                                                <Edit className="size-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? t("discountGroupEdit") : t("discountGroupNew")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t("discountGroupNameLabel")}</Label>
                            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("discountGroupNameArLabel")}</Label>
                            <Input dir="rtl" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>{t("discountGroupTypeLabel")}</Label>
                                <Select
                                    value={String(form.discountType)}
                                    onValueChange={(v) => setForm((f) => ({ ...f, discountType: Number(v) as DiscountValueType }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={String(DiscountValueType.Percentage)}>{t("discountGroupTypePercentage")}</SelectItem>
                                        <SelectItem value={String(DiscountValueType.FixedAmount)}>{t("discountGroupTypeFixed")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>
                                    {form.discountType === DiscountValueType.FixedAmount
                                        ? `${t("discountGroupValueLabel")} (${currency})`
                                        : t("discountGroupPercentageLabel")}
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={form.discountType === DiscountValueType.Percentage ? 100 : undefined}
                                    step={0.5}
                                    value={form.discountValue}
                                    onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("discountGroupVerificationLabel")}</Label>
                            <Input
                                value={form.verificationNote}
                                placeholder={t("discountGroupVerificationPlaceholder")}
                                onChange={(e) => setForm((f) => ({ ...f, verificationNote: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("discountGroupDescriptionLabel")}</Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                            <Label>{t("discountGroupActiveLabel")}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
                        <Button onClick={save} disabled={saving}>{t("save")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
