"use client";

import { useEffect, useRef, useState } from "react";
import {
    AlertTriangle,
    BarChart3,
    Download,
    Edit,
    Filter,
    Loader2,
    Package,
    Paperclip,
    Plus,
    Search,
    Trash2,
    Package as WasteItemIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { BranchFilter } from "@/components/filters/BranchFilter";
import { StandardFilter, type StandardFilterOption } from "@/components/filters/StandardFilter";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import {
    createWasteLog,
    getProducts,
    getRawMaterials,
    getWasteLog,
    getWasteLogAnalytics,
    getWasteLogById,
    getWasteLogExportUrl,
    getWasteLogSummary,
    searchWasteEmployees,
    UnitLabels,
    updateWasteLog,
    uploadImage,
} from "@/lib/api";
import type {
    ManualWasteType,
    RawMaterial,
    WasteEmployeeOption,
    WasteLogAnalytics,
    WasteLogCreatePayload,
    WasteLogEntry,
    WasteLogQueryParams,
    WasteLogStatus,
    WasteLogSummary,
    WasteParticipant,
} from "@/lib/api";
import { usePosStore } from "@/store/posStore";
import { useAuthStore } from "@/store/authStore";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { UserRole } from "@/types/auth";
import { isAdminRole } from "@/lib/authorization";
import type { ProductDto } from "@/types/pos";
import { useSettingsStore } from "@/store/settingsStore";
import {
    addCalendarDays,
    formatRestaurantDateTime,
    getRestaurantToday,
} from "@/lib/date-time";

type DatePreset = "today" | "week" | "month" | "custom";
type WasteItemMode = "product" | "material";
type WasteFilter = ManualWasteType | "all" | "cancel" | "expired";

const DEFAULT_PAGE_SIZE = 10;
const PRODUCT_UNIT = "Item";

const UNIT_LABELS_AR: Record<string, string> = {
    Gram: "جرام",
    Kilogram: "كجم",
    Adet: "قطعة",
    Litre: "لتر",
    Mililitre: "مل",
    Pieces: "قطعة",
    pcs: "قطعة",
    Item: "قطعة",
};

const MANUAL_CREATE_TYPES: ManualWasteType[] = [
    "GIFT",
    "DAMAGED",
    "STOLEN",
    "STAFF_MEAL",
    "WRONG_PREPARATION",
    "CUSTOMER_COMPENSATION",
    "OTHER",
];

const WASTE_FILTERS: WasteFilter[] = [
    "all",
    "cancel",
    "expired",
    "GIFT",
    "DAMAGED",
    "STOLEN",
    "CUSTOMER_COMPENSATION",
    "STAFF_MEAL",
    "WRONG_PREPARATION",
    "OTHER",
];

const STATUS_OPTIONS: Array<WasteLogStatus | "all"> = ["all", "Pending", "Approved", "Rejected"];

const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
    cancel: { en: "Cancel", ar: "إلغاء" },
    expired: { en: "Expired", ar: "منتهي الصلاحية" },
    EXPIRED: { en: "Expired", ar: "منتهي الصلاحية" },
    DAMAGED: { en: "Damaged", ar: "تالف" },
    GIFT: { en: "Gift", ar: "هدية" },
    STOLEN: { en: "Stolen", ar: "مسروق" },
    STAFF_MEAL: { en: "Staff meal", ar: "وجبة موظفين" },
    TESTING: { en: "Testing", ar: "اختبار" },
    WRONG_PREPARATION: { en: "Wrong preparation", ar: "تحضير خاطئ" },
    CUSTOMER_COMPENSATION: { en: "Customer compensation", ar: "تعويض عميل" },
    OTHER: { en: "Other", ar: "أخرى" },
};

const TEXT = {
    en: {
        title: "Waste Log",
        subtitle: "Manual waste, legacy cancellation waste, and expiry waste",
        add: "Add Waste",
        edit: "Edit",
        export: "Export CSV",
        today: "Today",
        week: "This Week",
        month: "This Month",
        custom: "Custom",
        from: "From",
        to: "To",
        branch: "Branch",
        wasteType: "Waste Type",
        status: "Status",
        employee: "Employee",
        searchEmployee: "Search employee...",
        noEmployees: "No employees found",
        employeeRequired: "Employee is required for staff meal waste.",
        staffMealsByEmployee: "Staff Meals by Employee",
        selectedCount: (n: number) => `${n} selected`,
        removeEmployee: "Remove",
        product: "Product",
        material: "Raw material",
        all: "All",
        totalCost: "Total Waste Cost",
        saleLoss: "Sale Price Loss",
        manual: "Manual Waste",
        expired: "Expired",
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        byType: "Waste by Type",
        byEmployee: "Waste by Employee",
        topProducts: "Top Wasted Products",
        item: "Item",
        itemType: "Item type",
        quantity: "Quantity",
        unit: "Unit",
        reason: "Reason",
        notes: "Notes",
        createdBy: "Created By",
        date: "Date",
        details: "Waste Details",
        audit: "Audit Trail",
        noAudit: "No audit entries",
        noRows: "No waste records found",
        loading: "Loading waste records",
        loadingItems: "Loading items...",
        searchBranches: "Search branches...",
        searchOptions: "Search...",
        noOptions: "No options found",
        clear: "Clear",
        inventory: "Inventory",
        yes: "Yes",
        no: "No",
        approvedBy: "Recorded By",
        cost: "Cost",
        page: "Page",
        of: "of",
        records: "records",
        legacy: "Legacy",
        allEmployees: "All employees",
        allProducts: "All products",
        allStatuses: "All statuses",
        allTypes: "All types",
        exported: "Waste export started",
        modalTitle: "Add Waste",
        editModalTitle: "Edit Waste",
        modalDescription: "Manual stock loss is recorded immediately.",
        sourceLinkedEditDescription: "Source, category, and inventory behavior stay locked.",
        selectItem: "Select item",
        attachment: "Attachment/Image",
        removeAttachment: "Remove attachment",
        wasteDate: "Waste Date",
        createWaste: "Save Waste",
        updateWaste: "Update Waste",
        createdToast: "Waste recorded",
        updatedToast: "Waste updated",
        validation: "Select a type, item, quantity, and reason.",
        uploadFailed: "Attachment upload failed",
        failed: "Waste could not be recorded",
        updateFailed: "Waste could not be updated",
    },
    ar: {
        title: "سجل الهدر",
        subtitle: "الهدر اليدوي وهدر الإلغاء والانتهاء",
        add: "تسجيل هدر",
        edit: "تعديل",
        export: "تصدير CSV",
        today: "اليوم",
        week: "هذا الأسبوع",
        month: "هذا الشهر",
        custom: "مخصص",
        from: "من",
        to: "إلى",
        branch: "الفرع",
        wasteType: "نوع الهدر",
        status: "الحالة",
        employee: "الموظفون",
        searchEmployee: "ابحث عن موظف...",
        noEmployees: "لا يوجد موظفون",
        employeeRequired: "الموظف مطلوب لهدر وجبة الموظفين.",
        staffMealsByEmployee: "وجبات الموظفين حسب الموظف",
        selectedCount: (n: number) => `تم اختيار ${n}`,
        removeEmployee: "إزالة",
        product: "المنتج",
        material: "مادة خام",
        all: "الكل",
        totalCost: "إجمالي تكلفة الهدر",
        saleLoss: "خسارة سعر البيع",
        manual: "الهدر اليدوي",
        expired: "منتهي الصلاحية",
        pending: "بانتظار",
        approved: "معتمد",
        rejected: "مرفوض",
        byType: "الهدر حسب النوع",
        byEmployee: "الهدر حسب الموظف",
        topProducts: "أكثر المنتجات هدراً",
        item: "الصنف",
        itemType: "نوع الصنف",
        quantity: "الكمية",
        unit: "الوحدة",
        reason: "السبب",
        notes: "ملاحظات",
        createdBy: "بواسطة",
        date: "التاريخ",
        details: "تفاصيل الهدر",
        audit: "سجل التدقيق",
        noAudit: "لا توجد سجلات تدقيق",
        noRows: "لا توجد سجلات هدر",
        loading: "جاري تحميل سجلات الهدر",
        loadingItems: "جاري تحميل الأصناف...",
        searchBranches: "ابحث عن فرع...",
        searchOptions: "بحث...",
        noOptions: "لا توجد نتائج",
        clear: "مسح",
        inventory: "المخزون",
        yes: "نعم",
        no: "لا",
        approvedBy: "سجل بواسطة",
        cost: "التكلفة",
        page: "صفحة",
        of: "من",
        records: "سجل",
        legacy: "قديم",
        allEmployees: "كل الموظفين",
        allProducts: "كل المنتجات",
        allStatuses: "كل الحالات",
        allTypes: "كل الأنواع",
        exported: "بدأ تصدير الهدر",
        modalTitle: "تسجيل هدر",
        editModalTitle: "تعديل الهدر",
        modalDescription: "يتم تسجيل خسارة المخزون اليدوية فوراً.",
        sourceLinkedEditDescription: "يبقى المصدر والفئة وتأثير المخزون مقفلة.",
        selectItem: "اختر الصنف",
        attachment: "مرفق/صورة",
        removeAttachment: "إزالة المرفق",
        wasteDate: "تاريخ الهدر",
        createWaste: "حفظ الهدر",
        updateWaste: "تحديث الهدر",
        createdToast: "تم تسجيل الهدر",
        updatedToast: "تم تحديث الهدر",
        validation: "اختر النوع والصنف والكمية والسبب.",
        uploadFailed: "فشل رفع المرفق",
        failed: "تعذر تسجيل الهدر",
        updateFailed: "تعذر تحديث الهدر",
    },
} as const;

function getPresetRange(
    preset: DatePreset,
    customFrom: string,
    customTo: string,
    timeZone: string,
) {
    const today = getRestaurantToday(timeZone);
    if (preset === "today") return { dateFrom: today, dateTo: today };
    if (preset === "week") {
        return { dateFrom: addCalendarDays(today, -6), dateTo: today };
    }
    if (preset === "month") {
        return { dateFrom: `${today.slice(0, 8)}01`, dateTo: today };
    }
    return {
        dateFrom: customFrom || undefined,
        dateTo: customTo || undefined,
    };
}

function rowCategory(row: WasteLogEntry) {
    return row.category || row.wasteCategory;
}

function isManual(row: WasteLogEntry) {
    const category = rowCategory(row);
    return category === "ManualProduct" || category === "ManualMaterial";
}

function resolveEditableMaterialId(row: WasteLogEntry) {
    const category = rowCategory(row);
    return row.materialId ?? (category === "ManualMaterial" || category === "ExpiryProduct" ? row.itemId ?? null : null);
}

function resolveEditableProductId(row: WasteLogEntry) {
    const category = rowCategory(row);
    return row.productId ?? (category === "ManualProduct" || category === "CancelProduct" ? row.itemId ?? null : null);
}

export default function WasteLogPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = isAr ? TEXT.ar : TEXT.en;
    const currency = usePosStore((state) => state.currency);
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);
    const { user } = useAuthStore();
    const canCreateWaste = isAdminRole(user?.role) || user?.role === UserRole.Manager;
    const [summary, setSummary] = useState<WasteLogSummary | null>(null);
    const [analytics, setAnalytics] = useState<WasteLogAnalytics | null>(null);
    const [entries, setEntries] = useState<WasteLogEntry[]>([]);
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [editingEntry, setEditingEntry] = useState<WasteLogEntry | null>(null);
    const [itemMode, setItemMode] = useState<WasteItemMode>("product");
    const [formWasteType, setFormWasteType] = useState<ManualWasteType>("DAMAGED");
    const [formWasteDate, setFormWasteDate] = useState(getRestaurantToday(timeZone));
    const [formEmployees, setFormEmployees] = useState<WasteEmployeeOption[]>([]);
    const [formItemId, setFormItemId] = useState("");
    const [formQuantity, setFormQuantity] = useState("");
    const [formReason, setFormReason] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formAttachmentUrl, setFormAttachmentUrl] = useState<string | null>(null);
    const [formAffectsInventory, setFormAffectsInventory] = useState(true);
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selected, setSelected] = useState<WasteLogEntry | null>(null);
    const [datePreset, setDatePreset] = useState<DatePreset>("today");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [wasteType, setWasteType] = useState<WasteFilter>("all");
    const [status, setStatus] = useState<WasteLogStatus | "all">("all");
    const [employeeId, setEmployeeId] = useState("all");
    const [productId, setProductId] = useState("all");
    const [branchId, setBranchId] = useState("");
    const branchVersion = useActiveBranchVersion();

    const editingMetadataOnly = editingEntry ? !isManual(editingEntry) : false;
    const selectedMaterial = itemMode === "material" ? materials.find((material) => material.id === formItemId) : undefined;
    const itemOptions = itemMode === "product" ? products : materials;
    const selectedUnit = editingMetadataOnly && editingEntry?.unit
        ? editingEntry.unit
        : selectedMaterial ? UnitLabels[selectedMaterial.unit] ?? String(selectedMaterial.unit) : PRODUCT_UNIT;

    function buildQuery(nextPage = page): WasteLogQueryParams {
        const range = getPresetRange(datePreset, customFrom, customTo, timeZone);
        return {
            category: wasteType === "cancel" ? "CancelProduct" : wasteType === "expired" ? "ExpiryProduct" : undefined,
            dateFrom: range.dateFrom,
            dateTo: range.dateTo,
            wasteType: wasteType === "all" || wasteType === "cancel" || wasteType === "expired" ? undefined : wasteType,
            status: status === "all" ? undefined : status,
            employeeId: employeeId === "all" ? undefined : employeeId,
            productId: productId === "all" ? undefined : productId,
            branchId: branchId || undefined,
            page: nextPage,
            limit: pageSize,
        };
    }

    async function loadWaste(nextPage = page) {
        setLoading(true);
        try {
            const query = buildQuery(nextPage);
            const [pageResult, summaryResult, analyticsResult] = await Promise.all([
                getWasteLog(query),
                getWasteLogSummary(query),
                getWasteLogAnalytics(query),
            ]);
            setEntries(pageResult.data);
            setTotal(pageResult.total);
            setSummary(summaryResult);
            setAnalytics(analyticsResult);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;
        Promise.all([getProducts(), getRawMaterials()])
            .then(([loadedProducts, loadedMaterials]) => {
                if (cancelled) return;
                setProducts(loadedProducts);
                setMaterials(loadedMaterials);
            })
            .catch(() => {
                if (cancelled) return;
                setProducts([]);
                setMaterials([]);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        setPage(1);
    }, [datePreset, customFrom, customTo, wasteType, status, employeeId, productId, branchId, timeZone]);

    // branchVersion: the "current branch" filter option ("") follows the active branch —
    // switching it in the header must reload the list for the new branch.
    useEffect(() => {
        void loadWaste(page);
    }, [page, pageSize, datePreset, customFrom, customTo, wasteType, status, employeeId, productId, branchId, timeZone, branchVersion]);

    async function openDetails(row: WasteLogEntry) {
        setSelected(row);
        setDetailsOpen(true);
        const details = await getWasteLogById(row.id);
        if (details) {
            const detailCost = details.costAmount ?? 0;
            const detailSaleLoss = details.salePriceLoss ?? 0;
            setSelected({
                ...details,
                itemNameAr: details.itemNameAr || row.itemNameAr,
                reasonAr: details.reasonAr || row.reasonAr,
                costAmount: detailCost > 0 ? detailCost : row.costAmount,
                salePriceLoss: detailSaleLoss > 0 ? detailSaleLoss : row.salePriceLoss,
                isAffectingInventory: details.isAffectingInventory || row.isAffectingInventory,
                wasteDate: details.wasteDate || row.wasteDate,
            });
        }
    }

    function openCreateForm() {
        resetManualForm();
        setFormOpen(true);
    }

    async function openEdit(row: WasteLogEntry) {
        const details = await getWasteLogById(row.id);
        populateEditForm(details ?? row);
        setDetailsOpen(false);
        setFormOpen(true);
    }

    function populateEditForm(row: WasteLogEntry) {
        const materialId = resolveEditableMaterialId(row);
        const productId = resolveEditableProductId(row);
        const wasteTypeValue = MANUAL_CREATE_TYPES.includes(row.wasteType as ManualWasteType)
            ? row.wasteType as ManualWasteType
            : "DAMAGED";

        setEditingEntry(row);
        setItemMode(materialId ? "material" : "product");
        setFormWasteType(wasteTypeValue);
        setFormWasteDate(toDateInput(row.wasteDate ?? row.createdAt));
        setFormEmployees((row.employees ?? [])
            .filter((employee) => employee.employeeId)
            .map((employee) => ({
                id: employee.employeeId!,
                name: employee.name,
                nameAr: employee.nameAr,
                username: "",
                role: "",
                staffNo: null,
            })));
        setFormItemId(materialId ?? productId ?? "");
        setFormQuantity(String(row.quantity ?? ""));
        setFormReason(row.reason ?? "");
        setFormNotes(row.notes ?? "");
        setFormAttachmentUrl(row.attachmentUrl ?? null);
        setFormAffectsInventory(row.isAffectingInventory ?? true);
        setAttachmentFile(null);
        setFormError(null);
    }

    function resetManualForm() {
        setEditingEntry(null);
        setItemMode("product");
        setFormWasteType("DAMAGED");
        setFormWasteDate(getRestaurantToday(timeZone));
        setFormEmployees([]);
        setFormItemId("");
        setFormQuantity("");
        setFormReason("");
        setFormNotes("");
        setFormAttachmentUrl(null);
        setFormAffectsInventory(true);
        setAttachmentFile(null);
        setFormError(null);
    }

    function setManualOpen(open: boolean) {
        setFormOpen(open);
        if (!open) resetManualForm();
    }

    function toDateInput(value?: string | null) {
        return value ? value.slice(0, 10) : getRestaurantToday(timeZone);
    }

    function rowMatchesCurrentFilter(row: WasteLogEntry) {
        const category = rowCategory(row);
        if (wasteType === "cancel" && category !== "CancelProduct") return false;
        if (wasteType === "expired" && category !== "ExpiryProduct") return false;
        if (wasteType !== "all" && wasteType !== "cancel" && wasteType !== "expired" && row.wasteType !== wasteType) return false;
        if (status !== "all" && row.status !== status) return false;
        if (productId !== "all" && row.productId !== productId && row.itemId !== productId) return false;
        return true;
    }

    function applySaved(row: WasteLogEntry, isEdit: boolean) {
        if (!isEdit && page === 1 && rowMatchesCurrentFilter(row)) {
            setEntries((current) => [row, ...current].slice(0, pageSize));
            setTotal((value) => value + 1);
        }
        setPage(1);
        void loadWaste(1);
    }

    async function handleSaveWaste() {
        const metadataOnly = Boolean(editingEntry && !isManual(editingEntry));
        const quantity = Number(formQuantity);
        if (!formReason.trim() || !formItemId || Number.isNaN(quantity) || quantity <= 0) {
            setFormError(text.validation);
            toast.error(text.validation);
            return;
        }

        if (!metadataOnly && formWasteType === "STAFF_MEAL" && formEmployees.length === 0) {
            setFormError(text.employeeRequired);
            toast.error(text.employeeRequired);
            return;
        }

        setFormSaving(true);
        setFormError(null);
        try {
            const attachmentUrl = attachmentFile ? await uploadImage(attachmentFile) : undefined;
            if (attachmentFile && !attachmentUrl) throw new Error(text.uploadFailed);

            const payload: WasteLogCreatePayload = {
                wasteType: metadataOnly ? "OTHER" : formWasteType,
                wasteDate: formWasteDate ? `${formWasteDate}T00:00:00Z` : undefined,
                productId: itemMode === "product" ? formItemId : undefined,
                materialId: itemMode === "material" ? formItemId : undefined,
                employeeIds: !metadataOnly && formWasteType === "STAFF_MEAL" ? formEmployees.map((employee) => employee.id) : undefined,
                quantity,
                unit: metadataOnly ? editingEntry?.unit : selectedUnit,
                reason: formReason.trim(),
                notes: formNotes.trim() || undefined,
                attachmentUrl: attachmentUrl || formAttachmentUrl || undefined,
                branchId: editingEntry?.branchId ?? undefined,
                orderId: editingEntry?.orderId ?? editingEntry?.sourceOrderId ?? undefined,
                isAffectingInventory: metadataOnly ? editingEntry?.isAffectingInventory ?? false : formAffectsInventory,
            };

            const row = editingEntry
                ? await updateWasteLog(editingEntry.id, payload)
                : await createWasteLog(payload);
            toast.success(editingEntry ? text.updatedToast : text.createdToast);
            setManualOpen(false);
            applySaved(row, Boolean(editingEntry));
        } catch (error) {
            const message = (error as Error).message || (editingEntry ? text.updateFailed : text.failed);
            setFormError(message);
            toast.error(message);
        } finally {
            setFormSaving(false);
        }
    }

    async function handleExport() {
        const token = useAuthStore.getState().user?.token ?? "";
        const response = await fetch(getWasteLogExportUrl(buildQuery(1)), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `waste-log-${getRestaurantToday(timeZone)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success(text.exported);
    }

    function displayType(type?: string | null, category?: string | null) {
        const fallback = category === "ExpiryProduct" ? "expired" : category === "CancelProduct" ? "cancel" : undefined;
        const key = type || fallback;
        if (!key) return text.legacy;
        return TYPE_LABELS[key] ? (isAr ? TYPE_LABELS[key].ar : TYPE_LABELS[key].en) : key;
    }

    function displayStatus(value?: string | null) {
        if (value === "Pending") return text.pending;
        if (value === "Approved") return text.approved;
        if (value === "Rejected") return text.rejected;
        return value || text.approved;
    }

    function statusBadge(value?: string | null) {
        if (value === "Pending") return "border-amber-200 bg-amber-50 text-amber-700";
        if (value === "Rejected") return "border-red-200 bg-red-50 text-red-700";
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    function displayName(row: WasteLogEntry) {
        if (!isAr) return row.itemName;
        return row.itemNameAr || findArabicItemName(row.productId) || findArabicItemName(row.materialId) || findArabicItemName(row.itemId) || row.itemName;
    }

    function displayReason(row: WasteLogEntry) {
        return localizeReason(isAr ? row.reasonAr || row.reason : row.reason);
    }

    function localizeReason(value?: string | null) {
        if (!value) return "-";

        const parts = value.split("|").map((part) => part.trim()).filter(Boolean);
        if (parts.length > 1) return isAr ? parts[1] : parts[0];

        if (!isAr) return value;
        return value
            .replace("Auto-detected expiry", "انتهاء صلاحية تلقائي")
            .replace("REFUND: WRONG_ORDER", "استرداد: طلب خاطئ")
            .replace("REFUND: WRONG_ORDER_ENTERED", "استرداد: تم إدخال طلب خاطئ");
    }

    function displayUnit(unit?: string | null) {
        if (!unit) return "";
        return isAr ? UNIT_LABELS_AR[unit] ?? unit : unit;
    }

    function displayActor(value?: string | null) {
        if (!value) return "-";
        return isAr && value === "System" ? "النظام" : value;
    }

    function findArabicItemName(id?: string | null) {
        if (!id) return null;

        const product = products.find((item) => item.id === id);
        if (product) return product.nameAr || product.displayName || product.name;

        const material = materials.find((item) => item.id === id);
        if (material) return material.nameAr || material.displayName || material.name;

        return null;
    }

    function localizeMetricRows(rows: { key: string; label: string; labelAr?: string | null; costAmount: number; count: number }[]) {
        if (!isAr) return rows;
        return rows.map((row) => ({ ...row, labelAr: row.labelAr || findArabicItemName(row.key) }));
    }

    const employees = (analytics?.wasteByEmployee ?? []).filter((employee) => employee.key !== "system");
    const wasteTypeOptions: StandardFilterOption[] = WASTE_FILTERS.map((type) => ({
        value: type,
        label: type === "all" ? text.allTypes : displayType(type),
    }));
    const statusOptions: StandardFilterOption[] = STATUS_OPTIONS.map((option) => ({
        value: option,
        label: option === "all" ? text.allStatuses : displayStatus(option),
    }));
    const employeeOptions: StandardFilterOption[] = [
        { value: "all", label: text.allEmployees },
        ...employees.map((employee) => ({
            value: employee.key,
            label: isAr ? employee.labelAr || employee.label : employee.label,
        })),
    ];
    const productOptions: StandardFilterOption[] = [
        { value: "all", label: text.allProducts },
        ...products.map((product) => ({
            value: product.id,
            label: isAr ? product.nameAr || product.displayName || product.name : product.displayName || product.name,
            searchText: `${product.name} ${product.nameAr ?? ""} ${product.displayName ?? ""}`,
        })),
    ];
    const topWastedProducts = localizeMetricRows(analytics?.topWastedProducts ?? []);
    const metricCards = [
        { label: text.totalCost, value: formatCurrency(analytics?.totalWasteCost ?? summary?.totalWasteCost ?? 0, currency), icon: Trash2, className: "text-red-600 bg-red-50" },
        { label: text.saleLoss, value: formatCurrency(analytics?.totalSalePriceLoss ?? summary?.totalSalePriceLoss ?? 0, currency), icon: BarChart3, className: "text-blue-600 bg-blue-50" },
        { label: text.manual, value: String(analytics?.manualCount ?? summary?.manualCount ?? 0), icon: Package, className: "text-emerald-600 bg-emerald-50" },
        { label: text.expired, value: String(analytics?.expiryCount ?? summary?.expiryCount ?? 0), icon: AlertTriangle, className: "text-amber-600 bg-amber-50" },
    ];

    return (
        <div className="space-y-5" dir={isAr ? "rtl" : "ltr"}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-950">{text.title}</h1>
                    <p className="mt-1 text-sm text-slate-500">{text.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleExport} className="gap-2">
                        <Download className="h-4 w-4" />
                        {text.export}
                    </Button>
                    {canCreateWaste && (
                        <Button onClick={openCreateForm} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {text.add}
                        </Button>
                    )}
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map(({ label, value, icon: Icon, className }) => (
                    <Card key={label}>
                        <CardContent className="flex items-center justify-between gap-3 p-4">
                            <div>
                                <p className="text-sm text-slate-500">{label}</p>
                                <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
                            </div>
                            <span className={`rounded-md p-2 ${className}`}>
                                <Icon className="h-5 w-5" />
                            </span>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Filter className="h-4 w-4" />
                        {text.status}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 lg:grid-cols-6">
                    <BranchFilter
                        value={branchId}
                        onValueChange={setBranchId}
                        label={text.branch}
                        triggerClassName="w-full"
                        contentClassName="min-w-72"
                    />

                    <div className="flex gap-1 rounded-md border border-slate-200 p-1 lg:col-span-2">
                        {(["today", "week", "month", "custom"] as DatePreset[]).map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setDatePreset(preset)}
                                className={`min-h-9 flex-1 rounded px-2 text-sm font-medium ${datePreset === preset ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                            >
                                {preset === "today" ? text.today : preset === "week" ? text.week : preset === "month" ? text.month : text.custom}
                            </button>
                        ))}
                    </div>

                    <StandardFilter
                        value={wasteType}
                        onValueChange={(value) => setWasteType((value ?? "all") as WasteFilter)}
                        options={wasteTypeOptions}
                        label={text.wasteType}
                        placeholder={text.wasteType}
                        searchPlaceholder={text.searchOptions}
                        emptyText={text.noOptions}
                        loadingText={text.loading}
                        clearLabel={text.clear}
                        clearable={false}
                        triggerClassName="w-full"
                    />

                    <StandardFilter
                        value={status}
                        onValueChange={(value) => setStatus((value ?? "all") as WasteLogStatus | "all")}
                        options={statusOptions}
                        label={text.status}
                        placeholder={text.status}
                        searchPlaceholder={text.searchOptions}
                        emptyText={text.noOptions}
                        loadingText={text.loading}
                        clearLabel={text.clear}
                        clearable={false}
                        triggerClassName="w-full"
                    />

                    <StandardFilter
                        value={employeeId}
                        onValueChange={(value) => setEmployeeId(value ?? "all")}
                        options={employeeOptions}
                        label={text.employee}
                        placeholder={text.employee}
                        searchPlaceholder={text.searchOptions}
                        emptyText={text.noOptions}
                        loadingText={text.loading}
                        clearLabel={text.clear}
                        clearable={false}
                        triggerClassName="w-full"
                    />

                    <StandardFilter
                        value={productId}
                        onValueChange={(value) => setProductId(value ?? "all")}
                        options={productOptions}
                        label={text.product}
                        placeholder={text.product}
                        searchPlaceholder={text.searchOptions}
                        emptyText={text.noOptions}
                        loadingText={text.loadingItems}
                        clearLabel={text.clear}
                        clearable={false}
                        loading={products.length === 0}
                        triggerClassName="w-full"
                    />

                    {datePreset === "custom" && (
                        <div className="grid gap-2 sm:grid-cols-2 lg:col-span-6">
                            <Label className="space-y-1">
                                <span>{text.from}</span>
                                <Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
                            </Label>
                            <Label className="space-y-1">
                                <span>{text.to}</span>
                                <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
                            </Label>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
                <ReportPanel title={text.byType} rows={analytics?.wasteByType ?? []} isAr={isAr} currency={currency} labelFormatter={displayType} />
                <ReportPanel title={text.byEmployee} rows={analytics?.wasteByEmployee ?? []} isAr={isAr} currency={currency} />
                <ReportPanel title={text.topProducts} rows={topWastedProducts} isAr={isAr} currency={currency} />
            </div>

            {(analytics?.staffMealsByEmployee?.length ?? 0) > 0 && (
                <div className="grid gap-4 xl:grid-cols-3">
                    <ReportPanel title={text.staffMealsByEmployee} rows={analytics?.staffMealsByEmployee ?? []} isAr={isAr} currency={currency} />
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex h-52 items-center justify-center gap-2 text-slate-500">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            {text.loading}
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="flex h-52 flex-col items-center justify-center gap-2 text-slate-400">
                            <Package className="h-9 w-9" />
                            <p>{text.noRows}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 text-start">#</th>
                                        <th className="px-4 py-3 text-start">{text.wasteType}</th>
                                        <th className="px-4 py-3 text-start">{text.item}</th>
                                        <th className="px-4 py-3 text-start">{text.quantity}</th>
                                        <th className="px-4 py-3 text-start">{text.status}</th>
                                        <th className="px-4 py-3 text-start">{text.cost}</th>
                                        <th className="px-4 py-3 text-start">{text.createdBy}</th>
                                        <th className="px-4 py-3 text-start">{text.date}</th>
                                        <th className="px-4 py-3 text-end">{text.edit}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {entries.map((row, index) => (
                                        <tr key={row.id} onClick={() => openDetails(row)} className="cursor-pointer hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-500">{(page - 1) * pageSize + index + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-slate-900">{displayType(row.wasteType, rowCategory(row))}</span>
                                                    <span className="text-xs text-slate-400">{isManual(row) ? text.manual : text.legacy}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{displayName(row)}</div>
                                                <div className="max-w-[260px] truncate text-xs text-slate-500">{displayReason(row)}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {Number(row.quantity).toFixed(2)} <span className="text-xs text-slate-400">{displayUnit(row.unit)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={statusBadge(row.status)}>
                                                    {displayStatus(row.status)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                {formatCurrency(row.costAmount ?? 0, currency)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{displayActor(row.createdBy || row.loggedBy)}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {formatRestaurantDateTime(row.wasteDate ?? row.createdAt, timeZone, isAr ? "ar-QA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                                            </td>
                                            <td className="px-4 py-3 text-end">
                                                {canCreateWaste && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            void openEdit(row);
                                                        }}
                                                        className="gap-1"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        {text.edit}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {total > 0 && (
                        <div className="border-t px-4 pb-4">
                            <PaginationControls
                                pageNumber={page}
                                pageSize={pageSize}
                                totalCount={total}
                                onPageChange={setPage}
                                onPageSizeChange={setPageSize}
                                pageSizeOptions={[10, 20, 50]}
                                isLoading={loading}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={formOpen} onOpenChange={setManualOpen}>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" dir={isAr ? "rtl" : "ltr"}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            {editingEntry ? text.editModalTitle : text.modalTitle}
                        </DialogTitle>
                        <DialogDescription>
                            {editingMetadataOnly ? text.sourceLinkedEditDescription : text.modalDescription}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label>{text.itemType}</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={itemMode === "product" ? "default" : "outline"}
                                    className="gap-2"
                                    disabled={editingMetadataOnly}
                                    onClick={() => {
                                        setItemMode("product");
                                        setFormItemId("");
                                    }}
                                >
                                    <WasteItemIcon className="h-4 w-4" />
                                    {text.product}
                                </Button>
                                <Button
                                    type="button"
                                    variant={itemMode === "material" ? "default" : "outline"}
                                    className="gap-2"
                                    disabled={editingMetadataOnly}
                                    onClick={() => {
                                        setItemMode("material");
                                        setFormItemId("");
                                    }}
                                >
                                    <Package className="h-4 w-4" />
                                    {text.material}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{text.wasteType}</Label>
                            <Select
                                value={formWasteType}
                                disabled={editingMetadataOnly}
                                onValueChange={(value) => {
                                    const next = value as ManualWasteType;
                                    setFormWasteType(next);
                                    if (next !== "STAFF_MEAL") setFormEmployees([]);
                                }}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {MANUAL_CREATE_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {displayType(type)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{text.wasteDate}</Label>
                            <Input
                                type="date"
                                value={formWasteDate}
                                onChange={(event) => setFormWasteDate(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{text.item}</Label>
                            <Select
                                value={formItemId || "none"}
                                onValueChange={(value) => setFormItemId(value === "none" ? "" : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={itemOptions.length === 0 ? text.loadingItems : text.selectItem} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" disabled>{itemOptions.length === 0 ? text.loadingItems : text.selectItem}</SelectItem>
                                    {itemOptions.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {isAr ? item.nameAr || item.displayName || item.name : item.displayName || item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {formWasteType === "STAFF_MEAL" && (
                            <div className="space-y-2 sm:col-span-2">
                                <Label>
                                    {text.employee} <span className="text-red-600">*</span>
                                </Label>
                                <EmployeeMultiSearchSelect
                                    value={formEmployees}
                                    onChange={setFormEmployees}
                                    isAr={isAr}
                                    placeholder={text.searchEmployee}
                                    emptyText={text.noEmployees}
                                    selectedCountLabel={text.selectedCount}
                                    removeLabel={text.removeEmployee}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>{text.quantity}</Label>
                            <Input
                                inputMode="decimal"
                                value={formQuantity}
                                onChange={(event) => setFormQuantity(event.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{text.unit}</Label>
                            <Input value={selectedUnit} readOnly className="bg-slate-50 text-slate-500" />
                        </div>

                        <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm sm:col-span-2">
                            <input
                                type="checkbox"
                                checked={formAffectsInventory}
                                disabled={editingMetadataOnly}
                                onChange={(event) => setFormAffectsInventory(event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            <span>{text.inventory}</span>
                        </label>

                        <div className="space-y-2 sm:col-span-2">
                            <Label>{text.reason}</Label>
                            <Textarea
                                value={formReason}
                                onChange={(event) => setFormReason(event.target.value)}
                                maxLength={500}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label>{text.notes}</Label>
                            <Textarea
                                value={formNotes}
                                onChange={(event) => setFormNotes(event.target.value)}
                                maxLength={1000}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label>{text.attachment}</Label>
                            {formAttachmentUrl && !attachmentFile && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <a
                                        href={formAttachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        <Paperclip className="h-4 w-4" />
                                        {text.attachment}
                                    </a>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setFormAttachmentUrl(null)}>
                                        {text.removeAttachment}
                                    </Button>
                                </div>
                            )}
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                            />
                        </div>
                    </div>

                    {formError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {formError}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" onClick={handleSaveWaste} disabled={formSaving} className="gap-2">
                            {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEntry ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {editingEntry ? text.updateWaste : text.createWaste}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                <SheetContent side="end" className="w-[calc(100vw-0.75rem)] max-w-xl sm:max-w-xl" dir={isAr ? "rtl" : "ltr"}>
                    <SheetHeader>
                        <SheetTitle>{text.details}</SheetTitle>
                        {selected?.wasteNumber && <SheetDescription>{selected.wasteNumber}</SheetDescription>}
                    </SheetHeader>
                    {selected && (
                        <div className="space-y-5 px-4 pb-6">
                            <div className="space-y-3 rounded-md border p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-950">{displayName(selected)}</p>
                                        <p className="text-sm text-slate-500">{displayType(selected.wasteType, rowCategory(selected))}</p>
                                    </div>
                                    <Badge variant="outline" className={statusBadge(selected.status)}>{displayStatus(selected.status)}</Badge>
                                </div>
                                {canCreateWaste && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(selected)} className="gap-2">
                                        <Edit className="h-4 w-4" />
                                        {text.edit}
                                    </Button>
                                )}
                                <DetailRow label={text.date} value={formatRestaurantDateTime(selected.wasteDate ?? selected.createdAt, timeZone, isAr ? "ar-QA" : "en-US", { dateStyle: "short", timeStyle: "short" })} />
                                <DetailRow label={text.quantity} value={`${Number(selected.quantity).toFixed(2)} ${displayUnit(selected.unit)}`} />
                                <DetailRow label={text.reason} value={displayReason(selected)} />
                                {selected.notes && <DetailRow label={text.notes} value={selected.notes} />}
                                <DetailRow label={text.cost} value={formatCurrency(selected.costAmount ?? 0, currency)} />
                                <DetailRow label={text.saleLoss} value={formatCurrency(selected.salePriceLoss ?? 0, currency)} />
                                <DetailRow label={text.inventory} value={selected.isAffectingInventory ? text.yes : text.no} />
                                {(selected.employees?.length ?? 0) > 0 && (
                                    <DetailRow
                                        label={text.employee}
                                        value={(selected.employees ?? [])
                                            .map((employee: WasteParticipant) => (isAr ? employee.nameAr || employee.name : employee.name))
                                            .join("، ")}
                                    />
                                )}
                                <DetailRow label={text.createdBy} value={displayActor(selected.createdBy || selected.loggedBy)} />
                                <DetailRow label={text.approvedBy} value={displayActor(selected.approvedBy || selected.createdBy)} />
                                {selected.attachmentUrl && (
                                    <a
                                        href={selected.attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        <Paperclip className="h-4 w-4" />
                                        {text.attachment}
                                    </a>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-950">{text.audit}</h3>
                                {(selected.auditTrail ?? []).length === 0 ? (
                                    <p className="text-sm text-slate-500">{text.noAudit}</p>
                                ) : (
                                    selected.auditTrail?.map((audit) => (
                                        <div key={audit.id} className="rounded-md border p-3 text-sm">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium text-slate-900">{audit.action}</span>
                                                <span className="text-xs text-slate-500">{formatRestaurantDateTime(audit.createdAt, timeZone, isAr ? "ar-QA" : "en-US")}</span>
                                            </div>
                                            <p className="mt-1 text-slate-600">{audit.performedByName || "-"}</p>
                                            {audit.notes && <p className="mt-1 text-slate-500">{audit.notes}</p>}
                                            {audit.changedFields && <p className="mt-1 text-xs text-slate-400">{audit.changedFields}</p>}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function EmployeeMultiSearchSelect({
    value,
    onChange,
    isAr,
    placeholder,
    emptyText,
    selectedCountLabel,
    removeLabel,
}: {
    value: WasteEmployeeOption[];
    onChange: (employees: WasteEmployeeOption[]) => void;
    isAr: boolean;
    placeholder: string;
    emptyText: string;
    selectedCountLabel: (n: number) => string;
    removeLabel: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<WasteEmployeeOption[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedIds = new Set(value.map((employee) => employee.id));

    useEffect(() => {
        if (!open) return;
        let active = true;
        const handle = setTimeout(() => {
            setLoading(true);
            searchWasteEmployees(query.trim() || undefined)
                .then((rows) => {
                    if (active) setResults(rows);
                })
                .finally(() => {
                    if (active) setLoading(false);
                });
        }, 250);
        return () => {
            active = false;
            clearTimeout(handle);
        };
    }, [open, query]);

    useEffect(() => {
        if (!open) return;
        function onClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);

    function nameOf(employee: WasteEmployeeOption) {
        return isAr ? employee.nameAr || employee.name : employee.name;
    }

    function metaOf(employee: WasteEmployeeOption) {
        return [employee.role, employee.staffNo].filter(Boolean).join(" · ");
    }

    function toggle(employee: WasteEmployeeOption) {
        if (selectedIds.has(employee.id)) {
            onChange(value.filter((current) => current.id !== employee.id));
        } else {
            onChange([...value, employee]);
        }
    }

    function remove(id: string) {
        onChange(value.filter((current) => current.id !== id));
    }

    return (
        <div ref={containerRef} className="space-y-2">
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((employee) => (
                        <span
                            key={employee.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800"
                        >
                            {nameOf(employee)}
                            <button
                                type="button"
                                onClick={() => remove(employee.id)}
                                aria-label={removeLabel}
                                className="text-slate-400 hover:text-red-600"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className="ltr:pl-9 rtl:pr-9"
                    />
                </div>

                {open && (
                    <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                        {value.length > 0 && (
                            <div className="border-b border-slate-100 px-3 py-1.5 text-xs text-slate-500">
                                {selectedCountLabel(value.length)}
                            </div>
                        )}
                        {loading ? (
                            <div className="flex items-center justify-center py-4 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : results.length === 0 ? (
                            <div className="py-4 text-center text-sm text-slate-400">{emptyText}</div>
                        ) : (
                            results.map((employee) => {
                                const checked = selectedIds.has(employee.id);
                                return (
                                    <button
                                        key={employee.id}
                                        type="button"
                                        onClick={() => toggle(employee)}
                                        className={`flex w-full items-start gap-3 px-3 py-2 text-start text-sm hover:bg-slate-50 ${checked ? "bg-slate-50" : ""}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            readOnly
                                            tabIndex={-1}
                                            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300"
                                        />
                                        <span className="flex flex-col">
                                            <span className="font-medium text-slate-900">{nameOf(employee)}</span>
                                            {metaOf(employee) && <span className="text-xs text-slate-500">{metaOf(employee)}</span>}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid grid-cols-[8rem_1fr] gap-3 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-900">{value}</span>
        </div>
    );
}

function ReportPanel({
    title,
    rows,
    isAr,
    currency,
    labelFormatter,
}: {
    title: string;
    rows: { key: string; label: string; labelAr?: string | null; costAmount: number; count: number }[];
    isAr: boolean;
    currency: string;
    labelFormatter?: (value: string) => string;
}) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {rows.length === 0 ? (
                    <p className="py-4 text-sm text-slate-400">{isAr ? "لا توجد بيانات" : "No data"}</p>
                ) : (
                    rows.slice(0, 5).map((row) => {
                        const label = labelFormatter ? labelFormatter(row.label) : isAr && row.labelAr ? row.labelAr : row.label;
                        return (
                            <div key={row.key} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">{label}</p>
                                    <p className="text-xs text-slate-500">{row.count}</p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold text-slate-950">{formatCurrency(row.costAmount, currency)}</p>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
