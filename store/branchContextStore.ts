import { create } from "zustand";
import { getBranchContext, switchBranch, type BranchContextDto } from "@/lib/api-branch-context";
import { clearSelectedBranchId, readSelectedBranchId, writeSelectedBranchId } from "@/lib/branch-selection";
import { usePosStore } from "@/store/posStore";

interface BranchContextState {
    context: BranchContextDto | null;
    loading: boolean;
    error: string | null;
    /**
     * Increments only when the active branch actually changes (explicit switch, or a
     * context load that resolves to a different branch than the persisted selection).
     * Branch-scoped pages put this in their fetch-effect deps to refetch on switch
     * without firing a duplicate request at mount.
     */
    branchVersion: number;
    loadContext: () => Promise<void>;
    switchBranch: (branchId: string) => Promise<BranchContextDto>;
    resetBranchContext: () => void;
}

export const useBranchContextStore = create<BranchContextState>()((set) => ({
    context: null,
    loading: false,
    error: null,
    branchVersion: 0,
    loadContext: async () => {
        set({ loading: true, error: null });
        try {
            const previousBranchId = readSelectedBranchId();
            const context = await loadBranchContextWithRetry();
            writeSelectedBranchId(context.currentBranch.id);
            set((state) => ({
                context,
                loading: false,
                branchVersion: previousBranchId && previousBranchId !== context.currentBranch.id
                    ? state.branchVersion + 1
                    : state.branchVersion,
            }));
        } catch (error) {
            set({ error: getErrorMessage(error), loading: false, context: null });
        }
    },
    switchBranch: async (branchId: string) => {
        set({ loading: true, error: null });
        try {
            const context = await switchBranch(branchId);
            writeSelectedBranchId(context.currentBranch.id);
            usePosStore.getState().resetForBranchSwitch();
            set((state) => ({ context, loading: false, branchVersion: state.branchVersion + 1 }));
            return context;
        } catch (error) {
            const message = getErrorMessage(error);
            set({ error: message, loading: false });
            throw error;
        }
    },
    resetBranchContext: () => {
        clearSelectedBranchId();
        usePosStore.getState().resetForBranchSwitch();
        set({ context: null, loading: false, error: null });
    },
}));

/** Dependency for fetch effects on branch-scoped pages: changes only on a real branch switch. */
export function useActiveBranchVersion(): number {
    return useBranchContextStore((state) => state.branchVersion);
}

async function loadBranchContextWithRetry(): Promise<BranchContextDto> {
    try {
        return await getBranchContext();
    } catch (error) {
        if (!readSelectedBranchId()) throw error;
        clearSelectedBranchId();
        return await getBranchContext();
    }
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error && error.message.trim()
        ? error.message
        : "Could not resolve branch context.";
}
