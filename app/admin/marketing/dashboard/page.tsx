"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import { loyaltyDashboardApi, type LoyaltyDashboard, type LoyaltyDashboardPeriod, type TopCustomer } from "@/lib/api-marketing";

export default function LoyaltyDashboardPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [data, setData] = useState<LoyaltyDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [period, setPeriod] = useState<LoyaltyDashboardPeriod>("month");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(false);
            try {
                const d = await loyaltyDashboardApi.get(period);
                if (!cancelled) setData(d);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [reloadKey, period]);

    if (loading) return <div className="py-20 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</div>;
    if (error || !data)
        return (
            <div className="py-20 text-center">
                <p className="mb-4 text-muted-foreground">{t("Failed to load dashboard.", "تعذّر تحميل اللوحة.")}</p>
                <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                    <RefreshCw className="me-2 h-4 w-4" />
                    {t("Retry", "إعادة المحاولة")}
                </Button>
            </div>
        );

    const k = data.kpis;
    const maxTrend = Math.max(1, ...data.trends.map((p) => Math.max(p.earned, p.redeemed, p.expired)));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("Loyalty Dashboard", "لوحة الولاء")}</h1>
                    <p className="text-sm text-muted-foreground">{t("Operational visibility into loyalty performance.", "رؤية تشغيلية لأداء الولاء.")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={(v) => setPeriod(v as LoyaltyDashboardPeriod)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">{t("Today", "اليوم")}</SelectItem>
                            <SelectItem value="week">{t("This Week", "هذا الأسبوع")}</SelectItem>
                            <SelectItem value="month">{t("This Month", "هذا الشهر")}</SelectItem>
                            <SelectItem value="year">{t("This Year", "هذا العام")}</SelectItem>
                            <SelectItem value="all">{t("All Time", "كل الوقت")}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setReloadKey((x) => x + 1)}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <Kpi label={t("Total members", "إجمالي الأعضاء")} value={k.totalMembers} />
                <Kpi label={t("Active members", "الأعضاء النشطون")} value={k.activeMembers} />
                <Kpi label={t("New members", "أعضاء جدد")} value={k.newMembers} />
                <Kpi label={t("Frozen wallets", "المحافظ المجمدة")} value={k.frozenWallets} />
                <Kpi label={t("Adjustments", "التعديلات")} value={k.adjustmentCount} />
                <Kpi label={t("Outstanding points", "النقاط القائمة")} value={k.outstandingPoints} />
                <Kpi label={t("Avg pts / customer", "متوسط النقاط/عميل")} value={k.averagePointsPerCustomer} />
                <Kpi label={t("Points earned", "النقاط المكتسبة")} value={k.totalPointsEarned} />
                <Kpi label={t("Points redeemed", "النقاط المستبدلة")} value={k.totalPointsRedeemed} />
                <Kpi label={t("Points expired", "النقاط المنتهية")} value={k.totalPointsExpired} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>{t("Tier distribution", "توزيع المستويات")}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {data.tiers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("No data.", "لا توجد بيانات.")}</p>
                        ) : (
                            data.tiers.map((tier) => {
                                const total = data.tiers.reduce((s, x) => s + x.count, 0) || 1;
                                const pct = Math.round((tier.count / total) * 100);
                                return (
                                    <div key={tier.tier}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="font-medium">{tier.tier}</span>
                                            <span className="text-muted-foreground">{tier.count} ({pct}%)</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted">
                                            <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t("Recent trend", "الاتجاه الأخير")}</CardTitle></CardHeader>
                    <CardContent>
                        {data.trends.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("No activity in range.", "لا يوجد نشاط.")}</p>
                        ) : (
                            <div className="flex items-end gap-1 overflow-x-auto" style={{ height: 140 }}>
                                {data.trends.map((p) => (
                                    <div key={p.date} className="flex min-w-[10px] flex-1 flex-col justify-end gap-0.5" title={`${p.date.slice(0, 10)} • +${p.earned} / -${p.redeemed}`}>
                                        <div className="rounded-t bg-emerald-500" style={{ height: `${(p.earned / maxTrend) * 110}px` }} />
                                        <div className="rounded-t bg-red-400" style={{ height: `${(p.redeemed / maxTrend) * 110}px` }} />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> {t("Earned", "مكتسب")}</span>
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-400" /> {t("Redeemed", "مستبدل")}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <TopList title={t("Top earners", "الأكثر كسبًا")} rows={data.topEarners} t={t} />
                <TopList title={t("Top redeemers", "الأكثر استبدالًا")} rows={data.topRedeemers} t={t} />
                <TopList title={t("Most active", "الأكثر نشاطًا")} rows={data.mostActive} t={t} />
            </div>
        </div>
    );
}

function Kpi({ label, value }: { label: string; value: number }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            </CardContent>
        </Card>
    );
}

function TopList({ title, rows, t }: { title: string; rows: TopCustomer[]; t: (en: string, ar: string) => string }) {
    return (
        <Card>
            <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("No data.", "لا توجد بيانات.")}</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("Customer", "العميل")}</TableHead>
                                <TableHead className="text-end">{t("Value", "القيمة")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.customerId}>
                                    <TableCell className="font-medium">{r.name}</TableCell>
                                    <TableCell className="text-end">{r.value.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
