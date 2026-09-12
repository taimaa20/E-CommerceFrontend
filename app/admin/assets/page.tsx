"use client";

import { useEffect } from "react";
import type React from "react";
import Link from "next/link";
import { BarChart3, Boxes, FileSpreadsheet, Plus, Wrench } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { useAssetsStore } from "@/store/assetsStore";
import { formatMoney, tx, useAssetCurrency } from "@/components/assets/asset-shared";

export default function AssetsDashboardPage() {
    const { isRtl } = useLocale();
    const { dashboard, dashboardLoading, fetchDashboard } = useAssetsStore();
    const currency = useAssetCurrency();

    const branchVersion = useActiveBranchVersion();

    useEffect(() => {
        void fetchDashboard();
    }, [branchVersion, fetchDashboard]);

    const kpis = [
        { label: tx(isRtl, "totalAssets"), value: dashboard?.totalAssets ?? "-", icon: Boxes },
        { label: tx(isRtl, "activeAssets"), value: dashboard?.activeAssets ?? "-", icon: BarChart3 },
        { label: tx(isRtl, "inMaintenance"), value: dashboard?.assetsInMaintenance ?? "-", icon: Wrench },
        { label: tx(isRtl, "damagedAssets"), value: dashboard?.damagedAssets ?? "-", icon: FileSpreadsheet },
        { label: tx(isRtl, "expiringWarranties"), value: dashboard?.expiringWarranties ?? "-", icon: FileSpreadsheet },
        { label: tx(isRtl, "assetValue"), value: formatMoney(dashboard?.assetValue ?? null, currency), icon: Boxes },
        { label: tx(isRtl, "monthMaintenance"), value: formatMoney(dashboard?.maintenanceCostThisMonth ?? null, currency), icon: Wrench },
    ];

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                        <Boxes className="size-6" />
                        {tx(isRtl, "dashboard")}
                    </h1>
                    <p className="text-sm text-slate-500">
                        {isRtl ? "مركز مراقبة الأصول، الضمانات، الصيانة، والقيمة الدفترية." : "Asset health, warranty exposure, maintenance cost, and register control."}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/ntxadminpos/assets/list">
                        <Button variant="outline">{tx(isRtl, "list")}</Button>
                    </Link>
                    <Link href="/ntxadminpos/assets/new">
                        <Button className="gap-2"><Plus className="size-4" />{tx(isRtl, "newAsset")}</Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                    <Card key={kpi.label} className="rounded-md">
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <div className="text-xs font-medium uppercase text-slate-500">{kpi.label}</div>
                                <div className="mt-1 text-2xl font-semibold text-slate-900">{dashboardLoading ? "..." : kpi.value}</div>
                            </div>
                            <div className="rounded-md bg-slate-100 p-2 text-slate-600">
                                <kpi.icon className="size-5" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartCard title={tx(isRtl, "byCategory")}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={dashboard?.assetsByCategory ?? []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {(dashboard?.assetsByCategory ?? []).map((row, index) => (
                                    <Cell key={`${row.label}-${index}`} fill={row.color || "#2563eb"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title={tx(isRtl, "byStatus")}>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={dashboard?.assetsByStatus ?? []} dataKey="value" nameKey="label" innerRadius={60} outerRadius={100} paddingAngle={2}>
                                {(dashboard?.assetsByStatus ?? []).map((row, index) => (
                                    <Cell key={`${row.label}-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title={tx(isRtl, "maintenanceTrend")}>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={dashboard?.maintenanceTrend ?? []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title={tx(isRtl, "costTrend")}>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={dashboard?.assetCostTrend ?? []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}

const STATUS_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#64748b", "#71717a", "#78716c", "#0ea5e9"];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card className="rounded-md">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}
