export interface ShiftExpense {
  id: string;
  cashierShiftId: string | null;
  branchId: string;
  expenseCategoryId: string | null;
  categoryLabel: string | null;
  amount: number;
  currencyCode: string;
  description: string | null;
  referenceNumber: string;
  paymentMethod: string;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  /** True when the expense reduced the physical drawer cash. */
  isCash: boolean;
  expenseDate: string;
  status: string;
  isCancelled: boolean;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  cancelledAt: string | null;
  cancelledByName: string | null;
  cancellationReason: string | null;
}

export interface ShiftExpenseCategoryBreakdown {
  expenseCategoryId: string | null;
  categoryLabel: string;
  count: number;
  total: number;
  cashTotal: number;
}

export interface ShiftExpenseSummary {
  expenseCount: number;
  expensesTotal: number;
  cashExpensesTotal: number;
  nonCashExpensesTotal: number;
  byCategory: ShiftExpenseCategoryBreakdown[];
}

export interface ShiftExpenseList {
  shiftId: string;
  summary: ShiftExpenseSummary;
  expenses: ShiftExpense[];
}

export interface CreateShiftExpensePayload {
  expenseCategoryId: string;
  amount: number;
  /** Omit for cash — matches the backend convention that no method means cash. */
  paymentMethodId?: string | null;
  description?: string | null;
  referenceNumber?: string | null;
}

export const EMPTY_SHIFT_EXPENSE_SUMMARY: ShiftExpenseSummary = {
  expenseCount: 0,
  expensesTotal: 0,
  cashExpensesTotal: 0,
  nonCashExpensesTotal: 0,
  byCategory: [],
};
