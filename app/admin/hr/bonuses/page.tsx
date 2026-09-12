"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useHrBonuses, useHrLookups, useHrMutations } from "@/lib/hooks/useHr";
import { HrApi } from "@/lib/api-hr";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { usePosStore } from "@/store/posStore";

const PAGE_SIZE = 50;

export default function BonusesPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const currency = usePosStore((s) => s.currency);

    const [status, setStatus] = React.useState<string>("all");
    const [bonusType, setBonusType] = React.useState<string>("all");
    const [from, setFrom] = React.useState<string>("");
    const [to, setTo] = React.useState<string>("");
    const [page, setPage] = React.useState(1);

    const lookups = useHrLookups();
    const list = useHrBonuses({
        status: status === "all" ? undefined : status,
        bonusType: bonusType === "all" ? undefined : bonusType,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
    });

    const total = list.data?.total ?? 0;
    const totalAmount = list.data?.totalAmount ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="flex flex-col gap-6 p-0 sm:p-2 lg:p-4 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Link href="/ntxadminpos/hr">
                        <Button variant="ghost" size="sm" className="gap-2 mb-2">
                            <ArrowLeft className="rtl:-scale-x-100 h-4 w-4" /> {isAr ? "العودة" : "Back"}
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                            <Gift className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{isAr ? "المكافآت" : "Bonuses"}</h1>
                            <p className="text-muted-foreground">{isAr ? "كل المكافآت عبر الموظفين" : "All bonuses across employees"}</p>
                        </div>
                    </div>
                </div>
                <div className="text-end">
                    <div className="text-xs text-muted-foreground">{isAr ? "الإجمالي" : "Total"} ({total})</div>
                    <div className="text-2xl font-bold">{formatCurrency(totalAmount, currency)}</div>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-base">{isAr ? "تصفية" : "Filter"}</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-4">
                        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                            <SelectTrigger><SelectValue placeholder={isAr ? "الحالة" : "Status"} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? "كل الحالات" : "All statuses"}</SelectItem>
                                {lookups.data?.bonusStatuses?.map((s) => (
                                    <SelectItem key={s.code} value={s.code}>{isAr && s.labelAr ? s.labelAr : s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={bonusType} onValueChange={(v) => { setBonusType(v); setPage(1); }}>
                            <SelectTrigger><SelectValue placeholder={isAr ? "النوع" : "Type"} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? "كل الأنواع" : "All types"}</SelectItem>
                                {lookups.data?.bonusTypes?.map((b) => (
                                    <SelectItem key={b.code} value={b.code}>{isAr && b.labelAr ? b.labelAr : b.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} placeholder={isAr ? "من" : "From"} />
                        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} placeholder={isAr ? "إلى" : "To"} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-4">
                    {list.loading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">{isAr ? "جاري التحميل..." : "Loading..."}</p>
                    ) : list.error ? (
                        <p className="text-sm text-destructive py-8 text-center">{list.error}</p>
                    ) : (list.data?.items.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">{isAr ? "لا توجد مكافآت" : "No bonuses"}</p>
                    ) : (
                        <div className="space-y-2">
                            {list.data!.items.map((b) => (
                                <div key={b.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Link href={`/ntxadminpos/hr/employees/${b.employeeId}`} className="font-medium hover:underline">
                                                {b.employeeName}
                                            </Link>
                                            <Badge variant="secondary" className="text-xs">{b.bonusTypeLabel}</Badge>
                                            <Badge variant="outline" className="text-xs">{b.statusLabel}</Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {b.awardDate} · {b.reason ?? "-"} · {isAr ? "أنشئ بواسطة" : "by"} {b.createdByUserName}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold">{formatCurrency(b.amount, b.currency || currency)}</span>
                                        <StatusUpdater bonusId={b.id} status={b.status} reload={list.reload} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <span className="text-xs text-muted-foreground">{isAr ? "صفحة" : "Page"} {page} / {totalPages}</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{isAr ? "السابق" : "Previous"}</Button>
                                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{isAr ? "التالي" : "Next"}</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    paid: "Paid",
    cancelled: "Cancelled",
};

function StatusUpdater({ bonusId, status, reload }: { bonusId: string; status: string; reload: () => void }) {
    const m = useHrMutations(reload);
    // Backend canonical codes are lowercase; mirror them here so the transitions match server-side rules.
    const next: Record<string, string[]> = {
        pending: ["approved", "cancelled"],
        approved: ["paid", "cancelled"],
    };
    const options = next[status] ?? [];
    if (options.length === 0) return null;
    return (
        <Select onValueChange={async (v) => {
            try { await m.wrap(() => HrApi.updateBonusStatus(bonusId, v)); toast.success("Updated"); }
            catch (e: any) { toast.error(e?.message ?? "Failed"); }
        }}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Set status" /></SelectTrigger>
            <SelectContent>
                {options.map((o) => <SelectItem key={o} value={o}>{STATUS_LABEL[o] ?? o}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}
