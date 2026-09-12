"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { AssetActivityLog, AssetActivityLogQuery, assetsApi, PaginatedResponse } from "@/lib/api-assets";
import { AssetAuditChangeView, assetActionLabel, tx } from "@/components/assets/asset-shared";

const ACTIONS = ["Created", "Updated", "Assigned", "MaintenanceAdded", "AttachmentUploaded", "AttachmentDeleted", "StatusChanged", "Deleted", "Restored"];

export default function AssetActivityLogsPage() {
    const { isRtl } = useLocale();
    const [query, setQuery] = useState<AssetActivityLogQuery>({ page: 1, pageSize: 50 });
    const [page, setPage] = useState<PaginatedResponse<AssetActivityLog>>({ items: [], totalCount: 0, pageNumber: 1, pageSize: 50 });
    const [loading, setLoading] = useState(false);
    const totalPages = Math.max(1, Math.ceil(page.totalCount / Math.max(page.pageSize, 1)));

    const branchVersion = useActiveBranchVersion();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        assetsApi.logs(query)
            .then((data) => { if (!cancelled) setPage(data); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [branchVersion, query]);

    const patchQuery = (patch: Partial<AssetActivityLogQuery>) => setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

    return (
        <div className="space-y-4">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    <Activity className="size-6" />
                    {tx(isRtl, "logs")}
                </h1>
                <p className="text-sm text-slate-500">{isRtl ? "سجل تدقيق مركزي لكل حركة على الأصول." : "Central audit trail for asset lifecycle events."}</p>
            </div>

            <Card className="rounded-md">
                <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
                    <div>
                        <Label className="text-xs">{tx(isRtl, "action")}</Label>
                        <Select value={query.actionType || "ALL"} onValueChange={(v) => patchQuery({ actionType: v === "ALL" ? undefined : v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{tx(isRtl, "all")}</SelectItem>
                                {ACTIONS.map((action) => <SelectItem key={action} value={action}>{assetActionLabel(action, isRtl)}</SelectItem>)}
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
                        <Button variant="outline" onClick={() => setQuery({ page: 1, pageSize: 50 })}>{tx(isRtl, "reset")}</Button>
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
                                    <TableHead>{tx(isRtl, "action")}</TableHead>
                                    <TableHead>{tx(isRtl, "by")}</TableHead>
                                    <TableHead>{tx(isRtl, "time")}</TableHead>
                                    <TableHead>{tx(isRtl, "change")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {page.items.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <Link href={`/ntxadminpos/assets/${log.assetId}`} className="font-medium text-primary hover:underline">{log.assetName}</Link>
                                            <div className="font-mono text-xs text-slate-500">{log.assetCode}</div>
                                        </TableCell>
                                        <TableCell>{assetActionLabel(log.actionType, isRtl)}</TableCell>
                                        <TableCell>{log.performedBy || "-"}</TableCell>
                                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className="max-w-2xl">
                                                <AssetAuditChangeView oldValue={log.oldValue} newValue={log.newValue} isRtl={isRtl} />
                                            </div>
                                        </TableCell>
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
