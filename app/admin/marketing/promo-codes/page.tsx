"use client";

import { useEffect, useState } from "react";
import { History, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { isAdminRole } from "@/lib/authorization";
import { formatCurrency } from "@/lib/currencies";
import { PromoDiscountType, promoCodesApi, type PromoCode, type PromoCodeStatus } from "@/lib/api-marketing";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import PromoDeleteDialog from "./promo-delete-dialog";
import PromoEditorDialog from "./promo-editor-dialog";
import PromoUsageDialog from "./promo-usage-dialog";
import { AUDIENCE_LABELS, STATUS_LABELS } from "./promo-form";

const PAGE_SIZE = 20;
const ALL_STATUSES = "all";

const STATUS_VARIANT: Record<PromoCodeStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Active: "default",
    Scheduled: "outline",
    Expired: "secondary",
    Inactive: "secondary",
    Exhausted: "destructive",
};

export default function PromoCodesPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);
    const currency = useSettingsStore(state => state.settings.currency);
    // Deleting is Admin/SuperAdmin only; the backend enforces the same on the endpoint.
    const canDelete = isAdminRole(useAuthStore(state => state.user?.role));
    const money = (amount: number) => (currency ? formatCurrency(amount, currency) : amount.toFixed(2));

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [status, setStatus] = useState<PromoCodeStatus | typeof ALL_STATUSES>(ALL_STATUSES);
    const [reloadKey, setReloadKey] = useState(0);
    const [result, setResult] = useState<{ key: string; promos: PromoCode[]; total: number; failed: boolean } | null>(null);
    const [editor, setEditor] = useState<{ promo: PromoCode | null } | null>(null);
    const [usageFor, setUsageFor] = useState<PromoCode | null>(null);
    const [deleteFor, setDeleteFor] = useState<PromoCode | null>(null);
    const requestKey = JSON.stringify({ appliedSearch, status, page, reloadKey });

    useEffect(() => {
        let cancelled = false;
        promoCodesApi.list({
            search: appliedSearch || undefined,
            status: status === ALL_STATUSES ? undefined : status,
            page,
            pageSize: PAGE_SIZE,
        })
            .then(list => { if (!cancelled) setResult({ key: requestKey, promos: list.items, total: list.totalCount, failed: false }); })
            .catch(() => { if (!cancelled) setResult({ key: requestKey, promos: [], total: 0, failed: true }); });
        return () => { cancelled = true; };
        // requestKey encodes search, status, page and reload count.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey]);

    const loading = result?.key !== requestKey;
    const error = !loading && !!result?.failed;
    const promos = result?.promos ?? [];
    const total = result?.total ?? 0;
    const setPromos = (update: (list: PromoCode[]) => PromoCode[]) =>
        setResult(current => (current ? { ...current, promos: update(current.promos) } : current));
    const reload = () => setReloadKey(k => k + 1);

    // Optimistic: the switch flips at once and snaps back if the server refuses.
    const toggleActive = async (promo: PromoCode) => {
        const next = !promo.isActive;
        setPromos(list => list.map(p => (p.id === promo.id ? { ...p, isActive: next } : p)));
        try {
            await promoCodesApi.setActive(promo.id, next);
            reload();
        } catch (e) {
            setPromos(list => list.map(p => (p.id === promo.id ? { ...p, isActive: promo.isActive } : p)));
            toast.error(e instanceof Error ? e.message : t("Action failed", "فشل الإجراء"));
        }
    };

    const discountSummary = (p: PromoCode) =>
        p.discountType === PromoDiscountType.Percentage
            ? `${p.discountValue}%${p.maxDiscountAmount ? ` (${t("max", "حد")} ${money(p.maxDiscountAmount)})` : ""}`
            : money(p.discountValue);

    const windowSummary = (p: PromoCode) => {
        const from = new Date(p.startsAt).toLocaleDateString();
        return p.endsAt ? `${from} → ${new Date(p.endsAt).toLocaleDateString()}` : `${from} →`;
    };

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pageRedemptions = promos.reduce((sum, p) => sum + p.usageCount, 0);
    const pageDiscount = promos.reduce((sum, p) => sum + p.totalDiscountGranted, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("Promo Codes", "رموز الخصم")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("Codes customers enter at online checkout. Every rule is enforced by the server.",
                            "رموز يدخلها العملاء عند الدفع عبر الإنترنت. جميع القواعد يطبقها الخادم.")}
                    </p>
                </div>
                <Button onClick={() => setEditor({ promo: null })}><Plus className="me-2 h-4 w-4" />{t("New promo code", "رمز خصم جديد")}</Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Kpi label={t("Codes (filtered)", "الرموز (المصفاة)")} value={String(total)} />
                <Kpi label={t("Counted uses on this page", "الاستخدامات في هذه الصفحة")} value={String(pageRedemptions)} />
                <Kpi label={t("Discount granted on this page", "الخصم الممنوح في هذه الصفحة")} value={money(pageDiscount)} />
            </div>

            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-wrap gap-2">
                        <form className="flex flex-1 gap-2" onSubmit={e => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }}>
                            <Input className="max-w-xs" placeholder={t("Search code or name", "ابحث بالرمز أو الاسم")} value={search} onChange={e => setSearch(e.target.value)} />
                            <Button type="submit" variant="outline" size="icon" aria-label={t("Search", "بحث")}><Search className="h-4 w-4" /></Button>
                        </form>
                        <Select value={status} onValueChange={v => { setPage(1); setStatus(v as PromoCodeStatus | typeof ALL_STATUSES); }}>
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_STATUSES}>{t("All statuses", "كل الحالات")}</SelectItem>
                                {(["Active", "Scheduled", "Expired", "Inactive"] as PromoCodeStatus[]).map(s => (
                                    <SelectItem key={s} value={s}>{t(...STATUS_LABELS[s])}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading ? (
                        <p className="py-12 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <p className="mb-4 text-muted-foreground">{t("Failed to load promo codes.", "تعذّر تحميل رموز الخصم.")}</p>
                            <Button variant="outline" onClick={reload}><RefreshCw className="me-2 h-4 w-4" />{t("Retry", "إعادة المحاولة")}</Button>
                        </div>
                    ) : promos.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">{t("No promo codes yet.", "لا توجد رموز خصم بعد.")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Code", "الرمز")}</TableHead>
                                    <TableHead>{t("Discount", "الخصم")}</TableHead>
                                    <TableHead>{t("Rules", "القواعد")}</TableHead>
                                    <TableHead>{t("Valid", "الصلاحية")}</TableHead>
                                    <TableHead className="text-end">{t("Uses", "الاستخدامات")}</TableHead>
                                    <TableHead className="text-end">{t("Discount granted", "الخصم الممنوح")}</TableHead>
                                    <TableHead>{t("Status", "الحالة")}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {promos.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <span className="font-mono font-semibold" dir="ltr">{p.code}</span>
                                            <span className="block text-xs text-muted-foreground">{isRtl ? p.nameAr || p.name : p.name}</span>
                                        </TableCell>
                                        <TableCell>{discountSummary(p)}</TableCell>
                                        <TableCell className="text-xs">
                                            {t(...AUDIENCE_LABELS[p.audience])}
                                            {p.minOrderAmount ? <span className="block">{t("Min", "الحد الأدنى")} {money(p.minOrderAmount)}</span> : null}
                                            {p.firstOrderOnly && <span className="block">{t("First order only", "الطلب الأول فقط")}</span>}
                                            {p.targets.length > 0 && <span className="block">{p.targets.length} {t("product/category rules", "قواعد منتجات/فئات")}</span>}
                                        </TableCell>
                                        <TableCell className="text-xs">{windowSummary(p)}</TableCell>
                                        <TableCell className="text-end" dir="ltr">
                                            {p.usageCount}{p.usageLimit ? ` / ${p.usageLimit}` : ""}
                                            {p.perCustomerLimit ? <span className="block text-xs text-muted-foreground">{p.perCustomerLimit} / {t("customer", "عميل")}</span> : null}
                                        </TableCell>
                                        <TableCell className="text-end">{money(p.totalDiscountGranted)}</TableCell>
                                        <TableCell><Badge variant={STATUS_VARIANT[p.status]}>{t(...STATUS_LABELS[p.status])}</Badge></TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex items-center justify-end gap-1">
                                                <Switch checked={p.isActive} onCheckedChange={() => toggleActive(p)} aria-label={t("Active", "نشط")} />
                                                <Button variant="ghost" size="icon" onClick={() => setUsageFor(p)} aria-label={t("Usage history", "سجل الاستخدام")}><History className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setEditor({ promo: p })} aria-label={t("Edit", "تعديل")}><Pencil className="h-4 w-4" /></Button>
                                                {canDelete && (
                                                    <Button variant="ghost" size="icon" onClick={() => setDeleteFor(p)} aria-label={t("Delete", "حذف")}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {pageCount > 1 && (
                        <div className="flex items-center justify-end gap-2 text-sm">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t("Previous", "السابق")}</Button>
                            <span>{page} / {pageCount}</span>
                            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>{t("Next", "التالي")}</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {editor && (
                <PromoEditorDialog
                    promo={editor.promo}
                    isRtl={isRtl}
                    t={t}
                    onClose={() => setEditor(null)}
                    onSaved={() => { setEditor(null); reload(); }}
                />
            )}
            {usageFor && <PromoUsageDialog promo={usageFor} t={t} money={money} onClose={() => setUsageFor(null)} />}
            {deleteFor && (
                <PromoDeleteDialog
                    promo={deleteFor}
                    t={t}
                    onClose={() => setDeleteFor(null)}
                    onDeleted={() => { setDeleteFor(null); reload(); }}
                />
            )}
        </div>
    );
}

function Kpi({ label, value }: { label: string; value: string }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold" dir="ltr">{value}</p>
            </CardContent>
        </Card>
    );
}
