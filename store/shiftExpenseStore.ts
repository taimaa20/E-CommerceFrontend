import { create } from "zustand";
import {
    cancelShiftExpense,
    createShiftExpense,
    getShiftExpenses,
} from "@/lib/api-shift-expenses";
import {
    EMPTY_SHIFT_EXPENSE_SUMMARY,
    type CreateShiftExpensePayload,
    type ShiftExpense,
    type ShiftExpenseSummary,
} from "@/types/shift-expense";

/**
 * Expenses recorded against the cashier's current shift.
 *
 * Ephemeral by design — nothing is persisted. A cash expense changes the
 * drawer's expected balance, and that number is owned by the server, so the
 * store never projects it locally: every mutation refetches this slice and the
 * caller refreshes the shift itself.
 */
interface ShiftExpenseState {
    shiftId: string | null;
    expenses: ShiftExpense[];
    summary: ShiftExpenseSummary;
    isLoading: boolean;
    error: string | null;
    load: (shiftId: string) => Promise<void>;
    create: (shiftId: string, payload: CreateShiftExpensePayload) => Promise<void>;
    cancel: (shiftId: string, expenseId: string, reason: string | null) => Promise<void>;
    reset: () => void;
}

const initialState = {
    shiftId: null,
    expenses: [] as ShiftExpense[],
    summary: EMPTY_SHIFT_EXPENSE_SUMMARY,
    isLoading: false,
    error: null as string | null,
};

export const useShiftExpenseStore = create<ShiftExpenseState>()((set, get) => ({
    ...initialState,

    load: async (shiftId: string) => {
        if (!shiftId) return;
        set({ isLoading: true, error: null });
        try {
            const result = await getShiftExpenses(shiftId);
            set({
                shiftId,
                expenses: result.expenses ?? [],
                summary: result.summary ?? EMPTY_SHIFT_EXPENSE_SUMMARY,
                isLoading: false,
            });
        } catch (err) {
            set({
                isLoading: false,
                error: err instanceof Error ? err.message : "Failed to load shift expenses",
            });
        }
    },

    create: async (shiftId, payload) => {
        await createShiftExpense(payload);
        await get().load(shiftId);
    },

    cancel: async (shiftId, expenseId, reason) => {
        await cancelShiftExpense(expenseId, reason);
        await get().load(shiftId);
    },

    reset: () => set({ ...initialState }),
}));
