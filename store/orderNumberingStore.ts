import { create } from "zustand";
import {
    getOrderNumberingConfig,
    updateOrderNumberingConfig,
    OrderNumberResetStrategy,
    OrderNumberSequenceScope,
    type OrderNumberingConfigDto,
} from "@/lib/api-order-numbering";

const DEFAULT_CONFIG: OrderNumberingConfigDto = {
    resetStrategy: OrderNumberResetStrategy.Monthly,
    scope: OrderNumberSequenceScope.PerOrderType,
    prefix: null,
    includeDate: false,
    includeMonth: true,
    includeYear: true,
    includeShiftNumber: false,
    includeBranchCode: false,
    branchCode: null,
    previewExample: null,
};

interface OrderNumberingState {
    config: OrderNumberingConfigDto;
    isLoaded: boolean;
    isLoading: boolean;
    isSaving: boolean;
    fetch: () => Promise<void>;
    save: (next: OrderNumberingConfigDto) => Promise<OrderNumberingConfigDto>;
}

export const useOrderNumberingStore = create<OrderNumberingState>()((set) => ({
    config: DEFAULT_CONFIG,
    isLoaded: false,
    isLoading: false,
    isSaving: false,

    fetch: async () => {
        set({ isLoading: true });
        try {
            const config = await getOrderNumberingConfig();
            set({ config, isLoaded: true });
        } catch {
            // Mark loaded even on failure so the effect doesn't re-fire forever
            // (typical cause: migration not yet applied → 500). Defaults render.
            set({ isLoaded: true });
        } finally {
            set({ isLoading: false });
        }
    },

    save: async (next) => {
        set({ isSaving: true });
        try {
            const saved = await updateOrderNumberingConfig(next);
            set({ config: saved });
            return saved;
        } finally {
            set({ isSaving: false });
        }
    },
}));
