"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import AccountLayout from "@/components/showcase/account/AccountLayout";
import {
    customerAccountApi,
    type CustomerLoyaltyTransaction,
    type CustomerLoyaltyWallet,
} from "@/lib/api-customer-account";
import { formatCustomerOrderDate } from "@/lib/customer-order-labels";

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, [string, string]> = {
    Earn: ["Earned", "مكتسبة"],
    EarnPendingApproved: ["Earned (pending)", "مكتسبة (معلقة)"],
    Redeem: ["Redeemed", "مستبدلة"],
    Expire: ["Expired", "منتهية"],
    ReverseEarn: ["Reversed (refund)", "معكوسة (استرداد)"],
    ReverseRedeem: ["Redemption reversed", "استبدال معكوس"],
    Adjust: ["Adjustment", "تعديل"],
    CampaignBonus: ["Campaign bonus", "مكافأة حملة"],
    ReferralBonus: ["Referral bonus", "مكافأة إحالة"],
};

export default function AccountPointsPage() {
    return <AccountLayout>{isAr => <Points isAr={isAr} />}</AccountLayout>;
}

/**
 * The signed-in customer's own points: the balance and the ledger that explains it. Both come
 * from the account token alone — nothing here names a customer.
 */
function Points({ isAr }: { isAr: boolean }) {
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const [revision, setRevision] = useState(0);
    const [loaded, setLoaded] = useState<{
        revision: number;
        wallet: CustomerLoyaltyWallet | null;
        rows: CustomerLoyaltyTransaction[];
        total: number;
        page: number;
    } | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        let cancelled = false;
        Promise.all([customerAccountApi.getLoyaltyWallet(), customerAccountApi.getLoyaltyTransactions(1, PAGE_SIZE)])
            .then(([balance, history]) => {
                if (!cancelled) setLoaded({ revision, wallet: balance, rows: history.items, total: history.totalCount, page: 1 });
            })
            .catch(() => { if (!cancelled) setLoaded({ revision, wallet: null, rows: [], total: 0, page: 1 }); });
        return () => { cancelled = true; };
    }, [revision]);

    const loadMore = async () => {
        if (!loaded) return;
        setLoadingMore(true);
        try {
            const next = await customerAccountApi.getLoyaltyTransactions(loaded.page + 1, PAGE_SIZE);
            setLoaded(current => current && { ...current, rows: [...current.rows, ...next.items], page: current.page + 1 });
        } catch {
            toast.error(t("Could not load more history", "تعذر تحميل المزيد"));
        } finally {
            setLoadingMore(false);
        }
    };

    const state = loaded?.revision !== revision ? "loading" : loaded.wallet ? "ready" : "error";
    const wallet = loaded?.wallet ?? null;
    const rows = loaded?.rows ?? [];
    const total = loaded?.total ?? 0;

    if (state === "loading") {
        return (
            <div role="status">
                <span className="sr-only">{t("Loading points", "جارٍ تحميل النقاط")}</span>
                <div className="sf-skel h-28 w-full rounded-[12px]" />
                <div className="sf-skel mt-4 h-48 w-full rounded-[12px]" />
            </div>
        );
    }

    if (state === "error" || !wallet) {
        return (
            <div role="alert" className="sf-empty">
                <p className="font-semibold">{t("Could not load your points", "تعذر تحميل نقاطك")}</p>
                <button type="button" onClick={() => setRevision(v => v + 1)} className="sf-btn sf-btn--outline mt-5">
                    <RefreshCw className="size-4" />
                    {t("Try again", "إعادة المحاولة")}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="sf-card p-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="size-4" />
                    <span className="text-sm">{t("Available points", "النقاط المتاحة")}</span>
                </div>
                <p className="mt-1 text-3xl font-semibold tabular-nums" dir="ltr">{wallet.availablePoints.toLocaleString()}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <Figure label={t("Pending", "معلقة")} value={wallet.pendingPoints} />
                    <Figure label={t("Earned to date", "المكتسبة حتى الآن")} value={wallet.lifetimePoints} />
                    <Figure label={t("Redeemed", "المستبدلة")} value={wallet.redeemedPoints} />
                    <div>
                        <dt className="sf-meta">{t("Tier", "المستوى")}</dt>
                        <dd className="font-medium">{isAr ? wallet.tierAr || wallet.tier : wallet.tier}</dd>
                    </div>
                </dl>
                <p className="sf-meta mt-4">
                    {t("Points are added when an order is paid, and taken back if it is refunded.",
                        "تُضاف النقاط عند دفع الطلب، وتُسترجع إذا تم استرداده.")}
                </p>
            </div>

            <div className="sf-card p-5">
                <h2 className="font-semibold">{t("Points history", "سجل النقاط")}</h2>
                {rows.length === 0 ? (
                    <p className="sf-meta mt-3">{t("No points yet. Place an order to start earning.", "لا توجد نقاط بعد. اطلب لتبدأ بالكسب.")}</p>
                ) : (
                    <ul className="mt-3 divide-y">
                        {rows.map(row => (
                            <li key={row.id} className="flex items-start justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <p className="font-medium">{t(...(TYPE_LABELS[row.type] ?? [row.type, row.type]))}</p>
                                    <p className="sf-meta">
                                        {formatCustomerOrderDate(row.createdAt, isAr)}
                                        {row.orderId && row.orderNumber && (
                                            <>
                                                {" · "}
                                                <Link href={`/shop/account/orders/${row.orderId}`} className="underline" dir="ltr">
                                                    #{row.orderNumber}
                                                </Link>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="shrink-0 text-end">
                                    <p className={`font-semibold tabular-nums ${row.points < 0 ? "text-destructive" : "text-emerald-700"}`} dir="ltr">
                                        {row.points > 0 ? "+" : ""}{row.points.toLocaleString()}
                                    </p>
                                    <p className="sf-meta tabular-nums" dir="ltr">{t("Balance", "الرصيد")} {row.balanceAfter.toLocaleString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {rows.length < total && (
                    <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="sf-btn sf-btn--outline mt-4 w-full">
                        {t("Show more", "عرض المزيد")}
                    </button>
                )}
            </div>
        </div>
    );
}

function Figure({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <dt className="sf-meta">{label}</dt>
            <dd className="font-medium tabular-nums" dir="ltr">{value.toLocaleString()}</dd>
        </div>
    );
}
