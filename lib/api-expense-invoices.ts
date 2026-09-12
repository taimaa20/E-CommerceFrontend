import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { config } from "@/lib/config";

// ───────────────────────────── TYPES ───────────────────────────────────────

export type ExpenseInvoiceStatus =
    | "Draft"
    | "Unpaid"
    | "PartiallyPaid"
    | "Paid"
    | "Cancelled";

export type ExpensePaymentMethod =
    | "Unspecified"
    | "Cash"
    | "Card"
    | "BankTransfer"
    | "Cheque"
    | "Other";

export type DuplicateInvoiceBehavior = "WarningOnly" | "BlockSave" | "Disabled";

export interface ExpenseInvoiceDuplicateWarning {
    code: "duplicateInvoice";
    canOverride: boolean;
    behavior: DuplicateInvoiceBehavior;
    invoiceNumber: string;
    supplierName?: string | null;
    invoiceDate: string;
}

export interface ExpenseInvoiceListItem {
    id: string;
    invoiceNumber: string;
    supplierName?: string | null;
    categoryLabel?: string | null;
    expenseCategoryId?: string | null;
    invoiceDate: string;
    dueDate?: string | null;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    currencyCode: string;
    status: ExpenseInvoiceStatus;
    paymentMethod: ExpensePaymentMethod;
    attachmentsCount: number;
    primaryAttachmentUrl?: string | null;
    createdByName?: string | null;
    createdAt: string;
    purchaseOrderId?: string | null;
    purchaseOrderNumber?: string | null;
}

export interface ExpenseInvoiceAttachment {
    id: string;
    expenseInvoiceId: string;
    originalFileName: string;
    fileExtension: string;
    fileSize: number;
    mimeType: string;
    url: string;
    downloadUrl: string;
    uploadedAt: string;
    uploadedByName?: string | null;
    isPrimary: boolean;
}

export interface ExpenseInvoiceDetails {
    id: string;
    invoiceNumber: string;
    supplierName?: string | null;
    supplierPhone?: string | null;
    supplierTaxNumber?: string | null;
    supplierId?: string | null;
    expenseCategoryId?: string | null;
    categoryLabel?: string | null;
    invoiceDate: string;
    dueDate?: string | null;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    purchaseOrderId?: string | null;
    purchaseOrderNumber?: string | null;
    currencyCode: string;
    paymentMethod: ExpensePaymentMethod;
    paymentMethodDetail?: string | null;
    notes?: string | null;
    status: ExpenseInvoiceStatus;
    branchId?: string | null;
    createdById?: string | null;
    createdByName?: string | null;
    createdAt: string;
    updatedAt: string;
    attachments: ExpenseInvoiceAttachment[];
}

export interface ExpenseInvoicePayload {
    invoiceNumber: string;
    supplierName?: string | null;
    supplierPhone?: string | null;
    supplierTaxNumber?: string | null;
    supplierId?: string | null;
    expenseCategoryId?: string | null;
    categoryLabel?: string | null;
    invoiceDate: string;
    dueDate?: string | null;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount?: number | null;
    purchaseOrderId?: string | null;
    currencyCode: string;
    paymentMethod: ExpensePaymentMethod;
    paymentMethodDetail?: string | null;
    notes?: string | null;
    status: ExpenseInvoiceStatus;
    branchId?: string | null;
    acknowledgeDuplicateWarning?: boolean;
}

export interface ExpenseInvoiceQuery {
    page?: number;
    pageSize?: number;
    invoiceNumber?: string;
    supplier?: string;
    supplierId?: string;
    expenseCategoryId?: string;
    status?: ExpenseInvoiceStatus | "";
    paymentMethod?: ExpensePaymentMethod | "";
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface ExpenseInvoiceStatistics {
    totalCount: number;
    unpaidCount: number;
    overdueCount: number;
    totalAmount: number;
    unpaidAmount: number;
    thisMonthAmount: number;
    currencyCode: string;
}

// ───────────────────────────── ENDPOINTS ───────────────────────────────────
//
// Every call goes through the existing `api` wrapper so it inherits auth,
// language headers, error handling, and (in production) the BFF proxy.

const ROOT = "/expense-invoices";

export function getDuplicateInvoiceWarning(error: unknown): ExpenseInvoiceDuplicateWarning | null {
    if (typeof error !== "object" || error === null) return null;
    const response = (error as {
        response?: { status?: number; data?: { duplicateInvoice?: unknown } };
    }).response;
    if (response?.status !== 409) return null;

    const warning = response.data?.duplicateInvoice;
    if (typeof warning !== "object" || warning === null) return null;
    const candidate = warning as Partial<ExpenseInvoiceDuplicateWarning>;
    return candidate.code === "duplicateInvoice"
        && typeof candidate.canOverride === "boolean"
        && typeof candidate.invoiceNumber === "string"
        && typeof candidate.invoiceDate === "string"
        ? candidate as ExpenseInvoiceDuplicateWarning
        : null;
}

export function getExpenseInvoiceErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === "object" && error !== null) {
        const responseError = (error as {
            response?: { data?: { error?: unknown } };
        }).response?.data?.error;
        if (typeof responseError === "string" && responseError.trim())
            return responseError;
    }

    return error instanceof Error && error.message.trim()
        ? error.message
        : fallback;
}

export const expenseInvoicesApi = {
    list: async (query: ExpenseInvoiceQuery): Promise<PaginatedResponse<ExpenseInvoiceListItem>> => {
        const params: Record<string, string | number> = {};
        Object.entries(query ?? {}).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") params[k] = v as string | number;
        });
        const res = await api.get<PaginatedResponse<ExpenseInvoiceListItem>>(ROOT, { params });
        return res.data;
    },

    details: async (id: string): Promise<ExpenseInvoiceDetails> => {
        const res = await api.get<ExpenseInvoiceDetails>(`${ROOT}/${id}`);
        return res.data;
    },

    statistics: async (query: Pick<ExpenseInvoiceQuery, "branchId"> = {}): Promise<ExpenseInvoiceStatistics> => {
        const params = query.branchId ? { branchId: query.branchId } : undefined;
        const res = await api.get<ExpenseInvoiceStatistics>(`${ROOT}/statistics`, { params });
        return res.data;
    },

    create: async (payload: ExpenseInvoicePayload): Promise<ExpenseInvoiceDetails> => {
        const res = await api.post<ExpenseInvoiceDetails>(ROOT, payload);
        return res.data;
    },

    update: async (id: string, payload: ExpenseInvoicePayload): Promise<ExpenseInvoiceDetails> => {
        const res = await api.put<ExpenseInvoiceDetails>(`${ROOT}/${id}`, payload);
        return res.data;
    },

    updatePayment: async (
        id: string,
        payload: {
            paidAmount: number;
            paymentMethod?: ExpensePaymentMethod;
            paymentMethodDetail?: string | null;
        },
    ): Promise<ExpenseInvoiceDetails> => {
        const res = await api.put<ExpenseInvoiceDetails>(`${ROOT}/${id}/payment`, payload);
        return res.data;
    },

    remove: async (id: string): Promise<void> => {
        await api.delete(`${ROOT}/${id}`);
    },

    uploadAttachment: async (id: string, file: File): Promise<ExpenseInvoiceAttachment> => {
        const form = new FormData();
        form.append("file", file);
        // Use the multipart code path of api.post (it strips JSON content-type when FormData is sent).
        const res = await api.post<ExpenseInvoiceAttachment>(
            `${ROOT}/${id}/attachments`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } }
        );
        return res.data;
    },

    deleteAttachment: async (invoiceId: string, attachmentId: string): Promise<void> => {
        await api.delete(`${ROOT}/${invoiceId}/attachments/${attachmentId}`);
    },

    // Streams the attachment through the BFF proxy with the user's JWT, then
    // triggers a browser download. The DownloadUrl returned by the backend is
    // a relative `/api/...` path which the browser would otherwise resolve
    // against the frontend origin → 404. Going through `api.get` would also
    // fail because the wrapper JSON-parses every response body.
    downloadAttachment: async (
        invoiceId: string,
        attachmentId: string,
        fileName: string,
    ): Promise<void> => {
        const token = useAuthStore.getState().user?.token;
        const tenantId =
            useAuthStore.getState().user?.tenantId
            || (typeof window !== "undefined" ? localStorage.getItem("tenantId") : null)
            || config.tenantId;

        const response = await fetch(
            `/api/api-proxy/expense-invoices/${invoiceId}/attachments/${attachmentId}/download`,
            {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
                },
            },
        );
        if (!response.ok) throw new Error(await response.text());

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
    },
};
