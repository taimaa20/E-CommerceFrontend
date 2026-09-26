"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { promoCodesApi, type PromoCode, type PromoCodeRedemption } from "@/lib/api-marketing";
import type { Translate } from "./promo-form";

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<PromoCodeRedemption["status"], "default" | "secondary" | "destructive"> = {
    Completed: "default",
    Pending: "secondary",
    Cancelled: "destructive",
};

const STATUS_LABELS: Record<PromoCodeRedemption["status"], [string, string]> = {
    Completed: ["Completed", "مكتمل"],
    Pending: ["Open order", "طلب مفتوح"],
    Cancelled: ["Cancelled / refunded", "ملغى / مسترد"],
};

interface Props {
    promo: PromoCode;
    t: Translate;
    money: (amount: number) => string;
    onClose: () => void;
}

/** Every order that used the code, with the status of that order — straight from the database. */
export default function PromoUsageDialog({ promo, t, money, onClose }: Props) {
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [result, setResult] = useState<{ key: string; rows: PromoCodeRedemption[]; total: number; failed: boolean } | null>(null);
    const requestKey = `${promo.id}|${page}|${reloadKey}`;

    useEffect(() => {
        let cancelled = false;
        promoCodesApi.redemptions(promo.id, page, PAGE_SIZE)
            .then(list => { if (!cancelled) setResult({ key: requestKey, rows: list.items, total: list.totalCount, failed: false }); })
            .catch(() => { if (!cancelled) setResult({ key: requestKey, rows: [], total: 0, failed: true }); });
        return () => { cancelled = true; };
        // requestKey encodes the promo, page and reload count.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey]);

    const loading = result?.key !== requestKey;
    const error = !loading && !!result?.failed;
    const rows = result?.rows ?? [];
    const total = result?.total ?? 0;

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle><span dir="ltr">{promo.code}</span> · {t("Usage history", "سجل الاستخدام")}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <Stat label={t("Counted uses", "الاستخدامات المحتسبة")} value={`${promo.usageCount}${promo.usageLimit ? ` / ${promo.usageLimit}` : ""}`} />
                    <Stat label={t("Completed orders", "طلبات مكتملة")} value={String(promo.completedCount)} />
                    <Stat label={t("Released (cancelled)", "محررة (ملغاة)")} value={String(promo.cancelledCount)} />
                    <Stat label={t("Discount granted", "الخصم الممنوح")} value={money(promo.totalDiscountGranted)} />
                </div>

                {loading ? (
                    <p className="py-10 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                ) : error ? (
                    <div className="py-10 text-center">
                        <p className="mb-3 text-muted-foreground">{t("Failed to load usage.", "تعذّر تحميل الاستخدام.")}</p>
                        <Button variant="outline" onClick={() => setReloadKey(k => k + 1)}><RefreshCw className="me-2 h-4 w-4" />{t("Retry", "إعادة المحاولة")}</Button>
                    </div>
                ) : rows.length === 0 ? (
                    <p className="py-10 text-center text-muted-foreground">{t("This code has not been used yet.", "لم يُستخدم هذا الرمز بعد.")}</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("Order", "الطلب")}</TableHead>
                                <TableHead>{t("Customer", "العميل")}</TableHead>
                                <TableHead className="text-end">{t("Subtotal", "المجموع")}</TableHead>
                                <TableHead className="text-end">{t("Discount", "الخصم")}</TableHead>
                                <TableHead className="text-end">{t("Order total", "إجمالي الطلب")}</TableHead>
                                <TableHead>{t("Status", "الحالة")}</TableHead>
                                <TableHead>{t("Used at", "وقت الاستخدام")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(row => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium" dir="ltr">{row.orderNumber}</TableCell>
                                    <TableCell>
                                        {row.customerName ?? "—"}
                                        {row.customerPhone && <span className="block text-xs text-muted-foreground" dir="ltr">{row.customerPhone}</span>}
                                    </TableCell>
                                    <TableCell className="text-end">{money(row.orderSubtotal)}</TableCell>
                                    <TableCell className="text-end">-{money(row.discountAmount)}</TableCell>
                                    <TableCell className="text-end">{money(row.orderTotal)}</TableCell>
                                    <TableCell><Badge variant={STATUS_VARIANT[row.status]}>{t(...STATUS_LABELS[row.status])}</Badge></TableCell>
                                    <TableCell className="text-xs">{new Date(row.redeemedAt).toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {pages > 1 && (
                    <div className="flex items-center justify-end gap-2 text-sm">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t("Previous", "السابق")}</Button>
                        <span>{page} / {pages}</span>
                        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>{t("Next", "التالي")}</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold" dir="ltr">{value}</p>
        </div>
    );
}
