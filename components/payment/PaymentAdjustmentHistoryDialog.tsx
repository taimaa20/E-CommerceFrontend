"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useLocale } from "@/components/locale-provider";
import { getRequestErrorMessage } from "@/lib/api";
import {
    getPaymentAdjustmentHistory,
    type PaymentAdjustmentHistoryPage,
} from "@/lib/api-payment-adjustments";
import { getPaymentMethodName, type PaymentMethodDto } from "@/lib/api-payment-methods";
import { formatCurrency } from "@/lib/currencies";
import { formatRestaurantDate, formatRestaurantTime, restaurantDateRangeToUtc } from "@/lib/date-time";

interface PaymentAdjustmentHistoryDialogProps {
    paymentMethods: PaymentMethodDto[];
    currency: string;
    timeZone: string;
    onClose: () => void;
}

const EMPTY_PAGE: PaymentAdjustmentHistoryPage = {
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
};

const REASON_LABELS: Record<string, { en: string; ar: string }> = {
    WRONG_PAYMENT_TYPE: { en: "Wrong payment type selected", ar: "تم اختيار نوع دفع غير صحيح" },
    "Wrong payment type selected": { en: "Wrong payment type selected", ar: "تم اختيار نوع دفع غير صحيح" },
    CUSTOMER_CHANGED_METHOD: { en: "Customer changed payment method", ar: "غيّر العميل طريقة الدفع" },
    "Customer changed payment method": { en: "Customer changed payment method", ar: "غيّر العميل طريقة الدفع" },
    SPLIT_PAYMENT_CORRECTION: { en: "Split payment correction", ar: "تصحيح دفعة مقسمة" },
    "Split payment correction": { en: "Split payment correction", ar: "تصحيح دفعة مقسمة" },
    CASH_BY_MISTAKE: { en: "Cash entered by mistake", ar: "تم إدخال الدفع النقدي بالخطأ" },
    "Cash entered by mistake": { en: "Cash entered by mistake", ar: "تم إدخال الدفع النقدي بالخطأ" },
    CARD_BY_MISTAKE: { en: "Card entered by mistake", ar: "تم إدخال دفع البطاقة بالخطأ" },
    "Card entered by mistake": { en: "Card entered by mistake", ar: "تم إدخال دفع البطاقة بالخطأ" },
};

const ORDER_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
    dinein: { en: "In-Store", ar: "داخل المتجر" },
    "dine in": { en: "In-Store", ar: "داخل المتجر" },
    takeaway: { en: "Takeaway", ar: "سفري" },
    delivery: { en: "Delivery", ar: "توصيل" },
};

const PAYMENT_METHOD_LABELS_AR: Record<string, string> = {
    cash: "نقدي",
    card: "بطاقة",
    "credit card": "بطاقة ائتمان",
    visa: "فيزا",
    mastercard: "ماستركارد",
    master: "ماستركارد",
    cliq: "كليك",
    click: "كليك",
    instapay: "إنستاباي",
    "etisalat cash": "اتصالات كاش",
    meeza: "ميزة",
    wallet: "محفظة",
};

function localizeReason(reason: string, isArabic: boolean) {
    const label = REASON_LABELS[reason.trim()];
    return label ? (isArabic ? label.ar : label.en) : reason;
}

function localizeOrderType(orderType: string, isArabic: boolean) {
    const label = ORDER_TYPE_LABELS[orderType.trim().toLowerCase()];
    return label ? (isArabic ? label.ar : label.en) : orderType;
}

function localizePaymentMethod(name: string, nameAr: string | null | undefined, isArabic: boolean) {
    if (!isArabic) return name;
    if (nameAr?.trim()) return nameAr;
    return PAYMENT_METHOD_LABELS_AR[name.trim().toLowerCase()] ?? name;
}

export default function PaymentAdjustmentHistoryDialog({
    paymentMethods,
    currency,
    timeZone,
    onClose,
}: PaymentAdjustmentHistoryDialogProps) {
    const { locale } = useLocale();
    const isArabic = locale === "ar";
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [user, setUser] = useState("");
    const [manager, setManager] = useState("");
    const [paymentMethodId, setPaymentMethodId] = useState("all");
    const [orderType, setOrderType] = useState("all");
    const [result, setResult] = useState<PaymentAdjustmentHistoryPage>(EMPTY_PAGE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        const timer = window.setTimeout(() => {
            setLoading(true);
            setError("");
            const dateRange = dateFrom || dateTo
                ? restaurantDateRangeToUtc(dateFrom || dateTo, dateTo || dateFrom, timeZone)
                : null;
            void getPaymentAdjustmentHistory({
                page,
                pageSize,
                dateFrom: dateFrom ? dateRange?.startUtc : undefined,
                dateTo: dateTo ? dateRange?.endUtc : undefined,
                user: user.trim() || undefined,
                manager: manager.trim() || undefined,
                paymentMethodId: paymentMethodId === "all" ? undefined : paymentMethodId,
                orderType: orderType === "all" ? undefined : orderType,
            })
                .then((data) => {
                    if (active) setResult(data);
                })
                .catch((requestError) => {
                    if (!active) return;
                    setResult(EMPTY_PAGE);
                    setError(getRequestErrorMessage(
                        requestError,
                        isArabic ? "تعذر تحميل سجل تعديلات الدفع" : "Failed to load payment adjustment history",
                    ));
                })
                .finally(() => {
                    if (active) setLoading(false);
                });
        }, 250);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [dateFrom, dateTo, isArabic, manager, orderType, page, pageSize, paymentMethodId, timeZone, user]);

    const resetPage = () => setPage(1);

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-h-[95dvh] sm:max-w-7xl">
                <DialogHeader>
                    <DialogTitle>{isArabic ? "تغييرات طرق الدفع" : "Payment Method Changes"}</DialogTitle>
                    <DialogDescription>
                        {isArabic ? "سجل الاعتمادات مع طرق الدفع القديمة والجديدة" : "Approved changes with old and new payment attribution"}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
                    <Input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); resetPage(); }} />
                    <Input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); resetPage(); }} />
                    <Input
                        value={user}
                        onChange={(event) => { setUser(event.target.value); resetPage(); }}
                        placeholder={isArabic ? "المستخدم الطالب" : "Requesting user"}
                    />
                    <Input
                        value={manager}
                        onChange={(event) => { setManager(event.target.value); resetPage(); }}
                        placeholder={isArabic ? "المدير المعتمد" : "Approving manager"}
                    />
                    <Select value={paymentMethodId} onValueChange={(value) => { setPaymentMethodId(value); resetPage(); }}>
                        <SelectTrigger><SelectValue placeholder={isArabic ? "طريقة الدفع" : "Payment method"} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{isArabic ? "كل طرق الدفع" : "All payment methods"}</SelectItem>
                            {paymentMethods.map((method) => (
                                <SelectItem key={method.id} value={method.id}>
                                    {getPaymentMethodName(method, locale)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={orderType} onValueChange={(value) => { setOrderType(value); resetPage(); }}>
                        <SelectTrigger><SelectValue placeholder={isArabic ? "نوع الطلب" : "Order type"} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{isArabic ? "كل أنواع الطلبات" : "All order types"}</SelectItem>
                            <SelectItem value="DineIn">{isArabic ? "داخل المتجر" : "In-Store"}</SelectItem>
                            <SelectItem value="Takeaway">{isArabic ? "سفري" : "Takeaway"}</SelectItem>
                            <SelectItem value="Delivery">{isArabic ? "توصيل" : "Delivery"}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {error ? (
                    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
                ) : loading ? (
                    <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {isArabic ? "جاري التحميل..." : "Loading..."}
                    </div>
                ) : result.items.length === 0 ? (
                    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                        {isArabic ? "لا توجد تعديلات مطابقة" : "No matching adjustments"}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{isArabic ? "الطلب" : "Order"}</TableHead>
                                    <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                                    <TableHead>{isArabic ? "الطريقة القديمة" : "Old Method"}</TableHead>
                                    <TableHead>{isArabic ? "الطريقة الجديدة" : "New Method"}</TableHead>
                                    <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                                    <TableHead>{isArabic ? "طلب بواسطة" : "Requested By"}</TableHead>
                                    <TableHead>{isArabic ? "اعتمد بواسطة" : "Approved By"}</TableHead>
                                    <TableHead>{isArabic ? "السبب" : "Reason"}</TableHead>
                                    <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                                    <TableHead>{isArabic ? "الوقت" : "Time"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result.items.map((item, index) => (
                                    <TableRow key={`${item.adjustmentId}-${index}`}>
                                        <TableCell className="font-medium">{item.orderNumber}</TableCell>
                                        <TableCell>{localizeOrderType(item.orderType, isArabic)}</TableCell>
                                        <TableCell>{localizePaymentMethod(item.oldPaymentMethod, item.oldPaymentMethodAr, isArabic)}</TableCell>
                                        <TableCell>{localizePaymentMethod(item.newPaymentMethod, item.newPaymentMethodAr, isArabic)}</TableCell>
                                        <TableCell>{formatCurrency(item.amount, currency)}</TableCell>
                                        <TableCell>{item.requestedBy}</TableCell>
                                        <TableCell>{item.approvedBy}</TableCell>
                                        <TableCell className="min-w-48 whitespace-normal">{localizeReason(item.reason, isArabic)}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {formatRestaurantDate(item.approvedAt, timeZone, isArabic ? "ar-QA" : "en-US")}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {formatRestaurantTime(item.approvedAt, timeZone, isArabic ? "ar-QA" : "en-US")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <PaginationControls
                    pageNumber={page}
                    pageSize={pageSize}
                    totalCount={result.totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                    isLoading={loading}
                />
                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>{isArabic ? "إغلاق" : "Close"}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
