import type { ExpenseInvoicePayload } from "@/lib/api-expense-invoices";

// Shared validator used by both the New Invoice dialog (list page) and the
// Edit Invoice form (details page). Mirrors the backend's ValidateAmounts +
// DataAnnotations limits so the user never round-trips a payload the server
// will reject.

export const INVOICE_PHONE_RE = /^\+?[0-9 \-()]{6,20}$/;
export const INVOICE_MAX_NOTES = 2000;
export const INVOICE_MAX_NUMBER = 64;
export const INVOICE_MAX_TAX_NUMBER = 64;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export type InvoiceFieldErrors = Partial<Record<
    | "invoiceNumber" | "invoiceDate" | "dueDate"
    | "subtotal" | "taxAmount" | "discountAmount" | "totalAmount"
    | "currencyCode" | "supplierPhone" | "supplierTaxNumber" | "notes",
    string
>>;

// `t` is the local i18n resolver — the keys it must understand are listed
// below (mirrored in both consumer pages).
export type InvoiceValidationKeys =
    | "vRequired" | "vNonNegative" | "vTotalMismatch" | "vDueBefore"
    | "vInvoiceFuture" | "vCurrency" | "vTaxNumber" | "vPhone"
    | "vNotesTooLong" | "vInvoiceTooLong";

export function validateInvoicePayload(
    p: ExpenseInvoicePayload,
    t: (k: InvoiceValidationKeys) => string
): InvoiceFieldErrors {
    const errs: InvoiceFieldErrors = {};

    if (!p.invoiceNumber || !p.invoiceNumber.trim()) errs.invoiceNumber = t("vRequired");
    else if (p.invoiceNumber.length > INVOICE_MAX_NUMBER) errs.invoiceNumber = t("vInvoiceTooLong");

    if (!p.invoiceDate) {
        errs.invoiceDate = t("vRequired");
    } else {
        const inv = new Date(p.invoiceDate).getTime();
        if (Number.isNaN(inv)) errs.invoiceDate = t("vRequired");
        else if (inv - Date.now() > ONE_YEAR_MS) errs.invoiceDate = t("vInvoiceFuture");
    }

    if (p.dueDate && p.invoiceDate) {
        const due = new Date(p.dueDate).getTime();
        const inv = new Date(p.invoiceDate).getTime();
        if (!Number.isNaN(due) && !Number.isNaN(inv) && due < inv) {
            errs.dueDate = t("vDueBefore");
        }
    }

    const num = (v: any) => Number.isFinite(Number(v));
    if (!num(p.subtotal) || p.subtotal < 0) errs.subtotal = t("vNonNegative");
    if (!num(p.taxAmount) || p.taxAmount < 0) errs.taxAmount = t("vNonNegative");
    if (!num(p.discountAmount) || p.discountAmount < 0) errs.discountAmount = t("vNonNegative");
    if (!num(p.totalAmount) || p.totalAmount < 0) errs.totalAmount = t("vNonNegative");
    else {
        const computed = (p.subtotal || 0) + (p.taxAmount || 0) - (p.discountAmount || 0);
        if (Math.abs(computed - p.totalAmount) > 0.011) errs.totalAmount = t("vTotalMismatch");
    }

    if (!p.currencyCode || p.currencyCode.length !== 3) errs.currencyCode = t("vCurrency");

    if (p.supplierPhone && !INVOICE_PHONE_RE.test(p.supplierPhone.trim())) errs.supplierPhone = t("vPhone");
    if (p.supplierTaxNumber && p.supplierTaxNumber.length > INVOICE_MAX_TAX_NUMBER) errs.supplierTaxNumber = t("vTaxNumber");
    if (p.notes && p.notes.length > INVOICE_MAX_NOTES) errs.notes = t("vNotesTooLong");

    return errs;
}
