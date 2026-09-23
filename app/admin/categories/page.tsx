"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Image as ImageIcon, Layers, Eye, ChevronDown, ChevronUp, AlertCircle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import {
    getCategoriesPaginated,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    setSubcategoryActive,
    reorderSubcategories,
    getTables,
    uploadImage,
} from "@/lib/api";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { CategoryDto, CategoryDisplayMode, SubcategoryDto, Table } from "@/types/pos";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/components/locale-provider";

export default function CategoriesPage() {
    const { t, locale } = useLocale();
    const isAr = locale === "ar";
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
    const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
    const [activeCategoryForSubcategory, setActiveCategoryForSubcategory] = useState<CategoryDto | null>(null);
    const [editingSubcategory, setEditingSubcategory] = useState<SubcategoryDto | null>(null);
    const [tables, setTables] = useState<Table[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        nameAr: "",
        description: "",
        imageUrl: "",
        sortOrder: 0,
        displayMode: CategoryDisplayMode.Grid,
        isActive: true,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [subcategoryFormData, setSubcategoryFormData] = useState({
        name: "",
        nameAr: "",
        imageUrl: "",
        displayOrder: 0,
        isActive: true,
    });
    const [subcategoryImageFile, setSubcategoryImageFile] = useState<File | null>(null);
    const [subcategoryImagePreview, setSubcategoryImagePreview] = useState<string>("");

    const branchVersion = useActiveBranchVersion();
    useEffect(() => {
        loadTables();
    }, [branchVersion]);

    useEffect(() => {
        loadCategories();
    }, [pageNumber, pageSize, searchTerm]);

    const loadCategories = async () => {
        setLoading(true);
        const data = await getCategoriesPaginated(pageNumber, pageSize, searchTerm);
        setCategories(data.items);
        setTotalCount(data.totalCount);
        setLoading(false);
    };

    const loadTables = async () => {
        const data = await getTables();
        setTables(data);
    };

    const handleOpenDialog = (category?: CategoryDto) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                nameAr: category.nameAr || "",
                description: category.description || "",
                imageUrl: category.imageUrl || "",
                sortOrder: category.sortOrder,
                displayMode: category.displayMode,
                isActive: category.isActive,
            });
            setImageFile(null);
            setImagePreview(category.imageUrl || "");
        } else {
            setEditingCategory(null);
            setFormData({
                name: "",
                nameAr: "",
                description: "",
                imageUrl: "",
                sortOrder: categories.length,
                displayMode: CategoryDisplayMode.Grid,
                isActive: true,
            });
            setImageFile(null);
            setImagePreview("");
        }
        setDialogOpen(true);
    };

    const [catErrors, setCatErrors] = useState<Record<string, string>>({});
    const [subcategoryErrors, setSubcategoryErrors] = useState<Record<string, string>>({});

    const isEnglishOnly = (text: string) => /^[a-zA-Z0-9\s\-_.,!?&()'"/+%#@]*$/.test(text);
    const isArabicOnly = (text: string) => /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF0-9\s\-_.,!?&()'"/+%#@]*$/.test(text);

    const subcategoryLabel = (subcategory: SubcategoryDto) =>
        isAr ? (subcategory.nameAr || subcategory.displayName || subcategory.name) : (subcategory.displayName || subcategory.name);

    const sortedSubcategories = (category: CategoryDto) =>
        [...(category.subcategories || [])].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

    const handleOpenSubcategoryDialog = (category: CategoryDto, subcategory?: SubcategoryDto) => {
        setActiveCategoryForSubcategory(category);
        setEditingSubcategory(subcategory || null);
        setSubcategoryFormData({
            name: subcategory?.name || "",
            nameAr: subcategory?.nameAr || "",
            imageUrl: subcategory?.imageUrl || "",
            displayOrder: subcategory?.displayOrder ?? (category.subcategories?.length || 0),
            isActive: subcategory?.isActive ?? true,
        });
        setSubcategoryImageFile(null);
        setSubcategoryImagePreview(subcategory?.imageUrl || "");
        setSubcategoryErrors({});
        setSubcategoryDialogOpen(true);
    };

    const handleSave = async () => {
        const errors: Record<string, string> = {};

        if (!formData.name.trim()) {
            errors.name = t("validationRequired") || "This field is required";
        } else if (!isEnglishOnly(formData.name.trim())) {
            errors.name = t("validationEnglishOnly") || "Only English characters allowed";
        }

        if (formData.nameAr && formData.nameAr.trim() && !isArabicOnly(formData.nameAr.trim())) {
            errors.nameAr = t("validationArabicOnly") || "Only Arabic characters allowed";
        }

        setCatErrors(errors);
        if (Object.keys(errors).length > 0) {
            toast.warning(t("catNameRequired"));
            return;
        }

        let resolvedImageUrl = formData.imageUrl;
        if (imageFile) {
            const uploaded = await uploadImage(imageFile);
            if (!uploaded) {
                toast.error(t("catOperationFailed"));
                return;
            }
            resolvedImageUrl = uploaded;
        }

        const dataToSave = { ...formData, imageUrl: resolvedImageUrl };

        try {
            const success = editingCategory
                ? await updateCategory(editingCategory.id, dataToSave)
                : await createCategory(dataToSave);

            if (success) {
                toast.success(editingCategory ? t("catUpdated") : t("catCreated"));
                setDialogOpen(false);
                setCatErrors({});
                loadCategories();
            } else {
                toast.error(t("catOperationFailed"));
            }
        } catch (error: any) {
            if (error?.response?.status === 409) {
                const msg = error.response.data?.message || t("validationDuplicateName") || "Duplicate name";
                setCatErrors({ name: msg });
                toast.error(msg);
            } else {
                toast.error(t("catOperationFailed"));
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("confirmDeleteCategory"))) return;

        const success = await deleteCategory(id);
        if (success) {
            toast.success(t("catDeleted"));
            loadCategories();
        } else {
            toast.error(t("catDeleteFailed"));
        }
    };

    const handleSaveSubcategory = async () => {
        if (!activeCategoryForSubcategory) return;

        const errors: Record<string, string> = {};
        if (!subcategoryFormData.name.trim()) {
            errors.name = t("validationRequired") || "This field is required";
        } else if (!isEnglishOnly(subcategoryFormData.name.trim())) {
            errors.name = t("validationEnglishOnly") || "Only English characters allowed";
        }
        if (subcategoryFormData.nameAr.trim() && !isArabicOnly(subcategoryFormData.nameAr.trim())) {
            errors.nameAr = t("validationArabicOnly") || "Only Arabic characters allowed";
        }

        setSubcategoryErrors(errors);
        if (Object.keys(errors).length > 0) {
            toast.warning(isAr ? "راجع بيانات التصنيف الفرعي" : "Check subcategory details");
            return;
        }

        // Same upload path as the category image: the file is stored first and only its URL is saved.
        let resolvedImageUrl = subcategoryFormData.imageUrl;
        if (subcategoryImageFile) {
            const uploaded = await uploadImage(subcategoryImageFile);
            if (!uploaded) {
                toast.error(isAr ? "تعذر رفع الصورة" : "Could not upload image");
                return;
            }
            resolvedImageUrl = uploaded;
        }
        const dataToSave = { ...subcategoryFormData, imageUrl: resolvedImageUrl };

        try {
            if (editingSubcategory) {
                await updateSubcategory(editingSubcategory.id, dataToSave);
            } else {
                await createSubcategory(activeCategoryForSubcategory.id, dataToSave);
            }
            toast.success(isAr ? "تم حفظ التصنيف الفرعي" : "Subcategory saved");
            setSubcategoryDialogOpen(false);
            await loadCategories();
        } catch (error: any) {
            const msg = error?.response?.data?.message || (isAr ? "تعذر حفظ التصنيف الفرعي" : "Could not save subcategory");
            toast.error(msg);
        }
    };

    const handleDeleteSubcategory = async (subcategory: SubcategoryDto) => {
        if (!confirm(isAr ? "حذف التصنيف الفرعي؟" : "Delete this subcategory?")) return;

        const success = await deleteSubcategory(subcategory.id);
        if (success) {
            toast.success(isAr ? "تم حذف التصنيف الفرعي" : "Subcategory deleted");
            await loadCategories();
        } else {
            toast.error(isAr ? "لا يمكن حذف تصنيف فرعي مستخدم" : "Subcategory cannot be deleted while products use it");
        }
    };

    const handleToggleSubcategory = async (subcategory: SubcategoryDto) => {
        try {
            await setSubcategoryActive(subcategory.id, !subcategory.isActive);
            await loadCategories();
        } catch {
            toast.error(isAr ? "تعذر تحديث الحالة" : "Could not update status");
        }
    };

    const handleMoveSubcategory = async (category: CategoryDto, subcategory: SubcategoryDto, direction: -1 | 1) => {
        const items = sortedSubcategories(category);
        const currentIndex = items.findIndex((item) => item.id === subcategory.id);
        const nextIndex = currentIndex + direction;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return;

        [items[currentIndex], items[nextIndex]] = [items[nextIndex], items[currentIndex]];
        await reorderSubcategories(category.id, items.map((item, index) => ({ id: item.id, displayOrder: index })));
        await loadCategories();
    };

    const displayModeLabels = {
        [CategoryDisplayMode.Grid]: t("displayModeGrid"),
        [CategoryDisplayMode.List]: t("displayModeList"),
        [CategoryDisplayMode.ListNoImage]: t("displayModeListNoImage"),
        [CategoryDisplayMode.CardCarousel]: t("displayModeCardCarousel"),
    };

    return (
        <div className="p-8">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{t("categoriesTitle")}</h1>
                    <p className="text-slate-600 mt-1">{t("categoriesSubtitle")}</p>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
                    <div className="relative w-full">
                        <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("searchCategories") || "Search categories..."}
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPageNumber(1); }}
                            className="ps-8 pe-8 h-9 w-full rounded-md border border-input bg-background text-sm shadow-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => { setSearchTerm(""); setPageNumber(1); }}
                                className="absolute end-2 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="border-primary text-primary hover:bg-primary/5"
                            >
                                <Eye className="w-4 h-4 me-2" />
                                {t("qrMenuPreview")}
                                <ChevronDown className="w-4 h-4 ms-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => window.open('/menu/demo', '_blank')}>
                                <Eye className="w-4 h-4 me-2" />
                                {t("demoMode")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tables.length > 0 ? (
                                tables.slice(0, 5).map((table) => (
                                    <DropdownMenuItem
                                        key={table.id}
                                        onClick={() => window.open(`/menu/${table.id}`, '_blank')}
                                    >
                                        {table.displayName || table.name}
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled>
                                    {t("noTablesFound")}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4 me-2" />
                        {t("newCategory")}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-e-transparent"></div>
                </div>
            ) : totalCount === 0 && !searchTerm ? (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                    <Layers className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t("noCategoriesYet")}</h3>
                    <p className="text-slate-600 mb-4">{t("noCategoriesStart")}</p>
                    <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4 me-2" />
                        {t("addCategory")}
                    </Button>
                </div>
            ) : categories.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                    <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t("noCategoriesYet")}</h3>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearchTerm(""); setPageNumber(1); }}>
                        {t("resetFilters") || "Clear search"}
                    </Button>
                </div>
            ) : (
                <>
                <div className="grid gap-4">
                    {categories.map((category) => (
                        <div
                            key={category.id}
                            className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start gap-4">
                                {category.imageUrl ? (
                                    <img
                                        src={category.imageUrl}
                                        alt={category.displayName || category.name}
                                        className="w-24 h-24 rounded-lg object-cover"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <ImageIcon className="w-8 h-8 text-slate-400" />
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900">{category.displayName || category.name}</h3>
                                            {category.description && (
                                                <p className="text-sm text-slate-600 mt-1">{category.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-xs text-slate-500">
                                                    {t("sortOrderPrefix")} {category.sortOrder}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {displayModeLabels[category.displayMode as CategoryDisplayMode]}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${category.isActive
                                                    ? "bg-success/10 text-success"
                                                    : "bg-slate-100 text-slate-600"
                                                    }`}>
                                                    {category.isActive ? t("activeStatus") : t("inactiveStatus")}
                                                </span>
                                            </div>
                                            <div className="mt-4 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-700">
                                                        {isAr ? "التصنيفات الفرعية" : "Subcategories"}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() => handleOpenSubcategoryDialog(category)}
                                                    >
                                                        <Plus className="h-3.5 w-3.5 me-1" />
                                                        {isAr ? "إضافة" : "Add"}
                                                    </Button>
                                                </div>
                                                {sortedSubcategories(category).length === 0 ? (
                                                    <p className="text-xs text-slate-500">
                                                        {isAr ? "لا توجد تصنيفات فرعية. ستبقى المنتجات مباشرة تحت الفئة." : "No subcategories. Products stay directly under this category."}
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {sortedSubcategories(category).map((subcategory, index, list) => (
                                                            <div
                                                                key={subcategory.id}
                                                                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"
                                                            >
                                                                {subcategory.imageUrl ? (
                                                                    <img
                                                                        src={subcategory.imageUrl}
                                                                        alt=""
                                                                        className="h-6 w-6 rounded object-cover"
                                                                    />
                                                                ) : (
                                                                    <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100">
                                                                        <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                                                                    </span>
                                                                )}
                                                                <span className={`text-xs font-medium ${subcategory.isActive ? "text-slate-700" : "text-slate-400"}`}>
                                                                    {subcategoryLabel(subcategory)}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-40"
                                                                    disabled={index === 0}
                                                                    onClick={() => handleMoveSubcategory(category, subcategory, -1)}
                                                                    aria-label={isAr ? "رفع" : "Move up"}
                                                                >
                                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-40"
                                                                    disabled={index === list.length - 1}
                                                                    onClick={() => handleMoveSubcategory(category, subcategory, 1)}
                                                                    aria-label={isAr ? "خفض" : "Move down"}
                                                                >
                                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-900"
                                                                    onClick={() => handleOpenSubcategoryDialog(category, subcategory)}
                                                                    aria-label={isAr ? "تعديل" : "Edit"}
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={`rounded px-2 py-1 text-[11px] font-semibold ${subcategory.isActive ? "bg-success/10 text-success" : "bg-slate-200 text-slate-500"}`}
                                                                    onClick={() => handleToggleSubcategory(subcategory)}
                                                                >
                                                                    {subcategory.isActive ? t("activeStatus") : t("inactiveStatus")}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="rounded p-1 text-destructive hover:bg-destructive/5"
                                                                    onClick={() => handleDeleteSubcategory(subcategory)}
                                                                    aria-label={isAr ? "حذف" : "Delete"}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenDialog(category)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(category.id)}
                                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <PaginationControls
                    pageNumber={pageNumber}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={setPageNumber}
                    onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }}
                    isLoading={loading}
                />
                </>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? t("editCategory") : t("newCategory")}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="flex items-center gap-1">
                                {t("catNameLabel")} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData({ ...formData, name: e.target.value });
                                    if (catErrors.name) setCatErrors(prev => { const { name, ...rest } = prev; return rest; });
                                }}
                                placeholder="e.g. Main Dishes, Beverages..."
                                className={catErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {catErrors.name && (
                                <p className="text-destructive text-sm font-medium flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> {catErrors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="nameAr">{t("catNameArLabel")}</Label>
                            <Input
                                id="nameAr"
                                value={formData.nameAr}
                                onChange={(e) => {
                                    setFormData({ ...formData, nameAr: e.target.value });
                                    if (catErrors.nameAr) setCatErrors(prev => { const { nameAr, ...rest } = prev; return rest; });
                                }}
                                placeholder="e.g. الأطباق الرئيسية"
                                dir="rtl"
                                className={catErrors.nameAr ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {catErrors.nameAr && (
                                <p className="text-destructive text-sm font-medium flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> {catErrors.nameAr}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="description">{t("descriptionLabel")}</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Short description about the category"
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label htmlFor="imageUrl">{t("imageUrlLabel")}</Label>
                            <input
                                id="imageUrl"
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="block w-full text-sm text-muted-foreground file:me-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setImageFile(file);
                                    if (file) {
                                        setImagePreview(URL.createObjectURL(file));
                                    } else {
                                        setImagePreview(formData.imageUrl);
                                    }
                                }}
                            />
                            {imagePreview && (
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="mt-2 w-32 h-32 rounded-lg object-cover border"
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="sortOrder">{t("sortOrderLabel")}</Label>
                                <Input
                                    id="sortOrder"
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="displayMode">{t("displayModeLabel")}</Label>
                                <Select
                                    value={formData.displayMode.toString()}
                                    onValueChange={(value) => setFormData({ ...formData, displayMode: parseInt(value) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">{t("displayModeGrid")}</SelectItem>
                                        <SelectItem value="1">{t("displayModeList")}</SelectItem>
                                        <SelectItem value="2">{t("displayModeListNoImage")}</SelectItem>
                                        <SelectItem value="3">{t("displayModeCardCarousel")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="isActive">{t("isActiveLabel")}</Label>
                            <Switch
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                            {editingCategory ? t("saveBtn") : t("newCategory")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSubcategory
                                ? (isAr ? "تعديل تصنيف فرعي" : "Edit Subcategory")
                                : (isAr ? "إضافة تصنيف فرعي" : "Add Subcategory")}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="subcategoryName" className="flex items-center gap-1">
                                {isAr ? "الاسم بالإنجليزية" : "English Name"} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="subcategoryName"
                                value={subcategoryFormData.name}
                                onChange={(e) => {
                                    setSubcategoryFormData({ ...subcategoryFormData, name: e.target.value });
                                    if (subcategoryErrors.name) setSubcategoryErrors(prev => { const { name, ...rest } = prev; return rest; });
                                }}
                                className={subcategoryErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {subcategoryErrors.name && (
                                <p className="text-destructive text-sm font-medium flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> {subcategoryErrors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="subcategoryNameAr">{isAr ? "الاسم بالعربية" : "Arabic Name"}</Label>
                            <Input
                                id="subcategoryNameAr"
                                value={subcategoryFormData.nameAr}
                                onChange={(e) => {
                                    setSubcategoryFormData({ ...subcategoryFormData, nameAr: e.target.value });
                                    if (subcategoryErrors.nameAr) setSubcategoryErrors(prev => { const { nameAr, ...rest } = prev; return rest; });
                                }}
                                dir="rtl"
                                className={subcategoryErrors.nameAr ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {subcategoryErrors.nameAr && (
                                <p className="text-destructive text-sm font-medium flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> {subcategoryErrors.nameAr}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="subcategoryImage">{t("imageUrlLabel")}</Label>
                            <input
                                id="subcategoryImage"
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="block w-full text-sm text-muted-foreground file:me-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setSubcategoryImageFile(file);
                                    setSubcategoryImagePreview(file ? URL.createObjectURL(file) : subcategoryFormData.imageUrl);
                                }}
                            />
                            {subcategoryImagePreview && (
                                <div className="mt-2 flex items-end gap-3">
                                    <img
                                        src={subcategoryImagePreview}
                                        alt="Preview"
                                        className="w-24 h-24 rounded-lg object-cover border"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                                        onClick={() => {
                                            setSubcategoryImageFile(null);
                                            setSubcategoryImagePreview("");
                                            setSubcategoryFormData({ ...subcategoryFormData, imageUrl: "" });
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 me-1" />
                                        {isAr ? "إزالة الصورة" : "Remove image"}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="subcategoryDisplayOrder">{isAr ? "ترتيب العرض" : "Display Order"}</Label>
                            <Input
                                id="subcategoryDisplayOrder"
                                type="number"
                                value={subcategoryFormData.displayOrder}
                                onChange={(e) => setSubcategoryFormData({
                                    ...subcategoryFormData,
                                    displayOrder: parseInt(e.target.value, 10) || 0,
                                })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="subcategoryIsActive">{t("isActiveLabel")}</Label>
                            <Switch
                                id="subcategoryIsActive"
                                checked={subcategoryFormData.isActive}
                                onCheckedChange={(checked) => setSubcategoryFormData({ ...subcategoryFormData, isActive: checked })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubcategoryDialogOpen(false)}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleSaveSubcategory} className="bg-primary hover:bg-primary/90">
                            {editingSubcategory ? t("saveBtn") : (isAr ? "إضافة" : "Add")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
