"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { AssetMaintenanceQuery, AssetMaintenanceRecord, AssetMaintenanceStatus, assetsApi, PaginatedResponse } from "@/lib/api-assets";
import { formatDate, formatMoney, maintenanceStatusLabel, MAINTENANCE_STATUSES, tx, useAssetCurrency } from "@/components/assets/asset-shared";

export default function AssetMaintenancePage() {
    const { isRtl } = useLocale();
    const currency = useAssetCurrency();
    const [query, setQuery] = useState<AssetMaintenanceQuery>({ page: 1, pageSize: 25 });
    const [page, setPage] = useState<PaginatedResponse<AssetMaintenanceRecord>>({ items: [], totalCount: 0, pageNumber: 1, pageSize: 25 });
    const [loading, setLoading] = useState(false);
    const totalPages = Math.max(1, Math.ceil(page.totalCount / Math.max(page.pageSize, 1)));

    const branchVersion = useActiveBranchVersion();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        assetsApi.maintenance(query)
            .then((data) => { if (!cancelled) setPage(data); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [branchVersion, query]);

    const patchQuery = (patch: Partial<AssetMaintenanceQuery>) => setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

    return (
        <div className="space-y-4">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    <Wrench className="size-6" />
                    {tx(isRtl, "maintenance")}
                </h1>
                <p className="text-sm text-slate-500">{isRtl ? "تتبع الصيانة الحالية والقادمة والمتأخرة." : "Track completed, scheduled, and overdue maintenance across assets."}</p>
            </div>

            <Card className="rounded-md">
                <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
                    <div>
                        <Label className="text-xs">{tx(isRtl, "status")}</Label>
                        <Select value={query.status || "ALL"} onValueChange={(v) => patchQuery({ status: v === "ALL" ? "" : v as AssetMaintenanceStatus })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{tx(isRtl, "all")}</SelectItem>
                                {MAINTENANCE_STATUSES.map((status) => <SelectItem key={status} value={status}>{maintenanceStatusLabel(status, isRtl)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">{isRtl ? "من" : "From"}</Label>
                        <Input className="mt-1" type="date" value={query.dateFrom ?? ""} onChange={(e) => patchQuery({ dateFrom: e.target.value || undefined })} />
                    </div>
                    <div>
                        <Label className="text-xs">{isRtl ? "إلى" : "To"}</Label>
                        <Input className="mt-1" type="date" value={query.dateTo ?? ""} onChange={(e) => patchQuery({ dateTo: e.target.value || undefined })} />
                    </div>
                    <div className="flex items-end">
                        <Button variant="outline" onClick={() => setQuery({ page: 1, pageSize: 25 })}>{tx(isRtl, "reset")}</Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-md">
                <CardContent className="p-0">
                    {loading && page.items.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">...</div>
                    ) : page.items.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">-</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tx(isRtl, "assets")}</TableHead>
                                    <TableHead>{tx(isRtl, "type")}</TableHead>
                                    <TableHead>{tx(isRtl, "status")}</TableHead>
                                    <TableHead>{tx(isRtl, "date")}</TableHead>
                                    <TableHead>{tx(isRtl, "nextDate")}</TableHead>
                                    <TableHead>{tx(isRtl, "cost")}</TableHead>
                                    <TableHead>{tx(isRtl, "vendor")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {page.items.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            <Link href={`/ntxadminpos/assets/${record.assetId}`} className="font-medium text-primary hover:underline">{record.assetName}</Link>
                                            <div className="font-mono text-xs text-slate-500">{record.assetCode}</div>
                                        </TableCell>
                                        <TableCell>{record.maintenanceType}</TableCell>
                                        <TableCell><Badge variant="outline">{maintenanceStatusLabel(record.status, isRtl)}</Badge></TableCell>
                                        <TableCell>{formatDate(record.maintenanceDate)}</TableCell>
                                        <TableCell>{formatDate(record.nextMaintenanceDate)}</TableCell>
                                        <TableCell>{formatMoney(record.cost, currency)}</TableCell>
                                        <TableCell>{record.vendor || record.performedBy || "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{page.pageNumber} / {totalPages}</span>
                <div className="flex gap-2">
                    <Button variant="outline" disabled={page.pageNumber <= 1} onClick={() => patchQuery({ page: page.pageNumber - 1 })}>{isRtl ? "السابق" : "Previous"}</Button>
                    <Button variant="outline" disabled={page.pageNumber >= totalPages} onClick={() => patchQuery({ page: page.pageNumber + 1 })}>{isRtl ? "التالي" : "Next"}</Button>
                </div>
            </div>
        </div>
    );
}
