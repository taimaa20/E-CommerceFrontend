"use client";

import { create, type StoreApi, type UseBoundStore } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { BillSplit, CartItem, MenuItem, CartExtraSelection } from "../types";
import { STORAGE_KEYS, TIP_DEFAULT_PERCENT } from "../constants";
import type { TipState } from "../types";

export interface CartState {
  tableId: string;
  items: CartItem[];
  tip: TipState;
  bill: BillSplit;
  customerName: string;
  notes: string;

  add: (
    menuItem: MenuItem,
    qty: number,
    extras: CartExtraSelection[],
    extrasPriceDelta: number,
    notes?: string,
  ) => void;
  updateQty: (lineId: string, qty: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  setTip: (tip: TipState) => void;
  setBill: (bill: BillSplit) => void;
  setCustomerName: (n: string) => void;
  setNotes: (n: string) => void;

  totalQuantity: () => number;
}

const newLineId = (): string => `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/* Module-level registry so each tableId has exactly one persisted store
   instance for the lifetime of the page. NOT a hook — never called from
   render directly. */
const registry = new Map<string, UseBoundStore<StoreApi<CartState>>>();

function getCartStore(tableId: string): UseBoundStore<StoreApi<CartState>> {
  const cached = registry.get(tableId);
  if (cached) return cached;

  const store = create<CartState>()(
    persist(
      (set, get) => ({
        tableId,
        items: [],
        tip: { kind: "percent", value: TIP_DEFAULT_PERCENT },
        bill: {
          mode: "full",
          splitMethod: "equal",
          splitAmount: 0,
          splitParts: 2,
          selectedLineIds: [],
        },
        customerName: "",
        notes: "",

        add: (menuItem, qty, extras, extrasPriceDelta, notes) => {
          const line: CartItem = {
            lineId: newLineId(),
            itemId: menuItem.id,
            name: menuItem.name,
            unitPrice: menuItem.price,
            unitPriceWithExtras: menuItem.price + extrasPriceDelta,
            quantity: Math.max(1, qty),
            imageUrl: menuItem.imageUrl,
            extras,
            notes,
          };
          set({ items: [...get().items, line] });
        },

        updateQty: (lineId, qty) => {
          if (qty <= 0) {
            set({ items: get().items.filter((i) => i.lineId !== lineId) });
            return;
          }
          set({
            items: get().items.map((i) =>
              i.lineId === lineId ? { ...i, quantity: qty } : i,
            ),
          });
        },

        remove: (lineId) =>
          set({ items: get().items.filter((i) => i.lineId !== lineId) }),

        clear: () =>
          set({
            items: [],
            tip: { kind: "percent", value: TIP_DEFAULT_PERCENT },
            bill: {
              mode: "full",
              splitMethod: "equal",
              splitAmount: 0,
              splitParts: 2,
              selectedLineIds: [],
            },
            customerName: "",
            notes: "",
          }),

        setTip: (tip) => set({ tip }),
        setBill: (bill) => set({ bill }),
        setCustomerName: (n) => set({ customerName: n }),
        setNotes: (n) => set({ notes: n }),

        totalQuantity: () =>
          get().items.reduce((sum, i) => sum + i.quantity, 0),
      }),
      {
        name: STORAGE_KEYS.cart(tableId),
        storage: createJSONStorage(() => localStorage),
        partialize: (s) => ({
          items: s.items,
          tip: s.tip,
          bill: s.bill,
          customerName: s.customerName,
          notes: s.notes,
        }),
      },
    ),
  );

  registry.set(tableId, store);
  return store;
}

/**
 * Selector hook — single entry point used by components.
 *
 * Naming matters: the leading `use` prefix is what tells the React Compiler
 * and the rules-of-hooks lint plugin to treat the inner zustand call as a
 * hook (so it never gets memoized/skipped between renders). Calling the
 * bound store via a variable named `cart(...)` would break that contract
 * and produce "change in the order of Hooks" errors.
 */
export function useCart<U>(tableId: string, selector: (s: CartState) => U): U {
  return getCartStore(tableId)(selector);
}
