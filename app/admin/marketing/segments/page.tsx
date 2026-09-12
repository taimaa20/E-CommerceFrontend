"use client";

import { useEffect, useState } from "react";
import { Pencil, Play, Plus, RefreshCw, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import {
    CustomerSegmentType,
    SegmentField,
    SegmentOperator,
    SegmentMemberSource,
    segmentsApi,
    marketingWalletApi,
    type Segment,
    type SegmentUpsert,
    type SegmentMember,
    type WalletSearchItem,
} from "@/lib/api-marketing";

const FIELD_LABELS: Record<SegmentField, [string, string]> = {
    [SegmentField.LifetimeSpend]: ["Lifetime spend", "إجمالي الإنفاق"],
    [SegmentField.TotalOrders]: ["Total orders", "إجمالي الطلبات"],
    [SegmentField.TotalVisits]: ["Total visits", "إجمالي الزيارات"],
    [SegmentField.LastVisitDaysAgo]: ["Days since last visit", "أيام منذ آخر زيارة"],
    [SegmentField.AvailablePoints]: ["Available points", "النقاط المتاحة"],
    [SegmentField.TierId]: ["Tier id", "معرّف المستوى"],
    [SegmentField.PreferredChannel]: ["Preferred channel", "القناة المفضلة"],
};

const OP_LABELS: Record<SegmentOperator, string> = {
    [SegmentOperator.Equals]: "=",
    [SegmentOperator.NotEquals]: "≠",
    [SegmentOperator.GreaterThan]: ">",
    [SegmentOperator.GreaterThanOrEqual]: "≥",
    [SegmentOperator.LessThan]: "<",
    [SegmentOperator.LessThanOrEqual]: "≤",
    [SegmentOperator.In]: "in",
    [SegmentOperator.NotIn]: "not in",
};

const emptyForm = (): SegmentUpsert => ({
    name: "",
    nameAr: "",
    type: CustomerSegmentType.Dynamic,
    isActive: true,
    rules: [],
});

export default function SegmentsPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [segments, setSegments] = useState<Segment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<Segment | null>(null);
    const [form, setForm] = useState<SegmentUpsert>(emptyForm());
    const [submitting, setSubmitting] = useState(false);

    const [membersOf, setMembersOf] = useState<Segment | null>(null);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(false);
            try {
                const data = await segmentsApi.list(includeInactive);
                if (!cancelled) setSegments(data);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [includeInactive, reloadKey]);

    const openCreate = () => { setEditing(null); setForm(emptyForm()); setEditorOpen(true); };
    const openEdit = (s: Segment) => {
        setEditing(s);
        setForm({
            name: s.name,
            nameAr: s.nameAr ?? "",
            type: s.type,
            isActive: s.isActive,
            rules: s.rules.map((r) => ({ field: r.field, operator: r.operator, value: r.value, logicGroup: r.logicGroup })),
        });
        setEditorOpen(true);
    };

    const addRule = () =>
        setForm((f) => ({ ...f, rules: [...f.rules, { field: SegmentField.LifetimeSpend, operator: SegmentOperator.GreaterThanOrEqual, value: "0", logicGroup: 0 }] }));
    const patchRule = (i: number, patch: Partial<SegmentUpsert["rules"][number]>) =>
        setForm((f) => ({ ...f, rules: f.rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
    const removeRule = (i: number) => setForm((f) => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }));

    const submit = async () => {
        if (!form.name.trim()) { toast.error(t("Name is required.", "الاسم مطلوب.")); return; }
        if (form.type === CustomerSegmentType.Dynamic && form.rules.length === 0) {
            toast.error(t("Dynamic segments need at least one rule.", "الشرائح الديناميكية تحتاج قاعدة واحدة على الأقل."));
            return;
        }
        setSubmitting(true);
        try {
            if (editing) await segmentsApi.update(editing.id, form);
            else await segmentsApi.create(form);
            toast.success(t("Segment saved", "تم حفظ الشريحة"));
            setEditorOpen(false);
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Save failed", "فشل الحفظ"));
        } finally {
            setSubmitting(false);
        }
    };

    const compute = async (s: Segment) => {
        try {
            const r = await segmentsApi.compute(s.id);
            toast.success(t(`Matched ${r.matched}, +${r.added}, -${r.removed}`, `مطابقون ${r.matched}، +${r.added}، -${r.removed}`));
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Compute failed", "فشل الحساب"));
        }
    };

    const deactivate = async (s: Segment) => {
        try {
            await segmentsApi.deactivate(s.id);
            toast.success(t("Segment deactivated", "تم تعطيل الشريحة"));
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Action failed", "فشل الإجراء"));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("Segments", "الشرائح")}</h1>
                    <p className="text-sm text-muted-foreground">{t("Static or rule-based customer audiences for future campaigns.", "جماهير عملاء ثابتة أو قائمة على قواعد للحملات المستقبلية.")}</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                        {t("Show inactive", "إظهار غير النشطة")}
                    </label>
                    <Button onClick={openCreate}><Plus className="me-2 h-4 w-4" />{t("New segment", "شريحة جديدة")}</Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <p className="py-12 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <p className="mb-4 text-muted-foreground">{t("Failed to load segments.", "تعذّر تحميل الشرائح.")}</p>
                            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw className="me-2 h-4 w-4" />{t("Retry", "إعادة المحاولة")}</Button>
                        </div>
                    ) : segments.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">{t("No segments yet.", "لا توجد شرائح.")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Name", "الاسم")}</TableHead>
                                    <TableHead>{t("Type", "النوع")}</TableHead>
                                    <TableHead className="text-end">{t("Members", "الأعضاء")}</TableHead>
                                    <TableHead>{t("Last computed", "آخر حساب")}</TableHead>
                                    <TableHead>{t("Status", "الحالة")}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {segments.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{isRtl ? s.nameAr || s.name : s.name}</TableCell>
                                        <TableCell>
                                            {s.type === CustomerSegmentType.Dynamic ? t("Dynamic", "ديناميكي") : t("Static", "ثابت")}
                                        </TableCell>
                                        <TableCell className="text-end">{s.memberCount.toLocaleString()}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {s.lastComputedAt ? new Date(s.lastComputedAt).toLocaleString() : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {s.isActive ? <Badge variant="default">{t("Active", "نشط")}</Badge> : <Badge variant="secondary">{t("Inactive", "غير نشط")}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" title={t("Members", "الأعضاء")} onClick={() => setMembersOf(s)}><Users className="h-4 w-4" /></Button>
                                                {s.type === CustomerSegmentType.Dynamic && (
                                                    <Button variant="ghost" size="icon" title={t("Compute", "حساب")} onClick={() => compute(s)}><Play className="h-4 w-4" /></Button>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                                                {s.isActive && <Button variant="ghost" size="icon" onClick={() => deactivate(s)}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Editor */}
            <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader><DialogTitle>{editing ? t("Edit segment", "تعديل الشريحة") : t("New segment", "شريحة جديدة")}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5"><Label>{t("Name (EN)", "الاسم (إنجليزي)")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>{t("Name (AR)", "الاسم (عربي)")}</Label><Input value={form.nameAr ?? ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></div>
                        <div className="space-y-1.5">
                            <Label>{t("Type", "النوع")}</Label>
                            <Select value={String(form.type)} onValueChange={(v) => setForm({ ...form, type: Number(v) as CustomerSegmentType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(CustomerSegmentType.Dynamic)}>{t("Dynamic (rule-based)", "ديناميكي (قواعد)")}</SelectItem>
                                    <SelectItem value={String(CustomerSegmentType.Static)}>{t("Static (manual)", "ثابت (يدوي)")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <label className="flex items-end gap-2 text-sm">
                            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                            {t("Active", "نشط")}
                        </label>
                    </div>

                    {form.type === CustomerSegmentType.Dynamic && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t("Rules (same group = OR, groups = AND)", "القواعد (نفس المجموعة = أو، المجموعات = و)")}</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addRule}><Plus className="me-1 h-3.5 w-3.5" />{t("Add rule", "إضافة قاعدة")}</Button>
                            </div>
                            {form.rules.length === 0 && <p className="text-xs text-muted-foreground">{t("No rules.", "لا توجد قواعد.")}</p>}
                            {form.rules.map((r, i) => (
                                <div key={i} className="flex items-end gap-2 rounded-lg border p-2">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs">{t("Field", "الحقل")}</Label>
                                        <Select value={String(r.field)} onValueChange={(v) => patchRule(i, { field: Number(v) as SegmentField })}>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {/* PreferredChannel has no data source yet — hidden so only evaluable fields appear. */}
                                                {Object.values(SegmentField)
                                                    .filter((v) => typeof v === "number" && v !== SegmentField.PreferredChannel)
                                                    .map((v) => (
                                                        <SelectItem key={v} value={String(v)}>{t(...FIELD_LABELS[v as SegmentField])}</SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <Label className="text-xs">{t("Op", "العامل")}</Label>
                                        <Select value={String(r.operator)} onValueChange={(v) => patchRule(i, { operator: Number(v) as SegmentOperator })}>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.values(SegmentOperator).filter((v) => typeof v === "number").map((v) => (
                                                    <SelectItem key={v} value={String(v)}>{OP_LABELS[v as SegmentOperator]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs">{t("Value", "القيمة")}</Label>
                                        <Input value={r.value} onChange={(e) => patchRule(i, { value: e.target.value })} />
                                    </div>
                                    <div className="w-16 space-y-1">
                                        <Label className="text-xs">{t("Group", "المجموعة")}</Label>
                                        <Input type="number" value={r.logicGroup} onChange={(e) => patchRule(i, { logicGroup: Number(e.target.value) })} />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRule(i)}><X className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={submitting}>{t("Cancel", "إلغاء")}</Button>
                        <Button onClick={submit} disabled={submitting}>{t("Save", "حفظ")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {membersOf && <MembersDialog segment={membersOf} onClose={() => setMembersOf(null)} t={t} isRtl={isRtl} />}
        </div>
    );
}

function MembersDialog({
    segment,
    onClose,
    t,
    isRtl,
}: {
    segment: Segment;
    onClose: () => void;
    t: (en: string, ar: string) => string;
    isRtl: boolean;
}) {
    const PAGE = 10;
    const [members, setMembers] = useState<SegmentMember[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<WalletSearchItem[]>([]);
    const isStatic = segment.type === CustomerSegmentType.Static;

    const load = async (p = 1) => {
        setLoading(true);
        try {
            const res = await segmentsApi.members(segment.id, p, PAGE);
            setMembers(res.items);
            setTotal(res.totalCount);
            setPage(res.pageNumber);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Failed to load members", "تعذّر تحميل الأعضاء"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(1); /* eslint-disable-next-line */ }, []);

    const searchCustomers = async () => {
        try {
            const res = await marketingWalletApi.search(term.trim(), 1, 6);
            setResults(res.items);
        } catch {
            setResults([]);
        }
    };

    const add = async (customerId: string) => {
        try {
            await segmentsApi.addMember(segment.id, customerId);
            toast.success(t("Member added", "تمت الإضافة"));
            setResults([]);
            setTerm("");
            await load(1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Add failed", "فشلت الإضافة"));
        }
    };

    const remove = async (customerId: string) => {
        try {
            await segmentsApi.removeMember(segment.id, customerId);
            await load(page);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Remove failed", "فشلت الإزالة"));
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader><DialogTitle>{t("Members", "الأعضاء")} — {isRtl ? segment.nameAr || segment.name : segment.name}</DialogTitle></DialogHeader>

                {isStatic && (
                    <div className="space-y-2">
                        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void searchCustomers(); }}>
                            <Input placeholder={t("Search to add", "ابحث للإضافة")} value={term} onChange={(e) => setTerm(e.target.value)} />
                            <Button type="submit" variant="outline" size="sm">{t("Search", "بحث")}</Button>
                        </form>
                        {results.map((c) => (
                            <button key={c.customerId} onClick={() => add(c.customerId)} className="flex w-full justify-between rounded-md border p-2 text-start text-sm hover:bg-slate-50">
                                <span>{c.name} <span className="text-xs text-muted-foreground" dir="ltr">{c.phoneNumber}</span></span>
                                <Plus className="h-4 w-4" />
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <p className="py-6 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                ) : members.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">{t("No members.", "لا يوجد أعضاء.")}</p>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Name", "الاسم")}</TableHead>
                                    <TableHead>{t("Source", "المصدر")}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((m) => (
                                    <TableRow key={m.customerId}>
                                        <TableCell className="font-medium">{m.name}<span className="ms-2 text-xs text-muted-foreground" dir="ltr">{m.phoneNumber}</span></TableCell>
                                        <TableCell>
                                            {m.source === SegmentMemberSource.Computed ? t("Computed", "محسوب") : m.source === SegmentMemberSource.Import ? t("Import", "مستورد") : t("Manual", "يدوي")}
                                        </TableCell>
                                        <TableCell className="text-end">
                                            {isStatic && m.source !== SegmentMemberSource.Computed && (
                                                <Button variant="ghost" size="icon" onClick={() => remove(m.customerId)}><X className="h-4 w-4 text-red-600" /></Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <PaginationControls pageNumber={page} pageSize={PAGE} totalCount={total} onPageChange={(p) => void load(p)} onPageSizeChange={() => undefined} pageSizeOptions={[PAGE]} isLoading={loading} />
                    </>
                )}

                <DialogFooter><Button variant="outline" onClick={onClose}>{t("Close", "إغلاق")}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
