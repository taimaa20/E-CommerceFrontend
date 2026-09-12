"use client";

import { ShoppingCart, CheckCircle2, Package, DollarSign } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface StatsStripProps {
    total: number;
    ready: number;
    served: number;
    pendingRevenue: number;
    currency: string;
}

function formatAmount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    return n.toFixed(2);
}

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    iconBg: string;
    valueColor?: string;
    prefix?: string;
}

function StatCard({ label, value, icon, iconBg, valueColor = "text-[#111827]", prefix }: StatCardProps) {
    return (
        <div className="flex min-w-[130px] flex-1 items-center gap-3 rounded-xl border border-[#E4E6EA] bg-white px-4 py-3 sm:min-w-[160px]">
            <div className={`${iconBg} rounded-lg p-2 flex items-center justify-center flex-shrink-0`}>
                {icon}
            </div>
            <div className="min-w-0">
                <div className={`text-xl font-bold leading-tight ${valueColor}`}>
                    {prefix && <span className="text-sm font-semibold me-0.5">{prefix}</span>}
                    {value}
                </div>
                <div className="text-xs text-[#6B7280] mt-0.5 truncate">{label}</div>
            </div>
        </div>
    );
}

export function StatsStrip({ total, ready, served, pendingRevenue, currency }: StatsStripProps) {
    const { t } = useLocale()
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
                label={t("totalOrders")}
                value={total}
                icon={<ShoppingCart className="w-4 h-4 text-blue-600" />}
                iconBg="bg-blue-50"
                valueColor="text-blue-700"
            />
            <StatCard
                label={t("statusReady")}
                value={ready}
                icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                iconBg="bg-green-50"
                valueColor="text-green-700"
            />
            <StatCard
                label={t("statusServed")}
                value={served}
                icon={<Package className="w-4 h-4 text-purple-600" />}
                iconBg="bg-purple-50"
                valueColor="text-purple-700"
            />
            <StatCard
                label={t("pendingRevenue")}
                value={formatAmount(pendingRevenue)}
                prefix={currency}
                icon={<DollarSign className="w-4 h-4 text-orange-600" />}
                iconBg="bg-orange-50"
                valueColor="text-[#E8651A]"
            />
        </div>
    );
}
