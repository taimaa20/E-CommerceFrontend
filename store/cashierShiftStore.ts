import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CashierBalanceShift } from "@/types/cashier-balance";
import { useAuthStore } from "@/store/authStore";
import { config } from "@/lib/config";
import { drainNow, enqueue, registerShiftReconciler } from "@/lib/offline/queue";
import { startConnectivity } from "@/lib/offline/connectivity";
import { closeCashierShift } from "@/lib/api";
import { generateActionId } from "@/lib/offline/id";
import { generateUUID } from "@/lib/uuid";

/**
 * Cashier shift store.
 *
 * Offline-first contract:
 *  - `activeShift` and `lastClosedShift` persist to localStorage so a refresh
 *    never strands a cashier mid-shift (online or offline).
 *  - Shift opening remains offline-first. Shift closing is server-confirmed so
 *    configured open-order rules cannot be bypassed by optimistic local state.
 *  - A synthetic shift created offline uses id `offline-<uuid>`. When the
 *    queued open-shift drains, the queue's reconciler hook swaps the synthetic
 *    id + fields for the server's canonical shift.
 *  - `hydrateActiveShift` is offline-tolerant: it keeps persisted state on
 *    fetch failure and still flips `loadedCashierId` so the widget doesn't
 *    show its loading placeholder forever.
 */

const SYNTHETIC_PREFIX = "offline-";
const TENANT_HEADER = "X-Tenant-ID";

function getTenantId(): string {
    const authTenantId = useAuthStore.getState().user?.tenantId;
    if (authTenantId) return authTenantId;
    if (typeof window !== "undefined") {
        return localStorage.getItem("tenantId") || config.tenantId;
    }
    return config.tenantId;
}

function newLocalId(): string {
    return `${SYNTHETIC_PREFIX}${generateUUID()}`;
}

function isSyntheticId(id: string | null | undefined): boolean {
    return !!id && id.startsWith(SYNTHETIC_PREFIX);
}

function buildSyntheticShift(input: {
    cashierId: string;
    cashierName: string;
    openingBalance: number;
    notes?: string | null;
}): CashierBalanceShift {
    const now = new Date().toISOString();
    return {
        id: newLocalId(),
        cashierId: input.cashierId,
        cashierName: input.cashierName,
        openedByManagerId: input.cashierId,
        openedAt: now,
        openingBalance: input.openingBalance,
        closedAt: null,
        closingBalance: null,
        variance: null,
        classification: null,
        notes: input.notes ?? null,
        closingComment: null,
        isClosed: false,
        paidOrderCount: 0,
    ordersTotal: 0,
    discountsTotal: 0,
        cashOrdersTotal: 0,
        cardOrdersTotal: 0,
        foodRevenue: 0,
        deliveryCollected: 0,
        deliveryCost: 0,
        deliveryProfit: 0,
        marketplaceFees: 0,
        marketplaceServiceFees: 0,
        netRestaurantRevenue: 0,
        expectedBalance: input.openingBalance,
    };
}

interface OpenShiftInput {
    openingBalance: number;
    notes?: string | null;
    cashierId: string;
    cashierName: string;
}

interface CloseShiftInput {
    closingBalance: number;
    notes?: string | null;
    /** When true, backend bypasses the close-validation gate (must also be allowed by ShiftRulesConfig). */
    force?: boolean;
    forceReason?: string | null;
}

interface CashierShiftState {
    activeShift: CashierBalanceShift | null;
    lastClosedShift: CashierBalanceShift | null;
    loadedCashierId: string | null;
    isHydrating: boolean;
    hydrateActiveShift: (cashierId: string) => Promise<CashierBalanceShift | null>;
    setActiveShift: (shift: CashierBalanceShift | null, cashierId?: string | null) => void;
    setLastClosedShift: (shift: CashierBalanceShift | null) => void;
    clearShift: () => void;
    openShiftOptimistic: (input: OpenShiftInput) => Promise<CashierBalanceShift>;
    closeShiftOptimistic: (input: CloseShiftInput) => Promise<CashierBalanceShift>;
}

export const useCashierShiftStore = create<CashierShiftState>()(
    persist(
        (set, get) => ({
            activeShift: null,
            lastClosedShift: null,
            loadedCashierId: null,
            isHydrating: false,

            hydrateActiveShift: async (cashierId: string) => {
                if (!cashierId) {
                    set({
                        activeShift: null,
                        loadedCashierId: null,
                        isHydrating: false,
                    });
                    return null;
                }

                if (get().isHydrating && get().loadedCashierId === cashierId) {
                    return get().activeShift;
                }

                // Safety: if a persisted shift belongs to a different cashier
                // (device handoff, login change), drop it before we even try.
                const persisted = get().activeShift;
                if (persisted && persisted.cashierId !== cashierId) {
                    set({ activeShift: null, lastClosedShift: null });
                }

                set({
                    isHydrating: true,
                    loadedCashierId: cashierId,
                });

                try {
                    const token = useAuthStore.getState().user?.token;
                    const tenantId = getTenantId();
                    const response = await fetch(
                        `${config.apiBaseUrl}/cashierbalance/active/${cashierId}`,
                        {
                            cache: "no-store",
                            headers: {
                                "Content-Type": "application/json",
                                ...(tenantId ? { [TENANT_HEADER]: tenantId } : {}),
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                        }
                    );

                    if (response.status === 404) {
                        // Server says no active shift. Only clear if our local copy
                        // isn't a synthetic one still waiting to sync.
                        const current = get().activeShift;
                        if (!isSyntheticId(current?.id)) {
                            set({
                                activeShift: null,
                                loadedCashierId: cashierId,
                                isHydrating: false,
                            });
                        } else {
                            set({ loadedCashierId: cashierId, isHydrating: false });
                        }
                        return get().activeShift;
                    }

                    if (!response.ok) {
                        throw new Error(`Failed to hydrate active shift: ${response.status}`);
                    }

                    const shift = (await response.json()) as CashierBalanceShift;
                    const nextShift = shift && !shift.isClosed ? shift : null;

                    set({
                        activeShift: nextShift,
                        loadedCashierId: cashierId,
                        isHydrating: false,
                    });

                    return nextShift;
                } catch {
                    // Network/server unreachable: preserve persisted state so the
                    // widget keeps working offline. Flip `loadedCashierId` so the
                    // "loading" placeholder resolves.
                    set({
                        loadedCashierId: cashierId,
                        isHydrating: false,
                    });
                    return get().activeShift;
                }
            },

            setActiveShift: (shift, cashierId = get().loadedCashierId) =>
                set({
                    activeShift: shift && !shift.isClosed ? shift : null,
                    loadedCashierId: cashierId ?? null,
                    isHydrating: false,
                }),

            setLastClosedShift: (shift) => set({ lastClosedShift: shift }),

            clearShift: () =>
                set({
                    activeShift: null,
                    loadedCashierId: null,
                    isHydrating: false,
                }),

            openShiftOptimistic: async (input) => {
                const shift = buildSyntheticShift(input);
                set({
                    activeShift: shift,
                    lastClosedShift: null,
                    loadedCashierId: input.cashierId,
                    isHydrating: false,
                });
                await enqueue({
                    type: "open-shift",
                    // Queue uses `orderId` as the dedup slot; we carry the local
                    // shift id here so dedup by type+slot works naturally.
                    orderId: shift.id,
                    payload: {
                        localId: shift.id,
                        cashierId: input.cashierId,
                        openingBalance: input.openingBalance,
                        notes: input.notes ?? null,
                    },
                    lockKey: `shift:open:${input.cashierId}`,
                });
                await drainNow();
                return get().activeShift ?? shift;
            },

            closeShiftOptimistic: async (input) => {
                const current = get().activeShift;
                if (!current) throw new Error("No active shift to close");

                const clientActionId = await generateActionId();
                const closed = await closeCashierShift(current.id, {
                    closingBalance: input.closingBalance,
                    notes: input.notes ?? null,
                    clientActionId,
                    force: input.force ?? false,
                    forceReason: input.force ? (input.forceReason ?? null) : null,
                });
                if (!closed) throw new Error("Shift close returned no data");

                set({
                    activeShift: null,
                    lastClosedShift: closed,
                });

                return closed;
            },
        }),
        {
            name: "cashier-shift",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                activeShift: state.activeShift,
                lastClosedShift: state.lastClosedShift,
                loadedCashierId: state.loadedCashierId,
            }),
        }
    )
);

// ─── Queue reconciliation ────────────────────────────────
// Bridges the sync queue back into this store once server round-trips
// complete. Module-level registration is safe — the queue module is
// client-only and `registerShiftReconciler` simply stores a reference.

if (typeof window !== "undefined") {
    startConnectivity();
    registerShiftReconciler((event) => {
        const store = useCashierShiftStore.getState();
        if (event.kind === "opened") {
            const current = store.activeShift;
            // Only swap if we're still on the synthetic id this action created.
            if (current && current.id === event.localId) {
                // Prefer server's authoritative numbers, but preserve the
                // locally-observed opening balance if the server didn't echo one.
                store.setActiveShift(event.shift, event.shift.cashierId);
            }
        } else {
            // closed
            const current = store.activeShift;
            if (!current || current.id === event.shift.id || isSyntheticId(current.id)) {
                store.setActiveShift(null, event.shift.cashierId);
            }
            store.setLastClosedShift(event.shift);
        }
    });
}
