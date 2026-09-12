import { api } from "@/lib/api";

export interface ExpenseCategory {
    id: string;
    name: string;
    nameAr?: string | null;
    displayName: string;
    color?: string | null;
    isActive: boolean;
    sortOrder: number;
    invoiceCount: number;
}

export interface ExpenseCategoryPayload {
    name: string;
    nameAr?: string | null;
    color?: string | null;
    isActive: boolean;
    sortOrder: number;
}

const ROOT = "/expense-categories";

export const expenseCategoriesApi = {
    list: async (activeOnly = false): Promise<ExpenseCategory[]> => {
        const res = await api.get<ExpenseCategory[]>(ROOT, { params: { activeOnly } });
        return res.data || [];
    },
    create: async (payload: ExpenseCategoryPayload): Promise<ExpenseCategory> => {
        const res = await api.post<ExpenseCategory>(ROOT, payload);
        return res.data;
    },
    update: async (id: string, payload: ExpenseCategoryPayload): Promise<ExpenseCategory> => {
        const res = await api.put<ExpenseCategory>(`${ROOT}/${id}`, payload);
        return res.data;
    },
    remove: async (id: string): Promise<void> => {
        await api.delete(`${ROOT}/${id}`);
    },
};
