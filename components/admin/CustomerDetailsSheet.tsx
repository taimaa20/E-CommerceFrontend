"use client";

import { useEffect, useState } from "react";
import { Activity, Building2, CalendarDays, Mail, Phone, ReceiptText, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import {
    CustomerOrderSortField,
    CustomerSortDirection,
    customerManagementApi,
    type CustomerManagementDetails,
    type CustomerManagementOrder,
} from "@/lib/api-customer-management";
import { useSettingsStore } from "@/store/settingsStore";
import {
    CustomerActiveBadge,
    CustomerTypeBadge,
    formatCustomerDate,
    formatCustomerMonth,
    getCustomerManagementText,
    orderSourceLabel,
    orderStatusLabel,
    orderTypeLabel,
} from "@/components/admin/customer-management-shared";

interface CustomerDetailsSheetProps {
    customerId: string | null;
    /** Branch scope of the page that opened the sheet ("" = current branch, empty guid = all branches). */
    branchId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const DEFAULT_ORDER_PAGE_SIZE = 10;

export function CustomerDetailsSheet({
    customerId,
    branchId,
    open,
    onOpenChange,
}: CustomerDetailsSheetProps) {
    const { isRtl } = useLocale();
    const currency = useSettingsStore((state) => state.settings.currency);
    const text = getCustomerManagementText(isRtl);
    const [details, setDetails] = useState<CustomerManagementDetails | null>(null);
    const [orders, setOrders] = useState<CustomerManagementOrder[]>([]);
    const [orderTotal, setOrderTotal] = useState(0);
    const [orderPage, setOrderPage] = useState(1);
    const [orderPageSize, setOrderPageSize] = useState(DEFAULT_ORDER_PAGE_SIZE);
    const [detailsLoading, setDetailsLoading] = useState(true);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [detailsError, setDetailsError] = useState(false);
    const [ordersError, setOrdersError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!open || !customerId) return;
        let cancelled = false;
        void (async () => {
            await Promise.resolve();
            if (cancelled) return;
            setDetailsLoading(true);
            setDetailsError(false);
            try {
                const result = await customerManagementApi.details(customerId, branchId || undefined);
                if (!cancelled) setDetails(result);
            } catch {
                if (!cancelled) setDetailsError(true);
            } finally {
                if (!cancelled) setDetailsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [branchId, customerId, open, reloadKey]);

    useEffect(() => {
        if (!open || !customerId) return;
        let cancelled = false;
        void (async () => {
            await Promise.resolve();
            if (cancelled) return;
            setOrdersLoading(true);
            setOrdersError(false);
            try {
                const result = await customerManagementApi.orders(customerId, {
                    pageNumber: orderPage,
                    pageSize: orderPageSize,
                    branchId: branchId || undefined,
                    sortBy: CustomerOrderSortField.OrderDate,
                    sortDirection: CustomerSortDirection.Descending,
                });
                if (cancelled) return;
                setOrders(result.items);
                setOrderTotal(result.totalCount);
            } catch {
                if (!cancelled) setOrdersError(true);
            } finally {
                if (!cancelled) setOrdersLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [branchId, customerId, open, orderPage, orderPageSize, reloadKey]);

    const retry = () => setReloadKey((value) => value + 1);
    const mostActiveMonth = getMostActiveOrderMonth(orders, isRtl);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="end" className="w-[calc(100vw-0.75rem)] max-w-3xl gap-0 p-0 sm:max-w-3xl">
                <SheetHeader className="border-b border-slate-200 px-5 py-4">
                    <SheetTitle>{details?.displayName || text.details}</SheetTitle>
                    <SheetDescription>
                        {details
                            ? [details.phoneNumber, details.email].filter(Boolean).join(" · ")
                            : text.details}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 p-4 sm:p-5">
                    {detailsLoading && !details ? (
                        <DetailsSkeleton />
                    ) : detailsError || !details ? (
                        <ErrorState message={text.detailError} retry={retry} retryLabel={text.retry} />
                    ) : (
                        <>
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <UserRound className="size-4" />
                                        {text.generalInformation}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 sm:grid-cols-2">
                                    <Info label={text.name} value={details.displayName} icon={UserRound} />
                                    <Info label={text.phone} value={details.phoneNumber} icon={Phone} />
                                    <Info label={text.email} value={details.email || text.notAvailable} icon={Mail} />
                                    <Info label={text.birthDate} value={formatCustomerDate(details.birthDate, isRtl)} icon={CalendarDays} />
                                    <Info label={text.customerType} value={<CustomerTypeBadge type={details.customerType} isRtl={isRtl} />} />
                                    <Info label={text.status} value={<CustomerActiveBadge active={details.isActive} isRtl={isRtl} />} />
                                    <Info label={text.createdAt} value={formatCustomerDate(details.createdAt, isRtl)} icon={CalendarDays} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Activity className="size-4" />
                                        {text.customerSummary}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                                    <Stat label={text.customerSince} value={formatCustomerDate(details.createdAt, isRtl)} />
                                    <Stat label={text.totalOrders} value={details.orderStatistics.totalOrders} />
                                    <Stat label={text.completedOrders} value={details.orderStatistics.completedOrders} />
                                    <Stat label={text.cancelledOrders} value={details.orderStatistics.cancelledOrders} />
                                    <Stat
                                        label={text.averageOrderValue}
                                        value={formatCurrency(details.orderStatistics.averageOrderValue, currency)}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <CalendarDays className="size-4" />
                                        {text.orderActivity}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-3">
                                    <Stat
                                        label={text.lastOrderDate}
                                        value={formatCustomerDate(details.orderStatistics.lastOrderDate, isRtl)}
                                    />
                                    <Stat label={text.mostActiveMonth} value={mostActiveMonth} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <ReceiptText className="size-4" />
                                        {text.orderStatistics}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    <Stat label={text.totalOrders} value={details.orderStatistics.totalOrders} />
                                    <Stat label={text.completedOrders} value={details.orderStatistics.completedOrders} />
                                    <Stat label={text.cancelledOrders} value={details.orderStatistics.cancelledOrders} />
                                    <Stat label={text.totalSpend} value={formatCurrency(details.orderStatistics.totalSpend, currency)} />
                                    <Stat label={text.averageOrderValue} value={formatCurrency(details.orderStatistics.averageOrderValue, currency)} />
                                    <Stat label={text.firstOrderDate} value={formatCustomerDate(details.orderStatistics.firstOrderDate, isRtl)} />
                                    <Stat label={text.lastOrderDate} value={formatCustomerDate(details.orderStatistics.lastOrderDate, isRtl)} />
                                </CardContent>
                            </Card>

                            {details.partner ? (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Building2 className="size-4" />
                                            {text.partnerInformation}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 sm:grid-cols-2">
                                        <Info
                                            label={text.partner}
                                            value={(isRtl ? details.partner.nameAr : details.partner.name) || details.partner.name}
                                        />
                                        <Info label={text.partnerCode} value={details.partner.code || text.notAvailable} mono />
                                        <Info label={text.lastPartnerOrder} value={details.partner.lastPartnerOrderNumber || text.notAvailable} mono />
                                        <Info label={text.orderDate} value={formatCustomerDate(details.partner.lastPartnerOrderDate, isRtl)} />
                                    </CardContent>
                                </Card>
                            ) : null}
                        </>
                    )}

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">{text.recentOrders}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {ordersLoading && orders.length === 0 ? (
                                <div className="space-y-2 p-4">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <div key={index} className="h-10 animate-pulse rounded bg-slate-100" />
                                    ))}
                                </div>
                            ) : ordersError ? (
                                <ErrorState message={text.detailError} retry={retry} retryLabel={text.retry} />
                            ) : orders.length === 0 ? (
                                <div className="p-8 text-center text-sm text-slate-500">{text.noOrders}</div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{text.orderNumber}</TableHead>
                                                    <TableHead>{text.orderDate}</TableHead>
                                                    <TableHead>{text.orderType}</TableHead>
                                                    <TableHead>{text.orderSource}</TableHead>
                                                    <TableHead>{text.items}</TableHead>
                                                    <TableHead>{text.total}</TableHead>
                                                    <TableHead>{text.status}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {orders.map((order) => (
                                                    <TableRow key={order.id}>
                                                        <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                                                        <TableCell className="whitespace-nowrap">{formatCustomerDate(order.orderDate, isRtl)}</TableCell>
                                                        <TableCell>{orderTypeLabel(order.orderType, isRtl)}</TableCell>
                                                        <TableCell>{order.partnerName || orderSourceLabel(order.orderSource, isRtl)}</TableCell>
                                                        <TableCell>{order.itemCount}</TableCell>
                                                        <TableCell className="whitespace-nowrap">{formatCurrency(order.totalAmount, currency)}</TableCell>
                                                        <TableCell>{orderStatusLabel(order.status, isRtl)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="px-4 pb-4">
                                        <PaginationControls
                                            pageNumber={orderPage}
                                            pageSize={orderPageSize}
                                            totalCount={orderTotal}
                                            onPageChange={setOrderPage}
                                            onPageSizeChange={setOrderPageSize}
                                            pageSizeOptions={[5, 10, 20]}
                                            isLoading={ordersLoading}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function DetailsSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-lg bg-slate-100" />
            ))}
        </div>
    );
}

function ErrorState({ message, retry, retryLabel }: { message: string; retry: () => void; retryLabel: string }) {
    return (
        <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-destructive">
            <span>{message}</span>
            <Button variant="outline" size="sm" onClick={retry}>{retryLabel}</Button>
        </div>
    );
}

function Info({
    label,
    value,
    icon: Icon,
    mono = false,
}: {
    label: string;
    value: React.ReactNode;
    icon?: typeof UserRound;
    mono?: boolean;
}) {
    return (
        <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                {Icon ? <Icon className="size-3.5" /> : null}
                {label}
            </div>
            <div className={mono ? "break-all font-mono text-xs text-slate-800" : "text-sm text-slate-900"}>
                {value}
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
        </div>
    );
}

function getMostActiveOrderMonth(orders: CustomerManagementOrder[], isRtl: boolean) {
    if (orders.length === 0) return "-";

    const counts = orders.reduce<Record<string, number>>((result, order) => {
        const monthKey = order.orderDate.slice(0, 7);
        result[monthKey] = (result[monthKey] ?? 0) + 1;
        return result;
    }, {});

    const [month] = Object.entries(counts)
        .sort((first, second) => second[1] - first[1])[0] ?? [];
    return month ? formatCustomerMonth(`${month}-01T00:00:00`, isRtl) : "-";
}
