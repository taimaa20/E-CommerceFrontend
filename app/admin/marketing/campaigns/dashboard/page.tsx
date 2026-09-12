"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { CampaignStatus, CampaignType, campaignsApi, type CampaignDashboardItem, type CampaignKpis } from "@/lib/api-marketing";

const TYPE_LABELS: Record<CampaignType, [string, string]> = {
    [CampaignType.BonusPoints]: ["Bonus points", "نقاط إضافية"],
    [CampaignType.Multiplier]: ["Multiplier", "مضاعف"],
    [CampaignType.FixedReward]: ["Fixed reward", "مكافأة ثابتة"],
};

const STATUS_LABELS: Record<CampaignStatus, [string, string]> = {
    [CampaignStatus.Draft]: ["Draft", "مسودة"],
    [CampaignStatus.Scheduled]: ["Scheduled", "مجدولة"],
    [CampaignStatus.Active]: ["Active", "نشطة"],
    [CampaignStatus.Paused]: ["Paused", "موقوفة"],
    [CampaignStatus.Expired]: ["Expired", "منتهية"],
    [CampaignStatus.Archived]: ["Archived", "مؤرشفة"],
};

export default function CampaignDashboardPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [items, setItems] = useState<CampaignDashboardItem[]>([]);
    const [summary, setSummary] = useState<CampaignKpis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(false);
            try {
                const data = await campaignsApi.dashboard();
                if (!cancelled) { setItems(data.campaigns); setSummary(data.summary); }
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [reloadKey]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link href="/ntxadminpos/marketing/campaigns">
                        <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t("Campaign Dashboard", "لوحة الحملات")}</h1>
                        <p className="text-sm text-muted-foreground">{t("Participation and points issued per campaign.", "المشاركة والنقاط الصادرة لكل حملة.")}</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw className="h-4 w-4" /></Button>
            </div>

            {loading ? (
                <p className="py-12 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
            ) : error ? (
                <div className="py-12 text-center">
                    <p className="mb-4 text-muted-foreground">{t("Failed to load.", "تعذّر التحميل.")}</p>
                    <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>{t("Retry", "إعادة المحاولة")}</Button>
                </div>
            ) : (
                <>
                    {summary && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Total campaigns", "إجمالي الحملات")}</p><p className="text-2xl font-bold">{summary.totalCampaigns}</p></CardContent></Card>
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Active", "نشطة")}</p><p className="text-2xl font-bold">{summary.activeCampaigns}</p></CardContent></Card>
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Scheduled", "مجدولة")}</p><p className="text-2xl font-bold">{summary.scheduledCampaigns}</p></CardContent></Card>
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Expired", "منتهية")}</p><p className="text-2xl font-bold">{summary.expiredCampaigns}</p></CardContent></Card>
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Participants", "المشاركون")}</p><p className="text-2xl font-bold">{summary.totalParticipants.toLocaleString()}</p></CardContent></Card>
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Points issued", "النقاط الصادرة")}</p><p className="text-2xl font-bold">{summary.totalPointsIssued.toLocaleString()}</p></CardContent></Card>
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Avg participants", "متوسط المشاركين")}</p><p className="text-2xl font-bold">{summary.averageParticipantsPerCampaign.toLocaleString()}</p></CardContent></Card>
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Avg points", "متوسط النقاط")}</p><p className="text-2xl font-bold">{summary.averagePointsPerCampaign.toLocaleString()}</p></CardContent></Card>
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Eligible (active)", "المؤهلون (نشطة)")}</p><p className="text-2xl font-bold">{summary.eligibleCustomers.toLocaleString()}</p></CardContent></Card>
                            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("Participation rate", "معدل المشاركة")}</p><p className="text-2xl font-bold">{(summary.participationRate * 100).toFixed(1)}%</p></CardContent></Card>
                        </div>
                    )}

                    <Card>
                        <CardContent className="pt-6">
                            {items.length === 0 ? (
                                <p className="py-8 text-center text-muted-foreground">{t("No campaigns.", "لا توجد حملات.")}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("Campaign", "الحملة")}</TableHead>
                                            <TableHead>{t("Type", "النوع")}</TableHead>
                                            <TableHead>{t("Status", "الحالة")}</TableHead>
                                            <TableHead className="text-end">{t("Audience", "الجمهور")}</TableHead>
                                            <TableHead className="text-end">{t("Participants", "المشاركون")}</TableHead>
                                            <TableHead className="text-end">{t("Points", "النقاط")}</TableHead>
                                            <TableHead className="text-end">{t("Conversion", "التحويل")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">{c.name}</TableCell>
                                                <TableCell>{t(...TYPE_LABELS[c.type])}</TableCell>
                                                <TableCell><Badge variant="secondary">{t(...STATUS_LABELS[c.status])}</Badge></TableCell>
                                                <TableCell className="text-end">{c.audienceSize.toLocaleString()}</TableCell>
                                                <TableCell className="text-end">{c.participants.toLocaleString()}</TableCell>
                                                <TableCell className="text-end">{c.pointsIssued.toLocaleString()}</TableCell>
                                                <TableCell className="text-end">{(c.conversionRate * 100).toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
