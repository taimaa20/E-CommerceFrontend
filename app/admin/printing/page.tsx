"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useLocale } from "@/components/locale-provider";
import { canAccessArea, getUnauthorizedRedirect } from "@/lib/authorization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, RefreshCw, ChefHat, Printer as PrinterIcon, RotateCw, AlertCircle } from "lucide-react";
import {
    KitchenDto, KitchenUpsertDto, PrinterDto, PrinterUpsertDto, PrintJobDto,
    CashierPrinterAssignmentDto,
    getKitchens, createKitchen, updateKitchen, deleteKitchen,
    getPrinters, createPrinter, updatePrinter, deletePrinter,
    getPrintJobs, reprintJob,
    getCashierAssignments, setCashierPrinter,
} from "@/lib/api";

const EMPTY_KITCHEN: KitchenUpsertDto = { name: "", nameAr: "", isActive: true, sortOrder: 0 };
const EMPTY_PRINTER: PrinterUpsertDto = {
    name: "", nameAr: "", kitchenId: null, type: 0,
    ipAddress: "", port: 9100,
    windowsPrinterName: "", usbPortName: "",
    codePage: 0,
    isActive: true, isReceiptPrinter: false, isDefault: false,
    useLocalAgent: false, copiesPerJob: 1,
};

const CODE_PAGE_ARABIC_WINDOWS_1256 = 34;
const CODE_PAGE_LEGACY_ARABIC = 19;

type PrintingLocale = "en" | "ar";
type PrintingTab = "kitchens" | "printers" | "cashiers" | "jobs";
type LocalizedLabel = Record<PrintingLocale, string>;

const PRINTING_TABS: PrintingTab[] = ["kitchens", "printers", "cashiers", "jobs"];

const TEXT = {
    en: {
        title: "Printing & Kitchens",
        subtitle: "Define kitchens, assign printers, and watch the print queue.",
        refresh: "Refresh",
        kitchens: "Kitchens",
        printers: "Printers",
        cashierPrinters: "Cashier printers",
        printQueue: "Print queue",
        kitchensDescription: "Each product is routed to a Kitchen; each Kitchen prints its own ticket.",
        newKitchen: "New kitchen",
        noKitchensTitle: "No kitchens yet",
        noKitchensBody: "Create one to route product tickets. The default kitchen is the lowest sort-order active one.",
        name: "Name",
        englishName: "English name",
        arabicName: "Arabic name",
        arabic: "Arabic",
        sort: "Sort",
        sortOrder: "Sort order",
        status: "Status",
        actions: "Actions",
        active: "Active",
        inactive: "Inactive",
        printersDescription: "Assign each printer to a Kitchen (kitchen ticket) or mark as Receipt printer (counter receipt).",
        newPrinter: "New printer",
        noPrintersTitle: "No printers configured",
        noPrintersBody: "Add a network printer (TCP/IP, port 9100) to start printing tickets.",
        kitchen: "Kitchen",
        type: "Type",
        address: "Address",
        role: "Role",
        receipt: "Receipt",
        default: "Default",
        kitchenTicket: "Kitchen ticket",
        network: "Network",
        usb: "USB",
        cashierDescriptionStart: "Each cashier's receipts go to their assigned printer. If left as",
        cashierDescriptionEnd: "receipts fall back to the printer marked",
        cashierDescriptionTail: "in the Printers tab. Only printers flagged as",
        cashierDescriptionFinal: "are listed here.",
        useDefault: "Use default",
        noReceiptPrinterTitle: "No receipt printer configured.",
        noReceiptPrinterBodyStart: "Until you add at least one printer with",
        noReceiptPrinterBodyEnd: "every cashier here only shows",
        noReceiptPrinterBodyTail: "with nothing to fall back to. Open the",
        noReceiptPrinterBodyFinal: "tab and create one, or edit an existing kitchen printer to also serve as a receipt printer.",
        receiptOn: "Receipt = ON",
        noDefaultReceiptPrinterTitle: "No default receipt printer.",
        noDefaultReceiptPrinterBodyStart: "Cashiers on",
        noDefaultReceiptPrinterBodyEnd: "currently fall through to the alphabetically-first active receipt printer. Mark one printer as",
        noDefaultReceiptPrinterBodyTail: "in the Printers tab for deterministic routing.",
        noUsersTitle: "No order-creating users",
        noUsersBody: "Create users with role Admin / Manager / Cashier / Waiter first.",
        user: "User",
        resolved: "Resolved",
        noneConfigured: "none configured",
        useDefaultNoPrinter: "Use default (no receipt printer set)",
        viaDefault: "via default",
        defaultSuffix: "default",
        jobsDescription: "Last 100 jobs. Failed jobs auto-retry; DeadLetter rows need manual reprint.",
        allStatuses: "All statuses",
        queueEmptyTitle: "Queue is empty",
        queueEmptyBody: "Print jobs will appear here as orders are placed.",
        order: "Order",
        attempts: "Attempts",
        lastAttempt: "Last attempt",
        error: "Error",
        reprint: "Reprint",
        editKitchen: "Edit kitchen",
        cancel: "Cancel",
        save: "Save",
        editPrinter: "Edit printer",
        noKitchenCounterReceipt: "— No kitchen (counter / receipt) —",
        codePage: "Code page",
        networkTcp: "Network (TCP/IP)",
        usbLocalAgent: "USB / local agent",
        arabicCodePage: "Arabic (Windows-1256)",
        legacyArabicCodePage: "Arabic (legacy CP864)",
        ipAddress: "IP address",
        port: "Port",
        copies: "Copies",
        receiptKitchenWarning: "A printer assigned to a Kitchen also marked as Receipt printer will print BOTH kitchen tickets and receipts. Usually you want one or the other.",
        defaultWarningStart: "Marking this printer as Default will",
        defaultWarningStrong: "clear",
        defaultWarningEnd: "the Default flag on any other printer in this tenant. Only one default per tenant.",
        assignmentUpdated: "Assignment updated",
        updateFailed: "Update failed",
        nameRequired: "Name is required",
        kitchenUpdated: "Kitchen updated",
        kitchenCreated: "Kitchen created",
        saveFailed: "Save failed",
        deleteKitchenConfirmStart: "Delete kitchen",
        deleteKitchenConfirmEnd: "Assigned products and printers stay valid (their KitchenId is cleared).",
        kitchenRemoved: "Kitchen removed",
        deleteFailed: "Delete failed",
        networkPrinterNeedsIp: "Network printers need an IP address",
        printerUpdated: "Printer updated",
        printerCreated: "Printer created",
        deletePrinterConfirmStart: "Delete printer",
        deletePrinterConfirmEnd: "Pending jobs targeting it will fail until reassigned.",
        printerRemoved: "Printer removed",
        reprintQueued: "Reprint queued",
        reprintFailed: "Reprint failed",
    },
    ar: {
        title: "الطباعة والمطابخ",
        subtitle: "عرّف المطابخ، واربط الطابعات، وتابع قائمة انتظار الطباعة.",
        refresh: "تحديث",
        kitchens: "المطابخ",
        printers: "الطابعات",
        cashierPrinters: "طابعات الكاشير",
        printQueue: "قائمة الطباعة",
        kitchensDescription: "يتم توجيه كل منتج إلى مطبخ، ويطبع كل مطبخ تذكرته الخاصة.",
        newKitchen: "مطبخ جديد",
        noKitchensTitle: "لا توجد مطابخ بعد",
        noKitchensBody: "أنشئ مطبخًا لتوجيه تذاكر المنتجات. المطبخ الافتراضي هو أقل مطبخ نشط في ترتيب الفرز.",
        name: "الاسم",
        englishName: "الاسم بالإنجليزية",
        arabicName: "الاسم بالعربية",
        arabic: "العربية",
        sort: "الترتيب",
        sortOrder: "ترتيب الفرز",
        status: "الحالة",
        actions: "الإجراءات",
        active: "نشط",
        inactive: "غير نشط",
        printersDescription: "اربط كل طابعة بمطبخ لتذاكر المطبخ، أو اجعلها طابعة إيصالات للكاونتر.",
        newPrinter: "طابعة جديدة",
        noPrintersTitle: "لا توجد طابعات مهيأة",
        noPrintersBody: "أضف طابعة شبكة (TCP/IP، منفذ 9100) لبدء طباعة التذاكر.",
        kitchen: "المطبخ",
        type: "النوع",
        address: "العنوان",
        role: "الدور",
        receipt: "إيصال",
        default: "افتراضي",
        kitchenTicket: "تذكرة مطبخ",
        network: "شبكة",
        usb: "USB",
        cashierDescriptionStart: "تُرسل إيصالات كل كاشير إلى الطابعة المخصصة له. عند ترك الخيار على",
        cashierDescriptionEnd: "تعود الإيصالات إلى الطابعة المحددة كـ",
        cashierDescriptionTail: "في تبويب الطابعات. تظهر هنا فقط الطابعات المحددة كـ",
        cashierDescriptionFinal: ".",
        useDefault: "استخدام الافتراضي",
        noReceiptPrinterTitle: "لا توجد طابعة إيصالات مهيأة.",
        noReceiptPrinterBodyStart: "حتى تضيف طابعة واحدة على الأقل مع",
        noReceiptPrinterBodyEnd: "سيظهر لكل كاشير خيار",
        noReceiptPrinterBodyTail: "دون طابعة احتياطية. افتح تبويب",
        noReceiptPrinterBodyFinal: "وأنشئ طابعة، أو عدّل طابعة مطبخ موجودة لتعمل أيضًا كطابعة إيصالات.",
        receiptOn: "الإيصالات = مفعلة",
        noDefaultReceiptPrinterTitle: "لا توجد طابعة إيصالات افتراضية.",
        noDefaultReceiptPrinterBodyStart: "الكاشيرون على خيار",
        noDefaultReceiptPrinterBodyEnd: "سيتم توجيههم حاليًا إلى أول طابعة إيصالات نشطة أبجديًا. حدّد طابعة واحدة كـ",
        noDefaultReceiptPrinterBodyTail: "في تبويب الطابعات لضمان توجيه ثابت.",
        noUsersTitle: "لا يوجد مستخدمون لإنشاء الطلبات",
        noUsersBody: "أنشئ أولًا مستخدمين بأدوار مدير النظام / مدير / كاشير / نادل.",
        user: "المستخدم",
        resolved: "المسار النهائي",
        noneConfigured: "لا توجد طابعة مهيأة",
        useDefaultNoPrinter: "استخدام الافتراضي (لا توجد طابعة إيصالات)",
        viaDefault: "عبر الافتراضي",
        defaultSuffix: "افتراضي",
        jobsDescription: "آخر 100 مهمة. المهام الفاشلة تُعاد تلقائيًا، أما المهام المتوقفة نهائيًا فتحتاج إعادة طباعة يدوية.",
        allStatuses: "كل الحالات",
        queueEmptyTitle: "قائمة الانتظار فارغة",
        queueEmptyBody: "ستظهر مهام الطباعة هنا عند إنشاء الطلبات.",
        order: "الطلب",
        attempts: "المحاولات",
        lastAttempt: "آخر محاولة",
        error: "الخطأ",
        reprint: "إعادة الطباعة",
        editKitchen: "تعديل المطبخ",
        cancel: "إلغاء",
        save: "حفظ",
        editPrinter: "تعديل الطابعة",
        noKitchenCounterReceipt: "— بدون مطبخ (كاونتر / إيصال) —",
        codePage: "صفحة الترميز",
        networkTcp: "شبكة (TCP/IP)",
        usbLocalAgent: "USB / وكيل محلي",
        arabicCodePage: "العربية (Windows-1256)",
        legacyArabicCodePage: "العربية (CP864 قديم)",
        ipAddress: "عنوان IP",
        port: "المنفذ",
        copies: "النسخ",
        receiptKitchenWarning: "الطابعة المرتبطة بمطبخ والمحددة أيضًا كطابعة إيصالات ستطبع تذاكر المطبخ والإيصالات معًا. غالبًا تحتاج أحد الخيارين فقط.",
        defaultWarningStart: "تحديد هذه الطابعة كافتراضية سيؤدي إلى",
        defaultWarningStrong: "إزالة",
        defaultWarningEnd: "علامة الافتراضي من أي طابعة أخرى في هذا المطعم. يُسمح بطابعة افتراضية واحدة فقط.",
        assignmentUpdated: "تم تحديث التعيين",
        updateFailed: "فشل التحديث",
        nameRequired: "الاسم مطلوب",
        kitchenUpdated: "تم تحديث المطبخ",
        kitchenCreated: "تم إنشاء المطبخ",
        saveFailed: "فشل الحفظ",
        deleteKitchenConfirmStart: "حذف المطبخ",
        deleteKitchenConfirmEnd: "ستبقى المنتجات والطابعات المرتبطة صالحة، وسيتم تفريغ KitchenId الخاص بها.",
        kitchenRemoved: "تم حذف المطبخ",
        deleteFailed: "فشل الحذف",
        networkPrinterNeedsIp: "طابعات الشبكة تحتاج عنوان IP",
        printerUpdated: "تم تحديث الطابعة",
        printerCreated: "تم إنشاء الطابعة",
        deletePrinterConfirmStart: "حذف الطابعة",
        deletePrinterConfirmEnd: "ستفشل المهام المعلقة الموجهة إليها حتى تتم إعادة تعيينها.",
        printerRemoved: "تم حذف الطابعة",
        reprintQueued: "تمت إضافة إعادة الطباعة إلى القائمة",
        reprintFailed: "فشلت إعادة الطباعة",
    },
} as const;

const JOB_STATUS_LABEL: Record<number, { label: LocalizedLabel; tone: string }> = {
    0: { label: { en: "Pending",    ar: "قيد الانتظار" }, tone: "bg-slate-100 text-slate-700" },
    1: { label: { en: "Printing",   ar: "جاري الطباعة" }, tone: "bg-blue-100 text-blue-700" },
    2: { label: { en: "Completed",  ar: "مكتمل" }, tone: "bg-emerald-100 text-emerald-700" },
    3: { label: { en: "Failed",     ar: "فشل" }, tone: "bg-amber-100 text-amber-800" },
    4: { label: { en: "DeadLetter", ar: "متوقف نهائيًا" }, tone: "bg-rose-100 text-rose-700" },
};

const JOB_TYPE_LABEL: Record<number, LocalizedLabel> = {
    0: { en: "Kitchen ticket", ar: "تذكرة مطبخ" },
    1: { en: "Customer receipt", ar: "إيصال العميل" },
};

const ROLE_LABEL: Record<string, LocalizedLabel> = {
    Admin: { en: "Admin", ar: "مدير النظام" },
    Manager: { en: "Manager", ar: "مدير" },
    Cashier: { en: "Cashier", ar: "كاشير" },
    Waiter: { en: "Waiter", ar: "نادل" },
    Kitchen: { en: "Kitchen", ar: "مطبخ" },
};

function localized(label: LocalizedLabel, locale: PrintingLocale) {
    return label[locale];
}

function displayName(locale: PrintingLocale, name?: string | null, nameAr?: string | null) {
    return locale === "ar" ? (nameAr || name || "") : (name || nameAr || "");
}

function displayRole(role: string, locale: PrintingLocale) {
    return ROLE_LABEL[role]?.[locale] ?? role;
}

function isPrintingTab(value: string): value is PrintingTab {
    return PRINTING_TABS.includes(value as PrintingTab);
}

function getErrorMessage(err: unknown) {
    if (err instanceof Error) return err.message;
    if (typeof err === "object" && err !== null && "message" in err) {
        const message = (err as { message?: unknown }).message;
        return typeof message === "string" ? message : undefined;
    }
    return undefined;
}

export default function PrintingAdminPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = TEXT[locale];
    const dateLocale = isAr ? "ar-SA" : "en-US";

    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<PrintingTab>("kitchens");

    const [kitchens, setKitchens] = useState<KitchenDto[]>([]);
    const [printers, setPrinters] = useState<PrinterDto[]>([]);
    const [cashiers, setCashiers] = useState<CashierPrinterAssignmentDto[]>([]);
    const [jobs, setJobs] = useState<PrintJobDto[]>([]);
    const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
    const [loading, setLoading] = useState(false);

    const [kitchenDialogOpen, setKitchenDialogOpen] = useState(false);
    const [kitchenEditing, setKitchenEditing] = useState<KitchenDto | null>(null);
    const [kitchenForm, setKitchenForm] = useState<KitchenUpsertDto>(EMPTY_KITCHEN);

    const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
    const [printerEditing, setPrinterEditing] = useState<PrinterDto | null>(null);
    const [printerForm, setPrinterForm] = useState<PrinterUpsertDto>(EMPTY_PRINTER);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (!mounted) return;
        if (!canAccessArea(user?.role, "admin")) {
            router.push(getUnauthorizedRedirect(isAuthenticated, user?.role));
        } else {
            void refreshAll();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, isAuthenticated, user?.role]);

    async function refreshAll() {
        setLoading(true);
        try {
            const [k, p, c] = await Promise.all([getKitchens(), getPrinters(), getCashierAssignments()]);
            setKitchens(k);
            setPrinters(p);
            setCashiers(c);
            if (tab === "jobs") await refreshJobs();
        } finally {
            setLoading(false);
        }
    }

    async function handleAssignCashier(userId: string, printerId: string | null) {
        // True optimistic update: change the UI BEFORE the network round-trip
        // so the dropdown trigger flips the moment the user clicks. The
        // previous value is captured for rollback if the API rejects the change.
        const printer = printerId ? printers.find(p => p.id === printerId) : null;
        const printerName = printer ? displayName(locale, printer.name, printer.nameAr) : null;
        let previous: CashierPrinterAssignmentDto[] = [];
        setCashiers(prev => {
            previous = prev;
            return prev.map(c => c.userId === userId
                ? { ...c, receiptPrinterId: printerId, receiptPrinterName: printerName }
                : c);
        });

        try {
            await setCashierPrinter(userId, printerId);
            toast.success(text.assignmentUpdated);
        } catch (err: unknown) {
            // Rollback to the snapshot taken before the optimistic write so
            // the dropdown returns to its real persisted state.
            setCashiers(previous);
            toast.error(getErrorMessage(err) || text.updateFailed);
        }
    }

    async function refreshJobs() {
        const statusInt = jobStatusFilter === "all" ? undefined : parseInt(jobStatusFilter, 10);
        setJobs(await getPrintJobs(statusInt, 100));
    }

    useEffect(() => {
        if (tab === "jobs" && mounted) void refreshJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, jobStatusFilter, mounted]);

    // ── Kitchen handlers ─────────────────────────────────────────────────
    function openCreateKitchen() {
        setKitchenEditing(null);
        setKitchenForm(EMPTY_KITCHEN);
        setKitchenDialogOpen(true);
    }
    function openEditKitchen(k: KitchenDto) {
        setKitchenEditing(k);
        setKitchenForm({ name: k.name, nameAr: k.nameAr ?? "", isActive: k.isActive, sortOrder: k.sortOrder });
        setKitchenDialogOpen(true);
    }
    async function saveKitchen() {
        if (!kitchenForm.name.trim()) {
            toast.error(text.nameRequired);
            return;
        }
        try {
            if (kitchenEditing) {
                await updateKitchen(kitchenEditing.id, kitchenForm);
                toast.success(text.kitchenUpdated);
            } else {
                await createKitchen(kitchenForm);
                toast.success(text.kitchenCreated);
            }
            setKitchenDialogOpen(false);
            await refreshAll();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err) || text.saveFailed);
        }
    }
    async function removeKitchen(k: KitchenDto) {
        const name = displayName(locale, k.name, k.nameAr);
        if (!confirm(`${text.deleteKitchenConfirmStart} "${name}"${isAr ? "؟" : "?"} ${text.deleteKitchenConfirmEnd}`)) return;
        try {
            await deleteKitchen(k.id);
            toast.success(text.kitchenRemoved);
            await refreshAll();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err) || text.deleteFailed);
        }
    }

    // ── Printer handlers ─────────────────────────────────────────────────
    function openCreatePrinter() {
        setPrinterEditing(null);
        setPrinterForm(EMPTY_PRINTER);
        setPrinterDialogOpen(true);
    }
    function openEditPrinter(p: PrinterDto) {
        setPrinterEditing(p);
        setPrinterForm({
            name: p.name, nameAr: p.nameAr ?? "",
            kitchenId: p.kitchenId ?? null, type: p.type,
            ipAddress: p.ipAddress ?? "", port: p.port,
            windowsPrinterName: p.windowsPrinterName ?? "",
            usbPortName: p.usbPortName ?? "",
            codePage: p.codePage,
            isActive: p.isActive, isReceiptPrinter: p.isReceiptPrinter, isDefault: p.isDefault,
            useLocalAgent: p.useLocalAgent,
            copiesPerJob: p.copiesPerJob,
        });
        setPrinterDialogOpen(true);
    }
    async function savePrinter() {
        if (!printerForm.name.trim()) { toast.error(text.nameRequired); return; }
        if (printerForm.type === 0 && !printerForm.ipAddress?.trim()) {
            toast.error(text.networkPrinterNeedsIp);
            return;
        }
        if (printerForm.type === 1 && !printerForm.windowsPrinterName?.trim()) {
            toast.error("Windows printer name is required for USB printers (e.g. \"XP-80C Cashir\").");
            return;
        }
        // USB printers MUST use the local agent — there is no other path.
        // Force the flag on at save time even if the disabled toggle was bypassed.
        if (printerForm.type === 1) {
            printerForm.useLocalAgent = true;
        }
        try {
            if (printerEditing) {
                await updatePrinter(printerEditing.id, printerForm);
                toast.success(text.printerUpdated);
            } else {
                await createPrinter(printerForm);
                toast.success(text.printerCreated);
            }
            setPrinterDialogOpen(false);
            await refreshAll();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err) || text.saveFailed);
        }
    }
    async function removePrinter(p: PrinterDto) {
        const name = displayName(locale, p.name, p.nameAr);
        if (!confirm(`${text.deletePrinterConfirmStart} "${name}"${isAr ? "؟" : "?"} ${text.deletePrinterConfirmEnd}`)) return;
        try {
            await deletePrinter(p.id);
            toast.success(text.printerRemoved);
            await refreshAll();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err) || text.deleteFailed);
        }
    }

    async function handleReprint(j: PrintJobDto) {
        const ok = await reprintJob(j.id);
        if (ok) {
            toast.success(text.reprintQueued);
            await refreshJobs();
        } else {
            toast.error(text.reprintFailed);
        }
    }

    if (!mounted) return null;

    return (
        <div className="space-y-6" dir={locale === "ar" ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <PrinterIcon className="h-6 w-6" /> {text.title}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {text.subtitle}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refreshAll()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} /> {text.refresh}
                </Button>
            </div>

            <Tabs value={tab} onValueChange={(v) => isPrintingTab(v) && setTab(v)}>
                <TabsList dir={isAr ? "rtl" : "ltr"}>
                    <TabsTrigger value="kitchens">{text.kitchens}</TabsTrigger>
                    <TabsTrigger value="printers">{text.printers}</TabsTrigger>
                    <TabsTrigger value="cashiers">{text.cashierPrinters}</TabsTrigger>
                    <TabsTrigger value="jobs">{text.printQueue}</TabsTrigger>
                </TabsList>

                {/* ───── Kitchens ───── */}
                <TabsContent value="kitchens" className="space-y-4">
                    <Card>
                        <CardHeader className={isAr ? "flex flex-col items-start gap-4 text-start" : "flex flex-row items-center justify-between"}>
                            <div dir={isAr ? "rtl" : "ltr"}>
                                <CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5" /> {text.kitchens}</CardTitle>
                                <CardDescription>{text.kitchensDescription}</CardDescription>
                            </div>
                            <Button size="sm" onClick={openCreateKitchen} dir={isAr ? "rtl" : "ltr"}>
                                <Plus className="h-4 w-4 me-2" /> {text.newKitchen}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {kitchens.length === 0 ? (
                                <EmptyState
                                    icon={<ChefHat className="h-8 w-8" />}
                                    title={text.noKitchensTitle}
                                    body={text.noKitchensBody}
                                />
                            ) : (
                                <table className="w-full text-sm" dir={isAr ? "rtl" : "ltr"}>
                                    <thead className="text-start text-xs uppercase text-muted-foreground border-b">
                                        <tr>
                                            <th className="py-2">{text.name}</th>
                                            <th className="py-2">{text.arabic}</th>
                                            <th className="py-2">{text.sort}</th>
                                            <th className="py-2">{text.printers}</th>
                                            <th className="py-2">{text.status}</th>
                                            <th className="py-2 text-end">{text.actions}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {kitchens.map((k) => (
                                            <tr key={k.id} className="border-b last:border-0">
                                                <td className="py-2 font-medium">{displayName(locale, k.name, k.nameAr)}</td>
                                                <td className="py-2 text-muted-foreground">{k.nameAr || "—"}</td>
                                                <td className="py-2">{k.sortOrder}</td>
                                                <td className="py-2">{k.printerCount}</td>
                                                <td className="py-2">
                                                    {k.isActive
                                                        ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{text.active}</Badge>
                                                        : <Badge variant="secondary">{text.inactive}</Badge>}
                                                </td>
                                                <td className="py-2 text-end space-x-2 rtl:space-x-reverse">
                                                    <Button size="sm" variant="outline" onClick={() => openEditKitchen(k)}>
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => removeKitchen(k)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ───── Printers ───── */}
                <TabsContent value="printers" className="space-y-4">
                    <Card>
                        <CardHeader className={isAr ? "flex flex-col items-start gap-4 text-start" : "flex flex-row items-center justify-between"}>
                            <div dir={isAr ? "rtl" : "ltr"}>
                                <CardTitle className="flex items-center gap-2"><PrinterIcon className="h-5 w-5" /> {text.printers}</CardTitle>
                                <CardDescription>
                                    {text.printersDescription}
                                </CardDescription>
                            </div>
                            <Button size="sm" onClick={openCreatePrinter} dir={isAr ? "rtl" : "ltr"}>
                                <Plus className="h-4 w-4 me-2" /> {text.newPrinter}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {printers.length === 0 ? (
                                <EmptyState
                                    icon={<PrinterIcon className="h-8 w-8" />}
                                    title={text.noPrintersTitle}
                                    body={text.noPrintersBody}
                                />
                            ) : (
                                <table className="w-full text-sm" dir={isAr ? "rtl" : "ltr"}>
                                    <thead className="text-start text-xs uppercase text-muted-foreground border-b">
                                        <tr>
                                            <th className="py-2">{text.name}</th>
                                            <th className="py-2">{text.kitchen}</th>
                                            <th className="py-2">{text.type}</th>
                                            <th className="py-2">{text.address}</th>
                                            <th className="py-2">{text.role}</th>
                                            <th className="py-2">{text.status}</th>
                                            <th className="py-2 text-end">{text.actions}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printers.map((p) => (
                                            <tr key={p.id} className="border-b last:border-0">
                                                <td className="py-2 font-medium">{displayName(locale, p.name, p.nameAr)}</td>
                                                <td className="py-2 text-muted-foreground">{p.kitchenName || "—"}</td>
                                                <td className="py-2">{p.type === 0 ? text.network : text.usb}</td>
                                                <td className="py-2 font-mono text-xs">
                                                    {p.type === 0
                                                        ? `${p.ipAddress || "—"}:${p.port}`
                                                        : (p.windowsPrinterName || p.usbPortName || "—")}
                                                </td>
                                                <td className="py-2">
                                                    <span className="inline-flex flex-wrap gap-1">
                                                        {p.isReceiptPrinter ? (
                                                            <>
                                                                <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">{text.receipt}</Badge>
                                                                {p.isDefault && (
                                                                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{text.default}</Badge>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <Badge variant="outline">{text.kitchenTicket}</Badge>
                                                        )}
                                                        {p.useLocalAgent && (
                                                            <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">Agent</Badge>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="py-2">
                                                    {p.isActive
                                                        ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{text.active}</Badge>
                                                        : <Badge variant="secondary">{text.inactive}</Badge>}
                                                </td>
                                                <td className="py-2 text-end space-x-2 rtl:space-x-reverse">
                                                    <Button size="sm" variant="outline" onClick={() => openEditPrinter(p)}>
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => removePrinter(p)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ───── Cashier printer assignments ───── */}
                <TabsContent value="cashiers" className="space-y-4">
                    {(() => {
                        const receiptPrinters = printers.filter(p => p.isReceiptPrinter && p.isActive);
                        const hasReceiptPrinter = receiptPrinters.length > 0;
                        const hasDefault = receiptPrinters.some(p => p.isDefault);

                        return (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{text.cashierPrinters}</CardTitle>
                                    <CardDescription>
                                        {text.cashierDescriptionStart} <em>{text.useDefault}</em>, {text.cashierDescriptionEnd}
                                        <Badge className="mx-1 bg-amber-100 text-amber-800 hover:bg-amber-100">{text.default}</Badge>
                                        {text.cashierDescriptionTail} <strong>{text.receipt}</strong> {text.cashierDescriptionFinal}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {!hasReceiptPrinter && (
                                        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="font-medium">{text.noReceiptPrinterTitle}</div>
                                                <div className="text-xs">
                                                    {text.noReceiptPrinterBodyStart} <strong>{text.receiptOn}</strong>, {text.noReceiptPrinterBodyEnd} <em>— {text.useDefault} —</em> {text.noReceiptPrinterBodyTail} <strong>{text.printers}</strong> {text.noReceiptPrinterBodyFinal}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {hasReceiptPrinter && !hasDefault && (
                                        <div className="mb-4 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="font-medium">{text.noDefaultReceiptPrinterTitle}</div>
                                                <div className="text-xs">
                                                    {text.noDefaultReceiptPrinterBodyStart} <em>— {text.useDefault} —</em> {text.noDefaultReceiptPrinterBodyEnd} <strong>{text.default}</strong> {text.noDefaultReceiptPrinterBodyTail}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {cashiers.length === 0 ? (
                                        <EmptyState
                                            icon={<PrinterIcon className="h-8 w-8" />}
                                            title={text.noUsersTitle}
                                            body={text.noUsersBody}
                                        />
                                    ) : (
                                        <table className="w-full text-sm" dir={isAr ? "rtl" : "ltr"}>
                                    <thead className="text-start text-xs uppercase text-muted-foreground border-b">
                                        <tr>
                                            <th className="py-2">{text.user}</th>
                                            <th className="py-2">{text.role}</th>
                                            <th className="py-2">{text.receipt} {text.printers}</th>
                                            <th className="py-2">{text.resolved}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cashiers.map((c) => {
                                            const defaultPrinter = receiptPrinters.find(p => p.isDefault) ?? receiptPrinters[0];
                                            const assignedPrinter = c.receiptPrinterId
                                                ? receiptPrinters.find(p => p.id === c.receiptPrinterId)
                                                : null;
                                            const resolvedName = assignedPrinter
                                                ? displayName(locale, assignedPrinter.name, assignedPrinter.nameAr)
                                                : c.receiptPrinterName ?? (defaultPrinter ? displayName(locale, defaultPrinter.name, defaultPrinter.nameAr) : `— ${text.noneConfigured} —`);
                                            // Inline the resolved printer in the "Use default" option so the
                                            // trigger shows where receipts ACTUALLY go, not just "Use default"
                                            // which on its own doesn't tell the operator anything useful.
                                            const defaultLabel = defaultPrinter
                                                ? `${text.useDefault} → ${displayName(locale, defaultPrinter.name, defaultPrinter.nameAr)}`
                                                : text.useDefaultNoPrinter;
                                            return (
                                                <tr key={c.userId} className="border-b last:border-0">
                                                    <td className="py-2 font-medium">
                                                        {displayName(locale, c.fullName || c.username, c.fullNameAr)}
                                                        <div className="text-xs text-muted-foreground">@{c.username}</div>
                                                    </td>
                                                    <td className="py-2"><Badge variant="outline">{displayRole(c.role, locale)}</Badge></td>
                                                    <td className="py-2">
                                                        <Select
                                                            value={c.receiptPrinterId ?? "__default__"}
                                                            onValueChange={(v) =>
                                                                handleAssignCashier(c.userId, v === "__default__" ? null : v)
                                                            }
                                                        >
                                                            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__default__">{defaultLabel}</SelectItem>
                                                                {receiptPrinters.map((p) => (
                                                                    <SelectItem key={p.id} value={p.id}>
                                                                        {displayName(locale, p.name, p.nameAr)}{p.isDefault ? ` (${text.defaultSuffix})` : ""}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="py-2 text-xs text-muted-foreground">
                                                        {resolvedName}
                                                        {c.receiptPrinterId == null && defaultPrinter && (
                                                            <span className="ms-1 text-amber-700">({text.viaDefault})</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })()}
                </TabsContent>

                {/* ───── Jobs ───── */}
                <TabsContent value="jobs" className="space-y-4">
                    <Card>
                        <CardHeader className={isAr ? "flex flex-col items-start gap-4 text-start" : "flex flex-row items-center justify-between"}>
                            <div dir={isAr ? "rtl" : "ltr"}>
                                <CardTitle>{text.printQueue}</CardTitle>
                                <CardDescription>
                                    {text.jobsDescription}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2" dir={isAr ? "rtl" : "ltr"}>
                                <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{text.allStatuses}</SelectItem>
                                        <SelectItem value="0">{localized(JOB_STATUS_LABEL[0].label, locale)}</SelectItem>
                                        <SelectItem value="1">{localized(JOB_STATUS_LABEL[1].label, locale)}</SelectItem>
                                        <SelectItem value="2">{localized(JOB_STATUS_LABEL[2].label, locale)}</SelectItem>
                                        <SelectItem value="3">{localized(JOB_STATUS_LABEL[3].label, locale)}</SelectItem>
                                        <SelectItem value="4">{localized(JOB_STATUS_LABEL[4].label, locale)}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="sm" onClick={refreshJobs}>
                                    <RefreshCw className="h-4 w-4 me-2" /> {text.refresh}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {jobs.length === 0 ? (
                                <EmptyState
                                    icon={<PrinterIcon className="h-8 w-8" />}
                                    title={text.queueEmptyTitle}
                                    body={text.queueEmptyBody}
                                />
                            ) : (
                                <table className="w-full text-sm" dir={isAr ? "rtl" : "ltr"}>
                                    <thead className="text-start text-xs uppercase text-muted-foreground border-b">
                                        <tr>
                                            <th className="py-2">{text.order}</th>
                                            <th className="py-2">{text.type}</th>
                                            <th className="py-2">{text.kitchen}</th>
                                            <th className="py-2">{text.status}</th>
                                            <th className="py-2">{text.attempts}</th>
                                            <th className="py-2">{text.lastAttempt}</th>
                                            <th className="py-2">{text.error}</th>
                                            <th className="py-2 text-end">{text.actions}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobs.map((j) => {
                                            const status = JOB_STATUS_LABEL[j.status] ?? { label: { en: String(j.status), ar: String(j.status) }, tone: "" };
                                            return (
                                                <tr key={j.id} className="border-b last:border-0 align-top">
                                                    <td className="py-2 font-mono text-xs">{j.orderNumber || j.orderId.slice(0, 8)}</td>
                                                    <td className="py-2">{JOB_TYPE_LABEL[j.jobType] ? localized(JOB_TYPE_LABEL[j.jobType], locale) : j.jobType}</td>
                                                    <td className="py-2 text-muted-foreground">{j.kitchenName || "—"}</td>
                                                    <td className="py-2">
                                                        <Badge className={`${status.tone} hover:${status.tone}`}>{localized(status.label, locale)}</Badge>
                                                    </td>
                                                    <td className="py-2">{j.attemptCount}/{j.maxAttempts}</td>
                                                    <td className="py-2 text-xs text-muted-foreground">
                                                        {j.lastAttemptAt ? new Date(j.lastAttemptAt).toLocaleString(dateLocale) : "—"}
                                                    </td>
                                                    <td className="py-2 text-xs text-rose-600 max-w-xs truncate" title={j.lastError ?? ""}>
                                                        {j.lastError || "—"}
                                                    </td>
                                                    <td className="py-2 text-end">
                                                        {(j.status === 4 || j.status === 2 || j.status === 3) && (
                                                            <Button size="sm" variant="outline" onClick={() => handleReprint(j)}>
                                                                <RotateCw className="h-3 w-3 me-1" /> {text.reprint}
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Kitchen dialog ── */}
            <Dialog open={kitchenDialogOpen} onOpenChange={setKitchenDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{kitchenEditing ? text.editKitchen : text.newKitchen}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{text.englishName}</Label>
                            <Input value={kitchenForm.name} onChange={(e) => setKitchenForm({ ...kitchenForm, name: e.target.value })} placeholder="Hot Line" />
                        </div>
                        <div className="space-y-2">
                            <Label>{text.arabicName}</Label>
                            <Input value={kitchenForm.nameAr ?? ""} onChange={(e) => setKitchenForm({ ...kitchenForm, nameAr: e.target.value })} placeholder="المطبخ الساخن" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{text.sortOrder}</Label>
                                <Input type="number" value={kitchenForm.sortOrder} onChange={(e) => setKitchenForm({ ...kitchenForm, sortOrder: parseInt(e.target.value || "0", 10) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>{text.active}</Label>
                                <div className="flex h-10 items-center">
                                    <Switch checked={kitchenForm.isActive} onCheckedChange={(v) => setKitchenForm({ ...kitchenForm, isActive: v })} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setKitchenDialogOpen(false)}>{text.cancel}</Button>
                        <Button onClick={saveKitchen}>{text.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Printer dialog ── */}
            <Dialog open={printerDialogOpen} onOpenChange={setPrinterDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{printerEditing ? text.editPrinter : text.newPrinter}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{text.englishName}</Label>
                                <Input value={printerForm.name} onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })} placeholder="Hot Line Printer" />
                            </div>
                            <div className="space-y-2">
                                <Label>{text.arabicName}</Label>
                                <Input value={printerForm.nameAr ?? ""} onChange={(e) => setPrinterForm({ ...printerForm, nameAr: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{text.kitchen}</Label>
                            <Select
                                value={printerForm.kitchenId ?? "__none__"}
                                onValueChange={(v) => setPrinterForm({ ...printerForm, kitchenId: v === "__none__" ? null : v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">{text.noKitchenCounterReceipt}</SelectItem>
                                    {kitchens.map((k) => (
                                        <SelectItem key={k.id} value={k.id}>{displayName(locale, k.name, k.nameAr)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{text.type}</Label>
                                <Select
                                    value={String(printerForm.type)}
                                    onValueChange={(v) => setPrinterForm({ ...printerForm, type: parseInt(v, 10) })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">{text.networkTcp}</SelectItem>
                                        <SelectItem value="1">{text.usbLocalAgent}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{text.codePage}</Label>
                                <Select
                                    value={String(printerForm.codePage)}
                                    onValueChange={(v) => setPrinterForm({ ...printerForm, codePage: parseInt(v, 10) })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">PC437 (USA)</SelectItem>
                                        <SelectItem value="16">Windows-1252</SelectItem>
                                        <SelectItem value={String(CODE_PAGE_ARABIC_WINDOWS_1256)}>{text.arabicCodePage}</SelectItem>
                                        <SelectItem value={String(CODE_PAGE_LEGACY_ARABIC)}>{text.legacyArabicCodePage}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {printerForm.type === 0 && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label>{text.ipAddress}</Label>
                                    <Input
                                        value={printerForm.ipAddress ?? ""}
                                        onChange={(e) => setPrinterForm({ ...printerForm, ipAddress: e.target.value })}
                                        placeholder="192.168.1.50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{text.port}</Label>
                                    <Input
                                        type="number"
                                        value={printerForm.port}
                                        onChange={(e) => setPrinterForm({ ...printerForm, port: parseInt(e.target.value || "9100", 10) })}
                                    />
                                </div>
                            </div>
                        )}

                        {printerForm.type === 1 && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Windows printer name</Label>
                                        <Input
                                            value={printerForm.windowsPrinterName ?? ""}
                                            onChange={(e) => setPrinterForm({ ...printerForm, windowsPrinterName: e.target.value })}
                                            placeholder="XP-80C Cashir"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Exact name as it appears in Windows → Settings → Printers &amp; scanners.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>USB port (optional)</Label>
                                        <Input
                                            value={printerForm.usbPortName ?? ""}
                                            onChange={(e) => setPrinterForm({ ...printerForm, usbPortName: e.target.value })}
                                            placeholder="USB002"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Informational only — from Printer properties → Ports tab.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>
                                        USB printers require the <strong>local print-agent</strong> service running on the host PC. The agent polls this server for jobs and writes raw ESC/POS bytes to the named Windows printer. Until the agent is running, USB jobs sit in the queue as <em>Pending</em> indefinitely (they will not fail or DeadLetter).
                                    </span>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label>{text.copies}</Label>
                                <Input
                                    type="number" min={1}
                                    value={printerForm.copiesPerJob}
                                    onChange={(e) => setPrinterForm({ ...printerForm, copiesPerJob: Math.max(1, parseInt(e.target.value || "1", 10)) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Local agent</Label>
                                <div className="flex h-10 items-center">
                                    <Switch
                                        // USB printers always require the agent — force on and disable.
                                        checked={printerForm.type === 1 ? true : printerForm.useLocalAgent}
                                        disabled={printerForm.type === 1}
                                        onCheckedChange={(v) => setPrinterForm({ ...printerForm, useLocalAgent: v })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{text.receipt}</Label>
                                <div className="flex h-10 items-center">
                                    <Switch
                                        checked={printerForm.isReceiptPrinter}
                                        onCheckedChange={(v) => setPrinterForm({
                                            ...printerForm,
                                            isReceiptPrinter: v,
                                            // Default only meaningful on receipt printers — clear when toggled off.
                                            isDefault: v ? printerForm.isDefault : false,
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{text.default}</Label>
                                <div className="flex h-10 items-center">
                                    <Switch
                                        checked={printerForm.isDefault}
                                        disabled={!printerForm.isReceiptPrinter}
                                        onCheckedChange={(v) => setPrinterForm({ ...printerForm, isDefault: v })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{text.active}</Label>
                                <div className="flex h-10 items-center">
                                    <Switch
                                        checked={printerForm.isActive}
                                        onCheckedChange={(v) => setPrinterForm({ ...printerForm, isActive: v })}
                                    />
                                </div>
                            </div>
                        </div>

                        {printerForm.isReceiptPrinter && printerForm.kitchenId && (
                            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                                <AlertCircle className="h-4 w-4 mt-0.5" />
                                <span>
                                    {text.receiptKitchenWarning}
                                </span>
                            </div>
                        )}

                        {printerForm.isDefault && (
                            <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
                                <AlertCircle className="h-4 w-4 mt-0.5" />
                                <span>
                                    {text.defaultWarningStart} <strong>{text.defaultWarningStrong}</strong> {text.defaultWarningEnd}
                                </span>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPrinterDialogOpen(false)}>{text.cancel}</Button>
                        <Button onClick={savePrinter}>{text.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <div className="text-slate-400">{icon}</div>
            <div className="font-medium text-slate-700">{title}</div>
            <div className="text-sm max-w-md">{body}</div>
        </div>
    );
}
