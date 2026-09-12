"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowRightLeft, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getRawMaterials, type RawMaterial } from "@/lib/api";
import {
    listWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    listInventory,
    listTransfers,
    createTransfer,
    getStockByWarehouse,
    WarehouseType,
    type WarehouseDto,
    type WarehouseUpsertDto,
    type RawMaterialInventoryDto,
    type InventoryTransferDto,
    type StockByWarehouseRowDto,
} from "@/lib/api-warehouse";
import { useLocale } from "@/components/locale-provider";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import type { TranslationKey } from "@/lib/translations";

const TYPE_LABEL_KEYS: Record<WarehouseType, TranslationKey> = {
    [WarehouseType.Main]: "warehousesTypeMain",
    [WarehouseType.Sub]: "warehousesTypeSub",
    [WarehouseType.Production]: "warehousesTypeProduction",
};

const EMPTY_WAREHOUSE: WarehouseUpsertDto = {
    code: "",
    name: "",
    nameAr: "",
    type: WarehouseType.Sub,
    isActive: true,
};

export default function WarehousesPage() {
    const { t } = useLocale();
    const branchVersion = useActiveBranchVersion();
    const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
    const [inventory, setInventory] = useState<RawMaterialInventoryDto[]>([]);
    const [transfers, setTransfers] = useState<InventoryTransferDto[]>([]);
    const [stockReport, setStockReport] = useState<StockByWarehouseRowDto[]>([]);
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [loading, setLoading] = useState(true);

    const [editing, setEditing] = useState<WarehouseDto | null>(null);
    const [form, setForm] = useState<WarehouseUpsertDto>(EMPTY_WAREHOUSE);
    const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);

    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [transferForm, setTransferForm] = useState({
        fromWarehouseId: "",
        toWarehouseId: "",
        rawMaterialId: "",
        quantity: 0,
        notes: "",
    });
    const [lowOnly, setLowOnly] = useState(false);
    const [reportWarehouseId, setReportWarehouseId] = useState<string>("all");

    const refreshAll = async () => {
        setLoading(true);
        try {
            const [ws, inv, tx, rep, mats] = await Promise.all([
                listWarehouses(),
                listInventory(),
                listTransfers(),
                getStockByWarehouse(),
                getRawMaterials(),
            ]);
            setWarehouses(ws);
            setInventory(inv);
            setTransfers(tx);
            setStockReport(rep);
            setMaterials(mats);
        } catch (err: any) {
            toast.error(err?.message ?? t("warehousesToastLoadFailed"));
        } finally {
            setLoading(false);
        }
    };

    // Warehouse inventory, transfers, and the stock report are branch-owned.
    useEffect(() => {
        refreshAll();
    }, [branchVersion]);

    const reloadReport = async () => {
        const params: { warehouseId?: string; lowOnly?: boolean } = { lowOnly };
        if (reportWarehouseId !== "all") params.warehouseId = reportWarehouseId;
        const rep = await getStockByWarehouse(params);
        setStockReport(rep);
    };

    useEffect(() => {
        reloadReport();
    }, [lowOnly, reportWarehouseId, branchVersion]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_WAREHOUSE);
        setWarehouseDialogOpen(true);
    };

    const openEdit = (w: WarehouseDto) => {
        setEditing(w);
        setForm({
            code: w.code,
            name: w.name,
            nameAr: w.nameAr ?? "",
            type: w.type,
            isActive: w.isActive,
        });
        setWarehouseDialogOpen(true);
    };

    const saveWarehouse = async () => {
        if (!form.code.trim() || !form.name.trim()) {
            toast.error(t("warehousesToastCodeNameRequired"));
            return;
        }
        try {
            if (editing) {
                await updateWarehouse(editing.id, form);
                toast.success(t("warehousesToastUpdated"));
            } else {
                await createWarehouse(form);
                toast.success(t("warehousesToastCreated"));
            }
            setWarehouseDialogOpen(false);
            await refreshAll();
        } catch (err: any) {
            toast.error(err?.message ?? t("warehousesToastSaveFailed"));
        }
    };

    const removeWarehouse = async (w: WarehouseDto) => {
        if (!confirm(`${t("warehousesToastDeleteConfirm")} "${w.name}"?`)) return;
        try {
            await deleteWarehouse(w.id);
            toast.success(t("warehousesToastDeleted"));
            await refreshAll();
        } catch (err: any) {
            toast.error(err?.message ?? t("warehousesToastDeleteFailed"));
        }
    };

    const submitTransfer = async () => {
        if (!transferForm.fromWarehouseId || !transferForm.toWarehouseId || !transferForm.rawMaterialId) {
            toast.error(t("warehousesToastPickFromToMaterial"));
            return;
        }
        if (transferForm.fromWarehouseId === transferForm.toWarehouseId) {
            toast.error(t("warehousesToastFromToMustDiffer"));
            return;
        }
        if (transferForm.quantity <= 0) {
            toast.error(t("warehousesToastQtyGreaterZero"));
            return;
        }
        try {
            await createTransfer({
                fromWarehouseId: transferForm.fromWarehouseId,
                toWarehouseId: transferForm.toWarehouseId,
                rawMaterialId: transferForm.rawMaterialId,
                quantity: transferForm.quantity,
                notes: transferForm.notes || null,
            });
            toast.success(t("warehousesToastTransferCompleted"));
            setTransferDialogOpen(false);
            setTransferForm({ fromWarehouseId: "", toWarehouseId: "", rawMaterialId: "", quantity: 0, notes: "" });
            await refreshAll();
        } catch (err: any) {
            toast.error(err?.message ?? t("warehousesToastTransferFailed"));
        }
    };

    const lowCount = useMemo(() => stockReport.filter((r) => r.isLow).length, [stockReport]);

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{t("warehousesTitle")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("warehousesSubtitle")}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" /> {t("refreshBtn")}
                </Button>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList>
                    <TabsTrigger value="list">{t("warehousesTabList")}</TabsTrigger>
                    <TabsTrigger value="inventory">{t("warehousesTabInventory")}</TabsTrigger>
                    <TabsTrigger value="transfers">{t("warehousesTabTransfers")}</TabsTrigger>
                    <TabsTrigger value="report">
                        {t("warehousesTabReport")}
                        {lowCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {lowCount} {t("warehousesLowBadge")}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("warehousesAllTitle")}</CardTitle>
                                <CardDescription>{t("warehousesAllDesc")}</CardDescription>
                            </div>
                            <Button size="sm" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-2" /> {t("warehousesNewBtn")}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("warehousesColCode")}</TableHead>
                                        <TableHead>{t("warehousesColName")}</TableHead>
                                        <TableHead>{t("warehousesColType")}</TableHead>
                                        <TableHead>{t("statusCol")}</TableHead>
                                        <TableHead className="text-right">{t("actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {warehouses.map((w) => (
                                        <TableRow key={w.id}>
                                            <TableCell className="font-mono text-xs">{w.code}</TableCell>
                                            <TableCell>{w.displayName}</TableCell>
                                            <TableCell>
                                                <Badge variant={w.type === WarehouseType.Main ? "default" : "secondary"}>
                                                    {t(TYPE_LABEL_KEYS[w.type])}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {w.isActive ? (
                                                    <Badge variant="outline">{t("warehousesActive")}</Badge>
                                                ) : (
                                                    <Badge variant="destructive">{t("warehousesInactive")}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {w.type !== WarehouseType.Main && (
                                                    <Button size="sm" variant="ghost" onClick={() => removeWarehouse(w)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {warehouses.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                {t("warehousesEmpty")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="inventory">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("warehousesInvTitle")}</CardTitle>
                            <CardDescription>{t("warehousesInvDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("warehousesInvColWarehouse")}</TableHead>
                                        <TableHead>{t("warehousesInvColMaterial")}</TableHead>
                                        <TableHead className="text-right">{t("warehousesInvColQty")}</TableHead>
                                        <TableHead className="text-right">{t("warehousesInvColMin")}</TableHead>
                                        <TableHead className="text-right">{t("warehousesInvColReorder")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventory.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.warehouseName}</TableCell>
                                            <TableCell>{row.rawMaterialName}</TableCell>
                                            <TableCell className="text-right">
                                                {row.quantity.toFixed(2)} {row.unit}
                                            </TableCell>
                                            <TableCell className="text-right">{row.minimumQuantity.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{row.reorderLevel.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {inventory.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                {t("warehousesInvEmpty")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transfers">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("warehousesTrTitle")}</CardTitle>
                                <CardDescription>{t("warehousesTrDesc")}</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => setTransferDialogOpen(true)}>
                                <ArrowRightLeft className="h-4 w-4 mr-2" /> {t("warehousesTrNewBtn")}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("warehousesTrColDate")}</TableHead>
                                        <TableHead>{t("warehousesTrColFrom")}</TableHead>
                                        <TableHead>{t("warehousesTrColTo")}</TableHead>
                                        <TableHead>{t("warehousesTrColMaterial")}</TableHead>
                                        <TableHead className="text-right">{t("warehousesTrColQty")}</TableHead>
                                        <TableHead>{t("warehousesTrColBy")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transfers.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="text-xs">{new Date(tx.createdAt).toLocaleString()}</TableCell>
                                            <TableCell>{tx.fromWarehouseName}</TableCell>
                                            <TableCell>{tx.toWarehouseName}</TableCell>
                                            <TableCell>{tx.rawMaterialName}</TableCell>
                                            <TableCell className="text-right">
                                                {tx.quantity.toFixed(2)} {tx.unit}
                                            </TableCell>
                                            <TableCell className="text-xs">{tx.performedByName ?? "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                    {transfers.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                {t("warehousesTrEmpty")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="report">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("warehousesRepTitle")}</CardTitle>
                            <CardDescription>{t("warehousesRepDesc")}</CardDescription>
                            <div className="flex items-center gap-3 pt-2">
                                <Select value={reportWarehouseId} onValueChange={setReportWarehouseId}>
                                    <SelectTrigger className="w-56">
                                        <SelectValue placeholder={t("warehousesRepAllOpt")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("warehousesRepAllOpt")}</SelectItem>
                                        {warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center gap-2">
                                    <Switch checked={lowOnly} onCheckedChange={setLowOnly} id="low-only" />
                                    <Label htmlFor="low-only">{t("warehousesRepLowOnly")}</Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("warehousesInvColWarehouse")}</TableHead>
                                        <TableHead>{t("warehousesInvColMaterial")}</TableHead>
                                        <TableHead className="text-right">{t("warehousesInvColQty")}</TableHead>
                                        <TableHead className="text-right">{t("warehousesInvColMin")}</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stockReport.map((r) => (
                                        <TableRow key={`${r.warehouseId}-${r.rawMaterialId}`}>
                                            <TableCell>{r.warehouseName}</TableCell>
                                            <TableCell>{r.rawMaterialName}</TableCell>
                                            <TableCell className="text-right">
                                                {r.quantity.toFixed(2)} {r.unit}
                                            </TableCell>
                                            <TableCell className="text-right">{r.minimumQuantity.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {r.isLow && (
                                                    <Badge variant="destructive" className="gap-1">
                                                        <AlertTriangle className="h-3 w-3" /> {t("warehousesRepLowBadge")}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {stockReport.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                {t("warehousesRepEmpty")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? t("warehousesEditTitle") : t("warehousesNewTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-2">
                        <div>
                            <Label htmlFor="wh-code">{t("warehousesDlgCodeLbl")}</Label>
                            <Input
                                id="wh-code"
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                                disabled={editing?.type === WarehouseType.Main}
                            />
                        </div>
                        <div>
                            <Label htmlFor="wh-name">{t("warehousesDlgNameEnLbl")}</Label>
                            <Input
                                id="wh-name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="wh-name-ar">{t("warehousesDlgNameArLbl")}</Label>
                            <Input
                                id="wh-name-ar"
                                value={form.nameAr ?? ""}
                                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>{t("warehousesDlgTypeLbl")}</Label>
                            <Select
                                value={String(form.type)}
                                onValueChange={(v) => setForm({ ...form, type: Number(v) as WarehouseType })}
                                disabled={editing?.type === WarehouseType.Main}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(WarehouseType.Sub)}>{t("warehousesTypeSub")}</SelectItem>
                                    <SelectItem value={String(WarehouseType.Production)}>{t("warehousesTypeProduction")}</SelectItem>
                                    {editing?.type === WarehouseType.Main && (
                                        <SelectItem value={String(WarehouseType.Main)}>{t("warehousesTypeMain")}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                            <Switch
                                id="wh-active"
                                checked={form.isActive}
                                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                            />
                            <Label htmlFor="wh-active">{t("warehousesDlgActiveLbl")}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setWarehouseDialogOpen(false)}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={saveWarehouse}>{editing ? t("saveBtn") : t("warehousesDlgCreateBtn")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("warehousesTrDlgTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-2">
                        <div>
                            <Label>{t("warehousesTrDlgFromLbl")}</Label>
                            <Select
                                value={transferForm.fromWarehouseId}
                                onValueChange={(v) => setTransferForm({ ...transferForm, fromWarehouseId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("warehousesTrDlgSourcePh")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.filter((w) => w.isActive).map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>{t("warehousesTrDlgToLbl")}</Label>
                            <Select
                                value={transferForm.toWarehouseId}
                                onValueChange={(v) => setTransferForm({ ...transferForm, toWarehouseId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("warehousesTrDlgDestPh")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.filter((w) => w.isActive).map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label>{t("warehousesTrDlgMaterialLbl")}</Label>
                            <Select
                                value={transferForm.rawMaterialId}
                                onValueChange={(v) => setTransferForm({ ...transferForm, rawMaterialId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("warehousesTrDlgMaterialPh")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {materials.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.displayName ?? m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>{t("warehousesTrDlgQtyLbl")}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={transferForm.quantity}
                                onChange={(e) =>
                                    setTransferForm({ ...transferForm, quantity: Number(e.target.value) })
                                }
                            />
                        </div>
                        <div className="col-span-2">
                            <Label>{t("warehousesTrDlgNotesLbl")}</Label>
                            <Textarea
                                value={transferForm.notes}
                                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setTransferDialogOpen(false)}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={submitTransfer}>{t("warehousesTrDlgSubmitBtn")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
