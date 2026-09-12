import { create } from "zustand";
import {
    ActiveShiftRule,
    getShiftRulesConfig,
    updateShiftRulesConfig,
    type ShiftRulesConfigDto,
} from "@/lib/api-shift-rules";

const DEFAULT_CONFIG: ShiftRulesConfigDto = {
    activeShiftRule: ActiveShiftRule.Unlimited,
    requireAllOrdersPaid: false,
    requireAllOrdersReady: false,
    requireAllOrdersServed: false,
    requireAllOrdersCompleted: false,
    allowPendingOrders: true,
    allowPreparingOrders: true,
    allowReadyOrders: true,
    allowPendingDeliveryOrders: true,
    allowPendingCancellationRequests: true,
    allowForcedShiftClose: false,
    allowShiftCloseWithOpenOrders: false,
};

interface ShiftRulesState {
    config: ShiftRulesConfigDto;
    isLoaded: boolean;
    isLoading: boolean;
    isSaving: boolean;
    fetch: () => Promise<void>;
    save: (next: ShiftRulesConfigDto) => Promise<ShiftRulesConfigDto>;
}

export const useShiftRulesStore = create<ShiftRulesState>()((set) => ({
    config: DEFAULT_CONFIG,
    isLoaded: false,
    isLoading: false,
    isSaving: false,

    fetch: async () => {
        set({ isLoading: true });
        try {
            const config = await getShiftRulesConfig();
            set({ config, isLoaded: true });
        } catch {
            // Render defaults silently — admin can save to create the row.
            set({ isLoaded: true });
        } finally {
            set({ isLoading: false });
        }
    },

    save: async (next) => {
        set({ isSaving: true });
        try {
            const saved = await updateShiftRulesConfig(next);
            set({ config: saved });
            return saved;
        } finally {
            set({ isSaving: false });
        }
    },
}));
