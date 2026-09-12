"use client";

import {
    Armchair,
    BadgeCheck,
    Boxes,
    Camera,
    ChefHat,
    CircleAlert,
    Laptop,
    Monitor,
    Package,
    Printer,
    Router,
    Snowflake,
    Truck,
    Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import type { AssetAttachmentType, AssetCondition, AssetMaintenanceStatus, AssetStatus } from "@/lib/api-assets";

export const ASSET_STATUSES: AssetStatus[] = ["Active", "InMaintenance", "Damaged", "Lost", "Retired", "Disposed", "InStorage"];
export const ASSET_CONDITIONS: AssetCondition[] = ["Excellent", "Good", "Fair", "Damaged", "Critical"];
export const MAINTENANCE_STATUSES: AssetMaintenanceStatus[] = ["Scheduled", "InProgress", "Completed", "Cancelled", "Overdue"];
export const ASSET_ATTACHMENT_TYPES: AssetAttachmentType[] = ["Invoice", "WarrantyDocument", "Manual", "Photo", "MaintenanceReport", "Receipt", "Video", "Other"];

export const assetLabels = {
    assets: { en: "Assets", ar: "الأصول" },
    dashboard: { en: "Dashboard", ar: "لوحة الأصول" },
    list: { en: "Asset Register", ar: "سجل الأصول" },
    details: { en: "Asset Details", ar: "تفاصيل الأصل" },
    create: { en: "Create Asset", ar: "إضافة أصل" },
    edit: { en: "Edit Asset", ar: "تعديل الأصل" },
    categories: { en: "Asset Categories", ar: "فئات الأصول" },
    maintenance: { en: "Maintenance", ar: "الصيانة" },
    logs: { en: "Activity Logs", ar: "سجل النشاط" },
    totalAssets: { en: "Total assets", ar: "إجمالي الأصول" },
    activeAssets: { en: "Active assets", ar: "الأصول النشطة" },
    inMaintenance: { en: "In maintenance", ar: "قيد الصيانة" },
    damagedAssets: { en: "Damaged assets", ar: "أصول تالفة" },
    expiringWarranties: { en: "Expiring warranties", ar: "ضمانات قاربت الانتهاء" },
    assetValue: { en: "Asset value", ar: "قيمة الأصول" },
    monthMaintenance: { en: "Maintenance this month", ar: "صيانة هذا الشهر" },
    byCategory: { en: "Assets by category", ar: "الأصول حسب الفئة" },
    byStatus: { en: "Assets by status", ar: "الأصول حسب الحالة" },
    maintenanceTrend: { en: "Maintenance trend", ar: "اتجاه الصيانة" },
    costTrend: { en: "Asset cost trend", ar: "اتجاه تكلفة الأصول" },
    search: { en: "Search", ar: "بحث" },
    category: { en: "Category", ar: "الفئة" },
    status: { en: "Status", ar: "الحالة" },
    condition: { en: "Condition", ar: "الحالة الفنية" },
    employee: { en: "Employee", ar: "الموظف" },
    location: { en: "Location", ar: "الموقع" },
    department: { en: "Department", ar: "القسم" },
    warranty: { en: "Warranty", ar: "الضمان" },
    actions: { en: "Actions", ar: "الإجراءات" },
    newAsset: { en: "New Asset", ar: "أصل جديد" },
    export: { en: "Export", ar: "تصدير" },
    reset: { en: "Reset", ar: "إعادة" },
    apply: { en: "Apply", ar: "تطبيق" },
    empty: { en: "No assets match these filters.", ar: "لا توجد أصول مطابقة." },
    loading: { en: "Loading assets", ar: "جارٍ تحميل الأصول" },
    save: { en: "Save", ar: "حفظ" },
    saving: { en: "Saving", ar: "جارٍ الحفظ" },
    delete: { en: "Delete", ar: "حذف" },
    cancel: { en: "Cancel", ar: "إلغاء" },
    confirm: { en: "Confirm", ar: "تأكيد" },
    back: { en: "Back", ar: "رجوع" },
    attachments: { en: "Attachments", ar: "المرفقات" },
    upload: { en: "Upload", ar: "رفع" },
    general: { en: "General Information", ar: "معلومات عامة" },
    financial: { en: "Financial Details", ar: "التفاصيل المالية" },
    assignment: { en: "Assignment Details", ar: "بيانات التخصيص" },
    warrantyInfo: { en: "Warranty Information", ar: "معلومات الضمان" },
    timeline: { en: "Activity Timeline", ar: "الخط الزمني" },
    maintenanceHistory: { en: "Maintenance History", ar: "سجل الصيانة" },
    qrCode: { en: "QR code", ar: "رمز QR" },
    barcode: { en: "Barcode", ar: "الباركود" },
    addMaintenance: { en: "Add Maintenance", ar: "إضافة صيانة" },
    columnVisibility: { en: "Columns", ar: "الأعمدة" },
    all: { en: "All", ar: "الكل" },
    none: { en: "None", ar: "بدون" },
    open: { en: "Open", ar: "فتح" },
    restore: { en: "Restore", ar: "استعادة" },
    assetNameEn: { en: "Asset Name (English)", ar: "اسم الأصل بالإنجليزية" },
    assetNameAr: { en: "Asset Name (Arabic)", ar: "اسم الأصل بالعربية" },
    assetType: { en: "Asset Type", ar: "نوع الأصل" },
    brand: { en: "Brand", ar: "العلامة التجارية" },
    model: { en: "Model", ar: "الموديل" },
    brandModel: { en: "Brand / Model", ar: "العلامة / الموديل" },
    serialNumber: { en: "Serial Number", ar: "الرقم التسلسلي" },
    description: { en: "Description", ar: "الوصف" },
    descriptionEn: { en: "Description (English)", ar: "الوصف بالإنجليزية" },
    descriptionAr: { en: "Description (Arabic)", ar: "الوصف بالعربية" },
    purchaseDate: { en: "Purchase Date", ar: "تاريخ الشراء" },
    purchaseCost: { en: "Purchase Cost", ar: "تكلفة الشراء" },
    currentValue: { en: "Current Value", ar: "القيمة الحالية" },
    supplier: { en: "Supplier", ar: "المورد" },
    warrantyStart: { en: "Warranty Start", ar: "بداية الضمان" },
    warrantyEnd: { en: "Warranty End", ar: "نهاية الضمان" },
    start: { en: "Start", ar: "البداية" },
    end: { en: "End", ar: "النهاية" },
    notes: { en: "Notes", ar: "ملاحظات" },
    active: { en: "Active", ar: "نشط" },
    yes: { en: "Yes", ar: "نعم" },
    no: { en: "No", ar: "لا" },
    action: { en: "Action", ar: "الإجراء" },
    by: { en: "By", ar: "بواسطة" },
    time: { en: "Time", ar: "الوقت" },
    change: { en: "Change", ar: "التغيير" },
    before: { en: "Before", ar: "قبل" },
    after: { en: "After", ar: "بعد" },
    type: { en: "Type", ar: "النوع" },
    cost: { en: "Cost", ar: "التكلفة" },
    vendor: { en: "Vendor", ar: "المزود" },
    performedBy: { en: "Performed By", ar: "نفذ بواسطة" },
    date: { en: "Date", ar: "التاريخ" },
    nextDate: { en: "Next Date", ar: "التاريخ القادم" },
    created: { en: "Created", ar: "تم الإنشاء" },
    chooseFiles: { en: "Choose files", ar: "اختيار الملفات" },
    selectedFiles: { en: "Selected files", ar: "الملفات المحددة" },
};

const statusText: Record<AssetStatus, { en: string; ar: string }> = {
    Active: { en: "Active", ar: "نشط" },
    InMaintenance: { en: "In Maintenance", ar: "قيد الصيانة" },
    Damaged: { en: "Damaged", ar: "تالف" },
    Lost: { en: "Lost", ar: "مفقود" },
    Retired: { en: "Retired", ar: "متقاعد" },
    Disposed: { en: "Disposed", ar: "تم التخلص منه" },
    InStorage: { en: "In Storage", ar: "في المخزن" },
};

const conditionText: Record<AssetCondition, { en: string; ar: string }> = {
    Excellent: { en: "Excellent", ar: "ممتازة" },
    Good: { en: "Good", ar: "جيدة" },
    Fair: { en: "Fair", ar: "متوسطة" },
    Damaged: { en: "Damaged", ar: "تالفة" },
    Critical: { en: "Critical", ar: "حرجة" },
};

const maintenanceText: Record<AssetMaintenanceStatus, { en: string; ar: string }> = {
    Scheduled: { en: "Scheduled", ar: "مجدولة" },
    InProgress: { en: "In Progress", ar: "قيد التنفيذ" },
    Completed: { en: "Completed", ar: "مكتملة" },
    Cancelled: { en: "Cancelled", ar: "ملغاة" },
    Overdue: { en: "Overdue", ar: "متأخرة" },
};

const attachmentText: Record<AssetAttachmentType, { en: string; ar: string }> = {
    Invoice: { en: "Invoice", ar: "فاتورة" },
    WarrantyDocument: { en: "Warranty Document", ar: "مستند ضمان" },
    Manual: { en: "Manual", ar: "دليل استخدام" },
    Photo: { en: "Photo", ar: "صورة" },
    MaintenanceReport: { en: "Maintenance Report", ar: "تقرير صيانة" },
    Receipt: { en: "Receipt", ar: "إيصال" },
    Video: { en: "Video", ar: "فيديو" },
    Other: { en: "Other", ar: "أخرى" },
};

const actionText: Record<string, { en: string; ar: string }> = {
    Created: { en: "Created", ar: "تم الإنشاء" },
    Updated: { en: "Updated", ar: "تم التحديث" },
    Assigned: { en: "Assigned", ar: "تم التخصيص" },
    MaintenanceAdded: { en: "Maintenance Added", ar: "تمت إضافة صيانة" },
    AttachmentUploaded: { en: "Attachment Uploaded", ar: "تم رفع مرفق" },
    AttachmentDeleted: { en: "Attachment Deleted", ar: "تم حذف مرفق" },
    StatusChanged: { en: "Status Changed", ar: "تم تغيير الحالة" },
    Deleted: { en: "Deleted", ar: "تم الحذف" },
    Restored: { en: "Restored", ar: "تمت الاستعادة" },
};

const fieldText: Record<string, { en: string; ar: string }> = {
    assetCode: { en: "Asset Code", ar: "كود الأصل" },
    assetNameEn: assetLabels.assetNameEn,
    assetNameAr: assetLabels.assetNameAr,
    descriptionEn: assetLabels.descriptionEn,
    descriptionAr: assetLabels.descriptionAr,
    assetCategoryId: assetLabels.category,
    assetType: assetLabels.assetType,
    brand: assetLabels.brand,
    model: assetLabels.model,
    serialNumber: assetLabels.serialNumber,
    barcode: assetLabels.barcode,
    purchaseDate: assetLabels.purchaseDate,
    purchaseCost: assetLabels.purchaseCost,
    currentValue: assetLabels.currentValue,
    warrantyStartDate: assetLabels.warrantyStart,
    warrantyEndDate: assetLabels.warrantyEnd,
    supplierName: assetLabels.supplier,
    status: assetLabels.status,
    condition: assetLabels.condition,
    assignedToEmployeeId: assetLabels.employee,
    assignedLocation: assetLabels.location,
    department: assetLabels.department,
    notes: assetLabels.notes,
    isActive: assetLabels.active,
};

export function tx(isRtl: boolean, key: keyof typeof assetLabels) {
    return isRtl ? assetLabels[key].ar : assetLabels[key].en;
}

export function statusLabel(value: AssetStatus | string, isRtl: boolean) {
    return statusText[value as AssetStatus]?.[isRtl ? "ar" : "en"] ?? value;
}

export function conditionLabel(value: AssetCondition | string, isRtl: boolean) {
    return conditionText[value as AssetCondition]?.[isRtl ? "ar" : "en"] ?? value;
}

export function maintenanceStatusLabel(value: AssetMaintenanceStatus | string, isRtl: boolean) {
    return maintenanceText[value as AssetMaintenanceStatus]?.[isRtl ? "ar" : "en"] ?? value;
}

export function attachmentTypeLabel(value: AssetAttachmentType | string, isRtl: boolean) {
    return attachmentText[value as AssetAttachmentType]?.[isRtl ? "ar" : "en"] ?? value;
}

export function assetActionLabel(value: string, isRtl: boolean) {
    return actionText[value]?.[isRtl ? "ar" : "en"] ?? value;
}

export function assetFieldLabel(value: string, isRtl: boolean) {
    return fieldText[value]?.[isRtl ? "ar" : "en"] ?? value;
}

export function AssetStatusBadge({ status, isRtl }: { status: AssetStatus | string; isRtl: boolean }) {
    const tone = {
        Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
        InMaintenance: "bg-amber-50 text-amber-700 border-amber-200",
        Damaged: "bg-rose-50 text-rose-700 border-rose-200",
        Lost: "bg-slate-100 text-slate-700 border-slate-200",
        Retired: "bg-zinc-100 text-zinc-700 border-zinc-200",
        Disposed: "bg-stone-100 text-stone-700 border-stone-200",
        InStorage: "bg-sky-50 text-sky-700 border-sky-200",
    }[status as AssetStatus] ?? "bg-slate-50 text-slate-700";
    return <Badge variant="outline" className={cn("whitespace-nowrap border", tone)}>{statusLabel(status, isRtl)}</Badge>;
}

export function AssetConditionBadge({ condition, isRtl }: { condition: AssetCondition | string; isRtl: boolean }) {
    const tone = {
        Excellent: "bg-emerald-50 text-emerald-700 border-emerald-200",
        Good: "bg-lime-50 text-lime-700 border-lime-200",
        Fair: "bg-amber-50 text-amber-700 border-amber-200",
        Damaged: "bg-rose-50 text-rose-700 border-rose-200",
        Critical: "bg-red-50 text-red-700 border-red-200",
    }[condition as AssetCondition] ?? "bg-slate-50 text-slate-700";
    return <Badge variant="outline" className={cn("whitespace-nowrap border", tone)}>{conditionLabel(condition, isRtl)}</Badge>;
}

export function AssetIcon({ name, className }: { name?: string | null; className?: string }) {
    const props = { className: cn("size-4", className) };
    switch ((name || "").toLowerCase()) {
        case "monitor": return <Monitor {...props} />;
        case "printer": return <Printer {...props} />;
        case "chefhat": return <ChefHat {...props} />;
        case "router": return <Router {...props} />;
        case "armchair": return <Armchair {...props} />;
        case "laptop": return <Laptop {...props} />;
        case "refrigerator": return <Snowflake {...props} />;
        case "truck": return <Truck {...props} />;
        case "camera": return <Camera {...props} />;
        case "wrench": return <Wrench {...props} />;
        case "badgecheck": return <BadgeCheck {...props} />;
        case "circlealert": return <CircleAlert {...props} />;
        case "boxes": return <Boxes {...props} />;
        default: return <Package {...props} />;
    }
}

export function useAssetCurrency() {
    return useSettingsStore((state) => state.settings.currency);
}

export function formatMoney(value?: number | null, currency = useSettingsStore.getState().settings.currency) {
    if (value === undefined || value === null) return "-";
    return formatCurrency(value, currency);
}

export function formatDate(value?: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
}

export function normalizeAssetDownloadUrl(url: string) {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/api/assets")) return url.replace("/api/assets", "/api/api-proxy/assets");
    return url;
}

export function assetQrTarget(value?: string | null) {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const path = value.startsWith("/") ? value : `/${value}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
}

export function AssetQrPreview({ value, label }: { value?: string | null; label: string }) {
    const data = assetQrTarget(value);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data)}`;
    return (
        <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            {data ? (
                <img src={qrUrl} alt={label} className="mt-2 size-32 rounded border border-slate-100 bg-white p-1" />
            ) : (
                <div className="mt-2 flex size-32 items-center justify-center rounded border bg-slate-50 text-xs text-slate-400">-</div>
            )}
            <div className="mt-2 break-all rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600">{data || "-"}</div>
        </div>
    );
}

export function AssetAuditChangeView({ oldValue, newValue, isRtl }: { oldValue?: string | null; newValue?: string | null; isRtl: boolean }) {
    const currency = useAssetCurrency();
    const before = parseAuditValue(oldValue);
    const after = parseAuditValue(newValue);
    const beforeObj = isPlainObject(before) ? before : null;
    const afterObj = isPlainObject(after) ? after : null;

    if (beforeObj || afterObj) {
        const keys = Array.from(new Set([...Object.keys(beforeObj ?? {}), ...Object.keys(afterObj ?? {})]))
            .filter((key) => formatAuditValue(beforeObj?.[key], key, isRtl, currency) !== formatAuditValue(afterObj?.[key], key, isRtl, currency));

        if (keys.length === 0) return <span className="text-sm text-slate-500">-</span>;

        return (
            <div className="space-y-2">
                {keys.map((key) => (
                    <div key={key} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                        <div className="text-xs font-semibold text-slate-600">{assetFieldLabel(key, isRtl)}</div>
                        <div className="mt-1 grid grid-cols-1 gap-2 md:grid-cols-2">
                            <AuditValue label={tx(isRtl, "before")} value={formatAuditValue(beforeObj?.[key], key, isRtl, currency)} />
                            <AuditValue label={tx(isRtl, "after")} value={formatAuditValue(afterObj?.[key], key, isRtl, currency)} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const beforeText = formatAuditValue(before, "", isRtl, currency);
    const afterText = formatAuditValue(after, "", isRtl, currency);
    if (beforeText === "-" && afterText === "-") return <span className="text-sm text-slate-500">-</span>;

    return (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <AuditValue label={tx(isRtl, "before")} value={beforeText} />
            <AuditValue label={tx(isRtl, "after")} value={afterText} />
        </div>
    );
}

function AuditValue({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[11px] font-medium text-slate-500">{label}</div>
            <div className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-900">{value}</div>
        </div>
    );
}

function parseAuditValue(value?: string | null): unknown {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === "-") return null;
    try {
        return JSON.parse(trimmed);
    } catch {
        return trimmed;
    }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function formatAuditValue(value: unknown, key: string, isRtl: boolean, currency: string): string {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? tx(isRtl, "yes") : tx(isRtl, "no");
    if (key === "status") return statusLabel(String(value), isRtl);
    if (key === "condition") return conditionLabel(String(value), isRtl);
    if (key.toLowerCase().includes("date") && typeof value === "string") return formatDate(value);
    if ((key.toLowerCase().includes("cost") || key.toLowerCase().includes("value")) && typeof value === "number") return formatMoney(value, currency);
    if (typeof value === "object") return "-";
    return String(value);
}
