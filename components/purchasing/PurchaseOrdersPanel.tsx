"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    Eye,
    FileText,
    Loader2,
    PackageCheck,
    Plus,
    Send,
    Wallet,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { StandardFilter } from "@/components/filters/StandardFilter";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    NewPurchaseOrderDialog,
    PaymentBadge,
    PurchaseDetailsDialog,
    RecordPaymentDialog,
} from "@/components/purchasing/PurchaseDocumentDialogs";
import { FinishedGoodsOrderDetailDialog } from "@/components/purchasing/FinishedGoodsOrderDetailDialog";
import { PurchaseItemKindBadge, PurchaseStageBadge } from "@/components/purchasing/purchasing-shared";
import { ProcurementApi, type SimplePurchaseDetails } from "@/lib/api-procurement";
import {
    purchasingApi,
    type PurchaseItemKind,
    type PurchaseOrderRow,
    type PurchaseOrderStage,
} from "@/lib/api-purchasing";
import { retailPurchasingApi } from "@/lib/api-retail";
import type { RetailPurchaseOrderDto } from "@/types/retail";
import { formatCurrency } from "@/lib/currencies";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { usePosStore } from "@/store/posStore";

const PAGE_SIZE = 10;

const copy = {
    title: ["Purchase orders", "أوامر الشراء"],
    subtitle: [
        "Everything bought from a supplier. Receiving is what puts it into inventory.",
        "كل ما يُشترى من المورّدين. الاستلام هو ما يُدخله إلى المخزون.",
    ],
    newOrder: ["New purchase order", "أمر شراء جديد"],
    invoices: ["Invoices", "الفواتير"],
    search: ["Search order, invoice or supplier", "ابحث برقم الأمر أو الفاتورة أو المورد"],
    allTypes: ["All items", "كل الأصناف"],
    finished: ["Finished products", "منتجات جاهزة"],
    material: ["Raw materials", "مواد خام"],
    allStages: ["All stages", "كل المراحل"],
    draft: ["Draft", "مسودة"],
    ordered: ["Sent to supplier", "أُرسل للمورد"],
    receivedStage: ["Received", "تم الاستلام"],
    completed: ["In stock", "في المخزون"],
    cancelledStage: ["Cancelled", "ملغى"],
    allPayments: ["Any payment status", "أي حالة دفع"],
    unpaid: ["Unpaid", "غير مدفوعة"],
    partiallyPaid: ["Partially paid", "مدفوعة جزئياً"],
    paid: ["Paid", "مدفوعة"],
    orderNumber: ["Order #", "رقم الأمر"],
    type: ["Type", "النوع"],
    supplier: ["Supplier", "المورّد"],
    invoiceNumber: ["Invoice", "الفاتورة"],
    date: ["Date", "التاريخ"],
    lines: ["Items", "الأصناف"],
    total: ["Total", "الإجمالي"],
    paidColumn: ["Paid", "المدفوع"],
    balance: ["Balance", "الرصيد"],
    paymentStatus: ["Payment", "الدفع"],
    stage: ["Stage", "المرحلة"],
    actions: ["Actions", "الإجراءات"],
    view: ["View", "عرض"],
    send: ["Send to supplier", "إرسال للمورد"],
    receive: ["Receive", "استلام"],
    approve: ["Approve", "اعتماد"],
    cancelOrder: ["Cancel order", "إلغاء الأمر"],
    recordPayment: ["Record payment", "تسجيل دفعة"],
    loading: ["Loading...", "جارٍ التحميل..."],
    empty: ["No purchase orders match these filters.", "لا توجد أوامر شراء مطابقة."],
    previous: ["Previous", "السابق"],
    next: ["Next", "التالي"],
    sent: ["Purchase order sent to the supplier", "أُرسل أمر الشراء للمورد"],
    receivedOk: ["Received — inventory updated", "تم الاستلام — حُدِّث المخزون"],
    receivedPending: ["Received — approval updates inventory", "تم الاستلام — الاعتماد يحدّث المخزون"],
    approvedOk: ["Approved — inventory updated", "تم الاعتماد — حُدِّث المخزون"],
    cancelledOk: ["Purchase order cancelled", "أُلغي أمر الشراء"],
    failed: ["Something went wrong", "حدث خطأ"],
    retry: ["Try again", "إعادة المحاولة"],
} as const;

/**
 * The one purchase-order list.
 *
 * Rows come from a single endpoint that merges both purchase documents, so the operator sees
 * one workflow: order, receive, in stock. Which stock model a row belongs to shows as a type
 * badge and decides which service the row actions call — it is never a separate screen.
 */
/**
 * `initialSearch` seeds the free-text filter, which already matches supplier name. That is how
 * "show me this supplier's purchase orders" is answered without a second filter or a second
 * screen — the relationship was always in the data, only the route to it was missing.
 */
export function PurchaseOrdersPanel({ initialSearch = "" }: { initialSearch?: string } = {}) {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const t = (key: keyof typeof copy) => copy[key][ar ? 1 : 0];
    const currency = usePosStore((state) => state.currency);
    const branchVersion = useActiveBranchVersion();

    const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState(initialSearch);
    const [itemKind, setItemKind] = useState<PurchaseItemKind | "">("");
    const [stage, setStage] = useState<PurchaseOrderStage | "">("");
    const [paymentStatus, setPaymentStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [failedToLoad, setFailedToLoad] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [materialDetails, setMaterialDetails] = useState<SimplePurchaseDetails | null>(null);
    const [finishedDetails, setFinishedDetails] = useState<RetailPurchaseOrderDto | null>(null);
    const [paymentRow, setPaymentRow] = useState<PurchaseOrderRow | null>(null);

    const load = async () => {
        setLoading(true);
        setFailedToLoad(false);
        try {
            const result = await purchasingApi.orders({
                pageNumber: page,
                pageSize: PAGE_SIZE,
                search: search.trim() || undefined,
                itemKind: itemKind || undefined,
                stage: stage || undefined,
                paymentStatus: paymentStatus || undefined,
            });
            setRows(result.items);
            setTotalCount(result.totalCount);
        } catch {
            setRows([]);
            setTotalCount(0);
            setFailedToLoad(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [page, search, itemKind, stage, paymentStatus, branchVersion]);

    const openDetails = async (row: PurchaseOrderRow) => {
        setBusyId(row.id);
        try {
            if (row.itemKind === "FinishedProduct") {
                setFinishedDetails(await retailPurchasingApi.get(row.id));
            } else {
                setMaterialDetails(await ProcurementApi.getSimplePurchase(row.id));
            }
        } catch {
            toast.error(t("failed"));
        } finally {
            setBusyId(null);
        }
    };

    /** Row actions route by item kind; the operator sees one verb either way. */
    const runAction = async (row: PurchaseOrderRow, action: () => Promise<unknown>, success: string) => {
        setBusyId(row.id);
        try {
            await action();
            toast.success(success);
            await load();
        } catch (error) {
            const message = (error as { response?: { data?: unknown } })?.response?.data;
            toast.error(typeof message === "string" ? message : t("failed"));
        } finally {
            setBusyId(null);
        }
    };

    const receive = (row: PurchaseOrderRow) => runAction(
        row,
        () => row.itemKind === "FinishedProduct"
            ? retailPurchasingApi.receive(row.id, { lines: [] })
            : ProcurementApi.receiveSimplePurchase(row.id),
        row.itemKind === "FinishedProduct" ? t("receivedOk") : t("receivedPending"),
    );

    const resetToFirstPage = <T,>(setter: (value: T) => void) => (value: T) => {
        setter(value);
        setPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return (
        <>
            <Card>
                <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle>{t("title")}</CardTitle>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/ntxadminpos/expense-invoices">
                                <FileText className="size-4" />
                                {t("invoices")}
                            </Link>
                        </Button>
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus className="size-4" />
                            {t("newOrder")}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row">
                        <Input
                            value={search}
                            onChange={(event) => resetToFirstPage(setSearch)(event.target.value)}
                            placeholder={t("search")}
                            className="lg:max-w-sm"
                        />
                        <StandardFilter
                            value={itemKind || "all"}
                            onValueChange={(value) =>
                                resetToFirstPage(setItemKind)(!value || value === "all" ? "" : value as PurchaseItemKind)}
                            options={[
                                { value: "all", label: t("allTypes") },
                                { value: "FinishedProduct", label: t("finished") },
                                { value: "RawMaterial", label: t("material") },
                            ]}
                            placeholder={t("type")}
                            searchPlaceholder={t("search")}
                            emptyText={t("empty")}
                            loadingText={t("loading")}
                            clearLabel={t("allTypes")}
                            clearable={false}
                            triggerClassName="w-full lg:w-48"
                        />
                        <StandardFilter
                            value={stage || "all"}
                            onValueChange={(value) =>
                                resetToFirstPage(setStage)(!value || value === "all" ? "" : value as PurchaseOrderStage)}
                            options={[
                                { value: "all", label: t("allStages") },
                                { value: "Draft", label: t("draft") },
                                { value: "Ordered", label: t("ordered") },
                                { value: "Received", label: t("receivedStage") },
                                { value: "Completed", label: t("completed") },
                                { value: "Cancelled", label: t("cancelledStage") },
                            ]}
                            placeholder={t("stage")}
                            searchPlaceholder={t("search")}
                            emptyText={t("empty")}
                            loadingText={t("loading")}
                            clearLabel={t("allStages")}
                            clearable={false}
                            triggerClassName="w-full lg:w-48"
                        />
                        <StandardFilter
                            value={paymentStatus || "all"}
                            onValueChange={(value) =>
                                resetToFirstPage(setPaymentStatus)(!value || value === "all" ? "" : value)}
                            options={[
                                { value: "all", label: t("allPayments") },
                                { value: "Unpaid", label: t("unpaid") },
                                { value: "PartiallyPaid", label: t("partiallyPaid") },
                                { value: "Paid", label: t("paid") },
                            ]}
                            placeholder={t("paymentStatus")}
                            searchPlaceholder={t("search")}
                            emptyText={t("empty")}
                            loadingText={t("loading")}
                            clearLabel={t("allPayments")}
                            clearable={false}
                            triggerClassName="w-full lg:w-52"
                        />
                    </div>

                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("orderNumber")}</TableHead>
                                    <TableHead>{t("type")}</TableHead>
                                    <TableHead>{t("supplier")}</TableHead>
                                    <TableHead>{t("invoiceNumber")}</TableHead>
                                    <TableHead>{t("date")}</TableHead>
                                    <TableHead>{t("lines")}</TableHead>
                                    <TableHead className="text-end">{t("total")}</TableHead>
                                    <TableHead className="text-end">{t("paidColumn")}</TableHead>
                                    <TableHead className="text-end">{t("balance")}</TableHead>
                                    <TableHead>{t("paymentStatus")}</TableHead>
                                    <TableHead>{t("stage")}</TableHead>
                                    <TableHead className="text-end">{t("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="h-28 text-center">
                                            <Loader2 className="mx-auto size-5 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                ) : failedToLoad ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="h-28 text-center">
                                            <p className="text-muted-foreground">{t("failed")}</p>
                                            <Button variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
                                                {t("retry")}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="h-28 text-center text-muted-foreground">
                                            {t("empty")}
                                        </TableCell>
                                    </TableRow>
                                ) : rows.map((row) => (
                                    <TableRow key={`${row.itemKind}-${row.id}`}>
                                        <TableCell className="font-medium">{row.documentNumber}</TableCell>
                                        <TableCell><PurchaseItemKindBadge kind={row.itemKind} ar={ar} /></TableCell>
                                        <TableCell className="min-w-40">{row.supplierDisplayName || "—"}</TableCell>
                                        <TableCell>{row.invoiceNumber ?? "—"}</TableCell>
                                        <TableCell className="whitespace-nowrap">{formatDate(row.documentDateUtc, locale)}</TableCell>
                                        <TableCell>{row.lineCount}</TableCell>
                                        <TableCell className="text-end tabular-nums">{formatCurrency(row.totalAmount, currency)}</TableCell>
                                        <TableCell className="text-end tabular-nums">{formatCurrency(row.paidAmount, currency)}</TableCell>
                                        <TableCell className="text-end tabular-nums">{formatCurrency(row.balance, currency)}</TableCell>
                                        <TableCell><PaymentBadge status={row.paymentStatus} ar={ar} /></TableCell>
                                        <TableCell><PurchaseStageBadge stage={row.stage} ar={ar} /></TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t("view")}
                                                    onClick={() => void openDetails(row)}
                                                    disabled={busyId === row.id}
                                                >
                                                    <Eye className="size-4" />
                                                </Button>
                                                {row.canSubmit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t("send")}
                                                        onClick={() => void runAction(row, () => retailPurchasingApi.submit(row.id), t("sent"))}
                                                        disabled={busyId === row.id}
                                                    >
                                                        <Send className="size-4" />
                                                    </Button>
                                                )}
                                                {row.canReceive && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t("receive")}
                                                        onClick={() => void receive(row)}
                                                        disabled={busyId === row.id}
                                                    >
                                                        {busyId === row.id
                                                            ? <Loader2 className="size-4 animate-spin" />
                                                            : <PackageCheck className="size-4" />}
                                                    </Button>
                                                )}
                                                {row.canApprove && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t("approve")}
                                                        onClick={() => void runAction(row, () => ProcurementApi.approveSimplePurchase(row.id), t("approvedOk"))}
                                                        disabled={busyId === row.id}
                                                    >
                                                        <CircleCheck className="size-4" />
                                                    </Button>
                                                )}
                                                {row.canCancel && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t("cancelOrder")}
                                                        className="text-destructive hover:text-destructive/80"
                                                        onClick={() => void runAction(row, () => retailPurchasingApi.cancel(row.id), t("cancelledOk"))}
                                                        disabled={busyId === row.id}
                                                    >
                                                        <XCircle className="size-4" />
                                                    </Button>
                                                )}
                                                {row.invoiceId && row.balance > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t("recordPayment")}
                                                        onClick={() => setPaymentRow(row)}
                                                    >
                                                        <Wallet className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="size-4 rtl:-scale-x-100" />
                            {t("previous")}
                        </Button>
                        <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                            disabled={page >= totalPages}
                        >
                            {t("next")}
                            <ChevronRight className="size-4 rtl:-scale-x-100" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <NewPurchaseOrderDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSaved={load}
            />
            <PurchaseDetailsDialog
                details={materialDetails}
                onOpenChange={(open) => !open && setMaterialDetails(null)}
            />
            <FinishedGoodsOrderDetailDialog
                order={finishedDetails}
                ar={ar}
                currency={currency}
                onClose={() => setFinishedDetails(null)}
            />
            <RecordPaymentDialog
                order={paymentRow}
                onOpenChange={(open) => !open && setPaymentRow(null)}
                onSaved={load}
            />
        </>
    );
}

function formatDate(value: string, locale: string): string {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-QA" : "en-QA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(value));
}
