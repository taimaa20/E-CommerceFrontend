"use client";

import { create, type StoreApi, type UseBoundStore } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CartItem,
  CustomerOrder,
  OrderStatus,
  OrderTotals,
  PaymentTransaction,
  FeedbackSubmission,
} from "../types";
import { STORAGE_KEYS } from "../constants";
import { applyPayment } from "../services/orderService";

export interface OrderState {
  tableId: string;
  order: CustomerOrder | null;
  /** Latest transaction — kept for the success/receipt summary. */
  payment: PaymentTransaction | null;
  /** Every settlement against this order (split / partial). */
  payments: PaymentTransaction[];
  feedback: FeedbackSubmission | null;

  setOrder: (o: CustomerOrder) => void;
  setStatus: (s: OrderStatus) => void;
  /** Records a settlement and folds it into the order's payment state. */
  addPayment: (p: PaymentTransaction) => void;
  /** Appends a new round of items to the placed order (pay_later). */
  appendItems: (items: CartItem[], totals: OrderTotals) => void;
  setFeedback: (f: FeedbackSubmission) => void;
  reset: () => void;
}

const registry = new Map<string, UseBoundStore<StoreApi<OrderState>>>();

function getOrderStore(tableId: string): UseBoundStore<StoreApi<OrderState>> {
  const cached = registry.get(tableId);
  if (cached) return cached;

  const store = create<OrderState>()(
    persist(
      (set, get) => ({
        tableId,
        order: null,
        payment: null,
        payments: [],
        feedback: null,

        setOrder: (o) => set({ order: o }),
        setStatus: (s) => {
          const cur = get().order;
          if (!cur) return;
          // Idempotent + appends an audit trail entry the kitchen can read.
          if (cur.status === s) return;
          set({
            order: {
              ...cur,
              status: s,
              statusHistory: [
                ...cur.statusHistory,
                { status: s, atIso: new Date().toISOString() },
              ],
            },
          });
        },
        addPayment: (p) => {
          const cur = get().order;
          if (!cur) return;
          set({
            order: applyPayment(cur, p),
            payment: p,
            payments: [...get().payments, p],
          });
        },
        appendItems: (items, totals) => {
          const cur = get().order;
          if (!cur) return;
          // A new round raises the balance, so re-derive settlement state.
          const paymentState =
            cur.amountPaid >= totals.grandTotal - 0.01
              ? "paid"
              : cur.amountPaid > 0
                ? "partial"
                : "unpaid";
          // New round resets the kitchen status back to pending so the
          // simulator (and a real KDS) picks the added items up again.
          set({
            order: {
              ...cur,
              items: [...cur.items, ...items],
              totals,
              paymentState,
              status: "pending",
              statusHistory: [
                ...cur.statusHistory,
                { status: "pending", atIso: new Date().toISOString() },
              ],
            },
          });
        },
        setFeedback: (f) => set({ feedback: f }),
        reset: () =>
          set({ order: null, payment: null, payments: [], feedback: null }),
      }),
      {
        name: STORAGE_KEYS.order(tableId),
        storage: createJSONStorage(() => localStorage),
        partialize: (s) => ({
          order: s.order,
          payment: s.payment,
          payments: s.payments,
          feedback: s.feedback,
        }),
      },
    ),
  );

  registry.set(tableId, store);
  return store;
}

/** See cartStore.ts for the naming rationale (React Compiler hook detection). */
export function useOrder<U>(tableId: string, selector: (s: OrderState) => U): U {
  return getOrderStore(tableId)(selector);
}
