"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    getTables, createTable, deleteTable, resetTable, updateTable,
    getTableCategories, createTableCategory, deleteTableCategory, updateTableCategory,
} from "@/lib/api";
import { Table, TableStatus, TableCategoryDto } from "@/types/pos";
import { Trash2, Plus, Armchair, Save, RefreshCw, QrCode, AlertCircle, Users, Tag, Layers } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import { useActiveBranchVersion } from "@/store/branchContextStore";

const COLOR_OPTIONS = [
    { value: "#3b82f6", label: "Blue" },
    { value: "#10b981", label: "Green" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#ef4444", label: "Red" },
    { value: "#ec4899", label: "Pink" },
    { value: "#06b6d4", label: "Cyan" },
    { value: "#64748b", label: "Slate" },
];

const STATUS_META: Record<TableStatus, { label: string; badge: string; icon: string; ring: string }> = {
    [TableStatus.Free]:     { label: "tableEmpty",    badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "bg-emerald-50 text-emerald-600", ring: "border-slate-200 hover:border-emerald-300" },
    [TableStatus.Occupied]: { label: "tableOccupied", badge: "bg-rose-50 text-rose-700 border-rose-200",         icon: "bg-rose-50 text-rose-500",        ring: "border-rose-200 hover:border-rose-300" },
    [TableStatus.Reserved]: { label: "tableReserved", badge: "bg-amber-50 text-amber-700 border-amber-200",      icon: "bg-amber-50 text-amber-500",      ring: "border-amber-200 hover:border-amber-300" },
};

export default function TablesAdminPage() {
    const { t } = useLocale();

    // Data
    const [categories, setCategories] = useState<TableCategoryDto[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter
    const [activeFilter, setActiveFilter] = useState<string>("all");

    // Create Table dialog
    const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
    const [newTableName, setNewTableName] = useState("");
    const [newTableNameAr, setNewTableNameAr] = useState("");
    const [newTableCapacity, setNewTableCapacity] = useState(4);
    const [newTableCategoryId, setNewTableCategoryId] = useState<string>("");
    const [tableFormErrors, setTableFormErrors] = useState<Record<string, string>>({});
    const [editingTableId, setEditingTableId] = useState<string | null>(null);

    // Create Category dialog
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryNameAr, setNewCategoryNameAr] = useState("");
    const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
    const [categoryFormErrors, setCategoryFormErrors] = useState<Record<string, string>>({});
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

    const isEnglishOnly = (text: string) => /^[a-zA-Z0-9\s\-_.,!?&()'"/+%#@]*$/.test(text);
    const isArabicOnly  = (text: string) => /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF0-9\s\-_.,!?&()'"/+%#@]*$/.test(text);

    const branchVersion = useActiveBranchVersion();
    useEffect(() => { fetchAll(); }, [branchVersion]);

    const fetchAll = async () => {
        setIsLoading(true);
        const [cats, tbls] = await Promise.all([getTableCategories(), getTables()]);
        setCategories(cats);
        setTables(tbls);
        setIsLoading(false);
    };

    // ── Category CRUD ──────────────────────────────────────────────────────────

    const validateCategoryForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!newCategoryName.trim()) {
            errors.name = t("validationRequired");
        } else if (!isEnglishOnly(newCategoryName.trim())) {
            errors.name = t("validationEnglishOnly");
        }
        if (newCategoryNameAr.trim() && !isArabicOnly(newCategoryNameAr.trim())) {
            errors.nameAr = t("validationArabicOnly");
        }
        setCategoryFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resetCategoryForm = () => {
        setNewCategoryName("");
        setNewCategoryNameAr("");
        setNewCategoryColor("#3b82f6");
        setCategoryFormErrors({});
        setEditingCategoryId(null);
    };

    const handleSaveCategory = async () => {
        if (!validateCategoryForm()) return;
        try {
            if (editingCategoryId) {
                // Update mode
                await updateTableCategory(
                    editingCategoryId,
                    newCategoryName.trim(),
                    newCategoryNameAr.trim() || undefined,
                    newCategoryColor,
                );
                toast.success(t("categoryUpdated") || "Category updated");
            } else {
                // Create mode
                await createTableCategory(
                    newCategoryName.trim(),
                    newCategoryNameAr.trim() || undefined,
                    newCategoryColor,
                );
                toast.success(t("categoryCreated"));
            }
            resetCategoryForm();
            setIsCategoryDialogOpen(false);
            fetchAll();
        } catch (err: any) {
            if (err?.response?.status === 409) {
                setCategoryFormErrors({ name: err?.response?.data?.message ?? t("validationDuplicateName") });
            } else {
                toast.error(err?.response?.data?.message ?? (editingCategoryId ? t("categoryFailedUpdate") : t("categoryFailedCreate")));
            }
        }
    };

    const handleEditCategory = (category: TableCategoryDto) => {
        setEditingCategoryId(category.id);
        setNewCategoryName(category.name);
        setNewCategoryNameAr(category.nameAr || "");
        setNewCategoryColor(category.color || "#3b82f6");
        setCategoryFormErrors({});
        setIsCategoryDialogOpen(true);
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm(t("confirmDeleteCategory"))) return;
        const success = await deleteTableCategory(id);
        if (success) {
            toast.success(t("categoryDeleted"));
            if (activeFilter === id) setActiveFilter("all");
            fetchAll();
        } else {
            toast.error(t("categoryDeleteFailed"));
        }
    };

    // ── Table CRUD ─────────────────────────────────────────────────────────────

    const validateTableForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!newTableName.trim()) {
            errors.name = t("validationRequired");
        } else if (!isEnglishOnly(newTableName.trim())) {
            errors.name = t("validationEnglishOnly");
        }
        if (newTableNameAr.trim() && !isArabicOnly(newTableNameAr.trim())) {
            errors.nameAr = t("validationArabicOnly");
        }
        if (!newTableCapacity || newTableCapacity < 1) {
            errors.capacity = t("validationRequired");
        }
        setTableFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resetTableForm = () => {
        setNewTableName("");
        setNewTableNameAr("");
        setNewTableCapacity(4);
        setNewTableCategoryId("");
        setTableFormErrors({});
        setEditingTableId(null);
    };

    const handleSaveTable = async () => {
        if (!validateTableForm()) return;
        try {
            if (editingTableId) {
                // Update mode
                await updateTable(
                    editingTableId,
                    newTableName.trim(),
                    newTableCapacity,
                    newTableNameAr.trim() || undefined,
                    newTableCategoryId || undefined,
                );
                toast.success(t("tableUpdated") || "Table updated");
            } else {
                // Create mode
                await createTable(
                    newTableName.trim(),
                    newTableCapacity,
                    newTableNameAr.trim() || undefined,
                    newTableCategoryId || undefined,
                );
                toast.success(t("tableCreated"));
            }
            resetTableForm();
            setIsTableDialogOpen(false);
            fetchAll();
        } catch (err: any) {
            if (err?.response?.status === 409) {
                setTableFormErrors({ name: err?.response?.data?.message ?? t("validationDuplicateName") });
            } else {
                toast.error(err?.response?.data?.message ?? (editingTableId ? t("tableFailedUpdate") : t("tableFailedCreate")));
            }
        }
    };

    const handleEditTable = (table: Table) => {
        setEditingTableId(table.id);
        setNewTableName(table.name);
        setNewTableNameAr(table.nameAr || "");
        setNewTableCapacity(table.capacity);
        setNewTableCategoryId(table.tableCategoryId || "");
        setTableFormErrors({});
        setIsTableDialogOpen(true);
    };

    const handleDeleteTable = async (id: string) => {
        if (!confirm(t("confirmDeleteTable"))) return;
        const success = await deleteTable(id);
        if (success) { toast.success(t("tableDeleted")); fetchAll(); }
        else toast.error(t("tableDeleteFailed"));
    };

    const handleResetTable = async (id: string) => {
        if (!confirm(t("confirmResetTable"))) return;
        const success = await resetTable(id);
        if (success) { toast.success(t("tableResetSuccess")); fetchAll(); }
        else toast.error(t("tableResetFailed"));
    };

    // ── Derived state ──────────────────────────────────────────────────────────

    const filteredTables = useMemo(() => {
        if (activeFilter === "all")  return tables;
        if (activeFilter === "none") return tables.filter(tb => !tb.tableCategoryId);
        return tables.filter(tb => tb.tableCategoryId === activeFilter);
    }, [tables, activeFilter]);

    const filterPills = useMemo(() => [
        { id: "all",  label: t("tableCategoryAll"),  color: undefined },
        ...categories.map(c => ({ id: c.id, label: c.displayName || c.name, color: c.color })),
        { id: "none", label: t("tableCategoryNone"), color: undefined },
    ], [categories, t]);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="">


            {/* Page title bar */}
            <div className="bg-white border-b border-slate-200">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 md:text-2xl">{t("tablesTitle")}</h1>
                        <p className="mt-0.5 text-sm text-slate-500 md:text-base">{t("tablesSubtitle")}</p>
                    </div>
                </div>
            </div>

            <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">

                {/* ═══ SECTIONS PANEL ════════════════════════════════════════ */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Panel header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                                <Layers className="w-4 h-4 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{t("tableCategoriesTitle")}</p>
                                <p className="text-xs text-slate-400">{t("tableCategoriesSubtitle")}</p>
                            </div>
                        </div>

                {/* Add Category Dialog */}
                        <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
                            setIsCategoryDialogOpen(open);
                            if (!open) resetCategoryForm();
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full gap-1.5 border-primary/20 text-primary hover:bg-primary/10 sm:w-auto">
                                    <Plus className="w-3.5 h-3.5" />
                                    {t("addCategoryBtn")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>{editingCategoryId ? t("editCategoryTitle") || "Edit Section" : t("createCategoryTitle")}</DialogTitle>
                                    <DialogDescription>{editingCategoryId ? t("editCategoryDesc") || "Update the section details" : t("createCategoryDesc")}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="catName">
                                            {t("categoryNameLabel")} <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="catName"
                                            placeholder="e.g. Indoor"
                                            value={newCategoryName}
                                            onChange={(e) => { setNewCategoryName(e.target.value); setCategoryFormErrors(p => ({ ...p, name: "" })); }}
                                            className={categoryFormErrors.name ? "border-destructive" : ""}
                                        />
                                        {categoryFormErrors.name && (
                                            <p className="text-xs text-destructive flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {categoryFormErrors.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="catNameAr">{t("categoryNameArLabel")}</Label>
                                        <Input
                                            id="catNameAr"
                                            placeholder="مثال: داخلي"
                                            value={newCategoryNameAr}
                                            onChange={(e) => { setNewCategoryNameAr(e.target.value); setCategoryFormErrors(p => ({ ...p, nameAr: "" })); }}
                                            className={categoryFormErrors.nameAr ? "border-destructive" : ""}
                                            dir="rtl"
                                        />
                                        {categoryFormErrors.nameAr && (
                                            <p className="text-xs text-destructive flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {categoryFormErrors.nameAr}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>{t("categoryColorLabel")}</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {COLOR_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setNewCategoryColor(opt.value)}
                                                    title={opt.label}
                                                    aria-label={opt.label}
                                                    className={`h-11 w-11 rounded-full border-2 transition-all active:scale-[0.98] ${newCategoryColor === opt.value ? "border-slate-700 scale-110 shadow-sm" : "border-transparent hover:border-slate-300"}`}
                                                    style={{ backgroundColor: opt.value }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleSaveCategory} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                        <Save className="w-4 h-4 me-2" /> {t("saveBtn")}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Categories body */}
                    {isLoading ? (
                        <div className="py-10 flex justify-center">
                            <div className="animate-spin h-5 w-5 border-2 border-violet-500 border-t-transparent rounded-full" />
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="py-10 flex flex-col items-center gap-3 text-center px-6">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Layers className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">{t("noCategoriesAdded")}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{t("noCategoriesHint")}</p>
                            </div>
                            <Button size="sm" variant="outline" className="mt-1 border-dashed border-primary/30 text-primary hover:bg-primary/10" onClick={() => { resetCategoryForm(); setIsCategoryDialogOpen(true); }}>
                                <Plus className="w-3.5 h-3.5 me-1.5" /> {t("addCategoryBtn")}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 p-4 sm:p-5">
                            {categories.map(cat => (
                                <div
                                    key={cat.id}
                                    className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    <div className="h-1.5" style={{ backgroundColor: cat.color ?? "#64748b" }} />
                                    <div className="p-3">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{cat.displayName || cat.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{cat.tableCount} {t("tablesInCategory")}</p>
                                    </div>
                                    <div className="absolute end-3 top-3 z-10 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                        <button
                                            type="button"
                                            aria-label={`${t("edit")} ${cat.displayName || cat.name}`}
                                            className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full bg-white shadow text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary active:scale-[0.98]"
                                            onClick={() => handleEditCategory(cat)}
                                            title={t("edit")}
                                        >
                                            <span className="text-sm font-bold">✎</span>
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`${t("delete")} ${cat.displayName || cat.name}`}
                                            className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full bg-white shadow text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-[0.98]"
                                            onClick={() => handleDeleteCategory(cat.id)}
                                            title={t("delete")}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {/* Inline add tile */}
                            <button
                                type="button"
                                onClick={() => { resetCategoryForm(); setIsCategoryDialogOpen(true); }}
                                className="flex min-h-32 touch-manipulation flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 transition-colors hover:bg-primary/10 active:scale-[0.98]"
                            >
                                <Plus className="h-5 w-5 text-primary/70" />
                                <span className="text-sm font-medium text-primary">{t("addCategoryBtn")}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ═══ TABLES PANEL ══════════════════════════════════════════ */}
                {/* Add Table Dialog */}
                <Dialog open={isTableDialogOpen} onOpenChange={(open) => {
                    setIsTableDialogOpen(open);
                    if (!open) resetTableForm();
                }}>
                    <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>{editingTableId ? t("editTableTitle") || "Edit Table" : t("createNewTable")}</DialogTitle>
                                    <DialogDescription>{editingTableId ? t("editTableDesc") || "Update the table details" : t("createNewTableDesc")}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="tableName">
                                            {t("tableNameLabel")} <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="tableName"
                                            placeholder={t("tableNamePlaceholder")}
                                            value={newTableName}
                                            onChange={(e) => { setNewTableName(e.target.value); setTableFormErrors(p => ({ ...p, name: "" })); }}
                                            className={tableFormErrors.name ? "border-destructive" : ""}
                                        />
                                        {tableFormErrors.name && (
                                            <p className="text-xs text-destructive flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {tableFormErrors.name}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">{t("validationEnglishOnly")}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="tableNameAr">{t("tableNameArLabel")}</Label>
                                        <Input
                                            id="tableNameAr"
                                            placeholder="e.g. طاولة 1"
                                            value={newTableNameAr}
                                            onChange={(e) => { setNewTableNameAr(e.target.value); setTableFormErrors(p => ({ ...p, nameAr: "" })); }}
                                            className={tableFormErrors.nameAr ? "border-destructive" : ""}
                                            dir="rtl"
                                        />
                                        {tableFormErrors.nameAr && (
                                            <p className="text-xs text-destructive flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {tableFormErrors.nameAr}
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="capacity">
                                                {t("capacityLabel")} <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="capacity"
                                                type="number"
                                                min={1}
                                                value={newTableCapacity}
                                                onChange={(e) => setNewTableCapacity(parseInt(e.target.value))}
                                                className={tableFormErrors.capacity ? "border-destructive" : ""}
                                            />
                                            {tableFormErrors.capacity && (
                                                <p className="text-xs text-destructive flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> {tableFormErrors.capacity}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="tableCategory">{t("tableCategoryLabel")}</Label>
                                            <Select
                                                value={newTableCategoryId || "__none__"}
                                                onValueChange={(v) => setNewTableCategoryId(v === "__none__" ? "" : v)}
                                            >
                                                <SelectTrigger id="tableCategory">
                                                    <SelectValue placeholder={t("tableCategoryNone")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">{t("tableCategoryNone")}</SelectItem>
                                                    {categories.map(cat => (
                                                        <SelectItem key={cat.id} value={cat.id}>
                                                            {cat.displayName || cat.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleSaveTable} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                        <Save className="w-4 h-4 me-2" /> {t("saveBtn")}
                                    </Button>
                                </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                    {/* Tables panel header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <Armchair className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{t("tablesTitle")}</p>
                                <p className="text-xs text-slate-400">{t("tablesSubtitle")}</p>
                            </div>
                        </div>
                        <Button size="sm" className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto" onClick={() => { resetTableForm(); setIsTableDialogOpen(true); }}>
                            <Plus className="w-3.5 h-3.5" />
                            {t("addNewTableBtn")}
                        </Button>
                    </div>

                    {/* Stats strip */}
                    {!isLoading && tables.length > 0 && (
                        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/50 lg:grid-cols-4 lg:divide-x lg:divide-slate-100">
                            {[
                                { label: t("tableCategoryAll"), count: tables.length,                                                        color: "text-slate-700",   num: "text-slate-800" },
                                { label: t("tableEmpty"),        count: tables.filter(tb => tb.status === TableStatus.Free).length,     color: "text-emerald-600", num: "text-emerald-700" },
                                { label: t("tableOccupied"),     count: tables.filter(tb => tb.status === TableStatus.Occupied).length, color: "text-rose-600",    num: "text-rose-700" },
                                { label: t("tableReserved"),     count: tables.filter(tb => tb.status === TableStatus.Reserved).length, color: "text-amber-600",   num: "text-amber-700" },
                            ].map(stat => (
                                <div key={stat.label} className="flex min-h-20 flex-col justify-center gap-1 border-b border-slate-100 px-4 py-3 last:border-b-0 lg:border-b-0 lg:px-5">
                                    <span className={`text-2xl font-bold ${stat.num}`}>{stat.count}</span>
                                    <span className={`text-sm font-medium ${stat.color}`}>{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Filter pills */}
                    {!isLoading && tables.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3 scrollbar-none sm:px-5">
                            {filterPills.map(pill => {
                                const isActive = activeFilter === pill.id;
                                const count = pill.id === "all"
                                    ? tables.length
                                    : pill.id === "none"
                                        ? tables.filter(tb => !tb.tableCategoryId).length
                                        : tables.filter(tb => tb.tableCategoryId === pill.id).length;
                                return (
                                    <button
                                        key={pill.id}
                                        type="button"
                                        onClick={() => setActiveFilter(pill.id)}
                                        className={`
                                            flex min-h-12 touch-manipulation items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap
                                            border transition-all duration-150
                                            ${isActive
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                                            }
                                        `}
                                    >
                                        {pill.color && (
                                            <span
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: isActive ? "rgba(255,255,255,0.7)" : pill.color }}
                                            />
                                        )}
                                        {pill.label}
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/20" : "bg-slate-100 text-slate-400"}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Tables body */}
                    {isLoading ? (
                        <div className="py-16 flex flex-col items-center gap-3">
                            <div className="animate-spin h-7 w-7 border-[3px] border-success border-t-transparent rounded-full" />
                            <p className="text-sm text-slate-400">{t("loadingTables")}</p>
                        </div>
                    ) : tables.length === 0 ? (
                        <div className="py-12 flex flex-col items-center gap-3 text-center px-6">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Armchair className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">{t("noTablesAdded")}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{t("noTablesHint")}</p>
                            </div>
                            <Button size="sm" variant="outline" className="mt-1 border-dashed border-primary/30 text-primary hover:bg-primary/10" onClick={() => { resetTableForm(); setIsTableDialogOpen(true); }}>
                                <Plus className="w-3.5 h-3.5 me-1.5" /> {t("addNewTableBtn")}
                            </Button>
                        </div>
                    ) : filteredTables.length === 0 ? (
                        <div className="py-10 flex flex-col items-center gap-2 text-center px-6">
                            <Tag className="w-9 h-9 text-slate-200" />
                            <p className="text-sm text-slate-400">{t("noTablesAdded")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 p-4 sm:p-5">
                            {filteredTables.map((table) => {
                                const status = STATUS_META[table.status];
                                const cat = categories.find(c => c.id === table.tableCategoryId);
                                return (
                                    <div
                                        key={table.id}
                                        className={`group overflow-hidden rounded-xl border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${status.ring}`}
                                    >
                                        {/* Colored section band */}
                                        {cat && (
                                            <div className="h-1" style={{ backgroundColor: cat.color ?? "#64748b" }} />
                                        )}

                                        <div className="flex h-full flex-col gap-3 p-4">
                                            {/* Icon + Name */}
                                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${status.icon}`}>
                                                <Armchair className="h-6 w-6" />
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="truncate text-base font-bold leading-tight text-slate-800">
                                                    {table.displayName || table.name}
                                                </h3>
                                                <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                                                    <Users className="h-4 w-4" />
                                                    <span className="text-sm">
                                                        {table.capacity} {t("seatsLabel")}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status badge */}
                                            <span className={`inline-flex min-h-8 self-start items-center rounded-full border px-3 py-1 text-sm font-semibold ${status.badge}`}>
                                                {t(status.label as any)}
                                            </span>

                                            <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    aria-label={`${t("edit")} ${table.displayName || table.name}`}
                                                    title={t("edit")}
                                                    onClick={() => handleEditTable(table)}
                                                    className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-primary/20 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 active:scale-[0.98]"
                                                >
                                                    <span className="text-sm font-bold">✎</span>
                                                    {t("edit")}
                                                </button>
                                                {/* <button
                                                    type="button"
                                                    aria-label={`${t("viewMenu")} ${table.displayName || table.name}`}
                                                    title={t("viewMenu")}
                                                    onClick={() => window.open(`/menu/${table.id}`, "_blank")}
                                                    className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 active:scale-[0.98]"
                                                >
                                                    <QrCode className="h-4 w-4" />
                                                    {t("viewMenu")}
                                                </button> */}
                                                {table.status === TableStatus.Occupied && (
                                                    <button
                                                        type="button"
                                                        aria-label={`${t("refreshBtn")} ${table.displayName || table.name}`}
                                                        title={t("refreshBtn")}
                                                        onClick={() => handleResetTable(table.id)}
                                                        className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-primary/20 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 active:scale-[0.98]"
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                        {t("refreshBtn")}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    aria-label={`${t("delete")} ${table.displayName || table.name}`}
                                                    title={t("delete")}
                                                    onClick={() => handleDeleteTable(table.id)}
                                                    className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-[0.98]"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {t("delete")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

