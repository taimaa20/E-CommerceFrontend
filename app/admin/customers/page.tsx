"use client";

import { useEffect, useState } from "react";
import {
    Activity,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    BarChart3,
    Building2,
    CalendarDays,
    CalendarPlus,
    Eye,
    Filter,
    LayoutGrid,
    List,
    Mail,
    Phone,
    PieChart,
    ReceiptText,
    RefreshCw,
    Search,
    TrendingUp,
    Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { BranchFilter, BRANCH_FILTER_CURRENT } from "@/components/filters/BranchFilter";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { CustomerDetailsSheet } from "@/components/admin/CustomerDetailsSheet";
import {
    CustomerActiveBadge,
    CustomerTypeBadge,
    formatCustomerDate,
    getCustomerManagementText,
} from "@/components/admin/customer-management-shared";
import {
    CustomerManagementType,
    CustomerSortDirection,
    CustomerSortField,
    customerManagementApi,
    type CustomerManagementListItem,
    type CustomerManagementQuery,
} from "@/lib/api-customer-management";

interface FilterDraft {
    name: string;
    phone: string;
    partner: string;
    customerType: "all" | "direct" | "partner";
    status: "all" | "active" | "inactive";
    dateFrom: string;
    dateTo: string;
    /** "" = current branch (backend default), empty guid = all branches, otherwise a branch id. */
    branchId: string;
}

type CustomerViewMode = "table" | "cards";

interface CustomerDashboardStats {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number | null;
    partnerCustomers: number;
    directCustomers: number;
    totalOrders: number;
    averageOrders: number;
    topCustomers: CustomerManagementListItem[];
    activeToday: number;
    activeThisMonth: number;
    inactive30Days: number;
    inactive90Days: number;
}

const DEFAULT_PAGE_SIZE = 25;
const TABLE_VIEW: CustomerViewMode = "table";
const CARD_VIEW: CustomerViewMode = "cards";
const TOP_CUSTOMER_LIMIT = 5;
const INACTIVE_30_DAYS = 30;
const INACTIVE_90_DAYS = 90;
const PERCENT_DECIMALS = 0;
const AVERAGE_DECIMALS = 1;
const EMPTY_FILTERS: FilterDraft = {
    name: "",
    phone: "",
    partner: "",
    customerType: "all",
    status: "all",
    dateFrom: "",
    dateTo: "",
    branchId: BRANCH_FILTER_CURRENT,
};

const DEFAULT_QUERY: CustomerManagementQuery = {
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: CustomerSortField.LastOrderDate,
    sortDirection: CustomerSortDirection.Descending,
};

export default function CustomersPage() {
    const { isRtl } = useLocale();
    const text = getCustomerManagementText(isRtl);
    const [filters, setFilters] = useState<FilterDraft>(EMPTY_FILTERS);
    const [query, setQuery] = useState<CustomerManagementQuery>(DEFAULT_QUERY);
    const [customers, setCustomers] = useState<CustomerManagementListItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<CustomerViewMode>(TABLE_VIEW);
    const branchVersion = useActiveBranchVersion();
    const dashboardStats = buildCustomerDashboardStats(customers, totalCount, query);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            await Promise.resolve();
            if (cancelled) return;
            setLoading(true);
            setError(false);
            try {
                const result = await customerManagementApi.list(query);
                if (cancelled) return;
                setCustomers(result.items);
                setTotalCount(result.totalCount);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [branchVersion, query, reloadKey]);

    const applyFilters = () => {
        if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
            toast.error(text.invalidDateRange);
            return;
        }

        setQuery((current) => ({
            ...current,
            pageNumber: 1,
            name: filters.name.trim() || undefined,
            phone: filters.phone.trim() || undefined,
            partner: filters.partner.trim() || undefined,
            customerType: filters.customerType === "all"
                ? undefined
                : filters.customerType === "partner"
                    ? CustomerManagementType.Partner
                    : CustomerManagementType.Direct,
            isActive: filters.status === "all" ? undefined : filters.status === "active",
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            branchId: filters.branchId || undefined,
        }));
    };

    const resetFilters = () => {
        setFilters(EMPTY_FILTERS);
        setQuery({ ...DEFAULT_QUERY, pageSize: query.pageSize });
    };

    const changeSort = (sortBy: CustomerSortField) => {
        setQuery((current) => ({
            ...current,
            pageNumber: 1,
            sortBy,
            sortDirection: current.sortBy === sortBy &&
                current.sortDirection === CustomerSortDirection.Ascending
                ? CustomerSortDirection.Descending
                : CustomerSortDirection.Ascending,
        }));
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                        <Users className="size-6 text-primary" />
                        {text.title}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{text.subtitle}</p>
                </div>
                <Button
                    variant="outline"
                    className="gap-2 self-start sm:self-auto"
                    onClick={() => setReloadKey((value) => value + 1)}
                    disabled={loading}
                >
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                    {text.refresh}
                </Button>
            </div>

            <CustomerDashboard stats={dashboardStats} isRtl={isRtl} />

            <CustomerInsights stats={dashboardStats} isRtl={isRtl} />

            <Card>
                <CardContent className="p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Filter className="size-4" />
                        {text.filters}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <FilterInput
                            label={text.name}
                            value={filters.name}
                            onChange={(value) => setFilters((current) => ({ ...current, name: value }))}
                            icon
                        />
                        <FilterInput
                            label={text.phone}
                            value={filters.phone}
                            onChange={(value) => setFilters((current) => ({ ...current, phone: value }))}
                        />
                        <FilterInput
                            label={text.partner}
                            value={filters.partner}
                            onChange={(value) => setFilters((current) => ({ ...current, partner: value }))}
                        />
                        <FilterSelect
                            label={text.customerType}
                            value={filters.customerType}
                            onChange={(value) => setFilters((current) => ({
                                ...current,
                                customerType: value as FilterDraft["customerType"],
                            }))}
                        >
                            <SelectItem value="all">{text.all}</SelectItem>
                            <SelectItem value="direct">{text.direct}</SelectItem>
                            <SelectItem value="partner">{text.partnerCustomer}</SelectItem>
                        </FilterSelect>
                        <FilterSelect
                            label={text.status}
                            value={filters.status}
                            onChange={(value) => setFilters((current) => ({
                                ...current,
                                status: value as FilterDraft["status"],
                            }))}
                        >
                            <SelectItem value="all">{text.all}</SelectItem>
                            <SelectItem value="active">{text.active}</SelectItem>
                            <SelectItem value="inactive">{text.inactive}</SelectItem>
                        </FilterSelect>
                        <FilterInput
                            label={text.dateFrom}
                            value={filters.dateFrom}
                            type="date"
                            onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))}
                        />
                        <FilterInput
                            label={text.dateTo}
                            value={filters.dateTo}
                            type="date"
                            onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))}
                        />
                        <div className="flex items-end">
                            <BranchFilter
                                value={filters.branchId}
                                onValueChange={(value) => setFilters((current) => ({ ...current, branchId: value }))}
                                hideWhenSingleBranch={false}
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <Button className="flex-1" onClick={applyFilters}>{text.apply}</Button>
                            <Button variant="outline" onClick={resetFilters}>{text.reset}</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="inline-flex w-full rounded-lg border border-border bg-card p-1 shadow-sm sm:w-auto">
                    <ViewModeButton
                        active={viewMode === TABLE_VIEW}
                        icon={List}
                        label={text.tableView}
                        onClick={() => setViewMode(TABLE_VIEW)}
                    />
                    <ViewModeButton
                        active={viewMode === CARD_VIEW}
                        icon={LayoutGrid}
                        label={text.cardView}
                        onClick={() => setViewMode(CARD_VIEW)}
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading && customers.length === 0 ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 8 }).map((_, index) => (
                                <div key={index} className="h-11 animate-pulse rounded bg-slate-100" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-destructive">
                            <span>{text.loadError}</span>
                            <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                                {text.retry}
                            </Button>
                        </div>
                    ) : customers.length === 0 ? (
                        <EmptyCustomers isRtl={isRtl} />
                    ) : viewMode === CARD_VIEW ? (
                        <CustomerCardGrid
                            customers={customers}
                            isRtl={isRtl}
                            onView={setSelectedCustomerId}
                        />
                    ) : (
                        <>
                            <div className="divide-y lg:hidden">
                                {customers.map((customer) => (
                                    <CustomerMobileCard
                                        key={customer.id}
                                        customer={customer}
                                        isRtl={isRtl}
                                        onView={() => setSelectedCustomerId(customer.id)}
                                    />
                                ))}
                            </div>

                            <div className="hidden lg:block">
                                <Table className="table-fixed">
                                    <colgroup>
                                        <col className="w-[25%]" />
                                        <col className="w-[17%]" />
                                        <col className="w-[18%]" />
                                        <col className="w-[18%]" />
                                        <col className="w-[10%]" />
                                        <col className="w-[12%]" />
                                    </colgroup>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                            <SortableHead field={CustomerSortField.Name} label={text.name} query={query} onSort={changeSort} />
                                            <SortableHead field={CustomerSortField.Phone} label={text.phone} query={query} onSort={changeSort} />
                                            <SortableHead
                                                field={CustomerSortField.CustomerType}
                                                label={text.customerType}
                                                secondaryField={CustomerSortField.PartnerName}
                                                secondaryLabel={text.partner}
                                                query={query}
                                                onSort={changeSort}
                                            />
                                            <SortableHead
                                                field={CustomerSortField.TotalOrders}
                                                label={text.totalOrders}
                                                secondaryField={CustomerSortField.LastOrderDate}
                                                secondaryLabel={text.lastOrderDate}
                                                query={query}
                                                onSort={changeSort}
                                            />
                                            <SortableHead field={CustomerSortField.Status} label={text.status} query={query} onSort={changeSort} />
                                            <TableHead className="text-end">{text.actions}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customers.map((customer) => (
                                            <TableRow key={customer.id} className="group">
                                                <TableCell>
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <CustomerAvatar name={customer.displayName} />
                                                        <div className="min-w-0">
                                                            <div className="truncate font-semibold text-slate-900">{customer.displayName}</div>
                                                            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                                                                <Mail className="size-3.5 shrink-0" />
                                                                <span className="truncate">{customer.email || text.notAvailable}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-slate-700">
                                                        <Phone className="size-4 shrink-0 text-slate-400" />
                                                        <span className="truncate" dir="ltr">{customer.phoneNumber}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <CustomerTypeBadge type={customer.customerType} isRtl={isRtl} />
                                                    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                                                        <Building2 className="size-3.5 shrink-0" />
                                                        <span className="truncate">
                                                            {(isRtl ? customer.partnerNameAr : customer.partnerName)
                                                                || customer.partnerName
                                                                || text.notAvailable}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                                                        <ReceiptText className="size-4 text-primary" />
                                                        {customer.totalOrders}
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                                        <CalendarDays className="size-3.5 shrink-0" />
                                                        <span className="truncate">{formatCustomerDate(customer.lastOrderDate, isRtl)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell><CustomerActiveBadge active={customer.isActive} isRtl={isRtl} /></TableCell>
                                                <TableCell className="text-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2 whitespace-nowrap"
                                                        onClick={() => setSelectedCustomerId(customer.id)}
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
                        </>
                    )}

                    <div className="px-4 pb-4">
                        <PaginationControls
                            pageNumber={query.pageNumber}
                            pageSize={query.pageSize}
                            totalCount={totalCount}
                            onPageChange={(pageNumber) => setQuery((current) => ({ ...current, pageNumber }))}
                            onPageSizeChange={(pageSize) => setQuery((current) => ({
                                ...current,
                                pageNumber: 1,
                                pageSize,
                            }))}
                            pageSizeOptions={[10, 25, 50, 100]}
                            isLoading={loading}
                        />
                    </div>
                </CardContent>
            </Card>

            <CustomerDetailsSheet
                key={selectedCustomerId}
                customerId={selectedCustomerId}
                branchId={query.branchId}
                open={selectedCustomerId !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedCustomerId(null);
                }}
            />
        </div>
    );
}

function CustomerDashboard({
    stats,
    isRtl,
}: {
    stats: CustomerDashboardStats;
    isRtl: boolean;
}) {
    const text = getCustomerManagementText(isRtl);

    return (
        <section aria-label={text.dashboard} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <KpiCard
                icon={Users}
                label={text.totalCustomers}
                value={formatNumber(stats.totalCustomers, isRtl)}
                description={text.totalRegisteredCustomers}
                accentClassName="bg-sky-50 text-sky-700"
            />
            <KpiCard
                icon={Activity}
                label={text.activeCustomers}
                value={formatNumber(stats.activeCustomers, isRtl)}
                description={text.activeCustomersDescription}
                accentClassName="bg-emerald-50 text-emerald-700"
            />
            <KpiCard
                icon={CalendarPlus}
                label={text.newCustomers}
                value={formatNullableNumber(stats.newCustomers, isRtl, text.notAvailable)}
                description={text.newCustomersDescription}
                accentClassName="bg-violet-50 text-violet-700"
            />
            <KpiCard
                icon={Building2}
                label={text.partnerCustomers}
                value={formatNumber(stats.partnerCustomers, isRtl)}
                description={text.partnerCustomersDescription}
                accentClassName="bg-amber-50 text-amber-700"
            />
            <KpiCard
                icon={ReceiptText}
                label={text.totalOrders}
                value={formatNumber(stats.totalOrders, isRtl)}
                description={text.totalOrdersDescription}
                accentClassName="bg-rose-50 text-rose-700"
            />
            <KpiCard
                icon={TrendingUp}
                label={text.averageOrdersPerCustomer}
                value={formatAverage(stats.averageOrders, isRtl)}
                description={text.averageOrdersDescription}
                accentClassName="bg-teal-50 text-teal-700"
            />
        </section>
    );
}

function KpiCard({
    icon: Icon,
    label,
    value,
    description,
    accentClassName,
}: {
    icon: typeof Users;
    label: string;
    value: string;
    description: string;
    accentClassName: string;
}) {
    return (
        <Card className="overflow-hidden">
            <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className={`flex size-10 items-center justify-center rounded-lg ${accentClassName}`}>
                    <Icon className="size-5" />
                </div>
                <div>
                    <div className="text-2xl font-semibold text-foreground">{value}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{label}</div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function CustomerInsights({
    stats,
    isRtl,
}: {
    stats: CustomerDashboardStats;
    isRtl: boolean;
}) {
    const text = getCustomerManagementText(isRtl);
    const visibleCustomerCount = stats.directCustomers + stats.partnerCustomers;

    return (
        <section aria-label={text.customerInsights} className="grid gap-3 xl:grid-cols-3">
            <Card>
                <CardContent className="p-4">
                    <div className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                        <BarChart3 className="size-4 text-primary" />
                        {text.topCustomers}
                    </div>
                    {stats.topCustomers.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                            {text.noCustomerActivity}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.topCustomers.map((customer, index) => (
                                <TopCustomerRow
                                    key={customer.id}
                                    customer={customer}
                                    rank={index + 1}
                                    isRtl={isRtl}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                        <PieChart className="size-4 text-primary" />
                        {text.customerTypesBreakdown}
                    </div>
                    <BreakdownRow
                        label={text.directCustomers}
                        value={stats.directCustomers}
                        percent={formatPercent(stats.directCustomers, visibleCustomerCount, isRtl)}
                        width={getPercentWidth(stats.directCustomers, visibleCustomerCount)}
                        barClassName="bg-sky-500"
                        isRtl={isRtl}
                    />
                    <BreakdownRow
                        label={text.partnerCustomers}
                        value={stats.partnerCustomers}
                        percent={formatPercent(stats.partnerCustomers, visibleCustomerCount, isRtl)}
                        width={getPercentWidth(stats.partnerCustomers, visibleCustomerCount)}
                        barClassName="bg-amber-500"
                        isRtl={isRtl}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                        <Activity className="size-4 text-primary" />
                        {text.activityBreakdown}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <ActivityTile label={text.activeToday} value={stats.activeToday} isRtl={isRtl} />
                        <ActivityTile label={text.activeThisMonth} value={stats.activeThisMonth} isRtl={isRtl} />
                        <ActivityTile label={text.inactive30Days} value={stats.inactive30Days} isRtl={isRtl} />
                        <ActivityTile label={text.inactive90Days} value={stats.inactive90Days} isRtl={isRtl} />
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

function TopCustomerRow({
    customer,
    rank,
    isRtl,
}: {
    customer: CustomerManagementListItem;
    rank: number;
    isRtl: boolean;
}) {
    const text = getCustomerManagementText(isRtl);

    return (
        <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                {formatNumber(rank, isRtl)}
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{customer.displayName}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                    {formatNumber(customer.totalOrders, isRtl)} {text.totalOrders}
                </div>
            </div>
        </div>
    );
}

function BreakdownRow({
    label,
    value,
    percent,
    width,
    barClassName,
    isRtl,
}: {
    label: string;
    value: number;
    percent: string;
    width: string;
    barClassName: string;
    isRtl: boolean;
}) {
    return (
        <div className="mb-4 last:mb-0">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">{label}</span>
                <span className="text-muted-foreground">
                    {formatNumber(value, isRtl)} · {percent}
                </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
                <div className={`h-full rounded-full ${barClassName}`} style={{ width }} />
            </div>
        </div>
    );
}

function ActivityTile({ label, value, isRtl }: { label: string; value: number; isRtl: boolean }) {
    return (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="text-lg font-semibold text-foreground">{formatNumber(value, isRtl)}</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">{label}</div>
        </div>
    );
}

function ViewModeButton({
    active,
    icon: Icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: typeof List;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors sm:flex-none ${
                active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={onClick}
        >
            <Icon className="size-4" />
            {label}
        </button>
    );
}

function CustomerCardGrid({
    customers,
    isRtl,
    onView,
}: {
    customers: CustomerManagementListItem[];
    isRtl: boolean;
    onView: (customerId: string) => void;
}) {
    return (
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            {customers.map((customer) => (
                <CustomerProfileCard
                    key={customer.id}
                    customer={customer}
                    isRtl={isRtl}
                    onView={() => onView(customer.id)}
                />
            ))}
        </div>
    );
}

function CustomerProfileCard({
    customer,
    isRtl,
    onView,
}: {
    customer: CustomerManagementListItem;
    isRtl: boolean;
    onView: () => void;
}) {
    const text = getCustomerManagementText(isRtl);

    return (
        <article className="flex min-h-[19rem] flex-col rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <CustomerAvatar name={customer.displayName} />
                    <div className="min-w-0">
                        <h2 className="truncate font-semibold text-foreground">{customer.displayName}</h2>
                        <div className="mt-2">
                            <CustomerTypeBadge type={customer.customerType} isRtl={isRtl} />
                        </div>
                    </div>
                </div>
                <CustomerActiveBadge active={customer.isActive} isRtl={isRtl} />
            </div>

            <div className="mt-5 space-y-3 text-sm">
                <CardInfo icon={Phone} label={text.phone} value={customer.phoneNumber} ltr />
                <CardInfo icon={Mail} label={text.email} value={customer.email || text.notAvailable} />
                <CardInfo
                    icon={CalendarDays}
                    label={text.lastOrderDate}
                    value={formatCustomerDate(customer.lastOrderDate, isRtl)}
                />
                <CardInfo icon={ReceiptText} label={text.totalOrders} value={formatNumber(customer.totalOrders, isRtl)} />
            </div>

            <Button variant="outline" size="sm" className="mt-auto w-full gap-2" onClick={onView}>
                <Eye className="size-4" />
                {text.viewDetails}
            </Button>
        </article>
    );
}

function CardInfo({
    icon: Icon,
    label,
    value,
    ltr = false,
}: {
    icon: typeof Phone;
    label: string;
    value: string;
    ltr?: boolean;
}) {
    return (
        <div className="flex min-w-0 items-start gap-2">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="truncate font-medium text-foreground" dir={ltr ? "ltr" : undefined}>
                    {value}
                </div>
            </div>
        </div>
    );
}

function EmptyCustomers({ isRtl }: { isRtl: boolean }) {
    const text = getCustomerManagementText(isRtl);

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="mb-3 size-10 text-muted-foreground" />
            <div className="font-semibold text-foreground">{text.emptyTitle}</div>
            <div className="mt-1 text-sm text-muted-foreground">{text.emptyDescription}</div>
        </div>
    );
}

function FilterInput({
    label,
    value,
    onChange,
    type = "text",
    icon = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "date";
    icon?: boolean;
}) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            <div className="relative mt-1">
                {icon ? <Search className="absolute start-2.5 top-2.5 size-4 text-slate-400" /> : null}
                <Input
                    type={type}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className={icon ? "ps-8" : undefined}
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
    children: React.ReactNode;
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

function SortableHead({
    field,
    label,
    secondaryField,
    secondaryLabel,
    query,
    onSort,
}: {
    field: CustomerSortField;
    label: string;
    secondaryField?: CustomerSortField;
    secondaryLabel?: string;
    query: CustomerManagementQuery;
    onSort: (field: CustomerSortField) => void;
}) {
    return (
        <TableHead className="h-14">
            <SortButton field={field} label={label} query={query} onSort={onSort} />
            {secondaryField !== undefined && secondaryLabel ? (
                <SortButton
                    field={secondaryField}
                    label={secondaryLabel}
                    query={query}
                    onSort={onSort}
                    secondary
                />
            ) : null}
        </TableHead>
    );
}

function SortButton({
    field,
    label,
    query,
    onSort,
    secondary = false,
}: {
    field: CustomerSortField;
    label: string;
    query: CustomerManagementQuery;
    onSort: (field: CustomerSortField) => void;
    secondary?: boolean;
}) {
    const active = query.sortBy === field;
    const Icon = !active
        ? ArrowUpDown
        : query.sortDirection === CustomerSortDirection.Ascending
            ? ArrowUp
            : ArrowDown;

    return (
        <button
            type="button"
            className={`flex max-w-full items-center gap-1 truncate hover:text-slate-900 ${
                secondary ? "mt-1 text-xs font-normal text-slate-500" : "font-medium"
            }`}
            onClick={() => onSort(field)}
        >
            <span className="truncate">{label}</span>
            <Icon className="size-3.5 shrink-0" />
        </button>
    );
}

function CustomerAvatar({ name }: { name: string }) {
    return (
        <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {getCustomerInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}

function CustomerMobileCard({
    customer,
    isRtl,
    onView,
}: {
    customer: CustomerManagementListItem;
    isRtl: boolean;
    onView: () => void;
}) {
    const text = getCustomerManagementText(isRtl);
    const partner = (isRtl ? customer.partnerNameAr : customer.partnerName)
        || customer.partnerName
        || text.notAvailable;

    return (
        <article className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <CustomerAvatar name={customer.displayName} />
                    <div className="min-w-0">
                        <h2 className="truncate font-semibold text-slate-900">{customer.displayName}</h2>
                        <p className="truncate text-sm text-slate-500">{customer.email || text.notAvailable}</p>
                    </div>
                </div>
                <CustomerActiveBadge active={customer.isActive} isRtl={isRtl} />
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <MobileInfo icon={Phone} label={text.phone} value={customer.phoneNumber} ltr />
                <MobileInfo icon={Building2} label={text.partner} value={partner} />
                <MobileInfo icon={ReceiptText} label={text.totalOrders} value={String(customer.totalOrders)} />
                <MobileInfo
                    icon={CalendarDays}
                    label={text.lastOrderDate}
                    value={formatCustomerDate(customer.lastOrderDate, isRtl)}
                />
            </div>

            <div className="flex items-center justify-between gap-3">
                <CustomerTypeBadge type={customer.customerType} isRtl={isRtl} />
                <Button variant="outline" size="sm" className="gap-2" onClick={onView}>
                    <Eye className="size-4" />
                    {text.viewDetails}
                </Button>
            </div>
        </article>
    );
}

function MobileInfo({
    icon: Icon,
    label,
    value,
    ltr = false,
}: {
    icon: typeof Phone;
    label: string;
    value: string;
    ltr?: boolean;
}) {
    return (
        <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{label}</span>
            </div>
            <div className="mt-1 truncate font-medium text-slate-800" dir={ltr ? "ltr" : undefined}>
                {value}
            </div>
        </div>
    );
}

function buildCustomerDashboardStats(
    customers: CustomerManagementListItem[],
    totalCount: number,
    query: CustomerManagementQuery,
): CustomerDashboardStats {
    const partnerCustomers = customers.filter((customer) =>
        customer.customerType === CustomerManagementType.Partner).length;
    const totalOrders = customers.reduce((sum, customer) => sum + customer.totalOrders, 0);
    const hasActivityPeriod = Boolean(query.dateFrom || query.dateTo);

    return {
        totalCustomers: totalCount,
        activeCustomers: hasActivityPeriod
            ? customers.length
            : customers.filter((customer) => customer.isActive && customer.totalOrders > 0).length,
        newCustomers: countNewCustomers(customers, query),
        partnerCustomers,
        directCustomers: customers.length - partnerCustomers,
        totalOrders,
        averageOrders: customers.length === 0 ? 0 : totalOrders / customers.length,
        topCustomers: [...customers]
            .sort((first, second) => second.totalOrders - first.totalOrders)
            .slice(0, TOP_CUSTOMER_LIMIT),
        activeToday: countCustomersWithRecentActivity(customers, "today"),
        activeThisMonth: countCustomersWithRecentActivity(customers, "month"),
        inactive30Days: countInactiveCustomers(customers, INACTIVE_30_DAYS),
        inactive90Days: countInactiveCustomers(customers, INACTIVE_90_DAYS),
    };
}

function countNewCustomers(customers: CustomerManagementListItem[], query: CustomerManagementQuery) {
    const customersWithCreatedAt = customers.filter((customer) => customer.createdAt);
    if (customersWithCreatedAt.length === 0) return null;

    return customersWithCreatedAt.filter((customer) =>
        isWithinAppliedDateRange(customer.createdAt, query)).length;
}

function countCustomersWithRecentActivity(
    customers: CustomerManagementListItem[],
    period: "today" | "month",
) {
    const now = new Date();

    return customers.filter((customer) => {
        const lastOrderDate = parseDate(customer.lastOrderDate);
        if (!lastOrderDate) return false;
        if (period === "today") return isSameDay(lastOrderDate, now);
        return lastOrderDate.getFullYear() === now.getFullYear() &&
            lastOrderDate.getMonth() === now.getMonth();
    }).length;
}

function countInactiveCustomers(customers: CustomerManagementListItem[], days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return customers.filter((customer) => {
        const lastOrderDate = parseDate(customer.lastOrderDate);
        return !lastOrderDate || lastOrderDate < cutoff;
    }).length;
}

function isWithinAppliedDateRange(value: string | null | undefined, query: CustomerManagementQuery) {
    const date = parseDate(value);
    if (!date) return false;

    const from = query.dateFrom ? parseDate(`${query.dateFrom}T00:00:00`) : null;
    const to = query.dateTo ? parseDate(`${query.dateTo}T23:59:59`) : null;
    return (!from || date >= from) && (!to || date <= to);
}

function parseDate(value: string | null | undefined) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(first: Date, second: Date) {
    return first.getFullYear() === second.getFullYear() &&
        first.getMonth() === second.getMonth() &&
        first.getDate() === second.getDate();
}

function formatNumber(value: number, isRtl: boolean) {
    return new Intl.NumberFormat(isRtl ? "ar-QA" : "en-US").format(value);
}

function formatNullableNumber(value: number | null, isRtl: boolean, fallback: string) {
    return value === null ? fallback : formatNumber(value, isRtl);
}

function formatAverage(value: number, isRtl: boolean) {
    return new Intl.NumberFormat(isRtl ? "ar-QA" : "en-US", {
        maximumFractionDigits: AVERAGE_DECIMALS,
    }).format(value);
}

function formatPercent(value: number, total: number, isRtl: boolean) {
    const percent = total === 0 ? 0 : value / total;
    return new Intl.NumberFormat(isRtl ? "ar-QA" : "en-US", {
        style: "percent",
        maximumFractionDigits: PERCENT_DECIMALS,
    }).format(percent);
}

function getPercentWidth(value: number, total: number) {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
}

function getCustomerInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

