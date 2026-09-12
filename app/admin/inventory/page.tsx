"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle, Package, AlertTriangle, Search, Edit, Trash2, Layers, Boxes, AlertCircle, ChevronLeft, ChevronRight, SlidersHorizontal, DollarSign, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRawMaterials, getRawMaterialsPaginated, createRawMaterial, updateRawMaterial, deleteRawMaterial, getMaterialBatches, getExpiryAlerts, adjustRawMaterialStock, adjustRawMaterialUnitCost, RawMaterial, StockBatch, StockBatchFilter, UnitLabels, ExpiryAlertsResponse } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { isSuperAdminRole } from "@/lib/authorization";
import { listWarehouses, type WarehouseDto } from "@/lib/api-warehouse";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLocale } from "@/components/locale-provider";
import type { TranslationKey } from "@/lib/translations";
import { usePosStore } from "@/store/posStore";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { formatCurrency } from "@/lib/currencies";
import { getTranslatedUnit } from "@/lib/utils";
import { retailApi } from "@/lib/api-retail";
import { useBranchContextStore } from "@/store/branchContextStore";
import { AddInventoryItemDialog } from "@/components/inventory/AddInventoryItemDialog";
import { FinishedProductsInventory } from "@/components/inventory/FinishedProductsInventory";
import { AllInventoryItems } from "@/components/inventory/AllInventoryItems";
import { InventoryTypeBadge, type InventoryItemType } from "@/components/inventory/inventory-shared";

/** What the type filter can be set to. "all" is the merged list, not a third inventory type. */
type InventoryView = InventoryItemType | "all";


/**
 * The one Inventory module.
 *
 * Two persistence models sit behind it — raw materials consumed through recipes, finished
 * products stocked as themselves on a movement ledger — and that split is deliberate, because
 * forcing either into the other table would corrupt a working model. What the operator sees is
 * one area: one title, one "Add inventory item" button, one search box, one column vocabulary,
 * one set of row actions. The inventory type is a view filter, not an application boundary,
 * and it only appears at all on a branch that actually stocks both.
 */
export default function InventoryPage() {
    const { t, locale } = useLocale();
    const ar = locale === "ar";
    const branchVersion = useActiveBranchVersion();
    const branchId = useBranchContextStore((state) => state.context?.currentBranch.id ?? null);

    const [finishedCount, setFinishedCount] = useState<number | null>(null);
    const [view, setView] = useState<InventoryView>("material");
    // One search box for the module, so the filter changes what is listed and never where the
    // operator types.
    const [search, setSearch] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    // Bumped to tell the active panel to open its create form. Keeps the one Add button in the
    // shell while each panel keeps ownership of its own form.
    const [finishedCreateSignal, setFinishedCreateSignal] = useState(0);
    const [materialCreateSignal, setMaterialCreateSignal] = useState(0);

    useEffect(() => {
        let cancelled = false;
        retailApi
            .summary(true)
            .then((summary) => {
                if (cancelled) return;
                const count = summary?.productCount ?? 0;
                setFinishedCount(count);
                // A branch that stocks both lands on everything it holds; one that stocks only
                // raw materials has nothing to merge, so it stays where it already was.
                if (count > 0) setView("all");
            })
            .catch(() => {
                if (!cancelled) setFinishedCount(0);
            });
        return () => {
            cancelled = true;
        };
    }, [branchVersion]);

    const stocksFinishedGoods = (finishedCount ?? 0) > 0;

    const startCreate = (type: InventoryItemType) => {
        setView(type);
        if (type === "finished") setFinishedCreateSignal((n) => n + 1);
        else setMaterialCreateSignal((n) => n + 1);
    };

    return (
        <div className="space-y-6 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                    <h1 className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                        {t("inventoryTitle")}
                    </h1>
                    <p className="text-muted-foreground">
                        {stocksFinishedGoods
                            ? ar
                                ? "كل ما يخزّنه هذا الفرع في مكان واحد."
                                : "Everything this branch stocks, in one place."
                            : ar
                              ? "كل ما يخزّنه هذا الفرع في مكان واحد."
                              : "Everything this branch stocks, in one place."}
                    </p>
                </div>

                <Button
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => (stocksFinishedGoods ? setAddOpen(true) : startCreate("material"))}
                >
                    <PlusCircle className="h-4 w-4" />
                    {ar ? "إضافة صنف للمخزون" : "Add inventory item"}
                </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {stocksFinishedGoods && (
                    <Tabs value={view} onValueChange={(value) => setView(value as InventoryView)}>
                        <TabsList className="w-full justify-start sm:w-auto">
                            <TabsTrigger value="all" className="gap-2">
                                <Package className="h-4 w-4" />
                                {ar ? "الكل" : "All"}
                            </TabsTrigger>
                            <TabsTrigger value="finished" className="gap-2">
                                <Boxes className="h-4 w-4" />
                                {ar ? "المنتجات" : "Products"}
                            </TabsTrigger>
                            <TabsTrigger value="material" className="gap-2">
                                <Layers className="h-4 w-4" />
                                {ar ? "مواد خام" : "Raw materials"}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={ar ? "ابحث في المخزون" : "Search inventory"}
                        className="ps-9"
                    />
                </div>
            </div>

            {view === "all" && stocksFinishedGoods ? (
                <AllInventoryItems
                    search={search}
                    branchId={branchId}
                    onOpenMaterial={(name) => {
                        setView("material");
                        setSearch(name);
                    }}
                />
            ) : view === "finished" && stocksFinishedGoods ? (
                <FinishedProductsInventory createSignal={finishedCreateSignal} branchId={branchId} search={search} />
            ) : (
                <RawMaterialsInventory createSignal={materialCreateSignal} search={search} />
            )}

            <AddInventoryItemDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                onChoose={startCreate}
                allowFinished={stocksFinishedGoods}
            />
        </div>
    );
}

/**
 * Raw-material inventory, unchanged in behaviour. The module shell now owns the page title
 * and the single Add button, so this renders the list and its own dialogs only.
 */
function RawMaterialsInventory({ createSignal, search }: { createSignal: number; search: string }) {
    const router = useRouter();
    const { t, locale } = useLocale();
    const isArabic = locale === "ar";
    const currency = usePosStore((state) => state.currency);
    const branchVersion = useActiveBranchVersion();
    const [materialData, setMaterialData] = useState<any>({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 });
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form States
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [newNameAr, setNewNameAr] = useState("");
    const [newUnit, setNewUnit] = useState("0");
    const [newMinAlert, setNewMinAlert] = useState("");
    const [showInMenu, setShowInMenu] = useState(false);
    const [isPostPrice, setIsPostPrice] = useState(false);
    const [defaultWarehouseId, setDefaultWarehouseId] = useState<string>("");
    const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
    const [isBatchesDialogOpen, setIsBatchesDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
    const [batches, setBatches] = useState<StockBatch[]>([]);
    const [isLoadingBatches, setIsLoadingBatches] = useState(false);
    const [batchesFilter, setBatchesFilter] = useState<StockBatchFilter>("active");
    const NEAR_EXPIRY_DAYS = 7;
    const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlertsResponse | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // SuperAdmin-only stock adjustment
    const currentRole = useAuthStore((state) => state.user?.role);
    const canAdjustStock = isSuperAdminRole(currentRole);
    const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
    const [adjustMaterial, setAdjustMaterial] = useState<RawMaterial | null>(null);
    const [adjustNewStock, setAdjustNewStock] = useState("");
    const [adjustReason, setAdjustReason] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjustError, setAdjustError] = useState("");

    // SuperAdmin-only unit cost editing
    const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);
    const [costMaterial, setCostMaterial] = useState<RawMaterial | null>(null);
    const [costNewValue, setCostNewValue] = useState("");
    const [costReason, setCostReason] = useState("");
    const [isSavingCost, setIsSavingCost] = useState(false);
    const [costError, setCostError] = useState("");

    // Validation helpers
    const isEnglishOnly = (text: string) => /^[a-zA-Z0-9\s\-_.,!?&()'"/+%#@]*$/.test(text);
    const isArabicOnly = (text: string) => /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF0-9\s\-_.,!?&()'"/+%#@]*$/.test(text);

    useEffect(() => {
        fetchMaterials();
    }, [pageNumber, pageSize, search, sortBy, sortOrder, branchVersion]);

    // A new search always starts at the first page, or the list can come back empty.
    useEffect(() => {
        setPageNumber(1);
    }, [search]);

    // The one Add button in the shell routes here when the operator picks "Raw material".
    useEffect(() => {
        if (createSignal > 0) openCreateDialog();
    }, [createSignal]);

    // Fetch expiry alerts on mount and on branch switch (Admin only)
    useEffect(() => {
        getExpiryAlerts(3).then(setExpiryAlerts);
    }, [branchVersion]);

    // Load active warehouses once — drives the per-material warehouse selector.
    useEffect(() => {
        listWarehouses()
            .then((rows) => setWarehouses(rows.filter((w) => w.isActive)))
            .catch(() => setWarehouses([]));
    }, []);

    const fetchMaterials = async () => {
        setIsLoading(true);
        try {
            const data = await getRawMaterialsPaginated(pageNumber, pageSize, search, sortBy, sortOrder);
            setMaterialData(data);
        } catch (error) {
            console.error("Failed to fetch materials:", error);
            toast.error(t("anErrorOccurred"));
        } finally {
            setIsLoading(false);
        }
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!newName.trim()) {
            errors.name = t("validationRequired");
        } else if (!isEnglishOnly(newName.trim())) {
            errors.name = t("validationEnglishOnly");
        }

        if (newNameAr.trim() && !isArabicOnly(newNameAr.trim())) {
            errors.nameAr = t("validationArabicOnly");
        }

        if (!newMinAlert || parseFloat(newMinAlert) < 0) {
            errors.minAlert = t("validationRequired");
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            let success = false;
            // Always send the field. null = "use tenant's Main warehouse".
            // Omitting it would let updateRawMaterial's spread merge carry the
            // previous value forward, so a switch back to Main would no-op.
            const resolvedWarehouseId = defaultWarehouseId || null;
            if (editingId) {
                const payload = {
                    id: editingId,
                    name: newName.trim(),
                    nameAr: newNameAr.trim() || undefined,
                    unit: parseInt(newUnit),
                    minimumAlertLevel: parseFloat(newMinAlert),
                    showInMenu,
                    isPostPrice,
                    defaultWarehouseId: resolvedWarehouseId,
                };
                success = await updateRawMaterial(editingId, payload);
            } else {
                const payload = {
                    name: newName.trim(),
                    nameAr: newNameAr.trim() || undefined,
                    unit: parseInt(newUnit),
                    minimumAlertLevel: parseFloat(newMinAlert),
                    showInMenu,
                    isPostPrice,
                    currentStock: 0,
                    costPerUnit: 0,
                    defaultWarehouseId: resolvedWarehouseId,
                };
                success = await createRawMaterial(payload);
            }

            if (success) {
                toast.success(editingId ? t("rawMaterialUpdated") : t("rawMaterialAdded"));
                setIsDialogOpen(false);
                resetForm();
                fetchMaterials();
            } else {
                toast.error(t("anErrorOccurred"));
            }
        } catch (err: any) {
            if (err?.response?.status === 409) {
                const msg = err?.response?.data?.message || t("validationDuplicateName");
                setFormErrors({ name: msg });
            } else {
                toast.error(t("anErrorOccurred"));
            }
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${t("confirmDeleteRawMaterial")} "${name}"?`)) return;

        const success = await deleteRawMaterial(id);
        if (success) {
            toast.success(t("rawMaterialDeleted"));
            fetchMaterials();
        } else {
            toast.error(t("deleteFailed"));
        }
    };

    const openCreateDialog = () => {
        resetForm();
        setEditingId(null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: RawMaterial) => {
        setEditingId(item.id);
        setNewName(item.name);
        setNewNameAr(item.nameAr || "");
        setNewUnit(item.unit.toString());
        setNewMinAlert(item.minimumAlertLevel.toString());
        setShowInMenu(item.showInMenu);
        setIsPostPrice(item.isPostPrice);
        setDefaultWarehouseId(item.defaultWarehouseId ?? "");
        setIsDialogOpen(true);
    };

    const openAdjustDialog = (item: RawMaterial) => {
        setAdjustMaterial(item);
        setAdjustNewStock(item.currentStock.toString());
        setAdjustReason("");
        setAdjustError("");
        setIsAdjustDialogOpen(true);
    };

    const adjustDelta =
        adjustMaterial && adjustNewStock.trim() !== "" && !isNaN(parseFloat(adjustNewStock))
            ? parseFloat(adjustNewStock) - adjustMaterial.currentStock
            : null;

    const handleAdjustStock = async () => {
        if (!adjustMaterial) return;
        setAdjustError("");

        const target = parseFloat(adjustNewStock);
        if (adjustNewStock.trim() === "" || isNaN(target) || target < 0) {
            setAdjustError(t("stockAdjustInvalidQuantity"));
            return;
        }
        if (!adjustReason.trim()) {
            setAdjustError(t("stockAdjustReasonRequired"));
            return;
        }
        if (target === adjustMaterial.currentStock) {
            setAdjustError(t("stockAdjustNoChange"));
            return;
        }

        setIsAdjusting(true);
        try {
            await adjustRawMaterialStock(adjustMaterial.id, { newStock: target, reason: adjustReason.trim() });
            toast.success(t("stockAdjustSuccess"));
            setIsAdjustDialogOpen(false);
            setAdjustMaterial(null);
            fetchMaterials();
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 403) {
                setAdjustError(t("stockAdjustForbidden"));
            } else {
                const data = err?.response?.data;
                const msg = data?.error || data?.message || (typeof data === "string" ? data : "");
                setAdjustError(msg || t("anErrorOccurred"));
            }
        } finally {
            setIsAdjusting(false);
        }
    };

    const openCostDialog = (item: RawMaterial) => {
        setCostMaterial(item);
        setCostNewValue(item.costPerUnit.toString());
        setCostReason("");
        setCostError("");
        setIsCostDialogOpen(true);
    };

    const costDelta =
        costMaterial && costNewValue.trim() !== "" && !isNaN(parseFloat(costNewValue))
            ? parseFloat(costNewValue) - costMaterial.costPerUnit
            : null;

    const handleAdjustCost = async () => {
        if (!costMaterial) return;
        setCostError("");

        const target = parseFloat(costNewValue);
        if (costNewValue.trim() === "" || isNaN(target) || target <= 0) {
            setCostError(t("unitCostInvalid"));
            return;
        }
        if (!costReason.trim()) {
            setCostError(t("stockAdjustReasonRequired"));
            return;
        }
        if (target === costMaterial.costPerUnit) {
            setCostError(t("unitCostNoChange"));
            return;
        }

        setIsSavingCost(true);
        try {
            await adjustRawMaterialUnitCost(costMaterial.id, { newUnitCost: target, reason: costReason.trim() });
            toast.success(t("unitCostSuccess"));
            setIsCostDialogOpen(false);
            setCostMaterial(null);
            fetchMaterials();
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 403) {
                setCostError(t("unitCostForbidden"));
            } else {
                const data = err?.response?.data;
                const msg = data?.error || data?.message || (typeof data === "string" ? data : "");
                setCostError(msg || t("anErrorOccurred"));
            }
        } finally {
            setIsSavingCost(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setNewName("");
        setNewNameAr("");
        setNewUnit("0");
        setNewMinAlert("");
        setShowInMenu(false);
        setIsPostPrice(false);
        setDefaultWarehouseId("");
        setFormErrors({});
    };

    const totalPages = Math.ceil(materialData.totalCount / pageSize);

    const getBatchStatus = (batch: StockBatch) => {
        // Use backend Status if available
        if (batch.status === "Finished") {
            return { label: t("statusFinished"), className: "bg-muted text-muted-foreground border-border" };
        }
        if (batch.status === "Expired") {
            return { label: t("statusExpired"), className: "bg-destructive/10 text-destructive border-destructive/20" };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(batch.expiryDate);
        expiry.setHours(0, 0, 0, 0);

        if (expiry < today) {
            return { label: t("statusExpired"), className: "bg-destructive/10 text-destructive border-destructive/20" };
        }

        const soon = new Date(today);
        soon.setDate(soon.getDate() + 7);
        if (expiry <= soon) {
            return { label: t("statusExpiringSoon"), className: "bg-warning/10 text-warning border-warning/20" };
        }

        return { label: t("statusGood"), className: "bg-success/10 text-success border-success/20" };
    };

    const loadBatches = async (materialId: string, filter: StockBatchFilter) => {
        setIsLoadingBatches(true);
        try {
            const data = await getMaterialBatches(materialId, filter);
            setBatches(data);
        } catch {
            toast.error(t("anErrorOccurred"));
        } finally {
            setIsLoadingBatches(false);
        }
    };

    const openBatchesDialog = async (material: RawMaterial) => {
        setSelectedMaterial(material);
        setBatchesFilter("active");
        setBatches([]);
        setIsBatchesDialogOpen(true);
        await loadBatches(material.id, "active");
    };

    useEffect(() => {
        if (!isBatchesDialogOpen || !selectedMaterial) return;
        loadBatches(selectedMaterial.id, batchesFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchesFilter]);

    const dayDiff = (target: Date, base: Date) => {
        const MS = 1000 * 60 * 60 * 24;
        const t1 = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
        const t2 = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
        return Math.round((t1 - t2) / MS);
    };

    const isNearExpiry = (batch: StockBatch) => {
        if (batch.status === "Expired" || batch.status === "Finished") return false;
        const today = new Date();
        const days = dayDiff(new Date(batch.expiryDate), today);
        return days >= 0 && days <= NEAR_EXPIRY_DAYS;
    };

    const isLowStockBatch = (batch: StockBatch) => {
        const init = Number(batch.quantity || 0);
        const left = Number(batch.remainingQuantity || 0);
        if (init <= 0) return false;
        return left > 0 && left / init <= 0.2;
    };

    return (
        <div className="space-y-6">
            {/* Expiry Alerts Banner (Admin Only) */}
            {expiryAlerts && (expiryAlerts.expiredCount > 0 || expiryAlerts.expiringSoonCount > 0) && (
                <div className="space-y-3">
                    {expiryAlerts.expiredCount > 0 && (
                        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-destructive">{t("statusExpired")} ({expiryAlerts.expiredCount})</p>
                                <ul className="mt-1 text-sm text-muted-foreground space-y-1">
                                    {expiryAlerts.expired.map((b) => (
                                        <li key={b.id}>
                                            {isArabic ? (b.materialNameAr || b.materialName) : b.materialName}
                                            {" — "}{b.batchNumber} — {b.remainingQuantity} {t("remaining")}
                                            {" — "}{new Date(b.expiryDate).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                    {expiryAlerts.expiringSoonCount > 0 && (
                        <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4">
                            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-warning">{t("statusExpiringSoon")} ({expiryAlerts.expiringSoonCount})</p>
                                <ul className="mt-1 text-sm text-muted-foreground space-y-1">
                                    {expiryAlerts.expiringSoon.map((b) => (
                                        <li key={b.id}>
                                            {isArabic ? (b.materialNameAr || b.materialName) : b.materialName}
                                            {" — "}{b.batchNumber} — {b.remainingQuantity} {t("remaining")}
                                            {" — "}{new Date(b.expiryDate).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    {materialData.totalCount} {t("materialsTotal")}
                </p>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingId ? t("editRawMaterial") : t("defineNewRawMaterial")}</DialogTitle>
                            <DialogDescription>
                                {editingId ? t("editRawMaterialDesc") : t("addRawMaterialDesc")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* English Name (required) */}
                            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:gap-4">
                                <Label htmlFor="name" className="sm:text-end sm:pt-2">
                                    {t("nameLabel")} <span className="text-destructive">*</span>
                                </Label>
                                <div className="space-y-1 sm:col-span-3">
                                    <Input
                                        id="name"
                                        value={newName}
                                        onChange={e => { setNewName(e.target.value); setFormErrors(prev => ({ ...prev, name: "" })); }}
                                        className={formErrors.name ? "border-destructive" : ""}
                                        placeholder={t("exampleMaterial")}
                                    />
                                    {formErrors.name && (
                                        <p className="text-xs text-destructive flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {formErrors.name}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">{t("validationEnglishOnly")}</p>
                                </div>
                            </div>
                            {/* Arabic Name (optional) */}
                            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:gap-4">
                                <Label htmlFor="nameAr" className="sm:text-end sm:pt-2">{t("nameArLabel")}</Label>
                                <div className="space-y-1 sm:col-span-3">
                                    <Input
                                        id="nameAr"
                                        value={newNameAr}
                                        onChange={e => { setNewNameAr(e.target.value); setFormErrors(prev => ({ ...prev, nameAr: "" })); }}
                                        className={formErrors.nameAr ? "border-destructive" : ""}
                                        placeholder="e.g. طماطم"
                                        dir="rtl"
                                    />
                                    {formErrors.nameAr && (
                                        <p className="text-xs text-destructive flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {formErrors.nameAr}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">{t("validationArabicOnly")}</p>
                                </div>
                            </div>
                            {/* Unit */}
                            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                                <Label htmlFor="unit" className="sm:text-end">{t("unitLabel")}</Label>
                                <Select value={newUnit} onValueChange={setNewUnit}>
                                    <SelectTrigger className="sm:col-span-3">
                                        <SelectValue placeholder={t("selectUnitPlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {UnitLabels.map((label, index) => (
                                            <SelectItem key={index} value={index.toString()}>{getTranslatedUnit(index, locale)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Warehouse — defaults to Main when left blank */}
                            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                                <Label htmlFor="warehouse" className="sm:text-end">
                                    {isArabic ? "المستودع" : "Warehouse"}
                                </Label>
                                <Select
                                    value={defaultWarehouseId || "__main__"}
                                    onValueChange={(v) => setDefaultWarehouseId(v === "__main__" ? "" : v)}
                                >
                                    <SelectTrigger className="sm:col-span-3">
                                        <SelectValue placeholder={isArabic ? "المستودع الرئيسي" : "Main Warehouse"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__main__">
                                            {isArabic ? "المستودع الرئيسي (افتراضي)" : "Main Warehouse (default)"}
                                        </SelectItem>
                                        {warehouses
                                            .filter((w) => w.type !== 0 /* Main */)
                                            .map((w) => (
                                                <SelectItem key={w.id} value={w.id}>
                                                    {w.displayName}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                                <div className="hidden sm:block" />
                                <div className="flex items-center gap-2 sm:col-span-3">
                                    <Checkbox
                                        id="showInMenu"
                                        checked={showInMenu}
                                        onCheckedChange={(checked) => setShowInMenu(checked === true)}
                                    />
                                    <Label htmlFor="showInMenu" className="text-sm font-normal">
                                        {t("showInMenuLabel")}
                                    </Label>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:gap-4">
                                <div className="hidden sm:block" />
                                <div className="space-y-1 sm:col-span-3">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="isPostPrice"
                                            checked={isPostPrice}
                                            onCheckedChange={(checked) => setIsPostPrice(checked === true)}
                                        />
                                        <Label
                                            htmlFor="isPostPrice"
                                            className="text-sm font-normal"
                                            title={t("postPriceHint")}
                                        >
                                            {t("postPriceLabel")}
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{t("postPriceHint")}</p>
                                </div>
                            </div>
                            {/* Minimum Alert Level (required) */}
                            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:gap-4">
                                <Label htmlFor="alert" className="sm:text-end sm:pt-2">
                                    {t("alertLevelLabel")} <span className="text-destructive">*</span>
                                </Label>
                                <div className="space-y-1 sm:col-span-3">
                                    <Input
                                        id="alert"
                                        type="number"
                                        value={newMinAlert}
                                        onChange={e => { setNewMinAlert(e.target.value); setFormErrors(prev => ({ ...prev, minAlert: "" })); }}
                                        className={formErrors.minAlert ? "border-destructive" : ""}
                                        placeholder={t("alertLevelPlaceholder")}
                                    />
                                    {formErrors.minAlert && (
                                        <p className="text-xs text-destructive flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {formErrors.minAlert}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("cancel")}</Button>
                            <Button onClick={handleSave}>{t("saveBtn")}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-none shadow-lg">
                <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <CardTitle>{t("inventoryList")}</CardTitle>
                        <div className="flex gap-2 flex-wrap">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue placeholder={t("sortBy")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">{t("sortByName")}</SelectItem>
                                    <SelectItem value="stock">{t("sortByStock")}</SelectItem>
                                    <SelectItem value="cost">{t("sortByCost")}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                className="w-full sm:w-20"
                            >
                                {sortOrder === "asc" ? "↑" : "↓"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{isArabic ? "الصنف" : "Item"}</TableHead>
                                    <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                                    <TableHead>{isArabic ? "المستودع" : "Warehouse"}</TableHead>
                                    <TableHead>{t("unitLabel")}</TableHead>
                                    <TableHead>{t("currentStockLabel")}</TableHead>
                                    <TableHead>{t("alertLevelLabel")}</TableHead>
                                    <TableHead>{t("unitCostCol")}</TableHead>
                                    <TableHead>{t("totalValueCol")}</TableHead>
                                    <TableHead className="text-center">{t("statusCol")}</TableHead>
                                    <TableHead className="text-end">{t("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8">
                                            <div className="flex justify-center"><div className="animate-spin">⌛</div></div>
                                        </TableCell>
                                    </TableRow>
                                ) : materialData.items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                            {t("noRecordsFound")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    materialData.items.map((item: RawMaterial) => {
                                        const isLowStock = item.currentStock <= item.minimumAlertLevel;
                                        return (
                                            <TableRow key={item.id} className={isLowStock ? "bg-destructive/5 dark:bg-red-900/20" : ""}>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Package className="w-4 h-4 text-slate-400" />
                                                        <span>{item.displayName || item.name}</span>
                                                        {item.isPostPrice && (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                                                title={t("postPriceHint")}
                                                            >
                                                                {t("postPriceBadge")}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <InventoryTypeBadge type="material" ar={isArabic} />
                                                </TableCell>
                                                <TableCell>
                                                    {item.defaultWarehouseCode ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="font-mono text-[11px] tracking-wide"
                                                            title={item.defaultWarehouseName || undefined}
                                                        >
                                                            {item.defaultWarehouseCode}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getTranslatedUnit(item.unit, locale)}</TableCell>
                                                <TableCell>
                                                    <span className={isLowStock ? "text-destructive font-bold" : ""}>
                                                        {item.currentStock}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{item.minimumAlertLevel}</TableCell>
                                                <TableCell>{formatCurrency(item.costPerUnit, currency)}</TableCell>
                                                <TableCell>{formatCurrency(item.currentStock * item.costPerUnit, currency)}</TableCell>
                                                <TableCell className="text-center">
                                                    {isLowStock ? (
                                                        <Badge variant="destructive" className="gap-1">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            {t("statusLowStock")}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-success/5 text-success border-success/20">
                                                            {t("statusOK")}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-end">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/5"
                                                            onClick={() => openEditDialog(item)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                                                            onClick={() => handleDelete(item.id, item.displayName || item.name)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-accent-foreground hover:text-accent-foreground/80 hover:bg-accent/5"
                                                            onClick={() => openBatchesDialog(item)}
                                                            title={t("stockBatchesTitle")}
                                                        >
                                                            <Layers className="w-4 h-4" />
                                                        </Button>
                                                        {canAdjustStock && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                                                                onClick={() => openAdjustDialog(item)}
                                                                title={t("stockAdjustTitle")}
                                                            >
                                                                <SlidersHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {canAdjustStock && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                                                onClick={() => openCostDialog(item)}
                                                                title={t("unitCostTitle")}
                                                            >
                                                                <DollarSign className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {canAdjustStock && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-500/10"
                                                                onClick={() => router.push(`/ntxadminpos/inventory/adjustments?materialId=${item.id}`)}
                                                                title={t("adjustHistoryTitle")}
                                                            >
                                                                <History className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-600">
                                {t("pageOf")} {pageNumber} {t("of")} {totalPages}
                            </span>
                            <Select value={pageSize.toString()} onValueChange={(val) => {
                                setPageSize(parseInt(val));
                                setPageNumber(1);
                            }}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-slate-600">{t("perPage")}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                                disabled={pageNumber === 1 || isLoading}
                            >
                                <ChevronLeft className="rtl:-scale-x-100 h-4 w-4 me-1" />
                                {t("previous")}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
                                disabled={pageNumber >= totalPages || isLoading}
                            >
                                {t("next")}
                                <ChevronRight className="rtl:-scale-x-100 h-4 w-4 ms-1" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isBatchesDialogOpen} onOpenChange={setIsBatchesDialogOpen}>
                <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] max-h-[92vh] overflow-hidden p-4 sm:w-[95vw] sm:p-8">
                    <DialogHeader>
                        <DialogTitle>
                            {t("stockBatchesTitle")} - {selectedMaterial?.displayName || selectedMaterial?.name || t("materialLabel")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("stockBatchesDesc")}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={batchesFilter} onValueChange={(v) => setBatchesFilter(v as StockBatchFilter)} className="w-full min-w-0">
                        <TabsList className="w-full justify-start sm:w-auto">
                            <TabsTrigger value="active" className="gap-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-success" />
                                {t("batchTabActive")}
                            </TabsTrigger>
                            <TabsTrigger value="expired" className="gap-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
                                {t("batchTabExpired")}
                            </TabsTrigger>
                            <TabsTrigger value="finished" className="gap-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
                                {t("batchTabFinished")}
                                <span className="text-xs text-muted-foreground">({t("batchTabFinishedHint")})</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="active" className="mt-3 w-full min-w-0 max-w-full">
                            {renderActiveBatches({
                                batches, isLoadingBatches, isArabic, currency, t, isNearExpiry, isLowStockBatch, dayDiff, getBatchStatus,
                            })}
                        </TabsContent>
                        <TabsContent value="expired" className="mt-3 w-full min-w-0 max-w-full">
                            {renderExpiredBatches({
                                batches, isLoadingBatches, isArabic, currency, t, dayDiff, getBatchStatus,
                            })}
                        </TabsContent>
                        <TabsContent value="finished" className="mt-3 w-full min-w-0 max-w-full">
                            {renderFinishedBatches({
                                batches, isLoadingBatches, isArabic, currency, t, dayDiff, getBatchStatus,
                            })}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* SuperAdmin-only: manual stock adjustment (batch/FIFO-based) */}
            <Dialog open={isAdjustDialogOpen} onOpenChange={(open) => { setIsAdjustDialogOpen(open); if (!open) setAdjustMaterial(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("stockAdjustTitle")}</DialogTitle>
                        <DialogDescription>
                            {adjustMaterial?.displayName || adjustMaterial?.name} — {t("stockAdjustDesc")}
                        </DialogDescription>
                    </DialogHeader>

                    {adjustMaterial && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between rounded-md border p-3">
                                <span className="text-sm text-muted-foreground">{t("stockAdjustCurrent")}</span>
                                <span className="font-medium">
                                    {adjustMaterial.currentStock} {getTranslatedUnit(adjustMaterial.unit, locale)}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="adjust-new-stock">{t("stockAdjustNew")} *</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="adjust-new-stock"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={adjustNewStock}
                                        onChange={(e) => setAdjustNewStock(e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                        {getTranslatedUnit(adjustMaterial.unit, locale)}
                                    </span>
                                </div>
                            </div>

                            {adjustDelta !== null && adjustDelta !== 0 && (
                                <div className="flex items-center justify-between rounded-md border p-3">
                                    <span className="text-sm text-muted-foreground">{t("stockAdjustDifference")}</span>
                                    <span className={`font-semibold ${adjustDelta > 0 ? "text-emerald-600" : "text-destructive"}`}>
                                        {adjustDelta > 0 ? "+" : ""}{adjustDelta.toFixed(2)} {getTranslatedUnit(adjustMaterial.unit, locale)}
                                    </span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="adjust-reason">{t("stockAdjustReason")} *</Label>
                                <Input
                                    id="adjust-reason"
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    maxLength={500}
                                    placeholder={t("stockAdjustReasonPlaceholder")}
                                />
                            </div>

                            {adjustError && (
                                <p className="text-sm text-destructive">{adjustError}</p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)} disabled={isAdjusting}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleAdjustStock} disabled={isAdjusting}>
                            {isAdjusting ? t("stockAdjustSaving") : t("stockAdjustApply")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SuperAdmin-only: unit cost editing (revalues remaining batches / reference cost) */}
            <Dialog open={isCostDialogOpen} onOpenChange={(open) => { setIsCostDialogOpen(open); if (!open) setCostMaterial(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("unitCostTitle")}</DialogTitle>
                        <DialogDescription>
                            {costMaterial?.displayName || costMaterial?.name} — {t("unitCostDesc")}
                        </DialogDescription>
                    </DialogHeader>

                    {costMaterial && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between rounded-md border p-3">
                                <span className="text-sm text-muted-foreground">{t("unitCostCurrent")}</span>
                                <span className="font-medium">
                                    {formatCurrency(costMaterial.costPerUnit, currency)} / {getTranslatedUnit(costMaterial.unit, locale)}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="cost-new-value">{t("unitCostNew")} *</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="cost-new-value"
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={costNewValue}
                                        onChange={(e) => setCostNewValue(e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                        {currency} / {getTranslatedUnit(costMaterial.unit, locale)}
                                    </span>
                                </div>
                            </div>

                            {costDelta !== null && costDelta !== 0 && (
                                <div className="flex items-center justify-between rounded-md border p-3">
                                    <span className="text-sm text-muted-foreground">{t("unitCostDifference")}</span>
                                    <span className={`font-semibold ${costDelta > 0 ? "text-destructive" : "text-emerald-600"}`}>
                                        {costDelta > 0 ? "+" : ""}{costDelta.toFixed(3)} {currency}
                                    </span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="cost-reason">{t("stockAdjustReason")} *</Label>
                                <Input
                                    id="cost-reason"
                                    value={costReason}
                                    onChange={(e) => setCostReason(e.target.value)}
                                    maxLength={500}
                                    placeholder={t("stockAdjustReasonPlaceholder")}
                                />
                            </div>

                            {costError && (
                                <p className="text-sm text-destructive">{costError}</p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCostDialogOpen(false)} disabled={isSavingCost}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleAdjustCost} disabled={isSavingCost}>
                            {isSavingCost ? t("stockAdjustSaving") : t("unitCostApply")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

// ----- Per-tab renderers (kept inside this file to avoid creating a new module) -----

type BatchTabCtx = {
    batches: StockBatch[];
    isLoadingBatches: boolean;
    isArabic: boolean;
    currency: string;
    t: (key: TranslationKey) => string;
    dayDiff: (target: Date, base: Date) => number;
    getBatchStatus: (batch: StockBatch) => { label: string; className: string };
};
type ActiveCtx = BatchTabCtx & {
    isNearExpiry: (b: StockBatch) => boolean;
    isLowStockBatch: (b: StockBatch) => boolean;
};

function getMaterialDisplayName(batch: StockBatch, isArabic: boolean): string {
    return isArabic
        ? (batch.nameAr || batch.materialNameAr || batch.name || batch.materialName || "")
        : (batch.name || batch.materialName || batch.nameAr || batch.materialNameAr || "");
}

function getSupplierDisplay(batch: StockBatch, isArabic: boolean): string {
    return (isArabic ? (batch.supplierNameAr || batch.supplierName) : (batch.supplierName || batch.supplierNameAr)) || "—";
}

function batchScrollWrapClass() {
    return "w-full max-w-full min-w-0 border rounded-lg max-h-[68vh] overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300";
}

function StickyHeaderRow({ children }: { children: React.ReactNode }) {
    return (
        <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--border)]">
            <TableRow>{children}</TableRow>
        </TableHeader>
    );
}

function renderActiveBatches(ctx: ActiveCtx) {
    const { batches, isLoadingBatches, isArabic, currency, t, dayDiff, getBatchStatus, isNearExpiry, isLowStockBatch } = ctx;
    const today = new Date();
    return (
        <div className={batchScrollWrapClass()} style={{ scrollbarWidth: "thin" }}>
            <Table className="w-full min-w-[1180px] text-sm sm:text-base">
                <StickyHeaderRow>
                    <TableHead className="font-semibold">{t("batchNumberCol")}</TableHead>
                    <TableHead className="font-semibold">{t("materialNameCol")}</TableHead>
                    <TableHead className="font-semibold">{t("remainingQuantityCol")}</TableHead>
                    <TableHead className="font-semibold">{t("daysRemainingCol")}</TableHead>
                    <TableHead className="font-semibold">{t("unitCostCol")}</TableHead>
                    <TableHead className="font-semibold">{t("totalCostCol")}</TableHead>
                    <TableHead className="font-semibold">{t("supplierCol")}</TableHead>
                    <TableHead className="font-semibold">{t("purchaseOrderNumberCol")}</TableHead>
                    <TableHead className="font-semibold">{t("expiryDateCol")}</TableHead>
                    <TableHead className="font-semibold">{t("statusCol")}</TableHead>
                </StickyHeaderRow>
                <TableBody>
                    {isLoadingBatches ? (
                        <TableRow><TableCell colSpan={10} className="text-center py-6">{t("loadingText")}</TableCell></TableRow>
                    ) : batches.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center py-6 text-slate-500">{t("noBatchesFound")}</TableCell></TableRow>
                    ) : (
                        batches.map((batch) => {
                            const unitCost = Number(batch.unitCost || 0);
                            const remaining = Number(batch.remainingQuantity || 0);
                            const remainingValue = Number(batch.totalCost != null ? remaining * unitCost : remaining * unitCost);
                            const expiry = new Date(batch.expiryDate);
                            const days = dayDiff(expiry, today);
                            const near = isNearExpiry(batch);
                            const low = isLowStockBatch(batch);
                            const status = getBatchStatus(batch);
                            return (
                                <TableRow key={batch.id} dir={isArabic ? "rtl" : "ltr"} className={near ? "bg-warning/5" : ""}>
                                    <TableCell className="font-medium max-w-[180px]">
                                        <span className="block truncate" title={batch.batchNumber}>{batch.batchNumber}</span>
                                    </TableCell>
                                    <TableCell className="truncate">{getMaterialDisplayName(batch, isArabic)}</TableCell>
                                    <TableCell className="whitespace-nowrap font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{remaining}</span>
                                            {low && (
                                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                                                    {t("lowStockBadge")}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <span className={near ? "text-warning font-semibold" : ""}>
                                            {days} {t("daysShort")}
                                        </span>
                                        {near && (
                                            <Badge variant="outline" className="ms-2 bg-warning/10 text-warning border-warning/20 text-[10px]">
                                                {t("nearExpiryBadge")}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{formatCurrency(unitCost, currency)}</TableCell>
                                    <TableCell className="whitespace-nowrap font-medium">{formatCurrency(remainingValue, currency)}</TableCell>
                                    <TableCell className="truncate max-w-[160px]">{getSupplierDisplay(batch, isArabic)}</TableCell>
                                    <TableCell className="truncate max-w-[140px]">{batch.purchaseOrderNumber || "—"}</TableCell>
                                    <TableCell className="whitespace-nowrap">{expiry.toLocaleDateString(isArabic ? "ar-SA" : "en-US")}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function renderExpiredBatches(ctx: BatchTabCtx) {
    const { batches, isLoadingBatches, isArabic, currency, t, dayDiff, getBatchStatus } = ctx;
    const today = new Date();
    return (
        <div className={batchScrollWrapClass()} style={{ scrollbarWidth: "thin" }}>
            <Table className="w-full min-w-[1100px] text-sm sm:text-base">
                <StickyHeaderRow>
                    <TableHead className="font-semibold">{t("batchNumberCol")}</TableHead>
                    <TableHead className="font-semibold">{t("materialNameCol")}</TableHead>
                    <TableHead className="font-semibold">{t("remainingQuantityCol")}</TableHead>
                    <TableHead className="font-semibold">{t("expiryDateCol")}</TableHead>
                    <TableHead className="font-semibold">{t("daysExpiredCol")}</TableHead>
                    <TableHead className="font-semibold">{t("estimatedLossCol")}</TableHead>
                    <TableHead className="font-semibold">{t("supplierCol")}</TableHead>
                    <TableHead className="font-semibold">{t("purchaseOrderNumberCol")}</TableHead>
                    <TableHead className="font-semibold">{t("statusCol")}</TableHead>
                </StickyHeaderRow>
                <TableBody>
                    {isLoadingBatches ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-6">{t("loadingText")}</TableCell></TableRow>
                    ) : batches.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-6 text-slate-500">{t("noBatchesFound")}</TableCell></TableRow>
                    ) : (
                        batches.map((batch) => {
                            const unitCost = Number(batch.unitCost || 0);
                            const remaining = Number(batch.remainingQuantity || 0);
                            const expiry = new Date(batch.expiryDate);
                            const daysExpired = Math.max(0, dayDiff(today, expiry));
                            const loss = remaining * unitCost;
                            const hasStock = remaining > 0;
                            const status = getBatchStatus(batch);
                            return (
                                <TableRow key={batch.id} dir={isArabic ? "rtl" : "ltr"} className={hasStock ? "bg-destructive/5" : ""}>
                                    <TableCell className="font-medium max-w-[180px]">
                                        <span className="block truncate" title={batch.batchNumber}>{batch.batchNumber}</span>
                                    </TableCell>
                                    <TableCell className="truncate">{getMaterialDisplayName(batch, isArabic)}</TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className={hasStock ? "text-destructive font-semibold" : ""}>{remaining}</span>
                                            {hasStock && (
                                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                                                    {t("expiredWithStockBadge")}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{expiry.toLocaleDateString(isArabic ? "ar-SA" : "en-US")}</TableCell>
                                    <TableCell className="whitespace-nowrap text-destructive font-medium">{daysExpired} {t("daysShort")}</TableCell>
                                    <TableCell className="whitespace-nowrap font-medium text-destructive">{formatCurrency(loss, currency)}</TableCell>
                                    <TableCell className="truncate max-w-[160px]">{getSupplierDisplay(batch, isArabic)}</TableCell>
                                    <TableCell className="truncate max-w-[140px]">{batch.purchaseOrderNumber || "—"}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function renderFinishedBatches(ctx: BatchTabCtx) {
    const { batches, isLoadingBatches, isArabic, currency, t, dayDiff, getBatchStatus } = ctx;
    return (
        <div className={batchScrollWrapClass()} style={{ scrollbarWidth: "thin" }}>
            <Table className="w-full min-w-[1100px] text-sm sm:text-base">
                <StickyHeaderRow>
                    <TableHead className="font-semibold">{t("batchNumberCol")}</TableHead>
                    <TableHead className="font-semibold">{t("materialNameCol")}</TableHead>
                    <TableHead className="font-semibold">{t("totalConsumedCol")}</TableHead>
                    <TableHead className="font-semibold">{t("unitCostCol")}</TableHead>
                    <TableHead className="font-semibold">{t("totalCostCol")}</TableHead>
                    <TableHead className="font-semibold">{t("createdDate")}</TableHead>
                    <TableHead className="font-semibold">{t("finishedDateCol")}</TableHead>
                    <TableHead className="font-semibold">{t("consumptionDurationCol")}</TableHead>
                    <TableHead className="font-semibold">{t("supplierCol")}</TableHead>
                    <TableHead className="font-semibold">{t("statusCol")}</TableHead>
                </StickyHeaderRow>
                <TableBody>
                    {isLoadingBatches ? (
                        <TableRow><TableCell colSpan={10} className="text-center py-6">{t("loadingText")}</TableCell></TableRow>
                    ) : batches.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center py-6 text-slate-500">{t("noBatchesFound")}</TableCell></TableRow>
                    ) : (
                        batches.map((batch) => {
                            const unitCost = Number(batch.unitCost || 0);
                            const initialQty = Number(batch.quantity || 0);
                            const consumed = initialQty - Number(batch.remainingQuantity || 0);
                            const totalCost = Number(batch.totalCost ?? initialQty * unitCost);
                            const createdAt = batch.createdAt ? new Date(batch.createdAt) : null;
                            const finishedAt = batch.finishedAt ? new Date(batch.finishedAt) : null;
                            const duration = createdAt && finishedAt ? dayDiff(finishedAt, createdAt) : null;
                            const status = getBatchStatus(batch);
                            return (
                                <TableRow key={batch.id} dir={isArabic ? "rtl" : "ltr"} className="bg-muted/30">
                                    <TableCell className="font-medium max-w-[180px]">
                                        <span className="block truncate" title={batch.batchNumber}>{batch.batchNumber}</span>
                                    </TableCell>
                                    <TableCell className="truncate">{getMaterialDisplayName(batch, isArabic)}</TableCell>
                                    <TableCell className="whitespace-nowrap font-medium">{consumed}</TableCell>
                                    <TableCell className="whitespace-nowrap">{formatCurrency(unitCost, currency)}</TableCell>
                                    <TableCell className="whitespace-nowrap font-medium">{formatCurrency(totalCost, currency)}</TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {createdAt ? createdAt.toLocaleDateString(isArabic ? "ar-SA" : "en-US") : "—"}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {finishedAt ? finishedAt.toLocaleDateString(isArabic ? "ar-SA" : "en-US") : "—"}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {duration != null ? `${duration} ${t("daysShort")}` : "—"}
                                    </TableCell>
                                    <TableCell className="truncate max-w-[160px]">{getSupplierDisplay(batch, isArabic)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
