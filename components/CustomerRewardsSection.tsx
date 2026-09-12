"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/locale-provider";
import { generateUUID } from "@/lib/uuid";
import { RewardType, rewardsApi, type Reward } from "@/lib/api-marketing";

/**
 * Read-only reward catalog + one-tap redemption for the customer currently selected in POS.
 * Purely additive: redeeming deducts points via the loyalty API and surfaces the resulting
 * benefit as a toast — the cashier then applies it through the existing discount mechanism.
 * Does NOT modify the cart, order, or checkout flow.
 */
export default function CustomerRewardsSection({
    customerId,
    availablePoints,
}: {
    customerId: string;
    availablePoints: number;
}) {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const t = (en: string, arr: string) => (ar ? arr : en);

    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeemingId, setRedeemingId] = useState<string | null>(null);
    const [orderTotals, setOrderTotals] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            try {
                const data = await rewardsApi.catalog();
                if (!cancelled) setRewards(data);
            } catch {
                if (!cancelled) setRewards([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const redeem = async (r: Reward) => {
        const needsTotal = r.type === RewardType.PercentageDiscount;
        const orderTotal = needsTotal ? Number(orderTotals[r.id]) : undefined;
        if (needsTotal && !orderTotal) {
            toast.error(t("Enter the order total first.", "أدخل إجمالي الطلب أولًا."));
            return;
        }
        setRedeemingId(r.id);
        try {
            const res = await rewardsApi.redeem(r.id, { customerId, orderTotal: orderTotal ?? null, idempotencyKey: generateUUID() });
            toast.success(res.message);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Redemption failed", "فشل الاستبدال"));
        } finally {
            setRedeemingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-3 text-xs text-slate-400">
                <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" /> {t("Loading rewards…", "جارٍ تحميل المكافآت…")}
            </div>
        );
    }
    if (rewards.length === 0) return null;

    return (
        <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Gift className="h-4 w-4 text-primary" />
                {t("Rewards", "المكافآت")}
            </h4>
            <div className="space-y-2">
                {rewards.map((r) => {
                    const affordable = availablePoints >= r.pointsRequired;
                    const needsTotal = r.type === RewardType.PercentageDiscount;
                    return (
                        <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                            <div className="min-w-0">
                                <p className="truncate font-medium">{ar ? r.nameAr || r.name : r.name}</p>
                                <p className="text-xs text-slate-400">{r.pointsRequired.toLocaleString()} {t("points", "نقطة")}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {needsTotal && (
                                    <Input
                                        type="number"
                                        placeholder={t("Total", "الإجمالي")}
                                        value={orderTotals[r.id] ?? ""}
                                        onChange={(e) => setOrderTotals((s) => ({ ...s, [r.id]: e.target.value }))}
                                        className="h-8 w-20"
                                    />
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!affordable || redeemingId === r.id}
                                    onClick={() => redeem(r)}
                                >
                                    {redeemingId === r.id
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : affordable ? t("Redeem", "استبدال") : t("Low pts", "نقاط غير كافية")}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
