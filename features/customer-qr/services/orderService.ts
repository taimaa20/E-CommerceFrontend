import type {
  BillSplit,
  CartItem,
  CustomerOrder,
  OrderStatus,
  OrderTotals,
  OrderTrackingSnapshot,
  PaymentState,
  PaymentTransaction,
  TipState,
} from "../types";
import { mockRestaurant } from "../mock/restaurant";
import {
  ORDER_FLOW_STEPS,
  ORDER_SIMULATION_TIMINGS_MS,
  ORDER_STEP_LABELS,
} from "../constants";
import { SOURCE, simulateLatency } from "./source";

/* ───────── pure pricing helpers ───────── */

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function computeSubtotal(items: CartItem[]): number {
  return round2(
    items.reduce((sum, i) => sum + i.unitPriceWithExtras * i.quantity, 0),
  );
}

export function computeTip(
  subtotal: number,
  tip: TipState,
): number {
  if (tip.kind === "none" || tip.value <= 0) return 0;
  if (tip.kind === "percent") return round2((subtotal * tip.value) / 100);
  return round2(tip.value);
}

export function computeTotals(
  items: CartItem[],
  tip: TipState,
  discountAmount = 0,
): OrderTotals {
  const subtotal = computeSubtotal(items);
  const taxAmount = round2((subtotal * mockRestaurant.taxPct) / 100);
  const serviceAmount = round2((subtotal * mockRestaurant.servicePct) / 100);
  const tipAmount = computeTip(subtotal, tip);
  const grandTotal = round2(
    Math.max(0, subtotal + taxAmount + serviceAmount + tipAmount - discountAmount),
  );
  return {
    subtotal,
    taxAmount,
    serviceAmount,
    tipAmount,
    discountAmount: round2(discountAmount),
    grandTotal,
    currency: mockRestaurant.currency,
  };
}

/* ───────── order creation (mock) ───────── */

function shortCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

interface CreateOrderInput {
  tableId: string;
  items: CartItem[];
  customerName?: string;
  notes?: string;
}

async function createOrderMock(input: CreateOrderInput): Promise<CustomerOrder> {
  await simulateLatency(500);
  // Tip is captured at payment time and tracked per transaction — the order
  // balance itself never includes tip, so split / partial maths stay stable.
  const totals = computeTotals(input.items, { kind: "none", value: 0 });
  const now = new Date();
  const eta = new Date(
    now.getTime() +
      Math.max(
        12 * 60_000,
        input.items.reduce((m, i) => Math.max(m, i.quantity * 60_000), 0) +
          15 * 60_000,
      ),
  );
  return {
    id: `o_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    shortCode: shortCode(),
    tableId: input.tableId,
    channel: "qr_self_order",
    items: input.items,
    totals,
    status: "pending",
    statusHistory: [{ status: "pending", atIso: now.toISOString() }],
    createdAtIso: now.toISOString(),
    estimatedReadyIso: eta.toISOString(),
    customerName: input.customerName,
    notes: input.notes,
    paymentState: "unpaid",
    amountPaid: 0,
    paidItemLineIds: [],
  };
}

/* ───────── settlement helpers (pure) ───────── */

/**
 * Minimal shape the split / balance maths need. A placed `CustomerOrder`
 * satisfies it structurally; for `pay_first` (no order yet) the bill screen
 * builds one from the draft cart with `amountPaid: 0`.
 */
export interface BillingBasis {
  items: CartItem[];
  totals: OrderTotals;
  amountPaid: number;
  paidItemLineIds: string[];
}

export function remainingBalance(basis: BillingBasis): number {
  return round2(Math.max(0, basis.totals.grandTotal - basis.amountPaid));
}

/**
 * Proportional share of the grand total carried by a single line — its own
 * price plus its slice of tax / service / discount. Used so "split by items"
 * sums back to the exact grand total.
 */
function lineShare(basis: BillingBasis, line: CartItem): number {
  const subtotal = basis.totals.subtotal;
  if (subtotal <= 0) return 0;
  const lineSubtotal = line.unitPriceWithExtras * line.quantity;
  return round2((lineSubtotal / subtotal) * basis.totals.grandTotal);
}

/** Amount the diner is committing to pay, given the chosen split selection. */
export function computePayable(basis: BillingBasis, bill: BillSplit): number {
  const remaining = remainingBalance(basis);
  if (bill.mode === "full") return remaining;

  if (bill.splitMethod === "equal") {
    const parts = Math.max(1, bill.splitParts);
    return round2(Math.min(remaining, basis.totals.grandTotal / parts));
  }
  if (bill.splitMethod === "items") {
    const sum = basis.items
      .filter(
        (l) =>
          bill.selectedLineIds.includes(l.lineId) &&
          !basis.paidItemLineIds.includes(l.lineId),
      )
      .reduce((acc, l) => acc + lineShare(basis, l), 0);
    return round2(Math.min(remaining, sum));
  }
  // amount
  return round2(Math.min(remaining, Math.max(0, bill.splitAmount)));
}

/** Per-line share, exposed so the bill screen can preview item amounts. */
export function lineShareOf(basis: BillingBasis, line: CartItem): number {
  return lineShare(basis, line);
}

/** Returns the order with this payment folded into its settlement state. */
export function applyPayment(
  order: CustomerOrder,
  tx: PaymentTransaction,
): CustomerOrder {
  const amountPaid = round2(order.amountPaid + tx.amount);
  const paidItemLineIds = tx.paidItemLineIds
    ? Array.from(new Set([...order.paidItemLineIds, ...tx.paidItemLineIds]))
    : order.paidItemLineIds;
  const paymentState: PaymentState =
    amountPaid >= order.totals.grandTotal - 0.01
      ? "paid"
      : amountPaid > 0
        ? "partial"
        : "unpaid";
  return { ...order, amountPaid, paidItemLineIds, paymentState };
}

/* ───────── tracking (mock simulator) ───────── */

export function buildTracking(order: CustomerOrder): OrderTrackingSnapshot {
  const currentIdx = ORDER_FLOW_STEPS.indexOf(
    order.status as (typeof ORDER_FLOW_STEPS)[number],
  );
  return {
    orderId: order.id,
    currentStatus: order.status,
    etaIso: order.estimatedReadyIso,
    steps: ORDER_FLOW_STEPS.map((status, idx) => ({
      status,
      label: ORDER_STEP_LABELS[status],
      complete: idx < currentIdx,
      active: idx === currentIdx,
    })),
  };
}

export function nextStatusAfter(status: OrderStatus): OrderStatus | null {
  const idx = ORDER_FLOW_STEPS.indexOf(status as (typeof ORDER_FLOW_STEPS)[number]);
  if (idx < 0 || idx >= ORDER_FLOW_STEPS.length - 1) return null;
  return ORDER_FLOW_STEPS[idx + 1];
}

export function delayFor(status: OrderStatus): number {
  return ORDER_SIMULATION_TIMINGS_MS[status as (typeof ORDER_FLOW_STEPS)[number]] ?? 0;
}

export const orderService = {
  create: (input: CreateOrderInput): Promise<CustomerOrder> =>
    SOURCE === "mock" ? createOrderMock(input) : Promise.reject(new Error("api adapter not wired")),
  computeTotals,
  buildTracking,
  nextStatusAfter,
  delayFor,
  remainingBalance,
  computePayable,
  lineShareOf,
  applyPayment,
};
