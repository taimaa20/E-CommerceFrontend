"use client";

import { useEffect, useState } from "react";
import type React from "react";
import Link from "next/link";
import { Download, Eye, Filter, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/components/locale-provider";
import { HrApi } from "@/lib/api-hr";
import type { HrEmployeeListItem } from "@/types/hr";
import { AssetCategory, AssetStatus, AssetCondition, assetCategoriesApi, assetsApi } from "@/lib/api-assets";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { useAssetsStore } from "@/store/assetsStore";
import {
    ASSET_CONDITIONS,
    ASSET_STATUSES,
    AssetConditionBadge,
    AssetIcon,
    AssetStatusBadge,
    assetQrTarget,
    conditionLabel,
    formatDate,
    formatMoney,
    statusLabel,
    tx,
    useAssetCurrency,
} from "@/components/assets/asset-shared";

export default function AssetsListPage() {
    const { isRtl } = useLocale();
    const { items, totalCount, pageNumber, pageSize, loading, error, query, setQuery, resetQuery, fetchList, fetchDashboard } = useAssetsStore();
    const currency = useAssetCurrency();
    const [categories, setCategories] = useState<AssetCategory[]>([]);
    const [employees, setEmployees] = useState<HrEmployeeListItem[]>([]);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [columns, setColumns] = useState<Record<string, boolean>>({
        category: true,
        status: true,
        condition: true,
        assignment: true,
        value: true,
        warranty: true,
        codes: true,
    });

    const branchVersion = useActiveBranchVersion();

    useEffect(() => {
        void fetchList();
    }, [branchVersion, fetchList, query]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            assetCategoriesApi.list(true).catch(() => [] as AssetCategory[]),
            HrApi.listEmployees({ page: 1, pageSize: 200 }).catch(() => ({ items: [] as HrEmployeeListItem[], total: 0, page: 1, pageSize: 200 })),
        ]).then(([categoryRows, employeeRows]) => {
            if (cancelled) return;
            setCategories(categoryRows);
            setEmployees(employeeRows.items || []);
        });
        return () => { cancelled = true; };
    }, []);

    const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1)));

    const toggleColumn = (key: string) => {
        setColumns((current) => ({ ...current, [key]: !current[key] }));
    };

    const exportCsv = async () => {
        try {
            const blob = await assetsApi.exportCsv(query);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `assets-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل التصدير" : "Export failed"));
        }
    };

    const deleteAsset = async () => {
        if (!deleteId) return;
        try {
            await assetsApi.remove(deleteId);
            setDeleteId(null);
            toast.success(isRtl ? "تم حذف الأصل" : "Asset deleted");
            await fetchList();
            await fetchDashboard();
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الحذف" : "Delete failed"));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">{tx(isRtl, "list")}</h1>
                    <p className="text-sm text-slate-500">{isRtl ? "سجل أصول قابل للتصفية والفرز والتصدير." : "Server-filtered asset register with audit-safe actions."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportCsv} className="gap-2"><Download className="size-4" />{tx(isRtl, "export")}</Button>
                    <ColumnMenu columns={columns} toggleColumn={toggleColumn} isRtl={isRtl} />
                    <Link href="/ntxadminpos/assets/new">
                        <Button className="gap-2"><Plus className="size-4" />{tx(isRtl, "newAsset")}</Button>
                    </Link>
                </div>
            </div>

            <Card className="rounded-md">
                <CardContent className="p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Filter className="size-4" />
                        {isRtl ? "التصفية" : "Filters"}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                            <Label className="text-xs">{tx(isRtl, "search")}</Label>
                            <div className="relative mt-1">
                                <Search className="absolute start-2 top-2.5 size-4 text-slate-400" />
                                <Input className="ps-8" value={query.search ?? ""} onChange={(e) => setQuery({ search: e.target.value })} />
                            </div>
                        </div>
                        <SelectFilter label={tx(isRtl, "category")} value={query.categoryId ?? "ALL"} onChange={(v) => setQuery({ categoryId: v === "ALL" ? undefined : v })}>
                            <SelectItem value="ALL">{tx(isRtl, "all")}</SelectItem>
                            {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.displayName}</SelectItem>)}
                        </SelectFilter>
                        <SelectFilter label={tx(isRtl, "status")} value={query.status || "ALL"} onChange={(v) => setQuery({ status: v === "ALL" ? "" : v as AssetStatus })}>
                            <SelectItem value="ALL">{tx(isRtl, "all")}</SelectItem>
                            {ASSET_STATUSES.map((status) => <SelectItem key={status} value={status}>{statusLabel(status, isRtl)}</SelectItem>)}
                        </SelectFilter>
                        <SelectFilter label={tx(isRtl, "condition")} value={query.condition || "ALL"} onChange={(v) => setQuery({ condition: v === "ALL" ? "" : v as AssetCondition })}>
                            <SelectItem value="ALL">{tx(isRtl, "all")}</SelectItem>
                            {ASSET_CONDITIONS.map((condition) => <SelectItem key={condition} value={condition}>{conditionLabel(condition, isRtl)}</SelectItem>)}
                        </SelectFilter>
                        <SelectFilter label={tx(isRtl, "employee")} value={query.assignedEmployeeId ?? "ALL"} onChange={(v) => setQuery({ assignedEmployeeId: v === "ALL" ? undefined : v })}>
                            <SelectItem value="ALL">{tx(isRtl, "all")}</SelectItem>
                            {employees.map((employee) => (
                                <SelectItem key={employee.employeeId} value={employee.employeeId}>
                                    {(isRtl ? employee.fullNameAr : employee.fullName) || employee.username}
                                </SelectItem>
                            ))}
                        </SelectFilter>
                        <SelectFilter label={tx(isRtl, "warranty")} value={query.warrantyExpiry ?? "ALL"} onChange={(v) => setQuery({ warrantyExpiry: v === "ALL" ? undefined : v })}>
                            <SelectItem value="ALL">{tx(isRtl, "all")}</SelectItem>
                            <SelectItem value="30">{isRtl ? "خلال ٣٠ يوم" : "Next 30 days"}</SelectItem>
                            <SelectItem value="60">{isRtl ? "خلال ٦٠ يوم" : "Next 60 days"}</SelectItem>
                            <SelectItem value="expired">{isRtl ? "منتهي" : "Expired"}</SelectItem>
                            <SelectItem value="none">{isRtl ? "بدون ضمان" : "No warranty"}</SelectItem>
                        </SelectFilter>
                        <div>
                            <Label className="text-xs">{isRtl ? "من تاريخ شراء" : "Purchase from"}</Label>
                            <Input className="mt-1" type="date" value={query.dateFrom ?? ""} onChange={(e) => setQuery({ dateFrom: e.target.value || undefined })} />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Label className="text-xs">{isRtl ? "إلى" : "To"}</Label>
                                <Input className="mt-1" type="date" value={query.dateTo ?? ""} onChange={(e) => setQuery({ dateTo: e.target.value || undefined })} />
                            </div>
                            <Button variant="outline" onClick={resetQuery}>{tx(isRtl, "reset")}</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-md">
                <CardContent className="p-0">
                    {loading && items.length === 0 ? (
                        <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}</div>
                    ) : error ? (
                        <div className="p-8 text-center text-destructive">{error}</div>
                    ) : items.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">{tx(isRtl, "empty")}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{isRtl ? "الأصل" : "Asset"}</TableHead>
                                        {columns.category && <TableHead>{tx(isRtl, "category")}</TableHead>}
                                        {columns.status && <TableHead>{tx(isRtl, "status")}</TableHead>}
                                        {columns.condition && <TableHead>{tx(isRtl, "condition")}</TableHead>}
                                        {columns.assignment && <TableHead>{tx(isRtl, "assignment")}</TableHead>}
                                        {columns.value && <TableHead>{tx(isRtl, "assetValue")}</TableHead>}
                                        {columns.warranty && <TableHead>{tx(isRtl, "warranty")}</TableHead>}
                                        {columns.codes && <TableHead>{tx(isRtl, "qrCode")}</TableHead>}
                                        <TableHead className="text-end">{tx(isRtl, "actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((asset) => (
                                        <TableRow key={asset.id}>
                                            <TableCell>
                                                <div className="font-medium">{asset.assetName}</div>
                                                <div className="font-mono text-xs text-slate-500">{asset.assetCode}</div>
                                                <div className="text-xs text-slate-400">{[asset.brand, asset.model].filter(Boolean).join(" ")}</div>
                                            </TableCell>
                                            {columns.category && (
                                                <TableCell>
                                                    <Badge variant="outline" className="gap-1" style={{ borderColor: asset.categoryColor ?? undefined }}>
                                                        <AssetIcon name={asset.categoryIcon} />
                                                        {asset.categoryName}
                                                    </Badge>
                                                </TableCell>
                                            )}
                                            {columns.status && <TableCell><AssetStatusBadge status={asset.status} isRtl={isRtl} /></TableCell>}
                                            {columns.condition && <TableCell><AssetConditionBadge condition={asset.condition} isRtl={isRtl} /></TableCell>}
                                            {columns.assignment && (
                                                <TableCell>
                                                    <div className="text-sm">{asset.assignedToEmployeeName || "-"}</div>
                                                    <div className="text-xs text-slate-500">{asset.assignedLocation || asset.department || ""}</div>
                                                </TableCell>
                                            )}
                                            {columns.value && <TableCell>{formatMoney(asset.currentValue ?? asset.purchaseCost, currency)}</TableCell>}
                                            {columns.warranty && <TableCell>{formatDate(asset.warrantyEndDate)}</TableCell>}
                                            {columns.codes && (
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {asset.qrCode && (
                                                            <img
                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=44x44&data=${encodeURIComponent(assetQrTarget(asset.qrCode))}`}
                                                                alt={asset.assetCode}
                                                                className="size-11 rounded border bg-white p-1"
                                                            />
                                                        )}
                                                        <div className="font-mono text-xs">
                                                            <div>{asset.assetCode}</div>
                                                            <div className="mt-1 h-5 w-24 overflow-hidden bg-[repeating-linear-gradient(90deg,#0f172a_0_2px,transparent_2px_4px,#0f172a_4px_5px,transparent_5px_8px)]" />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="text-end">
                                                <div className="flex justify-end gap-1">
                                                    <Link href={`/ntxadminpos/assets/${asset.id}`}>
                                                        <Button size="sm" variant="ghost" aria-label={tx(isRtl, "open")}><Eye className="size-4" /></Button>
                                                    </Link>
                                                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(asset.id)} aria-label={tx(isRtl, "delete")}>
                                                        <Trash2 className="size-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                    {pageNumber} / {totalPages} · {totalCount}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" disabled={pageNumber <= 1} onClick={() => setQuery({ page: pageNumber - 1 })}>
                        {isRtl ? "السابق" : "Previous"}
                    </Button>
                    <Button variant="outline" disabled={pageNumber >= totalPages} onClick={() => setQuery({ page: pageNumber + 1 })}>
                        {isRtl ? "التالي" : "Next"}
                    </Button>
                </div>
            </div>

            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{tx(isRtl, "delete")}</DialogTitle></DialogHeader>
                    <p className="text-sm text-slate-600">{isRtl ? "سيتم حذف الأصل بشكل منطقي مع الاحتفاظ بالسجل." : "This soft-deletes the asset and preserves its audit history."}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>{tx(isRtl, "cancel")}</Button>
                        <Button variant="destructive" onClick={deleteAsset}>{tx(isRtl, "confirm")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SelectFilter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{children}</SelectContent>
            </Select>
        </div>
    );
}

function ColumnMenu({ columns, toggleColumn, isRtl }: { columns: Record<string, boolean>; toggleColumn: (key: string) => void; isRtl: boolean }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2"><SlidersHorizontal className="size-4" />{tx(isRtl, "columnVisibility")}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{tx(isRtl, "columnVisibility")}</DropdownMenuLabel>
                {Object.keys(columns).map((key) => (
                    <DropdownMenuCheckboxItem key={key} checked={columns[key]} onCheckedChange={() => toggleColumn(key)}>
                        {columnLabel(key, isRtl)}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function columnLabel(key: string, isRtl: boolean) {
    const labels: Record<string, string> = {
        category: tx(isRtl, "category"),
        status: tx(isRtl, "status"),
        condition: tx(isRtl, "condition"),
        assignment: tx(isRtl, "assignment"),
        value: tx(isRtl, "assetValue"),
        warranty: tx(isRtl, "warranty"),
        codes: tx(isRtl, "qrCode"),
    };
    return labels[key] ?? key;
}
