import { create } from "zustand";
import {
    expenseInvoicesApi,
    ExpenseInvoiceDetails,
    ExpenseInvoiceListItem,
    ExpenseInvoiceQuery,
    ExpenseInvoiceStatistics,
} from "@/lib/api-expense-invoices";

// Ephemeral store — no persist middleware. The list and details views are
// fully server-driven, so the only client state worth keeping is the in-
// flight query + the last result page.
interface ExpenseInvoicesState {
    items: ExpenseInvoiceListItem[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    loading: boolean;
    error: string | null;

    statistics: ExpenseInvoiceStatistics | null;
    statisticsLoading: boolean;

    query: ExpenseInvoiceQuery;

    setQuery: (patch: Partial<ExpenseInvoiceQuery>) => void;
    resetQuery: () => void;
    fetchList: () => Promise<void>;
    fetchStatistics: () => Promise<void>;
}

const DEFAULT_QUERY: ExpenseInvoiceQuery = {
    page: 1,
    pageSize: 25,
};

export const useExpenseInvoicesStore = create<ExpenseInvoicesState>()((set, get) => ({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 25,
    loading: false,
    error: null,

    statistics: null,
    statisticsLoading: false,

    query: { ...DEFAULT_QUERY },

    setQuery: (patch) => {
        set((s) => ({
            // When the user changes any filter, snap back to page 1 unless
            // the patch itself controls the page.
            query: { ...s.query, ...patch, page: patch.page ?? 1 },
        }));
    },

    resetQuery: () => set({ query: { ...DEFAULT_QUERY } }),

    fetchList: async () => {
        set({ loading: true, error: null });
        try {
            const res = await expenseInvoicesApi.list(get().query);
            set({
                items: res.items,
                totalCount: res.totalCount,
                pageNumber: res.pageNumber,
                pageSize: res.pageSize,
                loading: false,
            });
        } catch (err: any) {
            set({
                loading: false,
                error: err?.message || "Failed to load expense invoices",
            });
        }
    },

    fetchStatistics: async () => {
        set({ statisticsLoading: true });
        try {
            const stats = await expenseInvoicesApi.statistics({ branchId: get().query.branchId });
            set({ statistics: stats, statisticsLoading: false });
        } catch {
            set({ statisticsLoading: false });
        }
    },
}));

// One-off details cache — keeps the details page snappy when toggling
// between edit and read modes. Not persisted.
interface ExpenseInvoiceDetailsState {
    current: ExpenseInvoiceDetails | null;
    loading: boolean;
    error: string | null;
    load: (id: string) => Promise<void>;
    set: (value: ExpenseInvoiceDetails | null) => void;
    clear: () => void;
}

export const useExpenseInvoiceDetailsStore = create<ExpenseInvoiceDetailsState>()((s) => ({
    current: null,
    loading: false,
    error: null,
    load: async (id: string) => {
        s({ loading: true, error: null });
        try {
            const data = await expenseInvoicesApi.details(id);
            s({ current: data, loading: false });
        } catch (err: any) {
            s({ loading: false, error: err?.message || "Failed to load invoice" });
        }
    },
    set: (value) => s({ current: value }),
    clear: () => s({ current: null, error: null }),
}));
