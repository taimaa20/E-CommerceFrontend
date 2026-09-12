"use client";

import { useState } from "react";
import { ArrowRight, GitMerge, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/locale-provider";
import {
    marketingWalletApi,
    marketingCustomersApi,
    type WalletSearchItem,
    type CustomerMergePreview,
} from "@/lib/api-marketing";

type Side = "survivor" | "merged";

export default function CustomerMergePage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [survivor, setSurvivor] = useState<WalletSearchItem | null>(null);
    const [merged, setMerged] = useState<WalletSearchItem | null>(null);
    const [preview, setPreview] = useState<CustomerMergePreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const pick = async (side: Side, customer: WalletSearchItem) => {
        if (side === "survivor") setSurvivor(customer);
        else setMerged(customer);
        setPreview(null);
    };

    const runPreview = async (s = survivor, m = merged) => {
        if (!s || !m) return;
        if (s.customerId === m.customerId) {
            toast.error(t("Pick two different customers.", "اختر عميلين مختلفين."));
            return;
        }
        setLoadingPreview(true);
        try {
            setPreview(await marketingCustomersApi.preview(s.customerId, m.customerId));
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Preview failed", "فشل المعاينة"));
        } finally {
            setLoadingPreview(false);
        }
    };

    const doMerge = async () => {
        if (!survivor || !merged) return;
        setSubmitting(true);
        try {
            await marketingCustomersApi.merge(survivor.customerId, merged.customerId);
            toast.success(t("Customers merged", "تم دمج العملاء"));
            setConfirmOpen(false);
            setSurvivor(null);
            setMerged(null);
            setPreview(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Merge failed", "فشل الدمج"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("Customer Merge", "دمج العملاء")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t("Merge a duplicate customer into a survivor. Points transfer; history is preserved.", "ادمج عميلًا مكررًا في العميل الأساسي. تُنقل النقاط ويُحفظ السجل.")}
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <CustomerPicker
                    title={t("Survivor (keep)", "العميل الأساسي (يبقى)")}
                    selected={survivor}
                    onPick={(c) => pick("survivor", c)}
                    t={t}
                    isRtl={isRtl}
                />
                <CustomerPicker
                    title={t("Merged (absorbed)", "العميل المدموج (يُستوعب)")}
                    selected={merged}
                    onPick={(c) => pick("merged", c)}
                    t={t}
                    isRtl={isRtl}
                />
            </div>

            <div className="flex justify-center">
                <Button onClick={() => runPreview()} disabled={!survivor || !merged || loadingPreview}>
                    {loadingPreview ? t("Loading preview…", "جارٍ المعاينة…") : t("Preview merge", "معاينة الدمج")}
                </Button>
            </div>

            {preview && (
                <Card>
                    <CardHeader><CardTitle>{t("Merge preview", "معاينة الدمج")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {preview.warnings.length > 0 && (
                            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                                {preview.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                            </div>
                        )}
                        <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                            <SidePanel side={preview.survivor} t={t} />
                            <ArrowRight className="mx-auto h-6 w-6 text-muted-foreground rtl:-scale-x-100" />
                            <SidePanel side={preview.merged} t={t} />
                        </div>
                        <div className="rounded-lg border bg-slate-50 p-4">
                            <p className="mb-2 text-sm font-semibold">{t("Projected survivor wallet", "المحفظة الناتجة")}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                                <Stat label={t("Available", "المتاح")} value={preview.projectedAvailablePoints} />
                                <Stat label={t("Lifetime", "الإجمالي")} value={preview.projectedLifetimePoints} />
                                <Stat label={t("Transactions", "المعاملات")} value={preview.projectedTransactionCount} />
                                <Stat label={t("Orders", "الطلبات")} value={preview.projectedOrderCount} />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => setConfirmOpen(true)} disabled={!preview.canMerge}>
                                <GitMerge className="me-2 h-4 w-4" />
                                {t("Merge customers", "دمج العملاء")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("Confirm merge", "تأكيد الدمج")}</DialogTitle>
                        <DialogDescription>
                            {t("This cannot be undone. Points and aggregates move to the survivor; the merged customer's wallet is closed.", "لا يمكن التراجع. تُنقل النقاط والإجماليات إلى العميل الأساسي وتُغلق محفظة العميل المدموج.")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                            {t("Cancel", "إلغاء")}
                        </Button>
                        <Button onClick={doMerge} disabled={submitting}>
                            {t("Confirm", "تأكيد")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CustomerPicker({
    title,
    selected,
    onPick,
    t,
    isRtl,
}: {
    title: string;
    selected: WalletSearchItem | null;
    onPick: (c: WalletSearchItem) => void;
    t: (en: string, ar: string) => string;
    isRtl: boolean;
}) {
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<WalletSearchItem[]>([]);
    const [searching, setSearching] = useState(false);

    const search = async () => {
        setSearching(true);
        try {
            const res = await marketingWalletApi.search(term.trim(), 1, 8);
            setResults(res.items);
        } catch {
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
                {selected ? (
                    <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
                        <div>
                            <p className="font-medium">{selected.name}</p>
                            <p className="text-xs text-muted-foreground" dir="ltr">{selected.phoneNumber || "—"}</p>
                        </div>
                        <Badge variant="secondary">{selected.availablePoints.toLocaleString()} {t("pts", "نقطة")}</Badge>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{t("No customer selected.", "لم يتم اختيار عميل.")}</p>
                )}

                <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void search();
                    }}
                >
                    <Input placeholder={t("Search name / phone", "بحث بالاسم / الهاتف")} value={term} onChange={(e) => setTerm(e.target.value)} />
                    <Button type="submit" variant="outline" size="icon" disabled={searching}>
                        <Search className="h-4 w-4" />
                    </Button>
                </form>

                {results.length > 0 && (
                    <div className="max-h-52 space-y-1 overflow-y-auto">
                        {results.map((c) => (
                            <button
                                key={c.customerId}
                                onClick={() => { onPick(c); setResults([]); }}
                                className="flex w-full items-center justify-between rounded-md border p-2 text-start text-sm hover:bg-slate-50"
                            >
                                <span>
                                    <span className="font-medium">{c.name}</span>
                                    <span className="ms-2 text-xs text-muted-foreground" dir="ltr">{c.phoneNumber}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">{c.availablePoints.toLocaleString()}</span>
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SidePanel({ side, t }: { side: CustomerMergePreview["survivor"]; t: (en: string, ar: string) => string }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="font-semibold">{side.name}</p>
            <p className="mb-2 text-xs text-muted-foreground" dir="ltr">{side.phoneNumber || "—"}</p>
            <div className="space-y-1 text-sm">
                <Row label={t("Available", "المتاح")} value={side.availablePoints} />
                <Row label={t("Lifetime", "الإجمالي")} value={side.lifetimePoints} />
                <Row label={t("Transactions", "المعاملات")} value={side.transactionCount} />
                <Row label={t("Orders", "الطلبات")} value={side.orderCount} />
                <div className="flex justify-between"><span className="text-muted-foreground">{t("Tier", "المستوى")}</span><span>{side.tier}</span></div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value.toLocaleString()}</span>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value.toLocaleString()}</p>
        </div>
    );
}
