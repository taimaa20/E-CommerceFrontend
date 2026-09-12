"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Pause, Pencil, Play, Plus, RefreshCw, Archive, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import {
    CampaignStatus,
    CampaignType,
    CampaignTargetType,
    PointsExpirationMode,
    campaignsApi,
    segmentsApi,
    tiersApi,
    marketingWalletApi,
    type Campaign,
    type CampaignUpsert,
    type Segment,
    type LoyaltyTier,
    type WalletSearchItem,
} from "@/lib/api-marketing";

const TYPE_LABELS: Record<CampaignType, [string, string]> = {
    [CampaignType.BonusPoints]: ["Bonus points", "نقاط إضافية"],
    [CampaignType.Multiplier]: ["Multiplier", "مضاعف"],
    [CampaignType.FixedReward]: ["Fixed reward", "مكافأة ثابتة"],
};

const STATUS_META: Record<CampaignStatus, { en: string; ar: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    [CampaignStatus.Draft]: { en: "Draft", ar: "مسودة", variant: "secondary" },
    [CampaignStatus.Scheduled]: { en: "Scheduled", ar: "مجدولة", variant: "outline" },
    [CampaignStatus.Active]: { en: "Active", ar: "نشطة", variant: "default" },
    [CampaignStatus.Paused]: { en: "Paused", ar: "موقوفة", variant: "secondary" },
    [CampaignStatus.Expired]: { en: "Expired", ar: "منتهية", variant: "destructive" },
    [CampaignStatus.Archived]: { en: "Archived", ar: "مؤرشفة", variant: "secondary" },
};

const toInput = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromInput = (local: string) => (local ? new Date(local).toISOString() : new Date().toISOString());

const emptyForm = (): CampaignUpsert => ({
    name: "",
    nameAr: "",
    description: "",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 864e5).toISOString(),
    priority: 0,
    isActive: true,
    type: CampaignType.BonusPoints,
    targetType: CampaignTargetType.All,
    targetSegmentId: null,
    targetTierId: null,
    bonusPoints: null,
    spendThreshold: null,
    multiplier: null,
    pointsPerCurrencyUnit: null,
    orderCountThreshold: null,
    expirationMode: PointsExpirationMode.Never,
    expirationValue: null,
    targetCustomerIds: [],
});

export default function CampaignsPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [includeArchived, setIncludeArchived] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [segments, setSegments] = useState<Segment[]>([]);
    const [tiers, setTiers] = useState<LoyaltyTier[]>([]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Campaign | null>(null);
    const [form, setForm] = useState<CampaignUpsert>(emptyForm());
    const [submitting, setSubmitting] = useState(false);

    // customer-list targeting helpers
    const [custTerm, setCustTerm] = useState("");
    const [custResults, setCustResults] = useState<WalletSearchItem[]>([]);
    const [custNames, setCustNames] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(false);
            try {
                const data = await campaignsApi.list(includeArchived);
                if (!cancelled) setCampaigns(data);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [includeArchived, reloadKey]);

    const ensureLookups = async () => {
        if (segments.length === 0) { try { setSegments(await segmentsApi.list(false)); } catch { /* ignore */ } }
        if (tiers.length === 0) { try { setTiers(await tiersApi.list(false)); } catch { /* ignore */ } }
    };

    const openCreate = async () => { await ensureLookups(); setEditing(null); setForm(emptyForm()); setCustNames({}); setDialogOpen(true); };
    const openEdit = async (c: Campaign) => {
        await ensureLookups();
        setEditing(c);
        setForm({
            name: c.name, nameAr: c.nameAr ?? "", description: c.description ?? "", descriptionAr: c.descriptionAr ?? "",
            startDate: c.startDate, endDate: c.endDate, priority: c.priority, isActive: c.isActive,
            type: c.type, targetType: c.targetType, targetSegmentId: c.targetSegmentId ?? null, targetTierId: c.targetTierId ?? null,
            bonusPoints: c.bonusPoints ?? null, spendThreshold: c.spendThreshold ?? null, multiplier: c.multiplier ?? null,
            pointsPerCurrencyUnit: c.pointsPerCurrencyUnit ?? null, orderCountThreshold: c.orderCountThreshold ?? null,
            expirationMode: c.expirationMode, expirationValue: c.expirationValue ?? null, targetCustomerIds: [...c.targetCustomerIds],
        });
        setCustNames({});
        setDialogOpen(true);
    };

    const submit = async () => {
        if (!form.name.trim()) { toast.error(t("Name is required.", "الاسم مطلوب.")); return; }
        setSubmitting(true);
        try {
            if (editing) await campaignsApi.update(editing.id, form);
            else await campaignsApi.create(form);
            toast.success(t("Campaign saved", "تم حفظ الحملة"));
            setDialogOpen(false);
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Save failed", "فشل الحفظ"));
        } finally {
            setSubmitting(false);
        }
    };

    const changeStatus = async (c: Campaign, status: CampaignStatus) => {
        try {
            await campaignsApi.changeStatus(c.id, status);
            toast.success(t("Status updated", "تم تحديث الحالة"));
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Action failed", "فشل الإجراء"));
        }
    };

    const searchCustomers = async () => {
        try { setCustResults((await marketingWalletApi.search(custTerm.trim(), 1, 6)).items); } catch { setCustResults([]); }
    };
    const addCustomer = (c: WalletSearchItem) => {
        if (!form.targetCustomerIds.includes(c.customerId))
            setForm((f) => ({ ...f, targetCustomerIds: [...f.targetCustomerIds, c.customerId] }));
        setCustNames((n) => ({ ...n, [c.customerId]: c.name }));
        setCustResults([]); setCustTerm("");
    };
    const removeCustomer = (id: string) =>
        setForm((f) => ({ ...f, targetCustomerIds: f.targetCustomerIds.filter((x) => x !== id) }));

    const statusActions = (c: Campaign) => {
        const A = (status: CampaignStatus, icon: React.ReactNode, label: string) => (
            <Button key={label} variant="ghost" size="icon" title={label} onClick={() => changeStatus(c, status)}>{icon}</Button>
        );
        switch (c.status) {
            case CampaignStatus.Draft:
                return [A(CampaignStatus.Active, <Play className="h-4 w-4" />, t("Activate", "تفعيل")), A(CampaignStatus.Archived, <Archive className="h-4 w-4" />, t("Archive", "أرشفة"))];
            case CampaignStatus.Scheduled:
                return [A(CampaignStatus.Active, <Play className="h-4 w-4" />, t("Activate", "تفعيل")), A(CampaignStatus.Paused, <Pause className="h-4 w-4" />, t("Pause", "إيقاف")), A(CampaignStatus.Archived, <Archive className="h-4 w-4" />, t("Archive", "أرشفة"))];
            case CampaignStatus.Active:
                return [A(CampaignStatus.Paused, <Pause className="h-4 w-4" />, t("Pause", "إيقاف")), A(CampaignStatus.Archived, <Archive className="h-4 w-4" />, t("Archive", "أرشفة"))];
            case CampaignStatus.Paused:
                return [A(CampaignStatus.Active, <Play className="h-4 w-4" />, t("Resume", "استئناف")), A(CampaignStatus.Archived, <Archive className="h-4 w-4" />, t("Archive", "أرشفة"))];
            case CampaignStatus.Expired:
                return [A(CampaignStatus.Archived, <Archive className="h-4 w-4" />, t("Archive", "أرشفة"))];
            default:
                return [];
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("Campaigns", "الحملات")}</h1>
                    <p className="text-sm text-muted-foreground">{t("Bonus, multiplier and fixed-reward promotions on top of loyalty earning.", "حملات نقاط إضافية ومضاعفات ومكافآت ثابتة فوق نظام الولاء.")}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/ntxadminpos/marketing/campaigns/dashboard">
                        <Button variant="outline"><BarChart3 className="me-2 h-4 w-4" />{t("Dashboard", "اللوحة")}</Button>
                    </Link>
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} />
                        {t("Show archived", "إظهار المؤرشفة")}
                    </label>
                    <Button onClick={openCreate}><Plus className="me-2 h-4 w-4" />{t("New campaign", "حملة جديدة")}</Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <p className="py-12 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <p className="mb-4 text-muted-foreground">{t("Failed to load campaigns.", "تعذّر تحميل الحملات.")}</p>
                            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw className="me-2 h-4 w-4" />{t("Retry", "إعادة المحاولة")}</Button>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">{t("No campaigns yet.", "لا توجد حملات.")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Name", "الاسم")}</TableHead>
                                    <TableHead>{t("Type", "النوع")}</TableHead>
                                    <TableHead>{t("Window", "الفترة")}</TableHead>
                                    <TableHead className="text-end">{t("Priority", "الأولوية")}</TableHead>
                                    <TableHead>{t("Status", "الحالة")}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {campaigns.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{isRtl ? c.nameAr || c.name : c.name}</TableCell>
                                        <TableCell>{t(...TYPE_LABELS[c.type])}</TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            <Calendar className="me-1 inline h-3.5 w-3.5" />
                                            {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-end">{c.priority}</TableCell>
                                        <TableCell><Badge variant={STATUS_META[c.status].variant}>{t(STATUS_META[c.status].en, STATUS_META[c.status].ar)}</Badge></TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-1">
                                                {c.status !== CampaignStatus.Archived && (
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                                                )}
                                                {statusActions(c)}
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
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader><DialogTitle>{editing ? t("Edit campaign", "تعديل الحملة") : t("New campaign", "حملة جديدة")}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5"><Label>{t("Name (EN)", "الاسم (إنجليزي)")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>{t("Name (AR)", "الاسم (عربي)")}</Label><Input value={form.nameAr ?? ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></div>
                        <div className="space-y-1.5 sm:col-span-2"><Label>{t("Description", "الوصف")}</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

                        <div className="space-y-1.5"><Label>{t("Start", "البداية")}</Label><Input type="datetime-local" value={toInput(form.startDate)} onChange={(e) => setForm({ ...form, startDate: fromInput(e.target.value) })} /></div>
                        <div className="space-y-1.5"><Label>{t("End", "النهاية")}</Label><Input type="datetime-local" value={toInput(form.endDate)} onChange={(e) => setForm({ ...form, endDate: fromInput(e.target.value) })} /></div>

                        <div className="space-y-1.5">
                            <Label>{t("Type", "النوع")}</Label>
                            <Select value={String(form.type)} onValueChange={(v) => setForm({ ...form, type: Number(v) as CampaignType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.values(CampaignType).filter((v) => typeof v === "number").map((v) => (
                                        <SelectItem key={v} value={String(v)}>{t(...TYPE_LABELS[v as CampaignType])}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5"><Label>{t("Priority", "الأولوية")}</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>

                        {/* Type-specific config */}
                        {form.type === CampaignType.BonusPoints && (
                            <>
                                <div className="space-y-1.5"><Label>{t("Spend threshold", "حد الإنفاق")}</Label><Input type="number" value={form.spendThreshold ?? ""} onChange={(e) => setForm({ ...form, spendThreshold: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                <div className="space-y-1.5"><Label>{t("Bonus points", "النقاط الإضافية")}</Label><Input type="number" value={form.bonusPoints ?? ""} onChange={(e) => setForm({ ...form, bonusPoints: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                            </>
                        )}
                        {form.type === CampaignType.Multiplier && (
                            <>
                                <div className="space-y-1.5"><Label>{t("Multiplier (e.g. 2)", "المضاعف (مثل 2)")}</Label><Input type="number" step="0.1" value={form.multiplier ?? ""} onChange={(e) => setForm({ ...form, multiplier: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                <div className="space-y-1.5"><Label>{t("Points / currency unit", "نقاط لكل وحدة عملة")}</Label><Input type="number" step="0.01" value={form.pointsPerCurrencyUnit ?? ""} onChange={(e) => setForm({ ...form, pointsPerCurrencyUnit: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                <p className="text-xs text-muted-foreground sm:col-span-2">
                                    {t(
                                        "Campaign bonus multiplier — grants extra points at the campaign's own rate (not a multiple of the order's earned points).",
                                        "مضاعف مكافأة الحملة — يمنح نقاطًا إضافية بمعدل الحملة نفسه (وليس مضاعفًا لنقاط الطلب المكتسبة).",
                                    )}
                                    {form.multiplier && form.multiplier > 1 && form.pointsPerCurrencyUnit && form.pointsPerCurrencyUnit > 0
                                        ? ` ${t("Effective bonus", "المكافأة الفعلية")}: ${(form.pointsPerCurrencyUnit * (form.multiplier - 1)).toFixed(2)} ${t("pts/unit", "نقطة/وحدة")}.`
                                        : ""}
                                </p>
                            </>
                        )}
                        {form.type === CampaignType.FixedReward && (
                            <>
                                <div className="space-y-1.5"><Label>{t("Orders required", "عدد الطلبات المطلوبة")}</Label><Input type="number" value={form.orderCountThreshold ?? ""} onChange={(e) => setForm({ ...form, orderCountThreshold: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                <div className="space-y-1.5"><Label>{t("Reward points", "نقاط المكافأة")}</Label><Input type="number" value={form.bonusPoints ?? ""} onChange={(e) => setForm({ ...form, bonusPoints: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                            </>
                        )}

                        {/* Targeting */}
                        <div className="space-y-1.5">
                            <Label>{t("Target", "الجمهور")}</Label>
                            <Select value={String(form.targetType)} onValueChange={(v) => setForm({ ...form, targetType: Number(v) as CampaignTargetType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(CampaignTargetType.All)}>{t("All customers", "كل العملاء")}</SelectItem>
                                    <SelectItem value={String(CampaignTargetType.Segment)}>{t("Segment", "شريحة")}</SelectItem>
                                    <SelectItem value={String(CampaignTargetType.Tier)}>{t("Tier", "مستوى")}</SelectItem>
                                    <SelectItem value={String(CampaignTargetType.CustomerList)}>{t("Customer list", "قائمة عملاء")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {form.targetType === CampaignTargetType.Segment && (
                            <div className="space-y-1.5">
                                <Label>{t("Segment", "الشريحة")}</Label>
                                <Select value={form.targetSegmentId ?? ""} onValueChange={(v) => setForm({ ...form, targetSegmentId: v })}>
                                    <SelectTrigger><SelectValue placeholder={t("Select", "اختر")} /></SelectTrigger>
                                    <SelectContent>{segments.map((s) => <SelectItem key={s.id} value={s.id}>{isRtl ? s.nameAr || s.name : s.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}
                        {form.targetType === CampaignTargetType.Tier && (
                            <div className="space-y-1.5">
                                <Label>{t("Tier", "المستوى")}</Label>
                                <Select value={form.targetTierId ?? ""} onValueChange={(v) => setForm({ ...form, targetTierId: v })}>
                                    <SelectTrigger><SelectValue placeholder={t("Select", "اختر")} /></SelectTrigger>
                                    <SelectContent>{tiers.map((tr) => <SelectItem key={tr.id} value={tr.id}>{isRtl ? tr.nameAr || tr.name : tr.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}
                        {form.targetType === CampaignTargetType.CustomerList && (
                            <div className="space-y-2 sm:col-span-2">
                                <Label>{t("Customers", "العملاء")}</Label>
                                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void searchCustomers(); }}>
                                    <Input placeholder={t("Search name / phone", "بحث بالاسم / الهاتف")} value={custTerm} onChange={(e) => setCustTerm(e.target.value)} />
                                    <Button type="submit" variant="outline" size="sm">{t("Search", "بحث")}</Button>
                                </form>
                                {custResults.map((c) => (
                                    <button key={c.customerId} type="button" onClick={() => addCustomer(c)} className="flex w-full justify-between rounded-md border p-2 text-start text-sm hover:bg-slate-50">
                                        <span>{c.name} <span className="text-xs text-muted-foreground" dir="ltr">{c.phoneNumber}</span></span><Plus className="h-4 w-4" />
                                    </button>
                                ))}
                                <div className="flex flex-wrap gap-2">
                                    {form.targetCustomerIds.map((id) => (
                                        <Badge key={id} variant="secondary" className="gap-1">
                                            {custNames[id] ?? id.slice(0, 8)}
                                            <button type="button" onClick={() => removeCustomer(id)}><X className="h-3 w-3" /></button>
                                        </Badge>
                                    ))}
                                    {form.targetCustomerIds.length === 0 && <span className="text-xs text-muted-foreground">{t("None selected.", "لم يتم اختيار أحد.")}</span>}
                                </div>
                            </div>
                        )}

                        {/* Expiration */}
                        <div className="space-y-1.5">
                            <Label>{t("Points expiration", "انتهاء النقاط")}</Label>
                            <Select value={String(form.expirationMode)} onValueChange={(v) => setForm({ ...form, expirationMode: Number(v) as PointsExpirationMode })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(PointsExpirationMode.Never)}>{t("Never", "أبدًا")}</SelectItem>
                                    <SelectItem value={String(PointsExpirationMode.Days)}>{t("Days", "أيام")}</SelectItem>
                                    <SelectItem value={String(PointsExpirationMode.Months)}>{t("Months", "أشهر")}</SelectItem>
                                    <SelectItem value={String(PointsExpirationMode.Years)}>{t("Years", "سنوات")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {form.expirationMode !== PointsExpirationMode.Never && (
                            <div className="space-y-1.5"><Label>{t("Expiration value", "قيمة الانتهاء")}</Label><Input type="number" min={1} value={form.expirationValue ?? ""} onChange={(e) => setForm({ ...form, expirationValue: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>{t("Cancel", "إلغاء")}</Button>
                        <Button onClick={submit} disabled={submitting}>{t("Save", "حفظ")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
