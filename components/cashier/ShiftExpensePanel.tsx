"use client"

import * as React from "react"
import { Ban, Plus, ReceiptText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useLocale } from "@/components/locale-provider"
import { getShiftExpenseCategories, shiftExpenseErrorMessage } from "@/lib/api-shift-expenses"
import { getActivePaymentMethods, getPaymentMethodName, isCashPaymentMethod, type PaymentMethodDto } from "@/lib/api-payment-methods"
import { useShiftExpenseStore } from "@/store/shiftExpenseStore"
import type { ExpenseCategory } from "@/lib/api-expense-categories"
import { toast } from "sonner"

// Sentinel for the "paid from the drawer" option. The backend treats an omitted
// paymentMethodId as cash, so this never reaches the wire as an id.
const CASH_OPTION = "cash"

function text(ar: boolean) {
    return {
        title: ar ? "مصاريف / فواتير الوردية" : "Shift Expenses / Invoices",
        add: ar ? "إضافة مصروف / فاتورة" : "Add Expense / Invoice",
        empty: ar ? "لا توجد مصاريف مسجلة في هذه الوردية" : "No expenses recorded in this shift",
        loading: ar ? "جارٍ التحميل..." : "Loading...",
        category: ar ? "التصنيف" : "Category",
        selectCategory: ar ? "اختر التصنيف" : "Select a category",
        amount: ar ? "المبلغ" : "Amount",
        paymentMethod: ar ? "طريقة الدفع" : "Payment Method",
        cash: ar ? "نقدي (من الدرج)" : "Cash (from drawer)",
        description: ar ? "الوصف" : "Description",
        reference: ar ? "رقم الفاتورة / المرجع (اختياري)" : "Invoice / Reference number (optional)",
        save: ar ? "حفظ" : "Save",
        saving: ar ? "جارٍ الحفظ..." : "Saving...",
        cancelBtn: ar ? "إلغاء" : "Cancel",
        voidBtn: ar ? "إلغاء المصروف" : "Void expense",
        voidTitle: ar ? "إلغاء المصروف" : "Void Expense",
        voidReason: ar ? "سبب الإلغاء" : "Cancellation reason",
        voidConfirm: ar ? "تأكيد الإلغاء" : "Confirm void",
        cancelled: ar ? "ملغى" : "Cancelled",
        cashTag: ar ? "نقدي" : "Cash",
        nonCashTag: ar ? "غير نقدي" : "Non-cash",
        totalExpenses: ar ? "إجمالي المصاريف" : "Total expenses",
        cashExpenses: ar ? "مصاريف نقدية" : "Cash expenses",
        nonCashExpenses: ar ? "مصاريف غير نقدية" : "Non-cash expenses",
        countLabel: ar ? "عدد المصاريف" : "Expense count",
        amountError: ar ? "أدخل مبلغاً أكبر من صفر" : "Enter an amount greater than zero",
        categoryError: ar ? "اختر تصنيفاً" : "Select a category",
        saved: ar ? "تم تسجيل المصروف" : "Expense recorded",
        voided: ar ? "تم إلغاء المصروف" : "Expense voided",
        saveFailed: ar ? "تعذر تسجيل المصروف" : "Could not record the expense",
        voidFailed: ar ? "تعذر إلغاء المصروف" : "Could not void the expense",
        loadFailed: ar ? "تعذر تحميل المصاريف" : "Could not load expenses",
        by: ar ? "بواسطة" : "by",
        noCategories: ar
            ? "لا توجد تصنيفات مصاريف. اطلب من المدير إضافتها من إعدادات تصنيفات المصاريف."
            : "No expense categories configured. Ask an administrator to add them under Expense Categories.",
    }
}

export function ShiftExpensePanel({
    shiftId,
    currency,
    onRecorded,
}: {
    shiftId: string
    currency: string
    /** Fired after any change so the parent can refresh the drawer numbers. */
    onRecorded: () => void
}) {
    const { locale } = useLocale()
    const ar = locale === "ar"
    const t = text(ar)

    const expenses = useShiftExpenseStore((s) => s.expenses)
    const summary = useShiftExpenseStore((s) => s.summary)
    const isLoading = useShiftExpenseStore((s) => s.isLoading)
    const loadError = useShiftExpenseStore((s) => s.error)
    const loadedShiftId = useShiftExpenseStore((s) => s.shiftId)
    const load = useShiftExpenseStore((s) => s.load)
    const createExpense = useShiftExpenseStore((s) => s.create)
    const cancelExpense = useShiftExpenseStore((s) => s.cancel)
    const resetExpenses = useShiftExpenseStore((s) => s.reset)

    const [categories, setCategories] = React.useState<ExpenseCategory[]>([])
    const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethodDto[]>([])
    const [formOpen, setFormOpen] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [categoryId, setCategoryId] = React.useState("")
    const [amount, setAmount] = React.useState("")
    const [methodOption, setMethodOption] = React.useState(CASH_OPTION)
    const [description, setDescription] = React.useState("")
    const [reference, setReference] = React.useState("")
    const [voidTarget, setVoidTarget] = React.useState<string | null>(null)
    const [voidReason, setVoidReason] = React.useState("")
    const [voiding, setVoiding] = React.useState(false)

    React.useEffect(() => {
        void load(shiftId)
        return () => resetExpenses()
    }, [load, resetExpenses, shiftId])

    React.useEffect(() => {
        // Reference data is only needed once the cashier opens the form.
        if (!formOpen || categories.length > 0) return
        void getShiftExpenseCategories().then(setCategories).catch(() => setCategories([]))
        void getActivePaymentMethods()
            // A cash method already exists as the built-in default option.
            .then((methods) => setPaymentMethods(methods.filter((m) => !isCashPaymentMethod(m))))
            .catch(() => setPaymentMethods([]))
    }, [formOpen, categories.length])

    function resetForm() {
        setCategoryId("")
        setAmount("")
        setMethodOption(CASH_OPTION)
        setDescription("")
        setReference("")
    }

    async function handleSave() {
        const parsedAmount = parseFloat(amount)
        if (!categoryId) {
            toast.error(t.categoryError)
            return
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            toast.error(t.amountError)
            return
        }

        setSaving(true)
        try {
            await createExpense(shiftId, {
                expenseCategoryId: categoryId,
                amount: parsedAmount,
                paymentMethodId: methodOption === CASH_OPTION ? null : methodOption,
                description: description.trim() || null,
                referenceNumber: reference.trim() || null,
            })
            resetForm()
            setFormOpen(false)
            toast.success(t.saved)
            onRecorded()
        } catch (err) {
            toast.error(shiftExpenseErrorMessage(err, t.saveFailed))
        } finally {
            setSaving(false)
        }
    }

    async function handleVoid() {
        if (!voidTarget) return
        setVoiding(true)
        try {
            await cancelExpense(shiftId, voidTarget, voidReason.trim() || null)
            setVoidTarget(null)
            setVoidReason("")
            toast.success(t.voided)
            onRecorded()
        } catch (err) {
            toast.error(shiftExpenseErrorMessage(err, t.voidFailed))
        } finally {
            setVoiding(false)
        }
    }

    const showLoading = isLoading && loadedShiftId !== shiftId

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <ReceiptText className="h-4 w-4" />
                    {t.title}
                </p>
                <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4" />
                    {t.add}
                </Button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <SummaryCell label={t.countLabel} value={String(summary.expenseCount)} />
                <SummaryCell label={t.totalExpenses} value={formatAmount(summary.expensesTotal, currency)} />
                <SummaryCell label={t.cashExpenses} value={formatAmount(summary.cashExpensesTotal, currency)} emphasis />
                <SummaryCell label={t.nonCashExpenses} value={formatAmount(summary.nonCashExpensesTotal, currency)} />
            </div>

            {summary.byCategory.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {summary.byCategory.map((row) => (
                        <Badge key={`${row.expenseCategoryId ?? row.categoryLabel}`} variant="outline" className="font-normal">
                            {row.categoryLabel} · {formatAmount(row.total, currency)} ({row.count})
                        </Badge>
                    ))}
                </div>
            )}

            {showLoading ? (
                <div className="text-sm text-slate-500">{t.loading}</div>
            ) : loadError ? (
                <div className="text-sm text-rose-600">{t.loadFailed}</div>
            ) : expenses.length === 0 ? (
                <div className="text-sm text-slate-500">{t.empty}</div>
            ) : (
                <div className="space-y-2">
                    {expenses.map((expense) => (
                        <div
                            key={expense.id}
                            className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                                expense.isCancelled ? "bg-slate-100 opacity-70" : "bg-slate-50"
                            }`}
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-slate-800">{expense.categoryLabel}</span>
                                    <Badge variant="outline" className="font-normal">
                                        {expense.isCash ? t.cashTag : (expense.paymentMethodName || t.nonCashTag)}
                                    </Badge>
                                    {expense.isCancelled && (
                                        <Badge className="border border-rose-200 bg-rose-50 font-normal text-rose-700">
                                            {t.cancelled}
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-0.5 truncate text-xs text-slate-500">
                                    {expense.referenceNumber}
                                    {expense.description ? ` · ${expense.description}` : ""}
                                    {expense.createdByName ? ` · ${t.by} ${expense.createdByName}` : ""}
                                </div>
                                {expense.isCancelled && expense.cancelledByName && (
                                    <div className="mt-0.5 truncate text-xs text-rose-600">
                                        {t.cancelled} · {expense.cancelledByName}
                                        {expense.cancellationReason ? ` · ${expense.cancellationReason}` : ""}
                                    </div>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <span
                                    className={`font-mono font-semibold ${
                                        expense.isCancelled ? "text-slate-400 line-through" : "text-slate-900"
                                    }`}
                                >
                                    {formatAmount(expense.amount, currency)}
                                </span>
                                {!expense.isCancelled && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-rose-600 hover:text-rose-700"
                                        title={t.voidBtn}
                                        onClick={() => setVoidTarget(expense.id)}
                                    >
                                        <Ban className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open)
                    if (!open) resetForm()
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.add}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label>{t.category}</Label>
                            {categories.length === 0 ? (
                                <p className="text-sm text-amber-700">{t.noCategories}</p>
                            ) : (
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t.selectCategory} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t.amount} ({currency})</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t.paymentMethod}</Label>
                            <Select value={methodOption} onValueChange={setMethodOption}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={CASH_OPTION}>{t.cash}</SelectItem>
                                    {paymentMethods.map((method) => (
                                        <SelectItem key={method.id} value={method.id}>
                                            {getPaymentMethodName(method, locale)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t.description}</Label>
                            <Textarea
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={2000}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t.reference}</Label>
                            <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={64} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                            {t.cancelBtn}
                        </Button>
                        <Button onClick={handleSave} disabled={saving || categories.length === 0}>
                            {saving ? t.saving : t.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!voidTarget}
                onOpenChange={(open) => {
                    if (!open) {
                        setVoidTarget(null)
                        setVoidReason("")
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-rose-600">{t.voidTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1.5">
                        <Label>{t.voidReason}</Label>
                        <Textarea
                            rows={3}
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            maxLength={500}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setVoidTarget(null)} disabled={voiding}>
                            {t.cancelBtn}
                        </Button>
                        <Button variant="destructive" onClick={handleVoid} disabled={voiding}>
                            {t.voidConfirm}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function SummaryCell({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
            <div className={`mt-1 font-mono text-sm ${emphasis ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                {value}
            </div>
        </div>
    )
}

function formatAmount(value: number | null | undefined, currency: string) {
    if (value == null) return "—"
    return `${value.toFixed(3)} ${currency}`
}
