"use client";

import { useEffect, useState } from "react";
import { Gift, Pencil, Plus, RefreshCw, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateUUID } from "@/lib/uuid";
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
import { getProducts } from "@/lib/api";
import type { ProductDto } from "@/types/pos";
import {
    RewardType,
    rewardsApi,
    marketingWalletApi,
    type Reward,
    type RewardUpsert,
    type RewardDashboard,
    type WalletSearchItem,
} from "@/lib/api-marketing";

const TYPE_LABELS: Record<RewardType, [string, string]> = {
    [RewardType.FixedDiscount]: ["Fixed discount", "خصم ثابت"],
    [RewardType.PercentageDiscount]: ["Percentage discount", "خصم نسبي"],
    [RewardType.FreeProduct]: ["Free product", "منتج مجاني"],
    [RewardType.FreeDelivery]: ["Free delivery", "توصيل مجاني"],
};

const emptyForm = (): RewardUpsert => ({
    name: "",
    nameAr: "",
    description: "",
    pointsRequired: 100,
    type: RewardType.FixedDiscount,
    rewardValue: null,
    maxDiscountAmount: null,
    productId: null,
    isActive: true,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 90 * 864e5).toISOString(),
});

const toInput = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fromInput = (local: string) => (local ? new Date(local).toISOString() : new Date().toISOString());

export default function RewardsPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [rewards, setRewards] = useState<Reward[]>([]);
    const [dash, setDash] = useState<RewardDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [products, setProducts] = useState<ProductDto[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Reward | null>(null);
    const [form, setForm] = useState<RewardUpsert>(emptyForm());
    const [submitting, setSubmitting] = useState(false);

    const [redeemOpen, setRedeemOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(false);
            try {
                const [list, d] = await Promise.all([rewardsApi.list(includeInactive), rewardsApi.dashboard()]);
                if (!cancelled) { setRewards(list); setDash(d); }
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [includeInactive, reloadKey]);

    const ensureProducts = async () => {
        if (products.length === 0) { try { setProducts(await getProducts()); } catch { /* ignore */ } }
    };

    const openCreate = async () => { await ensureProducts(); setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
    const openEdit = async (r: Reward) => {
        await ensureProducts();
        setEditing(r);
        setForm({
            name: r.name, nameAr: r.nameAr ?? "", description: r.description ?? "", descriptionAr: r.descriptionAr ?? "",
            pointsRequired: r.pointsRequired, type: r.type, rewardValue: r.rewardValue ?? null, maxDiscountAmount: r.maxDiscountAmount ?? null,
            productId: r.productId ?? null, isActive: r.isActive, startDate: r.startDate, endDate: r.endDate,
        });
        setDialogOpen(true);
    };

    const submit = async () => {
        if (!form.name.trim()) { toast.error(t("Name is required.", "الاسم مطلوب.")); return; }
        setSubmitting(true);
        try {
            if (editing) await rewardsApi.update(editing.id, form);
            else await rewardsApi.create(form);
            toast.success(t("Reward saved", "تم حفظ المكافأة"));
            setDialogOpen(false);
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Save failed", "فشل الحفظ"));
        } finally {
            setSubmitting(false);
        }
    };

    const toggleActive = async (r: Reward) => {
        try {
            await rewardsApi.setActive(r.id, !r.isActive);
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Action failed", "فشل الإجراء"));
        }
    };

    const valueSummary = (r: Reward) => {
        switch (r.type) {
            case RewardType.FixedDiscount: return `${r.rewardValue ?? 0}`;
            case RewardType.PercentageDiscount: return `${r.rewardValue ?? 0}%${r.maxDiscountAmount ? ` (≤${r.maxDiscountAmount})` : ""}`;
            case RewardType.FreeProduct: return r.productName ?? "—";
            case RewardType.FreeDelivery: return t("Free delivery", "توصيل مجاني");
            default: return "—";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("Rewards", "المكافآت")}</h1>
                    <p className="text-sm text-muted-foreground">{t("Let customers redeem points for discounts, free items, or free delivery.", "اسمح للعملاء باستبدال النقاط بخصومات أو أصناف مجانية أو توصيل مجاني.")}</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                        {t("Show inactive", "إظهار غير النشطة")}
                    </label>
                    <Button variant="outline" onClick={() => setRedeemOpen(true)}><Sparkles className="me-2 h-4 w-4" />{t("Redeem", "استبدال")}</Button>
                    <Button onClick={openCreate}><Plus className="me-2 h-4 w-4" />{t("New reward", "مكافأة جديدة")}</Button>
                </div>
            </div>

            {dash && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Active rewards", "المكافآت النشطة")}</p><p className="text-2xl font-bold">{dash.activeRewards}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Total redemptions", "إجمالي الاستبدالات")}</p><p className="text-2xl font-bold">{dash.totalRedemptions.toLocaleString()}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Points redeemed", "النقاط المستبدلة")}</p><p className="text-2xl font-bold">{dash.pointsRedeemed.toLocaleString()}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Top reward", "الأكثر استبدالًا")}</p><p className="truncate text-sm font-semibold">{dash.mostRedeemed[0]?.name ?? "—"}</p></CardContent></Card>
                </div>
            )}

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <p className="py-12 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <p className="mb-4 text-muted-foreground">{t("Failed to load rewards.", "تعذّر تحميل المكافآت.")}</p>
                            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw className="me-2 h-4 w-4" />{t("Retry", "إعادة المحاولة")}</Button>
                        </div>
                    ) : rewards.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">{t("No rewards yet.", "لا توجد مكافآت.")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Name", "الاسم")}</TableHead>
                                    <TableHead>{t("Type", "النوع")}</TableHead>
                                    <TableHead className="text-end">{t("Points", "النقاط")}</TableHead>
                                    <TableHead>{t("Value", "القيمة")}</TableHead>
                                    <TableHead>{t("Status", "الحالة")}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rewards.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{isRtl ? r.nameAr || r.name : r.name}</TableCell>
                                        <TableCell>{t(...TYPE_LABELS[r.type])}</TableCell>
                                        <TableCell className="text-end">{r.pointsRequired.toLocaleString()}</TableCell>
                                        <TableCell>{valueSummary(r)}</TableCell>
                                        <TableCell>{r.isActive ? <Badge variant="default">{t("Active", "نشطة")}</Badge> : <Badge variant="secondary">{t("Inactive", "غير نشطة")}</Badge>}</TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex items-center justify-end gap-2">
                                                <Switch checked={r.isActive} onCheckedChange={() => toggleActive(r)} />
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader><DialogTitle>{editing ? t("Edit reward", "تعديل المكافأة") : t("New reward", "مكافأة جديدة")}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5"><Label>{t("Name (EN)", "الاسم (إنجليزي)")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>{t("Name (AR)", "الاسم (عربي)")}</Label><Input value={form.nameAr ?? ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></div>
                        <div className="space-y-1.5 sm:col-span-2"><Label>{t("Description", "الوصف")}</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

                        <div className="space-y-1.5">
                            <Label>{t("Type", "النوع")}</Label>
                            <Select value={String(form.type)} onValueChange={(v) => setForm({ ...form, type: Number(v) as RewardType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.values(RewardType).filter((v) => typeof v === "number").map((v) => (
                                        <SelectItem key={v} value={String(v)}>{t(...TYPE_LABELS[v as RewardType])}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5"><Label>{t("Points required", "النقاط المطلوبة")}</Label><Input type="number" value={form.pointsRequired} onChange={(e) => setForm({ ...form, pointsRequired: Number(e.target.value) })} /></div>

                        {form.type === RewardType.FixedDiscount && (
                            <div className="space-y-1.5"><Label>{t("Discount amount", "قيمة الخصم")}</Label><Input type="number" step="0.01" value={form.rewardValue ?? ""} onChange={(e) => setForm({ ...form, rewardValue: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                        )}
                        {form.type === RewardType.PercentageDiscount && (
                            <>
                                <div className="space-y-1.5"><Label>{t("Percentage (%)", "النسبة (%)")}</Label><Input type="number" step="0.1" value={form.rewardValue ?? ""} onChange={(e) => setForm({ ...form, rewardValue: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                <div className="space-y-1.5"><Label>{t("Max discount", "الحد الأقصى للخصم")}</Label><Input type="number" step="0.01" value={form.maxDiscountAmount ?? ""} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                            </>
                        )}
                        {form.type === RewardType.FreeProduct && (
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>{t("Product", "المنتج")}</Label>
                                <Select value={form.productId ?? ""} onValueChange={(v) => setForm({ ...form, productId: v })}>
                                    <SelectTrigger><SelectValue placeholder={t("Select product", "اختر المنتج")} /></SelectTrigger>
                                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1.5"><Label>{t("Start", "البداية")}</Label><Input type="date" value={toInput(form.startDate)} onChange={(e) => setForm({ ...form, startDate: fromInput(e.target.value) })} /></div>
                        <div className="space-y-1.5"><Label>{t("End", "النهاية")}</Label><Input type="date" value={toInput(form.endDate)} onChange={(e) => setForm({ ...form, endDate: fromInput(e.target.value) })} /></div>

                        <label className="flex items-center gap-2 text-sm sm:col-span-2">
                            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                            {t("Active", "نشطة")}
                        </label>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>{t("Cancel", "إلغاء")}</Button>
                        <Button onClick={submit} disabled={submitting}>{t("Save", "حفظ")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {redeemOpen && <RedeemDialog onClose={() => setRedeemOpen(false)} onDone={() => setReloadKey((k) => k + 1)} t={t} isRtl={isRtl} />}
        </div>
    );
}

function RedeemDialog({
    onClose,
    onDone,
    t,
    isRtl,
}: {
    onClose: () => void;
    onDone: () => void;
    t: (en: string, ar: string) => string;
    isRtl: boolean;
}) {
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<WalletSearchItem[]>([]);
    const [customer, setCustomer] = useState<WalletSearchItem | null>(null);
    const [catalog, setCatalog] = useState<Reward[]>([]);
    const [rewardId, setRewardId] = useState("");
    const [orderTotal, setOrderTotal] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { void (async () => { try { setCatalog(await rewardsApi.catalog()); } catch { /* ignore */ } })(); }, []);

    const selectedReward = catalog.find((r) => r.id === rewardId) ?? null;

    const search = async () => {
        try { setResults((await marketingWalletApi.search(term.trim(), 1, 6)).items); } catch { setResults([]); }
    };

    const redeem = async () => {
        if (!customer || !selectedReward) return;
        if (selectedReward.type === RewardType.PercentageDiscount && !orderTotal) {
            toast.error(t("Order total is required for a percentage reward.", "إجمالي الطلب مطلوب للمكافأة النسبية."));
            return;
        }
        setSubmitting(true);
        try {
            const res = await rewardsApi.redeem(selectedReward.id, {
                customerId: customer.customerId,
                orderTotal: orderTotal ? Number(orderTotal) : null,
                idempotencyKey: generateUUID(),
            });
            toast.success(res.message);
            onDone();
            onClose();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Redemption failed", "فشل الاستبدال"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader><DialogTitle>{t("Redeem a reward", "استبدال مكافأة")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    {!customer ? (
                        <div className="space-y-2">
                            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
                                <Input placeholder={t("Search name / phone", "بحث بالاسم / الهاتف")} value={term} onChange={(e) => setTerm(e.target.value)} />
                                <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
                            </form>
                            {results.map((c) => (
                                <button key={c.customerId} onClick={() => setCustomer(c)} className="flex w-full justify-between rounded-md border p-2 text-start text-sm hover:bg-slate-50">
                                    <span>{c.name} <span className="text-xs text-muted-foreground" dir="ltr">{c.phoneNumber}</span></span>
                                    <span className="text-xs text-muted-foreground">{c.availablePoints.toLocaleString()} {t("pts", "نقطة")}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
                            <div><p className="font-medium">{customer.name}</p><p className="text-xs text-muted-foreground" dir="ltr">{customer.phoneNumber}</p></div>
                            <div className="text-end">
                                <Badge variant="secondary">{customer.availablePoints.toLocaleString()} {t("pts", "نقطة")}</Badge>
                                <Button variant="ghost" size="sm" className="ms-1" onClick={() => setCustomer(null)}>{t("Change", "تغيير")}</Button>
                            </div>
                        </div>
                    )}

                    {customer && (
                        <>
                            <div className="space-y-1.5">
                                <Label>{t("Reward", "المكافأة")}</Label>
                                <Select value={rewardId} onValueChange={setRewardId}>
                                    <SelectTrigger><SelectValue placeholder={t("Select reward", "اختر المكافأة")} /></SelectTrigger>
                                    <SelectContent>
                                        {catalog.map((r) => (
                                            <SelectItem key={r.id} value={r.id} disabled={customer.availablePoints < r.pointsRequired}>
                                                {(isRtl ? r.nameAr || r.name : r.name)} · {r.pointsRequired} {t("pts", "نقطة")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedReward?.type === RewardType.PercentageDiscount && (
                                <div className="space-y-1.5">
                                    <Label>{t("Order total", "إجمالي الطلب")}</Label>
                                    <Input type="number" step="0.01" value={orderTotal} onChange={(e) => setOrderTotal(e.target.value)} />
                                </div>
                            )}
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>{t("Cancel", "إلغاء")}</Button>
                    <Button onClick={redeem} disabled={submitting || !customer || !selectedReward}>{t("Redeem", "استبدال")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
