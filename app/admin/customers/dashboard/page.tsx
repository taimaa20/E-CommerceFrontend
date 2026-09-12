"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
    Activity,
    BarChart3,
    Ban,
    CalendarPlus,
    Clock,
    Crown,
    Download,
    Eye,
    Filter,
    Percent,
    Phone,
    RefreshCw,
    Repeat,
    RotateCcw,
    Search,
    ShoppingBag,
    TrendingUp,
    UserCheck,
    UserRoundX,
    Users,
    WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerDetailsSheet } from "@/components/admin/CustomerDetailsSheet";
import { BranchFilter, BRANCH_FILTER_CURRENT } from "@/components/filters/BranchFilter";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import {
    CustomerTypeBadge,
    formatCustomerDate,
} from "@/components/admin/customer-management-shared";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import {
    CustomerManagementType,
    customerManagementApi,
    type CustomerAnalyticsCustomer,
    type CustomerAnalyticsPartnerOption,
    type CustomerAnalyticsQuery,
    type CustomerAnalyticsSnapshot,
} from "@/lib/api-customer-management";
import { useSettingsStore } from "@/store/settingsStore";

const CustomerAnalyticsCharts = dynamic(
    () => import("@/components/admin/CustomerAnalyticsCharts").then((module) => module.CustomerAnalyticsCharts),
    { ssr: false, loading: () => <ChartsSkeleton /> },
);

type DatePreset =
    | "today"
    | "yesterday"
    | "last7"
    | "last30"
    | "thisMonth"
    | "lastMonth"
    | "thisQuarter"
    | "lastQuarter"
    | "thisYear"
    | "custom";

interface DashboardFilters {
    datePreset: DatePreset;
    dateFrom: string;
    dateTo: string;
    branchId: string;
    customerType: "all" | "direct" | "partner";
    partner: string;
    status: "all" | "active" | "inactive";
    minOrders: string;
    maxOrders: string;
    minSpending: string;
    maxSpending: string;
    name: string;
    phone: string;
}

const ALL_PARTNERS = "all";
const DEFAULT_DATE_PRESET: DatePreset = "last30";
const MONEY_DECIMALS = 2;
const NUMBER_DECIMALS = 2;
const DEFAULT_PARTNERS: CustomerAnalyticsPartnerOption[] = [
    { name: "Talabat" },
    { name: "Jahez" },
    { name: "HungerStation" },
    { name: "Snunu" },
];

export default function CustomerAnalyticsDashboardPage() {
    const { isRtl } = useLocale();
    const currency = useSettingsStore((state) => state.settings.currency);
    const text = getDashboardText(isRtl);
    const [draftFilters, setDraftFilters] = useState<DashboardFilters>(() => createDefaultFilters());
    const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(() => createDefaultFilters());
    const [snapshot, setSnapshot] = useState<CustomerAnalyticsSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const partnerOptions = buildPartnerOptions(snapshot?.partnerOptions ?? []);
    const showPartnerFilter = draftFilters.customerType === "partner";
    const showBranchFilter = snapshot?.branchesEnabled === true;
    const branchVersion = useActiveBranchVersion();

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(false);
            try {
                const result = await customerManagementApi.dashboard(buildAnalyticsQuery(appliedFilters));
                if (!cancelled) setSnapshot(result);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [appliedFilters, branchVersion, reloadKey]);

    const applyFilters = () => {
        const validationError = validateFilters(draftFilters, text);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        setAppliedFilters({ ...draftFilters });
    };

    const resetFilters = () => {
        const nextFilters = createDefaultFilters();
        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                        <BarChart3 className="size-6 text-primary" />
                        {text.title}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{text.subtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {snapshot?.generatedAtUtc ? (
                        <span className="text-xs text-slate-500">
                            {text.lastUpdated}: {formatDateTime(snapshot.generatedAtUtc, isRtl)}
                        </span>
                    ) : null}
                    <Button variant="outline" className="gap-2" disabled>
                        <Download className="size-4" />
                        {text.export}
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setReloadKey((value) => value + 1)}
                        disabled={loading}
                    >
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                        {text.refresh}
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 bg-slate-50/95 py-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Filter className="size-4" />
                        {text.globalFilters}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <FilterSelect
                            label={text.dateRange}
                            value={draftFilters.datePreset}
                            onChange={(value) => setDraftFilters((current) =>
                                applyDatePreset(current, value as DatePreset))}
                        >
                            <SelectItem value="today">{text.today}</SelectItem>
                            <SelectItem value="yesterday">{text.yesterday}</SelectItem>
                            <SelectItem value="last7">{text.last7Days}</SelectItem>
                            <SelectItem value="last30">{text.last30Days}</SelectItem>
                            <SelectItem value="thisMonth">{text.thisMonth}</SelectItem>
                            <SelectItem value="lastMonth">{text.lastMonth}</SelectItem>
                            <SelectItem value="thisQuarter">{text.thisQuarter}</SelectItem>
                            <SelectItem value="lastQuarter">{text.lastQuarter}</SelectItem>
                            <SelectItem value="thisYear">{text.thisYear}</SelectItem>
                            <SelectItem value="custom">{text.customRange}</SelectItem>
                        </FilterSelect>
                        {draftFilters.datePreset === "custom" ? (
                            <>
                                <FilterInput
                                    label={text.dateFrom}
                                    value={draftFilters.dateFrom}
                                    type="date"
                                    onChange={(value) => setDraftFilters((current) => ({ ...current, dateFrom: value }))}
                                />
                                <FilterInput
                                    label={text.dateTo}
                                    value={draftFilters.dateTo}
                                    type="date"
                                    onChange={(value) => setDraftFilters((current) => ({ ...current, dateTo: value }))}
                                />
                            </>
                        ) : null}
                        {showBranchFilter ? (
                            <div className="flex items-end">
                                <BranchFilter
                                    value={draftFilters.branchId}
                                    onValueChange={(value) => setDraftFilters((current) => ({ ...current, branchId: value }))}
                                    hideWhenSingleBranch={false}
                                    className="w-full"
                                />
                            </div>
                        ) : null}
                        <FilterSelect
                            label={text.customerType}
                            value={draftFilters.customerType}
                            onChange={(value) => setDraftFilters((current) => ({
                                ...current,
                                customerType: value as DashboardFilters["customerType"],
                                partner: value === "partner" ? current.partner : ALL_PARTNERS,
                            }))}
                        >
                            <SelectItem value="all">{text.all}</SelectItem>
                            <SelectItem value="direct">{text.directCustomers}</SelectItem>
                            <SelectItem value="partner">{text.partnerCustomers}</SelectItem>
                        </FilterSelect>
                        {showPartnerFilter ? (
                            <FilterSelect
                                label={text.partner}
                                value={draftFilters.partner}
                                onChange={(value) => setDraftFilters((current) => ({ ...current, partner: value }))}
                            >
                                <SelectItem value={ALL_PARTNERS}>{text.allPartners}</SelectItem>
                                {partnerOptions.map((partner) => (
                                    <SelectItem key={partner.name} value={partner.name}>
                                        {(isRtl ? partner.nameAr : partner.name) || partner.name}
                                    </SelectItem>
                                ))}
                            </FilterSelect>
                        ) : null}
                        <FilterSelect
                            label={text.status}
                            value={draftFilters.status}
                            onChange={(value) => setDraftFilters((current) => ({
                                ...current,
                                status: value as DashboardFilters["status"],
                            }))}
                        >
                            <SelectItem value="all">{text.all}</SelectItem>
                            <SelectItem value="active">{text.active}</SelectItem>
                            <SelectItem value="inactive">{text.inactive}</SelectItem>
                        </FilterSelect>
                        <FilterInput
                            label={text.minOrders}
                            value={draftFilters.minOrders}
                            type="number"
                            onChange={(value) => setDraftFilters((current) => ({ ...current, minOrders: value }))}
                        />
                        <FilterInput
                            label={text.maxOrders}
                            value={draftFilters.maxOrders}
                            type="number"
                            onChange={(value) => setDraftFilters((current) => ({ ...current, maxOrders: value }))}
                        />
                        <FilterInput
                            label={text.minSpending}
                            value={draftFilters.minSpending}
                            type="number"
                            onChange={(value) => setDraftFilters((current) => ({ ...current, minSpending: value }))}
                        />
                        <FilterInput
                            label={text.maxSpending}
                            value={draftFilters.maxSpending}
                            type="number"
                            onChange={(value) => setDraftFilters((current) => ({ ...current, maxSpending: value }))}
                        />
                        <FilterInput
                            label={text.customerName}
                            value={draftFilters.name}
                            icon={Search}
                            onChange={(value) => setDraftFilters((current) => ({ ...current, name: value }))}
                        />
                        <FilterInput
                            label={text.phoneNumber}
                            value={draftFilters.phone}
                            icon={Phone}
                            onChange={(value) => setDraftFilters((current) => ({ ...current, phone: value }))}
                        />
                        <div className="flex items-end gap-2">
                            <Button className="flex-1" onClick={applyFilters}>{text.apply}</Button>
                            <Button variant="outline" onClick={resetFilters} className="gap-2">
                                <RotateCcw className="size-4" />
                                {text.reset}
                            </Button>
                            <Button variant="outline" size="icon" disabled title={text.export}>
                                <Download className="size-4" />
                                <span className="sr-only">{text.export}</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error ? (
                <ErrorState text={text} onRetry={() => setReloadKey((value) => value + 1)} />
            ) : snapshot && !loading && snapshot.summary.totalCustomers === 0 ? (
                <EmptyAnalytics text={text} onReset={resetFilters} />
            ) : (
                <>
                    <KpiGrid snapshot={snapshot} loading={loading} currency={currency} isRtl={isRtl} text={text} />

                    <CustomerInsights snapshot={snapshot} loading={loading} isRtl={isRtl} text={text} />

                    {snapshot ? (
                        <CustomerAnalyticsCharts snapshot={snapshot} isRtl={isRtl} />
                    ) : (
                        <ChartsSkeleton />
                    )}

                    <div className="grid gap-4 xl:grid-cols-2">
                        <CustomerTableCard
                            title={text.topCustomers}
                            description={text.topCustomersDesc}
                            customers={snapshot?.topCustomers ?? []}
                            loading={loading}
                            currency={currency}
                            isRtl={isRtl}
                            text={text}
                            onView={setSelectedCustomerId}
                        />
                        <CustomerTableCard
                            title={text.recentCustomers}
                            description={text.recentCustomersDesc}
                            customers={snapshot?.recentCustomers ?? []}
                            loading={loading}
                            currency={currency}
                            isRtl={isRtl}
                            text={text}
                            onView={setSelectedCustomerId}
                        />
                    </div>

                </>
            )}

            <CustomerDetailsSheet
                customerId={selectedCustomerId}
                branchId={appliedFilters.branchId || undefined}
                open={selectedCustomerId !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedCustomerId(null);
                }}
            />
        </div>
    );
}

function KpiGrid({
    snapshot,
    loading,
    currency,
    isRtl,
    text,
}: {
    snapshot: CustomerAnalyticsSnapshot | null;
    loading: boolean;
    currency: string;
    isRtl: boolean;
    text: DashboardText;
}) {
    const summary = snapshot?.summary;

    return (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label={text.kpis}>
            <KpiCard icon={Users} label={text.totalCustomers} value={formatMetric(summary?.totalCustomers, isRtl)} description={text.totalCustomersDesc} loading={loading} />
            <KpiCard icon={UserCheck} label={text.activeCustomers} value={formatMetric(summary?.activeCustomers, isRtl)} description={text.activeCustomersDesc} loading={loading} />
            <KpiCard icon={CalendarPlus} label={text.newCustomers} value={formatMetric(summary?.newCustomers, isRtl)} description={text.newCustomersDesc} change={formatPercent(summary?.customerGrowthPercent, isRtl)} loading={loading} />
            <KpiCard icon={Repeat} label={text.returningCustomers} value={formatMetric(summary?.returningCustomers, isRtl)} description={text.returningCustomersDesc} loading={loading} />
            <KpiCard icon={Ban} label={text.inactiveCustomers} value={formatMetric(summary?.inactiveCustomers, isRtl)} description={text.inactiveCustomersDesc} loading={loading} />
            <KpiCard icon={UserRoundX} label={text.lostCustomers} value={formatMetric(summary?.lostCustomers, isRtl)} description={text.lostCustomersDesc} loading={loading} />
            <KpiCard icon={Users} label={text.directCustomers} value={formatMetric(summary?.directCustomers, isRtl)} description={text.directCustomersDesc} loading={loading} />
            <KpiCard icon={Activity} label={text.partnerCustomers} value={formatMetric(summary?.partnerCustomers, isRtl)} description={text.partnerCustomersDesc} loading={loading} />
            <KpiCard icon={ShoppingBag} label={text.totalOrders} value={formatMetric(summary?.totalOrders, isRtl)} description={text.totalOrdersDesc} loading={loading} />
            <KpiCard icon={WalletCards} label={text.totalRevenue} value={formatCurrency(summary?.totalRevenue ?? 0, currency)} description={text.totalRevenueDesc} loading={loading} />
            <KpiCard icon={BarChart3} label={text.averageOrderValue} value={formatCurrency(summary?.averageOrderValue ?? 0, currency)} description={text.averageOrderValueDesc} loading={loading} />
            <KpiCard icon={WalletCards} label={text.averageCustomerSpend} value={formatCurrency(summary?.averageCustomerSpend ?? 0, currency)} description={text.averageCustomerSpendDesc} loading={loading} />
            <KpiCard icon={TrendingUp} label={text.averageOrders} value={formatDecimal(summary?.averageOrdersPerCustomer, isRtl)} description={text.averageOrdersDesc} loading={loading} />
            <KpiCard icon={Percent} label={text.customerGrowth} value={formatPercent(summary?.customerGrowthPercent, isRtl)} description={text.customerGrowthDesc} loading={loading} />
            <KpiCard icon={RefreshCw} label={text.retentionRate} value={formatPercent(summary?.retentionRatePercent, isRtl)} description={text.retentionRateDesc} loading={loading} />
        </section>
    );
}

function KpiCard({
    icon: Icon,
    label,
    value,
    description,
    change,
    loading,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    description: string;
    change?: string;
    loading: boolean;
}) {
    return (
        <Card className="py-0">
            <CardContent className="flex min-h-36 flex-col justify-between p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-500">{label}</div>
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                    </span>
                </div>
                {loading ? (
                    <div className="h-8 w-24 animate-pulse rounded-md bg-slate-100" />
                ) : (
                    <div>
                        <div className="text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
                        {change ? <div className="mt-1 text-xs font-medium text-emerald-600">{change}</div> : null}
                    </div>
                )}
                <p className="text-xs leading-5 text-slate-500">{description}</p>
            </CardContent>
        </Card>
    );
}

function CustomerInsights({
    snapshot,
    loading,
    isRtl,
    text,
}: {
    snapshot: CustomerAnalyticsSnapshot | null;
    loading: boolean;
    isRtl: boolean;
    text: DashboardText;
}) {
    const types = snapshot?.customerDistribution ?? [];
    const total = types.reduce((sum, item) => sum + item.value, 0);
    const insights = snapshot?.insights;

    return (
        <section className="grid gap-4 xl:grid-cols-4" aria-label={text.customerInsights}>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">{text.customerInsights}</CardTitle>
                    <CardDescription>{text.customerMix}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading ? <ListSkeleton rows={2} /> : types.map((item) => (
                        <BreakdownBar
                            key={item.label}
                            label={(isRtl ? item.labelAr : item.label) || item.label}
                            value={item.value}
                            total={total}
                            isRtl={isRtl}
                        />
                    ))}
                </CardContent>
            </Card>
            <InsightTile
                icon={Crown}
                label={text.highestSpendingCustomer}
                value={insights?.highestSpendingCustomer?.displayName ?? "-"}
                description={formatDecimal(insights?.highestSpendingCustomer?.totalSpending, isRtl)}
                loading={loading}
            />
            <InsightTile
                icon={ShoppingBag}
                label={text.mostFrequentCustomer}
                value={insights?.mostFrequentCustomer?.displayName ?? "-"}
                description={`${formatMetric(insights?.mostFrequentCustomer?.totalOrders, isRtl)} ${text.orders}`}
                loading={loading}
            />
            <InsightTile
                icon={Activity}
                label={text.mostActivePartner}
                value={(isRtl ? insights?.mostActivePartner?.nameAr : insights?.mostActivePartner?.name) || insights?.mostActivePartner?.name || "-"}
                description={text.mostActivePartnerDesc}
                loading={loading}
            />
            <InsightTile
                icon={Clock}
                label={text.averageTimeBetweenOrders}
                value={formatDecimal(insights?.averageDaysBetweenOrders, isRtl)}
                description={text.days}
                loading={loading}
            />
        </section>
    );
}

function InsightTile({
    icon: Icon,
    label,
    value,
    description,
    loading,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    description: string;
    loading: boolean;
}) {
    return (
        <Card>
            <CardContent className="flex min-h-36 flex-col justify-between p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Icon className="size-4 text-primary" />
                    {label}
                </div>
                {loading ? <div className="h-8 w-24 animate-pulse rounded-md bg-slate-100" /> : (
                    <div className="text-3xl font-semibold tabular-nums text-slate-900">{value}</div>
                )}
                <p className="text-sm text-slate-500">{description}</p>
            </CardContent>
        </Card>
    );
}

function BreakdownBar({
    label,
    value,
    total,
    isRtl,
}: {
    label: string;
    value: number;
    total: number;
    isRtl: boolean;
}) {
    const width = total === 0 ? "0%" : `${Math.round((value / total) * 100)}%`;
    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <span className="text-slate-500">{formatMetric(value, isRtl)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary" style={{ width }} />
            </div>
        </div>
    );
}

function CustomerTableCard({
    title,
    description,
    customers,
    loading,
    currency,
    isRtl,
    text,
    onView,
}: {
    title: string;
    description: string;
    customers: CustomerAnalyticsCustomer[];
    loading: boolean;
    currency: string;
    isRtl: boolean;
    text: DashboardText;
    onView: (customerId: string) => void;
}) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <ListSkeleton rows={6} /> : customers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">{text.noCustomerData}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{text.customer}</TableHead>
                                    <TableHead>{text.orders}</TableHead>
                                    <TableHead>{text.totalSpending}</TableHead>
                                    <TableHead>{text.averageOrderValue}</TableHead>
                                    <TableHead>{text.lastOrder}</TableHead>
                                    <TableHead>{text.type}</TableHead>
                                    <TableHead className="text-end">{text.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.map((customer) => (
                                    <TableRow
                                        key={customer.id}
                                        className="cursor-pointer"
                                        onClick={() => onView(customer.id)}
                                    >
                                        <TableCell>
                                            <CustomerIdentity customer={customer} />
                                        </TableCell>
                                        <TableCell>{formatMetric(customer.totalOrders, isRtl)}</TableCell>
                                        <TableCell>{formatCurrency(customer.totalSpending, currency)}</TableCell>
                                        <TableCell>{formatCurrency(customer.averageOrderValue, currency)}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {formatCustomerDate(customer.lastOrderDate, isRtl)}
                                        </TableCell>
                                        <TableCell><CustomerTypeBadge type={customer.customerType} isRtl={isRtl} /></TableCell>
                                        <TableCell className="text-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onView(customer.id);
                                                }}
                                            >
                                                <Eye className="size-4" />
                                                {text.viewDetails}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function CustomerIdentity({ customer }: { customer: CustomerAnalyticsCustomer }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <CustomerAvatar name={customer.displayName} />
            <div className="min-w-0">
                <div className="truncate font-semibold text-slate-900">{customer.displayName}</div>
                <div className="truncate text-xs text-slate-500" dir="ltr">{customer.phoneNumber}</div>
            </div>
        </div>
    );
}

function CustomerAvatar({ name }: { name: string }) {
    return (
        <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}

function FilterInput({
    label,
    value,
    onChange,
    type = "text",
    icon: Icon,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "date" | "number";
    icon?: LucideIcon;
}) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            <div className="relative mt-1">
                {Icon ? <Icon className="absolute start-2.5 top-2.5 size-4 text-slate-400" /> : null}
                <Input
                    type={type}
                    min={type === "number" ? 0 : undefined}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className={Icon ? "ps-8" : undefined}
                />
            </div>
        </div>
    );
}

function FilterSelect({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{children}</SelectContent>
            </Select>
        </div>
    );
}

function EmptyAnalytics({ text, onReset }: { text: DashboardText; onReset: () => void }) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="size-8" />
                </div>
                <div className="text-lg font-semibold text-slate-900">{text.noCustomerData}</div>
                <p className="mt-1 text-sm text-slate-500">{text.noCustomerDataDesc}</p>
                <Button className="mt-5 gap-2" onClick={onReset}>
                    <RotateCcw className="size-4" />
                    {text.resetFilters}
                </Button>
            </CardContent>
        </Card>
    );
}

function ErrorState({ text, onRetry }: { text: DashboardText; onRetry: () => void }) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                <div className="text-sm font-medium text-destructive">{text.loadError}</div>
                <Button variant="outline" onClick={onRetry}>{text.retry}</Button>
            </CardContent>
        </Card>
    );
}

function ChartsSkeleton() {
    return (
        <section className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                    <CardContent className="p-4">
                        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-100" />
                        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
                    </CardContent>
                </Card>
            ))}
        </section>
    );
}

function ListSkeleton({ rows }: { rows: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
        </div>
    );
}

function createDefaultFilters(): DashboardFilters {
    return applyDatePreset({
        datePreset: DEFAULT_DATE_PRESET,
        dateFrom: "",
        dateTo: "",
        branchId: BRANCH_FILTER_CURRENT,
        customerType: "all",
        partner: ALL_PARTNERS,
        status: "all",
        minOrders: "",
        maxOrders: "",
        minSpending: "",
        maxSpending: "",
        name: "",
        phone: "",
    }, DEFAULT_DATE_PRESET);
}

function applyDatePreset(filters: DashboardFilters, preset: DatePreset): DashboardFilters {
    if (preset === "custom") return { ...filters, datePreset: preset };
    const range = getPresetRange(preset);
    return {
        ...filters,
        datePreset: preset,
        dateFrom: formatDateInput(range.from),
        dateTo: formatDateInput(range.to),
    };
}

function getPresetRange(preset: DatePreset) {
    const today = startOfDay(new Date());
    if (preset === "today") return { from: today, to: today };
    if (preset === "yesterday") return { from: addDays(today, -1), to: addDays(today, -1) };
    if (preset === "last7") return { from: addDays(today, -6), to: today };
    if (preset === "thisMonth") return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    if (preset === "lastMonth") {
        const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return { from, to: new Date(today.getFullYear(), today.getMonth(), 0) };
    }
    if (preset === "thisQuarter") return getQuarterRange(today, 0);
    if (preset === "lastQuarter") return getQuarterRange(today, -1);
    if (preset === "thisYear") return { from: new Date(today.getFullYear(), 0, 1), to: today };
    return { from: addDays(today, -29), to: today };
}

function getQuarterRange(today: Date, offset: number) {
    const currentQuarter = Math.floor(today.getMonth() / 3) + offset;
    const from = new Date(today.getFullYear(), currentQuarter * 3, 1);
    const to = offset === 0 ? today : new Date(today.getFullYear(), currentQuarter * 3 + 3, 0);
    return { from, to };
}

function buildAnalyticsQuery(filters: DashboardFilters): CustomerAnalyticsQuery {
    return {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        // "" (current branch) → omit so the backend defaults to the active branch;
        // BRANCH_FILTER_ALL is the empty guid the backend reads as all-branches scope.
        branchId: filters.branchId || undefined,
        customerType: getCustomerTypeFilter(filters.customerType),
        partner: filters.customerType === "partner" && filters.partner !== ALL_PARTNERS ? filters.partner : undefined,
        isActive: filters.status === "all" ? undefined : filters.status === "active",
        minOrders: parseOptionalInteger(filters.minOrders),
        maxOrders: parseOptionalInteger(filters.maxOrders),
        minSpending: parseOptionalDecimal(filters.minSpending),
        maxSpending: parseOptionalDecimal(filters.maxSpending),
        name: filters.name.trim() || undefined,
        phone: filters.phone.trim() || undefined,
    };
}

function getCustomerTypeFilter(value: DashboardFilters["customerType"]) {
    if (value === "direct") return CustomerManagementType.Direct;
    if (value === "partner") return CustomerManagementType.Partner;
    return undefined;
}

function validateFilters(filters: DashboardFilters, text: DashboardText) {
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) return text.invalidDateRange;
    const minOrders = parseOptionalInteger(filters.minOrders);
    const maxOrders = parseOptionalInteger(filters.maxOrders);
    if (minOrders !== undefined && maxOrders !== undefined && minOrders > maxOrders) return text.invalidOrderRange;
    const minSpending = parseOptionalDecimal(filters.minSpending);
    const maxSpending = parseOptionalDecimal(filters.maxSpending);
    if (minSpending !== undefined && maxSpending !== undefined && minSpending > maxSpending) return text.invalidSpendingRange;
    return "";
}

function buildPartnerOptions(options: CustomerAnalyticsPartnerOption[]) {
    const byName = new Map<string, CustomerAnalyticsPartnerOption>();
    [...DEFAULT_PARTNERS, ...options].forEach((option) => {
        if (option.name.trim()) byName.set(option.name, option);
    });
    return [...byName.values()].sort((first, second) => first.name.localeCompare(second.name));
}

function parseOptionalInteger(value: string) {
    if (!value.trim()) return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalDecimal(value: string) {
    if (!value.trim()) return undefined;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function startOfDay(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number) {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
}

function formatDateInput(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatMetric(value: number | null | undefined, isRtl: boolean) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat(isRtl ? "ar-QA" : "en-US").format(value);
}

function formatDecimal(value: number | null | undefined, isRtl: boolean) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat(isRtl ? "ar-QA" : "en-US", {
        maximumFractionDigits: NUMBER_DECIMALS,
        minimumFractionDigits: value % 1 === 0 ? 0 : MONEY_DECIMALS,
    }).format(value);
}

function formatPercent(value: number | null | undefined, isRtl: boolean) {
    if (value === null || value === undefined) return "-";
    return `${formatDecimal(value, isRtl)}%`;
}

function formatDateTime(value: string, isRtl: boolean) {
    return new Intl.DateTimeFormat(isRtl ? "ar-QA" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

function getDashboardText(isRtl: boolean) {
    return {
        title: isRtl ? "لوحة تحليلات العملاء" : "Customer Analytics Dashboard",
        subtitle: isRtl ? "رؤى العملاء والولاء ونشاط الطلبات" : "Customer behavior, loyalty, and order activity insights",
        lastUpdated: isRtl ? "آخر تحديث" : "Last Updated",
        globalFilters: isRtl ? "عوامل التصفية العامة" : "Global Filters",
        dateRange: isRtl ? "نطاق التاريخ" : "Date Range",
        today: isRtl ? "اليوم" : "Today",
        yesterday: isRtl ? "أمس" : "Yesterday",
        last7Days: isRtl ? "آخر 7 أيام" : "Last 7 Days",
        last30Days: isRtl ? "آخر 30 يوماً" : "Last 30 Days",
        thisMonth: isRtl ? "هذا الشهر" : "This Month",
        lastMonth: isRtl ? "الشهر الماضي" : "Last Month",
        thisQuarter: isRtl ? "هذا الربع" : "This Quarter",
        lastQuarter: isRtl ? "الربع الماضي" : "Last Quarter",
        thisYear: isRtl ? "هذا العام" : "This Year",
        customRange: isRtl ? "نطاق مخصص" : "Custom Date Range",
        dateFrom: isRtl ? "من" : "From",
        dateTo: isRtl ? "إلى" : "To",
        branch: isRtl ? "الفرع" : "Branch",
        allBranches: isRtl ? "كل الفروع" : "All Branches",
        customerType: isRtl ? "نوع العميل" : "Customer Type",
        all: isRtl ? "الكل" : "All",
        directCustomers: isRtl ? "عملاء مباشرون" : "Direct Customers",
        partnerCustomers: isRtl ? "عملاء الشركاء" : "Partner Customers",
        partner: isRtl ? "الشريك" : "Partner",
        allPartners: isRtl ? "كل الشركاء" : "All Partners",
        status: isRtl ? "الحالة" : "Status",
        active: isRtl ? "نشط" : "Active",
        inactive: isRtl ? "غير نشط" : "Inactive",
        minOrders: isRtl ? "أقل عدد طلبات" : "Minimum Orders",
        maxOrders: isRtl ? "أعلى عدد طلبات" : "Maximum Orders",
        minSpending: isRtl ? "أقل إنفاق" : "Minimum Spending",
        maxSpending: isRtl ? "أعلى إنفاق" : "Maximum Spending",
        customerName: isRtl ? "اسم العميل" : "Customer Name",
        phoneNumber: isRtl ? "رقم الهاتف" : "Phone Number",
        apply: isRtl ? "تطبيق" : "Apply",
        reset: isRtl ? "إعادة ضبط" : "Reset",
        export: isRtl ? "تصدير" : "Export",
        refresh: isRtl ? "تحديث" : "Refresh",
        kpis: isRtl ? "مؤشرات العملاء" : "Customer KPIs",
        totalCustomers: isRtl ? "إجمالي العملاء" : "Total Customers",
        totalCustomersDesc: isRtl ? "كل العملاء ضمن عوامل التصفية" : "All customers in the selected filter",
        activeCustomers: isRtl ? "العملاء النشطون" : "Active Customers",
        activeCustomersDesc: isRtl ? "عملاء لديهم نشاط حديث" : "Customers with recent activity",
        newCustomers: isRtl ? "عملاء جدد" : "New Customers",
        newCustomersDesc: isRtl ? "انضموا خلال الفترة المحددة" : "Joined during the selected period",
        inactiveCustomers: isRtl ? "عملاء غير نشطين" : "Inactive Customers",
        inactiveCustomersDesc: isRtl ? "لا يملكون طلبات أو غير مفعّلين" : "No orders or not active",
        lostCustomers: isRtl ? "عملاء مفقودون" : "Lost Customers",
        lostCustomersDesc: isRtl ? "لا يوجد طلب منذ أكثر من 90 يوماً" : "No order in 90+ days",
        directCustomersDesc: isRtl ? "عملاء من القنوات المباشرة" : "Customers from direct channels",
        partnerCustomersDesc: isRtl ? "عملاء مرتبطون بشركاء التوصيل" : "Customers linked to delivery partners",
        totalOrders: isRtl ? "إجمالي الطلبات" : "Total Orders",
        totalOrdersDesc: isRtl ? "طلبات العملاء ضمن الفترة" : "Customer orders in the period",
        totalRevenue: isRtl ? "إجمالي الإيرادات" : "Total Revenue",
        totalRevenueDesc: isRtl ? "إيرادات الطلبات المدفوعة والمكتملة" : "Revenue from paid and completed orders",
        averageOrderValue: isRtl ? "متوسط قيمة الطلب" : "Average Order Value",
        averageOrderValueDesc: isRtl ? "إجمالي الإيراد مقسوماً على الطلبات" : "Revenue divided by orders",
        averageCustomerSpend: isRtl ? "متوسط إنفاق العميل" : "Average Customer Spend",
        averageCustomerSpendDesc: isRtl ? "متوسط الإنفاق لكل عميل" : "Average spend per customer",
        averageOrders: isRtl ? "متوسط الطلبات لكل عميل" : "Average Orders Per Customer",
        averageOrdersDesc: isRtl ? "عدد الطلبات لكل عميل" : "Orders per customer",
        customerGrowth: isRtl ? "نمو العملاء %" : "Customer Growth %",
        customerGrowthDesc: isRtl ? "مقارنة بالفترة السابقة" : "Compared with the previous period",
        retentionRate: isRtl ? "معدل الاحتفاظ %" : "Retention Rate %",
        retentionRateDesc: isRtl ? "نسبة العملاء العائدين" : "Returning customer share",
        averageSpending: isRtl ? "متوسط الإنفاق" : "Average Spending",
        returningCustomers: isRtl ? "عملاء عائدون" : "Returning Customers",
        customerInsights: isRtl ? "رؤى العملاء" : "Customer Insights",
        customerMix: isRtl ? "توزيع العملاء حسب النوع" : "Customer mix by type",
        returningCustomersDesc: isRtl ? "عملاء لديهم طلبان أو أكثر" : "Customers with two or more orders",
        averageSpendingDesc: isRtl ? "متوسط الإنفاق لكل عميل" : "Average spend per customer",
        highestSpendingCustomer: isRtl ? "أعلى عميل إنفاقاً" : "Highest Spending Customer",
        mostFrequentCustomer: isRtl ? "الأكثر طلباً" : "Most Frequent Customer",
        mostActivePartner: isRtl ? "الشريك الأكثر نشاطاً" : "Most Active Partner",
        mostActivePartnerDesc: isRtl ? "حسب نشاط العملاء المرتبطين بالشريك" : "By linked partner customer activity",
        averageTimeBetweenOrders: isRtl ? "متوسط الوقت بين الطلبات" : "Average Time Between Orders",
        days: isRtl ? "أيام" : "days",
        topCustomers: isRtl ? "أفضل العملاء" : "Top Customers",
        topCustomersDesc: isRtl ? "أعلى العملاء حسب الإنفاق والطلبات" : "Highest customers by spend and orders",
        recentCustomers: isRtl ? "العملاء الجدد" : "Recent Customers",
        recentCustomersDesc: isRtl ? "أحدث العملاء ضمن الفترة المحددة" : "Newest customers in the selected period",
        customer: isRtl ? "العميل" : "Customer",
        orders: isRtl ? "الطلبات" : "Orders",
        totalSpending: isRtl ? "إجمالي الإنفاق" : "Total Spending",
        lastOrder: isRtl ? "آخر طلب" : "Last Order",
        type: isRtl ? "النوع" : "Type",
        actions: isRtl ? "الإجراءات" : "Actions",
        viewDetails: isRtl ? "عرض التفاصيل" : "View Details",
        noCustomerData: isRtl ? "لا توجد بيانات عملاء لعوامل التصفية المحددة." : "No customer data found for the selected filters.",
        noCustomerDataDesc: isRtl ? "جرّب نطاقاً زمنياً أو عوامل تصفية مختلفة." : "Try a different date range or filters.",
        resetFilters: isRtl ? "إعادة ضبط عوامل التصفية" : "Reset Filters",
        loadError: isRtl ? "تعذر تحميل لوحة تحليلات العملاء." : "Could not load the customer analytics dashboard.",
        retry: isRtl ? "إعادة المحاولة" : "Retry",
        invalidDateRange: isRtl ? "يجب ألا يكون تاريخ البداية بعد تاريخ النهاية." : "Date from cannot be after date to.",
        invalidOrderRange: isRtl ? "أقل عدد طلبات لا يمكن أن يتجاوز أعلى عدد." : "Minimum orders cannot be greater than maximum orders.",
        invalidSpendingRange: isRtl ? "أقل إنفاق لا يمكن أن يتجاوز أعلى إنفاق." : "Minimum spending cannot be greater than maximum spending.",
    };
}

type DashboardText = ReturnType<typeof getDashboardText>;
