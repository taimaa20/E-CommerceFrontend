"use client";

import { useEffect, useState } from "react";
import { Lock, Minus, Plus, RefreshCw, Search, Unlock, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import {
    WalletAdjustmentDirection,
    marketingWalletApi,
    type Wallet,
    type WalletSearchItem,
    type WalletTransaction,
} from "@/lib/api-marketing";

const PAGE_SIZE = 10;
type DialogMode = "freeze" | "adjust" | null;

export default function MarketingWalletsPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [term, setTerm] = useState("");
    const [results, setResults] = useState<WalletSearchItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);

    const [selected, setSelected] = useState<WalletSearchItem | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [history, setHistory] = useState<WalletTransaction[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [loadingWallet, setLoadingWallet] = useState(false);

    const [dialog, setDialog] = useState<DialogMode>(null);
    const [reason, setReason] = useState("");
    const [adjustPoints, setAdjustPoints] = useState("");
    const [adjustDir, setAdjustDir] = useState<WalletAdjustmentDirection>(WalletAdjustmentDirection.Add);
    const [submitting, setSubmitting] = useState(false);

    const runSearch = async (nextPage = 1) => {
        setSearching(true);
        try {
            const res = await marketingWalletApi.search(term.trim(), nextPage, PAGE_SIZE);
            setResults(res.items);
            setTotal(res.totalCount);
            setPage(res.pageNumber);
            setSearched(true);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Search failed", "فشل البحث"));
        } finally {
            setSearching(false);
        }
    };

    const loadWallet = async (customer: WalletSearchItem, hPage = 1) => {
        setSelected(customer);
        setLoadingWallet(true);
        try {
            const [w, h] = await Promise.all([
                marketingWalletApi.get(customer.customerId),
                marketingWalletApi.history(customer.customerId, hPage, PAGE_SIZE),
            ]);
            setWallet(w);
            setHistory(h.items);
            setHistoryTotal(h.totalCount);
            setHistoryPage(h.pageNumber);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Failed to load wallet", "تعذّر تحميل المحفظة"));
            setWallet(null);
        } finally {
            setLoadingWallet(false);
        }
    };

    const reloadHistory = async (hPage: number) => {
        if (!selected) return;
        const h = await marketingWalletApi.history(selected.customerId, hPage, PAGE_SIZE);
        setHistory(h.items);
        setHistoryTotal(h.totalCount);
        setHistoryPage(h.pageNumber);
    };

    const refreshSelected = async () => {
        if (selected) await loadWallet(selected, historyPage);
        await runSearch(page);
    };

    const openFreeze = () => {
        setReason("");
        setDialog("freeze");
    };
    const openAdjust = () => {
        setReason("");
        setAdjustPoints("");
        setAdjustDir(WalletAdjustmentDirection.Add);
        setDialog("adjust");
    };

    const submitFreeze = async () => {
        if (!selected || !wallet) return;
        if (wallet.status !== "Frozen" && !reason.trim()) {
            toast.error(t("A reason is required to freeze.", "السبب مطلوب للتجميد."));
            return;
        }
        setSubmitting(true);
        try {
            if (wallet.status === "Frozen") {
                await marketingWalletApi.unfreeze(selected.customerId);
                toast.success(t("Wallet unfrozen", "تم إلغاء تجميد المحفظة"));
            } else {
                await marketingWalletApi.freeze(selected.customerId, reason.trim());
                toast.success(t("Wallet frozen", "تم تجميد المحفظة"));
            }
            setDialog(null);
            await refreshSelected();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Action failed", "فشل الإجراء"));
        } finally {
            setSubmitting(false);
        }
    };

    const submitAdjust = async () => {
        if (!selected) return;
        const points = Number(adjustPoints);
        if (!points || points <= 0) {
            toast.error(t("Enter a positive amount.", "أدخل مبلغًا موجبًا."));
            return;
        }
        if (!reason.trim()) {
            toast.error(t("A reason is required.", "السبب مطلوب."));
            return;
        }
        setSubmitting(true);
        try {
            const updated = await marketingWalletApi.adjust(selected.customerId, {
                direction: adjustDir,
                points,
                reason: reason.trim(),
            });
            setWallet(updated);
            toast.success(t("Points adjusted", "تم تعديل النقاط"));
            setDialog(null);
            await reloadHistory(1);
            await runSearch(page);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Adjustment failed", "فشل التعديل"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("Wallets", "المحافظ")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t("Search a customer to view and manage their loyalty wallet.", "ابحث عن عميل لعرض وإدارة محفظة الولاء.")}
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void runSearch(1);
                        }}
                    >
                        <div className="flex-1 space-y-1.5 min-w-[220px]">
                            <Label>{t("Search", "بحث")}</Label>
                            <Input
                                placeholder={t("Name, phone or loyalty code", "الاسم أو الهاتف أو رمز الولاء")}
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={searching}>
                            <Search className="me-2 h-4 w-4" />
                            {searching ? t("Searching…", "جارٍ البحث…") : t("Search", "بحث")}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {searched && (
                <Card>
                    <CardContent className="pt-6">
                        {results.length === 0 ? (
                            <p className="py-8 text-center text-muted-foreground">{t("No customers found.", "لا يوجد عملاء.")}</p>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("Name", "الاسم")}</TableHead>
                                            <TableHead>{t("Phone", "الهاتف")}</TableHead>
                                            <TableHead>{t("Tier", "المستوى")}</TableHead>
                                            <TableHead className="text-end">{t("Points", "النقاط")}</TableHead>
                                            <TableHead>{t("Status", "الحالة")}</TableHead>
                                            <TableHead />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((c) => (
                                            <TableRow key={c.customerId}>
                                                <TableCell className="font-medium">{c.name}</TableCell>
                                                <TableCell dir="ltr">{c.phoneNumber || "—"}</TableCell>
                                                <TableCell>{c.tier}</TableCell>
                                                <TableCell className="text-end">{c.availablePoints.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <StatusBadge status={c.status} t={t} />
                                                </TableCell>
                                                <TableCell className="text-end">
                                                    <Button variant="outline" size="sm" onClick={() => loadWallet(c)}>
                                                        {t("Manage", "إدارة")}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <PaginationControls
                                    pageNumber={page}
                                    pageSize={PAGE_SIZE}
                                    totalCount={total}
                                    onPageChange={(p) => void runSearch(p)}
                                    onPageSizeChange={() => undefined}
                                    pageSizeOptions={[PAGE_SIZE]}
                                    isLoading={searching}
                                />
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {selected && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2">
                            <WalletIcon className="h-5 w-5" />
                            {selected.name}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => void refreshSelected()} disabled={loadingWallet}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={openAdjust} disabled={!wallet}>
                                <Plus className="me-1 h-4 w-4" />
                                {t("Adjust", "تعديل")}
                            </Button>
                            <Button variant="outline" size="sm" onClick={openFreeze} disabled={!wallet}>
                                {wallet?.status === "Frozen" ? (
                                    <>
                                        <Unlock className="me-1 h-4 w-4" />
                                        {t("Unfreeze", "إلغاء التجميد")}
                                    </>
                                ) : (
                                    <>
                                        <Lock className="me-1 h-4 w-4" />
                                        {t("Freeze", "تجميد")}
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {loadingWallet ? (
                            <p className="py-8 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                        ) : !wallet ? (
                            <p className="py-8 text-center text-muted-foreground">{t("No wallet data.", "لا توجد بيانات محفظة.")}</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                    <Stat label={t("Available", "المتاح")} value={wallet.availablePoints} />
                                    <Stat label={t("Pending", "قيد الانتظار")} value={wallet.pendingPoints} />
                                    <Stat label={t("Lifetime earned", "إجمالي المكتسب")} value={wallet.lifetimePoints} />
                                    <Stat label={t("Redeemed", "المستبدل")} value={wallet.redeemedPoints} />
                                    <Stat label={t("Expired", "المنتهي")} value={wallet.expiredPoints} />
                                    <div className="rounded-lg border p-3">
                                        <p className="text-xs text-muted-foreground">{t("Status", "الحالة")}</p>
                                        <StatusBadge status={wallet.status} t={t} />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="mb-2 text-sm font-semibold">{t("Transaction history", "سجل المعاملات")}</h3>
                                    {history.length === 0 ? (
                                        <p className="py-6 text-center text-muted-foreground">
                                            {t("No transactions yet.", "لا توجد معاملات.")}
                                        </p>
                                    ) : (
                                        <>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t("Date", "التاريخ")}</TableHead>
                                                        <TableHead>{t("Type", "النوع")}</TableHead>
                                                        <TableHead className="text-end">{t("Points", "النقاط")}</TableHead>
                                                        <TableHead className="text-end">{t("Balance", "الرصيد")}</TableHead>
                                                        <TableHead>{t("Reason", "السبب")}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {history.map((tx) => (
                                                        <TableRow key={tx.id}>
                                                            <TableCell className="whitespace-nowrap text-sm">
                                                                {new Date(tx.createdAt).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell>{tx.type}</TableCell>
                                                            <TableCell
                                                                className={`text-end font-medium ${tx.points < 0 ? "text-red-600" : "text-emerald-600"}`}
                                                            >
                                                                {tx.points > 0 ? "+" : ""}
                                                                {tx.points.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-end">{tx.balanceAfter.toLocaleString()}</TableCell>
                                                            <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                                                                {tx.reason || "—"}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <PaginationControls
                                                pageNumber={historyPage}
                                                pageSize={PAGE_SIZE}
                                                totalCount={historyTotal}
                                                onPageChange={(p) => void reloadHistory(p)}
                                                onPageSizeChange={() => undefined}
                                                pageSizeOptions={[PAGE_SIZE]}
                                            />
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            <Dialog open={dialog === "freeze"} onOpenChange={(o) => !o && setDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {wallet?.status === "Frozen" ? t("Unfreeze wallet", "إلغاء تجميد المحفظة") : t("Freeze wallet", "تجميد المحفظة")}
                        </DialogTitle>
                        <DialogDescription>
                            {wallet?.status === "Frozen"
                                ? t("This re-enables earning and redemption.", "هذا يعيد تفعيل الكسب والاستبدال.")
                                : t("A frozen wallet cannot earn or redeem points.", "المحفظة المجمدة لا تكسب أو تستبدل النقاط.")}
                        </DialogDescription>
                    </DialogHeader>
                    {wallet?.status !== "Frozen" && (
                        <div className="space-y-1.5">
                            <Label>{t("Reason", "السبب")}</Label>
                            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)} disabled={submitting}>
                            {t("Cancel", "إلغاء")}
                        </Button>
                        <Button onClick={submitFreeze} disabled={submitting}>
                            {t("Confirm", "تأكيد")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialog === "adjust"} onOpenChange={(o) => !o && setDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("Manual points adjustment", "تعديل النقاط يدويًا")}</DialogTitle>
                        <DialogDescription>
                            {t("Add or deduct points. This is recorded in the audit trail.", "أضف أو اخصم نقاطًا. يُسجَّل ذلك في سجل التدقيق.")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t("Direction", "الاتجاه")}</Label>
                            <Select value={String(adjustDir)} onValueChange={(v) => setAdjustDir(Number(v) as WalletAdjustmentDirection)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(WalletAdjustmentDirection.Add)}>
                                        <span className="flex items-center gap-2">
                                            <Plus className="h-4 w-4" />
                                            {t("Add points", "إضافة نقاط")}
                                        </span>
                                    </SelectItem>
                                    <SelectItem value={String(WalletAdjustmentDirection.Deduct)}>
                                        <span className="flex items-center gap-2">
                                            <Minus className="h-4 w-4" />
                                            {t("Deduct points", "خصم نقاط")}
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("Points", "النقاط")}</Label>
                            <Input
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={adjustPoints}
                                onChange={(e) => setAdjustPoints(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("Reason", "السبب")}</Label>
                            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)} disabled={submitting}>
                            {t("Cancel", "إلغاء")}
                        </Button>
                        <Button onClick={submitAdjust} disabled={submitting}>
                            {t("Apply", "تطبيق")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value.toLocaleString()}</p>
        </div>
    );
}

function StatusBadge({ status, t }: { status: string; t: (en: string, ar: string) => string }) {
    if (status === "Frozen") return <Badge variant="destructive">{t("Frozen", "مجمدة")}</Badge>;
    if (status === "Closed") return <Badge variant="secondary">{t("Closed", "مغلقة")}</Badge>;
    return <Badge variant="default">{t("Active", "نشطة")}</Badge>;
}
