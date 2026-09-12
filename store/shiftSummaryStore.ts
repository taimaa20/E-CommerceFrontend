import { create } from "zustand";
import { getCurrentShiftSummary, type ShiftSummaryDto } from "@/lib/api-shift-summary";

interface ShiftSummaryState {
    summary: ShiftSummaryDto | null;
    isLoading: boolean;
    error: string | null;
    lastFetchedAt: number | null;
    fetch: () => Promise<void>;
    reset: () => void;
}

export const useShiftSummaryStore = create<ShiftSummaryState>()((set) => ({
    summary: null,
    isLoading: false,
    error: null,
    lastFetchedAt: null,

    fetch: async () => {
        set({ isLoading: true, error: null });
        try {
            const summary = await getCurrentShiftSummary();
            set({ summary, lastFetchedAt: Date.now() });
        } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            // Differentiate "no open shift" (404) from real errors so the page
            // can render a "no active shift" state instead of an error.
            set({ error: detail });
        } finally {
            set({ isLoading: false });
        }
    },

    reset: () => set({ summary: null, isLoading: false, error: null, lastFetchedAt: null }),
}));
