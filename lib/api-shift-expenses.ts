import { api } from "@/lib/api";
import type { ExpenseCategory } from "@/lib/api-expense-categories";
import type { CreateShiftExpensePayload, ShiftExpense, ShiftExpenseList } from "@/types/shift-expense";

const ROOT = "/shift-expenses";

/**
 * Pulls the operator-facing message out of the backend's error envelope
 * (`{ error: "..." }` from ExceptionMiddleware). `api.post` only knows about
 * `message`, so without this the cashier sees raw JSON.
 */
export function shiftExpenseErrorMessage(error: unknown, fallback: string): string {
    const data = (error as { response?: { data?: { error?: unknown } } })?.response?.data;
    if (data && typeof data.error === "string" && data.error.trim()) return data.error;
    return fallback;
}

export async function getShiftExpenseCategories(): Promise<ExpenseCategory[]> {
    const res = await api.get<ExpenseCategory[]>(`${ROOT}/categories`);
    return res.data ?? [];
}

export async function getShiftExpenses(shiftId: string): Promise<ShiftExpenseList> {
    const res = await api.get<ShiftExpenseList>(`${ROOT}/shift/${shiftId}`);
    return res.data;
}

export async function createShiftExpense(payload: CreateShiftExpensePayload): Promise<ShiftExpense> {
    const res = await api.post<ShiftExpense>(ROOT, payload);
    return res.data;
}

export async function cancelShiftExpense(expenseId: string, reason: string | null): Promise<ShiftExpense> {
    const res = await api.post<ShiftExpense>(`${ROOT}/${expenseId}/cancel`, { reason });
    return res.data;
}
