"use client";

import { useEffect, useState } from "react";
import { History, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useLocale } from "@/components/locale-provider";
import { useAuthStore } from "@/store/authStore";
import { usePosStore } from "@/store/posStore";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { isSuperAdminRole } from "@/lib/authorization";
import { getBranchStockAdjustments, getRawMaterialAdjustments, StockAdjustmentResult } from "@/lib/api";
import { formatCurrency } from "@/lib/currencies";
import { getTranslatedUnit } from "@/lib/utils";

export default function StockAdjustmentsAuditPage() {
    const { t, locale } = useLocale();
    const isArabic = locale === "ar";
    const currency = usePosStore((state) => state.currency);
    const branchVersion = useActiveBranchVersion();
    const user = useAuthStore((state) => state.user);

    const [rows, setRows] = useState<StockAdjustmentResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [materialId, setMaterialId] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("materialId");
        setMaterialId(id);
    }, []);

    useEffect(() => {
        if (!isSuperAdminRole(user?.role)) return;
        let active = true;
        setIsLoading(true);
        const load = materialId ? getRawMaterialAdjustments(materialId) : getBranchStockAdjustments();
        load
            .then((data) => { if (active) setRows(data); })
            .catch(() => { if (active) setRows([]); })
            .finally(() => { if (active) setIsLoading(false); });
        return () => { active = false; };
    }, [materialId, branchVersion, user?.role]);

    // Reset to the first page whenever the result set changes (new data or search).
    useEffect(() => { setPageNumber(1); }, [search, rows]);

    if (!isSuperAdminRole(user?.role)) {
        return (
            <div className="flex h-40 items-center justify-center text-slate-500">
                {isArabic ? "غير مصرح" : "Access denied"}
            </div>
        );
    }

    const term = search.trim().toLowerCase();
    const filtered = term
        ? rows.filter((r) =>
            (r.materialName || "").toLowerCase().includes(term) ||
            (r.materialNameAr || "").toLowerCase().includes(term) ||
            (r.reason || "").toLowerCase().includes(term) ||
            (r.performedBy || "").toLowerCase().includes(term))
        : rows;

    const totalCount = filtered.length;
    const paged = filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

    const materialLabel = (r: StockAdjustmentResult) => (isArabic && r.materialNameAr ? r.materialNameAr : r.materialName);

    return (
        <div className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t("adjustAuditTitle")}</h1>
                    <p className="text-sm text-slate-500">{t("adjustAuditDesc")}</p>
                </div>
            </div>

            {materialId && (
                <Link href="/ntxadminpos/inventory" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
                    {t("adjustAuditBackToInventory")}
                </Link>
            )}

            <Card>
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">{t("adjustAuditTitle")}</CardTitle>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("adjustAuditSearch")}
                            className="ps-8"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("adjustAuditColDate")}</TableHead>
                                    <TableHead>{t("adjustAuditColMaterial")}</TableHead>
                                    <TableHead>{t("adjustAuditColType")}</TableHead>
                                    <TableHead>{t("adjustAuditColChange")}</TableHead>
                                    <TableHead>{t("adjustAuditColReason")}</TableHead>
                                    <TableHead>{t("adjustHistoryBy")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                                            {t("adjustHistoryLoading")}
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                                            {t("adjustHistoryEmpty")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paged.map((r) => {
                                        const isCost = r.kind === "UnitCost";
                                        return (
                                            <TableRow key={r.id}>
                                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                    {new Date(r.createdAt).toLocaleString(isArabic ? "ar" : "en")}
                                                </TableCell>
                                                <TableCell className="font-medium">{materialLabel(r)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={isCost ? "border-emerald-500/40 text-emerald-600" : "border-amber-500/40 text-amber-600"}>
                                                        {isCost ? t("adjustHistoryKindCost") : t("adjustHistoryKindStock")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap font-medium">
                                                    {isCost ? (
                                                        <>{formatCurrency(r.previousUnitCost ?? 0, currency)} → {formatCurrency(r.newUnitCost ?? 0, currency)}</>
                                                    ) : (
                                                        <>
                                                            {r.previousStock} → {r.newStock} {getTranslatedUnit(r.unit, locale)}
                                                            <span className={`ms-2 ${r.adjustmentQuantity > 0 ? "text-emerald-600" : "text-destructive"}`}>
                                                                ({r.adjustmentQuantity > 0 ? "+" : ""}{r.adjustmentQuantity})
                                                            </span>
                                                        </>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-[16rem] truncate" title={r.reason}>{r.reason}</TableCell>
                                                <TableCell className="whitespace-nowrap">{r.performedBy || "—"}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {!isLoading && totalCount > 0 && (
                        <PaginationControls
                            pageNumber={pageNumber}
                            pageSize={pageSize}
                            totalCount={totalCount}
                            onPageChange={setPageNumber}
                            onPageSizeChange={setPageSize}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
